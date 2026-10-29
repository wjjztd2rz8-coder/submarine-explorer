import { expect, type Page } from '@playwright/test';
import { GUIDANCE } from './guidance.js';
import type { Camera } from 'three';
import type { Submarine } from '../../../src/sub/Submarine.js';
import type { Save } from '../../../src/core/Save.js';

/** Shared composed-HUD guard: world labels participate alongside fixed regions and controls. */
export async function expectHudClear(page: Page, phase: string): Promise<void> {
  const issues = await page.evaluate(() => {
    const selectors = [
      '.sonar',
      '.objectives-panel',
      '.hud-readouts',
      '.guidance-slot',
      '.d-scan-edge',
      '.tc-stick',
      '.tc-slider',
      '.tc-btn-scan',
      '.tc-btn-lights',
      '.tc-btn-sonar',
      '.tc-btn-photo',
      '.tc-btn-pause',
      '.hud-journal',
      '.hud-reset-camera',
    ];
    const boxes = selectors.flatMap((selector) => {
      const el = document.querySelector<HTMLElement>(selector);
      return el?.checkVisibility({ checkVisibilityCSS: true })
        ? [{ selector, box: el.getBoundingClientRect() }]
        : [];
    });
    const issues: string[] = [];
    for (const { selector, box } of boxes) {
      if (box.x < 0 || box.y < 0 || box.right > innerWidth || box.bottom > innerHeight)
        issues.push(`${selector} offscreen: ${JSON.stringify(box)}`);
    }
    for (const [i, a] of boxes.entries()) {
      for (const b of boxes.slice(i + 1)) {
        if (
          a.box.left < b.box.right &&
          b.box.left < a.box.right &&
          a.box.top < b.box.bottom &&
          b.box.top < a.box.bottom
        )
          issues.push(`${a.selector} overlaps ${b.selector}: ${JSON.stringify([a.box, b.box])}`);
      }
    }
    for (const el of document.querySelectorAll<HTMLElement>(
      '.d-scan-edge-name, .d-scan-edge-info',
    )) {
      if (
        el.checkVisibility() &&
        (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
      )
        issues.push(`Clipped waypoint text: ${el.innerText}`);
    }
    return issues;
  });
  expect.soft(issues, phase).toEqual([]);
}

/** Phones have no objectives list: the guidance slot always names what to do or where to go. */
export async function expectObjectiveGuidance(page: Page, touch: boolean): Promise<void> {
  if (touch) {
    await expect(page.locator(GUIDANCE.any)).toBeVisible();
    await expect(page.locator(GUIDANCE.name)).toHaveText(/\S/);
  } else await expect(page.locator('.obj-item[aria-current="step"]')).toBeVisible();
}

/** Measure actual text and camera projection; do not guess the sub's screen centre. */
export async function expectCompactPhoneHud(page: Page): Promise<void> {
  await expect(page.locator('.d-sonar-legend')).toHaveCount(0);
  const landscape = (page.viewportSize()?.width ?? 0) > (page.viewportSize()?.height ?? 0);
  expect((await page.locator('.sonar').boundingBox())!.width).toBe(landscape ? 120 : 96);
  await expect(page.locator('.d2-sonar-controls')).toBeHidden();
  // The tutorial card yields to the scan card, so its own checks run only while it is up.
  const tutorialUp = await page.locator('.guidance-slot[data-step]').isVisible();
  if (tutorialUp) {
    await expect(page.locator('.guidance-slot[data-step] button:visible')).toHaveCount(1);
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
    const gauge = document.querySelector<HTMLElement>('.hull-gauge')!;
    const hull = gauge.hidden ? null : gauge.getBoundingClientRect();
    let card: {
      textHeight: number;
      lineHeight: number;
      clips: boolean;
      coversSub: boolean;
    } | null = null;
    if (tutorialUp) {
      const root = document.querySelector<HTMLElement>('.guidance-slot[data-step]')!;
      const text = root.querySelector<HTMLElement>('.guidance-name')!;
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
      hullBelowFirstRow: hull ? hull.top >= depth.bottom : true,
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
  if (await page.locator(GUIDANCE.any).isVisible()) {
    // The scan card and its reticle lead while a contact is in range, so the waypoint
    // label waits; every other message leaves the label to lead the approach.
    const kind = await page.locator(GUIDANCE.any).getAttribute('data-kind');
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
    if (kind !== 'scan' && navigation) {
      await expect(page.locator('.d-scan-edge')).toBeVisible();
      await expect(page.locator('.d-scan-edge')).toHaveText(/\S/);
    } else await expect(page.locator('.d-scan-edge')).toBeHidden();
    // Phones carry no objectives list: the slot names the target.
    await expect(page.locator('.objectives-panel')).toBeHidden();
    await expect(page.locator(GUIDANCE.name)).toHaveText(/\S/);
  }
}
