"""Validate artifact provenance and portability without a browser or network."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


class TestCiBuildManifest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.script = Path(__file__).parents[1] / 'ci-build-manifest.mjs'
        self.env = dict(os.environ)
        self.env.pop('GITHUB_SHA', None)
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        (self.root / 'package-lock.json').write_text('{"lockfileVersion":3}\n')
        subprocess.run(['git', 'add', '.'], cwd=self.root, check=True)
        subprocess.run(['git', '-c', 'user.name=Artifact Test', '-c',
                        'user.email=artifact@example.invalid', 'commit', '-qm', 'fixture'],
                       cwd=self.root, check=True)
        self.outdir = 'dist-root'
        self.build = self.root / self.outdir
        for file in ['index.html', 'sw.js', 'manifest.webmanifest',
                     'data/tiles/titanic/meta.json', 'assets/model.glb', 'fonts/font.woff2',
                     '.hidden-output']:
            path = self.build / file
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('portable build fixture')

    def run_manifest(self, mode='verify', base='/', outdir=None):
        return subprocess.run(['node', str(self.script), mode, base, outdir or self.outdir],
                              cwd=self.root, env=self.env, text=True, capture_output=True)

    def write_manifest(self):
        result = self.run_manifest('write')
        self.assertEqual(result.returncode, 0, result.stderr)
        return self.build / 'ci-build-manifest.json'

    def test_both_bases_survive_copy_and_verify_all_provenance_fields(self):
        manifest = self.write_manifest()
        actual = json.loads(manifest.read_text())
        self.assertEqual(set(actual), {'sha', 'lockfileHash', 'nodeVersion', 'base', 'outdir'})
        self.env['GITHUB_SHA'] = actual['sha']
        copy = self.root / 'copied-build'
        shutil.copytree(self.build, copy)
        shutil.rmtree(self.build)
        copy.rename(self.build)  # Download at the expected output path.
        self.assertEqual(self.run_manifest().returncode, 0)
        manifest.unlink()
        self.assertEqual(self.run_manifest('write', '/submarine-explorer/').returncode, 0)
        self.assertEqual(self.run_manifest(base='/submarine-explorer/').returncode, 0)
        self.assertNotEqual(self.run_manifest().returncode, 0)

    def test_every_manifest_mismatch_is_rejected(self):
        manifest = self.write_manifest()
        original = manifest.read_text()
        for key in json.loads(original):
            with self.subTest(field=key):
                actual = json.loads(original)
                actual[key] = 'wrong-value'
                manifest.write_text(json.dumps(actual))
                result = self.run_manifest()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(f'{key} mismatch', result.stderr)
        manifest.write_text(original)
        (self.root / 'package-lock.json').write_text('changed lockfile')
        self.assertIn('lockfileHash mismatch', self.run_manifest().stderr)

    def test_missing_output_or_manifest_and_workflow_sha_mismatch_fail(self):
        self.assertNotEqual(self.run_manifest().returncode, 0)
        self.write_manifest()
        self.assertNotEqual(self.run_manifest(outdir='missing-build').returncode, 0)
        self.env['GITHUB_SHA'] = '0' * 40
        self.assertIn('Checkout SHA does not match workflow SHA', self.run_manifest().stderr)

    def test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected(self):
        self.write_manifest()
        self.assertNotEqual(self.run_manifest('write').returncode, 0)
        link = self.build / 'worktree-link'
        link.symlink_to(self.root / 'package-lock.json')
        self.assertIn('contains a symlink', self.run_manifest().stderr)
        link.unlink()
        (self.build / 'data/tiles/titanic/meta.json').unlink()
        self.assertNotEqual(self.run_manifest().returncode, 0)


if __name__ == '__main__':
    unittest.main()
