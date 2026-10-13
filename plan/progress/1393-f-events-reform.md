# 1393 — dive events reform

Owner feedback: `plan/PHONE-FEEDBACK-2026-10-11.md`, item 11. Three implementation/review rounds; no network research (`NET=1` was not set).

Status: the second orchestrator full run reports 722 passed, one phone-plume caption failure and 49 skipped; all static gates and project-base E2E passed. The remaining caption placement defect has a regression and fix. The 15 fresh successful-case captures were inspected; the three phone-plume files remain stale from the first run. Final phone-plume captures and browser confirmation of the latest fix remain pending on the orchestrator host.

## Changes and cuts

- Removed the snow event kind, caption, visual branches, scheduler fallback, bus payload member and event tests. Ambient `MarineSnow` is unchanged. An empty habitat now reschedules a quiet wait instead of starting an undefined event. Snow had no separate star-rating or Journal definition to remove; remaining events do not set the star bonus.
- Removed plume events at Lost City as well: the sourced site brief describes clear-flow pulses, not billowing particulate smoke. A separate readable clear-flow visual cannot be supported by this package's particle/silhouette budget. Both cuts are in `CHANGELOG.md`.
- Plume, turbidity and whale starts search ahead of the pilot at 30–70 m, check the active projection (including phone view offset/free look), maintain floor clearance and avoid the submarine/terrain sightline. Impossible placements defer silently rather than announcing an off-screen event.
- Kept 100/180/280/360 particles by tier and one Points object plus one merged whale mesh, with only the event's applicable object visible. Soft discs use shader math, no textures/lights. Particle size is 7/8 m with a 48-render-pixel cap; opacity 0.78; duration 18 s. The plume rises through a widening column; the 28×18 m silt cloud rolls along the local negative height gradient; the blunt-headed whale crosses above and its witness centre follows its movement. The capture review exposed a thin whale profile; banking and angled fins now reveal its flukes/pectoral fins at the same 588-triangle cost, with clearance increased to cover that banked shape.
- Captions explain what/why, add “Get closer to log it” outside 45 m and confirm the Journal log. Caption time freezes with event time under pause/modals. Captions now use measured free space outside the projected event and existing HUD/thumb controls, rechecking at most twice a second; the logged confirmation expires after three seconds.
- After 0.8 s, a nearby in-view witness persists `<site>/event:<kind>` once. Debrief uses short sighting names. JournalData supplies two-sentence explanations and citations through the existing explained-entry surface, marked Recreation. Journal layout is unchanged; no extra secret/species counts or star bonus.
- Minimal supporting edits outside the listed implementation files: remove `snow` from the EventBus payload union; teach Progress's discovery-credit path to retain the existing event reward identity (otherwise a sighting could acquire a second POI reward on migration); update the architecture contract for the removed kind, duration and new sighting namespace. No forbidden UI/system files were edited.

## Sources

Only existing repo research and well-established mechanisms were used. `docs/research/sites.md` cites the Mid-Cayman discovery paper (`https://www.nature.com/articles/ncomms1636`) for vent context; MBARI's underwater-landslide observations for downslope sediment flows; NOAA's Hudson Canyon overview for whale habitat. Those same citations are in `EVENT_SIGHTINGS`. Lost City's clear-flow description and fluid-mixing citation explain its additional cut. Staged sightings are not local survey observations.

## Three rounds

1. Traced scheduling, visuals, rewards, notices and Journal data; removed snow and unsupported Lost City particulate plumes; added explained captions, persistent sighting data, camera-aware spawn and shaped visuals.
2. Checked 30–70 m placement, actual projection, draw/particle budgets, rising/rolling/crossing geometry, detailed terrain clearance, quiet sites, source/unlock/count behaviour, reward identity and repeat visits. Added the six Low phone/desktop preview capture cases in `tests/e2e/f-events-reform.spec.ts`.
3. Tested real opening poses/terrain at all six remaining event sites, both 844×390 phone landscape and 1280×720 desktop projections, including phone view offset. Require >70% visible geometry and >45 px primary extent. The initial silt footprint was too narrow at Hudson and Hunga; widened it to 28×18 m without adding particles. Hudson’s long chase arm also needed a 15% whale size increase to clear the minimum projected footprint. Tested actual explore-system logging, approach cue, pause/freeze/resume, one reward and persistence after restart. Updated camera matrices before placement/witness checks and capped particle pixels for close approaches.

## Initial local validation (before orchestrator)

