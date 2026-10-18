"""Exercise gate orchestration offline; replace only external gate commands."""
import json
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest


class TestGates(unittest.TestCase):
    def run_gates(self, *, fail_e2e=False, custom_output=None, args=(), ci='', config_mode='default',
                  occupied_ports=(), port='4371', fail_build=False, fail_manifest=False,
                  changed_path=None, change_kind='branch'):
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
if (kind == "npm" and args[:2] == ["run", "build"] or
        kind == "npx" and args[:2] == ["vite", "build"]):
    if os.getenv("FAIL_BUILD") == "1": sys.exit(1)
    pathlib.Path(args[args.index("--outDir") + 1]).mkdir()
if kind == "node" and args[0] == "--input-type=module":
    pathlib.Path(args[2]).write_text("// bundled gate config")
if kind == "node" and args[0] == "tools/ci-build-manifest.mjs":
    if os.getenv("FAIL_MANIFEST") == "1": sys.exit(1)
if kind == "npm" and args[:2] == ["run", "test:e2e"]:
    assert os.getenv("PW_REUSE_SERVER") == "0"
    assert pathlib.Path(os.environ["PW_OUTDIR"]).is_dir()
    if os.getenv("FAIL_E2E") == "1": sys.exit(1)
if kind == "npx" and args[:2] == ["playwright", "test"]:
    assert os.getenv("PW_REUSE_SERVER") == "0"
    assert pathlib.Path(os.environ["PW_OUTDIR"]).is_dir()
if (kind == "npm" and args[:2] == ["run", "test:e2e"] or
        kind == "npx" and args[:2] == ["playwright", "test"]):
    if os.getenv("PW_PORT") in json.loads(os.environ["OCCUPIED_PORTS"]):
        print("Preview port is already used", file=sys.stderr)
        sys.exit(1)
