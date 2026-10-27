"""AWS CLI based test-server deployment. Planning is read-only; deploy requires explicit flags."""
import argparse
import base64
import io
import json
import re
import shlex
import subprocess
import tarfile
import time
import uuid
from pathlib import Path

REGION = 'ap-northeast-2'
STACK = 'sunrin-valley-test'
PROJECT = 'SunrinValley'
AMI_PARAMETER = '/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id'
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]


class AwsCli:
    def __init__(self, profile='sunrin-valley', region=REGION):
        self.profile, self.region = profile, region

    def __call__(self, args, region=None):
        result = subprocess.run(['aws', '--profile', self.profile, '--region', region or self.region,
                                 '--no-cli-pager', '--output', 'json', *args], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stderr.strip() or 'AWS request failed')
        return json.loads(result.stdout) if result.stdout.strip() else {}


def build_template(vpc, subnet, image, test_minutes=60):
    guard = '''
install -d -m 0755 /usr/local/lib/sunrin
install -d -m 0700 /var/lib/sunrin
cat > /usr/local/lib/sunrin/bootstrap-deadline.py <<'SUNRIN_GUARD'
import json,pathlib,subprocess,uuid
if pathlib.Path('/var/lib/sunrin/operational-ready').exists():
 raise SystemExit(0)
helper=pathlib.Path('/usr/local/lib/sunrin/host.py')
started=pathlib.Path('/var/lib/sunrin/first-start-attempted').exists()
unit=subprocess.run(['systemctl','show','sunrin-minecraft.service','--property=LoadState,MainPID'],capture_output=True,text=True,check=False)
fields=dict(line.split('=',1) for line in unit.stdout.splitlines() if '=' in line)
if not started and fields.get('MainPID','0') == '0' and fields.get('LoadState','not-found') in ('not-found','loaded'):
 pass  # A partial installer may have copied host.py without ever installing or starting Minecraft.
elif helper.exists():
 request=str(uuid.uuid4())
 result=subprocess.run(['/usr/bin/python3',str(helper),'stop','--request-id',request,'--timeout','180'],capture_output=True,text=True,timeout=240,check=True)
 proof=json.loads(result.stdout)
 if not (proof.get('ok') is True and proof.get('cleanStop') is True and proof.get('requestId')==request):
  raise SystemExit('No clean stop proof; retry instead of powering off')
else:
 raise SystemExit('Minecraft may have started; require clean proof before power off')
subprocess.run(['/usr/sbin/shutdown','-h','now'],check=True)
SUNRIN_GUARD
chmod 0700 /usr/local/lib/sunrin/bootstrap-deadline.py
cat > /etc/systemd/system/sunrin-bootstrap-deadline.service <<'SUNRIN_GUARD_UNIT'
[Unit]
Description=Stop an incomplete Sunrin test bootstrap safely
ConditionPathExists=!/var/lib/sunrin/operational-ready
StartLimitIntervalSec=0
[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /usr/local/lib/sunrin/bootstrap-deadline.py
TimeoutStartSec=300
Restart=on-failure
RestartSec=30
SUNRIN_GUARD_UNIT
cat > /etc/systemd/system/sunrin-bootstrap-deadline.timer <<'SUNRIN_GUARD_TIMER'
[Unit]
Description=Initial Sunrin bootstrap cost guard
[Timer]
OnActiveSec=MINUTESmin
Unit=sunrin-bootstrap-deadline.service
[Install]
WantedBy=timers.target
SUNRIN_GUARD_TIMER
systemctl daemon-reload
systemctl enable --now sunrin-bootstrap-deadline.timer
'''.replace('MINUTES', str(test_minutes)) if test_minutes else ''
    user_data = '''#!/bin/bash
set -euo pipefail
''' + guard + '''export DEBIAN_FRONTEND=noninteractive
for attempt in 1 2 3 4 5 6; do
 apt-get -o Acquire::Retries=3 update && break
 sleep 10
done
apt-get -o Acquire::Retries=5 install -y openjdk-17-jre-headless python3 curl unzip ca-certificates nftables
id sunrin >/dev/null 2>&1 || useradd --system --create-home --home-dir /srv/sunrin --shell /usr/sbin/nologin sunrin
install -d -m 0750 -o sunrin -g sunrin /srv/sunrin
install -d -m 0700 /var/lib/sunrin
install -d -m 0700 /opt/sunrin/bootstrap
if systemctl cat snap.amazon-ssm-agent.amazon-ssm-agent.service >/dev/null 2>&1; then
 systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service
else
 systemctl enable --now amazon-ssm-agent.service
fi
touch /var/lib/sunrin/base-ready
'''
    tags = [{'Key': 'Project', 'Value': PROJECT}, {'Key': 'Name', 'Value': STACK},
            {'Key': 'ManagedBy', 'Value': 'SunrinValleyServerTools'}]
    return {
        'AWSTemplateFormatVersion': '2010-09-09',
        'Description': 'Sunrin Valley test server: m7i.xlarge, encrypted gp3 100GB, SSM administration',
        'Resources': {
            'PublicAddress': {'Type': 'AWS::EC2::EIP', 'Properties': {'Domain': 'vpc', 'Tags': tags}},
            'AddressAssociation': {'Type': 'AWS::EC2::EIPAssociation', 'Properties': {
                'AllocationId': {'Fn::GetAtt': ['PublicAddress', 'AllocationId']}, 'InstanceId': {'Ref': 'Server'}}},
            'GameSecurityGroup': {'Type': 'AWS::EC2::SecurityGroup', 'Properties': {
                'GroupDescription': 'Minecraft and voice only; management via SSM', 'VpcId': vpc, 'Tags': tags,
                'SecurityGroupIngress': [{'IpProtocol': protocol, 'FromPort': port, 'ToPort': port, 'CidrIp': '0.0.0.0/0'}
                                         for protocol, port in [('tcp', 25565), ('udp', 24454)]]}},
            'ServerRole': {'Type': 'AWS::IAM::Role', 'Properties': {
                'AssumeRolePolicyDocument': {'Version': '2012-10-17', 'Statement': [{
                    'Effect': 'Allow', 'Principal': {'Service': 'ec2.amazonaws.com'}, 'Action': 'sts:AssumeRole'}]},
                'ManagedPolicyArns': ['arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'], 'Tags': tags}},
            'ServerProfile': {'Type': 'AWS::IAM::InstanceProfile', 'Properties': {'Roles': [{'Ref': 'ServerRole'}]}},
            'Server': {'Type': 'AWS::EC2::Instance', 'Properties': {
                'InstanceType': 'm7i.xlarge', 'ImageId': image,
                'IamInstanceProfile': {'Ref': 'ServerProfile'}, 'Tags': tags,
                'InstanceInitiatedShutdownBehavior': 'stop',
                'MetadataOptions': {'HttpTokens': 'required', 'HttpEndpoint': 'enabled', 'HttpPutResponseHopLimit': 1},
                'BlockDeviceMappings': [{'DeviceName': '/dev/sda1', 'Ebs': {
                    'VolumeType': 'gp3', 'VolumeSize': 100, 'Iops': 3000,
                    'Encrypted': True, 'DeleteOnTermination': True}}],
                'NetworkInterfaces': [{'DeviceIndex': '0', 'SubnetId': subnet, 'AssociatePublicIpAddress': False,
                                       'GroupSet': [{'Ref': 'GameSecurityGroup'}]}],
                'UserData': {'Fn::Base64': user_data}}}},
        'Outputs': {'InstanceId': {'Value': {'Ref': 'Server'}},
                    'PublicIp': {'Value': {'Ref': 'PublicAddress'}}}}


