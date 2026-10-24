#!/usr/bin/env python3
"""Resolve pinned upstream metadata into the launcher lock, without downloading mods.

Default: use only checked-in fixtures (no network or ignored cache required).
--download-base downloads only the pinned base ZIP if absent.
--check compares the resolved result with the checked-in manifest.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def filename(value):
    if (not isinstance(value, str) or not value or value in (".", "..")
            or any(c in value for c in "/\\:\x00") or value.rstrip(" .") != value):
        raise ValueError("Unsafe filename: " + repr(value))
    return value


def file_entry(path, url, digest, size, source):
    if urlsplit(url).scheme != "https" or not urlsplit(url).hostname:
        raise ValueError("Only HTTPS source URLs are supported: " + url)
    if not re.fullmatch(r"[0-9a-f]{40}", digest):
        raise ValueError("Invalid upstream SHA1: " + path)
    if not isinstance(size, int) or size <= 0:
        raise ValueError("Invalid file size: " + path)
    return {"path": path, "url": quote(url, safe=":/?=&+%"),
            "hash": {"algorithm": "sha1", "value": digest},
            "size": size, "source": source}


def resolve_visual_files(visuals, sources):
    """Keep non-mod downloads pinned without applying Forge's JAR requirements."""
    pins = {item["slug"]: item for item in sources["visuals"]}
    if len(pins) != len(sources["visuals"]) or len(visuals) != len(pins):
        raise ValueError("Missing or duplicated visual metadata")
    folders = {"resourcepack": "resourcepacks", "shader": "shaderpacks"}
    files, seen = [], set()
    for visual in visuals:
        slug = visual["source_slug"]
        pin = pins.get(slug)
        if not pin or slug in seen:
            raise ValueError("Visual version identity mismatch: " + slug)
        seen.add(slug)
        provider = visual["provider"]
        identity_key = "fileId" if provider == "curseforge" else "versionId"
        if (provider not in ("curseforge", "modrinth") or provider != pin["provider"]
                or visual["id"] != pin[identity_key] or visual["project_id"] != pin["projectId"]
                or visual["project_type"] != pin["projectType"]
                or visual["project_type"] not in folders):
            raise ValueError("Visual version identity mismatch: " + slug)
        if "1.20.1" not in visual["game_versions"]:
            raise ValueError("Visual must support Minecraft 1.20.1: " + slug)
        if visual["project_type"] == "shader" and not {"iris", "optifine"}.intersection(visual.get("loaders", [])):
            raise ValueError("Shader must support Iris or OptiFine: " + slug)
        primary = [item for item in visual["files"] if item["primary"]]
        if len(primary) != 1:
            raise ValueError("Visual must have one primary artifact: " + slug)
        item = primary[0]
        name = filename(item["filename"])
        if (not name.endswith(".zip") or name != pin["filename"] or item["url"] != pin["downloadUrl"]
                or item["size"] != pin["size"] or item["hashes"]["sha1"] != pin["sha1"]
                or not re.fullmatch(r"[0-9a-f]{64}", pin["sha256"])):
            raise ValueError("Visual artifact pin mismatch: " + slug)
        if provider == "curseforge":
            metadata = visual["curseforge_metadata"]
            if (metadata["id"] != visual["id"] or metadata["projectId"] != visual["project_id"]
                    or metadata["fileName"] != name or metadata["fileLength"] != item["size"]
                    or "1.20.1" not in metadata["gameVersions"]):
                raise ValueError("CurseForge visual metadata mismatch: " + slug)
        files.append(file_entry(folders[visual["project_type"]] + "/" + name,
                                item["url"], item["hashes"]["sha1"], item["size"],
                                {"provider": provider, "projectId": visual["project_id"],
                                 identity_key: visual["id"], "slug": slug}))
    return files


