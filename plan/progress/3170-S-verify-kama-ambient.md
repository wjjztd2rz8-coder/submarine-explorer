# 3170 — S-verify Kamaʻehuakanaloa ambient policy

Serves DIRECTOR Backlog item 9, **S-verify / S-bughunt [Codex, standing]**,
specifically S-verify after a visual merge. Numeric comparison is clean; no
production or authored-data correction is proposed.

## Provenance and ownership

- Checkout: `a545afe00196649a2d6de4cf1c8039851aba9074`.
- Audited Run 82 merge: `022ed26dc87679a03424cdc0f7c8e08a982ec1bd`.
- Actual first-parent range:
  `d8bfff30a08c457d04183b86a7ccd0e4944b49ed..022ed26dc87679a03424cdc0f7c8e08a982ec1bd`.
  The atmosphere path, manifest, and existing readability spec have no further
  changes between that merge and the checkout.
- Read DIRECTOR rules/rubric, CONTRIBUTING-AGENTS, newest 2026-10-22 review,
  overnight tail through Run 82, `V-eight-sites-lit-a`, `V-eight-sites`, and
  `2250-S-manifest-atmosphere-policy` evidence. The earlier 2920 launched brief
  and result concern Run 77 biome tint, not this subsequent ambient policy.
- Before editing, checked queue/launched briefs 3130–3180, completion reports,
  available progress notes and all nine registered worktrees' uncommitted and
  main-relative committed diffs. No other worktree claims either owned file.
  Finished 3130 terrain/router/scarp tests, 3140 spawn tests/DIRECTOR edit and
  3150 workflows remain uncollected and untouched. Unmerged 2980 scarp and 3050
  seam repairs are excluded. 3160 owns biome tests; 3180 owns Journal tests.
- Changes here: three runtime cases in the existing
  `tests/unit/lowSweepReadability.test.ts` capability spec and this note only.
  All previous assertions and all snapshots remain intact. No collection,
  commit, push, merge, tag, browser launch or rendering was performed.

## Authored policy and runtime path

The actual diff changes Kama's Low row from `depthM: -200`, colour `0x879399`
(8885145), intensity **6**, to colour `0x9aa6ad` (10135213), intensity **18**.
It adds identical Medium and High rows. There is no authored hemisphere or
lamp change. The other production change is terrain biome material tuning,
owned by the separate 3160 audit; this note makes no material/texture claims.

`SiteManifest.ts` eagerly imports shipped `site.json`, validates tier names,
submerged finite depth, integral 24-bit colour and finite nonnegative intensity,
then caches the validated policy. `atmosphereSystem.init` supplies
`siteLightWater(site, tier, deepSiteWater(site, config.water))` to `Atmosphere`.
`deepSiteWater` returns the original water for Kama; it only adjusts Challenger
and Endurance. `siteLightWater` copies applicable band stops, sets their colour,
and takes the maximum of existing intensity and the authored floor. Surface and
twilight stops stay unchanged. It does not mutate the base config.

`sampleAtmosphere` smoothsteps between band stops, interpolating linear RGB and
intensity. The inclusive -200 m rule selects **stops**, not an abrupt switch at
every sampled depth. Between -20 and -200 m, the modified midnight stop already
influences samples; -110 m is the halfway blend. Band names change independently
at the inclusive stop. `env.atmosphere` calls `Atmosphere.update`, which copies
sample colour/intensity into the live `AmbientLight`. The normal Seamount
preset does not alter this sample; its Low path copies ambient values and its
Medium/High path synchronizes them back to the scene. `env.lighting` consumes
the same sample for lamps, snow and water.

## Parent/current tier and depth evidence

One temporary headless diagnostic uses both real manifest documents extracted
with `git show`, validates them with `validateSiteManifest`, and substitutes
only the lookup result for Kama while retaining the same runtime code/config.
No production or data file is rewritten. It uses the real GMRT heightmap,
Terrain, loaded Props, parsed mission/POIs, runtime spawn functions, CameraRig,
Atmosphere system and PresetSystem. Only canvas-generated caustic textures are
replaced with texture handles, as in the existing readability fixture.

