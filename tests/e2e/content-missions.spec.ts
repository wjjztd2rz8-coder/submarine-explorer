import { expect, test, type Page } from './helpers/unlocked.js';

/**
 * Retained Phase C smoke: each shipped pack completes through real scans.
 * D-FLOW: primary scans -> "Primary objectives complete" banner -> the
 * player surfaces voluntarily -> debrief.
 */
type Objective = { id: string; poi: string; primary: boolean; title: string; hint: string };
type MissionDoc = { landmark: string; objectives: Objective[] };
const missionIds = [
  'titanic',
  'challenger-deep',
  'lost-city',
  'monterey-canyon',
  'endurance',
  'axial-seamount-ashes',
  'hudson-canyon',
  'kamaehuakanaloa',
  'beebe-vent-field',
  'great-blue-hole',
  'bismarck',
  'hunga-tonga-caldera',
  'blake-plateau-corals',
];

async function teleportToPoi(page: Page, poiId: string): Promise<void> {
  const poses = await page.evaluate((id) => {
    const g = window.__game as {
      sub: {
        config: {
          hullRadius: number;
          seabedClearance: number;
          maxPitch: number;
        };
      };
      terrain: { sampleHeight(x: number, z: number): number };
      scanner: {
        getTargets(): readonly {
          id: string;
          position: { x: number; y: number; z: number };
          radius: number;
        }[];
      };
      discovery: {
        spawnPose(id: string): { x: number; y: number; z: number; yaw: number } | null;
      };
    };
    const pose = g.discovery.spawnPose(id);
    if (!pose) throw new Error(`No spawn pose for ${id}`);
    const target = g.scanner.getTargets().find((t) => t.id === id);
    if (!target) throw new Error(`No scan target for ${id}`);
    const clearance = g.sub.config.hullRadius + g.sub.config.seabedClearance + 16;
    const candidates = [pose];
    // The URL debug spawn uses one fixed bearing. On slopes it can require
    // pitching down, and close POIs can make a neighbour the nearer target.
    for (const fraction of [0.3, 0.5, 0.7]) {
      for (let bearing = 0; bearing < 360; bearing += 45) {
        const angle = (bearing * Math.PI) / 180;
        const x = target.position.x + Math.sin(angle) * target.radius * fraction;
        const z = target.position.z - Math.cos(angle) * target.radius * fraction;
        const y = Math.max(target.position.y, g.terrain.sampleHeight(x, z) + clearance);
        const yaw = Math.atan2(target.position.x - x, -(target.position.z - z));
        candidates.push({ x, y, z, yaw });
      }
    }
    return candidates.map((candidate) => {
      const horizontal = Math.hypot(
        target.position.x - candidate.x,
        target.position.z - candidate.z,
      );
      const pitch = Math.max(
        -g.sub.config.maxPitch,
        Math.min(g.sub.config.maxPitch, Math.atan2(target.position.y - candidate.y, horizontal)),
      );
      return { ...candidate, pitch };
    });
  }, poiId);
  const observed: string[] = [];
  for (const pose of poses) {
    const candidate = await page.evaluate(async (p) => {
      const g = window.__game as {
        sub: {
          reset(x: number, y: number, z: number, yaw: number): void;
          position: unknown;
          yaw: number;
          pitch: number;
        };
        rig: { snap(p: unknown, yaw: number, pitch: number): void };
        discovery: { stats: { markTeleport(): void } };
        scanner: { view: { candidateId: string | null } };
      };
      g.sub.reset(p.x, p.y, p.z, p.yaw);
      g.sub.pitch = p.pitch;
      g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
      g.discovery.stats.markTeleport();
      // Discovery updates the scanner once per rendered frame. A 600 ms
      // wait can expire before even one software-rendered frame on CI; observe
      // two frames so this pose has been processed before choosing another.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return g.scanner.view.candidateId;
    }, pose);
    if (candidate === poiId) return;
    observed.push(candidate ?? 'none');
  }
  throw new Error(`${poiId}: no scannable pose; competing candidates: ${observed.join(', ')}`);
}

