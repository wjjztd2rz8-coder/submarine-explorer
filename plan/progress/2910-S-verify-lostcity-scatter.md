# S-verify — Lost City scatter audit

Backlog item **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. Non-visual verification of run 74. V-lostcity-hill remains DONE.
No demonstrated scatter overflow, placement or determinism defect in the audited
fixtures and traces; no production correction is proposed.

## Provenance and ownership

- Checkout: `c085c7d485e071f6d57f524ab1d29705f72a64db`.
- Actual merge: `e15dd258583ba0645d86026e48172b664ed08f5f`;
  first parent: `2cea170c916cdddecc1ad563ddbeb75e272fcea1` (`e15dd25^1`).
  Compared those commits directly, without a moving `HEAD~N` baseline.
- Read Director rules/rubric, newest review (2026-10-21), overnight run 74,
  V-lostcity-hill, and 2800's result and `S-verify-lostcity-beebe.md`.
  The earlier audit explicitly excluded scatter from its prop/terrain census;
  it predates this density increase. The wrapper's aggregate PASS labels do not
  supersede the progress note's detailed validation limitations.
- Rechecked queue/launched briefs, results/progress and active worktree changes.
  Main has the IN FLIGHT V-bluehole-roof-3 Director edit; that worktree was clean.
  Uncollected 2850–2880 changes cover power, Challenger, journey layout and
  Your-sub/Journal/focus; 2850–2870 also carry V-monterey-cliff formatting.
  2890 owns height/memo tests; 2900 owns biome/tint tests. No overlap with this
  spec, and none of those files or notes was edited or imported.
- Only `tests/unit/beebeScatter.test.ts` and this note change. Scatter production
  code, config, biome data, budgets, heights, props and all snapshots are read-only.

## Merge data and existing limits

| Lost City field                                       | First parent | Merge/current |
| ----------------------------------------------------- | ------------ | ------------- |
| rubble density, per 1000 m² before clumping/rejection | 14           | 18            |
| colorA                                                | `0x3f5c68`   | `0x3a4240`    |
| colorB                                                | `0x56696f`   | `0x444a48`    |
| colorC                                                | `0x6c7e84`   | `0x4d514f`    |
| stain                                                 | `0x5a5646`   | `0x4a4c45`    |

The same merge changed terrain relief/wavelength 1.8/36 to 1.0/48 and terrace
period/amount 16/1.1 to 24/0.3. Those height changes belong to 2890. Neither
Scatter nor ScatterPlacement changed. Lost City's relevant data, scatter code
and scatter snapshot are unchanged between this merge and the pinned checkout;
the later Monterey vertexTint hook does not feed scatter geometry or placement.

Existing tier density/radius: Low **0.25 / 90 m**, Medium **0.6 / 150 m**,
High **1 / 220 m**. Cells are **64 m** wide, at most **two** are generated per
update, and eviction removes centres beyond radius + **140.8 m** (2.2 cells).
There is no fixed cell-count cap: the eviction radius bounds residence. A loose
square-lattice bound derived from that existing radius is 81/121/169 cells;
the observed maxima are 15/35/59. This is not a new resource budget.

Existing buffers cap **4096 live instances per kind**. Lost City has four kinds,
with at most four scatter draws. Per-kind draw ranges further cap rubble at
**95 m**, sponges at **120 m**; boulder/dropstone use the tier radius. Actual
geometry has **80 / 20 / 180 / 162 triangles** per boulder/rubble/dropstone/sponge.
The tests measure indexed or non-indexed geometry before multiplying by live
mesh count; they do not count one template as the entire instanced workload.
No separate scatter triangle budget exists. The whole-frame and static-prop
budgets are not repurposed as a new scatter-only limit.

## Fixture and trace method

Reused the existing GPU-independent Scatter fixture and its 128-update settling
step. The legacy snapshot's so-called flat-ground fixture is actually a gently
sloped plane: `y = -100 + 0.05*x - 0.1*z`, with its existing supplied normal,
seed **1130**, density **1**, radius **128 m**, thresholds **0.02 / 0.3**, camera
XZ **(32,32)**. Its 816/933 instances are not a shipped scene census.

