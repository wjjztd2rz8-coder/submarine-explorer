/**
 * Renders the PWA icons from public/favicon.svg (F1-TOUCH):
 *   public/icons/icon-192.png, icon-512.png            (purpose "any")
 *   public/icons/icon-maskable-192.png, -512.png       (full-bleed, glyph in the safe zone)
 *   public/icons/apple-touch-icon.png                  (180, opaque)
 * Uses the Playwright Chromium already installed for the e2e tests:
 *   node tools/make_icons.mjs
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync('public/favicon.svg', 'utf8');
const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const BG = '#061218';

/** `pad` is the fraction of the canvas kept clear on every side. */
function page(size, pad, full) {
  const scale = (1 - 2 * pad) * size;
  const bg = full ? `<div style="position:fixed;inset:0;background:${BG}"></div>` : '';
  return `<!doctype html><body style="margin:0;background:transparent">${bg}
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${scale}" height="${scale}"
    style="position:fixed;left:${pad * size}px;top:${pad * size}px">${inner}</svg></body>`;
}

const jobs = [
  ['icon-192.png', 192, 0, false, true],
  ['icon-512.png', 512, 0, false, true],
  ['icon-maskable-192.png', 192, 0.14, true, false],
  ['icon-maskable-512.png', 512, 0.14, true, false],
  ['apple-touch-icon.png', 180, 0.08, true, false],
];

const browser = await chromium.launch();
for (const [name, size, pad, full, transparent] of jobs) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(page(size, pad, full));
  await p.screenshot({ path: `public/icons/${name}`, omitBackground: transparent });
  await p.close();
  console.log('wrote', name);
}
await browser.close();
