"""Tests for tools/obis_export.py (stdlib unittest; urllib is mocked, no network)."""

import contextlib
import datetime
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
import urllib.parse
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import obis_export as ox  # noqa: E402

BBOX = {"north": 30.2, "south": 30.03, "east": -42.02, "west": -42.22}

CHECKLIST = {
    "total": 5,
    "results": [
        {"scientificName": "Bacteria", "taxonID": 6, "taxonRank": "Kingdom",
         "kingdom": "Bacteria", "records": 500},
        {"scientificName": "Bathymodiolus azoricus", "taxonID": 137180, "taxonRank": "Species",
         "kingdom": "Animalia", "phylum": "Mollusca", "class": "Bivalvia", "records": 42},
        {"scientificName": "Coryphaenoides armatus", "taxonID": 158960, "taxonRank": "Species",
         "kingdom": "Animalia", "phylum": "Chordata", "class": "Teleostei", "records": 90},
        {"scientificName": "Chaceon affinis", "taxonID": 107376, "taxonRank": "Species",
         "kingdom": "Animalia", "phylum": "Arthropoda", "class": "Malacostraca", "records": 7},
        {"scientificName": "Chaceon", "taxonID": 106939, "taxonRank": "Genus",
         "kingdom": "Animalia", "phylum": "Arthropoda", "class": "Malacostraca", "records": 60},
    ],
}

OCCURRENCES = {
    137180: [{"depth": 800, "vernacularName": "vent mussel"},
             {"minimumDepthInMeters": 750, "maximumDepthInMeters": 900.5}],
    158960: [{"depth": 2500}, {"depth": 1200, "vernacularName": "abyssal grenadier"},
             {"vernacularName": "abyssal grenadier"}, {"vernacularName": "grenadier"}],
    107376: [],
}


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()


def fake_urlopen(calls):
    def opener(req, timeout=None):
        url = req.full_url if hasattr(req, "full_url") else req
        calls.append(url)
        parsed = urllib.parse.urlparse(url)
        q = urllib.parse.parse_qs(parsed.query)
        if parsed.path.endswith("/checklist"):
            body = CHECKLIST
        elif parsed.path.endswith("/occurrence"):
            recs = OCCURRENCES.get(int(q["taxonid"][0]), [])
            body = {"total": len(recs), "results": recs}
        else:
            raise AssertionError("unexpected URL " + url)
        return FakeResponse(json.dumps(body).encode("utf-8"))
    return opener


class TempCacheCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.calls = []
        self.sleeps = []
        self.patch = mock.patch.object(ox.urllib.request, "urlopen", fake_urlopen(self.calls))
        self.patch.start()

    def tearDown(self):
        self.patch.stop()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def fetcher(self, **kw):
        return ox.Fetcher(cache_dir=os.path.join(self.tmp, "cache"), sleeper=self.sleeps.append,
                          log=lambda m: None, **kw)


class GeometryTests(unittest.TestCase):
    def test_wkt_is_closed_ccw_lon_lat(self):
        wkt = ox.bbox_to_wkt(BBOX)
        self.assertEqual(
            wkt, "POLYGON((-42.22 30.03,-42.02 30.03,-42.02 30.2,-42.22 30.2,-42.22 30.03))")

    def test_bad_bbox(self):
        with self.assertRaises(ValueError):
            ox.bbox_to_wkt({"north": 1, "south": 2, "east": 3, "west": 0})
        with self.assertRaises(ValueError):
            ox.bbox_to_wkt({"north": 2, "south": 1, "east": -179, "west": 179})

    def test_url_keeps_wkt_readable_and_drops_none(self):
        url = ox.build_url("checklist", [("geometry", "POLYGON((1 2,3 4))"), ("startdepth", None),
                                         ("size", 10)])
        self.assertIn("geometry=POLYGON((1+2,3+4))", url)
        self.assertNotIn("startdepth", url)
        self.assertTrue(url.startswith("https://api.obis.org/v3/checklist?"))


