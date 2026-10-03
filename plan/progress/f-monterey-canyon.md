# f-monterey-canyon

Status 2026-10-03: done, not merged.

## Changed
- `data/landmarks/monterey-canyon/props.json`: added `canyon-wall-east` (heading 90) and `canyon-wall-west` (heading 270), smaller `canyon-ledge` walls flanking the spawn pose. An opposing wall to the south was tried first but sits behind the spawn camera, so flanks were used instead. No scan targets added; real-site facts unchanged.
- `src/world/props/geo/scarp.ts`: `addWallLife` seats instanced sponges and branching cold-water coral fans on the lit face (vertices facing the viewer, patchy noise), counts scale with the tier `growth` (about 90 sponges, 70 fans at medium; cheap at low).
- `src/world/props/geo/coral.ts`: `branchingColony` exported for reuse.
- No terrain depth fall-off was added; the real heightmap and fog already darken the gap.

## Screenshots
- Before: `.cache/golden/2026-10-03-190819/monterey-canyon-1.png`
- After: `.cache/golden/2026-10-03-192206/monterey-canyon-{1,2,3}.png` (shot 1 shows the east flank and wall life; the west flank is only partly visible at the left edge).

## Gates
`PW_PORT=4390 tools/gates.sh`: build, unit, python, content, attribution, e2e, e2e-base pass; prettier failed once on props.json and was fixed with `prettier --write`. `tools/golden.sh` run three times.
