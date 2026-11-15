// Phone layout audit: Finish dive line height, discovery reveal, mission debrief.
// Usage: node tools/playtest/phone-flow.mjs <outDir> <width> <height> [baseUrl]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(repoRoot, 'package.json'));
const { chromium } = require('@playwright/test');

const [OUT, wArg, hArg, baseArg] = process.argv.slice(2);
const W = +wArg;
const H = +hArg;
const BASE = (baseArg ?? 'http://127.0.0.1:4904/').replace(/\/?$/, '/');
if (!OUT || !(W > 0) || !(H > 0)) {
  console.error('usage: node phone-flow.mjs <outDir> <width> <height> [baseUrl]');
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });

const ctxOpts = {
  viewport: { width: W, height: H },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};

const overlap = (a, b) =>
  a &&
  b &&
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

async function auditOverlay(page, rootSel) {
  return page.evaluate(
    ({ rootSel, vw, vh }) => {
      const root = document.querySelector(rootSel);
      if (!root || root.hidden) return { ok: false, issues: ['missing root'] };
      const issues = [];
      const check = (el, label) => {
        if (!el || el.hidden) return;
        const r = el.getBoundingClientRect();
        if (r.width < 1 && r.height < 1) return;
        const isBtn =
          el.tagName === 'BUTTON' || el.classList.contains('debrief-btn') || el.closest('button');
        if (isBtn && (r.width < 40 || r.height < 40)) {
          issues.push(`${label}: button ${r.width.toFixed(1)}x${r.height.toFixed(1)}`);
        }
        if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) {
          issues.push(`${label}: outside viewport`);
        }
        const textLike = ['P', 'H1', 'H2', 'H3', 'SPAN', 'DIV'].includes(el.tagName);
        if (textLike && el.scrollWidth > el.clientWidth + 1) {
          issues.push(`${label}: text overflow ${el.scrollWidth - el.clientWidth}px`);
        }
      };
      const panel = root.querySelector('.discovery-reveal-panel,.debrief-panel') ?? root;
      check(panel, 'panel');
      for (const el of panel.querySelectorAll('button,h1,h2,h3,p,.debrief-kicker,.debrief-title')) {
        check(el, el.tagName);
      }
      const docScroll = document.documentElement.scrollWidth > window.innerWidth + 1;
      if (docScroll) issues.push('page horizontal scroll');
      return { ok: issues.length === 0, issues };
    },
    { rootSel, vw: W, vh: H },
  );
}

async function measureFinish(page) {
  await page.goto(`${BASE}?mission=monterey-canyon&skipBriefing=1&touch=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  for (const id of [
    'monterey-canyon-wall',
    'monterey-canyon-inner-bend',
    'monterey-canyon-axis',
  ]) {
    await page.evaluate((poiId) => window.__game.bus.emit('scan:complete', { poiId }), id);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(4500);
  const keep = page.getByRole('button', { name: /keep exploring/i });
  if (await keep.count()) await keep.first().tap();
  await page.locator('.hud-finish').waitFor({ state: 'visible', timeout: 15000 });
  return page.evaluate(() => {
    const el = document.querySelector('.hud-finish');
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const lh = parseFloat(cs.lineHeight) || 1;
    const range = document.createRange();
    range.selectNodeContents(el);
    const textLineRects = range.getClientRects().length;
    const scan = document.querySelector('.tc-btn-scan')?.getBoundingClientRect();
    const stick = document.querySelector('.tc-stick')?.getBoundingClientRect();
    const oneLine = cs.whiteSpace === 'nowrap' && textLineRects <= 1;
    return {
      height: r.height,
      lineHeight: lh,
      textLineRects,
      oneLine,
      whiteSpace: cs.whiteSpace,
      overlapScan:
        scan &&
        r.x < scan.x + scan.width &&
        scan.x < r.x + r.width &&
        r.y < scan.y + scan.height &&
        scan.y < r.y + r.height,
      overlapStick:
        stick &&
        r.x < stick.x + stick.width &&
        stick.x < r.x + r.width &&
        r.y < stick.y + stick.height &&
        stick.y < r.y + r.height,
    };
  });
}

async function openReveal(page, site, poi) {
  await page.goto(
    `${BASE}?mission=${encodeURIComponent(site)}&skipBriefing=1&touch=1&reveal=${encodeURIComponent(poi)}`,
    { waitUntil: 'domcontentloaded', timeout: 60000 },
  );
  await page.locator('.discovery-reveal').waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(1500);
  return auditOverlay(page, '.discovery-reveal');
}

async function openDebrief(page, site) {
  await page.goto(
    `${BASE}?mission=${encodeURIComponent(site)}&skipBriefing=1&touch=1&debrief=1`,
    { waitUntil: 'domcontentloaded', timeout: 60000 },
  );
  await page.locator('.debrief').waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(2500);
  const audit = await auditOverlay(page, '.debrief');
  const next = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.debrief-btn')].find((b) =>
      /next dive/i.test(b.textContent ?? ''),
    );
    const r = btn?.getBoundingClientRect();
    return {
      reachable: !!r && r.left >= 0 && r.right <= innerWidth && r.width >= 40 && r.height >= 40,
      width: r?.width ?? 0,
    };
  });
  return { ...audit, nextSite: next };
}

const browser = await chromium.launch({
  args: [
    '--ignore-gpu-blocklist',
    '--use-angle=vulkan',
    '--enable-features=Vulkan',
    '--disable-vulkan-surface',
  ],
});
const ctx = await browser.newContext(ctxOpts);
const page = await ctx.newPage();

const finish = await measureFinish(page);
const revealA = await openReveal(page, 'monterey-canyon', 'monterey-canyon-wall');
const revealB = await openReveal(page, 'great-blue-hole', 'great-blue-hole-stalactites');
const debrief = await openDebrief(page, 'monterey-canyon');

const report = {
  viewport: `${W}x${H}`,
  finish,
  reveals: { 'monterey-canyon': revealA, 'great-blue-hole': revealB },
  debrief,
};
console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(
  finish.oneLine && !finish.overlapScan && !finish.overlapStick && revealA.ok && revealB.ok && debrief.ok
    ? 0
    : 1,
);