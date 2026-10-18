# P2-events-anchored

2026-10-18. Numeric/behavioral implementation; **Claude visual review pending**. No merge, push or tag. Checked `plan/DIRECTOR.md`, phone feedback ownership, clean worktree and `git worktree list` before editing; no overlapping event package in flight. Other P2 lanes remain separate.

## Anchors and optional contacts

All positions, event eligibility (presence in a site's events block and full 3D arrival range), contact names, radii and fallback/travel headings are authored in the six `site.json` event blocks and validated by `SiteManifest.ts`. Each anchor requires finite geographic coordinates, exactly one positive seabed altitude or surface depth, positive contact/arrival radii with arrival strictly smaller, and a finite heading. Runtime placement uses the tile's coordinate conversion and detailed terrain sampler. These are illustrative gameplay locations, not surveyed events; the existing Journal recreation label and scientific explanations/sources remain.

| Site                 | Optional contact      | Anchor latitude, longitude | Vertical reference |
| -------------------- | --------------------- | -------------------------- | ------------------ |
| axial-seamount-ashes | Vent plume (plume)    | 45.93405932, -130.0139     | bed + 6 m          |
| hunga-tonga-caldera  | Silt flow (turbidity) | -20.57, -175.42038374      | bed + 6 m          |
| beebe-vent-field     | Vent plume (plume)    | 18.54670932, -81.71795     | bed + 6 m          |
| hudson-canyon        | Silt flow (turbidity) | 39.41, -72.17936062        | bed + 6 m          |
| hudson-canyon        | Whale route (whale)   | 39.41, -72.17936062        | 60 m depth         |
| monterey-canyon      | Silt flow (turbidity) | 36.78702034, -122.01229065 | bed + 6 m          |
| monterey-canyon      | Whale route (whale)   | 36.78702034, -122.01229065 | 60 m depth         |
| kamaehuakanaloa      | Vent plume (plume)    | 18.91277932, -155.26778    | bed + 6 m          |

Every spot uses a **110 m contact range, 40 m inclusive arrival range and 90° heading**. Heading supplies whale travel and the flat-bed silt fallback; on sloping terrain silt keeps its existing downhill gradient motion. Plumes and silt start 6 m above the detailed bed. Whale routes occupy upper water at 60 m depth; they require approaching that depth, and are not contacts visible from the bottom. The six seabed contacts are numerically within 110 m of their existing free-dive openings and outside 40 m, with no spawn/camera tuning.

The existing Scanner supplemental-contact pool, reticle and guidance slot name and steer toward each spot. Arrival contacts cannot take the scan beam or generate scan completion. Active/occupied contacts retire their approach cue until a return can actually play another event. The existing local sonar dots are reused. No card, setting, layout, CSS, lighting, material, particle shape/count or hull change is added.

## Removed machinery and preserved behavior

- Removed `EventScheduler`, random waits/selection, cooldowns, depth/altitude timing gates, preview bypass, camera-relative candidate-spawn search, spawn-distance/view-margin/surface-spawn config and their obsolete timing/placement tests. Event eligibility now comes entirely from authored spots and 3D proximity. Journal entry enumeration reads the same manifest kinds.
- Entering a spot starts the existing 18-second effect at that anchor. Only active dive clock time advances it; pause, blocked/frozen frames, home and invalid/nonpositive time do not start, age or rearm it. One event plays at a time. Arrivals during an active event are consumed, not queued.
- An occupied spot never repeats, even after hours. Leave its arrival range during active play and return after the effect ends to replay it. Restart clears active effects, entry latches, per-dive samples/sightings and event guidance; saved Journal discoveries survive.
- Witnessing still requires the existing 0.8-second delay, 45 m distance to the moving visible centre, an in-frustum camera projection and the former terrain sightline check (now checked at witness time). Arrival, holding Scan, looking away and a distant caption do not log a sighting. One witness per playback; repeated playbacks do not duplicate saved discoveries or add points/bonuses. Existing Journal focus/refresh, sighting bus event and debrief summary remain.
- Guidance remains in the one slot, with name, turn/rise/sink/approach range and the existing sighting explanation/log confirmation. Approach guidance yields to discoveries and urgent warnings. Optional contacts use the existing surface. The random scheduler and camera-dependent placement search are replaced by one arrival latch per spot.

## Validation

Passed on the final source:

- TypeScript checking and production build (including the final witness sightline move).
- Final canonical full unit gate: **3,246 tests passed in 192 files**. Focused runs also passed **533 tests in six extended unit capability specs**, plus **68 tests in five existing Scanner/Journal/discovery specs** (601 focused checks total).
- Strict content validation, attribution and repository-wide Prettier checking; `git diff --check`.
- Playwright discovery: **141 tests in five files**, comprising `f-events-reform`, `f2-explore`, `opening-framing`, `d2-camera` and `f-bughunt-18`.

Canonical run: `GATES_CONFIG_MODE=writable PW_PORT=4260 PW_OUTDIR=.cache/events-anchored-dist bash tools/gates.sh`. **Actual e2e mode: smoke + project-base**, not full e2e. The first run is retained at `.cache/runs/20261018-133754-2-VBLBSA/`: its full unit run mixed the earlier loaded source with the subsequently added occlusion assertions (3,238 passed, eight occlusion cases failed). Those eight pass on the final source. The frozen-source rerun at `.cache/runs/20261018-134554-2-CNFlW0/` **passed all 3,246 unit tests in 192 files**, content, build, attribution and Prettier; `.cache/gates/` links to that rerun. Its overall exit status is 1 because the Python and browser gates below remain red. Both root and project-base production builds succeeded.

Failures, distinct from environment blocks:

- The Python gate's golden comparison wrapper fails at `tools/tests/golden-manifest.test.mjs:151` with `Unexpected end of JSON input`. A standalone run of that existing spec reproduces it (six passed, one failed), retained at `.cache/events-anchored-golden-check.log`. No tooling was changed.

Environment blocks:

- Four Python build-manifest checks fail with `spawnSync git EPERM` under this sandbox. Together with the golden wrapper, the Python gate reports five failures among 166 Python tests.
- Smoke and project-base browser gates cannot start their web server. The targeted **normal Chromium behavior mode** run of the five files above (141 tests, `PW_RENDER_REVIEW` unset) also cannot start: debug output records localhost connection `EPERM` for both `::1:4261` and `127.0.0.1:4261`. See `.cache/events-anchored-capability.log`.
- **No browser test, GPU execution, screenshot, real phone journey or visual acceptance was obtained.** The render/layout assertions remain intact for a permitted environment; no assertions, timeouts or tools were loosened.

Existing capability specs extended: `eventsSystem`, `eventsReform`, `eventsTerrain`, `gameExplore`, `siteManifest`, `guidance`, `f-events-reform` and `f2-explore`. They cover all six sites/eight contacts, manifest errors, local availability, no scan hijack, inclusive arrival, remote/vertical exclusion, no random/timed start, pause/reset, no overlap/queued entry, exit/re-entry, moving origins, witness/Journal persistence and zero score inflation. The review e2e table now covers all eight contacts on desktop and landscape phone, using actual arrivals instead of a preview bypass; existing layout/render limits remain.

Low numerical fixtures retain 100 particles, opacity > 0.7, particle size >= 7 m, one visible effect object, merged whale geometry under 1,500 triangles, floor clearance and the existing movement. Actual six-site terrain fixtures check 16 approach projections (844×390 and 1280×720), >70% in-frustum geometry, >45 px principal footprint and >8 px whale height; these are numerical availability checks, **not readability or screenshot acceptance**.

## Claude Low-tier review still required

Review all eight contacts at start and during motion, through normal piloting on Low, on desktop, portrait and landscape phone. Keep the existing effects only if they read:

- **Vent plume — Axial, Beebe, Kamaʻehu:** distinguish each transient plume from the site's ambient venting, confirm it starts in a plausible clear place and remains identifiable against the bed. At Kamaʻehu retain the low-temperature, pale vent interpretation.
- **Silt flow — Hunga, Hudson, Monterey:** confirm the unchanged cloud reads as sediment moving along the floor, including relief/occlusion and late motion. A geometrically available cloud may still be too weak or indistinct.
- **Whale route — Hudson, Monterey:** verify that an upper-water route can be found naturally, and its unchanged crossing silhouette, contrast and fins/flukes read on Low. Check the route's witness window and motion without assuming the projection tests prove recognizability.
- Check optional-contact guidance, sighting handoff, Journal explanation and control/subject clearance at actual phone framings. No beauty, GPU performance, phone appearance or visual acceptance is claimed by Codex.

All eight are candidates for a cut **if Claude demonstrates failure to read on Low**. No such visual evidence is available in this run, so no event kind was cut. The scheduler replacement is logged in CHANGELOG.md; any demonstrated event cut must also be logged there.