def plan(api, test_minutes=60):
    vpcs = api(['ec2', 'describe-vpcs', '--filters', 'Name=is-default,Values=true'])['Vpcs']
    if len(vpcs) != 1:
        raise RuntimeError('A single default VPC is required; no network will be created automatically')
    vpc = vpcs[0]['VpcId']
    subnets = api(['ec2', 'describe-subnets', '--filters', f'Name=vpc-id,Values={vpc}',
                   'Name=default-for-az,Values=true'])['Subnets']
    offers = api(['ec2', 'describe-instance-type-offerings', '--location-type', 'availability-zone',
                  '--filters', 'Name=instance-type,Values=m7i.xlarge'])['InstanceTypeOfferings']
    zones = {offer['Location'] for offer in offers}
    choices = sorted((s for s in subnets if s['AvailabilityZone'] in zones and s['AvailableIpAddressCount'] > 0),
                     key=lambda item: (item['AvailabilityZone'], item['SubnetId']))
    if not choices:
        raise RuntimeError('No suitable default public subnet supports m7i.xlarge')
    image = api(['ssm', 'get-parameter', '--name', AMI_PARAMETER])['Parameter']['Value']
    images = api(['ec2', 'describe-images', '--image-ids', image])['Images']
    if len(images) != 1 or images[0]['OwnerId'] != '099720109477' or images[0]['Architecture'] != 'x86_64' or images[0]['State'] != 'available':
        raise RuntimeError('Expected an available Canonical Ubuntu x86_64 image')
    return build_template(vpc, choices[0]['SubnetId'], image, test_minutes)


