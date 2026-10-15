# V-titanic (remainder): texture-space plate layer

## What changed

- `steelMaterial` (`src/world/props/wrecks/materials.ts`) gains `plateStains`, a small fragment-shader patch after `map_fragment`. Per plate cell of the existing riveted-steel map (four strakes, two plates per repeat): its own brightness, a partial desaturation (some plates bleached grey-brown, a few sprung dark), a darker stain band under the upper seam, and thin rust streaks running down. A hash plus one 2D value noise per fragment; identical on every tier, no uniforms, no per-frame work.
- It lives in the shared steel material, so every riveted wreck gets it; no site branches, no settings, no new files. The vertex-paint `plates` option from the previous pass stays for the wide view.
- The headlight pool is untouched (no light or emissive changes). Plate tone is clamped to roughly 0.45 to 1.2 of the base, so the hull never goes frustratingly dark.

## Screenshots

`.cache/codex/shots/V-titanic-2/before/` and `after/` (desktop, portrait, `low-` prefix for the Low tier), shots 1 to 3.

## Verdict

Close view (shot 3): the flat peach slab is now individual plates of differing tone with seam-fed rust streaks and darker stain bands; still lit warmly by the headlights but readable and not dark. Wide view (shot 2): richer, plates and streaks visible across the whole bow with no obvious tiling. Portrait is similar to desktop. Low tier gets the same layer; its coarser 256 px map makes the streaks a little blunt but clearly better than before. Honest rating: about 4.0 for the close view (was about 3.4); the hull is still strongly orange rather than the real grey-brown, which a palette pass could still improve.

## Gates

`PW_PORT=4611 tools/gates.sh`: all PASS (python, content, build, unit, e2e, e2e-base, attribution, prettier). No snapshots needed re-baselining; no assertions changed.
