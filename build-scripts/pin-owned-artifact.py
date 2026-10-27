#!/usr/bin/env python3
"""Explicitly refresh sources.json from the completed local Core JAR; no build/network/channel changes."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
from owned_files import resolve_owned_files


def refresh_pin(root):
    root = Path(root).resolve()
    source = root / 'client-pack/sources.json'
    sources = json.loads(source.read_text())
    name = 'sunrin-core-0.1.0.jar'
    local = 'sunrin-core/build/libs/' + name
    jar = root / local
    if jar.is_symlink() or not jar.is_file():
        raise ValueError('Build the regular Core JAR before explicitly refreshing its pin')
    with zipfile.ZipFile(jar) as z:
        if z.testzip() or 'modId="sunrin_core"' not in z.read('META-INF/mods.toml').decode():
            raise ValueError('Not a valid Sunrin Core artifact')
    pin = {'slug': 'sunrin-core', 'version': '0.1.0', 'filename': name, 'path': 'mods/' + name,
           'url': f"https://github.com/{sources['releaseRepository']}/releases/download/pack-{sources['packVersion']}/{name}",
           'size': jar.stat().st_size, 'sha256': hashlib.sha256(jar.read_bytes()).hexdigest(), 'localPath': local}
    sources['ownedFiles'] = [i for i in sources.get('ownedFiles', []) if i.get('slug') != 'sunrin-core'] + [pin]
    resolve_owned_files(sources)
    source.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + '\n')
    return pin


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true', required=True, help='Explicitly refresh the pin after the final Core build')
    args = parser.parse_args()
    print(json.dumps(refresh_pin(Path(__file__).resolve().parents[1]), indent=2))
