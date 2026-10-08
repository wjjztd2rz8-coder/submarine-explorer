import type * as THREE from 'three';
import type { Terrain } from '../../src/world/Terrain.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import { expect, test } from './helpers/unlocked.js';

interface Game {
  terrain: Terrain;
  sub: Submarine;
  rig: CameraRig;
  props: { loaded: boolean };
  discovery: { loaded: boolean };
}

for (const site of ['monterey-canyon', 'great-blue-hole']) {
  for (const tier of ['low', 'medium', 'high']) {
    test(`920 ${site} ${tier}: rendered carve and depth agree`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`/?tile=${site}&skipBriefing=1&tier=${tier}&dynres=0&lifeSeed=42`);
      await page.waitForFunction(() => {
        const g = window.__game as unknown as Game;
        return window.__gameReady && g?.props.loaded && g.discovery.loaded;
      });
      await page.screenshot({ path: testInfo.outputPath('opening.png') });
      const centre =
        site === 'monterey-canyon'
          ? { x: -3230.927430367679, z: -1358.837559250192 }
          : { x: -157.43050033975456, z: -44.80193984705082 };
      const points =
        site === 'monterey-canyon'
          ? [-300, 0, 300].map((along) => ({
              x: centre.x + 20 * Math.sin(along / 220),
              z: centre.z + along,
            }))
          : [0, 60, 112, 140].map((radius) => ({
              x: centre.x + radius * Math.cos(2.3),
              z: centre.z + radius * Math.sin(2.3),
            }));
      const measurements = [];
      for (const point of points) {
        await page.evaluate(({ x, z }) => {
          const g = window.__game as unknown as Game;
          g.sub.reset(x, g.terrain.sampleHeight(x, z) + 30, z, 0);
          g.rig.snap(g.sub.position, 0, 0);
        }, point);
        // Allow the normal render loop to select and draw the current near LOD.
        await page.waitForTimeout(250);
        const measurement = await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          const { x, z } = g.sub.position;
          let meshY = -Infinity;
          // Independent vertical intersection with the ACTIVE rendered index buffer.
          // Ignore skirts, whose triangles have zero XZ area.
          for (const object of g.terrain.group.children) {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) continue;
            const geometry = mesh.geometry;
            const bounds = geometry.boundingBox;
            if (
              bounds &&
              (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z)
            )
              continue;
            const p = geometry.getAttribute('position');
            const indices = geometry.getIndex()!;
            for (let i = 0; i < indices.count; i += 3) {
              const a = indices.getX(i),
                b = indices.getX(i + 1),
                c = indices.getX(i + 2);
              const ax = p.getX(a),
                az = p.getZ(a),
                bx = p.getX(b),
                bz = p.getZ(b),
                cx = p.getX(c),
                cz = p.getZ(c);
              const determinant = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
              if (Math.abs(determinant) < 1e-9) continue;
              const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / determinant;
              const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / determinant;
              if (u < -1e-8 || v < -1e-8 || u + v > 1 + 1e-8) continue;
              meshY = Math.max(meshY, u * p.getY(a) + v * p.getY(b) + (1 - u - v) * p.getY(c));
            }
          }
          const state = g.sub.getState();
          const eye = g.rig.camera.position;
          return {
            x,
            z,
            meshY,
            collision: g.terrain.sampleHeight(x, z),
            survey: g.terrain.sampleDataHeight(x, z),
            depth: state.depth,
            altitude: state.altitude,
            y: state.position.y,
            cameraClearance: eye.y - g.terrain.sampleHeight(eye.x, eye.z),
          };
        });
        measurements.push(measurement);
        expect(Number.isFinite(measurement.meshY)).toBe(true);
        expect(Math.abs(measurement.collision - measurement.meshY)).toBeLessThan(0.002);
        expect(measurement.depth).toBe(measurement.y);
        expect(Math.abs(measurement.altitude - (measurement.y - measurement.meshY))).toBeLessThan(
          0.002,
        );
        expect(measurement.cameraClearance).toBeGreaterThanOrEqual(5.998);
      }
      const central = measurements[site === 'monterey-canyon' ? 1 : 0];
      const expected = site === 'monterey-canyon' ? -860 : -125;
      expect(Math.abs(central.survey - expected)).toBeLessThan(0.1);
      expect(Math.abs(central.meshY - expected)).toBeLessThan(site === 'monterey-canyon' ? 5 : 2);
      await testInfo.attach('carve-measurements', {
        body: JSON.stringify(measurements, null, 2),
        contentType: 'application/json',
      });
      await page.screenshot({ path: testInfo.outputPath('inspection.png') });
      expect(errors).toEqual([]);
    });
  }
}