- Build/typecheck: passed with a writable bundled Vite config; normal Vite config bundling otherwise attempts to write into read-only `node_modules/.vite-temp`.
- Event geometry/lifecycle and real-terrain footprint checks: **4 files / 29 tests passed** (`.cache/1393/events-final.log`). Journal/progression/all-site static prop-budget regressions: **6 files / 79 tests passed** (`.cache/1393/regressions-round2.log`).
- Full unit coverage completed after interruption: the final full run recorded passing cases in 128 files before the turn ended; the completion run passed **64 files / 264 tests**, including partial-file checks. The current collected manifest has **187 files / 1,202 test declarations**; comparison with both logs finds a passing runtime result for every declaration (table templates matched to their expanded names). This is resumed coverage, not an uninterrupted full-run exit. Logs: `.cache/1393/unit-all-final.log`, `unit-remainder.log`; audit: `unit-manifest.json`, `unit-coverage.json`.
- Python: 156 tests passed. Strict content validation and attribution validation passed.
- Formatting and `git diff --check`: passed on the final changed-file set (`.cache/1393/format-final.log`).
- Full E2E (`FULL_E2E=1`): retried against the final build on resume; preview cannot start/connect (`EPERM 127.0.0.1:4393`). Log: `.cache/1393/e2e-full.log`.
- `tools/perf-budget.mjs` retried against the final build on Low Beebe/Monterey/Hudson: Chromium exits in `sandbox_host_linux.cc` with “Operation not permitted”. Log: `.cache/1393/perf-after.log`. No measured frame-time claim is made.
- Browser skill bootstrap succeeded, but discovery returned “No browser is available” and an empty browser list. There is no connected browser for visual review.

## Orchestrator gate follow-up

External `tools/gates.sh --full-e2e` passed build, unit, Python, content, attribution, prettier and project-base E2E. Full E2E reported **710 passed / 13 failed / 49 skipped** (`.cache/gates/e2e.log`). All 13 failures trace to accepted changes merged from other packages, with these test corrections:

- Six Lost City readable-opening cases pinned the previous chase offsets. Keep the exact 66 m arm and per-axis tolerance; derive the eye from the current -8 m lateral/+30 m vertical offsets and 38/90 m base arm (`[-8,68,90]`). All hero range, lighting, tower-framing and pixel-footprint checks stay in place.
- Two first-minute and three onboarding cases used obsolete Controls/Close labels or retained a desktop dialog locator after switching to Touch. Touch now opens the exact `How to play` dialog with its picture-first stick/slider guidance; Journal has `Close Journal`. Desktop still pins `Controls guide`; touch tests additionally require hidden device tabs.
- Two Journal touch-audit cases measured the spoilers label before asynchronous catalogue loading moved it, then used the former checkbox/tree/pager. Await the actual Titanic site card, operate the exact accessible `Show spoilers` switch, and navigate the phone sheet's actual site and entry rows. Retain the unchanged 44 px bounds, centre hit-test, header-overflow and Close checks; assert the chosen row's exact article title.

No protected source implementation was edited. No assertion, timeout or hit-test was relaxed and no failure was skipped. These test corrections still require external execution.

## Second orchestrator gate follow-up

The next external `tools/gates.sh --full-e2e` passed every static gate and project-base E2E; full E2E improved to **722 passed / 1 failed / 49 skipped**. All 13 prior camera/touch/Journal failures passed. Only the Low phone plume fails the existing visible-caption assertion after the 30-frame sample (`tests/e2e/f-events-reform.spec.ts:188`).

The caption placement search only varied Y at one fixed X. With a wrapped caption, the scan card, rising column and controls can leave too little vertical space at that X while usable space exists beside them. The new regression uses Beebe's actual 844×390 Low projected particle bounds at age 2 (x 254.4, y 205.2, width 68.2, height 118.5), the phone HUD rectangles and a 66 px wrapped caption. It reproduces the hidden-caption state with the previous search (3 passed / 1 failed, `.cache/1393/plume-caption-before.log`) and passes with the fix. The failure log did not retain the caption's live dimensions, so the E2E now attaches actual caption/subject/HUD layout and frame data before the unchanged visibility assertion for any future failure.

Keep the existing preferred position first, then find empty rectangles between occupied screen edges and choose the widest that fits the measured caption. This uses the existing 12/14 px type, all subject/control exclusions and eight-pixel separation; no geometry, particle counts, shader, draw budget, timing, visibility assertions or overlap assertions changed. Candidate geometry is computed in JavaScript and text measurements are reused by width within each layout pass; layout still runs at most twice a second during stable guidance. The new wrapped-caption test also pins a readable width of at least 280 px and unchanged 12 px type, on-screen bounds, actual obstacle separation and confirmation expiry.

