# QA notes — Phase B (2026-09-22)

Phase B QA agent, run after B1–B4 were integrated. Report only; nothing was fixed.

**Test counts:** `npm test` 258 passed (23 files) · `npm run test:py` 42 passed · `npm run test:e2e` **17 / 17 passed** (2.9 min). All were run against a fresh `dist-qa` build on port 4186.
QA probes: 7 throwaway specs in `tests/e2e/qa/qa-*.spec.ts`. Evidence (76 PNGs) is in `tests/e2e/screenshots/qa/`.

**Environment:** Linux, Node 22, Playwright Chromium, 1280×720 viewport.

- Default headless renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`. **This is software rendering.** Every default e2e run and my mission playthrough ran on it at about 5 fps.
- Launched with `--ignore-gpu-blocklist --use-angle=vulkan --enable-features=Vulkan --disable-vulkan-surface`, headless Chromium gets the real GPU: `ANGLE (AMD, Vulkan 1.4.318 (AMD Radeon Graphics (RADV GFX1200)), radv)`. `--use-angle=gl` also works (radeonsi, OpenGL 4.6).

## Findings, by severity

1. **The Landmarks.ts beacon and label clutter every site, and in mission mode they cover the wreck and the objectives panel** (high).
   - Repro: `/?mission=titanic&poi=titanic-bow&skipBriefing=1`, or any free-dive tile.
   - Evidence: `m-arrive-titanic-bow.png`, `m-bow-complete.png`, `l-1024x600-mission.png`, `props-sheet.png`, `tiles-contact-sheet.png`.
   - The "RMS Titanic" sprite is sized in world metres (`canvas.width*0.7` ≈ 300–400 m wide) and drawn with `depthTest:false, fog:false`. At 100–240 m it is 300×85 px across the middle of the view.
   - It shows through the translucent objectives panel. Measured overlap: `landmarkLabel(236 m,315×85px)~objectives` and `(883 m,84×23px)~objectives`.
   - The yellow sphere and 60 m pole sit on the bow deck and pierce the hull.
   - On 8 of 14 free-dive tiles the label runs off-screen ("Hydrothermal Vent Field (Von Da…", "…ral Coral Mound Pr…").
   - This contradicts art-direction §0 ("no loot-sparkle VFX on wrecks", memorial tone) and pillar 3 ("found, not signposted").
   - Cause: `src/world/Landmarks.ts` (makeMarker/makeLabel), constructed unconditionally in `main.ts`. Owner: B3 decides mission-mode behaviour; A-lane world owns `Landmarks.ts`. Recommendation under "Recommended fixes".
2. **Three deep tiles can't be played in free dive: HULL BREACH at spawn** (high).
   - Repro: `/?tile=bismarck`, `/?tile=beebe-vent-field`, `/?tile=challenger-deep`.
   - Evidence: `tile-bismarck.png`, `tile-beebe-vent-field.png`, `tile-challenger-deep.png`. The HUD status reads `HULL BREACH`, and the boat is emergency-blowing upward at 6 m/s three seconds after boot.
   - Free dive always fits Class B (`Config.submarine.hullClass: 'B'`, crush -4,500 m). The spawn is seabed + 90 m, which is 4,776 / 4,889 / 10,821 m on these tiles.
   - The Bismarck wreck (~4,790 m) and Beebe (~5,000 m) are unreachable from DIVE SITES.
   - Owner: B3 (free-dive loadout: pick the lowest hull class whose crush depth clears the tile's `min_m`), with A3 for the hull config.
3. **Shallow tiles: the boat spawns and rests above sea level, and `?depth=` is ignored** (medium).
   - Repro: `/?tile=great-blue-hole` gives sub y = **+6.6 m**, ground -5.4 m. `/?tile=hunga-tonga-caldera&depth=30` gives y = -8.0; the depth is ignored.
   - Evidence: `tile-great-blue-hole*.png`, `tile-hunga-tonga-caldera*.png`.
   - The HUD shows "7 m" because `HUD.ts:72` uses `Math.abs(s.depth)`, which hides the sign.
   - Causes:
     - `Submarine.ts:309` clamps y to `-hullRadius`, then the seabed push-out (`:341`) runs afterwards and lifts the boat out of water shallower than ~12 m.
     - `main.ts` spawn: `max(ground+40, min(-hullRadius, -depth))` evaluates to +34.6 m on a -5.4 m seabed.
     - Both tiles' centres sit on a reef flat or caldera rim, not the feature itself.
   - Owners: A3 (clamp order), main.ts spawn (A2/B4 `?depth`/`?at` block), B2/tiles (a per-tile spawn point would fix the centre problem).
4. **Shallow seabed renders neon lime; mid-depth headlight pools read green-teal** (medium).
   - Repro: `/?tile=hudson-canyon` (46 m) shows a saturated yellow-green floor, centre-crop mean RGB (154,214,68). The lime tint shows faintly in the Phase A `atmosphere-10` frame too, so it isn't new.
   - Monterey (535 m), lost-city (1,199 m) and kamaehuakanaloa (1,028 m): the headlight pool is emerald.
   - Evidence: `tile-hudson-canyon.png`, `tiles-contact-sheet.png`.
   - Art direction asks for sand `#C9B489` under 200 m, warm-white headlights `#FFF3DD`, brown-grey sediment, and "no saturated neon".
   - Suspects: the terrain albedo/tint (A1), grade tint, caustics or exposure 1.25 (A2). Owner: A1 and A2.