def resolve_manifest(cf, pakku, lock, addons, sources, inventory, archive=None, visuals=None):
    """Cross-check actual CurseForge identities before resolving any download URL."""
    if cf["minecraft"]["version"] != "1.20.1" or lock["mc_versions"] != ["1.20.1"]:
        raise ValueError("The base pack must target Minecraft 1.20.1")
    if cf["version"] != sources["upstream"]["version"] or pakku["version"] != cf["version"]:
        raise ValueError("Upstream version mismatch")
    loaders = [m["id"] for m in cf["minecraft"]["modLoaders"] if m.get("primary")]
    if loaders != ["forge-47.4.0"] or lock["loaders"].get("forge") != "47.4.0":
        raise ValueError("The base pack must target Forge 47.4.0")

    index = {}
    for project in lock["projects"]:
        for item in project["files"]:
            if item["type"] != "curseforge":
                continue
            key = (int(item["parent_id"]), int(item["id"]))
            if key in index:
                raise ValueError("Duplicate project/file identity in pakku lock")
            if str(project["id"]["curseforge"]) != str(item["parent_id"]):
                raise ValueError("Parent project identity mismatch")
            index[key] = (project, item)

    files = []
    seen_ids = set()
    folders = {"MOD": "mods", "RESOURCE_PACK": "resourcepacks", "SHADER": "shaderpacks"}
    for item in cf["files"]:
        key = (int(item["projectID"]), int(item["fileID"]))
        if key not in index:
            raise ValueError("ZIP project/file identity not in pakku lock: " + str(key))
        if key in seen_ids:
            raise ValueError("Duplicate project/file identity in ZIP manifest")
        seen_ids.add(key)
        project, locked = index[key]
        folder = folders.get(project["type"])
        if folder is None:
            raise ValueError("Unsupported upstream project type: " + project["type"])
        name = filename(locked["file_name"])
        if folder == "mods" and not name.endswith(".jar"):
            raise ValueError("Mod file is not a JAR: " + name)
        files.append(file_entry(folder + "/" + name, locked["url"],
                                locked["hashes"]["sha1"], locked["size"],
                                {"provider": "curseforge", "projectId": key[0], "fileId": key[1]}))
    if seen_ids != set(index):
        raise ValueError("ZIP manifest and pakku lock do not contain the same identities")

    pinned_addons = {a["slug"]: a for a in sources["addons"]}
    if len(addons) != len(pinned_addons):
        raise ValueError("Missing or duplicated addon metadata")
    seen_addons = set()
    for addon in addons:
        slug = addon["source_slug"]
        pin = pinned_addons.get(slug)
        if not pin or slug in seen_addons:
            raise ValueError("Addon version identity mismatch: " + slug)
        provider = pin.get("provider", "modrinth")
        if addon.get("provider", "modrinth") != provider:
            raise ValueError("Addon provider mismatch: " + slug)
        identity_key = "fileId" if provider == "curseforge" else "versionId"
        if provider not in ("modrinth", "curseforge") or addon["id"] != pin[identity_key] or addon["project_id"] != pin["projectId"]:
            raise ValueError("Addon version identity mismatch: " + slug)
        seen_addons.add(slug)
        if "forge" not in addon["loaders"] or "1.20.1" not in addon["game_versions"]:
            raise ValueError("Addon must support Forge 1.20.1: " + slug)
        primary = [f for f in addon["files"] if f["primary"]]
        if len(primary) != 1:
            raise ValueError("Addon must have one primary artifact: " + slug)
        item = primary[0]
        name = filename(item["filename"])
        if not name.endswith(".jar"):
            raise ValueError("Addon file is not a JAR: " + name)
        if provider == "curseforge":
            metadata = addon["curseforge_metadata"]
            if (metadata["id"] != addon["id"] or metadata["projectId"] != addon["project_id"]
                    or metadata["fileName"] != name or metadata["fileLength"] != item["size"]
                    or "Forge" not in metadata["gameVersions"] or "1.20.1" not in metadata["gameVersions"]):
                raise ValueError("CurseForge addon metadata mismatch: " + slug)
        files.append(file_entry("mods/" + name, item["url"], item["hashes"]["sha1"], item["size"],
                                {"provider": provider, "projectId": addon["project_id"],
                                 identity_key: addon["id"], "slug": slug}))

    files.extend(resolve_visual_files(visuals or [], sources))
    paths = [f["path"].casefold() for f in files]
    if len(set(paths)) != len(paths):
        raise ValueError("Duplicate install path (case-insensitive)")
    if inventory["archiveSha256"] != sources["base"]["sha256"]:
        raise ValueError("Korean inventory archive identity mismatch")
    localizations = [{"path": f["path"], "description": f["description"]}
                     for f in inventory["files"]]
    if archive is not None:
        verify_archive(archive, cf, sources, inventory)
    version = sources["packVersion"]
    if not isinstance(version, str) or not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("Invalid content pack version")
    return {"formatVersion": 1, "id": "sunrin-valley", "version": version,
            "minecraft": "1.20.1", "forge": "47.4.0", "base": sources["base"],
            "files": sorted(files, key=lambda f: f["path"]),
            "localizations": localizations, "sources": sources}


