import { expect, test, type Page } from '@playwright/test';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';

/**
 * F2-LIFE: animals spawn from the site's table, stay inside the draw-call
 * budget, can be scanned (a first scan logs a Journal wildlife entry and a
 * photo names them), and never touch the objectives.
 */

const shots = '.cache/codex/shots/f2-life';
const DIVE = '/?tile=monterey-canyon&skipBriefing=1&tier=low&lifeSeed=3';

interface Game {
  life: {
    sim: {
      stats(): { agents: number; groups: number; species: number; liveSpecies: string[] };
      spawnNear(id: string, sub: unknown, ahead?: number, count?: number): unknown;
    };
    render: { drawCalls: { species: number; sparks: number } };
    targets: Array<{ id: string }>;
    animalInView(camera: unknown): { id: string } | null;
    tier: { maxSpecies: number };
  } | null;
  sub: {
    position: { x: number; y: number; z: number };
    reset(x: number, y: number, z: number, yaw: number): void;
  };
  terrain: { sampleHeight(x: number, z: number): number };
  scanner: {
    view: { completed: number; lastCompleteId: string | null; candidateId: string | null };
  };
  discoveries: { isDiscovered(l: string, p: string): boolean };
  rig: { camera: unknown; orbitRadius: number };
  perf: { drawCalls: number };
}

async function boot(page: Page, url = DIVE): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 60_000 });
  await page.waitForFunction(() => (window.__game as unknown as Game).life !== null, undefined, {
    timeout: 20_000,
  });
}

/** Park the sub in open water at `depth` metres and clear the area. */
async function park(page: Page, depth: number): Promise<void> {
  await page.evaluate((d) => {
    const g = window.__game as unknown as Game;
    const y = -d;
    // Open water: seabed well below the sub.
    let x = 0;
    let z = 0;
    outer: for (let r = 0; r < 3000; r += 100) {
      for (let a = 0; a < 6.3; a += 0.5) {
        const px = Math.sin(a) * r;
        const pz = Math.cos(a) * r;
        if (g.terrain.sampleHeight(px, pz) < y - 80) {
          x = px;
          z = pz;
          break outer;
        }
      }
    }
    g.sub.reset(x, y, z, 0);
  }, depth);
  await page.waitForTimeout(500);
}

test('animals spawn at a site and stay inside the low tier draw-call budget', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await boot(page);
  await park(page, 250);
  await page.waitForFunction(
    () => (window.__game as unknown as Game).life!.sim.stats().agents > 5,
    undefined,
    { timeout: 20_000 },
  );
  const info = await page.evaluate(() => {
    const g = window.__game as unknown as Game;
    const l = g.life!;
    return { stats: l.sim.stats(), draw: l.render.drawCalls, max: l.tier.maxSpecies };
  });
  expect(info.stats.species).toBeGreaterThan(0);
  // Low tier: at most four species meshes plus the spark layer = 5 extra draw calls.
  expect(info.draw.species).toBeLessThanOrEqual(info.max);
  expect(info.draw.species + info.draw.sparks).toBeLessThanOrEqual(5);
  // Everything on screen belongs to this site's table at this depth.
  const allowed = new Set([
    'pacific-hake',
    'nanomia',
    'comb-jelly',
    'atolla',
    'sun-star',
    'sea-pen',
    'sea-lion',
    'vampire-squid',
    'rattail',
    'humpback-whale',
  ]);
  for (const id of info.stats.liveSpecies) expect(allowed.has(id), id).toBe(true);
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/e2e-monterey-low.png` });
  expect(errors).toEqual([]);
});

test('an animal can be scanned: banner, Journal wildlife entry, persistence', async ({ page }) => {
  await boot(page);
  await park(page, 120);
  const ok = await page.evaluate(() => {
    const g = window.__game as unknown as Game;
    const sub = {
      x: g.sub.position.x,
      y: g.sub.position.y,
      z: g.sub.position.z,
      vx: 0,
      vy: 0,
      vz: 0,
      fx: 0,
      fy: 0,
      fz: -1,
      speed: 0,
      lightsOn: true,
      hullR: 7,
    };
    return g.life!.sim.spawnNear('comb-jelly', sub, 18, 1) !== null;
  });
  expect(ok).toBe(true);
  await page.waitForFunction(
    () => (window.__game as unknown as Game).life!.targets.some((t) => t.id === 'life:comb-jelly'),
    undefined,
    { timeout: 10_000 },
  );
  await page.keyboard.down('g');
  await page.waitForFunction(
    () => (window.__game as unknown as Game).scanner.view.completed >= 1,
    undefined,
    { timeout: 20_000 },
  );
  await page.keyboard.up('g');
  const done = await page.evaluate(() => {
    const g = window.__game as unknown as Game;
    return {
      id: g.scanner.view.lastCompleteId,
      logged: g.discoveries.isDiscovered('monterey-canyon', 'life:comb-jelly'),
    };
  });
  expect(done).toEqual({ id: 'life:comb-jelly', logged: true });
  await expect(page.locator('.scan-panel .scan-kicker')).toHaveText('NEW ENTRY');
  await expect(page.locator('.scan-panel .scan-name')).toHaveText('Lobate comb jelly');
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/e2e-scan-banner.png` });

  // The Journal's wildlife list now has it, with text and a source link.
  await page.keyboard.press('j');
  await page
    .getByRole('button', { name: /Monterey Canyon/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Lobate comb jelly' }).click();
  await expect(page.locator('.jr-title')).toHaveText('Lobate comb jelly');
  await expect(page.locator('.jr-latin i')).toHaveText('Bolinopsis infundibulum');
  await expect(page.locator('.jr-sources a').first()).toHaveAttribute('href', /^https:\/\//);
  await page.screenshot({ path: `${shots}/e2e-journal-wildlife.png` });

  // It persists: after a reload the entry is still unlocked.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 60_000 });
  expect(
    await page.evaluate(() =>
      (window.__game as unknown as Game).discoveries.isDiscovered(
        'monterey-canyon',
        'life:comb-jelly',
      ),
    ),
  ).toBe(true);
});

test('photo mode names the animal in frame', async ({ page }) => {
  await boot(page);
  await park(page, 120);
  await page.evaluate(() => {
    const g = window.__game as unknown as Game;
    const p = g.sub.position;
    g.life!.sim.spawnNear(
      'comb-jelly',
      {
        x: p.x,
        y: p.y,
        z: p.z,
        vx: 0,
        vy: 0,
        vz: 0,
        fx: 0,
        fy: 0,
        fz: -1,
        speed: 0,
        lightsOn: true,
        hullR: 7,
      },
      14,
      1,
    );
  });
  await page.waitForTimeout(800);
  await page.keyboard.press('p');
  // Bring the photo camera in close so the jelly is a clear subject.
  await page.evaluate(() => {
    (window.__game as unknown as Game).rig.orbitRadius = 28;
  });
  await page.waitForTimeout(400);
  await expect(page.locator('.photo-mode-caption')).toContainText('Lobate comb jelly');
  const named = await page.evaluate(() => {
    const g = window.__game as unknown as Game;
    return g.life!.animalInView(g.rig.camera)?.id ?? null;
  });
  // The orbit camera sits behind the sub, so the jelly 14 m ahead is in the middle of the frame.
  expect(named).toBe('comb-jelly');
});
