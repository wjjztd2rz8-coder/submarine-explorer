# F-LOWTIER-990 — all-site Low / phone sweep

Director item 5. **Incomplete: both capture attempts were blocked by the execution
sandbox; zero screenshots were produced.** Per-site visual defects remain
unassessed. No HUD or lighting changes were made without visual evidence.

## Scope and progress

- All 13 catalog sites, Low tier, 390×844 portrait and 844×390 landscape.
- Fresh Arcade profile, touch controls, tutorial off, life seed 42, dynamic
  resolution off. Phone viewport emulation with Chromium/SwiftShader; this does
  not measure physical-phone GPU, thermal, or touch hardware behavior.
- Tooling complete: opt-in `GOLDEN_TIER=low`, `GOLDEN_LAYOUTS=portrait,landscape`,
  `GOLDEN_SITES=all`; default High / desktop / original hero selection preserved.
  Named selection also supports the six added sites. Both Blue Hole galleries
  are included: 82 planned PNGs per round (13 openings, 28 approach/detail views,
  in two orientations).
- Capture manifests now include requested tier, load duration, seven frame-time
  samples, visible HUD rectangles, feature mesh counts, and layout on failures.
  Frame samples are a short stall indicator, not a hardware performance benchmark.
- Round 1 attempted: `.cache/golden/2026-10-09-024714/poses.json` and `index.html`.
- Round 2 attempted: `.cache/golden/2026-10-09-025002/poses.json` and `index.html`.
  Both manifests say `complete: false`, have zero captures, and retain the full
  browser failure log. The empty contact sheets are failure evidence only.

## Confirmed blocker and severity

**S1 capture infrastructure blocker, shared by all sites.** Vite preview cannot
bind `127.0.0.1:4990`: `listen EPERM: operation not permitted`. Chromium also
aborts before navigation with `sandbox_host_linux.cc:41`, `shutdown: Operation
not permitted (1)`, and SIGTRAP. Full e2e exits because its preview server cannot
start (`.cache/990/preview.log`, `.cache/990/e2e.log`). This environment has restricted networking and no approval path; this
is not evidence of a game stall or a site defect.

Severity scale: S1 blocks play/capture; S2 major readability/overlap/stall;
S3 visible quality issue. **Unassessed** means no screenshot was available;
it does not mean a site passed.

## Per-site review ledger

The filenames below are **planned, missing PNGs**, relative to the round-2 folder
`.cache/golden/2026-10-09-025002/`. Each pattern denotes shots 1, 2 and 3.
For every row, darkness, HUD overlap, missing visible geometry, and performance
stalls remain unassessed. S1 refers to the shared capture blocker, not a game bug.

| Site                 | Portrait screenshot paths (missing)         | Landscape screenshot paths (missing)         | Defect / severity                                                                 |
| -------------------- | ------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| titanic              | `titanic-portrait-{1,2,3}.png`              | `titanic-landscape-{1,2,3}.png`              | Unassessed; capture blocked / S1                                                  |
| challenger-deep      | `challenger-deep-portrait-{1,2,3}.png`      | `challenger-deep-landscape-{1,2,3}.png`      | Unassessed; capture blocked / S1                                                  |
| lost-city            | `lost-city-portrait-{1,2,3}.png`            | `lost-city-landscape-{1,2,3}.png`            | Unassessed; capture blocked / S1                                                  |
| monterey-canyon      | `monterey-canyon-portrait-{1,2,3}.png`      | `monterey-canyon-landscape-{1,2,3}.png`      | Unassessed; capture blocked / S1                                                  |
| endurance            | `endurance-portrait-{1,2,3}.png`            | `endurance-landscape-{1,2,3}.png`            | Unassessed; capture blocked / S1                                                  |
| axial-seamount-ashes | `axial-seamount-ashes-portrait-{1,2,3}.png` | `axial-seamount-ashes-landscape-{1,2,3}.png` | Unassessed; capture blocked / S1                                                  |
| hudson-canyon        | `hudson-canyon-portrait-{1,2,3}.png`        | `hudson-canyon-landscape-{1,2,3}.png`        | Unassessed; capture blocked / S1                                                  |
| kamaehuakanaloa      | `kamaehuakanaloa-portrait-{1,2,3}.png`      | `kamaehuakanaloa-landscape-{1,2,3}.png`      | Unassessed; capture blocked / S1                                                  |
| beebe-vent-field     | `beebe-vent-field-portrait-{1,2,3}.png`     | `beebe-vent-field-landscape-{1,2,3}.png`     | Unassessed; capture blocked / S1                                                  |
| great-blue-hole      | `great-blue-hole-portrait-{1,2,3}.png`      | `great-blue-hole-landscape-{1,2,3}.png`      | Unassessed; capture blocked / S1; suspected terrace undersampling / S2, see below |
| bismarck             | `bismarck-portrait-{1,2,3}.png`             | `bismarck-landscape-{1,2,3}.png`             | Unassessed; capture blocked / S1                                                  |
| hunga-tonga-caldera  | `hunga-tonga-caldera-portrait-{1,2,3}.png`  | `hunga-tonga-caldera-landscape-{1,2,3}.png`  | Unassessed; capture blocked / S1                                                  |
| blake-plateau-corals | `blake-plateau-corals-portrait-{1,2,3}.png` | `blake-plateau-corals-landscape-{1,2,3}.png` | Unassessed; capture blocked / S1                                                  |

