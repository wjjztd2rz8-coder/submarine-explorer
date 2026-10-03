"""Offline checks for exact shader substitution and screenshot luma math."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]


class TerrainMipVerifyTests(unittest.TestCase):
    def node(self, code):
        result = subprocess.run(
            ["node", "--input-type=module", "-e",
             "import * as mip from './tools/terrain-mip-verify.mjs';\n" + code],
            cwd=ROOT, capture_output=True, text=True, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_substitutes_exact_sections_without_touching_engine_source(self):
        result = self.node(r"""
const current = mip.terrainSections('new head\n// @albedo\nnew colour\n// @rough\nrough\n// @normal\nnormal');
const old = mip.terrainSections('old head\n// @albedo\nold colour $&\n// @rough\nrough\n// @normal\nnormal');
const compiled = 'ENGINE\n' + current.join('ENGINE CHUNK') + '\nEND';
console.log(JSON.stringify(mip.replaceTerrainShader(compiled, current, old)));
""")
        self.assertEqual(
            result,
            'ENGINE\nold head\nENGINE CHUNK\nold colour $&\n'
            'ENGINE CHUNK\nrough\nENGINE CHUNK\nnormal\nEND',
        )

    def test_rejects_stale_or_ambiguous_shader_and_bad_marker_order(self):
        result = self.node(r"""
const failures = [];
for (const operation of [
  () => mip.replaceTerrainShader('stale', ['missing'], ['old']),
  () => mip.replaceTerrainShader('abc abc', ['abc'], ['old']),
  () => mip.terrainSections('head\n// @normal\nx\n// @rough\ny\n// @albedo\nz'),
  () => mip.summarizePixels([0, 0, 0, 255], 2, 2),
]) {
  try { operation(); failures.push(false); }
  catch { failures.push(true); }
}
console.log(JSON.stringify(failures));
""")
        self.assertEqual(result, [True, True, True, True])

    def test_luma_is_full_resolution_and_lower_half_is_separate(self):
        result = self.node("""
console.log(JSON.stringify(mip.summarizePixels([
  255, 255, 255, 255, 0, 0, 0, 255,
  255, 0, 0, 255, 0, 255, 0, 255,
], 2, 2)));
""")
        self.assertAlmostEqual(result["wholeMean"], (255 + 255 * 0.9278) / 4)
        self.assertAlmostEqual(result["lowerMean"], 255 * 0.9278 / 2)
        self.assertAlmostEqual(result["lowerStdDev"], 255 * (0.7152 - 0.2126) / 2)

    def test_delta_preserves_sign_and_handles_zero_baseline(self):
        result = self.node("""
console.log(JSON.stringify([
  mip.luminanceDelta(50, 49), mip.luminanceDelta(0, 10),
]));
""")
        self.assertEqual(result, [{"absolute": -1, "percent": -2},
                                  {"absolute": 10, "percent": None}])


if __name__ == "__main__":
    unittest.main()
