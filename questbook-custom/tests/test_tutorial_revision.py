"""Portable regression checks for the 2026-10-28 user quest export.

Run with ``python3 -m unittest discover -s questbook-custom/tests -v``.
The semantic fingerprints below were captured from the untouched 29-chapter
2026-10-28-01-29-57 export before editing. They cover every other quest, chapter
layout, dependency, task and reward, without requiring the user's private path
or any development files from .work.
"""

import copy
import hashlib
import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
FIRST = "3862A7D1A471A215"
TOOLS = "1E5531421815CDB3"
HOME = "1375AE2ECAC8C147"
MAPPING_REWARD = "757BB197D52F88E4"
PREFIX = "ftbquests.chapter.getting_started.quest"

# Only the two tutorial quests' tasks/rewards/description may change. The
# additional mapping reward is removed from HOME before checking preservation.
EXPORT_FINGERPRINTS = {
    "abandoned_farm.snbt": "5a0d50004c50543537cde7e61b38e68a254515f541cc752fd1d78faf8ef4d085",
    "armor_weapons__tools.snbt": "ba11351d8a2cec9c71a18ef0793ad0f0f9ea2c7ce7a044c8760d2c02dfe377b8",
    "artifacts.snbt": "5e14d3513a5b7a450ba4fc382307ac0b88563d44cb64ec4a42e8ef2fee333353",
    "banners.snbt": "116f91bcaa0ec66d3c7a987bb66674df9aadca80bca566f292a9a4c5692af94d",
    "boiler_room.snbt": "66af0d1c77e79b61d6b0f350c934185a71bbea8b61b8e3836ea35407b73d597a",
    "botania.snbt": "fb38b9787d3f7a799061a639dc80005c96b4e64851ced5214ff5ccd9fd1bff2e",
    "crafts_room.snbt": "c3ac80b6cbff6b12db3c4d8db1b93cad85d085116373668bfbc44dc1976cda17",
    "creatures.snbt": "11a9707137721805f544668664b91282f9b453402edc85fef4f562c58402aac3",
    "crops.snbt": "4301a486ea0204ec62807aad32a79017c235063493b8c0f22807623e57e7b3af",
    "drinks.snbt": "8f6c7f0274bbc0bd5210e1569fa6e37744252a7beb1c9e7fd1c77ed6d17b329c",
    "fish_tank.snbt": "e5851e5f9a9de66cb37a4ca507dd3ca28b39bf113ae0a1812f1821b5710b05cd",
    "fishing.snbt": "349dc50987d0640749f6c50b023947dab620bdd5ad2b07211835ad1633a30585",
    "gems.snbt": "45499d8d3946ed3d70fd7bfa419e52207c82bda6a86d0cadd1bcca68859af450",
    "getting_started.snbt": "1804af7705f1e80a565527ae305ec6237108e9ce0fef2446abaf0a9e9a3d1db4",
    "ii__building_up_the_farm.snbt": "76e4dfed4c9ddaed2827d413b21c0f639e67cbb3ff7b7caf78d2a11007837724",
    "iii__advanced_farming.snbt": "09c7d0b808deb1953930fc1d7c4c904393269f20765c0aea913d30367cdff8ea",
    "iv__prismatic_farming.snbt": "de27bded344b9a644192fddba8f251dd6269ce1462ffa9f37a37d57cd1b6b1dd",
    "ivi__mechanical_farming.snbt": "e52ac8802ef9f52ada283e6c0b94c73b375e2e1d2ff4b42b42043865957ee821",
    "longwings.snbt": "30bfd4a4d4cf923b2fb37027daf0cbeeb7b27a3e7bd78f2e97001c31c9c565e0",
    "minerals.snbt": "4122ddf725232309e5fc179bb9724959cbfd23e2c1f520b46bd9ec1f57f21bfc",
    "pantry.snbt": "90b2a10a7270d594d4dd32834826966c4a9d9bea8c8ad186cc715f70fc0f690e",
    "perfection.snbt": "bd5d9ae9888069197bf8242658e6e239ca31b72a41604716b0ed1363259ca610",
    "relics.snbt": "c3b3427c113ab32186b40608795ecb28ceab06ebc6b8b3b430885e318e2a6676",
    "slimes.snbt": "b1f2934c901165a9e86bb24a325ba4ea549006ae5a8c1d631088b3b485b40bce",
    "tools.snbt": "da1b41714a0bb6638a6bdaf655c3c694848dc96efe8481a9a2b1eca3a3d5cc3c",
    "transportation.snbt": "c38027a82ed59020df8ced95af31aad160737dc7716c2f4db6aed089e4e7cad7",
    "vault.snbt": "4b3c09b06ff03f982f6675182d1d8dc8ffc70e99628a0fe5b2720a5eb38dee30",
    "villagers.snbt": "b7ec3671dfd1b37ddd7273ceeb281215601d581b42ab899a6787d7bbc1992532",
    "welcome.snbt": "b0cd1c105ee7f1c6432736e15e90d57a919e019b54d81addbd734169fe436ad8"
}


