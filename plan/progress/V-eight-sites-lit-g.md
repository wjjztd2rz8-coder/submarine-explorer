# V-eight-sites-lit (g): Axial and Kamaʻehuakanaloa openings

Change: Kamaʻehuakanaloa `opening.mission.rangeM` 200 to 130 (site.json) and its expectation in `tests/unit/missionApproach.test.ts`. Data only; no shared code touched. Axial unchanged.

Shots (390x844, Low, mission opening; `.cache/golden/`, git-ignored):

- Before: `2026-10-26-134044/{axial-seamount-ashes,kamaehuakanaloa}-portrait-1-mission.png`
- After Kama 130 m: `2026-10-26-134230/kamaehuakanaloa-portrait-1-mission.png`
- Tried and rejected: Axial 75 m (`134230`), mission `yawOffset` -10/+12 (`134313`).

Findings:

- Kama: vent chimney now about 130 m ahead and noticeably larger, sub and bed in frame, so the objective reads. The chimney is still a dark silhouette: that is its basalt material under the lights, not distance, so this is a partial win. Rating 3/5 (was 2/5).
- Axial: the chimneys are factual 2 to 5 m spires, so they stay small at 110 m. Axial 75 m made them clearly readable, but it puts the sub inside the 100 m scan radius, so the opening would be a scan-in-place rather than an approach. `missionComposition.test.ts` guards that (`range > scan radius`), and I did not loosen it. Rating unchanged, 2/5. To fix it needs a decision: shrink the scan radius at this site, or add a hero-chimney lighting/scale prop treatment.
- `yawOffset` just moves the subject toward the edge and adds a "TURN n deg" hint, so rejected.
- Iterations used: 2 of 3.

Tests: missionApproach, missionApproachSystem, siteManifest, missionComposition and heroMissionSpawn unit specs pass (591).
