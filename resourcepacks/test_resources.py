"""Verify the shipped pack, model references, pixel assets, and ZIP contract."""

import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
import zipfile
import zlib


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "resourcepacks" / "Sunrin-Custom"
ITEMS = ("geonpi_ticket", "rename_ticket", "sunrin_meal", "random_box", "furniture_random_box", "name_color_ticket")
ENTRIES = {
    "pack.mcmeta",
    "pack.png",
    "assets/kubejs/lang/ko_kr.json",
    *(f"assets/kubejs/models/item/{item}.json" for item in ITEMS),
    *(f"assets/kubejs/textures/item/{item}.png" for item in ITEMS),
}


class ResourcePackTests(unittest.TestCase):
    def assert_png(self, data, allowed_sizes, transparent=False):
        self.assertEqual(data[:8], b"\x89PNG\r\n\x1a\n")
        offset, image_data = 8, bytearray()
        while offset < len(data):
            length = struct.unpack(">I", data[offset:offset + 4])[0]
            kind = data[offset + 4:offset + 8]
            payload = data[offset + 8:offset + 8 + length]
            crc = struct.unpack(">I", data[offset + 8 + length:offset + 12 + length])[0]
            self.assertEqual(zlib.crc32(kind + payload) & 0xFFFFFFFF, crc)
            if kind == b"IHDR":
                width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
                self.assertIn((width, height), allowed_sizes)
                self.assertEqual((depth, color, compression, filtering, interlace), (8, 6, 0, 0, 0))
            elif kind == b"IDAT":
                image_data.extend(payload)
            elif kind == b"IEND":
                self.assertEqual(offset + 12, len(data))
                break
            offset += length + 12
        else:
            self.fail("PNG has no IEND chunk")
        raw = zlib.decompress(image_data)
        stride = width * 4
        self.assertEqual(len(raw), (stride + 1) * height)
        previous, pixels = bytearray(stride), bytearray()
        for row in range(height):
            start = row * (stride + 1)
            filter_type = raw[start]
            self.assertIn(filter_type, range(5))
            current = bytearray(raw[start + 1:start + stride + 1])
            for i in range(stride):
                left = current[i - 4] if i >= 4 else 0
                above = previous[i]
                upper_left = previous[i - 4] if i >= 4 else 0
                prediction = left + above - upper_left
                paeth = min((left, above, upper_left), key=lambda v: abs(prediction - v))
                predictor = (0, left, above, (left + above) // 2, paeth)[filter_type]
                current[i] = (current[i] + predictor) % 256
            pixels.extend(current)
            previous = current
        self.assertIn(255, pixels[3::4], "PNG must contain visible artwork")
        if transparent:
            self.assertIn(0, pixels[3::4], "Item background must be transparent")
        return bytes(pixels)

    def assert_pack(self, entries, read):
        self.assertEqual(set(entries), ENTRIES)
        metadata = json.loads(read("pack.mcmeta"))
        self.assertEqual(metadata["pack"]["pack_format"], 15)
        self.assertTrue(metadata["pack"]["description"])
        names = json.loads(read("assets/kubejs/lang/ko_kr.json"))
        self.assertEqual(names, {
            "item.kubejs.geonpi_ticket": "건피권",
            "item.kubejs.rename_ticket": "칭호권",
            "item.kubejs.random_box": "랜덤박스",
            "item.kubejs.furniture_random_box": "가구랜덤박스",
            "item.kubejs.name_color_ticket": "닉네임 색상 변경권",
            "tooltip.kubejs.random_box": "인생은 한 방.",
            "tooltip.kubejs.furniture_random_box": "집은 좁은데 가구는 자꾸 늘어난다.",
            "tooltip.kubejs.geonpi_ticket": "부르면 옵니다. 아마도.",
            "tooltip.kubejs.rename_ticket": "명예는 없지만 칭호는 있습니다",
            "tooltip.kubejs.name_color_ticket": "화려한 닉이 나를 감싸네",
            "item.kubejs.sunrin_meal": "선린 급식",
            "tooltip.kubejs.sunrin_meal": "학교에서 먹던 그 맛.",
        })
        self.assert_png(read("pack.png"), {(128, 128)})
        artwork = []
        for item in ITEMS:
            model = json.loads(read(f"assets/kubejs/models/item/{item}.json"))
            self.assertEqual(model["parent"], "minecraft:item/generated")
            self.assertEqual(model["textures"], {"layer0": f"kubejs:item/{item}"})
            namespace, texture = model["textures"]["layer0"].split(":", 1)
            artwork.append(self.assert_png(read(f"assets/{namespace}/textures/{texture}.png"), {(16, 16), (32, 32)}, transparent=True))
        self.assertEqual(len(set(artwork)), len(ITEMS), "Each item must have distinct artwork")

    def test_source_pack_is_usable(self):
        entries = [path.relative_to(SOURCE).as_posix() for path in SOURCE.rglob("*") if path.is_file() and path.name != ".DS_Store"]
        self.assert_pack(entries, lambda name: (SOURCE / name).read_bytes())

    def test_archive_is_installable_and_reproducible(self):
        builder = ROOT / "build-scripts" / "build-resources.py"
        self.assertTrue(builder.is_file(), "Resource pack builder is missing")
        with tempfile.TemporaryDirectory() as temporary:
            outputs = [Path(temporary) / name for name in ("first.zip", "second.zip")]
            for output in outputs:
                result = subprocess.run([sys.executable, str(builder), "--output", str(output)], cwd=temporary, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                with zipfile.ZipFile(output) as archive:
                    self.assertIsNone(archive.testzip())
                    self.assert_pack(archive.namelist(), archive.read)
            self.assertEqual(outputs[0].read_bytes(), outputs[1].read_bytes())


if __name__ == "__main__":
    unittest.main()
