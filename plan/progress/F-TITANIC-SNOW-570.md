# F-TITANIC-SNOW-570

## Plan

1. Capture Titanic golden poses 1–3 before changing permanent snow.
2. Reduce the GPU particle budgets and metre/pixel size, soften alpha and lamp
   brightness, and fade snow with camera distance. Retain drifting depth cues,
   deterministic seeding, one draw, and cheap Low rendering.
3. Update snow-count/readability regressions deliberately. Keep scene lighting
   and the wreck sediment foreground guard independent of permanent-snow tuning.
4. Compare the same three golden poses after the change; run full gates including
   E2E, and log the outcome and any execution limits here and in CHANGELOG.md.

## Progress

- The baseline permanent field uses 600/3,000/9,000/9,000 particles. Its 6–12 m
  guard resumes full alpha/lamp flare beyond 12 m. Fog retains a 55% alpha floor,
  so distant flakes remain conspicuous against dark water.
- Baseline build requires the existing writable-config workaround because
  `node_modules/.vite-temp` is read-only.
- Local Chromium launch currently fails before creating a page:
  `sandbox_host_linux.cc:41 ... shutdown: Operation not permitted (1)`.
  Rendered comparison is pending; no screenshot result is claimed.

- Implemented permanent field budgets 300/1,200/3,000/3,000, metre size 0.08,
  pixel cap 3, opacity 0.24 and lamp gain 0.8. Radial alpha fades from zero at
  the lens to full strength at 12 m, then to zero between 40 and 80 m. Ambient,
  fog, band density, lamp reach, drift and deterministic seed generation remain
  unchanged. One draw, no CPU particle loop or buffer upload per frame.
- The prior 460 audit and current shader inspection show a second lower-frame
  contributor: wreck sediment outside the 12 m guard. Titanic's existing
  overrides now reduce haze from 9,000 to 1,800 particles, size 1.1 to 0.25 m,
  alpha 0.12 to 0.05; rust motes from 700 to 180 per hull, size 0.35 to 0.15 m,
  alpha 0.3 to 0.16. Other wreck settings retain their defaults. Low has no
  sediment/mote layers, and retains just 300 permanent snow vertices.
- Updated allocation expectations deliberately and retained all-site/tier
  foreground and atmosphere regressions. Added radial fade/attenuation and GPU
  drift/buffer retention checks, plus actual Titanic haze/mote material and
  allocation bounds. The code audit uses the exact pre-570 alpha formula so its
  baseline does not accidentally inherit the new distance fade.

## Golden Titanic 1–3 review

| Shot                        | Before                               | After                                | Comparison                               |
| --------------------------- | ------------------------------------ | ------------------------------------ | ---------------------------------------- |
| titanic-1 (spawn, chase)    | Capture blocked before page creation | Capture blocked before page creation | Pending rendered hull/readability review |
| titanic-2 (40 m, cockpit)   | Capture blocked before page creation | Capture blocked before page creation | Pending drifting depth cues review       |
| titanic-3 (detail, cockpit) | Capture blocked before page creation | Capture blocked before page creation | Pending close hull-detail review         |

Both `GOLDEN_SITES=titanic node tools/golden-shots.mjs --base-url
http://localhost:4570/` attempts fail at Chromium launch, with no captures.
Failure manifests: `.cache/golden/2026-10-04-082322/poses.json` and
`.cache/golden/2026-10-04-082828/poses.json`; logs:
`.cache/snow570/golden-before.log` and `.cache/snow570/golden-after.log`.
The Browser skill connection reports no available browsers. Preview also fails
with `listen EPERM 127.0.0.1:4570`. No visual improvement, rendered luminance or
far-water lighting result is claimed from these failed captures.

Baseline and final builds are retained as `dist-snow570-before` and
`dist-snow570-after`. In an environment with browser/localhost access, serve each
in turn and capture the same three poses:

```bash
# Terminal 1; repeat with dist-snow570-after for the second capture.
npx vite preview --port 4570 --strictPort --outDir dist-snow570-before \
  --config .cache/snow570/vite.config.mjs --configLoader native
# Terminal 2
GOLDEN_SITES=titanic node tools/golden-shots.mjs --base-url http://localhost:4570/
```

## Validation

- Writable native config fixes the build's read-only dependency cache issue.
- An initial new attenuation assertion used a maximum-size flake which hits
  the 3 px cap at both distances; corrected it to test fine dust below the cap.
  Full unit suite subsequently passed: 123 files, 1,310 tests.
- Final command: `SNOW_AUDIT=1 GATES_CONFIG_MODE=writable PW_PORT=4570
PW_OUTDIR=dist-snow570-after tools/gates.sh --full-e2e`.
  Build/typecheck, all **123 unit files / 1,310 tests**, **144 Python tests**,
  strict content, attribution and repository formatting passed.
- Full E2E and project-base E2E were attempted; both stopped before tests at
  `config.webServer ... unable to start` (localhost binding is forbidden).
  The project-base build passed. These are execution blocks, not passing E2E.
- Final logs: `.cache/snow570/gates-final-site.log` and `.cache/gates/*.log`.
  Audit data: `.cache/snow-audit-measurements.json`.

## Headless evidence (not golden screenshots)

The permanent-snow audit projects actual free/mission opening cameras at
1280×720 and the seeded point pool. The lower-third proxy sums
`size² × centre alpha × linear brightness`; it excludes depth occlusion and
post processing. Before/after below use the **same retained seeds and new
particle count**, so they isolate sprite changes and do not count the further
saving from the smaller pool. They do not measure pixel luminance.

