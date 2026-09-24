# Missions (B3)

A mission wraps a landmark's content (POIs, guide, props) in a start-to-finish
dive: briefing, surface start, objectives, completion, debrief. Schema:
`plan/PHASE-B-CONTRACTS.md` §2.4. Open one with `/?mission=titanic`.

## Files

| Module                                     | Role                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `data/landmarks/index.json`                | `{ "version": 1, "landmarks": ["titanic"] }`: content folders that have a `mission.json`. Content packs append. |
| `src/game/Mission.ts`                      | `parseMission` / `loadMission`, the manifest loader, and the `Mission` state machine. Pure TS.                  |
| `src/game/MissionRouter.ts`                | `?mission=` routing, `chooseTileId`, spawn pose + loadout, nav maths, and the `MissionRouter` controller.       |
| `src/ui/Briefing.ts`, `ObjectivesPanel.ts` | DOM overlays (styles under `/* --- B3 --- */`).                                                                 |
| `src/ui/MissionSelect.ts`                  | MISSIONS section above DIVE SITES; collapsed behind a toggle during a mission.                                  |

## Flow

1. **Boot.** `?mission=<id>` fetches `/data/landmarks/<id>/mission.json`. The
   tile is `mission.tile` (it beats `?tile=`); the content folder is
   `mission.landmark` (`?landmark=` still overrides it for fixtures). A missing
   or invalid mission logs a warning and falls back to a free dive. With no
   `?mission=` nothing changes. A bare URL boots `Config.defaultTileId`
   (`titanic`) if it is in the tile index, else the first indexed tile. A
   `?tile=` (or `mission.tile`) that the index does not list logs a warning and
   boots the default the same way (`chooseTileId`; QA-B #13).

   **Free dive (no mission)** — `src/game/Spawn.ts`:
   - Hull: the lowest class in `Config.submarine.hullClasses` whose crush depth
     clears the tile's `meta.min_m` by `freeDiveHullMarginM` (300 m). The
     margin is soft: if no class clears it (Challenger Deep, 10,931 m vs Class
     C's 11,000 m), the deepest class is fitted and the HUD tile line says
     `at rating limit`. The HUD tile line always shows the fitted class
     (`titanic · hull B 4,500 m`). Today: titanic, endurance, axial,
     blake-plateau, hudson, hunga-tonga, great-blue-hole, monterey = B;
     bismarck, beebe, lost-city, kamaʻehuakanaloa, demo-synthetic,
     challenger-deep = C (no tile is shallow enough for Class A).
   - Spawn: over the tile centre, unless its seabed is shallower than
     `Config.mission.minSpawnSeabedM` (-60 m); then over the nearest grid cell
     at least that deep (ring search over `terrain.heightAtCell`). Height:
     `freeDiveSpawnAltitudeM` (90 m) above the seabed, or mid-water when the
     water is shallower than that; `?depth=` is clamped to `[hullRadius,
seabed + hullRadius + seabedClearance + mission.spawnClearanceM]`. The
     boat is never placed above the surface ceiling unless the hull does not
     fit at all (then it rests aground).

2. **Loadout.** `sub.setHullClass(hull_class)`, sim speed
   `Config.mission.defaultSimSpeed` (3×), spawn at `spawn.lat/lon`,
   `y = -max(depth_m, hullRadius)` (depth 5 = surface start), clamped at least
   `hullRadius + seabedClearance + mission.spawnClearanceM` above the seabed.
   Yaw = `heading_deg · π/180` (physics convention: `+yaw` turns toward +X =
   east). `?poi=` / `?at=` still override the pose afterwards. Missions keep
   `mission.hull_class`; the free-dive hull chooser does not run.
3. **Briefing.** Title, summary, target depth, hull, start, facts, hazards
   (amber), objectives, controls, memorial note (italic). While it is up the game
   is frozen: no physics steps, input replaced by `FROZEN_INPUT`, no dive time
   counted. "Begin dive" or Enter starts it; `?skipBriefing=1` skips it (e2e).
   Tab is trapped inside the card (`src/ui/FocusTrap.ts`; the debrief and field
   guide trap it too), so DIVE SITES and the mission list behind it cannot be
   reached. Escape deliberately does nothing on the briefing: there is nothing
   behind it to return to, and starting the dive on Escape would surprise.
   Opening a modal does not pull focus into it (Space is ballast blow; a focused
   "Dive again" would turn a held Space into a reload); the first Tab does.
4. **Diving** (`state: 'diving'`). The objectives panel (top centre, D-FLOW)
   is the one place the current objective shows: the mission title, a nav
   line and an "n of m" progress line (`1 of 4 objectives · 1 of 2 primary`).
   The full list with each objective's `hint` is in the Esc menu's Objectives
   view. The nav line points at the nearest open primary: bearing (0 = north, `headingFromForward`, the same
   maths as the HUD heading), `RNG` = the 3D slant range (the same metric as
   the scan panel's distance and the scanner's `radius_m` test; QA-B #11, so
   the surface start reads ~4.3 km to a bow 2 km away and 3.8 km down), target
   depth, and a turn cue.
   Once every primary is done it points at the nearest open secondary
   (`OPTIONAL → …`).
5. **Primaries complete** (`all_primary`, D-FLOW). Objectives count scans
   (`scan:complete`) made during this dive, not the persisted discovery store
   (the Journal), so every dive, including "Dive again", starts with every
   objective open. Objectives whose POI is missing from `pois.json` do not
   count or block. The scan that completes the last primary emits
   `mission:primaryComplete {missionId, completed, total}` and moves to
   `primaries-complete`; nothing ends the dive on its own. After
   `mission.completeDelayS` (3 s, so the scan's NEW ENTRY card lands first) a
   banner under the panel reads **Primary objectives complete** with **Keep
   exploring** (the default; it applies after `mission.completionBannerS`,
   20 s) and **Surface and debrief**. Secondary scans keep counting; when
   everything is done the banner returns as **All objectives complete**. The
   banner buttons never take keyboard focus.
6. **Debrief.** Only the player ends a dive: the banner's Surface and debrief,
   or **Surface and debrief** in the Esc menu (any time during a mission dive;
   before the primaries it is titled **Dive ended**). `Mission.end()` emits
   `mission:complete {missionId, durationS}` once per dive, only when the
   primaries are done, then `mission:ended {missionId, reason:
'surface'|'all'|'abort', completed, total, durationS}` on every debrief. The
   debrief shows `X of Y objectives`, B1's session stats and the new Journal
   entries, and freezes the game. Its buttons: **Keep exploring** (Escape too;
   back to the same state and pose), **Dive again** (`mission:restart`, then a
   reload of the same URL: a fresh dive with the briefing unless the URL skips
   it), **Dive sites** (the home screen's site chooser, without launching a
   dive), **Home**, and **Journal** (over the debrief; Escape closes only it).
7. **Failure: crush depth** (plan/DECISIONS.md: emergency ascent + restart).
   On `sub:emergencyBlow` during a running mission the objectives panel shows
   an amber `HULL FAILURE — EMERGENCY ASCENT` strip (it replaces the HUD's red
   banner while up). When the blow ends (the sub's `emergencyBlow` goes false,
   i.e. the control lock ran out _and_ the boat is back above its rating),
   `Mission.abort('crush')` emits `mission:aborted {missionId, reason:
'crush'}`, then `Mission.end()` emits `mission:ended` (reason `abort`, no
   `mission:complete`) and the debrief opens as **Dive aborted** (amber, "Hull
   failure at N m · emergency ascent completed · …") without Keep exploring.
   The game is frozen under it (`missionRouter.frozen`) and Escape does not
   dismiss it. Free dive keeps the
   Phase A behaviour (blow, then carry on).

**Clock.** The mission clock (`Mission.elapsedS`, `durationS`) and the
debrief's DIVE TIME count real (wall-clock) seconds of unfrozen play —
`time.frameDelta` while neither the briefing, the debrief nor a menu is up —
not physics dt, which the 8-steps-per-frame cap in `Time.ts` shortens at low
frame rates (QA-B #10). Scan progress still runs on physics time.

**Turning at 2×/3×.** Sim speed runs 2–3 physics ticks per frame, which used
to triple the yaw/pitch rate too (~90°/s real at 3×; QA-B #15). By default
`Submarine.stepOnce` now divides the yaw and pitch stick by the multiplier, so
the boat turns at its 1× real rate while translation keeps the full speed-up.
`Config.submarine.simSpeedScalesTurnRate: true` restores the old behaviour.

States: `briefing → diving → primaries-complete → debrief`, plus `aborted →
debrief`; Keep exploring returns from `debrief` to the state before it.
Events: `mission:started {missionId, tileId}`, `mission:objective {missionId,
objectiveId, complete}`, `mission:primaryComplete {missionId, completed,
total}`, `mission:complete {missionId, durationS}` (real seconds of diving),
`mission:ended {missionId, reason, completed, total, durationS}`,
`mission:restart {missionId}`, `mission:aborted {missionId, reason: 'crush'}`.
`window.__game.mission` is the `Mission` (`state`, `objectives`, `emitted[]`,
`endReason`); `window.__game.missionRouter` is the controller (`endDive()`,
`keepExploring()`).

## Journal

The Journal (`src/ui/Journal.ts`, model in `src/game/JournalData.ts`)
replaced the field guide; `src/ui/FieldGuide.ts` re-exports it under the old
name, so it is still `discovery.guide` (and `window.__game.journal`). It opens
with J in a dive (on this dive's site), from the home screen (front page), the
Esc menu and the debrief. It lists every mission site from
`data/landmarks/index.json`, plus the dive's own content folder when that is
not listed, with entries per site (guide entries no POI points at), per POI
(`guide.json` entries, or a stand-in per POI) and per species
(`species.json`), built from `landmarks.json`, `guide.json`, `pois.json` and
`species.json`. Unlocks read `subexplorer.discoveries.v1`, which the Journal
never writes: a site opens on any scan there, a POI entry on its POI's scan,
and a species only when a scanned POI's entry names it; other species stay
spoiler-only until a future encounter system. "Show undiscovered entries
(spoilers)" is an in-memory toggle. The front page says once that the seabed
is real survey data and that wrecks, structures and markers are recreations;
entries for POIs with `reconstruction: true` carry a small **Recreation** tag,
and every entry lists its sources.

## Titanic time budget

The brief asks for start to debrief in under 10 min at 2× sim speed.
`tests/unit/missionTimeline.test.ts` runs the real `Submarine` physics with
Config's numbers (run it with `--reporter verbose` to print them) and fails if
the budget breaks.

| Quantity                                                        | Value                    |
| --------------------------------------------------------------- | ------------------------ |
| Vertical terminal speed, full flood (Shift)                     | 5.37 m/s                 |
| Forward terminal speed, full throttle                           | 6.03 m/s                 |
| Descent, surface to 3,790 m (sim time)                          | 706 s                    |
| Transit, spawn to bow, 2,005 m (sim time)                       | 332 s                    |
| Bow to stern, 600 m (sim time)                                  | 99 s                     |
| Scans (bow + stern, real time) + completion delay               | 8 s + 3 s                |
| Descent real time at 1× / 2× / 3×                               | 11.8 / 5.9 / 3.9 min     |
| **Worst case** (legs flown one after another) at 1× / 2× / 3×   | 19.1 / **9.7** / 6.5 min |
| Typical (W + Shift for the transit, then Shift) at 1× / 2× / 3× | 14.7 / **7.4** / 5.0 min |

Sim speed multiplies physics steps, so real time = sim time / multiplier; scans
run on real time. At 2× the descent alone is ~5.9 min, right at the ~6 min
limit, and the worst case (9.7 min) has little slack. So missions start at 3×
(`Config.mission.defaultSimSpeed`), the preferred fix; no physics constant
changed. T still cycles 1×/2×/3× and the panel shows the current value. Holding
W and Shift together all the way down is slower (drag couples the axes) and
overshoots the wreck by ~2.6 km, which is why the typical plan stops thrusting
once the 2 km are covered.

## Tests

`tests/unit/mission{Core,Router,Timeline,Abort}.test.ts`, `gameSpawn.test.ts`,
`tests/e2e/mission.spec.ts` (screenshots `mission-briefing.png`,
`mission-objectives.png`, `mission-debrief.png`, `mission-select.png`,
`fix-s-aborted-debrief.png`, `fix-s-bow-offset.png`) and the free-dive checks
in `tests/e2e/sub-playtest.spec.ts` (`fix-s-great-blue-hole.png`).

## Not done

- Only the `scan` objective type and the `all_primary` rule are implemented.
