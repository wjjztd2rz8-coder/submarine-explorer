import { expect, test, type Page } from './helpers/unlocked.js';

/**
 * A3 playtest harness: drives the *real* game with scripted key presses and
 * asserts the handling checks listed in `docs/playtest-A3.md`.
 *
 * It reads state through `window.__game`, which main.ts already exposes for
 * debugging, so nothing test-only leaks into the shipped engine. Physics is
 * fixed-step, but wall-clock here is not, so the thresholds are deliberately
 * loose: they catch "the boat no longer accelerates / turns / stops", not a
 * five-percent tuning drift (that is what the vitest suite is for).
 */

interface Probe {
  speed: number;
  depth: number;
  altitude: number;
  headingDeg: number;
  roll: number;
  pitch: number;
  simSpeed: number;
  hullStress: number;
  emergencyBlow: boolean;
  cameraMode: string;
  cameraY: number;
  groundUnderCamera: number;
  z: number;
}

declare global {
  interface Window {
    __game?: Record<string, unknown>;
  }
}

async function probe(page: Page): Promise<Probe> {
  return page.evaluate(() => {
    const g = window.__game as {
      sub: {
        getState(): Record<string, number | boolean> & {
          position: { x: number; y: number; z: number };
        };
      };
      rig: { mode: string; camera: { position: { x: number; y: number; z: number } } };
      terrain: { sampleHeight(x: number, z: number): number };
    };
    const s = g.sub.getState();
    const cp = g.rig.camera.position;
    return {
      speed: s.speed as number,
      depth: s.depth as number,
      altitude: s.altitude as number,
      headingDeg: s.headingDeg as number,
      roll: s.roll as number,
      pitch: s.pitch as number,
      simSpeed: s.simSpeed as number,
      hullStress: s.hullStress as number,
      emergencyBlow: s.emergencyBlow as boolean,
      cameraMode: g.rig.mode,
      cameraY: cp.y,
      groundUnderCamera: g.terrain.sampleHeight(cp.x, cp.z),
      z: s.position.z,
    };
  });
}

