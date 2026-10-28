"""Offline quest reset uses temporary worlds only; no running server is contacted."""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


TOOL = Path(__file__).resolve().parents[1] / 'reset_quest_progress.py'
TEAM = '8ecfebc9-0638-371f-ac85-4950cee0207e'
OTHER = 'c93b389a-9966-30f0-a111-4e08a5d4862f'
DERIVED = ['abandoned_farm_complete', 'boiler_room_complete', 'vault_complete',
           'community_center_complete', 'ftbchunks_mapping']
KEPT = ['starting_items_4_1', 'invited_carpenter', 'mining_mastery', 'custom_눈송이']


def string(value):
    raw = value.encode('utf-8') if isinstance(value, str) else value
    return struct.pack('>H', len(raw)) + raw


def named(kind, name, payload):
    return bytes([kind]) + string(name) + payload


def player_nbt(tags):
    inventory = (named(1, 'Slot', b'\x00') + named(1, 'Count', b'\x40')
                 + named(8, 'id', string('minecraft:diamond'))
                 + named(10, 'tag', named(12, 'long_array', struct.pack('>iqq', 2, -1, 9007199254740993)) + b'\x00')
                 + b'\x00')
    receipts = named(8, 'sunrin_core_receipts', string('{"reward":"already delivered"}'))
    persisted = named(10, 'PlayerPersisted', named(4, 'sunrin_geonpi', struct.pack('>q', 987654321)) + b'\x00')
    return named(10, 'Player',
                 named(3, 'DataVersion', struct.pack('>i', 3465))
                 + named(9, 'Inventory', b'\x0a' + struct.pack('>i', 1) + inventory)
                 + named(9, 'Tags', b'\x08' + struct.pack('>i', len(tags)) + b''.join(string(tag) for tag in tags))
                 + named(10, 'ForgeData', receipts + persisted + b'\x00')
                 + named(10, 'ForgeCaps', named(7, 'unknown_bytes', struct.pack('>i', 4) + b'\x00\xff\x80\x01') + b'\x00')
                 + named(9, 'Pos', b'\x06' + struct.pack('>iddd', 3, -23.5, 66.0, 19.25))
                 + b'\x00')


def quest_snbt(team=TEAM, empty=False):
    values = {
        'task_progress': '{\n\t\t1234567890ABCDEF: 64\n\t}',
        'started': '{1234567890ABCDEF: 1790000000001L}',
        'completed': '{1234567890ABCDEF: 1790000000002L}',
        'claimed_rewards': '{\n\t\t"' + OTHER.replace('-', '') + ':1234567890ABCDEF": 1790000000003L\n\t}',
    }
    text = ('{\n\tversion: 1\n\tuuid: "' + team.replace('-', '') + '"\n'
            '\tname: "Team \\"quoted\\" {kept}"\n\tlock: false\n\trewards_blocked: true\n'
            '\t# Preserve this operator comment.\n'
            '\tcustom: { nested: [1, 2, 3] note: "{not a compound}" }\n')
    for key, value in values.items():
        text += '\t' + key + ': ' + ('{}' if empty else value) + '\n'
    return (text + '\tplayer_data: { "' + OTHER.replace('-', '') + '": {can_edit: true pinned_quests: ["1234567890ABCDEF"]} }\n}\n').encode()


class QuestResetTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(TOOL.is_file(), 'offline reset tool implementation is missing')
        spec = importlib.util.spec_from_file_location('quest_reset_tool', TOOL)
        self.tool = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.tool)
        self.temp = tempfile.TemporaryDirectory(prefix='sunrin-quest-reset-', dir=str(Path(tempfile.gettempdir()).resolve()))
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.server = self.root / 'server'
        self.world = self.server / 'world'
        self.world.mkdir(parents=True)
        (self.world / 'session.lock').write_bytes(b'\xe2\x98\x83')
        self.quest = self.world / 'ftbquests' / (TEAM + '.snbt')
        self.player = self.world / 'playerdata' / (TEAM + '.dat')
        self.put(self.quest, quest_snbt())
        self.put(self.player, gzip.compress(player_nbt(DERIVED + KEPT), mtime=1234))
        for path, data in {
            'ftbquests/readme.snbt': b'not quest progress',
            'ftbquests/' + TEAM + '.snbt.bak': b'old quest backup',
            'ftbquests/nested/' + OTHER + '.snbt': b'nested file untouched',
            'playerdata/' + TEAM + '.dat_old': b'old player backup',
            'ftbteams/player/' + TEAM + '.snbt': b'team membership',
            'ftbchunks/claims.snbt': b'claim ownership',
            'data/sunrin-core/deliveries/receipt.json': b'{"delivered":true}',
            'region/r.0.0.mca': b'world blocks',
            'stats/' + TEAM + '.json': b'{"stats":{}}',
            'level.dat': b'world metadata',
            'kubejs_persistent_data.nbt': b'other persisted data',
        }.items():
            self.put(self.world / path, data)
        self.backup = self.root / 'backup'

    def put(self, path, data):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def snapshot(self):
        return {str(path.relative_to(self.world)): path.read_bytes()
                for path in self.world.rglob('*') if path.is_file()}

    def run_tool(self, **kwargs):
        return self.tool.run(self.server, 'world', **kwargs)

    def apply(self):
        return self.run_tool(apply=True, backup=self.backup)

    def test_default_cli_is_read_only_and_lists_exact_changes(self):
        before = self.snapshot()
        result = subprocess.run([sys.executable, str(TOOL), '--server', str(self.server), '--world', 'world'],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['status'], 'dry_run')
        self.assertEqual({row['path'] for row in report['files']},
                         {'ftbquests/' + TEAM + '.snbt', 'playerdata/' + TEAM + '.dat'})
        self.assertEqual(before, self.snapshot())
        self.assertFalse(self.backup.exists())

    def test_apply_resets_all_teams_and_preserves_all_other_world_bytes(self):
        self.put(self.world / 'ftbquests' / (OTHER + '.snbt'), quest_snbt(OTHER))
        before = self.snapshot()
        result = self.apply()
        self.assertEqual(result['status'], 'applied')
        self.assertEqual(self.quest.read_bytes(), quest_snbt(empty=True))
        self.assertEqual((self.world / 'ftbquests' / (OTHER + '.snbt')).read_bytes(), quest_snbt(OTHER, empty=True))
        self.assertEqual(gzip.decompress(self.player.read_bytes()), player_nbt(KEPT))
        changed = {row['path'] for row in result['files']}
        self.assertEqual(changed, {'ftbquests/' + TEAM + '.snbt', 'ftbquests/' + OTHER + '.snbt',
                                   'playerdata/' + TEAM + '.dat'})
        for path, data in before.items():
            if path not in changed:
                self.assertEqual((self.world / path).read_bytes(), data, path)

    def test_already_reset_world_produces_no_second_backup_or_writes(self):
        self.apply()
        before = self.snapshot()
        second = self.root / 'second-backup'
        result = self.run_tool(apply=True, backup=second)
        self.assertEqual(result['status'], 'no_changes')
        self.assertEqual(result['files'], [])
        self.assertFalse(second.exists())
        self.assertEqual(before, self.snapshot())

    def test_preserves_unrelated_and_modified_utf8_tags_exactly(self):
        # Java NBT strings may contain modified UTF-8, which must not be decoded/re-encoded.
        kept = KEPT + [b'custom_\xc0\x80_tag', b'\xed\xa0\xbd\xed\xb8\x80']
        self.player.write_bytes(gzip.compress(player_nbt([DERIVED[0]] + kept + [DERIVED[0]]), mtime=12))
        self.apply()
        self.assertEqual(gzip.decompress(self.player.read_bytes()), player_nbt(kept))

    def test_apply_requires_external_new_backup_directory(self):
        before = self.snapshot()
        for backup in (None, self.world / 'backup', self.world, self.server):
            with self.subTest(backup=backup), self.assertRaises(self.tool.ResetError):
                self.run_tool(apply=True, backup=backup)
        self.assertEqual(before, self.snapshot())

    def test_different_process_world_record_lock_refuses_read_and_apply(self):
        code = ('import fcntl,sys; f=open(sys.argv[1],"r+b"); '
                'fcntl.lockf(f,fcntl.LOCK_EX|fcntl.LOCK_NB); print("locked",flush=True); sys.stdin.read()')
        process = subprocess.Popen([sys.executable, '-c', code, str(self.world / 'session.lock')],
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            self.assertEqual(process.stdout.readline().strip(), 'locked')
            before = self.snapshot()
            for apply in (False, True):
                with self.subTest(apply=apply), self.assertRaisesRegex(self.tool.ResetError, 'lock|running|use'):
                    self.run_tool(apply=apply, backup=self.backup)
            self.assertEqual(before, self.snapshot())
            self.assertFalse(self.backup.exists())
        finally:
            process.communicate('', timeout=5)

    def test_corrupt_input_rejects_before_any_backup_or_world_write(self):
        for kind in ('snbt', 'gzip', 'nbt'):
            with self.subTest(kind=kind):
                self.quest.write_bytes(quest_snbt() if kind != 'snbt' else quest_snbt()[:-5])
                self.player.write_bytes(b'not gzip' if kind == 'gzip' else gzip.compress(
                    player_nbt(DERIVED + KEPT)[:-1] if kind == 'nbt' else player_nbt(DERIVED + KEPT)))
                before = self.snapshot()
                with self.assertRaises(self.tool.ResetError):
                    self.apply()
                self.assertEqual(before, self.snapshot())
                self.assertFalse(self.backup.exists())

    def test_corrupt_deflate_stream_is_a_clean_refusal(self):
        valid = gzip.compress(player_nbt(DERIVED + KEPT))
        self.player.write_bytes(valid[:10] + b'\xff' * 20 + valid[-8:])
        before = self.snapshot()
        with self.assertRaises(self.tool.ResetError):
            self.apply()
        self.assertEqual(before, self.snapshot())
        self.assertFalse(self.backup.exists())

    def test_world_record_lock_remains_held_during_atomic_replacement(self):
        original = self.tool.atomic_replace
        probes = []
        code = ('import fcntl,sys\nf=open(sys.argv[1],"r+b")\ntry:\n'
                ' fcntl.lockf(f,fcntl.LOCK_EX|fcntl.LOCK_NB)\nexcept BlockingIOError:\n'
                ' sys.exit(3)\nsys.exit(0)\n')

        def probe_then_replace(path, data, mode):
            if path.is_relative_to(self.world):
                probe = subprocess.run([sys.executable, '-c', code, str(self.world / 'session.lock')],
                                       capture_output=True, text=True)
                probes.append(probe.returncode)
            return original(path, data, mode)

        with mock.patch.object(self.tool, 'atomic_replace', side_effect=probe_then_replace):
            self.apply()
        self.assertEqual(probes, [3, 3])

    def test_player_without_quest_stages_retains_exact_gzip_bytes(self):
        untouched = self.world / 'playerdata' / (OTHER + '.dat')
        original = gzip.compress(player_nbt(KEPT), mtime=42)
        untouched.write_bytes(original)
        result = self.apply()
        self.assertNotIn('playerdata/' + OTHER + '.dat', {row['path'] for row in result['files']})
        self.assertEqual(untouched.read_bytes(), original)

    def test_ambiguous_snbt_uuid_or_wrong_tags_type_rejects_without_writes(self):
        bad_inputs = [quest_snbt().replace(b'version: 1', b'version: 1\nversion: 1'),
                      quest_snbt().replace(TEAM.replace('-', '').encode(), OTHER.replace('-', '').encode()),
                      quest_snbt().replace(b'task_progress: {', b'task_progress: [')]
        for content in bad_inputs:
            with self.subTest(content=content[:100]):
                self.quest.write_bytes(content)
                before = self.snapshot()
                with self.assertRaises(self.tool.ResetError):
                    self.apply()
                self.assertEqual(before, self.snapshot())
        self.quest.write_bytes(quest_snbt())
        self.player.write_bytes(gzip.compress(named(10, '', named(8, 'Tags', string('not a list')) + b'\x00')))
        with self.assertRaises(self.tool.ResetError):
            self.apply()
        self.assertFalse(self.backup.exists())

    def test_invalid_nested_snbt_arrays_refuse_before_any_backup_or_write(self):
        invalid = (b'[I; {x:1}]', b'[I; 1, 2L]', b'[I; -2147483649]',
                   b'[B; 1b, 128b]', b'[B; 1]', b'[L; 9223372036854775808L]',
                   b'[I; 1.0]', b'[1, "two"]', b'[{x:1}, [1]]', b'[1b, 1s]')
        for index, array in enumerate(invalid):
            with self.subTest(array=array):
                self.quest.write_bytes(quest_snbt().replace(b'nested: [1, 2, 3]', b'nested: ' + array))
                before = self.snapshot()
                backup = self.root / ('invalid-array-backup-' + str(index))
                with self.assertRaises(self.tool.ResetError):
                    self.run_tool(apply=True, backup=backup)
                self.assertEqual(before, self.snapshot())
                self.assertFalse(backup.exists())

    def test_valid_snbt_arrays_remain_byte_identical_outside_progress(self):
        valid = (b'[B; -128b, 127B]', b'[I; -2147483648, 2147483647]',
                 b'[L; -9223372036854775808L, 9223372036854775807l]', b'[B;]',
                 b'[1b, 2B]', b'[1.0f, 2.0F]', b'["one", two]', b'[[I;1], [I;2]]')
        for index, array in enumerate(valid):
            with self.subTest(array=array):
                self.quest.write_bytes(quest_snbt().replace(b'nested: [1, 2, 3]', b'nested: ' + array))
                self.run_tool(apply=True, backup=self.root / ('array-backup-' + str(index)))
                self.assertEqual(self.quest.read_bytes(),
                                 quest_snbt(empty=True).replace(b'nested: [1, 2, 3]', b'nested: ' + array))

    def test_rejects_symlink_target_directory_world_and_backup_ancestors(self):
        outside = self.root / 'outside'
        outside.mkdir()
        target = self.world / 'playerdata' / (OTHER + '.dat')
        target.symlink_to(self.player)
        with self.assertRaises(self.tool.ResetError):
            self.apply()
        target.unlink()
        (self.server / 'world-link').symlink_to(self.world, target_is_directory=True)
        with self.assertRaises(self.tool.ResetError):
            self.tool.run(self.server, 'world-link')
        (self.root / 'backup-link').symlink_to(outside, target_is_directory=True)
        with self.assertRaises(self.tool.ResetError):
            self.run_tool(apply=True, backup=self.root / 'backup-link' / 'new')
        player_dir = self.world / 'playerdata'
        player_dir.rename(self.world / 'saved-playerdata')
        player_dir.symlink_to(self.world / 'saved-playerdata', target_is_directory=True)
        with self.assertRaises(self.tool.ResetError):
            self.apply()
        self.assertFalse(self.backup.exists())

    def test_rejects_world_traversal_absolute_escape_and_missing_session_lock(self):
        for world in ('../outside', self.root / 'outside', 'world/../world'):
            with self.subTest(world=world), self.assertRaises(self.tool.ResetError):
                self.tool.run(self.server, world)
        (self.world / 'session.lock').unlink()
        with self.assertRaises(self.tool.ResetError):
            self.apply()

    def test_backup_manifest_and_restore_recover_exact_original_bytes(self):
        before = self.snapshot()
        self.apply()
        manifest_bytes = (self.backup / 'manifest.json').read_bytes()
        self.assertEqual((self.backup / 'manifest.sha256').read_text().strip(), hashlib.sha256(manifest_bytes).hexdigest())
        manifest = json.loads(manifest_bytes)
        for row in manifest['files']:
            original = (self.backup / 'files' / row['path']).read_bytes()
            self.assertEqual(original, before[row['path']])
            self.assertEqual(row['beforeSha256'], hashlib.sha256(original).hexdigest())
        preview = self.run_tool(restore=self.backup)
        self.assertEqual(preview['status'], 'restore_dry_run')
        self.assertNotEqual(before, self.snapshot())
        result = self.run_tool(restore=self.backup, apply=True)
        self.assertEqual(result['status'], 'restored')
        self.assertEqual(before, self.snapshot())
        self.assertEqual(self.run_tool(restore=self.backup, apply=True)['status'], 'no_changes')

    def test_restore_refuses_later_player_changes_and_corrupt_backup(self):
        self.apply()
        self.player.write_bytes(gzip.compress(player_nbt(KEPT + ['later_progress'])))
        before = self.snapshot()
        with self.assertRaises(self.tool.ResetError):
            self.run_tool(restore=self.backup, apply=True)
        self.assertEqual(before, self.snapshot())
        row = json.loads((self.backup / 'manifest.json').read_bytes())['files'][0]
        (self.backup / 'files' / row['path']).write_bytes(b'corrupt backup')
        with self.assertRaises(self.tool.ResetError):
            self.run_tool(restore=self.backup, apply=True)
        self.assertEqual(before, self.snapshot())

    def test_restore_rejects_manifest_tampering_and_allowlist_escape(self):
        self.apply()
        manifest_path = self.backup / 'manifest.json'
        original = manifest_path.read_bytes()
        manifest_path.write_bytes(original + b' ')
        with self.assertRaises(self.tool.ResetError):
            self.run_tool(restore=self.backup, apply=True)
        manifest = json.loads(original)
        manifest['files'][0]['path'] = '../level.dat'
        altered = json.dumps(manifest).encode()
        manifest_path.write_bytes(altered)
        (self.backup / 'manifest.sha256').write_text(hashlib.sha256(altered).hexdigest() + '\n')
        with self.assertRaises(self.tool.ResetError):
            self.run_tool(restore=self.backup, apply=True)

    def test_restore_refuses_malformed_manifest_and_symlinked_backup_file(self):
        self.apply()
        manifest_path = self.backup / 'manifest.json'
        original = manifest_path.read_bytes()
        manifest_path.write_bytes(b'[]')
        (self.backup / 'manifest.sha256').write_text(hashlib.sha256(b'[]').hexdigest() + '\n')
        with self.assertRaises(self.tool.ResetError):
            self.run_tool(restore=self.backup, apply=True)
        manifest_path.write_bytes(original)
        (self.backup / 'manifest.sha256').write_text(hashlib.sha256(original).hexdigest() + '\n')
        row = json.loads(original)['files'][0]
        file = self.backup / 'files' / row['path']
        outside = self.root / 'saved-backup-file'
        file.rename(outside)
        file.symlink_to(outside)
        with self.assertRaises(self.tool.ResetError):
            self.run_tool(restore=self.backup, apply=True)

    def test_failure_after_atomic_rename_also_rolls_back_that_file(self):
        before = self.snapshot()
        original = self.tool.atomic_replace
        attempts = []

        def fail_after_rename(path, data, mode):
            if path.is_relative_to(self.world):
                attempts.append(path)
                if len(attempts) == 2:
                    original(path, data, mode)
                    raise OSError('simulated error after rename')
            return original(path, data, mode)

        with mock.patch.object(self.tool, 'atomic_replace', side_effect=fail_after_rename):
            with self.assertRaisesRegex(self.tool.ResetError, 'rolled back'):
                self.apply()
        self.assertEqual(before, self.snapshot())

    def test_failed_second_replacement_rolls_back_every_world_change(self):
        before = self.snapshot()
        original = self.tool.atomic_replace
        calls = []

        def fail_once(path, data, mode):
            calls.append(path)
            if len(calls) == 2:
                raise OSError('simulated storage failure')
            return original(path, data, mode)

        with mock.patch.object(self.tool, 'atomic_replace', side_effect=fail_once):
            with self.assertRaisesRegex(self.tool.ResetError, 'rolled back'):
                self.apply()
        self.assertEqual(before, self.snapshot())
        self.assertEqual(json.loads((self.backup / 'state.json').read_bytes())['status'], 'rolled_back')
        self.assertEqual(len([path for path in calls if path.is_relative_to(self.world)]), 3)


if __name__ == '__main__':
    unittest.main()
