"""The StageBox patch prepares only an explicitly acknowledged, offline change."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import tarfile
import tempfile
import unittest
from unittest import mock


MODULE = Path(__file__).with_name('stagebox_patch.py')
patch = None
if MODULE.exists():
    spec = importlib.util.spec_from_file_location('sunrin_stagebox_patch', MODULE)
    patch = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(patch)


def sha(value):
    return hashlib.sha256(value).hexdigest()


class OfflinePatchTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(patch, 'Implement the offline patch first')
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.server = self.root / 'minecraft'
        (self.server / 'mods').mkdir(parents=True)
        (self.server / 'world/playerdata').mkdir(parents=True)
        (self.server / 'config').mkdir()
        self.world = self.server / 'world/playerdata/player.dat'
        self.world.write_bytes(b'private player inventory')
        (self.server / 'world/level.dat').write_bytes(b'original world')
        (self.server / 'config/player.toml').write_bytes(b'player settings')
        (self.server / 'server.properties').write_bytes(b'level-name=world\n')
        (self.server / 'mods/unrelated.jar').write_bytes(b'other mod')
        self.old = b'verified old StageBox'
        self.new = b'verified new StageBox'
        self.lock = self.root / 'pack-lock.json'
        old_lock = {
            'formatVersion': 1, 'id': 'sunrin-valley-server-0.1.2',
            'clientPackVersion': '0.1.2', 'minecraft': '1.20.1', 'forge': '47.4.0',
            'serverModCount': 315,
            'addons': [{'slug': 'other', 'filename': 'unrelated.jar'},
                       {'slug': 'stagebox', 'version': '1.3.0', 'filename': patch.OLD_NAME}],
            'customStartup': {'hash': 'preserved'},
        }
        self.old_lock = (json.dumps(old_lock, indent=2) + '\n').encode()
        self.lock.write_bytes(self.old_lock)
        self.old_marker = (json.dumps({'packId': old_lock['id'], 'modCount': 315,
                                      'lockSha256': sha(self.old_lock)}) + '\n').encode()
        (self.server / patch.host.MARKER).write_bytes(self.old_marker)
        (self.server / 'mods' / patch.OLD_NAME).write_bytes(self.old)
        self.candidate = self.root / patch.NEW_NAME
        self.candidate.write_bytes(self.new)
        self.state = self.root / 'private'
        self.status = dict(LoadState='loaded', ActiveState='inactive', SubState='dead',
                           MainPID='0', Result='success', FragmentPath=patch.host.UNIT_PATH)
        for name, value in [('OLD_LOCK_SHA256', sha(self.old_lock)), ('OLD_SHA256', sha(self.old)),
                            ('OLD_SIZE', len(self.old)), ('NEW_SHA256', sha(self.new)),
                            ('NEW_SIZE', len(self.new))]:
            item = mock.patch.object(patch, name, value)
            item.start()
            self.addCleanup(item.stop)
        controller = patch.host.Controller(status_reader=lambda: self.status)
        self.operation = patch.StageBoxPatch(server_dir=self.server, lock_path=self.lock,
            replacement_jar=self.candidate, state_dir=self.state, controller=controller,
            control_lock=self.root / 'control.lock')

    def tree(self):
        return {str(p.relative_to(self.root)): p.read_bytes()
                for p in self.root.rglob('*') if p.is_file()}

    def apply(self):
        return self.operation.apply(acknowledge_content_downgrade=True)

    def test_plan_is_read_only_and_requires_acknowledgement(self):
        before = self.tree()
        result = self.operation.plan()
        self.assertEqual(result['status'], 'planned')
        self.assertTrue(result['requiresContentDowngradeAcknowledgement'])
        self.assertEqual(result['removedBlockCount'], 17)
        self.assertEqual(before, self.tree())
        with self.assertRaisesRegex(patch.PatchError, 'content-downgrade-acknowledgement-required'):
            self.operation.apply()
        self.assertEqual(before, self.tree())

    def test_applies_only_the_fixed_mod_and_metadata_and_retains_private_world_backup(self):
        before_world = self.world.read_bytes()
        result = self.apply()
        self.assertEqual(result['status'], 'applied-not-started')
        self.assertFalse((self.server / 'mods' / patch.OLD_NAME).exists())
        self.assertEqual((self.server / 'mods' / patch.NEW_NAME).read_bytes(), self.new)
        new_lock = json.loads(self.lock.read_bytes())
        self.assertEqual(new_lock['forge'], '47.4.0')
        self.assertEqual(new_lock['id'], 'sunrin-valley-server-0.1.4')
        self.assertEqual(new_lock['addons'][0], {'slug': 'other', 'filename': 'unrelated.jar'})
        self.assertEqual((self.server / 'mods/unrelated.jar').read_bytes(), b'other mod')
        self.assertEqual(self.world.read_bytes(), before_world)
        backup = Path(result['backupDirectory'])
        self.assertEqual((backup / 'old.jar').read_bytes(), self.old)
        self.assertEqual((backup / 'old-lock.json').read_bytes(), self.old_lock)
        self.assertEqual((backup / 'old-marker.json').read_bytes(), self.old_marker)
        with tarfile.open(next((backup / 'world').glob('world-*.tar.gz'))) as archive:
            self.assertEqual(archive.extractfile('world/playerdata/player.dat').read(), before_world)
            self.assertEqual(archive.extractfile('config/player.toml').read(), b'player settings')
        self.assertEqual(stat.S_IMODE(self.state.stat().st_mode), 0o700)
        self.assertEqual(stat.S_IMODE((backup / 'old.jar').stat().st_mode), 0o600)

    def test_successful_repeat_is_idempotent_and_does_not_make_another_backup(self):
        self.apply()
        before = self.tree()
        self.assertEqual(self.operation.apply()['status'], 'already-applied')
        self.assertEqual(before, self.tree())

    def test_running_failed_or_unknown_service_is_rejected_before_mutating_content(self):
        for changes in [dict(ActiveState='active', SubState='running', MainPID='123'),
                        dict(Result='exit-code'), dict(FragmentPath='/other/unit')]:
            with self.subTest(changes=changes):
                old_status = self.status.copy()
                self.status.update(changes)
                before = self.tree()
                with self.assertRaises((patch.PatchError, patch.host.HostError)):
                    self.apply()
                self.assertFalse(self.state.exists())
                self.assertEqual(before, self.tree())
                self.status.clear()
                self.status.update(old_status)

    def test_bad_candidate_or_changed_lock_or_marker_is_rejected_without_backup(self):
        for path, data in [(self.candidate, b'wrong jar'), (self.lock, b'{}'),
                           (self.server / patch.host.MARKER, b'{}')]:
            with self.subTest(path=path):
                old = path.read_bytes()
                path.write_bytes(data)
                before = self.tree()
                with self.assertRaises(patch.PatchError):
                    self.apply()
                self.assertEqual(before, self.tree())
                path.write_bytes(old)

    def test_failure_after_old_mod_removal_restores_old_mod_lock_and_marker(self):
        writer = self.operation.atomic_write
        failed = False
        def fail_once(path, value, **options):
            nonlocal failed
            if Path(path) == self.lock and value != self.old_lock and not failed:
                failed = True
                raise OSError('controlled disk failure')
            return writer(path, value, **options)
        self.operation.atomic_write = fail_once
        with self.assertRaisesRegex(patch.PatchError, 'patch-failed-original-restored'):
            self.apply()
        self.assertEqual((self.server / 'mods' / patch.OLD_NAME).read_bytes(), self.old)
        self.assertFalse((self.server / 'mods' / patch.NEW_NAME).exists())
        self.assertEqual(self.lock.read_bytes(), self.old_lock)
        self.assertEqual((self.server / patch.host.MARKER).read_bytes(), self.old_marker)
        self.assertEqual(self.world.read_bytes(), b'private player inventory')
        self.assertEqual(json.loads((self.state / 'receipt.json').read_text())['state'], 'rolled-back')

    def test_symlink_source_target_and_state_are_rejected(self):
        for path in [self.candidate, self.server / 'mods' / patch.OLD_NAME]:
            old = path.read_bytes()
            destination = self.root / ('elsewhere-' + path.name)
            destination.write_bytes(old)
            path.unlink()
            path.symlink_to(destination)
            with self.assertRaises((patch.PatchError, patch.branding.BrandingError)):
                self.apply()
            self.assertEqual(destination.read_bytes(), old)
            path.unlink()
            path.write_bytes(old)
        elsewhere = self.root / 'elsewhere-state'
        elsewhere.mkdir()
        self.state.symlink_to(elsewhere)
        with self.assertRaises((patch.PatchError, patch.branding.BrandingError)):
            self.apply()
        self.assertEqual(list(elsewhere.iterdir()), [])

    def test_target_lock_must_equal_the_exact_single_addon_transition(self):
        target = self.root / 'target-lock.json'
        value = json.loads(patch.make_target_lock(self.old_lock))
        value['forge'] = '47.4.1'
        target.write_text(json.dumps(value))
        self.operation.target_lock_path = target
        before = self.tree()
        with self.assertRaisesRegex(patch.PatchError, 'unexpected-target-lock'):
            self.apply()
        self.assertEqual(before, self.tree())

    def test_backup_failure_never_changes_live_files_or_old_operator_backups(self):
        previous = self.root / 'operator-backups'
        previous.mkdir()
        for i in range(4):
            (previous / f'world-{i}.tar.gz').write_bytes(b'old operator backup')
        before = {str(p): p.read_bytes() for p in self.server.rglob('*') if p.is_file()}
        with mock.patch.object(self.operation.controller, 'backup', side_effect=OSError('backup disk full')):
            with self.assertRaises(OSError):
                self.apply()
        self.assertEqual(before, {str(p): p.read_bytes() for p in self.server.rglob('*') if p.is_file()})
        self.assertEqual(len(list(previous.iterdir())), 4)
        self.assertFalse((self.state / 'receipt.json').exists())

    def test_interrupted_transaction_refuses_automatic_retry_and_retains_backup(self):
        self.apply()
        receipt = self.state / 'receipt.json'
        value = json.loads(receipt.read_text())
        value['state'] = 'prepared'
        receipt.write_text(json.dumps(value))
        before = self.tree()
        with self.assertRaisesRegex(patch.PatchError, 'unfinished-patch-retained'):
            self.apply()
        self.assertEqual(before, self.tree())

    def test_state_directory_cannot_be_nested_with_the_world_backup_source(self):
        with self.assertRaisesRegex(patch.PatchError, 'state-and-server-must-be-separate'):
            patch.StageBoxPatch(replacement_jar=self.candidate, server_dir=self.server,
                                state_dir=self.server / 'world/patch-state')

    def test_ambiguous_java_properties_world_names_fail_before_any_backup_or_mutation(self):
        variants = [
            'level-name : otherworld\n',
            'level-name=world\n level-name : otherworld\n',
            'level-name=world\nlevel-name otherworld\n',
            'level-name=world\nlevel\\u002dname=otherworld\n',
            'level-name=world\n\\u006cevel-name=otherworld\n',
            'level-name=world\nlevel\\-name=otherworld\n',
            'level-name=world\nlevel-\\\n name=otherworld\n',
            'motd=\\\nlevel-name=world\n',
            'level-name=world\nlevel-name=world\n',
            'level-name=world \n',
        ]
        for text in variants:
            with self.subTest(text=text):
                (self.server / 'server.properties').write_text(text)
                before = self.tree()
                with mock.patch.object(self.operation.controller, 'backup',
                                       side_effect=AssertionError('unsafe world backup started')):
                    with self.assertRaisesRegex(patch.PatchError, 'canonical-world-name-required'):
                        self.apply()
                self.assertEqual(before, self.tree())

    def test_canonical_world_name_allows_unrelated_escaped_properties_and_comments(self):
        (self.server / 'server.properties').write_text(
            '# level-name : otherworld\n!level-name=ignored\nlevel-name=world\n'
            'motd=hello\\u0020world\nresource-pack=https\\://example.org/pack.zip\n')
        self.assertEqual(self.apply()['status'], 'applied-not-started')


if __name__ == '__main__':
    unittest.main()
