# V-beebe-bores-lostcity-crown (item 26)

## Changes

- `src/world/props/geo/towers.ts` (shared carbonate builder): the main trunk now stops about 14% short of the edifice height and three slim tubes of different height (1, 0.62, 0.34 of the rise) rise from its rim (the tallest on the axis), each a spire with its own bore; the trunk keeps its full-height girth and the haze rises from the tallest tube. The tallest tip still reaches the authored 60 m. Tubes use the existing `mk` spire path (colliders, painting, vent mouths come for free); `mk` gained optional `y` and `r0` arguments. The lone chimneys are unchanged.
- `src/world/props/geo/smokers.ts` (shared smoker builder): each stack gets a bore lip ring (`RingGeometry`) laid on the crater rim by the same raycast as the mouth disc, merged into the collar mesh (no extra draw); the throat disc is now a dark bore with only an ember glow (`emissiveIntensity` 0.3). No new data fields.
- `src/world/props/geo/spire.ts`: crusted (sulfide) rims tear 45% less (`rimDrop` x0.55 when `crust`), a tidier rim round the bore.

## Screenshots

`.cache/codex/shots/V-beebe-bores-lostcity-crown/`: `before-*` and `after-*` (a2-* are the full after set; `a2top-`/`a3top-` are a temporary close top-down Beebe pose, not committed). Lost City pose 3: one fluted sheet becomes a cluster of three distinct spires of different height with white crowns. Beebe top-down: dark rust bore, pale lip ring, tidier crown; bores are still mostly hidden by smoke at the default poses.

## Tests

Snapshots rebaselined (intended): props-geo, beebeIsolation, terrainMerge1140 (Beebe and Lost City only); perf-budget Low Lost City effect-footprint pins moved with the crown surface (range 70 10.66k to 10.65k, 32 43.76k to 43.55k, 10 66.8k to 52.8k px; ceilings unchanged). f-perf-budget.spec.ts passes unchanged. Low-tier crown tubes use coarser segments/rings to stay within the Low triangle ceiling. Gates: see final report.

## Simplicity

Net: small additions in two shared builders, no site branches, no new data schema, one removed idea (a rim-notch approach was tried and dropped because deep notches fold the rim into planar sheets).

## Remaining issues

- Lost City crown tubes have small spiky teeth at their tips (rim teeth at tube scale).
- Beebe bores at the standard approach pose are behind smoke; the lip ring only reads from above.
- The old trunk rim, now lower, shows white speckles.

## Honest rating

Lost City crown 7/10; Beebe bores 6/10.
