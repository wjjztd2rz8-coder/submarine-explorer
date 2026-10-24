# S-verify: Challenger ripple fade

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**.
Audited HEAD: `d09ed68a105262e72335dc905dbd24f6ed1bf2b4`.
Implementation: `63d9d3ae4f33a6eba67aa0950142fb882659ee66`;
its parent/baseline: `cc3fc5803a0deefdb3ec581909952d4e2e16a91e`.
`git merge-base --is-ancestor 63d9d3a HEAD` exits 0.

**No supported-path numerical defect reproduced.** Challenger resolves its authored
`[70, 200]` into `uFadeRipple`; no-override controls use their supplied config.
Only the existing biome capability table and this note change. No production,
data, snapshot, policy or tooling edits; no correction proposed.

## Intake and ownership

Read DIRECTOR Backlog, simplicity rules and rubric, CONTRIBUTING-AGENTS, the
newest dated REVIEWS entry (2026-10-24 midday, despite the older targeted entry
at the top), and OVERNIGHT-LOG through run 114. Read the launched 3580 and
3770 briefs, 3580 result/progress, V-challenger-ripples-2 progress, the concurrent
3760/3780 briefs, and finished 3730–3750 briefs/results/progress. Inspected
registered worktree HEADs, statuses and diff paths/statistics before editing.
The working checkout was clean. Rechecked HEAD and ownership during validation.

No active or finished package provides this exact fade audit: 3580 audited
`04cf357798c30dd34b782d0154ca1751bf8f1d36`, before the optional fade existed.
Its result wrapper says smoke/project-base PASS, while its own progress note
documents headless numeric checks and says browser/full gates were unnecessary;
neither is evidence for this later fallback path or this run's e2e mode.

3730 owns d2Hazard, 3740/3750 are note-only clean audits, 3760 owns presets,
and 3780 owns its CI note. No overlap with this material table. Held collision
2980/3050, journey 3310/3510, full-e2e 3320, touch 3340 and CI 3380 packages
were left in place; no patches were collected or required. V-lostcity-foot-2
was already merged into the pinned checkout, although DIRECTOR still lists it
IN FLIGHT; its later digest is accounted for below, without modifying that work.
DONE Sonnet work, parked Blue Hole art and owner-dependent Endurance remain
untouched.

## Existing coverage versus the material gap

- [biomeFloorVariety.test.ts](../../tests/unit/biomeFloorVariety.test.ts),
  `the trench floor ripples reach the whole light pool but stay bounded`:
  63d9d3a adds assertions that the authored fade starts beyond the default
  near endpoint and has an ordered far endpoint. These do not pin both authored
  endpoints or establish finiteness.
- The existing `site floor material bindings` reach table came from 3580.
  It already constructs Titanic/Monterey/Challenger/Monterey/Titanic at
  Low/Medium/High using one config, checks reach/ripple/wavelength/direction,
  shader-hook reach binding, retained reach ownership and registry/config
  non-mutation. 63d9d3a adds the resolved fade value assertion for these default
  config constructions. It does not check custom-config fallback, actual fade
  shader-hook binding identity, independent fade objects/vectors or retained
  fade values.
