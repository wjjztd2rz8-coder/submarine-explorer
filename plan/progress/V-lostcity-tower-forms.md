# V-lostcity-tower-forms

## Changed

- `src/world/props/geo/spire.ts`: trunk profile gains two seeded bulges per column (uneven taper, clear of foot and crown); the torn-rim drop for trunks is deeper, so tops read broken and uneven.
- `src/world/props/geo/towers.ts`: more side buttress fingers on the main tower (4, one on each lesser spire) and a third flange; higher radial segments on columns (44 per density) and fingers (14 per density), so tubes and fingers read round, not faceted.
- No manifest fields, no site branches, no new spec. Geometry snapshots (`props-geo`, `terrainMerge1140`) regenerated on purpose. Segment counts were trimmed to stay inside the existing Low triangle budgets.

## Screenshots

`.cache/codex/shots/V-lostcity-tower-forms/lost-city-{1,2,3}.png` (golden free-dive, desktop, High). Before: `.cache/codex/shots/V-lostcity/after/`.

## Honest rating

7/10, up from about 5.5. The hero tower now has a scooped, uneven crown, soft swells and ridges, and a pale, readable carbonate body; the side tube is round with no visible facets. Still short of the target: the profile bulges are subtle from the golden angles, buttresses are only occasionally visible, and the crown walls are still one fluted sheet rather than separate broken blocks.

## Gates

`PW_PORT=4893 tools/gates.sh` (smoke + project-base e2e), `GATES_CONFIG_MODE=writable`. No --full-e2e run.
