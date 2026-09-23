#!/usr/bin/env python3
"""Print stats and an ASCII-art depth preview for a tile. Stdlib only.

Usage:
    python3 tools/inspect_tile.py titanic
    python3 tools/inspect_tile.py titanic --width 100 --out data/tiles
    python3 tools/inspect_tile.py titanic --variant u16   # optional heightmap16.bin
"""

import argparse
import json
import os
import struct
import sys

# Shallow (or above water) -> deep. The preview is a north-up map: the first
# printed row is the NORTH edge of the tile, matching the heightmap row order.
RAMP = "@%#*+=-:. "


def load_tile(root, tile_id):
    tile_dir = os.path.join(root, tile_id)
    with open(os.path.join(tile_dir, "meta.json")) as fh:
        meta = json.load(fh)
    with open(os.path.join(tile_dir, "heightmap.bin"), "rb") as fh:
        raw = fh.read()
    n = meta["cols"] * meta["rows"]
    if len(raw) != n * 4:
        raise SystemExit(
            "heightmap.bin is %d bytes, expected %d (%dx%d float32)"
            % (len(raw), n * 4, meta["cols"], meta["rows"])
        )
    return meta, struct.unpack("<%df" % n, raw)


def load_heightmap16(root, meta):
    """Decode the optional heightmap16.bin (uint16 LE) to metres."""
    if "quant_min_m" not in meta or "quant_scale" not in meta:
        raise SystemExit("meta.json has no quant_min_m/quant_scale; "
                         "run tools/compress_tiles.py --quant16 first")
    with open(os.path.join(root, meta["id"], "heightmap16.bin"), "rb") as fh:
        raw = fh.read()
    n = meta["cols"] * meta["rows"]
    if len(raw) != n * 2:
        raise SystemExit("heightmap16.bin is %d bytes, expected %d (%dx%d uint16)"
                         % (len(raw), n * 2, meta["cols"], meta["rows"]))
    lo, scale = meta["quant_min_m"], meta["quant_scale"]
    return tuple(lo + q * scale for q in struct.unpack("<%dH" % n, raw))


def preview(values, cols, rows, width, lo, hi):
    # Keep roughly square-looking output: terminal cells are ~2x tall.
    height = max(1, int(round(width * (rows / cols) * 0.5)))
    span = (hi - lo) or 1.0
    lines = []
    for ry in range(height):
        row = []
        sy = min(rows - 1, int(ry * rows / height))
        for rx in range(width):
            sx = min(cols - 1, int(rx * cols / width))
            v = values[sy * cols + sx]
            t = (v - lo) / span  # 0 = deepest, 1 = shallowest
            idx = int(round((1.0 - t) * (len(RAMP) - 1)))
            row.append(RAMP[max(0, min(len(RAMP) - 1, idx))])
        lines.append("".join(row))
    return lines


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tile_id")
    ap.add_argument("--out", default="data/tiles")
    ap.add_argument("--width", type=int, default=96)
    ap.add_argument("--variant", choices=["f32", "u16"], default="f32",
                    help="f32 = canonical heightmap.bin; u16 = optional heightmap16.bin")
    args = ap.parse_args(argv)

    meta, values = load_tile(args.out, args.tile_id)
    quant_err = None
    if args.variant == "u16":
        v16 = load_heightmap16(args.out, meta)
        quant_err = max(abs(a - b) for a, b in zip(values, v16))
        values = v16
    n = len(values)
    lo, hi = min(values), max(values)
    mean = sum(values) / n
    srt = sorted(values)
    b = meta["bbox"]

    print("tile        %s (%s)" % (meta["id"], meta.get("source")))
    print("fetched_at  %s" % meta.get("fetched_at"))
    print("bbox        N %.5f  S %.5f  E %.5f  W %.5f" % (b["north"], b["south"], b["east"], b["west"]))
    print("center      %.5f, %.5f" % (meta["center"]["lat"], meta["center"]["lon"]))
    print("grid        %d cols x %d rows = %d cells" % (meta["cols"], meta["rows"], n))
    print("cellsize    %.6f deg  =  %.1f m (x)  x  %.1f m (y)"
          % (meta["cellsize_deg"], meta["cellsize_m_x"], meta["cellsize_m_y"]))
    print("extent      %.1f km (E-W)  x  %.1f km (N-S)"
          % (meta["cols"] * meta["cellsize_m_x"] / 1000.0,
             meta["rows"] * meta["cellsize_m_y"] / 1000.0))
    print("depth       min %.1f m  max %.1f m  mean %.1f m  median %.1f m"
          % (lo, hi, mean, srt[n // 2]))
    print("percentiles p05 %.1f  p50 %.1f  p95 %.1f"
          % (srt[int(0.05 * n)], srt[n // 2], srt[int(0.95 * n)]))
    print("nodata      %d cells filled" % meta.get("nodata_count", 0))
    if quant_err is not None:
        print("variant     heightmap16.bin: step %.4f m, max |error| vs float32 %.4f m"
              % (meta["quant_scale"], quant_err))
    print()
    print("depth preview (north up; '%s' shallow -> deep '%s')" % (RAMP[0], RAMP[-2]))
    for line in preview(values, meta["cols"], meta["rows"], args.width, lo, hi):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
