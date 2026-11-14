import missionData from '../../data/landmarks/titanic/mission.json' with { type: 'json' };
import { waitForFrames } from './helpers/frames.js';

import { homeReady } from './helpers/home.js';
import { siteData } from './helpers/site.js';
import { expect, test, type Page } from './helpers/unlocked.js';

/**
 * Mission flow, end to end, on real Titanic content:
 *  (a) `/?mission=titanic` shows the briefing with the game frozen; Enter
 *      starts the mission near the first primary objective with the objectives panel up.
 *  (b) `?poi=titanic-bow&skipBriefing=1`: scan the bow, teleport to the stern
 *      and scan it -> "Primary objectives complete" banner -> Surface and
 *      debrief -> `mission:complete` + `mission:ended` -> the mission debrief
 *      (D-FLOW: nothing ends the dive on its own).
 *  (c) the free-dive view keeps mission select off the HUD while deep links still work.
 * Also covers the sonar canvas aspect and HUD help keys.
 *
 * State is read through `window.__game.{mission, missionRouter, discovery, scanner}`.
 */

const objectiveCount = missionData.objectives.length;
const primaryCount = missionData.objectives.filter((o) => o.primary).length;
const secondaryCount = objectiveCount - primaryCount;

interface MissionProbe {
  state: string;
  emitted: string[];
  objectives: Array<{ id: string; primary: boolean; complete: boolean }>;
  durationS: number | null;
}

async function missionProbe(page: Page): Promise<MissionProbe> {
  return page.evaluate(() => {
    const m = (window.__game as { mission: unknown }).mission as {
      state: string;
      emitted: Array<{ name: string }>;
      objectives: Array<{ id: string; primary: boolean; complete: boolean }>;
      durationS: number | null;
    };
    return {
      state: m.state,
      emitted: m.emitted.map((e) => e.name),
      objectives: m.objectives.map((o) => ({ id: o.id, primary: o.primary, complete: o.complete })),
      durationS: m.durationS,
    };
  });
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded,
    undefined,
    { timeout: 20_000 },
  );
}

async function subPos(page: Page): Promise<{ x: number; y: number; z: number }> {
  return page.evaluate(() => {
    const p = (window.__game as { sub: { position: { x: number; y: number; z: number } } }).sub
      .position;
    return { x: p.x, y: p.y, z: p.z };
  });
}

for (const touch of [false, true]) {
  test.describe(touch ? 'phone mission clock' : 'desktop mission clock', () => {
    test.use({
      hasTouch: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    });

    test('pause and visibility stay frozen; slow reload excludes content loading time', async ({
      page,
    }) => {
      // Guards a skipped briefing starting the clock and piloting before its late start pose.
      await boot(page, `/?mission=titanic&skipBriefing=1&tier=low${touch ? '&touch=1' : ''}`);
      await page.waitForFunction(
        () => (window.__game as { mission: { state: string } }).mission.state === 'diving',
      );
      const elapsed = () =>
        page.evaluate(() => (window.__game as { mission: { elapsedS: number } }).mission.elapsedS);
      if (touch) await page.locator('.tc-btn-pause').tap();
      else await page.keyboard.press('Escape');
      await expect(page.locator('.pause-menu')).toBeVisible();
      const paused = await elapsed();
      await page.evaluate(() => {
        for (const hidden of [true, false]) {
          Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
          document.dispatchEvent(new Event('visibilitychange'));
        }
      });
      await waitForFrames(page, 3);
      expect(await elapsed()).toBe(paused);
      await expect(page.locator('.pause-menu')).toBeVisible();
      const resume = page
        .locator('.pause-menu')
        .getByRole('button', { name: 'Resume', exact: true });
      if (touch) await resume.tap();
      else await resume.click();
      await expect.poll(elapsed).toBeGreaterThan(paused);

      let release!: () => void;
      const content = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/data/landmarks/titanic/pois.json', async (route) => {
        await content;
        await route.continue();
      });
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.__gameReady === true);
        await waitForFrames(page, 3);
        expect((await missionProbe(page)).state).toBe('briefing');
        expect(await elapsed()).toBe(0);
        expect((await missionProbe(page)).emitted).not.toContain('mission:started');
        if (touch) await expect(page.locator('.tc-btn-scan')).toBeHidden();
      } finally {
        release();
      }
      await page.waitForFunction(
        () => (window.__game as { mission: { state: string } }).mission.state === 'diving',
      );
      const fresh = await missionProbe(page);
      expect(fresh.emitted).toEqual(['mission:started']);
      expect(fresh.objectives.every((objective) => !objective.complete)).toBe(true);
    });
  });
}

