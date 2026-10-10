import { expect, type Page } from '@playwright/test';
import type { Camera } from 'three';
import type { Submarine } from '../../../src/sub/Submarine.js';

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
  await expect(page.locator('.onboard-card button:visible')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();
  const metrics = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.onboard-card')!;
    const text = card.querySelector<HTMLElement>('.onboard-card-phone-text')!;
    const game = window.__game as { sub: Submarine; rig: { camera: Camera } };
    const projected = game.sub.position.clone().project(game.rig.camera);
    const x = ((projected.x + 1) / 2) * innerWidth;
    const y = ((1 - projected.y) / 2) * innerHeight;
    const r = card.getBoundingClientRect();
    const depth = document
      .querySelector('[data-field="depth"]')!
      .parentElement!.getBoundingClientRect();
    const speed = document
      .querySelector('[data-field="speed"]')!
      .parentElement!.getBoundingClientRect();
    const status = document
      .querySelector('[data-field="status"]')!
      .parentElement!.getBoundingClientRect();
    const hull = document.querySelector('.hull-gauge')!.getBoundingClientRect();
    return {
      textHeight: text.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(text).lineHeight),
      clips: text.scrollWidth > text.clientWidth || text.scrollHeight > text.clientHeight,
      coversSub: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
      depthSpeedOffset: Math.abs(depth.top - speed.top),
      statusHullOffset: Math.abs(status.top - hull.top),
      secondRowBelowFirst: status.top >= depth.bottom,
    };
  });
  expect(metrics.textHeight).toBeLessThanOrEqual(metrics.lineHeight * 2);
  expect(metrics.clips).toBe(false);
  expect(metrics.coversSub, 'tutorial must clear the projected submarine centre').toBe(false);
  expect(metrics.depthSpeedOffset).toBeLessThanOrEqual(1);
  expect(metrics.statusHullOffset).toBeLessThanOrEqual(3);
  expect(metrics.secondRowBelowFirst).toBe(true);
  if (await page.locator('.scan-panel').isVisible()) {
    await expect(page.locator('.d-scan-edge')).toBeHidden();
    await expect(page.locator('.d-scan-objective-hint')).toBeHidden();
    await expect(page.locator('.objectives-panel .obj-list')).toBeHidden();
    await expect(page.locator('.scan-hint')).toHaveText(/\S/);
  }
}
