#!/usr/bin/env python3
"""Build the local Sunrin-Custom sources into a reproducible resource-pack ZIP."""

import argparse
from pathlib import Path
import zipfile


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "resourcepacks" / "Sunrin-Custom"
DEFAULT_OUTPUT = ROOT / "resourcepacks" / "dist" / "Sunrin-Custom.zip"


def build(output):
    files = sorted(path for path in SOURCE.rglob("*") if path.is_file() and path.name != ".DS_Store")
    if not (SOURCE / "pack.mcmeta").is_file():
        raise FileNotFoundError(f"Resource pack source is missing: {SOURCE}")
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            entry = zipfile.ZipInfo(path.relative_to(SOURCE).as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(entry, path.read_bytes(), compresslevel=9)
    return len(files)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Destination ZIP (default: resourcepacks/dist/Sunrin-Custom.zip)")
    arguments = parser.parse_args()
    count = build(arguments.output)
    print(f"Built {arguments.output.resolve()} ({count} files)")
