# S-bughunt: Home → site picker → briefing → first minute

Date: 2026-10-27. Baseline: `c9fca0faefdd8f88b2b8c5c61c3c69dab1039eef`.

**Status: partial; live browser acceptance is blocked by the execution sandbox.**
Read `plan/DIRECTOR.md` and `CONTRIBUTING-AGENTS.md`. Reviewed the Home,
embedded globe, site-sheet gesture, briefing, modal ownership, tutorial and scan
guidance paths. No new game-code defect on the requested mission path was
verified. No runtime/layout acceptance or screenshots are claimed.

## Clear defects fixed

The existing opt-in first-minute audit could no longer reach a dive:

1. It called a dive-ready function on Home, reading `discovery.loaded` even
   though Home intentionally creates no discovery system. It now uses
   `homeReady`; dive entry uses the existing `diveReady` helper.
2. Its Home capture dereferenced discovery, tutorial and submarine objects that
   do not exist there. Capture records now handle the shell separately through
   optional runtime reads, and include the URL, mission, served build provenance,
   visible text and panel rectangles.
3. Its portrait selection tried to click a row in the collapsed sheet. It now
   opens the sheet with native touch input. The existing sheet regression in
   `globe-pins.spec.ts` also uses that shared native-touch helper in place of a
   mouse drag; its keyboard-after-swipe and focus-return assertions are retained.

Extended the existing first-minute audit to include 844×390 touch and a globe
entry in each layout, alongside the existing desktop 1280×800 and 390×844 touch
list journeys. List journeys cover all 13 sites; globe journeys select an
actually displayed, unclustered mission pin, preview it on the first touch tap,
then launch it on the second. Portrait uses the swipe-up sheet; landscape uses
the existing side-by-side list. The existing fresh-player briefing-cancel and
covering-dialog regression in `d-shell.spec.ts` also now includes landscape touch.

The audit remains opt-in and uses a fresh player, Low graphics, native pilot
input and real elapsed discovery time through 60 seconds. It captures Home,
picker, briefing and 0/10/20/30/40/50/60-second views. It follows movement and
depth coaching, then holds scan when prompted. Touch captures reject keyboard
key names and reuse `expectCompactPhoneHud` during play. No pose, physics,
tutorial-completion or clock injection was added to these journeys.

No new package-named spec or player-facing surface was added. No art, HUD
layout or tuning changes were made without rendered evidence.

## Remaining findings and acceptance work

| Finding                                                                     | Evidence and disposition                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Both entry paths in all three layouts still need a live run.                | Preview fails with `listen EPERM` on `127.0.0.1:4680`; direct Playwright Chromium launch also fails at `sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`. Overlaps, hit testing, stuck dialogs and real first-minute behavior remain **unverified**.                                                 |
| Cancellation and covering-dialog behavior need live landscape confirmation. | Source supplies Back to menu, Back to home and stacked Escape ownership. Existing `d-shell`, `globe-pins` and onboarding specs cover these behaviors, but a source/unit pass cannot establish touch reachability.                                                                                                  |
| Some required objectives carry specialist names.                            | Examples in mission content: “Scan the Desmophyllum pertusum thicket” and “Scan the Rimicaris hybisae swarm.” These are factual target names; shortening or moving their scientific names is an editorial decision, deferred.                                                                                      |
| First-minute directions use nautical vocabulary.                            | `ScanOverlay.objectiveCue` emits PORT/STARBOARD. A casual-player reading test should establish whether left/right would help; no copy substitution made.                                                                                                                                                           |
| Site rows include hull classes, stars and Journal counts.                   | `MissionSelect` renders these in the shell picker. Whether the first visit needs all three is a simplification/design question, not a demonstrated overlap.                                                                                                                                                        |
| Free dive has a source-level routing inconsistency adjacent to this path.   | `Home.showSites(true)` changes only the list presentation. The embedded globe retains mission-state pins, and `Globe.select` routes those through `missionUrl`. Thus a globe choice from the Free dive subview still selects a mission. Recorded for follow-up; this hunt's mission-to-briefing path is unchanged. |
| The standalone globe has keyboard-only instructional copy on touch.         | Its header/hint contains ESC, TAB and ENTER. The embedded Home globe hides those elements, so this is outside the requested Home picker. Deferred rather than changing the separate overlay here.                                                                                                                  |

Briefing facts/hazards are already behind About this site; Advanced is
collapsed, and touch suppresses the Enter hint. Tutorial text already names
the left stick, right slider and SCAN on touch. These are source observations,
not a rendered copy/layout pass.

## Validation

- Production build and TypeScript: passed using the repository's existing
  writable bundled-config workaround. Default Vite config loading cannot write
  shared `node_modules/.vite-temp`; runner loading hits the known PWA late-import
  lifecycle error. The native bundled config succeeds. Logs:
  `.cache/4680/build-baseline.log`, `.cache/4680/build-final.log`.
- Focused unit capabilities: **6 files, 397 tests passed** (`homeFocus`,
  `overlayFocus`, `globe`, `navigation`, `f3Onboard`, `guidance`). Log:
  `.cache/4680/units-baseline.log`.
- Full unit suite: **192 files, 4,336 tests passed**, 671.85 seconds. Log:
  `.cache/4680/units-full.log`.
- Python suite: **167 tests, 5 failures**. Four CI-manifest cases fail with
  `spawnSync git EPERM`; the golden-tooling wrapper fails when a comparison
  subprocess produces empty JSON output. These files were not changed. Log:
  `.cache/4680/python.log`.
- Playwright collection: **64 tests in the three touched specs**, including 42
  opt-in first-minute journeys (13 list sites + one globe choice × 3 layouts).
  Collection is not execution. Log: `.cache/4680/e2e-collection.log`.
- Targeted e2e execution: blocked before any test ran because its preview server
  could not start. Log: `.cache/4680/e2e-attempt.log`.
- Final TypeScript, formatting of changed files and `git diff --check`: passed.
  The isolated `dist-4680` output was removed after checking; logs are retained.

To resume the six representative journeys, sheet regressions and fresh-player
cancellation checks with browser access, rebuild into an isolated output, then run:

```bash
FIRSTMIN_AUDIT=1 FIRSTMIN_ROUND=4680-after \
PW_PORT=4680 PW_OUTDIR=dist-4680 GATES_CONFIG_MODE=writable \
npm run test:e2e -- tests/e2e/f-first-minute-620.spec.ts \
  tests/e2e/globe-pins.spec.ts tests/e2e/d-shell.spec.ts \
  --grep 'first minute (titanic|globe)$|sheet keeps keyboard|Home Journal shortcut'
```

The audit writes screenshots and manifests under
`.cache/codex/shots/620/4680-after/`. Dropping the grep runs the all-site matrix
and the existing guidance/sheet cases. Inspect those captures before accepting
any geometry or visual verdict; real-phone input/rotation remains separate
from Chromium touch emulation.

## Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh` outside the sandbox and reported passes
for Python, content, build, units, smoke e2e, project-base e2e and attribution.
The only failure was Prettier: `plan/progress/P2-globe-bright.md` lacked a blank
line before its bullet list. Applied Prettier to that exact file; its content
and all assertions are unchanged. Failure log:
`.cache/runs/20261027-091827-3318623-ngqjq7/prettier.log`.

The repository-wide formatting check and `git diff --check` pass after the fix.
The orchestrator's smoke/project-base run does not establish completion of the
opt-in first-minute journey matrix above.
