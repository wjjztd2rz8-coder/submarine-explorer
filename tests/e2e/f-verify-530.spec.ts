import { expect, test, type Page } from '@playwright/test';
import type { FogExp2, Points, Scene, ShaderMaterial } from 'three';
import type { Atmosphere } from '../../src/render/Atmosphere.js';
import type { CameraRig } from '../../src/sub/CameraRig.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Terrain } from '../../src/world/Terrain.js';
import type { PresetSystem } from '../../src/world/presets/Presets.js';
import type { Headlights } from '../../src/render/Headlights.js';
import type { Save } from '../../src/core/Save.js';
import type { Discovery } from '../../src/game/Discovery.js';
import { waitForFrames } from './helpers/frames.js';

const hud = [
  '.sonar',
  '.hud-readouts',
  '.objectives-panel',
  '.scan-panel',
  '.hud-notice',
  '.onboard-card',
  '.onboard-hint',
  '.hud-control-tips',
  '.hud-reset-camera',
  '.tc-stick',
  '.tc-slider',
  '.tc-buttons',
  '.tc-btn-pause',
];

/** Read all geometry in one frame. Poll for native details toggle and live HUD placement. */
async function clearCredits(page: Page, open: boolean): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        ({ hud, open }) => {
          const visible = (selector: string) => {
            const el = document.querySelector<HTMLElement>(selector);
            return el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'
              ? { selector, rect: el.getBoundingClientRect() }
              : null;
          };
          const chip = visible('.hud-attribution summary')!;
          const panel = open ? visible('.hud-attribution-panel')! : null;
          const others = hud.map(visible).filter((item) => item !== null);
          const issues: string[] = [];
          for (const item of [chip, ...(panel ? [panel] : [])]) {
            const r = item.rect;
            if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight)
              issues.push(`${item.selector} offscreen: ${JSON.stringify(r)}`);
            for (const other of [...others, ...(item === panel ? [chip] : [])]) {
              const b = other.rect;
              if (r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top)
                issues.push(
                  `${item.selector} overlaps ${other.selector}: ${JSON.stringify([r, b])}`,
                );
            }
          }
          if (panel) {
            if (panel.rect.height < 48 || panel.rect.width < 120)
              issues.push('credits slot too small');
            const el = document.querySelector<HTMLElement>('.hud-attribution-panel')!;
            if (el.scrollWidth > el.clientWidth) issues.push('credits overflow horizontally');
          }
          return issues;
        },
        { hud, open },
      ),
    )
    .toEqual([]);
}

