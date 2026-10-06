# F-VERIFY-740 — f28 Surface regression and Journal copy audit

2026-10-05. Base checkout: `6b373f4`; f28 is `18f0cde`. This checkout also
contains f29 integration work (670/680/690/700/720/730 and its fixes).
`git diff f28..HEAD -- src/styles/hud-layout.css` is empty: the relevant
Surface layout is still the f28 layout.

## Status

- Journal audit: implemented across all 13 sites; desktop and phone Journal
  checks passed in both orchestrator runs.
- Live Surface: all six desktop/portrait/landscape snapshots now pass the
  existing containment, text and zero-intersection checks. The latest PNGs
  were reviewed here. Combined completion-card/toast acceptance remains open.
- Five hero phone checks: all five passed again at 390×844.
- Save soak: now passes its exact resource comparisons after terrain texture
  cleanup/readiness fixes.
- Remaining six failures: tutorial Skip callbacks saved completion but never
  invoked the completion-toast handler. Both callbacks now use that existing
  handler, with four system regression cases. No E2E assertion changed.
- Latest orchestrator run: 402 passed, 48 skipped, 6 failed; project-base
  passed. Final local static checks are recorded below. The full gate still
  requires an external browser rerun for the Skip fix and combined snapshots.

## 1. Dropped 590 Surface collision

### Browser evidence

The orchestrator ran `tools/gates.sh --full-e2e` outside the sandbox. Main
E2E: **401 passed, 48 skipped, 7 failed** (22 minutes). Project-base passed.
Failures were the six new Surface cases and `f-save-soak.spec.ts`; both
Journal cases and all five hero phone cases passed.

Surface evidence is in
`test-results-gates-4370-573064/f-verify-740-*/surface.{png,json}`. All six
submarine positions were at Y = −8 m. JSON measurements show:

| Configuration        | Actual collision before follow-up                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1280×800, both modes | Next-dive notice intersects objectives by 37 px vertically.                                                                                |
| 390×844, both modes  | Notice crosses sonar, objectives and telemetry (100, 75.172 and 16 px vertically).                                                         |
| 390×844, Realistic   | Telemetry ends at 355.5 px; rotate prompt starts at 354.469 px (1.031 px intersection).                                                    |
| 844×390, both modes  | Notice crosses objectives and telemetry; Arcade also crosses its live scan panel.                                                          |
| 844×390, Realistic   | Telemetry spans Y 90…276.25 px. Ballast begins at 234 px (42.25 px intersection); action cluster begins at 202 px (74.25 px intersection). |

This freshly reproduces the dropped 590 failure. The historical
`F-INTEGRATE-660.md` and original
`git show 78ab30e:tests/e2e/f-bughunt-590.spec.ts` identify the same Realistic,
Blue Hole, Surface, 844×390 touch case. f28 to HEAD did not change this CSS.

### Second orchestrator run: live Surface fix verified

Main E2E: **402 passed, 48 skipped, 6 failed** (22.2 minutes). Project-base,
save soak, both Journal cases and all five hero-phone checks passed. The six
Surface cases now fail only at the unchanged literal `Nice work.` assertion;
all their preceding live Surface assertions pass.

Reviewed all six PNG/JSON pairs from
`test-results-gates-4370-589172/f-verify-740-*/surface.{png,json}`. Every
snapshot has zero pairwise HUD intersections, no clipped panel text, viewport
containment and no runtime errors. Post-fix telemetry bounds:

| Viewport / mode    | Telemetry Y range | Relevant clearance                                    |
| ------------------ | ----------------- | ----------------------------------------------------- |
| 1280×800 Arcade    | 197…339 px        | Objective/notice intersection gone.                   |
| 1280×800 Realistic | 197…418 px        | Objective/notice intersection gone.                   |
| 390×844 Arcade     | 156…258.5 px      | Scan column and controls separate.                    |
| 390×844 Realistic  | 156…355.5 px      | Rotate prompt starts at 367.5 px: 12 px gap.          |
| 844×390 Arcade     | 72…161.25 px      | Action cluster starts at 202 px.                      |
| 844×390 Realistic  | 72…195.5625 px    | Action cluster gap 6.4375 px; ballast gap 38.4375 px. |

