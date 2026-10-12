// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir, writeFile } from 'node:fs/promises';
import { devices, expect, test } from './helpers/unlocked.js';
import type { EventsVisual } from '../../src/game/EventsVisual.js';
import type { EventScheduler, ExploreEventKind } from '../../src/game/Events.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Scene, Points, PointsMaterial, BufferGeometry } from 'three';

const shots = '.cache/codex/shots/1393-f-events-reform';
interface Game {
  sub: Submarine;
  rig: CameraRig;
  scene: Scene;
  terrain: { sampleHeight(x: number, z: number): number };
  perf: { drawCalls: number; triangles: number; tier: string; pixelRatio: number };
  props: { loaded: boolean };
  explore: {
    ready: boolean;
    scheduler: EventScheduler;
    previewEvent(kind: ExploreEventKind): boolean;
    summary(): { events: string[] };
  };
  discoveries: { isDiscovered(site: string, id: string): boolean };
  journal: { load(): Promise<void>; open(): void; close(): void };
  missionRouter: { endDive(): boolean };
}
// Same fresh Arcade / life-seed / normal-effects setup as tools/perf-budget.mjs.
// Capture actual play framing, including phone controls and captions.
for (const surface of ['desktop', 'phone'] as const) {
  test.describe(`${surface} Low event review`, () => {
    if (surface === 'phone') {
      const { defaultBrowserType: _browser, ...phone } = devices['iPhone 13 landscape'];
      test.use({ ...phone });
    } else test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    for (const [kind, site] of [
      ['plume', 'beebe-vent-field'],
      ['turbidity', 'monterey-canyon'],
      ['whale', 'hudson-canyon'],
    ] as const) {
      test(`${kind}: visible spawn, live cue, sighting and bounded active frame`, async ({
        page,
      }) => {
        test.setTimeout(180_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(`/?tile=${site}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForFunction(() => {
          const g = window.__game as unknown as Game;
          return window.__gameReady && g.explore?.ready && g.props.loaded;
        });
        // Whale habitat is upper water. Keep the actual chase framing after a
        // shallow reposition; other events use the site's ordinary opening pose.
        if (kind === 'whale')
          await page.evaluate(() => {
            const g = window.__game as unknown as Game;
            g.sub.position.y = -60;
            g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
          });
        const before = await page.evaluate(async () => {
          const g = window.__game as unknown as Game;
          g.sub.step = () => {};
          for (let i = 0; i < 5; i++) await new Promise(requestAnimationFrame);
          return { calls: g.perf.drawCalls, triangles: g.perf.triangles };
        });
        expect(
          await page.evaluate(
            (kind) => (window.__game as unknown as Game).explore.previewEvent(kind),
            kind,
          ),
        ).toBe(true);
        await expect(page.locator('.explore-caption')).toBeVisible();
        await expect(page.locator('.explore-caption')).toContainText(
          kind === 'plume'
            ? 'Vent plume:'
            : kind === 'turbidity'
              ? 'Silt cloud:'
              : 'Whale passing:',
        );
        const measurements = await page.evaluate(
          async ({ kind, before }) => {
            const g = window.__game as unknown as Game;
            const scheduler = g.explore.scheduler;
            // Use previewEvent, then hold a known age for repeatable captures.
            scheduler.update = () => null;
            scheduler.active!.elapsedS = 2;
            const points = g.scene.getObjectByName('exploreEventParticles') as Points<
              BufferGeometry,
              PointsMaterial
            >;
            const group = g.scene.getObjectByName('exploreEvent') as EventsVisual['group'];
            const centre = group.position.clone();
            if (kind === 'plume') centre.y += 12;
            if (kind === 'turbidity') centre.y += 6;
            const range = centre.distanceTo(g.sub.position);
            const projected = centre.clone().project(g.rig.camera);
            const samples: { ms: number; calls: number; triangles: number }[] = [];
            let previous = await new Promise<number>(requestAnimationFrame);
            for (let i = 0; i < 30; i++) {
              const now = await new Promise<number>(requestAnimationFrame);
              samples.push({
                ms: now - previous,
                calls: g.perf.drawCalls,
                triangles: g.perf.triangles,
              });
              previous = now;
            }
            return {
              before,
              range,
              projected: projected.toArray(),
              particles: points.geometry.getAttribute('position').count,
              samples,
              calls: Math.max(...samples.map((s) => s.calls)),
              triangles: Math.max(...samples.map((s) => s.triangles)),
              tier: g.perf.tier,
              pixelRatio: g.perf.pixelRatio,
            };
          },
          { kind, before },
        );
        expect(measurements.range).toBeGreaterThanOrEqual(30);
        expect(measurements.range).toBeLessThanOrEqual(70);
        expect(Math.abs(measurements.projected[0])).toBeLessThan(1);
        expect(Math.abs(measurements.projected[1])).toBeLessThan(1);
        expect(measurements.particles).toBe(100);
        expect(measurements.calls).toBeLessThanOrEqual(1500);
        expect(measurements.triangles).toBeLessThanOrEqual(1_500_000);
        expect(measurements.tier).toBe('low');
        await mkdir(shots, { recursive: true });
        await page.screenshot({ path: `${shots}/${kind}-${surface}-low-start.png` });
        await writeFile(
          `${shots}/${kind}-${surface}-measurements.json`,
          JSON.stringify(measurements, null, 2),
        );
        await page.evaluate(() => {
          (window.__game as unknown as Game).explore.scheduler.active!.elapsedS = 7;
        });
        await page.waitForTimeout(100);
        await page.screenshot({ path: `${shots}/${kind}-${surface}-low-moving.png` });
        // Approach the currently visible centre, then look at it through the
        // regular chase rig. A distant caption must never silently count as a log.
        await page.evaluate((kind) => {
          const g = window.__game as unknown as Game;
          const group = g.scene.getObjectByName('exploreEvent')!;
          const target = group.position.clone();
          if (kind === 'plume') target.y += 12;
          if (kind === 'turbidity') target.y += 6;
          g.sub.reset(
            target.x,
            Math.max(target.y, g.terrain.sampleHeight(target.x, target.z + 25) + 15),
            target.z + 25,
            0,
          );
          g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
        }, kind);
        await page.waitForFunction((kind) => {
          const g = window.__game as unknown as Game;
          return g.discoveries.isDiscovered(
            new URLSearchParams(location.search).get('tile')!,
            `event:${kind}`,
          );
        }, kind);
        await expect(page.locator('.explore-caption')).toContainText('Sighting logged in Journal');
        expect(
          await page.evaluate(
            () => (window.__game as unknown as Game).explore.summary().events.length,
          ),
        ).toBe(1);
        await page.evaluate(async () => {
          const g = window.__game as unknown as Game;
          await g.journal.load();
          g.journal.open();
        });
        await expect(page.locator('.journal')).toContainText('Sighting:');
        await page.screenshot({ path: `${shots}/${kind}-${surface}-journal.png` });
        expect(errors).toEqual([]);
        await page.evaluate(() => {
          (window.__game as unknown as Game).journal.close();
        });
        await page.reload();
        await page.waitForFunction(() => window.__gameReady === true);
        expect(
          await page.evaluate(
            ({ site, kind }) =>
              (window.__game as unknown as Game).discoveries.isDiscovered(site, `event:${kind}`),
            { site, kind },
          ),
        ).toBe(true);
      });
    }
  });
}
