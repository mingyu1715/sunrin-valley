# Sunrin quest definitions

Minecraft1.20.1 / Forge47.4.0 / Society: Sunlit Valley4.1.5A / FTB Quests2001.4.17.

These29 chapter files are server overrides. Clients receive the quest book from FTB Quests on server join; Korean/English explanation assets travel in the regular KubeJS client overlay. Launcher1.1.3 does not install config files from overlays.

All1,133 remaining quests have one additional personal, manually claimed `kubejs:sunrin_meal` reward of5. Existing445 reward entries and all retained quest/task/reward IDs remain. The wooden-pickaxe quest keeps its prior20-meal gift, giving25 when both food rewards are claimed. Existing completed quests can claim the new5 once without resetting original claims.

New5-meal reward IDs are stable: `000` plus the first13 uppercase hexadecimal SHA256 digits of UTF-8 `sunrin:quest:meal5:v1:<QUEST_ID>`. Keep these IDs across edits so old claims remain valid; never reuse another object's ID. All registered IDs were collision-checked before adding rewards.

The default source files are preserved in the pinned Society package. Server delivery verifies the reviewed predecessor hashes before adopting upstream chapters/languages, owns only the exact declared files, and backs up the complete server before updating. Do not copy worlds, quest progress, stage files, accounts or settings into this folder.
