# Brief 2870 — S-bughunt: Low journey copy and geometry

## Plan

1. Read all six retained manifests and PNG evidence; trace questionable copy to
   the production transition and inspect the shared HUD layout rules.
2. Extend the existing unaided journey capability to measure visible text,
   HUD panel rectangles and touch targets at each recorded step. Reproduce
   defects before applying minimal shared CSS/layout changes.
3. Run the six journeys and `tools/gates.sh`; record findings, evidence and
   any limits below. No assertions will be loosened.

## Progress

- Read all six manifests (Titanic/Great Blue Hole at 1280×720, 390×844,
  844×390). Existing evidence records guidance/modal rectangles only; Home,
  sonar, objective, readout, control and target geometry are missing.
- Confirmed the desktop Great Blue Hole mission heading is ellipsized by the
  shared `.obj-title` style. The objective grid can grow vertically.
- Tracing the voluntary debrief transition before classifying the retained
  3767 m position and “Back at the surface” heading.

## Findings and changes

| Evidence                                                        | Finding                                                                                                                                                                                                                        | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Great Blue Hole desktop `04-dive-start` through `07-first-scan` | Objective-panel mission identity ends in `LIGHTHOUSE…`. `.obj-title` forces a single line with ellipsis; the panel has room to grow down.                                                                                      | **Product defect fixed.** Include mission identity in the existing HUD title/instruction wrapping rule in `hud-layout.css`. No width, offset, font-size or breakpoint patch. The grid moves the readouts down with the panel.                                                                                                                                                                                                                                                                   |
| Both sites, all three `09-debrief` manifests                    | Partial mission, 1/4 objectives, 1 scan; Titanic position remains approximately −3767.162 m, mission state changes to `debrief`, elapsed time stops.                                                                           | **Retained-pose artifact, not a failed ascent or wrong completion claim.** The real player selects “Surface and debrief.” `MissionRouter.endDive()` voluntarily ends and freezes the dive; it never runs an ascent or relocates the submarine. `keepExploring()` resumes that same dive. “Back at the surface” describes the abstract return/debrief, not the stored simulation pose. Preserve existing copy, physics and wording assertions. This is not an injected-completion test shortcut. |
| All six guidance rectangles                                     | Desktop guidance starts at y=12 (360 px wide); portrait at y=132.5/146.5 (366 px); landscape at y=68 (434 px). Maximum captured card heights are 98/66.3125/54 px respectively.                                                | No guidance clipping/overlap established by the retained rectangles. Manifests omitted the other HUD rectangles, so they cannot prove full geometric separation. Added measurements/assertions for the missing regions.                                                                                                                                                                                                                                                                         |
| Phone PNGs and shared control rules                             | Pause/Journal, stick/slider, scan/photo/sonar/lights, Skip, briefing, Journal back/close and debrief actions have no demonstrated sub-44 px target.                                                                            | No speculative size changes. New journey assertions measure visible, hit-testable controls in the active surface, including links and native inputs. Existing coarse-pointer minimums and dock minimums are retained.                                                                                                                                                                                                                                                                           |
| Phone Great Blue Hole Journal/waypoint labels                   | Journal breadcrumb and compact waypoint label intentionally abbreviate repeated navigation context; the selected entry title/body and primary guidance remain readable. Scrollable Journal content extends below the viewport. | Not treated as missing primary copy. Assertions target primary identity/instruction/entry copy, not deliberate breadcrumb abbreviation or scrolling content.                                                                                                                                                                                                                                                                                                                                    |

The production change is two lines: a comment and one selector added to the
existing shared wrapping policy. No new UI, setting, guidance surface, site
branch, dependency or package-named test. No existing assertion was removed or
relaxed.

The existing six unaided journeys now persist `hudPanels`, `text` and
`touchTargets` alongside their original state and PNGs, including Home panel
text. They assert primary-copy overflow, HUD viewport containment, pairwise
HUD panel separation, and both target dimensions ≥44 px on touch. Covered HUD
regions are not compared with full-screen modals; hidden/covered controls and
scroll-list items outside the viewport are not counted as visible targets.
Captures and manifests are persisted before assertions, retaining red evidence.

