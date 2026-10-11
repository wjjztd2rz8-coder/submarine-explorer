# f-titanic-sky: Titanic sky gradient (no source change)

Baseline golden: .cache/golden/2026-10-11-155931/titanic-1.png (high, desktop). Above the horizon the water is ~(8-12, 24-32, 32-44), a flat dark band.

## Finding: the existing assertions leave no room for a stronger gradient

tests/unit/titanicHorizon.test.ts pins the whole dome luminance into a window of about 0.0179 to 0.025:
- floor: every vertex >= fog lerped to the OLD crown 0x182630 (so the crown cannot go darker);
- ring (elevation 0.5-0.6) > 1.25x crown luminance (0.0224), so the haze must stay a plateau up to 0.6, beyond the ~0.5 elevation the opening view can see;
- ceiling: dome max < 0.025 (hazeColor luminance is already 0.02501), and vertices at y<=0 must equal fog, so fog is capped too;
- fogLift is pinned at 0.4 by the -950 m partial-fog check.

Tried: crown 0x121e27 + haze peak 0.26 (fails floor), peak 0.3 and 0.34 (fail ring contrast: 0.0217 / 0.0220 < 0.0224). Peak 0.4 (current) is the lowest that passes. Result: the visible span can only rise from fog to the 0.025 plateau, a ~1.4x range, which is what ships now. Raising the band "elsewhere" (horizon ring/fog) is also capped by the same ceiling.

All experiments reverted; no source or CHANGELOG change. Preview server on 4781 stopped. Gates not rerun (no diff).

## Needs a decision
Either permit a deliberate test update (e.g. raise the 0.025 ceiling and hazeColor to ~0.035, haze peak 0.3) or accept a screen-space gradient in the post stack (High/Medium only; Low would keep the flat sky).
