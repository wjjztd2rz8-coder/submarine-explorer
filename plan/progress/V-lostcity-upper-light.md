# V-lostcity-upper-light

Changed: data only, `data/landmarks/lost-city/site.json` `horizon` block (the existing opt-in water backdrop). upperColor 0x16203C -> 0x3A7088, hazeColor 0x3E6A7C -> 0x568EA4; hazePeakElevation kept at 0.4. No code change, no site branch.

Findings: Lost City sits below the god-ray band (rays are zero at ~730 m) and point lights do not light open water, so the "shaft" cannot come from the carbonate glow lights. The horizon dome is the only data-driven lever that lifts the upper water. It only paints above elevation ~0.2 (fogMatchElevation), so it reaches the top ~15% of the frame, not the full upper third.

Tried: raising peak to 0.65 made it darker (wider smoothstep lowers weight at screen elevation); peak 0.3 gave a hard band edge; 0.4 with brighter haze is the softest.

Shots (.cache/golden/): before 2026-10-31-182724/lost-city-1-mission.png; after 2026-10-31-183658/lost-city-1-mission.png.

Honest rating: ~4.0 -> ~4.05. The top of the frame now carries a soft pale-teal overhead water glow (reads as light from above, not glowy), but the middle of the upper third is still dark water and there is no true shaft or flank key on the towers. A real fix needs either a code-side sun-axis shaft term that is not gated by depth band, or a SpotLight-capable GlowLights with a standoff/drop for carbonate (VentPreset hard-codes carbonate drop/standoff).
