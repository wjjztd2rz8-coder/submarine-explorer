import { defineConfig, devices } from '@playwright/test';

// Read CI without pulling in @types/node just for one env var.
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const isCI = Boolean(env.CI);
/**
 * Several agents run e2e concurrently in the same checkout. Give each its own
 * preview port and build output so they do not serve each other's stale dist:
 *   PW_OUTDIR=dist-b1 npm run build -- --outDir dist-b1
 *   PW_PORT=4181 PW_OUTDIR=dist-b1 npm run test:e2e
 */
const port = Number(env.PW_PORT ?? 4173);
const outDir = env.PW_OUTDIR ?? 'dist';
const baseURL = `http://localhost:${port}`;

/**
 * Smoke test config. `npm run build` must have run first; Playwright then boots
 * `vite preview` (which serves dist/, tiles included via the public/data symlink).
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Software WebGL makes multi-step UI tests much slower on hosted runners.
  timeout: isCI ? 240_000 : 90_000,
  expect: { timeout: isCI ? 60_000 : 20_000 },
  retries: isCI ? 1 : 0,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    // The game's fixed medium default overrides software-GPU auto-detection.
    // Seed only the graphics preference in CI; Save fills in all other defaults.
    // Explicit ?tier= URLs (including the ocean high-tier tests) still win, and
    // tests remain free to migrate, reset or replace settings and reload.
    ...(isCI
      ? {
          storageState: {
            cookies: [],
            origins: [
              {
                origin: baseURL,
                localStorage: [
                  {
                    name: 'subexplorer.settings.v2',
                    value: JSON.stringify({ version: 2, graphicsTier: 'low' }),
                  },
                ],
              },
            ],
          },
          trace: 'on-first-retry' as const,
        }
      : {}),
    // Without these flags headless Chromium renders on SwiftShader (~5 fps here),
    // which makes every timing threshold pessimistic and never exercises the GPU
    // tiers. With them the real GPU is used where one exists; on a machine with
    // no Vulkan device ANGLE still falls back to SwiftShader, so CI keeps working.
    launchOptions: {
      args: [
        '--ignore-gpu-blocklist',
        '--use-angle=vulkan',
        '--enable-features=Vulkan',
        '--disable-vulkan-surface',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort --outDir ${outDir}`,
    url: `http://localhost:${port}`,
    // Own the preview process for the whole suite. Reusing an orchestrator's
    // preview can lose the server halfway through when its owner cleans up.
    // Interactive local runs may explicitly opt into their existing preview.
    reuseExistingServer: !isCI && env.PW_REUSE_SERVER === '1',
    timeout: 60_000,
  },
});
