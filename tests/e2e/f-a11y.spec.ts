import AxeBuilder from '@axe-core/playwright';
import type * as THREE from 'three';
import { expect, test, type Page, type Locator } from './helpers/unlocked.js';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true);
}

/** Walk every available control in DOM order, then wrap in both directions. */
async function cycle(page: Page, root: Locator): Promise<void> {
  const controls = root.locator('button, a[href], input, select, textarea, [tabindex]');
  const indices = await controls.evaluateAll((nodes) =>
    nodes.flatMap((node, index) => {
      const el = node as HTMLElement;
      return el.tabIndex >= 0 &&
        !el.closest('[hidden], [inert]') &&
        el.getClientRects().length &&
        getComputedStyle(el).visibility === 'visible' &&
        !(el as HTMLButtonElement).disabled
        ? [index]
        : [];
    }),
  );
  expect(indices.length).toBeGreaterThan(0);
  await controls.nth(indices[0]!).focus();
  for (const index of indices) {
    const control = controls.nth(index);
    await expect(control).toBeFocused();
    expect(await control.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
    await page.keyboard.press('Tab');
  }
  await expect(controls.nth(indices[0]!)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(controls.nth(indices[indices.length - 1]!)).toBeFocused();
}

test('system and saved reduced motion apply live to camera, particles, warnings and shutter', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page, '/?tile=titanic&tier=medium');
  const reduced = (): Promise<boolean> =>
    page.evaluate(() => (window.__game as { rig: { reduceMotion: boolean } }).rig.reduceMotion);
  await expect.poll(reduced).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');

  async function drawnParticles(): Promise<number> {
    await page.evaluate(() => {
      const g = window.__game as { renderer: THREE.WebGLRenderer; scene: THREE.Scene };
      const render = g.renderer.render;
      const probe = window as unknown as { drawnParticles?: number };
      delete probe.drawnParticles;
      g.renderer.render = function (scene, camera) {
        if (scene === g.scene) {
          let count = 0;
          scene.traverseVisible((object) => {
            if ((object as THREE.Points).isPoints) count++;
          });
          probe.drawnParticles = count;
          g.renderer.render = render;
        }
        render.call(this, scene, camera);
      };
    });
    await page.waitForFunction(
      () => typeof (window as unknown as { drawnParticles?: number }).drawnParticles === 'number',
    );
    return page.evaluate(() => (window as unknown as { drawnParticles: number }).drawnParticles);
  }
  expect(await drawnParticles()).toBe(0);
  await page.keyboard.press('p');
  await expect(page.locator('.photo-mode')).toBeVisible();
  await page.evaluate(() =>
    (window.__game as { photoMode: { shutter(): void } }).photoMode.shutter(),
  );
  await expect(page.locator('.d2-photo-flash')).not.toHaveClass(/is-active/);
  await page.keyboard.press('Escape');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(reduced).toBe(false);
  expect(await drawnParticles()).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await page
    .getByRole('dialog', { name: 'Pause menu' })
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  await page.getByLabel('Reduce motion').check();
  await expect.poll(reduced).toBe(true);
  expect(await drawnParticles()).toBe(0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const warning = document.querySelector<HTMLElement>('.hud-warning')!;
    warning.hidden = false;
    warning.textContent = 'Hull pressure warning';
  });
  await expect(page.locator('.hud-warning')).toHaveCSS('animation-name', 'none');
  await page.reload();
  await page.waitForFunction(() => window.__gameReady === true);
  await expect.poll(reduced).toBe(true);
});

test('home menus and nested dialogs cycle visibly, close with Escape, and restore their opener', async ({
  page,
}) => {
  await boot(page, '/?tier=low');
  // A tier-only URL is the home screen.
  const home = page.locator('.home-screen');
  await expect(home).toBeVisible();
  await cycle(page, home);
  for (const [name, selector] of [
    ['Journal', '.journal'],
    ['Settings', '.settings'],
    ['Controls', '.settings'],
    ['Upgrades', '.upgrades'],
  ]) {
    const opener = home.getByRole('button', { name, exact: true });
    await opener.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator(selector!);
    await expect(dialog).toBeVisible();
    await cycle(page, dialog);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  }
  for (const name of ['Dive sites', 'Free dive']) {
    await home.getByRole('button', { name, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.home-sites')).toBeVisible();
    await cycle(page, home);
    await page.keyboard.press('Escape');
    await expect(page.locator('.home-sites')).toBeHidden();
  }
});

test('briefing, pause details, controls, globe, photo and debrief remain keyboard reachable', async ({
  page,
}) => {
  await boot(page, '/?mission=titanic&tier=low');
  const briefing = page.locator('.briefing');
  await cycle(page, briefing);
  const contrast = await new AxeBuilder({ page })
    .include('.briefing')
    .withRules(['color-contrast', 'button-name'])
    .analyze();
  expect(contrast.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(briefing).toBeHidden();
  await expect(page.locator('.home-screen')).toBeVisible();
  await boot(page, '/?mission=titanic&tier=low&skipBriefing=1');
  await page.keyboard.press('Escape');
  const pause = page.locator('.pause-menu');
  // Regression: CSS-hidden and negative-tabindex controls must not interrupt Tab.
  await pause.evaluate((root) => {
    const hidden = document.createElement('button');
    hidden.style.display = 'none';
    const skipped = document.createElement('button');
    skipped.tabIndex = -1;
    root.prepend(hidden, skipped);
  });
  await cycle(page, pause);
  for (const name of ['Objectives', 'Mission select']) {
    await pause.getByRole('button', { name, exact: true }).focus();
    await page.keyboard.press('Enter');
    await cycle(page, pause);
    await page.keyboard.press('Escape');
    await expect(page.locator('.pause-actions')).toBeVisible();
  }
  const controls = pause.getByRole('button', { name: 'Controls', exact: true });
  await controls.focus();
  await page.keyboard.press('Enter');
  await cycle(page, page.locator('.controls-card'));
  await page.keyboard.press('Escape');
  await expect(controls).toBeFocused();
  const journal = pause.getByRole('button', { name: 'Journal', exact: true });
  await journal.focus();
  await page.keyboard.press('Enter');
  await cycle(page, page.locator('.journal'));
  const journalContrast = await new AxeBuilder({ page })
    .include('.journal')
    .withRules(['color-contrast', 'button-name'])
    .analyze();
  expect(journalContrast.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(journal).toBeFocused();
  await page.keyboard.press('Escape');
  await page.keyboard.press('g');
  await cycle(page, page.locator('.globe:not(.is-embedded)'));
  await page.keyboard.press('Escape');
  await page.keyboard.press('p');
  await cycle(page, page.locator('.photo-mode'));
  await page.keyboard.press('Escape');
  await expect(page.locator('.photo-mode')).toBeHidden();
  const hud = await new AxeBuilder({ page })
    .include('.hud')
    .withRules(['color-contrast', 'button-name'])
    .analyze();
  expect(hud.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await pause.getByRole('button', { name: 'Surface and debrief' }).focus();
  await page.keyboard.press('Enter');
  await cycle(page, page.locator('.mission-debrief'));
  await page.keyboard.press('Escape');
  await expect(page.locator('.mission-debrief')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Sonar zoom in' })).toHaveAttribute(
    'aria-label',
    'Sonar zoom in',
  );
  await expect(page.getByRole('button', { name: 'Sonar zoom out' })).toHaveAttribute(
    'aria-label',
    'Sonar zoom out',
  );
});
