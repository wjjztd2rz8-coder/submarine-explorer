import { openJournalCategory } from './helpers/journal.js';
import { expect, test, type Page } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import type { GameConfig } from '../../src/core/Config.js';
import type { Submarine } from '../../src/sub/Submarine.js';
import type { Terrain } from '../../src/world/Terrain.js';
import type { Discovery } from '../../src/game/Discovery.js';
import type { Mission } from '../../src/game/Mission.js';
import type { Life } from '../../src/world/life/Life.js';
import catalog from '../../data/landmarks/index.json' with { type: 'json' };

// Site-level guide entries also carry .is-site inside the expanded site's list.
const journalSites = '.jr-nav-list > li > .jr-nav-item.is-site';

interface Game {
  config: GameConfig;
  sub: Submarine;
  terrain: Terrain;
  discovery: Discovery;
  props: { loaded: boolean };
  mission: Mission | null;
  life: Life | null;
}

async function ready(page: Page, wildlife = false): Promise<void> {
  await clockFramesUntil(page, () => {
    const g = window.__game as unknown as Game | undefined;
    return !!(window.__gameReady && g?.props.loaded && g.discovery.loaded);
  });
  if (wildlife) await clockFramesUntil(page, () => !!(window.__game as unknown as Game).life);
}

async function contents(page: Page): Promise<void> {
  const toggle = page.locator('.jr-contents-toggle');
  if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false')
    await toggle.click();
}

test('1000 Journal site count excludes nested About the site entries', async ({ page }) => {
  // Reproduce the 15 / 16 / 17 matches reported by the external gate while
  // retaining the exact 13-site requirement and checking every site's identity.
  for (const entries of [2, 3, 4]) {
    await page.setContent(
      `<ul class="jr-nav-list">${catalog.landmarks
        .map(
          (id, index) => `
      <li><button class="jr-nav-item is-site" data-target="${id}">${id}</button>
        ${
          index === 0
            ? `<div class="jr-site-entries"><ul>${Array.from(
                { length: entries },
                (_, entry) => `
          <li><button class="jr-nav-item is-entry is-site" data-target="${id}/site/entry-${entry}">About the site</button></li>
        `,
              ).join('')}</ul></div>`
            : ''
        }
      </li>`,
        )
        .join('')}</ul>`,
    );
    await expect(page.locator('.jr-nav-item.is-site')).toHaveCount(13 + entries);
    await expect(page.locator(journalSites)).toHaveCount(13);
    expect(
      await page
        .locator(journalSites)
        .evaluateAll((buttons) => buttons.map((button) => (button as HTMLElement).dataset.target)),
    ).toEqual(catalog.landmarks);
  }
});

