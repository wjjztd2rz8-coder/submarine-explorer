"""Tests for tools/validate_props.py (stdlib unittest)."""

import contextlib
import io
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import validate_props as vp  # noqa: E402

BBOX = {"north": 41.88, "south": 41.58, "east": -49.80, "west": -50.10}
BASE = {"id": "a", "model": "procedural:hull-block", "lat": 41.73, "lon": -49.95,
        "snap_to_seabed": True, "dimensions_m": [140, 28, 30]}


def entry(**kw):
    e = dict(BASE)
    e.update(kw)
    return e


class ValidateEntryTests(unittest.TestCase):
    def check(self, e):
        return vp.validate_entry(e, [])

    def test_valid_procedural_and_model(self):
        self.assertIsNone(self.check(entry()))
        self.assertIsNone(self.check(entry(model="/assets/models/rock_09.glb", scale=3,
                                           collision="sphere")))
        self.assertIsNone(self.check(entry(snap_to_seabed=False, depth_m=3800)))

    def test_bad_model(self):
        self.assertIn("model", self.check(entry(model="procedural:castle")))
        self.assertIn("model", self.check(entry(model="https://x.example/a.glb")))
        self.assertIn("model", self.check(entry(model="/assets/models/../x.glb")))

    def test_depth_rules(self):
        self.assertIn("positive depth", self.check(entry(snap_to_seabed=False, depth_m=-3800)))
        self.assertIn("depth_m", self.check(entry(snap_to_seabed=False)))
        warnings = []
        self.assertIsNone(vp.validate_entry(entry(depth_m=100), warnings))
        self.assertTrue(any("snapping wins" in w for w in warnings))

    def test_ranges_and_types(self):
        self.assertIn("lat", self.check(entry(lat=91)))
        self.assertIn("lon", self.check(entry(lon="x")))
        self.assertIn("scale", self.check(entry(scale=[1, 0, 1])))
        self.assertIn("scale", self.check(entry(scale=-2)))
        self.assertIn("collision", self.check(entry(collision="mesh")))
        self.assertIn("lod_distance_m", self.check(entry(lod_distance_m=0)))
        self.assertIn("heading_deg", self.check(entry(heading_deg="north")))
        self.assertIn("dimensions_m", self.check(entry(dimensions_m=[1, 2])))
        self.assertIn("hull-block", self.check(entry(dimensions_m=[10, 0, 5])))
        self.assertIn("dimensions_m[2]", self.check(entry(model="procedural:chimney",
                                                          dimensions_m=[5, 5, 0])))
        self.assertIsNone(self.check(entry(model="procedural:debris", dimensions_m=[60, 0, 0])))
        self.assertIn("lat", self.check(entry(lat=True)))  # bools are not numbers


class HullEndsTests(unittest.TestCase):
    def test_valid_ends(self):
        for ends in (["prow", "cut"], ["cut", "rounded"], ["rounded", "prow"]):
            w = []
            self.assertIsNone(vp.validate_entry(entry(ends=ends), w))
            self.assertEqual(w, [])

    def test_bad_ends(self):
        for bad in (["prow"], ["prow", "keel"], "prow", ["cut", "cut", "cut"], [1, 2], None):
            err = vp.validate_entry(entry(ends=bad), [])
            self.assertIsNotNone(err)
            self.assertIn('"ends"', err)

    def test_ends_on_other_kinds_warns(self):
        w = []
        e = entry(model="procedural:chimney", dimensions_m=[0, 0, 20], ends=["prow", "cut"])
        self.assertIsNone(vp.validate_entry(e, w))
        self.assertTrue(any("only applies to procedural:hull-block" in m for m in w))


