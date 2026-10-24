# S-verify: Axial / Hudson mission openings

DIRECTOR Backlog 9, **S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. Input checkout: `ccef32398e7eac7eee4719dc6f2740dadb103314` (clean).
Parent of the opening delta: `1ce4f46e4be2238c6f42ba93e9f32981f52df6c7`.
Audited changes: `4f259772c8297a2b173abfc2a7fe4cebac2834a7`,
`daf7c1f57df1e010a71d186966e5d9992462fdeb`, and
`41af83b5df28239ad10165f2fe716e9b83b51709` (collected by `c6de051`).

## Scope and prior evidence

Read DIRECTOR's Backlog, simplicity rules and rubric, the newest REVIEWS entry
(2026-10-23 evening), OVERNIGHT-LOG through run 100, CONTRIBUTING-AGENTS,
V-eight-sites-lit-c, 3280 and 3490 notes and relevant launched briefs/results.
The three actual diffs change Axial range 180 to 110 m, Hudson 160 to 110 then
112 m, ambient data and horizon material policy, plus matching tests/snapshots.
`daf7c1f` changes Hudson ambient only; its commit subject does not describe an
additional range edit. Free-dive opening data is unchanged.

No prior evidence verifies this exact approach delta: 3280's input `6b7a7ce`
uses 180/160 m; 3490 owns first-move ordering. Registered worktrees and local
status were checked before editing and again during review. 3510/3520 have
finished report-only work; 3530 has uncollected production/spec changes;
3550 owns biomeFloorVariety and lowSweepReadability. 3560 is queued for
lostCityBiome/props-geo. No ownership overlap found; no uncollected patch was
used. 2980/3050, 3310, 3320, 3340 and 3380 remain with their packages.

## Existing guards and missing contract

- `missionApproach`: independently enumerates all 13 authored sites on all
  three tiers; exact first-primary 3D range, 110–300 m bounds, rated depth,
  surface limit, runtime sphere plus 4 m prop keepout, visible hull vertices
  above terrain, signed authored yaw, raw sensor reach and historical
  `60 - 0.01` m raw margin, 5 m sampled transit, numerical navigation projection
  at three aspects and camera terrain clearance.
- `missionComposition`: all shipped props (GLB geometry real, image decoding
  stubbed), all-primary scan accessibility on Low, before/after-props opening
  checks on Low, and all-site/all-tier Arcade mission/free hull checks plus
  a controlled physics/PropContact approach through first scan. The resolved
  first-primary radius and aimed opening scan rejection already exist here.
- `deepOpening`: Challenger/Endurance mission/free compositions, terrain and
  merged-subject clearance, staged life and navigation checks; it does not
  cover Axial/Hudson. Its snapshots remain untouched.

Added only the missing all-required-primary comparison to each primary's
resolved radius in the owned approach fixture. Axial and Hudson gain Realistic
rows on Low/Medium/High; existing Arcade rows remain. The fixture reads resolved
camera settings too. The existing composition scanner tests already establish
range rejection, so no duplicate scanner test was retained. All inherited
assertions and tolerances remain unchanged.

## Runtime consumers

`SiteManifest` parses shipped `site.json`; `Spawn.MISSION_APPROACH_M` derives its
range view, used by `Spawn.composedMissionSpawn` and
`missionApproachScanRadius`. `DeepOpeningSpawn.composedMissionSpawn` delegates
to that bearing/clearance search. `app/systems/mission.applyMissionStart` passes
mission primaries in objective order, actual terrain/props, fitted rated depth,
`spawnSettings(config)` and `ctx.effective.camera` into it.

`modesSystem` preserves base POI radii and applies resolved sensor scaling.
For a near-site mission, `missionSystem` caps **only required primaries** with
`missionApproachScanRadius`, then applies equipment/sensor scaling and
`resolveScanRadius`. `Scanner` uses that final radius for hint/objective display
and eligibility. `resolveEffective` selects Extended × equipment = **2.4** and
**100 m floor** for Arcade; Realistic is **1.2** and **0 m floor**. Both shipped
modes start near-site. The cap depends on authored range, not measured nearest
contact distance; the fixture measures each required contact separately.

Free-dive props placement passes mode to `composedFreeDiveSpawn`, whose
independent free-dive policy is unchanged. Free-dive POIs use their uncapped
base radius and mode scaling/floor. Optional marine life enters Scanner through
`setExtraTargets`; its species/body reach and Arcade floor do not receive the
mission-primary cap. An optional contact in range does not mean a required
objective can be scanned from the opening.

## Measurements and parent comparison

