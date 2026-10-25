#!/usr/bin/env python3
"""Prepared local server update runner. All service operations are explicit argv hooks."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import string
import subprocess
import sys
import time
import uuid
import zipfile


class UpdateError(Exception):
    """A safe diagnostic that never includes command output or credentials."""


PROTECTED = {
    "world", "world_nether", "world_the_end", "config", "defaultconfigs", "accounts",
    "banned-players.json", "banned-ips.json", "ops.json", "whitelist.json", "usercache.json",
    "server.properties", "eula.txt", "permissions.json", "logs", "crash-reports",
}
HOOKS = ("announce", "save", "resumeSaves", "stop", "start", "health", "publishStatus")
PLACEHOLDERS = {"message", "state", "activeVersion", "targetVersion", "startsAt", "clientRelease"}
TERMINAL = {"succeeded", "rolled_back", "aborted"}
VERSION = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,99}\Z")
WINDOWS_RESERVED = {"con", "prn", "aux", "nul", *(f"com{i}" for i in range(1, 10)), *(f"lpt{i}" for i in range(1, 10))}


def read_json(path):
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raise UpdateError("cannot read valid JSON input") from None
    if not isinstance(value, dict):
        raise UpdateError("JSON input must be an object")
    return value


def atomic_json(path, data):
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with temporary.open("x", encoding="utf-8") as stream:
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        if os.name != "nt":
            descriptor = os.open(path.parent, os.O_RDONLY)
            try:
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
    finally:
        temporary.unlink(missing_ok=True)


def safe_part(value):
    return (isinstance(value, str) and value not in {"", ".", ".."}
            and not any(char in value for char in "/\\:\x00")
            and not any(ord(char) < 32 for char in value)
            and value.rstrip(" .") == value
            and value.split(".")[0].casefold() not in WINDOWS_RESERVED)


def roots(value, label):
    if not isinstance(value, list) or not value or not all(safe_part(part) for part in value):
        raise UpdateError(f"{label} must be a nonempty list of safe top-level names")
    if len({part.casefold() for part in value}) != len(value):
        raise UpdateError(f"{label} contains colliding paths")
    return sorted(value)


def positive_number(value, label, maximum=86400):
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not math.isfinite(value) or not 0 < value <= maximum):
        raise UpdateError(f"{label} must be a positive bounded number")
    return float(value)


def raise_walk_error(error):
    raise error


def file_hash(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class SystemClock:
    @staticmethod
    def now():
        return datetime.now(timezone.utc)

    sleep = staticmethod(time.sleep)
    monotonic = staticmethod(time.monotonic)


class Updater:
    def __init__(self, config_path, schedule_path, *, clock=None):
        self.config_path = Path(config_path).resolve()
        self.schedule_path = Path(schedule_path).resolve()
        self.config = read_json(self.config_path)
        self.schedule = read_json(self.schedule_path)
        self.clock = clock or SystemClock()
        self.journal = None
        self.emergency = False
        self.journal_write_failed = False
        if self.config.get("formatVersion") != 1 or self.schedule.get("formatVersion") != 1:
            raise UpdateError("unsupported formatVersion")
        self.target = self.schedule.get("targetVersion")
        self.active = self.config.get("activeVersion")
        for value in [self.target, self.active]:
            if not isinstance(value, str) or not VERSION.fullmatch(value) or value in {".", ".."}:
                raise UpdateError("version must be a safe nonempty identifier")
        try:
            self.apply_at = datetime.fromisoformat(self.schedule["applyAt"].replace("Z", "+00:00"))
        except (KeyError, TypeError, ValueError, AttributeError):
            raise UpdateError("applyAt must be an ISO 8601 timestamp with a timezone offset") from None
        if self.apply_at.tzinfo is None or self.apply_at.utcoffset() is None:
            raise UpdateError("applyAt requires a timezone offset")
        self.starts_at = self.apply_at.isoformat()
        notices = self.schedule.get("announcementsSeconds", [300, 60, 10])
        if (not isinstance(notices, list) or not notices
                or any(isinstance(n, bool) or not isinstance(n, int) or not 0 <= n <= 86400 for n in notices)
                or len(set(notices)) != len(notices)):
            raise UpdateError("announcementsSeconds must contain distinct nonnegative seconds up to one day")
        self.notices = sorted(notices, reverse=True)
        self.base = self.config_path.parent
        self.server = self.path_option("serverDirectory")
        self.state = self.path_option("stateDirectory")
        if self.state == self.server or self.state.is_relative_to(self.server) or self.server.is_relative_to(self.state):
            raise UpdateError("stateDirectory and serverDirectory must be separate, non-nested directories")
        self.journal_path = self.state / "journal.json"
        self.managed = roots(self.config.get("managedPaths"), "managedPaths")
        custom_protected = self.config.get("protectedPaths", [])
        if not isinstance(custom_protected, list) or not all(safe_part(part) for part in custom_protected):
            raise UpdateError("protectedPaths must contain safe top-level names")
        self.protected = sorted(PROTECTED | set(custom_protected))
        if {part.casefold() for part in self.managed} & {part.casefold() for part in self.protected}:
            raise UpdateError("managedPaths overlaps a protected persistent path")
        template = self.config.get("releaseManifestTemplate")
        if not isinstance(template, str) or template.count("{version}") != 1:
            raise UpdateError("releaseManifestTemplate must contain one {version} placeholder")
        try:
            manifest_name = template.format(version=self.target)
        except (KeyError, ValueError):
            raise UpdateError("invalid releaseManifestTemplate") from None
        self.manifest_path = (self.base / manifest_name).resolve()
        self.hooks = self.config.get("hooks", {})
        self.health_config = self.config.get("health", {})
        if not isinstance(self.health_config, dict):
            raise UpdateError("health must be an object")
        self.health_timeout = positive_number(self.health_config.get("timeoutSeconds", 120), "health timeoutSeconds", 3600)
        self.health_retry = positive_number(self.health_config.get("retrySeconds", 5), "health retrySeconds", 300)
        self.health_command_timeout = positive_number(self.health_config.get("commandTimeoutSeconds", 10), "health commandTimeoutSeconds", 300)
        self.command_timeout = positive_number(self.config.get("commandTimeoutSeconds", 120), "commandTimeoutSeconds", 3600)
        self.client_release = ""

    def path_option(self, key):
        value = self.config.get(key)
        if not isinstance(value, str) or not value:
            raise UpdateError(f"{key} must be a local path")
        return (self.config_path.parent / value).resolve()

    def validate_hooks(self):
        if not isinstance(self.hooks, dict):
            raise UpdateError("hooks must be an object of command arrays")
        for name in HOOKS:
            command = self.hooks.get(name)
            if not isinstance(command, list) or not command or not all(isinstance(part, str) and part and "\x00" not in part for part in command):
                raise UpdateError(f"hook {name} is not configured as an argv array")
            if Path(command[0]).name.casefold() in {"sh", "bash", "zsh", "fish", "cmd", "cmd.exe", "powershell", "pwsh"}:
                raise UpdateError(f"hook {name} must use an executable adapter, not a shell")
            try:
                for argument in command:
                    for _, field, spec, conversion in string.Formatter().parse(argument):
                        if field is not None and (field not in PLACEHOLDERS or spec or conversion):
                            raise ValueError()
            except ValueError:
                raise UpdateError(f"hook {name} has an unsupported placeholder") from None
            executable = command[0]
            if "{" in executable or "}" in executable:
                raise UpdateError(f"hook {name} executable cannot contain placeholders")
            if os.path.dirname(executable):
                candidate = (self.server / executable).resolve()
                available = candidate.is_file() and os.access(candidate, os.X_OK)
            else:
                available = shutil.which(executable) is not None
            if not available:
                raise UpdateError(f"hook {name} executable is unavailable")

    def guard(self):
        if self.config.get("enabled") is not True:
            raise UpdateError("execution is disabled; enable only an operator-configured copy")
        self.validate_hooks()
        if not self.server.is_dir():
            raise UpdateError("serverDirectory is not an existing directory")
        self.check_server_tree()

    def check_server_tree(self):
        # No external trees or special files may enter the snapshot or be followed during restore.
        for parent, directories, files in os.walk(self.server, followlinks=False, onerror=raise_walk_error):
            for name in directories + files:
                entry = Path(parent) / name
                mode = entry.lstat().st_mode
                if not (stat.S_ISREG(mode) or stat.S_ISDIR(mode)):
                    raise UpdateError("serverDirectory contains a symlink or special file")

    @contextmanager
    def lock(self):
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)
        descriptor = os.open(self.state / "update.lock", os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0), 0o600)
        acquired = False
        try:
            try:
                if os.name == "nt":
                    import msvcrt
                    if os.fstat(descriptor).st_size == 0:
                        os.write(descriptor, b"0")
                    os.lseek(descriptor, 0, os.SEEK_SET)
                    msvcrt.locking(descriptor, msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
                acquired = True
            except (OSError, BlockingIOError):
                raise UpdateError("update is locked by another process") from None
            yield
        finally:
            if acquired:
                if os.name == "nt":
                    import msvcrt
                    os.lseek(descriptor, 0, os.SEEK_SET)
                    msvcrt.locking(descriptor, msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(descriptor, fcntl.LOCK_UN)
            os.close(descriptor)

    def plan(self, *, recover=False):
        result = {"mode": "recover-plan" if recover else "plan", "enabled": self.config.get("enabled") is True,
                  "activeVersion": self.active, "targetVersion": self.target, "applyAt": self.starts_at,
                  "releaseManifest": str(self.manifest_path), "releasePresent": self.manifest_path.is_file(),
                  "managedPaths": self.managed, "protectedPaths": self.protected,
                  "steps": ["verify and stage local release", "scheduled pre-announcements", "freeze and flush saves",
                            "snapshot entire server directory", "stop", "replace managed paths", "start", "bounded health check",
                            "publish healthy client release; otherwise restore and restart original"]}
        try:
            self.validate_hooks()
            result["hooksConfigured"] = True
        except UpdateError:
            result["hooksConfigured"] = False
        if self.journal_path.exists():
            journal = read_json(self.journal_path)
            result["activeVersion"] = journal.get("activeVersion", self.active)
            result["journalPhase"] = journal.get("phase")
            result["recoveryRequired"] = journal.get("phase") not in TERMINAL
            if recover:
                result["recoveryActiveVersion"] = journal.get("originalVersion")
                result["backupDirectory"] = journal.get("backupDirectory")
        elif recover:
            raise UpdateError("no recovery journal exists")
        return result

    def event(self, name, *, phase=None, **details):
        if phase:
            self.journal["phase"] = phase
        self.journal["events"].append({"at": self.clock.now().isoformat(), "event": name, **details})
        self.journal["updatedAt"] = self.clock.now().isoformat()
        try:
            atomic_json(self.journal_path, self.journal)
            atomic_json(Path(self.journal["runDirectory"]) / "journal.json", self.journal)
        except OSError:
            if not self.emergency:
                raise
            # Resume/stop/restore must still run when a disk error prevents audit writes.
            # The last durable nonterminal journal continues to require explicit recovery.
            self.journal_write_failed = True

    def values(self, *, state="maintenance", message="", active=None):
        return {"state": state, "message": message, "activeVersion": active or self.active,
                "targetVersion": self.target, "startsAt": self.starts_at, "clientRelease": self.client_release}

    def command(self, name, *, timeout=None, **values):
        parameters = self.values(**values)
        arguments = [part.format_map(parameters) for part in self.hooks[name]]
        try:
            result = subprocess.run(arguments, cwd=self.server, stdin=subprocess.DEVNULL,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                    timeout=timeout or self.command_timeout, shell=False, check=False)
        except (OSError, subprocess.TimeoutExpired):
            raise UpdateError(f"hook {name} failed or timed out") from None
        if result.returncode:
            raise UpdateError(f"hook {name} failed")
        self.event("hook_completed", hook=name)

    def publish(self, state, message, *, active=None):
        self.journal["statusTouched"] = True
        self.event("status_publish_intent", state=state)
        self.command("publishStatus", state=state, message=message, active=active)
        self.journal["status"] = {"state": state, "message": message, "activeVersion": active or self.active,
                                  "targetVersion": self.target, "startsAt": self.starts_at}
        self.event("status_published", state=state)

    def stage(self, destination):
        manifest = read_json(self.manifest_path)
        if manifest.get("formatVersion") != 1 or manifest.get("version") != self.target:
            raise UpdateError("server release version does not match targetVersion")
        if roots(manifest.get("managedPaths"), "release managedPaths") != self.managed:
            raise UpdateError("release managedPaths does not match the configured allowlist")
        archive_spec = manifest.get("archive")
        if not isinstance(archive_spec, dict) or not isinstance(archive_spec.get("path"), str):
            raise UpdateError("release archive requires a local path and sha256")
        archive_name = archive_spec["path"]
        if "://" in archive_name:
            raise UpdateError("only independently prepared local server archives are supported")
        expected_hash = archive_spec.get("sha256", "")
        if not isinstance(expected_hash, str) or not re.fullmatch(r"[a-fA-F0-9]{64}", expected_hash):
            raise UpdateError("release archive requires a sha256 checksum")
        archive_path = (self.manifest_path.parent / archive_name).resolve()
        archive_snapshot = destination.parent / "server-release.zip"
        try:
            with archive_path.open("rb") as source, archive_snapshot.open("xb") as output:
                shutil.copyfileobj(source, output)
                output.flush()
                os.fsync(output.fileno())
            actual_hash = file_hash(archive_snapshot)
        except OSError:
            raise UpdateError("cannot read local release archive") from None
        if actual_hash != expected_hash.lower():
            raise UpdateError("release archive checksum mismatch")
        client_name = manifest.get("clientRelease")
        if not isinstance(client_name, str) or not client_name or "://" in client_name:
            raise UpdateError("clientRelease must name a local client channel descriptor")
        client_path = (self.manifest_path.parent / client_name).resolve()
        client_descriptor = read_json(client_path)
        if client_descriptor.get("version") != self.target:
            raise UpdateError("clientRelease version does not match targetVersion")
        client_snapshot = destination.parent / "client-release.json"
        atomic_json(client_snapshot, client_descriptor)
        self.client_release = str(client_snapshot)
        try:
            with zipfile.ZipFile(archive_snapshot) as archive:
                members = self.validate_archive(archive)
                destination.mkdir()
                for member, path in members:
                    target = destination.joinpath(*path.parts)
                    if member.is_dir():
                        target.mkdir(parents=True, exist_ok=True)
                    else:
                        target.parent.mkdir(parents=True, exist_ok=True)
                        with archive.open(member) as source, target.open("xb") as output:
                            shutil.copyfileobj(source, output)
                            output.flush()
                            os.fsync(output.fileno())
                        mode = (member.external_attr >> 16) & 0o777
                        target.chmod(0o755 if mode & 0o111 else 0o644)
        except (OSError, ValueError, RuntimeError, zipfile.BadZipFile):
            raise UpdateError("cannot safely stage the complete release archive") from None
        self.event("release_verified_and_staged", phase="prepared")

    def validate_archive(self, archive):
        members = archive.infolist()
        if not members or len(members) > 100000 or sum(member.file_size for member in members) > 16 * 1024 ** 3:
            raise UpdateError("archive is empty or exceeds extraction limits")
        seen, entries, spelling = {}, [], {}
        for member in members:
            name = member.filename.rstrip("/")
            path = PurePosixPath(name)
            if (not name or name.startswith("/") or "\\" in name or str(path) != name
                    or member.filename != name + ("/" if member.is_dir() else "")
                    or not all(safe_part(part) for part in path.parts) or path.parts[0] not in self.managed):
                raise UpdateError("archive contains a path outside the managed allowlist")
            mode = member.external_attr >> 16
            if (member.flag_bits & 1) or (stat.S_IFMT(mode) not in {0, stat.S_IFREG, stat.S_IFDIR}):
                raise UpdateError("archive contains an encrypted or special entry")
            key = name.casefold()
            if key in seen:
                raise UpdateError("archive contains colliding paths")
            for depth in range(1, len(path.parts) + 1):
                prefix = "/".join(path.parts[:depth])
                if spelling.get(prefix.casefold(), prefix) != prefix:
                    raise UpdateError("archive contains colliding directory spellings")
                spelling[prefix.casefold()] = prefix
            seen[key] = member.is_dir()
            entries.append((member, path))
        for name in seen:
            parent = PurePosixPath(name).parent
            while str(parent) != ".":
                if str(parent) in seen and not seen[str(parent)]:
                    raise UpdateError("archive contains a file/directory collision")
                parent = parent.parent
        return entries

    def wait_until(self, when):
        while (remaining := (when - self.clock.now()).total_seconds()) > 0:
            self.clock.sleep(min(remaining, 60))

    def preannounce(self):
        self.publish("scheduled", f"Server update to {self.target} is scheduled.")
        delivered = False
        remaining = (self.apply_at - self.clock.now()).total_seconds()
        if 0 < remaining < min(self.notices):
            self.command("announce", state="scheduled", message=f"Server update to {self.target} in {math.ceil(remaining)} seconds.")
            delivered = True
        for seconds in self.notices:
            when = datetime.fromtimestamp(self.apply_at.timestamp() - seconds, tz=timezone.utc)
            if when < self.clock.now():
                continue
            self.wait_until(when)
            self.command("announce", state="scheduled", message=f"Server update to {self.target} in {seconds} seconds.")
            delivered = True
        self.wait_until(self.apply_at)
        if not delivered:
            self.command("announce", message=f"Server update to {self.target} begins now.")

    def backup(self, destination):
        self.check_server_tree()
        shutil.copytree(self.server, destination, symlinks=True)
        # The complete snapshot and marker are durable before any stop or managed-file change.
        self.sync_tree(destination)

    @staticmethod
    def snapshot_index(directory):
        index = {}
        for parent, directories, files in os.walk(directory, followlinks=False, onerror=raise_walk_error):
            for name in directories + files:
                path = Path(parent) / name
                mode = path.lstat().st_mode
                relative = path.relative_to(directory).as_posix()
                if stat.S_ISDIR(mode):
                    index[relative] = {"kind": "directory"}
                elif stat.S_ISREG(mode):
                    index[relative] = {"kind": "file", "sha256": file_hash(path)}
                else:
                    raise UpdateError("snapshot contains a symlink or special file")
        return index

    def seal_backup(self, directory):
        index_path = directory.parent / "snapshot-index.json"
        atomic_json(index_path, self.snapshot_index(directory))
        self.journal["backupIndexSha256"] = file_hash(index_path)

    def verify_backup(self):
        directory = Path(self.journal["backupDirectory"])
        index_path = directory.parent / "snapshot-index.json"
        if (not directory.is_dir() or directory.is_symlink()
                or file_hash(index_path) != self.journal.get("backupIndexSha256")
                or self.snapshot_index(directory) != read_json(index_path)):
            raise UpdateError("snapshot integrity validation failed")

    @staticmethod
    def sync_tree(directory):
        for parent, _, files in os.walk(directory, onerror=raise_walk_error):
            for name in files:
                with (Path(parent) / name).open("rb") as stream:
                    os.fsync(stream.fileno())
            if os.name != "nt":
                descriptor = os.open(parent, os.O_RDONLY)
                try:
                    os.fsync(descriptor)
                finally:
                    os.close(descriptor)

    @staticmethod
    def remove_owned(path):
        if path.is_symlink() or path.is_file():
            path.unlink()
        elif path.exists():
            shutil.rmtree(path)

    @staticmethod
    def copy_owned(source, destination):
        if source.is_dir():
            shutil.copytree(source, destination, symlinks=True)
        elif source.exists():
            shutil.copy2(source, destination)

    def apply(self, stage):
        for name in self.managed:
            self.remove_owned(self.server / name)
            self.copy_owned(stage / name, self.server / name)
        self.sync_tree(self.server)

    def check_health(self):
        timer = getattr(self.clock, "monotonic", lambda: self.clock.now().timestamp())
        deadline = timer() + self.health_timeout
        while (remaining := deadline - timer()) > 0:
            try:
                self.command("health", timeout=min(remaining, self.health_command_timeout))
                self.event("health_passed")
                return
            except UpdateError:
                self.event("health_retry")
                remaining = deadline - timer()
                if remaining > 0:
                    self.clock.sleep(min(self.health_retry, remaining))
        raise UpdateError("health check deadline exceeded")

    def execute(self):
        self.guard()  # Disabled/unconfigured examples do not create even the lock directory.
        with self.lock():
            if self.journal_path.exists():
                previous = read_json(self.journal_path)
                if previous.get("phase") not in TERMINAL:
                    raise UpdateError("unfinished update journal; inspect --recover --plan and use explicit --recover --execute")
                # Completed journals, not a stale config copy, are the authority for activeVersion.
                self.active = previous.get("activeVersion", self.active)
            if self.target == self.active:
                raise UpdateError("targetVersion is already active")
            run_id = uuid.uuid4().hex
            run = self.state / "runs" / run_id
            run.mkdir(parents=True, mode=0o700)
            self.journal = {"formatVersion": 1, "id": run_id, "phase": "verifying", "events": [],
                            "originalVersion": self.active, "activeVersion": self.active, "targetVersion": self.target,
                            "startsAt": self.starts_at, "serverDirectory": str(self.server), "runDirectory": str(run),
                            "backupDirectory": str(run / "backup"), "managedPaths": self.managed,
                            "protectedPaths": self.protected, "backupComplete": False, "saveIntent": False, "stopIntent": False}
            self.event("update_created")
            try:
                self.stage(run / "stage")
                self.journal["clientRelease"] = self.client_release
                self.preannounce()
                self.publish("maintenance", f"Applying server update to {self.target}.")
                self.journal["saveIntent"] = True
                self.event("save_freeze_intent", phase="freeze_intent")
                self.command("save")
                self.event("world_saved_and_frozen", phase="frozen")
                self.event("backup_started", phase="backing_up")
                self.backup(run / "backup")
                self.seal_backup(run / "backup")
                self.journal["backupComplete"] = True
                self.event("backup_complete", phase="backed_up")
                self.journal["stopIntent"] = True
                self.event("stop_intent", phase="stop_intent")
                self.command("stop")
                self.event("server_stopped", phase="stopped")
                self.event("apply_intent", phase="applying")
                self.apply(run / "stage")
                self.event("managed_paths_applied", phase="applied")
                self.event("start_intent", phase="starting")
                self.command("start")
                self.check_health()
                self.event("promote_client_release", phase="healthy")
                self.publish("online", f"Server update to {self.target} is healthy.", active=self.target)
                self.journal["activeVersion"] = self.target
                self.event("update_succeeded", phase="succeeded")
            except Exception as error:
                self.emergency = True
                self.event("update_failed", failureType=type(error).__name__,
                           reason=str(error) if isinstance(error, UpdateError) else "local operation failed")
                if self.journal["stopIntent"]:
                    self.rollback()
                elif self.journal["saveIntent"]:
                    self.abort_frozen()
                else:
                    self.abort_before_save()
                if isinstance(error, UpdateError):
                    raise error from None
                raise UpdateError("update failed; inspect the nonsecret journal for recovery outcome") from None

    def abort_frozen(self):
        try:
            self.command("resumeSaves")
            self.check_health()
            self.publish("online", "Update aborted before stopping; original server remains active.")
            self.event("saves_resumed", phase="aborted")
        except Exception:
            self.fail_recovery()
            raise UpdateError("could not resume saves; explicit recovery is required") from None

    def abort_before_save(self):
        try:
            if self.journal.get("statusTouched"):
                self.check_health()
                self.publish("online", "Update aborted before saving; original server remains healthy.")
            self.event("update_aborted_before_save", phase="aborted")
        except Exception:
            self.fail_recovery()
            raise UpdateError("could not restore original online status; explicit recovery is required") from None

    def fail_recovery(self):
        self.journal["activeVersion"] = self.journal["originalVersion"]
        self.event("recovery_failed", phase="recovery_failed")
        try:
            self.publish("failed", "Update recovery needs operator attention; original release remains selected.")
        except Exception:
            self.event("failed_status_publish_failed")

    def rollback(self):
        try:
            if not self.journal["backupComplete"]:
                raise UpdateError("no complete backup is available")
            self.active = self.journal["originalVersion"]
            self.journal["activeVersion"] = self.active
            self.event("rollback_stop_intent", phase="rolling_back")
            self.command("stop")  # Never restore files under a possibly running target.
            self.verify_backup()  # Validate the complete snapshot before deleting any current path.
            self.event("rollback_restore_intent")
            backup = Path(self.journal["backupDirectory"])
            for name in sorted(set(self.managed + self.protected)):
                self.remove_owned(self.server / name)
                self.copy_owned(backup / name, self.server / name)
            self.sync_tree(self.server)
            self.event("snapshot_restored")
            self.command("start")
            self.command("resumeSaves")
            self.check_health()
            self.publish("online", f"Update to {self.target} failed; restored healthy server {self.active}.")
            self.event("rollback_succeeded", phase="rolled_back")
        except Exception:
            self.fail_recovery()
            raise UpdateError("rollback incomplete; explicit recovery and operator attention are required") from None

    def recover(self):
        self.guard()
        with self.lock():
            self.journal = read_json(self.journal_path)
            if self.journal.get("phase") in TERMINAL:
                raise UpdateError("journal is complete; no recovery is required")
            run = self.state / "runs" / str(self.journal.get("id", ""))
            if (self.journal.get("formatVersion") != 1 or not re.fullmatch(r"[a-f0-9]{32}", str(self.journal.get("id", "")))
                    or self.journal.get("serverDirectory") != str(self.server)
                    or self.journal.get("managedPaths") != self.managed or self.journal.get("protectedPaths") != self.protected
                    or self.journal.get("runDirectory") != str(run)
                    or self.journal.get("backupDirectory") != str(run / "backup")
                    or not isinstance(self.journal.get("events"), list)):
                raise UpdateError("recovery journal does not match the configured server and owned paths")
            self.active = self.journal["originalVersion"]
            self.target = self.journal["targetVersion"]
            self.starts_at = self.journal["startsAt"]
            self.client_release = self.journal.get("clientRelease", "")
            self.emergency = True
            if self.journal.get("stopIntent"):
                if not (run / "backup").is_dir() or not self.journal.get("backupComplete"):
                    raise UpdateError("complete backup is missing; do not continue automatically")
                self.rollback()
            elif self.journal.get("saveIntent"):
                self.abort_frozen()
            else:
                self.abort_before_save()
            if self.journal_write_failed:
                raise UpdateError("recovery actions completed but journal storage failed; repair storage and repeat explicit recovery")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=Path(__file__).with_name("config.example.json"))
    parser.add_argument("--schedule", type=Path, default=Path(__file__).with_name("schedule.example.json"))
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--plan", action="store_true", help="read-only plan; no network, hooks, or filesystem writes")
    mode.add_argument("--execute", action="store_true", help="execute only an enabled, fully configured local installation")
    parser.add_argument("--recover", action="store_true", help="explicitly restore an interrupted run, never continue the target")
    arguments = parser.parse_args(argv)
    try:
        updater = Updater(arguments.config, arguments.schedule)
        if arguments.plan:
            print(json.dumps(updater.plan(recover=arguments.recover), indent=2, ensure_ascii=False))
        elif arguments.recover:
            updater.recover()
        else:
            updater.execute()
        return 0
    except UpdateError as error:
        print(f"server updater: {error}", file=sys.stderr)
        return 1
    except (OSError, ValueError, KeyError, TypeError):
        print("server updater: local input or filesystem failure; inspect the journal before recovery", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
