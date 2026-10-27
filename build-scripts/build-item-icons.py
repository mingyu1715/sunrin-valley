#!/usr/bin/env python3
"""Render three original pixel/vector item icons. Existing ticket/meal art is untouched."""
from pathlib import Path
import struct
import zlib
ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'resourcepacks/Sunrin-Custom/assets/kubejs/textures/item'

def png(rectangles):
    pixels = [[(0, 0, 0, 0) for _ in range(32)] for _ in range(32)]
    for x, y, w, h, color in rectangles:
        rgba = tuple(bytes.fromhex(color)) + (255,)
        for py in range(y, y + h):
            for px in range(x, x + w): pixels[py][px] = rgba
    raw = b''.join(b'\x00' + bytes(channel for pixel in row for channel in pixel) for row in pixels)
    def chunk(kind, payload): return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 32, 32, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')

box = [(4,10,24,18,'382A35'),(5,11,22,15,'B26B45'),(7,13,18,12,'CF9160'),(5,23,22,3,'8E523C'),(3,8,26,6,'382A35'),(4,9,24,4,'F2C776'),(5,10,22,2,'E6AB5F'),(14,9,4,17,'674876'),(15,9,2,17,'A270A0'),(11,5,5,4,'382A35'),(17,5,5,4,'382A35'),(12,6,3,2,'C38CAC'),(18,6,3,2,'C38CAC'),(8,17,2,2,'F6DB9B'),(22,19,2,2,'F6DB9B')]
furniture = [(4,10,24,18,'253F3C'),(5,11,22,15,'769B76'),(6,13,20,11,'A5BE86'),(5,24,22,2,'4B7965'),(3,8,26,6,'253F3C'),(4,9,24,4,'DBD0A0'),(5,10,22,2,'EEE1AB'),(13,17,6,7,'EFE4BD'),(11,17,10,2,'EFE4BD'),(12,16,8,1,'EFE4BD'),(13,15,6,1,'EFE4BD'),(14,14,4,1,'EFE4BD'),(15,19,2,5,'527660'),(7,12,2,3,'658B70'),(23,12,2,3,'658B70')]
color = [(4,6,24,21,'342B4A'),(5,7,22,19,'EAE2C3'),(6,8,20,17,'FFF4D6'),(7,10,18,2,'BDAA94'),(7,22,18,2,'BDAA94'),(8,14,3,6,'7350A0'),(12,13,3,7,'D56C83'),(16,12,3,8,'E8AB56'),(20,11,3,9,'76B4A2'),(2,13,4,6,'342B4A'),(3,14,3,4,'EAE2C3'),(26,13,4,6,'342B4A'),(26,14,3,4,'EAE2C3'),(24,5,2,2,'F6D675'),(27,3,1,3,'F6D675')]
if __name__ == '__main__':
    TARGET.mkdir(parents=True, exist_ok=True)
    for name, artwork in [('random_box',box),('furniture_random_box',furniture),('name_color_ticket',color)]:
        (TARGET / (name + '.png')).write_bytes(png(artwork))
    print('Rendered random_box, furniture_random_box, name_color_ticket (32x32 RGBA)')
