// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './helpers/unlocked.js';
import titanic from '../../data/landmarks/titanic/mission.json' with { type: 'json' };
import blueHole from '../../data/landmarks/great-blue-hole/mission.json' with { type: 'json' };

const shots = '.cache/codex/900-f-briefing-compact';
const viewports = [
  { width: 1600, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
];

for (const mission of [titanic, blueHole]) {
  for (const viewport of viewports) {
    test(`${mission.landmark} compact briefing ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/?mission=${mission.landmark}&tier=low`);
      await page.waitForFunction(() => window.__gameReady === true);
      await page.waitForFunction(
        () => (window.__game as { props: { loaded: boolean } }).props.loaded,
      );
      await page.evaluate(() => document.fonts.ready);
      const briefing = page.getByRole('dialog', { name: 'Mission briefing' });
      await expect(briefing).toBeVisible();
      const more = briefing.locator('.briefing-site-more');
      const summary = more.locator('summary');
      await expect(summary).toHaveText('More about this site');
      await expect(more).not.toHaveAttribute('open', '');
      for (const kind of ['facts', 'hazards']) {
        await expect(briefing.locator(`.briefing-cols .is-${kind} li`)).toHaveCount(3);
      }
      await expect(briefing.locator('.briefing-objectives li')).toHaveCount(
        mission.objectives.length,
      );
      await expect(briefing.getByRole('link', { name: 'Free dive', exact: true })).toBeVisible();
      await expect(
        briefing.getByRole('radio', { name: 'near the first target', exact: true }),
      ).toBeChecked();
      await expect(
        briefing.getByRole('radio', { name: 'at the surface', exact: true }),
      ).not.toBeChecked();
      await expect(briefing.getByRole('button', { name: 'Begin dive', exact: true })).toBeVisible();

      if (viewport.height > viewport.width || viewport.width === 1600) {
        const metrics = await briefing.locator('.briefing-panel').evaluate((panel) => ({
          scroll: panel.scrollHeight - panel.clientHeight,
          horizontal: panel.scrollWidth - panel.clientWidth,
          top: panel.getBoundingClientRect().top,
          bottom: panel.getBoundingClientRect().bottom,
        }));
        expect(metrics.scroll, 'Default briefing must fit without scrolling').toBeLessThanOrEqual(
          1,
        );
        expect(metrics.horizontal).toBeLessThanOrEqual(1);
        expect(metrics.top).toBeGreaterThanOrEqual(0);
        expect(metrics.bottom).toBeLessThanOrEqual(viewport.height);
        await expect(briefing.locator('.briefing-begin')).toBeInViewport({ ratio: 1 });
      }
      const dir = `${shots}/${viewport.width}x${viewport.height}/${mission.landmark}`;
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: `${dir}/after.png` });

      // Native disclosure keys must not trigger the briefing's Enter shortcut.
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(more).toHaveAttribute('open', '');
      await expect(briefing).toBeVisible();
      await expect(more.locator('.briefing-summary')).toHaveText(mission.briefing.summary);
      await expect(briefing.locator('.is-facts li')).toHaveText([
        ...(mission.landmark === 'titanic'
          ? [mission.briefing.facts[1], mission.briefing.facts[0], mission.briefing.facts[3]]
          : [mission.briefing.facts[0], mission.briefing.facts[1], mission.briefing.facts[3]]),
        mission.briefing.facts[2],
      ]);
      await expect(briefing.locator('.is-hazards li')).toHaveCount(mission.briefing.hazards.length);
      await expect(briefing.getByRole('button', { name: 'View controls' })).toBeVisible();
      await page.keyboard.press('Space');
      await expect(more).not.toHaveAttribute('open', '');
      await expect(briefing).toBeVisible();
      const axe = await new AxeBuilder({ page }).include('.briefing').analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

      // A focused link keeps its own Enter action and opens the same site as a free dive.
      const free = briefing.getByRole('link', { name: 'Free dive', exact: true });
      await free.focus();
      await page.keyboard.press('Enter');
      await page.waitForURL((url) => !url.searchParams.has('mission'));
      expect(new URL(page.url()).searchParams.get('tile')).toBe(mission.tile);
    });
  }

  test(`${mission.landmark} Journal preserves site details before a scan`, async ({ page }) => {
    await page.goto('/?tier=low');
    await page.waitForFunction(() => window.__gameReady === true);
    await page.locator('.home-menu').getByRole('button', { name: 'Journal', exact: true }).click();
    const journal = page.locator('.journal');
    await expect(journal.locator(`.jr-site-card[data-target="${mission.landmark}"]`)).toBeVisible();
    await journal.locator(`.jr-site-card[data-target="${mission.landmark}"]`).click();
    const more = journal.locator('.jr-site-more');
    await more.locator('summary').click();
    await expect(more.locator('.jr-para')).toHaveText(mission.briefing.summary);
    await expect(more.locator('.jr-facts-list li')).toHaveText([
      ...mission.briefing.facts,
      ...mission.briefing.hazards,
    ]);
  });
}
