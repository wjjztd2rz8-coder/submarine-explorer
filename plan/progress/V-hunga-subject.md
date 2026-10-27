# V-hunga-subject

**Changed:** one data line in the `tuff` scarp preset (`src/world/props/geo/scarp.ts`):
`glow: { wall: [0.19, 0xb4b09a, 0.25], rubble: [0.15, 0xb4b09a, 0.25] }`. This reuses the
existing `vertexGlow` mechanism already used by the `canyon` preset (Monterey); no
site-specific branches, no draw/triangle changes. Net simpler: yes, no new code paths.

**Iterations:** (1) 0.30/0.24 floor 0.45 read well at the opening but washed the 40 m view
to flat tan; (2) 0.19/0.15 floor 0.25 keeps strata contrast at 40 m.

**Before/after (golden, high tier):**

- before: `.cache/golden/2026-10-27-062021` (mission) and `2026-10-27-062210` (free dive)
- after: `.cache/golden/2026-10-27-062558` (mission) and `2026-10-27-062746` (free dive)
- rejected too-bright try: `2026-10-27-062311`, `2026-10-27-062501`

**Honest score:** about 4.5 of 5 at 40 m (strata bands, light/dark facets, no wash-out), about 3.8 at
the mission opening (no longer a black silhouette, banded form visible, but still dim and small
against the seabed; portrait is faint).

**Remaining weaknesses:** the opening wall is 160 m out and ~1.8% of the portrait frame, so it
reads as a dim brown wedge. No lit accent (a single warm/pale highlight) was added. A distance-aware
lift would help but needs shared shader changes.
