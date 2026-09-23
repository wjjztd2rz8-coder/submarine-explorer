import { expect, test, type Page } from '@playwright/test';

async function waitForPreset(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => (window.__game?.presets as { entered?: boolean } | undefined)?.entered === true,
    undefined,
    { timeout: 30_000 },
  );
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
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await waitForPreset(page);
    await page.waitForTimeout(1000);
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

test('Lost City uses its documented pale carbonate vent override in a free dive', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?tile=lost-city&at=30.124,-42.1195&depth=780', {
    waitUntil: 'domcontentloaded',
  });
  await waitForPreset(page);
  const state = await page.evaluate(() => {
    const p = window.__game!.presets as {
      active: string;
      source: string;
      params: { fluid: string };
      preset: {
        stats: { draws: number };
        smoke?: { uniforms: Record<string, { value: unknown }> };
      };
    };
    return {
      active: p.active,
      source: p.source,
      fluid: p.params.fluid,
      draws: p.preset.stats.draws,
    };
  });
  expect(state).toEqual({ active: 'vent', source: 'mission', fluid: 'carbonate', draws: 2 });
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('lost-city.png') });
});
