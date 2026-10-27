"""Local integration tests: commands operate only on disposable test directories."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile
from datetime import datetime, timedelta, timezone


HERE = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("server_updater", HERE / "updater.py")


class FakeClock:
    def __init__(self):
        self.time = datetime(2030, 1, 1, tzinfo=timezone.utc)
        self.sleeps = []

    def now(self):
        return self.time

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.time += timedelta(seconds=seconds)


class UpdaterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.server = self.root / "server"
        self.server.mkdir()
        (self.server / "server.jar").write_text("old")
        (self.server / "world").mkdir()
        (self.server / "world" / "level.dat").write_text("old world")
        (self.server / "notes.txt").write_text("operator data")
        self.state = self.root / "state"
        self.log = self.root / "commands.jsonl"
        self.hook = self.root / "hook.py"
        self.hook.write_text('''import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
name = sys.argv[2]
with (root / "commands.jsonl").open("a") as stream:
    stream.write(json.dumps({"name": name, "args": sys.argv[3:], "version": (root / "server/server.jar").read_text()}) + "\\n")
if name == "save":
    (root / "frozen").write_text("yes")
if name == "resumeSaves":
    (root / "frozen").unlink(missing_ok=True)
if name == "start":
    (root / "frozen").unlink(missing_ok=True)
    if (root / "server/server.jar").read_text() == "new":
        (root / "server/world/level.dat").write_text("target world")
        (root / "server/notes.txt").write_text("operator change survives rollback")
if name == "announce" and (root / "fail-announce").exists():
    sys.exit(1)
if (root / ("fail-" + name)).exists() and (root / "server/server.jar").read_text() == "new":
    print("secret command output must never be journaled", file=sys.stderr)
    sys.exit(1)
''')
        self.clock = FakeClock()
        self.config = {
            "formatVersion": 1, "enabled": True,
            "serverDirectory": "server", "stateDirectory": "state",
            "activeVersion": "1.0.0",
            "releaseManifestTemplate": "releases/{version}/server-release.json",
            "managedPaths": ["server.jar"], "protectedPaths": ["world"],
            "hooks": {name: [sys.executable, str(self.hook), str(self.root), name]
                      for name in ["announce", "save", "resumeSaves", "stop", "start", "health", "publishStatus"]},
            "health": {"timeoutSeconds": 2, "retrySeconds": 1, "commandTimeoutSeconds": 1},
        }
        self.config["hooks"]["announce"] += ["{message}"]
        self.config["hooks"]["publishStatus"] += ["{state}", "{activeVersion}", "{targetVersion}", "{clientRelease}"]
        self.schedule = {"formatVersion": 1, "targetVersion": "1.1.0",
                         "applyAt": "2030-01-01T00:00:10+00:00", "announcementsSeconds": [10, 5]}
        self.config_path = self.root / "config.json"
        self.schedule_path = self.root / "schedule.json"
        self.release = self.root / "releases" / "1.1.0"
        self.release.mkdir(parents=True)
        (self.release / "client-release.json").write_text(json.dumps({"version": "1.1.0", "release": {"channel": "https://example.invalid/stable.json"}}))
        self.archive = self.release / "server.zip"
        self.write_archive({"server.jar": "new"})
        self.write_inputs()

    def write_inputs(self):
        self.config_path.write_text(json.dumps(self.config))
        self.schedule_path.write_text(json.dumps(self.schedule))

    def write_archive(self, files):
        with zipfile.ZipFile(self.archive, "w") as archive:
            for name, content in files.items():
                archive.writestr(name, content)
        self.manifest = {"formatVersion": 1, "version": "1.1.0",
                         "archive": {"path": "server.zip", "sha256": hashlib.sha256(self.archive.read_bytes()).hexdigest()},
                         "clientRelease": "client-release.json", "managedPaths": ["server.jar"]}
        (self.release / "server-release.json").write_text(json.dumps(self.manifest))

    def runner(self):
        module = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(module)
        self.module = module
        return module.Updater(self.config_path, self.schedule_path, clock=self.clock)

    def commands(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []

    def journal(self):
        return json.loads((self.state / "journal.json").read_text())

    def owned_candidate(self, *, corrupt=False):
        files = {"kubejs/startup_scripts/sunrin_items.js": "new script", "mods/sunrin-core-0.1.0.jar": "core", "config/sunrin/geonpi.json": '{"operatorUuids":["default"]}'}
        for name, value in {"kubejs/startup_scripts/sunrin_items.js": "old script", "kubejs/startup_scripts/original.js": "upstream", "mods/StageBox-Mod-1.1.2-Forge-1.20.1.jar": "old stagebox", "mods/operator.jar": "operator mod", "config/sunrin/geonpi.json": '{"operatorUuids":["custom"]}'}.items():
            path = self.server / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(value)
        previous = [{"path": name, "sha256": hashlib.sha256(value.encode()).hexdigest(), "size": len(value.encode()), "mode": "replace"}
                    for name, value in {"kubejs/startup_scripts/sunrin_items.js": "old script", "mods/StageBox-Mod-1.1.2-Forge-1.20.1.jar": "old stagebox"}.items()]
        (self.server / ".sunrin-owned-files.json").write_text(json.dumps({"formatVersion": 1, "files": previous}))
        self.write_archive({"server.jar": "new", **files})
        self.manifest["ownedFileMerge"] = {"files": [{"path": name, "sha256": hashlib.sha256(value.encode()).hexdigest() if not corrupt else "0" * 64,
                                                   "size": len(value.encode()), "mode": "ifAbsent" if name.startswith("config/") else "replace"} for name, value in files.items()]}
        (self.release / "server-release.json").write_text(json.dumps(self.manifest))

    def test_owned_merge_preserves_upstream_playerdata_and_existing_config(self):
        self.owned_candidate()
        self.runner().execute()
        self.assertEqual((self.server / "kubejs/startup_scripts/sunrin_items.js").read_text(), "new script")
        self.assertEqual((self.server / "kubejs/startup_scripts/original.js").read_text(), "upstream")
        self.assertEqual((self.server / "mods/operator.jar").read_text(), "operator mod")
        self.assertFalse((self.server / "mods/StageBox-Mod-1.1.2-Forge-1.20.1.jar").exists())
        self.assertEqual(json.loads((self.server / "config/sunrin/geonpi.json").read_text())["operatorUuids"], ["custom"])

    def chat_candidate(self, *, review=True, wrong_digest=False):
        self.owned_candidate()
        old_manifest = dict(self.manifest)
        name = 'kubejs/server_scripts/playerEvents/chatColors.js'
        target = self.server / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b'original upstream chat')
        with zipfile.ZipFile(self.archive) as z:
            files = {n: z.read(n) for n in z.namelist()}
        files[name] = b'profile-aware chat'
        self.write_archive(files)
        self.manifest.update({k:v for k,v in old_manifest.items() if k != 'archive'})
        self.manifest['ownedFileMerge']['files'].append({'path':name,'size':len(files[name]),'sha256':hashlib.sha256(files[name]).hexdigest(),'mode':'replace'})
        if review:
            self.manifest['ownedFileMerge']['reviewedReplacements'] = [{'path':name,'size':len(b'original upstream chat'),'sha256':'0'*64 if wrong_digest else hashlib.sha256(b'original upstream chat').hexdigest(),'mode':'replace'}]
        (self.release / 'server-release.json').write_text(json.dumps(self.manifest))
        return target

    def test_upstream_chat_takeover_requires_exact_review_before_any_hook(self):
        target = self.chat_candidate(review=False)
        with self.assertRaisesRegex(Exception, 'reviewed.*replacement'):
            self.runner().execute()
        self.assertEqual(self.commands(), [])
        self.assertEqual(target.read_bytes(), b'original upstream chat')

    def test_upstream_chat_takeover_rejects_changed_predecessor(self):
        target = self.chat_candidate(wrong_digest=True)
        with self.assertRaisesRegex(Exception, 'replacement.*checksum'):
            self.runner().execute()
        self.assertEqual(self.commands(), [])
        self.assertEqual(target.read_bytes(), b'original upstream chat')

    def test_reviewed_upstream_chat_replacement_is_backed_up_and_rolled_back(self):
        target = self.chat_candidate()
        (self.root / 'fail-health').write_text('target fails')
        with self.assertRaises(Exception):
            self.runner().execute()
        self.assertTrue(any(c['name']=='start' for c in self.commands()))
        self.assertEqual(target.read_bytes(), b'original upstream chat')
        self.assertFalse((self.server / 'mods/sunrin-core-0.1.0.jar').exists())

    def test_reviewed_chat_is_rechecked_after_scheduled_waiting(self):
        target = self.chat_candidate()
        with self.hook.open('a') as stream:
            stream.write('\nif name == "announce":\n    (root / "server/kubejs/server_scripts/playerEvents/chatColors.js").write_bytes(b"operator edit during notice")\n')
        with self.assertRaisesRegex(Exception, 'replacement.*checksum'):
            self.runner().execute()
        self.assertEqual(target.read_bytes(), b'operator edit during notice')
        self.assertEqual((self.server / 'server.jar').read_text(), 'old')

    def test_failed_final_predecessor_check_preserves_edits_after_backup(self):
        target = self.chat_candidate()
        with self.hook.open('a') as stream:
            stream.write('\nif name == "stop" and not (root / "stop-edit").exists():\n    (root / "stop-edit").write_text("once")\n    (root / "server/kubejs/server_scripts/playerEvents/chatColors.js").write_bytes(b"operator edit after backup")\n')
        with self.assertRaisesRegex(Exception, 'replacement.*checksum'):
            self.runner().execute()
        self.assertEqual(target.read_bytes(), b'operator edit after backup')
        self.assertEqual((self.server / 'server.jar').read_text(), 'old')
        self.assertEqual((self.server / 'world/level.dat').read_text(), 'old world')
        self.assertFalse(self.journal()['contentTouched'])
        self.assertEqual(self.journal()['phase'],'rolled_back')

    def tutorial_candidate(self):
        self.owned_candidate()
        old_manifest = dict(self.manifest)
        names = ['config/ftbquests/quests/chapters/welcome.snbt',
                 'config/ftbquests/quests/chapters/perfection.snbt',
                 'kubejs/assets/ftbquestlocalizer/lang/ko_kr.json',
                 'kubejs/assets/ftbquestlocalizer/lang/en_us.json']
        with zipfile.ZipFile(self.archive) as archive:
            files = {name: archive.read(name) for name in archive.namelist()}
        originals = {name: ('original ' + name).encode() for name in names}
        for name, content in originals.items():
            target = self.server / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            files[name] = ('new ' + name).encode()
        self.write_archive(files)
        self.manifest.update({k: v for k, v in old_manifest.items() if k != 'archive'})
        self.manifest['ownedFileMerge']['files'].extend(
            {'path': name, 'mode': 'replace', 'size': len(files[name]), 'sha256': hashlib.sha256(files[name]).hexdigest()}
            for name in names)
        self.manifest['ownedFileMerge']['reviewedReplacements'] = [
            {'path': name, 'mode': 'replace', 'size': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
            for name, content in originals.items()]
        (self.release / 'server-release.json').write_text(json.dumps(self.manifest))
        return originals

    def test_reviewed_tutorial_merge_replaces_exact_quests_and_languages_and_records_ownership(self):
        originals = self.tutorial_candidate()
        self.runner().execute()
        receipt = json.loads((self.server / '.sunrin-owned-files.json').read_text())
        for name, content in originals.items():
            self.assertEqual((self.server / name).read_bytes(), ('new ' + name).encode())
            self.assertEqual((Path(self.journal()['backupDirectory']) / name).read_bytes(), content)
            self.assertIn(name, [item['path'] for item in receipt['files']])
        self.assertEqual((self.server / 'world/level.dat').read_text(), 'target world')

    def test_tutorial_takeover_rejects_missing_review_and_changed_upstream_before_hooks(self):
        for changed in (False, True):
            with self.subTest(changed=changed):
                originals = self.tutorial_candidate()
                name = next(iter(originals))
                if changed:
                    (self.server / name).write_bytes(b'operator edited quest')
                else:
                    self.manifest['ownedFileMerge']['reviewedReplacements'] = []
                    (self.release / 'server-release.json').write_text(json.dumps(self.manifest))
                with self.assertRaisesRegex(Exception, 'reviewed.*replacement|replacement.*checksum'):
                    self.runner().execute()
                self.assertEqual(self.commands(), [])
                self.assertEqual((self.server / name).read_bytes(), b'operator edited quest' if changed else originals[name])

    def test_tutorial_rechecks_after_stop_without_overwriting_the_detected_edit(self):
        self.tutorial_candidate()
        name = 'config/ftbquests/quests/chapters/welcome.snbt'
        with self.hook.open('a') as stream:
            stream.write('\nif name == "stop" and not (root / "stop-edit").exists():\n    (root / "stop-edit").write_text("once")\n    (root / "server/config/ftbquests/quests/chapters/welcome.snbt").write_bytes(b"operator edit after backup")\n')
        with self.assertRaisesRegex(Exception, 'replacement.*checksum'):
            self.runner().execute()
        self.assertEqual((self.server / name).read_bytes(), b'operator edit after backup')
        self.assertFalse(self.journal()['contentTouched'])
        self.assertEqual(self.journal()['phase'], 'rolled_back')

    def test_failed_tutorial_start_restores_quest_language_and_owned_receipt(self):
        originals = self.tutorial_candidate()
        receipt = (self.server / '.sunrin-owned-files.json').read_bytes()
        (self.root / 'fail-health').write_text('target fails')
        with self.assertRaises(Exception):
            self.runner().execute()
        for name, content in originals.items():
            self.assertEqual((self.server / name).read_bytes(), content)
        self.assertEqual((self.server / '.sunrin-owned-files.json').read_bytes(), receipt)
        self.assertEqual(self.journal()['phase'], 'rolled_back')

    def test_tutorial_exception_does_not_allow_other_config_or_localizer_paths(self):
        self.runner()
        for name in ['config/ftbquests/quests/chapters/operator.snbt',
                     'config/ftbquests/quests/data.snbt', 'config/ftbquests/quests',
                     'config/server.properties', 'kubejs/assets/ftbquestlocalizer/lang/fr_fr.json']:
            with self.subTest(path=name), self.assertRaisesRegex(Exception, 'owned file'):
                self.module.owned_entries([{'path': name, 'mode': 'replace', 'size': 1, 'sha256': 'a' * 64}])
        with self.assertRaisesRegex(Exception, 'ifAbsent'):
            self.module.owned_entries([{'path': 'config/sunrin/geonpi.json', 'mode': 'replace', 'size': 1, 'sha256': 'a' * 64}])

    def test_patch_core_retires_exact_previous_owned_version(self):
        self.owned_candidate()
        old_core = self.server / 'mods/sunrin-core-0.1.0.jar'
        old_core.write_text('previous compiled core')
        receipt_path = self.server / '.sunrin-owned-files.json'
        receipt = json.loads(receipt_path.read_text())
        receipt['files'].append({'path':'mods/sunrin-core-0.1.0.jar','mode':'replace','size':old_core.stat().st_size,'sha256':hashlib.sha256(old_core.read_bytes()).hexdigest()})
        receipt_path.write_text(json.dumps(receipt))
        old_manifest = dict(self.manifest)
        with zipfile.ZipFile(self.archive) as z:
            files={name:z.read(name) for name in z.namelist() if name!='mods/sunrin-core-0.1.0.jar'}
        files['mods/sunrin-core-0.1.1.jar']=b'new compiled core'
        self.write_archive(files)
        self.manifest.update({k:v for k,v in old_manifest.items() if k!='archive'})
        owned=self.manifest['ownedFileMerge']['files']
        owned[:]=[r for r in owned if r['path']!='mods/sunrin-core-0.1.0.jar']
        content=files['mods/sunrin-core-0.1.1.jar']
        owned.append({'path':'mods/sunrin-core-0.1.1.jar','mode':'replace','size':len(content),'sha256':hashlib.sha256(content).hexdigest()})
        (self.release/'server-release.json').write_text(json.dumps(self.manifest))
        self.runner().execute()
        self.assertFalse(old_core.exists())
        self.assertEqual((self.server/'mods/sunrin-core-0.1.1.jar').read_bytes(),content)

    def test_owned_merge_bad_digest_is_rejected_before_hooks(self):
        self.owned_candidate(corrupt=True)
        with self.assertRaisesRegex(Exception, "checksum|digest"):
            self.runner().execute()
        self.assertEqual(self.commands(), [])

    def test_owned_merge_rolls_back_retired_jar_scripts_and_receipt(self):
        self.owned_candidate()
        before = (self.server / ".sunrin-owned-files.json").read_bytes()
        (self.root / "fail-health").write_text("target fails")
        with self.assertRaises(Exception):
            self.runner().execute()
        self.assertEqual((self.server / "kubejs/startup_scripts/sunrin_items.js").read_text(), "old script")
        self.assertTrue((self.server / "mods/StageBox-Mod-1.1.2-Forge-1.20.1.jar").is_file())
        self.assertFalse((self.server / "mods/sunrin-core-0.1.0.jar").exists())
        self.assertEqual((self.server / ".sunrin-owned-files.json").read_bytes(), before)

    def test_ftb_key_merge_preserves_comments_extras_and_claim_data(self):
        world = self.server / "world/serverconfig"
        world.mkdir()
        config = world / "ftbchunks-world.snbt"
        original = b'{\r\n # operator comment\r\n max_claimed_chunks: 500\r\n party_limit_mode: "largest"\r\n extra_claim_chunks: 19\r\n hard_team_claim_limit: 0\r\n}\r\n'
        config.write_bytes(original)
        default = self.server / "defaultconfigs/ftbchunks/ftbchunks-world.snbt"
        default.parent.mkdir(parents=True)
        default.write_bytes(original)
        claims = self.server / "world/claims.snbt"
        claims.write_bytes(b"existing claims")
        self.manifest["migrations"] = ["ftbchunks-member-limit"]
        (self.release / "server-release.json").write_text(json.dumps(self.manifest))
        self.config["reviewedMigrations"] = ["ftbchunks-member-limit"]
        self.write_inputs()
        self.runner().execute()
        merged = config.read_bytes()
        self.assertEqual(merged, original.replace(b'max_claimed_chunks: 500', b'max_claimed_chunks: 4').replace(b'party_limit_mode: "largest"', b'party_limit_mode: "sum"'))
        self.assertEqual(default.read_bytes(), merged)
        self.assertEqual(claims.read_bytes(), b"existing claims")
        self.assertEqual((Path(self.journal()["backupDirectory"]) / "world/serverconfig/ftbchunks-world.snbt").read_bytes(), original)

    def test_retired_default_configuration_is_preserved(self):
        self.owned_candidate()
        receipt_path = self.server / ".sunrin-owned-files.json"
        receipt = json.loads(receipt_path.read_text())
        receipt["files"].append({"path": "config/sunrin/geonpi.json", "sha256": "a" * 64, "size": 10, "mode": "ifAbsent"})
        receipt_path.write_text(json.dumps(receipt))
        self.manifest["ownedFileMerge"]["files"] = [i for i in self.manifest["ownedFileMerge"]["files"] if not i["path"].startswith("config/")]
        self.write_archive({"server.jar": "new", "kubejs/startup_scripts/sunrin_items.js": "new script", "mods/sunrin-core-0.1.0.jar": "core"})
        self.manifest["ownedFileMerge"] = {"files": [{"path": name, "sha256": hashlib.sha256(value.encode()).hexdigest(), "size": len(value), "mode": "replace"} for name, value in {"kubejs/startup_scripts/sunrin_items.js": "new script", "mods/sunrin-core-0.1.0.jar": "core"}.items()]}
        (self.release / "server-release.json").write_text(json.dumps(self.manifest))
        self.runner().execute()
        self.assertTrue((self.server / "config/sunrin/geonpi.json").is_file())

    def test_owned_descriptors_reject_protected_paths_and_case_collisions(self):
        self.owned_candidate()
        for paths in [["world/playerdata/player.dat"], ["kubejs/server_scripts/sunrin_a.js", "kubejs/server_scripts/sunrin_A.js"], ["kubejs/config/server.properties"]]:
            self.manifest["ownedFileMerge"]["files"] = [{"path": name, "sha256": "a" * 64, "size": 1} for name in paths]
            (self.release / "server-release.json").write_text(json.dumps(self.manifest))
            with self.assertRaises(Exception):
                self.runner().execute()
            self.assertEqual(self.commands(), [])

    def test_bootstrap_ownership_import_requires_reviewed_matching_marker_and_bytes(self):
        self.owned_candidate()
        receipt = json.loads((self.server / ".sunrin-owned-files.json").read_text())
        (self.server / ".sunrin-owned-files.json").unlink()
        (self.server / ".sunrin-server-complete.json").write_text(json.dumps({"lockSha256": "a" * 64}))
        with self.assertRaisesRegex(Exception, "reviewedOwnershipMigration"):
            self.runner().execute()
        self.assertEqual(self.commands(), [])
        self.config["reviewedOwnershipMigration"] = {"lockSha256": "a" * 64, "files": receipt["files"]}
        self.write_inputs()
        self.runner().execute()
        self.assertFalse((self.server / "mods/StageBox-Mod-1.1.2-Forge-1.20.1.jar").exists())

    def test_stagebox_is_never_silently_left_or_adopted_without_ownership(self):
        self.owned_candidate()
        (self.server / ".sunrin-owned-files.json").unlink()
        with self.assertRaisesRegex(Exception, "StageBox|ownership"):
            self.runner().execute()
        self.assertEqual(self.commands(), [])
        self.assertEqual((self.server / "mods/StageBox-Mod-1.1.2-Forge-1.20.1.jar").read_text(), "old stagebox")

    def test_geonpi_merge_requires_review_and_restores_original_after_failed_start(self):
        config = self.server / "config/sunrin/geonpi.json"
        config.parent.mkdir(parents=True)
        config.write_text('{"operatorUuids":[],"tokenTtlSeconds":999}')
        original = config.read_bytes()
        self.manifest["migrations"] = ["geonpi-operators"]
        (self.release / "server-release.json").write_text(json.dumps(self.manifest))
        with self.assertRaisesRegex(Exception, "reviewedMigrations"):
            self.runner().execute()
        self.assertEqual(self.commands(), [])
        self.config["reviewedMigrations"] = ["geonpi-operators"]
        self.write_inputs()
        (self.root / "fail-start").write_text("target fails")
        with self.assertRaises(Exception):
            self.runner().execute()
        self.assertEqual(config.read_bytes(), original)
        (self.root / "fail-start").unlink()
        self.runner().execute()
        value = json.loads(config.read_text())
        self.assertEqual(value["operatorUuids"], ["d415f5f4-e89d-4dcf-be37-242f5495681e"])
        self.assertEqual(value["tokenTtlSeconds"], 999)

    def test_reviewed_bootstrap_marker_is_promoted_and_rolls_back_with_owned_files(self):
        self.owned_candidate()
        marker = self.server / ".sunrin-server-complete.json"
        marker.write_text('{"packId":"old","lockSha256":"old"}')
        original = marker.read_bytes()
        self.manifest["bootstrapMarker"] = {"packId": "sunrin-valley-server-1.1.0", "lockSha256": "b" * 64, "modCount": 316}
        (self.release / "server-release.json").write_text(json.dumps(self.manifest))
        (self.root / "fail-health").write_text("fail target")
        with self.assertRaises(Exception):
            self.runner().execute()
        self.assertEqual(marker.read_bytes(), original)
        (self.root / "fail-health").unlink()
        self.runner().execute()
        self.assertEqual(json.loads(marker.read_text()), self.manifest["bootstrapMarker"])

    def test_release_without_owned_merge_preserves_existing_owned_content(self):
        self.owned_candidate()
        self.write_archive({"server.jar": "new"})
        receipt = (self.server / ".sunrin-owned-files.json").read_bytes()
        self.runner().execute()
        self.assertEqual((self.server / "kubejs/startup_scripts/sunrin_items.js").read_text(), "old script")
        self.assertEqual((self.server / ".sunrin-owned-files.json").read_bytes(), receipt)

    def test_cli_plan_is_read_only_even_when_disabled_and_release_absent(self):
        self.config["enabled"] = False
        self.config["hooks"] = {}
        self.schedule["targetVersion"] = "future"
        self.write_inputs()
        result = subprocess.run([sys.executable, str(HERE / "updater.py"), "--config", str(self.config_path),
                                 "--schedule", str(self.schedule_path), "--plan"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.state.exists())
        self.assertFalse(self.log.exists())
        self.assertEqual(json.loads(result.stdout)["mode"], "plan")

    def test_execute_guards_disabled_and_missing_hooks_before_creating_state(self):
        for disabled, hooks in [(True, self.config["hooks"]), (False, {})]:
            with self.subTest(disabled=disabled):
                self.config["enabled"] = not disabled
                self.config["hooks"] = hooks
                self.write_inputs()
                with self.assertRaisesRegex(Exception, "disabled|hook"):
                    self.runner().execute()
                self.assertFalse(self.state.exists())
                self.assertFalse(self.log.exists())

    def test_success_waits_announces_backs_up_and_promotes_only_after_health(self):
        self.runner().execute()
        commands = self.commands()
        names = [call["name"] for call in commands]
        self.assertEqual([name for name in names if name != "publishStatus"],
                         ["announce", "announce", "save", "stop", "start", "health"])
        self.assertEqual(sum(self.clock.sleeps), 10)
        statuses = [call for call in commands if call["name"] == "publishStatus"]
        self.assertTrue(all(call["args"][1] == "1.0.0" for call in statuses[:-1]))
        self.assertEqual(statuses[-1]["args"][:3], ["online", "1.1.0", "1.1.0"])
        self.assertLess(names.index("health"), len(names) - 1)
        self.assertEqual((self.server / "server.jar").read_text(), "new")
        backup = Path(self.journal()["backupDirectory"])
        self.assertEqual((backup / "server.jar").read_text(), "old")
        self.assertEqual((backup / "world/level.dat").read_text(), "old world")
        self.assertEqual(self.journal()["phase"], "succeeded")

    def test_bad_archives_rejected_before_any_server_command(self):
        bad_entries = ["../escape", "world/level.dat", "Server.jar", "mods/../server.jar", "server.jar/child"]
        for bad in bad_entries:
            with self.subTest(entry=bad):
                self.write_archive({"server.jar": "new", bad: "bad"})
                with self.assertRaises(Exception):
                    self.runner().execute()
                self.assertEqual(self.commands(), [])
                self.assertEqual((self.server / "world/level.dat").read_text(), "old world")

    def test_wrong_checksum_rejected_before_notices(self):
        self.archive.write_bytes(b"wrong")
        with self.assertRaisesRegex(Exception, "checksum"):
            self.runner().execute()
        self.assertEqual(self.commands(), [])

    def test_start_and_health_failures_restore_old_files_world_and_keep_unmanaged_changes(self):
        for hook in ["start", "health"]:
            with self.subTest(hook=hook):
                (self.root / ("fail-" + hook)).write_text("fail new version only")
                with self.assertRaises(Exception):
                    self.runner().execute()
                self.assertEqual((self.server / "server.jar").read_text(), "old")
                self.assertEqual((self.server / "world/level.dat").read_text(), "old world")
                self.assertEqual((self.server / "notes.txt").read_text(), "operator change survives rollback")
                self.assertEqual(self.commands()[-1]["args"][:2], ["online", "1.0.0"])
                self.assertEqual(self.journal()["phase"], "rolled_back")
                self.assertNotIn("secret command output", (self.state / "journal.json").read_text())
                self.log.unlink()
                (self.root / ("fail-" + hook)).unlink()

    def test_apply_failure_restores_before_starting_old_server(self):
        updater = self.runner()
        original_copy = updater.copy_owned
        def fail_copy(source, destination):
            if source.parent.name == 'stage' and destination.resolve() == (self.server / 'server.jar').resolve():
                self.assertTrue(self.journal()['contentTouched'])
                destination.write_text('partially applied')
                raise OSError('injected local disk failure')
            return original_copy(source, destination)
        updater.copy_owned = fail_copy
        with self.assertRaises(Exception):
            updater.execute()
        self.assertEqual((self.server / "server.jar").read_text(), "old")
        starts = [call for call in self.commands() if call["name"] == "start"]
        self.assertEqual([call["version"] for call in starts], ["old"])

    def test_backup_failure_resumes_saves_without_stopping_server(self):
        updater = self.runner()
        def fail_backup(destination):
            raise OSError("injected backup failure")
        updater.backup = fail_backup
        with self.assertRaises(Exception):
            updater.execute()
        self.assertFalse((self.root / "frozen").exists())
        self.assertNotIn("stop", [call["name"] for call in self.commands()])
        self.assertEqual(self.journal()["phase"], "aborted")

    def test_lock_blocks_second_execution(self):
        updater = self.runner()
        with updater.lock():
            with self.assertRaisesRegex(Exception, "locked"):
                self.runner().execute()
        self.assertEqual(self.commands(), [])

    def test_crash_after_apply_requires_explicit_recovery_and_restores_snapshot(self):
        updater = self.runner()
        original_apply = updater.apply
        def crash_after_apply(stage):
            original_apply(stage)
            raise KeyboardInterrupt()
        updater.apply = crash_after_apply
        with self.assertRaises(KeyboardInterrupt):
            updater.execute()
        self.assertEqual((self.server / "server.jar").read_text(), "new")
        with self.assertRaisesRegex(Exception, "recover"):
            self.runner().execute()
        before = self.commands()
        self.assertEqual(self.runner().plan(recover=True)["mode"], "recover-plan")
        self.assertEqual(self.commands(), before)
        self.runner().recover()
        self.assertEqual((self.server / "server.jar").read_text(), "old")
        self.assertEqual(self.journal()["phase"], "rolled_back")

    def test_recovery_of_old_journal_without_content_flag_restores_snapshot(self):
        updater = self.runner()
        original_apply = updater.apply
        def crash_after_apply(stage):
            original_apply(stage)
            raise KeyboardInterrupt()
        updater.apply = crash_after_apply
        with self.assertRaises(KeyboardInterrupt): updater.execute()
        journal = self.journal(); del journal['contentTouched']
        (self.state/'journal.json').write_text(json.dumps(journal))
        self.runner().recover()
        self.assertEqual((self.server/'server.jar').read_text(),'old')
        self.assertEqual(self.journal()['phase'],'rolled_back')

    def test_schedule_requires_timezone_and_rejects_protected_allowlist(self):
        self.schedule["applyAt"] = "2030-01-01T00:00:10"
        self.write_inputs()
        with self.assertRaisesRegex(Exception, "timezone|offset"):
            self.runner().plan()
        self.schedule["applyAt"] += "+00:00"
        self.config["managedPaths"] = ["world"]
        self.write_inputs()
        with self.assertRaisesRegex(Exception, "protected"):
            self.runner().execute()
        self.assertFalse(self.state.exists())

    def test_case_colliding_implicit_zip_directories_are_rejected_before_notices(self):
        self.config["managedPaths"] = ["mods"]
        self.write_inputs()
        self.write_archive({"mods/Example/a.jar": "a", "mods/example/b.jar": "b"})
        self.manifest["managedPaths"] = ["mods"]
        (self.release / "server-release.json").write_text(json.dumps(self.manifest))
        with self.assertRaisesRegex(Exception, "collid"):
            self.runner().execute()
        self.assertEqual(self.commands(), [])

    def test_failed_announcement_clears_scheduled_status_to_original_online(self):
        (self.root / "fail-announce").write_text("yes")
        with self.assertRaises(Exception):
            self.runner().execute()
        self.assertEqual(self.commands()[-1]["args"][:2], ["online", "1.0.0"])
        self.assertEqual(self.journal()["phase"], "aborted")
        self.assertNotIn("save", [call["name"] for call in self.commands()])

    def test_missing_or_modified_snapshot_refuses_restore_before_deleting_target(self):
        updater = self.runner()
        original_apply = updater.apply
        def crash_after_apply(stage):
            original_apply(stage)
            raise KeyboardInterrupt()
        updater.apply = crash_after_apply
        with self.assertRaises(KeyboardInterrupt):
            updater.execute()
        (Path(self.journal()["backupDirectory"]) / "server.jar").write_text("corrupted backup")
        with self.assertRaisesRegex(Exception, "rollback|backup|snapshot"):
            self.runner().recover()
        self.assertEqual((self.server / "server.jar").read_text(), "new")
        self.assertEqual(self.journal()["phase"], "recovery_failed")
        self.assertEqual(self.commands()[-1]["args"][:2], ["failed", "1.0.0"])

    def test_late_start_announces_remaining_time_before_freeze(self):
        self.clock.time += timedelta(seconds=8)
        self.runner().execute()
        announcements = [call for call in self.commands() if call["name"] == "announce"]
        self.assertIn("2 seconds", announcements[0]["args"][0])
        self.assertEqual(sum(self.clock.sleeps), 2)

    def test_journal_disk_failure_after_save_still_resumes_saves(self):
        updater = self.runner()
        original_atomic_json = self.module.atomic_json
        def full_disk_after_save(path, data):
            if any(event.get("hook") == "save" for event in data.get("events", [])):
                raise OSError("injected full journal disk")
            return original_atomic_json(path, data)
        self.module.atomic_json = full_disk_after_save
        with self.assertRaises(Exception):
            updater.execute()
        self.assertFalse((self.root / "frozen").exists())
        self.assertNotIn("stop", [call["name"] for call in self.commands()])
        self.assertEqual(self.commands()[-1]["args"][:2], ["online", "1.0.0"])

    def test_failed_target_stop_during_rollback_keeps_target_files_and_failed_status(self):
        (self.root / "fail-health").write_text("fail target")
        (self.root / "fail-stop").write_text("fail target")
        with self.assertRaisesRegex(Exception, "rollback"):
            self.runner().execute()
        self.assertEqual((self.server / "server.jar").read_text(), "new")
        self.assertEqual(self.journal()["phase"], "recovery_failed")
        self.assertEqual(self.commands()[-1]["args"][:2], ["failed", "1.0.0"])

    def test_health_retry_deadline_is_bounded(self):
        (self.root / "fail-health").write_text("fail target")
        with self.assertRaisesRegex(Exception, "health"):
            self.runner().execute()
        failed_probes = [call for call in self.commands() if call["name"] == "health" and call["version"] == "new"]
        self.assertEqual(len(failed_probes), 2)
        self.assertEqual(sum(self.clock.sleeps), 12)

    def test_unresolvable_executable_and_shell_hooks_rejected_before_side_effects(self):
        for command in [["/missing/server-operator-adapter"], ["sh", "-c", "touch SHOULD_NOT_EXIST"],
                        [sys.executable, "{unknown}"]]:
            with self.subTest(command=command):
                self.config["hooks"]["stop"] = command
                self.write_inputs()
                with self.assertRaisesRegex(Exception, "hook"):
                    self.runner().execute()
                self.assertFalse(self.state.exists())
                self.assertEqual(self.commands(), [])

    def test_release_and_client_descriptor_are_snapshotted_before_hooks(self):
        self.runner().execute()
        run = Path(self.journal()["runDirectory"])
        self.assertEqual(hashlib.sha256((run / "server-release.zip").read_bytes()).hexdigest(), self.manifest["archive"]["sha256"])
        published = [call for call in self.commands() if call["name"] == "publishStatus"][-1]
        self.assertEqual(Path(published["args"][3]), run / "client-release.json")


if __name__ == "__main__":
    unittest.main()