The tier audit uses both that plane and the actual shipped Lost City GMRT tile
(`meta.json` plus `heightmap.bin`) through current `Terrain.sampleHeight`,
`getNormal` and `contains`. Terrain is constructed without document, then only
Scatter's headless mesh path is enabled. No texture fetch, renderer or browser.
For both biome versions the ground stays the same current sampler, isolating the
density change from the independent relief change. Real-tier rock thresholds
come from the configured 18°/32° slopes.

Two fixed seeds: **1130** and the shipped effective seed **1944983584**
(`detailSeed ^ hashStringSigned('lost-city')`). Plane origin is **(32,32)**;
survey origin is **(96,-992)**, the cell centre nearest the authored fidelity
focus. These are numerical probes, not changes to app camera poses. Each origin
runs twice through A=(0,0), E=(64,0), W=(-64,0), F=(1024,1024), A=(0,0),
relative to that origin. E/W cross cell boundaries; F evicts the origin cells.
Y stays -85 in the helper and is unused by Scatter. Each stop settles for 128
updates. Both cycles have identical costs, and every return to A has the same
canonical live matrices/colours as the initial population for both densities.
Buffer slot order and stale unused capacity are deliberately excluded from this
return comparison; cell insertion order can change after eviction.

The retained test uses a fixture-local parent-density copy with current colours,
so comparisons isolate density without mutating BIOMES. A separate temporary
copy of the same capability fixture restored the complete parent palette too:
all 12 tier/ground/seed runs produced exactly the same cost rows below. That
full-parent comparison passed 10 tests. No other brief's test changes were used.

Counts below are **boulder/rubble/dropstone/sponge**. Arrows mean first-parent
biome → current biome, on the same sampler. Draws are equal before/after.
A is also the exact return result in each cycle. Every row is generated data,
not an estimate of what the opening view shows. The survey census has no
late prop-footprint keepouts; it measures this scatter layer, not the full scene.

### Controlled plane

| Tier   |       Seed | Camera | Cells | Instances B/R/D/S, parent → current | Instanced triangles, parent → current | Draws |
| ------ | ---------: | ------ | ----: | ----------------------------------- | ------------------------------------: | ----: |
| Low    |       1130 | A      |     9 | 37/87/24/2 → 37/106/24/2            |                         9,344 → 9,724 |     4 |
| Low    |       1130 | E      |    12 | 34/87/24/0 → 34/112/24/0            |                         8,780 → 9,280 |     3 |
| Low    |       1130 | W      |    15 | 37/104/20/2 → 37/124/20/2           |                         8,964 → 9,364 |     4 |
| Low    |       1130 | F      |     9 | 27/75/22/0 → 27/103/22/0            |                         7,620 → 8,180 |     3 |
| Low    | 1944983584 | A      |     9 | 19/69/23/3 → 19/105/23/3            |                         7,526 → 8,246 |     4 |
| Low    | 1944983584 | E      |    12 | 26/65/25/0 → 26/100/25/0            |                         7,880 → 8,580 |     3 |
| Low    | 1944983584 | W      |    15 | 26/78/25/3 → 26/107/25/3            |                         8,626 → 9,206 |     4 |
| Low    | 1944983584 | F      |     9 | 27/91/26/0 → 27/123/26/0            |                         8,660 → 9,300 |     3 |
| Medium |       1130 | A      |    25 | 212/198/149/2 → 212/288/149/2       |                       48,064 → 49,864 |     4 |
| Medium |       1130 | E      |    30 | 212/213/155/2 → 212/296/155/2       |                       49,444 → 51,104 |     4 |
| Medium |       1130 | W      |    35 | 200/237/148/2 → 200/344/148/2       |                       47,704 → 49,844 |     4 |
| Medium |       1130 | F      |    25 | 195/222/148/3 → 195/290/148/3       |                       47,166 → 48,526 |     4 |
| Medium | 1944983584 | A      |    25 | 171/202/151/3 → 171/270/151/3       |                       45,386 → 46,746 |     4 |
| Medium | 1944983584 | E      |    30 | 189/232/150/0 → 189/284/150/0       |                       46,760 → 47,800 |     3 |
| Medium | 1944983584 | W      |    35 | 180/223/147/3 → 180/279/147/3       |                       45,806 → 46,926 |     4 |
| Medium | 1944983584 | F      |    25 | 202/204/146/0 → 202/280/146/0       |                       46,520 → 48,040 |     3 |
| High   |       1130 | A      |    45 | 687/360/534/5 → 687/477/534/5       |                     159,090 → 161,430 |     4 |
| High   |       1130 | E      |    52 | 706/355/529/6 → 706/478/529/6       |                     159,772 → 162,232 |     4 |
| High   |       1130 | W      |    59 | 705/412/537/2 → 705/516/537/2       |                     161,624 → 163,704 |     4 |
| High   |       1130 | F      |    45 | 704/406/518/4 → 704/520/518/4       |                     158,328 → 160,608 |     4 |
| High   | 1944983584 | A      |    45 | 679/361/527/4 → 679/478/527/4       |                     157,048 → 159,388 |     4 |
| High   | 1944983584 | E      |    52 | 660/378/531/1 → 660/485/531/1       |                     156,102 → 158,242 |     4 |
| High   | 1944983584 | W      |    59 | 676/362/531/4 → 676/448/531/4       |                     157,548 → 159,268 |     4 |
| High   | 1944983584 | F      |    45 | 703/374/530/1 → 703/495/530/1       |                     159,282 → 161,702 |     4 |

