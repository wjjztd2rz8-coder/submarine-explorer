import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * C5 settings screen (docs/settings.md), end to end:
 *  (a) O opens it and the game freezes (a held key moves nothing); settings
 *      apply live; a rebinding conflict unbinds the loser; Escape closes;
 *      after a reload settings and the displaced binding persist, and
 *      captions show a sonar ping.
 *  (b) the HUD hint opens it; Tab stays inside; axe finds no violations.
 *  (c) over the mission briefing it swallows Enter (the dive does not start).
 */

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
}

async function subPos(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const p = (window.__game as { sub: { position: { x: number; y: number; z: number } } }).sub
      .position;
    return [p.x, p.y, p.z];
  });
}

interface Probe {
  open: boolean;
  reduceMotion: boolean;
  palette: string;
  captions: boolean;
  boost: string[];
  ahead: string[];
}

async function probe(page: Page): Promise<Probe> {
  return page.evaluate(() => {
    const g = window.__game as {
      settings: { isOpen: boolean };
      rig: { reduceMotion: boolean };
      sonar: { paletteName: string };
      captions: { enabled: boolean };
      input: { getAction(id: string): { keys: string[] } | undefined };
    };
    return {
      open: g.settings.isOpen,
      reduceMotion: g.rig.reduceMotion,
      palette: g.sonar.paletteName,
      captions: g.captions.enabled,
      boost: g.input.getAction('boost')?.keys ?? [],
      ahead: g.input.getAction('thrustForward')?.keys ?? [],
    };
  });
}

