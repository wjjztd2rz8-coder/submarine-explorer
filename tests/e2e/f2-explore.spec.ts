import { curiosityData, siteIds } from '../content.js';
import type { EventContact, AnchoredEvents } from '../../src/game/Events.js';
import { EXPLORE_CONFIG } from '../../src/core/config/explore.js';
import { completeScan, scanWithKeyboard } from './helpers/scan.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { reviewShot } from './helpers/render.js';
import { devices, expect, test, type Page } from './helpers/unlocked.js';

interface Target {
  id: string;
  position: { x: number; y: number; z: number };
  def: { id: string; name: string };
}
interface Game {
  explore: {
    ready: boolean;
    secrets: Target[];
    sampleTargets: Target[];
    faintContacts: Target[];
    samples: { collected: Map<string, string> };
    events: AnchoredEvents;
    eventContacts: EventContact[];
    summary(): { found: number; total: number; samples: string[]; events: string[] };
  };
  sub: {
    position: { x: number; y: number; z: number };
    yaw: number;
    pitch: number;
    reset(x: number, y: number, z: number, yaw: number): void;
  };
  terrain: { sampleHeight(x: number, z: number): number };
  rig: {
    snap(p: unknown, yaw: number, pitch: number): void;
    freeLook: boolean;
    lookAzimuth: number;
    lookElevation: number;
    chaseRadius: number;
  };
  scanner: {
    view: { candidateId: string | null; lastCompleteId: string | null; nearestName: string };
    getTargets(): Target[];
  };
  discoveries: { isDiscovered(site: string, id: string): boolean };
  mission: { objectives: unknown[] };
  missionRouter: { endDive(): boolean };
  bus: {
    on(name: string, handler: (e: unknown) => void): void;
    emit(name: string, value: unknown): void;
  };
  progress: { points: number };
  journal: {
    load(): Promise<void>;
    open(id?: string): void;
    show(id: string): void;
    close(): void;
  };
}
async function boot(page: Page, site = 'monterey-canyon', mission = false): Promise<void> {
  await page.goto(`/?${mission ? 'mission' : 'tile'}=${site}&skipBriefing=1&tier=low&life=0`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(
    () => window.__gameReady === true && (window.__game as unknown as Game).explore?.ready,
    undefined,
    { timeout: 60_000 },
  );
}
async function park(page: Page, index: number, sample = false, distant = false): Promise<string> {
  return page.evaluate(
    ({ index, sample, distant }) => {
      const g = window.__game as unknown as Game;
      const target = (sample ? g.explore.sampleTargets : g.explore.secrets)[index];
      const p = target.position;
      const z = p.z + (distant ? 160 : sample ? 10 : 18);
      const y = Math.max(p.y + 10, g.terrain.sampleHeight(p.x, z) + 13);
      g.sub.reset(p.x, y, z, 0);
      // Inspect the actual prop from above and to the side; orbitRadius only
      // affects photo mode, and straight chase framing hides it behind the hull.
      g.rig.freeLook = true;
      g.rig.lookAzimuth = 1.35;
      g.rig.lookElevation = 0.55;
      g.rig.chaseRadius = 52;
      g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
      return target.id;
    },
    { index, sample, distant },
  );
}
async function scan(page: Page, id: string): Promise<void> {
  await page.waitForFunction(
    (id) => (window.__game as unknown as Game).scanner.view.candidateId === id,
    id,
  );
  await scanWithKeyboard(page, id);
}
async function shot(page: Page, name: string): Promise<void> {
  await reviewShot(page, name);
}

test('three hidden discoveries: close sonar, reveal, Journal, persistent count and rewards', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const { secrets, samples } = curiosityData('monterey-canyon');
  await boot(page);
  const objectives = await page.evaluate(() =>
    (window.__game as unknown as Game).scanner.getTargets().map((t) => t.id),
  );
  const initial = await page.evaluate(() => (window.__game as unknown as Game).progress.points);
  for (let i = 0; i < secrets.length; i++) {
    const id = await park(page, i, false, true);
    await page.waitForTimeout(150);
    expect(
      await page.evaluate(
        (id) => (window.__game as unknown as Game).explore.faintContacts.some((t) => t.id === id),
        id,
      ),
    ).toBe(false);
    await park(page, i);
    await page.waitForFunction(
      (id) => (window.__game as unknown as Game).explore.faintContacts.some((t) => t.id === id),
      id,
    );
    await expect(page.locator('.sonar canvas')).toHaveAttribute(
      'aria-label',
      /faint unidentified contact/,
    );
    await expect(page.locator('.guidance-name')).toHaveText('Unidentified contact');
    await scan(page, id);
    const name = await page.evaluate(
      (i) => (window.__game as unknown as Game).explore.secrets[i].def.name,
      i,
    );
    await expect(page.locator('.guidance-name')).toHaveText(name);
    await shot(page, `secret-${i + 1}`);
  }
  expect(
    await page.evaluate(() =>
      (window.__game as unknown as Game).scanner.getTargets().map((t) => t.id),
    ),
  ).toEqual(objectives);
  expect(await page.evaluate(() => (window.__game as unknown as Game).progress.points)).toBe(
    initial,
  );
  await page.evaluate(async () => {
    const g = window.__game as unknown as Game;
    await g.journal.load();
    g.journal.open();
    g.journal.show('monterey-canyon');
  });
  await expect(page.locator('.jr-progress')).toContainText(
    `${secrets.length}/${secrets.length + samples.length} secrets`,
  );
  await page
    .locator('.jr-nav')
    .getByRole('button', { name: 'Lost instrument frame', exact: true })
    .click();
  await expect(page.locator('.jr-title')).toHaveText('Lost instrument frame');
  await expect(page.locator('.jr-title-row .jr-tag')).toHaveText('Game addition');
  await shot(page, 'journal-secret');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__gameReady && (window.__game as unknown as Game).explore.ready,
  );
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.summary().found),
  ).toBe(secrets.length);
  expect(errors).toEqual([]);
});

