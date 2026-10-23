# 3460 — S-verify: Blake and Hunga ambient propagation

Serves DIRECTOR Backlog 9, **S-verify / S-bughunt [Codex, standing]**, specifically
S-verify of Run 95's later two-site ambient delta. The numerical comparison is
clean. No production correction or additional permanent test is justified;
**only this note changes**. Light values do not establish visual acceptance.

## Pin, scope and ownership

- Clean starting checkout and final audit target:
  `73b43c0bfb18ae54f8f9b2443ea76741252de629`.
- Authored change: `9b8f8f8454fd89ac50732af6fb8309c77870549e`;
  expectations/snapshots: `ada2729268e3be52a320eb2ecfa7be9edba801ca`.
  Parent/current comparison:
  `e4ce192496195c06acfb655ac3d05dd559391691..ada2729268e3be52a320eb2ecfa7be9edba801ca`
  (`9b8f8f8^..ada2729`). Both documents and the audited atmosphere consumers
  match this comparison's current end at the checkout pin.
- Read CONTRIBUTING-AGENTS, DIRECTOR Backlog/simplicity/rubric, the newest
  2026-10-23 morning review, overnight tail through Run 96, the actual two
  commits, `V-eight-sites-lit-b`, and 3170's completed Kama ambient evidence.
  Reused its existing live-frame capability; did not repeat its Kama audit.
- Read launched 3420–3470 briefs and available results/progress, registered
  worktree statuses, changed paths and relevant diffs. Rechecked all 13
  registered worktrees for uncommitted or unique committed changes to either
  owned path before editing: none. Finished/uncollected 3420 owns placement,
  camera and firstMove; 3430 guidance; 3440 Input/settings/input tests. Their
  patches are neither collected nor dependencies of this audit.
- 3450 retains material bindings and `biomeFloorVariety.test.ts`; 3470 retains
  scatter and `beebeScatter.test.ts`. 3310's journey extension, 3320-R and
  3340 await Claude-side validation; 3380's finished report is left alone.
  2980/3050, four expected-failure collision cases, parked Blue Hole art and
  owner-dependent Endurance framing are untouched. No ownership conflict found.
- All production, authored data, SiteManifest tests, snapshots, helpers, tools,
  other tests and other notes remain read-only. No merge, push, tag, hosted
  workflow, browser or rendering action was performed.

## Existing guards and the three evidence layers

1. **Parsing/data:** `SiteManifest.ts` eagerly imports and validates shipped
   manifests, then caches them. Atmosphere guards reject malformed sections,
   unknown fields/tiers, positive or nonfinite depth, fractional/out-of-range
   RGB, negative/nonfinite intensity and missing required fields; zero is valid.
   `siteManifest.test.ts` also checks exactly the shipped per-site policies,
   including both updated colours/intensities and absent-policy sites. The
   temporary comparison independently validates both historical documents and
   verifies the current ones equal the cached shipped policies.
2. **Sampled atmosphere:** `lowSweepReadability.test.ts` already covers Low
   observed-site floors, all-tier floors, unchanged shallow samples, missing
   site/tier fallback, input preservation, and all **42 site/tier snapshots**
   (13 sites plus unknown, three tiers). Its custom stops test inclusive
   boundaries and brighter input preservation. Samples cover surface, twilight,
   both deep-band boundaries and deep water, including immediately adjacent
   depths. This matrix and its tolerances/snapshots remain unchanged.
3. **Live consumers:** existing Low frame cases check applied floor with lamps
   off and scene-light selection. The three live colour/depth/lamp/isolation
   cases added by 3170 exercise `env.atmosphere` and `env.lighting`, check RGB
   and intensity, fog/sun, stable light identities, effective settings, cached
   policies and file bytes, and compare construction orders. Existing lamp
   composition cases cover Arcade/Realistic/Custom, daily low-light, repeated
   presets, disposal and effective-setting immutability; the deep-lamp case
   guards precedence and independent hemispheres. Focused preset, opening,
   snow and atmosphere specs complement these guards.

**New permanent guards: none.** The generic live contract is already guarded;
the existing matrix guards these two authored policies. Another permanent
site/tier matrix would duplicate that coverage. Temporary diagnostics below
reuse the existing fixtures for this historical comparison only.

