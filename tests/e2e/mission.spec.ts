import { expect, test, type Page } from '@playwright/test';

/**
 * B3 mission flow, end to end, on B2's real Titanic content:
 *  (a) `/?mission=titanic` shows the briefing with the game frozen; Enter
 *      starts the mission at the surface with the objectives panel up.
 *  (b) `?poi=titanic-bow&skipBriefing=1`: scan the bow, teleport to the stern
 *      and scan it -> `mission:complete` -> the mission debrief.
 *  (c) the free-dive start page lists the mission above DIVE SITES.
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
  await page.keyboard.down('g');
  await page.waitForFunction(
    (id) =>
      (
        (
          window.__game as { mission: { objectives: Array<{ id: string; complete: boolean }> } }
        ).mission.objectives.find((o) => o.id === id) ?? { complete: false }
      ).complete,
    objectiveId,
    { timeout: 20_000 },
  );
  await page.keyboard.up('g');
}

test.describe('B3 mission flow', () => {
  test('briefing freezes the game; Enter starts a surface dive with objectives', async ({
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
    await expect(page.locator('.briefing-controls')).toContainText('scan (hold)');
    await expect(page.locator('.briefing-begin')).toHaveText('Begin dive');
    await expect(page.locator('.objectives-panel')).toBeHidden();
    // The mission picker is collapsed out of the way during a mission.
    await expect(page.locator('.mission-select')).toHaveClass(/is-collapsed/);
    expect((await missionProbe(page)).state).toBe('briefing');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'tests/e2e/screenshots/mission-briefing.png' });

    // Frozen: holding thrust + flood does nothing while the card is up.
    const before = await subPos(page);
    await page.keyboard.down('w');
    await page.keyboard.down('Shift');
    await page.waitForTimeout(800);
    await page.keyboard.up('Shift');
    await page.keyboard.up('w');
    const during = await subPos(page);
    expect(Math.hypot(during.x - before.x, during.y - before.y, during.z - before.z)).toBeLessThan(
      0.01,
    );

    await page.keyboard.press('Enter');
    await expect(briefing).toBeHidden();
    const started = await missionProbe(page);
    expect(started.state).toBe('running');
    expect(started.emitted).toEqual(['mission:started']);
    const payload = await page.evaluate(
      () =>
        (window.__game as { mission: { emitted: Array<{ payload: unknown }> } }).mission.emitted[0]
          ?.payload,
    );
    expect(payload).toEqual({ missionId: 'titanic', tileId: 'titanic' });

    // Surface start: the HUD depth is shallow.
    const depthText = (await page.locator('.hud-value[data-field="depth"]').textContent()) ?? '';
    expect(Number.parseFloat(depthText)).toBeLessThan(20);

    const panel = page.locator('.objectives-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.obj-item[data-primary="true"]')).toHaveCount(2);
    await expect(panel.locator('.obj-item[data-primary="false"]')).toHaveCount(2);
    await expect(panel.locator('.obj-item.is-complete')).toHaveCount(0);
    await expect(panel.locator('.obj-speed')).toHaveText('SIM 3×');
    // Bearing to the bow from the NNW start is about the briefed 150 deg.
    await expect(panel.locator('.obj-nav-target')).toHaveText('→ BOW SECTION');
    const brg = Number(
      ((await panel.locator('.obj-nav-bearing').textContent()) ?? '').replace(/\D/g, ''),
    );
    expect(Math.abs(brg - 150)).toBeLessThan(15);
    // RNG is the 3D slant range (QA-B #11): ~2 km across and 3.8 km down.
    await expect(panel.locator('.obj-nav-range')).toHaveText(/RNG 4\.\d\d km/);

    // Now it simulates: flooding the tanks takes the boat down.
    const y0 = (await subPos(page)).y;
    await page.keyboard.down('Shift');
    await page.waitForTimeout(1500);
    await page.keyboard.up('Shift');
    expect((await subPos(page)).y).toBeLessThan(y0 - 1);
    // T cycles the sim speed and the panel follows.
    await page.keyboard.press('t');
    await expect(panel.locator('.obj-speed')).toHaveText('SIM 1×');

    // F3: the help panel lists the systems keys.
    const help = (await page.locator('.hud-help').textContent()) ?? '';
    for (const k of ['L lights', 'G scan (hold)', 'J guide', 'Q ping', 'T sim speed', 'P photo']) {
      expect(help.replace(/\s+/g, ' ')).toContain(k);
    }
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

  test('scan bow and stern -> mission:complete -> debrief', async ({ page }) => {
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
    expect((await missionProbe(page)).state).toBe('running');

    await holdScanUntil(page, 'find-bow');
    let m = await missionProbe(page);
    expect(m.state).toBe('running');
    expect(m.objectives.find((o) => o.id === 'find-bow')?.complete).toBe(true);
    expect(m.emitted).toEqual(['mission:started', 'mission:objective']);
    const panel = page.locator('.objectives-panel');
    await expect(panel.locator('.obj-item.is-complete')).toHaveCount(1);
    await expect(panel.locator('.obj-item[data-objective="find-bow"] .obj-box')).toHaveText('☑');
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
    expect(['completing', 'complete']).toContain(m.state);

    const debrief = page.locator('.mission-debrief');
    await expect(debrief).toBeVisible({ timeout: 10_000 });
    m = await missionProbe(page);
    expect(m.state).toBe('complete');
    expect(m.emitted.at(-1)).toBe('mission:complete');
    expect(m.durationS).toBeGreaterThan(3);
    await expect(debrief.locator('.debrief-title')).toHaveText('Mission complete');
    await expect(debrief.locator('.debrief-kicker')).toHaveText('TITANIC DIVE');
    await expect(debrief.locator('.debrief-btn')).toHaveText([
      'Dive again',
      'Field guide',
      'Dive sites',
    ]);
    await expect(debrief.locator('.debrief-section.is-discoveries li')).toHaveText([
      'Bow section',
      'Stern section',
    ]);
    await expect(panel.locator('.obj-nav-target')).toContainText('PRIMARY DONE');
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

  test('the bare start page boots titanic and lists the mission above the dive sites', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    // A bare URL boots Config.defaultTileId (titanic), not the alphabetically first tile.
    await boot(page, '/');
    expect(await page.evaluate(() => (window.__game as { meta: { id: string } }).meta.id)).toBe(
      'titanic',
    );
    await expect(page.locator('.briefing')).toHaveCount(0);
    await expect(page.locator('.objectives-panel')).toHaveCount(0);
    const select = page.locator('.mission-select');
    await expect(select).not.toHaveClass(/is-collapsed/);
    const item = select.locator('.mission-item.is-mission[data-mission="titanic"]');
    await expect(item).toBeVisible();
    await expect(item.locator('.mission-item-name')).toHaveText('Titanic dive');
    await expect(item.locator('.mission-badge')).toHaveText('TILE AVAILABLE');
    await expect(select.locator('.mission-title')).toHaveText(['MISSIONS', 'DIVE SITES']);
    await page.screenshot({ path: 'tests/e2e/screenshots/mission-select.png' });
    await Promise.all([page.waitForURL(/\?mission=titanic$/), item.click()]);
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
    expect((await missionProbe(page)).state).toBe('running');

    // QA-B #10: the mission clock counts real seconds, not capped physics time.
    const t0 = await page.evaluate(
      () => (window.__game as { mission: { elapsedS: number } }).mission.elapsedS,
    );
    await page.waitForTimeout(2000);
    const t1 = await page.evaluate(
      () => (window.__game as { mission: { elapsedS: number } }).mission.elapsedS,
    );
    expect(t1 - t0).toBeGreaterThan(1.6);
    expect(t1 - t0).toBeLessThan(2.6);

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
    await expect(alert).toBeVisible({ timeout: 5_000 });
    await expect(alert).toHaveText('HULL FAILURE — EMERGENCY ASCENT');

    const debrief = page.locator('.mission-debrief');
    await expect(debrief).toBeVisible({ timeout: 20_000 });
    await expect(alert).toBeHidden();
    await expect(debrief).toHaveClass(/is-aborted/);
    await expect(debrief.locator('.debrief-title')).toHaveText('Dive aborted');
    await expect(debrief.locator('.debrief-subtitle')).toContainText('Hull failure at');
    await expect(debrief.locator('.debrief-btn')).toHaveText(['Dive again', 'Dive sites']);
    const m = await missionProbe(page);
    expect(m.state).toBe('aborted');
    expect(m.emitted).toEqual(['mission:started', 'mission:aborted']);
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

  test('briefing traps Tab focus and ignores Escape', async ({ page }) => {
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
    await expect(briefing).toBeVisible();
    expect((await missionProbe(page)).state).toBe('briefing');
    await page.keyboard.press('Enter');
    await expect(briefing).toBeHidden();
    expect((await missionProbe(page)).state).toBe('running');
    expect(errors, errors.join(' | ')).toEqual([]);
  });

  test('at the bow the chase camera frames the wreck clear of the hull', async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, '/?mission=titanic&poi=titanic-bow&skipBriefing=1');
    await page.waitForFunction(
      () =>
        (window.__game as { scanner: { view: { candidateId: string | null } } }).scanner.view
          .candidateId === 'titanic-bow',
      undefined,
      { timeout: 15_000 },
    );
    await page.waitForFunction(
      () => (window.__game as { rig: { focusWeight: number } }).rig.focusWeight > 0.95,
      undefined,
      { timeout: 10_000 },
    );
    const clear = await page.evaluate(() => {
      const g = window.__game as {
        rig: { camera: { position: { x: number; y: number; z: number } } };
        sub: { position: { x: number; y: number; z: number } };
        discovery: { pois: Array<{ id: string; position: { x: number; y: number; z: number } }> };
      };
      const a = g.rig.camera.position;
      const b = g.discovery.pois.find((p) => p.id === 'titanic-bow')!.position;
      const p = g.sub.position;
      const ab = [b.x - a.x, b.y - a.y, b.z - a.z];
      const ap = [p.x - a.x, p.y - a.y, p.z - a.z];
      const l2 = ab[0]! ** 2 + ab[1]! ** 2 + ab[2]! ** 2;
      const t = Math.max(
        0,
        Math.min(1, (ap[0]! * ab[0]! + ap[1]! * ab[1]! + ap[2]! * ab[2]!) / l2),
      );
      return Math.hypot(ap[0]! - t * ab[0]!, ap[1]! - t * ab[1]!, ap[2]! - t * ab[2]!);
    });
    // Metres between the boat and the camera->bow sight line.
    expect(clear).toBeGreaterThan(12);
    // QA-B #14: no SEABED PROXIMITY banner over the wreck inspection.
    await expect(page.locator('.hud-warning')).toBeHidden();
    // QA-B #11: one range metric -- the nav line's RNG is the scan panel's 3D range.
    await page.waitForTimeout(600);
    const ranges = await page.evaluate(() => ({
      nav: document.querySelector('.obj-nav-range')?.textContent ?? '',
      scan: (window.__game as { scanner: { view: { nearestDistance: number } } }).scanner.view
        .nearestDistance,
    }));
    expect(ranges.nav).toMatch(/^RNG \d+ m$/);
    expect(Math.abs(Number.parseFloat(ranges.nav.slice(4)) - ranges.scan)).toBeLessThan(4);
    await page.screenshot({ path: 'tests/e2e/screenshots/fix-s-bow-offset.png' });
    expect(errors, errors.join(' | ')).toEqual([]);
  });
});