The same approach fixture was copied into isolated `/tmp/3540-opening-parent`
and `/tmp/3540-opening-current` trees exported from the pinned SHAs. Only these
copies gained diagnostic records/free-dive probes; no tracked production,
authored data, helper or other spec was replaced. Both use the same read-only
shipped heightmaps/assets/dependencies. All affected/control props are procedural;
the existing fixture therefore loads their complete authored prop sets.

Each export produced 18 site/tier/mode records, plus its independent all-site
range-table check. Full precision evidence: `.cache/3540-{parent,current}-measurements.json`.
Distances below are actual 3D distances, not inferred from the authored range.
D1/D2 follow mission objective order: Mushroom/Inferno, coral ledge/wall transect,
and main vents/shrimp swarm. Radius and margin are final effective values in m.

| Site          | Tier   | Mode      |      D1 |      D2 |      Radius 1 / 2 |      Margin 1 / 2 |
| ------------- | ------ | --------- | ------: | ------: | ----------------: | ----------------: |
| Axial         | low    | arcade    | 110.000 | 111.528 | 100.000 / 100.000 |   10.000 / 11.528 |
| Axial         | low    | realistic | 110.000 | 111.528 |   30.000 / 30.000 |   80.000 / 81.528 |
| Axial         | medium | arcade    | 110.000 | 111.490 | 100.000 / 100.000 |   10.000 / 11.490 |
| Axial         | medium | realistic | 110.000 | 111.490 |   30.000 / 30.000 |   80.000 / 81.490 |
| Axial         | high   | arcade    | 110.000 | 111.459 | 100.000 / 100.000 |   10.000 / 11.459 |
| Axial         | high   | realistic | 110.000 | 111.459 |   30.000 / 30.000 |   80.000 / 81.459 |
| Hudson        | low    | arcade    | 112.000 | 568.220 | 100.000 / 100.000 |  12.000 / 468.220 |
| Hudson        | low    | realistic | 112.000 | 568.220 |   31.200 / 31.200 |  80.800 / 537.020 |
| Hudson        | medium | arcade    | 112.000 | 568.224 | 100.000 / 100.000 |  12.000 / 468.224 |
| Hudson        | medium | realistic | 112.000 | 568.224 |   31.200 / 31.200 |  80.800 / 537.024 |
| Hudson        | high   | arcade    | 112.000 | 568.215 | 100.000 / 100.000 |  12.000 / 468.215 |
| Hudson        | high   | realistic | 112.000 | 568.215 |   31.200 / 31.200 |  80.800 / 537.015 |
| Beebe control | low    | arcade    | 220.000 | 240.789 | 192.000 / 192.000 |   28.000 / 48.789 |
| Beebe control | low    | realistic | 220.000 | 240.789 |   96.000 / 96.000 | 124.000 / 144.789 |
| Beebe control | medium | arcade    | 220.000 | 240.792 | 192.000 / 192.000 |   28.000 / 48.792 |
| Beebe control | medium | realistic | 220.000 | 240.792 |   96.000 / 96.000 | 124.000 / 144.792 |
| Beebe control | high   | arcade    | 220.000 | 240.802 | 192.000 / 192.000 |   28.000 / 48.802 |
| Beebe control | high   | realistic | 220.000 | 240.802 |   96.000 / 96.000 | 124.000 / 144.802 |

All required primaries are outside scan range on every measured tier/mode.
Nearest required target is the first objective in each fixture; nearest **any**
POI is different at Axial. Current Low's optional `axial-ashes-minor-chimneys` is
**93.106176 m** away, radius **144 m** in Arcade (margin **-50.893824 m**);
Realistic radius is **72 m** (margin **21.106176 m**). This explains the older
note's “nearest scan target 93 m”; it is neither Mushroom nor Inferno.

V-eight-sites-lit-c also reports white sea anemone at 46 m and octopus at 47 m.
Those are optional live `life:` contacts, not mission primaries. They can be
inside Arcade's 100 m floor while the mission still requires an approach.
Their positions depend on wildlife population/timing; this audit classifies the
reported contacts from the real life/scanner consumer path, and does not claim
to reproduce those exact two moving-contact distances or scan all optional life.