## Policy and sample semantics

Both sites already had all three tier rows, depth **−200 m**, colour
**0x879399 / 8885145**, floor **6**. The new rows retain depth/tier membership
and use **0x6f8f9e / 7311262**, floor **11 Blake / 9 Hunga**. No hemisphere or
headlamp policy changes. `deepSiteWater` returns the original water for these
sites; its separate Challenger/Endurance policy is unchanged.

`siteLightWater` copies applicable band stops at `band.depth <= depthM`, sets
their colour, and uses `max(base intensity, floor)`. It does not overwrite a
brighter base intensity or mutate config. Surface/twilight stops stay intact.
`sampleAtmosphere` interpolates between stops with smoothstep in linear RGB;
there is no sample-level hard switch at −200 m. The twilight band name persists
just above −200 m even though its sample is almost the modified midnight stop.

Raw sampled intensities, identical on **Low / Medium / High**:

| Camera depth (m)             | Band     | Blake parent → current                  | Hunga parent → current                 |
| ---------------------------- | -------- | --------------------------------------- | -------------------------------------- |
| 0                            | surface  | 0.9 → 0.9                               | 0.9 → 0.9                              |
| −20                          | twilight | 0.55 → 0.55                             | 0.55 → 0.55                            |
| −30                          | twilight | 0.598593964335 → 0.643175582990         | 0.598593964335 → 0.625342935528        |
| −110                         | twilight | 3.275 → 5.775                           | 3.275 → 4.775                          |
| −199.999                     | twilight | 5.9999999994953725 → 10.999999999032411 | 5.9999999994953725 → 8.999999999217595 |
| −200 / −200.001              | midnight | 6 → 11                                  | 6 → 9                                  |
| −700 / −999.999              | midnight | 6 → 11                                  | 6 → 9                                  |
| −1000 / −1000.001 / −4200    | abyss    | 6 → 11                                  | 6 → 9                                  |
| All opening/bed depths below | midnight | 6 → 11                                  | 6 → 9                                  |

Linear RGB at/below −200 m changes from
`[0.24228112245478564, 0.2917706498067336, 0.31854677811435356]` to
`[0.158960835050774, 0.2746773120495699, 0.34191442489801843]` on both sites
and all tiers. At −110 m current raw RGB is
`[0.19867920442614395, 0.3799136260481106, 0.46299642139054276]`;
it is a blend, not the full authored colour.

`Atmosphere.update` copies the raw sample to the actual `AmbientLight` on
every frame. The normal preset then runs, followed by `env.lighting`:

- Hunga's **Seamount** preset leaves ambient unchanged.
- Blake's **Reef** preset applies the existing shallow warmth and intensity
  scale, fading to zero effect at 200 m. At −110 m raw intensities
  **3.275 → 5.775** become final/live **3.8550473760932946 →
  6.79783163265306**. Current live RGB is
  `[0.30086512745355054, 0.43537708687963445, 0.4650780579409593]`.
  At −20 m the unchanged raw **0.55** becomes live **0.6875** in either policy.
  The Low preset path copies ambient back to the scene; Medium/High use the
  normal synchronization path. At the shipped opening depths, all below
  −200 m, the Reef adjustment is zero and live values equal raw values.

## Shipped pose samples and live frame sequence

