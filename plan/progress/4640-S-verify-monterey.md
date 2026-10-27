# S-verify — merged Monterey banding

Audited 2026-10-27 under `plan/DIRECTOR.md`'s standing S-verify item.
Report only: no art, production code, data, tests or snapshots changed.
No package numbers introduced in code.

**Result:** all 13 Low draw/triangle comparisons are unchanged; the other
12 sites' prop outputs and all 13 sites' terrain outputs are unchanged.
Two production builds and both runtime hash/snapshot runs are deterministic.
**Evidence correction:** the
visual merge's claim that placement hashes are unchanged is false for Low;
its own updated baselines include Low placement and collision changes.

## Provenance and method

- Checkout: `fe1b34f78d89989fdd9109dbf610d099cb7d5a7d`, initially clean.
- Audited merge: `cda52a32825710c6a143badc1ce3c4a74c6940aa`.
- First parent: `e3700acd7cef61dc558f12eeb2f203866724d191`.
- Production merge diff: only `src/core/config/monterey.ts` and
  `src/world/props/geo/scarp.ts`. Tests rebaseline canyon scarp digests,
  Monterey Low buffers and Monterey Low opening-life positions.
- Compared isolated `git archive` copies of first parent and checkout in
  `/tmp/monterey-audit/{parent,current}` using identical scratch capability
  probes. Shared dependencies were read only; no repository expectations
  were updated. Current source includes the subsequent terrace deletion and
  photo/debrief fixes; their scope was checked separately.

## Low draw and triangle comparisons

The table gives **first parent = checkout**, with exact equality checked
for every row. It uses `perf-budget`'s conservative static census: all full
props and internal detail branches, instances, material groups, transparent
side passes and point draws, before culling. Terrain, vehicles, external
life and postprocessing are excluded. Blake's two GLBs use their real local
geometry/materials with texture decoding stubbed, as in that capability.

| Site            | Low draws, unchanged | Low triangles, unchanged |
| --------------- | -------------------: | -----------------------: |
| Great Blue Hole |                    7 |                   19,032 |
| Hunga Tonga     |                    5 |                    8,326 |
| Blake Plateau   |                    7 |                   41,076 |
| Lost City       |                   40 |                   49,124 |
| Kamaehuakanaloa |                    8 |                   16,598 |
| Axial           |                   18 |                    8,206 |
| Hudson Canyon   |                    5 |                   14,548 |
| Monterey Canyon |                   30 |                  284,010 |
| Endurance       |                   17 |                   41,044 |
| Titanic         |                   37 |                  135,178 |
| Bismarck        |                   23 |                   56,686 |
| Beebe           |                   21 |                   20,338 |
| Challenger Deep |                    5 |                   12,609 |

All **39 site/tier** costs match, including Medium and High. All 13 Low
rows retain the existing 1,200-draw / 1,200,000-triangle static ceilings.
These are static submissions, not measured frame costs.

The tighter existing `terrainMerge1140` mesh-only pins also pass unchanged:
Blue Hole **7 draws / 21,300 triangle ceiling** (actual 19,032), Lost City
**14 / 67,472** (49,124), Beebe **13 / 20,758** (20,338), Monterey
**30 / 284,010** (284,010). The larger static counts for Lost City and Beebe
include point draws. Only these four sites have exact draw pins in that spec;
the 13-row comparison above establishes equality for the entire catalog
without inventing or updating repository pins.

## Determinism

Built twice from the same clean checkout using the shipped Vite config,
bundled into an ignored local config so the shared dependency tree stays
read only:

```text
npm run build -- --outDir dist-monterey-a --config .cache/monterey-build.config.mjs --configLoader native
npm run build -- --outDir dist-monterey-b --config .cache/monterey-build.config.mjs --configLoader native
```

Both TypeScript/production builds pass. All **197 output files** have
identical relative paths and SHA-256 bytes, including `index.html`, app
bundles and `sw.js`. Embedded provenance in both documents is checkout SHA
`fe1b34f78d89989fdd9109dbf610d099cb7d5a7d`, `dirty=false`,
`buildMode=production`.

- File-map SHA-256: `767530719de4793e239127ea876a246c6f80d0d3fd01ec88094c62f5cbfc44b7`
  (sorted relative-path → file-SHA map serialized as compact JSON).
- `index.html`: `9e9aa5e6fad17487412e87ab369676df837b824bc1f78f7e9134c74c92a58f53`.
- Build comparison manifest: `/tmp/monterey-build-artifacts.json`.

Runtime geometry is generated when props load, so bundle equality alone
does not establish wall determinism. Independent current-process runs also
check the fixed scarp, Low buffer and opening-life snapshot expectations
without `--update`. The Monterey Low aggregate buffer SHA is
`5808580c797e740b0000f01947e72a8516e31d8476e5e06c5f5105060a64f32a`.
Combined canyon geometry digests (small unsnapped and sloping fixtures) are:

