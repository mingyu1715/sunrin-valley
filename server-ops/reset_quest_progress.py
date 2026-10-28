#!/usr/bin/env python3
"""Explicit, offline FTB Quests 2001.4.17 reset. Dry-run is the default."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import errno
import fcntl
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import struct
import sys
import tempfile
import uuid
import zlib


PROGRESS_KEYS = frozenset(('task_progress', 'started', 'completed', 'claimed_rewards'))
QUEST_STAGES = frozenset(('abandoned_farm_complete', 'boiler_room_complete', 'vault_complete',
                          'community_center_complete', 'ftbchunks_mapping'))
UUID_PATTERN = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
TARGET_PATTERN = re.compile(r'(?:ftbquests/' + UUID_PATTERN + r'\.snbt|playerdata/' + UUID_PATTERN + r'\.dat)\Z')
MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_DEPTH = 128


class ResetError(Exception):
    """A refused operation or a transaction that did not finish."""


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def checked_path(value):
    raw = os.fspath(value)
    if not raw or '\x00' in raw or '\\' in raw or any(part in ('.', '..') for part in raw.split('/')):
        raise ResetError('Empty, ambiguous, or traversing path refused: ' + repr(raw))
    path = Path(os.path.abspath(raw))
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current = current / part
        try:
            if stat.S_ISLNK(current.lstat().st_mode):
                raise ResetError('Symlink path refused: ' + str(current))
        except FileNotFoundError:
            continue
    return path


def read_file(path):
    path = checked_path(path)
    flags = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0)
    with os.fdopen(os.open(path, flags), 'rb') as stream:
        metadata = os.fstat(stream.fileno())
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_nlink != 1:
            raise ResetError('Expected a regular file without hard links: ' + str(path))
        data = stream.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise ResetError('File exceeds reset size limit: ' + str(path))
    return data, stat.S_IMODE(metadata.st_mode)


@contextmanager
def locked_world(server, world):
    server = checked_path(server)
    world_input = checked_path(world) if Path(world).is_absolute() else checked_path(server / os.fspath(world))
    if not server.is_dir() or not world_input.is_dir() or world_input == server or not world_input.is_relative_to(server):
        raise ResetError('World must be an existing directory inside the explicit server directory')
    lock = checked_path(world_input / 'session.lock')
    flags = os.O_RDWR | getattr(os, 'O_NOFOLLOW', 0)
    with os.fdopen(os.open(lock, flags), 'r+b') as stream:
        metadata = os.fstat(stream.fileno())
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_nlink != 1:
            raise ResetError('Invalid world session.lock')
        try:
            # FileChannel.tryLock in Minecraft uses POSIX record locking, not flock.
            fcntl.lockf(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            if error.errno in (errno.EACCES, errno.EAGAIN):
                raise ResetError('World session.lock is in use; stop the server before using this tool') from error
            raise
        try:
            current = lock.stat()
            if (current.st_dev, current.st_ino) != (metadata.st_dev, metadata.st_ino):
                raise ResetError('World session.lock changed while acquiring it')
            yield server, world_input
        finally:
            fcntl.lockf(stream.fileno(), fcntl.LOCK_UN)


class SnbtReader:
    """Validate FTB's newline-separated SNBT and locate root value spans."""
    def __init__(self, text):
        self.text, self.index, self.fields = text, 0, {}

    def space(self):
        while self.index < len(self.text):
            if self.text[self.index].isspace():
                self.index += 1
            elif self.text.startswith('//', self.index) or self.text[self.index] == '#':
                end = self.text.find('\n', self.index)
                self.index = len(self.text) if end < 0 else end + 1
            elif self.text.startswith('/*', self.index):
                end = self.text.find('*/', self.index + 2)
                if end < 0:
                    raise ResetError('Unterminated SNBT comment')
                self.index = end + 2
            else:
                return

    def peek(self):
        return self.text[self.index:self.index + 1]

    def expect(self, char):
        if self.peek() != char:
            raise ResetError('Malformed SNBT at character ' + str(self.index))
        self.index += 1

    def quoted(self):
        quote = self.peek()
        self.index += 1
        result = []
        while self.index < len(self.text):
            char = self.peek()
            self.index += 1
            if char == quote:
                return ''.join(result)
            if char == '\\':
                char = self.peek()
                self.index += 1
                if char == 'u':
                    digits = self.text[self.index:self.index + 4]
                    if not re.fullmatch('[0-9a-fA-F]{4}', digits):
                        raise ResetError('Invalid SNBT Unicode escape')
                    result.append(chr(int(digits, 16)))
                    self.index += 4
                    continue
                escapes = {'n': '\n', 'r': '\r', 't': '\t', 'b': '\b', 'f': '\f',
                           '\\': '\\', '"': '"', "'": "'"}
                if char not in escapes:
                    raise ResetError('Invalid SNBT string escape')
                char = escapes[char]
            result.append(char)
        raise ResetError('Unterminated SNBT string')

    def key(self):
        if self.peek() in ('"', "'"):
            return self.quoted()
        match = re.match(r'[A-Za-z0-9_.+\-]+', self.text[self.index:])
        if not match:
            raise ResetError('Invalid SNBT compound key')
        self.index += len(match.group())
        return match.group()

    @staticmethod
    def element_type(kind, scalar):
        if kind != 'atom':
            return kind
        if scalar.lower() in ('true', 'false'):
            return 'byte'
        numeric = (('byte', r'[+-]?[0-9]+[bB]', 8),
                   ('short', r'[+-]?[0-9]+[sS]', 16),
                   ('long', r'[+-]?[0-9]+[lL]', 64),
                   ('int', r'[+-]?(?:0|[1-9][0-9]*)', 32))
        for name, pattern, bits in numeric:
            if re.fullmatch(pattern, scalar):
                number = int(scalar if name == 'int' else scalar[:-1])
                # Native numeric parse overflow becomes a string tag, which cannot
                # occur inside a numeric typed array or a list of numeric tags.
                return name if -(1 << (bits - 1)) <= number < (1 << (bits - 1)) else 'string'
        decimal = r'[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?'
        if re.fullmatch(decimal + '[fF]', scalar):
            return 'float'
        if re.fullmatch(decimal + '[dD]', scalar) or re.fullmatch(decimal, scalar):
            return 'double'
        return 'string'

    def value(self, depth):
        if depth > MAX_DEPTH:
            raise ResetError('SNBT nesting limit exceeded')
        char = self.peek()
        if char == '{':
            self.compound(depth)
            return 'compound', None
        if char == '[':
            self.index += 1
            self.space()
            required = None
            if self.peek() in ('B', 'I', 'L') and self.text[self.index + 1:self.index + 2] == ';':
                required = {'B': 'byte', 'I': 'int', 'L': 'long'}[self.peek()]
                self.index += 2
            self.space()
            element_type = required
            while self.peek() != ']':
                if not self.peek():
                    raise ResetError('Unterminated SNBT list')
                kind, scalar = self.value(depth + 1)
                actual = self.element_type(kind, scalar)
                if element_type is None:
                    element_type = actual
                elif actual != element_type:
                    raise ResetError('Invalid SNBT array/list element type: expected ' + element_type + ', got ' + actual)
                self.space()
                if self.peek() == ',':
                    self.index += 1
                    self.space()
            self.index += 1
            return required + '_array' if required else 'list', None
        if char in ('"', "'"):
            return 'string', self.quoted()
        match = re.match(r'[^\s,{}\[\]"\']+', self.text[self.index:])
        if not match:
            raise ResetError('Invalid SNBT value')
        self.index += len(match.group())
        return 'atom', match.group()

    def compound(self, depth=0):
        self.expect('{')
        self.space()
        seen = set()
        while self.peek() != '}':
            if not self.peek():
                raise ResetError('Unterminated SNBT compound')
            key = self.key()
            if key in seen:
                raise ResetError('Duplicate SNBT key: ' + key)
            seen.add(key)
            self.space()
            self.expect(':')
            self.space()
            start = self.index
            kind, scalar = self.value(depth + 1)
            if depth == 0:
                self.fields[key] = (start, self.index, kind, scalar)
            self.space()
            if self.peek() == ',':
                self.index += 1
                self.space()
        self.index += 1


