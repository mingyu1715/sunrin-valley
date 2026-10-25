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
        def fail_apply(stage):
            (self.server / "server.jar").write_text("partially applied")
            raise OSError("injected local disk failure")
        updater.apply = fail_apply
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
