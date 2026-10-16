# V-monterey-pose

Changed: Monterey free-dive opening in data/landmarks/monterey-canyon/site.json (range 34 to 40, altitude 10 to 16, yawOffset 6 to 28). No shared code touched. Snapshots for freeDiveComposition and montereyOpening updated (pose moved, intended).

Screenshots (desktop, free-dive shot 1; .cache/golden is untracked):

- before: .cache/golden/2026-10-16-224849/monterey-canyon-1.png
- after: .cache/golden/2026-10-16-235622/monterey-canyon-1.png
- mission opening (unchanged, for reference): .cache/golden/mission-before/monterey-canyon-1-mission.png

Constraints found by tests: hero range under 80 m (heroReadability), first scan target stays the candidate (terrainCarveAgreement), and sablefish must be in clear sight of the opening camera (montereyOpening). Any range above about 44 m hides the sablefish group behind the ledge, so wider framings (range 58 to 95, which looked clearly better) fail unless the life group offsets in site.json are re-tuned.

Honest rating of after: about 3.7 (from about 3.5). The sub is turned so the open sediment floor fills the right half, the far wall sits right, the ledge rock is left-centre and brighter lit; no clipping. Remaining gap: the sub still sits at the foot of the ledge rubble, not in a clean three-part composition.

Follow-up: move the sablefish and sea-pen offsets (life.opening.groups) so a wider pose (range about 58, bearing 0, yaw 28) keeps them visible; that pose gave the better framing.