LANGUAGE_FINGERPRINTS = {
    "ko_kr": "edcaac1042a88719af11a69ff3f168deddbb189c845a1ece40f1abf4b18ede80",
    "en_us": "d9e9376f70eafa572adfffcab5e77a97869beb8d4226cd135242433184fec97b"
}


class SNBTParser:
    """Small test-only parser for FTB's comma-optional SNBT chapter format."""

    NUMBER = re.compile(r"^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)([bBsSlLfFdD]?)$")

    def __init__(self, source):
        self.source, self.offset = source, 0

    def skip(self):
        while self.offset < len(self.source):
            if self.source[self.offset].isspace() or self.source[self.offset] == ",":
                self.offset += 1
            elif self.source[self.offset] == "#" or self.source.startswith("//", self.offset):
                end = self.source.find("\n", self.offset)
                self.offset = len(self.source) if end < 0 else end + 1
            elif self.source.startswith("/*", self.offset):
                end = self.source.find("*/", self.offset + 2)
                if end < 0:
                    raise ValueError("Unterminated SNBT comment")
                self.offset = end + 2
            else:
                break

    def quoted(self):
        quote = self.source[self.offset]
        self.offset += 1
        result = []
        while self.offset < len(self.source):
            char = self.source[self.offset]
            self.offset += 1
            if char == quote:
                return "".join(result)
            if char == "\\":
                char = self.source[self.offset]
                self.offset += 1
                if char == "u":
                    result.append(chr(int(self.source[self.offset:self.offset + 4], 16)))
                    self.offset += 4
                    continue
                char = {"n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f"}.get(char, char)
            result.append(char)
        raise ValueError("Unterminated SNBT string")

    def bare(self, key=False):
        start = self.offset
        stops = " \t\r\n,{}[]" + (":" if key else "")
        while self.offset < len(self.source) and self.source[self.offset] not in stops:
            self.offset += 1
        if self.offset == start:
            raise ValueError(f"Expected SNBT token at {start}")
        return self.source[start:self.offset]

    def value(self):
        self.skip()
        char = self.source[self.offset]
        if char in "\"'":
            return self.quoted()
        if char == "{":
            self.offset += 1
            result = {}
            while True:
                self.skip()
                if self.source[self.offset] == "}":
                    self.offset += 1
                    return result
                key = self.quoted() if self.source[self.offset] in "\"'" else self.bare(key=True)
                self.skip()
                if self.source[self.offset] != ":" or key in result:
                    raise ValueError(f"Invalid or duplicate SNBT key {key}")
                self.offset += 1
                result[key] = self.value()
        if char == "[":
            self.offset += 1
            self.skip()
            array_type = None
            if self.source[self.offset:self.offset + 2] in ("B;", "I;", "L;"):
                array_type = self.source[self.offset]
                self.offset += 2
            result = []
            while True:
                self.skip()
                if self.source[self.offset] == "]":
                    self.offset += 1
                    return {"$snbt_array_type": array_type, "values": result} if array_type else result
                result.append(self.value())
        token = self.bare()
        if token in ("true", "false"):
            return token == "true"
        match = self.NUMBER.fullmatch(token)
        if match:
            number, suffix = match.groups()
            return float(number) if suffix.lower() in ("f", "d") or any(c in number for c in ".eE") else int(number)
        return token

    def parse(self):
        result = self.value()
        self.skip()
        if self.offset != len(self.source):
            raise ValueError("Trailing SNBT data")
        return result


