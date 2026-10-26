#!/usr/bin/env python3
"""Prepare the fixed StageBox downgrade OFFLINE; never starts services or AWS.

1.3.0 registers blocks absent from 1.1.2. This helper does not prove that a
populated world is safe to downgrade. An operator must review its backup and
explicitly acknowledge that limitation. Rollback here covers failures BEFORE
the world is loaded; keep the world archive for any later manual recovery.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import uuid


def sibling(name):
    spec = importlib.util.spec_from_file_location('sunrin_stagebox_' + name, Path(__file__).with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


host, branding = sibling('host'), sibling('branding')
OLD_LOCK_SHA256 = 'd92dc09e0c6a7a180961808b2fa2ce4654889f105482ce2f4af0a20283777984'
OLD_NAME = 'StageBox-Mod-1.3.0-Forge-1.20.1.jar'
OLD_SIZE = 1882504
OLD_SHA256 = '5eed729a183183007c37ec3c59b9675243e3d6b32a909a08f544508fced3b512'
NEW_NAME = 'StageBox-Mod-1.1.2-Forge-1.20.1.jar'
NEW_SIZE = 1054415
NEW_SHA256 = 'b59cd5e13b205582a9f847a9246ed113aa283ef596a0ae823a4930f95cc22325'
NEW_URL = 'https://edge.forgecdn.net/files/8918/785/' + NEW_NAME
NEW_PACK_ID = 'sunrin-valley-server-0.1.4'
STATE_ID = 'sunrin-stagebox-offline-patch'


class PatchError(Exception):
    pass


def digest(value):
    return hashlib.sha256(value).hexdigest()


def unlink_synced(path):
    branding.no_links(path)
    path.unlink()
    fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def make_target_lock(old_bytes):
    """The exact old lock is the trust root; change only this addon and versions."""
    if digest(old_bytes) != OLD_LOCK_SHA256:
        raise PatchError('unexpected-original-lock')
    value = copy.deepcopy(json.loads(old_bytes))
    value['id'] = NEW_PACK_ID
    value['clientPackVersion'] = '0.1.4'
    matches = [i for i, addon in enumerate(value['addons']) if addon.get('slug') == 'stagebox']
    if len(matches) != 1:
        raise PatchError('invalid-original-lock')
    value['addons'][matches[0]] = {'slug': 'stagebox', 'version': '1.1.2',
        'filename': NEW_NAME, 'url': NEW_URL, 'size': NEW_SIZE,
        'hash': {'algorithm': 'sha256', 'digest': NEW_SHA256}}
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def require_default_world(properties):
    """Require one literal world setting; recognize aliases in Java property keys.

    Backups deliberately cover the fixed ``world`` directory. Java accepts
    escaped keys and alternate separators, so a substring/startswith check is
    unsafe. Continuations are rejected rather than interpreting arbitrary MOTDs
    or treating a continuation line as a real world setting.
    """
    found = 0
    for line in properties.replace('\r\n', '\n').replace('\r', '\n').split('\n'):
        content = line.lstrip(' \t\f')
        if not content or content.startswith(('#', '!')):
            continue
        if (len(content) - len(content.rstrip('\\'))) % 2:
            raise PatchError('canonical-world-name-required')
        key, index = [], 0
        while index < len(content) and content[index] not in ' \t\f=:':
            character = content[index]
            if character == '\\':
                index += 1
                if index >= len(content):
                    raise PatchError('canonical-world-name-required')
                character = content[index]
                if character == 'u':
                    digits = content[index + 1:index + 5]
                    if len(digits) != 4 or any(c not in '0123456789abcdefABCDEF' for c in digits):
                        raise PatchError('canonical-world-name-required')
                    character = chr(int(digits, 16))
                    index += 4
                else:
                    character = {'t': '\t', 'r': '\r', 'n': '\n', 'f': '\f'}.get(character, character)
            key.append(character)
            index += 1
        if ''.join(key) == 'level-name':
            if line != 'level-name=world':
                raise PatchError('canonical-world-name-required')
            found += 1
    if found != 1:
        raise PatchError('canonical-world-name-required')


class StageBoxPatch:
    def __init__(self, *, replacement_jar, server_dir=host.SERVER_DIR,
                 lock_path=Path('/opt/sunrin/bootstrap/pack-lock.json'),
                 state_dir=Path('/var/lib/sunrin/stagebox-offline-patch'),
                 target_lock_path=None, controller=None, control_lock=host.CONTROL_LOCK):
        self.server = Path(server_dir)
        self.lock_path = Path(lock_path)
        self.candidate = Path(replacement_jar)
        self.state = Path(state_dir)
        if (self.state.absolute() == self.server.absolute()
                or self.state.absolute().is_relative_to(self.server.absolute())
                or self.server.absolute().is_relative_to(self.state.absolute())):
            raise PatchError('state-and-server-must-be-separate')
        self.receipt = self.state / 'receipt.json'
        self.target_lock_path = Path(target_lock_path) if target_lock_path else None
        self.controller = controller or host.Controller()
        self.control_lock = Path(control_lock)
        self.files = branding.Branding(server_dir=self.server, receipt_path=self.receipt)
        self.atomic_write = self.files.atomic_write

    def inactive(self):
        if not self.controller.inactive(self.controller.status()):
            raise PatchError('fully-inactive-server-required')

    def read_receipt(self):
        branding.no_links(self.state)
        if self.state.exists():
            info = self.state.stat()
            if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) != 0o700:
                raise PatchError('unsafe-patch-state')
        if not self.receipt.exists() and not self.receipt.is_symlink():
            return None
        info = self.receipt.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) != 0o600:
            raise PatchError('unsafe-patch-receipt')
        value = json.loads(branding.read_file(self.receipt, 16384))
        if (not isinstance(value, dict) or not isinstance(value.get('runId'), str)
                or value.get('formatVersion') != 1 or value.get('id') != STATE_ID
                or value.get('state') not in ('prepared', 'applied', 'rolled-back')
                or str(uuid.UUID(value.get('runId', ''))) != value['runId']):
            raise PatchError('invalid-patch-receipt')
        return value

    def save_receipt(self, value):
        self.atomic_write(self.receipt, (json.dumps(value, sort_keys=True) + '\n').encode(), mode=0o600)

    def inspect(self):
        record = self.read_receipt()
        if record and record['state'] == 'prepared':
            raise PatchError('unfinished-patch-retained-for-operator-recovery')
        candidate = branding.read_file(self.candidate, NEW_SIZE + 1)
        if len(candidate) != NEW_SIZE or digest(candidate) != NEW_SHA256:
            raise PatchError('unexpected-replacement-jar')
        lock_bytes = branding.read_file(self.lock_path, 65536)
        marker_bytes = branding.read_file(self.server / host.MARKER, 16384)
        marker = json.loads(marker_bytes)
        already = digest(lock_bytes) != OLD_LOCK_SHA256
        if already:
            if not record or record['state'] != 'applied':
                raise PatchError('unexpected-original-lock')
            original_lock = branding.read_file(self.state / record['runId'] / 'old-lock.json', 65536)
        else:
            original_lock = lock_bytes
        target_lock = make_target_lock(original_lock)
        if self.target_lock_path and branding.read_file(self.target_lock_path, 65536) != target_lock:
            raise PatchError('unexpected-target-lock')
        expected_id = NEW_PACK_ID if already else 'sunrin-valley-server-0.1.2'
        if (not isinstance(marker, dict) or marker.get('packId') != expected_id or marker.get('lockSha256') != digest(lock_bytes)
                or marker.get('modCount') != 315):
            raise PatchError('server-marker-mismatch')
        old_path, new_path = self.server / 'mods' / OLD_NAME, self.server / 'mods' / NEW_NAME
        branding.no_links(old_path)
        branding.no_links(new_path)
        if already:
            if lock_bytes != target_lock or old_path.exists() or branding.read_file(new_path, NEW_SIZE + 1) != candidate:
                raise PatchError('applied-state-mismatch')
        else:
            old = branding.read_file(old_path, OLD_SIZE + 1)
            if len(old) != OLD_SIZE or digest(old) != OLD_SHA256 or new_path.exists():
                raise PatchError('unexpected-current-jar')
        return {'already': already, 'candidate': candidate, 'lock': lock_bytes,
                'targetLock': target_lock, 'marker': marker_bytes}

    def plan(self):
        value = self.inspect()
        return {'ok': True, 'status': 'already-applied' if value['already'] else 'planned',
                'fromVersion': '1.3.0', 'toVersion': '1.1.2', 'forge': '47.4.0',
                'targetLockSha256': digest(value['targetLock']), 'removedBlockCount': 17,
                'requiresContentDowngradeAcknowledgement': not value['already'],
                'startsServer': False, 'checksWorldCompatibility': False}

    def apply(self, *, acknowledge_content_downgrade=False):
        initial = self.inspect()
        if initial['already']:
            return self.plan()
        if acknowledge_content_downgrade is not True:
            raise PatchError('content-downgrade-acknowledgement-required')
        require_default_world(branding.read_file(self.server / 'server.properties', 65536).decode())
        self.inactive()
        branding.no_links(self.control_lock)
        with host.operation_lock(self.control_lock):
            self.inactive()
            value = self.inspect()
            if value['already']:
                return self.plan()
            require_default_world(branding.read_file(self.server / 'server.properties', 65536).decode())
            self.files.private_state()
            run_id = str(uuid.uuid4())
            run = self.state / run_id
            run.mkdir(mode=0o700)
            # Dedicated backup directory: host retention cannot prune existing operator backups.
            self.controller.backup(self.server, run / 'world')
            old_path, new_path = self.server / 'mods' / OLD_NAME, self.server / 'mods' / NEW_NAME
            originals = [(old_path, branding.read_file(old_path, OLD_SIZE + 1), 'old.jar'),
                         (self.lock_path, value['lock'], 'old-lock.json'),
                         (self.server / host.MARKER, value['marker'], 'old-marker.json')]
            modes = {}
            for target, content, name in originals:
                info = target.stat()
                modes[name] = {'mode': stat.S_IMODE(info.st_mode), 'uid': info.st_uid, 'gid': info.st_gid}
                self.atomic_write(run / name, content, mode=0o600)
            self.atomic_write(run / 'file-modes.json', (json.dumps(modes) + '\n').encode(), mode=0o600)
            record = {'formatVersion': 1, 'id': STATE_ID, 'runId': run_id,
                      'state': 'prepared', 'targetLockSha256': digest(value['targetLock'])}
            self.save_receipt(record)
            try:
                self.inactive()
                info = modes['old.jar']
                self.atomic_write(new_path, value['candidate'], mode=info['mode'], owner=(info['uid'], info['gid']))
                unlink_synced(old_path)
                for target, content, name in [(self.lock_path, value['targetLock'], 'old-lock.json'),
                    (self.server / host.MARKER, (json.dumps({**json.loads(value['marker']),
                        'packId': NEW_PACK_ID, 'lockSha256': digest(value['targetLock'])}, sort_keys=True) + '\n').encode(), 'old-marker.json')]:
                    info = modes[name]
                    self.atomic_write(target, content, mode=info['mode'], owner=(info['uid'], info['gid']))
                self.inactive()
                self.save_receipt({**record, 'state': 'applied'})
            except BaseException:
                try:
                    self.inactive()
                    for target, content, name in originals:
                        info = modes[name]
                        self.atomic_write(target, content, mode=info['mode'], owner=(info['uid'], info['gid']))
                    if new_path.exists() or new_path.is_symlink():
                        if branding.read_file(new_path, NEW_SIZE + 1) != value['candidate']:
                            raise PatchError('replacement-changed-during-rollback')
                        unlink_synced(new_path)
                    self.save_receipt({**record, 'state': 'rolled-back'})
                except BaseException:
                    raise PatchError('patch-recovery-required-backups-retained') from None
                raise PatchError('patch-failed-original-restored') from None
            return {'ok': True, 'status': 'applied-not-started', 'serverStarted': False,
                    'worldCompatibilityVerified': False, 'backupDirectory': str(run),
                    'targetLockSha256': digest(value['targetLock'])}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--replacement-jar', type=Path, required=True)
    parser.add_argument('--server-dir', type=Path, default=host.SERVER_DIR)
    parser.add_argument('--lock-path', type=Path, default=Path('/opt/sunrin/bootstrap/pack-lock.json'))
    parser.add_argument('--state-dir', type=Path, default=Path('/var/lib/sunrin/stagebox-offline-patch'))
    parser.add_argument('--target-lock', type=Path)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--acknowledge-content-downgrade', action='store_true')
    args = parser.parse_args(argv)
    try:
        if args.apply and os.geteuid() != 0:
            raise PatchError('root-required')
        operation = StageBoxPatch(replacement_jar=args.replacement_jar, server_dir=args.server_dir,
            lock_path=args.lock_path, state_dir=args.state_dir, target_lock_path=args.target_lock)
        value = operation.apply(acknowledge_content_downgrade=args.acknowledge_content_downgrade) if args.apply else operation.plan()
        print(json.dumps(value, sort_keys=True))
        return 0
    except (PatchError, host.HostError, branding.BrandingError) as exc:
        code = str(exc)
    except (OSError, ValueError, KeyError):
        code = 'offline-patch-failed'
    print(json.dumps({'ok': False, 'status': 'failed', 'code': code}, sort_keys=True))
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
