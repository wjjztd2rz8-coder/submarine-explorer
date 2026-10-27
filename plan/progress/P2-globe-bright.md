# P2-globe-bright

Changed (constants only, no new draw calls/settings):
- src/core/config/ui.ts: landDim 0.22 -> 0.4, oceanGain 1.15 -> 3.
- src/ui/Globe.ts: limb darkening 0.45+0.55*ndv -> 0.6+0.4*ndv.
- src/styles/globe.css: mission pin gets a pale outer ring (box-shadow).

Shots (.cache/codex/shots/P2-globe-bright/): before-phone.png, before-desktop.png,
after-phone.png (2.4 gain intermediate), after-desktop.png (final, gain 3).
Final phone shot was not re-read at gain 3; desktop was.

Rating: 8/10 on desktop. Ocean clearly blue, continents distinct, pins legible.
Deep abyssal plains are still navy (texture is near-black there); the shallow shelf
is now quite saturated. Software GL (swiftshader), not a real phone.
