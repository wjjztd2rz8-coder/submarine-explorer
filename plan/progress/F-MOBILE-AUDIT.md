# F-MOBILE-AUDIT

2026-10-03 · two code-audit rounds · no commit.

## Fixes

- Dynamic resolution rounded arbitrary device DPRs above their ceiling and could
  stall just above a fractional floor. Bound the rounded ratios and preserve the
  exact bounds. Tests drive sustained load and recovery at DPR 1.874 / floor 0.504
  and DPR 1.875 / floor 0.505 (rounding in both directions).
- Rotation/resize left held sticks and camera gestures using old coordinates.
  Release axes, held actions and gesture tracking on both events. Hide the rotate
  hint on landscape transitions and cancel its timer on disposal. Unit tests
  exercise the actual event listeners and ignore stale pointer moves afterwards.
- Landscape HUD columns added the left notch offset without subtracting either
  side inset from their width. Subtract both insets from the centre column and
  attribution strip; size and centre portrait onboarding within the safe area.
- The unstamped development worker parsed its placeholder before its inactive
  guard. It is now inert, including activation.
- Failed shell precaching previously activated a partial offline shell and
  deleted the working previous version. Require all shell files before activation.
- Cache writes were unawaited; quota errors could reject without a handler.
  Await writes inside the fetch lifetime and tolerate storage failures. Keep the
  tile-index background refresh alive with synchronous `event.waitUntil`.
- Navigation now uses the cached shell on HTTP errors as well as network failures.
- Origin-wide activation deleted other project bases' caches. Namespace shell and
  asset caches by scope; retain the existing full-URL-keyed tile cache, preserving
  downloaded tiles across this upgrade. Legacy unscoped shell/asset caches remain
  untouched because their owning deployment is ambiguous.
- All `data/` was permanently cached as tiles, including editable mission/POI/prop
  JSON. Restrict the persistent path to `data/tiles/`. Version mutable assets with
  deployments, and hash worker logic plus shipped non-tile files so content-only,
  manifest and icon changes refresh the version too.

## Audited paths and retained budgets

- `resolveQuality`: URL tier beats saved tier; `?tier=auto` forces detection;
  software/tiny GPUs and weak phones pick Low. Screen short-side detection is
  orientation-independent; desktop-UA iPadOS is recognised. Added rotation and
  locked-down GPU/iPadOS unit cases. The existing fresh-profile default is fixed
  Medium; auto detection/dynamic resolution require Auto or `?tier=auto`.
- DPR caps remain Low/Medium/High 2, Ultra 3; dynamic resolution defaults to floor
  0.5. These deliberate existing defaults need device measurement before retuning.
- No shadow maps are enabled and no scene lights set `castShadow`; shadow budget
  is zero. Low bypasses post processing, bloom, god rays, caustics and MSAA targets.
  Low retains 600 marine-snow points and two plain beam cones (six shader steps).
- Low environment presets skip visuals (particle scale 0); set-piece plumes use
  geology scale 0.35. Life is capped at 44 agents / four species / 48 sparks;
  incidental events use 100 particles. Existing ocean and static hero-budget tests
  cover those broader paths; no unmeasured density cuts were made.
- Renderer resize updates camera aspect, drawing buffer, post target dimensions
  and automatic UI scale. CSS media queries select orientation layouts. Touch
  controls use all four safe-area insets; `viewport-fit=cover` is present.
- Manifest start URL, id, scope and icon URLs resolve at both `/` and project
  bases. Landscape/fullscreen requests are advisory on some browsers; portrait
  play remains available. Automation intentionally skips worker registration.
- Offline availability covers the precached shell and content fetched after the
  worker controls the page. The first dive may load tile data before registration
  (currently registered by the touch system); reload/revisit online after worker
  activation before expecting that site's data offline. Never-visited sites are
  not downloaded automatically. Persistent tile ids are assumed immutable.

## Validation

- Focused quality/touch/worker/plugin suite: 48 tests passed with
  `npx vitest run --configLoader runner ...`.
- `tools/gates.sh`: build, unit (957 tests in 92 files), Python (128 tests),
  content, attribution and whole-repository Prettier gates passed. Project-base
  production build also passed. Both e2e gates failed before tests: preview server
  could not start. A direct runner-mode preview confirmed
  `listen EPERM: operation not permitted 127.0.0.1:4371`; this sandbox cannot
  listen on localhost and forbids permission escalation. Browser/visual tests
  remain unexecuted.
- Final listener/boundary refinements passed the full unit suite and strict
  typecheck. Changed files were formatted; `git diff --check` passed.
- Shared `node_modules` is read-only; default Vite/Vitest config bundling cannot
  write `.vite-temp`. Runner-mode unit tests work. Runner-mode production build
  hits the existing Vite closed-module-runner error in the PWA close hook. A local
  dependency-directory facade in `/tmp` provided writable config/cache folders
  while running the unchanged `tools/gates.sh`; the original symlink was restored
  and the facade removed afterwards. No package/config changes were needed.

## Real-device checks still needed

- iOS Safari and installed iOS/Android PWA: portrait/landscape rotation while
  holding stick/slider/Scan, expanded sonar, pause and photo mode; ensure neutral
  controls and correct aspect/layout after rotation and browser-bar changes.
- Notched phones: both landscape directions and portrait; check HUD/card/credit
  separation, home indicator clearance, all touch targets and enlarged UI scales.
- Low-tier thermal/FPS/readability at the five hero sites on a budget phone at
  native DPR, then Auto; record `__game.perf` and assess the retained DPR-2 cap.
- Install online, wait for control, revisit a site, then airplane-mode relaunch at
  root/project bases. Check cached versus unvisited sites, deploy update, limited
  storage/eviction, and two different project installs on the same origin. VM
  tests exercise worker logic but do not validate browser lifecycle or eviction.
- Confirm advisory landscape/fullscreen manifest behavior, browser safe-area
  values, and GPU strings/hidden RAM-core hints on actual Safari and Chrome.