5. **You can't tell prow from stern, so the authored wreck orientation doesn't read** (medium).
   - Repro: `/?tile=titanic&landmark=titanic&at=41.7325,-49.9469,0&depth=3780`, then view the bow from 100 m at headings 0 and 180.
   - Evidence: `props-orient-crops.png`. The four panels are bow h0, bow h180, stern h190 and stern h10.
   - Both ends of `procedural:hull-block` are flat tapered boxes; the torn aft plating isn't visible at 100 m.
   - The matrices are correct (bow 0°, stern 190°), but "the bow faces north, the stern points back at the bow" (the briefing fact) is invisible.
   - The end faces also show a lime-to-orange vertex-colour gradient.
   - Owner: B4 (a pointed prow, and a ragged, darker aft end).
6. **Your own boat blocks the scan target** (medium).
   - Evidence: `m-arrive-titanic-bow.png`, `m-scan-titanic-bow.png`, `p-bow-h0.png`.
   - At 80–140 m the chase camera puts the sub's silhouette dead centre, over the bow and on top of the scan reticle.
   - Below ~300 m the hull is unlit black; at 1,500 m only two headlight dots are visible (`mission-descent-sheet.png`).
   - Owner: A3 (`CameraRig` offset: raise it or shift it to one side near a scan candidate; a faint hull rim or ambient term).
7. **E2E and every timing number run on SwiftShader at ~5 fps** (medium).
   - Because of the 8-steps-per-frame cap (`Time.ts:28`), physics runs at about 67–82% of real time.
   - My mission wall times and every e2e physics threshold are therefore pessimistic, and the GPU-tier code paths are never tested on real hardware.
   - Adding the Vulkan launch args above to `playwright.config.ts` gives 60 fps on the Radeon. Owner: orchestrator (the config is shared).
8. **The debug `draws N` readout always says `draws 1`** (medium).
   - Repro: `?debugTerrain=1` on any tile.
   - `main.ts` reads `renderer.info.render.calls` after `post.render()`, which auto-resets the counter, so it counts only the post quad. The perf brief's draw-call number can't be measured.
   - Fix: read `info` before the post pass, or set `renderer.info.autoReset=false` and reset manually. Owner: A1/A2 (the main.ts debug line).
9. **Content unit error: "roughly 3 by 5 km (about 15 square miles)"** (medium).
   - Location: `data/landmarks/titanic/guide.json`, debris-field entry and overview.
   - 3×5 km is 15 km². 15 sq mi is ~39 km². The cited History Blog says "15 square mile"; Oceanus says "15 to 20 square miles".
   - Wikipedia, which is also cited, instead says two fields 600–800 m long, ~5 km².
   - Owner: B2. See the content check below.
10. **The mission clock and DIVE TIME count capped sim time, not real seconds** (low).
    - `mission:complete.durationS` was 550 s against 670 s of wall time. `Mission.elapsedS` accumulates physics dt, which loses time under low fps.
    - docs/missions.md says "real seconds since Begin dive". Owner: B3.
11. **Two different ranges on screen at once** (low).
    - The scan panel shows 3D distance ("140 m"); the objectives nav shows horizontal "RNG 118 m" for the same target (`m-arrive-titanic-bow.png`).
    - Label one "SLANT", or use one metric. Owner: B1/B3.
12. **Modals don't trap focus; Escape doesn't close the briefing** (low).
    - With the briefing up, Tab cycles `DIVE SITES ▸` (behind the card), then `Begin dive`, then body.
    - With a debrief up, Tab reaches `.mission-item` buttons behind it; Enter there navigates away.
    - Tab is also the secondary sonar-ping key, so every focus move pings (by design, but noisy).
    - Owner: B3 (briefing, mission debrief), B1 (debrief, guide).
