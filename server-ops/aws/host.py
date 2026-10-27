#!/usr/bin/env python3
"""Fixed local Minecraft operations. Never contains AWS credentials or API calls."""
from __future__ import annotations

import argparse
import contextlib
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import shutil
import socket
import stat
import struct
import subprocess
import sys
import tarfile
import time
import urllib.request
import uuid
import zipfile


UNIT = 'sunrin-minecraft.service'
UNIT_PATH = '/etc/systemd/system/' + UNIT
SERVER_DIR = Path('/srv/sunrin/minecraft')
STATE_DIR = Path('/var/lib/sunrin')
SECRET_PATH = Path('/etc/sunrin/rcon.password')
CONTROL_LOCK = Path('/run/lock/sunrin-minecraft-control.lock')
MARKER = '.sunrin-server-complete.json'


class HostError(Exception):
    """Public error codes intentionally exclude exception details and secrets."""
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def read_secret(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, 'r', encoding='ascii') as source:
        info = os.fstat(source.fileno())
        if (not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600
                or info.st_uid not in (0, os.geteuid())):
            raise HostError('unsafe-secret-file')
        value = source.read(256).strip()
    if not re.fullmatch(r'[A-Za-z0-9_-]{16,128}', value):
        raise HostError('invalid-secret-file')
    return value


class Rcon:
    """Minecraft RCON, restricted to loopback. Passwords never enter argv."""
    def __init__(self, password, *, port=25575, timeout=10):
        self.password = password
        self.port = port
        self.timeout = timeout
        self.sock = None
        self.next_id = 1

    def __enter__(self):
        try:
            self.sock = socket.create_connection(('127.0.0.1', self.port), timeout=self.timeout)
            self.sock.settimeout(self.timeout)
            request = self._send(3, self.password)
            # Minecraft sends an empty RESPONSE_VALUE before AUTH_RESPONSE.
            for _ in range(2):
                request_id, kind, _ = self._receive()
                if request_id == -1:
                    raise HostError('rcon-auth-rejected')
                if request_id != request:
                    raise HostError('rcon-invalid-response')
                if kind == 2:
                    return self
            raise HostError('rcon-auth-rejected')
        except Exception:
            self.__exit__()
            raise

    def __exit__(self, *_):
        if self.sock:
            self.sock.close()
            self.sock = None

    def _send(self, kind, command):
        request_id = self.next_id
        self.next_id += 1
        body = struct.pack('<ii', request_id, kind) + command.encode('utf-8') + b'\0\0'
        self.sock.sendall(struct.pack('<i', len(body)) + body)
        return request_id

    def _exact(self, count):
        value = b''
        while len(value) < count:
            part = self.sock.recv(count - len(value))
            if not part:
                raise EOFError()
            value += part
        return value

    def _receive(self):
        size = struct.unpack('<i', self._exact(4))[0]
        if not 10 <= size <= 1024 * 1024:
            raise HostError('rcon-invalid-response')
        data = self._exact(size)
        if data[-2:] != b'\0\0':
            raise HostError('rcon-invalid-response')
        request_id, kind = struct.unpack('<ii', data[:8])
        return request_id, kind, data[8:-2].decode('utf-8', errors='replace')

    def command(self, command, *, allow_disconnect=False):
        request_id = self._send(2, command)
        try:
            response_id, kind, response = self._receive()
        except (EOFError, socket.timeout, ConnectionResetError):
            # A dispatched stop may close RCON before returning its response.
            # Only the caller's process-exit check can establish success.
            if allow_disconnect and command == 'stop':
                return ''
            raise HostError('rcon-disconnected') from None
        if response_id != request_id or kind != 0:
            raise HostError('rcon-invalid-response')
        return response


def get_unit_status():
    result = subprocess.run(
        ['systemctl', 'show', UNIT, '--no-page',
         '--property=LoadState,ActiveState,SubState,MainPID,Result,FragmentPath'],
        capture_output=True, text=True, timeout=10, check=False)
    if result.returncode:
        raise HostError('unit-query-failed')
    return dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)