def reset_snbt(data, team):
    text = data.decode('utf-8')
    reader = SnbtReader(text)
    reader.space()
    reader.compound()
    reader.space()
    if reader.index != len(text):
        raise ResetError('Trailing SNBT content')
    fields = reader.fields
    if fields.get('version', (None, None, None, None))[3] != '1':
        raise ResetError('Only FTB Quests TeamData version 1 is supported')
    try:
        stored_uuid = fields['uuid']
        if stored_uuid[2] != 'string' or str(uuid.UUID(stored_uuid[3])) != team:
            raise ValueError('team UUID mismatch')
    except (KeyError, ValueError, AttributeError) as error:
        raise ResetError('Quest UUID must match the canonical filename: ' + team) from error
    spans = []
    for key in PROGRESS_KEYS:
        if key not in fields or fields[key][2] != 'compound':
            raise ResetError('Missing or invalid progress compound: ' + key)
        spans.append(fields[key][:2])
    for start, end in sorted(spans, reverse=True):
        text = text[:start] + '{}' + text[end:]
    return text.encode('utf-8')


class NbtReader:
    """Skip binary NBT, changing only the root Tags list payload span."""
    def __init__(self, data):
        self.data, self.index, self.tags = data, 0, None

    def take(self, length):
        if length < 0 or length > len(self.data) - self.index:
            raise ResetError('Truncated or invalid binary NBT')
        result = self.data[self.index:self.index + length]
        self.index += length
        return result

    def byte(self):
        return self.take(1)[0]

    def length(self):
        value = struct.unpack('>i', self.take(4))[0]
        if value < 0 or value > MAX_FILE_BYTES:
            raise ResetError('Invalid NBT collection length')
        return value

    def string(self):
        return self.take(struct.unpack('>H', self.take(2))[0])

    def payload(self, kind, depth=0):
        if depth > MAX_DEPTH:
            raise ResetError('NBT nesting limit exceeded')
        widths = {1: 1, 2: 2, 3: 4, 4: 8, 5: 4, 6: 8}
        if kind in widths:
            self.take(widths[kind])
        elif kind in (7, 11, 12):
            self.take(self.length() * {7: 1, 11: 4, 12: 8}[kind])
        elif kind == 8:
            self.string()
        elif kind == 9:
            element, count = self.byte(), self.length()
            if element > 12 or (element == 0 and count):
                raise ResetError('Invalid NBT list element type')
            for _ in range(count):
                self.payload(element, depth + 1)
        elif kind == 10:
            seen = set()
            while True:
                child = self.byte()
                if child == 0:
                    return
                name = self.string()
                if name in seen:
                    raise ResetError('Duplicate NBT compound name')
                seen.add(name)
                if depth == 0 and name == b'Tags':
                    if child != 9:
                        raise ResetError('Root Tags must be a string list')
                    self.read_tags()
                else:
                    self.payload(child, depth + 1)
        else:
            raise ResetError('Unknown NBT tag type: ' + str(kind))

    def read_tags(self):
        start = self.index
        element, count = self.byte(), self.length()
        if element != 8 and not (element == 0 and count == 0):
            raise ResetError('Root Tags must be a string list')
        kept, removed = [], []
        stages = {stage.encode('ascii') for stage in QUEST_STAGES}
        for _ in range(count):
            item_start = self.index
            value = self.string()
            if value in stages:
                removed.append(value.decode('ascii'))
            else:
                kept.append(self.data[item_start:self.index])
        replacement = bytes([element]) + struct.pack('>i', len(kept)) + b''.join(kept)
        self.tags = (start, self.index, replacement, removed)