def verify_archive(archive, cf, sources, inventory):
    if sha256(archive) != sources["base"]["sha256"]:
        raise ValueError("Archive SHA256 mismatch")
    actual = []
    with zipfile.ZipFile(archive) as pack:
        bad = pack.testzip()
        if bad:
            raise ValueError("Archive CRC failure: " + bad)
        if json.loads(pack.read("manifest.json")) != cf:
            raise ValueError("Fixture does not match the actual ZIP manifest")
        prefix = cf["overrides"].rstrip("/") + "/"
        for name in sorted(pack.namelist()):
            if name.startswith(prefix) and not name.endswith("/") and "ko_kr" in name.lower():
                path = name[len(prefix):]
                actual.append({"path": path, "sha256": hashlib.sha256(pack.read(name)).hexdigest()})
    expected = [{"path": f["path"], "sha256": f["sha256"]} for f in inventory["files"]]
    if actual != expected:
        raise ValueError("Korean inventory does not match actual archive contents")


def download_base(base, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(target.suffix + ".part")
    try:
        request = Request(base["url"], headers={"User-Agent": "SunrinValleyPackResolver/0.1"})
        with urlopen(request, timeout=60) as response, temporary.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        if sha256(temporary) != base["sha256"]:
            raise ValueError("Downloaded archive SHA256 mismatch")
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)


def verify_cached_addons(addons, cache):
    """Check real JAR bytes; do not claim metadata proves in-game compatibility."""
    report = []
    for addon in addons:
        item = next(f for f in addon["files"] if f["primary"])
        path = cache / filename(item["filename"])
        if path.stat().st_size != item["size"] or hashlib.sha1(path.read_bytes()).hexdigest() != item["hashes"]["sha1"]:
            raise ValueError("Addon artifact hash or size mismatch: " + path.name)
        with zipfile.ZipFile(path) as jar:
            if jar.testzip():
                raise ValueError("Addon artifact CRC failure: " + path.name)
            mod_metadata = jar.read("META-INF/mods.toml").decode("utf-8")
            korean = [n for n in jar.namelist() if n.endswith("/lang/ko_kr.json")]
            for name in korean:
                json.loads(jar.read(name))
            if not korean:
                raise ValueError("Missing bundled Korean localization: " + path.name)
            report.append({"slug": addon["source_slug"], "filename": path.name,
                           "sha256": sha256(path), "korean": korean,
                           "modMetadata": mod_metadata,
                           "embeddedJars": [n for n in jar.namelist() if n.endswith(".jar")],
                           "integrationClasses": [n for n in jar.namelist() if "MusicDiscMaker" in n]})
    return report


