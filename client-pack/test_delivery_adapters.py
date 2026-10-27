import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TUTORIAL_CHAPTER_NAMES = (
    'abandoned_farm.snbt', 'armor_weapons__tools.snbt', 'artifacts.snbt', 'banners.snbt',
    'boiler_room.snbt', 'botania.snbt', 'crafts_room.snbt', 'creatures.snbt', 'crops.snbt',
    'drinks.snbt', 'fish_tank.snbt', 'fishing.snbt', 'gems.snbt', 'getting_started.snbt',
    'ii__building_up_the_farm.snbt', 'iii__advanced_farming.snbt', 'iv__prismatic_farming.snbt',
    'ivi__mechanical_farming.snbt', 'longwings.snbt', 'minerals.snbt', 'pantry.snbt',
    'perfection.snbt', 'relics.snbt', 'slimes.snbt', 'tools.snbt', 'transportation.snbt',
    'vault.snbt', 'villagers.snbt', 'welcome.snbt',
)


def module(name):
    path = ROOT / 'build-scripts' / (name + '.py')
    if not path.exists():
        return None
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class DeliveryAdapterTests(unittest.TestCase):
    def tutorial_fixture(self, root):
        predecessor = json.loads((ROOT / 'server-ops/releases/0.2.0/pack-lock.json').read_text())
        predecessor['clientPackVersion'] = '0.2.1'
        old = root / 'server-ops/releases/0.2.1/pack-lock.json'
        old.parent.mkdir(parents=True)
        old.write_text(json.dumps(predecessor))
        core_data = b'unchanged compiled core fixture'
        core = root / 'sunrin-core/build/libs/sunrin-core-0.1.1.jar'
        core.parent.mkdir(parents=True)
        core.write_bytes(core_data)
        pin = {'slug': 'sunrin-core', 'version': '0.1.1', 'filename': core.name, 'path': 'mods/' + core.name,
               'url': 'https://github.com/owner/repo/releases/download/pack-0.2.2/' + core.name,
               'size': len(core_data), 'sha256': hashlib.sha256(core_data).hexdigest(), 'localPath': 'sunrin-core/build/libs/' + core.name}
        lamp = next(i for i in json.loads((ROOT / 'client-pack/manifest.json').read_text())['files'] if i['source'].get('slug') == 'beatlamp')
        owned = {'path': pin['path'], 'url': pin['url'], 'size': pin['size'], 'hash': {'algorithm': 'sha256', 'value': pin['sha256']},
                 'source': {'provider': 'sunrin', 'slug': 'sunrin-core', 'version': '0.1.1'}}
        manifest = {'id': 'sunrin-valley', 'formatVersion': 1, 'version': '0.2.2',
                    'sources': {'packVersion': '0.2.2', 'releaseRepository': 'owner/repo', 'ownedFiles': [pin]}, 'files': [lamp, owned]}
        inputs = {'client-pack/manifest.json': json.dumps(manifest), 'client-pack/prism-runtime.json': '{}',
                  'kubejs-custom/data/sunrin/defaults/geonpi.json': '{}',
                  'kubejs-custom/server_scripts/playerEvents/chatColors.js': 'reviewed chat',
                  'kubejs-custom/server_scripts/sunrin_policy.js': 'new policy',
                  'kubejs-custom/assets/ftbquestlocalizer/lang/ko_kr.json': '{"tutorial":"새 설명"}',
                  'kubejs-custom/assets/ftbquestlocalizer/lang/en_us.json': '{"tutorial":"New text"}'}
        for name in TUTORIAL_CHAPTER_NAMES:
            inputs['questbook-custom/chapters/' + name] = 'new quest ' + name
        review_paths = ['config/ftbquests/quests/chapters/' + name for name in TUTORIAL_CHAPTER_NAMES] + [
            'kubejs/server_scripts/playerEvents/chatColors.js', 'kubejs/assets/ftbquestlocalizer/lang/ko_kr.json',
            'kubejs/assets/ftbquestlocalizer/lang/en_us.json']
        reviewed = [{'path': name, 'mode': 'replace', 'size': len(('original ' + name).encode()),
                     'sha256': hashlib.sha256(('original ' + name).encode()).hexdigest()} for name in review_paths]
        inputs['server-ops/releases/0.2.2/reviewed-upstream-replacements.json'] = json.dumps(reviewed)
        for name, content in inputs.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
        resource = root / 'resourcepacks/dist/Sunrin-Custom.zip'
        resource.parent.mkdir(parents=True)
        resource.write_bytes(b'own resource fixture')
        return predecessor, reviewed

    def test_tutorial_candidate_adds_all_exact_chapters_only_to_server_and_preserves_previous_mods(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            predecessor, reviewed = self.tutorial_fixture(root)
            client_output = module('build-update').build_update(root, 'owner/repo', '1.1.3')
            output = module('build-server-candidate').build_candidate(root, client_output=client_output, overlay_only=True)
            lock = json.loads((output / 'pack-lock.json').read_text())
            self.assertEqual(lock['clientPackVersion'], '0.2.2')
            self.assertEqual(lock['addons'], predecessor['addons'])
            self.assertEqual(lock['serverModCount'], predecessor['serverModCount'])
            self.assertEqual(lock['ownedOverlay']['reviewedReplacements'], reviewed)
            chapters = [item for item in lock['ownedOverlay']['files'] if item['path'].startswith('config/ftbquests/')]
            self.assertEqual(len(chapters), 29)
            self.assertEqual({item['mode'] for item in chapters}, {'replace'})
            with zipfile.ZipFile(output / 'Sunrin-Server-Overlay.zip') as archive:
                for name in TUTORIAL_CHAPTER_NAMES:
                    self.assertEqual(archive.read('config/ftbquests/quests/chapters/' + name), ('new quest ' + name).encode())
            host_spec = importlib.util.spec_from_file_location('tutorial_candidate_host', ROOT / 'server-ops/aws/host.py')
            host = importlib.util.module_from_spec(host_spec)
            host_spec.loader.exec_module(host)
            stage = root / 'fresh-server'
            for item in reviewed:
                path = stage / item['path']
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(('original ' + item['path']).encode())
            host.apply_owned_overlay(output / 'Sunrin-Server-Overlay.zip', stage, lock['ownedOverlay'])
            self.assertEqual((stage / 'config/ftbquests/quests/chapters/perfection.snbt').read_bytes(), b'new quest perfection.snbt')
            with zipfile.ZipFile(client_output / 'Sunrin-Overlay.zip') as archive:
                self.assertFalse(any(name.startswith('config/') for name in archive.namelist()))
                self.assertIn('kubejs/assets/ftbquestlocalizer/lang/ko_kr.json', archive.namelist())

    def test_tutorial_candidate_refuses_unreviewed_chapter_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.tutorial_fixture(root)
            (root / 'questbook-custom/chapters/operator.snbt').write_text('unreviewed')
            with self.assertRaisesRegex(ValueError, 'chapter'):
                module('build-server-candidate').build_candidate(root, overlay_only=True)

    def test_tutorial_candidate_refuses_linked_chapter_source_parent(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.tutorial_fixture(root)
            client_output = module('build-update').build_update(root, 'owner/repo', '1.1.3')
            (root / 'questbook-custom').rename(root / 'linked-questbook')
            (root / 'questbook-custom').symlink_to(root / 'linked-questbook', target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'regular.*chapter'):
                module('build-server-candidate').build_candidate(root, client_output=client_output, overlay_only=True)

    def test_pin_helper_accepts_explicit_core_patch_and_rejects_wrong_embedded_version(self):
        helper = module('pin-owned-artifact')
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            jar = root / 'sunrin-core/build/libs/sunrin-core-0.1.1.jar'
            jar.parent.mkdir(parents=True)
            with zipfile.ZipFile(jar, 'w') as z:
                z.writestr('META-INF/mods.toml', 'modId="sunrin_core"\nversion="0.1.1"\n')
            source = root / 'client-pack/sources.json'
            source.parent.mkdir()
            source.write_text(json.dumps({'packVersion': '0.2.1', 'releaseRepository': 'owner/repo'}))
            helper.refresh_pin(root, core_version='0.1.1')
            pin = json.loads(source.read_text())['ownedFiles'][0]
            self.assertEqual(pin['filename'], jar.name)
            self.assertEqual(pin['version'], '0.1.1')
            self.assertIn('/pack-0.2.1/', pin['url'])
            with zipfile.ZipFile(jar, 'w') as z:
                z.writestr('META-INF/mods.toml', 'modId="sunrin_core"\nversion="0.1.0"\n')
            with self.assertRaisesRegex(ValueError, 'version'):
                helper.refresh_pin(root, core_version='0.1.1')

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

    def test_hotfix_candidate_keeps_previous_mods_and_skips_completed_ftb_migration(self):
        helper = module('build-server-candidate')
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            old = root / 'server-ops/releases/0.2.0/pack-lock.json'
            old.parent.mkdir(parents=True)
            previous = json.loads((ROOT / 'server-ops/releases/0.2.0/pack-lock.json').read_text())
            old.write_text(json.dumps(previous))
            core_data = b'patch core fixture'
            core = root / 'sunrin-core/build/libs/sunrin-core-0.1.1.jar'
            core.parent.mkdir(parents=True)
            core.write_bytes(core_data)
            pin = {'slug':'sunrin-core','version':'0.1.1','filename':core.name,'path':'mods/'+core.name,
                   'url':'https://github.com/owner/repo/releases/download/pack-0.2.1/'+core.name,
                   'size':len(core_data),'sha256':hashlib.sha256(core_data).hexdigest(),'localPath':'sunrin-core/build/libs/'+core.name}
            lamp = next(i for i in json.loads((ROOT / 'client-pack/manifest.json').read_text())['files'] if i['source'].get('slug') == 'beatlamp')
            own = {'path':pin['path'],'url':pin['url'],'size':pin['size'],'hash':{'algorithm':'sha256','value':pin['sha256']},'source':{'provider':'sunrin','slug':'sunrin-core','version':'0.1.1'}}
            manifest = {'version':'0.2.1','sources':{'packVersion':'0.2.1','releaseRepository':'owner/repo','ownedFiles':[pin]},'files':[lamp,own]}
            for name, content in {'client-pack/manifest.json':json.dumps(manifest),'release/updates/0.2.1/stable.json':'{"version":"0.2.1"}',
                'kubejs-custom/data/sunrin/defaults/geonpi.json':'{}','kubejs-custom/server_scripts/playerEvents/chatColors.js':'new chat',
                'server-ops/releases/0.2.1/reviewed-upstream-replacements.json':json.dumps([{'path':'kubejs/server_scripts/playerEvents/chatColors.js','mode':'replace','size':10,'sha256':'a'*64}])}.items():
                path=root/name; path.parent.mkdir(parents=True,exist_ok=True);path.write_text(content)
            lamp_source = ROOT / '.work/plan-research/beatlamp-forge-1.20.1-1.2.2.jar'
            if not lamp_source.is_file(): self.skipTest('Optional actual Beat Lamp fixture absent')
            dest=root/'.work/plan-research'/lamp_source.name;dest.parent.mkdir(parents=True);dest.write_bytes(lamp_source.read_bytes())
            output=helper.build_candidate(root)
            release=json.loads((output/'server-release.json').read_text())
            lock=json.loads((output/'pack-lock.json').read_text())
            self.assertEqual(release['migrations'],[])
            self.assertEqual(lock['addons'],previous['addons'])
            self.assertEqual(lock['ownedFiles'][0]['version'],'0.1.1')
            self.assertEqual(release['ownedFileMerge']['reviewedReplacements'][0]['sha256'],'a'*64)
            self.assertEqual(lock['ownedOverlay']['reviewedReplacements'],release['ownedFileMerge']['reviewedReplacements'])
            self.assertNotIn('mods/sunrin-core-0.1.0.jar',[r['path'] for r in release['ownedFileMerge']['files']])
            self.assertEqual(lock['serverModCount'],previous['serverModCount'])

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
