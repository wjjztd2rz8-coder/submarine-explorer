# F1-FIXES — wave-1 audit fixes

2026-09-30. Branch `claude/f1-fixes`, merged with main (F1-TERRAIN).

## Done

Earlier wip commits: tier=auto settings hint, dynamic-resolution convergence,
system dispose hooks, ROV headlight rig, billowing vent smoke (unit tests in
`tests/unit/quality.test.ts`, `disposables.test.ts`; shots `rov-*`, `axial-*`).

This pass (F1-AUDIT numbering):

1. Wall colliders (`scarp.ts`, `stalactites.ts`): overlapping segments (3 to 14 by
   width), slice heights scaled by the lowest end-pinch and skyline in the
   segment, front and back from the displaced profile (incl. rear), terrain lift
   per slice. Probe tests in `tests/unit/geo-colliders.test.ts` (no box over
   empty water at tapered ends, no x gap, rock mass and rear covered).
2. Exposure restored when entering the post path (`render.ts`). Custom shaders
   end with `tonemapping_fragment` and `colorspace_fragment` (Water, MarineSnow,
   Headlights, Wash, plume and vent-smoke shaders, Brine). Beam outputs
   unpremultiplied RGB with alpha; opacity 0.012 keeps about the old peak.
3. Finding 6: Lost City edifice relief 60 m (test tightened to 57-63 m).
   Finding 5: four overturned Bismarck turrets. Finding 7: ASHES hero dims 3.6 m
   tall stacks. Finding 8: Beebe recorded as a flank fragment; full mound deferred.
4. Finding 10: far alcove impostor uses every collider box. Finding 11: smoker
   bounds include plumes. Finding 16 (partial): Props.update camera vector reused.
5. F1-GEO: scalloped, thicker tower flanges; Journal Recreation tag also shown
   for POI-less entries whose guide entry is flagged `reconstruction`.

## Skipped (with reason)

- Finding 3 (render counters): not requested in this pass.
- Finding 4 (hull vs 8 m collision sphere): needs a shared capsule for physics,
  terrain clearance and prop contact; too large here.
- Finding 9 (disposal on prop replace): shared wreck caches make a blind dispose
  unsafe; needs an ownership-aware disposer.
- Finding 16 remainder (tether, arm lerp, cockpit key, blur closure, PostFrame).
- Kamaʻehuakanaloa heap: slope gain already in place; not visibly changed.
- No unit test for the exposure restore (render system needs renderer mocks).

## Screenshots

`.cache/codex/shots/f1-fixes/*-after2-*.png` (current), `-before-`, `-after-`
(earlier). Beam, plumes and tower flanges read well; no blown-out beam.
