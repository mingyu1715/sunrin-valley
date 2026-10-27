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
        self.visuals = json.loads((PACK / "fixtures/visual-versions.json").read_text())

    def resolve(self, **changes):
        self.assertTrue(SCRIPT.exists(), "resolver is not implemented")
        inputs = dict(cf=self.cf, pakku=self.pakku, lock=self.lock,
                      addons=self.addons, sources=self.sources, inventory=self.inventory,
                      visuals=self.visuals)
        inputs.update(changes)
        return self.resolver.resolve_manifest(**inputs)

    def test_every_actual_zip_project_and_file_id_is_locked(self):
        manifest = self.resolve()
        expected = {(f["projectID"], f["fileID"]) for f in self.cf["files"]}
        actual = {(f["source"]["projectId"], f["source"]["fileId"])
                  for f in manifest["files"]
                  if f["source"]["provider"] == "curseforge" and not f["source"].get("slug")}
        self.assertEqual(actual, expected)
        self.assertEqual(len(manifest["files"]), len(self.cf["files"]) + len(self.addons) + len(self.visuals) + len(self.sources.get("ownedFiles", [])))
        self.assertEqual(sum(f["path"].startswith("mods/") for f in manifest["files"]), 351 + len(self.addons) + len(self.sources.get("ownedFiles", [])))
        self.assertEqual(len(manifest["localizations"]), 481)
        self.assertEqual(manifest["forge"], "47.4.0")
        player = next(f for f in manifest["files"] if f["source"].get("projectId") == 658587)
        self.assertEqual(player["source"]["fileId"], 4587214)

    def test_beatlamp_candidate_replaces_stagebox_and_preserves_music_disc_maker(self):
        manifest = self.resolve()
        self.assertFalse(any("stagebox" in f["path"].lower() for f in manifest["files"]))
        lamp = next(f for f in manifest["files"] if f["source"].get("slug") == "beatlamp")
        self.assertEqual(lamp["path"], "mods/beatlamp-forge-1.20.1-1.2.2.jar")
        self.assertEqual(lamp["hash"]["value"], "85becdb57a12924c00fbdda0ef6cfb59adc8dbab")
        self.assertEqual(lamp["size"], 547786)
        maker = next(f for f in manifest["files"] if f["source"].get("slug") == "music-disc-maker")
        self.assertIn("3.1.2", maker["path"])
        self.assertEqual(manifest["forge"], "47.4.0")
        self.assertEqual(manifest["version"], "0.2.1")

    def test_owned_artifact_has_sha256_and_strict_immutable_identity(self):
        pin = {"slug": "sunrin-core", "version": "0.1.0", "filename": "sunrin-core-0.1.0.jar",
               "path": "mods/sunrin-core-0.1.0.jar", "url": "https://github.com/owner/repo/releases/download/pack-0.2.0/sunrin-core-0.1.0.jar",
               "sha256": "a" * 64, "size": 100, "localPath": "sunrin-core/build/libs/sunrin-core-0.1.0.jar"}
        sources = copy.deepcopy(self.sources)
        sources["packVersion"] = "0.2.0"
        sources["releaseRepository"] = "owner/repo"
        sources["ownedFiles"] = [pin]
        entry = next(f for f in self.resolve(sources=sources)["files"] if f["source"]["provider"] == "sunrin")
        self.assertEqual(entry["hash"], {"algorithm": "sha256", "value": "a" * 64})
        self.assertEqual(entry["source"], {"provider": "sunrin", "slug": "sunrin-core", "version": "0.1.0"})
        for field, value in [("path", "mods/../escape.jar"), ("filename", "wrong.jar"), ("sha256", "A" * 64),
                             ("url", pin["url"].replace("pack-0.2.0", "latest")), ("localPath", "../secret"), ("size", True)]:
            changed = copy.deepcopy(sources)
            changed["ownedFiles"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.resolve(sources=changed)
        sources["ownedFiles"].append(copy.deepcopy(pin))
        with self.assertRaises(ValueError):
            self.resolve(sources=sources)

    def test_rejects_addon_provider_substitution(self):
        addons = copy.deepcopy(self.addons)
        addons[0]["provider"] = "curseforge"
        with self.assertRaisesRegex(ValueError, "Addon provider mismatch"):
            self.resolve(addons=addons)

    def test_visual_files_are_installed_beside_unchanged_base_pins(self):
        manifest = self.resolve()
        entries = {item["path"]: item for item in manifest["files"]}
        self.assertTrue("resourcepacks/Stay_True_1.20.zip" in entries)
        self.assertTrue("shaderpacks/BSL_v10.1.8.zip" in entries)
        self.assertEqual(entries["resourcepacks/Stay_True_1.20.zip"]["hash"],
                         {"algorithm": "sha1", "value": "e62cef3d46234f8e2b04d5d01c870a6f41f9ae79"})
        self.assertEqual(entries["shaderpacks/BSL_v10.1.8.zip"]["hash"],
                         {"algorithm": "sha1", "value": "e89818c8827d0131c102fb480c3c3446624db0df"})
        self.assertEqual(len(entries), len(self.cf["files"]) + len(self.addons) + len(self.visuals) + len(self.sources.get("ownedFiles", [])))
        self.assertEqual(sum(path.startswith("mods/") for path in entries), 351 + len(self.addons) + len(self.sources.get("ownedFiles", [])))
        for project in self.lock["projects"]:
            for item in project["files"]:
                expected = next(entry for entry in entries.values()
                                if entry["source"].get("projectId") == int(item["parent_id"])
                                and entry["source"].get("fileId") == int(item["id"]))
                self.assertEqual(expected["hash"]["value"], item["hashes"]["sha1"])
                self.assertEqual(expected["size"], item["size"])
                self.assertEqual(expected["path"].split("/")[-1], item["file_name"])

    def test_content_version_comes_from_source_pin(self):
        sources = copy.deepcopy(self.sources)
        previous = sources["packVersion"]
        sources["packVersion"] = "0.1.9"
        for pin in sources.get("ownedFiles", []):
            pin["url"] = pin["url"].replace("/pack-" + previous + "/", "/pack-0.1.9/")
        self.assertEqual(self.resolve(sources=sources)["version"], "0.1.9")

    def test_visual_metadata_cannot_change_pinned_type_identity_or_compatibility(self):
        for field, value in [("project_type", "mod"), ("id", 1), ("provider", "modrinth"),
                             ("game_versions", ["1.21"])]:
            with self.subTest(field=field):
                visuals = copy.deepcopy(self.visuals)
                visuals[0][field] = value
                with self.assertRaises(ValueError):
                    self.resolve(visuals=visuals)

    def test_visual_metadata_cannot_change_pinned_artifact_or_hash(self):
        for field, value in [("filename", "../Stay_True.zip"), ("url", "http://example.com/file.zip"),
                             ("size", 1), ("hashes", {"sha1": "0" * 40})]:
            with self.subTest(field=field):
                visuals = copy.deepcopy(self.visuals)
                visuals[0]["files"][0][field] = value
                with self.assertRaises(ValueError):
                    self.resolve(visuals=visuals)

    def test_visual_metadata_must_include_every_pinned_file_once(self):
        for visuals in [self.visuals[:1], self.visuals + self.visuals[:1]]:
            with self.assertRaises(ValueError):
                self.resolve(visuals=visuals)

    def test_visual_verification_rejects_changed_bytes_before_opening_zip(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory)
            (cache / "Stay_True_1.20.zip").write_bytes(b"changed bytes")
            with self.assertRaisesRegex(ValueError, "hash or size mismatch"):
                self.resolver.verify_cached_visuals(self.visuals, self.sources, cache)

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
