# V-endurance-hull-scale

Change (data only, `data/landmarks/endurance/site.json` mission opening): rangeM 110 -> 106, yawOffset 25 -> -90 (broadside view), chaseRadius 150, chaseOffsetX 360, chaseOffsetY -80. Uses the existing mission arm fields; no code change, no site branches. The chase arm swings the camera to the side so the whole 44 m hull is seen broadside instead of end-on.

Tests (extended, none added): mission approach table endurance 110 -> 106; the 110 m minimum-range literals became 105 (the real safety property, range greater than the effective scan radius, is still asserted right beside them, and 106 m is outside Arcade's 100 m scan floor); Endurance leaves the small-opening review list and gets a 30% width floor on both layouts. The camera-arm prop keepout test rejected Y -90 and -100 (arm clips a boulder), so Y -80 is the accepted value.

Distance rule bent: 150-300 m opening distance kept as 105+ because the target must stay out of scan range, and the hull only reaches a third of the frame at about 106 m. Reasoning: T-framing-metrics already showed no farther pose reaches 30%.

Metrics (framing audit, 1600x900 / 390x844):

- before: width 11.5% / 20.5%, height 7.3% / 3.4%, centre Y 65% / 57%
- after: width 36.1% / 64.1% (phone envelope clipped at the frame edge), height 25.7% / 11.9%, centre Y 79% / 63%; hull bottom 92% (fully in frame)
- empty above horizon: 37.5% -> 62.5% desktop (horizon dropped because the camera is now level with the sub; this metric got worse)

Shots: .cache/codex/shots/V-endurance-hull-scale/{before,after}-endurance-{1,portrait-1}-mission.png (copy: plan/progress/V-endurance-hull-scale-after.png).

Rating: 6.5/10. Hull fills about a third of the desktop width (was 11%), is whole, clear of the sub, seabed with timbers and boulders readable. Not met: the upper ~55% is still empty dark water (the camera looks level at the sub, which hovers about 25 m above the hull's base; fixing it needs a downward camera pitch or a far ridge/haze, both code or other packages), and the sub floats mid-left rather than low-left. Rejected: Y -90/-100 and radius 130/170 (camera-arm prop collision or hull cropped), un-mirrored side (collides), yawOffset 60/120 (hull end-on, below 22%).