for (const viewport of [
  { width: 1600, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`1000 ${viewport.width}x${viewport.height}`, () => {
    test.use({
      viewport,
      hasTouch: viewport.width === 390,
      isMobile: viewport.width === 390,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });

    for (const tier of ['low', 'medium', 'high']) {
      for (const [site, objective, poi, name, subject] of [
        [
          'great-blue-hole',
          'stalactites',
          'great-blue-hole-stalactites',
          'Stalactite gallery',
          'stalactite gallery',
        ],
        [
          'monterey-canyon',
          'canyon-wall',
          'monterey-canyon-wall',
          'North canyon wall',
          'north wall',
        ],
      ]) {
        test(`${site} ${tier}: first scan without transit, Journal and debrief`, async ({
          page,
        }, info) => {
          test.setTimeout(240_000);
          const errors: string[] = [];
          page.on('pageerror', (e) => errors.push(e.message));
          await pauseClockBeforeNavigation(page);
          await page.goto(`/?mission=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42`);
          await ready(page);
          await page.locator('.briefing-begin').click();
          await page.clock.fastForward(34);
          const start = await page.evaluate(() => {
            const g = window.__game as unknown as Game;
            return {
              position: g.sub.position.toArray(),
              first: g.mission!.requiredPrimaries()[0].id,
            };
          });
          expect(start.first).toBe(objective);
          await page.keyboard.down('g');
          let seconds = 0;
          let complete = false;
          let minimumClearance = Infinity;
          try {
            while (!complete && seconds < 120) {
              // Six physics steps fit below the engine's eight-step frame cap.
              await page.clock.fastForward(100);
              seconds += 0.1;
              const state = await page.evaluate(() => {
                const g = window.__game as unknown as Game;
                return {
                  complete: g.mission!.requiredPrimaries()[0].complete,
                  clearance:
                    g.sub.position.y - g.terrain.sampleHeight(g.sub.position.x, g.sub.position.z),
                  floor: g.config.submarine.hullRadius + g.config.submarine.seabedClearance,
                };
              });
              minimumClearance = Math.min(minimumClearance, state.clearance);
              expect(state.clearance).toBeGreaterThanOrEqual(state.floor - 1e-6);
              complete = state.complete;
            }
          } finally {
            await page.keyboard.up('g');
          }
          expect(complete, 'scan completes in at most two minutes of game frames').toBe(true);
          const end = await page.evaluate(() =>
            (window.__game as unknown as Game).sub.position.toArray(),
          );
          const transit = Math.hypot(...end.map((p, i) => p - start.position[i]));
          expect(transit).toBeLessThan(30);
          await info.attach('first-scan', {
            body: JSON.stringify({ site, tier, viewport, seconds, transit, minimumClearance, poi }),
            contentType: 'application/json',
          });
          await page.screenshot({ path: info.outputPath('first-scan.png') });

          await page.keyboard.press('j');
          await page.clock.fastForward(34);
          await expect(page.locator(journalSites)).toHaveCount(13);
          await contents(page);
          await page.locator(`${journalSites}[data-target="${site}"]`).click();
          await page.locator('.jr-site-more summary').click();
          await expect(page.locator('.jr-body')).toContainText(subject);
          await page.locator('.jr-close').click();
          await page.keyboard.press('Escape');
          await page.clock.fastForward(34);
          await page.locator('.pause-surface').click();
          await expect(page.locator('.mission-debrief .debrief-highlight')).toContainText(name);
          await page.screenshot({ path: info.outputPath('debrief.png') });
          expect(errors).toEqual([]);
        });
      }

      for (const [site, species, expectedCount] of [
        ['challenger-deep', 'hadal-amphipod', tier === 'low' ? 12 : 18],
        ['endurance', 'anemone', tier === 'low' ? 5 : 8],
      ] as const) {
        test(`${site} ${tier}: first minute, one Journal tag and life=0`, async ({
          page,
        }, info) => {
          test.setTimeout(300_000);
          const errors: string[] = [];
          page.on('pageerror', (e) => errors.push(e.message));
          await pauseClockBeforeNavigation(page);
          const url = `/?tile=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42`;
          await page.goto(url);
          await ready(page, true);
          await page.clock.fastForward(250);
          const count = await page.evaluate(
            (species) =>
              (window.__game as unknown as Game)
                .life!.sim.groups.filter((g) => g.def.id === species)
                .reduce((n, g) => n + g.members.length, 0),
            species,
          );
          expect(count).toBeGreaterThanOrEqual(expectedCount);
          await page.screenshot({ path: info.outputPath('opening.png') });
          let minimumClearance = Infinity;
          for (let frame = 0; frame < 600; frame++) {
            await page.clock.fastForward(100);
            const state = await page.evaluate(() => {
              const g = window.__game as unknown as Game;
              return {
                clearance:
                  g.sub.position.y - g.terrain.sampleHeight(g.sub.position.x, g.sub.position.z),
                floor: g.config.submarine.hullRadius + g.config.submarine.seabedClearance,
                breached: g.sub.hullBreached,
              };
            });
            minimumClearance = Math.min(minimumClearance, state.clearance);
            expect(state.clearance).toBeGreaterThanOrEqual(state.floor - 1e-6);
            expect(state.breached).toBe(false);
          }
          await info.attach('first-minute', {
            body: JSON.stringify({ site, tier, viewport, count, minimumClearance }),
            contentType: 'application/json',
          });
          await page.screenshot({ path: info.outputPath('60-seconds.png') });
          await page.keyboard.press('j');
          await page.clock.fastForward(34);
          await expect(page.locator(journalSites)).toHaveCount(13);
          await page.locator('.jr-spoilers input').check();
          await contents(page);
          await openJournalCategory(page, site, 'life');
          await page.locator(`.jr-nav-item[data-target="${site}/life/${species}"]`).click();
          const tags = page.locator('.jr-title-row .jr-tag:not(.is-undiscovered)');
          await expect(tags).toHaveCount(1);
          await expect(tags).toHaveText('Game addition');
          await page.screenshot({ path: info.outputPath('journal.png') });

          await page.goto(`${url}&life=0`);
          await ready(page);
          await page.clock.fastForward(1000);
          const disabled = await page.evaluate(() => {
            const g = window.__game as unknown as Game;
            return { life: g.life, targets: g.discovery.scanner.getExtraTargets().length };
          });
          expect(disabled).toEqual({ life: null, targets: 0 });
          expect(errors).toEqual([]);
        });
      }
    }
  });
}