class GroupTests(unittest.TestCase):
    def test_groups(self):
        g = ox.classify_group
        self.assertEqual(g({"phylum": "Chordata", "class": "Teleostei"}), "fish")
        self.assertEqual(g({"phylum": "Chordata", "class": "Elasmobranchii"}), "fish")
        self.assertEqual(g({"phylum": "Chordata", "class": "Mammalia"}), "mammal")
        self.assertEqual(g({"phylum": "Chordata", "class": "Ascidiacea"}), "tunicate")
        self.assertEqual(g({"phylum": "Mollusca", "class": "Cephalopoda"}), "mollusc")
        self.assertEqual(g({"phylum": "Arthropoda", "class": "Malacostraca"}), "crustacean")
        self.assertEqual(g({"phylum": "Arthropoda", "class": "Pycnogonida"}), "other")
        self.assertEqual(g({"phylum": "Cnidaria"}), "cnidarian")
        self.assertEqual(g({"phylum": "Echinodermata"}), "echinoderm")
        self.assertEqual(g({"phylum": "Porifera"}), "sponge")
        self.assertEqual(g({"phylum": "Annelida"}), "worm")
        self.assertEqual(g({"kingdom": "Chromista", "phylum": "Foraminifera"}), "protist")
        self.assertEqual(g({"kingdom": "Archaea", "phylum": "Euryarchaeota"}), "microbe")
        self.assertEqual(g({"kingdom": "Animalia", "phylum": "Bryozoa"}), "other")

    def test_no_taxonomy_means_no_group(self):
        self.assertIsNone(ox.classify_group({"scientificName": "x"}))


class SummaryTests(unittest.TestCase):
    def test_depth_range_and_common_name(self):
        rng, common = ox.summarise_records(OCCURRENCES[158960])
        self.assertEqual(rng, [1200, 2500])
        self.assertEqual(common, "abyssal grenadier")

    def test_fractional_depths_and_empty(self):
        self.assertEqual(ox.summarise_records(OCCURRENCES[137180])[0], [750, 900.5])
        self.assertEqual(ox.summarise_records([]), (None, None))
        self.assertEqual(ox.summarise_records([{"depth": -5}, {"depth": True}]), (None, None))


