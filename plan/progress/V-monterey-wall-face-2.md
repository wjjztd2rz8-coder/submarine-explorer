# V-monterey-wall-face-2

Result: nothing shipped. Product files are identical to main. Screenshots: `.cache/codex/shots/V-monterey-wall-face-2/` (`move.png`, `move-portrait.png`, `yaw-10.png`, `yaw12.png`).

Tried: moved the carve focus (`MONTEREY_FIDELITY.focus`, with the carve centre read from it instead of a duplicate literal), the `canyon-wall-ledge` hero and the `monterey-canyon-wall` POI together from lon -122.0133 to -122.0114 (about 170 m east), keeping the carve centre at focus + 170 m so the invariants hold (target within 60 m of the hero, inside the 200 m carve focus).

What the move needed (all small):

- `terrainCarveAgreement` carve-centre x: -3230.9 to -3061.5 (same relationship, shifted 170 m).
- Snapshots (`montereyOpening`, `freeDiveComposition`) re-baselined.
- `montereyFrameBudget` went 7 to 16 k triangles over the 900 k budget at the toe/wide views; Medium wall segments 230 to 210 on the horizontal axis fixed it.
- Dropping the +170 m offset (carve centre under the hero) put the POI 65 m below the free-dive spawn and the scan found no candidate; the offset must stay.

Why not kept: the mission opening got worse, not better. The approach heading changed from 338 N to 180 S and the frame is a striped rock slope on the left, a marker floating over a boulder field and no single pale wall face (about 3.3 against the 3.8 baseline). Yaw offsets -10 (`yaw-10.png`) and +12 (`yaw12.png`) did not help: same striped slope, marker still at the wall foot. try2's composition from the first pass depended on the original terrain around the old coordinate, not on the face itself, so shifting the whole carve/hero pair does not reproduce it.

Honest rating of the shipped opening: unchanged, about 3.8.

Gates: targeted unit tests passed on the moved tree after re-baseline; the full gates were not run on a final tree because nothing ships (data identical to main).

Follow-ups: a wall face needs authored geometry in front of the sub (a dedicated face prop with a pale material at the marker), not a coordinate move. Needs a design call from the owner on adding a prop.