For each tier and each policy, 39 frames cover lamps **on/off/on** and 13 depths,
including the boundary, interpolation midpoint and shipped mission/free-dive
camera/bed depths. Sample and live ambient values match. Removing ambient
colour/intensity from the parent/current samples leaves exactly equal objects:
fog, water colour, sun, grade, snow, caustics, band and hull-light fields match.

Ambient intensity comparison (metres, negative below sea level):

| Depth                                 | Band     | Low parent → current                    | Medium/High parent → current             |
| ------------------------------------- | -------- | --------------------------------------- | ---------------------------------------- |
| 0                                     | surface  | 0.9 → 0.9                               | 0.9 → 0.9                                |
| -20                                   | twilight | 0.55 → 0.55                             | 0.55 → 0.55                              |
| -110                                  | twilight | 3.2750000000000004 → 9.275              | 0.47500000000000003 → 9.275              |
| -199.999                              | twilight | 5.9999999994953725 → 17.999999998384265 | 0.40000000001388886 → 17.999999998384265 |
| -200                                  | midnight | 6 → 18                                  | 0.4 → 18                                 |
| -200.001                              | midnight | 6 → 18                                  | 0.3999999999989688 → 18                  |
| -700                                  | midnight | 6 → 18                                  | 0.249609375 → 18                         |
| -999.999 (snapshot)                   | midnight | 6 → 18                                  | 0.18000000000103122 → 18                 |
| -1000, -1000.001, -4200               | abyss    | 6 → 18                                  | 0.18 → 18                                |
| All shipped opening/bed samples below | abyss    | 6 → 18                                  | 0.18 → 18                                |

Linear RGB at all stops/samples at or below -200 m is now
`[0.3231432091022285, 0.3813260114221238, 0.4178850708380236]`.
Parent Low is `[0.24228112245478564, 0.2917706498067336, 0.31854677811435356]`.
Parent Medium/High midnight is
`[0.02732089163382382, 0.07618538147321911, 0.11193242782769693]`,
blending toward abyss
`[0.010329823026364548, 0.023153366173251366, 0.033104766565152086]`.
For example, current -110 m RGB is
`[0.2807703914518712, 0.4332379757343875, 0.5009817443605453]`, not the full
floor colour. None of these numbers establishes perceived brightness or quality.

Actual shipped poses with a 16:9 CameraRig, rounded to six decimals (same
fixture for either policy):

| Tier   | Mission sub Y | Mission camera Y | Bed under mission sub | Sub altitude |
| ------ | ------------: | ---------------: | --------------------: | -----------: |
| Low    |  -1282.984319 |     -1244.984319 |          -1427.874438 |   144.890119 |
| Medium |  -1281.598572 |     -1243.598572 |          -1427.932809 |   146.334237 |
| High   |  -1281.692130 |     -1243.692130 |          -1428.361156 |   146.669026 |

Mission X/Z is `(-267.8901085140323, 625.5387838443205)` on all three tiers;
the mission camera is 38 m above the sub. This reproduces the authored note's
approximately 145 m Low altitude. Free-dive camera/bed Y pairs are
Low `-1253.238767 / -1349.848320`, Medium `-1251.849825 / -1350.569452`,
High `-1252.114417 / -1350.211930`. Every one is below the -1000 m abyss stop.
This samples the atmosphere at existing poses; it does not repeat the all-site
spawn-access audit or propose staging changes.

## Every rebaselined atmosphere field

Parsed both first-parent/current snapshot files structurally: **42 entries in
each; exactly the three Kama entries differ**. Each changed entry contains
exactly **46 changed scalar values**, all explained by the authored policy:

- `bands`: 4 values, colour and intensity at midnight and abyss. Low changes
  `0x879399 / 6` to `0x9aa6ad / 18`; Medium/High change midnight
  `0x2e4e5e / 0.4` and abyss `0x1a2a33 / 0.18` to that same floor.
