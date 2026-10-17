# V-bluehole-hood

## What changed (`src/world/props/geo/stalactites.ts`, hood only)

- **Uneven terraces**: `shelfStep` is warped in x and curved in height, so plateau widths and riser heights no longer repeat evenly.
- **Cracks**: `crackAt` gives thin ridged fissures at irregular spacing. `roofRise` cuts the roof top down along them; the wall paint darkens the face and underside beneath them.
- **Darker, rougher interior**: the wall paint gains a hood-only pass: plateau-dependent tone, mottling, a shadowed underside and grey-brown staining, with floors so it stays readable.

## Screenshots (`.cache/codex/shots/V-bluehole-hood/`)

`before/` and `after/` (golden, `GOLDEN_SITES=blue-hole`, desktop and portrait for after).

## Tests

`props-geo` and `terrainMerge1140` snapshots re-baselined (Blue Hole geometry only). Full `tools/gates.sh`: all else passes.

## Simplicity rules

- 1 net simpler: one small helper (`crackAt`) and a paint block; no new settings or modules.
- 4 no site branches: existing `hood` flag only.
- 6 tests: existing capability specs, snapshots moved.
- 7 no package numbers in code.

## Remaining issues

- The underside geometry is unchanged (colour and shadow only); the roof outline is still a fairly smooth rolled slab with faceted steps.
- Cracks read as fold lines rather than deep dark fissures; the sand shelf is still pale.
- Own rating about 4.0 (from ~3.7); east frame is irregular and darker but not yet documentary-grade.