test('smoke cases match the shipped catalog', async ({ request }) => {
  const response = await request.get('/data/landmarks/index.json');
  expect(response.ok()).toBe(true);
  const catalog = (await response.json()) as { landmarks: string[] };
  expect(missionIds).toEqual(catalog.landmarks);
});

for (const id of missionIds) {
  test(`${id}: briefing to primary scans to debrief`, async ({ page }, testInfo) => {
    // Keep the local mission budget while respecting the configured CI budget.
    test.setTimeout(Math.max(120_000, testInfo.timeout));
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    const response = await page.request.get(`/data/landmarks/${id}/mission.json`);
    expect(response.ok(), `${id}: mission.json served`).toBe(true);
    const doc = (await response.json()) as MissionDoc;
    expect(doc.landmark).toBe(id);
    const primary = doc.objectives.filter((o) => o.primary);
    expect(primary.length).toBeGreaterThanOrEqual(2);

    await page.goto(`/?mission=${id}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(() => window.__gameReady === true, undefined, {
      timeout: 45_000,
    });
    await page.waitForFunction(
      () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded,
      undefined,
      { timeout: 20_000 },
    );
    await expect(page.locator('.briefing')).toBeVisible();
    await expect(page.locator('.briefing-objectives li.is-primary')).toHaveCount(primary.length);
    await expect(page.locator('.briefing-objectives li.is-primary .briefing-obj-title')).toHaveText(
      primary.map((objective) => objective.title),
    );
    await page.locator('.briefing-begin').click();
    await expect(page.locator('.objectives-panel')).toBeVisible();

    for (const objective of primary) {
      await teleportToPoi(page, objective.poi);
      // Navigation picks the nearest incomplete primary; the scan candidate
      // also depends on facing and range, so it can be a different objective.
      await expect
        .poll(async () => {
          const title = await page.locator('.obj-item.is-current .obj-item-title').textContent();
          const current = doc.objectives.find((o) => o.title === title);
          return !!current && (await page.locator('.obj-hint').textContent()) === current.hint;
        })
        .toBe(true);
      const before = await page.evaluate(
        () =>
          (window.__game as { scanner: { view: { completed: number } } }).scanner.view.completed,
      );
      await page.keyboard.down('g');
      try {
        await page.waitForFunction(
          (objectiveId) =>
            (
              window.__game as {
                mission: { objectives: Array<{ id: string; complete: boolean }> };
              }
            ).mission.objectives.some((o) => o.id === objectiveId && o.complete),
          objective.id,
          { timeout: 30_000 },
        );
      } finally {
        await page.keyboard.up('g');
      }
      const completed = await page.evaluate(
        () =>
          (window.__game as { scanner: { view: { completed: number } } }).scanner.view.completed,
      );
      expect(completed, `${id}: ${objective.id} should complete through a scan`).toBeGreaterThan(
        before,
      );
    }
    await expect(page.locator('.obj-progress')).toHaveText(/primaries done|all complete/);

    // Nothing ends the dive on its own: the banner offers the choice.
    const banner = page.locator('.obj-banner');
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner.locator('.obj-banner-title')).toHaveText(/objectives complete$/);
    await expect(page.locator('.mission-debrief')).toHaveCount(0);
    await banner.locator('button', { hasText: 'Surface and debrief' }).click();
    await expect(page.locator('.mission-debrief')).toBeVisible();
    await expect(page.locator('.mission-debrief .debrief-title')).toHaveText('Mission complete');
    const state = await page.evaluate(
      () => (window.__game as { mission: { state: string } }).mission.state,
    );
    expect(state).toBe('debrief');
    expect(errors, errors.join(' | ')).toEqual([]);
  });
}
