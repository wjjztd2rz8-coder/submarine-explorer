# F-VERIFY-1000 — merged 940 / 950 verification

2026-10-08. Checkout `c669b22` (includes 940, the corrected 950 Endurance
heading, 960 and 970). **Headless checks pass; the externally reproduced Journal
selector failure is fixed; post-fix browser acceptance is pending.**
No gameplay defect was reproduced that justified a production change. Added
regression coverage and a browser verification matrix; existing assertions
and production tuning remain intact.

## Plan and scope

1. Check actual shipped terrain, props, default Arcade mission spawn and scanner
   on Great Blue Hole / Monterey, Low / Medium / High, desktop and 390×844.
2. Check current Journal mission summaries, first-scan unlocks and historical
   objective credit; preserve old discovery and progress storage.
3. Exercise Challenger / Endurance opening wildlife and submarine physics for
   60 seconds; check staged provenance, `life=0`, framing and seabed clearance.
4. Run two full gate rounds and inspect fresh browser captures for clipping,
   HUD fit and Low versus Medium brightness. Record blocked checks explicitly.

## First required scans

These are simulations against shipped terrain and procedural scenery, using
the authored mission spawn, real `Submarine`, `Scanner` and `Mission`, Arcade
speed/descent settings and Extended sensors. Hold Scan with neutral movement:
**neither route requires any transit**. First objective completion updates the
real mission state. The physics continues through 60 seconds at 60 Hz.

| Site            | Tier   | First target range (3D m) | Scan completed (s) | Minimum centre altitude (m) | Lowest visible hull vertex at spawn (m above floor) |
| --------------- | ------ | ------------------------: | -----------------: | --------------------------: | --------------------------------------------------: |
| Great Blue Hole | Low    |                     98.74 |               4.02 |                       58.91 |                                               43.12 |
| Great Blue Hole | Medium |                    100.11 |               4.02 |                       51.59 |                                               21.78 |
| Great Blue Hole | High   |                    100.18 |               4.02 |                       50.99 |                                               21.29 |
| Monterey Canyon | Low    |                     45.15 |               3.02 |                       29.09 |                                               19.97 |
| Monterey Canyon | Medium |                     44.63 |               3.02 |                       27.70 |                                               16.98 |
| Monterey Canyon | High   |                     44.35 |               3.02 |                       28.03 |                                               17.19 |

Each physics tick retains at least the 12 m centre clearance required by the
8 m hull sphere plus 4 m seabed margin. No pressure breach occurs. Chase
cameras at 1600×900 and 390×844 retain their terrain clearance throughout
the idle minute. Actual hull vertices are independently checked at spawn,
including instanced geometry. This does not establish collision safety for
arbitrary later steering, pitched hulls, or every terrain triangle.

Evidence: [mission measurements](../../.cache/verify-1000-missions.json),
[focused checks](../../.cache/verify-1000-hull.log).

## Objectives, Journal and saves

- Blue Hole first primary is `stalactites`, POI
  `great-blue-hole-stalactites`, displayed scan name **Stalactite gallery**.
  The Journal maps that POI to the existing `the-hole` entry and inherits the
  current briefing's stalactite-gallery summary.
- Monterey first primary is `canyon-wall`, POI `monterey-canyon-wall`,
  displayed scan name **North canyon wall**. Its Journal entry is `canyon-wall`
  and its briefing directs the pilot to the north wall before the upper channel.
- New Journal integration tests load the shipped files, check both summaries,
  resolve each promoted primary to its existing entry and verify that its scan
  unlocks that entry. The debrief's scan list takes the current POI name.
  Actual rendered Journal and debrief checks are in the new browser spec. The
  external run reached the Journal, but the site-count selector failure stopped
  the summary and debrief checks; see the follow-up below.
- Existing migration regressions pass for the old Blue Hole
  `outer-dropoff` / `western-dropoff` route, old Monterey
  `canyon-head` / `upper-channel` route and both revised routes. Earned ratings
  and discovery records survive reload; repeat migration is idempotent, and
  old Blue Hole completion does not grant an unscanned gallery objective.
  A new mission still requires its own scans.

## Challenger and Endurance: first minute

Extended the existing real-tile opening tests from 10 to 60 seconds. The real
submarine runs for all 3,600 physics ticks; wildlife uses its normal simulation
and scanner. Existing target projection, whole-hull screen fit, reticle
separation, wildlife sightline, depth-budget, wreck attachment, reset and
remote-start assertions remain. Low / Medium / High / Ultra all pass.

