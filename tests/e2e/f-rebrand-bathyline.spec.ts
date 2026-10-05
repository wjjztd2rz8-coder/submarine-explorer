// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/f-rebrand-bathyline';
test.use({ hasTouch: true, deviceScaleFactor: 1 });
test.beforeEach(async () => {
  await mkdir(shots, { recursive: true });
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
]) {
  test(`Bathyline title and Journal ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gameReady === true);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window.__game as { titleScene: { terrainReady: boolean } }).titleScene.terrainReady,
        ),
      )
      .toBe(true);
    await expect(page.locator('.home-screen')).toHaveClass(/has-title-scene/);
    await expect(page).toHaveTitle('Bathyline');
    await expect(page.locator('.home-screen h1')).toHaveText('Bathyline');
    await expect(page.locator('.home-mark')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.home-screen')).not.toContainText(
      /Submarine Explorer|illustrative|reconstructed/i,
    );
    await page.evaluate(() => document.fonts.ready);
    const heading = await page.locator('.home-brand').boundingBox();
    expect(heading).not.toBeNull();
    expect(heading!.x).toBeGreaterThanOrEqual(0);
    expect(heading!.x + heading!.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: `${shots}/title-${viewport.width}x${viewport.height}.png` });

    const journal = page.getByRole('button', { name: 'Journal', exact: true });
    await journal.scrollIntoViewIfNeeded();
    const target = await journal.boundingBox();
    expect(target!.width).toBeGreaterThanOrEqual(44);
    expect(target!.height).toBeGreaterThanOrEqual(44);
    await journal.tap();
    await expect(page.getByRole('dialog', { name: 'Journal', exact: true })).toBeVisible();
    await expect(page.locator('.jr-kicker')).toHaveText('Journal');
    await expect(page.locator('.journal')).not.toContainText('Submarine Explorer');
    await page.screenshot({ path: `${shots}/journal-${viewport.width}x${viewport.height}.png` });
  });
}

test('metadata, portable logo variants and maskable safe circle', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Bathyline');
  for (const selector of [
    'meta[name="application-name"]',
    'meta[name="apple-mobile-web-app-title"]',
    'meta[property="og:site_name"]',
  ])
    await expect(page.locator(selector)).toHaveAttribute('content', 'Bathyline');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Bathyline: Explore the real deep.',
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    'Bathyline: Explore the real deep.',
  );
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestResponse = await request.get(manifestHref!);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as {
    name: string;
    short_name: string;
    icons: Array<{ src: string; sizes: string; purpose: string }>;
  };
  expect(manifest.name).toBe('Bathyline');
  expect(manifest.short_name).toBe('Bathyline');
  expect(manifest.icons.filter((icon) => icon.purpose === 'maskable')).toHaveLength(2);
  for (const icon of manifest.icons) {
    const src = new URL(icon.src, new URL(manifestHref!, page.url())).href;
    const result = await page.evaluate(
      async ({ src, maskable }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let painted = 0;
        let transparent = 0;
        let outside = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] !== 255) transparent++;
          // Ignore antialiasing noise below 10 levels above the navy background.
          if (pixels[i] > 16 || pixels[i + 1] > 29 || pixels[i + 2] > 41) {
            painted++;
            const x = ((i / 4) % canvas.width) + 0.5 - canvas.width / 2;
            const y = Math.floor(i / 4 / canvas.width) + 0.5 - canvas.height / 2;
            if (maskable && Math.hypot(x, y) > canvas.width * 0.4) outside++;
          }
        }
        return { width: canvas.width, height: canvas.height, painted, transparent, outside };
      },
      { src, maskable: icon.purpose === 'maskable' },
    );
    expect(`${result.width}x${result.height}`).toBe(icon.sizes);
    expect(result.painted).toBeGreaterThan(result.width * result.height * 0.08);
    expect(result.transparent).toBe(0);
    expect(result.outside).toBe(0);
  }

  const assets = [
    'mark-dark',
    'mark-light',
    'mark-small-dark',
    'mark-small-light',
    'wordmark-dark',
    'wordmark-light',
  ];
  for (const name of assets) {
    const response = await request.get(`/brand/${name}.svg`);
    expect(response.ok()).toBe(true);
    const svg = await response.text();
    expect(svg).toContain('Bathyline');
    // Outlined wordmarks work in SVG image contexts without fetching a font.
    expect(svg).not.toMatch(/<text|@font-face|<script|<foreignObject/);
  }
  const gallery = await page.context().newPage();
  await gallery.setViewportSize({ width: 960, height: 640 });
  const origin = new URL(page.url()).origin;
  await gallery.setContent(`<!doctype html><title>Bathyline brand review</title>
    <style>body{margin:0;font:16px system-ui}section{padding:28px;display:flex;gap:28px;align-items:center;height:264px}
    .dark{background:#06131f;color:#e8f3f1}.light{background:#e8f3f1;color:#06131f}img{display:block}figure{margin:0}figcaption{margin-top:12px}</style>
    ${['dark', 'light']
      .map(
        (theme) => `<section class="${theme}">
      <figure><img src="${origin}/brand/wordmark-${theme}.svg" width="360" alt="Bathyline ${theme} wordmark"><figcaption>${theme} background</figcaption></figure>
      ${[16, 32].map((size) => `<figure><img src="${origin}/brand/mark-${size === 16 ? 'small-' : ''}${theme}.svg" width="${size}" height="${size}" alt="${size} px mark"><figcaption>${size} px</figcaption></figure>`).join('')}
      <figure><img src="${origin}/icons/icon-maskable-192.png" width="128" height="128" style="border-radius:50%" alt="Circular mask"><figcaption>Maskable</figcaption></figure>
    </section>`,
      )
      .join('')}`);
  await gallery
    .locator('img')
    .evaluateAll((images) => Promise.all(images.map((img) => (img as HTMLImageElement).decode())));
  await gallery.screenshot({ path: `${shots}/logo-variants.png` });
  await gallery.close();
});

test('favicon at tab size and social card', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Bathyline');
  const title = await page.title();
  const faviconHref = await page.locator('link[rel="icon"]').getAttribute('href');
  const favicon = new URL(faviconHref!, page.url()).href;
  const response = await request.get(favicon);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
  const social = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(social).toBe(
    'https://wjjztd2rz8-coder.github.io/submarine-explorer/share/bathyline-og-1200x630.png',
  );
  const share = new URL('/share/bathyline-og-1200x630.png', page.url()).href;
  const localShare = await request.get(share);
  expect(localShare.ok()).toBe(true);
  expect(localShare.headers()['content-type']).toContain('image/png');

  // Headless Playwright cannot capture browser chrome. This explicitly labelled
  // tab-size preview uses the actual document title and linked favicon.
  const preview = await page.context().newPage();
  await preview.setViewportSize({ width: 480, height: 160 });
  await preview.setContent(`<!doctype html><body style="margin:0;background:#dfe3e7;font:14px system-ui;padding:24px">
    <p style="margin:0 0 16px">Tab preview · actual page title and favicon</p>
    <div style="background:white;border-radius:10px 10px 0 0;width:240px;height:44px;display:flex;align-items:center;gap:12px;padding:0 16px">
    <img src="${favicon}" width="16" height="16" alt="Bathyline favicon"><span id="tab-title"></span><span style="margin-left:auto">×</span></div>`);
  await preview.locator('#tab-title').evaluate((el, title) => {
    el.textContent = title;
  }, title);
  await expect(preview.locator('#tab-title')).toHaveText('Bathyline');
  await preview.locator('img').evaluate((img) => (img as HTMLImageElement).decode());
  await preview.screenshot({ path: `${shots}/favicon-tab-preview.png` });

  await preview.setViewportSize({ width: 1200, height: 630 });
  await preview.setContent(
    `<!doctype html><body style="margin:0"><img src="${share}" alt="Bathyline social card" style="display:block"></body>`,
  );
  const dimensions = await preview.locator('img').evaluate(async (el) => {
    const img = el as HTMLImageElement;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  expect(dimensions).toEqual([1200, 630]);
  await preview.screenshot({ path: `${shots}/share-image.png` });
  await preview.close();
});