def instance_id(api):
    stack = api(['cloudformation', 'describe-stacks', '--stack-name', STACK])['Stacks'][0]
    return next(output['OutputValue'] for output in stack['Outputs'] if output['OutputKey'] == 'InstanceId')


def owned_instance(api, instance):
    rows = api(['ec2', 'describe-instances', '--instance-ids', instance])['Reservations']
    items = [item for row in rows for item in row['Instances']]
    expected = {'Project': PROJECT, 'ManagedBy': 'SunrinValleyServerTools', 'Name': STACK,
                'aws:cloudformation:stack-name': STACK, 'aws:cloudformation:logical-id': 'Server'}
    tags = {tag['Key']: tag['Value'] for tag in items[0].get('Tags', [])} if len(items) == 1 else {}
    if len(items) != 1 or any(tags.get(key) != value for key, value in expected.items()):
        raise RuntimeError('Refusing to operate on an instance outside Sunrin Valley')
    return items[0]


def wait_ssm(api, instance, command_id, timeout=600):
    deadline, previous = time.monotonic() + timeout, None
    while time.monotonic() < deadline:
        try:
            result = api(['ssm', 'get-command-invocation', '--command-id', command_id, '--instance-id', instance])
        except RuntimeError as error:
            if 'InvocationDoesNotExist' not in str(error):
                raise
            time.sleep(3)
            continue
        status = result['Status']
        if status == 'Success':
            return result
        if status in ('Cancelled', 'TimedOut', 'Failed', 'Cancelling'):
            raise RuntimeError(f'SSM command did not succeed: {status}')
        if status != previous:
            print(json.dumps({'ssmStatus': status}), flush=True)
            previous = status
        time.sleep(3)
    raise RuntimeError('SSM command timed out; no EC2 stop was performed')


def send_command(api, instance, command, timeout=600):
    result = api(['ssm', 'send-command', '--document-name', 'AWS-RunShellScript', '--instance-ids', instance,
                  '--timeout-seconds', '600', '--parameters', json.dumps({'commands': [command], 'executionTimeout': [str(timeout)]})])
    return wait_ssm(api, instance, result['Command']['CommandId'], timeout + 30)


def stop_server(api, instance):
    current = owned_instance(api, instance)
    if current['State']['Name'] in ('stopped', 'stopping'):
        return {'instance': instance, 'stopping': True, 'alreadyStopped': True}
    request_id = str(uuid.uuid4())
    result = send_command(api, instance, f'python3 /usr/local/lib/sunrin/host.py stop --request-id {request_id} --timeout 180', 240)
    try:
        proof = json.loads(result.get('StandardOutputContent', ''))
    except (TypeError, json.JSONDecodeError) as error:
        raise RuntimeError('Missing clean Minecraft stop proof; EC2 remains running') from error
    if not isinstance(proof, dict) or proof.get('ok') is not True or proof.get('status') != 'stopped' or proof.get('cleanStop') is not True or proof.get('requestId') != request_id:
        raise RuntimeError('Minecraft save/stop was not confirmed; EC2 remains running')
    api(['ec2', 'stop-instances', '--instance-ids', instance])
    return {'instance': instance, 'stopping': True, 'cleanStop': True}


def wait_for_ssm(api, instance, timeout=600):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        items = api(['ssm', 'describe-instance-information', '--filters', f'Key=InstanceIds,Values={instance}'])['InstanceInformationList']
        if any(item['PingStatus'] == 'Online' for item in items):
            return
        time.sleep(5)
    raise RuntimeError('SSM agent has not become available')


def bootstrap_instance(api, instance, command):
    owned_instance(api, instance)
    try:
        wait_for_ssm(api, instance)
    except RuntimeError:
        # Only a fresh canonical base image has run at this point; Minecraft was never delivered.
        # Stop this owned base instance even if a broken boot never armed the guest deadline timer.
        owned_instance(api, instance)
        api(['ec2', 'stop-instances', '--instance-ids', instance])
        raise
    try:
        send_command(api, instance, command, 3600)
    except RuntimeError:
        # After delivery, never power off without Minecraft's clean proof.
        try:
            stop_server(api, instance)
        except RuntimeError:
            print(json.dumps({'instance': instance, 'needsAttention': True,
                              'message': 'Bootstrap failed; clean stop unavailable. Initial guest deadline remains armed.'}), flush=True)
        raise


