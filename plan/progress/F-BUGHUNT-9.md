# F-BUGHUNT-9 — audio and mobile/PWA regression audit

2026-10-03 · focused fixes only · no refactoring.

## Plan

1. Inspect the merged audio lifecycle/unlock, saved mute, quality controller,
   worker/cache versioning, touch sonar and tutorial placement.
2. Reproduce concrete missed cases with unit/browser regression assertions.
3. Fix confirmed bugs in place and add a CHANGELOG line for each fix.
4. Run focused checks and `tools/gates.sh`; record found/fixed/deferred findings.

## Progress

- Clean worktree at start; read repository agent conventions and prior audits.
- Baseline lifecycle/quality/service-worker/plugin tests: 56 passing.
- Existing touch audit covers 844×390 but omits 667×375.
- Preview server startup is blocked here: direct localhost bind returns
  `listen EPERM 127.0.0.1:4399`. Browser assertions will still be added and the
  required gates attempted; any unavailable validation will be reported.

## Found and fixed

1. **Audio visibility transition races.** Unlike gesture unlock, the ordinary
   visibility/shell suspend and resume promises did not reconcile after completion.
   A late resume could advance the hidden audio clock; a late suspension could
   silence a returned dive. Both completions now check the current blocked state.
   Two initially failing tests reproduce each direction, including muted return.
2. **Offline shell overwritten between deploys.** A successful navigation cached
   the next deploy's HTML into the current worker's shell, without guaranteeing
   its new chunks were downloaded. Keep the installed precached HTML and chunks
   together for fallback. Initially failing root/project-base unit cases cover
   navigation online followed by offline before another worker installs.
3. **New asset caches filled from stale HTTP responses.** Changing VERSION cleared
   CacheStorage assets but did not bypass the browser's HTTP cache. Reload mutable
   assets on the first miss of the new versioned cache; later reads use that cache.
   An initially failing test simulates a still-fresh previous-deploy HTTP response.
4. **Queried tile catalog became permanently cached.** Routing used the whole URL,
   so `data/tiles/index.json?catalog=1` went through the immutable tile branch.
   Classify using pathname while retaining the full URL as the cache key, and
   reload catalog background refreshes through the HTTP cache. An initially
   failing test checks cached delivery plus a live background refresh.
5. **667×375 tutorial column crowded text and scan HUD.** The two-column tutorial
   put two buttons beside text in a 229 px column. Stack it on narrow landscape
   phones, omit redundant dots (the count stays), and reserve scan-panel clearance
   for all five instructions. Added browser assertions for all steps at 80%, 100%
   and 150% UI, and added 667×375 to the existing full touch audit matrix.
6. **Expanded sonar overlapped right touch buttons at 667×375.** Its centred 300 px
   map reached into the button column. Anchor it before that column and bound its
   width to leave the left Pause slot clear. Browser assertions cover both
   667×375 and 844×390, including reachable sonar zoom buttons.

Each fix has its own CHANGELOG entry. Changes stay within the audio lifecycle,
worker fetch policy, compact HUD CSS and regression tests; no refactoring.

## Audited without a production change

- iOS unlock: the silent source starts synchronously inside the gesture; saved
  gains are applied before sources, rejected warmups release and can retry,
  capture-phase press/release/touch/keyboard listeners survive restart correctly.
  Existing lifecycle and touch-unlock tests pass; real iOS remains unverified.
- Mute persistence: Save restores mute and gains, and pause/visibility preserve
  mute. Strengthened the browser reload test to check a running context with zero
  master gain immediately after unlocking the restored muted graph.
- Quality: existing sustained-load/headroom, rejected-ratio stability/retry,
  fractional DPR/floor and hidden-gap tests pass. No downgrade-loop defect found
  under the retained settings; no tier, DPR, particle or thermal tuning changes.
- PWA plugin: unchanged builds retain VERSION; worker, shell and mutable-content
  changes alter it. Tile data remains persistent. Complete shell installation,
  scope cache isolation, quota-safe writes and HTTP-error fallback tests pass.
- Offline availability still requires a complete installation and site data
  fetched under worker control. Never-visited sites are not predownloaded.

## Validation

