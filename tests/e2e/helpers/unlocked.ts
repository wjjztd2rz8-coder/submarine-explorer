import { test as base } from '@playwright/test';
export * from '@playwright/test';

/** Existing feature specs use an experienced pilot. Fresh-player progression is covered separately. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        const key = 'subexplorer.progress.v1';
        if (!localStorage.getItem(key))
          localStorage.setItem(
            key,
            JSON.stringify({
              version: 1,
              points: 0,
              lifetime: 900,
              awarded: [],
              upgrades: {},
              ratings: {},
            }),
          );
        // F3-ONBOARD: experienced pilots have finished the tutorial and seen the hints.
        const onboard = 'subexplorer.onboard.v1';
        if (!localStorage.getItem(onboard))
          localStorage.setItem(
            onboard,
            JSON.stringify({
              version: 1,
              tutorialDone: true,
              seenHints: ['battery-low', 'near-hull', 'scan-target', 'creature', 'rov'],
            }),
          );
      } catch {
        /* Storage-failure specs deliberately deny access. */
      }
    });
    await use(page);
  },
});
