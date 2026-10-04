// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { FogExp2, Scene } from 'three';
import type { PerfStats } from '../../src/app/systems/quality.js';
import type { Save } from '../../src/core/Save.js';
import type { Atmosphere } from '../../src/render/Atmosphere.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Props } from '../../src/world/Props.js';
import type { Terrain } from '../../src/world/Terrain.js';
import type { PresetSystem } from '../../src/world/presets/Presets.js';

interface Game {
  save: Save;
  perf: PerfStats;
  atmosphere: Atmosphere;
  rig: CameraRig;
  sub: Submarine;
  props: Props;
  terrain: Terrain;
  presets: PresetSystem;
  discovery: { loaded: boolean };
  explore: { ready: boolean };
  life: object | null;
}

test.use({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  storageState: { cookies: [], origins: [] },
});

// Capture the normal player view. Ambient/fog floors detect missing lighting;
// visual review of the attachments must still judge terrain and plume readability.
for (const site of [
  { id: 'lost-city', hero: 'poseidon-tower', minAmbient: 12, minFloor: 2.5 },
  { id: 'beebe-vent-field', hero: 'beebe-chimney-1', minAmbient: 6, minFloor: 0.1 },
]) {
  test(`${site.id}: Low opening at 844×390 retains lighting and renders without console errors`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`/?tile=${site.id}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(() => {
      const g = window.__game as unknown as Game | undefined;
      return (
        window.__gameReady &&
        g?.props.loaded &&
        g.presets.entered &&
        g.discovery.loaded &&
        g.explore.ready &&
        g.life
      );
    });
    const opening = await page.evaluate(async (heroId) => {
      const g = window.__game as unknown as Game;
      g.sub.step = () => {};
      for (let i = 0; i < 30; i++)
        await new Promise<void>((done) => requestAnimationFrame(() => done()));
      const hero = g.props.placed.find((p) => p.def.id === heroId);
      if (!hero) throw new Error(`Missing hero: ${heroId}`);
      const light = g.atmosphere.ambient;
      const luminance = 0.2126 * light.color.r + 0.7152 * light.color.g + 0.0722 * light.color.b;
      const density = ((g.atmosphere.group.parent as Scene).fog as FogExp2).density;
      const floorProxies = [];
      for (let bearing = -1; bearing < 8; bearing++) {
        const angle = (bearing * Math.PI) / 4;
        const radius = bearing < 0 ? 0 : 40;
        const x = g.sub.position.x + radius * Math.cos(angle);
        const z = g.sub.position.z + radius * Math.sin(angle);
        const eye = g.rig.camera.position;
        const distance = Math.hypot(eye.x - x, eye.y - g.terrain.sampleHeight(x, z), eye.z - z);
        floorProxies.push(light.intensity * luminance * Math.exp(-Math.pow(density * distance, 2)));
      }
      return {
        mode: g.save.get().gameplayMode,
        tier: g.perf.tier,
        ambient: light.intensity,
        floorProxies,
        props: { ...g.props.stats },
        draws: g.perf.drawCalls,
        triangles: g.perf.triangles,
      };
    }, site.hero);
    expect(opening.mode).toBe('arcade');
    expect(opening.tier).toBe('low');
    expect(opening.props.failed).toBe(0);
    expect(opening.props.skipped).toBe(0);
    expect(opening.props.full).toBeGreaterThan(0);
    expect(opening.ambient).toBeGreaterThanOrEqual(site.minAmbient);
    for (const floor of opening.floorProxies) expect(floor).toBeGreaterThanOrEqual(site.minFloor);
    expect(opening.draws).toBeGreaterThan(0);
    expect(opening.draws).toBeLessThanOrEqual(1500);
    expect(opening.triangles).toBeGreaterThan(10_000);
    expect(opening.triangles).toBeLessThanOrEqual(1_500_000);
    await page.evaluate(() => document.fonts.ready.then(() => {}));
    // The list reporter does not persist inline attachment bodies. Keep files
    // in the test output so the orchestrator's captures can be visually reviewed.
    const screenshot = testInfo.outputPath(`${site.id}-low-844x390.png`);
    await page.screenshot({ path: screenshot, timeout: 60_000 });
    await testInfo.attach(`${site.id}-low-844x390`, {
      path: screenshot,
      contentType: 'image/png',
    });
    const diagnostics = testInfo.outputPath(`${site.id}-opening.json`);
    await writeFile(diagnostics, JSON.stringify(opening, null, 2));
    await testInfo.attach(`${site.id}-opening`, {
      path: diagnostics,
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  });
}