### Shipped survey sampler

| Tier   |       Seed | Camera | Cells | Instances B/R/D/S, parent → current | Instanced triangles, parent → current | Draws |
| ------ | ---------: | ------ | ----: | ----------------------------------- | ------------------------------------: | ----: |
| Low    |       1130 | A      |     9 | 21/100/24/0 → 21/139/24/0           |                         8,000 → 8,780 |     3 |
| Low    |       1130 | E      |    12 | 23/75/19/0 → 23/121/19/0            |                         6,760 → 7,680 |     3 |
| Low    |       1130 | W      |    15 | 30/58/23/0 → 30/87/23/0             |                         7,700 → 8,280 |     3 |
| Low    |       1130 | F      |     9 | 31/73/25/3 → 31/85/25/3             |                         8,926 → 9,166 |     4 |
| Low    | 1944983584 | A      |     9 | 33/66/20/9 → 33/100/20/9            |                         9,018 → 9,698 |     4 |
| Low    | 1944983584 | E      |    12 | 29/60/18/9 → 29/91/18/9             |                         8,218 → 8,838 |     4 |
| Low    | 1944983584 | W      |    15 | 39/98/17/3 → 39/121/17/3            |                         8,626 → 9,086 |     4 |
| Low    | 1944983584 | F      |     9 | 37/80/25/2 → 37/115/25/2            |                        9,384 → 10,084 |     4 |
| Medium |       1130 | A      |    25 | 200/230/133/7 → 200/307/133/7       |                       45,674 → 47,214 |     4 |
| Medium |       1130 | E      |    30 | 167/230/112/4 → 167/300/112/4       |                       38,768 → 40,168 |     4 |
| Medium |       1130 | W      |    35 | 195/221/153/7 → 195/267/153/7       |                       48,694 → 49,614 |     4 |
| Medium |       1130 | F      |    25 | 190/222/144/8 → 190/291/144/8       |                       46,856 → 48,236 |     4 |
| Medium | 1944983584 | A      |    25 | 207/219/139/9 → 207/304/139/9       |                       47,418 → 49,118 |     4 |
| Medium | 1944983584 | E      |    30 | 182/222/111/9 → 182/302/111/9       |                       40,438 → 42,038 |     4 |
| Medium | 1944983584 | W      |    35 | 211/242/153/3 → 211/313/153/3       |                       49,746 → 51,166 |     4 |
| Medium | 1944983584 | F      |    25 | 205/257/153/6 → 205/311/153/6       |                       50,052 → 51,132 |     4 |
| High   |       1130 | A      |    45 | 614/403/445/11 → 614/521/445/11     |                     139,062 → 141,422 |     4 |
| High   |       1130 | E      |    52 | 611/363/396/4 → 611/497/396/4       |                     128,068 → 130,748 |     4 |
| High   |       1130 | W      |    59 | 683/369/496/12 → 683/480/496/12     |                     153,244 → 155,464 |     4 |
| High   |       1130 | F      |    45 | 666/381/546/11 → 666/480/546/11     |                     160,962 → 162,942 |     4 |
| High   | 1944983584 | A      |    45 | 622/413/436/13 → 622/532/436/13     |                     138,606 → 140,986 |     4 |
| High   | 1944983584 | E      |    52 | 625/393/393/12 → 625/511/393/12     |                     130,544 → 132,904 |     4 |
| High   | 1944983584 | W      |    59 | 699/387/502/15 → 699/507/502/15     |                     156,450 → 158,850 |     4 |
| High   | 1944983584 | F      |    45 | 690/433/534/9 → 690/551/534/9       |                     161,438 → 163,798 |     4 |

