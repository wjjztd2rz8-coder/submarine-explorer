import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Artifact v4 supplies immutable storage and a transfer digest. This manifest
// binds that artifact to the checkout, dependencies, runtime and deployment base.
const [mode, base, outdir] = process.argv.slice(2);
if (!['write', 'verify'].includes(mode) || !['/', '/submarine-explorer/'].includes(base) || !outdir)
  throw new Error('Usage: node tools/ci-build-manifest.mjs <write|verify> <base> <outdir>');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== sha)
  throw new Error('Checkout SHA does not match workflow SHA');
const expected = {
  sha,
  lockfileHash: createHash('sha256').update(readFileSync('package-lock.json')).digest('hex'),
  nodeVersion: process.version,
  base,
  outdir,
};
const manifestPath = join(outdir, 'ci-build-manifest.json');
if (mode === 'verify') {
  const actual = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const [key, value] of Object.entries(expected))
    if (actual[key] !== value) throw new Error(`Build manifest ${key} mismatch`);
}
function checkPortable(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error(`Build output contains a symlink: ${path}`);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) checkPortable(join(path, entry));
  } else if (!stat.isFile()) {
    throw new Error(`Build output contains a non-file: ${path}`);
  }
}
checkPortable(outdir);
// These are essential output files, including the dereferenced public/data tree.
for (const file of ['index.html', 'sw.js', 'manifest.webmanifest', 'data/tiles/titanic/meta.json'])
  if (!lstatSync(join(outdir, file)).isFile()) throw new Error(`Missing build file: ${file}`);
if (mode === 'write')
  writeFileSync(manifestPath, `${JSON.stringify(expected, null, 2)}\n`, { flag: 'wx' });
console.log(`${mode === 'write' ? 'Wrote' : 'Verified'} build manifest: ${sha} ${base} ${outdir}`);
