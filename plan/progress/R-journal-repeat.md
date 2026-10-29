# R-journal-repeat — scan rewards and Journal progress

2026-10-28. Addresses journey findings 8 and 9 in
[T-journey-acceptance](62-T-journey-acceptance.md), whose captures use base
`20f2198a874294fc49500e0d6cb85b965928af1d`. Implementation checkout starts at
`2900db5772762bbe03369e2953cbe3ee33ddfdfe`.

The galleries now open **Stalactite gallery** and **Eastern stalactite gallery**.
The existing cave-formation, stratification and expedition paragraphs, facts
and citations are redistributed between those entries; no real-world claims
are added. Both retain the existing single Recreation tag. The first entry's
ID stays `the-hole`; the eastern contact points to `eastern-gallery`. Existing
discovery records still unlock their respective entries without a migration.

POI rewards use the already maintained set of unlocked guide entries to decide
between **New Journal entry** and **SCAN COMPLETE**. This also handles other
sites where several contacts intentionally share an entry: scanning another
contact still counts in the dive's scan list but does not promise another entry.

The main Journal counters now all count logged **points of interest**, using
the same POI entries as the Points of interest group. Automatic overview
unlocks no longer inflate either numerator or denominator. Blue Hole advances
from **1/4 to 2/4** after its two gallery scans; Titanic's first scan is **1/7**.
The persistent counter replaces the misleading THIS DIVE label with its unit;
the front-page location tag says Current site. Overview articles remain readable.

Net simpler: reuse the existing entry mapping, unlock set, progress function
and guidance slot. Remove the reward's dependency on target-first-scan status
and the counter's overview inclusion and dive-specific prefix. No additional
guidance surface, setting, site branch, layout patch or player caveat.

Changed files:

- `data/landmarks/great-blue-hole/guide.json`
- `data/landmarks/great-blue-hole/pois.json`
- `src/game/Discovery.ts`
- `src/game/JournalData.ts`
- `src/ui/Journal.ts`
- `tests/e2e/journal-debrief.spec.ts`
- `tests/e2e/opening-framing.spec.ts`
- `tests/unit/journalData.test.ts`
- `tests/unit/discoveryReward1240.test.ts`
- `tests/unit/exploreRegressions.test.ts`
- `docs/discovery.md`
- `plan/progress/R-journal-repeat.md`

Capability coverage:

- New browser test holds both gallery scans in one dive and checks distinct
  titles, entry IDs, bodies, rewards, both counters and the two-scan session list.
- New table-driven browser test checks Titanic and Blue Hole counters in the
  front page, navigation, site page and POI group, on desktop and portrait,
  with spoilers and after reload. A new dive has zero session scans while its
  plainly labelled Journal progress persists.
- Unit coverage checks independent gallery unlocks and existing-save reloads,
  counts excluding automatic overviews, and honest rewards for intentionally
  shared guide entries across the existing real-content capability table.
- Existing fixture persistence and Home Journal assertions use the corrected
  counter definition; their unlock, locking and persistence guards remain.
  The existing two-objective journey also rejects identical entry IDs.

Validation:

- The orchestrator ran `tools/gates.sh` outside the sandbox. Python **167
  passed**, content, build, unit **4,416 passed in 192 files**, project-base,
  attribution and Prettier all passed. These results supersede the earlier
  sandbox tooling failures and the initial unit run's old counter expectations.
  Logs: `.cache/runs/20261028-174509-147068-R4dcXO/`.
- That smoke gate's root e2e result was **120 passed, 5 failed**. All five
  failures were in the existing `underwater free-dive opening` capability:
  Titanic, Endurance, Bismarck, Axial and Kamaehuakanaloa. The probe dereferenced
  an undefined body before its assertions. Its direct-child mesh search missed
  hull meshes nested inside LOD/groups and plain chimney props whose `full`
  object is itself the mesh.
- Follow-up fix: use Three's recursive `getObjectByProperty('isMesh', true)`,
  which includes the root itself. Keep the same geometry-centre projection and
  all facing, illumination, on-screen, camera, hull, underwater and detail
  assertions. A missing mesh still fails with the hero ID. Add a finite-projection
  assertion for every row. No fallback to bounds or skipped site rows.
- After the probe fix: the existing headless free-dive composition cases for
  all five affected sites passed (**5 passed, 8 unselected**). Typecheck,
  formatting and `git diff --check` passed. No application or scene code changed
  in this follow-up.
- Main Journal capabilities: **224 passed in 4 unit files** (`journalData`,
  `discoveryReward1240`, `journalGroups`, `exploreRegressions`). The secret table
  uses the corrected POI counter definition while retaining its overview/secret
  unlock and persistence assertions.
- Grepped `tests/e2e` for the affected capability and attempted the corrected
  opening selection with the required command shape:

  ```bash
  GATES_CONFIG_MODE=writable PW_PORT=4386 PW_OUTDIR=.cache/journal-repeat/dist \
    npx playwright test tests/e2e/opening-framing.spec.ts \
    -g 'underwater free-dive opening' --repeat-each=2 \
    --output=.cache/journal-repeat-opening-e2e
  ```

  This sandbox still prevents preview startup (`listen EPERM`). The earlier
  two-round attempts of `Journal scan rewards and counts`, fixture persistence,
  Home Journal and two-objective journey selections likewise stopped before
  browser tests. No post-fix browser passes or fresh screenshots are claimed.

The five failing probes are repaired; the aggregate gate needs an outside
rerun to verify the correction. The smoke gate does not select the new Journal
capability tests, so run those explicitly too:

```bash
npx playwright test tests/e2e/opening-framing.spec.ts \
  -g 'underwater free-dive opening' --repeat-each=2
npx playwright test tests/e2e/journal-debrief.spec.ts \
  -g 'Journal scan rewards and counts' --repeat-each=2
tools/gates.sh
```

Use an owned build output/port, as specified in `CONTRIBUTING-AGENTS.md`.
