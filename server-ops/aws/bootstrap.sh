#!/usr/bin/env bash
# Versioned host installation only. This script makes no AWS API calls.
set -Eeuo pipefail
umask 077

fail() {
  printf '{"ok":false,"status":"failed","code":"%s"}\n' "$1"
  exit 1
}
trap 'fail bootstrap-step-failed' ERR

accept_eula=false
test_minutes=0
whitelist_names=()
while (( $# )); do
  case "$1" in
    --accept-eula) accept_eula=true; shift ;;
    --test-minutes)
      (( $# >= 2 )) || fail missing-test-minutes
      test_minutes=$2; shift 2 ;;
    --whitelist)
      (( $# >= 2 )) || fail missing-whitelist-name
      [[ $2 =~ ^[A-Za-z0-9_]{3,16}$ ]] || fail invalid-whitelist-name
      whitelist_names+=("$2"); shift 2 ;;
    *) fail unknown-bootstrap-argument ;;
  esac
done

[[ $accept_eula == true ]] || fail explicit-eula-consent-required
[[ $test_minutes =~ ^(0|[1-9][0-9]{0,3})$ ]] || fail invalid-test-minutes
if (( test_minutes != 0 && (test_minutes < 15 || test_minutes > 1440) )); then
  fail invalid-test-minutes
fi
(( EUID == 0 )) || fail bootstrap-requires-root
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || fail unsupported-host
for dependency in python3 java curl nft systemctl install chown; do
  command -v "$dependency" >/dev/null || fail missing-host-dependency
done
id sunrin >/dev/null 2>&1 || fail missing-service-user

payload_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
for payload_file in host.py pack-lock.json server-icon.png; do
  [[ -f "$payload_dir/$payload_file" && ! -L "$payload_dir/$payload_file" ]] || fail missing-bootstrap-payload
done

python3 - <<'PY'
import subprocess,sys
p=subprocess.run(['/usr/bin/java','-version'],capture_output=True,text=True)
sys.exit(0 if p.returncode == 0 and 'version "17.' in p.stderr+p.stdout else 1)
PY

install -d -m 0755 /usr/local/lib/sunrin
install -d -m 0700 /var/lib/sunrin
install -m 0644 "$payload_dir/host.py" /usr/local/lib/sunrin/host.py
python3 /usr/local/lib/sunrin/host.py install \
  --payload-dir "$payload_dir" --accept-eula
chown -R sunrin:sunrin /srv/sunrin/minecraft
chmod 0750 /srv/sunrin/minecraft
chmod 0600 /srv/sunrin/minecraft/server.properties
# Branding is own content; the original server pack lock remains unchanged.
install -o sunrin -g sunrin -m 0644 "$payload_dir/server-icon.png" /srv/sunrin/minecraft/server-icon.png

# Minecraft's RCON listener otherwise follows server-ip (the public game bind).
# A dedicated firewall table makes it accessible only through host loopback.
cat > /etc/sunrin/rcon.nft <<'NFT'
flush table inet sunrin_rcon
table inet sunrin_rcon {
  chain input {
    type filter hook input priority -5; policy accept;
    iifname != "lo" tcp dport 25575 drop
  }
}
NFT
chmod 0600 /etc/sunrin/rcon.nft
cat > /usr/local/lib/sunrin/rcon-firewall.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
/usr/sbin/nft list table inet sunrin_rcon >/dev/null 2>&1 || /usr/sbin/nft add table inet sunrin_rcon
/usr/sbin/nft -f /etc/sunrin/rcon.nft
SH
chmod 0700 /usr/local/lib/sunrin/rcon-firewall.sh
cat > /etc/systemd/system/sunrin-rcon-firewall.service <<'UNIT'
[Unit]
Description=Keep Sunrin Minecraft RCON on host loopback
Before=sunrin-minecraft.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/lib/sunrin/rcon-firewall.sh

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/sunrin-minecraft.service <<'UNIT'
[Unit]
Description=Sunrin Valley dedicated Forge server
Wants=network-online.target
After=network-online.target sunrin-rcon-firewall.service
Requires=sunrin-rcon-firewall.service
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=sunrin
Group=sunrin
WorkingDirectory=/srv/sunrin/minecraft
ExecStartPre=+/usr/bin/touch /var/lib/sunrin/first-start-attempted
ExecStart=/usr/bin/java @user_jvm_args.txt @libraries/net/minecraftforge/forge/1.20.1-47.4.0/unix_args.txt nogui
ExecStartPost=+/usr/bin/python3 /usr/local/lib/sunrin/host.py wait-ready --timeout 840
ExecStop=+/usr/bin/python3 /usr/local/lib/sunrin/host.py stop --timeout 180
TimeoutStartSec=900
TimeoutStopSec=210
Restart=on-failure
RestartSec=15
KillSignal=SIGINT
SendSIGKILL=no
UMask=0077
NoNewPrivileges=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=/srv/sunrin/minecraft /var/lib/sunrin /run/lock
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
UNIT

if (( test_minutes > 0 )); then
  cat > /etc/systemd/system/sunrin-test-stop.service <<'UNIT'
[Unit]
Description=Gracefully save Sunrin and stop the EC2 host after its test window
StartLimitIntervalSec=0

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /usr/local/lib/sunrin/host.py timed-stop --timeout 180
TimeoutStartSec=210
Restart=on-failure
RestartSec=30
UMask=0077
UNIT
  cat > /etc/systemd/system/sunrin-test-stop.timer <<UNIT
[Unit]
Description=Sunrin test limit (${test_minutes} minutes after readiness)

[Timer]
OnActiveSec=${test_minutes}min
AccuracySec=1s
Unit=sunrin-test-stop.service
RemainAfterElapse=yes
UNIT
  # Starting an already active timer does not extend the test window on a
  # Forge restart. Only the Minecraft boot service starts this timer.
  printf '\n[Service]\nExecStartPost=+/usr/bin/systemctl start sunrin-test-stop.timer\n' \
    >> /etc/systemd/system/sunrin-minecraft.service
else
  systemctl stop sunrin-test-stop.timer >/dev/null 2>&1 || true
fi

systemctl daemon-reload
systemctl enable sunrin-rcon-firewall.service sunrin-minecraft.service >/dev/null
systemctl start sunrin-rcon-firewall.service
systemctl start sunrin-minecraft.service
python3 /usr/local/lib/sunrin/host.py health
if (( test_minutes > 0 )); then
  # Also activates a newly requested limit on an already installed/running host.
  systemctl start sunrin-test-stop.timer
fi
for player_name in "${whitelist_names[@]}"; do
  python3 /usr/local/lib/sunrin/host.py whitelist --name "$player_name"
done
python3 - "$payload_dir/pack-lock.json" "$test_minutes" <<'PY'
import json,sys
lock=json.load(open(sys.argv[1]))
print(json.dumps({'ok':True,'status':'ready','unit':'sunrin-minecraft.service','modCount':lock['serverModCount'],'testMinutes':int(sys.argv[2])}))
PY
