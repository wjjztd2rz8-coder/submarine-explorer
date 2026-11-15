// Capture discovery reveal shots across landmarks (default 1280x720 and phone
// portrait 390x844; `--sizes=844x390,390x844` picks others, phone-sized ones
// with touch emulation). `--only=site/poi,...` limits to listed reveals.
// index.json records, per size, the matched subject's on-screen bounds
// (canvas fractions, y down) next to the area the card leaves clear.
// Usage: node tools/playtest/capture-reveals.mjs <outDir> [siteId ...] [--base=http://127.0.0.1:4793/] [--sizes=WxH,...] [--only=site/poi,...]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pkgPath = fs.existsSync(path.join(repoRoot, 'node_modules/@playwright/test'))
  ? path.join(repoRoot, 'package.json')
  : '/home/vijay/submarine-explorer/package.json';
const require = createRequire(pkgPath);
const { chromium } = require('@playwright/test');

const rawArgs = process.argv.slice(2);
let base = 'http://127.0.0.1:4793/';
let sizes = [
  [1280, 720],
  [390, 844],
];
let only = null;
const posArgs = [];
for (const arg of rawArgs) {
  if (arg.startsWith('--base=')) base = arg.slice('--base='.length);
  else if (arg.startsWith('--sizes='))
    sizes = arg
      .slice('--sizes='.length)
      .split(',')
      .map((s) => s.split('x').map(Number));
  else if (arg.startsWith('--only=')) only = new Set(arg.slice('--only='.length).split(','));
  else posArgs.push(arg);
}
const sizeName = ([w, h]) =>
  w === 1280 && h === 720 ? '' : w === 390 && h === 844 ? '__portrait' : `__${w}x${h}`;
const contextFor = ([w, h]) =>
  Math.min(w, h) < 500
    ? { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }
    : { viewport: { width: w, height: h } };
if (!base.endsWith('/')) base += '/';

const [outDir, ...requestedSites] = posArgs;
if (!outDir) {
  console.error(
    'Usage: node tools/playtest/capture-reveals.mjs <outDir> [siteId ...] [--base=http://127.0.0.1:4793/]',
  );
  process.exit(2);
}

const landmarksRoot = path.join(repoRoot, 'data/landmarks');
const allSites = fs
  .readdirSync(landmarksRoot, { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      !d.name.startsWith('_') &&
      fs.existsSync(path.join(landmarksRoot, d.name, 'pois.json')),
  )
  .map((d) => d.name)
  .sort();
const sites = requestedSites.length ? requestedSites : allSites;

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--ignore-gpu-blocklist',
    '--use-angle=vulkan',
    '--enable-features=Vulkan',
    '--disable-vulkan-surface',
  ],
});

async function captureOne(url, poiId, outPath, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 180)));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page
      .locator(`.discovery-reveal[data-poi="${poiId}"]`)
      .waitFor({ state: 'visible', timeout: 40000 });
    await page.waitForTimeout(2800);
    await page.screenshot({ path: outPath });
    const { rect, framing, card } = await page.evaluate(() => {
      const panel = document.querySelector('.discovery-reveal-panel')?.getBoundingClientRect();
      return {
        rect: window.__game?.reveal?.subjectRect?.() ?? null,
        framing: window.__game?.reveal?.framing ?? null,
        card: panel ? { left: panel.left / innerWidth, top: panel.top / innerHeight } : null,
      };
    });
    return { ok: true, error: null, rect, framing, card };
  } catch (err) {
    const msg = errors[0] ?? String(err?.message ?? err).slice(0, 200);
    return { ok: false, error: msg };
  } finally {
    await context.close();
  }
}

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const results = [];
try {
  for (const site of sites) {
    const poisPath = path.join(landmarksRoot, site, 'pois.json');
    const doc = JSON.parse(fs.readFileSync(poisPath, 'utf8'));
    const pois = Array.isArray(doc) ? doc : (doc.pois ?? []);
    for (const poi of pois) {
      if (only && !only.has(`${site}/${poi.id}`)) continue;
      const url = `${base}?mission=${encodeURIComponent(site)}&skipBriefing=1&reveal=${encodeURIComponent(poi.id)}`;
      const shots = [];
      for (const size of sizes) {
        const file = `${site}__${poi.id}${sizeName(size)}.png`;
        const r = await captureOne(url, poi.id, path.join(outDir, file), contextFor(size));
        shots.push({ size: `${size[0]}x${size[1]}`, file, ...r });
      }
      const landFile = shots[0].file;
      const portFile = shots[1]?.file ?? shots[0].file;
      const succeeded = shots.every((x) => x.ok);
      const error = shots.find((x) => x.error)?.error ?? undefined;
      results.push({
        shots: shots.map(({ size, file, rect, framing, card }) => ({
          size,
          file,
          rect,
          framing,
          card,
        })),
        site,
        poi: poi.id,
        name: poi.name ?? poi.id,
        kind: poi.kind ?? 'other',
        primary: poi.primary === true,
        succeeded,
        file: landFile,
        portraitFile: portFile,
        ...(error ? { error } : {}),
      });
      console.log(
        `[${succeeded ? 'OK' : 'FAIL'}] ${site} / ${poi.id}${error ? ` — ${error}` : ''}`,
      );
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(results, null, 2) + '\n');

const cards = results
  .map(
    (r) => `<figure class="card${r.succeeded ? '' : ' fail'}">
  ${
    r.succeeded
      ? `<a href="${esc(r.file)}" target="_blank"><img src="${esc(r.file)}" alt="${esc(r.name)}" loading="lazy"></a>`
      : `<div class="missing">FAILED: ${esc(r.error ?? 'reveal never appeared')}</div>`
  }
  <figcaption>
    <strong>${esc(r.site)}</strong> · <code>${esc(r.poi)}</code>${r.primary ? ' <span class="pri">primary</span>' : ''}<br>
    ${esc(r.name)} <em>(${esc(r.kind)})</em> · ${r.shots
      .slice(1)
      .map((x) => `<a href="${esc(x.file)}" target="_blank">${esc(x.size)}</a>`)
      .join(' · ')}
  </figcaption>
</figure>`,
  )
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Bathyline Discovery Reveals (${results.length})</title>
<style>
  body { margin: 16px; background: #0b1116; color: #dbe6ee; font: 13px/1.4 system-ui, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
  .card { margin: 0; background: #121c24; border: 1px solid #223342; border-radius: 6px; overflow: hidden; }
  .card.fail { border-color: #b54b4b; }
  .card img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #050a0e; }
  .missing { padding: 48px 12px; text-align: center; color: #ff9a9a; background: #261214; }
  figcaption { padding: 8px 10px; }
  code { color: #8fd1ee; }
  .pri { background: #1d4d63; color: #bfeaff; padding: 1px 5px; border-radius: 3px; font-size: 11px; }
  a { color: #7cc7e8; }
</style>
</head>
<body>
<h1>Bathyline Discovery Reveals — ${results.filter((r) => r.succeeded).length}/${results.length} succeeded</h1>
<div class="grid">
${cards}
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
