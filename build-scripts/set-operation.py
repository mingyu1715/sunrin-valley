"""Prepare operational metadata locally; never starts a server or pushes Git."""
import argparse
import json
import os
import re
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

STATES = {'unconfigured', 'online', 'scheduled', 'maintenance', 'failed', 'unknown'}


def valid_version(value):
    if not isinstance(value, str) or not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', value):
        raise ValueError('Version must use major.minor.patch')
    return value


def release_descriptor(value):
    if not isinstance(value, dict) or value.get('formatVersion') != 1 or value.get('id') != 'sunrin-valley':
        raise ValueError('Invalid client release descriptor')
    valid_version(value.get('version')); valid_version(value.get('minLauncherVersion'))
    for name in ('manifest', 'prism', 'overlay'):
        asset = value.get('bundle', {}).get(name, {})
        url = urlsplit(asset.get('url', ''))
        if url.scheme != 'https' or not url.hostname or url.username or url.password or not re.fullmatch('[a-fA-F0-9]{64}', asset.get('sha256', '')):
            raise ValueError('Invalid HTTPS release asset/hash')
    changes = value.get('changes', [])
    if not isinstance(changes, list) or len(changes) > 20 or any(not isinstance(item, str) or not item.strip() or len(item) > 500 for item in changes):
        raise ValueError('Invalid release changes')
    return value


def aware_time(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('An explicit time zone is required')
    return value


def _write(path, value):
    fd, temporary = tempfile.mkstemp(prefix='.operation-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write('\n'); stream.flush(); os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def _write_group(channel, values):
    channel.mkdir(parents=True, exist_ok=True)
    lock = channel / '.operation-lock'
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    backups = {}
    try:
        for path in values:
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.is_symlink():
                raise ValueError('Linked metadata files are not allowed')
            if path.exists():
                fd, name = tempfile.mkstemp(prefix='.operation-backup-', dir=channel)
                os.close(fd); shutil.copyfile(path, name); backups[path] = Path(name)
            else:
                backups[path] = None
        try:
            for path, value in values.items():
                _write(path, value)
        except BaseException:
            for path, backup in backups.items():
                if backup is None:
                    path.unlink(missing_ok=True)
                else:
                    os.replace(backup, path)
            raise
        for backup in backups.values():
            if backup:
                backup.unlink(missing_ok=True)
    finally:
        lock.unlink(missing_ok=True)


def record_publication(root, client_release):
    release = release_descriptor(json.loads(Path(client_release).read_text(encoding='utf-8')))
    channel = Path(root) / 'client-pack/channel'
    history = channel / 'releases' / (release['version'] + '.json')
    if history.exists() and json.loads(history.read_text(encoding='utf-8')) != release:
        raise ValueError('An already published release descriptor cannot be replaced')
    _write_group(channel, {history: release, channel / 'published.json': release})
    return release


def set_operation(root, client_release, state, active_version, target_version=None, starts_at=None, message=''):
    valid_version(active_version)
    if target_version:
        valid_version(target_version)
    if state not in STATES or not isinstance(message, str) or len(message) > 500:
        raise ValueError('Invalid operational status')
    if starts_at:
        aware_time(starts_at)
    if state == 'scheduled' and (not starts_at or not target_version):
        raise ValueError('Scheduled updates require target version and apply time')
    channel = Path(root) / 'client-pack/channel'
    supplied = release_descriptor(json.loads(Path(client_release).read_text(encoding='utf-8')))
    current_path = channel / 'operating.json'
    current = json.loads(current_path.read_text(encoding='utf-8')) if current_path.exists() else None
    if supplied['version'] == active_version:
        release = supplied
    elif current and current.get('activeVersion') == active_version:
        release = release_descriptor(current['release'])
    else:
        history = channel / 'releases' / (active_version + '.json')
        if not history.is_file():
            raise ValueError('No verified descriptor for the requested active version')
        release = release_descriptor(json.loads(history.read_text(encoding='utf-8')))
    changed = current and current['activeVersion'] != active_version
    failed_rollback = state == 'failed' and current and target_version == current['activeVersion'] and active_version != target_version
    if release['version'] != active_version or changed and state != 'online' and not failed_rollback:
        raise ValueError('Operational status cannot silently promote a release')
    result = {'formatVersion': 1, 'id': 'sunrin-valley-operations', 'activeVersion': active_version,
              'release': release, 'status': {'state': state, 'message': message},
              'updatedAt': datetime.now(timezone.utc).isoformat()}
    if target_version:
        result['status']['targetVersion'] = target_version
    if starts_at:
        result['status']['startsAt'] = starts_at
    _write_group(channel, {current_path: result, channel / 'stable.json': release})
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--record-publication', type=Path)
    parser.add_argument('--client-release', type=Path)
    parser.add_argument('--state', choices=sorted(STATES))
    parser.add_argument('--active-version')
    parser.add_argument('--target-version')
    parser.add_argument('--starts-at')
    parser.add_argument('--message', default='')
    args = parser.parse_args()
    if args.record_publication:
        value = record_publication(args.root, args.record_publication)
    else:
        if not args.client_release or not args.state or not args.active_version:
            parser.error('--client-release, --state and --active-version are required')
        value = set_operation(args.root, args.client_release, args.state, args.active_version, args.target_version, args.starts_at, args.message)
    print(json.dumps({'version': value.get('activeVersion', value.get('version')), 'state': value.get('status', {}).get('state', 'published')}, ensure_ascii=False))
