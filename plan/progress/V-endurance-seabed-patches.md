# V-endurance-seabed-patches

Cause: the dark ribbons were not terrain material patches. They were the Endurance scour-ridge mesh (src/world/presets/EnduranceRelief.ts), unlit and drawn in a dark vertex colour with hard edges.

Change (generic within the preset, no new branches): ridge colour raised to near the floor tone, and per-vertex alpha fades each ridge to zero at its edges (transparent, no depth write). Ridges now read as soft low swells/ripples; hull and dropstones are the strong shapes.

Screenshots: before .cache/golden/2026-11-05-121524/endurance-1-mission.png; after .cache/golden/2026-11-05-154019/endurance-1-mission.png (copy: plan/progress/V-endurance-seabed-patches-after.png).

Self-rating: 8/10. Ribbons gone, floor continuous; far swells slightly pale/greyer than the floor, and nothing cut so no CHANGELOG line.
