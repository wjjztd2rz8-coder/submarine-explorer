"""Tests for tools/build_landmarks.py (stdlib unittest)."""

import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest

TOOLS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, TOOLS)

import build_landmarks as bl  # noqa: E402

REPO = os.path.dirname(os.path.abspath(TOOLS))


class DefaultPathTest(unittest.TestCase):
    def test_default_out_is_repo_data_landmarks(self):
        self.assertEqual(os.path.abspath(bl.DEFAULT_OUT),
                         os.path.join(REPO, "data", "landmarks.json"))
        self.assertTrue(os.path.isabs(bl.DEFAULT_OUT))
        self.assertNotIn("/Users/", bl.DEFAULT_OUT.replace(REPO, ""))

    def test_repo_root_contains_tools(self):
        self.assertTrue(os.path.isfile(os.path.join(bl.REPO, "tools", "build_landmarks.py")))

    def test_import_writes_nothing(self):
        # Importing only builds the list; the catalogue is non-empty.
        self.assertGreater(len(bl.L), 0)


class BuildTest(unittest.TestCase):
    def test_build_doc_matches_count(self):
        doc = bl.build_doc()
        self.assertEqual(doc["version"], 1)
        self.assertEqual(doc["count"], len(bl.L))
        self.assertTrue(all("wreck_meta" in x for x in doc["landmarks"]))

    def test_duplicate_ids_rejected(self):
        with self.assertRaises(ValueError):
            bl.build_doc([{"id": "a", "type": "wreck"}, {"id": "a", "type": "vent"}])

    def test_bad_type_rejected(self):
        with self.assertRaises(ValueError):
            bl.build_doc([{"id": "a", "type": "volcano"}])

    def test_main_writes_to_out(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "lm.json")
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(bl.main(["--out", out]), 0)
            with open(out, encoding="utf-8") as f:
                self.assertEqual(json.load(f)["count"], len(bl.L))

    def test_help_runs(self):
        r = subprocess.run([sys.executable, os.path.join(TOOLS, "build_landmarks.py"), "--help"],
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("--out", r.stdout)


if __name__ == "__main__":
    unittest.main()
