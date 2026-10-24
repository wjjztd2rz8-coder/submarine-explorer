# S-verify — optional scatter tint placement contract

DIRECTOR **S-verify / S-bughunt [Codex, standing]** (Backlog 9 at initial
audit, 7 after the formatting-only renumbering below), specifically
**S-verify**. Audited/current HEAD:
`38afe4991d121c6b6c295b6a47d27fd6c45eeffb`.
Implementation: `b06c9833edecbdd10915f61f1773b5cf45a211d6`;
exact parent/baseline: `60cb8a91de837931b48be2d0cb8ab19252ad4936`.
`git merge-base --is-ancestor b06c9833 HEAD` exits **0**. The two production
modules have no subsequent diff through the audited HEAD.

**No supported placement defect reproduced.** Rock RGB receives the authored
linear factors exactly once; soft life, non-colour instance fields and supported
per-cell ordering remain unchanged. Absent and identity tint agree. Production
and snapshots remain read-only; no correction is proposed.

## Intake and ownership

Read CONTRIBUTING-AGENTS, DIRECTOR Backlog/simplicity/rubric, the newest dated
REVIEWS entry (2026-10-24 afternoon, below the older leading targeted entry),
OVERNIGHT-LOG through run 121, the exact `b06c9833^..b06c9833` diff and
[V-lostcity-foot-2](V-lostcity-foot-2.md). Read the five prior reports below,
relevant launched briefs, available results, and finished 3820/3840/3850 notes.
No applicable AGENTS.md was found. Historical wrapper smoke/PASS summaries are
not this run's validation outcomes; 3470/3770 explicitly record failed local
headless gates despite those summaries. No 3560/3800 result file was present
under the main checkout's `.cache/codex`; their progress evidence was read.

Inspected all registered worktree HEADs, statuses, uncommitted/staged diff
statistics and branch changes since their common ancestor with the pin. No
other tree owns this multiplier comparison or changes the owned spec. Main
already holds uncollected DIRECTOR, d-shell, lifeSim and 3820/3840/3850 notes.
3820 owns its shell journey, 3840 life depth, 3850 scan rewards; 3870 owns
scatter costs and snapshot attribution (report only), 3880 hosted CI reporting.
Their patches were neither collected nor used. Held 2980/3050 collision work,
3310/3510 journeys, 3320 full e2e, 3340 touch, 3380 historical CI, parked Blue
Hole and owner-dependent Endurance remain untouched. Rechecked this checkout's
HEAD and ownership before editing; it was initially clean.

The initial audit changed only `tests/unit/biomeFloorVariety.test.ts` and this
note. The later user-authorized formatting repair also changes DIRECTOR, as
recorded below. Completed
Sonnet art remains closed, and all four historical collision expected failures
remain intact.

## Existing versus added coverage