Across all sampled cameras/seeds/grounds, peak current Low/Medium/High totals
are **184 / 694 / 1784 instances** and **10,084 / 51,166 / 163,798 triangles**.
Per-kind maxima are **706 / 551 / 546 / 15**, all below 4096; no clipping by the
instance cap was observed. The largest density-only increase is **134 rubble /
2680 triangles** (survey High, seed 1130, E). Draw counts do not grow. Some Low
and Medium samples have three draws because no sponge passes placement/range
filtering; that is supported behavior, not a missing draw.

## Snapshot explanation and cross-site isolation

Regenerated the exact existing snapshot payload (geometry attribute/index hashes,
full fixed-capacity matrix/colour buffers, mesh names and counts), without writing
snapshot baselines:

| Fixture biome                   | Cells | B/R/D/S       | Total | Draws | Mesh digest                                                        |
| ------------------------------- | ----: | ------------- | ----: | ----: | ------------------------------------------------------------------ |
| Complete first parent           |    21 | 267/360/184/5 |   816 |     4 | `d10be21c3ce778761488bf9cb4dfd59822e8db249223bf4082a5216b67d7ebd5` |
| Parent density, current palette |    21 | 267/360/184/5 |   816 |     4 | `35531b73dd10c3bf9f90398f90ad981621c18027353ba20cbb5bf25ded79a642` |
| Current                         |    21 | 267/477/184/5 |   933 |     4 | `3eafbb77a77b4a5a90636edb4d4003885bbfb6dd17ebfb3d01a81b3fc9234467` |

This reproduces both exact committed digests. Geometry attribute/index hashes
are unchanged for all four kinds. Changing only palette changes instance colours
for boulder (`colorC`), rubble (`colorA`) and dropstone (`colorC`); sponge has
its own palette and stays byte-identical. Then increasing density changes only
rubble count and its matrix/colour buffers. Thus the digest change includes
both palette and density, while **816 → 933** is exactly **117 extra rubble**.
Instanced work is **62,490 → 64,830 triangles** (+2340); cells/draws stay 21/4.
The changed count is not a promise that those fragments are visible in a frame.

Read both snapshots using `git show e15dd25^1:...` and `git show e15dd25:...`.
Only the Lost City entry differs. The other eleven named site entries plus
`unknown` are unchanged: Axial, Bismarck, Blake, Challenger, Endurance, Blue Hole,
Hudson, Hunga Tonga, Kamaʻehuakanaloa, Monterey and Titanic. Beebe is excluded
from that isolation snapshot, but its separate three-tier scatter snapshot is
unchanged and passes on both revisions. An isolated `git archive e15dd25^1`
checkout runs the original seven scatter tests successfully against the original
baselines; current passes all seven plus the three added tier cases. This
establishes the unrelated generated entries as well as the textual baseline diff.

## Missing guard, determinism and seating

Existing coverage already preserves cross-site snapshots, Beebe tier placement,
Challenger size-only costs, late ground keepouts and Titanic seeded costs/seating.
The meaningful gap was Lost City's density increase under tier streaming and the
actual survey sampler. Extended only the existing capability spec, adding three
table-driven tier cases; preserved every previous assertion and baseline.