- `boundary`: 6 values, colour and intensity at custom stops -200, -200.001
  and -1000 m. Low intensities `[9,6,9,6]` become `[9,18,18,18]`;
  Medium/High `[9,2,9,2]` become `[9,18,18,18]`. The -199.999 stop stays
  untouched. A previous intensity of 9 exceeds 6 but does not exceed 18;
  replacing it is the correct existing max semantics.
- `samples`: 32 values, three RGB components plus intensity at each of eight
  depths from -199.999 through -4200 m. The first two samples (0 and -20 m)
  are identical. The near-boundary twilight sample follows the smoothstep
  described above; its band name remains twilight.
- `lights`: 4 values, the final AmbientLight RGB triplet and intensity after
  the -4200 m sample. All other lights, names, order, parameters and counts
  are identical. The complete selected tier object is identical.

The temporary runtime diagnostic independently matches both policies' complete
band arrays, custom boundary arrays and all ten recorded sample rows to their
respective existing snapshots. The normal focused spec checks all 42 current
snapshots read-only. No snapshot was accepted merely because it was rebaselined.

## Mutation and resource controls; coverage and simplicity

Existing tests already cover inclusive boundaries, brighter input preservation,
missing site/tier fallback, all 13 sites plus unknown, deep-lamp precedence,
effective lamp modes, input immutability and scene-light selection. Those
assertions remain unchanged; no duplicate package-named spec was added.

The missing guard is live RGB propagation during ordinary frame updates, with
lamp toggles and shared-config construction order. Three added tier cases
exercise `env.atmosphere` and `env.lighting`, using one config and one resolved
Arcade effective-settings object for Kama, Axial, Great Blue Hole, Endurance
and Monterey in forward and reverse order. They compare live colour/intensity,
sun and fog to the composed sample, retain each frame's values before the next
reusable-sample update, verify lamp state and stable scene-light identities,
and compare both orders' outputs exactly. Serialized config, effective settings,
cached manifests and actual manifest file bytes remain unchanged after every
construction/update sequence. Controls retain their existing floor, absent
policy, deep-opening and independent hemisphere/lamp behavior, respectively.

Atmosphere-only Kama scene counts remain **5 Low / 6 Medium / 6 High**:
one AmbientLight, one DirectionalLight, two headlight SpotLights, one headlight
PointLight, plus the existing Medium/High caustic SpotLight. With the real
Seamount preset entered, counts remain **5 / 8 / 8** in both policy versions;
the existing two vent PointLights on Medium/High account for the difference.
Preset draws/particles/lights remain **0/0/0 Low**, **0/0/2 Medium and High**.
There is no new hemisphere. At these abyss depths, sun is **0**, fog density
**0.001**, snow density **0.8**, vignette **0.52**. Snow allocation remains
**300 / 1200 / 3000**. Arcade headlamps remain intensity **750**, distance
**3250**, angle **0.767944870877505 rad**, with fill **50 / 220**
(intensity/distance). Toggling lamps changes visibility, not ambient policy.
These are headless object/allocation counts, not measured GPU cost.

Unchanged snow/headlamp settings do not imply every derived uniform is fixed.
The ordinary lighting frame's existing ambient coupling is also verified at
the shipped abyss depths: Medium/High snow `uBrightness` changes **0.3136 → 1**
by `0.22 + 0.78 * min(1, ambientIntensity / 1.5)`; beam `uMurk` changes
**0.6800000000000002 → 0.2** by
`snowDensity * (0.25 + 0.75 * (1 - min(1, ambientIntensity / 0.9)))`.
Low remains **1 / 0.2** because its old intensity 6 already saturates both
expressions. Snow density/drift uniforms stay **0.8 / 0.1** on every tier.
These are expected consequences of the authored ambient delta, not additional
snow/lamp tuning or evidence of perceived readability.

A temporary runner-only diagnostic suppresses the live AmbientLight colour
update specifically when returning above -1000 m after an abyss sample,
without editing production. **All 67 pre-existing cases still pass; only the
three added cases fail**, at the live-colour assertion when returning to -20 m
with lamps off (twilight `0x86b9c9` expected, stale abyss `0x9aa6ad` received).
The pure sample remains correct. This establishes a missing transition guard
beyond the existing monotonically descending snapshot checks. The diagnostic
is external to the shipped spec; no retries/skips or weaker assertions were
added. Its initial setup needed the same headless caustic mock before importing
Atmosphere; that tooling correction is not a product defect.

