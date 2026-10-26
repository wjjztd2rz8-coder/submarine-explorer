# V-monterey-wall-skirt

## What changed
One number: the Monterey (`canyon`) wall's self-lit lift in `src/world/props/geo/scarp.ts` went from 0.27 to 0.18.

Finding: the wall and apron materials are fully opaque (no alpha anywhere on the scarp path; hiding the wall and switching DoubleSide to FrontSide made no difference to the veil). The "translucent skirt" was the wall's emissive lift. It washed the lower wall pale and teal, so it read as a haze over the dark apron and sub. Dropping the lift makes the wall read as rock and the sub stands out as solid.

Tried and rejected: shortening the silt blend at the wall foot (no visible change), FrontSide wall (no change), lift 0.12 (clear fix, but the wall went too dark and lost its teal bed contrast).

## Visual rating
Monterey about 3.6 to 3.7. The veil is mostly gone and the sub reads solid against the wall. The wall is a little darker and flatter than before. Not a step change.

Screenshot: `.cache/golden/2026-10-26-221650/monterey-canyon-1.png` (before: `.cache/golden/2026-10-26-220834/`).

## Gates
`PW_PORT=5480 tools/gates.sh` (smoke + project-base): see the commit message or run log for the result.