| Tier   | Geometry SHA-256                                                   |
| ------ | ------------------------------------------------------------------ |
| Low    | `5115017efbe1cbf5f51d48df62c61151cd006ca1249ad66b3fbe3809ffea7e88` |
| Medium | `3b71e75471cf845e1f87da8de04daad24ad2cb53355652c66e935a20e143f09b` |
| High   | `4597ae1b18836b990e12cf78179f2b670719a6f99a87bc563796e655489d8546` |

Both independent current runs pass the fixed hashes/snapshots. Their entire
39-case prop and terrain evidence files are byte-identical, including all
four walls on all tiers. Repeated prop evidence SHA-256 is
`bfd76ce2620f1e928cbf5ad4314e4526ae07f3ac64e7d0a125c6adef6ba67bce`;
terrain evidence is
`2adacd59db13a112dac1945f0676f54afc194a9518d45a36684e5e20e2b2f8aa`.
Comparison record: `/tmp/monterey-audit/evidence-summary.json`.

## Isolation and evidence correction

Compared **53 placed props × three tiers**: geometry/attribute/index buffers,
object and instance transforms/colours, material parameters/cache keys,
bounds, world colliders and root placements. Only Monterey's four canyon
walls differ. On Medium/High only their geometry digests differ. On Low,
geometry, placement and collision digests differ for all four walls.
Material digests remain identical on every tier. All other props at Monterey
and all props at the other 12 sites match.

This agrees with the merge's updated scarp baseline: Low placement changes
from `3a58ea6c…` to `1031d523…`, and collision from `28e4bfa0…` to
`cb8ba17f…`. Placement includes child/impostor transforms and instance
matrices, not just authored geographic coordinates. Collision includes
bounds. Bed thickness affects actual wall geometry, so describing this as
only vertex-colour changes or invariant placement/collision is inaccurate.
The existing anchor, collider and opening assertions pass; these digest
changes alone do not demonstrate a new collision defect.

The shared lamina branch requires `bc > 1`; Hunga's tuff and Challenger's
hadal presets retain `bedContrast=1`. Canyon's eroded-bed preset and its
Monterey strata data serve exactly the four Monterey canyon walls in the
shipped catalog. No new site-ID branch or runtime config mutation was added.

Actual GMRT terrain was independently constructed for **all 13 sites on all
three tiers**. Every terrain attribute/index buffer, statistics object,
shader, nontexture uniform and material cache key matches the first parent.
Each construction also leaves its input terrain config unchanged. The global
serialized config digest differs because the later S-dead merge deletes
Lost City's `terrace: { periodM: 24, amount: 0 }`; the audited visual merge
does not edit terrain config. Removing that zero-strength setting changes
none of the measured terrain outputs. Existing cross-site biome/shader
snapshots and Beebe geometry-isolation snapshots also pass unchanged.

## Validation and limits

- First-parent terrain/catalog probe: **40/40 passed**, 69.65 s.
- First-parent catalog plus existing scarp, Low-buffer, opening and biome
  capabilities: **68/68 passed, five files**, 95.98 s.
- Current first run, same capabilities plus actual-terrain probe:
  **69/69 passed, six files**, 135.45 s. Log `/tmp/monterey-current-a.log`.
- Current second run: **69/69 passed, six files**, 106.63 s.
  Log `/tmp/monterey-current-b.log`. Both runs use
  `PERF_BUDGET_STATIC=1 npx vitest run` with `catalogIsolation`,
  `terrainIsolation`, `scarpTerrain`, `terrainMerge1140`, `montereyOpening`
  and `beebeIsolation`, plus
  `--configLoader runner --cache=false --pool=threads --maxWorkers=1`.
  The first two specs exist only in the isolated scratch archives.
- Full unit suite: **192 files / 4,328 tests passed**, 617.83 s,
  using `npm test -- --configLoader runner --cache=false --pool=threads`.
  Log `/tmp/monterey-unit.log`.
- Broad checks invocation: `GATES_CONFIG_MODE=writable bash tools/gates.sh
--phase checks`. Content and TypeScript pass; Python has **5 failures / 167
  tests**: four CI manifest subprocess fixtures report `spawnSync git EPERM`,
  and golden comparison tooling reports `Unexpected end of JSON input`.
  These match previously recorded environment/tooling failures. The default
  unit-worker phase stalled and was interrupted; no aggregate pass claimed.
  Log `/tmp/monterey-checks.log`.
- Attribution: **14 assets passed**. Both production builds pass with the
  existing bundle-size advisory only.
- Report Prettier and `git diff --check`: **passed**. Final status contains
  only this new report; owned build outputs/config were removed.

No browser/e2e or screenshot capture was run. “Snapshots” here means the
checked-in numerical snapshots; no rendered beauty, piloting, real-phone
performance, hosted CI, merge or deployment acceptance is inferred.
The only retained deliverable is this report.