| Site            | Tier   | Staged animals at 60 s | Minimum centre altitude (m) | Lowest visible hull vertex at spawn (m above floor) |
| --------------- | ------ | ---------------------: | --------------------------: | --------------------------------------------------: |
| Challenger Deep | Low    |           12 amphipods |                       22.47 |                                               15.91 |
| Challenger Deep | Medium |           18 amphipods |                       22.47 |                                               15.90 |
| Challenger Deep | High   |           18 amphipods |                       22.32 |                                               15.74 |
| Endurance       | Low    |             5 anemones |                       22.00 |                                               15.32 |
| Endurance       | Medium |             8 anemones |                       22.01 |                                               15.32 |
| Endurance       | High   |             8 anemones |                       22.07 |                                               15.37 |

The staged groups survive the minute; no hull breach or physics-sphere seabed
penetration occurs. Opening facing retains the unchanged `> 0.98` threshold.
Existing independent geometry checks cover desktop 1600×900 / 1280×720 and
portrait 390×844. Each staged species has one Journal entry whose provenance
is **Game addition**. Two new lifecycle tests prove `?life=0` returns before
loading life content, creates no animal scene objects or scan targets and
exposes `life: null` for both sites.

Evidence: [deep measurements](../../.cache/verify-1000-deep.json).

## Browser matrix and remaining findings

`tests/e2e/f-verify-1000.spec.ts` adds 24 cases: four sites × three tiers × two
viewports, with touch capability enabled at 390×844. Mission cases hold the
real Scan input at the actual spawn, check objective completion within 120 s,
open the Journal and surface into the debrief. Deep cases run a minute, check
life staging and the single visible Journal tag, then reload with `life=0`.
They retain screenshots and JSON measurements. Clock advances are 100 ms so
six physics ticks fit below the engine's eight-step cap; elapsed browser
clock time is not substituted for a skipped physics backlog. No teleport,
physics replacement or synthetic scan-completion event is used.

No browser is connected: Browser skill setup and recovery returned no available
browser and an empty browser list. The standalone Playwright probe also failed
before tests because its owned preview server could not start. A
[direct preview diagnostic](../../.cache/verify-1000-preview-diagnostic.log)
confirmed `listen EPERM: operation not permitted 127.0.0.1:4191`.

**Open finding: Low versus Medium brightness is unverified.** The direct Low
render path applies the band's exposure gain, whereas Medium's post shader
also adds a shadow readability floor and bloom. That creates a plausible risk
of darker unlit pixels on Low. It is source evidence, not a measured screenshot
regression. A matched rendered comparison is needed before choosing a lighting
fix; the new captures provide both tiers for that review. The common lighting
and deep-site ambient fill alone cannot establish pixel brightness parity.

Also pending: complete human inspection of opening/detail visibility, actual
mobile HUD occlusion, decorative-hull intersections under movement, and
documentary contrast/particle density. Local runs produced no screenshots;
the external run later supplied opening and first-scan captures, partially
reviewed below. Full visual acceptance remains pending.

## Validation

The focused final checks pass: **5 files / 43 tests**, including both historical
route migrations and the two new Journal and two new disabled-life checks.
Typecheck and Playwright discovery pass; all 24 new browser cases are listed.

Both final full gate rounds finished with identical results:

| Gate                                             | Round 1                        | Round 2                        |
| ------------------------------------------------ | ------------------------------ | ------------------------------ |
| Production build / typecheck                     | Pass                           | Pass                           |
| Unit tests                                       | 157 files / 1,577 passed       | 157 files / 1,577 passed       |
| Python                                           | 148 passed                     | 148 passed                     |
| Strict content (13 sites), attribution, Prettier | Pass                           | Pass                           |
| Full browser E2E                                 | Blocked before tests (`EPERM`) | Blocked before tests (`EPERM`) |
| Project-base browser E2E                         | Blocked before tests (`EPERM`) | Blocked before tests (`EPERM`) |

Each `tools/gates.sh --full-e2e` invocation exited 1 because both browser gates
failed to start their owned preview servers. The logs record rejected IPv4 and
IPv6 loopback connections, independently confirmed by the direct listener
failure above. Zero gameplay browser tests ran in either round; these are not
passing E2E results.

- [Round 1 summary](../../.cache/verify-1000-round1/summary.log),
  [unit](../../.cache/verify-1000-round1/unit.log),
  [browser](../../.cache/verify-1000-round1/e2e.log),
  [project-base](../../.cache/verify-1000-round1/e2e-base.log).
- [Round 2 summary](../../.cache/verify-1000-round2/summary.log),
  [unit](../../.cache/verify-1000-round2/unit.log),
  [browser](../../.cache/verify-1000-round2/e2e.log),
  [project-base](../../.cache/verify-1000-round2/e2e-base.log).

