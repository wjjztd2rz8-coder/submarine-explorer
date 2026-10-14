import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { renderReview, reviewShot } from './helpers/render.js';
import { devices, expect, test } from './helpers/unlocked.js';
import { setScanCardSuppressed } from './helpers/tutorial.js';
import type { EventsVisual } from '../../src/game/EventsVisual.js';
import type { EventScheduler, ExploreEventKind } from '../../src/game/Events.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Scene, Points, PointsMaterial, BufferGeometry, Mesh } from 'three';

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
/** Read actual world vertices/sprite edges and actual DOM boxes, at each capture age. */
function eventLayout(kind: ExploreEventKind) {
  const g = window.__game as unknown as Game;
  const object = g.scene.getObjectByName(
    kind === 'whale' ? 'exploreEventWhale' : 'exploreEventParticles',
  ) as Mesh<BufferGeometry>;
  object.updateWorldMatrix(true, false);
  const positions = object.geometry.getAttribute('position');
  const point = object.position.clone(),
    eye = point.clone();
  const width = window.innerWidth,
    height = window.innerHeight;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
    const depth = -eye.copy(point).applyMatrix4(g.rig.camera.matrixWorldInverse).z;
    const radius =
      kind === 'whale'
        ? 0
        : Math.min(
            24,
            ((object.material as PointsMaterial).size * height) / (4 * Math.max(1, depth)),
          );
    point.project(g.rig.camera);
    const x = ((point.x + 1) * width) / 2,
      y = ((1 - point.y) * height) / 2;
    minX = Math.min(minX, x - radius);
    maxX = Math.max(maxX, x + radius);
    minY = Math.min(minY, y - radius);
    maxY = Math.max(maxY, y + radius);
  }
  const caption = document.querySelector<HTMLElement>('.guidance-slot[data-kind="discovery"]')!;
  const a = caption.getBoundingClientRect();
  const subject = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  const covered = !caption.hidden && a.x < maxX && a.right > minX && a.y < maxY && a.bottom > minY;
  const captionOverlays = [
    '.sonar',
    '.hud-readouts',
    '.tc-stick',
    '.tc-slider',
    '.tc-buttons',
    '.tc-btn-pause',
  ].filter((selector) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (caption.hidden || !element || element.hidden || !element.getClientRects().length)
      return false;
    const b = element.getBoundingClientRect();
    return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
  });
  return {
    subject,
    covered,
    captionOverlays,
    caption: {
      visible: !caption.hidden && a.width > 0,
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height,
      maxWidth: caption.style.maxWidth,
      fontSize: caption.style.fontSize,
      text: caption.textContent,
    },
  };
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
        await pauseClockBeforeNavigation(page);
        await page.goto(`/?tile=${site}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, {
          waitUntil: 'domcontentloaded',
        });
        await clockFramesUntil(page, () => {
          const g = window.__game as unknown as Game;
          return !!(window.__gameReady && g.explore?.ready && g.props.loaded);
        });
        // Whale habitat is upper water. Keep the actual chase framing after a
        // shallow reposition; other events use the site's ordinary opening pose.
        if (kind === 'whale')
          await page.evaluate(() => {
            const g = window.__game as unknown as Game;
            g.sub.position.y = -60;
            g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
          });
        await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          g.sub.step = () => {};
        });
        for (let i = 0; i < 5; i++) await page.clock.fastForward(16);
        const before = await page.evaluate(() => {
          const g = window.__game as unknown as Game;
          return { calls: g.perf.drawCalls, triangles: g.perf.triangles };
        });
        // A contact ready to scan outranks a sighting in the one slot. These opening poses
        // are in range of one, so hold its card back to review the sighting's own layout.
        await setScanCardSuppressed(page, true);
        expect(
          await page.evaluate(
            (kind) => (window.__game as unknown as Game).explore.previewEvent(kind),
            kind,
          ),
        ).toBe(true);
        await page.clock.fastForward(16);
        await expect(page.locator('.guidance-slot[data-kind="discovery"]')).toBeVisible();
        await expect(page.locator('.guidance-slot[data-kind="discovery"]')).toContainText(
          kind === 'plume'
            ? 'Vent plume:'
            : kind === 'turbidity'
              ? 'Silt cloud:'
              : 'Whale passing:',
        );
        // Holding the scheduler alone does not hold the caption's lifetime.
        // Advance both through explicit frames so software GL cannot expire it.
        await page.evaluate(() => {
          const scheduler = (window.__game as unknown as Game).explore.scheduler;
          scheduler.update = () => null;
          scheduler.active!.elapsedS = 2;
        });
        const samples: { ms: number; calls: number; triangles: number }[] = [];
        for (let i = 0; i < (renderReview ? 30 : 1); i++) {
          const start = Date.now();
          // Cross a complete RAF interval even when the previous clock advance
          // landed between ticks; fastForward presents one frame per advance.
          await page.clock.fastForward(34);
          const counters = await page.evaluate(() => {
            const g = window.__game as unknown as Game;
            return { calls: g.perf.drawCalls, triangles: g.perf.triangles };
          });
          samples.push({ ms: Date.now() - start, ...counters });
        }
        const measurements = await page.evaluate(
          ({ kind, before, samples }) => {
            const g = window.__game as unknown as Game;
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
          { kind, before, samples },
        );
        expect(measurements.range).toBeGreaterThanOrEqual(30);
        expect(measurements.range).toBeLessThanOrEqual(70);
        expect(Math.abs(measurements.projected[0])).toBeLessThan(1);
        expect(Math.abs(measurements.projected[1])).toBeLessThan(1);
        expect(measurements.particles).toBe(100);
        expect(measurements.calls).toBeLessThanOrEqual(1500);
        expect(measurements.triangles).toBeLessThanOrEqual(1_500_000);
        expect(measurements.tier).toBe('low');
        // Retain layout evidence even if visibility fails before a shot is saved.
        await test.info().attach('event-caption-layout', {
          body: JSON.stringify({ measurements, layout: await page.evaluate(eventLayout, kind) }),
          contentType: 'application/json',
        });
        await expect(page.locator('.guidance-slot[data-kind="discovery"]')).toBeVisible();
        const startLayout = await page.evaluate(eventLayout, kind);
        expect(startLayout.covered, 'caption must leave the event visible').toBe(false);
        expect(
          startLayout.captionOverlays,
          'caption must leave HUD and thumb controls clear',
        ).toEqual([]);
        if (kind === 'whale') expect(startLayout.subject.height).toBeGreaterThan(8);
        await reviewShot(page, `${kind}-${surface}-low-start`);
        await page.evaluate(() => {
          (window.__game as unknown as Game).explore.scheduler.active!.elapsedS = 7;
        });
        // Layout checks twice a second; render enough simulation time for it.
        for (let i = 0; i < 6; i++) await page.clock.fastForward(100);
        // The sighting card retires three seconds after the log, so by now it is gone and
        // cannot cover the moving event; the layout read below proves it still reports none.
        await expect(page.locator('.guidance-slot[data-kind="discovery"]')).toBeHidden();
        const movingLayout = await page.evaluate(eventLayout, kind);
        expect(movingLayout.covered, 'moving event must stay clear of its caption').toBe(false);
        expect(movingLayout.captionOverlays, 'moving caption must leave controls clear').toEqual(
          [],
        );
        await reviewShot(page, `${kind}-${surface}-low-moving`);
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
        await clockFramesUntil(
          page,
          () => (window.__game as unknown as Game).explore.summary().events.length === 1,
        );
        expect(
          await page.evaluate(
            ({ site, kind }) =>
              (window.__game as unknown as Game).discoveries.isDiscovered(site, `event:${kind}`),
            { site, kind },
          ),
        ).toBe(true);
        await expect(page.locator('.guidance-slot[data-kind="discovery"]')).toContainText(
          'Sighting logged in Journal',
        );
        await page.evaluate(async () => {
          const g = window.__game as unknown as Game;
          await g.journal.load();
          g.journal.open();
        });
        await expect(page.locator('.journal')).toContainText('Sighting:');
        const explanation =
          kind === 'plume'
            ? 'Mixing with seawater can cause minerals to precipitate into tiny particles.'
            : kind === 'turbidity'
              ? 'These flows carry sand and mud through submarine canyons.'
              : 'Whales breathe air and return to the surface between dives.';
        await expect(page.locator('.journal .jr-body')).toContainText(explanation);
        const source =
          kind === 'plume'
            ? 'https://www.nature.com/articles/ncomms1636'
            : kind === 'turbidity'
              ? 'https://www.mbari.org/news/high-tech-smart-boulders-give-the-first-look-from-inside-an-underwater-landslide/'
              : 'https://sanctuaries.noaa.gov/hudson-canyon/';
        await expect(page.locator('.journal .jr-body').locator(`a[href="${source}"]`)).toHaveCount(
          1,
        );
        await reviewShot(page, `${kind}-${surface}-journal`);
        expect(errors).toEqual([]);
        await page.evaluate(() => {
          (window.__game as unknown as Game).journal.close();
        });
        await page.reload();
        await clockFramesUntil(page, () => window.__gameReady === true);
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