def process_token(pid):
    """Linux process birth time prevents PID reuse from becoming stop proof."""
    try:
        fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
        if fields[0] == 'Z':
            return None
        return fields[19]
    except FileNotFoundError:
        return None
    except (IndexError, OSError):
        raise HostError('process-identity-unavailable') from None


def private_directory(path):
    path = Path(path)
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    if path.is_symlink() or not path.is_dir():
        raise HostError('unsafe-state-directory')
    path.chmod(0o700)
    return path


def atomic_json(path, value):
    path = Path(path)
    private_directory(path.parent)
    temp = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as target:
            json.dump(value, target, sort_keys=True)
            target.write('\n')
            target.flush()
            os.fsync(target.fileno())
        os.replace(temp, path)
        directory_fd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if temp.exists():
            temp.unlink()


@contextlib.contextmanager
def operation_lock(path=CONTROL_LOCK):
    fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        # Serialize SSM, the systemd ExecStop helper, and offline backups.
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        os.close(fd)


class Controller:
    def __init__(self, *, secret_path=SECRET_PATH, state_dir=STATE_DIR,
                 status_reader=None, token_reader=None, port=25575):
        self.secret_path = Path(secret_path)
        self.state_dir = Path(state_dir)
        self.status_reader = status_reader or get_unit_status
        self.token_reader = token_reader or process_token
        self.port = port

    def status(self):
        value = self.status_reader()
        if value.get('LoadState') != 'loaded' or value.get('FragmentPath') != UNIT_PATH:
            raise HostError('unknown-service-unit')
        try:
            value = dict(value)
            value['pid'] = int(value['MainPID'])
        except (KeyError, ValueError):
            raise HostError('unit-query-invalid') from None
        return value

    @staticmethod
    def inactive(value):
        return (value['pid'] == 0 and value.get('ActiveState') == 'inactive'
                and value.get('SubState') == 'dead' and value.get('Result') == 'success')

    def _rcon(self, timeout):
        return Rcon(read_secret(self.secret_path), port=self.port, timeout=max(0.05, min(timeout, 30)))

    def health(self, timeout=10):
        before = self.status()
        pid = before['pid']
        token = self.token_reader(pid) if pid > 0 else None
        if before.get('ActiveState') not in ('active', 'activating') or not token:
            raise HostError('server-not-running')
        with self._rcon(timeout) as client:
            response = client.command('list')
        if not re.search(r'There are \d+ of a max of \d+ players online', response):
            raise HostError('server-not-ready')
        after = self.status()
        if (after['pid'] != pid or after.get('ActiveState') not in ('active', 'activating')
                or self.token_reader(pid) != token):
            raise HostError('process-changed')
        return {'ok': True, 'status': 'ready', 'unit': UNIT, 'mainPid': pid}

    def wait_ready(self, timeout=840):
        deadline = time.monotonic() + timeout
        while True:
            try:
                return self.health(timeout=min(10, max(0.05, deadline - time.monotonic())))
            except HostError as exc:
                if exc.code not in ('server-not-running', 'server-not-ready', 'rcon-disconnected'):
                    raise
            except (OSError, EOFError):
                pass  # Normal while Forge is loading before the RCON socket opens.
            if time.monotonic() >= deadline:
                raise HostError('server-readiness-timeout')
            time.sleep(min(0.25, max(0, deadline - time.monotonic())))

    def stop(self, request_id, timeout=180):
        try:
            request_id = str(uuid.UUID(request_id))
        except (ValueError, AttributeError):
            raise HostError('invalid-request-id') from None
        before = self.status()
        pid = before['pid']
        if self.inactive(before):
            return self._proof(request_id, 0, None, 'known-unit-already-inactive')
        # systemd also invokes ExecStop when Java has already exited normally.
        # This is the second helper invocation after an SSM/RCON stop, and must
        # not turn the completed normal exit into a service restart failure.
        if (pid == 0 and before.get('ActiveState') == 'deactivating'
                and before.get('SubState') == 'stop' and before.get('Result') == 'success'):
            return self._proof(request_id, 0, None, 'known-unit-process-already-exited')
        if before.get('ActiveState') not in ('active', 'deactivating') or pid <= 0:
            raise HostError('server-not-cleanly-stopped')
        token = self.token_reader(pid)
        if not token:
            raise HostError('process-identity-unavailable')
        deadline = time.monotonic() + timeout
        with self._rcon(timeout) as client:
            # A successful send alone does not mean the world was saved.
            if 'Saved the game' not in client.command('save-all flush'):
                raise HostError('save-not-confirmed')
            if self.status()['pid'] != pid or self.token_reader(pid) != token:
                raise HostError('process-changed')
            client.sock.settimeout(max(0.05, min(10, deadline - time.monotonic())))
            client.command('stop', allow_disconnect=True)
        while True:
            current_token = self.token_reader(pid)
            current = self.status()
            if current['pid'] not in (0, pid):
                raise HostError('process-changed')
            if current_token is None:
                if (current.get('Result') != 'success'
                        or current.get('ActiveState') not in ('active', 'inactive', 'deactivating')):
                    raise HostError('server-exit-failed')
                if (current['pid'] == 0
                        and current.get('ActiveState') in ('inactive', 'deactivating')):
                    return self._proof(request_id, pid, token, 'rcon-save-flush-stop-process-exited')
                # /proc and systemd are independent snapshots. Java may already
                # be gone/zombie while systemd still reports its old active
                # MainPID. Wait for systemd to settle within the same deadline;
                # a stale active snapshot never authorizes an EC2 stop.
            elif current_token != token:
                raise HostError('process-changed')
            if time.monotonic() >= deadline:
                raise HostError('stop-timeout')
            time.sleep(min(0.1, max(0, deadline - time.monotonic())))

    def _proof(self, request_id, pid, token, proof):
        value = {'ok': True, 'status': 'stopped', 'cleanStop': True,
                 'requestId': request_id, 'unit': UNIT, 'mainPid': pid, 'proof': proof,
                 'processStart': token,
                 'completedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
        atomic_json(self.state_dir / 'last-stop.json', value)
        return value

    def whitelist(self, name, timeout=10):
        name = validate_username(name)
        self.health(timeout)
        with self._rcon(timeout) as client:
            response = client.command('whitelist add ' + name)
        if (f'Added {name} to the whitelist' not in response
                and 'already whitelisted' not in response):
            raise HostError('whitelist-not-confirmed')
        return {'ok': True, 'status': 'whitelisted', 'name': name}

    def backup(self, server_dir, backup_dir):
        if not self.inactive(self.status()):
            raise HostError('backup-requires-inactive-server')
        server_dir = Path(server_dir)
        roots = ['world', 'config', 'defaultconfigs', 'kubejs', 'server.properties',
                 'whitelist.json', 'ops.json', 'banned-ips.json', 'banned-players.json']
        if not (server_dir / 'world').is_dir():
            raise HostError('world-not-found')
        for root in roots:
            path = server_dir / root
            if path.is_symlink():
                raise HostError('backup-unsafe-path')
            if path.is_dir():
                for parent, directories, files in os.walk(path, followlinks=False):
                    for name in directories + files:
                        child = Path(parent) / name
                        if child.is_symlink() or not (child.is_dir() or child.is_file()):
                            raise HostError('backup-unsafe-path')
        backup_dir = private_directory(backup_dir)
        target = backup_dir / f'world-{time.time_ns()}-{uuid.uuid4().hex[:8]}.tar.gz'
        partial = target.with_suffix('.part')
        try:
            fd = os.open(partial, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'wb') as stream:
                with tarfile.open(fileobj=stream, mode='w:gz') as archive:
                    for root in roots:
                        path = server_dir / root
                        if path.exists():
                            archive.add(path, arcname=root, recursive=True)
                stream.flush()
                os.fsync(stream.fileno())
            if not self.inactive(self.status()):
                raise HostError('backup-server-started')
            os.replace(partial, target)
            for previous in sorted(backup_dir.glob('world-*.tar.gz'))[:-3]:
                if previous.is_symlink():
                    raise HostError('backup-unsafe-path')
                previous.unlink()
        finally:
            if partial.exists():
                partial.unlink()
        return {'ok': True, 'status': 'backed-up', 'archive': str(target), 'retained': 3}


def validate_username(name):
    if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z0-9_]{3,16}', name):
        raise HostError('invalid-whitelist-name')
    return name