Both commands used `DEBUG=pw:webserver PW_PORT=4190 PW_OUTDIR=dist-1000
VITEST_MAX_WORKERS=2 GATES_CONFIG_MODE=writable tools/gates.sh --full-e2e`.
The temporary production build was removed after the two rounds. Final
report formatting and `git diff --check` also pass.

External acceptance command:

```sh
VITEST_MAX_WORKERS=2 GATES_CONFIG_MODE=writable tools/gates.sh --full-e2e
```

Afterward inspect the new `first-scan.png`, `debrief.png`, `opening.png`,
`60-seconds.png` and `journal.png` attachments in both viewports, comparing
Low and Medium canvas regions at matched poses. The merged work is not marked
visually accepted by these headless results.

## External gate follow-up — Journal navigation selector

The orchestrator ran `tools/gates.sh --full-e2e` outside the sandbox. Build,
all 1,577 unit tests, 148 Python tests, strict content, attribution, Prettier
and project-base E2E passed. Full E2E reported **495 passed, 49 skipped,
24 failed** in 38 minutes. Every failure was in the new F-VERIFY-1000 matrix,
at the same exact-count assertion: expected 13 site buttons, received 15,
16 or 17. All twelve first-scan cases and all twelve deep first-minute cases
had already passed their preceding gameplay assertions and saved captures.

Root cause: my `.jr-nav-item.is-site` selector included nested Journal guide
entries of kind `site`. `Journal.renderNav()` renders thirteen top-level site
buttons; `siteEntryList()` adds `is-entry is-site` buttons under the expanded
site. Monterey contributes two such entries, Blue Hole three, and Challenger
and Endurance four. The Journal itself was displaying the intended structure.

The corrected selector is `.jr-nav-list > li > .jr-nav-item.is-site`, used for
the count and site selection in both test paths. The **exact count of 13 stays**.
Scan timing, transit, clearance, breach, Journal summary, debrief name, single
provenance tag and disabled-life assertions retain their original bounds and
expected values. No production UI, CSS or gameplay changes were made.

A new small browser fixture reproduces all three reported counts with the
same nested classes and structure. It checks that the original selector finds
15/16/17 buttons, while the corrected selector finds exactly 13 and resolves
every shipped catalogue site id in order. The spec now lists **25 cases**:
24 gameplay cases plus this selector regression.

Evidence and validation:

- [External pre-fix full E2E log](../../.cache/verify-1000-external-before/e2e.log),
  [passing project-base log](../../.cache/verify-1000-external-before/e2e-base.log).
  All 24 failures have the same selector mismatch; no assertion was weakened.
- Post-fix typecheck, targeted Prettier and `git diff --check`: **pass**.
  [Playwright discovery](../../.cache/verify-1000-browser-matrix-after.log):
  all 25 cases listed.
- Post-fix Journal content, migration and disabled-life unit checks:
  **3 files / 19 tests pass**.
  [Focused log](../../.cache/verify-1000-selector-focused.log).
- Post-fix browser execution: **pending external rerun**. The supplied browser
  gate is pre-fix evidence, not a passing post-fix run. This sandbox still
  cannot run Vite or Chromium; no duplicate failing local browser attempt was
  made for this follow-up.

Two supplied Low/Medium opening pairs were directly inspected:

- [Challenger desktop Low](../../test-results-gates-4372-483572/f-verify-1000-1000-1600x90-cbea6--one-Journal-tag-and-life-0-chromium/opening.png)
  and [Medium](../../test-results-gates-4372-483572/f-verify-1000-1000-1600x90-8db79--one-Journal-tag-and-life-0-chromium/opening.png).
- [Endurance portrait Low](../../test-results-gates-4372-483572/f-verify-1000-1000-390x844-a0680--one-Journal-tag-and-life-0-chromium/opening.png)
  and [Medium](../../test-results-gates-4372-483572/f-verify-1000-1000-390x844-faf63--one-Journal-tag-and-life-0-chromium/opening.png).

The hulls clear the visible floor in those captures. Low's lit seabed and hull
look brighter than Medium's in these pairs; Medium lifts the dark background
and adds substantially more marine snow. Endurance's Medium snow is visually
busy around the wreck and should remain part of the particle-density review.
These four images do not establish brightness parity across all sites,
viewports and poses, or complete the pending Journal/debrief/tag/life=0 checks.

Fast external verification of the correction, using a freshly built bundle:

```sh
PW_PORT=4372 PW_OUTDIR=<fresh-build> GATES_CONFIG_MODE=writable \
  npx playwright test tests/e2e/f-verify-1000.spec.ts
```

Then run the full external gate for final acceptance.
