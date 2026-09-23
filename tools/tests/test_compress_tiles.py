#!/usr/bin/env python3
"""Unit tests for tools/compress_tiles.py and the 16-bit tile variant."""

import contextlib
import gzip
import io
import json
import os
import shutil
import struct
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import compress_tiles as ct  # noqa: E402
import inspect_tile  # noqa: E402
from tile_writer import (DERIVED_FILES, QUANT16_MAX, build_meta, dequantize16,  # noqa: E402
                         quantize16, write_tile)

BBOX = {"north": 41.9, "south": 41.6, "east": -49.8, "west": -50.1}


def make_tile(root, tile_id="t", cols=40, rows=30):
    values = [-3000.0 - (c * 7.3) - (r * 11.9) + ((c * r) % 13) * 0.37
              for r in range(rows) for c in range(cols)]
    meta = build_meta(tile_id, values, cols, rows, BBOX, 0.01, 0, "synthetic", "test")
    write_tile(root, meta, values)
    return os.path.join(root, tile_id), values


class TestGzip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_round_trip_equals_original_and_is_reproducible(self):
        tile_dir, _ = make_tile(self.tmp)
        with contextlib.redirect_stdout(io.StringIO()):
            row = ct.process_tile(tile_dir)
        src = os.path.join(tile_dir, "heightmap.bin")
        gz = src + ".gz"
        with open(src, "rb") as fh:
            original = fh.read()
        with open(gz, "rb") as fh:
            packed = fh.read()
        self.assertEqual(gzip.decompress(packed), original)
        self.assertEqual(row["gz"], len(packed))
        self.assertLess(row["gz"], row["bin"])
        self.assertTrue(ct.verify_gzip(src, gz))
        # mtime=0: compressing again yields byte-identical output.
        self.assertEqual(ct.gzip_bytes(original), packed)

    def test_up_to_date_outputs_are_not_rewritten(self):
        tile_dir, _ = make_tile(self.tmp)
        ct.process_tile(tile_dir)
        gz = os.path.join(tile_dir, "heightmap.bin.gz")
        os.utime(gz, (4e9, 4e9))  # far future
        ct.process_tile(tile_dir)
        self.assertEqual(os.path.getmtime(gz), 4e9)
        ct.process_tile(tile_dir, force=True)
        self.assertNotEqual(os.path.getmtime(gz), 4e9)

    def test_list_tiles_skips_dirs_without_meta(self):
        make_tile(self.tmp, "a")
        os.makedirs(os.path.join(self.tmp, "_samples"))
        self.assertEqual(ct.list_tiles(self.tmp), ["a"])
        self.assertEqual(ct.list_tiles(self.tmp, {"zzz"}), [])


class TestQuant16(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_quantize_bounds_and_error(self):
        vals = [-10.0, -7.5, -2.5, 0.0]
        q, lo, scale = quantize16(vals, -10.0, 0.0)
        self.assertEqual(q[0], 0)
        self.assertEqual(q[-1], QUANT16_MAX)
        for a, b in zip(vals, dequantize16(q, lo, scale)):
            self.assertLessEqual(abs(a - b), scale / 2 + 1e-12)
        q, lo, scale = quantize16([5.0, 5.0], 5.0, 5.0)  # flat tile
        self.assertEqual(list(q), [0, 0])
        self.assertEqual(scale, 1.0)

    def test_quant16_file_meta_and_inspect(self):
        tile_dir, values = make_tile(self.tmp)
        with contextlib.redirect_stdout(io.StringIO()):
            row = ct.process_tile(tile_dir, quant16=True)
        with open(os.path.join(tile_dir, "meta.json")) as fh:
            meta = json.load(fh)
        self.assertIn("quant_min_m", meta)
        self.assertIn("quant_scale", meta)
        path16 = os.path.join(tile_dir, "heightmap16.bin")
        self.assertEqual(os.path.getsize(path16), meta["cols"] * meta["rows"] * 2)
        with open(path16, "rb") as fh:
            q = struct.unpack("<%dH" % (meta["cols"] * meta["rows"]), fh.read())
        back = dequantize16(q, meta["quant_min_m"], meta["quant_scale"])
        f32 = struct.unpack("<%df" % len(values), struct.pack("<%df" % len(values), *values))
        err = max(abs(a - b) for a, b in zip(f32, back))
        self.assertLessEqual(err, meta["quant_scale"] / 2 + 1e-3)
        self.assertAlmostEqual(row["q16_err"], err, places=6)
        self.assertTrue(os.path.isfile(path16 + ".gz"))
        # inspect_tile decodes the same variant.
        via_inspect = inspect_tile.load_heightmap16(self.tmp, meta)
        self.assertEqual(len(via_inspect), len(values))
        self.assertAlmostEqual(via_inspect[5], back[5], places=6)

    def test_rewriting_a_tile_drops_stale_derived_files(self):
        tile_dir, values = make_tile(self.tmp)
        ct.process_tile(tile_dir, quant16=True)
        self.assertTrue(os.path.isfile(os.path.join(tile_dir, "heightmap16.bin")))
        make_tile(self.tmp)  # a re-fetch rewrites heightmap.bin + meta.json
        for name in DERIVED_FILES:
            self.assertFalse(os.path.exists(os.path.join(tile_dir, name)), name)
        with open(os.path.join(tile_dir, "meta.json")) as fh:
            self.assertNotIn("quant_scale", json.load(fh))


if __name__ == "__main__":
    unittest.main()