def verify_file(path, *, size=None, algorithm='sha256', digest):
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise HostError('unsafe-artifact-file')
    if size is not None and path.stat().st_size != size:
        raise HostError('artifact-size-mismatch')
    if algorithm not in ('sha1', 'sha256'):
        raise HostError('unsupported-artifact-hash')
    checksum = hashlib.new(algorithm)
    with path.open('rb') as source:
        while block := source.read(1024 * 1024):
            checksum.update(block)
    if not secrets.compare_digest(checksum.hexdigest(), digest.lower()):
        raise HostError('artifact-hash-mismatch')


def download_verified(item, cache_dir):
    cache_dir = private_directory(cache_dir)
    filename = item['filename']
    if Path(filename).name != filename or not filename or not item['url'].startswith('https://'):
        raise HostError('invalid-artifact-lock')
    target = cache_dir / filename
    hash_info = item['hash']
    if target.exists() or target.is_symlink():
        verify_file(target, size=item.get('size'), **hash_info)
        return target
    partial = cache_dir / (filename + '.' + uuid.uuid4().hex + '.part')
    limit = item.get('size') or 32 * 1024 * 1024
    try:
        request = urllib.request.Request(item['url'], headers={'User-Agent': 'SunrinValleyServer/0.1.2'})
        with urllib.request.urlopen(request, timeout=60) as response:
            fd = os.open(partial, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'wb') as output:
                count = 0
                while block := response.read(1024 * 1024):
                    count += len(block)
                    if count > limit:
                        raise HostError('artifact-size-limit')
                    output.write(block)
                output.flush()
                os.fsync(output.fileno())
        verify_file(partial, size=item.get('size'), **hash_info)
        os.replace(partial, target)
        return target
    finally:
        if partial.exists():
            partial.unlink()


