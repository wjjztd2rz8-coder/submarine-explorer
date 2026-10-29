# S-hud-opening-dedupe

2026-10-29 — single target surface implemented; follow-up corrections applied for the orchestrator's 17 E2E failures. Current browser rerun remains blocked inside this sandbox. No merge or push.

## Decision and changes

The objective card owns the current target name, slant range and approach instruction on desktop and touch. The mission panel keeps its checklist, progress tally and completion choices. World navigation uses a diamond (or scanned tick) and a text-free offscreen arrow.

Removed waypoint labels and their formatter, DOM, styling and name-deduplication callbacks entirely. This avoids both duplicate guidance and text chips covering the sub/target without adding a collision-layout subsystem. Also removed the panel's target/bearing/depth/turn readout, hint, navigation maths, refresh timer and configuration setting. Checklist selection uses the scanner's ordered objective selector. Full authored hints remain in Pause → Objectives. Phone banner visibility belongs to the existing shared HUD layout model.

The implementation remains a net deletion. No site branch, tuning constant, media breakpoint or per-element positioning patch was added. Art, terrain, tools/ and DIRECTOR.md are unchanged. CHANGELOG.md records the cuts and help-dialog correction; docs/missions.md describes target ownership.

## Orchestrator gate evidence

External run: `.cache/runs/20261029-070358-679756-W0jms8/`.

- Python, content, build, unit, project-base E2E, attribution and Prettier: **PASS**.
- Full units: **4,420 tests / 192 files passed**, 626.97 s.
- Project-base browser tests: **8 passed**.
- Root E2E: **875 passed, 50 skipped, 17 failed**. This is the pre-follow-up result, not a passing result for the corrections below.
- All **26 catalog mission openings** and **6 waypoint layout cases** passed. Mission flow, saved visual-hint toggles, authored-copy sizing and HUD polish also passed.

The initial sandbox-only run's tooling/startup errors were environmental; the external run above supersedes them as the acceptance baseline.

## Root causes and corrections

| Failures                          | Root cause                                                                                                                                                                                                                                                          | Correction                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4 phone scan journeys             | The retired label rule still set the offscreen arrow to `display: none` under a ready scan card. During synchronous completion, the next objective's waypoint was measured as 0×0; the reward then exposed the arrow at that invalid position before another frame. | Deleted that obsolete scan-specific suppression rule. A text-free arrow now keeps its measurable box during scan/reward handoff. Existing exact viewport and pairwise-overlap assertions are unchanged.                                                                                                                                         |
| 1 landscape help test             | The whole Controls panel scrolled, taking Close below the viewport.                                                                                                                                                                                                 | Made the panel a column with only its reference body scrolling. Title/actions remain within the dialog frame. The test additionally checks Close while scrolling to the first and last help tiles.                                                                                                                                              |
| 4 opening/event touch checks      | The generic control list required the intentionally hidden desktop Reset camera button on a phone, where double-tap resets the camera.                                                                                                                              | Assert that desktop Reset remains hidden, that all five touch buttons exist, and that each of the eight required phone controls exists exactly once and is visible, fully in the viewport and receives its centre tap. No `:visible` filter or optional-control skip was added. Event coverage still considers every original control selector. |
| 2 phone completion-banner checks  | Tests froze the game clock, completed scans with the discovery-only helper, then waited for a banner that deliberately needs 3 seconds of play time.                                                                                                                | Assert the banner is initially hidden, pump real game frames until its delayed appearance, then retain the visibility/tap/Journal/debrief assertions. Also pump frames for the sampled Journal button and for touch controls to resume after closing it. Production timing is unchanged.                                                        |
| 1 consecutive-gallery scan test   | J is sampled by the game loop; the paused clock never delivered that input after the direct scan helper.                                                                                                                                                            | Pump real frames after the actual J keypress until Journal opens. Both distinct entry titles, bodies, keys, recreation tags and counts remain asserted.                                                                                                                                                                                         |
| 2 responsive Journal-count checks | The helper selected desktop tree navigation before the asynchronous media-query change rebuilt the phone sheet.                                                                                                                                                     | Assert the expected rendered layout after each resize before choosing tree/sheet navigation. Pump the sampled J input on opening and reload. Exact counts and persistence assertions remain.                                                                                                                                                    |
| 2 Your sub checks                 | Photo frame's default is named None, while the test demanded Stock for every group.                                                                                                                                                                                 | Keep exact default-name checks: Stock for paint/trim/decal and None for frames. Seed three modern discovery awards and explicitly assert Red is enabled before selecting it; retain all four groups' reachability and selection persistence.                                                                                                    |
| 1 hidden-discovery check          | One spec mixed samples into the secrets denominator, contradicting the sample test and Journal unit regressions.                                                                                                                                                    | Keep the original exact **3/5** authored-find ratio on the Finds category, and additionally assert the separate **3/3 secrets** tally. Both totals are now checked on their correct surfaces; samples still cannot inflate secret progress.                                                                                                     |

