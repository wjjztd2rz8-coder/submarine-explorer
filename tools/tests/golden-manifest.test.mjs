import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { goldenBuild, readGoldenBuild } from '../golden-build.mjs';
import { goldenOptions } from '../golden-options.mjs';
import { goldenManifest, goldenContactSheet } from '../golden-manifest.mjs';
import { comparePixels, compareGoldenSets } from '../golden-compare.mjs';
import { PNG } from 'playwright-core/lib/utilsBundle';

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

test('golden comparison tolerates byte rounding and sparse edges but flags shading and missing detail', () => {
  const image = () => ({ width: 100, height: 100, data: Buffer.alloc(100 * 100 * 4, 255) });
  const before = image();
  const rounded = image();
  for (let i = 0; i < rounded.data.length; i += 4) rounded.data[i] -= 2;
  const rounding = comparePixels(before, rounded);
  assert.equal(rounding.withinTolerance, true);
  assert.equal(rounding.changed, 10000);
  assert.equal(rounding.significant, 0);
  assert.equal(rounding.mae, 2 / 3);
  assert.equal(rounding.max, 2);
  const edges = image();
  for (let i = 0; i < 10; i++) edges.data[i * 4] = 0;
  assert.equal(comparePixels(before, edges).withinTolerance, true);
  edges.data[10 * 4] = 0;
  assert.equal(comparePixels(before, edges).withinTolerance, false);
  const shading = image();
  for (let i = 0; i < shading.data.length; i += 4) shading.data[i] -= 3;
  assert.equal(comparePixels(before, shading).withinTolerance, false);
  const missing = image();
  for (let i = 0; i < 100; i++) missing.data[i * 4] = 0;
  assert.equal(comparePixels(before, missing).withinTolerance, false);
  assert.throws(() => comparePixels(before, { ...before, width: 200 }), /matching/);
  missing.data[3] = 0;
  assert.throws(() => comparePixels(before, missing), /opaque/);
});

test('golden comparison refuses partial sets, missing files and incompatible poses', async () => {
  const root = await mkdtemp(join(tmpdir(), 'golden-compare-'));
  const before = join(root, 'before');
  const after = join(root, 'after');
  const shot = {
    filename: 'titanic-1.png',
    position: [1, 2, 3],
    camera: [4, 5, 6],
    viewport: [2, 2],
  };
  const manifest = {
    sha: 'a'.repeat(40),
    dirty: false,
    buildMode: 'production',
    mode: 'free-dive',
    tier: 'high',
    layouts: [{ name: 'desktop', width: 2, height: 2 }],
    complete: true,
    failures: [],
    captures: [shot],
  };
  const writeManifest = (dir, m) => writeFile(join(dir, 'poses.json'), JSON.stringify(m));
  try {
    await mkdir(before);
    await mkdir(after);
    const png = new PNG({ width: 2, height: 2 });
    png.data.fill(255);
    for (const dir of [before, after]) {
      await writeManifest(dir, manifest);
      await writeFile(join(dir, shot.filename), PNG.sync.write(png));
    }
    assert.equal((await compareGoldenSets(before, after)).withinTolerance, true);
    const cli = resolve('tools/golden-compare.mjs');
    await run(process.execPath, [cli, before, after]);
    png.data[0] = 0;
    await writeFile(join(after, shot.filename), PNG.sync.write(png));
    await assert.rejects(run(process.execPath, [cli, before, after]), (error) => error.code === 1);
    const report = await run(process.execPath, [cli, before, after, '--report']);
    assert.equal(JSON.parse(report.stdout).withinTolerance, false);
    png.data[0] = 255;
    await writeFile(join(after, shot.filename), PNG.sync.write(png));
    await writeManifest(after, { ...manifest, sha: null });
    await assert.rejects(compareGoldenSets(before, after), /provenance/);
    await writeManifest(after, { ...manifest, complete: false });
    await assert.rejects(compareGoldenSets(before, after), /Incomplete/);
    await writeManifest(after, { ...manifest, captures: [] });
    await assert.rejects(compareGoldenSets(before, after), /Incomplete/);
    await writeManifest(after, { ...manifest, captures: [{ ...shot, filename: 'titanic-2.png' }] });
    await assert.rejects(compareGoldenSets(before, after), /sets differ/);
    await writeManifest(after, { ...manifest, captures: [{ ...shot, camera: [4, 5, 7] }] });
    await assert.rejects(compareGoldenSets(before, after), /camera/);
    for (const dir of [before, after])
      await writeManifest(dir, { ...manifest, captures: [{ ...shot, viewport: [3, 3] }] });
    await assert.rejects(compareGoldenSets(before, after), /dimensions/);
    await writeManifest(before, manifest);
    await writeManifest(after, manifest);
    await rm(join(after, shot.filename));
    await assert.rejects(compareGoldenSets(before, after), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('serialized pose manifests and contact sheets contain build, site, layout, mode and mission timing evidence', () => {
  const provenance = { sha: 'a'.repeat(40), dirty: true, buildMode: 'production' };
  for (const mode of ['all', 'free-dive', 'mission']) {
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

test('the combined contact sheet lists every mission opening with clean build provenance', async () => {
  const { readFile } = await import('node:fs/promises');
  const missions = JSON.parse(
    await readFile(new URL('../../data/landmarks/index.json', import.meta.url)),
  ).landmarks;
  assert.equal(missions.length, 13);
  const provenance = { sha: 'b'.repeat(40), dirty: false, buildMode: 'production' };
  const captures = missions.map((site) => ({
    site,
    layout: 'desktop',
    mode: 'mission',
    ...provenance,
    filename: `${site}-1-mission.png`,
    range: null,
    timeS: 0,
  }));
  const manifest = goldenManifest({
    base: 'http://localhost/',
    stamp: 'fixture',
    provenance,
    options: goldenOptions({}),
    heroes: [['titanic', 'bow-hull']],
    missions,
    captures,
    failures: [],
  });
  assert.deepEqual(manifest.plannedMissions, missions);
  assert.deepEqual(manifest.plannedHeroes, [['titanic', 'bow-hull']]);
  const sheet = goldenContactSheet(manifest);
  assert.ok(sheet.includes('(clean tree)'));
  for (const shot of captures) assert.ok(sheet.includes(`href="${shot.filename}"`));
});
