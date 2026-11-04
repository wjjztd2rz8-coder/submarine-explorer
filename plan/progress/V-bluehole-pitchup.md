# V-bluehole-pitchup

## What changed

Data only, `data/landmarks/great-blue-hole/site.json` `opening.freeDive`: `range` 58 -> 50, `chaseOffsetY` 10 -> -45, plus `chaseOffsetX -30` and `chaseRadius 60`. The chase camera now sits below and to the side of the sub and looks up, so the hood, its ribbed lip and stalactites fill the top ~40% of the frame and the sub sits right of centre. No code, no site branches, no hood scale/order changes.

The shot rated ~3.85 is the free-dive opening (`great-blue-hole-1.png`), not the mission opening, so that is what I changed. The mission opening (125 m out, 44 m deep) is untouched. The "hull-safe check every pose <110 m fails" rule belongs to the mission route check (`missionApproach.test.ts`); free-dive has no such floor, so no pose-specific relaxation was needed. The free-dive limit was the hull-above-terrain check: range 46 and below puts the hull inside the wall (about -1.7 m), 50 passes.

## Tests

- `tests/unit/__snapshots__/freeDiveComposition.test.ts.snap`: Blue Hole pose snapshot re-baselined (new range/camera values; sub position moved 8 m).
- No rule changed. The portrait HUD-lane test (`portraitOpening.test.ts`) is what capped the pitch: chaseOffsetY -60 with radius 46 put the hull in the contact-card lane at 390x844, so I used a longer arm (60) and gentler -45. The test applies one camera for portrait and landscape, so a portrait-only offset is not an option without reworking it.

## Screenshots

Before: `.cache/golden/2026-11-04-044032/great-blue-hole-1.png`. After (desktop): `.cache/golden/2026-11-04-052441/great-blue-hole-1.png`; portrait: `.cache/golden/2026-11-04-052631/great-blue-hole-portrait-1.png`. Also copied to `.cache/codex/shots/bluehole-pitchup-*.png`.

## Honest rating: about 5.5/10 (was ~3.85)

- Better: the hood is large, with visible stalactites and a lit underside, and the sub is to one side with its light cone. No longer a small leaf under open water.
- Not met: the hood fills roughly the 15-45% band from the top, not the whole top third, and open water still shows above its peaks; it reads as a rock outcrop ahead more than an overhang over the sub. Lower half is very dark (sub light only).
- Deeper pitch (-60) fills the top third but fails the portrait HUD-lane test and looks into a dark void; closer than 50 m puts the hull in the wall. A real overhang read would need the sub parked under the lip, which needs the pose search to accept it (code), or a hood-geometry change (out of scope).