Additional Blue Hole east-gallery evidence is also missing:
`great-blue-hole-east-portrait-{2,3}.png` and
`great-blue-hole-east-landscape-{2,3}.png`. Its opening shares the west-gallery
site opening, matching existing golden behavior.

## Blue Hole terraces and Lost City fingers on Low

A headless audit used the actual tile, terrain, props, and golden pose helper;
it did not render screenshots. Diagnostic output:
`.cache/990/geometry-audit.json`. The helper's triangle census covers desktop and
portrait, not landscape; the new projection tests cover both phone orientations.

- **Blue Hole terraces (merged 755a430): suspected S2 geometry/readability defect,
  requires visual confirmation.** The tile cells are 58.38×61.15 m, while Low
  uses `nearSubdiv.low = 1` and the terrace relief has roughly 6–13 m spacing.
  The terraces run at every tier, but the Low wall mesh cannot resolve that
  spacing faithfully. This is a geometry/budget decision, outside the safe HUD
  and darkness scope. Do not increase Low subdivision without measuring its
  phone cost and reviewing captures. Headless checks found zero failed props,
  7,560 west-gallery vertices, 9,180 east-gallery vertices, and preserved gallery
  targets in both phone orientations. Low rendered terrain agrees with collision
  sampling at the tested gallery seats. These checks do not establish that
  terraces or gallery lighting are visually readable.
- **Lost City fingers: visual severity unassessed.** The branching-finger build
  is outside any tier exclusion and uses Low mesh density. The actual Low
  Poseidon rock mesh contains 59,232 vertices and nonempty finite geometry;
  zero props failed. Golden approach/detail targets remain inside both phone
  viewports. This confirms loading/framing, not a convincing finger silhouette.
  Director's prior tubular/flat-top and tiered-spire concerns remain open until
  screenshots can be inspected.

## Validation

- Build: passed, zero TypeScript errors (`.cache/990/build-final.log`).
- Capture option/catalog regressions: 5 passed (`.cache/990/options.log`), including
  unchanged defaults, exact phone sizes, aliases, invalid settings, complete
  13-site coverage, valid hero IDs, and fail-closed handling of new catalog sites.
- New Low phone geometry/projection tests: 2 passed
  (`.cache/990/phone-geometry.log`).
- Existing Blue Hole terrace and Lost City surface checks: 12 passed
  (`.cache/990/low-geometry.log`).
- Python: 148 passed (`.cache/990/python.log`).
- Full unit suite: **1,575 passed across 157 files**, including the two new Low
  phone geometry tests (`.cache/990/unit-final.log`). Run used
  `--configLoader runner --cache=false --pool=threads --maxWorkers=1`.
- Full e2e (`FULL_E2E=1`): attempted, blocked before tests by preview startup
  (`.cache/990/e2e.log`).

## Reproduce the outstanding capture/review

On a runner that permits local preview and Chromium:

```bash
GATES_CONFIG_MODE=writable GOLDEN_TIER=low GOLDEN_LAYOUTS=portrait,landscape GOLDEN_SITES=all tools/golden.sh
# Inspect every PNG, record observed per-site severity and paths, then repeat
# after any small, tested HUD/darkness fixes for the second review round.
```

Run option tests with `node tools/tests/golden-options.test.mjs`. Capture and
inspect the full set before marking Director item 5 complete. Physical-phone
performance still requires device testing after these viewport captures.
