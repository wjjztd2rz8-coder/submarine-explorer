# V-monterey-pose

Changed: Monterey free-dive opening in data/landmarks/monterey-canyon/site.json (range 34->58, altitude 10->14->16, yawOffset 6->28). No shared code touched. Snapshots for freeDiveComposition and montereyOpening updated (pose moved, intended).

Screenshots (desktop, free-dive shot 1; .cache/golden is untracked):
- before: .cache/golden/2026-10-16-224849/monterey-canyon-1.png
- after: .cache/golden/2026-10-16-230812/monterey-canyon-1.png
- mission opening (unchanged, for reference): .cache/golden/mission-before/monterey-canyon-1-mission.png

Constraints found by tests: hero range <= 80 m (heroReadability), first scan target must stay the candidate (terrainCarveAgreement), and wall fish must be in sight (montereyOpening, sensitive to yaw/bearing). Bolder framings (range 95, bearing 35) looked better but broke these.

Honest rating of after: about 3.8 to 3.9 (from about 3.6). The sub now sits on open sediment with the wall rock at left-centre and the far wall right, brighter floor, no clipping. Remaining gap: the wall rock mass is still centre-left rather than a clean left third, and the sub is near the foot of the rubble. A cleaner shot needs the readability range limit (80 m) relaxed or a different hero anchor.
