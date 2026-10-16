# V-beebe-stack

## Changed

- Spire silhouette: the Beebe smoker profile gains `topFraction` (0.3, was a fixed 0.45), so every stack tapers to a narrower top. Stack records carry their own `top`, and the top mouth radius follows it (`src/world/props/geo/smokers.ts`, data in `data/landmarks/beebe-vent-field/site.json`, schema in `src/core/SiteManifest.ts`).
- Fewer, irregular collars: `mainShelves` 6 -> 3, `mainShelfStep` 0.115 -> 0.21, `shelfJitter` 0.2 -> 0.9 (site data only).
- Mineral zoning: `paintCrust` (`src/world/props/geo/crust.ts`, shared with chimneys 2-3) adds broad black / rust / ochre bands with an irregular period, a gentler oxide and sulfur bloom, and a second anhydrite cap on the upper flanks.
- Throat: new profile colour `throatColor` is the emissive of the mouth discs, so the vent mouths glow hot orange inside a black rim.
- Body albedo of the profiled (Beebe) smoker is 0.95 instead of 1.25, because close headlights were clipping the crust to beige.

## Simplicity rules

1. Net simpler: no new elements; two profile fields added, three data values lowered. No new settings.
2. No text guidance touched.
3. No layout patches.
4. No site branches: all per-site values live in the Beebe `smoker` profile; the code reads `profile`, not a site id.
5. Nothing mutates config at runtime.
6. No new spec; the existing manifest and Beebe specs cover the profile and the build.
7. No package numbers in code.

## Screenshots

`.cache/codex/shots/V-beebe-stack/{before,after,low}/` (desktop and portrait, poses 1-3; `low` is the Low tier).

## Remains

- In the close pose the foreground side stack is still a pale, desaturated beige: headlights and water scatter wash out the zone bands. Fixing that needs a lighting-side change, not more paint.
- Side stacks still end in flat, stump-like tops (wide radius against their height); only the hero reads as a spire. A per-stack radius law would fix it.
- Chimneys 2-3 get the new zoning through the shared painter but their silhouettes are unchanged.

## Rating

6/10: the opening and approach shots read as a tapering, banded spire with fewer collars and a glowing throat, and Low and portrait are readable. It is not yet a hero-quality object at close range.
