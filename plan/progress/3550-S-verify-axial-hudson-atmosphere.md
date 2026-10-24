# 3550 — S-verify: Axial and Hudson atmosphere propagation

Serves DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify** of run 97's atmosphere/material data. **No propagation or isolation
defect reproduced.** Two existing capability tables gain missing site rows;
production, authored data, manifest tests, snapshots and shared helpers remain
unchanged. This establishes CPU numerical propagation, not visual acceptance.

## Pin, provenance and ownership

- Clean starting checkout, unchanged audit target:
  **`ccef32398e7eac7eee4719dc6f2740dadb103314`**.
- Parent: **`1ce4f46e4be2238c6f42ba93e9f32981f52df6c7`** (`4f25977^`).
  Production commits: `4f259772c8297a2b173abfc2a7fe4cebac2834a7`,
  `daf7c1f57df1e010a71d186966e5d9992462fdeb`.
  Rebaseline/final authored data: **`41af83b5df28239ad10165f2fe716e9b83b51709`**.
  Audited historical delta: **`1ce4f46..41af83b`**; all are checkout ancestors.
- Read both actual production diffs, the full rebaseline changes, and control
  corrections `6f2ad5dbd3a13e90b534f39a7b34c3a750406666` and
  `0fb6691087c036d6fcda76ca7a94c589fe31bcf3`. The former changes Axial to Titanic;
  the latter only formats that correction. The two manifests, TerrainBiome,
  TerrainMaterial, SiteManifest, atmosphere policy/sample/system consumers are
  byte-identical between `41af83b` and the checkout pin.
- Read CONTRIBUTING-AGENTS, DIRECTOR Backlog/simplicity/rubric, the newest
  evening 2026-10-23 review, overnight tail through run 100,
  `V-eight-sites-lit-c`, 3450/3460 progress, their launched briefs and results,
  and 3540/3550/3560 briefs. No applicable AGENTS.md was found. The earlier
  audits pin `73b43c0`, before this delta, and cover Blake/Hunga. Their wrapper
  gate PASS labels do not override their own reports of failed Python checks.
  Git history, available notes/results and worktrees show no completed audit of
  this exact Axial/Hudson delta; the launched 3550 last-report file was empty.
- Rechecked all 13 registered worktrees, statuses, latest commits and unique
  committed changes to the owned paths, including finished work awaiting
  collection. No ownership conflict found. 3540 edits missionApproach; 3560
  was queued and owns lostCityBiome/props-geo. No patch is collected or used.
  2980/3050 retain their collision changes; 3310's committed journey extension,
  3320/3340 and 3380 remain separate. 3510 journeys, 3520 collision decision and
  3530 lifecycle changes remain with their packages.
- No opening geometry assertion, journey, expected-failure collision case,
  DONE/CUT visual item, parked Blue Hole work or owner-dependent Endurance
  framing is changed. Only the two owned specs and this note are edited.

## Existing guards mapped before editing

| Capability                           | Existing adequate contract                                                                                                                                                                                                                             | Added coverage                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| siteManifest                         | Finite/nonpositive depth, finite/nonnegative intensity, integer RGB bounds, exact fields/tiers, zero allowed, malformed/missing cases, input preservation; exact shipped all-tier Axial 14/Hudson 15 policies                                          | None; read-only                                                                                        |
| lowSweepReadability policy/snapshots | Low observed-site fill, all-tier deep fill, surface preservation, absent site/tier identity, inclusive boundary stops and brighter inputs; 42 site/tier snapshots including both sites                                                                 | None; historical assertions and snapshots retained                                                     |
| lowSweepReadability live transitions | Actual env.atmosphere/env.lighting, RGB/intensity, sun/fog, lamps on/off/on, stable light identities/counts, reverse site orders, config/effective settings/cached manifest/file-byte preservation; Axial already included                             | Hudson row in the same three-tier live table                                                           |
| lowSweepReadability lamp composition | Effective Arcade/Realistic/Custom and low-light modifiers, preset replacement/disposal, independent hemisphere/deep-lamp precedence                                                                                                                    | None                                                                                                   |
| biomeFloorVariety material owners    | All-tier fake shader assembly, linear palette bindings, finite ordered endpoints, shader uniform identity, normal/breakup tier switches, private objects/values, retained earlier materials and registry/config immutability in forward/reverse orders | Axial and Hudson rows in the existing horizon table; all four fades retain the no-fade key distinction |
| terrainMaterialReady                 | Map success/failure/fallback, Node behavior, delayed completion, disposal, replacement isolation, all-tier source/filter contracts                                                                                                                     | None; no repeated texture lifetime matrix                                                              |
| beebeIsolation                       | All non-Beebe/fallback Low/High biome, buffer, numeric uniform, assembled shader and cache signatures                                                                                                                                                  | None; read-only                                                                                        |