The temporary runtime comparison uses real GMRT heightmaps, Terrain, all shipped
Props (including Blake's two GLBs), parsed mission/POIs, resolved Arcade camera,
runtime mission/free-dive spawn functions, 16:9 CameraRig, atmosphere system
and actual PresetSystem. It reuses `missionComposition`'s local GLTF parser
fixture: only image decoding and generated caustic textures become Texture
handles. No WebGL context, game rendering or asset appearance is tested.

Opening camera and bed under the sub, metres, rounded to six decimals:

| Site  | Tier   | Mission camera | Mission bed | Free-dive camera | Free-dive bed |
| ----- | ------ | -------------: | ----------: | ---------------: | ------------: |
| Blake | Low    |    −684.964359 | −777.273125 |      −698.326586 |   −783.195329 |
| Blake | Medium |    −686.534148 | −776.973060 |      −699.998790 |   −782.597882 |
| Blake | High   |    −686.243335 | −777.029596 |      −699.725383 |   −782.521457 |
| Hunga | Low    |    −411.114960 | −490.548937 |      −408.359165 |   −483.405126 |
| Hunga | Medium |    −411.136018 | −490.125162 |      −407.770980 |   −482.396919 |
| Hunga | High   |    −411.157880 | −489.811929 |      −407.813187 |   −482.294160 |

Mission sub Y is camera Y minus 38 m; free-dive sub Y likewise. Both raw and
live ambient are **6 → 11 Blake / 6 → 9 Hunga** at every listed depth, on each
tier. This samples existing authored poses; it is not another placement,
collision, composition or scan-access audit.

For each site/tier/policy, the frame fixture runs lamps **on/off/on**, each
through this 21-depth sequence:
`0, −20, −30, −60, −110, −160, −199.999, −200, −200.001, −700, −1000,
mission-sub-Y, mission-camera-Y, mission-bed-Y, free-camera-Y, free-bed-Y,
−160, −110, −60, −30, −20`.
That is **63 frames per policy; 756 total**, with descending and ascending
transitions and returns to shallow water. At the first atmosphere stage raw
sample and live RGB/intensity match; after the actual preset stage final
sample and live RGB/intensity match. Lamp visibility follows toggles without
changing ambient policy. Sun/fog follow the same frame's sample. Frame values
are serialized before the next update because Atmosphere reuses its sample.

## Explanation of ada2729's atmosphere snapshots

Structural comparison: **42 entries before/after; exactly six differ**.
Every changed scalar belongs to ambient colour/intensity. All three Blake
entries have **46 changed scalars**; all three Hunga entries have **45**:

| Section  | Blake changes per tier | Hunga changes per tier | Explanation                                                       |
| -------- | ---------------------: | ---------------------: | ----------------------------------------------------------------- |
| bands    |                      4 |                      4 | Midnight/abyss RGB integers and intensities                       |
| boundary |                      6 |                      5 | Three eligible stop colours; three Blake or two Hunga intensities |
| samples  |                     32 |                     32 | RGB triplet plus intensity at eight depths from −199.999 to −4200 |
| lights   |                      4 |                      4 | Final AmbientLight RGB triplet and intensity after −4200 sample   |
| tier     |                      0 |                      0 | Entire selected tier object unchanged                             |

Custom boundary input intensities are `[9,2,9,2]` at
`[−199.999,−200,−200.001,−1000]`. Parent output `[9,6,9,6]` becomes
**`[9,11,11,11]` Blake / `[9,9,9,9]` Hunga**. The −199.999 stop stays
untouched. The brighter parent input 9 is preserved above floor 6; it exceeds
neither new floor. Hunga's already-9 intensity stays 9, explaining one fewer
changed scalar. Colour still changes on eligible stops regardless of max
intensity. The first two raw sample rows, 0 and −20 m, remain identical.

The temporary diagnostic reproduces each policy's complete band arrays,
custom boundary arrays, all ten raw sample rows, scene-light records and tier
selection against the respective historical snapshots. These snapshots are
raw Atmosphere results, before Reef; applying Reef expectations to their
shallow rows would misinterpret them. Other lights, parameters, ordering and
counts remain unchanged. No snapshot is updated or accepted solely because
it was previously rebaselined.

## Mutation and independent-value controls

The copied existing live transition fixture constructs
**Blake, Hunga, Axial, Great Blue Hole, Endurance, Monterey**, then the reverse
order, on each tier. Each tier reuses one base config and one resolved Arcade
effective-settings object. Exact serialized frame results agree between
orders. Config, effective settings, cached manifests and each manifest's file
bytes agree after every construction/update/disposal sequence. Controls retain
the existing Low-only floor, absent policy, deep-opening and hemisphere/lamp
behavior. No control tuning is changed. The separate historical-policy
comparison also checks its config, effective settings, cached manifest
collection and both documents' bytes after each case.

For every one of the 756 historical-policy frames, removing only ambient
colour/intensity leaves identical parent/current samples: fog/water colour,
fog density, snow density/drift, sun, grade, caustics strength, band and hull
light. All nonambient scene-light parameters, snow allocation/density/drift,
and preset statistics compare exactly between policies at each frame.

- Scene lights remain **5 Low / 6 Medium / 6 High** on both sites, before and
  after presets: one AmbientLight, one DirectionalLight, two headlight
  SpotLights, one fill PointLight, plus Medium/High's caustic SpotLight.
  No hemisphere or Seamount vent light is added on these two sites.
- Snow allocation remains **300 / 1200 / 3000**. Arcade headlamps retain
  **750 intensity / 3250 m distance / 0.767944870877505 rad angle**;
  fill retains **50 / 220** intensity/distance.
- Preset object accounting (not a benchmark): Blake draws/particles/lights
  **0/0/0 Low, 1/0/0 Medium/High**; Hunga **0/0/0** on all tiers.
- At Blake's Low mission camera, unchanged fog density is
  **0.0008970736788743672**, snow density/drift
  **0.8686175474170886 / 0.11715438685427215**, sun intensity
  **0.02058526422512659**. Hunga's corresponding values are
  **0.0007516493800779794**, **0.9655670799480138 / 0.14139176998700345**,
  **0.04967012398440414**. Both are midnight interpolation, not abyss constants.

Derived snow brightness and beam murk legitimately depend on ambient intensity.
At opening/bed depths the old intensity 6 already saturates both expressions:
snow `uBrightness` stays **1**, beam murk stays `snowDensity * 0.25` while on.
At −30 m, existing coupling produces these expected changes on all tiers:

| Site               | Snow uBrightness parent → current       | Beam uMurk while on parent → current    |
| ------------------ | --------------------------------------- | --------------------------------------- |
| Blake (after Reef) | 0.6090860768175583 → 0.6380641289437585 | 0.264532238468146 → 0.23190058815324757 |
| Hunga              | 0.5312688614540467 → 0.5451783264746227 | 0.3521607701983851 → 0.3364975780472338 |

The existing formulas are `0.22 + 0.78 * min(1, ambient / 1.5)` and
`snowDensity * (0.25 + 0.75 * (1 - min(1, ambient / 0.9)))`.
Headlights.update returns while off, retaining the last beam uniform; the
fixture checks that behavior and its refresh on re-enable. This is an
expected dependency of the audited ambient delta, not new snow/lamp tuning.

## Validation and limits

Focused existing checks, with read-only snapshots/manifest expectations:

```bash
npx vitest run tests/unit/lowSweepReadability.test.ts tests/unit/siteManifest.test.ts tests/unit/presets.test.ts tests/unit/deepOpening.test.ts tests/unit/montereyOpening.test.ts tests/unit/enduranceAtmosphere.test.ts tests/unit/heroReadability.test.ts tests/unit/marineSnowReadability.test.ts --configLoader runner --cache=false
```

**707 passed / 8 files**, exit **0**, **71.93 s**;
log `/tmp/3460-focused.log`.

Final temporary diagnostic command:

```bash
node node_modules/vitest/vitest.mjs run --config /tmp/3460-audit/vitest.config.ts --configLoader runner --cache=false
```

**9 passed / 2 files**, exit **0**, **5.22 s**: six site/tier historical-policy
comparisons plus three reused order/isolation cases. Source, extracted
documents, parsed snapshots, scalar diff list, all 756 frame records and final
log are `/tmp/3460-audit/{audit.test.ts,isolation.test.ts,*-snapshots.json,
snapshot-diffs.json,evidence.json,shipped.log}`. Temporary files are diagnostic
evidence, not a second shipped test matrix.

Scratch-run failures are retained, not counted as passing product checks:
`run.log` and `threads.log` timed out with the initial all-six-cases fixture
(60 s scratch config, then 30 s); subsequent cases were split with the normal
30 s limit. An initial split used `placeAll` but incorrectly expected `loaded`
to be set; `split.log` records six fixture failures, corrected by using `load`.
`final.log` then passed 9 cases with procedural props only. Expanded controls
initially asserted beam updates while lamps were off (`final-controls.log`);
the source's intentional early return explains the retained uniform, and
`verified.log` passes with that contract. Final `shipped.log` additionally uses
the existing local GLTF fixture to include all authored props and passes.
No production failure, test relaxation or production correction follows from
these diagnostic setup errors. No shipped timeout or assertion is changed.

The off-lamp diagnostic witness is frame **21**, depth **0**, immediately after
frame **20**, depth **−20**, lamps on, on each Low/parent case. Blake's raw
ambient is **0.9**, final sample/live **1.125**; Hunga's raw/sample/live are
**0.9**. Beam `uMurk` correctly retains the previous frame's
**0.2989583333333333 Blake / 0.3791666666666666 Hunga** rather than the
diagnostic's incorrectly required **0.0875**. The smallest correction was to
the temporary expectation: retain the last beam uniform while off, refresh
when on. No authored/sample/live ambient discrepancy occurred. The initial
scratch invocation used `npx vitest run --config /tmp/3460-audit/vitest.config.ts
--configLoader runner --cache=false`; `threads.log` used the final Node command
with `--pool=threads`. All later commands used the final Node invocation above.

Required gate command:

```bash
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Gate run `.cache/runs/20261023-125242-7-T3uLMX/`, aggregate log
`/tmp/3460-gates.log`: **exit 1, FAIL gates (e2e=none)**. Config preparation,
strict content validation, production build (including TypeScript), unit,
attribution and repository Prettier checks all pass. Unit result:
**3,845 passed / 4 expected fail / 192 files**, **572.91 s**. The four existing
collision expected-failure cases remain unchanged; they do not establish
resolved collision behavior. No unexpected unit failure is reported. The
aggregate failure is solely the five Python failures below; passing wrapper
lines do not override those failing command results.

Python reports **162/167 passed, five failures**, **9.620 s**, exit failure:
four `test_ci_build_manifest` cases fail with **`spawnSync git EPERM`**:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`,
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
These are subprocess environment blocks. The smallest next action is to run
unchanged checks where Node can spawn git. `test_golden_tooling` reports
**24/25 internal Node cases passing**; the partial-set/report case fails with
**`Unexpected end of JSON input`**, at
`tools/tests/golden-manifest.test.mjs:151`. The underlying child-output cause
is not established; the smallest investigation is to retain child stdout,
stderr and exit status before parsing. These same five categories were
reported by earlier audits. No out-of-scope tooling repair is attempted.

Final owned-file checks:
`npx prettier --write plan/progress/3460-S-verify-blake-hunga-ambient.md`,
`npx prettier --check plan/progress/3460-S-verify-blake-hunga-ambient.md` and
`git diff --check` pass. Final status contains only this new note. The checkout
pin is unchanged; all four read-only hashes below match their initial values
and HEAD. `lowSweepReadability.test.ts` remains byte-identical to HEAD, as do
all tracked production, data, snapshots, helpers and other tests.

Actual local e2e mode is **none**. No browser, GPU, shader compilation, hosted
CI, unaided journey, offline play, visual quality, brightness/readability,
composition, real-phone acceptance or frame-time claim is made. Material
bindings belong to 3450, scatter placement to 3470. The rubric is applied to
numerical correctness, isolation and honest limits only.

Simplicity: zero production/test growth; no UI/guidance/layout/settings,
shared site branch, dependency, schema, artistic threshold, budget or policy
change. Settings resolve once. All 13 identities, GMRT terrain, heroes,
scan/Journal/life/input/accessibility and Arcade default remain untouched.

Read-only SHA-256 controls:

| File                             | SHA-256                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| Blake site.json                  | e563576d3f0685404b0ed1ac5b0c1d9413d4beb12645bb2feb9358ce5864441c |
| Hunga site.json                  | 27b3e5d5e3e27acd9cc9bb9a6457c8c9e3a8ad8b4f9a8e45760d8ee399eb620f |
| lowSweepReadability.test.ts.snap | 87b783933579405eac413ef030a13a12927c0b53607b2afad8659e2ecf9ab778 |
| siteManifest.test.ts             | 1a7b68265b28fac0788c7e496ea3b549fab688c5ba4bd5a3f9930e1b45b6bb9d |
