// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const shots = '.cache/codex/shots/f3-audio';
const url = '/?tile=titanic&landmark=_test&poi=test-bow&tier=low';
type AudioProbe = {
  audio: {
    isReady: boolean;
    diagnostics: {
      state: string;
      sampleReady: boolean;
      musicVolume: number;
      sfxVolume: number;
      muted: boolean;
      masterGain: number;
      musicGain: number;
      sfxGain: number;
      score: { swell: number } | null;
    };
    playManipulator(): void;
  };
  settings: { open(): void; close(): void };
  bus: { emit(name: string, data: unknown): void };
};
async function probe(page: Page) {
  return page.evaluate(() => (window.__game as unknown as AudioProbe).audio.diagnostics);
}
async function volume(page: Page, label: string, value: string) {
  await page.getByRole('slider', { name: label, exact: true }).evaluate((node, v) => {
    const input = node as HTMLInputElement;
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test('adaptive audio starts, captions new cues, independent sliders persist', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await mkdir(shots, { recursive: true });
  await page.goto(url);
  await page.waitForFunction(() => window.__gameReady);
  await page.keyboard.press('KeyW');
  await expect.poll(async () => (await probe(page)).state).toBe('running');
  await expect.poll(async () => (await probe(page)).sampleReady).toBe(true);
  await page.evaluate(() => (window.__game as unknown as AudioProbe).settings.open());
  await volume(page, 'Music volume', '0.37');
  await volume(page, 'Sound effects volume', '0.65');
  await page.getByLabel('Captions for sounds').check();
  await expect.poll(async () => (await probe(page)).musicGain).toBeCloseTo(0.37, 2);
  await expect.poll(async () => (await probe(page)).sfxGain).toBeCloseTo(0.65, 2);
  const music = page.getByRole('slider', { name: 'Music volume', exact: true });
  await music.scrollIntoViewIfNeeded();
  expect((await music.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${shots}/settings-desktop.png` });
  await page.getByLabel('Mute audio').check();
  await expect.poll(async () => (await probe(page)).masterGain).toBeLessThan(0.005);
  await page.reload();
  await page.waitForFunction(() => window.__gameReady);
  await page.keyboard.press('KeyW');
  await page.evaluate(() => (window.__game as unknown as AudioProbe).settings.open());
  await expect(music).toHaveValue('0.37');
  await expect(page.getByRole('slider', { name: 'Sound effects volume', exact: true })).toHaveValue(
    '0.65',
  );
  await expect(page.getByLabel('Mute audio')).toBeChecked();
  await page.getByLabel('Mute audio').uncheck();
  await volume(page, 'Music volume', '0');
  await expect.poll(async () => (await probe(page)).musicGain).toBeLessThan(0.005);
  await expect.poll(async () => (await probe(page)).sfxGain).toBeCloseTo(0.65, 2);
  await page.evaluate(() => {
    const game = window.__game as unknown as AudioProbe;
    game.settings.close();
    game.bus.emit('scan:started', { poiId: 'test-bow' });
  });
  await expect(page.locator('.captions')).toContainText('Scan beam hums');
  await page.evaluate(() => {
    const game = window.__game as unknown as AudioProbe;
    game.bus.emit('scan:complete', { poiId: 'test-bow', landmarkId: '_test', firstTime: true });
  });
  await expect.poll(async () => (await probe(page)).score?.swell ?? 0).toBeGreaterThan(0.5);
  await page.evaluate(() => (window.__game as unknown as AudioProbe).audio.playManipulator());
  await expect(page.locator('.captions')).toContainText('Manipulator servo');
  expect(errors).toEqual([]);
});

test.describe('touch audio', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('first touch resumes the graph and music has a usable target', async ({ page }) => {
    await mkdir(shots, { recursive: true });
    await page.goto(url);
    await page.waitForFunction(() => window.__gameReady);
    await page
      .locator('canvas')
      .first()
      .tap({ position: { x: 195, y: 160 } });
    await expect.poll(async () => (await probe(page)).state).toBe('running');
    await page.evaluate(() => (window.__game as unknown as AudioProbe).settings.open());
    const music = page.getByRole('slider', { name: 'Music volume', exact: true });
    await music.scrollIntoViewIfNeeded();
    const box = (await music.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    await music.tap({ position: { x: box.width * 0.75, y: box.height / 2 } });
    expect((await probe(page)).musicVolume).toBeGreaterThan(0.6);
    await page.screenshot({ path: `${shots}/settings-mobile.png` });
  });
});
