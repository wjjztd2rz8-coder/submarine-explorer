#!/usr/bin/env python3
"""Write compressed (and optionally 16-bit quantised) copies of tile heightmaps.

Stdlib only. For every data/tiles/<id>/heightmap.bin this writes:

    heightmap.bin.gz     gzip level 9, mtime=0 (byte-reproducible), verified by
                         decompressing and comparing with the original
    heightmap.bin.br     only if the `brotli` CLI is on PATH (quality 11)

and with --quant16 additionally:

    heightmap16.bin      little-endian uint16; metres = quant_min_m + q * quant_scale
                         (the two keys are added to meta.json via tile_writer)
    heightmap16.bin.gz   (+ .br if brotli exists)

heightmap.bin (float32) stays canonical: the loader reads it by default and the
.gz/.br files are for static hosts that serve pre-compressed assets
(Content-Encoding) -- see docs/tiles-inventory.md.

Without the brotli CLI, generate .br in CI with e.g.:
    sudo apt-get install -y brotli
    find data/tiles -name 'heightmap*.bin' -exec brotli -q 11 -f -k {} \\;

Examples:
    python3 tools/compress_tiles.py                 # all tiles, gzip (+br)
    python3 tools/compress_tiles.py --quant16       # also 16-bit variant
    python3 tools/compress_tiles.py --only titanic --force
    python3 tools/compress_tiles.py --check         # verify existing .gz only
"""

import argparse
import array
import gzip
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tile_writer import HEIGHTMAP16, dequantize16, write_heightmap16  # noqa: E402

GZIP_LEVEL = 9
BROTLI_QUALITY = "11"


def gzip_bytes(data):
    # mtime=0 and no embedded filename -> identical input gives identical output.
    return gzip.compress(data, compresslevel=GZIP_LEVEL, mtime=0)


def gzip_file(src, dst):
    """Gzip src -> dst, verify the round trip, return compressed size."""
    with open(src, "rb") as fh:
        data = fh.read()
    packed = gzip_bytes(data)
    if gzip.decompress(packed) != data:
        raise RuntimeError("gzip round trip failed for %s" % src)
    tmp = dst + ".part"
    with open(tmp, "wb") as fh:
        fh.write(packed)
    os.replace(tmp, dst)
    return len(packed)


def verify_gzip(src, gz):
    with open(src, "rb") as fh:
        data = fh.read()
    with open(gz, "rb") as fh:
        return gzip.decompress(fh.read()) == data


def brotli_cli():
    return shutil.which("brotli")


def brotli_file(exe, src, dst):
    subprocess.run([exe, "-q", BROTLI_QUALITY, "-f", "-o", dst, src], check=True)
    return os.path.getsize(dst)


def up_to_date(src, dst):
    return os.path.isfile(dst) and os.path.getmtime(dst) >= os.path.getmtime(src)


def list_tiles(root, only=None):
    out = []
    if not os.path.isdir(root):
        return out
    for name in sorted(os.listdir(root)):
        d = os.path.join(root, name)
        if only and name not in only:
            continue
        if os.path.isfile(os.path.join(d, "meta.json")) and os.path.isfile(
                os.path.join(d, "heightmap.bin")):
            out.append(name)
    return out


def read_float32(path):
    arr = array.array("f")
    with open(path, "rb") as fh:
        arr.frombytes(fh.read())
    if sys.byteorder == "big":
        arr.byteswap()
    return arr


def read_uint16(path):
    arr = array.array("H")
    with open(path, "rb") as fh:
        arr.frombytes(fh.read())
    if sys.byteorder == "big":
        arr.byteswap()
    return arr


def make_quant16(tile_dir):
    """Write heightmap16.bin + meta keys; return (bytes, max_abs_error_m)."""
    with open(os.path.join(tile_dir, "meta.json")) as fh:
        meta = json.load(fh)
    values = read_float32(os.path.join(tile_dir, "heightmap.bin"))
    if len(values) != meta["cols"] * meta["rows"]:
        raise RuntimeError("%s: heightmap.bin size disagrees with meta.json" % tile_dir)
    meta = write_heightmap16(tile_dir, meta, values)
    q = read_uint16(os.path.join(tile_dir, HEIGHTMAP16))
    back = dequantize16(q, meta["quant_min_m"], meta["quant_scale"])
    err = max(abs(a - b) for a, b in zip(values, back))
    return os.path.getsize(os.path.join(tile_dir, HEIGHTMAP16)), err


