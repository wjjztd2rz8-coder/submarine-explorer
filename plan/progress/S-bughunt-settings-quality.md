# S-bughunt-settings-quality

2026-11-09 — DIRECTOR item 16m; two audit passes.

## Confirmed defect and fix

Waypoints applied saved reduced motion during its initialization, then Settings
applied the saved-or-system value again. This violated the single boot application
rule and passed a false intermediate value when only the OS requested reduced
motion. Four combinations of saved/system preferences failed first: the waypoint
setter received two calls rather than one. Removed the saved-only call;
Settings remains the existing authority for boot, live edits and OS changes.

Net simpler: one runtime line deleted; no new state, setting, UI or dependency.
Tests extend the existing overlay/settings capability suite. No package numbers
were added to source or tests.

## Audit coverage

- Round one traced boot snapshots, quality resolution, tier pending/revert UI,
  dynamic-resolution policy, reduced-motion consumers and audio gain application.
- Round two checked all fixed starting tiers through Low/Medium/High/Auto edits,
  reversion, new Save instances, URL overrides, live saved/OS motion changes,
  disposal, and existing mute/zero-volume/pending-unlock coverage. No additional
  defect confirmed. Tier changes intentionally require reload; boot settings
  and pristine Config stay separate from live preferences.
- Added three tier pending/revert cases and four motion boot cases to
  `tests/unit/overlayFocus.test.ts`.

## Validation

- Red: `npx vitest run tests/unit/overlayFocus.test.ts -t 'applies effective waypoint motion once at boot' --configLoader runner --cache=false`
  failed all four new cases on duplicate application before the fix.
- Green: focused settings, quality, audio, reduced-motion and startup suites:
  404 tests across eight files passed. After refining the tier pending/revert
  assertions, all 188 tests in the final overlay/settings suite passed again.
- Gates: `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-settings-quality PW_PORT=4187 bash tools/gates.sh`.
  Completed with exit 1 (`FAIL gates (e2e=smoke)`). All **4,763 unit tests in
  196 files passed** (921.05 s). Root and project-base build/typecheck, content,
  attribution and repository-wide Prettier passed. Root smoke and project-base
  Playwright stopped at preview startup. Logs:
  `.cache/runs/20261109-141722-2-7KxDRa/`.
  Python: 169 tests ran with five failures. Four build-manifest tests hit
  `spawnSync git EPERM`; the golden comparison CLI test receives empty JSON.
  These unchanged tooling tests also failed in the preceding site-data audit.
- Grepped `tests/e2e` for settings, quality, reduced-motion and mute capabilities;
  ran these requested selections with `npx playwright test <spec> -g '<name>'`
  against the isolated build (ports 4188–4190):
  - `tests/e2e/f-a11y.spec.ts`: `system and saved reduced motion apply live to camera, particles, warnings and shutter`
  - `tests/e2e/settings.spec.ts`: `Apply and reload uses saved boot settings and respects the tier URL override`
  - `tests/e2e/settings.spec.ts`: `scale survives (low|medium|high) quality and mode combinations from dive`
  - `tests/e2e/f3-audio.spec.ts`: `adaptive audio starts, captions new cues, independent sliders persist`
    All stopped before browser execution: preview startup failed. Debug output
    confirms localhost connections denied with `EPERM` on IPv4 and IPv6. Browser
    acceptance and screenshot inspection remain unverified in this sandbox.