## Initial sandbox verification

- Typecheck **PASS** after the assertion changes.
- Focused existing mission-router, Journal-data/debrief-wording and
  debrief-reopen tests **PASS: 3 files / 46 tests** (`/tmp/2870-focused.log`).
- Production bundle **PASS** through the aggregate gate, retained at
  `.cache/2870-final-dist`. A separate phase-build attempt bundles successfully
  but its CI provenance writer reports `spawnSync git EPERM`.
- Six-journey discovery **PASS** (`/tmp/2870-discovery.log`). Both baseline and
  final execution attempts stop before tests because the preview cannot start
  (`/tmp/2870-journeys-before.log`, `/tmp/2870-journeys-final.log`). Direct probe
  confirms `listen EPERM: operation not permitted 127.0.0.1:4321`
  (`/tmp/2870-preview.log`). The Browser skill was also checked; runtime
  discovery reports “No browser is available” and an empty browser list.
  **New geometry assertions are unexecuted here**, not reported as passing.
  The six supplied passing manifests/PNGs remain untouched as baseline evidence.
- Separate project-base browser attempt also stops at preview startup
  (`/tmp/2870-base-browser.log`).

- Required aggregate invocation:
  `GATES_CONFIG_MODE=writable PW_PORT=4322 PW_OUTDIR=.cache/2870-final-dist bash tools/gates.sh`.
  Logs: `.cache/runs/20261020-220407-3-rzDKPl/`,
  `/tmp/2870-gates.log`. Config, strict content and production build **PASS**.
  Python **FAIL: 5 failures / 167 outer tests**: four CI-build-manifest cases
  report `spawnSync git EPERM`; the golden-tooling wrapper reports
  `Unexpected end of JSON input`. These are the same tooling failures recorded
  in `S-bughunt-lowtier-journey.md`; tooling files are unchanged.
  The default fork-pool unit phase produced only its startup header and was
  interrupted (exit **130**) when switching to the thread-pool fallback.
  **Aggregate gates are incomplete and not green.**
- The independent full-unit fallback
  `npm test -- --configLoader runner --pool=threads --cache=false` ended with
  exit **143**, with only the startup header and no assertion results
  (`/tmp/2870-unit-threads.log`). It is **not a passing full unit suite** or a
  demonstrated assertion failure. The focused 46-test pass above is the
  completed unit evidence for this change.
- Separate root smoke attempt stopped before tests at preview startup
  (`/tmp/2870-smoke.log`). The project-base bundle also built successfully;
  its phase-build provenance writer then failed with the same git EPERM
  (`/tmp/2870-base-build.log`, `.cache/2870-base-dist`).
- Attribution **PASS: 14 assets** (`/tmp/2870-attribution.log`).
- Repository-wide Prettier **FAIL** on unchanged
  `plan/progress/V-monterey-cliff.md` (`/tmp/2870-prettier.log`). Formatting
  of all three changed files **PASS** (`/tmp/2870-changed-prettier.log`).
  Final typecheck and `git diff --check` **PASS**.

The implementation and regression checks are ready for a browser-capable
journey rerun. No new rendered acceptance or new passing geometry evidence is
claimed. No merge, push or tag.

## Orchestrator follow-up

The orchestrator ran `tools/gates.sh` outside the sandbox. Its supplied results
supersede the sandbox's incomplete functional-gate results: Python, content,
build, unit, root smoke e2e, project-base e2e and attribution all **PASS**.
The only failure was repository-wide Prettier, logged at
`.cache/runs/20261020-220949-3198354-MV0Acn/prettier.log`.

The root cause was five missing blank lines after headings in
`plan/progress/V-monterey-cliff.md`. Applied Prettier to that file; the diff
contains only those blank lines. No product code, assertion, formatter rule,
ignore list or gate configuration changed in this follow-up.

Verification: repository-wide `npx prettier --check .` and
`git diff --check` **PASS** after the correction. The orchestrator's functional
passes and this completed formatting check cover every gate; a fresh aggregate
run outside the sandbox remains the orchestrator's verification step. The smoke
gate does not run the six unaided journeys, so the new journey geometry
assertions still require that separate browser-capable run.
