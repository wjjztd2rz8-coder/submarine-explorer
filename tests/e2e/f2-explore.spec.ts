import { completeScan, scanWithKeyboard } from './helpers/scan.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { devices, expect, test, type Page } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/f2-explore';
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
    scheduler: { active: unknown };
    previewEvent(kind: string): boolean;
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
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png` });
}

test('three hidden discoveries: close sonar, reveal, Journal, persistent count and rewards', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await boot(page);
  const objectives = await page.evaluate(() =>
    (window.__game as unknown as Game).scanner.getTargets().map((t) => t.id),
  );
  const initial = await page.evaluate(() => (window.__game as unknown as Game).progress.points);
  for (let i = 0; i < 3; i++) {
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
    await expect(page.locator('.scan-name')).toHaveText('Unidentified contact');
    await scan(page, id);
    const name = await page.evaluate(
      (i) => (window.__game as unknown as Game).explore.secrets[i].def.name,
      i,
    );
    await expect(page.locator('.scan-name')).toHaveText(name);
    await shot(page, `secret-${i + 1}`);
  }
  expect(
    await page.evaluate(() =>
      (window.__game as unknown as Game).scanner.getTargets().map((t) => t.id),
    ),
  ).toEqual(objectives);
  expect(await page.evaluate(() => (window.__game as unknown as Game).progress.points)).toBe(
    initial + 45,
  );
  await page.evaluate(async () => {
    const g = window.__game as unknown as Game;
    await g.journal.load();
    g.journal.open();
    g.journal.show('monterey-canyon');
  });
  await expect(page.locator('.jr-progress')).toContainText('Secrets found 3/3');
  await page.getByRole('button', { name: 'Lost instrument frame', exact: true }).click();
  await expect(page.locator('.jr-title')).toHaveText('Lost instrument frame');
  await expect(page.locator('.jr-title-row .jr-tag')).toHaveText('Game addition');
  await shot(page, 'journal-secret');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__gameReady && (window.__game as unknown as Game).explore.ready,
  );
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.summary().found),
  ).toBe(3);
  expect(errors).toEqual([]);
});

test('samples collect per dive, appear in mission debrief, and reset on restart', async ({
  page,
}) => {
  await boot(page, 'monterey-canyon', true);
  const id = await park(page, 0, true);
  await expect(page.locator('.scan-hint')).toContainText('TO COLLECT');
  await scan(page, id);
  await expect(page.locator('.scan-name')).toContainText('Sample collected');
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.samples.collected.size),
  ).toBe(1);
  await page.evaluate(() => (window.__game as unknown as Game).missionRouter.endDive());
  await expect(page.locator('.mission-debrief .is-samples')).toContainText('Sediment core');
  await expect(page.locator('.mission-debrief .is-secrets')).toContainText('SECRETS FOUND 0/3');
  await shot(page, 'sample-debrief');
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

test('short event caption, one witness reward, pause and cooldown', async ({ page }) => {
  await boot(page);
  await park(page, 0);
  const points = await page.evaluate(() => (window.__game as unknown as Game).progress.points);
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.previewEvent('snow')),
  ).toBe(true);
  await expect(page.locator('.explore-caption')).toHaveText('Marine snow falls through the light');
  await page.waitForFunction(
    () => (window.__game as unknown as Game).explore.summary().events.length === 1,
  );
  await page.waitForTimeout(1500);
  await shot(page, 'event-marine-snow');
  expect(await page.evaluate(() => (window.__game as unknown as Game).progress.points)).toBe(
    points + 5,
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('.explore-caption')).toBeHidden();
  await page.waitForTimeout(500);
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.scheduler.active),
  ).not.toBeNull();
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => (window.__game as unknown as Game).explore.scheduler.active === null,
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(1500);
  expect(
    await page.evaluate(() => (window.__game as unknown as Game).explore.scheduler.active),
  ).toBeNull();
});

/** Read the actual layout: a result must stay on screen and clear thumb targets. */
async function expectScanPanelFits(page: Page): Promise<void> {
  const panel = await page.locator('.scan-panel').boundingBox();
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
    await expect(page.locator('.scan-hint')).toHaveText('STOWED FOR THIS DIVE');
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

for (const site of [
  'lost-city',
  'axial-seamount-ashes',
  'beebe-vent-field',
  'challenger-deep',
  'kamaehuakanaloa',
  'hunga-tonga-caldera',
  'hudson-canyon',
  'blake-plateau-corals',
  'great-blue-hole',
  'titanic',
  'bismarck',
  'endurance',
]) {
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
    expect(stats.secrets).toBe(3);
    expect(stats.samples).toBe(2);
    for (const d of stats.depths) {
      expect(d.depth).toBeGreaterThan(10);
      expect(d.lift).toBeCloseTo(2);
    }
  });
}