def bootstrap_payload():
    entries = {name: HERE / name for name in ('bootstrap.sh', 'host.py', 'pack-lock.json', 'server-icon.png')}
    lock = json.loads((HERE / 'pack-lock.json').read_text())
    if 'ownedOverlay' in lock:
        if lock['ownedOverlay'].get('filename') != 'Sunrin-Server-Overlay.zip':
            raise RuntimeError('Unexpected bootstrap overlay identity')
        if lock['ownedOverlay'].get('delivery') != 'download':
            entries['Sunrin-Server-Overlay.zip'] = HERE / 'Sunrin-Server-Overlay.zip'
    else:
        entries['sunrin_items.js'] = REPO / 'kubejs-custom/startup_scripts/sunrin_items.js'
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w:gz') as archive:
        for name, path in entries.items():
            if not path.is_file() or path.is_symlink():
                raise RuntimeError(f'Missing regular bootstrap source: {name}')
            archive.add(path, arcname=name, recursive=False)
    return base64.b64encode(buffer.getvalue()).decode('ascii')


def queue_branding(api, instance):
    """Queue a bounded one-off change for the next agent connection, without starting EC2."""
    import hashlib
    owned_instance(api, instance)
    paths = [HERE / 'branding.py', HERE / 'server-icon.png']
    if any(not path.is_file() or path.is_symlink() for path in paths):
        raise RuntimeError('Branding sources must be regular files')
    digest = hashlib.sha256(b''.join(path.read_bytes() for path in paths)).hexdigest()
    comment = 'Sunrin server icon ' + digest[:24]
    existing = api(['ssm', 'list-commands', '--instance-id', instance]).get('Commands', [])
    for row in existing:
        if row.get('Comment') == comment and row.get('Status') in ('Pending', 'InProgress', 'Delayed'):
            return {'status': 'already-queued', 'commandId': row['CommandId'], 'expiresAfter': row.get('ExpiresAfter'), 'instanceStarted': False}
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w:gz') as archive:
        for path in paths:
            archive.add(path, arcname=path.name, recursive=False)
    payload = base64.b64encode(buffer.getvalue()).decode('ascii')
    if len(payload) > 45000:
        raise RuntimeError('Branding payload exceeds the bounded SSM size')
    command = f'''set -eu
install -d -m 0700 /opt/sunrin/branding
python3 - <<'SUNRIN_BRANDING'
import base64,hashlib,io,pathlib,tarfile
data=base64.b64decode('{payload}',validate=True)
with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
 assert set(archive.getnames()) == {{'branding.py','server-icon.png'}}
 assert all(member.isfile() and '/' not in member.name for member in archive.getmembers())
 archive.extractall('/opt/sunrin/branding',filter='data')
assert hashlib.sha256(b''.join((pathlib.Path('/opt/sunrin/branding')/name).read_bytes() for name in ('branding.py','server-icon.png'))).hexdigest() == '{digest}'
SUNRIN_BRANDING
python3 /opt/sunrin/branding/branding.py --icon /opt/sunrin/branding/server-icon.png
'''
    result = api(['ssm', 'send-command', '--document-name', 'AWS-RunShellScript', '--instance-ids', instance,
                  '--comment', comment, '--timeout-seconds', '2592000',
                  '--parameters', json.dumps({'commands': [command], 'executionTimeout': ['2400']})])['Command']
    return {'status': 'queued', 'commandId': result['CommandId'], 'expiresAfter': result.get('ExpiresAfter'), 'instanceStarted': False}