| Site / mode               | Parent D1 / radius / margin | Current D1 / radius / margin | Parent D2 range across Low–High | Current D2 range across Low–High |
| ------------------------- | --------------------------: | ---------------------------: | ------------------------------: | -------------------------------: |
| Axial / arcade            |  180.000 / 144.000 / 36.000 |   110.000 / 100.000 / 10.000 |                 180.895–180.938 |                  111.459–111.528 |
| Axial / realistic         |  180.000 / 72.000 / 108.000 |    110.000 / 30.000 / 80.000 |                 180.895–180.938 |                  111.459–111.528 |
| Hudson / arcade           |  160.000 / 120.000 / 40.000 |   112.000 / 100.000 / 12.000 |                 579.115–579.124 |                  568.215–568.224 |
| Hudson / realistic        |  160.000 / 60.000 / 100.000 |    112.000 / 31.200 / 80.800 |                 579.115–579.124 |                  568.215–568.224 |
| Beebe control / arcade    |  220.000 / 192.000 / 28.000 |   220.000 / 192.000 / 28.000 |                 240.789–240.802 |                  240.789–240.802 |
| Beebe control / realistic |  220.000 / 96.000 / 124.000 |   220.000 / 96.000 / 124.000 |                 240.789–240.802 |                  240.789–240.802 |

Axial moves horizontally 70.873 m toward Mushroom while retaining depth/yaw;
Hudson moves 48.662 m toward the ledge while retaining depth/yaw. Vertical
separation means those displacements differ from the 70/48 m changes in 3D
range. The cap changes from 60 to 25 m at Axial (Inferno was already capped by
its smaller 40 m base radius), and 50 to 26 m at Hudson. With equipment/scaling,
Arcade's final floor now governs both pairs; Realistic resolves to 30/31.2 m.
Inferno's parent final radius was Arcade 100 m / Realistic 48 m; its current
radius is 100/30 m. Hudson's second primary shares the first primary's capped
radii in both revisions. Second-target distances change geometrically, not by subtracting the authored
range delta. Terrain colour, ambient and horizon changes do not enter these
spawn/radius consumers. Minor across-tier differences already exist because
snapped POIs and clearance sample the tier's actual terrain surface.

No inherited assertion failed. In particular the historical **60 - 0.01 m raw
sensor margin** still passes and is preserved; it is distinct from final Arcade
margins of 10/12 m. No new minimum margin was invented.

## Hull, pressure, props and corridor

Both affected sites use Class B in the authored and runtime fitted-hull
fixtures: rating -6500 m, crush threshold -7150 m. Across all tiers and both
modes, Axial's centre depth is **1514 m**, leaving **4978 m** above the
`ratedDepth + hullRadius` constraint, and **5636 m** above crush. Hudson's
centre depth is **919.203608 m**, leaving **5572.796392 m** and **6230.796392 m**
respectively. These values are unchanged from the parent. The pressure check
uses the existing rated-depth constraint; the real Arcade approach also checks
that the hull never breaches.

The following values apply to **both modes**, checked separately. Hull gap is
the minimum actual visible vertex height above terrain. Floor gap is centre to
terrain. Corridor gap is its minimum at the existing 5 m sample spacing. All
mission/free openings and corridor samples reject prop collision at radius
**12 m** (8 m runtime hull plus the existing 4 m buffer); zero contact samples.
No signed mesh-to-prop distance or exhaustive triangle proof is claimed.

| Site          | Tier   | Mission hull gap parent → current | Opening floor gap parent → current | Corridor floor gap parent → current | Free hull gap (unchanged) |
| ------------- | ------ | --------------------------------: | ---------------------------------: | ----------------------------------: | ------------------------: |
| Axial         | low    |                   19.151 → 18.585 |                    25.901 → 25.349 |                     25.191 → 25.349 |                    15.700 |
| Axial         | medium |                   18.956 → 18.500 |                    25.797 → 25.233 |                     25.027 → 25.233 |                    15.836 |
| Axial         | high   |                   19.062 → 18.563 |                    25.855 → 25.277 |                     25.031 → 25.277 |                    15.903 |
| Hudson        | low    |                   15.124 → 15.501 |                    22.479 → 22.854 |                     22.479 → 22.745 |                    32.435 |
| Hudson        | medium |                   15.416 → 15.878 |                    22.767 → 23.137 |                     22.767 → 23.038 |                    32.495 |
| Hudson        | high   |                   15.437 → 15.907 |                    22.793 → 23.165 |                     22.793 → 22.844 |                    32.798 |
| Beebe control | low    |                   39.068 → 39.068 |                    47.474 → 47.474 |                     28.960 → 28.960 |                    24.057 |
| Beebe control | medium |                   39.079 → 39.079 |                    47.593 → 47.593 |                     28.923 → 28.923 |                    23.476 |
| Beebe control | high   |                   38.943 → 38.943 |                    47.495 → 47.495 |                     28.627 → 28.627 |                    23.529 |