test('samples collect per dive, appear in mission debrief, and reset on restart', async ({
  page,
}) => {
  // Free-dive coaching names a ready sample; mission coaching retains its primary.
  await boot(page);
  await park(page, 0, true);
  await expect(page.locator('.guidance-hint')).toContainText('TO SCAN');
  await boot(page, 'monterey-canyon', true);
  const id = await park(page, 0, true);
  const primary = await page.evaluate(() => {
    const g = window.__game as unknown as {
      discovery: import('../../src/game/Discovery.js').Discovery;
      missionRouter: import('../../src/game/MissionRouter.js').MissionRouter;
    };
    const objective = g.missionRouter.mission.objectives.find((o) => o.primary && !o.complete)!;
    return g.discovery.pois.find((p) => p.id === objective.poiId)!.name;
  });
  await expect(page.locator('.guidance-name')).toHaveText(primary);
  await scan(page, id);
  await expect(page.locator('.guidance-name')).toHaveText('Sediment core');
  // Regression: a sample must have a persistent Journal entry, beyond its dive-local collection.
  await page.keyboard.press('j');
  await expect(page.locator('.journal .jr-body .jr-title')).toHaveText('Sediment core');
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.samples.collected.size),
  ).toBe(1);
  await page.evaluate(() => (window.__game as unknown as Game).missionRouter.endDive());
  // Supplemental scans now share the debrief's scan count and latest-scan highlight.
  await expect(page.locator('.mission-debrief .debrief-highlight.is-discoveries')).toContainText(
    'Sediment core',
  );
  await expect(
    page.locator('.mission-debrief [data-field="discoveries"] .debrief-value'),
  ).toHaveText('1');
  await expect(page.locator('.mission-debrief .is-secrets')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.summary().found),
  ).toBe(0);
  await shot(page, 'sample-debrief');
  const more = page.locator('.mission-debrief .debrief-more-toggle');
  if (await more.count()) await more.click();
  await page.getByRole('button', { name: 'Dive again', exact: true }).click();
  await page.waitForFunction(
    () => window.__gameReady && (window.__game as unknown as Game).explore?.ready,
  );
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.samples.collected.size),
  ).toBe(0);
  await scan(page, await park(page, 0, true));
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.samples.collected.size),
  ).toBe(1);
});