- New unit regressions: **six failures before fixes, all passing after fixes**.
- Focused audio/touch-unlock/settings/quality/worker/plugin suite: **78 passing**.
- Strict TypeScript check and `git diff --check`: pass.
- `PW_PORT=4399 tools/gates.sh`: build, unit (**1,006 tests / 97 files**), Python
  (**128 tests**), strict content, attribution and repository Prettier all pass.
  The project-base production build also passes. Both e2e gates fail during
  preview startup, before any browser assertion runs.
- Direct runner-mode preview confirms `listen EPERM 127.0.0.1:4399`. Direct
  Chromium launch also fails with sandbox `shutdown: Operation not permitted`.
  No screenshots could be rendered or visually reviewed here.
- Playwright collection passes: **259 tests / 50 files** overall; **22 tests** in
  the touched audio/touch/PWA specs. The new PWA case also collects with
  `PW_BASE=/submarine-explorer/`.
- Added a production-worker browser regression that explicitly registers the
  worker, warms site data under control, serves next-deploy HTML, then verifies
  offline navigation boots the installed app. It is authored but unexecuted.
- Gates used a temporary ignored writable dependency copy, removing only its
  copied absolute nested dependency symlink to preserve Playwright identity.
  Restored the original `node_modules` symlink and removed the copy afterwards.
  No dependency, package, gate or browser-configuration files changed.

## Deferred validation

- Run the browser gates in an environment that allows preview and Chromium;
  review the tutorial and expanded-sonar screenshots. Layout fixes are based on
  CSS geometry; live browser rendering and hit-testing remain unverified.
- Run the new worker spec against the project-base build too:
  `PW_BASE=/submarine-explorer/ PW_OUTDIR=<project-base-build> PW_PORT=<port> npx playwright test tests/e2e/f-bughunt-9-pwa.spec.ts`.
- Real iOS Safari/installed-PWA unlock and hide/return; actual notches and browser
  bars in both landscape directions; worker update/offline behavior and eviction
  on iOS/Android; low-tier thermal/load measurements on a budget phone.

No reproduced unit-level code defect was left unfixed. Browser/device checks
above are pending validation, not passing results.

## Orchestrator browser follow-up — compact sonar height

- The unrestricted orchestrator run passed build, unit, Python, content,
  attribution, Prettier and project-base e2e. Main e2e recorded **242 passing,
  14 skipped and three failing** tests. All failures were the unchanged compact
  sonar/stick separation assertion at 667×375, at 80%, 100% and 150% UI.
- Audio browser tests, the new deploy/offline worker browser test, the portrait
  touch matrix and every 844×390 touch test passed in that run. The 667×375
  mission, home-menu and journal tests also passed. Its three failed fresh-dive
  tests stopped at initial layout, before tutorial progression/expanded sonar.
- Inspected the failure contexts and rendered portrait/844×390 tutorial images.
  Also reviewed the 844×390 expanded-sonar image: the map renders correctly and
  leaves both Pause and the right button cluster clear.
  The landscape image shows the tall Titanic sonar ending at about 269 px:
  its tile aspect is about 0.75, so 130 px canvas width yields about 173 px height.
  The header/padding adds another 84 px below the 12 px top. At 375 px height,
  the largest short-landscape stick starts at 255 px, leaving a 14 px overlap.
  The earlier width-only map limit missed this tile-aspect dependency.
- **Seventh fix:** bound the compact canvas height by viewport height minus the
  header/panel space, largest stick and edge, and an 8 px gap. Account for top
  and bottom safe-area insets; `object-fit: contain` preserves the bitmap aspect.
  Zoom buttons and stick sizes are unchanged. Added a separate CHANGELOG line.
- Kept every browser assertion, viewport, UI scale and test step unchanged.
  The existing three failing cases provide direct regression coverage.
- Post-fix `PW_PORT=4399 tools/gates.sh --no-e2e`: **all six gates pass**, including
  **1,006 unit tests** and **128 Python tests**. Changed-file Prettier and
  `git diff --check` also pass. Preserved the unrestricted gate logs under
  `.cache/f-bughunt-9-orchestrator-gates/` before running local checks.
- Post-fix browser execution and the 667×375 screenshot still require the
  orchestrator's unrestricted runner; this sandbox cannot start Vite/Chromium.
