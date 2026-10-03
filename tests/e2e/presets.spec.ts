import { expect, test, type Page } from './helpers/unlocked.js';

async function waitForPreset(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => (window.__game?.presets as { entered?: boolean } | undefined)?.entered === true,
    undefined,
    { timeout: 30_000 },
  );
}

async function enableCurrents(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings .mode-advanced-toggle').click();
  await page
    .getByRole('dialog', { name: 'Settings' })
    .getByLabel('Currents')
    .selectOption('realistic');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const g = window.__game as {
      currents: { status: string };
      presets: { current: { length(): number } };
    };
    return g.currents.status === 'ready' && g.presets.current.length() > 0;
  });
}

for (const { name, url, draws, source } of [
  {
    name: 'vent',
    url: '/?tile=titanic&landmark=_test&preset=vent&at=41.730662,-49.949157&depth=3790',
    draws: 2,
    source: 'param',
  },
  {
    name: 'reef',
    url: '/?tile=great-blue-hole&preset=reef&depth=20',
    draws: 1,
    source: 'param',
  },
  {
    name: 'canyon',
    url: '/?tile=monterey-canyon&preset=canyon',
    draws: 1,
    source: 'param',
  },
  {
    name: 'brine',
    url: '/?tile=titanic&preset=brine&depth=3790',
    draws: 2,
    source: 'param',
  },
  {
    name: 'wreck',
    url: '/?tile=titanic&preset=wreck&depth=3790',
    draws: 2,
    source: 'param',
  },
  {
    name: 'trench',
    url: '/?tile=challenger-deep&preset=trench&depth=10000',
    draws: 0,
    source: 'param',
  },
  {
    name: 'seamount',
    url: '/?tile=lost-city&preset=seamount&at=30.124,-42.1195&depth=780',
    draws: 0,
    source: 'param',
  },
  {
    name: 'default',
    url: '/?tile=titanic&preset=default',
    draws: 0,
    source: 'param',
  },
]) {
  test(`${name} enters and compiles its preset shader`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    // These cases exercise preset geometry/shaders. CI seeds low quality,
    // which intentionally suppresses that geometry; select its required tier.
    await page.goto(`${url}&tier=medium`, { waitUntil: 'domcontentloaded' });
    await waitForPreset(page);
    // Let the entered preset render before inspecting errors and taking the
    // screenshot, regardless of how many wall seconds each frame costs.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const state = await page.evaluate(() => {
      const p = window.__game!.presets as {
        active: string;
        source: string;
        preset: { stats: { draws: number; particles: number } };
      };
      return { active: p.active, source: p.source, stats: { ...p.preset.stats } };
    });
    expect(state.active).toBe(name);
    expect(state.source).toBe(source);
    expect(state.stats.draws).toBe(draws);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
  });
}

test('low tier keeps canyon physics without preset geometry', async ({ page }) => {
  await page.goto('/?tile=monterey-canyon&preset=canyon&tier=low', {
    waitUntil: 'domcontentloaded',
  });
  await waitForPreset(page);
  await enableCurrents(page);
  const state = await page.evaluate(() => {
    const p = window.__game!.presets as {
      active: string;
      preset: { stats: { draws: number; particles: number } };
      current: { x: number; y: number; z: number };
    };
    return {
      active: p.active,
      stats: { ...p.preset.stats },
      speed: Math.hypot(p.current.x, p.current.y, p.current.z),
    };
  });
  expect(state.active).toBe('canyon');
  expect(state.stats).toEqual({ draws: 0, particles: 0, lights: 0 });
  expect(state.speed).toBeGreaterThan(0);
});

test('a frozen frame does not apply canyon current to sub velocity', async ({ page }) => {
  await page.goto('/?tile=monterey-canyon&preset=canyon', { waitUntil: 'domcontentloaded' });
  await waitForPreset(page);
  await enableCurrents(page);
  const result = await page.evaluate(() => {
    const g = window.__game!;
    const p = g.presets as {
      update(
        dt: number,
        simDt: number,
        sample: unknown,
        camera: unknown,
        height: number,
        t: number,
      ): void;
      current: { length(): number };
    };
    const sub = g.sub as {
      velocity: {
        set(x: number, y: number, z: number): void;
        clone(): unknown;
        equals(v: unknown): boolean;
      };
    };
    const atmo = g.atmosphere as { sample: unknown };
    const rig = g.rig as { camera: unknown };
    sub.velocity.set(0.4, -0.1, 0.2);
    const before = sub.velocity.clone();
    p.update(0, 0, atmo.sample, rig.camera, 800, 1);
    return { unchanged: sub.velocity.equals(before), current: p.current.length() };
  });
  expect(result.current).toBeGreaterThan(0);
  expect(result.unchanged).toBe(true);
});

test('Lost City uses clear carbonate flow without smoke or glow in a free dive', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?tile=lost-city&at=30.124,-42.1195&depth=780&tier=medium', {
    waitUntil: 'domcontentloaded',
  });
  await waitForPreset(page);
  const state = await page.evaluate(() => {
    const p = window.__game!.presets as {
      active: string;
      source: string;
      params: { fluid: string };
      preset: {
        stats: { draws: number; lights: number };
        smoke?: { uniforms: Record<string, { value: unknown }> };
      };
    };
    return {
      active: p.active,
      source: p.source,
      fluid: p.params.fluid,
      draws: p.preset.stats.draws,
      lights: p.preset.stats.lights,
      smoke: p.preset.smoke,
    };
  });
  expect(state).toEqual({
    active: 'vent',
    source: 'mission',
    fluid: 'carbonate',
    draws: 1,
    lights: 0,
    smoke: null,
  });
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('lost-city.png') });
});
