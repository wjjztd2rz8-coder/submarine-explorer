# V-bluehole-opening-gallery

## Changes

- `data/landmarks/great-blue-hole/site.json` (`opening.mission`): chase arm 46 to 54, side offset -36 to +36, vertical offset -50 to -45, and a new `yawOffset` of -12 degrees (a larger heading miss would send a held-forward player past the gallery). The sub is now smaller and left of centre, and the gallery sits centre-right. Existing per-site fields only; no code change, no site branch, no test change.
- Range stays 125 m and the opening depth stays 44 m.

## Why the range did not shorten

Shortening was tried and rejected:

- Below about 116 m the pose search finds nothing. The gallery ledge and its apron rise toward the target, so the pose is lifted over the apron or the transit check hits the gallery's collision box. 116 passes the spawn search, but 115 fails the 5 m route-collision test on Low and Medium.
- The mission scan radius is capped at (range - 60) / 2, so 116 m cuts the near-site scan radius from 32.5 to 28 m. `missionComposition` then finds no navigable water within 28 m of the gallery at the minimum scan depth. Even 120 m (30 m radius) fails it. This is a gameplay constraint, so the 125 m rule stays.
- The hood-code branch scaled the hood 1.5x. That also moves the free-dive hero pose, which must not change, so it was not reused.

## Rules-can-bend note

Nothing was bent: the final change is camera and heading data only.
The opening now adds a "TURN 12 STARBOARD" cue to the objective line, since the sub is deliberately not aimed at the gallery. It uses the existing guidance surface; no new element.

## Simplicity rules

1 net simpler: no new elements or settings. 4: per-site data only. 5: no config mutation. 6: no test changes needed. 7: no package numbers in code.

## Screenshots

`.cache/codex/shots/V-bluehole-opening-gallery/before/` and `after/` (desktop, portrait and landscape; mission opening and +10 s).

## Rating (honest)

Before about 2.5 of 5, after about 3.0. The sub is smaller and off to the left, the gallery is centre-right with stalactites readable, and the frame is as bright as before. The gallery is still only about 18% of frame width (was about 15%), not the target third.

## Remaining

- The gallery is not a third of the frame. Getting there needs either a shorter scan reach with a gallery-specific approach that clears the apron, or a larger gallery prop. The prop change would also move the free-dive hero view.
- The sub's rear edge nearly touches the gallery foot in the desktop crop.
- `f-verify-1000` Blue Hole high-tier cases (both layouts) fail the same way on the unmodified baseline; Low and Medium pass.
- Free-dive hero pose and the other 12 sites' openings are unchanged by construction (only the Blue Hole `opening.mission` data changed).