13. **An unknown `?tile=` gives a fatal screen with a raw error** (low).
    - `/?tile=does-not-exist` shows `Unexpected token '<', "<!doctype "... is not valid JSON`.
    - `chooseTileId` (`MissionRouter.ts:86`) returns `requested` without checking the index. By contrast, `?mission=bogus` falls back cleanly with a warning. Owner: B3.
14. **SEABED PROXIMITY is up for the whole wreck inspection** (low).
    - You scan at 12–25 m altitude, so the red banner stays on screen over the wreck (`l-1024x600-mission.png`, `props-sheet.png`).
    - It touches the objectives panel by 1.4 px at every viewport (y=170 vs a panel bottom of 171.4).
    - Suggest a lower threshold, or suppress it near a POI. Owner: A3/HUD.
15. **Fine aiming at 3× sim is twitchy** (low).
    - Yaw is ~90°/s real at 3×. My closed-loop keyboard controller reached the bow but oscillated ±50° around the stern for 4 min.
    - That is a harness artefact, but it shows the problem. Suggest dropping to 1× inside a POI radius, or not scaling yaw rate. Owner: B3.
16. **Minor content gaps** (low).
    - The Big Piece "C and D decks" isn't in the cited Wikipedia article (which also gives a different size from the "Wreck" article).
    - "Two main debris trails run south-west" isn't in the three debris sources checked. Owner: B2.
17. **Housekeeping** (low).
    - No favicon: `/favicon.ico` returns 404, and headed Chromium logs it as a console error.
    - `npm run test:e2e` rewrites the _tracked_ `docs/img/atmosphere-*.png`, adding git noise each run. Owner: orchestrator.

## Not regressions / by design

- **Phase A look unchanged** (check 10). The 3D scene differs from the HEAD `atmosphere-{10,300,3800}.png` by a mean of ~3/255, which is snow and noise. `titanic.png` and `monterey-canyon.png` are unchanged against the pre-run copies. UI differences are intended: the MISSIONS panel and the 13-tile list. **QA-A #1 (sonar on Titanic) is fixed.** Evidence: `regression-sheet.png`.
  - Caveat: `tests/e2e/screenshots/*.png` are gitignored, so no true Phase A copy of those two exists. The HEAD atmosphere frames were the baseline.
- **Fog/colour matches docs/atmosphere.md.** Measured fog colours were #5aafc4 at 10 m, #0e2530 at 300 m and #050c10 below 1,000 m, exactly the art-direction stops. Density is art value × `fogDensityScale` 0.02, as documented.
- Deep frames (bismarck, challenger, titanic) are mostly black with a headlight pool, which is correct at depth. There were no NaN HUD values, no spawn inside terrain, and no camera below the seabed on any of the 18 boots.
- Positive-elevation land (Hunga Tonga islands, Monterey coast) renders as terrain above the water plane. It looks plausible.
- **B3 heading fix verified.** At headings 112° and 289° while moving at 6 m/s:
  - Physics heading, velocity, hull nose (mesh −Z), headlight aim and camera look all agree within 1°, in both chase and first-person.
  - Screenshots: `m-heading-90*.png`, `m-heading-270*.png`.
- **Nav readouts are correct.** Across 119 samples the panel bearing was within 0.47° of my own geo maths and the range within 1.6%.
- **Props.** Debris does not float: 138 instances sit 0.03–0.77 m above the seabed. Ramming the bow at 4.1 m/s drops speed to 0.07 m/s and fires `sub:collided` once. At 3× plus boost there is no tunnelling; the event repeats every ~0.75 s while pushing (by design).
- **Persistence (check 4).** `subexplorer.discoveries.v1` matches docs/discovery.md exactly: `{version:1, discovered:{"titanic/titanic-bow":{at,count:1}, …}, stats:{scans:2, firstAt}}`. After reload, J shows `3 / 9 CATALOGUED`: overview, bow, stern. Objectives reset on reload, as designed.
- **Escape.** Escape closes the guide, the free-dive debrief, and the mission debrief (given 1.5 s; a 300 ms check caught it mid-fade). The MISSIONS item launches `?mission=titanic` from the keyboard.
- **Console errors: none** on 13 valid routes and all 14 tiles. The only noise is Chromium "GPU stall due to ReadPixels" warnings from Playwright screenshots.
- The mission reaches the wreck horizontally at 1,500 m depth and then sinks straight down, as documented in docs/missions.md (W+Shift overshoot note).

## Mission playthrough log

Run: `/?mission=titanic` on SwiftShader (~5 fps, physics ~67–82% of real time), 3× sim, scripted W/A/D/Shift/Space/G driven from `window.__game`.