def reset_player(data):
    try:
        with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
            raw = stream.read(MAX_FILE_BYTES + 1)
    except (OSError, EOFError, zlib.error) as error:
        raise ResetError('Invalid gzip player data') from error
    if len(raw) > MAX_FILE_BYTES:
        raise ResetError('Decompressed NBT exceeds reset size limit')
    reader = NbtReader(raw)
    if reader.byte() != 10:
        raise ResetError('Player NBT root must be a compound')
    reader.string()  # The root name is deliberately preserved verbatim.
    reader.payload(10)
    if reader.index != len(raw):
        raise ResetError('Trailing binary NBT content')
    if not reader.tags or not reader.tags[3]:
        return data, []
    start, end, replacement, removed = reader.tags
    updated = raw[:start] + replacement + raw[end:]
    return gzip.compress(updated, mtime=0), removed


def target_files(world):
    for directory, extension in (('ftbquests', '.snbt'), ('playerdata', '.dat')):
        root = checked_path(world / directory)
        if not root.exists():
            continue
        if not root.is_dir():
            raise ResetError('Expected a directory: ' + str(root))
        for path in sorted(root.iterdir()):
            checked_path(path)  # Reject symlinks even when their filenames are not targets.
            relative = directory + '/' + path.name
            if TARGET_PATTERN.fullmatch(relative):
                if path.suffix != extension:
                    raise ResetError('Unexpected target extension')
                yield path, relative