These are actual second-run measurements. The combined card/toast capture
was not reached because the completion toast had never been shown. Seeding
animal history in the first follow-up exposed that missing callback wiring;
it did not fix the absence of the completion toast.

### Exact reproduction

1. Fresh browser context, service workers blocked, DPR 1. Use 844×390 with
   touch/mobile enabled; repeat at 390×844 touch and 1280×800 desktop.
2. Seed only `subexplorer.settings.v2` with version 2 and
   `gameplayMode: "realistic"`. The new test additionally disables entrance
   motion for stable bounds. Repeat with the Arcade preset.
3. Open
   `/?mission=great-blue-hole&tier=low&dynres=0&tutorial=0&lifeSeed=42`.
4. Wait for game, POIs, props and exploration readiness. Select Surface in
   `.briefing-start`, then Begin dive with native touch/click.
5. Verify saved `gameplay.startPosition === "surface"`, submarine Y > −20 m
   and Y ≤ −hullRadius + 1 m. Selecting a start explicitly changes the mode
   to Custom; supplies/current still follow the chosen preset.
6. Measure all visible HUD panels in one browser task. Require Realistic
   supplies and current, required controls, viewport containment, unclipped
   text and **zero pairwise intersection**, including any scan card or toast.

`tests/e2e/f-verify-740.spec.ts` has six cases for this matrix. It writes
`surface.png` and `surface.json` **before** overlap assertions, including
all rectangles, text, current Y and errors. Assertions use soft reporting to
collect every failure; a failed expectation still fails the test. Bounds are
strict (0…viewport), rather than expanding the original ±1 px allowance.

Each case then checks a separate, explicitly labelled component stress state:
reopen with tutorial enabled, choose Surface, skip through the real tutorial
button to produce its toast, and show a completion card using an authored
contact name. This is a layout fixture, not a claimed Surface scan. Both
panels must be visible. In this separate fixture only, seed `creature` as
already seen before reloading: an unseen animal hint uses this same chip and
would replace completion guidance on the next frame. In the first run, the
animal hint masked that Skip had not shown a completion toast at all.
The live baseline still uses fresh hint history. Existing animal-trigger,
dismissal, lifetime and movement tests remain unchanged. The literal
`Nice work.` assertion is retained.
`surface-card-and-toast.{png,json}` records the state
with the same strict assertions. No pose/physics override or hidden HUD is
used to make the collision disappear.

### Follow-up fixes

1. `submarine.ts` previously emitted the next-dive notice on every transition
   to Custom, including a Surface-only start edit. Compare the previous and
   next gameplay options: suppress this notice only when start position is
   the sole gameplay edit causing Custom. Explicit Arcade/Realistic/Custom
   selections retain the notice and the loaded hull remains fitted. Two
   integration unit cases exercise both presets, unchanged hull, preserved
   notices and listener disposal.
2. Short-landscape Realistic telemetry now uses the objective panel's full
   250 px width with three rows: depth/speed/status, supplies/hull, then
   current. Tighten objective spacing/line height to reserve the action
   cluster above its measured Y = 202 px edge. Preserve Surface depth text,
   supply meters/percentages, current units/direction, hull rating/gauge,
   the active objective and touch sizes. This replaces the old 220 px single
   column that grew to 186.25 px high. The second runner verified the fix:
   telemetry now ends at 195.5625 px, clearing the actions by 6.4375 px.
3. Portrait's rotate prompt uses the measured objective bottom and telemetry
   height plus 12 px, bounded below by its existing 42% anchor. Existing
   hiding while an instruction/contact is active remains unchanged.
