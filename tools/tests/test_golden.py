"""Include the browser-independent golden tooling tests in the canonical gates."""
from pathlib import Path
import subprocess
import unittest


class TestGolden(unittest.TestCase):
    def test_golden_tooling(self):
        root = Path(__file__).resolve().parents[2]
        specs = sorted(str(path) for path in (root / 'tools/tests').glob('golden-*.test.mjs'))
        result = subprocess.run(['node', '--test', '--experimental-test-isolation=none', *specs], cwd=root,
                                text=True, capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