No timeout increases, skips, viewport tolerances, weakened hit tests or removed overlap guards were introduced. The numeric placement, 44 px targets, two-entry Journal/debrief counts, labels, persistence and event-position assertions remain strict.

## Screenshots

The orchestrator captured all six required openings in `.cache/codex/shots/S-hud-opening-dedupe/`:

- `kamaehuakanaloa-1600x900.png` and `kamaehuakanaloa-390x844.png`.
- `great-blue-hole-1600x900.png` and `great-blue-hole-390x844.png`.
- `hudson-canyon-1600x900.png` and `hudson-canyon-390x844.png`.

All six were inspected during this follow-up. They show the objective card as the target readout, desktop checklist/progress, the compact touch layout and no world text chip covering the submarine. Kama's diamond remains over the sub, which is permitted by the symbol-only policy. These captures belong to the external pre-follow-up build; they do not verify the new scan/reward transition or help scroller. The failing landscape help screenshot was also inspected and confirms the missing on-screen Close action.

The original shared shots symlink remains preserved as `.cache/codex/shots-shared`; current artifacts are local to the worktree.

## Follow-up verification

- TypeScript: **PASS**, `npx tsc --noEmit`.
- Production build: **PASS**, using the same native config-bundle approach as writable gates; `.cache/codex-followup-build.log`.
- Focused units: **362 tests / 6 files passed** (uiWaypoints, overlayFocus, journalGroups, cosmetics, missionRouter, f3Onboard), 2.33 s; `.cache/codex-followup-unit.log`.
- Repository-wide Prettier and `git diff --check`: **PASS**.
- Filtered browser discovery: **53 tests in 5 files**.
- Current targeted E2E: **attempted, not executed**. Each attempt stops before tests because the preview cannot start in this sandbox. Vite/Chromium execution belongs to the orchestrator; no passing browser rerun is claimed.

After grepping tests/e2e for the affected capabilities, the following selections were attempted with `GATES_CONFIG_MODE=writable PW_PORT=4197 PW_OUTDIR=dist-hud-opening npx playwright test <spec> -g '<selection>'`:

| Spec                    | Selection                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| journal-debrief.spec.ts | `consecutive gallery scans\|Journal counts points of interest\|Home -> first scan -> Journal -> second scan -> Journal -> debrief` |
| phone-accept.spec.ts    | `briefing and opening HUD\|Arcade scan reaches\|Your sub exposes\|touch help and photo\|an optional event`                         |
| f2-explore.spec.ts      | `three hidden discoveries`                                                                                                         |
| hud-touch.spec.ts       | `one target surface clears the submarine\|waypoint symbols stay clear of the HUD`                                                  |
| d-scan.spec.ts          | `visual hints show an objective waypoint`                                                                                          |

Logs: `.cache/codex-followup-targeted-*.log`; discovery: `.cache/codex-followup-targeted-discovery.log`.

The temporary `dist-hud-opening/` output is removed after local checks. Rebuild an isolated output before browser execution. The orchestrator still needs to rerun these targeted specs and full gates to accept the follow-up.
