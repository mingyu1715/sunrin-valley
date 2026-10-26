#!/usr/bin/env python3
"""Install the fixed Sunrin icon; never starts an inactive Minecraft server."""
from __future__ import annotations

import argparse
import binascii
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pwd
import stat
import struct
import subprocess
import time
import uuid
import zlib


UNIT = 'sunrin-minecraft.service'
TIMER = 'sunrin-test-stop.timer'
STOP_UNIT = 'sunrin-test-stop.service'
HOST = '/usr/local/lib/sunrin/host.py'
PACK_ID = 'sunrin-valley-server-0.1.4'
ICON_SHA256 = 'f9ac698c3f1cea2725da26b5931b1dc50df80725840d18da38abcfc492f545b0'
SERVER_DIR = Path('/srv/sunrin/minecraft')
RECEIPT = Path('/var/lib/sunrin/server-branding.json')


class BrandingError(Exception):
    """Codes are safe for command output; exception details stay private."""
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def no_links(path):
    path = Path(path).absolute()
    for candidate in (path, *path.parents):
        try:
            if stat.S_ISLNK(candidate.lstat().st_mode):
                raise BrandingError('unsafe-path')
        except FileNotFoundError:
            continue


def read_file(path, limit=1024 * 1024):
    path = Path(path)
    no_links(path)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, 'rb') as source:
        info = os.fstat(source.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > limit:
            raise BrandingError('unsafe-file')
        value = source.read(limit + 1)
    if len(value) > limit:
        raise BrandingError('unsafe-file')
    return value


def validate_icon(value):
    if not value.startswith(b'\x89PNG\r\n\x1a\n'):
        raise BrandingError('invalid-icon-png')
    offset, chunks, image = 8, [], []
    try:
        while offset < len(value):
            size = struct.unpack('>I', value[offset:offset + 4])[0]
            kind = value[offset + 4:offset + 8]
            data = value[offset + 8:offset + 8 + size]
            crc = struct.unpack('>I', value[offset + 8 + size:offset + 12 + size])[0]
            if binascii.crc32(kind + data) & 0xffffffff != crc:
                raise ValueError()
            chunks.append(kind)
            if kind == b'IHDR':
                if struct.unpack('>IIBBBBB', data) != (64, 64, 8, 6, 0, 0, 0):
                    raise ValueError()
            if kind == b'IDAT':
                image.append(data)
            offset += size + 12
        if (offset != len(value) or not chunks or chunks[0] != b'IHDR'
                or chunks[-1] != b'IEND' or chunks.count(b'IHDR') != 1
                or chunks.count(b'IEND') != 1):
            raise ValueError()
        decoded = zlib.decompressobj().decompress(b''.join(image), 64 * 257 + 1)
        if len(decoded) != 64 * 257:
            raise ValueError()
    except (ValueError, struct.error, zlib.error):
        raise BrandingError('invalid-icon-png') from None
    if hashlib.sha256(value).hexdigest() != ICON_SHA256:
        raise BrandingError('unexpected-icon-hash')


def native_run(command, *, timeout):
    return subprocess.run(command, capture_output=True, text=True,
                          timeout=timeout, check=False)


class Branding:
    def __init__(self, *, server_dir=SERVER_DIR, receipt_path=RECEIPT,
                 runner=native_run, service_owner=None):
        self.server_dir = Path(server_dir)
        self.receipt_path = Path(receipt_path)
        self.runner = runner
        self.service_owner = service_owner

    def command(self, command, timeout=15):
        result = self.runner(command, timeout=timeout)
        if result.returncode or len(result.stdout) > 64 * 1024:
            raise BrandingError('host-command-failed')
        return result.stdout

    def unit_status(self, unit):
        output = self.command(['systemctl', 'show', unit, '--no-page',
            '--property=LoadState,ActiveState,SubState,MainPID,Result,FragmentPath'])
        value = dict(line.split('=', 1) for line in output.splitlines() if '=' in line)
        if not value.get('LoadState') or not value.get('ActiveState'):
            raise BrandingError('unit-query-invalid')
        return value

    @staticmethod
    def running(value):
        return (value.get('LoadState') == 'loaded'
                and value.get('FragmentPath') == '/etc/systemd/system/' + UNIT
                and value.get('ActiveState') in ('active', 'activating'))

    def shutdown_pending(self):
        stop = self.unit_status(STOP_UNIT)
        timer = self.unit_status(TIMER)
        if stop.get('ActiveState') in ('active', 'activating', 'deactivating'):
            return True
        return (timer.get('ActiveState') in ('active', 'activating', 'deactivating')
                and timer.get('SubState') != 'waiting')

    def private_state(self):
        directory = self.receipt_path.parent
        no_links(directory)
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        no_links(directory)
        info = directory.stat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.geteuid():
            raise BrandingError('unsafe-state-directory')
        directory.chmod(0o700)

    def atomic_write(self, path, value, *, mode, owner=None):
        path = Path(path)
        no_links(path)
        if path.exists() and not stat.S_ISREG(path.lstat().st_mode):
            raise BrandingError('unsafe-file')
        temporary = path.with_name('.' + path.name + '.' + uuid.uuid4().hex + '.tmp')
        try:
            fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
            with os.fdopen(fd, 'wb') as target:
                os.fchmod(target.fileno(), mode)
                if owner:
                    os.fchown(target.fileno(), *owner)
                target.write(value)
                target.flush()
                os.fsync(target.fileno())
            no_links(path)
            os.replace(temporary, path)
            fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
            try:
                os.fsync(fd)
            finally:
                os.close(fd)
        finally:
            if temporary.exists():
                temporary.unlink()

    def save_receipt(self, value):
        self.atomic_write(self.receipt_path,
                          (json.dumps(value, sort_keys=True) + '\n').encode(), mode=0o600)

    def host_json(self, action, arguments, timeout):
        output = self.command(['/usr/bin/python3', HOST, action, *arguments], timeout)
        try:
            value = json.loads(output)
        except (ValueError, TypeError):
            raise BrandingError('invalid-host-response') from None
        if not isinstance(value, dict):
            raise BrandingError('invalid-host-response')
        return value

    def ready(self, timeout=840):
        value = self.host_json('wait-ready', ['--timeout', str(timeout)], timeout + 10)
        if value.get('ok') is not True or value.get('status') != 'ready' or value.get('unit') != UNIT:
            raise BrandingError('server-not-ready')
        deadline = time.monotonic() + 30
        while True:
            status = self.unit_status(UNIT)
            if (self.running(status) and status.get('ActiveState') == 'active'
                    and status.get('MainPID', '0').isdigit()
                    and int(status['MainPID']) > 0):
                return status
            if status.get('ActiveState') != 'activating' or time.monotonic() >= deadline:
                raise BrandingError('server-not-ready')
            time.sleep(0.2)

    def apply(self, icon):
        self.private_state()
        lock = self.receipt_path.parent / 'server-branding.lock'
        no_links(lock)
        fd = os.open(lock, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        try:
            info = os.fstat(fd)
            if (not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid()
                    or stat.S_IMODE(info.st_mode) != 0o600):
                raise BrandingError('unsafe-branding-lock')
            # This is intentionally separate from host.py's control lock:
            # host.py and systemd ExecStop remain free to acquire that lock.
            fcntl.flock(fd, fcntl.LOCK_EX)
            return self._apply(icon)
        finally:
            os.close(fd)

    def _apply(self, icon):
        value = read_file(icon)
        validate_icon(value)
        no_links(self.server_dir)
        if not self.server_dir.is_dir():
            raise BrandingError('server-directory-missing')
        try:
            marker = json.loads(read_file(self.server_dir / '.sunrin-server-complete.json', 16384))
        except (ValueError, TypeError):
            raise BrandingError('invalid-server-marker') from None
        if not isinstance(marker, dict) or marker.get('packId') != PACK_ID:
            raise BrandingError('server-not-owned')
        target = self.server_dir / 'server-icon.png'
        no_links(target)
        previous = read_file(target) if target.exists() else None
        changed = previous != value
        before = self.unit_status(UNIT)
        was_running = self.running(before)
        receipt = {}
        if self.receipt_path.exists() or self.receipt_path.is_symlink():
            info = self.receipt_path.lstat()
            if (not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid()
                    or stat.S_IMODE(info.st_mode) != 0o600):
                raise BrandingError('unsafe-receipt')
            try:
                receipt = json.loads(read_file(self.receipt_path, 16384))
                if not isinstance(receipt, dict):
                    raise ValueError()
            except (ValueError, TypeError):
                raise BrandingError('invalid-receipt') from None
        pending = (receipt.get('sha256') == ICON_SHA256 and receipt.get('reloadRequired') is True
                   and receipt.get('previousMainPid') == before.get('MainPID'))
        receipt = {'sha256': ICON_SHA256, 'packId': PACK_ID,
                   'reloadRequired': was_running and (changed or pending),
                   'previousMainPid': before.get('MainPID', '0')}
        backup = self.receipt_path.parent / 'server-icon.previous.png'
        no_links(backup)
        if backup.exists():
            info = backup.lstat()
            if (not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid()
                    or stat.S_IMODE(info.st_mode) != 0o600):
                raise BrandingError('unsafe-backup')
        if changed:
            if previous is not None and not backup.exists():
                self.atomic_write(backup, previous, mode=0o600)
            # Record pending work before replacing the icon, so a retry can
            # finish a reload even after interruption immediately after rename.
            self.save_receipt(receipt)
            owner = self.service_owner
            if owner is None:
                account = pwd.getpwnam('sunrin')
                owner = (account.pw_uid, account.pw_gid)
            self.atomic_write(target, value, mode=0o644, owner=owner)
        result = {'ok': True, 'status': 'applied', 'iconSha256': ICON_SHA256,
                  'changed': changed, 'reload': 'already-applied'}
        if not was_running:
            receipt['reloadRequired'] = False
            result['reload'] = 'not-running'
        elif receipt['reloadRequired']:
            if self.shutdown_pending():
                result['reload'] = 'shutdown-pending'
            else:
                ready = self.ready()
                if self.shutdown_pending():
                    result['reload'] = 'shutdown-pending'
                else:
                    request_id = str(uuid.uuid4())
                    proof = self.host_json('stop', ['--request-id', request_id,
                                                   '--timeout', '180'], 190)
                    if (proof.get('ok') is not True or proof.get('cleanStop') is not True
                            or proof.get('status') != 'stopped' or proof.get('unit') != UNIT
                            or proof.get('requestId') != request_id
                            or proof.get('mainPid') != int(ready['MainPID'])
                            or proof.get('proof') != 'rcon-save-flush-stop-process-exited'
                            or not proof.get('processStart')):
                        raise BrandingError('invalid-clean-stop-proof')
                    stopped = self.unit_status(UNIT)
                    if (stopped.get('ActiveState') not in ('inactive', 'deactivating')
                            or stopped.get('MainPID') != '0' or stopped.get('Result') != 'success'):
                        raise BrandingError('server-not-cleanly-stopped')
                    if self.shutdown_pending():
                        result['reload'] = 'shutdown-pending'
                    else:
                        # No timer command occurs here. Minecraft's existing
                        # ExecStartPost starts an already-active timer without
                        # extending its original deadline.
                        self.command(['systemctl', 'start', UNIT], 920)
                        # systemctl start already waits for this unit's own
                        # 840-second ExecStartPost readiness check.
                        self.ready(timeout=10)
                        receipt['reloadRequired'] = False
                        result['reload'] = 'reloaded'
        self.save_receipt(receipt)
        return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--icon', type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if os.geteuid() != 0:
            raise BrandingError('root-required')
        result = Branding().apply(args.icon)
        print(json.dumps(result, sort_keys=True))
        return 0
    except BrandingError as exc:
        code = exc.code
    except (OSError, ValueError, KeyError, subprocess.SubprocessError):
        code = 'branding-operation-failed'
    print(json.dumps({'ok': False, 'status': 'failed', 'code': code}, sort_keys=True))
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
