"""Host boundary tests: real RCON sockets, hostile archives, and stop proofs."""
import importlib.util
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import socket
import stat
import struct
import tempfile
import threading
import time
from types import SimpleNamespace
import unittest
from unittest import mock
import uuid
import zipfile


MODULE_PATH = Path(__file__).with_name('host.py')
host = None
if MODULE_PATH.exists():
    spec = importlib.util.spec_from_file_location('sunrin_aws_host', MODULE_PATH)
    host = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(host)


def receive_packet(conn):
    def exact(n):
        out = b''
        while len(out) < n:
            chunk = conn.recv(n - len(out))
            if not chunk:
                raise EOFError()
            out += chunk
        return out
    size = struct.unpack('<i', exact(4))[0]
    request_id, packet_type = struct.unpack('<ii', exact(8))
    payload = exact(size - 8)
    return request_id, packet_type, payload[:-2].decode()


class RconServer:
    """Tiny real protocol peer; it deliberately fragments every response."""
    def __init__(self, *, flush='Saved the game', reject=False, on_stop=None,
                 wrong_id=False, stop_disconnect=False):
        self.flush = flush
        self.reject = reject
        self.on_stop = on_stop
        self.wrong_id = wrong_id
        self.stop_disconnect = stop_disconnect
        self.commands = []
        self.errors = []
        self.listener = socket.socket()
        self.listener.bind(('127.0.0.1', 0))
        self.port = self.listener.getsockname()[1]
        self.listener.listen()
        self.listener.settimeout(3)
        self.thread = threading.Thread(target=self.run, daemon=True)

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *_):
        self.thread.join(4)
        self.listener.close()
        if self.errors:
            raise self.errors[0]

    def send(self, conn, request_id, kind, text):
        body = struct.pack('<ii', request_id, kind) + text.encode() + b'\0\0'
        packet = struct.pack('<i', len(body)) + body
        for part in [packet[:2], packet[2:7], packet[7:]]:
            conn.sendall(part)

    def run(self):
        try:
            conn, _ = self.listener.accept()
            with conn:
                conn.settimeout(3)
                request_id, kind, password = receive_packet(conn)
                if kind != 3 or password != 'private-test-password':
                    raise AssertionError('Incorrect RCON authentication')
                self.send(conn, request_id, 0, '')
                self.send(conn, -1 if self.reject else request_id, 2, '')
                if self.reject:
                    return
                while True:
                    try:
                        request_id, kind, command = receive_packet(conn)
                    except EOFError:
                        break
                    self.commands.append(command)
                    if command == 'stop':
                        if self.on_stop:
                            self.on_stop()
                        if self.stop_disconnect:
                            return
                        result = 'Stopping the server'
                    elif command == 'save-all flush':
                        result = self.flush
                    elif command == 'list':
                        result = 'There are 0 of a max of 10 players online: '
                    else:
                        result = 'Unknown command'
                    self.send(conn, request_id + 1 if self.wrong_id else request_id, 0, result)
        except Exception as exc:
            self.errors.append(exc)


class HostTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(host, 'Implement the host helper before these contracts can pass')
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.secret = self.root / 'rcon.password'
        self.secret.write_text('private-test-password\n')
        self.secret.chmod(0o600)

    def controller(self, server, *, alive=None, changed=False):
        state = alive if alive is not None else {'value': True}
        def status():
            return {
                'LoadState': 'loaded', 'ActiveState': 'active' if state['value'] else 'inactive',
                'SubState': 'running' if state['value'] else 'dead',
                'MainPID': '321' if state['value'] else '0', 'Result': 'success',
                'FragmentPath': '/etc/systemd/system/sunrin-minecraft.service',
            }
        def token(pid):
            if pid != 321 or not state['value']:
                return None
            return 'replacement' if changed and server.commands else 'original'
        return host.Controller(secret_path=self.secret, state_dir=self.root / 'state',
                               status_reader=status, token_reader=token, port=server.port)

    def test_fragmented_rcon_packets_authenticate_and_return_the_command_response(self):
        with RconServer() as peer:
            with host.Rcon('private-test-password', port=peer.port, timeout=1) as client:
                self.assertIn('0 of a max of 10', client.command('list'))

    def test_rcon_authentication_rejection_never_sends_a_command(self):
        with RconServer(reject=True) as peer:
            with self.assertRaises(host.HostError) as caught:
                with host.Rcon('private-test-password', port=peer.port, timeout=1):
                    pass
            self.assertEqual(caught.exception.code, 'rcon-auth-rejected')
            self.assertEqual(peer.commands, [])

    def test_rcon_rejects_a_response_for_a_different_request(self):
        with RconServer(wrong_id=True) as peer:
            with host.Rcon('private-test-password', port=peer.port, timeout=1) as client:
                with self.assertRaises(host.HostError):
                    client.command('list')

    def test_health_requires_both_rcon_and_the_same_known_process(self):
        with RconServer() as peer:
            result = self.controller(peer).health(timeout=1)
        self.assertEqual(result['status'], 'ready')
        self.assertEqual(result['mainPid'], 321)
        self.assertNotIn('private-test-password', json.dumps(result))

    def test_boot_readiness_waits_for_java_then_uses_real_rcon(self):
        with RconServer() as peer:
            controller = self.controller(peer)
            status_reader = controller.status_reader
            count = {'calls': 0}
            def status():
                count['calls'] += 1
                value = status_reader()
                if count['calls'] == 1:
                    value.update(ActiveState='activating', MainPID='0', SubState='start')
                else:
                    value.update(ActiveState='activating', SubState='start-post')
                return value
            controller.status_reader = status
            result = controller.wait_ready(timeout=1)
        self.assertEqual(result['status'], 'ready')
        self.assertEqual(result['mainPid'], 321)

    def test_flush_then_stop_then_pid_exit_produces_a_request_bound_proof(self):
        state = {'value': True}
        request = str(uuid.uuid4())
        with RconServer(on_stop=lambda: state.update(value=False), stop_disconnect=True) as peer:
            controller = self.controller(peer, alive=state)
            result = controller.stop(request, timeout=1)
        self.assertEqual(peer.commands, ['save-all flush', 'stop'])
        self.assertEqual(result['requestId'], request)
        self.assertTrue(result['ok'])
        self.assertTrue(result['cleanStop'])
        self.assertEqual(result['status'], 'stopped')
        proof = json.loads((self.root / 'state' / 'last-stop.json').read_text())
        self.assertEqual(proof['requestId'], request)
        self.assertNotIn('private-test-password', json.dumps(proof))

    def test_unconfirmed_flush_does_not_dispatch_stop_or_write_a_proof(self):
        with RconServer(flush='Saving the game (this may take a moment!)') as peer:
            with self.assertRaises(host.HostError) as caught:
                self.controller(peer).stop(str(uuid.uuid4()), timeout=1)
        self.assertEqual(caught.exception.code, 'save-not-confirmed')
        self.assertEqual(peer.commands, ['save-all flush'])
        self.assertFalse((self.root / 'state' / 'last-stop.json').exists())

    def test_a_live_process_after_stop_times_out_without_a_clean_proof(self):
        with RconServer() as peer:
            with self.assertRaises(host.HostError) as caught:
                self.controller(peer).stop(str(uuid.uuid4()), timeout=0.08)
        self.assertEqual(caught.exception.code, 'stop-timeout')
        self.assertFalse((self.root / 'state' / 'last-stop.json').exists())

    def test_normal_process_exit_waits_for_systemd_to_settle_before_clean_proof(self):
        # /proc can report Java gone before systemd reaps it and updates its
        # separately queried MainPID/ActiveState. This occurred on the real host.
        state = {'value': True}
        after_exit = {'queries': 0}
        with RconServer(on_stop=lambda: state.update(value=False), stop_disconnect=True) as peer:
            controller = self.controller(peer, alive=state)
            normal_status = controller.status_reader
            def delayed_systemd():
                value = normal_status()
                if not state['value']:
                    after_exit['queries'] += 1
                    value.update(ExecMainCode='1', ExecMainStatus='0')
                    if after_exit['queries'] <= 2:
                        value.update(ActiveState='active', SubState='running', MainPID='321')
                    else:
                        value.update(ActiveState='deactivating', SubState='stop', MainPID='0')
                return value
            controller.status_reader = delayed_systemd
            result = controller.stop(str(uuid.uuid4()), timeout=1)
        self.assertTrue(result['cleanStop'])
        self.assertEqual(result['proof'], 'rcon-save-flush-stop-process-exited')
        self.assertEqual(after_exit['queries'], 3, 'Wait through both stale systemd snapshots')
        self.assertEqual(peer.commands, ['save-all flush', 'stop'])

    def test_gone_process_with_permanently_stale_active_unit_never_gets_clean_proof(self):
        state = {'value': True}
        with RconServer(on_stop=lambda: state.update(value=False), stop_disconnect=True) as peer:
            controller = self.controller(peer, alive=state)
            controller.status_reader = lambda: {
                'LoadState': 'loaded', 'ActiveState': 'active', 'SubState': 'running',
                'MainPID': '321', 'Result': 'success', 'ExecMainCode': '1', 'ExecMainStatus': '0',
                'FragmentPath': '/etc/systemd/system/sunrin-minecraft.service'}
            with self.assertRaises(host.HostError) as caught:
                controller.stop(str(uuid.uuid4()), timeout=0.08)
        self.assertEqual(caught.exception.code, 'stop-timeout')
        self.assertFalse((self.root / 'state' / 'last-stop.json').exists())

    def test_replaced_pid_is_not_mistaken_for_a_clean_stop(self):
        with RconServer() as peer:
            with self.assertRaises(host.HostError) as caught:
                self.controller(peer, changed=True).stop(str(uuid.uuid4()), timeout=1)
        self.assertEqual(caught.exception.code, 'process-changed')

    def test_inactive_known_unit_has_a_fresh_explicit_already_stopped_proof(self):
        controller = host.Controller(secret_path=self.secret, state_dir=self.root / 'state',
            status_reader=lambda: {'LoadState': 'loaded', 'ActiveState': 'inactive',
                'SubState': 'dead', 'MainPID': '0', 'Result': 'success',
                'FragmentPath': '/etc/systemd/system/sunrin-minecraft.service'},
            token_reader=lambda _: None)
        request = str(uuid.uuid4())
        result = controller.stop(request, timeout=1)
        self.assertEqual(result['requestId'], request)
        self.assertEqual(result['proof'], 'known-unit-already-inactive')
        self.assertTrue(result['cleanStop'])

    def test_unknown_or_failed_units_never_claim_cleanly_stopped(self):
        for load, active, result in [('not-found', 'inactive', 'success'),
                                     ('loaded', 'failed', 'exit-code')]:
            controller = host.Controller(secret_path=self.secret, state_dir=self.root / 'state',
                status_reader=lambda: {'LoadState': load, 'ActiveState': active,
                    'SubState': 'dead', 'MainPID': '0', 'Result': result,
                    'FragmentPath': '/etc/systemd/system/sunrin-minecraft.service'},
                token_reader=lambda _: None)
            with self.assertRaises(host.HostError):
                controller.stop(str(uuid.uuid4()), timeout=1)

    def test_systemd_execstop_after_a_normal_exit_does_not_create_a_restart_failure(self):
        controller = host.Controller(secret_path=self.secret, state_dir=self.root / 'state',
            status_reader=lambda: {'LoadState': 'loaded', 'ActiveState': 'deactivating',
                'SubState': 'stop', 'MainPID': '0', 'Result': 'success',
                'FragmentPath': '/etc/systemd/system/sunrin-minecraft.service'})
        result = controller.stop(str(uuid.uuid4()), timeout=1)
        self.assertTrue(result['cleanStop'])
        self.assertEqual(result['proof'], 'known-unit-process-already-exited')

    def test_timed_shutdown_is_never_invoked_after_an_unconfirmed_stop(self):
        with mock.patch.object(host, 'operation_lock', return_value=contextlib.nullcontext()), \
             mock.patch.object(host.Controller, 'stop', side_effect=host.HostError('save-not-confirmed')), \
             mock.patch.object(host.subprocess, 'run') as run, contextlib.redirect_stdout(io.StringIO()) as output:
            status = host.main(['timed-stop'])
        self.assertEqual(status, 1)
        self.assertFalse(json.loads(output.getvalue())['cleanStop'])
        run.assert_not_called()

    def test_timed_shutdown_requires_the_returned_request_bound_clean_proof(self):
        incomplete = {'ok': True, 'status': 'stopped', 'cleanStop': False}
        with mock.patch.object(host, 'operation_lock', return_value=contextlib.nullcontext()), \
             mock.patch.object(host.Controller, 'stop', return_value=incomplete), \
             mock.patch.object(host.subprocess, 'run') as run, contextlib.redirect_stdout(io.StringIO()) as output:
            status = host.main(['timed-stop'])
        self.assertEqual(status, 1)
        self.assertEqual(json.loads(output.getvalue())['code'], 'invalid-clean-stop-proof')
        run.assert_not_called()

    def test_abnormal_java_exit_does_not_authorize_ec2_stop_before_an_auto_restart(self):
        state = {'value': True}
        with RconServer(on_stop=lambda: state.update(value=False)) as peer:
            controller = self.controller(peer, alive=state)
            normal_status = controller.status_reader
            def failed_exit():
                value = normal_status()
                if not state['value']:
                    value.update(Result='exit-code', ActiveState='activating', SubState='auto-restart')
                return value
            controller.status_reader = failed_exit
            with self.assertRaises(host.HostError) as caught:
                controller.stop(str(uuid.uuid4()), timeout=1)
        self.assertEqual(caught.exception.code, 'server-exit-failed')

    def test_world_archive_is_only_created_after_the_unit_is_inactive(self):
        server = self.root / 'server'
        (server / 'world').mkdir(parents=True)
        (server / 'world' / 'level.dat').write_bytes(b'world-data')
        controller = host.Controller(secret_path=self.secret, state_dir=self.root / 'state',
            status_reader=lambda: {'LoadState': 'loaded', 'ActiveState': 'active',
                'SubState': 'running', 'MainPID': '321', 'Result': 'success',
                'FragmentPath': '/etc/systemd/system/sunrin-minecraft.service'})
        with self.assertRaises(host.HostError):
            controller.backup(server, self.root / 'backups')
        self.assertFalse((self.root / 'backups').exists())

    def test_world_backups_preserve_bytes_and_keep_three_complete_archives(self):
        import tarfile
        server = self.root / 'server'
        (server / 'world').mkdir(parents=True)
        (server / 'world' / 'level.dat').write_bytes(b'world-data')
        controller = host.Controller(secret_path=self.secret, state_dir=self.root / 'state',
            status_reader=lambda: {'LoadState': 'loaded', 'ActiveState': 'inactive',
                'SubState': 'dead', 'MainPID': '0', 'Result': 'success',
                'FragmentPath': '/etc/systemd/system/sunrin-minecraft.service'})
        for _ in range(4):
            result = controller.backup(server, self.root / 'backups')
        paths = list((self.root / 'backups').glob('*.tar.gz'))
        self.assertEqual(len(paths), 3)
        with tarfile.open(result['archive']) as archive:
            self.assertEqual(archive.extractfile('world/level.dat').read(), b'world-data')

    def test_secret_file_must_not_be_readable_by_other_users(self):
        self.secret.chmod(0o644)
        with self.assertRaises(host.HostError):
            host.read_secret(self.secret)

    def test_zip_preflight_rejects_traversal_symlinks_duplicates_and_collisions(self):
        malicious = [
            [('world/../../escape', b'bad', None)],
            [('/absolute', b'bad', None)],
            [('C:/drive', b'bad', None)],
            [('mods\\evil.jar', b'bad', None)],
            [('mods/link', b'/etc/passwd', stat.S_IFLNK | 0o777)],
            [('mods/A.jar', b'one', None), ('mods/a.jar', b'two', None)],
            [('mods/Example/a.jar', b'one', None), ('mods/example/b.jar', b'two', None)],
            [('mods', b'file', None), ('mods/mod.jar', b'child', None)],
        ]
        for index, entries in enumerate(malicious):
            source = self.root / f'bad-{index}.zip'
            with zipfile.ZipFile(source, 'w') as z:
                for name, content, mode in entries:
                    info = zipfile.ZipInfo(name)
                    if mode:
                        info.create_system = 3
                        info.external_attr = mode << 16
                    z.writestr(info, content)
            dest = self.root / f'out-{index}'
            with self.assertRaises(host.HostError, msg=entries):
                host.safe_extract(source, dest)
            self.assertFalse(dest.exists(), 'Reject before writing any archive member')

    def test_zip_size_limit_and_regular_file_extraction(self):
        source = self.root / 'pack.zip'
        with zipfile.ZipFile(source, 'w') as z:
            z.writestr('kubejs/startup_scripts/original.js', b'original')
        with self.assertRaises(host.HostError):
            host.safe_extract(source, self.root / 'too-big', max_bytes=3)
        host.safe_extract(source, self.root / 'good')
        self.assertEqual((self.root / 'good/kubejs/startup_scripts/original.js').read_bytes(), b'original')

    def test_hash_verification_rejects_modified_payloads(self):
        payload = self.root / 'artifact'
        payload.write_bytes(b'abc')
        host.verify_file(payload, size=3, algorithm='sha256',
            digest='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
        with self.assertRaises(host.HostError):
            host.verify_file(payload, size=4, algorithm='sha256', digest='0' * 64)
        with self.assertRaises(host.HostError):
            host.verify_file(payload, size=3, algorithm='sha256', digest='0' * 64)

    def test_whitelist_names_cannot_inject_rcon_commands(self):
        for bad in ['a\nop Attacker', '../../operator', 'space name', 'a' * 17, '']:
            with self.assertRaises(host.HostError):
                host.validate_username(bad)
        self.assertEqual(host.validate_username('Valid_Player123'), 'Valid_Player123')

    def test_owned_overlay_install_validates_all_files_and_preserves_upstream(self):
        payload = self.root / "overlay.zip"
        content = b"bridge script"
        spec = {"filename": "overlay.zip", "size": 0, "hash": {"algorithm": "sha256", "digest": ""},
                "files": [{"path": "kubejs/server_scripts/sunrin_policy.js", "size": len(content), "sha256": hashlib.sha256(content).hexdigest(), "mode": "replace"}]}
        with zipfile.ZipFile(payload, "w") as archive:
            archive.writestr(spec["files"][0]["path"], content)
        spec["size"] = payload.stat().st_size
        spec["hash"]["digest"] = hashlib.sha256(payload.read_bytes()).hexdigest()
        server = self.root / "staged-server"
        (server / "kubejs/startup_scripts").mkdir(parents=True)
        (server / "kubejs/startup_scripts/original.js").write_bytes(b"upstream")
        host.apply_owned_overlay(payload, server, spec)
        self.assertEqual((server / spec["files"][0]["path"]).read_bytes(), content)
        self.assertEqual((server / "kubejs/startup_scripts/original.js").read_bytes(), b"upstream")
        spec["files"][0]["sha256"] = "0" * 64
        with self.assertRaises(host.HostError):
            host.apply_owned_overlay(payload, server, spec)

    def test_fresh_bootstrap_merges_ftb_defaults_without_overwriting_unrelated_keys(self):
        server = self.root / "fresh-stage"
        default = server / "defaultconfigs/ftbchunks/ftbchunks-world.snbt"
        default.parent.mkdir(parents=True)
        original = b'{\n # comment\n max_claimed_chunks: 500\n party_limit_mode: "largest"\n hard_team_claim_limit: 0\n}\n'
        default.write_bytes(original)
        content = b'{\n max_claimed_chunks: 4\n party_limit_mode: "sum"\n}\n'
        payload = self.root / "ftb-overlay.zip"
        with zipfile.ZipFile(payload, "w") as archive:
            archive.writestr("defaultconfigs/ftbchunks/ftbchunks-world.snbt", content)
        spec = {"filename": payload.name, "size": payload.stat().st_size, "hash": {"algorithm": "sha256", "digest": hashlib.sha256(payload.read_bytes()).hexdigest()},
                "files": [{"path": "defaultconfigs/ftbchunks/ftbchunks-world.snbt", "size": len(content), "sha256": hashlib.sha256(content).hexdigest(), "mode": "ifAbsent"}]}
        host.apply_owned_overlay(payload, server, spec)
        self.assertEqual(default.read_bytes(), original.replace(b'max_claimed_chunks: 500', b'max_claimed_chunks: 4').replace(b'party_limit_mode: "largest"', b'party_limit_mode: "sum"'))

    def test_owned_overlay_refuses_playerdata_even_with_valid_archive_digest(self):
        payload = self.root / "unsafe-overlay.zip"
        with zipfile.ZipFile(payload, "w") as archive:
            archive.writestr("world/playerdata/a.dat", b"bad")
        spec = {"filename": payload.name, "size": payload.stat().st_size,
                "hash": {"algorithm": "sha256", "digest": hashlib.sha256(payload.read_bytes()).hexdigest()},
                "files": [{"path": "world/playerdata/a.dat", "size": 3, "sha256": hashlib.sha256(b"bad").hexdigest(), "mode": "replace"}]}
        server = self.root / "staged-server"
        server.mkdir()
        with self.assertRaises(host.HostError):
            host.apply_owned_overlay(payload, server, spec)
        self.assertEqual(list(server.iterdir()), [])

    def install_fixture(self):
        payload = self.root / 'payload'
        payload.mkdir()
        custom = b'custom startup registrations'
        (payload / 'sunrin_items.js').write_bytes(custom)
        base = self.root / 'base.zip'
        with zipfile.ZipFile(base, 'w') as z:
            z.writestr('mods/original.jar', b'original mod')
            z.writestr('kubejs/startup_scripts/original.js', b'keep original')
            z.writestr('server.properties', 'allow-flight=true\nmax-players=10\n')
        addon = self.root / 'addon.jar'
        addon.write_bytes(b'addon mod')
        installer = self.root / 'installer.jar'
        installer.write_bytes(b'fake external Java boundary')
        lock = {'id': 'test-server', 'upstreamModCount': 1, 'serverModCount': 2,
                'serverPack': {'filename': 'base.zip'}, 'forgeInstaller': {'filename': 'installer.jar'},
                'addons': [{'filename': 'addon.jar'}],
                'customStartup': {'hash': {'algorithm': 'sha256', 'digest': hashlib.sha256(custom).hexdigest()}}}
        (payload / 'pack-lock.json').write_text(json.dumps(lock))
        mapping = {'base.zip': base, 'addon.jar': addon, 'installer.jar': installer}
        def fake_forge(argv, *, cwd, **_):
            self.assertEqual(argv, ['/fixed/java17', '-jar', str(installer), '--installServer'])
            args = Path(cwd) / 'libraries/net/minecraftforge/forge/1.20.1-47.4.0/unix_args.txt'
            args.parent.mkdir(parents=True)
            args.write_text('forge launch arguments')
            return SimpleNamespace(returncode=0)
        return payload, mapping, fake_forge

    def test_modern_install_includes_core_all_overlay_files_and_ownership_receipt(self):
        payload, mapping, fake_forge = self.install_fixture()
        lock_path = payload / "pack-lock.json"
        lock = json.loads(lock_path.read_text())
        lock["clientPackVersion"] = "0.2.0"
        lock["serverModCount"] = 3
        lock.pop("customStartup")
        core = self.root / "sunrin-core-0.1.0.jar"
        core.write_bytes(b"compiled core")
        mapping[core.name] = core
        lock["ownedFiles"] = [{"slug": "sunrin-core", "version": "0.1.0", "filename": core.name, "size": core.stat().st_size,
            "url": "https://github.com/mingyu1715/sunrin-valley/releases/download/pack-0.2.0/" + core.name,
            "hash": {"algorithm": "sha256", "digest": hashlib.sha256(core.read_bytes()).hexdigest()}}]
        contents = {"kubejs/startup_scripts/sunrin_items.js": b"items", "kubejs/server_scripts/sunrin_policy.js": b"policy", "kubejs/data/sunrin/defaults/geonpi.json": b"{}"}
        overlay = payload / "Sunrin-Server-Overlay.zip"
        with zipfile.ZipFile(overlay, "w") as archive:
            for name, content in contents.items():
                archive.writestr(name, content)
        lock["ownedOverlay"] = {"filename": overlay.name, "size": overlay.stat().st_size,
            "hash": {"algorithm": "sha256", "digest": hashlib.sha256(overlay.read_bytes()).hexdigest()},
            "files": [{"path": name, "size": len(content), "sha256": hashlib.sha256(content).hexdigest(), "mode": "replace"} for name, content in contents.items()]}
        lock_path.write_text(json.dumps(lock))
        server = self.root / "server"
        with mock.patch.object(host, "download_verified", side_effect=lambda item, _: mapping[item["filename"]]), mock.patch.object(host.subprocess, "run", side_effect=fake_forge):
            host.install_server(payload, server, self.root / "cache", self.root / "etc/rcon.password", accept_eula=True, java="/fixed/java17")
        receipt = json.loads((server / ".sunrin-owned-files.json").read_text())
        self.assertEqual({i["path"] for i in receipt["files"]}, {*contents, "mods/" + core.name})
        self.assertEqual((server / "mods" / core.name).read_bytes(), core.read_bytes())
        self.assertEqual((server / "kubejs/startup_scripts/original.js").read_bytes(), b"keep original")

    def test_install_requires_explicit_eula_consent_before_any_files_are_created(self):
        with self.assertRaises(host.HostError) as caught:
            host.install_server(self.root / 'missing', self.root / 'server',
                                self.root / 'cache', self.root / 'secret', accept_eula=False)
        self.assertEqual(caught.exception.code, 'explicit-eula-consent-required')
        self.assertFalse((self.root / 'server').exists())

    def test_verified_install_preserves_upstream_and_idempotent_run_preserves_world(self):
        payload, mapping, fake_forge = self.install_fixture()
        server, secret = self.root / 'server', self.root / 'etc/rcon.password'
        with mock.patch.object(host, 'download_verified', side_effect=lambda item, _: mapping[item['filename']]), \
             mock.patch.object(host.subprocess, 'run', side_effect=fake_forge):
            result = host.install_server(payload, server, self.root / 'cache', secret,
                                         accept_eula=True, java='/fixed/java17')
        self.assertEqual(result['status'], 'installed')
        self.assertEqual((server / 'kubejs/startup_scripts/original.js').read_bytes(), b'keep original')
        self.assertEqual((server / 'kubejs/startup_scripts/sunrin_items.js').read_bytes(), b'custom startup registrations')
        self.assertIn('white-list=true', (server / 'server.properties').read_text())
        self.assertIn('allow-flight=true', (server / 'server.properties').read_text())
        self.assertEqual(stat.S_IMODE((server / 'server.properties').stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(secret.stat().st_mode), 0o600)
        (server / 'world').mkdir()
        (server / 'world/level.dat').write_bytes(b'player progress')
        with mock.patch.object(host, 'download_verified', side_effect=AssertionError('Idempotent install downloaded')):
            result = host.install_server(payload, server, self.root / 'cache', secret,
                                         accept_eula=True, java='/fixed/java17')
        self.assertEqual(result['status'], 'already-installed')
        self.assertEqual((server / 'world/level.dat').read_bytes(), b'player progress')

    def test_existing_unowned_server_is_never_overwritten(self):
        payload, _, _ = self.install_fixture()
        server = self.root / 'server'
        (server / 'world').mkdir(parents=True)
        (server / 'world/level.dat').write_bytes(b'irreplaceable')
        with mock.patch.object(host, 'download_verified', side_effect=AssertionError('Must refuse before downloads')):
            with self.assertRaises(host.HostError) as caught:
                host.install_server(payload, server, self.root / 'cache', self.root / 'secret', accept_eula=True)
        self.assertEqual(caught.exception.code, 'existing-server-not-owned')
        self.assertEqual((server / 'world/level.dat').read_bytes(), b'irreplaceable')

    def test_bootstrap_refuses_missing_eula_and_invalid_timer_before_host_changes(self):
        import subprocess
        script = Path(__file__).with_name('bootstrap.sh')
        self.assertTrue(script.is_file(), 'Bootstrap is required for deployment')
        cases = [([], 'explicit-eula-consent-required'),
                 (['--accept-eula', '--test-minutes', '14'], 'invalid-test-minutes'),
                 (['--accept-eula', '--test-minutes', '1441'], 'invalid-test-minutes'),
                 (['--accept-eula', '--test-minutes', '0;reboot'], 'invalid-test-minutes'),
                 (['--accept-eula', '--whitelist', 'bad name'], 'invalid-whitelist-name')]
        for argv, code in cases:
            result = subprocess.run(['bash', str(script), *argv], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(json.loads(result.stdout)['code'], code)


if __name__ == '__main__':
    unittest.main()
