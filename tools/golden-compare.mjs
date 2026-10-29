/**
 * Compare explicit golden sets, never silently choosing an older complete set:
 *   node tools/golden-compare.mjs <before-directory> <after-directory> [--report]
 * Exit 1 means pixel changes need review; exit 2 means invalid/incompatible input.
 * --report retains the metrics without making visual acceptance a numeric gate.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'playwright-core/lib/utilsBundle';

// Allow two sRGB byte levels for quantization/rounding and at most 0.1% larger
// edge noise. Do not fit this allowance to captures spanning deliberate art or
// pose changes. It is a conservative review trigger, not proof of visual parity.
export const goldenTolerance = Object.freeze({ channel: 2, maxChangedRatio: 0.001 });

export function comparePixels(before, after) {
  if (
    !before.width ||
    !before.height ||
    before.width !== after.width ||
    before.height !== after.height ||
    before.data.length !== before.width * before.height * 4 ||
    after.data.length !== before.data.length
  )
    throw new Error('Expected matching full-resolution RGBA images');
  const pixels = before.width * before.height;
  let changed = 0;
  let significant = 0;
  let sum = 0;
  let max = 0;
  for (let i = 0; i < before.data.length; i += 4) {
    // Golden screenshots are opaque; refuse alpha rather than ignoring it.
    if (before.data[i + 3] !== 255 || after.data[i + 3] !== 255)
      throw new Error('Golden screenshots must be opaque');
    let delta = 0;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(before.data[i + c] - after.data[i + c]);
      delta = Math.max(delta, d);
      sum += d;
    }
    if (delta) changed++;
    if (delta > goldenTolerance.channel) significant++;
    max = Math.max(max, delta);
  }
  return {
    pixels,
    changed,
    significant,
    significantRatio: significant / pixels,
    mae: sum / (pixels * 3),
    max,
    withinTolerance: significant / pixels <= goldenTolerance.maxChangedRatio,
  };
}

export async function compareGoldenSets(beforeDir, afterDir) {
  const readManifest = async (dir) => {
    const m = JSON.parse(await readFile(resolve(dir, 'poses.json'), 'utf8'));
    if (!m.complete || m.failures?.length || !m.captures?.length)
      throw new Error(`Incomplete golden set: ${dir}`);
    if (
      !/^[a-f0-9]{40}$/.test(m.sha ?? '') ||
      typeof m.dirty !== 'boolean' ||
      m.buildMode !== 'production' ||
      !['all', 'free-dive', 'mission'].includes(m.mode) ||
      !['low', 'medium', 'high'].includes(m.tier) ||
      !m.layouts?.length
    )
      throw new Error(`Invalid golden provenance or options: ${dir}`);
    const names = m.captures.map((c) => c.filename);
    if (new Set(names).size !== names.length || names.some((name) => !/^[\w-]+\.png$/.test(name)))
      throw new Error(`Invalid capture filenames: ${dir}`);
    return m;
  };
  const before = await readManifest(beforeDir);
  const after = await readManifest(afterDir);
  for (const key of ['mode', 'tier', 'layouts', 'buildMode'])
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      throw new Error(`Incompatible golden ${key}`);
  const names = (m) => m.captures.map((c) => c.filename).sort();
  if (JSON.stringify(names(before)) !== JSON.stringify(names(after)))
    throw new Error('Golden capture sets differ; missing images are not zero deltas');
  const images = [];
  for (const shot of before.captures) {
    const next = after.captures.find((c) => c.filename === shot.filename);
    for (const key of [
      'site',
      'heroId',
      'mode',
      'tier',
      'layout',
      'viewport',
      'timeS',
      'range',
      'position',
      'yaw',
      'pitch',
      'camera',
      'view',
      'lookElevation',
    ])
      if (JSON.stringify(shot[key]) !== JSON.stringify(next[key]))
        throw new Error(`Incompatible ${shot.filename}: ${key}`);
    const a = PNG.sync.read(await readFile(resolve(beforeDir, shot.filename)));
    const b = PNG.sync.read(await readFile(resolve(afterDir, shot.filename)));
    if (
      JSON.stringify([a.width, a.height]) !== JSON.stringify(shot.viewport) ||
      JSON.stringify([b.width, b.height]) !== JSON.stringify(next.viewport)
    )
      throw new Error(`Capture dimensions disagree with manifest: ${shot.filename}`);
    images.push({ filename: shot.filename, ...comparePixels(a, b) });
  }
  return {
    before: { directory: beforeDir, sha: before.sha, dirty: before.dirty },
    after: { directory: afterDir, sha: after.sha, dirty: after.dirty },
    tolerance: goldenTolerance,
    withinTolerance: images.every((i) => i.withinTolerance),
    images,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [before, after, flag] = process.argv.slice(2);
    if (!before || !after || (flag && flag !== '--report') || process.argv.length > 5)
      throw new Error('Usage: golden-compare.mjs <before-directory> <after-directory> [--report]');
    const result = await compareGoldenSets(before, after);
    console.log(JSON.stringify(result, null, 2));
    if (!result.withinTolerance && flag !== '--report') process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