The new guard checks bounded live counts, at most two net new cells per update,
existing buffer capacities and per-kind range limits; actual template triangle
work and unchanged draw counts; two repeated boundary/eviction traces; finite
live matrices/colours and positive matrix determinants. Origin-cell `placeCell`
results repeat exactly. A translated copy of the supplied ground raises only
its sampled height by 37 m: every placement Y rises by precisely 37 m, while
all XZ, scale, rotation and colour fields remain identical. Transform anchors
lie below their sampler height by less than their own Y scale (1 mm Float32
survey-depth tolerance). This tests seating against the supplied sampler; it
does not substitute for 2890's rendered-terrain/collision agreement audit.

Non-rubble equality is asserted only for the density-only copy with identical
palette/ground, supported by ScatterPlacement's explicit independent
`KIND_SALT` RNG stream per kind. It is not an assertion that arbitrary biome or
terrain edits must preserve transforms. No production defect was reproduced,
so no density cut, geometry trim or budget increase is proposed.

## Validation

- Before editing: current focused scatter spec **1 file / 7 tests passed**,
  0.652 s, with `npx vitest run tests/unit/beebeScatter.test.ts
--configLoader runner --cache=false --pool=threads`.
- Isolated first-parent checkout, same command: **1 file / 7 tests passed**,
  0.732 s; original snapshots read, not updated. Root:
  `/tmp/scatter-parent-2910/`.
- Final owned spec, same command: **1 file / 10 tests passed**, 7.29 s.
  Log: `/tmp/scatter-focused-final.log`.
- Temporary complete-parent palette comparison, same command plus
  `--disableConsoleIntercept`: **1 file / 10 tests passed**, 8.61 s.
  Log: `/tmp/scatter-full-parent-comparison.log`; all 12 cost series match
  `/tmp/scatter-costs.json` from the density-only comparison. The temporary
  diagnostic variant is not retained in the repository.
- Snapshot decomposition evidence: `/tmp/scatter-audit-data.log` (11 tests
  passed, including the temporary diagnostic; final repository spec has 10).
- Aggregate: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Uses the existing supported writable-config mode with the read-only shared
  dependency tree; no tooling change. **Actual e2e mode: none**. No browser
  assertion, screenshot or game rendering ran. Aggregate result recorded below
  after completion.
- Aggregate logs: `.cache/runs/20261020-232035-8-eRwVd8/` and
  `/tmp/scatter-gates.log`. Config bundling, content and build (including
  TypeScript) passed. Python: **162/167 passed, five failed**. Four CI build
  manifest cases fail at child `spawnSync git EPERM` (`rev-parse HEAD`); these
  are reproduced environment blocks already recorded by 2800. The golden-tool
  case fails in `golden-manifest.test.mjs:151` parsing empty CLI output with
  `Unexpected end of JSON input`; its underlying cause remains unclassified.
  No tooling repair or retry was attempted.
- The first draft of the new guard incorrectly required four draws even when
  a sample has no sponges, failing two tier cases. Corrected that new assertion
  to the existing live-kind draw contract; no past-bug assertion was relaxed.
  The initial temporary full-palette diagnostic also applied the parent palette
  to the unrelated Titanic fixture, producing three fixture-comparison failures.
  Restricted that temporary edit to Lost City; the final isolated comparison
  and owned spec pass as recorded above. Neither was a production defect.

## Simplicity and limits

No runtime code, abstraction, dependency, site branch, setting, UI, guidance
surface or layout change. Arcade remains the default. Real GMRT data, all
13 site identities, scanning, Journal, marine life, input and accessibility
remain untouched. The numerical/resource portion of the rubric is checked
against existing limits; beauty, opening composition, first-ten-second
readability and visual/real-phone acceptance remain with Claude/owner.

**CPU counts do not establish real-phone frame time or visual quality.** They
do not measure texture/fill cost, GPU compilation, scene-wide culling or a
complete rendered frame. These fixed seeds/traces establish bounded sampled
behavior, not an exhaustive proof over every possible camera path.
