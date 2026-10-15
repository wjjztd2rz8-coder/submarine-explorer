import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { goldenBuild, readGoldenBuild } from '../golden-build.mjs';
import { goldenOptions } from '../golden-options.mjs';
import { goldenManifest, goldenContactSheet } from '../golden-manifest.mjs';

for (const missing of ['sha', 'dirty', 'build-mode']) {
  test(`a document missing golden-${missing} cannot claim build provenance`, () => {
    const html = [
      ['sha', 'a'.repeat(40)],
      ['dirty', 'true'],
      ['build-mode', 'production'],
    ]
      .filter(([name]) => name !== missing)
      .map(([name, value]) => `<meta name="golden-${name}" content="${value}">`)
      .join('\n');
    assert.throws(() => readGoldenBuild(html), /provenance; rebuild or restart Vite/);
  });
}

test('served build provenance survives checkout changes and distinguishes clean, tracked and untracked dirt', async () => {
  const root = await mkdtemp(join(tmpdir(), 'golden-build-'));
  const git = async (args) =>
    (await run('git', args, { cwd: root, encoding: 'utf8' })).stdout.trim();
  try {
    await git(['init', '-q']);
    await writeFile(join(root, 'fixture'), 'initial');
    await git(['add', '.']);
    await git([
      '-c',
      'user.name=Golden Test',
      '-c',
      'user.email=golden@example.invalid',
      'commit',
      '-qm',
      'fixture',
    ]);
    const sha = await git(['rev-parse', 'HEAD']);
    const plugin = goldenBuild();
    plugin.configResolved({ root, mode: 'production' });
    const html = async () =>
      (await plugin.transformIndexHtml())
        .map(({ attrs }) => `<meta name="${attrs.name}" content="${attrs.content}">`)
        .join('\n');
    const built = await html();
    assert.deepEqual(readGoldenBuild(built), { sha, dirty: false, buildMode: 'production' });
    await writeFile(join(root, 'fixture'), 'modified');
    assert.equal(readGoldenBuild(await html()).dirty, true);
    await git(['checkout', '--', 'fixture']);
    await writeFile(join(root, 'untracked'), 'new');
    assert.equal(readGoldenBuild(await html()).dirty, true);
    await git(['add', '.']);
    await git([
      '-c',
      'user.name=Golden Test',
      '-c',
      'user.email=golden@example.invalid',
      'commit',
      '-qm',
      'new checkout',
    ]);
    assert.notEqual(await git(['rev-parse', 'HEAD']), sha);
    assert.equal(readGoldenBuild(built).sha, sha);
    plugin.configResolved({ root, mode: 'development' });
    assert.equal(readGoldenBuild(await html()).buildMode, 'development');
    for (const bad of [
      '',
      built.replace(sha, 'invalid'),
      built.replace('false', 'unknown'),
      built.replace('production', ''),
    ])
      assert.throws(() => readGoldenBuild(bad), /provenance/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('serialized pose manifests and contact sheets contain build, site, layout, mode and mission timing evidence', () => {
  const provenance = { sha: 'a'.repeat(40), dirty: true, buildMode: 'production' };
  for (const mode of ['free-dive', 'mission']) {
    const options = goldenOptions({ GOLDEN_MODE: mode });
    const captures = options.layouts.flatMap(({ name: layout }) =>
      [0, 10].map((timeS) => ({
        site: 'titanic',
        layout,
        mode,
        ...provenance,
        timeS,
        missionId: mode === 'mission' ? 'titanic' : null,
        missionElapsedS: mode === 'mission' ? timeS + 0.25 : null,
        range: null,
        filename: `titanic-${layout}-${timeS}.png`,
      })),
    );
    const manifest = JSON.parse(
      JSON.stringify(
        goldenManifest({
          base: 'http://localhost/',
          stamp: 'fixture',
          provenance,
          options,
          heroes: [['titanic']],
          failures: [],
          captures,
        }),
      ),
    );
    for (const [key, expected] of Object.entries({
      ...provenance,
      mode,
      tier: 'high',
      complete: true,
    }))
      assert.equal(manifest[key], expected);
    assert.deepEqual(manifest.layouts, options.layouts);
    assert.deepEqual(manifest.plannedMissions, mode === 'mission' ? ['titanic'] : []);
    assert.deepEqual(manifest.captures, captures);
    const sheet = goldenContactSheet(manifest);
    for (const { site, layout, mode, sha } of captures)
      assert.ok(sheet.includes(`${site} · ${layout} · ${mode} · SHA ${sha}`));
    assert.ok(sheet.includes('(dirty)'));
    assert.ok(sheet.includes('build production'));
    const partial = goldenManifest({
      base: 'http://localhost/',
      stamp: 'fixture',
      provenance,
      options,
      heroes: [['titanic']],
      failures: [{ stage: 'capture', message: 'fixture failure' }],
      captures: [],
    });
    assert.equal(partial.complete, false);
    assert.ok(goldenContactSheet(partial).includes('INCOMPLETE'));
  }
});
