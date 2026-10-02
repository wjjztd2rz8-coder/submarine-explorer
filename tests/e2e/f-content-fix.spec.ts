// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/f-content-fix';

for (const site of [
  { id: 'great-blue-hole', text: 'This dive follows Lighthouse Reef', entry: 'overview' },
  { id: 'hunga-tonga-caldera', text: 'before the 15 January 2022 eruption', entry: 'overview' },
  { id: 'bismarck', text: 'roughly 570 m gap', entry: 'overview' },
  { id: 'lost-city', text: 'It emerges clear', entry: 'overview' },
  { id: 'beebe-vent-field', text: 'roughly 500 bar', entry: 'vents' },
  { id: 'blake-plateau-corals', text: 'naturally white', entry: 'coral-thicket' },
]) {
  test(`${site.id}: sourced content is readable in the Journal`, async ({ page }) => {
    await mkdir(shots, { recursive: true });
    await page.goto(`/?tile=${site.id}&skipBriefing=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true);
    await page.keyboard.press('j');
    const journal = page.locator('.journal');
    await expect(journal).toBeVisible();
    await journal.locator('.jr-spoilers input').check();
    const kind = site.entry === 'overview' ? 'site' : 'poi';
    await journal.locator(`.jr-nav-item[data-target="${site.id}/${kind}/${site.entry}"]`).click();
    await expect(journal.locator('.jr-body')).toContainText(site.text);
    await expect(journal.locator('.jr-body')).not.toContainText(/illustrative|reconstructed/i);
    await expect(journal.locator('.jr-sources a').first()).toHaveAttribute('href', /^https:/);
    if (site.id === 'beebe-vent-field') {
      await expect(journal.locator('.jr-heading')).toContainText(
        'Beebe Hydrothermal Vent Field (Piccard)',
      );
      await expect(journal.locator('.jr-heading')).not.toContainText('Von Damm');
    }
    await page.screenshot({ path: `${shots}/${site.id}-journal.png` });
  });
}

test('Lost City mission and free dive both retain clear flow', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  for (const url of ['/?tile=lost-city&skipBriefing=1', '/?mission=lost-city&skipBriefing=1']) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const p = window.__game?.presets as { entered?: boolean } | undefined;
      return window.__gameReady && p?.entered;
    });
    const effects = await page.evaluate(() => {
      const p = window.__game!.presets as {
        params: { smokeIntensity: number; glowLights: number; shimmerStrength: number };
        preset: {
          smoke: unknown;
          shimmer: { uniforms: { uStrength: { value: number } } };
          stats: { lights: number; particles: number };
        };
      };
      return {
        smokeIntensity: p.params.smokeIntensity,
        glowLights: p.params.glowLights,
        smoke: p.preset.smoke,
        strength: p.preset.shimmer.uniforms.uStrength.value,
        lights: p.preset.stats.lights,
        particles: p.preset.stats.particles,
      };
    });
    expect(effects).toEqual({
      smokeIntensity: 0,
      glowLights: 0,
      smoke: null,
      strength: 0.03,
      lights: 0,
      particles: 15,
    });
    await page.screenshot({
      path: `${shots}/lost-city-${url.includes('mission=') ? 'mission' : 'free-dive'}.png`,
    });
  }
});

test('Hunga hero and scan marker share a supported terrain location', async ({ page }) => {
  await page.goto('/?tile=hunga-tonga-caldera&skipBriefing=1', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => {
    const g = window.__game as
      { props: { loaded: boolean }; discovery: { loaded: boolean } } | undefined;
    return window.__gameReady && g?.props.loaded && g.discovery.loaded;
  });
  const position = await page.evaluate(() => {
    const g = window.__game as {
      props: {
        placed: { def: { id: string }; root: { position: { x: number; y: number; z: number } } }[];
      };
      scanner: { getTargets(): { id: string; position: { x: number; y: number; z: number } }[] };
      terrain: { sampleHeight(x: number, z: number): number };
    };
    const hero = g.props.placed.find((p) => p.def.id === 'caldera-tuff-wall')!;
    const target = g.scanner.getTargets().find((p) => p.id === 'hunga-tonga-rim-wall')!;
    return {
      distance: Math.hypot(
        hero.root.position.x - target.position.x,
        hero.root.position.z - target.position.z,
      ),
      ground: g.terrain.sampleHeight(hero.root.position.x, hero.root.position.z),
      heroY: hero.root.position.y,
      targetY: target.position.y,
    };
  });
  expect(position.distance).toBeLessThan(0.01);
  // The runtime terrain samples the compressed grid; the offline Float32
  // validator gives 468.6 m at this geographic point.
  expect(position.ground).toBeCloseTo(-471.1, 0);
  expect(position.heroY).toBeCloseTo(position.ground, 2);
  expect(Math.abs(position.targetY - position.ground)).toBeLessThan(5);
});
