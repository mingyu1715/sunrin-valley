import base64
import io
from pathlib import Path
import tarfile
import tempfile
import json
import subprocess
import unittest
from unittest.mock import patch

import infrastructure as infra


class InfrastructureTests(unittest.TestCase):
    def test_modern_bootstrap_carries_bounded_flat_overlay_payload(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, content in {"bootstrap.sh": b"script", "host.py": b"host", "server-icon.png": b"png", "pack-lock.json": b'{"ownedOverlay":{"filename":"Sunrin-Server-Overlay.zip"}}', "Sunrin-Server-Overlay.zip": b"overlay"}.items():
                (root / name).write_bytes(content)
            with patch.object(infra, "HERE", root):
                encoded = infra.bootstrap_payload()
                command = infra.bootstrap_command([], 60)
            with tarfile.open(fileobj=io.BytesIO(base64.b64decode(encoded)), mode="r:gz") as archive:
                self.assertEqual(set(archive.getnames()), {"bootstrap.sh", "host.py", "pack-lock.json", "server-icon.png", "Sunrin-Server-Overlay.zip"})
            self.assertLessEqual(len(encoded), 45000)
            self.assertIn("Sunrin-Server-Overlay.zip", command)
            with patch.object(infra, "bootstrap_payload", return_value="x" * 45001):
                with self.assertRaisesRegex(RuntimeError, "bounded"):
                    infra.bootstrap_command([], 60)

    def test_downloaded_overlay_bootstrap_omits_zip_and_stays_bounded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, content in {"bootstrap.sh": b"script", "host.py": b"host", "server-icon.png": b"png", "pack-lock.json": b'{"ownedOverlay":{"filename":"Sunrin-Server-Overlay.zip","delivery":"download"}}'}.items():
                (root / name).write_bytes(content)
            with patch.object(infra, "HERE", root):
                encoded = infra.bootstrap_payload()
            with tarfile.open(fileobj=io.BytesIO(base64.b64decode(encoded)), mode="r:gz") as archive:
                self.assertEqual(set(archive.getnames()), {"bootstrap.sh", "host.py", "pack-lock.json", "server-icon.png"})

    def test_template_pins_requested_machine_and_limits_network(self):
        template = infra.build_template('vpc-test', 'subnet-test', 'ami-test')
        resources = template['Resources']
        instance = resources['Server']['Properties']
        self.assertEqual(instance['InstanceType'], 'm7i.xlarge')
        self.assertEqual(instance['MetadataOptions']['HttpTokens'], 'required')
        self.assertEqual(instance['InstanceInitiatedShutdownBehavior'], 'stop')
        volume = instance['BlockDeviceMappings'][0]['Ebs']
        self.assertEqual((volume['VolumeType'], volume['VolumeSize'], volume['Encrypted']), ('gp3', 100, True))
        self.assertNotIn('Throughput', volume)  # EC2 Instance Ebs differs from LaunchTemplate Ebs.
        ingress = resources['GameSecurityGroup']['Properties']['SecurityGroupIngress']
        self.assertEqual({(rule['IpProtocol'], rule['FromPort'], rule['ToPort']) for rule in ingress}, {('tcp', 25565, 25565), ('udp', 24454, 24454)})
        self.assertFalse(instance['NetworkInterfaces'][0]['AssociatePublicIpAddress'])
        self.assertEqual(sum(resource['Type'] == 'AWS::EC2::EIP' for resource in resources.values()), 1)
        self.assertEqual(resources['AddressAssociation']['Properties']['InstanceId'], {'Ref': 'Server'})
        self.assertFalse(any(resource['Type'] == 'AWS::EC2::NatGateway' for resource in resources.values()))

    def fake_api(self, output, status='Success', owned=True):
        calls = []

        def api(args, **kwargs):
            calls.append(args)
            action = args[:2]
            if action == ['ec2', 'describe-instances']:
                tags = {'Project': 'SunrinValley' if owned else 'Other', 'ManagedBy': 'SunrinValleyServerTools', 'Name': infra.STACK,
                        'aws:cloudformation:stack-name': infra.STACK, 'aws:cloudformation:logical-id': 'Server'}
                return {'Reservations': [{'Instances': [{'InstanceId': 'i-test', 'State': {'Name': 'running'}, 'Tags': [{'Key': k, 'Value': v} for k, v in tags.items()]}]}]}
            if action == ['ssm', 'send-command']:
                return {'Command': {'CommandId': 'command-test'}}
            if action == ['ssm', 'get-command-invocation']:
                request = next(call for call in calls if call[:2] == ['ssm', 'send-command'])
                params = json.loads(request[request.index('--parameters') + 1])
                request_id = params['commands'][0].split('--request-id ')[1].split()[0]
                body = dict(output, requestId=request_id) if isinstance(output, dict) else output
                return {'Status': status, 'StandardOutputContent': json.dumps(body), 'StandardErrorContent': ''}
            if action == ['ec2', 'stop-instances']:
                return {'StoppingInstances': [{'InstanceId': 'i-test'}]}
            raise AssertionError(args)

        return api, calls

    def test_stop_requires_clean_stop_proof_before_ec2_stop(self):
        api, calls = self.fake_api({'ok': True, 'status': 'stopped', 'cleanStop': True})
        result = infra.stop_server(api, 'i-test')
        self.assertTrue(result['stopping'])
        self.assertEqual(calls[-1][:2], ['ec2', 'stop-instances'])

    def test_failed_or_unproven_save_never_stops_ec2(self):
        for output, status in [({'ok': False}, 'Success'), ({'ok': True, 'status': 'stopped', 'cleanStop': False}, 'Success'), ('unexpected output', 'Success'), ({}, 'Failed')]:
            with self.subTest(output=output, status=status):
                api, calls = self.fake_api(output, status)
                with self.assertRaises(RuntimeError):
                    infra.stop_server(api, 'i-test')
                self.assertFalse(any(call[:2] == ['ec2', 'stop-instances'] for call in calls))

    def test_unowned_server_receives_no_remote_command(self):
        api, calls = self.fake_api({}, owned=False)
        with self.assertRaises(RuntimeError):
            infra.stop_server(api, 'i-test')
        self.assertEqual(len(calls), 1)

    def test_deploy_requires_cost_and_eula_flags(self):
        with patch.object(infra, 'AwsCli') as api:
            with self.assertRaises(SystemExit):
                infra.main(['deploy'])
            api.assert_not_called()

    def test_project_tag_alone_cannot_authorize_another_server(self):
        def api(args):
            return {'Reservations': [{'Instances': [{'InstanceId': 'i-other', 'Tags': [{'Key': 'Project', 'Value': 'SunrinValley'}]}]}]}
        with self.assertRaises(RuntimeError):
            infra.owned_instance(api, 'i-other')

    def test_initial_guard_is_armed_before_package_installation(self):
        script = infra.build_template('vpc', 'subnet', 'ami')['Resources']['Server']['Properties']['UserData']['Fn::Base64']
        self.assertLess(script.index('enable --now sunrin-bootstrap-deadline.timer'), script.index('apt-get'))
        self.assertIn('OnActiveSec=60min', script)
        self.assertIn('cleanStop', script)
        self.assertIn('first-start-attempted', script)
        self.assertIn('LoadState', script)

    def test_missing_ssm_before_bootstrap_stops_only_fresh_owned_base_instance(self):
        api, calls = self.fake_api({})
        with patch.object(infra, 'wait_for_ssm', side_effect=RuntimeError('SSM unavailable')):
            with self.assertRaises(RuntimeError):
                infra.bootstrap_instance(api, 'i-test', 'fixed bootstrap')
        self.assertEqual(calls[-1][:2], ['ec2', 'stop-instances'])
        self.assertFalse(any(call[:2] == ['ssm', 'send-command'] for call in calls))

    def run_initial_guard(self, started, host=True, clean=True):
        script = infra.build_template('vpc', 'subnet', 'ami')['Resources']['Server']['Properties']['UserData']['Fn::Base64']
        guard = script.split("<<'SUNRIN_GUARD'\n", 1)[1].split('\nSUNRIN_GUARD\n', 1)[0]
        calls = []

        def exists(path):
            return {'/var/lib/sunrin/operational-ready': False,
                    '/var/lib/sunrin/first-start-attempted': started,
                    '/usr/local/lib/sunrin/host.py': host}.get(str(path), False)

        def run(args, **kwargs):
            calls.append(args)
            if args[0] == 'systemctl':
                return subprocess.CompletedProcess(args, 0, 'LoadState=not-found\nMainPID=0\n', '')
            if args[0] == '/usr/bin/python3':
                if not started:
                    raise AssertionError('Partial install must not ask a missing service for stop proof')
                request = args[args.index('--request-id') + 1]
                return subprocess.CompletedProcess(args, 0, json.dumps({'ok': clean, 'cleanStop': clean, 'requestId': request}), '')
            return subprocess.CompletedProcess(args, 0, '', '')

        with patch('pathlib.Path.exists', exists), patch('subprocess.run', run):
            if started and not clean:
                with self.assertRaises(SystemExit):
                    exec(guard, {})
            else:
                exec(guard, {})
        return calls

    def test_partial_host_install_without_unit_can_still_shut_down(self):
        calls = self.run_initial_guard(started=False, host=True)
        self.assertEqual(calls[-1], ['/usr/sbin/shutdown', '-h', 'now'])

    def test_started_server_without_clean_proof_is_never_powered_off(self):
        calls = self.run_initial_guard(started=True, host=True, clean=False)
        self.assertFalse(any(call[0] == '/usr/sbin/shutdown' for call in calls))

    def test_branding_queue_does_not_start_a_stopped_instance(self):
        calls = []
        base, _ = self.fake_api({})

        def api(args):
            calls.append(args)
            if args[:2] == ['ssm', 'list-commands']:
                return {'Commands': []}
            if args[:2] == ['ssm', 'send-command']:
                self.assertEqual(args[args.index('--timeout-seconds') + 1], '2592000')
                params = json.loads(args[args.index('--parameters') + 1])
                self.assertEqual(params['executionTimeout'], ['2400'])
                self.assertIn('branding.py --icon', params['commands'][0])
                return {'Command': {'CommandId': 'branding-test', 'ExpiresAfter': 'future'}}
            return base(args)

        result = infra.queue_branding(api, 'i-test')
        self.assertFalse(result['instanceStarted'])
        self.assertFalse(any(args[:2] in (['ec2', 'start-instances'], ['ec2', 'run-instances']) for args in calls))

    def test_identical_pending_branding_is_reused(self):
        sent = []
        base, _ = self.fake_api({})

        def api(args):
            if args[:2] == ['ssm', 'list-commands']:
                return {'Commands': sent}
            if args[:2] == ['ssm', 'send-command']:
                sent.append({'Comment': args[args.index('--comment') + 1], 'Status': 'Pending', 'CommandId': 'one'})
                return {'Command': {'CommandId': 'one'}}
            return base(args)

        infra.queue_branding(api, 'i-test')
        result = infra.queue_branding(api, 'i-test')
        self.assertEqual(result['status'], 'already-queued')
        self.assertEqual(len(sent), 1)


if __name__ == '__main__':
    unittest.main()