def safe_extract(archive_path, destination, *, max_bytes=2 * 1024**3, max_entries=20000):
    """Validate the entire directory before writing; never use ZipFile.extractall."""
    destination = Path(destination)
    if destination.exists() or destination.is_symlink():
        raise HostError('extraction-destination-exists')
    try:
        with zipfile.ZipFile(archive_path) as archive:
            entries = archive.infolist()
            if len(entries) > max_entries or sum(item.file_size for item in entries) > max_bytes:
                raise HostError('archive-size-limit')
            seen, spelling = {}, {}
            for item in entries:
                name = item.filename.rstrip('/')
                path = PurePosixPath(name)
                mode = item.external_attr >> 16
                if (not name or item.orig_filename != item.filename or '\\' in name
                        or ':' in name or path.is_absolute() or any(p in ('', '.', '..') for p in name.split('/'))
                        or item.flag_bits & 1 or stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR)):
                    raise HostError('unsafe-archive-member')
                key = name.casefold()
                if key in seen:
                    raise HostError('archive-path-collision')
                for depth in range(1, len(path.parts) + 1):
                    prefix = '/'.join(path.parts[:depth])
                    if spelling.get(prefix.casefold(), prefix) != prefix:
                        raise HostError('archive-path-collision')
                    spelling[prefix.casefold()] = prefix
                seen[key] = item.is_dir()
            for name in seen:
                for parent in PurePosixPath(name).parents:
                    if str(parent) != '.' and seen.get(str(parent)) is False:
                        raise HostError('archive-path-collision')
            destination.mkdir(mode=0o750, parents=False)
            for item in entries:
                target = destination.joinpath(*PurePosixPath(item.filename).parts)
                if item.is_dir():
                    target.mkdir(mode=0o755, parents=True, exist_ok=True)
                else:
                    target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
                    with archive.open(item) as source, target.open('xb') as output:
                        shutil.copyfileobj(source, output, length=1024 * 1024)
                    target.chmod(0o644)
    except (zipfile.BadZipFile, RuntimeError):
        raise HostError('invalid-server-archive') from None


