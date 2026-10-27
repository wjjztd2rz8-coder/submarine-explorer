# V-kama-hull-frame

## What changed

- `data/landmarks/kamaehuakanaloa/site.json`, `opening.mission`: chase arm `chaseRadius` 35 to 60 and `chaseOffsetY` 100 to -20. Data only; no code, schema, test or config change.
- Why: the old arm sat almost straight above the sub and aimed ahead, so the hull fell below the desktop frame (the Kama opening was just a pillow field on a slope). The longer, lower arm shows the whole hull with the slope and pillow field ahead and above it.

## Evidence (Low tier, mission opening, `tools/golden.sh`)

- Before: `.cache/codex/shots/V-kama-hull-frame/before-desktop.png` (hull not visible).
- After desktop: `.cache/codex/shots/V-kama-hull-frame/kama-desktop.png`
- After portrait 390x844: `.cache/codex/shots/V-kama-hull-frame/kama-portrait.png`

## Honest rating

- Desktop: hull fully in frame (about 200 px tall, lower-centre), pillow field directly ahead and to the right at the hull's shoulder, slate and gold slope above. About 3.9 of 5. The pillow field is partly beside rather than strictly above the hull, and the hull is small.
- Portrait: hull fully in frame, pillow field small and mostly behind the distance label. Readable, not a hero shot.

## Simplicity rules

- Rule 4: per-site mission data only. Rule 5: nothing mutated. Rule 6: existing missionApproach, missionComposition and siteManifest unit specs pass (574 tests); no snapshot covers these numbers. Nothing cut, so no CHANGELOG entry.

## Gates

See the end of this note.
