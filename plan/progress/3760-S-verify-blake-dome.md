# 3760 — S-verify: Blake optional reef backdrop

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-verify**. Audited SHA: **`d09ed68a105262e72335dc905dbd24f6ed1bf2b4`**.
No supported runtime propagation, disposal or construction-isolation defect
reproduced. Three missing all-tier reef lifecycle/data-flow cases and a Blake
assertion in the existing PresetSystem table extend `tests/unit/presets.test.ts`.
Production, authored data, snapshots and every other spec remain read-only.

## Provenance and ownership

`git merge-base --is-ancestor 0ad2bc9 HEAD` exits 0. The audited visual merge is
**`0ad2bc901ec77b95025d16012ef5e51bebc5792b`**; its first parent is
**`df3a8c1ad6dd4f683ab2b97c5eddf78feb65588e`**, second parent
**`4079f933aa8997c49a6296a2fa9a6f8d61db325a`**. Read
`git diff 0ad2bc9^1 0ad2bc9 -- src data tests` and the merge's progress note.
ReefPreset, TitanicHorizon, SiteManifest and Blake site.json are byte-identical
between the merge and the pin (`git diff 0ad2bc9 HEAD --` those paths is empty).

Before editing, read CONTRIBUTING-AGENTS, DIRECTOR Backlog/simplicity/rubric,
the newest dated REVIEWS entry (2026-10-24 midday, although an older targeted
entry precedes it), OVERNIGHT-LOG tail through run 114, launched briefs and
available results for this and adjacent packages, and
[V-eight-sites-lit-d](V-eight-sites-lit-d.md). No applicable AGENTS.md exists.
The initial checkout was clean. Registered-worktree status, staged/unstaged
inventories, latest commits and owned-path differences were inspected.

[3450](3450-S-verify-blake-hunga-material.md),
[3460](3460-S-verify-blake-hunga-ambient.md) and
[3470](3470-S-verify-blake-scatter.md) pin `73b43c0`, before the dome; they verify
material, ambient and scatter respectively.
[3550](3550-S-verify-axial-hudson-atmosphere.md) pins `ccef323`, verifying
Axial/Hudson. None supplies this later ReefPreset lifecycle audit. Their result
wrappers label smoke gates PASS while their final reports explicitly record
failed Python commands and actual local e2e mode none; the labels are not
substitute evidence.

Finished 3730 owns d2Hazard plus its note; 3740/3750 contain note-only audits,
all still at `e518b3c`. Their result reports likewise distinguish five Python
failures from wrapper PASS. They remain uncollected and unused. 3770 owns
biomeFloorVariety; 3780 owns post-f64 hosted-CI reporting. Held 2980/3050,
3310, 3320, 3340, 3380 and the V-lostcity-foot-2 tree have no owned-file overlap.
The latter's branch commit is already an ancestor of this pinned checkout;
DIRECTOR still lists it IN FLIGHT, and neither its status nor its work is
changed here. No patches are copied, collected or dependencies of this audit.
No journeys, collision expected failures, art or owner decisions are revisited.
An exploratory glob included non-worktree directories and produced git errors;
the subsequent inventory used only `git worktree list --porcelain` entries.

## Existing guards versus added coverage

- [siteManifest.test.ts](../../tests/unit/siteManifest.test.ts), `site manifest
graded backdrop`: validates the authored block, rejects unknown keys and
  negative values for every field, and asserts only Blake authors it.
  `SiteManifest.ts`'s shared `finite`, `color`, `nonnegative`, `aboveZero`,
  `positiveFraction` and `fields` checks also reject nonfinite/wrong-type,
  missing and out-of-domain scalar values. No duplicate validation matrix is
  added. These checks do not enforce cross-field fade ordering; the shipped
  values are independently finite and ordered. No new malformed-policy
  contract or policy repair is claimed.