test.describe('B3 mission flow', () => {
  test('briefing freezes the game; Enter starts near the site with objectives', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await boot(page, '/?mission=titanic');

    const briefing = page.locator('.briefing');
    await expect(briefing).toBeVisible();
    await expect(page.locator('.briefing-title')).toHaveText('Titanic dive');
    await expect(page.locator('.briefing-objectives li.is-primary')).toHaveCount(primaryCount);
    await expect(page.locator('.briefing-objectives li.is-secondary')).toHaveCount(secondaryCount);
    await expect(page.locator('.briefing-section.is-hazards li')).not.toHaveCount(0);
    await expect(page.locator('.briefing-section.is-hazards li:visible')).toHaveCount(0);
    await expect(page.locator('.briefing-memorial')).toBeVisible();
    await expect(page.locator('.briefing-controls')).toHaveCount(0);
    await briefing.getByText('About this site', { exact: true }).click();
    await expect(page.locator('.briefing-section.is-hazards li').first()).toBeVisible();
    await expect(briefing.getByRole('button', { name: 'View controls' })).toHaveCount(0);
    await briefing.getByText('About this site', { exact: true }).click();
    await expect(page.locator('.briefing-begin')).toHaveText('Begin dive');
    await expect(page.locator('.objectives-panel')).toBeHidden();
    // The mission picker is collapsed out of the way during a mission.
    await expect(page.locator('body > .mission-select')).toHaveClass(/is-collapsed/);
    expect((await missionProbe(page)).state).toBe('briefing');
    await page.screenshot({ path: 'tests/e2e/screenshots/mission-briefing.png' });

    // Frozen: holding thrust + flood does nothing while the card is up.
    const before = await subPos(page);
    await page.keyboard.down('w');
    await page.keyboard.down('c');
    await page.waitForTimeout(800);
    await page.keyboard.up('c');
    await page.keyboard.up('w');
    const during = await subPos(page);
    expect(Math.hypot(during.x - before.x, during.y - before.y, during.z - before.z)).toBeLessThan(
      0.01,
    );

    // Enter on the focused disclosure toggles it; release focus so Enter is global.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Enter');
    await expect(briefing).toBeHidden();
    const started = await missionProbe(page);
    expect(started.state).toBe('diving');
    expect(started.emitted).toEqual(['mission:started']);
    const payload = await page.evaluate(
      () =>
        (window.__game as { mission: { emitted: Array<{ payload: unknown }> } }).mission.emitted[0]
          ?.payload,
    );
    expect(payload).toEqual({ missionId: 'titanic', tileId: 'titanic' });

    // Arcade starts near the bow, deep enough to see the site immediately.
    // The HUD refreshes on the next rendered frame after Begin moves the sub.
    await expect
      .poll(async () => {
        const text = (await page.locator('.hud-value[data-field="depth"]').textContent()) ?? '';
        return Number.parseFloat(text.replaceAll(',', ''));
      })
      .toBeGreaterThan(3000);

    const panel = page.locator('.objectives-panel');
    // Regression guard: the checklist repeats the step banner's goal, so it
    // stays hidden until the first objective is done (one guidance surface).
    await expect(panel).toBeHidden();
    await expect(page.locator('.guidance-slot')).toBeVisible();
    // D-FLOW: one compact line of progress; the full list is in the Esc menu.
    await expect(panel.locator('.obj-progress')).toHaveText(
      `0 of ${objectiveCount} objectives · 0 of ${primaryCount} primary`,
    );
    // Regression guard: the objective slot owns the target and slant range;
    // opening composition still aims beside the bow at the authored offset.
    await expect(panel.locator('.obj-nav, .obj-hint')).toHaveCount(0);
    await expect(page.locator('.guidance-name')).toHaveText('Bow section');
    const opening = await page.evaluate(() => {
      const g = window.__game as unknown as {
        sub: import('../../src/sub/Submarine.js').Submarine;
        discovery: import('../../src/game/Discovery.js').Discovery;
      };
      const target = g.discovery.pois.find((p) => p.id === 'titanic-bow')!;
      const delta = target.position.clone().sub(g.sub.position);
      const bearing = (Math.atan2(delta.x, -delta.z) * 180) / Math.PI;
      return {
        offset: Math.abs(((bearing - (g.sub.yaw * 180) / Math.PI + 540) % 360) - 180),
        range: delta.length(),
      };
    });
    expect(
      Math.abs(opening.offset - (siteData('titanic').opening!.mission!.yawOffset ?? 0)),
    ).toBeLessThan(2);
    expect(opening.range).toBeGreaterThanOrEqual(40);
    expect(opening.range).toBeLessThan(700);
    // Off-axis targets show plain steering directions alongside the distance.
    await expect(page.locator('.guidance-hint')).toContainText(
      new RegExp(`Turn (left|right|around)|${Math.round(opening.range)} m`),
    );

    // Now it simulates: flooding the tanks takes the boat down.
    const y0 = (await subPos(page)).y;
    await page.keyboard.down('c');
    try {
      await expect.poll(async () => (await subPos(page)).y).toBeLessThan(y0 - 1);
    } finally {
      await page.keyboard.up('c');
    }
    expect((await subPos(page)).y).toBeLessThan(y0 - 1);
    // T cycles the sim speed; the HUD badge shows it.
    await page.keyboard.press('t');

    await expect(page.locator('.hud-help')).toHaveCount(0);
    await expect(page.locator('.hud-sim-speed')).toHaveText('2× SIM SPEED');
    // On the portrait Titanic tile the sonar canvas is portrait too (no letterbox).
    const sonar = await page.evaluate(() => {
      const c = document.querySelector('.sonar canvas') as HTMLCanvasElement;
      const t = (window.__game as { terrain: { widthM: number; depthM: number } }).terrain;
      return { w: c.clientWidth, h: c.clientHeight, aspect: t.widthM / t.depthM };
    });
    expect(sonar.h).toBe(220);
    expect(Math.abs(sonar.w / sonar.h - sonar.aspect)).toBeLessThan(0.01);

    expect(errors, errors.join(' | ')).toEqual([]);
  });

  test('the bare start page presents Home without a docked mission picker', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await homeReady(page);
    expect(await page.evaluate(() => window.__game?.discovery)).toBeUndefined();
    await expect(page.locator('.briefing')).toHaveCount(0);
    await expect(page.locator('.objectives-panel')).toHaveCount(0);
    await expect(page.locator('body > .mission-select')).toBeHidden();
    // Keep the default-Titanic guard at the point where Home actually starts a dive.
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get('mission') === 'titanic', {
        waitUntil: 'domcontentloaded',
      }),
      page
        .locator('.home-menu')
        .getByRole('button', { name: /^Dive(:|$)/ })
        .click(),
    ]);
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    expect(await page.evaluate(() => (window.__game as { meta: { id: string } }).meta.id)).toBe(
      'titanic',
    );
    await expect(page.locator('.briefing-begin')).toBeVisible();
    expect(errors, errors.join(' | ')).toEqual([]);
  });
});

