# Real client use-flow regression

This separate Forge test mod runs a fabricated offline client against a fresh dedicated server. It caught errors hidden by the FakePlayer/direct-Core tests: KubeJS's wrapped player exposes `getUuid`, Java overload selection makes the JSON grant ambiguous, and Society's custom chat formatter bypasses native name formatting.

The module is outside Core's source sets. Its JAR is never a product artifact and must not be added to client/server release manifests.

## Requirements

- Java 17, the repository's Gradle 8.8 wrapper, and the existing Forge 47.4.0 dependency cache.
- An isolated public-binary runtime cache, normally `.work/runtime-integration/`, containing `server/{mods,libraries,config,...}` and `client/{game,libraries,assets,preparation.json,launch-plan.json}`. The marker must declare that accounts, worlds and original options were not imported. The launch plan supplies public cached Java/Prism binary discovery; no account storage is read.
- A built candidate Core JAR and compiled Core classes. Both test endpoints receive that exact JAR.
- Free loopback ports 25597 (Minecraft), 25598 (reserved; RCON disabled), and 25599 (voice). macOS GUI access is required for the existing cached client runtime.

## Run

From the repository root, set `JAVA_HOME` to the cached JDK 17 and use the already primed Gradle cache:

```sh
export GRADLE_USER_HOME="$PWD/.work/core-build-recon/gradle-home"
bash sunrin-core/gradlew -p sunrin-core/runtime-tests/useflow --offline --no-daemon build
python3 sunrin-core/runtime-tests/useflow/prepare.py \
  --core-jar sunrin-core/build/libs/sunrin-core-0.1.1.jar \
  --run-dir "$PWD/.work/useflow-runs/local-001"
python3 sunrin-core/runtime-tests/useflow/run.py "$PWD/.work/useflow-runs/local-001"
```

Use `--cache PATH` or `--observer-jar PATH` when those differ. Pick a **new** run directory each time; preparation refuses to overwrite evidence. macOS copies use copy-on-write. Only public/generated test configuration, pinned binaries and publisher-derived test options are copied. Account files, original launcher options, existing worlds, prior OP lists and cached player identities are excluded. Current `kubejs-custom` startup/server/data files are overlaid at their exact paths, including `playerEvents/chatColors.js`.

The runner starts only its owned local processes. The observer requests native `Minecraft.stop()` after results; the runner waits for clean shutdown, sends native console `stop` to its server, and uses a logged PID-specific termination fallback only on timeout. No AWS action, publication or real account sign-in occurs.

## What is exercised

Before manual fixtures change the inventory, the server snapshots the **real non-Fake** player's first-login inventory and journal. The test requires 15 random boxes, 15 furniture boxes and the delivered first-login receipt.

Six survival/air scenarios cover random box use, repeated random use, furniture, title Apply, name-color Apply, and repeated title use. The client calls native `gameMode.useItem(MAIN_HAND)`, waits for the actual server-created Core screen, types into its real EditBox, and clicks the actual Apply/close/cancel widgets through `Screen.mouseClicked`. It never calls Core actions or constructs Core screens by reflection.

Network taps observe actual outgoing use/C2S packets, decoded inbound server C2S, and real S2C saved/error/box packets. Inventory, profiles and delivery journals are read on the server. Box assertions wait for the **exact S2C transaction UUID** to appear as DELIVERED in an authoritative snapshot with exactly one box consumed; they do not replay the input while waiting. This avoids classifying a pre-delivery snapshot as a product failure.

Finally, native client `sendChat` emits one local message. The client records the actual chat event component and screenshot, requiring the selected title and red account name. The runner exits successfully only when all six scenarios, first-login grant, styled chat and natural process exits pass.

## Evidence and limits

Each run retains `preparation.json` with hashes, console logs, owned PIDs, `run-status.json`, and `control/{welcome-state.json,server-state.json,useflow-results.json,screenshots/}`. No runtimes, logs, screenshots or worlds belong in this source directory.

`Screen.mouseClicked` exercises the real widget handler and actual packet, but bypasses OS MouseHandler/Forge ScreenEvent/FancyMenu input interception. These six scenarios do **not** claim creative mode, block-target fallback, arbitrary chat/Curios/team combinations, or real authenticated multiplayer coverage. They complement those tests; they do not substitute for them.