UPSTREAM_CHAT_PATH = "kubejs/server_scripts/playerEvents/chatColors.js"
QUEST_CHAPTER_PATHS = frozenset("config/ftbquests/quests/chapters/" + name for name in (
    "abandoned_farm.snbt", "armor_weapons__tools.snbt", "artifacts.snbt", "banners.snbt",
    "boiler_room.snbt", "botania.snbt", "crafts_room.snbt", "creatures.snbt", "crops.snbt",
    "drinks.snbt", "fish_tank.snbt", "fishing.snbt", "gems.snbt", "getting_started.snbt",
    "ii__building_up_the_farm.snbt", "iii__advanced_farming.snbt", "iv__prismatic_farming.snbt",
    "ivi__mechanical_farming.snbt", "longwings.snbt", "minerals.snbt", "pantry.snbt",
    "perfection.snbt", "relics.snbt", "slimes.snbt", "tools.snbt", "transportation.snbt",
    "vault.snbt", "villagers.snbt", "welcome.snbt",
))
REVIEWED_UPSTREAM_PATHS = QUEST_CHAPTER_PATHS | {
    UPSTREAM_CHAT_PATH, "kubejs/assets/ftbquestlocalizer/lang/ko_kr.json",
    "kubejs/assets/ftbquestlocalizer/lang/en_us.json",
}


def overlay_owned_path(name):
    if not isinstance(name, str):
        return False
    parts = name.split("/")
    if any(not p or p in {".", ".."} or "\\" in p or ":" in p or p.rstrip(" .") != p or any(ord(c) < 32 for c in p) for p in parts):
        return False
    if name in REVIEWED_UPSTREAM_PATHS | {"config/sunrin/geonpi.json", "defaultconfigs/ftbchunks/ftbchunks-world.snbt"}:
        return True
    return (len(parts) >= 3 and parts[0] == "kubejs" and
            ((parts[1] in {"startup_scripts", "server_scripts", "client_scripts"} and parts[-1].startswith("sunrin_") and parts[-1].endswith(".js"))
             or (parts[1] in {"data", "assets"} and parts[2] == "sunrin")))


def merge_fresh_ftb(content):
    text = content.decode("utf-8")
    for key, value, pattern in [("max_claimed_chunks", "4", r"[0-9]+"), ("party_limit_mode", '\"sum\"', r'\"[^\"\r\n]*\"')]:
        expression = re.compile(r"(?m)^([ \t]*" + key + r"[ \t]*:[ \t]*)" + pattern + r"(?=[ \t,]*(?:#.*)?\r?$)")
        if len(expression.findall(text)) != 1:
            raise HostError("unsupported-fresh-ftb-config")
        text = expression.sub(lambda m: m.group(1) + value, text)
    return text.encode("utf-8")


