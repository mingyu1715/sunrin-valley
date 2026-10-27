"""Build immutable own-content assets plus the small GitHub update channel."""
import argparse
import json
import re
import shutil
import sys
import zipfile
from hashlib import sha256
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parent))
from owned_files import resolve_owned_files, verified_owned_artifacts


def build_update(root: Path, repository: str, min_launcher_version: str, output: Path | None = None, *, bundle_output: Path | None = None) -> Path:
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9][A-Za-z0-9_.-]*', repository):
        raise ValueError('Use a GitHub OWNER/REPOSITORY name')
    if not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', min_launcher_version):
        raise ValueError('Minimum launcher version must use major.minor.patch')
    manifest = root / 'client-pack/manifest.json'
    metadata = json.loads(manifest.read_text())
    version = metadata.get('version', '')
    if metadata.get('id') != 'sunrin-valley' or metadata.get('formatVersion') != 1 or not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', version):
        raise ValueError('Invalid Sunrin pack manifest identity/version')
    sources = metadata.get("sources", {})
    artifacts = verified_owned_artifacts(root, sources)
    if artifacts and (sources.get("releaseRepository") != repository or sources.get("packVersion") != version):
        raise ValueError("Owned artifact repository/version mismatch")
    for entry in resolve_owned_files(sources):
        if entry not in metadata.get("files", []):
            raise ValueError("Owned artifact is absent or stale in manifest")
    own_files = []
    scripts = root / 'kubejs-custom'
    if scripts.is_symlink():
        raise ValueError('Linked source directories are not publishable')
    for folder in ('startup_scripts', 'server_scripts', 'client_scripts', 'assets', 'data'):
        directory = scripts / folder
        if directory.is_symlink():
            raise ValueError('Linked source directories are not publishable')
        if not directory.exists():
            continue
        for path in sorted(directory.rglob('*')):
            if path.is_symlink():
                raise ValueError('Linked content is not publishable')
            if path.is_file() and not any(part.startswith('.') for part in path.relative_to(directory).parts):
                own_files.append((path, 'kubejs/' + path.relative_to(scripts).as_posix()))
    own_files.append((root / 'resourcepacks/dist/Sunrin-Custom.zip', 'resourcepacks/Sunrin-Custom.zip'))
    for source, _ in own_files:
        if source.is_symlink() or not source.is_file():
            raise ValueError('Own content must be a regular built file: ' + source.name)
    output = output or root / 'release/updates' / version
    output.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(manifest, output / 'manifest.json')
    shutil.copyfile(root / 'client-pack/prism-runtime.json', output / 'prism-runtime.json')
    with zipfile.ZipFile(output / 'Sunrin-Overlay.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for source, name in sorted(own_files, key=lambda item: item[1]):
            entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, source.read_bytes())
    for source, name in artifacts:
        shutil.copyfile(source, output / name)
    bundle = {}
    for key, name in {'manifest': 'manifest.json', 'prism': 'prism-runtime.json', 'overlay': 'Sunrin-Overlay.zip'}.items():
        bundle[key] = {'url': f'https://github.com/{repository}/releases/download/pack-{version}/{name}',
                       'sha256': sha256((output / name).read_bytes()).hexdigest()}
    channel = {'formatVersion': 1, 'id': 'sunrin-valley', 'version': version,
               'minLauncherVersion': min_launcher_version, 'bundle': bundle}
    changes_path = root / 'client-pack/changes.json'
    if changes_path.exists():
        changes = json.loads(changes_path.read_text()).get(version, [])
        if not isinstance(changes, list) or len(changes) > 20 or any(not isinstance(item, str) or not item.strip() or len(item) > 500 for item in changes):
            raise ValueError('Invalid release changes')
        channel['changes'] = changes
    (output / 'stable.json').write_text(json.dumps(channel, ensure_ascii=False, indent=2) + '\n')
    (output / 'SHA256SUMS.txt').write_text(''.join(f'{sha256((output / name).read_bytes()).hexdigest()}  {name}\n'
                                                for name in ('manifest.json', 'prism-runtime.json', 'Sunrin-Overlay.zip', 'stable.json', *(name for _, name in artifacts))))
    if bundle_output is not None:
        bundle_output.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(output / "Sunrin-Overlay.zip", bundle_output / "Sunrin-Overlay.zip")
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--min-launcher-version', default='0.1.2')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--bundle-output', type=Path)
    args = parser.parse_args()
    print(build_update(Path(__file__).resolve().parents[1], args.repo, args.min_launcher_version, args.output, bundle_output=args.bundle_output))
