import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    path = ROOT / 'build-scripts' / (name + '.py')
    if not path.exists():
        return None
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class DeliveryAdapterTests(unittest.TestCase):
    def test_pin_helper_uses_real_jar_and_only_updates_explicit_source_metadata(self):
        helper = module('pin-owned-artifact')
        self.assertIsNotNone(helper, 'explicit pin helper is required')
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            jar = root / 'sunrin-core/build/libs/sunrin-core-0.1.0.jar'
            jar.parent.mkdir(parents=True)
            with zipfile.ZipFile(jar, 'w') as z:
                z.writestr('META-INF/mods.toml', 'modId="sunrin_core"\nversion="0.1.0"\n')
            pack = root / 'client-pack'
            pack.mkdir()
            source = pack / 'sources.json'
            source.write_text(json.dumps({'packVersion': '0.2.0', 'releaseRepository': 'owner/repo'}))
            helper.refresh_pin(root)
            pin = json.loads(source.read_text())['ownedFiles'][0]
            self.assertEqual(pin['sha256'], hashlib.sha256(jar.read_bytes()).hexdigest())
            self.assertEqual(pin['size'], jar.stat().st_size)
            self.assertEqual(pin['url'], 'https://github.com/owner/repo/releases/download/pack-0.2.0/sunrin-core-0.1.0.jar')
            self.assertFalse((pack / 'manifest.json').exists())
            self.assertFalse((pack / 'channel').exists())

    def test_server_overlay_and_release_use_actual_hashes_recursive_owned_files_and_first_copy_defaults(self):
        helper = module('build-server-candidate')
        self.assertIsNotNone(helper, 'server candidate builder is required')
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for name, content in {'kubejs-custom/startup_scripts/sunrin_items.js': 'items', 'kubejs-custom/server_scripts/sunrin_policy.js': 'policy', 'kubejs-custom/data/sunrin/defaults/geonpi.json': '{"operatorUuids":["uuid"]}', 'kubejs-custom/data/sunrin/nested/pool.json': '{}', 'client-pack/manifest.json': json.dumps({'version':'0.2.0', 'sources':{'ownedFiles':[]}, 'files':[]}), 'release/updates/0.2.0/stable.json': '{"version":"0.2.0"}'}.items():
                p = root / name
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(content)
            old = root / 'server-ops/releases/0.1.4/pack-lock.json'
            old.parent.mkdir(parents=True)
            old.write_bytes((ROOT / 'server-ops/releases/0.1.4/pack-lock.json').read_bytes())
            manifest = json.loads((root / 'client-pack/manifest.json').read_text())
            manifest['files'] = [next(i for i in json.loads((ROOT / 'client-pack/manifest.json').read_text())['files'] if i['source'].get('slug') == 'beatlamp')]
            (root / 'client-pack/manifest.json').write_text(json.dumps(manifest))
            lamp = ROOT / '.work/plan-research/beatlamp-forge-1.20.1-1.2.2.jar'
            if not lamp.is_file():
                self.skipTest('Optional actual Beat Lamp artifact fixture is absent')
            lamp_target = root / '.work/plan-research' / lamp.name
            lamp_target.parent.mkdir(parents=True)
            lamp_target.write_bytes(lamp.read_bytes())
            core = root / 'sunrin-core/build/libs/sunrin-core-0.1.0.jar'
            core.parent.mkdir(parents=True)
            core.write_bytes(b'compiled core fixture')
            manifest['sources'] = {'packVersion': '0.2.0', 'releaseRepository': 'owner/repo', 'ownedFiles': [{'slug': 'sunrin-core', 'version': '0.1.0', 'filename': core.name, 'path': 'mods/' + core.name, 'url': 'https://github.com/owner/repo/releases/download/pack-0.2.0/' + core.name, 'size': core.stat().st_size, 'sha256': hashlib.sha256(core.read_bytes()).hexdigest(), 'localPath': 'sunrin-core/build/libs/' + core.name}]}
            manifest['files'].append({'path': 'mods/' + core.name, 'url': manifest['sources']['ownedFiles'][0]['url'], 'size': core.stat().st_size, 'hash': {'algorithm': 'sha256', 'value': hashlib.sha256(core.read_bytes()).hexdigest()}, 'source': {'provider': 'sunrin', 'slug': 'sunrin-core', 'version': '0.1.0'}})
            (root / 'client-pack/manifest.json').write_text(json.dumps(manifest))
            output = helper.build_candidate(root)
            lock = json.loads((output / 'pack-lock.json').read_text())
            overlay = output / lock['ownedOverlay']['filename']
            self.assertEqual(lock['ownedOverlay']['hash']['digest'], hashlib.sha256(overlay.read_bytes()).hexdigest())
            with zipfile.ZipFile(overlay) as z:
                self.assertIn('kubejs/data/sunrin/nested/pool.json', z.namelist())
                self.assertIn('config/sunrin/geonpi.json', z.namelist())
            defaults = next(i for i in lock['ownedOverlay']['files'] if i['path'] == 'config/sunrin/geonpi.json')
            self.assertEqual(defaults['mode'], 'ifAbsent')
            release = json.loads((output / 'server-release.json').read_text())
            self.assertEqual(release['managedPaths'], [])
            self.assertIn('ftbchunks-member-limit', release['migrations'])
            self.assertEqual(release['archive']['sha256'], hashlib.sha256((output / release['archive']['path']).read_bytes()).hexdigest())
