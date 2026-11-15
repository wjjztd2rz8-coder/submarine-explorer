// First-visit UX audit: home buttons, word count, HUD overlap, Finish dive placement.
// Usage: node tools/playtest/first-visit-audit.mjs <out.json> [baseUrl]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const [outFile, BASE_RAW = 'http://127.0.0.1:4941/'] = process.argv.slice(2);
const BASE = BASE_RAW.replace(/\/?$/, '/');
const viewports = [
  { w: 390, h: 844, touch: true, label: '390x844' },
  { w: 844, h: 390, touch: true, label: '844x390' },
  { w: 1280, h: 720, touch: false, label: '1280x720' },
];

const overlap = (a, b) =>
  a &&
  b &&
  a.width > 0 &&
  b.width > 0 &&
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

async function measureViewport(browser, { w, h, touch, label }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: touch,
    isMobile: touch,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 120000 });
  await page.waitForSelector('.home-screen:not([hidden])', { timeout: 60000 });

  const homeButtons = await page.locator('.home-menu > button:visible').count();
  const homeWords = wordCount(await page.locator('.home-screen').innerText());
  let taps = 1;
  await page.getByRole('button', { name: /^Dive:/ }).click();
  await page.locator('.briefing-panel').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('.briefing-intro').waitFor({ state: 'visible', timeout: 15000 });
  const briefingWords = wordCount(await page.locator('.briefing-panel').innerText());
  const throughBriefing = homeWords + briefingWords;
  const hudOverlapWhileBriefing = await page.evaluate(() => {
    const panel = document.querySelector('.briefing-panel')?.getBoundingClientRect();
    if (!panel) return true;
    const checks = ['.sonar', '.hud-bar', '.hud', '.objectives-panel'];
    for (const sel of checks) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || r.width < 1) continue;
      if (
        r.x < panel.x + panel.width &&
        panel.x < r.x + r.width &&
        r.y < panel.y + panel.height &&
        panel.y < r.y + r.height
      )
        return true;
    }
    return false;
  });
  await page.getByRole('button', { name: 'Begin dive' }).click();
  await page.waitForFunction(() => document.body.getAttribute('data-app-state') === 'dive', null, {
    timeout: 30000,
  });
  taps += 1;

  // Finish dive overlaps (same session after the direct path dive)
  await page.waitForFunction(() => !!window.__game?.missionRouter?.finishButton, null, {
    timeout: 30000,
  });
  await page.evaluate(() => {
    const router = window.__game.missionRouter;
    const btn = router.finishButton;
    btn.hidden = false;
    const bar = document.querySelector('.hud-bar');
    if (bar && !bar.contains(btn)) bar.append(btn);
  });
  const finishOverlap = await page.evaluate(() => {
    const finish = document.querySelector('.hud-finish')?.getBoundingClientRect();
    if (!finish) return { ok: false, hits: ['missing'] };
    const peers = [
      ...document.querySelectorAll(
        '.hud-bar button, .tc-btn-scan, .tc-stick, .tc-root button, .sonar',
      ),
    ];
    const hits = [];
    for (const el of peers) {
      if (el.classList.contains('hud-finish')) continue;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || r.width < 1) continue;
      if (
        finish.x < r.x + r.width &&
        r.x < finish.x + finish.width &&
        finish.y < r.y + r.height &&
        r.y < finish.y + finish.height
      )
        hits.push(el.className || el.tagName);
    }
    return { ok: hits.length === 0, hits };
  });

  await ctx.close();
  return {
    viewport: label,
    homeButtons,
    homeWords,
    wordsThroughBriefing: throughBriefing,
    tapsDirectPath: taps,
    hudOverlapWhileBriefing,
    finishOverlap,
  };
}

const browser = await chromium.launch();
const results = [];
for (const vp of viewports) results.push(await measureViewport(browser, vp));
await browser.close();
const report = { base: BASE, results };
if (outFile) writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(
  results.every(
    (r) =>
      r.homeButtons <= 3 &&
      r.wordsThroughBriefing <= 85 &&
      !r.hudOverlapWhileBriefing &&
      r.finishOverlap.ok,
  )
    ? 0
    : 1,
);