''')
        shim.chmod(0o755)
        source = (Path(__file__).parents[1] / 'gates.sh').read_text()
        # Keep shell control flow and environment propagation intact. The real
        # env executable still dispatches the fake npm command for e2e.
        for command in ['npm', 'npx', 'python3', 'node']:
            source = source.replace(command + ' ', shlex.quote(str(shim)) + ' ' + command + ' ')
        script = root / 'tools' / 'gates.sh'
        script.write_text(source)
        if changed_path:
            # Real branch/working-tree diffs guard against silently dropping
            # the camera-radius regression specs from smoke feedback.
            def git(*arguments):
                subprocess.run(['git', '-C', str(root), '-c', 'user.name=Gate tests',
                                '-c', 'user.email=gates@example.invalid', *arguments],
                               check=True, capture_output=True, text=True)
            git('init', '-q', '-b', 'main')
            changed = root / changed_path
            changed.parent.mkdir(parents=True, exist_ok=True)
            if change_kind != 'untracked':
                changed.write_text('before\n')
            git('add', '.')
            git('commit', '-qm', 'baseline')
            git('checkout', '-qb', 'feature')
            changed.write_text('after\n')
            if change_kind == 'branch':
                git('add', changed_path)
                git('commit', '-qm', 'change')
        env = dict(os.environ, PW_PORT=port, PW_REUSE_SERVER='1', CI=ci,
                   GATES_CONFIG_MODE=config_mode)
        env['OCCUPIED_PORTS'] = json.dumps(list(occupied_ports))
        env.pop('PW_OUTDIR', None)
        env.pop('VITE_BASE', None)
        env['FAIL_E2E'] = '1' if fail_e2e else '0'
        env['FAIL_BUILD'] = '1' if fail_build else '0'
        env['FAIL_MANIFEST'] = '1' if fail_manifest else '0'
        if custom_output:
            env['PW_OUTDIR'] = custom_output
            if '--prebuilt' in args:
                (root / custom_output).mkdir()
        result = subprocess.run(['bash', str(script), *args], env=env, text=True,
                                capture_output=True, timeout=20)
        log = root / 'calls.jsonl'
        calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
        return root, result, calls

    def test_local_smoke_retains_every_static_gate_and_project_base(self):
        _, result, calls = self.run_gates()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('E2E mode: smoke + project-base', result.stdout)
        self.assertEqual(result.stdout.splitlines()[-1], 'PASS gates (e2e=smoke)')
        for gate in ['build', 'unit', 'python', 'content', 'attribution', 'prettier',
                     'e2e', 'e2e-base']:
            self.assertIn('PASS ' + gate + '\n', result.stdout)
        preview = next(c for c in calls if c['kind'] == 'npm'
                       and c['args'][:2] == ['run', 'test:e2e'])
        self.assertEqual(preview['args'][2:4], ['--', 'tests/e2e/smoke.spec.ts'])
        base = next(c for c in calls if c['kind'] == 'npx'
                    and c['args'][:2] == ['playwright', 'test'])
        self.assertEqual(base['args'][2], 'tests/e2e/base-url.spec.ts')

    def test_sensitive_diffs_add_spawn_camera_specs_to_smoke(self):
        expected = ['tests/e2e/smoke.spec.ts', 'tests/e2e/opening-framing.spec.ts',
                    'tests/e2e/d2-camera.spec.ts', 'tests/e2e/d-input-hud.spec.ts',
                    'tests/e2e/f-bughunt-18.spec.ts']
        for path, sensitive in [('data/landmarks/titanic/site.json', True),
                                ('src/game/Spawn.ts', True),
                                ('src/game/DeepOpeningSpawn.ts', True),
                                ('src/sub/CameraRig.ts', True),
                                ('src/core/config/camera.ts', True),
                                ('src/app/systems/camera.ts', True),
                                ('src/styles/camera.css', False),
                                ('plan/progress/example.md', False)]:
            for kind in ['branch', 'dirty', 'untracked']:
                with self.subTest(path=path, kind=kind):
                    _, result, calls = self.run_gates(changed_path=path, change_kind=kind)
                    self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
                    preview = next(c for c in calls if c['kind'] == 'npm'
                                   and c['args'][:2] == ['run', 'test:e2e'])
                    self.assertEqual(preview['args'][2], '--')
                    self.assertTrue(preview['args'][-1].startswith('--output='))
                    self.assertEqual(preview['args'][3:-1], expected if sensitive else expected[:1])

    def test_full_local_opt_in_and_ci_default_have_no_test_selection_filter(self):
        for args, ci in [(('--full-e2e',), ''), ((), 'true')]:
            with self.subTest(args=args, ci=ci):
                _, result, calls = self.run_gates(args=args, ci=ci,
                                                  changed_path='src/sub/CameraRig.ts')
                self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
                self.assertIn('E2E mode: full suite + project-base', result.stdout)
                self.assertEqual(result.stdout.splitlines()[-1], 'PASS gates (e2e=full)')
                preview = next(c for c in calls if c['kind'] == 'npm'
                               and c['args'][:2] == ['run', 'test:e2e'])
                self.assertEqual(preview['args'][2], '--')
                self.assertEqual(len(preview['args']), 4)
                self.assertTrue(preview['args'][3].startswith('--output='))

    def test_no_e2e_retains_static_gates(self):
        _, result, calls = self.run_gates(args=('--no-e2e',), changed_path='src/game/Spawn.ts')
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual(len(calls), 6)
        self.assertNotIn('PASS e2e', result.stdout)
        self.assertEqual(result.stdout.splitlines()[-1], 'PASS gates (e2e=none)')

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
        self.assertEqual([p['port'] for p in previews], ['4371', '4371'])
        self.assertEqual(previews[1]['base'], '/submarine-explorer/')

    def test_e2e_failure_stays_failed_and_does_not_skip_the_base_gate(self):
        root, result, calls = self.run_gates(fail_e2e=True)
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn('FAIL e2e ', result.stdout)
        self.assertIn('PASS e2e-base', result.stdout)
        self.assertEqual(result.stdout.splitlines()[-1], 'FAIL gates (e2e=smoke)')
        self.assertEqual(len([c for c in calls if c['kind'] == 'npx'
                              and c['args'][:2] == ['playwright', 'test']]), 1)
        self.assertFalse(list(root.glob('dist-gates-*')))

    def test_unrelated_preview_on_port_plus_100_cannot_block_project_base(self):
        root, result, calls = self.run_gates(occupied_ports=('4471',))
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('PASS e2e\n', result.stdout)
        self.assertIn('PASS e2e-base\n', result.stdout)
        previews = [c for c in calls if c['kind'] == 'npm'
                    and c['args'][:2] == ['run', 'test:e2e']
                    or c['kind'] == 'npx' and c['args'][:2] == ['playwright', 'test']]
        self.assertEqual([p['port'] for p in previews], ['4371', '4371'])
        self.assertEqual([p['reuse'] for p in previews], ['0', '0'])
        self.assertNotEqual(previews[0]['outdir'], previews[1]['outdir'])
        self.assertFalse(list(root.glob('dist-gates-*')))

    def test_occupied_requested_port_stays_a_failure_for_both_owned_previews(self):
        _, result, calls = self.run_gates(occupied_ports=('4371',))
        self.assertEqual(result.returncode, 1)
        self.assertIn('FAIL e2e ', result.stdout)
        self.assertIn('FAIL e2e-base ', result.stdout)
        previews = [c for c in calls if c['kind'] == 'npm'
                    and c['args'][:2] == ['run', 'test:e2e']
                    or c['kind'] == 'npx' and c['args'][:2] == ['playwright', 'test']]
        self.assertEqual([p['port'] for p in previews], ['4371', '4371'])
        self.assertEqual([p['reuse'] for p in previews], ['0', '0'])

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

    def test_canonical_order_and_checks_phase(self):
        _, result, _ = self.run_gates(args=('--no-e2e',))
        self.assertEqual(result.stdout.splitlines(),
                         ['PASS python', 'PASS content', 'PASS build', 'PASS unit',
                          'PASS attribution', 'PASS prettier', 'PASS gates (e2e=none)'])
        _, result, calls = self.run_gates(args=('--phase', 'checks'))
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual(len(calls), 6)
        self.assertEqual(calls[2]['args'], ['run', 'typecheck'])
        self.assertFalse(any('build' in c['args'] for c in calls))
        self.assertEqual(result.stdout.splitlines()[-1], 'PASS gates (e2e=none)')
        package = json.loads((Path(__file__).parents[2] / 'package.json').read_text())
        self.assertEqual(package['scripts']['ci'], 'bash tools/gates.sh --full-e2e')

    def test_build_phase_only_bundles_then_writes_manifest_and_retains_output(self):
        root, result, calls = self.run_gates(args=('--phase', 'build'),
                                              custom_output='dist-root')
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0]['args'][:2], ['vite', 'build'])
        self.assertEqual(calls[0]['base'], '/')
        self.assertEqual(calls[1]['args'],
                         ['tools/ci-build-manifest.mjs', 'write', '/', 'dist-root'])
        self.assertTrue((root / 'dist-root').is_dir())
        root, result, calls = self.run_gates(args=('--phase', 'build'),
                                              custom_output='dist-root', fail_build=True)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(len(calls), 1)  # No manifest after a failed bundle.

    def test_prebuilt_consumers_validate_first_never_build_and_retain_output(self):
        for phase, base, browser in [('e2e', '/', ('1/30', '--reporter=json')),
                                     ('e2e-base', '/submarine-explorer/', ('--workers=1',))]:
            with self.subTest(phase=phase):
                args = ('--phase', phase, '--prebuilt', '--', *browser)
                root, result, calls = self.run_gates(args=args, custom_output='dist-prebuilt')
                self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
                self.assertEqual(len(calls), 2)
                self.assertEqual(calls[0]['args'],
                                 ['tools/ci-build-manifest.mjs', 'verify', base, 'dist-prebuilt'])
                self.assertFalse(any('build' in c['args'] for c in calls))
                self.assertEqual(calls[1]['reuse'], '0')
                self.assertEqual(calls[1]['outdir'], 'dist-prebuilt')
                self.assertEqual(calls[1]['base'], base)
                self.assertTrue((root / 'dist-prebuilt').is_dir())
                if phase == 'e2e':
                    self.assertEqual(calls[1]['args'], ['tools/e2e-shards.mjs', *browser])
                else:
                    self.assertIn('tests/e2e/base-url.spec.ts', calls[1]['args'])
                root, result, calls = self.run_gates(args=args, custom_output='dist-prebuilt',
                                                      fail_manifest=True)
                self.assertEqual(result.returncode, 1)
                self.assertEqual(len(calls), 1)  # No discovery/preview on invalid artifacts.
                self.assertTrue((root / 'dist-prebuilt').is_dir())

    def test_failed_local_build_cannot_serve_a_retained_output(self):
        _, result, calls = self.run_gates(fail_build=True, custom_output='dist-stale')
        self.assertEqual(result.returncode, 1)
        self.assertIn('Root browser gate requires a successful build', result.stdout)
        self.assertFalse(any('test:e2e' in c['args'] or 'playwright' in c['args']
                             for c in calls))
        self.assertIn('PASS attribution', result.stdout)
        self.assertIn('PASS prettier', result.stdout)

    def test_ci_consumers_require_explicit_prebuilt_output(self):
        for args in [('--phase', 'e2e'), ('--phase', 'e2e', '--prebuilt'),
                     ('--phase', 'build'), ('--prebuilt',),
                     ('--phase', 'checks', '--full-e2e')]:
            with self.subTest(args=args):
                _, result, calls = self.run_gates(args=args)
                self.assertEqual(result.returncode, 1)
                self.assertIn('Usage:', result.stderr)
                self.assertEqual(calls, [])

    def test_requested_port_validation_uses_the_full_tcp_range(self):
        _, result, calls = self.run_gates(port='65535')
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        previews = [c for c in calls if c['kind'] == 'npm'
                    and c['args'][:2] == ['run', 'test:e2e']
                    or c['kind'] == 'npx' and c['args'][:2] == ['playwright', 'test']]
        self.assertEqual([p['port'] for p in previews], ['65535', '65535'])
        for port in ['0', '65536', '-1', 'abc']:
            with self.subTest(port=port):
                _, result, calls = self.run_gates(port=port)
                self.assertEqual(result.returncode, 1)
                self.assertIn('PW_PORT must be an integer between 1 and 65535', result.stderr)
                self.assertEqual(calls, [])


if __name__ == '__main__':
    unittest.main()
