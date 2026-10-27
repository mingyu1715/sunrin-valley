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

    def test_owned_jar_is_verified_copied_and_excluded_from_overlay(self):
        content = b"actual compiled artifact"
        name = "sunrin-core-0.1.0.jar"
        local = self.root / "sunrin-core/build/libs" / name
        local.parent.mkdir(parents=True)
        local.write_bytes(content)
        metadata = json.loads((self.root / "client-pack/manifest.json").read_text())
        pin = {"slug": "sunrin-core", "version": "0.1.0", "filename": name,
               "path": "mods/" + name, "url": "https://github.com/owner/sunrin/releases/download/pack-1.2.3/" + name,
               "sha256": sha256(content).hexdigest(), "size": len(content), "localPath": "sunrin-core/build/libs/" + name}
        metadata["sources"] = {"packVersion": "1.2.3", "releaseRepository": "owner/sunrin", "ownedFiles": [pin]}
        metadata["files"] = [{"path": pin["path"], "url": pin["url"], "hash": {"algorithm": "sha256", "value": pin["sha256"]}, "size": pin["size"], "source": {"provider": "sunrin", "slug": "sunrin-core", "version": "0.1.0"}}]
        (self.root / "client-pack/manifest.json").write_text(json.dumps(metadata))
        for relative in ["startup_scripts/nested/bridge.js", "data/sunrin/nested/settings.json"]:
            target = self.root / "kubejs-custom" / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("nested content")
        output = MODULE.build_update(self.root, "owner/sunrin", "0.1.2")
        self.assertEqual((output / name).read_bytes(), content)
        self.assertIn(sha256(content).hexdigest() + "  " + name, (output / "SHA256SUMS.txt").read_text())
        with zipfile.ZipFile(output / "Sunrin-Overlay.zip") as archive:
            self.assertIn("kubejs/data/sunrin/nested/settings.json", archive.namelist())
            self.assertFalse(any(p.startswith("mods/") for p in archive.namelist()))
        local.write_bytes(b"stale")
        with self.assertRaisesRegex(ValueError, "artifact"):
            MODULE.build_update(self.root, "owner/sunrin", "0.1.2")
        local.unlink()
        with self.assertRaises(ValueError):
            MODULE.build_update(self.root, "owner/sunrin", "0.1.2")

    def test_optional_bundle_output_copies_exact_overlay_bytes(self):
        bundle = self.root / "release/bundled"
        output = MODULE.build_update(self.root, "owner/repo", "0.1.2", bundle_output=bundle)
        self.assertEqual((bundle / "Sunrin-Overlay.zip").read_bytes(), (output / "Sunrin-Overlay.zip").read_bytes())

    def test_rejects_repository_or_version_values_that_cannot_form_immutable_release_urls(self):
        for repo, version in [('https://github.com/a/b', '0.1.2'), ('../escape', '0.1.2'), ('owner/repo', 'not-a-version')]:
            with self.subTest(repo=repo, version=version), self.assertRaises(ValueError):
                MODULE.build_update(self.root, repo, version)

    def test_refuses_linked_script_sources_instead_of_publishing_external_files(self):
        (self.root / 'outside.js').write_text('private local content')
        (self.root / 'kubejs-custom/server_scripts/link.js').symlink_to(self.root / 'outside.js')
        with self.assertRaises(ValueError):
            MODULE.build_update(self.root, 'owner/repo', '0.1.2')

    def test_includes_only_the_selected_release_changes(self):
        (self.root / 'client-pack/changes.json').write_text(json.dumps({'1.2.3': ['현재 버전 변경'], '1.2.4': ['아직 발행 전']}))
        output = MODULE.build_update(self.root, 'owner/repo', '0.1.2')
        self.assertEqual(json.loads((output / 'stable.json').read_text()).get('changes'), ['현재 버전 변경'])


if __name__ == '__main__':
    unittest.main()
