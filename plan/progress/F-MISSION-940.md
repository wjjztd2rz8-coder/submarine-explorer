# F-MISSION-940 — default missions lead to hero scenery

2026-10-08. Data changes retain the composed free-dive opening for every hero
mission. Spawn.ts and all visual/art content are unchanged.

## Objective routes

Order below is the authored objective order; **P** means required, **O** optional.
Existing objective ids, POI ids and Journal guide ids remain intact.

| Site             | Before                                                             | After                                                                           |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Great Blue Hole  | P `outer-dropoff` (eastern edge); P `western-dropoff`              | P `stalactites` (existing gallery scan); P `outer-dropoff`; O `western-dropoff` |
| Monterey Canyon  | P `canyon-head`; P `upper-channel`; O `canyon-wall`; O `mars-node` | P `canyon-wall`; P `upper-channel`; O `canyon-head`; O `mars-node`              |
| Titanic          | P `find-bow`; P `find-stern`; O `boilers`; O `memorial`            | Unchanged                                                                       |
| Beebe Vent Field | P `main-vents`; P `shrimp`; O `western-mound`                      | Unchanged                                                                       |
| Lost City        | P `find-poseidon`; O `beehive`; P `imax-tower`; O `microbial-mat`  | Unchanged                                                                       |

Blue Hole's hint explicitly calls its gallery a scenic reconstruction. Briefing
summaries and Monterey's eastward upper-channel hint follow the new routes.
Journal mission summaries inherit the revised briefing data; Journal/debrief
consumers resolve existing POI/guide ids and current mission definitions.

## Spawn measurements

Real shipped heightmaps, procedural props and seated POIs; default Arcade
camera/config. All distances are full 3D metres from the sub to the first primary
or from the mission spawn to the free-dive spawn, **not** horizontal-only ranges.
The unit regression reconstructs the previous primary sets to measure “before”.

| Site             | Tier   | Before: first primary | Before: free-dive spawn offset | After: first primary | After: free-dive spawn offset |
| ---------------- | ------ | --------------------: | -----------------------------: | -------------------: | ----------------------------: |
| Great Blue Hole  | Low    |                226.07 |                        4449.98 |                99.84 |                          0.00 |
| Great Blue Hole  | Medium |                226.07 |                        4449.59 |               100.11 |                          0.00 |
| Great Blue Hole  | High   |                226.07 |                        4449.49 |               100.18 |                          0.00 |
| Monterey Canyon  | Low    |                226.07 |                       17444.01 |                45.15 |                          0.00 |
| Monterey Canyon  | Medium |                226.07 |                       17444.09 |                44.63 |                          0.00 |
| Monterey Canyon  | High   |                226.07 |                       17444.04 |                44.35 |                          0.00 |
| Titanic          | Low    |                 47.50 |                           0.00 |                47.50 |                          0.00 |
| Titanic          | Medium |                 47.61 |                           0.00 |                47.61 |                          0.00 |
| Titanic          | High   |                 47.64 |                           0.00 |                47.64 |                          0.00 |
| Beebe Vent Field | Low    |                 72.60 |                           0.00 |                72.60 |                          0.00 |
| Beebe Vent Field | Medium |                 72.59 |                           0.00 |                72.59 |                          0.00 |
| Beebe Vent Field | High   |                 72.62 |                           0.00 |                72.62 |                          0.00 |
| Lost City        | Low    |                 38.56 |                           0.00 |                38.56 |                          0.00 |
| Lost City        | Medium |                 38.88 |                           0.00 |                38.88 |                          0.00 |
| Lost City        | High   |                 38.91 |                           0.00 |                38.91 |                          0.00 |

After heading differences are exactly 0° for all rows. The unit test compares the
complete authored spawn pose including chase camera offsets. E2E tests load the
real app in each mode on all three tiers, check Begin matches its briefing
preview, and attach pose measurements; bounds are 30 m / 20° against free dive,
and 120 m to the first required scan.

The older `nearSiteMissions` test covers the classic, uncomposed search. Its
Blue Hole expectation now checks the safe surface fallback: the 350–600 m
search falls outside the small hole on shallow reef. Default Arcade uses the
composed gallery pose above. Surface choices and non-Arcade fallback logic are
unchanged.

## Save compatibility

No discovery/settings schema or saved key changes. Existing discoveries still
unlock the same Journal entries (covered by the shipped legacy fixture tests).
New runs always require scans again, as before. Existing progress saves retain
their points, unlocks and best ratings.

Discoveries-only legacy saves use `ProgressMigration.ts` once to recover earned
research points and ratings. For these two routes, it accepts either the former
primary set or the current one for historical credit, preserving old atoll-edge
and canyon-head completion without awarding an unscanned gallery objective.
Regression tests load both previous and revised discovery sets, retain their
ratings, and check repeat migration/reload is idempotent. The existing E2E's
330 RP legacy-atoll scenario remains unchanged.

## Capture usage and validation

`GOLDEN_MODE=mission tools/golden.sh` loads each default mission, clicks Begin
dive after freezing physics, and writes `*-1-mission.png`, `*-2-mission.png`,
`*-3-mission.png` (portrait names also retain `-portrait`). The manifest records
the mode; the contact sheet labels it. Without GOLDEN_MODE the original free-dive
URLs and filenames are retained.

Final static gates pass: production build/typecheck, all **1,555 unit tests** in
153 files (including all 15 hero spawn comparisons and four legacy-route save
cases), all **148 Python tests**, strict content validation for all 13 sites,
attribution, Prettier and `git diff --check`. Playwright discovery lists all 15
new opening tests. Golden CLI help, invalid-mode rejection and syntax checks
also pass.

Both full E2E and project-base E2E were attempted via `tools/gates.sh --full-e2e`
but stopped before executing browser tests: the sandbox denies the preview
listener (`listen EPERM: operation not permitted 127.0.0.1`). A direct Vite
preview confirmed that error. Mission-mode rendered captures are pending the
same unrestricted runner. Logs: `.cache/gates/e2e.log` and `e2e-base.log`.

Required external gate: `GATES_CONFIG_MODE=writable tools/gates.sh --full-e2e`.
This package is implemented and statically verified; the full E2E acceptance
gate remains pending, not passed.
