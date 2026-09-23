"""Tests for tools/validate_landmark.py (stdlib unittest, temp repo fixtures)."""

import contextlib
import copy
import io
import json
import os
import shutil
import struct
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import validate_landmark as vl  # noqa: E402

LM = "testmark"
COLS, ROWS = 10, 8
BBOX = {"north": 10.8, "south": 10.0, "east": 21.0, "west": 20.0}
HULLS = {"A": -1000.0, "B": -4500.0, "C": -11000.0}


def depth_at(col, row):
    """Synthetic seabed: 1000 m on the west edge, deepening 100 m per column."""
    return 1000.0 + 100.0 * col + 0.0 * row


def cell_centre(col, row):
    dlon = (BBOX["east"] - BBOX["west"]) / COLS
    dlat = (BBOX["north"] - BBOX["south"]) / ROWS
    return BBOX["north"] - (row + 0.5) * dlat, BBOX["west"] + (col + 0.5) * dlon


def good_content():
    lat3, lon3 = cell_centre(3, 4)  # seabed 1300 m
    lat5, lon5 = cell_centre(5, 2)  # seabed 1500 m
    lat1, lon1 = cell_centre(1, 1)  # seabed 1100 m
    src = ["https://example.org/a"]
    pois = {"version": 1, "landmark": LM, "pois": [
        {"id": "p-main", "name": "Main", "lat": lat3, "lon": lon3, "depth_m": 1290, "radius_m": 150,
         "kind": "geology", "primary": True, "guide_entry": "main", "confidence": "high",
         "reconstruction": False, "sources": src},
        {"id": "p-two", "name": "Two", "lat": lat5, "lon": lon5, "snap_to_seabed": True,
         "radius_m": 100, "kind": "vent", "primary": True, "guide_entry": "two",
         "confidence": "medium", "reconstruction": True, "sources": src},
        {"id": "p-side", "name": "Side", "lat": lat1, "lon": lon1, "depth_m": 1080, "radius_m": 100,
         "kind": "other", "primary": False, "guide_entry": "main", "confidence": "low",
         "reconstruction": False, "sources": src},
    ]}
    two_sources = [{"title": "A", "url": "https://example.org/a"},
                   {"title": "B", "url": "https://example.org/b"}]

    def entry(eid):
        return {"id": eid, "title": eid.title(), "paragraphs": ["One.", "Two."],
                "facts": [{"label": "Depth", "value": "1,300 m"}], "confidence": "high",
                "reconstruction": False, "sources": two_sources}

    guide = {"version": 1, "landmark": LM,
             "entries": [entry("overview"), entry("main"), entry("two")]}
    mission = {"version": 1, "landmark": LM, "tile": LM, "title": "Test dive", "hull_class": "B",
               "spawn": {"lat": lat1, "lon": lon1, "depth_m": 5, "heading_deg": 90},
               "briefing": {"summary": "S.", "depth_m": 1300, "facts": ["f"], "hazards": ["h"]},
               "objectives": [
                   {"id": "o1", "type": "scan", "poi": "p-main", "primary": True, "title": "Scan main"},
                   {"id": "o2", "type": "scan", "poi": "p-two", "primary": True, "title": "Scan two"},
                   {"id": "o3", "type": "scan", "poi": "p-side", "primary": False, "title": "Side"}],
               "completion": "all_primary",
               "environment": {"preset": "vent", "overrides": {"fluid": "carbonate"}},
               "species_file": "species.json"}
    props = {"version": 1, "landmark": LM, "props": [
        {"id": "c1", "model": "procedural:chimney", "lat": lat5, "lon": lon5, "snap_to_seabed": True,
         "dimensions_m": [8, 8, 30], "collision": "box", "reconstruction": True}]}
    species = {"version": 1, "landmark": LM, "source": "OBIS",
               "source_url": "https://api.obis.org/v3/checklist?x", "fetched_at": "2026-09-22T00:00:00Z",
               "bbox": dict(BBOX), "depth_filter_m": [500, 2000], "note": "Placement is invented.",
               "species": [{"scientificName": "Aus bus", "aphiaID": 1, "records": 3,
                            "depthRange_m": [900, 1200], "group": "fish"}]}
    return {"pois.json": pois, "guide.json": guide, "mission.json": mission,
            "props.json": props, "species.json": species}