for (const layout of [
  { name: 'desktop', width: 1280, height: 720, touch: false },
  { name: 'desktop-650', width: 1600, height: 900, touch: false },
  { name: 'portrait', width: 360, height: 640, touch: true },
  { name: 'landscape', width: 844, height: 390, touch: true },
  { name: 'short-landscape', width: 667, height: 375, touch: true },
]) {
  test.describe(`530 credits ${layout.name}`, () => {
    test.use({
      viewport: { width: layout.width, height: layout.height },
      hasTouch: layout.touch,
      isMobile: layout.touch,
    });
    for (const uiScale of [100, 150]) {
      test(`${uiScale}%: fresh tutorial, contact, toast, sonar and Escape`, async ({
        page,
      }, info) => {
        await page.addInitScript((uiScale) => {
          localStorage.setItem(
            'subexplorer.settings.v2',
            JSON.stringify({
              version: 2,
              uiScale,
              reduceMotion: true,
              graphicsTier: 'low',
            }),
          );
        }, uiScale);
        await page.goto(
          `/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&tier=low${layout.touch ? '&touch=1' : ''}`,
        );
        await page.waitForFunction(() => window.__gameReady === true);
        await expect(page.locator('.onboard-card')).toBeVisible();
        await expect(page.locator('.scan-panel')).toBeVisible();
        const chip = page.getByRole('button', { name: 'Data: GMRT credits' });
        const panel = page.getByRole('region', { name: 'Data attribution' });
        await clearCredits(page, false);
        if (layout.touch) {
          expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          await chip.tap();
        } else await chip.click();
        await expect(panel).toBeVisible();
        await expect(chip).toHaveAttribute('aria-expanded', 'true');
        await expect(panel).toContainText('doi:10.1029/2008GC002332');
        await clearCredits(page, true);
        await page.screenshot({ path: info.outputPath('credits-fresh.png') });
        // Check all tutorial copy while credits stay open; no HUD panels are suppressed.
        for (const step of ['move', 'depth', 'lights', 'scan', 'journal']) {
          await expect(page.locator('.onboard-card')).toHaveAttribute('data-step', step);
          await clearCredits(page, true);
          if (step !== 'journal') {
            const skip = page.getByRole('button', { name: 'Skip step', exact: true });
            if (layout.touch) await skip.tap();
            else await skip.click();
          }
        }
        // A deterministic toast fixture exercises the actual HUD element without
        // completing a scan (which would also advance/dismiss the tutorial).
        await page.evaluate(() => {
          const toast = document.querySelector<HTMLElement>('.hud-notice')!;
          toast.textContent = 'New discovery · +10 RP';
          toast.hidden = false;
        });
        await expect(page.locator('.hud-notice')).toBeVisible();
        await clearCredits(page, true);
        await page.screenshot({ path: info.outputPath('credits-toast.png') });
        await page.evaluate(() => {
          document.querySelector<HTMLElement>('.hud-notice')!.hidden = true;
        });
        // Let the panel re-layout after the toast is gone, then check the last
        // link stays reachable inside a narrow scrollable panel.
        await page.evaluate(
          () =>
            new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
        );
        const license = panel.getByRole('link', { name: 'CC BY 4.0' });
        await license.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        const hit = await license.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          const scroller = el.closest<HTMLElement>('.hud-attribution-panel')!;
          return {
            reachable: el.contains(top),
            rect: r.toJSON(),
            fragments: Array.from(el.getClientRects(), (fragment) => fragment.toJSON()),
            topElement: top?.outerHTML,
            panel: scroller.getBoundingClientRect().toJSON(),
            scrollTop: scroller.scrollTop,
          };
        });
        await info.attach('credits-license-hit-test', {
          body: JSON.stringify(hit, null, 2),
          contentType: 'application/json',
        });
        expect(hit.reachable, JSON.stringify(hit)).toBe(true);
        await page.screenshot({ path: info.outputPath('credits-license.png') });
        await expect(chip).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
        await expect(chip).toBeFocused();
        await expect(page.locator('.pause-menu')).toBeHidden();
        expect(
          await page.evaluate(() => (window.__game as { save: Save }).save.get().uiScale),
        ).toBe(uiScale);
        await page.keyboard.press('Escape');
        await expect(page.locator('.pause-menu')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('.pause-menu')).toBeHidden();
        if (layout.touch) {
          await chip.tap();
          await page.locator('.tc-btn-sonar').tap();
          await expect(page.locator('.sonar')).toHaveClass(/d-sonar-expanded/);
          await clearCredits(page, true);
          const expandedMap = await page.locator('.sonar').evaluate((el) => {
            const panel = el.getBoundingClientRect();
            const map = el.querySelector('canvas')!.getBoundingClientRect();
            return {
              panel: panel.toJSON(),
              map: map.toJSON(),
              fits:
                map.width > 0 &&
                map.height > 0 &&
                map.left >= panel.left &&
                map.right <= panel.right &&
                map.top >= panel.top &&
                map.bottom <= panel.bottom,
            };
          });
          expect(expandedMap.fits, JSON.stringify(expandedMap)).toBe(true);
          expect(
            await chip.evaluate((el) => {
              const r = el.getBoundingClientRect();
              return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
            }),
          ).toBe(true);
          await page.screenshot({ path: info.outputPath('credits-expanded-sonar.png') });
          // Portrait <-> landscape while open must discard the old panel coordinates.
          await page.locator('.tc-btn-sonar').tap();
          await page.setViewportSize(
            layout.width < layout.height
              ? { width: 844, height: 390 }
              : { width: 360, height: 640 },
          );
          await clearCredits(page, true);
          await chip.tap();
          await expect(panel).toBeHidden();
        } else {
          await chip.focus();
          await page.keyboard.press('Space');
          await expect(panel).toBeVisible();
          await clearCredits(page, true);
          await page.keyboard.press('Enter');
          await expect(panel).toBeHidden();
        }
      });
    }

    test('150% Beebe mission keeps open credits clear of objectives and the real contact', async ({
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
        localStorage.setItem(
          'subexplorer.settings.v2',
          JSON.stringify({ version: 2, uiScale: 150, reduceMotion: true, graphicsTier: 'low' }),
        );
      });
      await page.goto(
        `/?mission=beebe-vent-field&skipBriefing=1&tier=low${layout.touch ? '&touch=1' : ''}`,
      );
      await page.waitForFunction(
        () =>
          window.__gameReady === true &&
          (window.__game as { discovery: Discovery }).discovery.loaded,
      );
      await expect(page.locator('.objectives-panel')).toBeVisible();
      await expect(page.locator('.onboard-card')).toBeVisible();
      await clearCredits(page, false);
      const chip = page.getByRole('button', { name: 'Data: GMRT credits' });
      if (layout.touch) await chip.tap();
      else await chip.click();
      await page.evaluate(() => {
        const g = window.__game as { discovery: Discovery; sub: Submarine; rig: CameraRig };
        const pose = g.discovery.spawnPose('bvf-main-vents')!;
        g.sub.reset(pose.x, pose.y, pose.z, pose.yaw);
        g.rig.snap(g.sub.position, g.sub.yaw, g.sub.pitch);
      });
      await expect(page.locator('.scan-panel')).toBeVisible();
      await clearCredits(page, true);
      await page.screenshot({ path: info.outputPath('beebe-150-credits-contact.png') });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('region', { name: 'Data attribution' })).toBeHidden();
      await expect(page.locator('.pause-menu')).toBeHidden();
    });
  });
}

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
