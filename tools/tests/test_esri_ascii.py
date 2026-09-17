#!/usr/bin/env python3
"""Unit tests for the ESRI ASCII parser. Run: python3 -m unittest discover tools/tests"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from esri_ascii import EsriAsciiError, fill_nodata, parse_esri_ascii  # noqa: E402

FIXTURE = """ncols 4
nrows 3
xllcorner -50.0
yllcorner 41.0
cellsize 0.25
NODATA_value -9999
-100.0 -110.0 -120.0 -130.0
-105.0 -9999 -125.0 -135.0
-110.0 -120.0 -130.0 -140.0
"""

# Same grid expressed with *center* coordinates and ragged line wrapping.
FIXTURE_CENTER = """NCOLS 4
NROWS 3
XLLCENTER -49.875
YLLCENTER 41.125
CELLSIZE 0.25
nodata_value -9999
-100.0 -110.0
-120.0 -130.0 -105.0 -9999
-125.0 -135.0 -110.0
-120.0 -130.0 -140.0
"""


class TestParse(unittest.TestCase):
    def test_header_and_values(self):
        g = parse_esri_ascii(FIXTURE.splitlines())
        self.assertEqual((g.ncols, g.nrows), (4, 3))
        self.assertAlmostEqual(g.cellsize, 0.25)
        self.assertAlmostEqual(g.nodata_value, -9999.0)
        self.assertEqual(len(g.values), 12)
        # Row 0 is the NORTH edge.
        self.assertEqual(g.values[:4], [-100.0, -110.0, -120.0, -130.0])
        self.assertEqual(g.values[-1], -140.0)

    def test_derived_bounds(self):
        g = parse_esri_ascii(FIXTURE.splitlines())
        self.assertAlmostEqual(g.west, -50.0)
        self.assertAlmostEqual(g.south, 41.0)
        self.assertAlmostEqual(g.east, -49.0)   # -50 + 4*0.25
        self.assertAlmostEqual(g.north, 41.75)  # 41 + 3*0.25

    def test_center_variant_matches_corner_variant(self):
        a = parse_esri_ascii(FIXTURE.splitlines())
        b = parse_esri_ascii(FIXTURE_CENTER.splitlines())
        self.assertAlmostEqual(a.xllcorner, b.xllcorner, places=9)
        self.assertAlmostEqual(a.yllcorner, b.yllcorner, places=9)
        self.assertEqual(a.values, b.values)

    def test_cell_count_mismatch_raises(self):
        bad = FIXTURE.replace("-130.0 -140.0", "-130.0")
        with self.assertRaises(EsriAsciiError):
            parse_esri_ascii(bad.splitlines())

    def test_missing_header_raises(self):
        with self.assertRaises(EsriAsciiError):
            parse_esri_ascii("ncols 2\nnrows 2\n1 2 3 4\n".splitlines())


class TestFillNodata(unittest.TestCase):
    def test_fills_hole_with_neighbour_mean(self):
        g = parse_esri_ascii(FIXTURE.splitlines())
        filled, count = fill_nodata(list(g.values), g.ncols, g.nrows, g.nodata_value)
        self.assertEqual(count, 1)
        self.assertNotIn(-9999.0, filled)
        # Hole at (row 1, col 1): neighbours -110 (N), -120 (S), -105 (W), -125 (E).
        self.assertAlmostEqual(filled[5], (-110.0 + -120.0 + -105.0 + -125.0) / 4.0)

    def test_no_holes_is_a_noop(self):
        vals = [1.0, 2.0, 3.0, 4.0]
        filled, count = fill_nodata(vals, 2, 2, -9999.0)
        self.assertEqual(count, 0)
        self.assertEqual(filled, vals)

    def test_interior_block_fills_inward(self):
        n = -9999.0
        vals = [
            -10.0, -10.0, -10.0, -10.0,
            -10.0, n, n, -10.0,
            -10.0, n, n, -10.0,
            -10.0, -10.0, -10.0, -10.0,
        ]
        filled, count = fill_nodata(vals, 4, 4, n)
        self.assertEqual(count, 4)
        self.assertTrue(all(v == -10.0 for v in filled), filled)

    def test_all_nodata_falls_back_to_zero(self):
        filled, count = fill_nodata([-9999.0] * 4, 2, 2, -9999.0)
        self.assertEqual(count, 4)
        self.assertEqual(filled, [0.0] * 4)


if __name__ == "__main__":
    unittest.main()
