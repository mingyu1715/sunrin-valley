# Sunrin quest definitions

Minecraft1.20.1 / Forge47.4.0 / Society: Sunlit Valley4.1.5A / FTB Quests2001.4.17.

These 29 chapter files are server overrides. Clients receive the quest book from FTB Quests on server join; Korean/English explanation assets travel in the regular KubeJS client overlay. Launcher1.1.3 does not install config files from overlays.

The baseline is the user's untouched `local/ftbquests/saved/2026-10-28-01-29-57/chapters` export, copied on 2026-10-28. Its 1,131 quests, layout, dependencies, deletions and other reward choices are preserved. In particular, the deleted optional FTB Chunks quest is not restored, and meals outside the two tutorial quests follow the export rather than a new blanket reward rule.

Quest `3862A7D1A471A215` (task `42128298ECAA5F88`) is now `1. 시작하기`: obtain one wooden pickaxe and receive exactly 5 cogs, 1 smithing table and 5 Sunrin meals. Quest `1E5531421815CDB3` (task `1802EEEEFC77234B`) requires one stone pickaxe and gives exactly 5 cogs, 5 Sunrin meals and 1 `kubejs:town_warp_ticket`. Both goals use plain item IDs with count 1, without consuming the tool or requiring its NBT/durability to match. Their Korean/English instructions describe the smithing sequence, with FTB bold formatting around the ingredients.

Existing reward IDs remain when the same quest still rewards the same item: first-quest meal `00008DDDD6311B97`, upgrade cog `1402E5011DF54D5C` and upgrade meal `5549518B22AEC1F1`. New or moved rewards use the first 16 uppercase SHA256 hexadecimal digits, with the sign bit cleared (`value & 0x7FFFFFFFFFFFFFFF`), of UTF-8 `sunrin:quest:tutorial:v1:<QUEST_ID>:<ITEM_ID>`:

| Quest | Item | Reward ID |
| --- | --- | --- |
| `3862A7D1A471A215` | `numismatics:cog` | `07864E97EEB05B2A` |
| `3862A7D1A471A215` | `minecraft:smithing_table` | `646C08510538F2EB` |
| `1E5531421815CDB3` | `kubejs:town_warp_ticket` | `0A664AFFE407096B` |

The removed map quest's native command reward `757BB197D52F88E4` now belongs to the existing `내집마련` guide (`1375AE2ECAC8C147`), after shipping. It automatically and invisibly grants the completing player `ftbchunks_mapping` through `/kjs stages add @s ftbchunks_mapping`, preserving the personal reward and command safety flags. Other native stage rewards retain the export's `@s` targets. No replacement quest or script-based auto-completion is added.

Run `python3 -m unittest discover -s questbook-custom/tests -v` for the tutorial regression checks. The self-contained tests validate exact goals/rewards/IDs, localization, dependencies, native stage targets and unique object IDs. Frozen semantic fingerprints from the untouched export also protect every other quest and the full chapter layout; unrelated translations are fingerprinted separately. These checks require neither a local Minecraft installation nor files from `.work`.

Earlier 5-meal rewards retain their stable IDs: `000` plus the first 13 uppercase hexadecimal SHA256 digits of UTF-8 `sunrin:quest:meal5:v1:<QUEST_ID>`. Keep retained IDs across edits so existing claims remain valid; never reuse another object's ID. Quest progress and reward claim resets are separate, explicit offline operations, not changes to these definitions.

The default source files are preserved in the pinned Society package. Server delivery verifies the reviewed predecessor hashes before adopting upstream chapters/languages, owns only the exact declared files, and backs up the complete server before updating. Do not copy worlds, quest progress, stage files, accounts or settings into this folder.
