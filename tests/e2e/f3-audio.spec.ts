// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page, type Locator } from './helpers/unlocked.js';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';

const shots = '.cache/codex/shots/f3-audio';
const url = '/?tile=titanic&landmark=_test&poi=test-bow&tier=low';
type AudioProbe = {
  audio: {
    isReady: boolean;
    diagnostics: {
      state: string;
      contextTime: number;
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
  await expect.poll(async () => (await probe(page)).state).toBe('suspended');
  await volume(page, 'Music volume', '0.37');
  await volume(page, 'Sound effects volume', '0.65');
  await page.getByLabel('Captions for sounds').check();
  await page.evaluate(() => (window.__game as unknown as AudioProbe).settings.close());
  await expect.poll(async () => (await probe(page)).state).toBe('running');
  await expect.poll(async () => (await probe(page)).musicGain).toBeCloseTo(0.37, 2);
  await expect.poll(async () => (await probe(page)).sfxGain).toBeCloseTo(0.65, 2);
  await page.evaluate(() => (window.__game as unknown as AudioProbe).settings.open());
  await expect.poll(async () => (await probe(page)).state).toBe('suspended');
  const music = page.getByRole('slider', { name: 'Music volume', exact: true });
  await music.scrollIntoViewIfNeeded();
  expect((await music.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `${shots}/settings-desktop.png` });
  await page.getByLabel('Mute audio').check();
  await expect.poll(async () => (await probe(page)).masterGain).toBeLessThan(0.005);
  await page.reload();
  await page.waitForFunction(() => window.__gameReady);
  await page.keyboard.press('KeyW');
  await expect.poll(async () => (await probe(page)).state).toBe('running');
  expect((await probe(page)).muted).toBe(true);
  expect((await probe(page)).masterGain).toBe(0);
  await page.evaluate(() => (window.__game as unknown as AudioProbe).settings.open());
  await expect(music).toHaveValue('0.37');
  await expect(page.getByRole('slider', { name: 'Sound effects volume', exact: true })).toHaveValue(
    '0.65',
  );
  await expect(page.getByLabel('Mute audio')).toBeChecked();
  await page.getByLabel('Mute audio').uncheck();
  await volume(page, 'Music volume', '0');
  await page.evaluate(() => (window.__game as unknown as AudioProbe).settings.close());
  await expect.poll(async () => (await probe(page)).state).toBe('running');
  await expect.poll(async () => (await probe(page)).musicGain).toBeLessThan(0.005);
  await expect.poll(async () => (await probe(page)).sfxGain).toBeCloseTo(0.65, 2);
  await page.evaluate(() =>
    (window.__game as unknown as AudioProbe).bus.emit('scan:started', { poiId: 'test-bow' }),
  );
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

for (const touch of [false, true]) {
  test.describe(`mission audio on ${touch ? 'touch' : 'desktop'}`, () => {
    test.use({
      hasTouch: touch,
      isMobile: touch,
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    });
    test('modal gestures keep audio paused; tier and mix survive reload and Dive again', async ({
      page,
    }) => {
      // Regression: gestures on a frozen briefing/debrief used to run the
      // graph at full volume. Exercise native controls and the restart action.
      await page.addInitScript(() => {
        if (!localStorage.getItem('subexplorer.settings.v3'))
          localStorage.setItem(
            'subexplorer.settings.v3',
            JSON.stringify({ version: 3, graphicsTier: 'low' }),
          );
      });
      await pauseClockBeforeNavigation(page);
      const ready = () => clockFramesUntil(page, () => window.__gameReady === true);
      const act = async (target: Locator) => {
        await page.clock.fastForward(50);
        if (touch) await target.tap();
        else await target.click();
        await page.clock.fastForward(50);
      };
      const briefing = page.locator('.briefing');
      const settings = page.locator('.settings');
      const assertPaused = async () => {
        await expect.poll(async () => (await probe(page)).state).toBe('suspended');
        expect((await probe(page)).masterGain).toBe(0);
        const time = (await probe(page)).contextTime;
        await page.clock.fastForward(1000);
        expect((await probe(page)).contextTime).toBe(time);
      };
      await page.goto('/?mission=titanic', { waitUntil: 'domcontentloaded' });
      await ready();
      await act(briefing.getByRole('radio', { name: 'Arcade', exact: true }));
      await assertPaused();
      await act(briefing.getByRole('button', { name: 'Begin dive', exact: true }));
      await expect.poll(async () => (await probe(page)).state).toBe('running');
      if (touch) await act(page.locator('.tc-btn-pause'));
      else {
        await page.keyboard.press('Escape');
        await page.clock.fastForward(50);
      }
      await act(page.locator('.pause-menu').getByRole('button', { name: 'Settings', exact: true }));
      for (const label of ['Master volume', 'Sound effects volume', 'Music volume']) {
        const slider = settings.getByRole('slider', { name: label, exact: true });
        await slider.scrollIntoViewIfNeeded();
        if (touch) {
          const box = (await slider.boundingBox())!;
          await slider.tap({ position: { x: box.width * 0.3, y: box.height / 2 } });
        } else {
          await slider.focus();
          await page.keyboard.press('Home');
          await page.keyboard.press('ArrowRight');
        }
        const value = Number(await slider.inputValue());
        expect(value).toBeGreaterThan(touch ? 0.2 : 0);
        expect(value).toBeLessThan(touch ? 0.4 : 0.02);
      }
      await act(settings.getByLabel('Mute audio'));
      await settings.getByLabel('Graphics tier', { exact: true }).selectOption('medium');
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('subexplorer.settings.v3')!),
      );
      expect(saved).toMatchObject({ graphicsTier: 'medium', muted: true });
      expect(
        await page.evaluate(() => (window.__game as { perf: { tier: string } }).perf.tier),
      ).toBe('low');
      expect(saved.masterVolume).toBeGreaterThan(0);
      await assertPaused();
      await Promise.all([
        page.waitForEvent('domcontentloaded'),
        act(settings.getByRole('button', { name: 'Apply and reload' })),
      ]);
      await ready();
      const verifyMix = async () => {
        expect(
          await page.evaluate(() => (window.__game as { perf: { tier: string } }).perf.tier),
        ).toBe('medium');
        expect(await probe(page)).toMatchObject({
          muted: true,
          masterGain: 0,
          sfxGain: saved.sfxVolume,
          musicGain: saved.musicVolume,
        });
      };
      for (let run = 0; run < 2; run++) {
        await act(briefing.getByRole('radio', { name: 'Arcade', exact: true }));
        await assertPaused();
        await verifyMix();
        await act(briefing.getByRole('button', { name: 'Begin dive', exact: true }));
        await expect.poll(async () => (await probe(page)).state).toBe('running');
        await verifyMix();
        if (run === 1) break;
        await page.evaluate(() =>
          (window.__game as { missionRouter: { endDive(): boolean } }).missionRouter.endDive(),
        );
        await page.clock.fastForward(50);
        const debrief = page.locator('.mission-debrief');
        await act(debrief.getByRole('button', { name: 'More', exact: true }));
        await assertPaused();
        await Promise.all([
          page.waitForEvent('domcontentloaded'),
          act(debrief.locator('[data-action="dive-again"]')),
        ]);
        await ready();
      }
      expect(new URL(page.url()).search).toBe('?mission=titanic');
    });
  });
}

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

test('pause and visibility freeze music and preserve pause when the tab returns', async ({
  page,
}) => {
  await page.goto(url);
  await page.waitForFunction(() => window.__gameReady);
  await page.keyboard.press('KeyW');
  await expect.poll(async () => (await probe(page)).state).toBe('running');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await probe(page)).state).toBe('suspended');
  expect((await probe(page)).masterGain).toBe(0);
  const pausedTime = (await probe(page)).contextTime;
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(async () => (await probe(page)).state).toBe('suspended');
  expect((await probe(page)).contextTime).toBe(pausedTime);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await probe(page)).state).toBe('running');
  await expect.poll(async () => (await probe(page)).masterGain).toBeGreaterThan(0.5);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await probe(page)).state).toBe('suspended');
  await page.evaluate(() => {
    for (const hidden of [true, false]) {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    }
  });
  expect((await probe(page)).state).toBe('suspended');
  expect((await probe(page)).masterGain).toBe(0);
});
