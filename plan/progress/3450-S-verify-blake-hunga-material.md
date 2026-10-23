# S-verify — Blake and Hunga material propagation

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**, after run 95's V-eight-sites-lit part b. Pinned checkout:
**`73b43c0bfb18ae54f8f9b2443ea76741252de629`**. Audited parent/current range:
**`e4ce192496195c06acfb655ac3d05dd559391691..73b43c0bfb18ae54f8f9b2443ea76741252de629`**.
The data commit is `9b8f8f8454fd89ac50732af6fb8309c77870549e`, whose parent is
`e4ce192`; the snapshot commit is `ada2729268e3be52a320eb2ecfa7be9edba801ca`.
These are ordinary commits, present in this checkout's ancestry. Material,
biome and shader sources at `ada2729` equal the pinned checkout.

**No material binding or construction-isolation defect reproduced.** Authored
fade endpoints and Blake's changed palette reach the existing CPU material on
Low, Medium and High. Three missing capability cases were added to
`tests/unit/biomeFloorVariety.test.ts`. All production, authored data and
snapshots remain read-only.

## Provenance and ownership

Read DIRECTOR Backlog, simplicity rules and rubric, CONTRIBUTING-AGENTS, the
newest 2026-10-23 morning review, overnight log through run 96,
`V-eight-sites-lit-b.md`, both actual commit diffs, 3020/3160 progress evidence,
and relevant launched briefs and available results. No applicable AGENTS.md was
found. The checkout was initially clean.

2920's launched brief concerns run 77's earlier palette/tint delta. Its last
report is empty, task log ends in two model-at-capacity errors, and result
wrapper has gate labels without a final agent report; those labels are not
this audit's evidence. 3160 audits Kama's earlier `022ed26` delta. Neither
audits this later Blake/Hunga data. Git history/progress and the registered
worktree inventory showed no prior audit of this specific material delta.

Checked every registered worktree's status, tracked/staged diff inventory and
available package note, including finished work awaiting collection. 2980 and
3050 retain scarp/seam changes; 3310's committed journey extension, 3320-R and
3340 still await Claude-side validation; 3380's CI report remains separate.
3420 owns camera/placement and firstMove changes, 3430 guidance tests, and 3440
settings/input changes. No owned-file overlap was found. 3460 owns
`lowSweepReadability.test.ts`; 3470 owns `beebeScatter.test.ts`. No worktree was
collected and no uncollected patch is used. DONE/CUT work, the collision-owner
decision and parked/owner-dependent art remain untouched.

## Inputs and CPU binding measurements

`Terrain` obtains the registered object through `biomeFor(tile.meta.id)` and
passes it to `createTerrainMaterial`. That function allocates private uniforms,
constructs palette `THREE.Color` values from sRGB hex data, and copies horizon
endpoints into a new `THREE.Vector2`. `onBeforeCompile` assigns those same
uniform objects to the shader; it does not copy their scalar/vector values
into global or shared program state.

| Site / tier                       | Parent `uHorizonFadeM` | Current authored endpoints = bound vector (m) | Normal / breakup source switches |
| --------------------------------- | ---------------------- | --------------------------------------------- | -------------------------------- |
| Blake / Low                       | absent                 | [150, 700]                                    | absent / absent                  |
| Blake / Medium                    | absent                 | [150, 700]                                    | present / present                |
| Blake / High                      | absent                 | [150, 700]                                    | present / present                |
| Hunga / Low                       | absent                 | [250, 900]                                    | absent / absent                  |
| Hunga / Medium                    | absent                 | [250, 900]                                    | present / present                |
| Hunga / High                      | absent                 | [250, 900]                                    | present / present                |
| Axial control / Low, Medium, High | absent                 | absent                                        | off on Low, on on Medium/High    |

All four authored endpoints are finite and each start is less than its end.
Every injected uniform retains identity with its owning material's uniform.
The source declares `uniform vec2 uHorizonFadeM` and uses its x/y endpoints in
the existing smoothstep of `vFogDepth` inside `USE_FOG`, after the standard
`fog_fragment` chunk. The control source has no horizon uniform or expression.
Vertex shader source is unchanged parent/current.

Blake's actual linear RGB values below are identical across all three tiers:

| Uniform | Parent sRGB hex → linear RGB                            | Current sRGB hex → linear RGB                           |
| ------- | ------------------------------------------------------- | ------------------------------------------------------- |
| `uColA` | `0x4f4b42` → [0.0781874218, 0.0703600957, 0.0544802764] | `0x5f5a4d` → [0.1144353738, 0.1022417331, 0.0742135684] |
| `uColB` | `0x45423a` → [0.0595112382, 0.0544802764, 0.0423114106] | `0x56524a` → [0.0930589628, 0.0843762115, 0.0684781698] |
| `uColC` | `0x3f3c34` → [0.0497065660, 0.0451862044, 0.0343398068] | `0x4f4b44` → [0.0781874218, 0.0703600957, 0.0578054302] |

The probe checks actual components against the standard sRGB transfer function
within `1e-8`, as well as exact `THREE.Color` conversion. Hunga's palette remains
`0x5e5c59 / 0x4a4948 / 0x2f2e30`; Axial's entire material record is unchanged.
The only changed numeric uniforms are Blake's `uColA/B/C` and `uHorizonFadeM`,
and Hunga's `uHorizonFadeM`. This includes comparison of all other numeric,
colour and vector bindings, not just selected fields.

## Program distinction, instance ownership and signature explanation

| Tier          | Parent Blake/Hunga and unchanged Axial key                  | Current Blake/Hunga key                                                  |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Low           | `seabed-`                                                   | `seabed--horizon-fade`                                                   |
| Medium / High | `seabed-#define TERRAIN_PBR_NORMALS#define TERRAIN_BREAKUP` | `seabed-#define TERRAIN_PBR_NORMALS#define TERRAIN_BREAKUP-horizon-fade` |

Blake and Hunga assemble identical shader sources at the same tier, so equal
program keys are appropriate despite different uniform values. Fade-enabled
materials differ from the no-fade control in both source and key. No uniqueness
requirement is imposed for different endpoint or palette values.

Each version/tier uses one base config and the actual registry throughout:
Blake → Hunga → Axial, then Axial → Hunga → Blake, keeping all six materials
alive. That is 18 constructions per version, 36 across parent/current. After
each construction every earlier serialized binding state remains identical;
material objects, uniform objects and their object-valued contents remain
private. Config and the entire serialized BIOMES registry remain unchanged.
The added cases exercise the same orders on the current checkout.

Read-only Vite SSR extraction under `/tmp/3450-parent` uses the actual parent
modules, the existing dependency tree and `makeSyntheticTile` helper; HMR,
websockets and file watching are disabled. `/tmp/3450-audit.mjs` additionally
constructs synthetic Terrain fixtures for the 12 non-Beebe registered sites
plus the unknown fallback, on all three tiers in each version. All position,
normal, aCavity, optional colour and index hashes compare equal parent/current.
Both original Low/High cross-site isolation snapshots are reproduced exactly
against parent and `ada2729`, with no snapshot writes.

There are exactly 14 changed isolation-snapshot fields: two biome digests and
two sites × two tiers × uniform/shader/cache fields. The three-tier probe has
20 changed signature fields because it includes Medium. Biome digests change
for the new horizon arrays and Blake colours; uniform digests change for the
bindings listed above; fragment-source digests change for the enabled existing
fade insertion; cache keys gain its suffix. No buffer field changes, and every
other site's complete signature remains identical. The Low shader digest is
`c5b52d11…` → `0dca230d…`; High is `96a15d4f…` → `a309bd59…` for both sites.
Ambient snapshots/manifest expectations belong to 3460; the Blake scatter
digest belongs to 3470 and is not interpreted here.

Raw temporary evidence: `/tmp/3450-parent-current.json`,
`/tmp/3450-deltas.json`, `/tmp/3450-audit.mjs`, `/tmp/3450-audit.log`, and
`/tmp/3450-{parent,current}-isolation.snap`. These are local audit artifacts,
not shipped dependencies or a new capability spec.

## Existing versus added guards and simplicity

Existing adequate guards are retained unchanged:

- `beebeIsolation`: all non-Beebe sites/fallback Low/High biome, terrain-buffer,
  numeric-uniform, assembled-source and cache-key snapshots.
- `biomeFloorVariety`: existing six tier × loaded/unavailable map cases cover
  registered Kama texture/colour bindings and cross-site construction isolation.