Net production complexity is unchanged. No UI, guidance surface, setting,
layout patch, shared site branch, dependency, schema, lighting tuning or budget
change is introduced. Settings resolve once; tests extend an existing capability
and contain no package number. Real GMRT terrain, all site identities, heroes,
scan/Journal/life/input/accessibility code and Arcade default remain untouched.
The behavioral/resource parts of the rubric are checked to this scope;
readability, beauty, composition and visual Phone-OK remain Claude/owner work.

## Validation

- Initial readability + read-only manifest check: **528 passed / 2 files**.
- Focused atmosphere/readability/manifest run: **707 passed / 8 files**, exit 0,
  75.50 s. Command:
  `npx vitest run tests/unit/lowSweepReadability.test.ts tests/unit/siteManifest.test.ts tests/unit/presets.test.ts tests/unit/deepOpening.test.ts tests/unit/montereyOpening.test.ts tests/unit/enduranceAtmosphere.test.ts tests/unit/heroReadability.test.ts tests/unit/marineSnowReadability.test.ts --configLoader runner --cache=false`.
- Final readability + read-only manifest check after the scene-light identity
  assertion: **528 passed / 2 files**, exit 0, 2.43 s.
- Temporary parent/current runtime diagnostic: **1 passed / 1 file**, including
  six tier/policy combinations and their preset frame loops.
- Intentional return-from-abyss colour sensitivity diagnostic: **67 existing
  cases passed / 3 added cases failed**, one per tier, as intended; exit 1,
  2.79 s. No cases were filtered or skipped in this final diagnostic.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` completed
  with **exit 1, e2e=none**. Config bundling, content, build (including
  TypeScript), unit, attribution and repository formatting passed. Unit result:
  **3,522 tests passed / 192 files**, 534.13 s; no unit behavioral failures,
  expected failures or skips reported. The aggregate failure is solely the
  five Python failures described below. Logs:
  `.cache/runs/20261022-125912-8-d7BGlk/` and `/tmp/3170-gates.log`.
- Owned files formatted with Prettier; final owned-file Prettier check and
  `git diff --check` pass. Final tracked/untracked changes contain only this
  note and the owned readability spec. Production, data, snapshots,
  `siteManifest.test.ts`, tools, workflows and DIRECTOR remain unchanged.

The required gate run's Python result is **162/167 passed, five failures**:
four `test_ci_build_manifest` cases (`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`) fail
with `spawnSync git EPERM`. These are subprocess environment blocks; the
smallest next action is to run those unchanged checks where Node may spawn git.
`test_golden_tooling` reports 24/25 internal Node cases passed; its failing
`golden comparison refuses partial sets, missing files and incompatible poses`
case raises `Unexpected end of JSON input` while parsing the `--report` child
stdout at `tools/tests/golden-manifest.test.mjs:151`. This is an unrelated tooling
failure, not an established ambient or visual failure. Its cause is not proven
by that message; the smallest follow-up is to retain the child stdout/stderr
and exit status before parsing, then correct the empty/truncated-report cause.
No speculative tool repair or assertion relaxation was made. The same five
Python failure categories were already reported by finished 3130.

Actual e2e mode: **none**. No screenshots, GPU performance, visual/real-phone
acceptance or successful unaided journey is implied. No runtime discrepancy
was reproduced, so there is no proposed production correction.

Manifest SHA-256 is
`90c567b5671af03fc54ed9e7f3dd46fa0f2e27c5a1e192fdc2882d018d3d20b5`;
readability snapshot SHA-256 is
`0afae4d52eb4c6dacdbe9672c9aed503d1e81323874dd47150bc36bf3fd4fc12`.
Both remain byte-identical to HEAD. Temporary audit evidence/logs are under
`/tmp/3170-audit/`; focused logs are `/tmp/3170-initial.log` and
`/tmp/3170-focused.log`. These are diagnostics, not additional shipped files.
