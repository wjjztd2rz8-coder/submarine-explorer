import { expect, test } from '@playwright/test';
import index from '../../data/landmarks/index.json' with { type: 'json' };
import type { Mesh, InstancedMesh, WebGLRenderer } from 'three';
import type { SubMesh } from '../../src/sub/SubMesh.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Props } from '../../src/world/Props.js';
import type { Terrain } from '../../src/world/Terrain.js';
import type { PerfStats } from '../../src/app/systems/quality.js';
import type { Discovery } from '../../src/game/Discovery.js';

interface Game {
  sub: Submarine;
  subMesh: SubMesh;
  rig: CameraRig;
  props: Props;
  terrain: Terrain;
  perf: PerfStats;
  renderer: WebGLRenderer;
  discovery: Discovery;
  explore: { ready: boolean };
  config: {
    camera: { terrainClearance: number; surfaceClearance: number };
    submarine: { hullRadius: number };
  };
}

for (const layout of [
  { name: 'desktop', width: 1280, height: 800, touch: false },
  { name: 'portrait', width: 390, height: 844, touch: true },
]) {
  test.describe(`1090 ${layout.name}`, () => {
    test.use({
      viewport: layout,
      hasTouch: layout.touch,
      isMobile: layout.touch,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      storageState: { cookies: [], origins: [] },
    });
    for (const site of index.landmarks) {
      test(`${site}: Low opening and real 60 s idle render without clipping or errors`, async ({
        page,
      }, info) => {
        test.setTimeout(180_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text());
        });
        await page.goto(`/?tile=${site}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForFunction(() => {
          const g = window.__game as unknown as Game;
          return window.__gameReady && g.props.loaded && g.discovery.loaded && g.explore.ready;
        });
        await page.screenshot({ path: info.outputPath('opening.png') });
        const sample = await page.evaluate(async () => {
          const g = window.__game as unknown as Game;
          let frames = 0;
          let calls = 0;
          let triangles = 0;
          let minHull = Infinity;
          let minEye = Infinity;
          let minArm = Infinity;
          let propContacts = 0;
          let surfaceViolations = 0;
          let countersMatch = true;
          const frameTimes: number[] = [];
          const p = g.sub.position.clone();
          const push = p.clone();
          const started = performance.now();
          let previous = started;
          let lastCheck = -Infinity;
          // Real RAF and elapsed time: no held-sub override, teleport, or mocked clock.
          await new Promise<void>((resolve) => {
            const frame = (now: number): void => {
              frames++;
              frameTimes.push(now - previous);
              previous = now;
              calls = Math.max(calls, g.perf.drawCalls);
              triangles = Math.max(triangles, g.perf.triangles);
              countersMatch &&= g.perf.drawCalls === g.renderer.info.render.calls;
              countersMatch &&= g.perf.triangles === g.renderer.info.render.triangles;
              if (now - lastCheck >= 1000) {
                lastCheck = now;
                const eye = g.rig.camera.position;
                minEye = Math.min(minEye, eye.y - g.terrain.sampleHeight(eye.x, eye.z));
                if (eye.y > -g.config.camera.surfaceClearance + 1e-5) surfaceViolations++;
                if (g.props.collide(p.copy(g.sub.position), g.config.submarine.hullRadius, push))
                  propContacts++;
                for (let i = 0; i <= 48; i++) {
                  p.copy(g.sub.position).lerp(eye, i / 48);
                  minArm = Math.min(minArm, p.y - g.terrain.sampleHeight(p.x, p.z));
                }
                g.subMesh.group.updateMatrixWorld(true);
                g.subMesh.group.traverseVisible((object) => {
                  const mesh = object as Mesh;
                  if (!mesh.isMesh) return;
                  const vertices = mesh.geometry.getAttribute('position');
                  const instanced = mesh as InstancedMesh;
                  const matrix = mesh.matrix.clone();
                  for (let i = 0; i < (instanced.isInstancedMesh ? instanced.count : 1); i++) {
                    if (instanced.isInstancedMesh) instanced.getMatrixAt(i, matrix);
                    else matrix.identity();
                    for (let j = 0; j < vertices.count; j++) {
                      p.fromBufferAttribute(vertices, j)
                        .applyMatrix4(matrix)
                        .applyMatrix4(mesh.matrixWorld);
                      minHull = Math.min(minHull, p.y - g.terrain.sampleHeight(p.x, p.z));
                    }
                  }
                });
              }
              if (now - started >= 60_000) resolve();
              else requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
          });
          frameTimes.sort((a, b) => a - b);
          return {
            frames,
            elapsedMs: performance.now() - started,
            calls,
            triangles,
            countersMatch,
            fps: (frames * 1000) / (performance.now() - started),
            medianFrameMs: frameTimes[Math.floor(frameTimes.length * 0.5)],
            p95FrameMs: frameTimes[Math.floor(frameTimes.length * 0.95)],
            minHull,
            minEye,
            minArm,
            propContacts,
            surfaceViolations,
            tier: g.perf.tier,
            failed: g.props.stats.failed,
            breached: g.sub.hullBreached,
            clearance: g.config.camera.terrainClearance,
          };
        });
        await info.attach('idle-and-perf', {
          body: JSON.stringify(sample, null, 2),
          contentType: 'application/json',
        });
        await page.screenshot({ path: info.outputPath('idle-60s.png') });
        expect(errors).toEqual([]);
        expect(sample.elapsedMs).toBeGreaterThanOrEqual(60_000);
        expect(sample.frames).toBeGreaterThan(30);
        expect(sample.failed).toBe(0);
        expect(sample.breached).toBe(false);
        expect(sample.minHull).toBeGreaterThan(0);
        expect(sample.minEye).toBeGreaterThanOrEqual(sample.clearance - 1e-5);
        expect(sample.minArm).toBeGreaterThanOrEqual(sample.clearance - 1e-5);
        expect(sample.propContacts).toBe(0);
        expect(sample.surfaceViolations).toBe(0);
        expect(sample.tier).toBe('low');
        expect(sample.countersMatch).toBe(true);
        expect(sample.calls).toBeGreaterThan(0);
        expect(sample.triangles).toBeGreaterThan(10_000);
        expect(sample.calls).toBeLessThanOrEqual(1500);
        expect(sample.triangles).toBeLessThanOrEqual(1_500_000);
      });
    }
    for (const site of ['monterey-canyon', 'beebe-vent-field', 'titanic']) {
      test(`${site}: chase arm clears terrain during forward travel and a turn`, async ({
        page,
      }, info) => {
        test.setTimeout(180_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text());
        });
        await page.goto(`/?tile=${site}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForFunction(() => {
          const g = window.__game as unknown as Game;
          return window.__gameReady && g.props.loaded && g.discovery.loaded && g.explore.ready;
        });
        const start = await page.evaluate(() =>
          (window.__game as unknown as Game).sub.position.toArray(),
        );
        const samples = [];
        for (const keys of [['w'], ['w', 'd'], ['d']]) {
          for (const key of keys) await page.keyboard.down(key);
          try {
            samples.push(
              await page.evaluate(async () => {
                const g = window.__game as unknown as Game;
                let minArm = Infinity;
                let minEye = Infinity;
                let surfaceViolations = 0;
                let frames = 0;
                const started = performance.now();
                const p = g.sub.position.clone();
                await new Promise<void>((resolve) => {
                  const frame = (now: number): void => {
                    frames++;
                    const eye = g.rig.camera.position;
                    minEye = Math.min(minEye, eye.y - g.terrain.sampleHeight(eye.x, eye.z));
                    if (eye.y > -g.config.camera.surfaceClearance + 1e-5) surfaceViolations++;
                    for (let i = 0; i <= 48; i++) {
                      p.copy(g.sub.position).lerp(eye, i / 48);
                      minArm = Math.min(minArm, p.y - g.terrain.sampleHeight(p.x, p.z));
                    }
                    if (now - started >= 10_000) resolve();
                    else requestAnimationFrame(frame);
                  };
                  requestAnimationFrame(frame);
                });
                return {
                  minArm,
                  minEye,
                  surfaceViolations,
                  frames,
                  clearance: g.config.camera.terrainClearance,
                  position: g.sub.position.toArray(),
                  breached: g.sub.hullBreached,
                };
              }),
            );
          } finally {
            for (const key of keys) await page.keyboard.up(key);
          }
        }
        await info.attach('travel-and-turn', {
          body: JSON.stringify({ start, samples }, null, 2),
          contentType: 'application/json',
        });
        await page.screenshot({ path: info.outputPath('after-travel.png') });
        expect(errors).toEqual([]);
        expect(Math.hypot(...samples[0].position.map((v, i) => v - start[i]))).toBeGreaterThan(10);
        for (const sample of samples) {
          expect(sample.frames).toBeGreaterThan(5);
          expect(sample.minArm).toBeGreaterThanOrEqual(sample.clearance - 1e-5);
          expect(sample.minEye).toBeGreaterThanOrEqual(sample.clearance - 1e-5);
          expect(sample.surfaceViolations).toBe(0);
          expect(sample.breached).toBe(false);
        }
      });
    }
  });
}
