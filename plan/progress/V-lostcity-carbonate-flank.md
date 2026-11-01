# V-lostcity-carbonate-flank

Changed: `VentPreset.ts` carbonate no longer forces glow standoff 0 / drop +2; it reads `glowStandoffM` / `glowDropM` like other vents (defaults 0 / 4 unchanged for sulfide). Lost City `mission.json` overrides: glowStandoffM 8, glowDropM 8 (lights 8 m below top, 8 m beside), glowIntensity 24000 -> 60000. No site branch.

Shots (.cache/golden/): before 2026-10-31-183658; after 2026-11-01-064937 (lost-city-1-mission.png).

Honest rating: ~4.0 -> ~4.05. Poseidon's flank now carries a brighter, taller cool-white lit band, but the tower is ~40 px tall at 220 m so the opening change is modest; the upper third of the frame is still dark water (no light reaches open water). Close approach views should gain more.
