"""The checked-in grids remain attributed, mapped and parseable offline."""

import copy
import json
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import currents  # noqa: E402


class CurrentGridTests(unittest.TestCase):
    def test_all_mission_sites_have_valid_offline_grids(self):
        for site, tile in currents.sites():
            with self.subTest(site=site):
                grid = json.loads((ROOT / "data/currents" / (site + ".json")).read_text())
                meta = json.loads((ROOT / "data/tiles" / tile / "meta.json").read_text())
                self.assertGreater(currents.validate_grid(grid, site, tile, meta), 0)

    def test_rejects_source_or_site_falsification_and_bad_vectors(self):
        site, tile = next(currents.sites())
        grid = json.loads((ROOT / "data/currents" / (site + ".json")).read_text())
        meta = json.loads((ROOT / "data/tiles" / tile / "meta.json").read_text())
        for path, value in [("site", "wrong"), ("source.license", ""), ("source.sampled_at", "wrong")]:
            altered = copy.deepcopy(grid)
            target, key = (altered["source"], path.split(".")[1]) if "." in path else (altered, path)
            target[key] = value
            with self.subTest(path=path), self.assertRaises(ValueError):
                currents.validate_grid(altered, site, tile, meta)
        altered = copy.deepcopy(grid)
        altered["vectors"][0][0] = [float("inf"), 0]
        with self.assertRaises(ValueError):
            currents.validate_grid(altered, site, tile, meta)


if __name__ == "__main__":
    unittest.main()
