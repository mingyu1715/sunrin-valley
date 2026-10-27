#!/usr/bin/env python3
"""Prepare local owned-file server delivery; does not install, start, publish or contact AWS."""
import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import shutil
import sys
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
from owned_files import resolve_owned_files, verified_owned_artifacts


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def write_zip(path, files):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)


def descriptor(name, content, mode='replace'):
    return {'path': name, 'size': len(content), 'sha256': sha256(content).hexdigest(), 'mode': mode}


def build_candidate(root, output=None, *, client_output=None, overlay_only=False):
    root = Path(root).resolve()
    metadata = json.loads((root / 'client-pack/manifest.json').read_text())
    version = metadata['version']
    if version != '0.2.0':
        raise ValueError('This reviewed migration targets candidate 0.2.0')
    sources = metadata['sources']
    artifacts = verified_owned_artifacts(root, sources)
    if sources.get("packVersion") != version or {i.get("slug") for i in sources.get("ownedFiles", [])} != {"sunrin-core"}:
        raise ValueError("Candidate requires the reviewed Core source pin")
    if any(entry not in metadata["files"] for entry in resolve_owned_files(sources)):
        raise ValueError("Owned artifact manifest is stale")
    lock = json.loads((root / 'server-ops/releases/0.1.4/pack-lock.json').read_text())
    lamp = next(item for item in metadata['files'] if item['source'].get('slug') == 'beatlamp')
    if (lamp['path'] != 'mods/beatlamp-forge-1.20.1-1.2.2.jar'
            or lamp['hash'] != {'algorithm': 'sha1', 'value': '85becdb57a12924c00fbdda0ef6cfb59adc8dbab'}):
        raise ValueError('Beat Lamp candidate identity mismatch')
    beat = {'slug': 'beatlamp', 'version': '1.2.2-forge-1.20.1', 'filename': lamp['path'].split('/')[-1],
            'url': lamp['url'], 'size': lamp['size'], 'hash': {'algorithm': 'sha256', 'digest': '1d2ec14285fee25db6e86f784c11d54b3e4eae9be4bddb525479e720638fd84f'}}
    lock['addons'] = [beat if item['slug'] == 'stagebox' else item for item in lock['addons']]
    lock['ownedFiles'] = [{'slug': pin['slug'], 'version': pin['version'], 'filename': pin['filename'], 'url': pin['url'], 'size': pin['size'], 'hash': {'algorithm': 'sha256', 'digest': pin['sha256']}} for pin in sources.get('ownedFiles', [])]
    lock.update(id='sunrin-valley-server-' + version, clientPackVersion=version,
                serverModCount=lock['upstreamModCount'] + len(lock['addons']) + len(lock['ownedFiles']))
    lock.pop('customStartup', None)
    files = {}
    scripts = root / 'kubejs-custom'
    if scripts.is_symlink():
        raise ValueError('Linked script sources cannot be bundled')
    for folder in ('startup_scripts', 'server_scripts', 'client_scripts', 'assets', 'data'):
        directory = scripts / folder
        if directory.is_symlink():
            raise ValueError('Linked script sources cannot be bundled')
        for path in sorted(directory.rglob('*')):
            if path.is_symlink():
                raise ValueError('Linked script sources cannot be bundled')
            if path.is_file() and not any(p.startswith('.') for p in path.relative_to(directory).parts):
                files['kubejs/' + path.relative_to(scripts).as_posix()] = path.read_bytes()
    files['config/sunrin/geonpi.json'] = (scripts / 'data/sunrin/defaults/geonpi.json').read_bytes()
    files['defaultconfigs/ftbchunks/ftbchunks-world.snbt'] = b'{\n max_claimed_chunks: 4\n party_limit_mode: "sum"\n}\n'
    owned = [descriptor(name, content, 'ifAbsent' if name.startswith(('config/', 'defaultconfigs/')) else 'replace') for name, content in sorted(files.items())]
    # The updater's exact owned path policy is also checked during candidate construction.
    spec = __import__('importlib.util', fromlist=['util'])
    updater_spec = spec.spec_from_file_location('server_updater_build', Path(__file__).resolve().parents[1] / 'server-ops/updater.py')
    updater = spec.module_from_spec(updater_spec)
    updater_spec.loader.exec_module(updater)
    updater.owned_entries(owned)
    output = Path(output) if output else root / 'release/server' / version
    output.mkdir(parents=True, exist_ok=True)
    overlay_path = output / 'Sunrin-Server-Overlay.zip'
    write_zip(overlay_path, files)
    lock['ownedOverlay'] = {'filename': overlay_path.name, 'delivery': 'download',
                            'url': f"https://github.com/{sources['releaseRepository']}/releases/download/pack-{version}/{overlay_path.name}", 'size': overlay_path.stat().st_size,
                            'hash': {'algorithm': 'sha256', 'digest': sha256(overlay_path.read_bytes()).hexdigest()}, 'files': owned}
    write_json(output / 'pack-lock.json', lock)
    update_output = Path(client_output) if client_output else root / 'release/updates' / version
    if not (update_output / 'stable.json').is_file():
        raise ValueError('Build the matching client release before the server candidate')
    shutil.copyfile(overlay_path, update_output / overlay_path.name)
    shutil.copyfile(output / 'pack-lock.json', update_output / 'server-pack-lock.json')
    sums = update_output / 'SHA256SUMS.txt'
    if sums.exists():
        names = (overlay_path.name, 'server-pack-lock.json')
        lines = [line for line in sums.read_text().splitlines() if not any(line.endswith('  ' + name) for name in names)]
        sums.write_text('\n'.join(lines + [sha256((update_output / name).read_bytes()).hexdigest() + '  ' + name for name in names]) + '\n')
    if overlay_only:
        return output
    release_files = dict(files)
    for source, name in artifacts:
        release_files['mods/' + name] = source.read_bytes()
        owned.append(descriptor('mods/' + name, source.read_bytes()))
    # Prepared updater archive intentionally requires the verified third-party Beat Lamp bytes locally.
    lamp_source = root / '.work/plan-research' / beat['filename']
    if not lamp_source.exists():
        lamp_source = root / 'client-pack/cache' / beat['filename']
    if lamp_source.is_file():
        content = lamp_source.read_bytes()
        if lamp_source.is_symlink() or len(content) != beat['size'] or sha256(content).hexdigest() != beat['hash']['digest']:
            raise ValueError('Beat Lamp artifact mismatch')
        release_files['mods/' + beat['filename']] = content
        owned.append(descriptor('mods/' + beat['filename'], content))
    else:
        raise ValueError('Verified Beat Lamp bytes are required to prepare the server update')
    archive = output / 'Sunrin-Owned-Update.zip'
    write_zip(archive, release_files)
    shutil.copyfile(update_output / 'stable.json', output / 'client-release.json')
    write_json(output / 'server-release.json', {'formatVersion': 1, 'version': version, 'managedPaths': [],
               'archive': {'path': archive.name, 'sha256': sha256(archive.read_bytes()).hexdigest()},
               'clientRelease': 'client-release.json', 'ownedFileMerge': {'files': owned}, 'migrations': ['ftbchunks-member-limit'],
               'bootstrapMarker': {'packId': lock['id'], 'lockSha256': sha256((output / 'pack-lock.json').read_bytes()).hexdigest(), 'modCount': lock['serverModCount']}})
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--client-output', type=Path, help='Matching build-update output directory')
    parser.add_argument('--overlay-only', action='store_true', help='Prepare own bootstrap overlay/lock without a local third-party server update archive')
    parser.add_argument('--refresh-lock', action='store_true', help='Refresh local bootstrap lock and owned overlay, without installing')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    output = build_candidate(root, args.output, client_output=args.client_output, overlay_only=args.overlay_only)
    if args.refresh_lock:
        for name in ('pack-lock.json',):
            shutil.copyfile(output / name, root / 'server-ops/aws' / name)
        # Candidate metadata is reviewable; the prepared binary update remains in ignored release/.
        descriptor_path = root / 'server-ops/releases/0.2.0/server-release.json'
        release = json.loads((output / 'server-release.json').read_text())
        release['archive']['path'] = Path(os.path.relpath(output / release['archive']['path'], descriptor_path.parent)).as_posix()
        release['clientRelease'] = Path(os.path.relpath(output / release['clientRelease'], descriptor_path.parent)).as_posix()
        write_json(descriptor_path, release)
    print(output)
