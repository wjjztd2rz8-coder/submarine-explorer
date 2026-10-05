import { scanWithKeyboard } from './helpers/scan.js';
import { expect, test, type Page } from './helpers/unlocked.js';

/**
 * B3 mission flow, end to end, on B2's real Titanic content:
 *  (a) `/?mission=titanic` shows the briefing with the game frozen; Enter
 *      starts the mission near the first primary objective with the objectives panel up.
 *  (b) `?poi=titanic-bow&skipBriefing=1`: scan the bow, teleport to the stern
 *      and scan it -> "Primary objectives complete" banner -> Surface and
 *      debrief -> `mission:complete` + `mission:ended` -> the mission debrief
 *      (D-FLOW: nothing ends the dive on its own).
 *  (c) the free-dive view keeps mission select off the HUD while deep links still work.
 * Also covers F2 (sonar canvas takes the tile aspect) and F3 (HUD help keys).
 *
 * State is read through `window.__game.{mission, missionRouter, discovery, scanner}`.
 */

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

async function holdScanUntil(page: Page, objectiveId: string): Promise<void> {
  await scanWithKeyboard(page);
  await page.waitForFunction(
    (id) =>
      (
        window.__game as { mission: { objectives: Array<{ id: string; complete: boolean }> } }
      ).mission.objectives.some((o) => o.id === id && o.complete),
    objectiveId,
    { timeout: 20_000 },
  );
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
    await expect(page.locator('.briefing-objectives li.is-primary')).toHaveCount(2);
    await expect(page.locator('.briefing-objectives li.is-secondary')).toHaveCount(2);
    await expect(page.locator('.briefing-section.is-hazards li')).not.toHaveCount(0);
    await expect(page.locator('.briefing-memorial')).toBeVisible();
    await expect(page.locator('.briefing-controls button')).toHaveText('View controls');
    await expect(page.locator('.briefing-begin')).toHaveText('Begin dive');
    await expect(page.locator('.objectives-panel')).toBeHidden();
    // The mission picker is collapsed out of the way during a mission.
    await expect(page.locator('body > .mission-select')).toHaveClass(/is-collapsed/);
    expect((await missionProbe(page)).state).toBe('briefing');
    await page.waitForTimeout(400);
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
    await expect(panel).toBeVisible();
    // D-FLOW: one compact line of progress; the full list is in the Esc menu.
    await expect(panel.locator('.obj-progress')).toHaveText('0 of 4 objectives · 0 of 2 primary');
    // Near-site start (D-START): the bow is close and dead ahead.
    await expect(panel.locator('.obj-nav-target')).toHaveText('→ BOW SECTION');
    const heading = await page.evaluate(
      () => ((window.__game as { sub: { yaw: number } }).sub.yaw * 180) / Math.PI,
    );
    const brg = Number(
      ((await panel.locator('.obj-nav-bearing').textContent()) ?? '').replace(/\D/g, ''),
    );
    const off = Math.abs(((brg - heading + 540) % 360) - 180);
    expect(off).toBeLessThan(15);
    // RNG is slant range: Arcade opens on a composed approach (tens of metres
    // from the set piece); the classic near-site offset is 350-600 m.
    await expect(panel.locator('.obj-nav-range')).toHaveText(/RNG (\d{2,3}) m/);
    const rng = Number(
      ((await panel.locator('.obj-nav-range').textContent()) ?? '').replace(/\D/g, ''),
    );
    expect(rng).toBeGreaterThanOrEqual(40);
    expect(rng).toBeLessThan(700);

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
    // F2: on the portrait Titanic tile the sonar canvas is portrait too (no letterbox).
    const sonar = await page.evaluate(() => {
      const c = document.querySelector('.sonar canvas') as HTMLCanvasElement;
      const t = (window.__game as { terrain: { widthM: number; depthM: number } }).terrain;
      return { w: c.clientWidth, h: c.clientHeight, aspect: t.widthM / t.depthM };
    });
    expect(sonar.h).toBe(220);
    expect(Math.abs(sonar.w / sonar.h - sonar.aspect)).toBeLessThan(0.01);

    expect(errors, errors.join(' | ')).toEqual([]);
  });

  test('scan bow and stern -> banner -> surface -> debrief', async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, '/?mission=titanic&poi=titanic-bow&skipBriefing=1');
    await expect(page.locator('.briefing')).toHaveCount(0);
    await page.waitForFunction(
      () => {
        const g = window.__game as {
          discovery: { spawnedAt: string | null };
          scanner: { view: { candidateId: string | null } };
        };
        return (
          g.discovery.spawnedAt === 'titanic-bow' && g.scanner.view.candidateId === 'titanic-bow'
        );
      },
      undefined,
      { timeout: 15_000 },
    );
    expect((await missionProbe(page)).state).toBe('diving');

    await holdScanUntil(page, 'find-bow');
    let m = await missionProbe(page);
    expect(m.state).toBe('diving');
    expect(m.objectives.find((o) => o.id === 'find-bow')?.complete).toBe(true);
    expect(m.emitted).toEqual(['mission:started', 'mission:objective']);
    const panel = page.locator('.objectives-panel');
    await expect(panel.locator('.obj-progress')).toHaveText('1 of 4 objectives · 1 of 2 primary');
    await expect(panel.locator('.obj-nav-target')).toHaveText('→ STERN SECTION');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/e2e/screenshots/mission-objectives.png' });

    // Teleport next to the stern, the same way B1's ?poi= spawn does.
    await page.evaluate(() => {
      const g = window.__game as {
        sub: {
          reset(x: number, y: number, z: number, yaw: number): void;
          position: unknown;
          yaw: number;
          pitch: number;
        };
        rig: { snap(p: unknown, yaw: number, pitch: number): void };
        discovery: {
          spawnPose(id: string): { x: number; y: number; z: number; yaw: number } | null;
          stats: { markTeleport(): void };
        };
      };
      const pose = g.discovery.spawnPose('titanic-stern');
      if (!pose) throw new Error('no stern POI');
      g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
      g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
      g.discovery.stats.markTeleport();
    });
    await page.waitForFunction(
      () =>
        (window.__game as { scanner: { view: { candidateId: string | null } } }).scanner.view
          .candidateId === 'titanic-stern',
      undefined,
      { timeout: 10_000 },
    );
    await holdScanUntil(page, 'find-stern');
    m = await missionProbe(page);
    expect(m.state).toBe('primaries-complete');
    expect(m.emitted.at(-1)).toBe('mission:primaryComplete');
    // The dive goes on: the next target is optional, and a banner offers the choice.
    await expect(panel.locator('.obj-nav-target')).toContainText('OPTIONAL →');
    const banner = panel.locator('.obj-banner');
    await expect(banner).toBeVisible({ timeout: 10_000 });
    const debrief = page.locator('.mission-debrief');
    await expect(debrief).toHaveCount(0);
    await banner.locator('button', { hasText: 'Surface and debrief' }).click();

    await expect(debrief).toBeVisible();
    m = await missionProbe(page);
    expect(m.state).toBe('debrief');
    expect(m.emitted.slice(-2)).toEqual(['mission:complete', 'mission:ended']);
    expect(m.durationS).toBeGreaterThan(3);
    await expect(debrief.locator('.debrief-title')).toHaveText('Mission complete');
    await expect(debrief.locator('.debrief-kicker')).toHaveText('TITANIC DIVE');
    await expect(debrief.locator('.debrief-btn')).toHaveText([
      'Dive sites',
      'Home',
      'Keep exploring',
      'Dive again',
      'Journal',
    ]);
    await expect(debrief.locator('.debrief-section.is-discoveries li')).toHaveText([
      'Bow section',
      'Stern section',
    ]);
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/e2e/screenshots/mission-debrief.png' });

    // "Dive again" announces a restart, then reloads the same URL.
    await page.evaluate(() => {
      const w = window as unknown as { __restart: unknown[] };
      w.__restart = [];
      (window.__game as { bus: { on(n: string, h: (p: unknown) => void): void } }).bus.on(
        'mission:restart',
        (p) => w.__restart.push(p),
      );
      window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('b3-restart', JSON.stringify(w.__restart));
      });
    });
    await Promise.all([
      page.waitForEvent('load'),
      debrief.locator('.debrief-btn', { hasText: 'Dive again' }).click(),
    ]);
    expect(page.url()).toContain('mission=titanic');
    expect(await page.evaluate(() => sessionStorage.getItem('b3-restart'))).toBe(
      JSON.stringify([{ missionId: 'titanic' }]),
    );

    expect(errors, errors.join(' | ')).toEqual([]);
  });

  test('the bare start page boots titanic without a docked mission picker', async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, '/');
    expect(await page.evaluate(() => (window.__game as { meta: { id: string } }).meta.id)).toBe(
      'titanic',
    );
    await expect(page.locator('.briefing')).toHaveCount(0);
    await expect(page.locator('.objectives-panel')).toHaveCount(0);
    await expect(page.locator('body > .mission-select')).toBeHidden();
    await page.goto('/?mission=titanic');
    await expect(page.locator('.briefing')).toBeVisible({ timeout: 45_000 });
    expect(errors, errors.join(' | ')).toEqual([]);
  });
});

