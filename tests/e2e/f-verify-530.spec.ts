import { expect, test } from '@playwright/test';
import type { FogExp2, Points, Scene, ShaderMaterial } from 'three';
import type { Atmosphere } from '../../src/render/Atmosphere.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Terrain } from '../../src/world/Terrain.js';
import type { PresetSystem } from '../../src/world/presets/Presets.js';
import type { Headlights } from '../../src/render/Headlights.js';
import { waitForFrames } from './helpers/frames.js';

interface TitanicGame {
  scene: Scene;
  atmosphere: Atmosphere;
  presets: PresetSystem;
  rig: CameraRig;
  sub: Submarine;
  terrain: Terrain;
  headlights: Headlights;
  props: { loaded: boolean };
}

for (const tier of ['low', 'medium', 'high']) {
  for (const route of ['tile', 'mission']) {
    test(`530 Titanic ${route} ${tier}: first-frame fill and permanent snow survive the merge`, async ({
      page,
    }, info) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          'subexplorer.progress.v1',
          JSON.stringify({
            version: 1,
            lifetime: 900,
            points: 0,
            awarded: [],
            upgrades: {},
            ratings: {},
          }),
        );
      });
      await page.goto(`/?${route}=titanic&skipBriefing=1&tutorial=0&tier=${tier}`);
      await page.waitForFunction(() => {
        const g = window.__game as unknown as TitanicGame | undefined;
        return window.__gameReady === true && g?.props.loaded && g.presets.entered;
      });
      const opening = await page.evaluate(() => {
        const g = window.__game as unknown as TitanicGame;
        const light = g.atmosphere.ambient;
        const luminance = 0.2126 * light.color.r + 0.7152 * light.color.g + 0.0722 * light.color.b;
        const density = (g.scene.fog as FogExp2).density;
        const pos = g.sub.position;
        const floor = [];
        for (let bearing = -1; bearing < 8; bearing++) {
          const angle = (bearing * Math.PI) / 4;
          const radius = bearing < 0 ? 0 : 40;
          const x = pos.x + radius * Math.cos(angle),
            z = pos.z + radius * Math.sin(angle);
          const y = g.terrain.sampleHeight(x, z);
          const eye = g.rig.camera.position;
          const distance = Math.hypot(eye.x - x, eye.y - y, eye.z - z);
          floor.push(light.intensity * luminance * Math.exp(-Math.pow(density * distance, 2)));
        }
        const snow = g.scene.getObjectByName('marineSnow') as Points;
        const material = snow.material as ShaderMaterial;
        return {
          ambient: light.intensity,
          fill: g.presets.params.ambientFill,
          floor,
          snowCount: snow.geometry.getAttribute('aSeed').count,
          snowVisible: snow.visible,
          opacity: material.opacity,
          density: material.uniforms.uDensity!.value as number,
          foregroundAlpha: material.uniforms.uForegroundAlpha!.value as number,
          maxSize: material.uniforms.uMaxSizePx!.value as number,
        };
      });
      // These are lighting proxies, not screenshot luminance. Screenshots are
      // retained for visual inspection of the real rendered spawn and far field.
      expect(opening.fill).toBeGreaterThanOrEqual(24);
      expect(opening.ambient).toBeGreaterThanOrEqual(24);
      expect(opening.floor.every((value) => value >= 0.1)).toBe(true);
      expect(opening.snowCount).toBe(tier === 'low' ? 300 : tier === 'medium' ? 1200 : 3000);
      expect(opening.snowVisible).toBe(true);
      expect(opening.opacity).toBeGreaterThan(0);
      expect(opening.density).toBeGreaterThan(0);
      expect(opening.foregroundAlpha).toBeGreaterThan(0);
      expect(opening.maxSize).toBe(3);
      await page.screenshot({ path: info.outputPath('titanic-spawn.png') });
      await page.evaluate(() =>
        (window.__game as unknown as TitanicGame).headlights.setEnabled(false),
      );
      await waitForFrames(page, 3);
      await page.screenshot({ path: info.outputPath('titanic-without-lamps.png') });
    });
  }
}