def bootstrap_command(names, minutes):
    payload = bootstrap_payload()
    if len(payload) > 45000:
        raise RuntimeError('Bootstrap exceeds the bounded SSM payload size')
    options = ['--accept-eula', '--test-minutes', str(minutes)]
    for name in names:
        options.extend(['--whitelist', name])
    return f'''set -eu
cloud-init status --wait >/dev/null
test -f /var/lib/sunrin/base-ready
install -d -m 0700 /opt/sunrin/bootstrap
cat > /opt/sunrin/bootstrap/payload.b64 <<'SUNRIN_PAYLOAD'
{payload}
SUNRIN_PAYLOAD
python3 - <<'SUNRIN_UNPACK'
import base64,io,tarfile
data=base64.b64decode(open('/opt/sunrin/bootstrap/payload.b64','rb').read().strip(),validate=True)
with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as a:
 names=set(a.getnames())
 assert names in ({{'bootstrap.sh','host.py','pack-lock.json','sunrin_items.js','server-icon.png'}}, {{'bootstrap.sh','host.py','pack-lock.json','Sunrin-Server-Overlay.zip','server-icon.png'}}, {{'bootstrap.sh','host.py','pack-lock.json','server-icon.png'}})
 assert len(a.getmembers()) == len(names)
 assert all(m.isfile() and '/' not in m.name for m in a.getmembers())
 a.extractall('/opt/sunrin/bootstrap',filter='data')
SUNRIN_UNPACK
bash /opt/sunrin/bootstrap/bootstrap.sh {shlex.join(options)}
'''


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['plan', 'deploy', 'status', 'start', 'stop', 'queue-branding'])
    parser.add_argument('--profile', default='sunrin-valley')
    parser.add_argument('--confirm-cost', action='store_true')
    parser.add_argument('--accept-eula', action='store_true')
    parser.add_argument('--test-minutes', type=int, default=60)
    parser.add_argument('--whitelist', action='append', default=[])
    parser.add_argument('--template-out', type=Path)
    args = parser.parse_args(argv)
    if args.action == 'deploy' and not (args.confirm_cost and args.accept_eula):
        parser.error('deploy requires --confirm-cost and --accept-eula after user approval')
    if args.test_minutes != 0 and not 15 <= args.test_minutes <= 1440:
        parser.error('test-minutes must be 0 or between 15 and 1440')
    if any(not re.fullmatch(r'[A-Za-z0-9_]{3,16}', name) for name in args.whitelist):
        parser.error('Minecraft names must be 3..16 letters, digits or underscores')
    api = AwsCli(args.profile)
    if args.action in ('plan', 'deploy'):
        template = plan(api, args.test_minutes)
        if args.template_out:
            args.template_out.parent.mkdir(parents=True, exist_ok=True)
            args.template_out.write_text(json.dumps(template, indent=2) + '\n')
        summary = {'region': REGION, 'stack': STACK, 'instanceType': 'm7i.xlarge', 'ramGiB': 16,
                   'javaHeapGiB': 12, 'gp3GiB': 100, 'testAutoStopMinutes': args.test_minutes,
                   'elasticIp': True, 'stoppedHourlyIpv4Usd': '0.005',
                   'whitelist': args.whitelist, 'hourlyInstanceUsd': '0.2478', 'hourlyPublicIpv4Usd': '0.005',
                   'monthlyDiskUsd': '9.12', 'pricedOn': '2026-10-23', 'eula': 'https://www.minecraft.net/en-us/eula'}
        if args.action == 'plan':
            print(json.dumps(summary, indent=2))
            return
        # Validate and bound the payload before creating anything billable.
        command = bootstrap_command(args.whitelist, args.test_minutes)
        api(['cloudformation', 'create-stack', '--stack-name', STACK, '--template-body', json.dumps(template),
             '--capabilities', 'CAPABILITY_IAM', '--tags', 'Key=Project,Value=SunrinValley'])
        print(json.dumps({'stack': STACK, 'status': 'creating'}), flush=True)
        api(['cloudformation', 'wait', 'stack-create-complete', '--stack-name', STACK])
        instance = instance_id(api)
        owned_instance(api, instance)
        bootstrap_instance(api, instance, command)
        ready = send_command(api, instance, 'python3 /usr/local/lib/sunrin/host.py health', 60)
        health = json.loads(ready['StandardOutputContent'])
        if health.get('ok') is not True or health.get('status') != 'ready':
            raise RuntimeError('Forge readiness was not confirmed')
        send_command(api, instance, 'touch /var/lib/sunrin/operational-ready', 30)
        print(json.dumps({**summary, 'instance': instance, 'status': 'ready'}))
    else:
        instance = instance_id(api)
        current = owned_instance(api, instance)
        if args.action == 'queue-branding':
            print(json.dumps(queue_branding(api, instance)))
        elif args.action == 'stop':
            print(json.dumps(stop_server(api, instance)))
        elif args.action == 'start':
            api(['ec2', 'start-instances', '--instance-ids', instance])
            api(['ec2', 'wait', 'instance-running', '--instance-ids', instance])
            wait_for_ssm(api, instance)
            send_command(api, instance, 'systemctl start sunrin-minecraft.service', 600)
            ready = send_command(api, instance, 'python3 /usr/local/lib/sunrin/host.py health', 120)
            health = json.loads(ready['StandardOutputContent'])
            if health.get('ok') is not True:
                raise RuntimeError('Server start health was not confirmed')
            current = owned_instance(api, instance)
            print(json.dumps({'instance': instance, 'status': 'ready', 'address': current.get('PublicIpAddress')}))
        else:
            print(json.dumps({'instance': instance, 'state': current['State']['Name'],
                              'address': current.get('PublicIpAddress'), 'gamePort': 25565, 'voicePort': 24454}))


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, KeyError, ValueError, StopIteration) as error:
        raise SystemExit(f'Error: {error}')
