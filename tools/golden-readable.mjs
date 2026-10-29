/**
 * Advisory opening readability proxy: node tools/golden-readable.mjs <directory> [--summary]
 * Method, fixed regions and calibration: plan/progress/T-opening-readable.md.
 * Flags never change the exit status; malformed/unreadable inputs exit 2.
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'playwright-core/lib/utilsBundle';

const linear = Array.from({ length: 256 }, (_, i) => {
  const s = i / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
});
// Normalized [left, top, right, bottom], calibrated on 1600×900 chase openings.
const band = [0.2, 0.3, 0.8, 0.9];
const submarine = [0.465, 0.665, 0.535, 0.82];
const hud = [
  [0, 0, 0.16, 0.32], // sonar
  [0.32, 0, 0.6, 0.14], // objective
  [0.76, 0, 1, 0.35], // mission / telemetry
  [0, 0.93, 1, 1], // bottom controls
  [0.275, 0.43, 0.725, 0.6], // floating objective labels / diamonds
];
const inside = (x, y, [left, top, right, bottom]) =>
  x >= left && x < right && y >= top && y < bottom;
export const readableThreshold = Object.freeze({ darkY: linear[20], minSceneToSub: 1 / 8 });
// Keep a threshold-equal gray from slipping below it through floating-point sums.
const below = (value, threshold) => value < threshold - 1e-12;

export function openingReadability({ width, height, data }) {
  if (!width || !height || data.length !== width * height * 4)
    throw new Error('Expected a full-resolution RGBA image');
  let sceneSum = 0,
    subSum = 0,
    scenePixels = 0,
    subPixels = 0,
    dark = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width,
        ny = y / height;
      const inSub = inside(nx, ny, submarine);
      if ((!inSub && !inside(nx, ny, band)) || hud.some((r) => inside(nx, ny, r))) continue;
      const i = (y * width + x) * 4;
      if (data[i + 3] !== 255) throw new Error('Golden screenshots must be opaque');
      const Y =
        0.2126 * linear[data[i]] + 0.7152 * linear[data[i + 1]] + 0.0722 * linear[data[i + 2]];
      if (inSub) {
        subSum += Y;
        subPixels++;
      } else {
        sceneSum += Y;
        scenePixels++;
        if (below(Y, readableThreshold.darkY)) dark++;
      }
    }
  }
  if (!scenePixels || !subPixels) throw new Error('Image too small for readability regions');
  const meanY = sceneSum / scenePixels;
  const subY = subSum / subPixels;
  // A black sub/scene gets zero, never a NaN or a spurious pass.
  const sceneToSub = subY ? meanY / subY : 0;
  return {
    meanY,
    darkShare: dark / scenePixels,
    subY,
    sceneToSub,
    flagged:
      below(meanY, readableThreshold.darkY) || below(sceneToSub, readableThreshold.minSceneToSub),
  };
}

export async function readGoldenReadability(directory) {
  const rows = [];
  for (const filename of (await readdir(directory)).filter((f) => f.endsWith('-1-mission.png'))) {
    const png = PNG.sync.read(await readFile(resolve(directory, filename)));
    rows.push({ filename, ...openingReadability(png) });
  }
  return rows.sort(
    (a, b) =>
      Number(b.flagged) - Number(a.flagged) ||
      a.sceneToSub - b.sceneToSub ||
      a.filename.localeCompare(b.filename),
  );
}

export function readableSummary(rows) {
  const flagged = rows.filter((r) => r.flagged);
  return `Golden readability (advisory): ${flagged.length}/${rows.length} openings flagged${flagged.length ? `: ${flagged.map((r) => r.filename).join(', ')}` : ''}`;
}

export function readableTable(rows) {
  return [
    '| Opening | Scene mean Y (%) | Dark (%) | Sub mean Y (%) | Scene/sub | Review |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    ...rows.map(
      (r) =>
        `| ${r.filename} | ${(100 * r.meanY).toFixed(3)} | ${(100 * r.darkShare).toFixed(1)} | ${(100 * r.subY).toFixed(3)} | ${r.sceneToSub.toFixed(3)} | ${r.flagged ? 'FLAG' : 'pass'} |`,
    ),
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [directory, flag] = process.argv.slice(2);
    if (!directory || (flag && flag !== '--summary') || process.argv.length > 4)
      throw new Error('Usage: golden-readable.mjs <directory> [--summary]');
    const rows = await readGoldenReadability(directory);
    if (!flag) console.log(readableTable(rows));
    console.log(readableSummary(rows));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
