/**
 * Render the authored 24-unit Bathyline mark to the existing PWA/Apple paths.
 * All outputs are opaque ocean navy. Maskable artwork stays inside the central
 * safe circle (radius 40% of the canvas); the background covers the full canvas.
 * Uses the Playwright Chromium installed for e2e: node tools/make_icons.mjs
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync(new URL('../public/bathyline-mark.svg', import.meta.url), 'utf8');
if (!/viewBox="0 0 24 24"/.test(svg)) {
  throw new Error('The icon source must use the Bathyline 24-unit viewBox.');
}
const BG = '#06131F';
const INK = '#E8F3F1';
const CONTOUR = '#65DCCB';
const outputDir = new URL('../public/icons/', import.meta.url);
mkdirSync(outputDir, { recursive: true });

/** `pad` is the clear fraction on each side of the mark's viewBox. */
function page(size, pad) {
  const width = (1 - 2 * pad) * size;
  const mark = svg.replace(
    '<svg',
    `<svg width="${width}" height="${width}" style="position:absolute;left:${pad * size}px;top:${pad * size}px;color:${INK};--logo-contour:${CONTOUR}"`,
  );
  return `<!doctype html><body style="margin:0;background:${BG}">${mark}</body>`;
}

// The ring's outer radius is 11 units, including its 2-unit stroke. At 14%
// padding its radius is (11 / 24) * 0.72 = 33% of the canvas, below the 40% limit.
// Never use the rounded favicon background as maskable art: it must be full bleed.
const jobs = [
  ['icon-192.png', 192, 0.08],
  ['icon-512.png', 512, 0.08],
  ['icon-maskable-192.png', 192, 0.14],
  ['icon-maskable-512.png', 512, 0.14],
  ['apple-touch-icon.png', 180, 0.08],
];

const browser = await chromium.launch();
try {
  for (const [name, size, pad] of jobs) {
    const p = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await p.setContent(page(size, pad));
    await p.screenshot({ path: new URL(name, outputDir).pathname });
    await p.close();
    console.log('wrote', name);
  }
} finally {
  await browser.close();
}