- [titanicHorizon.test.ts](../../tests/unit/titanicHorizon.test.ts) already guards
  opt-in defaults, Low and visual paths, 561 vertices/2880 indices, partial
  default fade at 950 m, fog matching, unchanged density/exposure, world-up
  anchoring, translation, ascent hiding and once-only geometry/material disposal.
  Existing CPU projection/raycast tests remain unchanged; they render nothing.
- [enduranceAtmosphere.test.ts](../../tests/unit/enduranceAtmosphere.test.ts)
  guards all-tier appearance signatures, renamed/unknown-site wreck policy,
  absent-hull/default fallback, frozen input preservation, policy-specific fog,
  and cleanup. These existing assertions protect shared wreck behavior without
  another wreck test matrix.
- Existing `per-site preset atmosphere` in
  [presets.test.ts](../../tests/unit/presets.test.ts) resolves missions, cached
  manifests, actual PresetSystem and reusable Atmosphere samples on all tiers.
  Its Blake row now uses a deep camera and asserts dome visibility, exact
  sample-to-scene fog propagation and allocated stats over three fresh samples.
- New `optional reef backdrop` cases cover the materially missing ReefPreset
  owner: shipped Blake/control construction in both orders, Low's disabled
  visual layers, descent/ascent and authored fade boundaries/midpoint, translated
  and rotated cameras with changing far plane, finite attributes, crown/fog-ring
  bindings, normal exit, repeated exit and entry into a second scene using the
  same preset. Every owned mesh geometry/material disposes once per entry;
  objects detach, stats reset, scene children empty. Config and the complete
  cached manifest collection remain serialized-identical. Tests do not require
  unsupported enter-without-exit or reuse of an already modified atmo sample.

## CPU data flow and resource accounting

`PresetSystem.tryEnter` passes `siteManifest(landmarkId)` independently of
mission numeric overrides. ReefPreset passes `site.horizon` to TitanicHorizon
before its `!visuals` return, updates the horizon before its shallow ambient
path, and disposes/nulls it on exit. `disposeObjects` also clears the ordinary
reef mesh list. No site branch or config mutation implements the backdrop.

Blake's inputs are upper **3041926**, haze **1919584**, haze peak **0.26**,
fog lift **0.8**, fade start/end **450/650 m**. The constructor consumes these
fields; default fogHaze is zero. The test checks authored crown RGB after sRGB
to linear conversion and Float32 storage, plus exact lifted-fog RGB throughout
the lower ring. Haze/peak routing is established by the constructor read;
no new appearance threshold or copy of the vertex weighting algorithm is added.

At camera depths **5, 450, 550, 650, 800, 550, 5 m**, fresh samples have fog
multipliers **1, 1, 1.4, 1.8, 1.8, 1.4, 1** on all tiers. Visibility is false
at/before 450, true afterwards and false again on ascent. Density is unchanged.
When visible, position equals the camera, scale is `0.9 * camera.far` on every
axis, and rotation stays identity despite camera rotation. Scene FogExp2 and
Color background equal the adjusted sample, including Low where PresetSystem
skips normal visual synchronization. Atmosphere is resampled before each update;
reapplying an already lifted sample is outside the frame contract.

Increment relative to first-parent Blake (same reef params, no horizon):

| Tier   | visuals | Allocated preset meshes/draws parent → current | Increment                      | Particles/lights increment |
| ------ | ------- | ---------------------------------------------- | ------------------------------ | -------------------------- |
| Low    | false   | 0 → 1                                          | 1 dome mesh / 1 allocated draw | 0 / 0                      |
| Medium | true    | 1 → 2                                          | 1 dome mesh / 1 allocated draw | 0 / 0                      |
| High   | true    | 1 → 2                                          | 1 dome mesh / 1 allocated draw | 0 / 0                      |

The retained Medium/High mesh is `reefShafts`, hidden at these deep samples.
The dome starts hidden at enter, is hidden at/before fadeStartM, and contributes
one eligible visible mesh when active; allocated stats do not track visibility.
This is scene-object accounting, not measured renderer calls or timing. The
shipped Great Blue Hole control has its existing halocline: **1/2/2** allocated
meshes/draws, no horizon and unchanged fog under either construction order.
Its parent already allocated these same meshes, but reported **1/1/1** draws:
`stats.draws = 1` overwrote the halocline count when shafts were built. The
merge changes that assignment to `+= 1`, correcting Medium/High debug accounting
to two; this is not an additional control allocation or rendering effect.
No complete cross-site budget, ambient/scatter, opening or collision audit is
repeated.