No new test framework, helper, spec, snapshot, artistic threshold or duplicate
site/tier matrix is shipped. Test case count is unchanged: the existing six
material/live tier cases exercise additional rows. The historical values below
are diagnostic evidence, not a new ongoing policy.

## Parsed policy, sampling and actual scene ambient

SiteManifest eagerly validates/caches the shipped documents. The diagnostic
validates extracted parent/current documents through that same parser and
compares current results with the cached shipped manifests. `deepSiteWater`
adds no override for either site. `siteLightWater` copies eligible stops at
`band.depth <= depthM`, sets ambient colour and uses **max(base, floor)** for
intensity. `sampleAtmosphere` smoothstep-interpolates stops in linear RGB;
−200 m is not a hard sample-level switch.

| Site / tier                | Parent policy at/below −200 m             | Current policy     |
| -------------------------- | ----------------------------------------- | ------------------ |
| Axial Low                  | 0x879399, floor 6                         | 0x6f8f9e, floor 14 |
| Axial Medium / High        | Absent; original midnight 0.4, abyss 0.18 | 0x6f8f9e, floor 14 |
| Hudson Low / Medium / High | 0x879399, floor 6                         | 0x6f8f9e, floor 15 |

All current rows retain boundary **−200 m**. Parent Axial Medium/High must not
be described as an all-tier floor 6. Current deep linear RGB, both sites/all
tiers: **[0.158960835050774, 0.2746773120495699, 0.34191442489801843]**.
Parent floor-6 RGB: **[0.24228112245478564, 0.2917706498067336,
0.31854677811435356]**. Parent Axial Medium/High instead retains depth-varying
base RGB (abyss **[0.010329823026364548, 0.023153366173251366,
0.033104766565152086]**).

Raw sample = live AmbientLight intensity, before and after actual presets:

| Depth / band        | Axial Low parent → current       | Axial Medium/High parent → current | Hudson all tiers parent → current |
| ------------------- | -------------------------------- | ---------------------------------- | --------------------------------- |
| 0 / surface         | 0.9 → 0.9                        | 0.9 → 0.9                          | 0.9 → 0.9                         |
| −20 / twilight      | 0.55 → 0.55                      | 0.55 → 0.55                        | 0.55 → 0.55                       |
| −110 / twilight     | 3.275 → 7.275                    | 0.475 → 7.275                      | 3.275 → 7.775                     |
| −199.999 / twilight | 5.999999999495 → 13.999999998755 | 0.400000000014 → 13.999999998755   | 5.999999999495 → 14.999999998662  |
| −200 / midnight     | 6 → 14                           | 0.4 → 14                           | 6 → 15                            |
| −200.001 / midnight | 6 → 14                           | 0.399999999999 → 14                | 6 → 15                            |
| −700 / midnight     | 6 → 14                           | 0.249609375 → 14                   | 6 → 15                            |
| −1000 / abyss       | 6 → 14                           | 0.18 → 14                          | 6 → 15                            |

The diagnostic independently supplies intensity **30** at all base stops:
parent/current composition and samples retain 30 on every tier, preserving the
input bytes. With only the midnight stop at 30, the −700 m sample is
`30 + (deepStop − 30) * 0.68359375`: current **19.0625 Axial /
19.74609375 Hudson**, and parent **13.59375 Axial Low/Hudson** or
**9.615234375 Axial Medium/High**. The floor is applied to stops; neither
replacing brighter stops nor clamping every interpolated sample is correct.

### Shipped depths (read-only samples, not an opening acceptance audit)

Reused missionComposition's real tile/prop/POI fixture, local GLTF parser with
texture handles replacing only image decoding, actual Spawn/DeepOpeningSpawn
and CameraRig. Historical module extraction is separate under `/tmp`; both
versions load their real derived mission-range tables at module import.
A post-import manifest spy alone cannot change Spawn's derived
MISSION_APPROACH_M. That temporary setup was corrected before final evidence;
no production discrepancy or fix follows from it.

Mission sub/camera Y stays the same parent/current; its horizontal move changes
the bed beneath it. Parent/current free-dive poses are exactly equal.
Depths below are metres, rounded to six decimals:

| Site / tier   | Mission camera (both) | Mission bed parent → current | Free camera (both) | Free bed (both) |
| ------------- | --------------------: | ---------------------------: | -----------------: | --------------: |
| Axial Low     |                 −1476 |  −1539.901089 → −1539.349263 |       −1480.896298 |    −1541.317401 |
| Axial Medium  |                 −1476 |  −1539.797003 → −1539.232878 |       −1480.773706 |    −1541.307987 |
| Axial High    |                 −1476 |  −1539.854896 → −1539.276858 |       −1480.656855 |    −1541.225910 |
| Hudson Low    |           −881.203608 |    −941.682729 → −942.057760 |        −886.314546 |     −965.758009 |
| Hudson Medium |           −880.944417 |    −941.710993 → −942.081337 |        −886.111602 |     −965.820010 |
| Hudson High   |           −881.053351 |    −941.846679 → −942.217871 |        −886.015908 |     −965.880066 |

Mission/free sub Y is camera Y minus 38 m. All listed Axial depths are abyss:
ambient **6 → 14 Low / 0.18 → 14 Medium/High**. All Hudson opening/bed depths
are midnight: ambient **6 → 15** on every tier. Both historical and current
policies are sampled at both versions' mission sub/camera/bed depths and the
unchanged free-dive depths; the range change does not explain the ambient
change. Geometry safety, scan margins and approach acceptance belong to 3540.

For each site/tier/version, the existing frame fixture executes lamps
**on/off/on** over 24 depths:
`0, −20, −30, −60, −110, −160, −199.999, −200, −200.001, −700, −1000,
current mission-sub, current mission-camera, current mission-bed,
free-camera, free-bed, parent mission-sub, parent mission-camera,
parent mission-bed, −160, −110, −60, −30, −20`.
**72 frames/policy, 864 total** pass. Actual AmbientLight RGB/intensity equals
the raw sample and the final preset sample every frame. Values are serialized
before the next update because Atmosphere reuses its sample.

## Unrelated policy, lights and mutation controls

Removing only ambient colour/intensity leaves identical complete historical
frame samples: fog/water colours, fog density, sun, snow density/drift, grade,
caustic strength, depth/band and hull light. Nonambient light parameters,
preset statistics and snow allocation/density/drift also compare exactly.
Neither site's actual preset changes ambient values; Hudson's optional canyon
ambientFill is absent/zero. Preset snow/current effects are shared by both
historical policies and are not mistaken for changes to the site floor.

- Before presets, scene light counts remain **5 / 6 / 6** on Low/Medium/High:
  one AmbientLight, one DirectionalLight, two headlamp SpotLights, one fill
  PointLight and Medium/High's caustic SpotLight. No hemisphere is added.
- After presets, Hudson stays **5 / 6 / 6**. Axial is **5 / 8 / 8** because
  its existing two vent PointLights are enabled on Medium/High. No new light
  follows from the ambient/horizon delta. The raw snapshot counts exclude
  preset lights, so claiming Axial's final scene always has six would be wrong.
- Snow allocations stay **300 / 1200 / 3000**. Arcade spots stay **750 intensity,
  3250 m distance, 0.767944870877505 rad angle**; fill stays **50 / 220**.
- Actual preset draws/particles/lights: Axial **0/0/0, 2/6018/2, 2/12018/2**;
  Hudson **0/0/0, 1/2700/0, 1/5400/0**. These are object-accounting values,
  not GPU cost or performance measurements.

Derived snow brightness and beam murk legitimately depend on the changed
ambient. Existing formulas are `0.22 + 0.78 * min(1, ambient/1.5)` and
`snowDensity * (0.25 + 0.75 * (1-min(1,ambient/0.9)))`. At −30 m on Low,
brightness changes **0.531268861454 → 0.568360768176 Axial /
0.572997256516 Hudson**; lit beam murk changes **0.352160770198 →
0.310392257795 Axial / 0.305171193745 Hudson**. At Axial Medium/High's deep
opening the old base 0.18 was unsaturated (brightness 0.3136), whereas the new
14 saturates brightness to 1; the old deep murk was 0.68 versus current 0.2.
At the floor-6 parent openings brightness was already 1. Lamps off retain the
last beam uniform through Headlights.update's early return; re-enable refreshes
it. These are existing dependencies, not unrelated policy regressions.

The shipped live table reuses one config and resolved Arcade settings per tier,
constructs Kama, Axial, Hudson, Blue Hole, Endurance and Monterey then reverses
the order. Results, cached manifests, manifest bytes and config/effective
settings stay identical. Historical diagnostics additionally preserve the
entire cached manifest collection and both document bytes. Material checks
retain all earlier live bindings after each later construction and preserve
config/BIOMES. No runtime setting is mutated.

