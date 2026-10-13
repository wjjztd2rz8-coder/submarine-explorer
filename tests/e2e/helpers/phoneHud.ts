import { expect, type Page } from '@playwright/test';
import type { Camera } from 'three';
import type { Submarine } from '../../../src/sub/Submarine.js';
import type { Save } from '../../../src/core/Save.js';

/** The phone scan card owns the active instruction while a contact is in range. */
export async function expectObjectiveGuidance(page: Page, touch: boolean): Promise<void> {
  const current = page.locator('.obj-item[aria-current="step"]');
  if (touch && (await page.locator('.scan-panel').isVisible())) {
    await expect(current).toBeHidden();
    await expect(page.locator('.scan-name')).toHaveText(/\S/);
    await expect(page.locator('.scan-hint')).toHaveText(/\S/);
  } else await expect(current).toBeVisible();
}

/** Measure actual text and camera projection; do not guess the sub's screen centre. */
export async function expectCompactPhoneHud(page: Page): Promise<void> {
  await expect(page.locator('.d-sonar-legend')).toBeHidden();
  const landscape = (page.viewportSize()?.width ?? 0) > (page.viewportSize()?.height ?? 0);
  expect((await page.locator('.sonar').boundingBox())!.width).toBe(landscape ? 120 : 96);
  await expect(page.locator('.d2-sonar-controls')).toBeHidden();
  // The tutorial card yields to the scan card, so its own checks run only while it is up.
  const tutorialUp = await page.locator('.onboard-card').isVisible();
  if (tutorialUp) {
    await expect(page.locator('.onboard-card button:visible')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();
  }
  const metrics = await page.evaluate((tutorialUp) => {
    const game = window.__game as { sub: Submarine; rig: { camera: Camera } };
    const depth = document
      .querySelector('[data-field="depth"]')!
      .parentElement!.getBoundingClientRect();
    const speed = document
      .querySelector('[data-field="speed"]')!
      .parentElement!.getBoundingClientRect();
    const hull = document.querySelector('.hull-gauge')!.getBoundingClientRect();
    let card: {
      textHeight: number;
      lineHeight: number;
      clips: boolean;
      coversSub: boolean;
    } | null = null;
    if (tutorialUp) {
      const root = document.querySelector<HTMLElement>('.onboard-card')!;
      const text = root.querySelector<HTMLElement>('.onboard-card-phone-text')!;
      const projected = game.sub.position.clone().project(game.rig.camera);
      const x = ((projected.x + 1) / 2) * innerWidth;
      const y = ((1 - projected.y) / 2) * innerHeight;
      const r = root.getBoundingClientRect();
      card = {
        textHeight: text.getBoundingClientRect().height,
        lineHeight: parseFloat(getComputedStyle(text).lineHeight),
        clips: text.scrollWidth > text.clientWidth || text.scrollHeight > text.clientHeight,
        coversSub: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
      };
    }
    return {
      card,
      depthSpeedOffset: Math.abs(depth.top - speed.top),
      hullBelowFirstRow: hull.top >= depth.bottom,
    };
  }, tutorialUp);
  if (metrics.card) {
    expect(metrics.card.textHeight).toBeLessThanOrEqual(metrics.card.lineHeight * 2);
    expect(metrics.card.clips).toBe(false);
    expect(metrics.card.coversSub, 'tutorial must clear the projected submarine centre').toBe(
      false,
    );
  }
  expect(metrics.depthSpeedOffset).toBeLessThanOrEqual(1);
  expect(metrics.hullBelowFirstRow).toBe(true);
  if (await page.locator('.scan-panel').isVisible()) {
    // Dim cards describe a distant/logged contact; their waypoint still leads the approach.
    // An active scan prompt owns guidance and suppresses the duplicate edge readout.
    const navigation = await page.evaluate(() => {
      const g = window.__game as {
        scanner: { view: { objectiveId: string | null } };
        save: Save;
        mission: { objectives: Array<{ poiId: string; title: string }> } | null;
      };
      const id = g.scanner.view.objectiveId;
      const approach =
        g.mission?.objectives.find((o) => o.poiId === id)?.title.startsWith('Head to ') ?? false;
      return id !== null && (g.save.get().gameplay.visualHints || approach);
    });
    if ((await page.locator('.scan-panel').getAttribute('data-tone')) === 'dim' && navigation) {
      await expect(page.locator('.d-scan-edge')).toBeVisible();
      await expect(page.locator('.d-scan-edge')).toHaveText(/\S/);
    } else await expect(page.locator('.d-scan-edge')).toBeHidden();
    await expect(page.locator('.d-scan-objective-hint')).toBeHidden();
    await expect(page.locator('.objectives-panel .obj-list')).toBeHidden();
    await expect(page.locator('.scan-hint')).toHaveText(/\S/);
  }
}