def apply_owned_overlay(archive_path, destination, spec):
    verify_file(archive_path, size=spec.get("size"), **spec["hash"])
    files = spec.get("files")
    if not isinstance(files, list) or not files or len(files) > 1000:
        raise HostError("invalid-owned-overlay")
    seen = set()
    for item in files:
        name = item.get("path")
        if (not overlay_owned_path(name) or name.casefold() in seen
                or item.get("mode", "replace") not in {"replace", "ifAbsent"}
                or (name.startswith(("config/", "defaultconfigs/")) and name not in QUEST_CHAPTER_PATHS
                    and item.get("mode") != "ifAbsent")
                or type(item.get("size")) is not int or not 0 < item["size"] <= 8 * 1024 ** 2
                or not re.fullmatch(r"[0-9a-f]{64}", item.get("sha256", ""))):
            raise HostError("invalid-owned-overlay")
        seen.add(name.casefold())
    reviewed = spec.get("reviewedReplacements", [])
    required_reviews = {item["path"] for item in files if item["path"] in REVIEWED_UPSTREAM_PATHS}
    if (not isinstance(reviewed, list)
            or any(not isinstance(item, dict) or not isinstance(item.get("path"), str) or item["path"] not in required_reviews
                   or item.get("mode", "replace") != "replace"
                   or type(item.get("size")) is not int or not 0 < item["size"] <= 8 * 1024 ** 2
                   or not re.fullmatch(r"[0-9a-f]{64}", item.get("sha256", ""))
                   for item in reviewed)
            or len(reviewed) != len(required_reviews)
            or {item["path"] for item in reviewed} != required_reviews):
        raise HostError("invalid-reviewed-upstream-replacement")
    predecessors = {item["path"]: item for item in reviewed}
    # Validate every existing destination before writing the first overlay file.
    for item in files:
        target = Path(destination) / item["path"]
        if any(p.is_symlink() for p in [target, *target.parents] if p == Path(destination) or p.is_relative_to(Path(destination))):
            raise HostError("linked-overlay-target")
        if item["path"] in required_reviews and target.exists():
            try:
                predecessor = predecessors[item["path"]]
                verify_file(target, size=predecessor["size"], algorithm="sha256", digest=predecessor["sha256"])
            except HostError:
                raise HostError("owned-overlay-predecessor-mismatch") from None
    stage = Path(destination).with_name(".sunrin-overlay-" + uuid.uuid4().hex)
    try:
        with zipfile.ZipFile(archive_path) as archive:
            if set(archive.namelist()) != {i["path"] for i in files} or len(archive.infolist()) != len(files):
                raise HostError("owned-overlay-file-list-mismatch")
        safe_extract(archive_path, stage, max_entries=1000, max_bytes=16 * 1024 ** 2)
        for item in files:
            verify_file(stage / item["path"], size=item["size"], algorithm="sha256", digest=item["sha256"])
        for item in files:
            target = Path(destination) / item["path"]
            if any(p.is_symlink() for p in [target, *target.parents] if p == Path(destination) or p.is_relative_to(Path(destination))):
                raise HostError("linked-overlay-target")
            if item.get("mode") == "ifAbsent" and target.exists():
                if item["path"] == "defaultconfigs/ftbchunks/ftbchunks-world.snbt":
                    target.write_bytes(merge_fresh_ftb(target.read_bytes()))
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(stage / item["path"], target)
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def write_properties(path, updates):
    lines = Path(path).read_text().splitlines()
    output = []
    remaining = dict(updates)
    for line in lines:
        key = line.split('=', 1)[0].strip() if '=' in line and not line.startswith('#') else None
        if key in updates:
            if key in remaining:
                output.append(f'{key}={remaining.pop(key)}')
        else:
            output.append(line)
    output.extend(f'{key}={value}' for key, value in remaining.items())
    Path(path).write_text('\n'.join(output) + '\n')
    Path(path).chmod(0o600)


