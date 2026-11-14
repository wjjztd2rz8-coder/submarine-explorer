# V-titanic-bow-form

## Changes

- Raked stem: `deform` in `titanicBow.ts` leans the prow forward with height (0.32 m per m, fading out by 30 m from the stem); sheer at the stem 0.9 to 1.9 m. The bow now has a leaning, rising profile instead of a plumb end.
- Bow pitch reversed (`pitchM` 1.6 to -1): the forecastle sits higher than the boat deck end instead of sloping up toward the break, so the bow rises out of the bed. Colliders use the boat-deck height directly.
- Bow rail: solid posts, top rail and mid rail now built into the hull mesh (all tiers, all LODs). The thin instanced bow rail run is deleted (replaced, not duplicated). Before, the rail only existed in the near LOD on Medium/High and was invisible from the opening.
- Anchor wells: a dark recess in the flare on each side with the anchor resting in it (anchors moved from the mud line up into the wells), in the core `dark` bin so it can be seen at range.
- Scour pit: moat depth 5.5 to 7.5 m (profile data in `terrain.ts`), hull `y_offset_m` 3 to 4.5 to keep its exposure.
- Debris: the evenly scattered `debris-bow` cluster is deleted; the single `debris-trail` now starts at the torn end and strings out south-east, 36 plates (was 26) with stronger centre clustering (0.6), so plates concentrate near the hull and thin out. Props data only.

## Screenshots (`.cache/codex/shots/V-titanic-bow-form/`)

`before/` and `after/` (High desktop: mission opening, pose 1 chase, 2 approach 54 m, 3 detail 19 m), `a1`-`a3` iterations (a1 trail too far out of frame; a2 trail heading wrong way; third tuning kept as `after`), `low/` (Low mission opening).

- Opening (140 m): the stem now visibly rises and leans with a light rail line along the forecastle; the pit around the hull is deeper and reads better; plates form a trail from the torn end toward the camera instead of a spray around the sub. The hull is still a long dark brown body on pale sand, so this is an improvement, not a transformation.
- Approach/detail: rail and stem rake read clearly; the old rail posts are gone but the solid rail is chunkier close-up.
- Low: rail and trail visible, pit visible, no breakage.

## Tests

- `PW_PORT=4711 tools/site-specs.sh titanic`: 93 passed, 2 failed (`journal-debrief` titanic journey at 844x390 and 390x844: pause menu never visible). Both fail identically on the untouched baseline (checked by checking out HEAD~1 src and data), so not caused by this package.
- `tools/gates.sh`: see the result appended below.
- Prop-count budget: one prop removed (`debris-bow`), trail up 10 plates; net draws unchanged or lower.

## Simplicity

Net simpler on data: one prop and one instanced rail run deleted, no new settings, no site branches (all per-site values are in the Titanic profile, props.json and the Titanic builder). The solid rail adds ~40 small hull-mesh beams per side but no draw calls.

## Remaining issues

- The anchor wells are not clearly visible from the opening camera (the visible flank shows the hull plating, not the flare near the bow). I could not confirm the recess silhouette in any of the three poses; treat it as unverified until a bow-quarter pose is captured.
- The hull is still dark brown on pale sand at 140 m; tone and the strake grid are unchanged.
- The pit is symmetric; no deeper scour specifically at the prow.
- The reversed pitch is a composition choice, not a sourced measurement. Sources only say the bow is upright and buried near the prow.

## Rating

Opening about 3.7 before, about 3.9 after. Approach about 4.2 before, about 4.3 after.

## Gates (director addendum)

unit 4886/4886, e2e smoke, e2e-base, attribution, prettier pass. `site-specs titanic`: 93 pass, 2 fail (journal-debrief 844x390 and 390x844 pause menu; same failures on baseline). Anchor wells unverified from the shipped poses.
