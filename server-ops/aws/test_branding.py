"""Branding applies only the owned icon and never bypasses graceful shutdown."""
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import threading
import unittest


MODULE_PATH = Path(__file__).with_name('branding.py')
branding = None
if MODULE_PATH.exists():
    spec = importlib.util.spec_from_file_location('sunrin_branding', MODULE_PATH)
    branding = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(branding)

ICON_PATH = Path(__file__).with_name('server-icon.png')
UNIT = 'sunrin-minecraft.service'
TIMER = 'sunrin-test-stop.timer'
STOP_UNIT = 'sunrin-test-stop.service'


class Commands:
    """Systemd/host command boundary; filesystem operations stay real."""
    def __init__(self, state='active'):
        self.state = state
        self.pid = 321 if state in ('active', 'activating') else 0
        self.calls = []
        self.proof_valid = True
        self.timer = ('active', 'waiting')
        self.timed_stop = 'inactive'
        self.due_after_stop = False

    def __call__(self, command, *, timeout):
        self.calls.append(command)
        value = ''
        if command[:2] == ['systemctl', 'show']:
            unit = command[2]
            if unit == UNIT:
                fields = dict(LoadState='loaded', ActiveState=self.state,
                              SubState='running' if self.pid else 'dead',
                              MainPID=str(self.pid), Result='success',
                              FragmentPath='/etc/systemd/system/' + UNIT)
            elif unit == TIMER:
                fields = dict(LoadState='loaded', ActiveState=self.timer[0],
                              SubState=self.timer[1])
            elif unit == STOP_UNIT:
                fields = dict(LoadState='loaded', ActiveState=self.timed_stop,
                              SubState='dead')
            else:
                raise AssertionError(command)
            value = '\n'.join(key + '=' + item for key, item in fields.items())
        elif command[:2] == ['systemctl', 'start']:
            if command != ['systemctl', 'start', UNIT]:
                raise AssertionError('Unexpected service or timer start: ' + repr(command))
            self.state, self.pid = 'active', 654
        elif command[:2] == ['/usr/bin/python3', '/usr/local/lib/sunrin/host.py']:
            action = command[2]
            if action == 'wait-ready':
                self.state = 'active'
                value = json.dumps(dict(ok=True, status='ready', unit=UNIT,
                                        mainPid=self.pid))
            elif action == 'stop':
                request_id = command[command.index('--request-id') + 1]
                value = json.dumps(dict(ok=self.proof_valid, status='stopped',
                                        cleanStop=self.proof_valid, unit=UNIT,
                                        requestId=request_id, mainPid=self.pid,
                                        proof='rcon-save-flush-stop-process-exited',
                                        processStart='12345'))
                self.state, self.pid = 'inactive', 0
                if self.due_after_stop:
                    self.timer = ('active', 'elapsed')
            else:
                raise AssertionError(command)
        else:
            raise AssertionError(command)
        return subprocess.CompletedProcess(command, 0, value, '')


class BrandingTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(branding, 'Implement branding helper before these contracts pass')
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.server = self.root / 'minecraft'
        self.server.mkdir()
        (self.server / '.sunrin-server-complete.json').write_text(json.dumps({
            'packId': 'sunrin-valley-server-0.1.4', 'modCount': 315}))
        self.icon = self.root / 'input.png'
        self.icon.write_bytes(ICON_PATH.read_bytes())
        self.receipt = self.root / 'state' / 'server-branding.json'

    def apply(self, commands=None):
        commands = commands or Commands()
        return branding.Branding(server_dir=self.server, receipt_path=self.receipt,
                                 runner=commands,
                                 service_owner=(os.getuid(), os.getgid())).apply(self.icon)

    def assert_no_start(self, commands):
        self.assertFalse(any(call[:2] == ['systemctl', 'start'] for call in commands.calls))

    def test_malformed_png_is_rejected_before_target_or_service_changes(self):
        self.icon.write_bytes(b'\x89PNG\r\n\x1a\nnot-a-png')
        commands = Commands()
        with self.assertRaises(branding.BrandingError):
            self.apply(commands)
        self.assertFalse((self.server / 'server-icon.png').exists())
        self.assert_no_start(commands)

    def test_unowned_server_marker_is_rejected(self):
        (self.server / '.sunrin-server-complete.json').write_text('{"packId":"other-server"}')
        with self.assertRaises(branding.BrandingError):
            self.apply()
        self.assertFalse((self.server / 'server-icon.png').exists())

    def test_symlink_icon_target_is_rejected_without_touching_destination(self):
        elsewhere = self.root / 'other'
        elsewhere.write_bytes(b'keep')
        (self.server / 'server-icon.png').symlink_to(elsewhere)
        with self.assertRaises(branding.BrandingError):
            self.apply()
        self.assertEqual(elsewhere.read_bytes(), b'keep')

    def test_symlink_source_is_rejected(self):
        link = self.root / 'link.png'
        link.symlink_to(self.icon)
        self.icon = link
        with self.assertRaises(branding.BrandingError):
            self.apply()

    def test_symlink_marker_is_rejected(self):
        marker = self.server / '.sunrin-server-complete.json'
        other = self.root / 'marker.json'
        marker.rename(other)
        marker.symlink_to(other)
        with self.assertRaises(branding.BrandingError):
            self.apply()

    def test_world_writable_receipt_is_rejected(self):
        self.receipt.parent.mkdir()
        self.receipt.write_text('{}')
        self.receipt.chmod(0o666)
        commands = Commands()
        with self.assertRaises(branding.BrandingError) as caught:
            self.apply(commands)
        self.assertEqual(caught.exception.code, 'unsafe-receipt')
        self.assert_no_start(commands)

    def test_inactive_server_receives_icon_and_first_backup_without_start(self):
        (self.server / 'server-icon.png').write_bytes(b'previous-icon')
        commands = Commands('inactive')
        result = self.apply(commands)
        self.assertEqual((self.server / 'server-icon.png').read_bytes(), ICON_PATH.read_bytes())
        self.assertEqual((self.receipt.parent / 'server-icon.previous.png').read_bytes(), b'previous-icon')
        self.assertEqual(stat.S_IMODE(self.receipt.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.receipt.parent.stat().st_mode), 0o700)
        self.assertEqual(stat.S_IMODE((self.server / 'server-icon.png').stat().st_mode), 0o644)
        self.assertEqual(result['reload'], 'not-running')
        self.assert_no_start(commands)

    def test_unknown_service_never_autostarts(self):
        commands = Commands('failed')
        result = self.apply(commands)
        self.assertEqual(result['reload'], 'not-running')
        self.assert_no_start(commands)

    def test_bad_clean_stop_proof_never_starts_minecraft(self):
        commands = Commands()
        commands.proof_valid = False
        with self.assertRaises(branding.BrandingError) as caught:
            self.apply(commands)
        self.assertEqual(caught.exception.code, 'invalid-clean-stop-proof')
        self.assert_no_start(commands)

    def test_due_timer_before_stop_applies_icon_without_stopping_or_starting(self):
        commands = Commands()
        commands.timer = ('active', 'elapsed')
        result = self.apply(commands)
        self.assertEqual(result['reload'], 'shutdown-pending')
        self.assertFalse(any('stop' in call for call in commands.calls))
        self.assert_no_start(commands)

    def test_timer_becoming_due_after_clean_stop_blocks_restart(self):
        commands = Commands()
        commands.due_after_stop = True
        result = self.apply(commands)
        self.assertEqual(result['reload'], 'shutdown-pending')
        self.assert_no_start(commands)

    def test_timed_stop_service_blocks_restart(self):
        for state in ('active', 'activating', 'deactivating'):
            with self.subTest(state=state):
                commands = Commands()
                commands.timed_stop = state
                self.assertEqual(self.apply(commands)['reload'], 'shutdown-pending')
                self.assert_no_start(commands)

    def test_activating_service_before_java_exec_waits_and_reloads_after_start(self):
        commands = Commands('activating')
        commands.pid = 0
        original = commands.__call__

        def run(command, *, timeout):
            if command[:3] == ['/usr/bin/python3', '/usr/local/lib/sunrin/host.py', 'wait-ready']:
                commands.pid = 321
            return original(command, timeout=timeout)

        result = self.apply(run)
        self.assertEqual(result['reload'], 'reloaded')

    def test_nonregular_first_backup_is_rejected(self):
        (self.server / 'server-icon.png').write_bytes(b'previous-icon')
        self.receipt.parent.mkdir()
        (self.receipt.parent / 'server-icon.previous.png').mkdir()
        commands = Commands()
        with self.assertRaises(branding.BrandingError):
            self.apply(commands)
        self.assertEqual((self.server / 'server-icon.png').read_bytes(), b'previous-icon')
        self.assert_no_start(commands)

    def test_existing_first_backup_must_remain_private(self):
        (self.server / 'server-icon.png').write_bytes(b'previous-icon')
        self.receipt.parent.mkdir()
        backup = self.receipt.parent / 'server-icon.previous.png'
        backup.write_bytes(b'first-icon')
        backup.chmod(0o644)
        commands = Commands()
        with self.assertRaises(branding.BrandingError) as caught:
            self.apply(commands)
        self.assertEqual(caught.exception.code, 'unsafe-backup')
        self.assertEqual(backup.read_bytes(), b'first-icon')
        self.assert_no_start(commands)

    def test_overlapping_jobs_serialize_and_reload_only_once(self):
        commands = Commands()
        first_entered = threading.Event()
        release_first = threading.Event()
        first_query = {'pending': True}
        results, errors = [], []

        def run(command, *, timeout):
            if command[:3] == ['systemctl', 'show', UNIT] and first_query['pending']:
                first_query['pending'] = False
                first_entered.set()
                release_first.wait(2)
            return commands(command, timeout=timeout)

        def job():
            try:
                results.append(self.apply(run))
            except Exception as exc:
                errors.append(exc)

        one = threading.Thread(target=job)
        two = threading.Thread(target=job)
        one.start()
        self.assertTrue(first_entered.wait(2))
        two.start()
        release_first.set()
        one.join(3)
        two.join(3)
        self.assertFalse(one.is_alive() or two.is_alive())
        self.assertFalse(errors)
        self.assertEqual(sorted(result['reload'] for result in results),
                         ['already-applied', 'reloaded'])
        self.assertEqual(sum(call[:2] == ['systemctl', 'start'] for call in commands.calls), 1)

    def test_graceful_reload_uses_only_minecraft_unit_and_receipt_prevents_repeat(self):
        commands = Commands('activating')
        result = self.apply(commands)
        self.assertEqual(result['reload'], 'reloaded')
        actions = [call for call in commands.calls if call[:2] == ['systemctl', 'start']]
        self.assertEqual(actions, [['systemctl', 'start', UNIT]])
        self.assertFalse(any('restart' in call for call in commands.calls))
        self.assertEqual(commands.timer, ('active', 'waiting'))
        commands.calls.clear()
        again = self.apply(commands)
        self.assertEqual(again['reload'], 'already-applied')
        self.assertFalse(any('stop' in call for call in commands.calls))
        self.assert_no_start(commands)

    def test_pending_receipt_resumes_reload_after_prior_stop_failure(self):
        commands = Commands()
        commands.proof_valid = False
        with self.assertRaises(branding.BrandingError):
            self.apply(commands)
        commands.state, commands.pid, commands.proof_valid = 'active', 321, True
        self.assertEqual(self.apply(commands)['reload'], 'reloaded')


if __name__ == '__main__':
    unittest.main()