The retained corridor loop samples Axial parent **0–115 m / 24 points**, current
**0–80 m / 17 points**; Hudson **0–105 m / 22** to **0–85 m / 18**; Beebe remains
**0–135 m / 28**. It uses the historical raw-cap transit extent, not a newly
chosen artistic distance or the final Arcade floor. All sampled centre gaps
exceed the existing **12 m** terrain-clearance requirement. The new pose changes
local terrain/hull gaps without changing terrain or prop geometry.

Reused `missionComposition` with its existing real fixed-step physics,
PropContact and scanner on the two sites plus Beebe only, on both exports.
All nine Arcade routes per export finish the first scan, with **zero contact
frames**, no breached hull and the unchanged 120 s budget:

| Site          | First scan parent → current (s), all tiers | Minimum route floor gap parent → current (m), Low/Medium/High |
| ------------- | -----------------------------------------: | ------------------------------------------------------------: |
| Axial         |                       10.516667 → 8.200000 |           20.055 → 19.925 / 20.036 → 19.975 / 20.051 → 19.854 |
| Hudson        |                        9.816667 → 7.416667 |           16.829 → 16.596 / 17.910 → 17.594 / 17.847 → 17.628 |
| Beebe control |                        9.883333 → 9.883333 |           27.476 → 27.476 / 27.548 → 27.548 / 27.479 → 27.479 |

The same isolated composition copies were then run with `resolveEffective`
selecting `realistic` and the free-dive call receiving that mode. No loop,
assertion, tolerance or 120 s budget changed. All nine Realistic routes per
export also complete without prop contact or hull breach:

| Site          | First scan parent → current (s), all tiers | Minimum route floor gap parent → current (m), Low/Medium/High |
| ------------- | -----------------------------------------: | ------------------------------------------------------------: |
| Axial         |                      95.666667 → 75.850000 |           24.329 → 20.181 / 24.272 → 20.136 / 24.303 → 20.196 |
| Hudson        |                      88.683333 → 75.316667 |           19.912 → 16.380 / 20.950 → 16.517 / 20.966 → 16.305 |
| Beebe control |                    107.900000 → 107.900000 |           28.262 → 28.262 / 28.235 → 28.235 / 27.926 → 27.926 |

These timing reductions follow from the shorter opening and changed final
radius; Beebe's route is byte-for-byte unchanged numerically. Beebe is an
unchanged control, not a new hull-selection audit: the historical approach spec
uses its authored Class C, while composition uses runtime depth-fitted Class B;
its respective hull gaps differ for that reason and each is unchanged across
parent/current. No new hull-selection policy or assertion is introduced.

Free-dive poses, mode-specific resolved base radii, pressure margins and hull
clearances are exactly equal parent/current for all **18** records. Axial's
free-dive primary radii remain Arcade **144/100 m**, Realistic **72/48 m**;
Hudson remains **432/288 m** and **216/144 m**. Free openings are clear at the
same 12 m keepout. The entire Beebe control record, including all primary
measurements and free-dive data, is exactly equal between exports in every tier
and mode. No unexpected numerical behavior reproduced and no production
correction is proposed.

## Validation

Commands run from the task checkout unless a directory is specified:

```bash
npm test -- --configLoader runner --cache=false tests/unit/missionApproach.test.ts tests/unit/missionComposition.test.ts tests/unit/deepOpening.test.ts
npx tsc --noEmit
```

- Untouched baseline: **113/113 passed**, exit 0, **75.86 s**;
  `.cache/3540-focused-baseline.log`.
- Expanded fixture, before redundant per-primary Scanner assertions were
  removed: **119/119 passed**, exit 0, **98.32 s**;
  `.cache/3540-focused.log`.
- Final focused version: **119/119 passed**, exit 0, **91.68 s**;
  `.cache/3540-focused-final.log`. Typecheck passes, exit 0.

In each isolated export directory:

```bash
npm test -- --configLoader runner --cache=false tests/unit/missionApproach.test.ts
SPAWN_AUDIT=1 npm test -- --configLoader runner --cache=false tests/unit/missionComposition.test.ts -t 'axial-seamount-ashes|hudson-canyon|beebe-vent-field'
```

Diagnostic approach: **19/19 passed** per export (18 measured rows plus the
range-table check). Composition: **15 selected passed**, 51 filtered by name,
per export in each mode. The Realistic command is identical, against the
temporary fixture with resolved mode changed; logs/JSON add
`-realistic-composition` to the stem (parent 13.15 s, current 13.35 s).
The name filter is command scope, not a new skipped test. Logs and
JSON are `.cache/3540-{parent,current}-{measurements-final,composition}.log`
and `.cache/3540-{parent,current}-{measurements,composition}.json`. An initial
console-log diagnostic run also passed 19/19 but emitted no measurements under
the configured reporter; measurements above come from the completed file-output
runs. No suppressed console output is treated as measured evidence.

