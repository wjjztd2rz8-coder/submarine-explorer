# V-titanic-detail-plates

## What changed

- `src/world/props/wrecks/materials.ts` (steel plate shader, shared by Titanic, Bismarck, scatter):
  - Seams wander: the plate map and its normal map are sampled through one slow low-amplitude warp, so strakes bow and butt joints drift instead of a ruler grid. Plate cells follow the same warped coordinates, so tone edges match seams.
  - Per-plate tone: each plate picks orange-brown rust, dark brown or (rarely) near-black stain, with its own brightness; the close-range flattening of plate steps was removed, so variance holds up close.
  - Streaks: rust runs are darker brown, longer reach, more clustered.
  - Shader is net about the same length; it reuses the existing three.js chunks via `ShaderChunk` instead of adding new sampling code.
- `src/world/props/wrecks/instances.ts`: rusticle cylinder 6 to 12 radial segments, open top (hidden against steel), gentler flare, darker root and tip colours. About 1.5k extra vertices in one shared instanced geometry; draw calls unchanged.

## Screenshots

`.cache/codex/shots/V-titanic-detail-plates/`: before-/after- titanic-open, titanic-1 (approach spawn), titanic-2 (approach), titanic-3 (detail), bismarck-2 (shared-shader check), bismarck-open (after only). Iterated twice (first pass too wavy and salmon pink; second too grey; third kept).

## Simplicity rules

1 net simpler: no new elements, shader reuses stock chunks. 4 no site branches: shared shader and geometry only. 6/7: no new tests, no package numbers. No settings or UI. No snapshots rebaselined.

## Remaining issues

- Seams wander but do not truly break (no gaps); a few vertical joints look slightly wavy like wood grain at the closest range.
- Tone cells are still rectangular blocks; dark plates read a little grey-blue under the cool light.
- Rusticles are rounder and slimmer but still pale tan at the base in the detail frame (fog and light, not geometry).
- Bismarck hull is darker and browner; seamount flank untouched (shader only).

## Rating

Detail frame 6.5/10 (was about 4): clearly less pale and less gridded, readable, not too dark. Opening unchanged in feel.