def reset_plan(world):
    changes = []
    for path, relative in target_files(world):
        before, mode = read_file(path)
        try:
            if relative.startswith('ftbquests/'):
                after, removed = reset_snbt(before, path.stem), []
            else:
                after, removed = reset_player(before)
        except (ResetError, UnicodeError, ValueError, struct.error) as error:
            raise ResetError(relative + ': ' + str(error)) from error
        if after != before:
            changes.append({'path': relative, 'before': before, 'after': after, 'mode': mode,
                            'removedStages': removed})
    return changes


def public_rows(changes):
    return [{'path': change['path'], 'beforeSha256': sha256(change['before']),
             'afterSha256': sha256(change['after']), 'beforeBytes': len(change['before']),
             'afterBytes': len(change['after']), 'mode': change['mode'],
             'removedStages': change.get('removedStages', [])} for change in changes]


def atomic_replace(path, data, mode):
    path = checked_path(path)
    metadata = path.stat()
    descriptor, name = tempfile.mkstemp(prefix='.quest-reset-', dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, 'wb') as stream:
            created = os.fstat(stream.fileno())
            if (created.st_uid, created.st_gid) != (metadata.st_uid, metadata.st_gid):
                os.fchown(stream.fileno(), metadata.st_uid, metadata.st_gid)
            os.fchmod(stream.fileno(), mode)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        checked_path(path)
        os.replace(temporary, path)
        sync_directory(path.parent)
    finally:
        temporary.unlink(missing_ok=True)


def write_new(path, data, mode=0o600):
    path = checked_path(path)
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), mode), 'wb') as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    sync_directory(path.parent)


def sync_directory(path):
    descriptor = os.open(path, os.O_RDONLY | getattr(os, 'O_DIRECTORY', 0))
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def write_state(backup, status, **extra):
    data = (json.dumps({'status': status, **extra}, indent=2, sort_keys=True) + '\n').encode()
    target = backup / 'state.json'
    if target.exists():
        atomic_replace(target, data, 0o600)
    else:
        write_new(target, data)


def create_backup(backup, server, world, changes):
    backup.mkdir(mode=0o700)
    sync_directory(backup.parent)
    for change in changes:
        destination = backup / 'files' / change['path']
        destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        write_new(destination, change['before'])
        if sha256(read_file(destination)[0]) != sha256(change['before']):
            raise ResetError('Backup verification failed: ' + change['path'])
    manifest = {'formatVersion': 1, 'server': str(server), 'world': str(world),
                'createdAt': datetime.now(timezone.utc).isoformat(), 'transaction': uuid.uuid4().hex,
                'files': public_rows(changes)}
    content = (json.dumps(manifest, indent=2, sort_keys=True) + '\n').encode()
    write_new(backup / 'manifest.json', content)
    write_new(backup / 'manifest.sha256', (sha256(content) + '\n').encode())
    write_state(backup, 'prepared')
    for directory in sorted((path for path in backup.rglob('*') if path.is_dir()), reverse=True):
        sync_directory(directory)
    sync_directory(backup)


def check_current(world, change, expected):
    current = read_file(world / change['path'])[0]
    if sha256(current) != sha256(change[expected]):
        raise ResetError('Refusing to overwrite changed data: ' + change['path'])


def transact(world, changes, backup, status):
    for change in changes:
        check_current(world, change, 'before')
    written = []
    try:
        for change in changes:
            check_current(world, change, 'before')
            written.append(change)
            atomic_replace(world / change['path'], change['after'], change['mode'])
        for change in changes:
            check_current(world, change, 'after')
        write_state(backup, status)
    except BaseException as error:
        failures = []
        for change in reversed(written):
            try:
                current = read_file(world / change['path'])[0]
                if current == change['before']:
                    continue
                check_current(world, change, 'after')
                atomic_replace(world / change['path'], change['before'], change['mode'])
            except BaseException as rollback_error:
                failures.append(change['path'] + ': ' + str(rollback_error))
        state = 'rollback_failed' if failures else 'rolled_back'
        try:
            write_state(backup, state, errors=failures)
        except BaseException as state_error:
            failures.append('Could not update backup state: ' + str(state_error))
        if failures:
            raise ResetError('Transaction failed; manual recovery required using backup ' + str(backup)
                             + ': ' + '; '.join(failures)) from error
        raise ResetError('Transaction failed and world changes were rolled back: ' + str(error)) from error