## Rebaseline explanation

### lowSweepReadability, 41af83b

Exactly **six of 42** entries differ: Axial/Hudson × all three tiers. Each has
**46 changed scalars**, **276 total**; every difference is ambient only:

| Section  | Changed scalars per entry | Cause                                                              |
| -------- | ------------------------: | ------------------------------------------------------------------ |
| bands    |                         4 | Midnight/abyss ambient RGB integers and intensities                |
| boundary |                         6 | Three eligible stop colours and intensities                        |
| samples  |                        32 | RGB triplet plus intensity at eight depths, −199.999 through −4200 |
| lights   |                         4 | Final AmbientLight RGB triplet and intensity                       |
| tier     |                         0 | Selected tier knobs unchanged                                      |

Custom stops use `[9,2,9,2]` at `[−199.999,−200,−200.001,−1000]`.
Parent Axial Low/Hudson output `[9,6,9,6]`; Axial Medium/High retains
`[9,2,9,2]`. Current output is `[9,14,14,14]` Axial and `[9,15,15,15]`
Hudson. The first stop remains untouched. Base 9 exceeds old 6 but not new
14/15; hence all three eligible intensities change. The independent intensity
30/mixed controls above explicitly check brighter-than-current inputs.
All raw snapshot bands/boundaries/samples/light records/tier objects are
reproduced against their respective policies with no snapshot writes.

### Material signatures, 41af83b

| Site / tier                 | Parent horizon binding | Current authored = bound Vector2 |
| --------------------------- | ---------------------- | -------------------------------- |
| Axial Low / Medium / High   | Absent                 | [200,700] m                      |
| Hudson Low / Medium / High  | Absent                 | [200,800] m                      |
| Titanic control, every tier | Absent                 | Absent                           |

All endpoints are finite and ordered. Terrain obtains `biomeFor(tile.meta.id)`;
createTerrainMaterial allocates a new vector/uniform object per instance.
The fake THREE.ShaderLib.standard fixture confirms onBeforeCompile binds those
same uniform objects and inserts the existing `smoothstep(uHorizonFadeM.x,
uHorizonFadeM.y,vFogDepth)` mix after fog_fragment, guarded by USE_FOG.
The control has neither the horizon uniform nor expression. Vertex shader and
palette/other numeric bindings remain unchanged; PBR normals/breakup remain
off on Low and on for Medium/High.

| Tier          | Parent Axial/Hudson and unchanged Titanic key               | Current Axial/Hudson key                                                 |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Low           | `seabed-`                                                   | `seabed--horizon-fade`                                                   |
| Medium / High | `seabed-#define TERRAIN_PBR_NORMALS#define TERRAIN_BREAKUP` | `seabed-#define TERRAIN_PBR_NORMALS#define TERRAIN_BREAKUP-horizon-fade` |

Different endpoint values correctly share source/key. Fade/no-fade source
variants remain distinct. Axial acquired its fade in 4f25977, so it ceased to
be a valid absent-fade control; 6f2ad5d correctly selects Titanic instead.
No per-site unique-key requirement is added.

Both actual historical isolation snapshots are reproduced from extracted
modules. Exactly **14 Low/High signature fields** change: two biome hashes and
two sites × two tiers × uniform/shader/cache fields. The three-tier diagnostic
has **20** changed fields. Biome hashes include the new arrays; numeric uniform
hashes include only the added uHorizonFadeM; source hashes include the existing
fade insertion; keys gain its suffix. All terrain attribute/index buffers and
every other site's signatures are equal parent/rebaseline. Both sites/control
bindings at the checkout pin equal the rebaseline. Later Lost City work at the
pin is outside this historical comparison and is not attributed to this delta.
Shader hashes are `c5b52d11… → 0dca230d…` Low and
`96a15d4f… → a309bd59…` High, matching the existing fade-enabled sources.

Diagnostic material construction is Axial → Hudson → Titanic then reverse,
all six alive per tier, across parent, rebaseline and checkout (**54 direct
constructions**). Uniform objects/object values stay private; previous states,
config and registry remain unchanged. The permanent table also retains
Blake/Hunga and tests ten constructions per tier. This is assembly/cache
partition evidence without WebGL, not proof of GPU shader compilation.

## Validation and limits

Focused existing capability command:

```bash
npx vitest run tests/unit/biomeFloorVariety.test.ts tests/unit/terrainMaterialReady.test.ts tests/unit/beebeIsolation.test.ts tests/unit/lowSweepReadability.test.ts tests/unit/siteManifest.test.ts tests/unit/presets.test.ts tests/unit/enduranceAtmosphere.test.ts tests/unit/heroReadability.test.ts tests/unit/marineSnowReadability.test.ts --configLoader runner --cache=false
```

