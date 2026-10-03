"""Exercise gate orchestration offline; replace only external gate commands."""
import json
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest


class TestGates(unittest.TestCase):
    def run_gates(self, *, fail_e2e=False, custom_output=None, args=(), ci='', config_mode='default'):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        (root / 'tools').mkdir()
        shim = root / 'gate-command'
        shim.write_text('''#!/usr/bin/env python3
import json, os, pathlib, sys
kind, *args = sys.argv[1:]
record = {"kind": kind, "args": args,
          "outdir": os.getenv("PW_OUTDIR"), "reuse": os.getenv("PW_REUSE_SERVER"),
          "base": os.getenv("VITE_BASE"), "port": os.getenv("PW_PORT")}
with open("calls.jsonl", "a") as f:
    f.write(json.dumps(record) + "\\n")
if kind == "npm" and args[:2] == ["run", "build"]:
    pathlib.Path(args[args.index("--outDir") + 1]).mkdir()
if kind == "node":
    pathlib.Path(args[2]).write_text("// bundled gate config")
if kind == "npm" and args[:2] == ["run", "test:e2e"]:
    assert os.getenv("PW_REUSE_SERVER") == "0"
    assert pathlib.Path(os.environ["PW_OUTDIR"]).is_dir()
    if os.getenv("FAIL_E2E") == "1": sys.exit(1)
if kind == "npx" and args[:2] == ["playwright", "test"]:
    assert os.getenv("PW_REUSE_SERVER") == "0"
    assert pathlib.Path(os.environ["PW_OUTDIR"]).is_dir()
''')
        shim.chmod(0o755)
        source = (Path(__file__).parents[1] / 'gates.sh').read_text()
        # Keep shell control flow and environment propagation intact. The real
        # env executable still dispatches the fake npm command for e2e.
        for command in ['npm', 'npx', 'python3', 'node']:
            source = source.replace(command + ' ', shlex.quote(str(shim)) + ' ' + command + ' ')
        script = root / 'tools' / 'gates.sh'
        script.write_text(source)
        env = dict(os.environ, PW_PORT='4371', PW_REUSE_SERVER='1', CI=ci,
                   GATES_CONFIG_MODE=config_mode)
        env.pop('PW_OUTDIR', None)
        env.pop('VITE_BASE', None)
        env['FAIL_E2E'] = '1' if fail_e2e else '0'
        if custom_output:
            env['PW_OUTDIR'] = custom_output
        result = subprocess.run(['bash', str(script), *args], env=env, text=True,
                                capture_output=True, timeout=20)
        log = root / 'calls.jsonl'
        calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
        return root, result, calls

    def test_local_smoke_retains_every_static_gate_and_project_base(self):
        _, result, calls = self.run_gates()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('E2E mode: smoke + project-base', result.stdout)
        for gate in ['build', 'unit', 'python', 'content', 'attribution', 'prettier',
                     'e2e', 'e2e-base']:
            self.assertIn('PASS ' + gate + '\n', result.stdout)
        preview = next(c for c in calls if c['kind'] == 'npm'
                       and c['args'][:2] == ['run', 'test:e2e'])
        self.assertEqual(preview['args'][2:4], ['--', 'tests/e2e/smoke.spec.ts'])
        base = next(c for c in calls if c['kind'] == 'npx'
                    and c['args'][:2] == ['playwright', 'test'])
        self.assertEqual(base['args'][2], 'tests/e2e/base-url.spec.ts')

    def test_full_local_opt_in_and_ci_default_have_no_test_selection_filter(self):
        for args, ci in [(('--full-e2e',), ''), ((), 'true')]:
            with self.subTest(args=args, ci=ci):
                _, result, calls = self.run_gates(args=args, ci=ci)
                self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
                self.assertIn('E2E mode: full suite + project-base', result.stdout)
                preview = next(c for c in calls if c['kind'] == 'npm'
                               and c['args'][:2] == ['run', 'test:e2e'])
                self.assertEqual(preview['args'][2], '--')
                self.assertEqual(len(preview['args']), 4)
                self.assertTrue(preview['args'][3].startswith('--output='))

    def test_no_e2e_retains_static_gates(self):
        _, result, calls = self.run_gates(args=('--no-e2e',))
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual(len(calls), 6)
        self.assertNotIn('PASS e2e', result.stdout)

    def test_unknown_or_conflicting_options_fail_before_running_gates(self):
        for args in [('--ful-e2e',), ('--full-e2e', '--no-e2e')]:
            with self.subTest(args=args):
                _, result, calls = self.run_gates(args=args)
                self.assertEqual(result.returncode, 1)
                self.assertIn('Usage:', result.stderr)
                self.assertEqual(calls, [])

    def test_owned_previews_use_their_own_builds_and_clean_only_temporary_outputs(self):
        root, result, calls = self.run_gates()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        builds = [c for c in calls if c['kind'] == 'npm' and c['args'][:2] == ['run', 'build']]
        previews = [c for c in calls if c['kind'] == 'npm' and c['args'][:2] == ['run', 'test:e2e']
                    or c['kind'] == 'npx' and c['args'][:2] == ['playwright', 'test']]
        self.assertEqual(len(builds), 2)
        self.assertEqual(len(previews), 2)
        outputs = [b['args'][b['args'].index('--outDir') + 1] for b in builds]
        self.assertNotEqual(*outputs)
        for output, preview in zip(outputs, previews):
            self.assertEqual(output, preview['outdir'])
            self.assertEqual(preview['reuse'], '0')
            self.assertFalse((root / output).exists())
        self.assertEqual([p['port'] for p in previews], ['4371', '4471'])
        self.assertEqual(previews[1]['base'], '/submarine-explorer/')

    def test_e2e_failure_stays_failed_and_does_not_skip_the_base_gate(self):
        root, result, calls = self.run_gates(fail_e2e=True)
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn('FAIL e2e ', result.stdout)
        self.assertIn('PASS e2e-base', result.stdout)
        self.assertEqual(len([c for c in calls if c['kind'] == 'npx'
                              and c['args'][:2] == ['playwright', 'test']]), 1)
        self.assertFalse(list(root.glob('dist-gates-*')))

    def test_explicit_build_output_is_built_served_and_retained(self):
        root, result, calls = self.run_gates(custom_output='dist-custom')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((root / 'dist-custom').is_dir())
        preview = next(c for c in calls if c['kind'] == 'npm'
                       and c['args'][:2] == ['run', 'test:e2e'])
        self.assertEqual(preview['outdir'], 'dist-custom')

    def test_writable_config_is_shared_by_builds_and_removed_after_gates(self):
        root, result, calls = self.run_gates(config_mode='writable')
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        config = next(c for c in calls if c['kind'] == 'node')['args'][2]
        self.assertTrue(config.startswith('.cache/gates/vite-'))
        self.assertFalse((root / config).exists())
        builds = [c for c in calls if c['kind'] == 'npm' and c['args'][:2] == ['run', 'build']]
        self.assertEqual(len(builds), 2)
        for build in builds:
            self.assertEqual(build['args'][build['args'].index('--config') + 1], config)
            self.assertEqual(build['args'][build['args'].index('--configLoader') + 1], 'native')
        unit = next(c for c in calls if c['kind'] == 'npm' and c['args'][0] == 'test')
        self.assertEqual(unit['args'], ['test', '--', '--configLoader', 'runner', '--cache=false'])

    def test_invalid_config_mode_fails_before_gates(self):
        _, result, calls = self.run_gates(config_mode='unknown')
        self.assertEqual(result.returncode, 1)
        self.assertIn('GATES_CONFIG_MODE', result.stderr)
        self.assertEqual(calls, [])


if __name__ == '__main__':
    unittest.main()
