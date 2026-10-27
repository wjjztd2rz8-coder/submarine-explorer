# V-bluehole-roof-4

## Changes (`src/world/props/geo/stalactites.ts`, hood branch only)

- **Roof gaps**: `gapAt(x)` marks three breaks (one wide, two narrow), placed away from the probed notches. It lowers the roof top (`roofRise`, so colliders follow) and removes pendants beneath, so the ceiling reads as thin and broken rather than one rolled slab.
- **Pendants**: hood length follows a cubed clump noise and a smaller girth gain: mostly stubs, two or three long pendants.
- **Light shaft**: one soft pale shaft through the widest gap, four nested additive open cones merged into a single mesh, with vertex-colour fade at both ends. No new system or setting.

## Shots (`.cache/codex/shots/V-bluehole-roof-4/{before,after}/`)

Four iterations: hard-edged bright cone, banded cone, soft nested cones, then gaps moved off the notch probes. Final `after/great-blue-hole-east-2.png` and `-3.png`; `before/` is the previous slice's east-2.

## Tests

- `terrainMerge1140` Low pin for great-blue-hole: draws 6 -> 7. The shaft is one extra additive draw (triangle pin untouched). Deliberate bend of the draw budget; the director should confirm or ask for the shaft to be dropped on Low.
- `blueHoleProps` capability tests pass unchanged (gaps off the notch probes; pendants skip gap x).
- `props-geo` and `terrainMerge1140` snapshots re-baselined for the intended geometry.

## Simplicity

Net: one gap helper, one shaft builder, two retuned expressions. Extends the `hood` flag; no site branches; no package numbers in code.

## Remaining issues

- Gaps are depressions of the roof top, not true holes through a thin slab; the lip is still blocky at the ends.
- Shaft has faint banding at its edges and is static.
- Honest rating about 4.0: shape variety and a shaft are now present, still stylised.