4. The independent tutorial-completion fixture explicitly owns hint history
   as described above. No production hint priority/timer behavior changes.
5. Second follow-up: `skipAll` previously called `finishTutorial()` only;
   final `skipStep` did the same. Neither reached `onAdvance()`, which shows
   the existing completion message. Both now route through `onAdvance()`;
   inactive callbacks are ignored so repeated actions do not reset the toast.
   Four system tests exercise Skip tutorial, intermediate/final Skip step,
   normal input/event completion, persisted progress, card hiding and the
   retained fresh-player animal hint. Restoring the original callbacks makes
   three cases fail, while normal completion still passes. Mutation log:
   `.cache/verify740/negative-skip-completion.log`.

The six Surface cases retain zero-intersection, viewport, unclipped-text,
required-panel and literal-toast assertions. No retry/skip or tolerance was
added. Both runs stopped before stress-state capture at the missing completion
message assertion. The next rerun must reach and inspect **both** snapshots
per case. The E2E file is unchanged in this second follow-up.

### Save-soak texture root cause

The first run's cycle 4 failed the exact texture comparison: baseline 12,
reload 11, while scene objects and geometries matched. `__gameReady` permits
asynchronous terrain maps: placeholder textures may be rendered before the
maps bind. Those placeholders previously stayed allocated after replacement,
so counts could depend on load/render ordering.

`TerrainMaterial.texturesReady` waits for all required map bindings, then
releases both replaced neutral placeholders. `Terrain` exposes that promise;
soak readiness waits for it while pumping real frames, then samples after
real renders. Initial game boot still uses placeholders without blocking.
Three unit cases cover low/high tiers, deduplicated shared maps, readiness
remaining pending until the last image, disposal only after binding, actual
uniform/rock-texture bindings, and immediate Node readiness. Exact repeated
and final scene/geometries/textures comparisons and restart bounds are all
unchanged. The second orchestrator run passed the complete four-cycle soak
in 43.4 s, including repeated/final exact allocations and restart bounds.

All redesigns and the start-only notice omission are logged in CHANGELOG.

## 2. Journal audit across all 13 sites

Read the shipped catalogue summaries/facts, guide text/fact tables, POI
provenance, secrets and shared wildlife copy, plus the Journal's rendering
and OBIS species model. Coverage: **81 guide entries, 47 POIs, 322 retained
species rows, 39 secrets and 99 site/wildlife entries** (wildlife species recur
across sites). This is a content-tone and consistency audit with primary-source
spot checks; it does not claim a new survey or independent revalidation of
every historical number. Existing source-specific scientific qualifications
remain visible.

| Site             | Finding / action                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titanic          | Retain dated wreck history, memorial tone, survey resolution and former artifact positions. Existing recreated targets retain one Recreation tag.                                                                                                   |
| Challenger Deep  | Remove the catalogue's unconditional Eastern Pool ranking so it agrees with the guide's differing surveys. Remove the erroneous “subducting” qualifier from the landward inner wall.                                                                |
| Lost City        | Retain field chemistry, discovery attribution, dated Beehive observations and unresolved IMAX height differences. Remove repeated authored/game-position caveats; preserve the OBIS snapshot date. Staged wildlife now has an addition tag.         |
| Monterey Canyon  | Retain documented canyon/MARS facts, sampled depths, OBIS snapshot date and the Bolinopsis taxonomic qualification. Cut unsupported offshore, cross-section and shelf-break estimates instead of repeating their correction history in the Journal. |
| Endurance        | Retain dated expedition history, protected-site/memorial distinction, surveyed wreck versus terrain depth, and source-specific navigation distance discrepancy.                                                                                     |
| Axial / ASHES    | Retain dated eruption history and conditional forecasting, factual vent descriptions and terrain-versus-fault/lava identification limits. No new eruption forecast is asserted.                                                                     |
| Hudson Canyon    | Retain proposed sanctuary status and separate fisheries protection; NOAA's current designation page still calls it proposed.                                                                                                                        |
| Kama'ehuakanaloa | Correct the false comparison that 58×61 m cells are coarser than a 600 m crater diameter. Keep the narrower statement that the grid does not establish the detailed rim.                                                                            |
| Beebe            | Retain the corrected 2009/2010 discovery sequence, 401–403 °C source-specific fluid observations, shrimp diet/eye qualifications and out-of-tile Von Damm context.                                                                                  |
| Great Blue Hole  | Retain real sinkhole dimensions, oxygen-depth ecology, the published survey dates and original-grid versus game-floor distinction. Recreated features stay tagged.                                                                                  |
| Bismarck         | Retain war-grave tone, uncertainty about sinking mechanism and published wreck depth versus coarse grid mismatch.                                                                                                                                   |
| Hunga Tonga      | Keep this dive explicitly pre-January-2022. Align catalogue diameter with the guide's repeat-mapping result: approximately 4.5→4.8 km, with attribution.                                                                                            |
| Blake Plateau    | Correct the catalogue's conflation of coral habitat and the larger study area. Retain 6.4 million acres for the habitat, direct NOAA citation, sample depth and fine-mapping limits; simplify editorial mound caveat and fix a grammar error.       |

