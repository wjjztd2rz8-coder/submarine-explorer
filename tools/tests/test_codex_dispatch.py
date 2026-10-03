"""Dispatch allocation regression: a task's idle port remains reserved."""
import fcntl
import json
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest


class TestCodexDispatch(unittest.TestCase):
    def fixture(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        (root / 'tools').mkdir()
        queue = root / '.cache/codex/queue'
        queue.mkdir(parents=True)
        for name in ['10-first.md', '20-second.md']:
            (queue / name).write_text('<!-- env: ROUNDS=2 -->\nfixture task\n')
        shim = root / 'dispatch-command'
        shim.write_text('''#!/usr/bin/env python3
import json, sys
kind, *args = sys.argv[1:]
with open("calls.jsonl", "a") as f:
    f.write(json.dumps({"kind": kind, "args": args}) + "\\n")
if kind == "systemctl":
    if "list-units" in args:
        print("subexp-first.service loaded active running task")
        print("subexp-second.service loaded active running task")
    elif "show" in args:
        print("{ argv[]=env WT=1 PW_PORT=4370 tools/codex-task.sh; }")
        print("{ argv[]=env WT=1 PW_PORT=4371 tools/codex-task.sh; }")
elif kind == "ai-limits":
    print(json.dumps({"codex": {"five_hour": {"used": 0}, "seven_day": {"used": 0}}}))
elif kind == "ss":
    print("LISTEN 0 511 127.0.0.1:4472 0.0.0.0:*")
''')
        shim.chmod(0o755)
        source = (Path(__file__).parents[1] / 'codex-dispatch.sh').read_text()
        for command in ['systemctl', 'ai-limits', 'ss', 'systemd-run']:
            source = source.replace(command + ' ', shlex.quote(str(shim)) + ' ' + command + ' ')
        script = root / 'tools/codex-dispatch.sh'
        script.write_text(source)
        return root, script

    def test_running_tasks_reserve_idle_primary_and_base_ports(self):
        root, script = self.fixture()
        result = subprocess.run(['bash', str(script)], env=dict(os.environ, MAX='6'),
                                capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in (root / 'calls.jsonl').read_text().splitlines()]
        launches = [c for c in calls if c['kind'] == 'systemd-run']
        ports = [next(arg for arg in call['args'] if arg.startswith('PW_PORT='))
                 for call in launches]
        # 4370/4371 belong to running tasks even though neither is listening;
        # 4372's base port is occupied by a separate preview on 4472.
        self.assertEqual(ports, ['PW_PORT=4373', 'PW_PORT=4374'])
        self.assertEqual(len(list((root / '.cache/codex/queue/launched').glob('*.md'))), 2)

    def test_concurrent_dispatcher_does_not_launch_again(self):
        root, script = self.fixture()
        with (root / '.cache/codex/dispatch.lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            result = subprocess.run(['bash', str(script)], env=dict(os.environ, MAX='6'),
                                    capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((root / 'calls.jsonl').exists())
        self.assertEqual(len(list((root / '.cache/codex/queue').glob('*.md'))), 2)


if __name__ == '__main__':
    unittest.main()