class ValidateLandmarkTests(unittest.TestCase):
    def setUp(self):
        self.repo = tempfile.mkdtemp()
        tdir = os.path.join(self.repo, "data", "tiles", LM)
        os.makedirs(tdir)
        meta = {"id": LM, "bbox": BBOX, "cols": COLS, "rows": ROWS, "center": {"lat": 10.4, "lon": 20.5}}
        with open(os.path.join(tdir, "meta.json"), "w") as f:
            json.dump(meta, f)
        vals = [-depth_at(c, r) for r in range(ROWS) for c in range(COLS)]
        with open(os.path.join(tdir, "heightmap.bin"), "wb") as f:
            f.write(struct.pack("<%df" % len(vals), *vals))
        self.folder = os.path.join(self.repo, "data", "landmarks", LM)
        os.makedirs(self.folder)
        self.write(good_content())
        with open(os.path.join(self.folder, "sources.md"), "w") as f:
            f.write("# sources\n")

    def tearDown(self):
        shutil.rmtree(self.repo, ignore_errors=True)

    def write(self, docs):
        for name, doc in docs.items():
            with open(os.path.join(self.folder, name), "w") as f:
                if isinstance(doc, str):
                    f.write(doc)
                else:
                    json.dump(doc, f)

    def validate(self, tolerance=60.0):
        return vl.validate_landmark(LM, repo=self.repo, tolerance=tolerance, hulls=HULLS)

    def mutate(self, name, fn):
        docs = good_content()
        fn(docs[name])
        self.write({name: docs[name]})
        return self.validate()

    def assertError(self, rep, fragment):
        self.assertTrue(any(fragment in e for e in rep.errors),
                        "no error containing %r in %r" % (fragment, rep.errors))

    # ---- happy path -----------------------------------------------------

    def test_good_content_is_clean(self):
        rep = self.validate()
        self.assertEqual(rep.errors, [])
        self.assertEqual(rep.warnings, [])

    def test_terrain_sampling(self):
        tile = vl.Tile(os.path.join(self.repo, "data", "tiles", LM))
        lat, lon = cell_centre(3, 4)
        self.assertAlmostEqual(tile.seabed_depth(lat, lon), 1300.0, places=3)
        # halfway between columns 3 and 4 -> bilinear
        lat4, lon4 = cell_centre(4, 4)
        self.assertAlmostEqual(tile.seabed_depth(lat, (lon + lon4) / 2), 1350.0, places=3)
        self.assertTrue(tile.inside(10.5, 20.5))
        self.assertFalse(tile.inside(11.0, 20.5))

    # ---- parse / required files ---------------------------------------------

    def test_bad_json_and_missing_files(self):
        self.write({"props.json": "{not json"})
        os.remove(os.path.join(self.folder, "guide.json"))
        rep = self.validate()
        self.assertError(rep, "props.json: does not parse")
        self.assertError(rep, "guide.json: missing")

    def test_missing_species_and_sources_warn(self):
        os.remove(os.path.join(self.folder, "species.json"))
        os.remove(os.path.join(self.folder, "sources.md"))
        docs = good_content()
        del docs["mission.json"]["species_file"]
        self.write({"mission.json": docs["mission.json"]})
        rep = self.validate()
        self.assertEqual(rep.errors, [])
        self.assertEqual(len(rep.warnings), 2)

    # ---- pois ----------------------------------------------------------------

    def test_poi_guide_entry_must_exist(self):
        rep = self.mutate("pois.json", lambda d: d["pois"][0].update(guide_entry="nope"))
        self.assertError(rep, 'guide_entry "nope" does not exist')

    def test_poi_outside_bbox(self):
        rep = self.mutate("pois.json", lambda d: d["pois"][0].update(lat=12.0))
        self.assertError(rep, "outside the tile bbox")

    def test_poi_depth_vs_terrain(self):
        rep = self.mutate("pois.json", lambda d: d["pois"][0].update(depth_m=1200))
        self.assertError(rep, "100 m from the terrain")
        self.assertEqual(self.validate(tolerance=150).errors, [])

    def test_poi_depth_sign_and_snap(self):
        rep = self.mutate("pois.json", lambda d: d["pois"][0].update(depth_m=-1290))
        self.assertError(rep, "positive depth magnitude")
        rep = self.mutate("pois.json", lambda d: d["pois"][0].pop("depth_m"))
        self.assertError(rep, 'needs "depth_m" or "snap_to_seabed"')

    def test_poi_enums_and_duplicates(self):
        def f(d):
            d["pois"][0]["kind"] = "castle"
            d["pois"][1]["confidence"] = "sure"
            d["pois"][2]["id"] = "p-main"
        rep = self.mutate("pois.json", f)
        self.assertError(rep, '"kind" must be one of')
        self.assertError(rep, '"confidence" must be one of')
        self.assertError(rep, "duplicate id")

    def test_poi_needs_reconstruction_and_sources(self):
        def f(d):
            del d["pois"][0]["reconstruction"]
            d["pois"][1]["sources"] = ["not a url"]
        rep = self.mutate("pois.json", f)
        self.assertError(rep, '"reconstruction" must be a boolean')
        self.assertError(rep, "not an http(s) URL")

    # ---- guide ---------------------------------------------------------------

    def test_guide_needs_overview_and_shapes(self):
        def f(d):
            d["entries"][0]["id"] = "intro"
            d["entries"][1]["paragraphs"] = []
            d["entries"][2]["facts"] = [{"label": "x"}]
        rep = self.mutate("guide.json", f)
        self.assertError(rep, 'no "overview" entry')
        self.assertError(rep, '"paragraphs" must be')
        self.assertError(rep, '"facts" must be')

    def test_guide_one_source_warns(self):
        docs = good_content()
        docs["guide.json"]["entries"][1]["sources"] = docs["guide.json"]["entries"][1]["sources"][:1]
        self.write({"guide.json": docs["guide.json"]})
        rep = self.validate()
        self.assertEqual(rep.errors, [])
        self.assertTrue(any("only 1 source" in w for w in rep.warnings))

    # ---- mission -------------------------------------------------------------

    def test_hull_class_must_clear_deepest_poi(self):
        rep = self.mutate("mission.json", lambda d: d.update(hull_class="A"))
        self.assertError(rep, "does not clear the deepest POI")
        rep = self.mutate("mission.json", lambda d: d.update(hull_class="Z"))
        self.assertError(rep, '"hull_class" must be one of')

    def test_snapped_poi_counts_toward_deepest(self):
        # p-two snaps to 1500 m; a hull crushing at 1400 m must fail even though
        # the non-snapping POIs are shallower.
        rep = vl.validate_landmark(LM, repo=self.repo, hulls={"B": -1400.0})
        self.assertError(rep, '"p-two" at 1500 m')

    def test_pressure_band_review_requires_exact_depth_hull_and_briefing(self):
        hulls = {**HULLS, "B": -1600.0}
        docs = good_content()
        review = {"poi": "p-two", "hull_class": "B", "poi_depth_m": 1500,
                  "warning_start_m": 1440, "crush_depth_m": 1600,
                  "reason": "Surveyed POI and limited hull margin."}
        docs["mission.json"]["pressure_band_review"] = review
        docs["mission.json"]["briefing"]["hazards"] = [
            "At 1500 m the 1600 m hull is past its 1440 m warning threshold."]
        self.write({"mission.json": docs["mission.json"]})
        rep = vl.validate_landmark(LM, repo=self.repo, hulls=hulls)
        self.assertEqual(rep.errors, [])
        self.assertEqual(rep.warnings, [])
        self.assertTrue(any("p-two" in n for n in rep.notes))

        for field, changed in (("poi", "p-main"), ("poi_depth_m", 1498),
                               ("crush_depth_m", 1700), ("hull_class", "C"),
                               ("warning_start_m", 1400), ("reason", "")):
            altered = copy.deepcopy(docs["mission.json"])
            altered["pressure_band_review"][field] = changed
            self.write({"mission.json": altered})
            rep = vl.validate_landmark(LM, repo=self.repo, hulls=hulls)
            self.assertTrue(any("crush-warning band" in w for w in rep.warnings), field)

        altered = copy.deepcopy(docs["mission.json"])
        altered["briefing"]["hazards"] = ["Watch hull pressure."]
        self.write({"mission.json": altered})
        rep = vl.validate_landmark(LM, repo=self.repo, hulls=hulls)
        self.assertTrue(any("crush-warning band" in w for w in rep.warnings))

        # A changed hull rating must invalidate the same recorded review.
        self.write({"mission.json": docs["mission.json"]})
        rep = vl.validate_landmark(LM, repo=self.repo, hulls={**HULLS, "B": -1550.0})
        self.assertTrue(any("crush-warning band" in w for w in rep.warnings))

        config_dir = os.path.join(self.repo, "src", "core")
        os.makedirs(config_dir)
        with open(os.path.join(config_dir, "Config.ts"), "w") as f:
            f.write("crushWarnRatio: 0.85,\n")
        rep = vl.validate_landmark(LM, repo=self.repo, hulls=hulls)
        self.assertTrue(any("crush-warning band" in w for w in rep.warnings))

    def test_spawn_checks(self):
        rep = self.mutate("mission.json", lambda d: d["spawn"].update(lon=25.0))
        self.assertError(rep, "spawn: ")
        rep = self.mutate("mission.json", lambda d: d["spawn"].update(depth_m=5000))
        self.assertError(rep, "at or below the seabed")

    def test_objectives(self):
        rep = self.mutate("mission.json", lambda d: d["objectives"][0].update(poi="ghost"))
        self.assertError(rep, 'poi "ghost" does not exist')
        rep = self.mutate("mission.json", lambda d: d.update(objectives=d["objectives"][:1]))
        self.assertError(rep, "1 primary + >= 1 secondary")
        rep = self.mutate("mission.json", lambda d: d.update(objectives=[d["objectives"][0],
                                                                         d["objectives"][2]]))
        self.assertEqual(rep.errors, [])

    def test_environment_and_briefing(self):
        rep = self.mutate("mission.json", lambda d: d["environment"].update(preset="lava"))
        self.assertError(rep, '"preset" must be one of')
        rep = self.mutate("mission.json", lambda d: d["briefing"].update(hazards=[]))
        self.assertError(rep, '"hazards" must be')
        rep = self.mutate("mission.json", lambda d: d.update(species_file="missing.json"))
        self.assertError(rep, 'species_file "missing.json" not found')

    # ---- props / species -------------------------------------------------------

    def test_props_use_validate_props_rules(self):
        rep = self.mutate("props.json", lambda d: d["props"][0].update(model="procedural:castle"))
        self.assertError(rep, 'bad "model"')
        rep = self.mutate("props.json", lambda d: d["props"][0].update(lat=40.0))
        self.assertError(rep, "outside tile")

    def test_props_must_be_reconstructions(self):
        rep = self.mutate("props.json", lambda d: d["props"][0].pop("reconstruction"))
        self.assertError(rep, 'must be "reconstruction": true')

    def test_species_shape(self):
        def f(d):
            d["species"].append(copy.deepcopy(d["species"][0]))
            d["species"][0]["records"] = "3"
            d["species"][0]["depthRange_m"] = [1200, 900]
            del d["note"]
        rep = self.mutate("species.json", f)
        self.assertError(rep, 'missing "note"')
        self.assertError(rep, '"records" must be')
        self.assertError(rep, '"depthRange_m" must be')
        self.assertError(rep, "duplicate")

    def test_empty_species_warns_only(self):
        rep = self.mutate("species.json", lambda d: d.update(species=[]))
        self.assertEqual(rep.errors, [])
        self.assertTrue(any("empty" in w for w in rep.warnings))


class RepoTests(unittest.TestCase):
    def test_hull_classes_from_config(self):
        hulls = vl.load_hull_classes()
        self.assertEqual(set(hulls), {"A", "B", "C"})
        self.assertLess(hulls["C"], hulls["B"])

    def test_hull_classes_fallback(self):
        self.assertEqual(vl.load_hull_classes("/nonexistent"), vl.DEFAULT_HULLS)

    def test_titanic_exemplar_has_no_errors(self):
        self.assertEqual(vl.validate_landmark("titanic").errors, [])

    def test_cli(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(vl.main(["titanic"]), 0)
            self.assertEqual(vl.main(["no-such-landmark"]), 2)
            self.assertEqual(vl.main([]), 2)
        self.assertIn("OK: titanic", out.getvalue())
        with contextlib.redirect_stdout(io.StringIO()) as h:
            with self.assertRaises(SystemExit) as cm:
                vl.main(["--help"])
        self.assertEqual(cm.exception.code, 0)
        self.assertIn("--depth-tolerance", h.getvalue())


if __name__ == "__main__":
    unittest.main()
