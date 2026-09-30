#!/usr/bin/env python3
"""Pack the CC0 seabed texture sets into compact JPGs for public/assets/terrain/.

Sources (all CC0, see ATTRIBUTION.md), downloaded 1K sets into --src:
  silt       ambientCG Ground095A   (dir Ground095A/)
  sand       ambientCG Ground094C   (dir Ground094C/), rippled; contrast halved
  basalt     ambientCG Rock035      (dir Rock035/)
  rubble     Poly Haven coral_mud_01     (coral_mud_01_{diff,nor_gl,rough,arm}.jpg)
  carbonate  Poly Haven coral_ground_02  (coral_ground_02_{diff,nor_gl,rough,arm}.jpg)

Per set, two files:
  <set>_a.jpg   1024 px albedo, ambient occlusion baked in, mean luminance
                normalised to sRGB 0.5 and partly desaturated. The biome palette
                (src/world/TerrainBiome.ts) supplies the colour; this supplies
                the pattern. The shader multiplies by ALBEDO_GAIN.
  <set>_n.jpg   512 px, R/G = OpenGL tangent normal x/y, B = roughness (4:4:4).

Usage: python3 tools/make_terrain_textures.py --src .cache/tex
Needs Pillow only.
"""

import argparse
import os

from PIL import Image, ImageChops, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "assets", "terrain")

SETS = {
    "silt": ("Ground095A/Ground095A_1K-JPG_{}.jpg", "ambient"),
    "sand": ("Ground094C/Ground094C_1K-JPG_{}.jpg", "ambient"),
    "basalt": ("Rock035/Rock035_1K-JPG_{}.jpg", "ambient"),
    "rubble": ("coral_mud_01_{}.jpg", "poly"),
    "carbonate": ("coral_ground_02_{}.jpg", "poly"),
}
AMBIENT = {"color": "Color", "normal": "NormalGL", "rough": "Roughness", "ao": "AmbientOcclusion"}
POLY = {"color": "diff", "normal": "nor_gl", "rough": "rough", "ao": "arm"}
# How saturated the pattern stays (0 = greyscale). Palette supplies the hue.
KEEP_SAT = {"silt": 0.45, "sand": 0.5, "basalt": 0.2, "rubble": 0.55, "carbonate": 0.5}


def load(src, name, kind):
    pattern, style = SETS[name]
    key = (AMBIENT if style == "ambient" else POLY)[kind]
    return Image.open(os.path.join(src, pattern.format(key)))


def albedo(src, name):
    col = load(src, name, "color").convert("RGB")
    if SETS[name][1] == "poly":
        ao = load(src, name, "ao").split()[0]  # ARM: R = AO
    else:
        ao = load(src, name, "ao").convert("L")
    ao = ao.point([int(255 * (0.55 + 0.45 * i / 255)) for i in range(256)])
    col = ImageChops.multiply(col, Image.merge("RGB", (ao, ao, ao)))
    grey = col.convert("L")
    col = Image.blend(grey.convert("RGB"), col, KEEP_SAT[name])
    mean = ImageStat.Stat(col.convert("L")).mean[0]
    gain = 128.0 / max(mean, 1.0)
    lut = [min(255, int(i * gain + 0.5)) for i in range(256)]
    col = col.point(lut * 3)
    if name == "sand":
        col = Image.blend(Image.new("RGB", col.size, (128, 128, 128)), col, 0.55)
    return col


def normal_rough(src, name):
    n = load(src, name, "normal").convert("RGB").resize((512, 512), Image.LANCZOS)
    r = load(src, name, "rough").convert("L").resize((512, 512), Image.LANCZOS)
    return Image.merge("RGB", (n.split()[0], n.split()[1], r))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    for name in SETS:
        alb = albedo(a.src, name)
        p = os.path.join(OUT, f"{name}_a.jpg")
        alb.save(p, quality=68, optimize=True, progressive=True)
        nr = normal_rough(a.src, name)
        q = os.path.join(OUT, f"{name}_n.jpg")
        nr.save(q, quality=88, optimize=True, subsampling=0)
        print(name, os.path.getsize(p) // 1024, "KB albedo,", os.path.getsize(q) // 1024, "KB normal+rough")


if __name__ == "__main__":
    main()
