import { expect, test, type Page } from '@playwright/test';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';

/**
 * D-PHOTO: P opens a frozen, HUD-free photo mode whose caption names what is
 * in frame; Enter saves a thumbnail to the Journal's Photos page (and the POI
 * entry), which survives a reload and can be deleted.
 */

const shots = '.cache/codex/shots/d-photo';
const PHOTOS_KEY = 'subexplorer.photos.v1';
const DIVE = '/?mission=titanic&poi=titanic-bow&skipBriefing=1';

type Game = {
  sub: { position: { x: number; y: number; z: number } };
  rig: {
    mode: string;
    orbitAzimuth: number;
    orbitRadius: number;
    camera: { position: { x: number; y: number; z: number } };
  };
  terrain: { sampleHeight(x: number, z: number): number };
  power: { setEnabled(on: boolean): void; state: { battery: number; oxygen: number } };
  appState: string;
};

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      window.__gameReady &&
      (window.__game as { discovery: { spawnedAt: string | null } }).discovery.spawnedAt ===
        'titanic-bow',
  );
}

function simSnapshot(page: Page) {
  return page.evaluate(() => {
    const g = window.__game as unknown as Game;
    const p = g.sub.position;
    return { x: p.x, y: p.y, z: p.z, battery: g.power.state.battery, oxygen: g.power.state.oxygen };
  });
}

function cameraSnapshot(page: Page) {
  return page.evaluate(() => {
    const g = window.__game as unknown as Game;
    // Relative to the boat, which may still be settling before photo mode.
    const c = g.rig.camera.position;
    const p = g.sub.position;
    return { mode: g.rig.mode, x: c.x - p.x, y: c.y - p.y, z: c.z - p.z };
  });
}

function storedPhotos(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw
      ? (JSON.parse(raw) as {
          version: number;
          photos: Array<Record<string, string | number | null>>;
        })
      : null;
  }, PHOTOS_KEY);
}