def install_server(payload_dir, server_dir, cache_dir, secret_path, *, accept_eula=False, java='/usr/bin/java'):
    if not accept_eula:
        raise HostError('explicit-eula-consent-required')
    payload_dir, server_dir, secret_path = map(Path, (payload_dir, server_dir, secret_path))
    lock_path = payload_dir / 'pack-lock.json'
    lock_bytes = lock_path.read_bytes()
    lock = json.loads(lock_bytes)
    lock_hash = hashlib.sha256(lock_bytes).hexdigest()
    custom = payload_dir / 'sunrin_items.js'
    if 'customStartup' in lock:
        verify_file(custom, **lock['customStartup']['hash'])
    if server_dir.exists() or server_dir.is_symlink():
        marker_path = server_dir / MARKER
        if server_dir.is_symlink() or not marker_path.is_file() or marker_path.is_symlink():
            raise HostError('existing-server-not-owned')
        marker = json.loads(marker_path.read_text())
        if marker.get('lockSha256') != lock_hash or marker.get('packId') != lock['id']:
            raise HostError('existing-server-version-mismatch')
        read_secret(secret_path)
        return {'ok': True, 'status': 'already-installed', 'packId': lock['id']}
    server_dir.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
    stage = server_dir.with_name('.sunrin-stage-' + uuid.uuid4().hex)
    try:
        base = download_verified(lock['serverPack'], cache_dir)
        safe_extract(base, stage)
        mods = stage / 'mods'
        if len(list(mods.glob('*.jar'))) != lock['upstreamModCount']:
            raise HostError('upstream-mod-count-mismatch')
        for addon in lock['addons'] + lock.get('ownedFiles', []):
            target = mods / addon['filename']
            if target.exists():
                raise HostError('addon-already-in-upstream')
            shutil.copyfile(download_verified(addon, cache_dir), target)
        if len(list(mods.glob('*.jar'))) != lock['serverModCount']:
            raise HostError('server-mod-count-mismatch')
        if 'ownedOverlay' in lock:
            overlay = lock['ownedOverlay']
            if overlay.get('filename') != 'Sunrin-Server-Overlay.zip':
                raise HostError('invalid-owned-overlay-filename')
            overlay_path = payload_dir / overlay['filename']
            if overlay.get('delivery') == 'download':
                overlay_path = download_verified(overlay, cache_dir)
            apply_owned_overlay(overlay_path, stage, overlay)
            owned = list(overlay['files'])
            for item in lock.get('ownedFiles', []):
                owned.append({'path': 'mods/' + item['filename'], 'size': item['size'], 'sha256': item['hash']['digest'], 'mode': 'replace'})
            for item in lock['addons']:
                if item.get('slug') == 'beatlamp':
                    owned.append({'path': 'mods/' + item['filename'], 'size': item['size'], 'sha256': item['hash']['digest'], 'mode': 'replace'})
            atomic_json(stage / '.sunrin-owned-files.json', {'formatVersion': 1, 'version': lock['clientPackVersion'], 'files': owned})
        else:
            shutil.copyfile(custom, stage / 'kubejs' / 'startup_scripts' / 'sunrin_items.js')
        installer = download_verified(lock['forgeInstaller'], cache_dir)
        with (stage / 'forge-install.log').open('w') as log:
            result = subprocess.run([java, '-jar', str(installer), '--installServer'],
                                    cwd=stage, stdout=log, stderr=subprocess.STDOUT,
                                    timeout=900, check=False)
        forge_args = stage / 'libraries/net/minecraftforge/forge/1.20.1-47.4.0/unix_args.txt'
        if result.returncode or not forge_args.is_file():
            raise HostError('forge-install-failed')
        private_directory(secret_path.parent)
        if not secret_path.exists():
            fd = os.open(secret_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
            with os.fdopen(fd, 'w') as secret:
                secret.write(secrets.token_urlsafe(36) + '\n')
                secret.flush()
                os.fsync(secret.fileno())
        password = read_secret(secret_path)
        write_properties(stage / 'server.properties', {
            'online-mode': 'true', 'white-list': 'true', 'enforce-whitelist': 'true',
            'max-players': '10', 'enable-rcon': 'true', 'rcon.port': '25575',
            'rcon.password': password, 'broadcast-rcon-to-ops': 'false',
            'server-ip': '', 'server-port': '25565', 'level-name': 'world'})
        (stage / 'eula.txt').write_text('# Explicit operator consent supplied to bootstrap.\neula=true\n')
        (stage / 'user_jvm_args.txt').write_text('-Xms4G\n-Xmx12G\n-Dlog4j2.formatMsgNoLookups=true\n')
        atomic_json(stage / MARKER, {'packId': lock['id'], 'lockSha256': lock_hash,
                                   'modCount': lock['serverModCount']})
        # The server path is absent until the complete verified installation exists.
        if server_dir.exists() or server_dir.is_symlink():
            raise HostError('server-created-during-install')
        os.rename(stage, server_dir)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return {'ok': True, 'status': 'installed', 'packId': lock['id'], 'modCount': lock['serverModCount']}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    health = sub.add_parser('health')
    health.add_argument('--timeout', type=float, default=10)
    ready = sub.add_parser('wait-ready')
    ready.add_argument('--timeout', type=float, default=840)
    stop = sub.add_parser('stop')
    stop.add_argument('--request-id', default=None)
    stop.add_argument('--timeout', type=float, default=180)
    backup = sub.add_parser('backup')
    backup.add_argument('--server-dir', type=Path, default=SERVER_DIR)
    backup.add_argument('--backup-dir', type=Path, default=Path('/var/backups/sunrin'))
    whitelist = sub.add_parser('whitelist')
    whitelist.add_argument('--name', required=True)
    install = sub.add_parser('install')
    install.add_argument('--payload-dir', type=Path, required=True)
    install.add_argument('--server-dir', type=Path, default=SERVER_DIR)
    install.add_argument('--cache-dir', type=Path, default=Path('/var/cache/sunrin'))
    install.add_argument('--secret-path', type=Path, default=SECRET_PATH)
    install.add_argument('--accept-eula', action='store_true')
    install.add_argument('--java', default='/usr/bin/java')
    timed = sub.add_parser('timed-stop')
    timed.add_argument('--timeout', type=float, default=180)
    args = parser.parse_args(argv)
    request_id = getattr(args, 'request_id', None) or str(uuid.uuid4())
    try:
        timeout = getattr(args, 'timeout', 180)
        if not 0 < timeout <= 900:
            raise HostError('invalid-timeout')
        controller = Controller()
        if args.action == 'wait-ready':
            # Do not hold the control lock across a long startup wait. In
            # particular, systemd ExecStop must be able to run after a crash.
            result = controller.wait_ready(timeout)
            print(json.dumps(result, sort_keys=True), flush=True)
            return 0
        with operation_lock():
            if args.action == 'health':
                result = controller.health(timeout)
            elif args.action in ('stop', 'timed-stop'):
                result = controller.stop(request_id, timeout)
                if args.action == 'timed-stop':
                    if (result.get('ok') is not True or result.get('status') != 'stopped'
                            or result.get('cleanStop') is not True or result.get('requestId') != request_id):
                        raise HostError('invalid-clean-stop-proof')
                    # EC2 InstanceInitiatedShutdownBehavior=stop is set by CloudFormation.
                    # No shutdown command is reachable after a failed save/stop operation.
                    shutdown = subprocess.run(['/usr/sbin/shutdown', '-h', 'now'],
                                              capture_output=True, timeout=10, check=False)
                    if shutdown.returncode:
                        raise HostError('host-shutdown-failed')
            elif args.action == 'backup':
                result = controller.backup(args.server_dir, args.backup_dir)
            elif args.action == 'whitelist':
                result = controller.whitelist(args.name)
            elif args.action == 'install':
                result = install_server(args.payload_dir, args.server_dir, args.cache_dir,
                    args.secret_path, accept_eula=args.accept_eula, java=args.java)
        print(json.dumps(result, sort_keys=True), flush=True)
        return 0
    except HostError as exc:
        code = exc.code
    except (OSError, EOFError, subprocess.SubprocessError, ValueError, KeyError):
        code = 'host-operation-failed'
    result = {'ok': False, 'status': 'failed', 'code': code}
    if args.action in ('stop', 'timed-stop'):
        result.update({'requestId': request_id, 'cleanStop': False})
    print(json.dumps(result, sort_keys=True), flush=True)
    return 1


if __name__ == '__main__':
    sys.exit(main())
