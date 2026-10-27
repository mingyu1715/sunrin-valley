#!/usr/bin/env python3
"""Explicitly refresh sources.json from the completed local Core JAR; no build/network/channel changes."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import sys
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
from owned_files import resolve_owned_files


def refresh_pin(root, *, core_version='0.1.0'):
    root = Path(root).resolve()
    source = root / 'client-pack/sources.json'
    sources = json.loads(source.read_text())
    if not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', core_version):
        raise ValueError('Core version must use major.minor.patch')
    name = 'sunrin-core-' + core_version + '.jar'
    local = 'sunrin-core/build/libs/' + name
    jar = root / local
    if jar.is_symlink() or not jar.is_file():
        raise ValueError('Build the regular Core JAR before explicitly refreshing its pin')
    with zipfile.ZipFile(jar) as z:
        metadata = z.read('META-INF/mods.toml').decode()
        if z.testzip() or 'modId="sunrin_core"' not in metadata:
            raise ValueError('Not a valid Sunrin Core artifact')
        if not re.search(r'^version\s*=\s*"' + re.escape(core_version) + r'"\s*$', metadata, re.MULTILINE):
            raise ValueError('Core embedded version disagrees with the requested version')
    pin = {'slug': 'sunrin-core', 'version': core_version, 'filename': name, 'path': 'mods/' + name,
           'url': f"https://github.com/{sources['releaseRepository']}/releases/download/pack-{sources['packVersion']}/{name}",
           'size': jar.stat().st_size, 'sha256': hashlib.sha256(jar.read_bytes()).hexdigest(), 'localPath': local}
    sources['ownedFiles'] = [i for i in sources.get('ownedFiles', []) if i.get('slug') != 'sunrin-core'] + [pin]
    resolve_owned_files(sources)
    source.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + '\n')
    return pin


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true', required=True, help='Explicitly refresh the pin after the final Core build')
    parser.add_argument('--core-version', default='0.1.0', help='Exact built Core version to pin')
    args = parser.parse_args()
    print(json.dumps(refresh_pin(Path(__file__).resolve().parents[1], core_version=args.core_version), indent=2))