test('photo mode freezes the sim, saves to the Journal, persists and deletes', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(DIVE);
  await ready(page);
  await page.waitForTimeout(1500);
  const discoveriesBefore = await page.evaluate(() =>
    localStorage.getItem('subexplorer.discoveries.v1'),
  );
  // Supplies on, so a drain would show while framing.
  await page.evaluate(() => (window.__game as unknown as Game).power.setEnabled(true));
  const cameraBefore = await cameraSnapshot(page);

  // ---- enter: HUD hidden, caption names the site and the POI in frame.
  await page.keyboard.press('p');
  const mode = page.locator('.photo-mode');
  await expect(mode).toBeVisible();
  await expect(page.locator('.hud')).toBeHidden();
  await expect(page.locator('.objectives-panel')).toBeHidden();
  await expect(mode.locator('.photo-mode-caption')).toHaveText(/^.*Titanic.* · Bow section$/);
  await expect(mode.locator('.photo-mode-tips')).toHaveText(
    'Enter capture · Esc exit · drag orbit · wheel zoom',
  );
  expect((await cameraSnapshot(page)).mode).toBe('orbit');

  // ---- frozen: throttle held, nothing moves or drains.
  const before = await simSnapshot(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  expect(await simSnapshot(page)).toEqual(before);

  // ---- drag orbits, wheel zooms, the camera stays above the seabed.
  const orbit0 = await page.evaluate(() => {
    const r = (window.__game as unknown as Game).rig;
    return { az: r.orbitAzimuth, radius: r.orbitRadius };
  });
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(760, 430, { steps: 6 });
  await page.mouse.up();
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() => page.evaluate(() => (window.__game as unknown as Game).rig.orbitRadius))
    .toBeGreaterThan(orbit0.radius);
  const orbit1 = await page.evaluate(() => {
    const g = window.__game as unknown as Game;
    const c = g.rig.camera.position;
    return { az: g.rig.orbitAzimuth, clearance: c.y - g.terrain.sampleHeight(c.x, c.z) };
  });
  expect(orbit1.az).not.toBeCloseTo(orbit0.az, 3);
  expect(orbit1.clearance).toBeGreaterThan(0);
  // Swing back toward the bow for the shot.
  await page.mouse.move(760, 430);
  await page.mouse.down();
  await page.mouse.move(640, 400, { steps: 6 });
  await page.mouse.up();
  await page.mouse.wheel(0, -300);
  await expect
    .poll(() => page.evaluate(() => (window.__game as unknown as Game).rig.orbitRadius))
    .toBeLessThan(orbit0.radius * 1.2);
  await expect(mode.locator('.photo-mode-caption')).toContainText('Bow section');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shots}/photo-mode.png` });

  // ---- capture.
  await page.keyboard.press('Enter');
  await expect(mode.locator('.photo-mode-toast')).toHaveText('Saved to Journal');
  const stored = await storedPhotos(page);
  expect(stored?.version).toBe(1);
  expect(stored?.photos).toHaveLength(1);
  const saved = stored!.photos[0]!;
  expect(saved.siteId).toBe('titanic');
  expect(saved.poiId).toBe('titanic-bow');
  expect(saved.poiName).toBe('Bow section');
  expect(Number(saved.depthM)).toBeGreaterThan(3000);
  expect(Number.isNaN(Date.parse(String(saved.at)))).toBe(false);
  // A real, non-blank JPEG about 640 px wide.
  const image = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    let sq = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const l = d[i]! * 0.2126 + d[i + 1]! * 0.7152 + d[i + 2]! * 0.0722;
      sum += l;
      sq += l * l;
    }
    const mean = sum / n;
    return { width: img.naturalWidth, mean, sd: Math.sqrt(sq / n - mean * mean) };
  }, String(saved.image));
  expect(image.width).toBeGreaterThan(300);
  expect(image.width).toBeLessThanOrEqual(640);
  expect(image.mean).toBeGreaterThan(8);
  expect(image.sd).toBeGreaterThan(3);

  // ---- Esc leaves photo mode (not into pause) and restores the view exactly.
  await page.keyboard.press('Escape');
  await expect(mode).toBeHidden();
  await expect(page.locator('.hud')).toBeVisible();
  expect(await page.evaluate(() => (window.__game as unknown as Game).appState)).toBe('dive');
  await expect
    .poll(async () => {
      const after = await cameraSnapshot(page);
      return (
        after.mode === cameraBefore.mode &&
        Math.hypot(after.x - cameraBefore.x, after.y - cameraBefore.y, after.z - cameraBefore.z) <
          0.5
      );
    })
    .toBe(true);
  // P also toggles in and out.
  await page.keyboard.press('p');
  await expect(mode).toBeVisible();
  await page.keyboard.press('p');
  await expect(mode).toBeHidden();

  // ---- Journal: Photos page, viewer, and the POI entry's photos.
  await page.keyboard.press('j');
  const journal = page.locator('.journal');
  await expect(journal).toBeVisible();
  await journal.locator('.jr-nav-item[data-target="photos"]').click();
  await expect(journal.locator('.jr-photo-title')).toHaveText('Photos · 1 of 24');
  await expect(journal.locator('.jr-photo-card')).toHaveCount(1);
  await expect(journal.locator('.jr-photo-card')).toContainText('Bow section');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shots}/journal-photos.png` });
  await journal.locator('.jr-photo-card').click();
  await expect(journal.locator('.jr-photo-caption')).toHaveText(/Titanic.* · Bow section$/);
  await expect(journal.locator('.jr-photo-detail')).toContainText('m deep');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shots}/photo-viewer.png` });
  await page.evaluate(() =>
    (window.__game as { journal: { show(key: string): void } }).journal.show('titanic/poi/bow'),
  );
  await expect(journal.locator('.jr-entry-photos .jr-photo-card')).toHaveCount(1);

  // ---- reload: still there; delete empties it without touching discoveries.
  await page.reload();
  await ready(page);
  await page.keyboard.press('j');
  await expect(journal).toBeVisible();
  await journal.locator('.jr-nav-item[data-target="photos"]').click();
  await expect(journal.locator('.jr-photo-card')).toHaveCount(1);
  await journal.locator('.jr-photo-card').click();
  await journal.getByRole('button', { name: 'Delete photo' }).click();
  await expect(journal.locator('.jr-photo-card')).toHaveCount(0);
  await expect(journal.locator('.jr-photo-title')).toHaveText('Photos · 0 of 24');
  expect((await storedPhotos(page))?.photos).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1'))).toBe(
    discoveriesBefore,
  );
  expect(errors).toEqual([]);
});

test('a full photo store reports the dropped oldest; quota failure is explained', async ({
  page,
}) => {
  await page.goto(DIVE);
  await ready(page);
  // 24 stored photos: the next capture drops the oldest.
  await page.evaluate((key) => {
    const image = document.createElement('canvas').toDataURL('image/jpeg');
    const photos = Array.from({ length: 24 }, (_, i) => ({
      id: `old-${i}`,
      image,
      siteId: 'titanic',
      siteName: 'RMS Titanic',
      poiId: null,
      poiName: null,
      at: new Date(Date.UTC(2026, 0, 1, 0, 24 - i)).toISOString(),
      depthM: 3800,
    }));
    localStorage.setItem(key, JSON.stringify({ version: 1, photos }));
  }, PHOTOS_KEY);
  await page.reload();
  await ready(page);
  await page.keyboard.press('p');
  await page.keyboard.press('Enter');
  const toast = page.locator('.photo-mode-toast');
  await expect(toast).toHaveText(/Saved to Journal · oldest photo removed \(keeps 24\)/);
  const stored = await storedPhotos(page);
  expect(stored?.photos).toHaveLength(24);
  expect(stored?.photos.some((p) => p.id === 'old-23')).toBe(false);

  // Storage that refuses every write: a clear, nonfatal message.
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await expect(toast).toHaveText(/Photo storage is full/);
  await expect(toast).toHaveClass(/is-error/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.photo-mode')).toBeHidden();
});

test('with the ROV out, photo mode orbits the ROV and leaves it deployed', async ({ page }) => {
  await page.goto(DIVE);
  await ready(page);
  await page.keyboard.press('e');
  await expect(page.locator('.hud-rov')).toBeVisible();
  await page.keyboard.press('p');
  await expect(page.locator('.photo-mode')).toBeVisible();
  const view = await page.evaluate(() => {
    const g = window.__game as unknown as {
      rov: { deployed: boolean; position: { distanceTo(o: unknown): number } };
      rig: { mode: string; orbitRadius: number; camera: { position: unknown } };
    };
    return {
      deployed: g.rov.deployed,
      mode: g.rig.mode,
      radius: g.rig.orbitRadius,
      distance: g.rov.position.distanceTo(g.rig.camera.position),
    };
  });
  expect(view.deployed).toBe(true);
  expect(view.mode).toBe('orbit');
  expect(view.distance).toBeLessThanOrEqual(view.radius + 1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.photo-mode')).toBeHidden();
  expect(
    await page.evaluate(() => (window.__game as { rov: { deployed: boolean } }).rov.deployed),
  ).toBe(true);
});