test.describe('fix S: mission failure, framing and modals', () => {
  test('crush depth -> HULL FAILURE banner -> "Dive aborted" debrief -> Dive again', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await boot(page, '/?mission=titanic&skipBriefing=1');
    expect((await missionProbe(page)).state).toBe('diving');

    // QA-B #10: the mission clock uses unfrozen frame time, independent of
    // the eight-step physics cap. Time.tick clamps each frame to 250 ms;
    // accumulate the same observed frame deltas instead of sleeping for two
    // wall seconds, which can contain only a few frames on SwiftShader.
    const clockAdvance = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const mission = (window.__game as { mission: { elapsedS: number } }).mission;
          let last: number | undefined;
          let start = 0;
          let frameTime = 0;
          const sample = (now: number): void => {
            if (last === undefined) start = mission.elapsedS;
            else frameTime += Math.min(0.25, Math.max(0, (now - last) / 1000));
            last = now;
            if (frameTime >= 2) resolve(mission.elapsedS - start);
            else requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }),
    );
    expect(clockAdvance).toBeGreaterThan(1.6);
    expect(clockAdvance).toBeLessThan(2.6);

    // The Titanic seabed (~3,980 m) is inside the Class B rating, so fit the
    // 1,000 m coastal hull and put the boat just below it in open water.
    await page.evaluate(() => {
      const g = window.__game as {
        sub: {
          reset(x: number, y: number, z: number, yaw?: number): void;
          setHullClass(id: string): boolean;
          getCrushDepth(): number;
        };
        bus: { on(n: string, h: (p: unknown) => void): void };
      };
      const w = window as unknown as { __aborted: unknown[] };
      w.__aborted = [];
      g.bus.on('mission:aborted', (p) => w.__aborted.push(p));
      g.sub.setHullClass('A');
      g.sub.reset(0, g.sub.getCrushDepth() - 5, 0, 0);
    });
    const alert = page.locator('.objectives-panel .obj-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText('HULL FAILURE — EMERGENCY ASCENT');

    const debrief = page.locator('.mission-debrief');
    // The blow lock lasts five simulated seconds, which takes much longer
    // on a software renderer. Wait for the router to observe its completion;
    // keep the UI, event, hull-depth and frozen-state assertions below.
    await expect
      .poll(async () => (await missionProbe(page)).state, { timeout: 120_000 })
      .toBe('debrief');
    await expect(debrief).toBeVisible();
    await expect(alert).toBeHidden();
    await expect(debrief).toHaveClass(/is-aborted/);
    await expect(debrief.locator('.debrief-title')).toHaveText('Dive aborted');
    await expect(debrief.locator('.debrief-subtitle')).toContainText('Hull failure at');
    // No Keep exploring after an abort: the dive is over.
    await expect(debrief.locator('.debrief-btn')).toHaveText([
      'Dive sites',
      'Home',
      'Dive again',
      'Journal',
    ]);
    const m = await missionProbe(page);
    expect(m.state).toBe('debrief');
    expect(m.emitted).toEqual(['mission:started', 'mission:aborted', 'mission:ended']);
    expect(
      await page.evaluate(() => (window as unknown as { __aborted: unknown[] }).__aborted),
    ).toEqual([{ missionId: 'titanic', reason: 'crush' }]);
    // The boat is back above its rating and the controls are its own again.
    const st = await page.evaluate(() => {
      const g = window.__game as {
        sub: { getState(): { depth: number; emergencyBlow: boolean }; getCrushDepth(): number };
        missionRouter: { frozen: boolean };
      };
      return { ...g.sub.getState(), crush: g.sub.getCrushDepth(), frozen: g.missionRouter.frozen };
    });
    expect(st.depth).toBeGreaterThan(st.crush);
    expect(st.emergencyBlow).toBe(false);
    expect(st.frozen).toBe(true); // nothing simulates under the aborted debrief

    // Escape does not dismiss the decision; Tab stays inside the card (QA-B #12).
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(debrief).toBeVisible();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('.mission-debrief'))).toBe(
        true,
      );
    }
    await page.screenshot({ path: 'tests/e2e/screenshots/fix-s-aborted-debrief.png' });

    await page.evaluate(() => {
      const w = window as unknown as { __restart: unknown[] };
      w.__restart = [];
      (window.__game as { bus: { on(n: string, h: (p: unknown) => void): void } }).bus.on(
        'mission:restart',
        (p) => w.__restart.push(p),
      );
      window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('fixs-restart', JSON.stringify(w.__restart));
      });
    });
    await Promise.all([
      page.waitForEvent('load'),
      debrief.locator('.debrief-btn', { hasText: 'Dive again' }).click(),
    ]);
    expect(page.url()).toContain('mission=titanic');
    expect(await page.evaluate(() => sessionStorage.getItem('fixs-restart'))).toBe(
      JSON.stringify([{ missionId: 'titanic' }]),
    );
    expect(errors, errors.join(' | ')).toEqual([]);
  });

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
    await page.waitForTimeout(300);
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
    await expect(page.locator('.hud-warning')).toBeHidden();
    expect(errors, errors.join(' | ')).toEqual([]);
  });
});
