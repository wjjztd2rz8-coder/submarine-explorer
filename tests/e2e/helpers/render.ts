import { type Page, test } from '@playwright/test';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir, writeFile } from 'node:fs/promises';
import { readGoldenBuild } from '../../../tools/golden-build.mjs';
// @ts-expect-error The existing golden manifest builder is JavaScript.
import { goldenManifest, goldenContactSheet } from '../../../tools/golden-manifest.mjs';
import type { Submarine } from '../../../src/sub/Submarine.js';
import type { CameraRig } from '../../../src/sub/CameraRig.js';
import type { Mission } from '../../../src/game/Mission.js';
import type { Save } from '../../../src/core/Save.js';
import type { PerfStats } from '../../../src/app/systems/quality.js';

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

/** Nightly/manual review persists images; assertion readbacks stay in ordinary tests. */
export const renderReview = env.PW_RENDER_REVIEW === '1' || env.VISUAL_QA === '1';

export async function reviewShot(page: Page, name: string): Promise<void> {
  if (renderReview) await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
}

/** Persist review evidence only; callers retain every frame and numeric probe. */
export async function reviewScreenshot(
  page: Page,
  options: Parameters<Page['screenshot']>[0],
): Promise<void> {
  if (renderReview) await page.screenshot(options);
}

/** Mission acceptance needs evidence on ordinary runs, independently of review flags. */
export async function missionSpawnShot(page: Page, site: string, directory: string): Promise<void> {
  const provenance = readGoldenBuild(await page.content());
  const filename = `${site}-portrait-1-mission.png`;
  const captures = [];
  const failures: { stage: string; error: string }[] = [];
  await mkdir(directory, { recursive: true });
  try {
    const pose = await page.evaluate(() => {
      const g = window.__game as unknown as {
        sub: Submarine;
        rig: CameraRig;
        mission: Mission | null;
        save: Save;
        perf: PerfStats;
        props: { stats: { failed: number } };
      };
      return {
        missionId: g.mission?.id ?? null,
        missionElapsedS: g.mission?.elapsedS ?? null,
        position: g.sub.position.toArray(),
        yaw: g.sub.yaw,
        pitch: g.sub.pitch,
        camera: g.rig.camera.position.toArray(),
        view: g.rig.mode,
        tier: g.perf.tier,
        gameplayMode: g.save.get().gameplayMode,
        failedProps: g.props.stats.failed,
        drawCalls: g.perf.drawCalls,
        viewport: [innerWidth, innerHeight],
      };
    });
    if (
      pose.missionId !== site ||
      pose.tier !== 'low' ||
      pose.gameplayMode !== 'arcade' ||
      pose.view !== 'chase' ||
      pose.failedProps !== 0 ||
      pose.drawCalls <= 0 ||
      pose.viewport[0] !== 390 ||
      pose.viewport[1] !== 844
    )
      throw new Error(`Invalid Low portrait mission spawn: ${JSON.stringify(pose)}`);
    await page.screenshot({ path: `${directory}/${filename}` });
    captures.push({
      site,
      heroId: null,
      mode: 'mission',
      ...provenance,
      url: page.url(),
      timeS: 0,
      filename,
      range: null,
      captureMethod: 'playwright',
      layout: 'portrait',
      ...pose,
    });
  } catch (error) {
    failures.push({ stage: `${site}: mission spawn capture`, error: String(error) });
    throw error;
  } finally {
    const manifest = goldenManifest({
      base: new URL('.', page.url()).href,
      stamp: new Date().toISOString(),
      provenance,
      options: {
        mode: 'mission',
        tier: 'low',
        layouts: [{ name: 'portrait', width: 390, height: 844 }],
      },
      heroes: [[site]],
      failures,
      captures,
    });
    await writeFile(`${directory}/poses.json`, JSON.stringify(manifest, null, 2));
    await writeFile(`${directory}/index.html`, goldenContactSheet(manifest));
  }
}
