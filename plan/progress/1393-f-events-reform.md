# 1393 — dive events reform

Owner feedback: `plan/PHONE-FEEDBACK-2026-10-11.md`, item 11. Three implementation/review rounds; no network research (`NET=1` was not set).

Status: implementation and headless geometry/lifecycle QA complete; rendered phone/desktop QA and frame-time measurement blocked by the environment. Do not treat this as visual sign-off.

## Changes and cuts

- Removed the snow event kind, caption, visual branches, scheduler fallback, bus payload member and event tests. Ambient `MarineSnow` is unchanged. An empty habitat now reschedules a quiet wait instead of starting an undefined event. Snow had no separate star-rating or Journal definition to remove; remaining events do not set the star bonus.
- Removed plume events at Lost City as well: the sourced site brief describes clear-flow pulses, not billowing particulate smoke. A separate readable clear-flow visual cannot be supported by this package's particle/silhouette budget. Both cuts are in `CHANGELOG.md`.
- Plume, turbidity and whale starts search ahead of the pilot at 30–70 m, check the active projection (including phone view offset/free look), maintain floor clearance and avoid the submarine/terrain sightline. Impossible placements defer silently rather than announcing an off-screen event.
- Kept 100/180/280/360 particles by tier and one Points object plus one merged whale mesh, with only the event's applicable object visible. Soft discs use shader math, no textures/lights. Particle size is 7/8 m with a 48-render-pixel cap; opacity 0.78; duration 18 s. The plume rises through a widening column; the 28×18 m silt cloud rolls along the local negative height gradient; the blunt-headed whale crosses above and its witness centre follows its movement.
- Captions explain what/why, add “Get closer to log it” outside 45 m and confirm the Journal log. Caption time freezes with event time under pause/modals.
- After 0.8 s, a nearby in-view witness persists `<site>/event:<kind>` once. Debrief uses short sighting names. JournalData supplies two-sentence explanations and citations through the existing explained-entry surface, marked Recreation. Journal layout is unchanged; no extra secret/species counts or star bonus.
- Minimal supporting edits outside the listed implementation files: remove `snow` from the EventBus payload union; teach Progress's discovery-credit path to retain the existing event reward identity (otherwise a sighting could acquire a second POI reward on migration); update the architecture contract for the removed kind, duration and new sighting namespace. No forbidden UI/system files were edited.

## Sources

Only existing repo research and well-established mechanisms were used. `docs/research/sites.md` cites the Mid-Cayman discovery paper (`https://www.nature.com/articles/ncomms1636`) for vent context; MBARI's underwater-landslide observations for downslope sediment flows; NOAA's Hudson Canyon overview for whale habitat. Those same citations are in `EVENT_SIGHTINGS`. Lost City's clear-flow description and fluid-mixing citation explain its additional cut. Staged sightings are not local survey observations.

## Three rounds

1. Traced scheduling, visuals, rewards, notices and Journal data; removed snow and unsupported Lost City particulate plumes; added explained captions, persistent sighting data, camera-aware spawn and shaped visuals.
2. Checked 30–70 m placement, actual projection, draw/particle budgets, rising/rolling/crossing geometry, detailed terrain clearance, quiet sites, source/unlock/count behaviour, reward identity and repeat visits. Added the six Low phone/desktop preview capture cases in `tests/e2e/f-events-reform.spec.ts`.
3. Tested real opening poses/terrain at all six remaining event sites, both 844×390 phone landscape and 1280×720 desktop projections, including phone view offset. Require >70% visible geometry and >45 px primary extent. The initial silt footprint was too narrow at Hudson and Hunga; widened it to 28×18 m without adding particles. Hudson’s long chase arm also needed a 15% whale size increase to clear the minimum projected footprint. Tested actual explore-system logging, approach cue, pause/freeze/resume, one reward and persistence after restart. Updated camera matrices before placement/witness checks and capped particle pixels for close approaches.

## Validation

- Build/typecheck: passed with a writable bundled Vite config; normal Vite config bundling otherwise attempts to write into read-only `node_modules/.vite-temp`.
- Event geometry/lifecycle tests and all-site Journal/progression/static prop-budget regressions: passed; detailed final counts are recorded after the final run below.
- Python: 156 tests passed. Strict content validation and attribution validation passed.
- Formatting and `git diff --check`: checked on changed files.
- Full E2E (`FULL_E2E=1`): attempted; preview cannot start/connect (`EPERM 127.0.0.1:4393`). Log: `.cache/1393/e2e-full.log`.
- `tools/perf-budget.mjs` attempted on Low Beebe/Monterey/Hudson: Chromium exits in `sandbox_host_linux.cc` with “Operation not permitted”. Log: `.cache/1393/perf-after.log`. No measured frame-time claim is made.
- Browser skill bootstrap succeeded, but discovery returned “No browser is available” and an empty browser list. There is no connected browser for visual review.

## Captures outstanding

Requested directory: `.cache/codex/shots/1393-f-events-reform/`. The committed E2E spec uses the existing `previewEvent` hook, captures each event at ages 2 s and 7 s on Low phone landscape and desktop, logs frame counters/timings, checks persistent sightings and captures Journal text. No PNGs could be captured or inspected here. The shots symlink also resolves outside this worktree to a read-only directory, so this environment cannot write the requested captures. The geometry checks do not establish opacity/contrast or actual phone GPU performance. No further kind was cut solely because rendering was unavailable.

Run on a browser-capable host, then **look at all six start/moving pairs** and cut any remaining unreadable kind if needed:

```sh
npm run build -- --outDir dist-1393
PW_PORT=4393 PW_OUTDIR=dist-1393 npx playwright test tests/e2e/f-events-reform.spec.ts tests/e2e/f2-explore.spec.ts tests/e2e/f-perf-budget.spec.ts
# Serve dist-1393 on 4393, then:
PERF_SITES=beebe-vent-field,monterey-canyon,hudson-canyon PERF_TIERS=low node tools/perf-budget.mjs http://localhost:4393/ .cache/1393/perf-after
```

The preview spec records active-event frames as well as a quiet baseline; the existing perf tool measures the unchanged full-scene opening workload. Timing is host-specific, not a physical-phone FPS prediction.
