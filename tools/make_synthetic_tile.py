#!/usr/bin/env python3
"""Generate a synthetic bathymetry tile so the game runs without network access.

Stdlib only. Produces a plausible-looking seafloor: a sloping abyssal plain with
value-noise hills, a canyon channel and a seamount. Used as a fallback when the
GMRT GridServer is unreachable, and as test fixture data.

Usage:
    python3 tools/make_synthetic_tile.py --id demo --cols 512 --rows 512
"""

import argparse
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tile_writer import build_meta, write_tile  # noqa: E402


def value_noise(cols, rows, freq, seed):
    """Bilinearly-interpolated value noise on a freq x freq lattice."""
    rnd = random.Random(seed)
    g = [[rnd.random() for _ in range(freq + 1)] for _ in range(freq + 1)]
    out = [0.0] * (cols * rows)
    for r in range(rows):
        fy = r / rows * freq
        y0 = int(fy); ty = fy - y0
        ty = ty * ty * (3 - 2 * ty)  # smoothstep
        for c in range(cols):
            fx = c / cols * freq
            x0 = int(fx); tx = fx - x0
            tx = tx * tx * (3 - 2 * tx)
            a = g[y0][x0] * (1 - tx) + g[y0][x0 + 1] * tx
            b = g[y0 + 1][x0] * (1 - tx) + g[y0 + 1][x0 + 1] * tx
            out[r * cols + c] = a * (1 - ty) + b * ty
    return out


def generate(cols, rows, seed, base_depth, relief):
    octaves = [(4, 1.0), (9, 0.45), (19, 0.2), (37, 0.09)]
    layers = [(value_noise(cols, rows, f, seed + i), w) for i, (f, w) in enumerate(octaves)]
    norm = sum(w for _, w in octaves)
    out = [0.0] * (cols * rows)
    for r in range(rows):
        v = r / max(1, rows - 1)
        for c in range(cols):
            u = c / max(1, cols - 1)
            i = r * cols + c
            n = sum(layer[i] * w for layer, w in layers) / norm  # 0..1
            h = base_depth + (n - 0.5) * relief
            h += -relief * 0.35 * v                       # deepens to the south
            # A canyon carved along a gentle S-curve.
            cx = 0.5 + 0.18 * math.sin(v * math.pi * 1.5)
            d = abs(u - cx)
            h -= relief * 0.9 * math.exp(-(d * d) / (2 * 0.035 * 0.035))
            # A seamount in the north-east quadrant.
            du, dv = u - 0.74, v - 0.28
            h += relief * 1.1 * math.exp(-(du * du + dv * dv) / (2 * 0.07 * 0.07))
            out[i] = h
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", required=True)
    ap.add_argument("--cols", type=int, default=512)
    ap.add_argument("--rows", type=int, default=512)
    ap.add_argument("--north", type=float, default=41.88)
    ap.add_argument("--south", type=float, default=41.58)
    ap.add_argument("--east", type=float, default=-49.80)
    ap.add_argument("--west", type=float, default=-50.10)
    ap.add_argument("--base-depth", type=float, default=-3600.0,
                    help="mean seafloor depth in metres (negative)")
    ap.add_argument("--relief", type=float, default=600.0,
                    help="peak-to-trough relief in metres")
    ap.add_argument("--seed", type=int, default=1912)
    ap.add_argument("--out", default="data/tiles")
    args = ap.parse_args(argv)

    bbox = {"north": args.north, "south": args.south,
            "east": args.east, "west": args.west}
    values = generate(args.cols, args.rows, args.seed, args.base_depth, args.relief)
    cellsize = (bbox["north"] - bbox["south"]) / args.rows
    meta = build_meta(
        args.id, values, args.cols, args.rows, bbox, cellsize, 0,
        "synthetic", "tools/make_synthetic_tile.py",
        extra={"synthetic": True, "seed": args.seed},
    )
    meta["attribution"] = "Synthetic procedural bathymetry (not real data)."
    print("[write] %s" % write_tile(args.out, meta, values))
    print("[stats] cols=%d rows=%d min=%.1f max=%.1f"
          % (meta["cols"], meta["rows"], meta["min_m"], meta["max_m"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