Reviewed all **15 fresh successful-case PNGs**: all nine desktop plume/silt/whale start/moving/Journal shots and the six phone silt/whale shots supplied with the second result. Captions are clear of those subjects, the whale has visible fins/flukes, silt forms a low moving cloud, and Journal explanations/sources fit. The phone plume failed before replacing its three PNGs: their older modification times confirm they cannot establish sign-off for the current caption. No additional kind was cut; the remaining issue is caption placement with a fix within the existing rendering budget.

Targeted lifecycle/terrain/layout checks passed **5 files / 33 tests** (`.cache/1393/plume-caption-unit.log`); the final width-selection regression passed **4 layout tests** (`plume-caption-layout-final.log`). Final static-gate results are recorded below after completion. External full E2E and the final phone-plume captures still require a rerun; this sandbox cannot run Vite or Chromium.

## Capture review and performance evidence

Directory: `.cache/codex/shots/1393-f-events-reform/`. The orchestrator captured each plume/turbidity/whale on Low at 844×390 phone landscape and 1280×720 desktop: start, moving and Journal (**18 PNGs**). All were looked at, including the six phone whale/silt images supplied in the conversation. The plume and silt have recognizable billows, but the old broad caption masks much of each subject. The whale is too thin and partially masked by its caption. Journal explanation/source pages fit and are readable.

Follow-up changes move captions outside measured subjects/controls and shrink only the event caption's padding/type to its own 12 px phone/14 px desktop size. The whale banks to expose fins/flukes at unchanged mesh cost; its projected height must now exceed 8 px alongside the existing >45 px extent and >70% visible-geometry checks. The whale Journal's second sentence explains breathing/surfacing rather than narrating a silhouette. No additional event kind was cut: the identified defects have fixes within the existing render budget, awaiting rendered verification.

Pre-follow-up host measurements from the six capture JSON files:

| Event | Desktop draws | Phone draws | Event triangles | Host frame p50 / maximum p95 |
| ----- | ------------- | ----------- | --------------- | ---------------------------- |
| Plume | 68 → 69       | 68 → 69     | 0               | 16.7 / 16.8 ms               |
| Silt  | 83 → 84       | 88 → 89     | 0               | 16.7 / 16.8 ms               |
| Whale | 187 → 188     | 192 → 193   | 588             | 16.7 / 16.8 ms               |

These establish one extra draw for the active effect on that host, not physical-phone FPS. New caption layout reads are bounded to twice a second; no lights, textures, particles, triangles or draws were added by the follow-up. Fresh timing is still needed.

Follow-up targeted checks: **12 unit files / 91 tests passed** (`.cache/1393/gate-fixes-unit-final.log`), including all event lifecycle/terrain/Journal/progression/perf-budget regressions and three caption-layout cases based on supplied phone rectangles. Writable-config production build passed (`.cache/1393/gate-fixes-build.log`). Fresh `GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e` passed every static gate: build, **188 unit files / 1,875 runtime tests**, **156 Python tests**, strict content, attribution and whole-repo prettier. Logs: `.cache/1393/gate-fixes-static.log`, `gate-fixes-unit-full.log` and `.cache/gates/`. Typecheck, `git diff --check` and Playwright collection also passed (68 cases in the five changed E2E files).

The preview E2E now requires a visible caption clear of the actual projected vertex/sprite envelope and all HUD/thumb controls at both capture ages, a >8 px whale height, and the exact Journal explanation/source link. It waits through the bounded caption layout interval before the moving capture.

The earlier local preview/perf EPERM errors are environmental, not a remaining claim that captures do not exist. The shots symlink resolves outside this sandbox and cannot be written here. Run on the orchestrator host and inspect the replacements before visual sign-off:

```sh
tools/gates.sh --full-e2e
# Focused diagnostic run, if needed (against a fresh build):
npm run build -- --outDir dist-1393
PW_PORT=4393 PW_OUTDIR=dist-1393 npx playwright test tests/e2e/f-events-reform.spec.ts tests/e2e/f-first-minute-620.spec.ts tests/e2e/f-lostcity-readable.spec.ts tests/e2e/f-touch-audit.spec.ts tests/e2e/f3-onboard.spec.ts
# Serve the fresh build on 4393, then:
PERF_SITES=beebe-vent-field,monterey-canyon,hudson-canyon PERF_TIERS=low node tools/perf-budget.mjs http://localhost:4393/ .cache/1393/perf-after
```