def process_tile(tile_dir, quant16=False, force=False, brotli=None):
    row = {"id": os.path.basename(tile_dir)}
    src = os.path.join(tile_dir, "heightmap.bin")
    row["bin"] = os.path.getsize(src)

    sources = [("", src)]
    if quant16:
        q16 = os.path.join(tile_dir, HEIGHTMAP16)
        if force or not up_to_date(src, q16):
            row["q16"], row["q16_err"] = make_quant16(tile_dir)
        else:
            row["q16"], row["q16_err"] = os.path.getsize(q16), None
        sources.append(("q16_", q16))

    for prefix, path in sources:
        gz = path + ".gz"
        if force or not up_to_date(path, gz):
            row[prefix + "gz"] = gzip_file(path, gz)
        else:
            row[prefix + "gz"] = os.path.getsize(gz)
        if brotli:
            br = path + ".br"
            if force or not up_to_date(path, br):
                row[prefix + "br"] = brotli_file(brotli, path, br)
            else:
                row[prefix + "br"] = os.path.getsize(br)
    return row


def _mb(n):
    return "%.2f" % (n / 1e6) if n else "-"


def _pct(n, d):
    return "%.1f%%" % (100.0 * n / d) if n and d else "-"


def print_report(rows, quant16):
    cols = ["id", "f32 MB", "gz MB", "gz %", "br MB"]
    if quant16:
        cols += ["u16 MB", "u16.gz MB", "u16.gz %", "u16 max err m"]
    fmt = "%-22s" + " %10s" * (len(cols) - 1)
    print(fmt % tuple(cols))
    print("-" * (22 + 11 * (len(cols) - 1)))
    tot = {}
    for r in rows:
        for k in ("bin", "gz", "br", "q16", "q16_gz"):
            tot[k] = tot.get(k, 0) + (r.get(k) or 0)
        vals = [r["id"], _mb(r["bin"]), _mb(r.get("gz")), _pct(r.get("gz"), r["bin"]),
                _mb(r.get("br"))]
        if quant16:
            err = r.get("q16_err")
            vals += [_mb(r.get("q16")), _mb(r.get("q16_gz")), _pct(r.get("q16_gz"), r["bin"]),
                     "%.3f" % err if err is not None else "-"]
        print(fmt % tuple(vals))
    print("-" * (22 + 11 * (len(cols) - 1)))
    vals = ["TOTAL", _mb(tot["bin"]), _mb(tot["gz"]), _pct(tot["gz"], tot["bin"]), _mb(tot["br"])]
    if quant16:
        vals += [_mb(tot["q16"]), _mb(tot["q16_gz"]), _pct(tot["q16_gz"], tot["bin"]), ""]
    print(fmt % tuple(vals))
    print("(%% columns are relative to the float32 heightmap.bin size)")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="data/tiles", help="tile root (default data/tiles)")
    ap.add_argument("--only", action="append", metavar="ID", help="tile id (repeatable)")
    ap.add_argument("--quant16", action="store_true",
                    help="also write heightmap16.bin (+ quant_min_m/quant_scale meta keys)")
    ap.add_argument("--no-brotli", action="store_true", help="skip .br even if brotli exists")
    ap.add_argument("--force", action="store_true", help="rewrite outputs even if up to date")
    ap.add_argument("--check", action="store_true",
                    help="only verify that existing .gz files decode to heightmap.bin")
    args = ap.parse_args(argv)

    tiles = list_tiles(args.out, set(args.only) if args.only else None)
    if not tiles:
        raise SystemExit("no tiles found under %s" % args.out)

    if args.check:
        bad = 0
        for tid in tiles:
            src = os.path.join(args.out, tid, "heightmap.bin")
            gz = src + ".gz"
            if not os.path.isfile(gz):
                print("%-22s no .gz" % tid)
                continue
            ok = verify_gzip(src, gz)
            bad += not ok
            print("%-22s %s" % (tid, "ok" if ok else "MISMATCH"))
        return 1 if bad else 0

    brotli = None if args.no_brotli else brotli_cli()
    if not brotli and not args.no_brotli:
        print("[brotli] CLI not found; skipping .br (see --help for the CI recipe)")
    rows = [process_tile(os.path.join(args.out, tid), args.quant16, args.force, brotli)
            for tid in tiles]
    print_report(rows, args.quant16)
    return 0


if __name__ == "__main__":
    sys.exit(main())
