#!/usr/bin/env python3
"""Unit tests for tools/fetch_all.py -- offline; the network is faked."""

import contextlib
import io
import json
import math
import os
import shutil
import sys
import tempfile
import unittest
import urllib.error

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import fetch_all as fa  # noqa: E402
from tile_writer import build_meta, write_tile  # noqa: E402

# Real GMRT metadata response for the Titanic box (2026-09-22), trimmed.
TITANIC_METADATA = {
    "grid_bounds": {"west": "-50.100403", "east": "-49.799927",
                    "south": "41.579703", "north": "41.880195"},
    "meters_per_node": "61.15", "width": 547, "height": 733, "nodes": 400951,
}

FIXTURE_ASC = """ncols 4
nrows 3
xllcorner -16.2
yllcorner 48.3
cellsize 0.01
nodata_value -2147483648
-4700 -4750 -4800 -4790
-4710 -2147483648 -4810 -4795
-4720 -4770 -4820 -4799
"""


def quiet():
    return contextlib.redirect_stdout(io.StringIO())


class FakeClock:
    def __init__(self):
        self.t = 0.0
        self.slept = []

    def clock(self):
        return self.t

    def sleep(self, s):
        self.slept.append(s)
        self.t += s


class TestPlanBbox(unittest.TestCase):
    def test_small_box_is_expanded_and_centred_on_the_landmark(self):
        lm = {"id": "w", "lat": 48.3336, "lon": -16.1067,
              "bbox": {"north": 48.36, "south": 48.30, "east": -16.06, "west": -16.15}}
        b, note = fa.plan_bbox(lm)
        self.assertIn("expanded", note)
        self.assertAlmostEqual(b["north"] - b["south"], fa.MIN_SPAN_DEG, places=3)
        # Longitude span widened by 1/cos(lat) so the box is ~square on the ground.
        want_lon = fa.MIN_SPAN_DEG / math.cos(math.radians(48.3336))
        self.assertAlmostEqual(b["east"] - b["west"], want_lon, places=3)
        self.assertAlmostEqual((b["north"] + b["south"]) / 2, 48.3336, places=3)
        self.assertAlmostEqual((b["east"] + b["west"]) / 2, -16.1067, places=3)
        ew, ns = fa.bbox_extent_km(b)
        self.assertAlmostEqual(ew, ns, delta=0.5)

    def test_giant_box_is_shrunk_around_the_landmark_point(self):
        lm = {"id": "g", "lat": 30.0, "lon": -79.5,
              "bbox": {"north": 31.0, "south": 29.0, "east": -78.5, "west": -80.5}}
        b, note = fa.plan_bbox(lm)
        self.assertIn("shrunk", note)
        self.assertAlmostEqual(b["north"] - b["south"], fa.MAX_SPAN_DEG, places=3)
        self.assertAlmostEqual(b["east"] - b["west"], fa.MAX_SPAN_DEG, places=3)
        cols, rows, _ = fa.estimate_grid(b)
        self.assertLessEqual(max(cols, rows), fa.MAX_SIDE_CELLS + 1)

    def test_box_within_limits_keeps_its_edges(self):
        bbox = {"north": 39.65, "south": 39.15, "east": -72.1, "west": -72.7}
        b, note = fa.plan_bbox({"id": "h", "lat": 39.4, "lon": -72.4, "bbox": bbox})
        self.assertEqual(b, bbox)
        self.assertIn("as-is", note)

    def test_high_latitude_longitude_is_capped_by_the_cell_budget(self):
        lm = {"id": "e", "lat": -68.73, "lon": -52.32,
              "bbox": {"north": -68.68, "south": -68.78, "east": -52.25, "west": -52.4}}
        b, _ = fa.plan_bbox(lm)
        self.assertAlmostEqual(b["east"] - b["west"], fa.MAX_SPAN_DEG, places=3)
        self.assertAlmostEqual(b["north"] - b["south"], fa.MIN_SPAN_DEG, places=3)

    def test_overrides(self):
        lm = {"id": "c", "lat": 11.3733, "lon": 142.5917,
              "bbox": {"north": 11.55, "south": 11.2, "east": 142.75, "west": 142.4}}
        b, _ = fa.plan_bbox(lm, {"min_span": 0.5, "max_span": 0.5})
        self.assertAlmostEqual(b["north"] - b["south"], 0.5, places=3)
        self.assertAlmostEqual(b["east"] - b["west"], 0.5, places=3)
        pinned = {"north": 1.0, "south": 0.0, "east": 1.0, "west": 0.0}
        self.assertEqual(fa.plan_bbox(lm, {"pinned": pinned})[0], pinned)

    def test_every_tier2_plan_fits_the_budget(self):
        lms = fa.load_landmarks(os.path.join(os.path.dirname(__file__), "..", "..",
                                             "data", "landmarks.json"))
        for tid in fa.TIER2:
            self.assertIn(tid, lms, tid)
            b, _ = fa.plan_bbox(lms[tid], fa.OVERRIDES.get(tid))
            cols, rows, nbytes = fa.estimate_grid(b)
            self.assertLessEqual(nbytes, fa.MAX_TILE_BYTES, tid)
            self.assertLessEqual(max(cols, rows), fa.MAX_SIDE_HARD, tid)
            self.assertGreaterEqual(b["north"] - b["south"], 0.15, tid)


