"""Strict immutable Sunrin artifact pins shared by offline release adapters."""
import hashlib
from pathlib import Path, PurePosixPath
import re


def resolve_owned_files(sources):
    pins = sources.get('ownedFiles', [])
    if not isinstance(pins, list):
        raise ValueError('ownedFiles must be an array')
    result, seen = [], set()
    for pin in pins:
        slug, version = pin.get('slug', ''), pin.get('version', '')
        if not re.fullmatch(r'[a-z][a-z0-9-]*', slug) or not re.fullmatch(r'\d+\.\d+\.\d+', version) or slug in seen:
            raise ValueError('Invalid or duplicated owned artifact identity')
        seen.add(slug)
        name = f'{slug}-{version}.jar'
        repository = sources.get('releaseRepository', '')
        pack_version = sources.get('packVersion', '')
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9][A-Za-z0-9_.-]*', repository) or not re.fullmatch(r'\d+\.\d+\.\d+', pack_version):
            raise ValueError('Invalid owned artifact release identity')
        url = f'https://github.com/{repository}/releases/download/pack-{pack_version}/{name}'
        local = pin.get('localPath', '')
        path = PurePosixPath(local)
        if (pin.get('filename') != name or pin.get('path') != 'mods/' + name or pin.get('url') != url
                or not re.fullmatch(r'[0-9a-f]{64}', pin.get('sha256', ''))
                or type(pin.get('size')) is not int or pin['size'] <= 0
                or not local or '\\' in local or ':' in local or str(path) != local or path.is_absolute()
                or any(part in ('', '.', '..') or part.startswith('.') for part in local.split('/'))
                or path.name != name):
            raise ValueError('Owned artifact pin mismatch')
        result.append({'path': pin['path'], 'url': url, 'hash': {'algorithm': 'sha256', 'value': pin['sha256']},
                       'size': pin['size'], 'source': {'provider': 'sunrin', 'slug': slug, 'version': version}})
    return result


def verified_owned_artifacts(root, sources):
    entries = resolve_owned_files(sources)
    result = []
    root = Path(root).resolve()
    for pin, entry in zip(sources.get('ownedFiles', []), entries):
        source = root / pin['localPath']
        if (any(p.is_symlink() for p in [source, *source.parents] if p != root.parent)
                or not source.is_file() or not source.resolve().is_relative_to(root)):
            raise ValueError('Owned artifact must be a regular built file')
        data = source.read_bytes()
        if len(data) != entry['size'] or hashlib.sha256(data).hexdigest() != entry['hash']['value']:
            raise ValueError('Owned artifact bytes disagree with source pin; explicitly refresh after building')
        result.append((source, pin['filename']))
    return result
