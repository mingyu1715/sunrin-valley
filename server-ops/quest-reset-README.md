# Offline quest reset candidate

`reset_quest_progress.py` is an opt-in maintenance tool for FTB Quests **2001.4.17**, TeamData format **1**, and KubeJS **2001.6.5-build.16**. This work prepares a local candidate only. It does not run automatically, connect to a server, deploy a pack, change the launcher, or install a login/startup reset hook.

Use Python **3.9 or newer on POSIX** (Linux or macOS), with only the standard library. Run as the account that owns the copied server files. The explicit world must already exist inside the explicit server directory, with its existing `session.lock`. Every mode, including dry-run and restoration, holds a nonblocking exclusive **POSIX record lock** on `session.lock`; a running Minecraft JVM or another reset process prevents access. Paths containing symlinks or traversal are refused. On macOS, use physical paths such as `/private/tmp/...` instead of the `/tmp` symlink.

## Exact reset boundary

- In the world's `ftbquests/`, only immediate files named exactly `<canonical-lowercase-UUID>.snbt` are considered. Their root `task_progress`, `started`, `completed`, and `claimed_rewards` compounds become `{}`. This resets all saved teams and all personal reward claims, including offline members and obsolete quest IDs. Version, team UUID/name, lock flags, reward-blocking flags, per-player editor/pinning preferences, comments, unknown keys, and all other text are preserved.
- In the world's `playerdata/`, only immediate `<canonical-lowercase-UUID>.dat` files are considered. Exactly `abandoned_farm_complete`, `boiler_room_complete`, `vault_complete`, `community_center_complete`, and `ftbchunks_mapping` are filtered from the root binary NBT `Tags` string list. Duplicate occurrences are removed. Every other NBT payload byte remains identical, including inventory, ender chest, mod capabilities, Core receipts, and persistent currency/box data. The changed NBT is recompressed, so its gzip header and compressed stream can differ. Files without those stages retain their original gzip bytes.
- World blocks, `level.dat`, `ftbteams/` membership, `ftbchunks/` ownership, `data/sunrin-core/` deliveries/profiles, stats, advancements, `kubejs_persistent_data.nbt`, all other stage tags, `.dat_old`, and other backup files are untouched. `invited_*`, mastery, skill, and `starting_items_4_1` tags remain.

This resets quest records and claims; it does not remove previously delivered items or refund consumed bundle submissions. Existing inventory, stats, or independent stages can legitimately satisfy detector quests again when FTB Quests runs. Subsequent reward claims are possible because their claim records were explicitly reset. The candidate quest scripts must have the former Community Center automatic-completion hook removed before testing the reset world.

## Inspect a stopped local copy

Replace the example paths with a **stopped local test copy**. The tool never stops or starts Minecraft and does not guess `level-name`; `--world` is always explicit and accepts a relative directory name or an absolute path inside `--server`.

```sh
python3 server-ops/reset_quest_progress.py \
  --server '/absolute/local/test-server' \
  --world 'world'
```

The default prints JSON with `status: "dry_run"`, exact changed paths, before/after SHA-256 hashes, sizes, and removed quest stages. It writes no backup or world files. All target SNBT and compressed player NBT files are parsed before any reset write; malformed, ambiguous, oversized, unsupported, linked, or UUID-mismatched input aborts the complete operation. SNBT typed arrays require the matching byte/int/long numeric types and ranges; ordinary lists require a consistent NBT element type.

## Apply explicitly to that copy

```sh
python3 server-ops/reset_quest_progress.py \
  --server '/absolute/local/test-server' \
  --world 'world' \
  --apply \
  --backup '/absolute/local/quest-reset-backup-001'
```

`--apply` requires a **new backup directory outside the world**, whose parent already exists. The directory contains original bytes in `files/`, immutable `manifest.json` and `manifest.sha256`, and a transaction `state.json`. It backs up the exact changed quest/player files, not the whole server. The manifest binds those files to the explicit server/world and records both hashes. Keep the backup and a separate full-world snapshot for later gameplay rollback.

After backup verification, the tool checks current hashes again and replaces files atomically with their existing owner/group and permission mode. File and directory writes are flushed to disk. A handled transaction failure rolls back already attempted replacements without overwriting independently changed files. An unrecoverable storage failure is reported with the backup location for manual recovery; no transaction can guarantee completion after loss of storage access.

`state.json` records `prepared`, `applied`, `restored`, `rolled_back`, or `rollback_failed`. There is no persistent player-login migration marker. Applying again to an already reset, unchanged world with a new backup path returns `no_changes` and creates no backup or world writes. Reusing an existing reset backup destination is refused. A later explicit reset after new gameplay would be another deliberate reset; nothing schedules it automatically.

## Inspect and restore the recorded originals

```sh
python3 server-ops/reset_quest_progress.py \
  --server '/absolute/local/test-server' \
  --world 'world' \
  --restore '/absolute/local/quest-reset-backup-001'

python3 server-ops/reset_quest_progress.py \
  --server '/absolute/local/test-server' \
  --world 'world' \
  --restore '/absolute/local/quest-reset-backup-001' \
  --apply
```

Restoration defaults to `restore_dry_run`. It verifies the manifest checksum, every original file hash, the exact target allowlist, and the bound server/world. Each current file must match either its reset hash or its original hash. Later player/quest changes cause a refusal before any restoration writes. Already original files are left alone, so recovery also handles a process interrupted between individual replacements; repeated restoration returns `no_changes`. A checksum detects corruption, not malicious replacement of both a manifest and its checksum: keep backups in trusted operator storage.

## Verification

```sh
python3 -B -m unittest discover -s server-ops/tests -p test_quest_reset.py -v
```

Tests use disposable temporary worlds. They cover multiple teams and offline claims, byte preservation, modified UTF-8 tag strings, default CLI dry-run, external backup requirements, a separate process holding the world record lock, the lock staying held during writes, corrupt SNBT/gzip/NBT refusal before writes, symlink/traversal refusal, backup integrity, guarded exact restoration, repeat application, and rollback after failures before and after an atomic rename. Native Minecraft verification belongs to the stopped local server copy; this test suite never connects to a running server.