class TestSizeEstimation(unittest.TestCase):
    def test_estimate_grid(self):
        cols, rows, nbytes = fa.estimate_grid(
            {"north": 41.88, "south": 41.58, "east": -49.8, "west": -50.1})
        self.assertEqual((cols, rows), (547, 547))  # actual GMRT grid: 548x546
        self.assertEqual(nbytes, 547 * 547 * 4)

    def test_estimate_from_metadata_ignores_mercator_height(self):
        cols, rows, nbytes, cell = fa.estimate_from_metadata(TITANIC_METADATA)
        self.assertEqual(cols, 547)
        self.assertAlmostEqual(rows, 546, delta=2)  # not 733
        self.assertAlmostEqual(cell, fa.NATIVE_CELL_DEG, places=6)
        self.assertEqual(nbytes, cols * rows * 4)
        self.assertIsNone(fa.estimate_from_metadata({"width": 3}))

    def test_fits_budget(self):
        self.assertTrue(fa.fits_budget(1200, 1200))
        self.assertFalse(fa.fits_budget(1500, 1400))  # 8.4 MB
        self.assertFalse(fa.fits_budget(1600, 10))  # too long a side


class TestHttp(unittest.TestCase):
    def test_throttle_enforces_the_two_second_floor(self):
        fc = FakeClock()
        th = fa.Throttle(0.1, sleep=fc.sleep, clock=fc.clock)
        th.wait()
        th.wait()
        self.assertEqual(fc.slept, [fa.MIN_SLEEP_S])
        self.assertEqual(th.requests, 2)

    def test_retry_with_backoff_then_success(self):
        fc = FakeClock()
        th = fa.Throttle(2.0, sleep=fc.sleep, clock=fc.clock)
        calls = []

        def flaky(url, timeout):
            calls.append(url)
            if len(calls) < 3:
                raise urllib.error.URLError("timed out")
            return "ncols 1"

        with quiet():
            out = fa.get_with_retry("u", th, 5, 3, fa._is_esri, flaky, fc.sleep)
        self.assertEqual(out, "ncols 1")
        self.assertEqual(len(calls), 3)
        self.assertIn(fa.BACKOFF_BASE_S, fc.slept)
        self.assertIn(fa.BACKOFF_BASE_S * 2, fc.slept)

    def test_client_errors_and_html_bodies(self):
        fc = FakeClock()
        th = fa.Throttle(2.0, sleep=fc.sleep, clock=fc.clock)
        calls = []

        def not_found(url, timeout):
            calls.append(url)
            raise urllib.error.HTTPError(url, 404, "nf", None, None)

        with quiet(), self.assertRaises(fa.FetchError):
            fa.get_with_retry("u", th, 5, 3, None, not_found, fc.sleep)
        self.assertEqual(len(calls), 1)  # 4xx is not retried

        with quiet(), self.assertRaises(fa.FetchError):
            fa.get_with_retry("u", th, 5, 1, fa._is_esri,
                              lambda url, timeout: "<html>error</html>", fc.sleep)

    def test_etopo_url_uses_0_360_longitudes(self):
        url = fa.etopo_url({"north": 41.88, "south": 41.58, "east": -49.8, "west": -50.1})
        self.assertIn("(309.9):(310.2)", url)
        self.assertIn("(41.58):(41.88)", url)
        self.assertTrue(url.startswith(fa.ETOPO_URL + "?"))


