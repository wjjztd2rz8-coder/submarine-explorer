# 22 V-hunga-rim-slab

## What changed

- `wallEnvelope` (src/world/props/geo/scarp.ts): the late-pinching branch gave a level, terraced crest (the slab). It is now a broken crest: low-frequency noise for spurs plus a notch term, range about 0.5 to 1.05 of height. Only the tuff preset used that branch, so no site branch was needed.
- tuff preset (data only): sloping rear instead of the plateau shelf (`PLATEAU_REAR` removed), weaker ledges, deeper gullies and joints, more and larger fallen blocks (320 boulders, 14% big), apron shaded less dark at the foot (never darker), brighter crest lip.
- New preset field `mottle` (tuff 0.75, others 0): bed tone comes from patchy noise rather than regular bands, and the ledge-lip light/dark bands are damped by the same share. Strata stripes no longer run unbroken across the face.
- Tests (by capability): the escarpment-crest spec now asserts a broken crest in `scarpTerrain.test.ts`; scarp/tuff digests and boulder count updated; collider coverage floor 0.9 to 0.85 because notched spur tips rise above their segment box (reasoning: boxes use the lowest skyline in a segment so none stands over open water).

## Screenshots

`.cache/codex/shots/22-hunga/` (hunga-tonga-caldera-1-mission, -1, -2, -3). Iterated twice: first pass still read as a tower with a flat shelf end-on; second pass swapped the plateau rear for a sloping one and damped lip banding.

## Self-rating

Hunga opening about 3.0 to about 5 (my estimate): crest silhouette and lighting are clearly better from the approach views; the 120 m mission opening is still end-on and narrow, and talus is modest from that angle. Not a full rewrite of the rim composition.

## Simplicity rules

Net simpler (removed a branch and a constant; one data field added); no site branches; no layout patches; tests by capability.
