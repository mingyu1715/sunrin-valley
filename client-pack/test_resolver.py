"""Offline regression checks against the actual downloaded upstream fixtures."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "client-pack"
SCRIPT = ROOT / "build-scripts" / "resolve-pack.py"


class ResolverTests(unittest.TestCase):
    def test_offline_check_does_not_require_the_ignored_archive_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            shutil.copytree(PACK / "fixtures", target / "fixtures")
            shutil.copy(PACK / "sources.json", target / "sources.json")
            shutil.copy(PACK / "manifest.json", target / "manifest.json")
            result = subprocess.run([sys.executable, str(SCRIPT), "--pack-dir", str(target), "--check"],
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_cli_reproduces_the_reviewed_manifest_offline(self):
        # Catches omitted base files, changed download identities, and stale output.
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--check"], capture_output=True, text=True
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def setUp(self):
        self.assertTrue(SCRIPT.exists(), "resolver is not implemented")
        spec = importlib.util.spec_from_file_location("resolve_pack", SCRIPT)
        self.resolver = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.resolver)
        self.sources = json.loads((PACK / "sources.json").read_text())
        self.cf = json.loads((PACK / "fixtures/curseforge-manifest.json").read_text())
        self.pakku = json.loads((PACK / "fixtures/pakku.json").read_text())
        self.lock = json.loads((PACK / "fixtures/pakku-lock.json").read_text())
        self.addons = json.loads((PACK / "fixtures/addon-versions.json").read_text())
        self.inventory = json.loads((PACK / "fixtures/korean-inventory.json").read_text())

    def resolve(self, **changes):
        self.assertTrue(SCRIPT.exists(), "resolver is not implemented")
        inputs = dict(cf=self.cf, pakku=self.pakku, lock=self.lock,
                      addons=self.addons, sources=self.sources, inventory=self.inventory)
        inputs.update(changes)
        return self.resolver.resolve_manifest(**inputs)

    def test_every_actual_zip_project_and_file_id_is_locked(self):
        manifest = self.resolve()
        expected = {(f["projectID"], f["fileID"]) for f in self.cf["files"]}
        actual = {(f["source"]["projectId"], f["source"]["fileId"])
                  for f in manifest["files"]
                  if f["source"]["provider"] == "curseforge" and not f["source"].get("slug")}
        self.assertEqual(actual, expected)
        self.assertEqual(len(manifest["files"]), 371)
        self.assertEqual(sum(f["path"].startswith("mods/") for f in manifest["files"]), 355)
        self.assertEqual(len(manifest["localizations"]), 481)
        self.assertEqual(manifest["forge"], "47.4.0")
        player = next(f for f in manifest["files"] if f["source"].get("projectId") == 658587)
        self.assertEqual(player["source"]["fileId"], 4587214)

    def test_replacement_installs_verified_stagebox_instead_of_beat_lamp(self):
        manifest = self.resolve()
        self.assertFalse(any("beatlamp" in f["path"].lower() for f in manifest["files"]))
        stagebox = next(f for f in manifest["files"] if f["source"].get("slug") == "stagebox")
        self.assertEqual(stagebox["path"], "mods/StageBox-Mod-1.3.0-Forge-1.20.1.jar")
        self.assertEqual(stagebox["source"], {"provider": "curseforge", "projectId": 1591857,
                                            "fileId": 9294217, "slug": "stagebox"})
        self.assertEqual(stagebox["hash"], {"algorithm": "sha1", "value": "fb77218e63ddb7a99bd8c01e65b45529c9df5cee"})
        self.assertEqual(stagebox["size"], 1882504)
        self.assertEqual({f["source"]["slug"] for f in manifest["files"] if f["source"].get("slug")},
                         {"simple-voice-chat", "emotecraft", "music-disc-maker", "stagebox"})
        self.assertEqual(manifest["version"], "0.1.1")
        self.assertEqual(manifest["sources"]["upstream"]["version"], "4.1.5A")

    def test_rejects_addon_provider_substitution(self):
        addons = copy.deepcopy(self.addons)
        addons[0]["provider"] = "curseforge"
        with self.assertRaisesRegex(ValueError, "Addon provider mismatch"):
            self.resolve(addons=addons)

    def test_rejects_a_file_id_absent_from_the_upstream_lock(self):
        cf = copy.deepcopy(self.cf)
        cf["files"][0]["fileID"] = 1
        with self.assertRaisesRegex(ValueError, "not in pakku lock"):
            self.resolve(cf=cf)

    def test_rejects_an_unsafe_upstream_filename(self):
        lock = copy.deepcopy(self.lock)
        lock["projects"][0]["files"][0]["file_name"] = "../outside.jar"
        with self.assertRaisesRegex(ValueError, "Unsafe filename"):
            self.resolve(lock=lock)

    def test_rejects_an_addon_with_wrong_loader(self):
        addons = copy.deepcopy(self.addons)
        addons[0]["loaders"] = ["fabric"]
        with self.assertRaisesRegex(ValueError, "Forge 1.20.1"):
            self.resolve(addons=addons)

    def test_rejects_a_modified_archive_before_reading_overrides(self):
        archive = PACK / "cache" / self.sources["base"]["filename"]
        if not archive.exists():
            self.skipTest("Optional actual ZIP integration check: cache is absent")
        sources = copy.deepcopy(self.sources)
        sources["base"]["sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "Archive SHA256 mismatch"):
            self.resolver.verify_archive(archive, self.cf, sources, self.inventory)


if __name__ == "__main__":
    unittest.main()