test('short event caption, one witness log, pause and no repeat while inside', async ({ page }) => {
  await pauseClockBeforeNavigation(page);
  await page.goto('/?tile=monterey-canyon&tier=low&life=0');
  await clockFramesUntil(
    page,
    () => window.__gameReady === true && (window.__game as unknown as Game).explore?.ready,
  );
  // Guards automatic arrival triggering and prevents scan completion from substituting for witnessing.
  const points = await page.evaluate(() => {
    const g = window.__game as unknown as Game;
    const target = g.explore.eventContacts.find((c) => c.kind === 'turbidity')!;
    const p = target.position.clone();
    p.z -= 35;
    p.y = Math.max(p.y + 6, g.terrain.sampleHeight(p.x, p.z) + 15);
    g.sub.reset(p.x, p.y, p.z, Math.PI);
    g.rig.freeLook = false;
    g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
    return g.progress.points;
  });
  await page.clock.fastForward(100);
  await expect(page.locator('.guidance-slot[data-kind="discovery"]')).toContainText(
    'Silt cloud: sediment-laden water flows downslope',
  );
  await clockFramesUntil(
    page,
    () => (window.__game as unknown as Game).explore.summary().events.length === 1,
    100,
  );
  await shot(page, 'event-turbidity');
  expect(await page.evaluate(() => (window.__game as unknown as Game).progress.points)).toBe(
    points,
  );
  await page.keyboard.press('Escape');
  await page.clock.fastForward(100);
  await expect(page.locator('.guidance-slot[data-kind="discovery"]')).toBeHidden();
  const paused = await page.evaluate(
    () => (window.__game as unknown as Game).explore.events.active,
  );
  for (let i = 0; i < 5; i++) await page.clock.fastForward(100);
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.events.active),
  ).toEqual(paused);
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.events.active),
  ).not.toBeNull();
  await page.keyboard.press('Escape');
  // The engine caps a frame at 250 ms; wall time cannot stand in for dive time.
  for (let i = 0; i < EXPLORE_CONFIG.eventDurationS * 4; i++) await page.clock.fastForward(250);
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.events.active),
  ).toBeNull();
  for (let i = 0; i < 6; i++) await page.clock.fastForward(250);
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.events.active),
  ).toBeNull();
});

/** Read the actual layout: a result must stay on screen and clear thumb targets. */
async function expectScanPanelFits(page: Page): Promise<void> {
  const panel = await page.locator('.guidance-slot').boundingBox();
  expect(panel).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.y).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(viewport.width);
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(viewport.height);
  for (const selector of ['.tc-stick', '.tc-slider', '.tc-btn-scan']) {
    const control = (await page.locator(selector).boundingBox())!;
    const overlaps =
      panel!.x < control.x + control.width &&
      panel!.x + panel!.width > control.x &&
      panel!.y < control.y + control.height &&
      panel!.y + panel!.height > control.y;
    expect(overlaps, `Scan result overlaps ${selector}`).toBe(false);
  }
}

const { defaultBrowserType: _phone, ...phone } = devices['iPhone 13 landscape'];
test.describe('phone curiosity', () => {
  test.use({ ...phone });
  test('the existing touch Scan collects a sample with a 44 px target', async ({ page }) => {
    await boot(page);
    const id = await park(page, 1, true);
    const button = page.locator('.tc-btn-scan');
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2, id: 1 }],
    });
    await completeScan(page, id);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('.guidance-slot[data-kind="discovery"]')).toContainText(
      'New Journal entry',
    );
    await expectScanPanelFits(page);
    await shot(page, 'phone-sample');
    // The same touch session can rotate or run on a smaller phone.
    for (const [name, width, height] of [
      ['phone-small-sample', 568, 320],
      ['phone-portrait-sample', 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expectScanPanelFits(page);
      await shot(page, name);
    }
    expect(
      await page.evaluate(() => (window.__game as unknown as Game).explore.samples.collected.size),
    ).toBe(1);
  });
});

for (const site of siteIds) {
  test(`curiosity content loads and sits on the seabed at ${site}`, async ({ page }) => {
    await boot(page, site);
    const stats = await page.evaluate(() => {
      const g = window.__game as unknown as Game;
      return {
        secrets: g.explore.secrets.length,
        samples: g.explore.sampleTargets.length,
        depths: g.explore.secrets.map((t) => ({
          depth: -t.position.y,
          lift: t.position.y - g.terrain.sampleHeight(t.position.x, t.position.z),
        })),
      };
    });
    const declared = curiosityData(site);
    expect(stats.secrets).toBe(declared.secrets.length);
    expect(stats.samples).toBe(declared.samples.length);
    for (const d of stats.depths) {
      expect(d.depth).toBeGreaterThan(10);
      expect(d.lift).toBeCloseTo(2);
    }
  });
}
