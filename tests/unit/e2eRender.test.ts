import { afterEach, expect, it, vi } from 'vitest';
import type { Page } from '@playwright/test';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { missionSpawnShot } from '../e2e/helpers/render.js';

const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function setup() {
  const directory: string = await mkdtemp('/tmp/mission-spawn-');
  directories.push(directory);
  const pose = {
    missionId: 'endurance',
    missionElapsedS: 0.25,
    position: [1, -500, 2],
    yaw: 0.1,
    pitch: 0,
    camera: [1, -490, 12],
    view: 'chase',
    tier: 'low',
    gameplayMode: 'arcade',
    failedProps: 0,
    drawCalls: 30,
    viewport: [390, 844],
  };
  const screenshot = vi.fn(async ({ path }: { path: string }) =>
    writeFile(path, 'capture fixture'),
  );
  const page = {
    content: async () =>
      `<meta name="golden-sha" content="${'a'.repeat(40)}"><meta name="golden-dirty" content="true"><meta name="golden-build-mode" content="production">`,
    evaluate: async () => pose,
    screenshot,
    url: () => 'http://localhost:4173/?mission=endurance&tier=low&touch=1',
  } as unknown as Page;
  const manifest = async () => JSON.parse(await readFile(`${directory}/poses.json`, 'utf8'));
  return { directory, page, pose, screenshot, manifest };
}

it('persists a mission spawn and golden entry when review flags are off', async () => {
  vi.stubEnv('PW_RENDER_REVIEW', '0');
  vi.stubEnv('VISUAL_QA', '0');
  vi.resetModules();
  const { missionSpawnShot, renderReview } = await import('../e2e/helpers/render.js');
  expect(renderReview).toBe(false);
  const { directory, page, pose, screenshot, manifest } = await setup();
  await missionSpawnShot(page, 'endurance', directory);
  const result = await manifest();
  expect(screenshot).toHaveBeenCalledOnce();
  expect(result).toMatchObject({
    complete: true,
    failures: [],
    mode: 'mission',
    tier: 'low',
    plannedHeroes: [],
    plannedMissions: ['endurance'],
    layouts: [{ name: 'portrait', width: 390, height: 844 }],
    sha: 'a'.repeat(40),
    dirty: true,
    buildMode: 'production',
  });
  expect(result.captures).toEqual([
    expect.objectContaining({
      ...pose,
      site: 'endurance',
      filename: 'endurance-portrait-1-mission.png',
      timeS: 0,
    }),
  ]);
  expect(await readFile(`${directory}/${result.captures[0].filename}`, 'utf8')).toBe(
    'capture fixture',
  );
  expect(await readFile(`${directory}/index.html`, 'utf8')).toContain(result.captures[0].filename);
});

it('reports screenshot failure as incomplete evidence without a phantom capture', async () => {
  const { directory, page, screenshot, manifest } = await setup();
  screenshot.mockRejectedValueOnce(new Error('readback failed'));
  await expect(missionSpawnShot(page, 'endurance', directory)).rejects.toThrow('readback failed');
  expect(await manifest()).toMatchObject({
    complete: false,
    captures: [],
    failures: [{ stage: 'endurance: mission spawn capture', error: 'Error: readback failed' }],
  });
});

it.each([
  { missionId: 'titanic' },
  { tier: 'high' },
  { gameplayMode: 'realistic' },
  { viewport: [844, 390] },
  { failedProps: 1 },
  { drawCalls: 0 },
])('rejects mismatched or unloaded capture state: %j', async (invalid) => {
  const { directory, page, pose, screenshot, manifest } = await setup();
  Object.assign(pose, invalid);
  await expect(missionSpawnShot(page, 'endurance', directory)).rejects.toThrow(
    'Invalid Low portrait',
  );
  expect(screenshot).not.toHaveBeenCalled();
  expect(await manifest()).toMatchObject({ complete: false, captures: [] });
});