class TestFetchOneAndIndex(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.out = os.path.join(self.tmp, "tiles")
        self.raw = os.path.join(self.tmp, "raw")
        self.fc = FakeClock()
        self.calls = []
        self.lm = {"id": "bismarck", "lat": 48.32, "lon": -16.18, "depth_m": 4791,
                   "bbox": {"north": 48.36, "south": 48.30, "east": -16.06, "west": -16.15}}

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def ctx(self, http_get, fallback=True):
        return {"out": self.out, "raw": self.raw, "retries": 1, "timeout": 5,
                "throttle": fa.Throttle(2.0, sleep=self.fc.sleep, clock=self.fc.clock),
                "sleep": self.fc.sleep, "http_get": http_get, "fallback": fallback}

    def fake_gmrt(self, url, timeout):
        self.calls.append(url)
        if "/metadata" in url:
            return json.dumps({"width": 4, "meters_per_node": "61",
                               "grid_bounds": {"west": -16.2, "east": -16.16,
                                               "south": 48.3, "north": 48.33}})
        return FIXTURE_ASC

    def test_writes_tile_regenerates_index_and_caches(self):
        # A pre-existing tile must survive index regeneration.
        write_tile(self.out, build_meta("older", [-1.0] * 4, 2, 2,
                                        {"north": 1, "south": 0, "east": 1, "west": 0},
                                        0.5, 0, "synthetic", "x"), [-1.0] * 4)
        with quiet():
            meta = fa.fetch_one("bismarck", self.lm, self.ctx(self.fake_gmrt))
        self.assertEqual((meta["cols"], meta["rows"]), (4, 3))
        self.assertEqual(meta["source"], "GMRT")
        self.assertEqual(meta["resolution"], "max")
        self.assertEqual(meta["nodata_count"], 1)
        self.assertIn("requested_bbox", meta)
        self.assertEqual(os.path.getsize(os.path.join(self.out, "bismarck", "heightmap.bin")), 48)
        with open(os.path.join(self.out, "index.json")) as fh:
            ids = [t["id"] for t in json.load(fh)["tiles"]]
        self.assertEqual(ids, ["bismarck", "older"])
        self.assertEqual(len(self.calls), 2)  # metadata + grid
        self.assertEqual(len(self.fc.slept), 1)  # throttled between them

        # Second run: everything comes from the raw cache, no HTTP at all.
        with quiet():
            fa.fetch_one("bismarck", self.lm, self.ctx(self.fake_gmrt))
        self.assertEqual(len(self.calls), 2)

    def test_falls_back_to_etopo_when_gmrt_fails(self):
        def gmrt_down(url, timeout):
            self.calls.append(url)
            if "gmrt.org" in url:
                raise urllib.error.URLError("connection refused")
            return FIXTURE_ASC.replace("xllcorner", "xllcenter").replace("yllcorner", "yllcenter")

        with quiet():
            meta = fa.fetch_one("bismarck", self.lm, self.ctx(gmrt_down))
        self.assertEqual(meta["source"], "ETOPO 2022")
        self.assertEqual(meta["resolution"], "15s")
        self.assertIn("ETOPO", meta["attribution"])
        self.assertTrue(any("erddap" in u for u in self.calls))

    def test_no_fallback_raises_and_writes_nothing(self):
        def down(url, timeout):
            raise urllib.error.URLError("down")

        with quiet(), self.assertRaises(fa.FetchError):
            fa.fetch_one("bismarck", self.lm, self.ctx(down, fallback=False))
        self.assertFalse(os.path.exists(os.path.join(self.out, "bismarck")))

    def test_depth_check_against_published_depth(self):
        with quiet():
            meta = fa.fetch_one("bismarck", self.lm, self.ctx(self.fake_gmrt))
        heights = fa.read_heights(os.path.join(self.out, "bismarck"), meta)
        check, point = fa.depth_check(meta, heights, self.lm)
        self.assertTrue(check.startswith("ok"), check)
        self.assertIsNotNone(point)
        bad, _ = fa.depth_check(meta, heights, dict(self.lm, depth_m=124, depth_range_m=None))
        self.assertIn("outside tile range", bad)
        rows = fa.tile_rows(self.out, ["bismarck", "absent"], {"bismarck": self.lm})
        self.assertTrue(rows[1]["missing"])
        self.assertEqual(rows[0]["bytes"], 48)


if __name__ == "__main__":
    unittest.main()