| Existing evidence                                                                                             | Sufficient contract retained                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [2910](2910-S-verify-lostcity-scatter.md), [carbonate tier cases](../../tests/unit/beebeScatter.test.ts#L339) | Density-only per-kind streams; actual survey/plane support, finite buffers, range/capacity, two-cell processing, eviction/revisit and ground translation. Predates scatterTint. |
| [3470](3470-S-verify-blake-scatter.md)                                                                        | Earlier Blake palette-to-linear-instance colour propagation, soft palettes, component isolation and costs. Predates scatterTint.                                                |
| [3560](3560-S-verify-lostcity-foot-numerics.md)                                                               | Tower/foot palettes, terrain tint, shared builder effects, bounds and costs; a different input/consumer contract.                                                               |
| [3770](3770-S-verify-challenger-fade.md), `biomeFloorVariety` material tables                                 | Optional ripple fade fallback, shader-hook bindings and retained uniform ownership. It identifies Lost City's later biome hash without verifying scatterTint arithmetic.        |
| [3800](3800-S-bughunt-spawn-determinism.md)                                                                   | Pure cell order/replay and finite placement across shipped biomes; does not compare tint variants. Its independent rooted-life finding belongs to 3830/3840.                    |
| Existing [wreck-floor cases](../../tests/unit/biomeFloorVariety.test.ts#L130)                                 | Seed replay/difference, finite instances, sizing/embed, slopes and exclusions.                                                                                                  |
| Existing [scatter aggregate and Beebe guards](../../tests/unit/beebeScatter.test.ts#L68)                      | Geometry, matrices, colours/count snapshots and Beebe rock-finish isolation; aggregate baselines alone do not independently specify this new multiplier.                        |

Added **one** [supported behavioural case](../../tests/unit/biomeFloorVariety.test.ts#L23) to the existing floor capability spec.
It compares actual `placeCell` outputs rather than rebuilding palette conversion,
PRNG logic or placement formulas. All 23 existing cases and historical assertions
are preserved. No new spec, abstraction, snapshot or test policy.

## Paired input-to-instance evidence

Use the existing `flatGround` (`y=-700`, normal `[0,1,0]`, contains=true) and
`cell` options (64 m, density 1, rock thresholds 0.05/0.3, seed 7). A small
headless fixture probe selected cell **(1,-2)** because the authored sparse
rock-preferring sponges are absent in cells (0,0) and (-1,2). No scatter spec,
substrate acceptance, density or palette was altered to force population.
The selected shipped Lost City cell contains **17 boulders, 69 rubble,
14 dropstones and 3 sponges**. The test requires each kind to be nonempty,
without freezing those diagnostic counts as a new budget.

Three copies of that same biome differ only in optional tint: property absent,
identity `[1,1,1]`, or a copied authored `[0.62,0.9,0.9]` tuple. Every call uses
identical ground, seed, options and cell coordinates:

- Identity output equals absent output in full, preserving optional fallback.
- For every paired boulder/rubble/dropstone, RGB equals absent RGB multiplied
  by **[0.62,0.9,0.9]**, using exact numeric equality. Each base channel is
  positive, so omitted/double application cannot pass through zero channels.
  These are already-linear generated values; there is no second colour-space
  conversion or artistic clamp in the oracle.
- Every sponge instance equals its absent counterpart in full.
- Kind keys, per-kind lengths and every non-colour instance field match by
  index, including yaw and X/Z squash draws made after colour generation.
  This verifies the tint leaves the supported random stream and per-cell order
  intact; no new resident-buffer or arbitrary-route ordering policy is imposed.
- An untinted Titanic control brackets all Lost City calls. Its before/after
  instances agree, its earlier retained result is unchanged, and its dropstone
  output is nonempty. Generated RGB is finite in all five outputs.
- Serialized input values before/after agree, including the biome registry,
  all three copies, palettes, scatter specs and both authored/identity tint
  tuples. The registry's real tuple and the fixture's copied tuple are both
  included, so placement cannot silently mutate either.

The exact commit diff adds only the optional field, Lost City's tuple and the
[rock-material multiplication after `def.color`](../../src/world/scatter/ScatterPlacement.ts#L193). Its absent path retains the
parent's palette/random operations. No broader seed replay, cross-site census,
streaming/lifecycle matrix or mesh-cost diagnostic was added. Resource counts
and the two snapshot rebaselines belong to brief 3870; this note makes no new
claim about those outputs.

## Validation

Commands from this checkout:

```bash
npm test -- --configLoader runner --cache=false tests/unit/biomeFloorVariety.test.ts
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

- Focused before edit: **exit 0, 1 file / 23 tests passed**, **824 ms**;
  `/tmp/3860-focused-before.log`.
- Focused after edit: **exit 0, 1 file / 24 tests passed**, **837 ms**;
  `/tmp/3860-focused-after.log`.
- Required gates: **exit 1, `FAIL gates (e2e=none)`**. Config bundling,
  content validation, build (including TypeScript), unit and attribution stages
  **PASS**. Full units: **192 files / 4,181 passed + four existing expected
  failures (4,185 total)**, **665.33 s**. No new product/test failure.
- Python: **167 tests, 162 passed / five failed**, **10.449 s**. Four
  `test_ci_build_manifest.TestCiBuildManifest` cases fail while child Node
  processes attempt `spawnSync git` with **EPERM**, before manifest assertions:
  `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
  `test_golden.TestGolden.test_golden_tooling` fails its nested partial-set
  comparison at `tools/tests/golden-manifest.test.mjs:151`, where
  `JSON.parse(report.stdout)` receives empty output (`Unexpected end of JSON
input`); nested total **24 passed / one failed**. These match 3470/3770's
  tooling evidence. The golden child's empty-output cause remains unclassified;
  it is not attributed to scatter tint. No tooling fix or retry was attempted.
- Repository Prettier: **FAIL**, warning for **`plan/DIRECTOR.md` only**.
  This file is unowned and unchanged in this checkout; adjacent packages'
  uncollected formatting fixes were not used. The failure is reported without
  changing that file or formatter settings.
- Aggregate log: `/tmp/3860-gates.log`; detailed stage logs:
  `.cache/runs/20261024-152122-7-nnDRCN/`.
- At the initial audit handoff, `npx prettier --check tests/unit/biomeFloorVariety.test.ts
plan/progress/3860-S-verify-scatter-tint-contract.md`: **exit 0, PASS**.
  `git diff --check`: **exit 0, PASS**. `git status --short` lists only the
  two owned files. HEAD remains the audited SHA. No production, data,
  configuration, tooling, historical assertions or snapshots changed.

Actual local **e2e mode: none**. No wrapper PASS label replaces the actual
failed aggregate command. No further suite run was needed after recording these
results; only the owned documentation changed after the gate finished.

## Orchestrator follow-up: formatting repair

The user's follow-up explicitly authorizes fixing the reported gate root cause,
including the previously unowned `plan/DIRECTOR.md`. No other worktree's patch
was copied or collected. HEAD remains
`38afe4991d121c6b6c295b6a47d27fd6c45eeffb`.

The orchestrator ran `tools/gates.sh` outside this sandbox and supplied its
actual **`FAIL gates (e2e=smoke)`** summary. Python, content, build, unit,
smoke e2e, project-base e2e and attribution all **PASS**; only Prettier fails,
warning on DIRECTOR. Its retained formatter log is
`.cache/runs/20261024-153333-1235902-7oWOQv/prettier.log`. No browser test totals
were supplied, so none are inferred. These are orchestrator results, separate
from the failed local headless gate recorded above.

Cause: Backlog's ordered list jumps from 3 to 6 after completed items were
removed. Prettier requires consecutive markers. Ran:

```bash
npx prettier --write plan/DIRECTOR.md
npx prettier --write plan/progress/3860-S-verify-scatter-tint-contract.md
npx prettier --check .
git diff --check
```

Only Backlog list markers change: the old 6–13 become 4–11. A comparison
against `/tmp/3860-DIRECTOR-before-format.md`, ignoring only line-leading
ordered-list numbers, confirms byte-identical remaining text (**exit 0**).
Stable item IDs, priority order, prose and all test assertions are unchanged.
The formatting command and final repository-wide Prettier/diff checks **PASS,
exit 0**. The formatter configuration is unchanged.

Only DIRECTOR formatting and this note changed during the follow-up; the
verified tint test, production, data and snapshots remain unchanged. Final
status lists these three files: DIRECTOR, biomeFloorVariety and this note.
No full gate or browser rerun was performed after this documentation-only
repair. Local e2e mode remains **none**; the earlier smoke/project-base passes
belong to the orchestrator. Runtime complexity and the audit's validation
limits remain unchanged.

## Simplicity, rubric and limits

Runtime complexity is unchanged. One capability case covers the missing optional
input contract; no UI, guidance surface, layout patch, site branch, settings,
config mutation, dependency, save schema, budget or tolerance changes. Real
GMRT data, all 13 site identities, five hero sets, scanning, Journal, marine
life, keyboard/pad/touch, accessibility and Arcade default remain untouched.
Predictable placement/colour isolation supports simple exploration and rewards;
explicitly bounded evidence meets the honesty rubric.

This verifies CPU input-to-instance behaviour for shipped Lost City data and
one untinted control. It defines no validation policy for malformed custom
biomes and does not exhaust every seed/ground/cell. No browser, game rendering,
WebGL context, screenshots, visual readability/beauty, GPU acceptance, unaided
journeys, touch layout or physical-phone performance was exercised or inferred.
Those remain with Claude/owner. No merge, push, tag or hosted workflow action.