/** Hold a key for `ms`, then release it. */
async function hold(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

test.describe('A3 submarine feel', () => {
  test('scripted flight: thrust, coast, turn, ballast, camera, sim speed', async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => consoleErrors.push(e.message));

    // The authored free-dive opening faces the bow from the north-east. This
    // handling script needs its original north-facing, open-water manoeuvre area.
    await page.goto('/?tile=titanic&depth=3700', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    await page.waitForTimeout(500);

    const start = await probe(page);
    expect(start.speed).toBeLessThan(1);
    expect(start.headingDeg).toBeCloseTo(0, 1);

    // --- check 1: full ahead accelerates, and heads north (-Z at yaw 0) ------
    await hold(page, 'w', 6000);
    const cruising = await probe(page);
    expect(cruising.speed).toBeGreaterThan(3);
    expect(cruising.z).toBeLessThan(start.z - 10);

    // --- check 3: cutting the throttle sheds most of that speed -------------
    await page.waitForTimeout(6000);
    const coasted = await probe(page);
    expect(coasted.speed).toBeLessThan(cruising.speed * 0.5);

    // --- checks 5 + 6: yaw turns the boat, and banks it while moving --------
    await page.keyboard.down('w');
    await page.waitForTimeout(4000);
    await page.keyboard.down('d');
    await page.waitForTimeout(2500);
    const turning = await probe(page);
    await page.keyboard.up('d');
    await page.keyboard.up('w');
    const turned = ((turning.headingDeg - cruising.headingDeg + 540) % 360) - 180;
    expect(turned).toBeGreaterThan(10); // turning to starboard
    expect(turning.roll).toBeLessThan(-0.05); // and leaning into it

    // Rotational inertia: the boat is still swinging a moment after release.
    await page.waitForTimeout(150);
    const coastingTurn = await probe(page);
    expect(coastingTurn.headingDeg).not.toBe(turning.headingDeg);

    // --- ballast: flood to dive, blow to rise -------------------------------
    const beforeDive = await probe(page);
    await hold(page, 'c', 4000);
    const dived = await probe(page);
    expect(dived.depth).toBeLessThan(beforeDive.depth - 3);
    await hold(page, ' ', 5000);
    expect((await probe(page)).depth).toBeGreaterThan(dived.depth);

    // --- camera: Q cycles chase <-> first person ----------------------------
    expect((await probe(page)).cameraMode).toBe('chase');
    await page.keyboard.press('q');
    await page.waitForTimeout(300);
    expect((await probe(page)).cameraMode).toBe('first-person');
    await page.keyboard.press('q');
    await page.waitForTimeout(300);
    expect((await probe(page)).cameraMode).toBe('chase');

    // --- sim speed: T cycles 1x -> 2x ---------------------------------------
    expect((await probe(page)).simSpeed).toBe(1);
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    expect((await probe(page)).simSpeed).toBe(2);
    // Two separate frames: presses inside one frame collapse into one edge.
    await page.keyboard.press('t');
    await page.waitForTimeout(150);
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    expect((await probe(page)).simSpeed).toBe(1);

    await page.screenshot({ path: 'tests/e2e/screenshots/a3-playtest.png' });
    await page.screenshot({ path: testInfo.outputPath('a3-playtest.png') });
    expect(consoleErrors, consoleErrors.join(' | ')).toEqual([]);
  });

  // B3 / F1: the hull and chase camera were mirrored across the N-S axis.
  test('after turning to ~090 the chase camera sits west of the boat, behind it', async ({
    page,
  }) => {
    await page.goto('/?tile=titanic&depth=3700', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    await page.waitForTimeout(500);

    // Turn to starboard from north until the HUD heading reads ~90 deg.
    await page.keyboard.down('d');
    await page.waitForFunction(
      () => {
        const g = window.__game as { sub: { getState(): { headingDeg: number } } };
        const h = g.sub.getState().headingDeg;
        return h > 75 && h < 180;
      },
      undefined,
      { timeout: 15_000 },
    );
    await page.keyboard.up('d');
    await page.waitForTimeout(1500); // rotation coasts a little, then the camera settles

    const r = await page.evaluate(() => {
      type V = { x: number; y: number; z: number };
      const g = window.__game as {
        sub: { position: V; getState(): { headingDeg: number }; getForward(): V };
        rig: { camera: { position: V & { clone(): V }; getWorldDirection(out: V): V } };
      };
      const f = g.sub.getForward();
      const cam = g.rig.camera;
      const dir = cam.getWorldDirection(cam.position.clone()); // any Vector3 will do as `out`
      return {
        heading: g.sub.getState().headingDeg,
        subX: g.sub.position.x,
        camX: cam.position.x,
        fwd: f,
        lookDotFwd: (dir.x * f.x + dir.z * f.z) / Math.hypot(dir.x, dir.z),
      };
    });
    expect(r.heading).toBeGreaterThan(60);
    expect(r.heading).toBeLessThan(135);
    expect(r.fwd.x).toBeGreaterThan(0.4); // physics: heading ~90 = east = +X
    expect(r.camX).toBeLessThan(r.subX); // camera behind (west of) the boat
    expect(r.lookDotFwd).toBeGreaterThan(0.8); // and looking the way it travels
  });

  test('flying into the seabed pushes out and never clips', async ({ page }) => {
    await page.goto('/?tile=titanic', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    await page.waitForTimeout(500);

    // Drop the boat to just above the seabed, nose down, and drive into it.
    await page.evaluate(() => {
      const g = window.__game as {
        sub: {
          reset(x: number, y: number, z: number, yaw?: number): void;
          pitch: number;
          position: { y: number };
        };
        terrain: { sampleHeight(x: number, z: number): number };
      };
      g.sub.reset(0, g.terrain.sampleHeight(0, 0) + 60, 0, 0);
      g.sub.pitch = -0.7;
    });
    await hold(page, 'w', 6000);
    await page.waitForTimeout(500);

    const p = await probe(page);
    // Check 8: pushed out, not tunnelled through.
    expect(p.altitude).toBeGreaterThan(0);
    expect(Number.isFinite(p.depth)).toBe(true);
    // Check: the camera never ends up inside the rock.
    expect(p.cameraY).toBeGreaterThan(p.groundUnderCamera);
  });

  test('crush depth fires an emergency blow and locks the controls', async ({ page }) => {
    await page.goto('/?tile=titanic', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    await page.waitForTimeout(500);

    // The Titanic seabed (~3,980 m) is shallower than the default Class B
    // rating, so fit the 1,000 m coastal hull and sit the boat below it in open
    // water -- the terrain push-out would otherwise lift us clear every step.
    const blown = await page.evaluate(async () => {
      const g = window.__game as {
        sub: {
          reset(x: number, y: number, z: number): void;
          setHullClass(id: string): boolean;
          getCrushDepth(): number;
        };
        bus: { on(name: string, h: (p: unknown) => void): () => void };
      };
      let fired = false;
      g.bus.on('sub:emergencyBlow', () => {
        fired = true;
      });
      g.sub.setHullClass('A');
      g.sub.reset(0, g.sub.getCrushDepth() - 400, 0);
      await new Promise((r) => setTimeout(r, 600));
      return fired;
    });
    expect(blown).toBe(true);

    const during = await probe(page);
    expect(during.emergencyBlow).toBe(true);
    expect(during.hullStress).toBeGreaterThan(0.5);

    // Full-down ballast must not stop the ascent while the controls are locked.
    await hold(page, 'c', 2000);
    const after = await probe(page);
    expect(after.depth).toBeGreaterThan(during.depth);
  });
});

test.describe('fix S: free-dive loadout and spawn', () => {
  async function bootTile(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  }
  async function subInfo(page: Page): Promise<{
    y: number;
    altitude: number;
    hullClass: string;
    crushDepth: number;
    hullBreached: boolean;
    emergencyBlow: boolean;
    hullRadius: number;
    tile: string;
    depthText: string;
  }> {
    return page.evaluate(() => {
      const g = window.__game as {
        sub: { getState(): Record<string, unknown> & { position: { y: number } } };
        config: { submarine: { hullRadius: number } };
        meta: { id: string };
      };
      const s = g.sub.getState();
      return {
        y: s.position.y,
        altitude: s.altitude as number,
        hullClass: s.hullClass as string,
        crushDepth: s.crushDepth as number,
        hullBreached: s.hullBreached as boolean,
        emergencyBlow: s.emergencyBlow as boolean,
        hullRadius: g.config.submarine.hullRadius,
        tile: g.meta.id,
        depthText: document.querySelector('.hud-value[data-field="depth"]')?.textContent ?? '',
      };
    });
  }

  test('QA-B #2: deep tiles fit a hull rated for them; no breach at spawn', async ({ page }) => {
    for (const [tile, cls] of [
      ['bismarck', 'B'],
      ['challenger-deep', 'C'],
      ['titanic', 'B'],
    ] as const) {
      await bootTile(page, `/?tile=${tile}`);
      await page.waitForTimeout(1500);
      const s = await subInfo(page);
      expect(s.hullClass, tile).toBe(cls);
      expect(s.hullBreached, tile).toBe(false);
      expect(s.emergencyBlow, tile).toBe(false);
      const line = (await page.locator('.hud-value[data-field="tile"]').textContent()) ?? '';
      expect(line).toContain(`hull ${cls}`);
      if (tile === 'challenger-deep') expect(line).toContain('at rating limit');
    }
  });

  test('QA-B #3: shallow tile centres spawn submerged over deep water; ?depth= is honoured', async ({
    page,
  }) => {
    await bootTile(page, '/?tile=great-blue-hole');
    await page.waitForTimeout(2500);
    const gbh = await subInfo(page);
    expect(gbh.y).toBeLessThanOrEqual(-gbh.hullRadius + 1e-6);
    // The old spawn rested on a -5 m reef flat, 6.6 m above sea level. Now:
    // mid-water over the nearest >= 60 m seabed, well clear of both.
    expect(gbh.altitude).toBeGreaterThan(25);
    expect(gbh.y).toBeLessThan(-gbh.hullRadius - 5);
    expect(gbh.depthText).toMatch(/^\d+ m$/); // not SURFACED
    await page.screenshot({ path: 'tests/e2e/screenshots/fix-s-great-blue-hole.png' });

    await bootTile(page, '/?tile=hunga-tonga-caldera&depth=30');
    const ht = await subInfo(page);
    expect(ht.y).toBeCloseTo(-30, 0);
  });

  test('QA-B #13: an unknown ?tile= boots the default tile with a warning', async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'warning') warnings.push(m.text());
    });
    await bootTile(page, '/?tile=does-not-exist');
    await expect(page.locator('.fatal')).toHaveCount(0);
    expect((await subInfo(page)).tile).toBe('titanic');
    expect(warnings.some((w) => w.includes('does-not-exist'))).toBe(true);
  });
});
