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

/**
 * Smoke test config. `npm run build` must have run first; Playwright then boots
 * `vite preview` (which serves dist/, tiles included via the public/data symlink).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
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
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
});
