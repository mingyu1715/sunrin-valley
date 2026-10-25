# Prepared server updates

This directory prepares an operator-controlled updater; there is no provisioned server or server connection. Python 3.10+ and the standard library are sufficient. The checked-in configuration is disabled and every service hook is empty.

```sh
python3 server-ops/updater.py --plan
python3 -m unittest discover -s server-ops/tests -p 'test_*.py'
```

`--plan` only reads configuration, schedule, and an existing journal. It requires neither a server nor release files, runs no hooks, performs no network requests, and writes nothing. Its release-presence field is informational; archive integrity checks happen before executing an update. `--execute` rejects disabled configuration, missing/unresolvable hooks, unsafe owned paths, and absent server directories before creating any state.

## Operator configuration

Copy `config.example.json` and `schedule.example.json` to the ignored `config.local.json` and `schedule.local.json`. Paths resolve against the configuration file, except release archive/client descriptor paths, which resolve against the release manifest. Configure actual paths and adapters, then enable only the operator copy. The server and state directories must be separate and cannot contain one another.

The schedule requires a safe `targetVersion` and ISO 8601 `applyAt` with an explicit timezone, such as `2030-01-01T04:00:00+09:00`. Run the process before the earliest announcement and keep it alive through the update; no host scheduler is installed. Missed announcements are skipped, with an immediate remaining-time notice when starting inside the final warning window. A past timestamp begins immediately.

```sh
python3 server-ops/updater.py --config server-ops/config.local.json --schedule server-ops/schedule.local.json --plan
# Only after a server and working adapters have been provisioned:
python3 server-ops/updater.py --config server-ops/config.local.json --schedule server-ops/schedule.local.json --execute
```

Each hook is a nonempty argv array. Commands run with `shell=False`, inherited environment, the server directory as their working directory, discarded output, and a timeout. Shell executables and unknown placeholders are rejected. Put credentials only in environment variables read by the adapter; never put them in JSON or command arguments. The runner implements no RCON protocol, authentication, Git transport, or service-manager integration.

| Hook | Required success contract |
| --- | --- |
| `announce` | Deliver `{message}` to connected players. |
| `save` | Freeze admissions/world writes as needed, issue `save-off`, then `save-all flush`, and confirm the flush completed. Leave saves frozen during backup. A partially failed save still triggers `resumeSaves`. |
| `resumeSaves` | Idempotently restore normal saves (`save-on`) and any admission controls. |
| `stop` | Idempotently stop the service and confirm the process has exited before returning. |
| `start` | Start the configured service. Its normal startup must enable saving. |
| `health` | Return zero only when the actual server/world is ready; failures retry within the bounded health deadline. |
| `publishStatus` | Atomically publish the operating descriptor; return nonzero if publication fails. |

Arguments support only `{state}`, `{message}`, `{activeVersion}`, `{targetVersion}`, `{startsAt}`, and `{clientRelease}`. The last value names a verified local snapshot of the target client channel descriptor. An example publication command, after deployment paths are known:

```json
["python3", "/srv/sunrin-release-repo/build-scripts/set-operation.py",
 "--root", "/srv/sunrin-release-repo",
 "--client-release", "{clientRelease}", "--state", "{state}",
 "--active-version", "{activeVersion}", "--target-version", "{targetVersion}",
 "--starts-at", "{startsAt}", "--message", "{message}"]
```

That helper updates local channel files. An operator may supply an executable wrapper that also commits/publishes them using environment-provided credentials. The updater never assumes a local Git write has reached clients. Scheduled/maintenance publications retain the old active release. Only healthy target startup permits an online publication with the target active version. A successful rollback publishes the original online release; incomplete recovery publishes `failed` with the original release still selected.

## Independent server release

`releases/{version}/server-release.json` describes an independently assembled and tested **server** ZIP, its SHA-256, the matching published client channel JSON, and the exact managed allowlist. The checked-in `0.2.0` file is a template: its zero checksum and missing archive/descriptor deliberately cannot execute. Replace these with real artifacts in an operator deployment. The client pack manifest contains client-only mods and must not be used as the server artifact.

`managedPaths` contains explicit top-level file/directory names and must match configuration exactly. A managed directory is wholly owned by the release; obsolete contents are removed. Archive members must be inside these roots. Traversal, absolute/Windows-unsafe names, symlinks/special files, duplicate/case-colliding paths, file/directory collisions, encrypted entries, bad ZIP data, oversized extraction, and bad hashes fail before announcements or service commands. The archive and client descriptor are copied into the private run directory before any hook.

Worlds, config/defaultconfigs, accounts, access/ban lists, server properties, permissions, logs, and other built-in persistent paths cannot be managed. Add every custom world/persistent top-level name to `protectedPaths`. Symlinks and special files inside the server tree are rejected. Files outside the managed/persistent restore roots are never deleted or overwritten by rollback.

Execution order is: stage and verify → scheduled notices → maintenance → freeze/flush saves → snapshot the **entire** server directory → stop → apply managed roots → start → bounded health check → publish healthy release. The snapshot stays frozen until stop; any earlier abort resumes saving and checks original health. An update/start/health/publication failure stops the failed target, validates snapshot integrity, restores old managed and persistent roots, starts the original, resumes saving, and checks health. It never restores files while a stop hook reports failure.

## Journals and interruption recovery

`stateDirectory/journal.json` is atomically replaced and synced at each transition. Each retained `runs/<id>/` contains its journal, verified archive/client descriptor, staged files, full backup, and a SHA-256 snapshot index. Events store state and hook names, never hook argv, output, or environment. Backups can contain private server data; keep state access restricted and manage retention/disk capacity deliberately. No backup is automatically removed. A completed journal is authoritative for the active version after the initial bootstrap configuration.

An OS file lock prevents concurrent execution and releases when a process exits. The lock file remains intentionally; do not delete it to bypass a running updater. A crash/interrupt leaves a nonterminal journal and blocks normal execution. Recovery never continues applying the target:

```sh
python3 server-ops/updater.py --config server-ops/config.local.json --schedule server-ops/schedule.local.json --recover --plan
python3 server-ops/updater.py --config server-ops/config.local.json --schedule server-ops/schedule.local.json --recover --execute
```

Inspect the plan/journal and retain the same server/managed/protected configuration. Before stop, recovery resumes saves and restores original status; after a possible stop, it stops again and restores the validated snapshot. Missing/corrupt backups or failed stop/start/health leave `recovery_failed` and require operator repair; the runner does not force deletion or claim the server is healthy. If journal storage fails during an abort, safety commands still run; repair storage and repeat explicit recovery to establish a durable terminal journal. Do not hand-edit or discard an unfinished journal.

Tests use only temporary local files and disposable command adapters. They cover scheduling, no-write plans, execution guards, archive checks, success ordering, promotion timing, rollback, frozen-save aborts, locks, crash recovery, corrupt snapshots, bounded health, and journal disk failure. No real Minecraft server has been tested.
