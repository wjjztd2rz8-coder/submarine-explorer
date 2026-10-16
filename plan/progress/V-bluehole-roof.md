# V-bluehole-roof

## What changed

- **Stepped roof shelves** (`stalactites.ts`, `scarp.ts`): `extrudeProfile` gains an optional `rise` callback (extra y per profile point). The hood lip and roof top rise in plateaus along the wall (`shelfStep`, sharp risers between plateaus, a second phase for the lip so thickness varies), and raised bays draw back so each step overhangs the one below. The underside and pendants are untouched, so the pinned pendant envelope test passes unchanged. Colliders only ever get larger than the visual (rise lifts the roof; the draw-back is shared through `wallDisp`).
- **Sediment beds** (`talus.ts`): `talusBedTop` adds a bounded per-bed swell/lean along x and a smaller random offset, so beds converge, part and undulate instead of running parallel. Treads stay level across the apron; gap stays positive (worst case 0.18 bed).
- **Blue tang** (`life/catalogue.ts`): the existing five colour fields desaturated toward a muted blue-violet; no new data path.

## Screenshots (`.cache/codex/shots/V-bluehole-roof/`)

`before/` (previous slice), `v1`..`v6` iterations, `v6` is final; poses `great-blue-hole-east-2/3` (approach/close) and `great-blue-hole-2` (west). Captured with `GOLDEN_SITES=blue-hole tools/golden.sh`.

## Tests

- `props-geo` snapshot (all Blue Hole tiers: east roof geometry and shared talus) and `terrainMerge1140` Low Blue Hole hash re-baselined: intended geometry change only. Envelope, collision, foot-on-ground and talus tests pass unchanged.

## Simplicity rules

- 1 net simpler: one small optional callback, no new settings, no new modules.
- 4 no site branches: `hood` flag from the existing prop manifest only.
- 6 tests: existing capability specs; snapshots moved.
- 7 no package numbers in code.

## Remaining issues

- The roof now reads as thick stepped slabs rather than a tube, but is a heavy slab from the front pose; thinning the plateaus' front lip or adding a few overhanging blocks would help.
- Terrain-side terraces (`blueHoleTerraces`, `blueHoleApron`) keep even radial spacing; flat bright sand shelf untouched.
- Rating about 3.8 (own estimate).