Each dome owns one 32×16 SphereGeometry, one MeshBasicMaterial, **561 vertices**,
**2880 Uint16 indices / 960 triangles**. Attribute arrays: position **6732 B**,
normal **6732 B**, UV **4488 B**, color **6732 B**; index **5760 B**. Total
geometry typed-array storage **30,444 B**, plus two private 561-float weights
**4488 B**, **34,932 B** combined. Object/driver overhead is excluded. Each
active update rewrites 1683 color floats and marks that 6732-byte attribute
for update; this does not measure GPU upload cost. No textures, lights or
particles are added. Material remains unlit, BackSide, vertex-colored,
fog/tone mapping/depth test/depth write disabled, renderOrder −1000 and
frustum culling disabled, as the shared existing contract specifies.

## Parent/current comparisons

A temporary Vite SSR diagnostic extracts the actual first-parent
TitanicHorizon module into `/tmp/3760-audit/parent.ts`; only its import paths
are adjusted. Current dependencies/config are identical for this consumer.
Parent and current default and Endurance look constructors are compared at
**5, 600, 700, 950, 1200, 3800, 950, 5 m**: **16 paired frames** match exactly
in full atmosphere samples, fog/background, visibility, transform and every
color-buffer float. Thus adding optional fade endpoints preserves the default
**700/1200 m** band and existing wreck policy. Existing wreck capability specs
also pass unchanged. This is independent historical evidence, not rebaselining.

A second temporary comparison extracts the actual first-parent ReefPreset.
Across two sites × three tiers, **42 paired frames** at the seven depths above
compare all non-dome attribute/index arrays, visibility/transforms, shader
uniforms and samples. Great Blue Hole matches exactly except the draw-stat
correction described above. Blake matches after excluding its expected fog
colour change from the sample and shared shaft fog uniform; all other fields
match. The latter uniform receives the new fog even while the shaft mesh is
hidden. All scenes empty and stats reset after exit. Evidence:
`/tmp/3760-audit/{reef.ts,parent-reef.ts,reef-evidence.json,reef-final.log}`.
The initial scratch assertion incorrectly required Blake shaft fog uniforms
to remain equal; `reef-verified.log` records that expected propagation. Only
that unjustified temporary comparison is removed in the final run; permanent
assertions remain intact. No production defect follows from it.

The diagnostic checks finite ordered Blake inputs and records dome buffer
counts/bytes. Raw source, build logs and evidence are local only:
`/tmp/3760-audit/{audit.ts,parent.ts,evidence.json,verified.log}`. Initial scratch
build/run failed resolving `three` from `/tmp`; setting an absolute Vite alias
to the existing dependency corrected module resolution. The failed commands
are setup failures, not product failures or passing validation. No dependency
or production file was changed.

## Validation and limits

Focused command:

```bash
npx vitest run tests/unit/presets.test.ts tests/unit/titanicHorizon.test.ts tests/unit/enduranceAtmosphere.test.ts tests/unit/siteManifest.test.ts --configLoader runner --cache=false
```

Initial result: **579 tests / 4 files passed**, exit **0**, **907 ms**;
`/tmp/3760-focused.log`. After deriving the midpoint from authored endpoints,
the same command passes **579 tests / 4 files**, exit **0**, **834 ms**;
`/tmp/3760-focused-final.log`. No snapshot-update mode is used.

Historical diagnostic commands:

```bash
git show 0ad2bc9^1:src/world/presets/TitanicHorizon.ts > /tmp/3760-audit/parent.ts
node --input-type=module - <<'JS'
import { build } from 'vite';
await build({configFile:false, resolve:{alias:{three:'/home/vijay/subexp-wt/3760-S-verify-blake-dome/node_modules/three/build/three.module.js'}}, ssr:{noExternal:true}, build:{ssr:'/tmp/3760-audit/audit.ts', outDir:'/tmp/3760-audit/build', rollupOptions:{output:{entryFileNames:'audit.mjs'}}}});
JS
node /tmp/3760-audit/build/audit.mjs
```

Build and final diagnostic exit **0**; **16 paired frames and allocation checks
pass**. The two parent import paths are rewritten to the pinned checkout
before bundling. Initial failure logs: `build.log` and `run.log`; successful
logs: `build-fixed.log` and `verified.log`.

Second historical diagnostic commands (after extracting ReefPreset with
`git show 0ad2bc9^1:src/world/presets/ReefPreset.ts > /tmp/3760-audit/parent-reef.ts`
and resolving its imports to the pin):

```bash
node --input-type=module - <<'JS'
import { build } from 'vite';
await build({configFile:false, resolve:{alias:{three:'/home/vijay/subexp-wt/3760-S-verify-blake-dome/node_modules/three/build/three.module.js'}}, ssr:{noExternal:true}, build:{ssr:'/tmp/3760-audit/reef.ts', outDir:'/tmp/3760-audit/reef-build', rollupOptions:{output:{entryFileNames:'audit.mjs'}}}});
JS
node /tmp/3760-audit/reef-build/audit.mjs
```

Final build/run exit **0**, **6 comparisons / 42 paired frames passed**;
`reef-build-final.log` and `reef-final.log` retain output.

Required aggregate, actual local e2e mode **none**:

```bash
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Gate run `.cache/runs/20261024-100813-8-rDE5v4/`, aggregate log
`/tmp/3760-gates.log`. Config preparation, strict content and TypeScript plus
production build pass (the existing non-failing chunk-size warning remains).
Full unit gate: **192 files passed; 4,151 tests passed / 4 existing expected
failures / 4,155 total**, **672.17 s**, with no unexpected unit failure.
The four historical collision expected failures remain unchanged and do not
establish resolved collision behavior. Attribution and repository Prettier also
pass. Aggregate command **exits 1**, **`FAIL gates (e2e=none)`**, solely because
of the five Python failures below. No browser/e2e phase runs.

Python: **162 passed / 5 failed / 167 total**, **9.899 s**. Four
`test_ci_build_manifest.TestCiBuildManifest` cases fail in setup with
**`spawnSync git EPERM`**:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`,
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
These reproduce the previously reported subprocess restriction; no assertion
about Blake fails there. Smallest follow-up is an unchanged run where Node can
spawn git. `test_golden_tooling` has **24/25** internal Node subtests passing;
`golden comparison refuses partial sets, missing files and incompatible poses`
fails parsing `report.stdout` at `tools/tests/golden-manifest.test.mjs:151` with
**`Unexpected end of JSON input`**. Its underlying child-output cause remains
unestablished here; retain child status/stdout/stderr before parsing as the
smallest follow-up. No tools repair, bypass or retry is made. Wrapper PASS
labels cannot override these actual failed commands.

No retries, skips, timeouts, historical assertions or snapshots are changed.
Final scope recheck: all registered trees' pending/untracked and unique committed
paths have no ownership overlap. HEAD stays pinned and only the owned spec and
note differ. `git diff --check` and owned-file Prettier checks pass.

Simplicity: only the existing capability spec and this evidence note grow;
zero runtime machinery, settings, UI/guidance/layout, dependencies or policies.
No failing-before/passing-after production fix is claimed or proposed. The
rubric is applied to correct propagation/lifecycle and honest limits; rewarding
exploration and all protected core features remain unchanged. Visual readability,
beauty, composition, touch layout and real-phone performance stay with Claude
and the owner. No browser, game rendering, WebGL context, GPU output/compilation,
performance measurement, hosted CI, unaided journey, offline-play or physical
phone validation is claimed. No merge, push, tag or workflow dispatch occurs.