def protected_semantics(chapter):
    chapter = copy.deepcopy(chapter)
    for quest in chapter["quests"]:
        if quest["id"] in (FIRST, TOOLS):
            for key in ("tasks", "rewards", "description"):
                quest.pop(key, None)
        elif quest["id"] == HOME:
            quest["rewards"] = [r for r in quest.get("rewards", []) if r["id"] != MAPPING_REWARD]
    return chapter


def fingerprint(chapter):
    canonical = json.dumps(protected_semantics(chapter), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def walk_ids(value):
    if isinstance(value, dict):
        if isinstance(value.get("id"), str) and re.fullmatch(r"[0-9A-F]{16}", value["id"]):
            yield value["id"]
        for child in value.values():
            yield from walk_ids(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_ids(child)


class TutorialRevisionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.chapters = {
            path.name: SNBTParser(path.read_text(encoding="utf-8-sig")).parse()
            for path in sorted((ROOT / "questbook-custom/chapters").glob("*.snbt"))
        }
        cls.quests = {quest["id"]: quest for chapter in cls.chapters.values() for quest in chapter["quests"]}
        cls.languages = {
            locale: json.loads((ROOT / f"kubejs-custom/assets/ftbquestlocalizer/lang/{locale}.json").read_text())
            for locale in ("ko_kr", "en_us")
        }

    def test_other_quests_and_export_layout_are_preserved(self):
        self.assertEqual(len(self.chapters), 29)
        self.assertEqual(set(self.chapters), set(EXPORT_FINGERPRINTS))
        for filename, chapter in self.chapters.items():
            with self.subTest(chapter=filename):
                self.assertEqual(fingerprint(chapter), EXPORT_FINGERPRINTS[filename])
        self.assertNotIn("5FDA526D348C8A0F", set(self.quests), "The user's deleted optional map quest must stay deleted")

    def assert_item_goal(self, quest_id, task_id, item):
        tasks = self.quests[quest_id]["tasks"]
        self.assertEqual(len(tasks), 1)
        task = tasks[0]
        self.assertEqual((task["id"], task["type"], task["item"], task.get("count", 1)), (task_id, "item", item, 1))
        self.assertFalse(task.get("consume_items", False))
        self.assertFalse(task.get("consume", False))
        self.assertIn(task.get("match_nbt", "default"), (False, "default", "ignore"))
        self.assertNotIn("tag", task)

    def assert_rewards(self, quest_id, expected):
        rewards = self.quests[quest_id]["rewards"]
        self.assertEqual(len(rewards), 3)
        self.assertEqual([(r["id"], r["item"], r.get("count", 1)) for r in rewards], expected)
        self.assertTrue(all(r["type"] == "item" for r in rewards))

    def test_first_goal_and_exact_rewards(self):
        self.assert_item_goal(FIRST, "42128298ECAA5F88", "minecraft:wooden_pickaxe")
        self.assertEqual(self.quests[FIRST]["dependencies"], ["238702B124895A0A"])
        self.assert_rewards(FIRST, [
            ("07864E97EEB05B2A", "numismatics:cog", 5),
            ("646C08510538F2EB", "minecraft:smithing_table", 1),
            ("00008DDDD6311B97", "kubejs:sunrin_meal", 5),
        ])

    def test_upgrade_goal_and_exact_rewards(self):
        self.assert_item_goal(TOOLS, "1802EEEEFC77234B", "minecraft:stone_pickaxe")
        self.assertEqual(self.quests[TOOLS]["dependencies"], [FIRST])
        self.assert_rewards(TOOLS, [
            ("1402E5011DF54D5C", "numismatics:cog", 5),
            ("5549518B22AEC1F1", "kubejs:sunrin_meal", 5),
            ("0A664AFFE407096B", "kubejs:town_warp_ticket", 1),
        ])

    def test_localized_tutorial_text_and_matching_keys(self):
        expected_ko = {
            f"{PREFIX}{FIRST}.title": "1. 시작하기",
            f"{PREFIX}{FIRST}.description1": "환영합니다! 마을에 들어가기 전 아주 간단한 테스트를 진행하겠습니다. 곡괭이를 제작해주세요!",
            f"{PREFIX}{FIRST}.task.4761011349401264008.title": "나무 곡괭이를 제작해주세요!",
            f"{PREFIX}{TOOLS}.title": "도구 업그레이드?",
            f"{PREFIX}{TOOLS}.description1": "대장장이 작업대에서 &l[코그 / 나무 곡괭이 / 조약돌]&r을 순서대로 넣어 돌 곡괭이로 업그레이드 해주세요.",
            f"{PREFIX}{TOOLS}.description2": "더 높은 등급에는 대장장이 주민이 판매하는 형판이 필요합니다. 도구는 모루에서 계속 수리할 수 있고 마법 부여 또한 유지됩니다.",
            f"{PREFIX}{TOOLS}.task.1730207917068985163.title": "돌 곡괭이 1개",
        }
        for key, text in expected_ko.items():
            self.assertEqual(self.languages["ko_kr"][key], text)
            self.assertIn(key, self.languages["en_us"])
        self.assertEqual(self.languages["en_us"][f"{PREFIX}{FIRST}.title"], "1. Getting Started")
        self.assertEqual(self.languages["en_us"][f"{PREFIX}{TOOLS}.task.1730207917068985163.title"], "1 stone pickaxe")
        self.assertIn("&l[Cog / Wooden Pickaxe / Cobblestone]&r", self.languages["en_us"][f"{PREFIX}{TOOLS}.description1"])
        self.assertEqual(self.quests[FIRST]["tasks"][0]["title"], "{" + f"{PREFIX}{FIRST}.task.4761011349401264008.title" + "}")
        self.assertEqual(self.quests[TOOLS]["description"], ["{" + f"{PREFIX}{TOOLS}.description1" + "}", "", "{" + f"{PREFIX}{TOOLS}.description2" + "}"])

    def test_unrelated_translations_are_preserved(self):
        for locale, language in self.languages.items():
            untouched = {k: v for k, v in language.items() if not any(f"quest{qid}." in k for qid in (FIRST, TOOLS))}
            canonical = json.dumps(untouched, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            self.assertEqual(hashlib.sha256(canonical.encode()).hexdigest(), LANGUAGE_FINGERPRINTS[locale])

    def test_mapping_unlock_survives_deleted_optional_quest(self):
        matches = [(q["id"], r) for q in self.quests.values() for r in q.get("rewards", []) if r["id"] == MAPPING_REWARD]
        self.assertEqual(len(matches), 1)
        quest_id, reward = matches[0]
        self.assertEqual(quest_id, HOME)
        self.assertEqual(self.quests[HOME]["dependencies"], ["3F759C6DEEBC61FD"])
        self.assertEqual(reward["command"], "/kjs stages add @s ftbchunks_mapping")
        self.assertEqual(reward["auto"], "invisible")
        self.assertFalse(reward["team_reward"])
        for flag in ("elevate_perms", "ignore_reward_blocking", "silent", "exclude_from_claim_all"):
            self.assertTrue(reward[flag])

    def test_object_ids_are_unique_and_native_commands_target_self(self):
        ids = [object_id for chapter in self.chapters.values() for object_id in walk_ids(chapter)]
        self.assertEqual(len(ids), len(set(ids)))
        # Pinned FTB BaseQuestFile.readID uses signed Long.parseLong(hex, 16).
        # High-bit IDs are replaced with random IDs on each native reload.
        for object_id in ids:
            self.assertGreater(int(object_id, 16), 0)
            self.assertLessEqual(int(object_id, 16), 0x7FFFFFFFFFFFFFFF, object_id)
        for quest in self.quests.values():
            for reward in quest.get("rewards", []):
                if reward.get("type") == "command" and reward["command"].startswith("/kjs stages add "):
                    self.assertIn(" @s ", reward["command"])
                    self.assertNotIn(" @p ", reward["command"])


if __name__ == "__main__":
    unittest.main()
