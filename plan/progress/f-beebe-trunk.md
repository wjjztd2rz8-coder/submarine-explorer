# f-beebe-trunk

Goal: give the Beebe hero trunk (stack 0 of `beebe-chimney-1`) the crusted ochre/sulfide/dark treatment of the side chimneys.

Findings: the vertex painter in `smokers.ts` chose the owning stack by height fraction, so the shorter side stacks claimed the trunk's upper flanks and the trunk read as a flat brown cone.

Changes:

- `smokers.ts`: vertex ownership is the stack with the closest axis (in its own radii), so the trunk is painted as the trunk.
- `crust.ts`: `paintCrust` takes `ny` and a `trunk` flag. Trunk gets warm ochre/orange on upward faces and band crests, sulfur bloom, near-black undercuts, soot at the orifice, less pale anhydrite, and a brightness lift to avoid a darker result.
- `spire.ts`: flange rim scallop 0.32 to 0.24 and wider end pinch (0.22 to 0.34) so flanges are less spiky.
- `props.ts`: `chimneyCrust.amount` 0.16 to 0.08 (the grey-beige wash flattened the colour bands).

Evidence: `tools/beebe-chimney-shots.mjs`; before/after in /tmp/bt (before-c1-far.png, after5-c1-far.png, ...). Mean luminance of the hero crop within 1.5 percent of before; triangle counts unchanged.