test.describe('settings screen', () => {
  test('O opens and freezes; changes apply and persist; conflicts survive reload', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await boot(page, '/');
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeHidden();

    await page.keyboard.press('KeyO');
    await expect(dialog).toBeVisible();
    expect((await probe(page)).open).toBe(true);

    // Frozen: holding thrust and flood for a second moves nothing.
    const before = await subPos(page);
    await page.keyboard.down('KeyW');
    await page.keyboard.down('ShiftLeft');
    await page.waitForTimeout(1000);
    await page.keyboard.up('ShiftLeft');
    await page.keyboard.up('KeyW');
    expect(await subPos(page)).toEqual(before);

    // Settings apply live.
    await dialog.getByLabel('Reduce motion').check();
    await dialog.getByLabel('Captions for sounds').check();
    await dialog.getByLabel('Sonar map colours').selectOption('highContrast');
    let p = await probe(page);
    expect(p.reduceMotion).toBe(true);
    expect(p.captions).toBe(true);
    expect(p.palette).toBe('highContrast');

    // Rebind Ahead to X, which Boost holds: Boost becomes unbound.
    await dialog.locator('[data-action="thrustForward"]').click();
    await expect(dialog.locator('[data-action="thrustForward"]')).toHaveText('Press a key…');
    await page.keyboard.press('KeyX');
    await expect(dialog.locator('[data-action="boost"]')).toHaveText('Unbound');
    await expect(dialog.locator('.settings-status')).toContainText('Boost, which is now unbound');
    p = await probe(page);
    expect(p.ahead).toEqual(['KeyX', 'ArrowUp']);
    expect(p.boost).toEqual([]);
    await page.screenshot({ path: 'tests/e2e/screenshots/settings.png' });

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect((await probe(page)).open).toBe(false);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
    p = await probe(page);
    expect(p).toMatchObject({
      open: false,
      reduceMotion: true,
      captions: true,
      palette: 'highContrast',
      boost: [],
      ahead: ['KeyX', 'ArrowUp'],
    });
    await expect(page.locator('.hud-help')).toContainText('X/S thrust');

    // Captions: the first key press unlocks audio, then Q pings.
    await page.keyboard.press('KeyQ');
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyQ');
    await expect(page.locator('.captions .caption-line')).toContainText('Sonar ping');

    expect(errors).toEqual([]);
  });

  test('HUD hint opens it; focus stays inside; no axe violations', async ({ page }) => {
    await boot(page, '/');
    await page.locator('.hud-help-link').click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 40; i++) await page.keyboard.press('Tab');
    const inside = await page.evaluate(
      () => document.querySelector('.settings')?.contains(document.activeElement) ?? false,
    );
    expect(inside).toBe(true);

    const axe = await new AxeBuilder({ page }).include('.settings').analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await dialog.getByRole('button', { name: 'Close (Esc)' }).click();
    await expect(dialog).toBeHidden();
  });

  test('over the mission briefing it keeps Enter from starting the dive', async ({ page }) => {
    await boot(page, '/?mission=titanic');
    await expect(page.locator('.briefing')).toBeVisible();
    await page.keyboard.press('KeyO');
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const state = await page.evaluate(
      () => (window.__game as { mission: { state: string } }).mission.state,
    );
    expect(state).toBe('briefing');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('.briefing')).toBeVisible();
  });

  test('reset discoveries confirms, preserves other saves, and refreshes this dive', async ({
    page,
  }) => {
    await boot(page, '/?mission=titanic&skipBriefing=1');
    await page.evaluate(() => {
      localStorage.setItem(
        'subexplorer.discoveries.v1',
        JSON.stringify({
          version: 1,
          discovered: { 'titanic/test': { at: '2026-01-01T00:00:00.000Z', count: 2 } },
          stats: { scans: 2, firstAt: '2026-01-01T00:00:00.000Z' },
        }),
      );
      localStorage.setItem(
        'subexplorer.settings.v1',
        JSON.stringify({
          version: 1,
          graphicsTier: 'medium',
          postFx: true,
          detailStrength: 1,
          simSpeedDefault: 0,
          reduceMotion: true,
          captions: false,
          sonarPalette: 'default',
        }),
      );
      localStorage.setItem(
        'subexplorer.bindings.v1',
        JSON.stringify({
          version: 1,
          keys: { toggleSettings: ['KeyO'] },
        }),
      );
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true);
    expect(
      await page.evaluate(() =>
        (window.__game as { discoveries: { keys(): string[] } }).discoveries.keys(),
      ),
    ).toContain('titanic/test');

    await page.keyboard.press('KeyO');
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('button', { name: 'Reset settings' }).click();
    expect(
      await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1')),
    ).not.toBeNull();
    expect(
      await page.evaluate(() => localStorage.getItem('subexplorer.bindings.v1')),
    ).not.toBeNull();
    await dialog.getByLabel('Reduce motion').check();
    await dialog.getByRole('button', { name: 'Reset discoveries' }).click();
    await expect(dialog).toContainText('Your settings and key bindings stay saved');
    await page.screenshot({ path: 'test-results-settings-closeout/settings-confirm.png' });
    const axe = await new AxeBuilder({ page }).include('.settings').analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    expect(
      await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1')),
    ).not.toBeNull();
    await dialog.getByRole('button', { name: 'Reset discoveries' }).click();
    const reloaded = page.waitForEvent('load');
    await dialog.getByRole('button', { name: 'Clear discoveries' }).click();
    await reloaded;
    await page.waitForFunction(() => window.__gameReady === true);
    expect(new URL(page.url()).search).toBe('?mission=titanic&skipBriefing=1');
    const saved = await page.evaluate(() => ({
      discoveries: localStorage.getItem('subexplorer.discoveries.v1'),
      settings: localStorage.getItem('subexplorer.settings.v1'),
      bindings: localStorage.getItem('subexplorer.bindings.v1'),
      keys: (window.__game as { discoveries: { keys(): string[] } }).discoveries.keys(),
    }));
    expect(saved.discoveries).toBeNull();
    expect(saved.settings).toContain('reduceMotion');
    expect(saved.bindings).toContain('toggleSettings');
    expect(saved.keys).toEqual([]);
  });

  test('Apply and reload uses saved boot settings and respects the tier URL override', async ({
    page,
  }) => {
    await boot(page, '/?tile=challenger-deep&tier=low');
    await page.keyboard.press('KeyO');
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByLabel('Graphics tier').selectOption('high');
    await expect(dialog.getByRole('button', { name: 'Apply and reload' })).toBeHidden();
    await dialog.getByLabel('Terrain detail on top of the survey data').fill('0.5');
    await dialog.getByLabel('Default sim speed').selectOption('2');
    await dialog.getByRole('button', { name: 'Apply and reload' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results-settings-closeout/settings-apply.png' });
    const reloaded = page.waitForEvent('load');
    await dialog.getByRole('button', { name: 'Apply and reload' }).click();
    await reloaded;
    await page.waitForFunction(() => window.__gameReady === true);
    expect(new URL(page.url()).search).toBe('?tile=challenger-deep&tier=low');
    const applied = await page.evaluate(() => {
      const g = window.__game as {
        config: { terrain: { detailStrength: number } };
        sub: { simSpeed: number };
        save: { get(): { graphicsTier: string } };
      };
      return {
        detail: g.config.terrain.detailStrength,
        speed: g.sub.simSpeed,
        savedTier: g.save.get().graphicsTier,
      };
    });
    expect(applied).toEqual({ detail: 0.5, speed: 2, savedTier: 'high' });
    await page.keyboard.press('KeyO');
    await expect(dialog.getByRole('button', { name: 'Apply and reload' })).toBeHidden();
  });

  test('reset reports protected and inaccessible discovery storage honestly', async ({ page }) => {
    await boot(page, '/');
    const newer = JSON.stringify({ version: 2, discovered: { future: true } });
    await page.evaluate(
      (value) => localStorage.setItem('subexplorer.discoveries.v1', value),
      newer,
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true);
    await page.keyboard.press('KeyO');
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('button', { name: 'Reset discoveries' }).click();
    await dialog.getByRole('button', { name: 'Clear discoveries' }).click();
    await expect(dialog.locator('.settings-status')).toContainText('newer version');
    expect(await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1'))).toBe(
      newer,
    );

    // A newer save may arrive from another tab after this dive has booted.
    await page.evaluate(() => localStorage.removeItem('subexplorer.discoveries.v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true);
    await page.evaluate(
      (value) => localStorage.setItem('subexplorer.discoveries.v1', value),
      newer,
    );
    await page.keyboard.press('KeyO');
    await dialog.getByRole('button', { name: 'Reset discoveries' }).click();
    await dialog.getByRole('button', { name: 'Clear discoveries' }).click();
    await expect(dialog.locator('.settings-status')).toContainText('newer version');
    expect(await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1'))).toBe(
      newer,
    );

    await page.evaluate(() => {
      localStorage.setItem(
        'subexplorer.discoveries.v1',
        JSON.stringify({
          version: 1,
          discovered: { 'titanic/test': true },
          stats: { scans: 1 },
        }),
      );
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true);
    await page.evaluate(() => {
      const original = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key: string) {
        if (key === 'subexplorer.discoveries.v1') throw new Error('denied');
        return original.call(this, key);
      };
    });
    await page.keyboard.press('KeyO');
    await dialog.getByRole('button', { name: 'Reset discoveries' }).click();
    await dialog.getByRole('button', { name: 'Clear discoveries' }).click();
    await expect(dialog.locator('.settings-status')).toContainText('Nothing was reset');
    expect(
      await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1')),
    ).not.toBeNull();
  });

  test('protected settings cannot be offered as a reloadable change', async ({ page }) => {
    await boot(page, '/');
    const newer = JSON.stringify({ version: 2, detailStrength: 0.25 });
    await page.evaluate((value) => localStorage.setItem('subexplorer.settings.v1', value), newer);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true);
    await page.keyboard.press('KeyO');
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByLabel('Terrain detail on top of the survey data').fill('0.5');
    await expect(dialog.getByRole('button', { name: 'Apply and reload' })).toBeHidden();
    await expect(dialog.locator('.settings-reload-note')).toContainText('newer version');
    await dialog.getByRole('button', { name: 'Reset settings' }).click();
    await expect(dialog.locator('.settings-status')).toContainText(
      'newer saved version was left intact',
    );
    expect(await page.evaluate(() => localStorage.getItem('subexplorer.settings.v1'))).toBe(newer);
  });
});
