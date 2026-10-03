import { expect, test } from '@playwright/test';

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const base = env.PW_BASE ?? '/';
const dive = `${base}?tile=titanic&landmark=_test&skipBriefing=1&tier=low`;

test('a deploy navigation cannot replace the installed offline shell', async ({
  page,
  context,
}) => {
  await page.goto(dive);
  await page.waitForFunction(() => window.__gameReady === true);
  // Normal automation skips registration. This test explicitly exercises the
  // production worker and waits for both installation and page control.
  await page.evaluate(async (path) => {
    await navigator.serviceWorker.register(`${path}sw.js`, { scope: path });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  }, base);
  // Fetch the site's data while controlled so offline availability is explicit.
  await page.reload();
  await page.waitForFunction(() => window.__gameReady === true);

  const nextDeploy = new URL(base, page.url()).href;
  await context.route(nextDeploy, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<h1>New deployment</h1><script src="uncached-next-deploy.js"></script>',
    }),
  );
  await page.goto(nextDeploy);
  await expect(page.getByRole('heading', { name: 'New deployment' })).toBeVisible();
  await context.unroute(nextDeploy);
  await context.setOffline(true);
  try {
    await page.goto(`${dive}&offline=1`);
    await page.waitForFunction(() => window.__gameReady === true);
    await expect(page.locator('.fatal')).toHaveCount(0);
    await expect(page.locator('#viewport')).toBeVisible();
    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  } finally {
    await context.setOffline(false);
  }
});
