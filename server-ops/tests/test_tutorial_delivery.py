"""Exact tutorial paths and reviewed upstream guards at the fresh-host boundary."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile


SPEC = importlib.util.spec_from_file_location('tutorial_host', Path(__file__).resolve().parents[1] / 'aws/host.py')
host = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(host)


class TutorialOverlayTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.server = self.root / 'server'
        self.originals = {
            'config/ftbquests/quests/chapters/welcome.snbt': b'original tutorial',
            'config/ftbquests/quests/chapters/perfection.snbt': b'original perfection',
            'kubejs/assets/ftbquestlocalizer/lang/ko_kr.json': b'original Korean',
            'kubejs/assets/ftbquestlocalizer/lang/en_us.json': b'original English',
        }
        for name, content in self.originals.items():
            target = self.server / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        self.contents = {name: b'new ' + content for name, content in self.originals.items()}
        self.contents['kubejs/server_scripts/sunrin_policy.js'] = b'new policy'
        self.payload = self.root / 'overlay.zip'
        self.write_overlay()

    def write_overlay(self):
        with zipfile.ZipFile(self.payload, 'w') as archive:
            for name, content in self.contents.items():
                archive.writestr(name, content)
        self.spec = {
            'size': self.payload.stat().st_size,
            'hash': {'algorithm': 'sha256', 'digest': hashlib.sha256(self.payload.read_bytes()).hexdigest()},
            'files': [{'path': name, 'mode': 'replace', 'size': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
                      for name, content in self.contents.items()],
            'reviewedReplacements': [{'path': name, 'mode': 'replace', 'size': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
                                     for name, content in self.originals.items()],
        }

    def test_fresh_overlay_replaces_only_reviewed_quest_and_language_files(self):
        host.apply_owned_overlay(self.payload, self.server, self.spec)
        for name, content in self.contents.items():
            self.assertEqual((self.server / name).read_bytes(), content)

    def test_changed_quest_predecessor_rejects_before_any_destination_write(self):
        name = 'config/ftbquests/quests/chapters/welcome.snbt'
        (self.server / name).write_bytes(b'operator edited tutorial')
        with self.assertRaises(host.HostError) as caught:
            host.apply_owned_overlay(self.payload, self.server, self.spec)
        self.assertEqual(caught.exception.code, 'owned-overlay-predecessor-mismatch')
        self.assertFalse((self.server / 'kubejs/server_scripts/sunrin_policy.js').exists())
        self.assertEqual((self.server / name).read_bytes(), b'operator edited tutorial')

    def test_missing_or_duplicate_review_is_rejected_even_for_absent_quest(self):
        (self.server / 'config/ftbquests/quests/chapters/welcome.snbt').unlink()
        for reviewed in [self.spec['reviewedReplacements'][1:], self.spec['reviewedReplacements'] * 2]:
            with self.subTest(reviewed=len(reviewed)), self.assertRaises(host.HostError) as caught:
                host.apply_owned_overlay(self.payload, self.server, {**self.spec, 'reviewedReplacements': reviewed})
            self.assertEqual(caught.exception.code, 'invalid-reviewed-upstream-replacement')
        self.assertFalse((self.server / 'kubejs/server_scripts/sunrin_policy.js').exists())

    def test_unknown_chapter_whole_config_and_extra_language_are_forbidden(self):
        for name in ['config/ftbquests/quests/chapters/unknown.snbt', 'config/ftbquests/quests/data.snbt',
                     'config/server.properties', 'kubejs/assets/ftbquestlocalizer/lang/fr_fr.json']:
            with self.subTest(path=name):
                self.assertFalse(host.overlay_owned_path(name))

    def test_malformed_review_path_is_a_rejected_overlay(self):
        reviewed = [dict(item) for item in self.spec['reviewedReplacements']]
        reviewed[0]['path'] = []
        with self.assertRaises(host.HostError) as caught:
            host.apply_owned_overlay(self.payload, self.server, {**self.spec, 'reviewedReplacements': reviewed})
        self.assertEqual(caught.exception.code, 'invalid-reviewed-upstream-replacement')