| t (real s)  | Event                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| 0           | Escape on the briefing does nothing; Enter starts. Panel: `BRG 150° RNG 2.00 km`                        |
| 4 / 28      | 10 m (fog #5aafc4) / 300 m (fog #0e2530), screenshots `m-depth-*.png`                                   |
| 127         | 1,500 m depth, already 170 m horizontally from the bow; W released, sinking                             |
| 247         | 3,000 m                                                                                                 |
| 302         | Within 200 m of the bow (3,704 m). Props lit and visible in the headlights (`m-arrive-titanic-bow.png`) |
| 304 → 311   | Scan held → `find-bow` ☑ (the 4 s scan took 5.1 s real because physics was capped)                      |
| 322 / 355   | Heading ~90° and ~270° checks done (moving, chase + first person)                                       |
| 397         | Within 200 m of the stern. The panel then points at it correctly (`BRG 172°`)                           |
| 401–657     | My controller oscillated at 111 m; the stern never stayed in the beam (harness issue, see #15)          |
| 657         | **Fallback:** `discovery.spawnPose('titanic-stern')` teleport (80 m), then scan                         |
| 664.6–669.9 | Stern scan → debrief. Debrief: 6.03 km, max 3,773 m, DIVE TIME 9:10, 2 scans, 2 new entries             |

The bow was reached by scripted flight in 5.2 min without fallback. The stern needed the teleport fallback. Minus the harness stall, the start-to-debrief estimate is about 7 min under software rendering, less on the GPU, which is within the 10-minute brief.

## Performance table

`[terrain]` line after 6 s at rest, then after 5 s of holding D. fps from the line / rAF cross-check.

| Route                                | Renderer                        | tris drawn (rest) | fps rest                    | fps turning | draws (bug #8) |
| ------------------------------------ | ------------------------------- | ----------------- | --------------------------- | ----------- | -------------- |
| monterey `tier=high`                 | SwiftShader                     | 580k (43 chunks)  | 5                           | 4           | "1"            |
| monterey `tier=medium`               | SwiftShader                     | 212k              | 5                           | 5           | "1"            |
| titanic bow (props) `tier=high`      | SwiftShader                     | 606k              | 5                           | 5           | "1"            |
| titanic bow (props) `tier=medium`    | SwiftShader                     | 211k              | 5                           | 6           | "1"            |
| all four routes above                | AMD Radeon (RADV, Vulkan)       | same              | 60 (vsync)                  | 60 (vsync)  | "1"            |
| all four, `--use-angle=gl`           | AMD Radeon (radeonsi GL)        | same              | 60                          | 60          | "1"            |
| all four, vsync/frame-limit disabled | AMD Radeon (Vulkan, no surface) | same              | ≥1000 (line clamps at 1 ms) | ≥625        | "1"            |

- The uncapped rAF rates of 2.2–3.2k fps aren't GPU-synchronised. Read them as "CPU frame cost well under 1 ms", not as a GPU frame time.
- The high tier on the Radeon holds 60 fps with no measurable strain.

## Content spot-check (check 9)

7 claims in `guide.json` were checked against each entry's own sources; every source was reachable.

- **Supported (5):**
  - bow buried ~18 m (60 ft)
  - 2024 port railing loss, 15 ft
  - stern coordinates and ~600 m separation (sources say 2,000 ft; the coordinates give 689 m)
  - boilers ~180 m (600 ft) east of the stern
  - memorial plaque inscription and placement
- **Partial (1):** the Big Piece size and date are right, "C and D decks" is unsourced.
- **Wrong unit (1):** the debris field (#9).

## Recommended fixes before Phase C (prioritised)

1. **Landmark markers (#1):**
   - When `route` is set, don't construct `Landmarks` (or hide `landmarks.group`); the POI reticle and objectives already do the job.
   - In free dive, size labels in screen space: fixed ~14 px height, fade out inside ~500 m, hidden once the POI reticle is showing.
   - Drop the beacon pole; turn `depthTest` back on for the sphere; keep the sonar dot.
2. **Free-dive hull class by tile depth (#2)**, and a proper shallow spawn: seabed-push before the surface clamp, spawn y ≤ -hullRadius, per-tile spawn lat/lon (#3).
3. **Playwright GPU args (#7) and the draws counter (#8)**, so perf and timing checks mean something on this machine.
4. **Hull-block prow/stern shape (#5) and the chase camera over the scan target (#6).** These are what make the Titanic slice look right.
5. **Shallow/mid-depth colour pass against art-direction §0 (#4).**
6. **Content fixes (#9, #16); an unknown `?tile=` falls back (#13); a real-seconds mission clock (#10).**
7. Polish: one range metric (#11), focus traps plus Escape on the briefing (#12), proximity threshold near POIs (#14), aim assist or 1× inside a POI radius (#15), favicon (#17).