### One tag, one shared explanation

`journalEntryTag()` returns Game addition for secret/staged wildlife entries,
Recreation for recreated guide entries and no provenance tag for factual
survey entries. The renderer appends that single label once. Undiscovered
and Rare sighting describe unlock/encounter status, separately from provenance.
OBIS survey entries remain factual occurrence records; they are not confused
with the staged wildlife entries.

The front page explains additions and OBIS sampling once. Generic counts/
depth-method caveats no longer recur in Lost City and Monterey overviews.
Source links, scan-to-entry links, discovery storage and scientific metadata
are retained. All removed estimates and repeated copy are logged in
`CHANGELOG.md`; the earlier uncertainty evidence remains in F-FACTCHECK-630.

### Source checks for corrections

- [NOAA's Blake Plateau mapping announcement](https://oceanexplorer.noaa.gov/news/million-mounds-news/)
  distinguishes 6.4 million acres of coral habitat from a study area nearly
  the size of Florida; it also documents 83,908 mapped mound peaks.
- [Stewart & Jamieson 2019](https://nora.nerc.ac.uk/id/eprint/524544/1/Stewart_and_Jamieson_2019_The%20five%20deeps.pdf)
  and [Greenaway et al. 2021](https://repository.library.noaa.gov/view/noaa/33477)
  support retaining survey-specific Challenger measurements rather than
  presenting the catalogue's single pool ranking as settled.
- [USGS Philippine Sea Plate overview](https://pubs.usgs.gov/of/2010/1083/m/)
  describes the Pacific Plate subducting beneath the Philippine Sea Plate.
  The corrected guide avoids calling the landward inner wall “subducting.”
- [Ribó et al. 2026](https://www.nature.com/articles/s41561-026-02099-7)
  reports the approximately 4.5→4.8 km diameter change in its abstract.
  Its structural-diameter definition differs; the original bare “4 km”
  catalogue statement did not convey this distinction.
- [NOAA Hudson designation page](https://sanctuaries.noaa.gov/hudson-canyon/)
  still describes a proposed sanctuary. Lost City/Monterey factual decisions
  retain the primary-source review and qualifications from F-FACTCHECK-630.

The 740 copy tests cover all 13 sites, preserve every original objective/link
assertion, require authored POI links and sources, and reject repeated
illustrative/reconstructed/recreation/game-addition caveats in body copy.
Two mutation checks demonstrate sensitivity: removing the staged-wildlife
tag fails **13** site tests; adding an illustrative/reconstructed sentence
to non-hero Bismarck fails its test. Both mutations were restored.
Logs: `.cache/verify740/negative-{wildlife-tag,nonhero-caveat}.log`.

Two browser cases additionally traverse all 13 sites at desktop and portrait
size and require exactly one Game addition tag on a secret and wildlife entry
at each site, visible prose, intact wildlife source links and unclipped title
rows. Both cases passed in the orchestrator run (3.9 s desktop, 7.6 s phone).

## 3. Five hero sites at phone size

The existing `f-verify-610.spec.ts` is unchanged. Each fresh 390×844 touch/Low
opening runs for 3 seconds, projects the actual visible hull, requires
viewport and near/far containment, checks the complete visible HUD matrix
against the hull and every other panel, checks required controls/props/errors,
and writes PNG/JSON evidence. `f-bughunt-15.spec.ts` and
`f-toast-placement.spec.ts` retain their existing smaller-phone, tutorial,
wrapped-target and enlarged-UI coverage.

| Hero            | 390×844 rendered overlap check |
| --------------- | ------------------------------ |
| Titanic         | PASS — 3.6 s                   |
| Lost City       | PASS — 3.9 s                   |
| Great Blue Hole | PASS — 3.8 s                   |
| Beebe           | PASS — 3.7 s                   |
| Monterey Canyon | PASS — 4.3 s                   |

Artifacts: `.cache/codex/shots/610/<site>-low-390x844-round-1.{png,json}`.
Reviewed all five PNGs: hull and surrounding HUD/controls are visibly separate.
JSON and the original retained assertions check projected hull containment,
pairwise HUD intersections, controls/props and runtime errors. These are
passes in both orchestrator runs. The follow-up's landscape grid does
not apply at 390×844; the full rerun should still retain these checks.

## Gates and final handoff

The initial sandbox full-gate attempt could not start Vite/Chromium. The
orchestrator subsequently ran the actual full suite outside the sandbox:

| Gate                                                | Orchestrator first run                  |
| --------------------------------------------------- | --------------------------------------- |
| Build, unit, Python, content, attribution, Prettier | PASS                                    |
| Full E2E                                            | FAIL — 401 passed, 48 skipped, 7 failed |
| Project-base E2E                                    | PASS                                    |

Second orchestrator run:

| Gate                                                | Second run                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Build, unit, Python, content, attribution, Prettier | PASS                                                                         |
| Full E2E                                            | FAIL — 402 passed, 48 skipped, 6 failed (missing Skip completion toast only) |
| Project-base E2E                                    | PASS                                                                         |

Preserved logs: `.cache/verify740/orchestrator-e2e-{first,second}.log` and
`.cache/verify740/orchestrator-e2e-base-{first,second}.log`.

After the fixes, run supported local static gates:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4740 tools/gates.sh --no-e2e
```

| Gate                                 | Follow-up local result                                     |
| ------------------------------------ | ---------------------------------------------------------- |
| Writable config / build / TypeScript | PASS                                                       |
| Unit                                 | PASS — 135 files / 1,405 tests                             |
| Python                               | PASS — 144 tests                                           |
| Strict content / attribution         | PASS                                                       |
| Whole-repository Prettier            | PASS                                                       |
| Full E2E / project-base              | Not rerun after fixes: sandbox prohibits Vite and Chromium |

Latest focused onboarding checks: 3 files / 28 tests passed (including the
four new system cases). Earlier terrain/loadout checks: 2 files / 70 passed. Focused Playwright
listing discovers 14 cases: six Surface, two Journal, five hero openings,
one save soak. Prior Journal mutation checks still verify that removing the
wildlife tag fails 13 catalogue cases and inserting a generic caveat into a
nonhero site fails the copy audit.

Required orchestrator acceptance rerun:

```bash
tools/gates.sh --full-e2e
```

Inspect both Surface PNG/JSON snapshots for all six configurations. Live
Surface, save soak, Journal and five hero checks now have successful browser
evidence; the **full gate remains open until the Skip completion fix and
combined completion-card/toast snapshots pass the external rerun**.
