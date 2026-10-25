import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('set_operation', Path(__file__).parents[1] / 'build-scripts/set-operation.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class OperatingPublishTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.old = {'formatVersion': 1, 'id': 'sunrin-valley', 'version': '0.2.0', 'minLauncherVersion': '0.1.3', 'bundle': {
            name: {'url': f'https://example.com/0.2.0/{name}', 'sha256': 'a' * 64} for name in ('manifest', 'prism', 'overlay')
        }, 'changes': ['기존 운영 구성']}
        self.new = {**self.old, 'version': '0.2.1', 'changes': ['새 운영 구성']}
        self.path = self.root / 'target.json'
        self.path.write_text(json.dumps(self.old))

    def apply(self, state, active, target=None):
        return MODULE.set_operation(self.root, self.path, state, active, target, '2030-01-01T10:00:00+09:00' if state == 'scheduled' else None, '테스트 상태')

    def test_only_promotes_after_health_confirmed_online_and_keeps_legacy_stable_pinned(self):
        self.apply('unconfigured', '0.2.0')
        stable = self.root / 'client-pack/channel/stable.json'
        self.path.write_text(json.dumps(self.new))
        operation = self.apply('scheduled', '0.2.0', '0.2.1')
        self.assertIn('release', operation)
        self.assertEqual(operation['release']['version'], '0.2.0')
        self.apply('maintenance', '0.2.0', '0.2.1')
        self.assertEqual(json.loads(stable.read_text())['version'], '0.2.0')
        self.apply('online', '0.2.1', '0.2.1')
        self.assertEqual(json.loads(stable.read_text())['version'], '0.2.1')

    def test_failed_update_keeps_the_previous_operating_release(self):
        self.apply('online', '0.2.0')
        self.path.write_text(json.dumps(self.new))
        result = self.apply('failed', '0.2.0', '0.2.1')
        self.assertIn('release', result)
        self.assertEqual(result['activeVersion'], '0.2.0')
        self.assertEqual(result['release']['version'], '0.2.0')

    def test_rejects_inconsistent_version_before_changing_existing_files(self):
        self.apply('online', '0.2.0')
        path = self.root / 'client-pack/channel/operating.json'
        self.assertTrue(path.exists())
        before = path.read_bytes()
        with self.assertRaises(ValueError):
            self.apply('online', '0.9.0')
        self.assertEqual(path.read_bytes(), before)

    def test_new_publication_does_not_change_operating_version_or_legacy_clients(self):
        self.apply('online', '0.2.0')
        channel = self.root / 'client-pack/channel'
        before = (channel / 'operating.json').read_bytes(), (channel / 'stable.json').read_bytes()
        self.path.write_text(json.dumps(self.new))
        MODULE.record_publication(self.root, self.path)
        self.assertEqual(json.loads((channel / 'published.json').read_text())['version'], '0.2.1')
        self.assertEqual((channel / 'operating.json').read_bytes(), before[0])
        self.assertEqual((channel / 'stable.json').read_bytes(), before[1])

    def test_non_online_states_cannot_promote_a_different_active_version(self):
        self.apply('online', '0.2.0')
        self.path.write_text(json.dumps(self.new))
        for state in ('unconfigured', 'unknown'):
            with self.subTest(state=state), self.assertRaises(ValueError):
                self.apply(state, '0.2.1')

    def test_failed_recovery_can_reselect_the_original_release_after_online_promotion(self):
        self.apply('online', '0.2.0')
        MODULE.record_publication(self.root, self.path)
        self.path.write_text(json.dumps(self.new))
        self.apply('online', '0.2.1', '0.2.1')
        result = self.apply('failed', '0.2.0', '0.2.1')
        self.assertEqual(result['activeVersion'], '0.2.0')
        self.assertEqual(result['status']['state'], 'failed')
        self.assertEqual(json.loads((self.root / 'client-pack/channel/stable.json').read_text())['version'], '0.2.0')


if __name__ == '__main__':
    unittest.main()
