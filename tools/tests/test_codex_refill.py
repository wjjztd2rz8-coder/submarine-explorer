"""Queue numbering regression; Codex is replaced by a prompt-capture shim."""
import json
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest


class TestCodexRefill(unittest.TestCase):
    def prompt_for(self, launched):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'tools').mkdir()
            archive = root / '.cache/codex/queue/launched'
            archive.mkdir(parents=True)
            for name in launched:
                (archive / name).write_text('fixture brief\n')
            shim = root / 'capture-codex'
            shim.write_text('''#!/usr/bin/env python3
import json, sys
from pathlib import Path
Path("codex-args.json").write_text(json.dumps(sys.argv[1:]))
''')
            shim.chmod(0o755)
            source = (Path(__file__).parents[1] / 'codex-refill.sh').read_text()
            self.assertIn('codex exec ', source)
            source = source.replace('codex exec ', shlex.quote(str(shim)) + ' exec ')
            script = root / 'tools/codex-refill.sh'
            script.write_text(source)
            result = subprocess.run(['bash', str(script)], env=dict(os.environ),
                                    capture_output=True, text=True, timeout=20)
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads((root / 'codex-args.json').read_text())[-1]

    def test_accepts_older_two_digit_numbers(self):
        prompt = self.prompt_for(['10-first.md', '90-latest.md'])
        self.assertIn('numbered 100, 110, 120', prompt)

    def test_continues_after_four_digit_numbers_without_reusing_ids(self):
        prompt = self.prompt_for(['990-old.md', '1000-next.md', '1010-latest.md'])
        self.assertIn('numbered 1020, 1030, 1040', prompt)

    def test_empty_archive_keeps_the_initial_number(self):
        self.assertIn('numbered 910, 920, 930', self.prompt_for([]))


if __name__ == '__main__':
    unittest.main()