def restore_plan(backup, server, world):
    content = read_file(backup / 'manifest.json')[0]
    checksum = read_file(backup / 'manifest.sha256')[0].decode('ascii').strip()
    if not re.fullmatch('[0-9a-f]{64}', checksum) or sha256(content) != checksum:
        raise ResetError('Backup manifest checksum mismatch')
    manifest = json.loads(content)
    if (not isinstance(manifest, dict) or manifest.get('formatVersion') != 1 or manifest.get('server') != str(server)
            or manifest.get('world') != str(world) or not isinstance(manifest.get('files'), list)):
        raise ResetError('Backup manifest does not match this explicit server and world')
    changes, seen = [], set()
    for row in manifest['files']:
        if not isinstance(row, dict):
            raise ResetError('Invalid backup file record')
        relative = row.get('path')
        if not isinstance(relative, str) or not TARGET_PATTERN.fullmatch(relative) or relative in seen:
            raise ResetError('Invalid or duplicate backup target path')
        seen.add(relative)
        for key in ('beforeSha256', 'afterSha256'):
            if not isinstance(row.get(key), str) or not re.fullmatch('[0-9a-f]{64}', row[key]):
                raise ResetError('Invalid backup hash')
        mode = row.get('mode')
        if type(mode) is not int or mode < 0 or mode > 0o7777:
            raise ResetError('Invalid backup file mode')
        original = read_file(backup / 'files' / relative)[0]
        if sha256(original) != row['beforeSha256']:
            raise ResetError('Backup file checksum mismatch: ' + relative)
        current = read_file(world / relative)[0]
        current_hash = sha256(current)
        if current_hash not in (row['beforeSha256'], row['afterSha256']):
            raise ResetError('Refusing to restore over later changed data: ' + relative)
        if current_hash == row['afterSha256'] and current != original:
            changes.append({'path': relative, 'before': current, 'after': original, 'mode': mode})
    return changes


def run(server, world, *, apply=False, backup=None, restore=None):
    try:
        if backup is not None and restore is not None:
            raise ResetError('Use --backup for a reset or --restore for recovery, not both')
        with locked_world(server, world) as (server_path, world_path):
            backup_path = checked_path(restore if restore is not None else backup) if restore is not None or backup is not None else None
            if backup_path is not None and backup_path.is_relative_to(world_path):
                raise ResetError('Backup directory must be outside the world')
            if restore is None and apply:
                if backup_path is None or backup_path.exists() or not backup_path.parent.is_dir():
                    raise ResetError('--apply requires a new --backup directory outside the world with an existing parent')
            changes = restore_plan(backup_path, server_path, world_path) if restore is not None else reset_plan(world_path)
            result = {'status': 'restore_dry_run' if restore is not None else 'dry_run',
                      'server': str(server_path), 'world': str(world_path), 'files': public_rows(changes)}
            if not apply:
                return result
            if not changes:
                result['status'] = 'no_changes'
                return result
            if restore is None:
                create_backup(backup_path, server_path, world_path, changes)
            status = 'restored' if restore is not None else 'applied'
            transact(world_path, changes, backup_path, status)
            result.update(status=status, backup=str(backup_path))
            return result
    except ResetError:
        raise
    except (OSError, ValueError, TypeError, KeyError, UnicodeError, struct.error) as error:
        raise ResetError(str(error)) from error


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server', required=True, help='Explicit server directory; no symlink components')
    parser.add_argument('--world', required=True, help='Explicit world directory inside --server (name or absolute path)')
    parser.add_argument('--apply', action='store_true', help='Write the displayed reset or restoration; default is read-only')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--backup', help='New backup directory outside the world; parent must exist')
    group.add_argument('--restore', help='Restore from this tool\'s hash-checked backup; still a dry-run without --apply')
    arguments = parser.parse_args(argv)
    try:
        result = run(arguments.server, arguments.world, apply=arguments.apply,
                     backup=arguments.backup, restore=arguments.restore)
    except ResetError as error:
        parser.exit(2, 'Quest reset refused: ' + str(error) + '\n')
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == '__main__':
    sys.exit(main())
