import { expect, test, type Page } from './helpers/unlocked.js';

/**
 * B4 prop pipeline: boots the Titanic tile with the `_test` fixture folder
 * (data/landmarks/_test/props.json: one of each procedural kind plus two
 * Poly Haven GLBs), spawned by `?at=` just south of the props and facing north.
 */

const URL = '/?tile=titanic&landmark=_test&depth=3790&debugTerrain=0&at=41.7290,-49.9500,0';

interface PropsProbe {
  loaded: boolean;
  stats: {
    count: number;
    models: number;
    procedural: number;
    failed: number;
    skipped: number;
    full: number;
  };
}

declare global {
  interface Window {
    __game?: Record<string, unknown>;
  }
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function waitForProps(page: Page): Promise<PropsProbe> {
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => (window.__game?.props as { loaded?: boolean } | undefined)?.loaded === true,
    undefined,
    { timeout: 30_000 },
  );
  return page.evaluate(() => {
    const p = window.__game!.props as PropsProbe;
    return { loaded: p.loaded, stats: { ...p.stats } };
  });
}

test.describe('B4 props', () => {
  test('loads the fixture props, lights them, and logs no errors', async ({ page }) => {
    const errors = collectErrors(page);
    // Record props:loaded as soon as the bus exists.
    await page.addInitScript(() => {
      const w = window as unknown as { __propsLoaded?: unknown; __game?: Record<string, unknown> };
      const timer = setInterval(() => {
        const bus = w.__game?.bus as
          { on(name: string, fn: (p: unknown) => void): void } | undefined;
        if (!bus) return;
        clearInterval(timer);
        const props = w.__game?.props as { loaded?: boolean; stats?: unknown } | undefined;
        // It may already have fired; fall back to the stats snapshot.
        if (props?.loaded) w.__propsLoaded = props.stats;
        bus.on('props:loaded', (p) => (w.__propsLoaded = p));
      }, 5);
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    const probe = await waitForProps(page);

    expect(probe.stats.count).toBe(5);
    expect(probe.stats.models).toBe(2);
    expect(probe.stats.procedural).toBe(3);
    expect(probe.stats.failed).toBe(0);
    expect(probe.stats.skipped).toBe(0);
    const evt = await page.evaluate(
      () => (window as unknown as { __propsLoaded?: { count: number } }).__propsLoaded ?? null,
    );
    expect(evt?.count).toBe(5);

    // Headlights on (they start on; press L if a future default changes that).
    const lightsOn = await page.evaluate(() => (window.__game!.headlights as { on: boolean }).on);
    if (!lightsOn) await page.keyboard.press('KeyL');
    expect(await page.evaluate(() => (window.__game!.headlights as { on: boolean }).on)).toBe(true);

    // Let the camera settle and GLB textures upload.
    await page.waitForTimeout(2500);
    const visible = await page.evaluate(() => {
      const p = window.__game!.props as { stats: { full: number; impostor: number } };
      return p.stats.full + p.stats.impostor;
    });
    expect(visible).toBeGreaterThanOrEqual(3);

    // Collision sanity: a point inside the hull is pushed out.
    const pushed = await page.evaluate(() => {
      const g = window.__game!;
      const props = g.props as {
        placed: Array<{
          def: { id: string };
          sphere: { center: { x: number; y: number; z: number } };
        }>;
        collide(p: unknown, r: number, out: unknown): boolean;
      };
      const THREE_V = (
        g.sub as { position: { clone(): { set(x: number, y: number, z: number): unknown } } }
      ).position;
      const hull = props.placed.find((p) => p.def.id === '_test-hull')!;
      const c = hull.sphere.center;
      const pos = THREE_V.clone();
      pos.set(c.x, c.y, c.z);
      const out = THREE_V.clone();
      return props.collide(pos, 8, out);
    });
    expect(pushed).toBe(true);

    await page.screenshot({ path: 'tests/e2e/screenshots/props.png' });
    expect(errors, errors.join(' | ')).toEqual([]);
  });

  test('Titanic hull ends read differently: prow, torn end, counter stern', async ({ page }) => {
    // QA-B #5. Spawn ~100 m off each end of both sections, looking at it, and
    // screenshot in the chase view (as played) and first-person (no own-boat
    // silhouette). Bow: 143 m, heading 0, ends [prow, cut]. Stern: 107 m,
    // heading 190, ends [cut, rounded]; its counter stern points at the bow.
    test.setTimeout(240_000);
    const errors = collectErrors(page);
    const views: Array<[string, string]> = [
      ['bow-from-south', '41.73096,-49.94694,0'], // sees the bow's torn aft end
      ['bow-from-north', '41.73404,-49.94694,180'], // sees the prow head-on
      ['stern-from-north', '41.72775,-49.94801,190'], // sees the rounded counter stern
      ['stern-from-south', '41.72503,-49.94865,10'], // sees the stern's torn forward end
    ];
    for (const [name, at] of views) {
      await page.goto(`/?tile=titanic&landmark=titanic&depth=3780&debugTerrain=0&at=${at}`, {
        waitUntil: 'domcontentloaded',
      });
      const probe = await waitForProps(page);
      expect(probe.stats.failed).toBe(0);
      const ends = await page.evaluate(() => {
        const p = window.__game!.props as {
          placed: Array<{ def: { id: string; hullEnds: string[] | null } }>;
        };
        return Object.fromEntries(p.placed.map((x) => [x.def.id, x.def.hullEnds]));
      });
      expect(ends['bow-hull']).toEqual(['prow', 'cut']);
      expect(ends['stern-hull']).toEqual(['cut', 'rounded']);
      await page.waitForTimeout(2500);
      const full = await page.evaluate(
        () => (window.__game!.props as { stats: { full: number } }).stats.full,
      );
      expect(full).toBeGreaterThanOrEqual(1);
      await page.screenshot({ path: `tests/e2e/screenshots/fix-p-${name}.png` });
      await page.evaluate(() =>
        (window.__game!.rig as { setMode(m: string): void }).setMode('first-person'),
      );
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `tests/e2e/screenshots/fix-p-${name}-fp.png` });
    }
    expect(errors, errors.join(' | ')).toEqual([]);
  });

  test('?debugProps=1 selects, nudges and rotates a prop and prints its JSON', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${URL}&debugProps=1`, { waitUntil: 'domcontentloaded' });
    await waitForProps(page);
    const panel = page.locator('.props-debug');
    await expect(panel).toBeVisible();
    await expect(panel.locator('li')).toHaveCount(5);
    await panel.locator('li', { hasText: '_test-hull' }).click();
    const json = panel.locator('.props-debug-json');
    await expect(json).toContainText('"id": "_test-hull"');
    const before = JSON.parse((await json.textContent()) ?? '{}') as {
      lat: number;
      heading_deg: number;
    };

    const subZ = await page.evaluate(
      () => (window.__game!.sub as { position: { z: number } }).position.z,
    );
    await page.keyboard.press('Shift+ArrowUp'); // 10 m north
    await page.keyboard.press('BracketRight'); // +5 deg
    await expect
      .poll(async () => JSON.parse((await json.textContent()) ?? '{}').heading_deg)
      .toBe(before.heading_deg + 5);
    const after = JSON.parse((await json.textContent()) ?? '{}') as { lat: number };
    expect(after.lat - before.lat).toBeCloseTo(10 / 111320, 6);
    // The arrow key went to the tool, not the sub.
    const subZAfter = await page.evaluate(
      () => (window.__game!.sub as { position: { z: number } }).position.z,
    );
    expect(Math.abs(subZAfter - subZ)).toBeLessThan(1);
    await page.screenshot({ path: 'tests/e2e/screenshots/props-debug.png' });
    expect(errors, errors.join(' | ')).toEqual([]);
  });
});