**763 passed / 9 files**, exit **0**, **61.65 s**;
`/tmp/3550-focused.log`. No snapshot update mode was used.

Temporary comparisons reuse 3450's Vite SSR material diagnostic and 3460's
existing scene/frame fixture, adapted to these sites and historical commits:

```bash
node /tmp/3550-audit.mjs
node /tmp/3550-depths.mjs
node node_modules/vitest/vitest.mjs run --config /tmp/3550-audit/vitest.config.ts --configLoader runner --cache=false
```

Material and historical depth commands exit **0**; final frame diagnostic
**6 passed / 1 file**, exit **0**, **5.02 s**, **864 frames**.
Files: `/tmp/3550-material.log`, `/tmp/3550-depths.log`,
`/tmp/3550-parent-current.json`, `/tmp/3550-deltas.json`, and
`/tmp/3550-audit/{audit.test.ts,depths.json,evidence.json,snapshot-diffs.json,
parent-snapshots.json,current-snapshots.json,verified.log}`. These are temporary
local evidence, not shipped tests or a parallel audit framework.
The first snapshot extraction incorrectly JSON-parsed Vitest's surrounding
string quotes; parsing its inner serialized record corrected that setup error.
Earlier successful scratch runs used current opening depths or an ineffective
post-import range spy; only verified.log/depths.json support the historical
opening table. No product failure or weakened assertion follows from either.

Required gate command (actual local e2e mode **none**):

```bash
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Gate run `.cache/runs/20261023-183609-3-vBtrd7/`, aggregate log
`/tmp/3550-gates.log`: **exit 1, FAIL gates (e2e=none)**. Config preparation,
strict content validation, production build (including TypeScript), unit,
attribution and repository Prettier checks pass. Unit result: **4,072 passed /
4 existing expected fail / 192 files**, **625.97 s**. No unexpected unit failure
is reported; the four collision expected-failure cases remain untouched and
do not establish resolved collision behavior. The aggregate failure is solely
the five Python failures below.

Python reports **162/167 passed, five failures**, **10.540 s**.
Four test_ci_build_manifest cases fail with **spawnSync git EPERM**:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`,
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
These subprocess failures are environment blocks; smallest next action is an
unchanged run where Node can spawn git. The golden wrapper has **24/25** Node
subtests passing; the partial-set/missing/incompatible-pose case fails at
`tools/tests/golden-manifest.test.mjs:151` with **Unexpected end of JSON input**.
Its underlying child-output cause is not established; retain child status,
stdout/stderr before parsing as the smallest follow-up. These same five failure
categories occur in 3450/3460. No tools change or retry is made here; wrapper
PASS labels cannot override failed underlying commands.

Final verification: owned-file Prettier check and `git diff --check` pass.
HEAD remains the pinned SHA; final status contains exactly the two owned specs
and this note. All five read-only controls below still equal HEAD. The final
worktree recheck includes the newly registered V-challenger-ripples tree
(14 total); it has no owned-path overlap. No ownership conflict is found.

No renderer, browser, screenshot, GPU compilation/output/performance, hosted
CI, journey, offline-play, composition, readability/beauty or phone acceptance
claim is made. The rubric is applied to numerical correctness, input isolation
and honest evidence. Arcade default, all 13 identities, GMRT terrain, five
heroes, scanning, Journal, life, input and accessibility are unchanged.

Simplicity: table extensions only, no new test cases or production growth;
no UI/guidance/layout/settings, shared site branch, dependency/schema,
artistic threshold, budget, timeout, retry, skip or product-policy change.

Read-only SHA-256 controls, byte-equal to HEAD:

| File                         | SHA-256                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| Axial site.json              | 8499233397d298e20467be76c079575b7a0bfb5141cdaf8a933b7752e07135b5 |
| Hudson site.json             | 307bf3f0615d852f20783739027fc148026813cd920d894a9df95694d12d9fc5 |
| lowSweepReadability snapshot | cc2e35ae11af9a4f801ac198dc73a5d4f2567e1393ee777dcc8041e5eb4e3fec |
| beebeIsolation snapshot      | ea36bcc07e3b6bd493c0ab0c4e2569ab37bcf2f5f21b784cc0d92645ad794a32 |
| siteManifest.test.ts         | 6fa65019172801aa0ad25842234e3c08875d839026c57749a2906296e80464e0 |
