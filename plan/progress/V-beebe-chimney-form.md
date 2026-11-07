# V-beebe-chimney-form

## Changes

All in the shared `tieredSpire` / `spireRadius` (`src/world/props/geo/spire.ts`), active only when `crust` is set (Beebe hero smoker and crusted chimneys 2-3). No site branches, no new settings.

- Rounder cross-section: elliptical twist 0.22 -> 0.07 and lumps 0.5 -> 0.2 in crust mode, so the column no longer folds into slab flanges.
- Columnar taper: radius held higher up (taper exponent 1.25 vs 0.8) and foot flare cut to 45% in crust mode.
- Flange breaks: a few jittered, partial collars per column (abrupt swell, undercut beneath, fading round the column).
- Gentle axis meander toward the top; crust-band lip relief 0.38 -> 0.26 to remove the spiky pine-tree silhouette.

## Evidence

`.cache/codex/shots/V-beebe-chimney-form/` before-2/3 and after-2/3 (golden approach and detail, beebe-vent-field). Honest rating of the detail frame: about 3.4 -> 3.6 of 5.

## Remaining issues

The hero still reads as a broad cone: the mound, merged side stacks and the sulfide shelf flanges (`flange()`, data-driven widths and arcs) dominate the silhouette. A true vent orifice with a visible bore and slimmer, separated columns would need shelf/stack placement changes. Tier behaviour unchanged (same vertex counts).