class ExportTests(TempCacheCase):
    NOW = datetime.datetime(2026, 9, 22, 12, 0, 0, tzinfo=datetime.timezone.utc)

    def test_species_rank_top_n(self):
        doc = ox.export("lost-city", BBOX, 600, 1000, top_n=2, rank="species",
                        fetcher=self.fetcher(), now=self.NOW)
        self.assertEqual(doc["version"], 1)
        self.assertEqual(doc["landmark"], "lost-city")
        self.assertEqual(doc["source"], "OBIS")
        self.assertEqual(doc["fetched_at"], "2026-09-22T12:00:00Z")
        self.assertEqual(doc["depth_filter_m"], [600, 1000])
        self.assertIn("startdepth=600", doc["source_url"])
        self.assertIn("invented", doc["note"])
        names = [s["scientificName"] for s in doc["species"]]
        self.assertEqual(names, ["Coryphaenoides armatus", "Bathymodiolus azoricus"])
        first = doc["species"][0]
        self.assertEqual(first, {"scientificName": "Coryphaenoides armatus",
                                 "commonName": "abyssal grenadier", "aphiaID": 158960,
                                 "records": 90, "depthRange_m": [1200, 2500], "group": "fish",
                                 "taxonRank": "Species"})
        self.assertEqual(doc["taxa_matching_rank"], 3)
        self.assertEqual(doc["records_in_bbox"], 699)

    def test_rank_filters(self):
        doc = ox.export("x", BBOX, rank="genus", top_n=10, fetcher=self.fetcher(), now=self.NOW)
        self.assertEqual([s["scientificName"] for s in doc["species"]][:2],
                         ["Coryphaenoides armatus", "Chaceon"])
        self.assertNotIn("depth_filter_m", doc)
        doc = ox.export("x", BBOX, rank="any", top_n=1, fetcher=self.fetcher(), now=self.NOW)
        self.assertEqual(doc["species"][0]["scientificName"], "Bacteria")
        self.assertEqual(doc["species"][0]["group"], "microbe")

    def test_no_invented_keys(self):
        doc = ox.export("x", BBOX, top_n=10, fetcher=self.fetcher(), now=self.NOW)
        crab = [s for s in doc["species"] if s["scientificName"] == "Chaceon affinis"][0]
        self.assertNotIn("commonName", crab)
        self.assertNotIn("depthRange_m", crab)
        self.assertEqual(crab["group"], "crustacean")

    def test_empty_result_writes_empty_list_with_note(self):
        with mock.patch.dict(CHECKLIST, {"total": 0, "results": []}):
            doc = ox.export("x", BBOX, 10000, 11000, fetcher=self.fetcher(), now=self.NOW)
        self.assertEqual(doc["species"], [])
        self.assertIn("no species-rank records", doc["note"])

    def test_cache_and_sleep(self):
        f = self.fetcher()
        ox.export("x", BBOX, top_n=3, fetcher=f, now=self.NOW)
        n = len(self.calls)
        self.assertEqual(n, 1 + 3)  # one checklist page + one occurrence page per taxon
        self.assertEqual(f.network_requests, n)
        self.assertEqual(len(self.sleeps), n)
        self.assertTrue(all(s >= 1.0 for s in self.sleeps))
        self.assertEqual(len(os.listdir(os.path.join(self.tmp, "cache"))), n)
        f2 = self.fetcher()
        ox.export("x", BBOX, top_n=3, fetcher=f2, now=self.NOW)
        self.assertEqual(len(self.calls), n)  # all served from cache
        self.assertEqual(f2.network_requests, 0)
        f3 = self.fetcher(refresh=True)
        ox.export("x", BBOX, top_n=3, fetcher=f3, now=self.NOW)
        self.assertEqual(len(self.calls), 2 * n)

    def test_sleep_floor(self):
        self.assertEqual(ox.Fetcher(sleep_s=0.1).sleep_s, 1.0)

    def test_retries_then_fails(self):
        def boom(req, timeout=None):
            raise ox.urllib.error.URLError("down")
        with mock.patch.object(ox.urllib.request, "urlopen", boom):
            f = self.fetcher(retries=2)
            with self.assertRaises(RuntimeError):
                f.get("https://api.obis.org/v3/checklist?x=1")
            self.assertEqual(f.network_requests, 2)


class CliTests(TempCacheCase):
    def run_cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err), \
                mock.patch.object(ox.time, "sleep", lambda s: None):
            try:
                code = ox.main(list(argv))
            except SystemExit as e:
                code = e.code
        return code, out.getvalue(), err.getvalue()

    def test_help(self):
        code, out, _ = self.run_cli("--help")
        self.assertEqual(code, 0)
        self.assertIn("--landmark", out)
        self.assertIn("--depth-min", out)

    def test_writes_file_with_bbox_override(self):
        path = os.path.join(self.tmp, "out", "species.json")
        code, _, err = self.run_cli("--landmark", "lost-city", "--bbox", "30.2", "30.03", "-42.02",
                                    "-42.22", "--max", "2", "--out", path,
                                    "--cache-dir", os.path.join(self.tmp, "c"))
        self.assertEqual(code, 0, err)
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
        self.assertEqual(len(doc["species"]), 2)
        self.assertEqual(doc["bbox"], BBOX)

    def test_landmark_bbox_lookup(self):
        bbox = ox.load_landmark_bbox("lost-city")
        self.assertEqual(set(bbox), {"north", "south", "east", "west"})
        with self.assertRaises(KeyError):
            ox.load_landmark_bbox("no-such-landmark")

    def test_bad_args(self):
        self.assertEqual(self.run_cli("--landmark", "no-such-landmark")[0], 2)
        self.assertEqual(self.run_cli("--landmark", "x", "--bbox", "1", "2", "3", "0")[0], 2)
        self.assertEqual(self.run_cli("--landmark", "x", "--bbox", "2", "1", "3", "0",
                                      "--depth-min", "10", "--depth-max", "5")[0], 2)


if __name__ == "__main__":
    unittest.main()