- `terrainMaterialReady`: all-tier source-selection/distance-filtering tests,
  readiness/error/fallback and Node behavior, plus 3020's delayed completion,
  disposal and replacement-isolation matrix. 3160 documents its sufficiency.
- `lostCityBiome`: established material/terrain controls. No texture-lifetime
  matrix, tint sweep, scatter audit or collision audit is repeated.

The materially missing contract was registered horizon data through compile-hook
bindings, fade/control program separation, and cross-site endpoint ownership,
including Medium. Three cases in the existing material-binding describe now
check those contracts, authored palette conversion and both construction orders.
They follow authored values rather than pinning arbitrary artistic thresholds.
All historical assertions, tolerances, budgets, snapshots, instance counts and
four expected-failure collision cases are preserved.

No production correction is proposed. No new runtime machinery, site branch,
guidance surface, setting, layout, dependency or policy was added; config is not
mutated. Real GMRT data, all 13 identities, five heroes, scanning, Journal,
marine life, input/accessibility and Arcade default are untouched. The rubric
is applied to numerical correctness, stable ownership and honest evidence;
visual readability, beauty, composition and phone acceptance remain with
Claude/owner.

## Validation and limits

- Baseline command: `npm test -- --configLoader runner --cache=false tests/unit/biomeFloorVariety.test.ts tests/unit/terrainMaterialReady.test.ts tests/unit/beebeIsolation.test.ts tests/unit/lostCityBiome.test.ts`.
  **PASS: 4 files / 71 tests**, 4.50 s; `/tmp/3450-baseline.log`.
- Same command after the three additions: **PASS: 4 files / 74 tests**, 4.39 s;
  `/tmp/3450-focused.log`. No snapshot update flags were used.
- `node /tmp/3450-audit.mjs`: **PASS**, exit 0; the comparisons above all pass.
  The initial harness attempt's Node `execFileSync('git', ...)` hit the known
  `spawnSync git EPERM` environment restriction; snapshots were instead read
  from shell-extracted files. A subsequent parse attempt exposed Vitest's
  trailing-comma snapshot notation; the probe now evaluates that notation in
  an isolated VM before comparing data. Neither was a product failure.
- `npx prettier --write tests/unit/biomeFloorVariety.test.ts`, followed by its
  owned-file check and `git diff --check`: **PASS**.
- Required aggregate: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`;
  **completed, exit 1, `FAIL gates (e2e=none)`**, `/tmp/3450-gates.log`;
  detailed logs: `.cache/runs/20261023-125418-7-bYP00J/`.
- Aggregate Python: **FAIL, 162 passed / 5 failed / 167 total**, 9.865 s.
  Four `test_ci_build_manifest` cases fail at `spawnSync git EPERM` in the
  provenance helper (environment execution restriction).
  `test_golden_tooling` fails with `Unexpected end of JSON input` at
  `tools/tests/golden-manifest.test.mjs:151`; its underlying child-process
  cause is not established here. These match earlier 3020/3160 and recent
  package reports. No tooling repair, bypass or assertion relaxation is made.
- Aggregate config preparation, strict content validation and TypeScript plus
  production build: **PASS**. The existing non-failing build chunk-size warning
  remains.
- Aggregate full units: **PASS, 192 files / 3,848 passed / 4 expected fail
  (3,852 total)**, 585.40 s. The four existing collision expected-failure cases
  remain intact; they are not reported as fixed. Attribution (**14 assets**)
  and repository-wide Prettier: **PASS**. No unit behavioral failure occurred.
- Final `npx prettier --check tests/unit/biomeFloorVariety.test.ts plan/progress/3450-S-verify-blake-hunga-material.md`
  and `git diff --check`: **PASS**. Rechecked registered-worktree ownership:
  no overlap. HEAD remains pinned; status contains only the owned test and this
  note. No merge, push, tag or hosted workflow action was performed.

Actual local e2e mode is **none**. No renderer or WebGL context was constructed;
the fake standard-shader fixture receives an unused renderer type placeholder.
The new horizon probes use the no-document Node fallback path and make no
Image requests; loaded-map and disposal behavior is covered by the existing
specs cited above.
Assembly and key inspection do **not** establish GPU shader compilation,
execution, program uploads, horizon appearance or shader performance. There is
no browser/game launch, screenshot, hosted CI observation, journey/offline-play
claim, real-phone validation or new full-survey terrain audit.
