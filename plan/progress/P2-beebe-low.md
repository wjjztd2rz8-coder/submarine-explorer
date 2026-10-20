# P2-beebe-low

**Cause.** The Beebe orifice "caps" are dark/orange mouth discs (`beebe-orifices`) built in `src/world/props/geo/smokers.ts`. Each was a flat disc placed at a computed depth below the nominal top (`crater * topRadius * topMouthRecessFraction`). The real crater is a cone whose centre sinks, so the flat disc sat 0.7-1.8 m above it on every tier. On High the torn, finely ringed rim hid the gap; on Low the smooth coarse rim did not, so discs floated off the chimney tops. The vent-light standoff change (point light position) was not involved; the discs are geometry.

**Change.** Each top mouth disc vertex is now dropped onto the body surface actually built for the tier (ray down onto `smoker-body`, plus the existing mouth clearance). The computed-depth recipe and its `topMouthRecessFraction` data key are removed (SiteManifest allow-list and Beebe `site.json`). No site-specific branches.

**Screenshots** (`.cache/codex/shots/P2-beebe-low/`, Low tier via `tools/golden.sh`, `GOLDEN_SITES=beebe-vent-field GOLDEN_TIER=low`): `before-desk-3.png`, `before-port-3.png` (floating discs visible on the left and right stacks), `after-desk-3.png`, `after-port-3.png` (discs seated in the craters, nothing floating), `high-desk-3.png` (High reference, unchanged look). Desktop is 1600x900 (golden default), portrait 390x844.

**Gates.** See the final commit; `PW_PORT=4392 tools/gates.sh` result recorded below.

**Net simpler.** One computed-depth formula and one config key removed; surface lookup reuses the Raycaster already used for the side outlets.
