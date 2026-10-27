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

`releases/{version}/server-release.json` describes an independently assembled and tested **server** ZIP, its SHA-256, the matching published client channel JSON, and the exact managed allowlist. The checked-in `0.2.0` candidate descriptor has generated real hashes and points to the prepared artifacts in ignored `release/server/0.2.0`. Those artifacts must be rebuilt and verified locally; the checked-in configuration remains disabled. The client pack manifest contains client-only mods and must not be used as the server artifact.

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

## Sunrin 0.2.0 local candidate

The candidate is prepared locally; its GitHub URLs name future versioned assets and are not publication evidence. Active channel files remain 0.1.4. After the final Core/resource build:

```sh
python3 build-scripts/pin-owned-artifact.py --refresh
python3 build-scripts/resolve-pack.py
python3 build-scripts/build-update.py --repo mingyu1715/sunrin-valley --min-launcher-version 1.1.3 --bundle-output release/bundled
python3 build-scripts/build-server-candidate.py --refresh-lock
```

The pin helper changes only the own-artifact pin in `sources.json`, using real local JAR bytes. It does not compile, publish or update channels. Release construction fails if those bytes differ from the pin. The client release copies Core beside manifest/overlay for eventual upload, and keeps mods out of the overlay. The bootstrap lock points to immutable-version Core, Beat Lamp and own server overlay downloads, and carries an exact hash/size/file list for `Sunrin-Server-Overlay.zip`. `infrastructure.py` retains the 45,000-character SSM payload bound. The complete embedded candidate exceeded that bound; bootstrap downloads the pinned overlay after publication. The own overlay and `server-pack-lock.json` are copied beside client release assets for upload. Bootstrap still refuses changed locks on an existing server.

`release/server/0.2.0/server-release.json` and the reviewable checked-in candidate descriptor use **`managedPaths: []`**. An operator copy of updater configuration must match this. `ownedFileMerge.files` names the exact Sunrin files; the archive must contain only these (or independently allowed managed roots). Each own file has a positive size and SHA256. World/playerdata, upstream scripts, unowned mods and KubeJS runtime config cannot be included. `.sunrin-owned-files.json` records ownership for subsequent changes. Only previously tracked retired files are removed; first-copy defaults are never retired automatically. Whole-directory KubeJS replacement is rejected.

For an existing 0.1.4 bootstrap installation without that receipt, the operator must explicitly supply `reviewedOwnershipMigration` in the local updater configuration. Its `lockSha256` must match `.sunrin-server-complete.json`, and `files` must contain reviewed exact prior descriptors (`path`, `size`, `sha256`, `mode`) for the old Sunrin startup script and StageBox 1.1.2 JAR. Use the actual marker/hash/size and historical `releases/0.1.4/pack-lock.json`; never substitute guessed bytes or automatically adopt files by prefix. The updater verifies all adopted files before hooks and snapshots them before removal. No automatic bootstrap migration or startup occurs.

Existing-world FTB migration requires `reviewedMigrations: ["ftbchunks-member-limit"]`. It reads the configured `level-name`, requires that world root in protected paths, and changes only `max_claimed_chunks` to 4 and `party_limit_mode` to `"sum"` in `serverconfig/ftbchunks-world.snbt`. Comments, extras, hard caps and claim files remain. Inspect rank overrides, persisted extra claims and nonzero hard caps separately; this migration does not erase them or change quest unlocks. Fresh defaults are seeded at `defaultconfigs/ftbchunks/ftbchunks-world.snbt` only when absent. Existing defaults also receive the same two-key merge under the reviewed FTB migration; no claim data is reset.

`config/sunrin/geonpi.json` is copied from `kubejs-custom/data/sunrin/defaults/geonpi.json` only if absent. Existing operator UUID settings are preserved. To populate an explicitly reviewed existing **empty** operator list, add `"geonpi-operators"` to both release `migrations` and local `reviewedMigrations`; the narrow merge sets peach_min UUID `d415f5f4-e89d-4dcf-be37-242f5495681e`, preserves other keys, and refuses a nonempty list. It grants no Minecraft OP. A successful reviewed update also updates the existing bootstrap marker to the exact candidate lock; the original marker is included in rollback. Config migrations run after the full backup and clean stop and are inside rollback coverage.

The generated ZIPs/locks are delivery artifacts, not game runtime validation. Dedicated startup, client join, Beat Lamp/MDM response, old StageBox world removal, Linux service deployment and real-world FTB totals still require isolated runtime acceptance before publication.

## Sunrin 0.2.1 hotfix candidate

The 0.2.1 candidate starts from the historical `releases/0.2.0/pack-lock.json`. Pin the completed Core build with `python3 build-scripts/pin-owned-artifact.py --refresh --core-version 0.1.1`, then use the same resolver and release builders above. It does not promote the operating channel or contact AWS. The update descriptor has no config migrations, so existing FTB and operator settings remain untouched. Prior receipt ownership retires only the old Core JAR.

The sole upstream replacement is `kubejs/server_scripts/playerEvents/chatColors.js`. `releases/0.2.1/reviewed-upstream-replacements.json` records its verified original SHA256 and size. When that path is not yet owned, the updater requires this exact predecessor in `ownedFileMerge.reviewedReplacements`, verifies it before hooks and again before applying, and includes it in the full backup and rollback. Edited upstream copies fail closed; do not replace their hash with a guess. All other upstream script paths remain outside this exception.

Fresh bootstrap also verifies that predecessor through `ownedOverlay.reviewedReplacements` before writing any overlay content into its staging tree. If an update rejects a changed predecessor after stopping but before changing content, it restarts the original server without restoring an older backup over the detected edit. Once content mutation begins, rollback restores the verified snapshot; older recovery journals retain this conservative restore behavior.