class MaterialHintTests(unittest.TestCase):
    CHIMNEY = {"model": "procedural:chimney", "dimensions_m": [0, 0, 20]}

    def test_valid_hints_and_absent(self):
        for m in ("basalt", "carbonate", "sulfide"):
            w = []
            self.assertIsNone(vp.validate_entry(entry(material_hint=m, **self.CHIMNEY), w))
            self.assertEqual(w, [])
        self.assertIsNone(vp.validate_entry(entry(**self.CHIMNEY), []))

    def test_unknown_hint_is_error(self):
        for bad in ("granite", "Carbonate", "", 1, None, ["carbonate"]):
            err = vp.validate_entry(entry(material_hint=bad, **self.CHIMNEY), [])
            self.assertIsNotNone(err)
            self.assertIn('"material_hint"', err)

    def test_hint_on_other_kinds_warns(self):
        w = []
        self.assertIsNone(vp.validate_entry(entry(material_hint="sulfide"), w))
        self.assertTrue(any("only applies to procedural:chimney" in m for m in w))
        # An unknown value is still an error on other kinds.
        self.assertIsNotNone(vp.validate_entry(entry(material_hint="granite"), []))


class ValidateDocTests(unittest.TestCase):
    def test_counts_duplicates_and_bbox(self):
        doc = {"version": 1, "landmark": "t", "props": [
            entry(id="a"),
            entry(id="a"),
            entry(id="far", lat=10.0),
            entry(id="b", model="procedural:debris", dimensions_m=[50, 50, 4]),
        ]}
        errors, _warnings, valid = vp.validate_doc(doc, bbox=BBOX, tile_id="titanic")
        self.assertEqual(valid, 2)
        self.assertEqual(len(errors), 2)
        self.assertTrue(any("duplicate" in e for e in errors))
        self.assertTrue(any("outside tile titanic" in e for e in errors))

    def test_missing_props_array(self):
        errors, _w, valid = vp.validate_doc({"version": 1})
        self.assertEqual(valid, 0)
        self.assertEqual(len(errors), 1)

    def test_model_file_checks(self):
        with tempfile.TemporaryDirectory() as d:
            models = os.path.join(d, "assets", "models")
            os.makedirs(models)
            with open(os.path.join(models, "small.glb"), "wb") as f:
                f.write(b"x" * 100)
            with open(os.path.join(models, "big.glb"), "wb") as f:
                f.write(b"x" * 3000)
            doc = {"props": [
                entry(id="s", model="/assets/models/small.glb"),
                entry(id="b", model="/assets/models/big.glb"),
                entry(id="m", model="/assets/models/missing.glb"),
            ]}
            errors, warnings, valid = vp.validate_doc(
                doc, public_dir=d, max_bytes=1000, attribution_text="small.glb row")
            self.assertEqual(valid, 1)
            self.assertTrue(any("over the" in e for e in errors))
            self.assertTrue(any("not found" in e for e in errors))
            self.assertFalse(any("small.glb" in w for w in warnings))


class CliTests(unittest.TestCase):
    def run_cli(self, doc, *args):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "props.json")
            with open(path, "w", encoding="utf-8") as f:
                f.write(doc if isinstance(doc, str) else json.dumps(doc))
            meta = os.path.join(d, "meta.json")
            with open(meta, "w", encoding="utf-8") as f:
                json.dump({"id": "tt", "bbox": BBOX}, f)
            out = io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
                code = vp.main([path, "--tile", meta, "--no-model-check"] + list(args))
            return code, out.getvalue()

    def test_exit_codes(self):
        code, out = self.run_cli({"props": [entry()]})
        self.assertEqual(code, 0, out)
        self.assertIn("OK", out)
        code, out = self.run_cli({"props": [entry(lat=10.0)]})
        self.assertEqual(code, 1)
        self.assertIn("outside tile tt", out)
        code, _ = self.run_cli("{not json")
        self.assertEqual(code, 2)

    def test_strict_warnings(self):
        doc = {"props": [entry(dimensions_m=None)]}
        del doc["props"][0]["dimensions_m"]
        self.assertEqual(self.run_cli(doc)[0], 0)
        self.assertEqual(self.run_cli(doc, "--strict")[0], 1)

    def test_repo_fixture_is_valid(self):
        fixture = os.path.join(vp.REPO, "data", "landmarks", "_test", "props.json")
        meta = os.path.join(vp.REPO, "data", "tiles", "titanic", "meta.json")
        if not (os.path.isfile(fixture) and os.path.isfile(meta)):
            self.skipTest("fixture or titanic tile not on disk")
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = vp.main([fixture, "--tile", "titanic"])
        self.assertEqual(code, 0, out.getvalue())


if __name__ == "__main__":
    unittest.main()
