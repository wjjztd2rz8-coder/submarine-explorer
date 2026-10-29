import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'playwright-core/lib/utilsBundle';
import {
  openingReadability,
  readGoldenReadability,
  readableSummary,
  readableTable,
} from '../golden-readable.mjs';

const linear = (byte) => ((byte / 255 + 0.055) / 1.055) ** 2.4;
function image(scene = 40, sub = scene, overlays = scene) {
  const png = new PNG({ width: 200, height: 100 });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      let value = scene;
      if (x >= 93 && x < 107 && y >= 67 && y < 82) value = sub;
      // Deliberately bright HUD, including markers inside the sampled band.
      if (y < 30 || y >= 93 || (x >= 55 && x < 145 && y >= 43 && y < 60) || (x >= 152 && y < 35))
        value = overlays;
      const i = (y * png.width + x) * 4;
      png.data.set([value, value, value, 255], i);
    }
  }
  return png;
}

test('readability uses linear luminance, excludes HUD and keeps the sub out of the scene mean', () => {
  const result = openingReadability(image(40, 100, 255));
  assert.ok(Math.abs(result.meanY - linear(40)) < 1e-12);
  assert.ok(Math.abs(result.subY - linear(100)) < 1e-12);
  assert.ok(Math.abs(result.sceneToSub - linear(40) / linear(100)) < 1e-12);
  assert.equal(result.darkShare, 0);
  assert.equal(result.flagged, false);
  assert.deepEqual(result, openingReadability(image(40, 100, 0)));
});

test('black scenes cannot pass through bright HUDs; contrast and the strict dark threshold are independent', () => {
  const black = openingReadability(image(0, 0, 255));
  assert.equal(black.darkShare, 1);
  assert.equal(black.sceneToSub, 0);
  assert.equal(black.flagged, true);
  assert.equal(openingReadability(image(19)).darkShare, 1);
  assert.equal(openingReadability(image(20)).darkShare, 0);
  assert.equal(openingReadability(image(19)).flagged, true);
  assert.equal(openingReadability(image(20)).flagged, false);
  assert.equal(openingReadability(image(40, 255)).flagged, true);
  const transparent = image();
  transparent.data.fill(0);
  assert.throws(() => openingReadability(transparent), /opaque/);
  assert.throws(() => openingReadability({ width: 2, height: 2, data: [] }), /RGBA/);
});

test('PNG report selects only openings, sorts worst first and produces a table and one summary line', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'golden-readable-'));
  try {
    for (const [filename, png] of [
      ['bright-1-mission.png', image(80, 120)],
      ['dim-1-mission.png', image(40, 255)],
      ['black-1-mission.png', image(0, 255)],
    ])
      await writeFile(join(directory, filename), PNG.sync.write(png));
    await writeFile(join(directory, 'ignored-1.png'), 'not a PNG');
    await writeFile(join(directory, 'ignored-2-mission.png'), 'not a PNG');
    const rows = await readGoldenReadability(directory);
    assert.deepEqual(
      rows.map((r) => r.filename),
      ['black-1-mission.png', 'dim-1-mission.png', 'bright-1-mission.png'],
    );
    const table = readableTable(rows);
    assert.ok(table.includes('| Scene mean Y (%) | Dark (%) |'));
    assert.ok(table.includes('| FLAG |'));
    assert.equal(
      readableSummary(rows),
      'Golden readability (advisory): 2/3 openings flagged: black-1-mission.png, dim-1-mission.png',
    );
    assert.equal(readableSummary(rows).split('\n').length, 1);
    await writeFile(join(directory, 'broken-1-mission.png'), 'not a PNG');
    await assert.rejects(readGoldenReadability(directory));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('free-dive-only sets report zero openings without inventing a passing capture', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'golden-readable-'));
  try {
    assert.deepEqual(await readGoldenReadability(directory), []);
    assert.equal(readableSummary([]), 'Golden readability (advisory): 0/0 openings flagged');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
