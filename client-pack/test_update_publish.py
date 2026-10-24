import importlib.util
import json
import tempfile
import unittest
import zipfile
from hashlib import sha256
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('build_update', Path(__file__).parents[1] / 'build-scripts/build-update.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class UpdatePublishTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name, data in {
            'client-pack/manifest.json': json.dumps({'id': 'sunrin-valley', 'formatVersion': 1, 'version': '1.2.3'}),
            'client-pack/prism-runtime.json': '{"version":"11.1.1"}',
            'kubejs-custom/startup_scripts/sunrin_items.js': 'register items',
            'kubejs-custom/server_scripts/new_recipe.js': 'new recipe',
            'kubejs-custom/README.md': 'not game content',
            'kubejs-custom/test_items.cjs': 'not game content',
        }.items():
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(data)
        pack = self.root / 'resourcepacks/dist/Sunrin-Custom.zip'
        pack.parent.mkdir(parents=True)
        pack.write_bytes(b'custom resource pack')

    def test_builds_complete_reproducible_versioned_release_without_mirroring_mods(self):
        output = MODULE.build_update(self.root, 'owner/sunrin', '0.1.2')
        self.assertTrue((output / 'stable.json').exists())
        channel = json.loads((output / 'stable.json').read_text())
        self.assertEqual((channel['id'], channel['version'], channel['minLauncherVersion']), ('sunrin-valley', '1.2.3', '0.1.2'))
        expected_names = {'manifest': 'manifest.json', 'prism': 'prism-runtime.json', 'overlay': 'Sunrin-Overlay.zip'}
        for key, name in expected_names.items():
            self.assertEqual(channel['bundle'][key]['url'], f'https://github.com/owner/sunrin/releases/download/pack-1.2.3/{name}')
            self.assertEqual(channel['bundle'][key]['sha256'], sha256((output / name).read_bytes()).hexdigest())
        overlay = output / 'Sunrin-Overlay.zip'
        with zipfile.ZipFile(overlay) as archive:
            self.assertEqual(set(archive.namelist()), {'kubejs/startup_scripts/sunrin_items.js', 'kubejs/server_scripts/new_recipe.js', 'resourcepacks/Sunrin-Custom.zip'})
            self.assertEqual(archive.read('kubejs/server_scripts/new_recipe.js'), b'new recipe')
        before = overlay.read_bytes()
        MODULE.build_update(self.root, 'owner/sunrin', '0.1.2')
        self.assertEqual(overlay.read_bytes(), before)
        self.assertEqual({p.name for p in output.iterdir()}, {'manifest.json', 'prism-runtime.json', 'Sunrin-Overlay.zip', 'stable.json', 'SHA256SUMS.txt'})

    def test_rejects_repository_or_version_values_that_cannot_form_immutable_release_urls(self):
        for repo, version in [('https://github.com/a/b', '0.1.2'), ('../escape', '0.1.2'), ('owner/repo', 'not-a-version')]:
            with self.subTest(repo=repo, version=version), self.assertRaises(ValueError):
                MODULE.build_update(self.root, repo, version)

    def test_refuses_linked_script_sources_instead_of_publishing_external_files(self):
        (self.root / 'outside.js').write_text('private local content')
        (self.root / 'kubejs-custom/server_scripts/link.js').symlink_to(self.root / 'outside.js')
        with self.assertRaises(ValueError):
            MODULE.build_update(self.root, 'owner/repo', '0.1.2')


if __name__ == '__main__':
    unittest.main()
