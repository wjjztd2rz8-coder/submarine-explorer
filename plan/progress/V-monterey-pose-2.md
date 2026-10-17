# V-monterey-pose-2

Why: CI failed opening-framing.spec.ts "monterey-canyon: underwater free-dive opening" (facing 0.883 < 0.98). Slice 1 set yawOffset 28, and cos(28 deg) = 0.883. The spec's hero is the prop id `canyon-wall-ledge` and the sub aims at its centre, so no hero-field edit can fix it; the turn away from the ledge has to stay under about 11 degrees.

Changed: data/landmarks/monterey-canyon/site.json yawOffset 28 to 11 (range 40, altitude 16 kept). No code or test threshold changed. Snapshots for freeDiveComposition and montereyOpening refreshed (pose moved).

Screenshot: .cache/codex/shots/opening-framing/underwater/monterey-canyon-spawn.png (PW_RENDER_REVIEW=1). Ledge wall centre, sediment floor right, sub at the foot of the ledge, hake and sea pens in view; no clipping.
