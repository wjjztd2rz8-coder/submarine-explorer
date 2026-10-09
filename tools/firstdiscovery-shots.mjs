/**
 * First-discovery walkthrough: briefing -> Begin dive -> steer to the first required target ->
 * hold Scan until it completes -> reward UI -> next-target prompt -> 10 s more play.
 * Fresh player, Arcade defaults. Steering is automated through the real keyboard; Scan uses the
 * real G key (desktop) or a held touch on the Scan button (phone).
 *
 * Usage (repo root, Node on PATH):
 *   npm run build -- --outDir dist-fd && npx vite preview --port 4391 --strictPort --outDir dist-fd &
 *   node tools/firstdiscovery-shots.mjs [http://localhost:4391/]
 * Env: FD_SITES=titanic,beebe-vent-field  FD_LAYOUTS=desktop,phone  FD_OUT=<dir>
 * Output: .cache/codex/shots/firstdiscovery/<layout>-<site>/NN-label.png
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = new URL(process.argv[2] ?? 'http://localhost:4391/');
const sites = (process.env.FD_SITES ?? 'titanic,beebe-vent-field').split(',');
const all = {
  desktop: { viewport: { width: 1600, height: 900 }, touch: false },
  phone: { viewport: { width: 390, height: 844 }, touch: true },
};
const layouts = (process.env.FD_LAYOUTS ?? 'desktop,phone').split(',');
const out = resolve(process.env.FD_OUT ?? '.cache/codex/shots/firstdiscovery');

const browser = await chromium.launch({
  args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const layout of layouts) {
  const { viewport, touch } = all[layout];
  for (const site of sites) {
    const dir = resolve(out, `${layout}-${site}`);
    await mkdir(dir, { recursive: true });
    const ctx = await browser.newContext({
      viewport,
      hasTouch: touch,
      isMobile: touch,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();
    const errors = [];
    const log = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let n = 0;
    const shot = async (label) =>
      page.screenshot({ path: `${dir}/${String(++n).padStart(2, '0')}-${label}.png` });
    const click = (loc) => (touch ? loc.tap({ force: true }) : loc.click());
    await page.addInitScript(() => {
      if (!localStorage.getItem('subexplorer.settings.v2'))
        localStorage.setItem(
          'subexplorer.settings.v2',
          JSON.stringify({ version: 2, graphicsTier: 'low' }),
        );
    });
    const keys = new Set();
    let stickDown = false;
    let stickCdp = null;
    // Phone: the real touch stick (keys would flip the game out of touch mode).
    const setStick = async (want) => {
      stickCdp ??= await ctx.newCDPSession(page);
      if (!want.size) {
        if (stickDown)
          await stickCdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        stickDown = false;
        return;
      }
      const box = await page.locator('.tc-stick').boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const dx = want.has('d') ? 0.35 : want.has('a') ? -0.35 : 0;
      const dy = want.has('w') ? -0.4 : 0;
      if (!stickDown) {
        await stickCdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        stickDown = true;
      }
      await stickCdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + dx * box.width, y: y + dy * box.height }],
      });
    };
    const setKeys = async (want) => {
      if (touch) return setStick(want);
      for (const k of [...keys]) if (!want.has(k)) (await page.keyboard.up(k), keys.delete(k));
      for (const k of want) if (!keys.has(k)) (await page.keyboard.down(k), keys.add(k));
    };
    // Pose of the sub relative to the first unfinished primary objective's scan target.
    const probe = () =>
      page.evaluate(() => {
        const g = window.__game;
        const o =
          g.mission.objectives.find((x) => x.resolved && !x.complete && x.primary) ??
          g.mission.objectives.find((x) => x.resolved && !x.complete);
        if (!o) return null;
        const t = g.scanner.getTargets().find((x) => x.id === o.poiId);
        if (!t) return { id: o.poiId, missing: true };
        const p = g.sub.position;
        const dx = t.position.x - p.x;
        const dy = t.position.y - p.y;
        const dz = t.position.z - p.z;
        const horiz = Math.hypot(dx, dz);
        const want = Math.atan2(dx, -dz);
        let dyaw = want - g.sub.yaw;
        dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
        const dpitch = Math.atan2(dy, horiz) - g.sub.pitch;
        return {
          id: t.id,
          dist: Math.hypot(horiz, dy),
          dyawDeg: (dyaw * 180) / Math.PI,
          dpitchDeg: (dpitch * 180) / Math.PI,
          candidate: g.scanner.view.candidateId,
          completed: g.scanner.view.completed,
        };
      });
    try {
      await page.goto(base.href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 90000 });
      await page.waitForTimeout(1000);
      await click(page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }));
      await page.locator(`.home-sites [data-mission="${site}"]`).waitFor();
      await click(page.locator(`.home-sites [data-mission="${site}"]`));
      await page.waitForURL(new RegExp(`mission=${site}`));
      await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 90000 });
      await page.locator('.briefing').waitFor();
      await click(page.locator('.briefing').getByRole('button', { name: 'Begin dive' }));
      await page.locator('.briefing').waitFor({ state: 'hidden' });
      await page.waitForTimeout(1500);
      await shot('t00');
      const first = await probe();
      log.push(`start ${JSON.stringify(first)}`);
      // Drive: turn toward the target (yaw, then pitch), thrust once roughly aligned.
      const t0 = Date.now();
      let nextShot = 15;
      let candidateSince = 0;
      while (Date.now() - t0 < 420000) {
        const p = await probe();
        if (!p || p.missing) break;
        const secs = (Date.now() - t0) / 1000;
        if (secs >= nextShot && nextShot <= 60)
          (await shot(`drive-t${nextShot}`), (nextShot += 15));
        if (p.candidate === p.id) {
          candidateSince ||= Date.now();
          if (Date.now() - candidateSince > 600) break;
        } else candidateSince = 0;
        const want = new Set();
        if (Math.abs(p.dyawDeg) > 4) want.add(p.dyawDeg > 0 ? 'd' : 'a');
        if (Math.abs(p.dpitchDeg) > 6) want.add(p.dpitchDeg > 0 ? 'r' : 'f');
        if (Math.abs(p.dyawDeg) < 40) want.add('w');
        await setKeys(want);
        await page.waitForTimeout(120);
      }
      await setKeys(new Set());
      const arrive = await probe();
      log.push(`arrive ${JSON.stringify(arrive)} after ${Math.round((Date.now() - t0) / 1000)}s`);
      await shot('in-range');
      // Hold Scan until the scanner reports a completion.
      const before = arrive?.completed ?? 0;
      let cdp = null;
      if (touch) {
        cdp = stickCdp ?? (await ctx.newCDPSession(page));
        const box = await page.locator('.tc-btn-scan').boundingBox();
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
        });
      } else await page.keyboard.down('g');
      await page.waitForTimeout(1200);
      await shot('scan-progress');
      await page
        .waitForFunction((b) => window.__game.scanner.view.completed > b, before, {
          timeout: 60000,
          polling: 100,
        })
        .catch((e) => errors.push(`scan: ${e.message.split('\n')[0]}`));
      if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      else await page.keyboard.up('g');
      await page.waitForTimeout(500);
      await shot('reward-a');
      await page.waitForTimeout(2500);
      await shot('reward-b');
      await page.waitForTimeout(5000);
      await shot('next-target');
      // Continue 10 s toward the next target.
      const nxt = await probe();
      log.push(`next ${JSON.stringify(nxt)}`);
      const t1 = Date.now();
      while (Date.now() - t1 < 10000) {
        const p = await probe();
        if (!p || p.missing) break;
        const want = new Set();
        if (Math.abs(p.dyawDeg) > 4) want.add(p.dyawDeg > 0 ? 'd' : 'a');
        if (Math.abs(p.dpitchDeg) > 6) want.add(p.dpitchDeg > 0 ? 'r' : 'f');
        if (Math.abs(p.dyawDeg) < 40) want.add('w');
        await setKeys(want);
        await page.waitForTimeout(150);
      }
      await setKeys(new Set());
      await shot('continue-10s');
    } catch (e) {
      errors.push(`script: ${e.message.split('\n')[0]}`);
      await shot('failure').catch(() => {});
    }
    await writeFile(`${dir}/log.txt`, log.join('\n') + '\n');
    console.log(
      `${layout} ${site}: ${n} shots in ${dir}\n  ${log.join('\n  ')}${errors.length ? `\n  ERRORS ${errors.join(' | ')}` : ''}`,
    );
    await ctx.close();
  }
}
await browser.close();
