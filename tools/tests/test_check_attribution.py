"""Tests for tools/check_attribution.py (stdlib unittest)."""

import contextlib
import io
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import check_attribution as ca  # noqa: E402


def touch(root, rel):
    path = os.path.join(root, *rel.split("/"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(b"x")


class CheckAttributionTests(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        touch(self.root, "public/assets/models/rock_09.glb")
        touch(self.root, "public/assets/decoders/draco/draco_decoder.wasm")
        touch(self.root, "public/audio/ping.ogg")
        touch(self.root, "public/favicon.svg")  # outside the scanned folders
        touch(self.root, "public/assets/models/.DS_Store")

    def tearDown(self):
        shutil.rmtree(self.root)

    def write_attribution(self, text):
        with open(os.path.join(self.root, "ATTRIBUTION.md"), "w", encoding="utf-8") as fh:
            fh.write(text)

    def run_main(self, *extra):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = ca.main(["--root", self.root, *extra])
        return code, out.getvalue(), err.getvalue()

    def test_lists_only_scanned_folders_and_skips_litter(self):
        self.assertEqual(
            ca.list_asset_files(self.root),
            [
                "public/assets/decoders/draco/draco_decoder.wasm",
                "public/assets/models/rock_09.glb",
                "public/audio/ping.ogg",
            ],
        )

    def test_all_attributed_passes(self):
        self.write_attribution(
            "- Rock (`public/assets/models/rock_09.glb`) CC0\n"
            "- Ping, ping.ogg, CC0\n"
            "- Draco (`public/assets/decoders/draco/*`) Apache-2.0\n"
        )
        code, out, _ = self.run_main()
        self.assertEqual(code, 0)
        self.assertIn("2 asset file(s)", out)

    def test_missing_file_fails_with_list(self):
        self.write_attribution("rock_09.glb\npublic/assets/decoders/draco/*\n")
        code, _, err = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("public/audio/ping.ogg", err)
        self.assertNotIn("rock_09.glb", err)

    def test_exempt_folder_must_still_be_mentioned(self):
        self.write_attribution("rock_09.glb ping.ogg\n")
        code, _, err = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("public/assets/decoders/", err)

    def test_filename_match_is_whole_name(self):
        self.assertTrue(ca.mentions("see `rock_09.glb`.", "rock_09.glb"))
        self.assertTrue(ca.mentions("models/rock_09.glb", "rock_09.glb"))
        self.assertFalse(ca.mentions("big_rock_09.glb", "rock_09.glb"))
        self.assertFalse(ca.mentions("rock_09.glb2", "rock_09.glb"))

    def test_missing_attribution_file_is_usage_error(self):
        code, _, err = self.run_main()
        self.assertEqual(code, 2)
        self.assertIn("cannot read", err)

    def test_empty_tree_passes(self):
        empty = tempfile.mkdtemp()
        try:
            with open(os.path.join(empty, "ATTRIBUTION.md"), "w") as fh:
                fh.write("# Attribution\n")
            self.assertEqual(ca.check(empty, "# Attribution\n"), (0, [], []))
        finally:
            shutil.rmtree(empty)

    def test_help_exits_zero(self):
        with contextlib.redirect_stdout(io.StringIO()) as out:
            with self.assertRaises(SystemExit) as cm:
                ca.main(["--help"])
        self.assertEqual(cm.exception.code, 0)
        self.assertIn("ATTRIBUTION.md", out.getvalue())


if __name__ == "__main__":
    unittest.main()
