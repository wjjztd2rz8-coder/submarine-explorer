# V-closeup-materials-titanic (Titanic bow hull detail frame)

## Changes

- `src/world/props/wrecks/materials.ts` (shared steel plate shader, no new texture reads, ALU only, identical on every tier): within roughly 20-55 m the per-plate tone steps soften and a slow seam-ignoring tone field is mixed in, so the hull stops reading as a tile grid. Narrow rust runs now start under each seam (rivet line) with varied reach, clustered by a low-frequency field, and some carry on across the next plate. The older broad band stain is eased back up close. Beyond about 55 m the previous look is unchanged, so mission openings keep their scan-distance appearance.
- `src/world/props/wrecks/instances.ts`: rusticle colour moves from pale beige to ochre-brown so the drips belong to the hull (all wreck rusticles share it).
- `src/world/props/wrecks/titanicBow.ts`: drips under portholes 45% to 80% of openings, slightly longer. Instances of the existing rusticle draw call; no new draw call or geometry.
- No new lights, no pose/framing change, no site branch.

## Simplicity rules

1 net simpler: edits inside the existing plate shader, one constant tweak, no new settings or files. 4: no site branch (steel material is shared). 7: comments explain why.

## Evidence

`.cache/codex/shots/V-closeup-materials-titanic/`: `before-3.png` (detail) and `before-2.png` (approach); `a3-3.png` and `a3-2.png` after (`a1`, `a2` are earlier passes). Approach frame shows no visible change in character.

## Rating and remaining issues

Detail frame about 5.5/10 (was about 4). Rust runs from seams read, drips sit under portholes, plate-to-plate repetition is weaker. Still: the hull colour is salmon-pink rather than dark rust, plate seams and the rivet lines remain a visible regular grid (vertex-paint plate tint is unchanged because it cannot fade with distance), and the runs are somewhat uniform in width. Stern uses the same material and gets the effect, not checked in shots.
