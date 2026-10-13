# V-endurance: Endurance exposure and opening framing

## What changed

- `src/core/config/deepOpenings.ts` (Endurance table, no shared-code branch): lamps `intensity` 2 to 0.7, `fillIntensity` 3 to 1.5, hemisphere 3 to 2. At 15 m the 2x lamps clipped pale timber and sand to flat cream; at 0.7x the plank grain, soot staining and sand ripples read in pose 3, and pose 2 (40 m) keeps its look (hull still legible, slightly cooler and darker).
- `src/world/life/catalogueInvert.ts`: anemone (`cCol`/`cTent` 0xf2efe6/0xfaf7ee to 0x98938a/0xa8a399) and squat lobster (`cA`/`cB` 0xf1ece2/0xd8ad90 to 0x8c8170/0x6e4d3a) albedo toned down. These are shared species, so other sites' anemones and lobsters are also less glaring; they stay the palest animals in the scene (text still says pale/white). Linear albedo was about 0.9, so any lamp clipped them.
- No test pin changed. Opening geometry unchanged (see below).

## Opening reframe: not done

Tried range 16 to 30, chase radius 36 to 62, offsets, altitude and yaw (and the opposite bearing 240). A hull of 560-700 px (35-45% of the frame) is easy, but it fails existing guards in `tests/unit/deepOpening.test.ts` and `openingClearance1290.test.ts`, which I did not loosen: the opening must face the hull (dot > 0.98, so yawOffset at most about 11 degrees), the whole sub must fit in frame, the whole wreck (with fallen rigging) must clear the sub's box, and on landscape sizes the sub must sit 8 px right of the wreck. With those, range 32 / radius 70 / offset -220,-20 is the closest passing point, hull about 380 px. To get a half-frame hull the owner would have to relax the facing or gap guard (for example allow the sub to overlap or sit above the wreck box), or accept a bigger yaw offset and the "TURN n deg PORT" prompt that comes with it.

## Visual review

Shots in `.cache/codex/shots/V-endurance/` (`before/`, `after/`; desktop, `-portrait`, `-landscape`; poses 1 to 3).

- Pose 1 (opening): unchanged geometry, so the same: hull small, sub right third. Verdict: not improved.
- Pose 2 (40 m): same camera; slightly darker, cooler water; hull and creatures still legible. Neutral to slightly better contrast on the planking.
- Pose 3 (15 m): clearly better. Planks, mud stains and sand relief are visible instead of pale cream. Squat lobsters and anemones are less glaring but still the lightest things in frame (pale species), so "ghost-white" is reduced, not gone.
- Phone portrait and landscape pose 3: same improvement; scan card clear. Landscape opening keeps the sub behind the touch buttons, as before.

## Gates

`PW_PORT=4560 tools/gates.sh`: PASS (python, content, build, unit, e2e smoke, e2e-base, attribution, prettier).