def verify_cached_visuals(visuals, sources, cache):
    """Verify downloaded bytes and ZIP structure without claiming GPU compatibility."""
    entries = resolve_visual_files(visuals, sources)
    pins = {item["slug"]: item for item in sources["visuals"]}
    report = []
    for visual, entry in zip(visuals, entries):
        pin = pins[visual["source_slug"]]
        path = cache / pin["filename"]
        content = path.read_bytes()
        if (len(content) != entry["size"] or hashlib.sha1(content).hexdigest() != pin["sha1"]
                or hashlib.sha256(content).hexdigest() != pin["sha256"]):
            raise ValueError("Visual artifact hash or size mismatch: " + path.name)
        with zipfile.ZipFile(path) as pack:
            if pack.testzip():
                raise ValueError("Visual artifact CRC failure: " + path.name)
            item = {"slug": visual["source_slug"], "filename": path.name,
                    "size": len(content), "sha1": pin["sha1"], "sha256": pin["sha256"],
                    "zipCrcValid": True, "entries": len(pack.namelist())}
            if visual["project_type"] == "resourcepack":
                item["packFormat"] = json.loads(pack.read("pack.mcmeta"))["pack"]["pack_format"]
                if item["packFormat"] != 15:
                    raise ValueError("Resource pack format must support Minecraft 1.20.1")
            else:
                item["shaderProperties"] = "shaders/shaders.properties"
                if item["shaderProperties"] not in pack.namelist():
                    raise ValueError("Shader properties missing: " + path.name)
            report.append(item)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack-dir", type=Path, default=ROOT / "client-pack")
    parser.add_argument("--check", action="store_true", help="Check that manifest.json is current")
    parser.add_argument("--download-base", action="store_true", help="Download only the pinned base ZIP if absent")
    parser.add_argument("--verify-archive", action="store_true", help="Verify cached base ZIP hash, CRC, manifest, and Korean files")
    parser.add_argument("--verify-addons", action="store_true", help="Verify four already-cached addon JARs")
    parser.add_argument("--verify-visuals", action="store_true", help="Verify cached resource pack and shader ZIPs")
    args = parser.parse_args()
    pack = args.pack_dir.resolve()
    sources = read_json(pack / "sources.json")
    for item in sources["fixtures"]:
        if sha256(pack / item["path"]) != item["sourceHash"]["value"]:
            raise ValueError("Fixture hash mismatch: " + item["path"])
    archive = pack / "cache" / sources["base"]["filename"]
    if args.download_base and not archive.exists():
        download_base(sources["base"], archive)
    addons = read_json(pack / "fixtures/addon-versions.json")
    visuals = read_json(pack / "fixtures/visual-versions.json")
    manifest = resolve_manifest(read_json(pack / "fixtures/curseforge-manifest.json"),
                                read_json(pack / "fixtures/pakku.json"),
                                read_json(pack / "fixtures/pakku-lock.json"),
                                addons, sources, read_json(pack / "fixtures/korean-inventory.json"),
                                archive if args.verify_archive or args.download_base else None, visuals)
    text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    destination = pack / "manifest.json"
    if args.check:
        if not destination.exists() or destination.read_text(encoding="utf-8") != text:
            raise ValueError("manifest.json is missing or stale; run resolve-pack.py")
    else:
        destination.write_text(text, encoding="utf-8")
    if args.verify_addons:
        report = verify_cached_addons(addons, pack / "cache")
        (pack / "fixtures/addon-artifact-verification.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.verify_visuals:
        report = verify_cached_visuals(visuals, sources, pack / "cache")
        if report != read_json(pack / "fixtures/visual-artifact-verification.json"):
            raise ValueError("Visual verification fixture does not match actual ZIP contents")
    counts = Counter(f["path"].split("/")[0] for f in manifest["files"])
    print(f"Verified {len(manifest['files'])} locked files {dict(counts)}, "
          f"{len(manifest['localizations'])} original Korean inventory entries.")
    if args.verify_archive or args.download_base:
        print("Actual ZIP SHA256, CRC, manifest IDs, and all Korean content hashes passed.")
    if args.verify_visuals:
        print("Visual ZIP sizes, SHA1/SHA256, CRC, and resource/shader structure passed.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, zipfile.BadZipFile) as error:
        print("Pack resolution failed: " + str(error), file=sys.stderr)
        sys.exit(1)