test.describe('fix S: mission failure, framing and modals', () => {
  test('briefing traps Tab focus and Escape returns home without starting the dive', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await boot(page, '/?mission=titanic');
    const briefing = page.locator('.briefing');
    await expect(briefing).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('.briefing'))).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('.briefing'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(briefing).toBeHidden();
    expect((await missionProbe(page)).state).toBe('briefing');
    await expect(page.locator('.home-screen')).toBeVisible();
    await boot(page, '/?mission=titanic');
    await page.keyboard.press('Enter');
    await expect(briefing).toBeHidden();
    expect((await missionProbe(page)).state).toBe('diving');
    expect(errors, errors.join(' | ')).toEqual([]);
  });

  test('approaching a scan target does not move the chase camera', async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, '/?mission=titanic&poi=titanic-bow&skipBriefing=1');
    await page.waitForFunction(
      () =>
        (window.__game as { scanner: { view: { candidateId: string | null } } }).scanner.view
          .candidateId === 'titanic-bow',
      undefined,
      { timeout: 15_000 },
    );
    const offset = await page.evaluate(() => {
      const g = window.__game as {
        rig: { camera: { position: { x: number; y: number; z: number } } };
        sub: { position: { x: number; y: number; z: number }; yaw: number };
        config: { camera: { chaseOffset: { z: number } } };
      };
      return {
        x: g.rig.camera.position.x - g.sub.position.x,
        y: g.rig.camera.position.y - g.sub.position.y,
        z: g.rig.camera.position.z - g.sub.position.z,
        yaw: g.sub.yaw,
        chaseBack: g.config.camera.chaseOffset.z,
      };
    });
    expect(Math.hypot(offset.x, offset.y, offset.z)).toBeGreaterThan(90);
    expect(offset.x).toBeCloseTo(-offset.chaseBack * Math.sin(offset.yaw), 1);
    expect(offset.z).toBeCloseTo(offset.chaseBack * Math.cos(offset.yaw), 1);
    await expect(page.locator('.guidance-slot[data-kind="urgent"]')).toBeHidden();
    expect(errors, errors.join(' | ')).toEqual([]);
  });
});