- [beebeIsolation.test.ts:17](../../tests/unit/beebeIsolation.test.ts#L17)
  hashes biome data, synthetic terrain buffers, non-texture uniform metadata,
  injected shader source and program keys at Low/High for 13 entries (all
  registered biome entries except Beebe, plus the unknown/default entry).
  Its separate Beebe guard retains geometry, placement, vent and budget evidence.
  The updated baseline alone is not an independent proof of intended behavior;
  the read-only comparison below identifies precisely what it accepted.

Extended that existing reach table from three to six cases: three tiers times
default/custom config. No new spec, abstraction or weakened historical assertion.
The custom config is constructed through supported `makeConfig` overrides,
with `[18, 92]` distinct from both the default `[22, 75]` and Challenger.
Each case keeps all five materials alive and uses the same resolved config.

| Config  | Challenger uFadeRipple | Titanic/Monterey before and after |
| ------- | ---------------------- | --------------------------------- |
| Default | `[70, 200]`            | `[22, 75]`                        |
| Custom  | `[70, 200]`            | `[18, 92]`                        |

Assertions now pin Challenger's authored tuple and the controls' absent override,
check finite ordered Vector2 endpoints, verify the exact uniform object installed
by `onBeforeCompile`, and retain earlier fade values across every construction.
Both the uniform wrappers and their vectors have separate ownership. Config,
DEFAULT_CONFIG and the biome registry serialize identically after every build.
All pre-existing reach assertions remain. Materials/textures are disposed and
document is stubbed absent; no WebGLRenderer is constructed. No unique program
key requirement is imposed for different uniform values.

## Read-only signature comparison

Parsed both snapshot exports without updating them. Ignored local evidence:
`.cache/3770-audit/snapshot-delta.json` (full before/after hashes and paths).
The exact `cc3fc580 → 63d9d3a` change has **three changed leaves**:

| Leaf                     | Parent digest prefix | Implementation/HEAD digest prefix |
| ------------------------ | -------------------- | --------------------------------- |
| Challenger biome         | `82f31f50600b`       | `fb28c5b28fe5`                    |
| Challenger High uniforms | `1c1cb95aa5f9`       | `f1dbefc70655`                    |
| Challenger Low uniforms  | `1c1cb95aa5f9`       | `f1dbefc70655`                    |

**Zero shader, program-key, geometry-buffer or control-site digest changes**
in that commit. The separate Beebe snapshot export is byte-identical.
The two production edits add the optional tuple/authored Challenger data and
resolve it into the existing uniform once. Shader source is unchanged:
[terrain.frag.glsl:262](../../src/shaders/terrain.frag.glsl#L262) already uses
`1.0 - smoothstep(uFadeRipple.x, uFadeRipple.y, dist)`.
Program keys remain `seabed-` on Low and
`seabed-#define TERRAIN_PBR_NORMALS#define TERRAIN_BREAKUP` on High for Challenger.
Different endpoint values require no different shader program.

`63d9d3a → audited HEAD` adds exactly one isolation leaf: Lost City's biome
digest `f033e1c773a1… → 11dfd61ab340…`, from the already-merged scatterTint data.
Thus parent → HEAD has **four** changed leaves, not three; the fourth does not
belong to this fade change. All terrain buffers, shader/uniform/program-key
digests and the separate Beebe export remain unchanged across that later interval.
TerrainMaterial, shaders, terrain config, Terrain construction and Challenger
authored content have no subsequent diff in that interval.

No geometry budget matrix was rerun. Cite the
[3580 budget and buffer audit](3580-S-verify-challenger-ripples.md): Low lander
**1,985/2,000 triangles**, Medium/High **2,822/3,000**, three full draws at each
tier; unchanged terrain/scatter buffers, bounds and colliders. The new fade
commit changes no geometry builder, mesh/instance construction or authored
geometry. Those historical budgets are CPU resource evidence, not GPU timing.

## Validation

Commands run from this worktree, with actual local **e2e mode none**:

```sh
npm test -- --configLoader runner --cache=false tests/unit/biomeFloorVariety.test.ts tests/unit/beebeIsolation.test.ts
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
npx prettier --check tests/unit/biomeFloorVariety.test.ts plan/progress/3770-S-verify-challenger-fade.md
git diff --check
```

- Focused capabilities: **exit 0, two files / 25 tests passed** (22 existing
  cases, strengthened table plus three added custom-config cases).
- Required gates: **exit 1, `FAIL gates (e2e=none)`**. Config bundling,
  content validation, build (including TypeScript), unit, attribution and
  repository Prettier stages pass. Full units: **192 files passed, 4,151 tests
  passed, four existing expected failures** (4,155 total; 591.49 seconds).
  Python reports **162 passed / five failed, 167 total**:
  four `test_ci_build_manifest` checks fail with `spawnSync git EPERM` while
  writing fixture manifests (`both_bases_survive_copy_and_verify_all_provenance_fields`,
  `every_manifest_mismatch_is_rejected`,
  `missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `symlinks_missing_public_data_and_manifest_overwrite_are_rejected`);
  `test_golden_tooling` fails its partial-set comparison with
  `SyntaxError: Unexpected end of JSON input`. These match the independent
  3730–3750 reports; they are tooling/environment failures outside this fade
  contract, not evidence of a terrain regression. No tooling correction is
  attempted within this ownership.
- Final owned-file Prettier and `git diff --check` pass. HEAD remains the audited
  SHA; only the two owned files differ. Snapshots are unchanged.

Retained ignored logs: `.cache/3770-audit/{focused,gates,format}.log`; full gate
stage logs: `.cache/runs/20261024-100356-16-MRcFOC/`. No browser stages ran.
Historical task-wrapper smoke/PASS summaries are not this command's outcome;
the actual local required command failed as recorded above.

Snapshot comparison diagnostics initially failed because Vitest snapshots contain
trailing commas (Python JSON parser), then because Node `execFileSync('git', …)`
reported `spawnSync git EPERM`. Exporting snapshots with shell git and parsing
them using Node's VM completed successfully. No snapshot rebaseline or tooling
change was used to bypass those errors.

## Simplicity and limits

Runtime complexity is unchanged; one existing table covers the missing supported
contract. No settings, UI, shared site branches, guidance or layout are added.
The audit supports correct, simple and honest numeric propagation without
changing exploration/reward behavior, real GMRT data, the 13 identities or five
hero set pieces, scanning, Journal, life, input, accessibility or Arcade default.

CPU construction and shader-hook binding do **not** prove GPU output, visual
readability/beauty, smooth rendered fading, performance, touch layout, unaided
journeys, physical-phone behavior or hosted CI. Those judgments remain with
Claude/owner. No browser, game render, screenshot or WebGL context was used.
No failing-before/passing-after production fix is claimed. No merge, push, tag
or hosted workflow dispatch.
