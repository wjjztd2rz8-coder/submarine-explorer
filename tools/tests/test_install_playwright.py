"""Installer retry policy without downloads, apt changes or real sleeps."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "install-playwright-chromium.sh"


class ChromiumInstallTests(unittest.TestCase):
    def run_installer(self, statuses):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            calls = root / "calls"
            # The timeout stub checks the real per-attempt bound and simulates
            # the install command's status (including GNU timeout's 124).
            stub = root / "timeout"
            stub.write_text(
                "#!/usr/bin/env bash\n"
                '[[ "$*" == "--kill-after=5s 120s npx playwright install --with-deps chromium" ]] || exit 99\n'
                'echo install >> "$INSTALL_TEST_CALLS"\n'
                'count=$(wc -l < "$INSTALL_TEST_CALLS")\n'
                + f"statuses=({' '.join(map(str, statuses))})\n"
                + 'exit "${statuses[count-1]}"\n'
            )
            stub.chmod(0o755)
            sleep = root / "sleep"
            sleep.write_text(
                '#!/usr/bin/env bash\n[[ "$1" == 15 || "$1" == 30 ]] || exit 99\n'
                'echo sleep >> "$INSTALL_TEST_SLEEPS"\n'
            )
            sleep.chmod(0o755)
            sleeps = root / "sleeps"
            result = subprocess.run(
                ["bash", str(SCRIPT)],
                env={
                    **os.environ,
                    "PATH": str(root) + os.pathsep + os.environ["PATH"],
                    "INSTALL_TEST_CALLS": str(calls),
                    "INSTALL_TEST_SLEEPS": str(sleeps),
                },
                capture_output=True,
                text=True,
                timeout=5,
            )
            return (
                result.returncode,
                len(calls.read_text().splitlines()),
                len(sleeps.read_text().splitlines()) if sleeps.exists() else 0,
            )

    def test_success_does_not_retry(self):
        self.assertEqual(self.run_installer([0]), (0, 1, 0))

    def test_failure_then_success_retries_once(self):
        self.assertEqual(self.run_installer([1, 0]), (0, 2, 1))

    def test_stalled_install_can_retry(self):
        self.assertEqual(self.run_installer([124, 0]), (0, 2, 1))

    def test_failure_failure_then_success_uses_backoff(self):
        self.assertEqual(self.run_installer([1, 1, 0]), (0, 3, 2))

    def test_last_failure_is_not_hidden(self):
        self.assertEqual(self.run_installer([1, 1, 7]), (7, 3, 2))


if __name__ == "__main__":
    unittest.main()