A read-only Sol review per CONTRIBUTING-AGENTS confirmed the radius order and
coverage, and prompted removal of redundant Scanner assertions already covered
by composition. Its own attempted test invocation omitted the writable runner
options and hit read-only `node_modules/.vite-temp` (EROFS); that attempt is not
a passing validation. The successful commands above use the existing runner
options and no dependency-tree cache.

Required gate, actual e2e mode **none**:

```bash
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Gate run directory: `.cache/runs/20261023-184005-9-SpKngA/`; aggregate:
`.cache/3540-gates.log`. Actual aggregate result: **FAIL, exit 1**, ending
`FAIL gates (e2e=none)`. Python tooling fails **5/167**, exactly the signatures
retained by 3280 and 3490:

| Gate                    | Actual result                                                         |
| ----------------------- | --------------------------------------------------------------------- |
| Config                  | PASS                                                                  |
| Python tooling          | FAIL: 5 / 167 cases                                                   |
| Content                 | PASS                                                                  |
| Root build / typecheck  | PASS                                                                  |
| Full unit suite         | PASS: 192 files; 4,078 passed, 4 existing expected failures; 712.45 s |
| Attribution             | PASS                                                                  |
| Repository formatting   | PASS                                                                  |
| Root / project-base e2e | Not run; mode **none**                                                |

The four provenance failures are:

- `TestCiBuildManifest.test_both_bases_survive_copy_and_verify_all_provenance_fields`
- `TestCiBuildManifest.test_every_manifest_mismatch_is_rejected`
- `TestCiBuildManifest.test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`
- `TestCiBuildManifest.test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`

These four expect child return code 0, receive 1, and report `spawnSync git
EPERM` at `tools/ci-build-manifest.mjs:11` for `git rev-parse HEAD`; the captured
error also contains status 0 and SHA stdout, as in the earlier audit. Smallest
proposed follow-up: validate on a runner with functioning Node synchronous
child-process support; preserve provenance checks rather than changing game
code or weakening assertions.

The fifth, `TestGolden.test_golden_tooling`, has 24 passing / one failing Node
subtest. `golden comparison refuses partial sets, missing files and incompatible
poses` fails at `tools/tests/golden-manifest.test.mjs:151` parsing empty report
stdout (`Unexpected end of JSON input`). Its underlying cause is not established
here. Smallest proposed tooling-owner follow-up: inspect child status/stdout/
stderr and restore complete CLI JSON on the runner. No tools were changed.
An outer wrapper's PASS cannot override these actual failed commands.

## Simplicity, rubric and limits

Two rounds: first mapped consumers/guards, reproduced baseline and measured
parent/current; second reviewed the minimal diff, retained only missing
coverage and validated the final version. One existing capability fixture is
extended; no audit framework, helper, snapshot, production branch, setting,
UI, asset, dependency or product policy is added. The only owned changes are
`tests/unit/missionApproach.test.ts` and this note. Historical assertions,
tolerances and budgets remain intact; no retries, skips or inflated timeouts.

Rubric evidence is numerical safety, preserved scan approach and honest
provenance. Readability, beauty, layout, rewarding presentation and real-phone
acceptance remain with Claude/owner. Real GMRT inputs and all site identities
are untouched. The focused route stops at first scan, not a full journey.
Both modes have static opening/corridor checks and the existing controlled
physics route through first scan; neither includes simulated environmental
current/power systems or a live player approach. Visible-vertex terrain clearance and runtime sphere prop
checks do not prove all cosmetic triangles clear under every possible input.
No renderer, browser, screenshots, GPU, hosted CI, full e2e, lifecycle ordering,
journey or phone validation was performed or claimed. No merge, push, tag or
workflow dispatch.

Final owned-file checks passed after the gate results were recorded:

```bash
npx prettier --write plan/progress/3540-S-verify-axial-hudson-openings.md
npx prettier --check tests/unit/missionApproach.test.ts plan/progress/3540-S-verify-axial-hudson-openings.md
git diff --check
git rev-parse HEAD
git status --short
```

Final SHA remains `ccef32398e7eac7eee4719dc6f2740dadb103314`; only the two owned
files are modified. The full suite retains all four existing expected-failure
collision cases. No uncollected patch was applied.