| Titanic tier | Free opening proxy, before → after | Mission opening proxy, before → after |
| ------------ | ---------------------------------- | ------------------------------------- |
| Low          | 3.31 → 0.29                        | 7.81 → 0.45                           |
| Medium       | 26.78 → 1.62                       | 22.85 → 1.01                          |
| High / Ultra | 55.99 → 2.93                       | 97.61 → 6.18                          |

Titanic High/Ultra now allocate 1,800 haze and 1,080 rust-mote vertices (previously
9,000 and 4,200). At 20 m, the maximum authored haze diameter at a 720 px buffer
falls from 46.13 to 10.48 px, and the mote diameter from 15.73 to 6.74 px;
these broad sediment layers retain their separate sprite role and existing
foreground guard. Medium allocates 900 haze / 540 motes; Low allocates neither.
The permanent field separately caps all flakes at 3 buffer pixels. Hull geometry,
spawn poses and Titanic ambient fill are unchanged. Rendered confirmation of
ship readability and the remaining drifting cues is still outstanding.

## External full-E2E gate follow-up

The orchestrator ran `tools/gates.sh --full-e2e` outside the sandbox. Build,
1,310 unit tests, Python, content, attribution and Prettier passed; project-base
E2E passed **8 tests**. The main suite reported **348 passed, 21 skipped, 1
failed**. The failure was `f3-onboard.spec.ts`'s touch-only photo flow: the held
Scan did not advance the tutorial from index 3 to 4. The visual-QA cases were
skipped, so this run does not establish the golden Titanic comparison.

Root cause: the onboarding test recorded its return position/yaw after only
`__gameReady`. That flag is set after the first rendered frame; Discovery loads
POIs/guide asynchronously, then performs the `?poi=test-bow` teleport and sets
`spawnedAt`. A snapshot taken first therefore records the tile opening rather
than the fixture scan approach. The test later restored that stale pose after
practising movement, leaving no target in the scan beam. The failure snapshot
shows the fixture sonar contact but no scan panel, consistent with that state.

Fix: the shared fixture boot helper now waits for `discovery.loaded`,
`discovery.spawnedAt === 'test-bow'`, and `scanner.view.candidateId === 'test-bow'`
before the test saves the pose. After returning to it, the touch flow asserts the
same candidate before pressing Scan. All original step-index, card text, touch
hit-target, photo/save, movement and Pause assertions and timeouts remain intact.
No tutorial events or input are bypassed, and no application behavior changed.

Follow-up validation:

- Build/typecheck passed; log `.cache/snow570/onboard-build.log`.
- Tutorial, spawn and touch-audit unit suites: **3 files / 48 tests passed**;
  log `.cache/snow570/onboard-unit.log`.
- Playwright discovers all five onboarding cases with the updated helper.
- Changed-file formatting and `git diff --check` passed.
- The browser rerun remains for the orchestrator; this sandbox cannot serve Vite
  or launch Chromium. The pre-fix external browser log is preserved as
  `.cache/snow570/orchestrator-e2e-before-onboard-fix.log`.

Focused external verification command (then rerun the full gate):

```bash
PW_PORT=4370 PW_OUTDIR=dist-snow570-after npx playwright test tests/e2e/f3-onboard.spec.ts
```

## Second external gate follow-up: Monterey unit timeout

The next orchestrator full gate passed build, Python, content, attribution,
formatting, **349 E2E tests** (21 skipped) and **8 project-base E2E tests**. This
confirms the onboarding fixture synchronization fix passes in Chromium. The only
failure was the Ultra Monterey wall-life unit case exceeding its existing
5,000 ms test limit at 5,114 ms; all other 1,309 unit tests passed.

The wall-life test constructs an entire surveyed seafloor mesh per tier, even
though its checks query `Terrain.sampleHeight` and raycast the independently
rendered prop apron. On the 820×638 tile, higher-tier mesh subdivisions allocate
and build unused extra vertices. The sampler uses measured bilinear heights,
terrain carving and tier-specific procedural noise; `detailSubdiv` controls only
mesh tessellation and never enters `sampleHeight`.

Fix: set only `config.terrain.tiers[tier].detailSubdiv = 1` in this test's fresh
config before constructing Terrain. Keep the real survey, detail strength,
noise octaves, seed, slope settings, every authored prop and full tier-specific
prop/apron geometry. All four tiers still run every original instance count,
seabed clearance, rendered-apron raycast, five-shape, planted-life and upper/lower
bound assertion. Neither assertions nor the 5,000 ms timeout changed; shipped
rendering and terrain configuration are untouched.

Validation:

- Focused Monterey suite: **4 tests passed**. Ultra completed in **1,369 ms**;
  suite duration was 3.74 s versus 4.81 s for the local baseline. These standalone
  timings differ from the orchestrator's contended full-suite timings.
- Typecheck passed.
- Full unit rerun: **123 files / 1,310 tests passed**, 37.01 s total.
- Changed-file formatting and `git diff --check` passed.
- Browser gates are already externally verified and this change affects only
  unit setup; no sandbox browser retry was attempted.
- Logs: `.cache/snow570/monterey-unit-before.log`,
  `.cache/snow570/monterey-unit-after.log`, `.cache/snow570/monterey-typecheck.log`,
  `.cache/snow570/unit-after-monterey-fix.log`. The external pre-fix failure and
  E2E successes are retained as `.cache/snow570/orchestrator-unit-before-monterey-fix.log`,
  `.cache/snow570/orchestrator-e2e-after-onboard-fix.log` and
  `.cache/snow570/orchestrator-base-after-onboard-fix.log`.
