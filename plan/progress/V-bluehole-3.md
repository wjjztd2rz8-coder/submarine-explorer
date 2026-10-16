# V-bluehole-3

## What changed

- **Ground banks up behind each gallery seat** (`blueHoleSeatBank` in `terrainFeatures.ts`). Behind the hood's foot the terrain climbs about 17 m, easing in over 11 m (ragged, fading into the reef), so the roof meets rising ground and the end shoulders wrap the hood instead of a plank lying on a smooth slope. Per-seat foot radius sits in the same table as the angular windows. The hood still snaps to the ground at its foot, so the prop and its collision data do not move.
- **One gallery-window helper.** Four copies of the same bearing/width loop (terraces, apron, talus, wall relief) became `GALLERY_SEATS` plus `galleryMouth`; net code is smaller despite the new bank.
- **Roof lip** (`stalactites.ts`): `wallDisp` chips the lip back with noise (wall surface and colliders only; pendants still hang from the original `disp`, so the pinned envelope is unchanged), and the lip is mottled with grey-brown silt pockets.
- **End walls and cavity colour**: warm cream/ochre staining and dark streaks toward the ends, and warm lit limestone near the lip grading toward the back of the bay. Ends are no longer flat slate-blue.
- **Uneven sediment beds** (`talus.ts`, `stalactites.ts`): tread tops now sit a varying amount (up to 0.3 bed) below even spacing, differently per bed and along the wall (`talusBedTop`, `talusBedLevel`). Treads stay level across the apron. The bed shader reads a per-vertex `bedLevel` attribute instead of `fract(y / bedHeight)`, so shading follows the actual uneven steps.

## Screenshots (`.cache/codex/shots/V-bluehole-3/`)

- `before/`, `after/`: High desktop, same poses as the previous slice. `side/` and `s3side/`: temporary side poses used to judge the slab (not committed pose data). `portrait/`: 390x844, hood still readable and not too dark. `s1` to `s8`: intermediate captures.

## Tests

- `terrainMerge1140` and the free-dive composition snapshot (spawn moves under 1 m) re-baselined for the intended terrain change. The bank eases in slowly because the opening-minute scan-station search is knife-edge on ground height near the west seat. No guard loosened: envelope, collision, foot-on-ground and talus-terrace tests pass unchanged.

## Simplicity rules

- 1 net simpler: window loops merged into one helper; no new settings.
- 4 no site branches: seat data is the existing per-site table (`GALLERY_SEATS`).
- 6 tests: existing capability specs cover the changed behaviour; only the snapshot moved.
- 7 no package numbers in code.

## Remaining issues

- The roof is still a rolled tube in silhouette; chips are subtle from the approach poses. A true broken edge needs vertical lip variation in the profile, not a z displacement.
- Beds are uneven but still read as parallel bands in the west pose; the terrain-side terraces (`blueHoleTerraces`, `blueHoleApron`) keep their even radial spacing.
- Hood ends still show a thin curtain edge from the front pose.
- Rating: about 3.6 (was about 3.2).
