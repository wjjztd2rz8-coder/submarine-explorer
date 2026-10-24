# 3690 — S-bughunt: depth, pressure and hull boundaries

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**. Audited checkout: `54c6c9df62ed70b82c6d01223470a604c3d66173`.

No supported-path production defect reproduced. Ten missing boundary cases extend
the existing depth/hull capability, `tests/unit/uiHud.test.ts`; production is
read-only. Direct nonfinite injection into trusted physics/HUD APIs remains
unguarded, reproduced below as a report-only limitation. There is no product
failing-before/passing-after claim.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md, DIRECTOR Backlog, seven simplicity rules and rubric;
the topmost targeted review and newest dated comprehensive review (2026-10-24
early); OVERNIGHT-LOG through run 110; launched 3670–3690 briefs; 3580–3600 final
reports/results; related F-BUGHUNT-3, F-BUGHUNT-4 and S-resolve progress evidence;
and the finished, uncollected 3640–3660 progress notes. Older result wrappers'
PASS labels conflict with embedded final reports of failed gates; neither is
validation for this SHA.

Pinned the initially clean checkout and inspected every registered worktree's
HEAD, status, diff statistics and committed/uncommitted changed paths. Held
2980/3050 collision changes, 3310 journeys, 3320 full e2e, 3340 touch audit and
3380 CI evidence remain untouched. Finished 3640/3650 own notes only; 3660 owns
missionRouter tests and its note. Concurrent 3670 owns audioLifecycle; 3680 owns
settings persistence. None overlaps uiHud. Rechecked local SHA/status and the
concurrent worktree diffs immediately before editing.

The brief's 3580–3600 uncollected-worktree description is stale: run 106 records
their collection/removal, and their changes are already on the pinned checkout.
No patches were collected, copied or required from another worktree. No existing
audit was found for this exact input-to-depth/hull boundary slice.

## Existing production guards and capability coverage

All links refer to this checkout. Existing assertions and tolerances are retained.

| Contract                                                                                         | Production evidence                                                                                                                                                                                                           | Existing capability evidence                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL depth is positive metres; invalid/nonpositive requests fall back                             | [boot.ts:91](../../src/app/boot.ts#L91) checks finite and positive; [Spawn.ts:439](../../src/game/Spawn.ts#L439) independently rejects invalid depth requests and clamps finite requests between surface and seabed clearance | [gameSpawn.test.ts:132](../../tests/unit/gameSpawn.test.ts#L132) covers ordinary requested depth, too deep, too shallow, shallow/no-deep-cell and mid-water starts; invalid/nonfinite requests lacked explicit coverage                                                                 |
| Surface, aground and seabed constraint ordering                                                  | [Submarine.ts:361](../../src/sub/Submarine.ts#L361), [floorFor:414](../../src/sub/Submarine.ts#L414) relax clearance before pushing a hull out of shallow water, then apply surface ceiling                                   | [subFixS.test.ts:31](../../tests/unit/subFixS.test.ts#L31) covers -6/-18 m seabeds, deep floor/ceiling and floor continuity; [Submarine.test.ts:174](../../tests/unit/Submarine.test.ts#L174) covers flat/sloped seabed and altitude                                                    |
| Fitted rating is safe at initial spawn, independent of optional props                            | [submarine system:33](../../src/app/systems/submarine.ts#L33) fits the depth-appropriate hull before clamping spawn to ratedDepth + radius                                                                                    | [gameSpawn.test.ts:23](../../tests/unit/gameSpawn.test.ts#L23) covers hull choice, exact rating and Challenger soft-margin fallback; S-resolve documents retaining fitted hull on live handling changes                                                                                 |
| Pressure load is zero through rated depth, rises to crush depth, then clamps                     | [Submarine.ts:395](../../src/sub/Submarine.ts#L395) returns zero at/above rating; [getState:446](../../src/sub/Submarine.ts#L446) clamps crush ratio to [0,1], rated ratio to nonnegative and warns strictly beyond rating    | [Submarine.test.ts:149](../../tests/unit/Submarine.test.ts#L149) and [subFeel.test.ts:217](../../tests/unit/subFeel.test.ts#L217) cover warning before failure, actual breach, blow ascent/control recovery and class selection; exact named-hull rating edges lacked explicit coverage |
| Impact stress reflects closing speed and decays                                                  | [Submarine.ts:421](../../src/sub/Submarine.ts#L421) uses into-normal velocity; [stress decay:383](../../src/sub/Submarine.ts#L383)                                                                                            | [subFeel.test.ts:185](../../tests/unit/subFeel.test.ts#L185) covers strong impact, half-life decay and gentle grazing. Intentional collision/overdepth stress remains current policy                                                                                                    |
| Depth is displayed as nonnegative metres; surface is labelled; warning rules preserve inspection | [HUD.ts:59](../../src/ui/HUD.ts#L59), [HUD.ts:73](../../src/ui/HUD.ts#L73)                                                                                                                                                    | Existing [uiHud.test.ts:26](../../tests/unit/uiHud.test.ts#L26) covers above-water, -8/-9 m transition, ordinary deep value and numeric parsing; seabed cases retain static and time-to-contact policies                                                                                |
| Hull gauge has visibility hysteresis and bounded fill/vignette for valid state                   | [HullGauge.ts:15](../../src/ui/HullGauge.ts#L15), [update:46](../../src/ui/HullGauge.ts#L46)                                                                                                                                  | [guidance.test.ts:970](../../tests/unit/guidance.test.ts#L970) covers quiet routine depth and hysteresis; DOM/style output was inspected read-only, not rendered                                                                                                                        |
| Untrusted terrain cannot supply nonfinite depths                                                 | [TileLoader.ts:62](../../src/world/TileLoader.ts#L62) validates finite metadata/extrema and positive cell sizes; [validateHeights:98](../../src/world/TileLoader.ts#L98) rejects nonfinite float32 samples                    | [TileLoader.test.ts:228](../../tests/unit/TileLoader.test.ts#L228) covers malformed metadata and decode shape. Nonfinite sample rejection is a source guard, not claimed as an existing explicit test                                                                                   |

Negative engine Y is the documented underwater coordinate convention, not invalid
depth. Negative external positive-metres depth requests are invalid and fall back.
Pressure here is a gameplay ratio/stress model, not a physical pressure-unit HUD.
The A/B/C crush margins are explicitly simulated tuning in
[submarine config:179](../../src/core/config/submarine.ts#L179).

Second source review followed other spawn inputs: [parseAtParam:17](../../src/world/props/Wiring.ts#L17)
rejects nonfinite coordinates/headings and out-of-range lat/lon before the
[props reset:92](../../src/app/systems/props.ts#L92). [parseMission:80](../../src/game/Mission.ts#L80)
uses finite-number validation and normalises a negative authored depth to a
positive magnitude; [missionCore.test.ts:178](../../tests/unit/missionCore.test.ts#L178)
already guards that sign-slip policy. [parsePois:82](../../src/game/Pois.ts#L82)
filters nonfinite numeric fields; [gamePois.test.ts:60](../../tests/unit/gamePois.test.ts#L60)
preserves its different, documented negative-elevation convention. These source
paths did not establish a supported route to the direct-NaN reproduction below.

## Test delta and findings

Only [uiHud.test.ts:36](../../tests/unit/uiHud.test.ts#L36) changes:

- Six cases feed NaN, both infinities, -1, -1000 and zero through spawnHeight,
  reset, a real 1/60 s physics tick and depth formatting. They require the normal
  fallback, finite depth/altitude/ratios/display number, zero stress and no breach
  or emergency blow. This joins existing guards at their public boundaries.
- Three named-hull cases require zero stress/no warning at exactly the operating
  rating and a warning with bounded, nonzero stress one metre below it. Existing
  full crush/ascent tests already cover failure, so they are not duplicated.
- One Class C case clamps Number.MAX_VALUE above a synthetic -10,931 m trench
  floor, steps physics and requires seabed clearance, a numeric deep HUD readout,
  operation below the rating and no pressure damage. This is a numeric boundary
  fixture; it does not certify the real terrain or change its data.

No historical assertions, budgets, expected-failure collisions or snapshots change.
No test was added for an unspecified fallback policy inside trusted low-level APIs.

### Report-only nonfinite injection reproduction

On the pinned SHA, a headless Vite SSR probe (no renderer, browser or WebGL) ran:

```ts
const terrain = {
  sampleHeight: () => -500,
  getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
};
const sub = new Submarine(DEFAULT_CONFIG.submarine, terrain);
sub.reset(0, NaN, 0);
sub.step(FROZEN_INPUT, 1 / 60);
const state = sub.getState();
// formatDepth(NaN, 8): "NaN m"
// state.depth, altitude, crushRatio and hullStress: NaN
// state.hullBreached: false
```

[reset:219](../../src/sub/Submarine.ts#L219) stores coordinates directly;
[clamp:479](../../src/sub/Submarine.ts#L479) does not handle NaN, and HUD formatting
assumes finite state. This falsifies an unconditional guarantee for arbitrary
direct API injection. No supported player path to this state was demonstrated:
URL depth and loaded terrain are guarded upstream. Do not equate NaN stress to
a demonstrated hull breach, or treat valid negative underwater coordinates as
corrupt input.

Smallest proposed hardening, if arbitrary invalid reset coordinates are intended
to be supported: reject nonfinite x/y/z/yaw before mutating reset state, retaining
the prior valid pose. A formatter-only `Number.isFinite(depthY)` check returning
an unavailable marker would hide "NaN m" but would not repair physics; the marker
and reset policy are unspecified and remain report-only. No source fix applied.

Probe setup: `node --input-type=module` with Vite createServer/ssrLoadModule. First
attempt (configFile false, middleware mode, watch null) exited 1: its default HMR
listener hit `listen EPERM` on port 24678 and dependency cache hit read-only
node_modules (`EROFS`). Corrected invocation used cacheDir
`.cache/depth-audit-vite`, middleware mode, watch null, hmr false, ws false and
optimizeDeps.noDiscovery true; it exited 0 with the output above. No browser or
game renderer was launched.

## Validation

Focused command, before and after adding cases:

```bash
npm test -- --configLoader runner --cache=false tests/unit/uiHud.test.ts tests/unit/Submarine.test.ts tests/unit/subFeel.test.ts tests/unit/subFixS.test.ts tests/unit/gameSpawn.test.ts tests/unit/TileLoader.test.ts tests/unit/guidance.test.ts
```

- Before: exit 0; **7 files / 234 tests passed**, 860 ms.
- After: exit 0; **7 files / 244 tests passed**, 1.05 s.
- `npx prettier --write tests/unit/uiHud.test.ts`: exit 0.
- `git diff --check`: exit 0.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`: **exit 1,
  `FAIL gates (e2e=none)`**. Config, strict content validation (13 sites, zero
  errors/warnings), TypeScript/production build, full units, attribution (14 asset
  files) and repository-wide Prettier **PASS**. Python **FAIL**, detailed below.
- Full units: **192 files passed; 4,142 passed / 4 existing expected failures
  (4,146 total)**, 702.66 s. The four collision cases remain untouched. These are
  actual gate-log results, not a wrapper summary.
- Final owned-file check:
  `npx prettier --check tests/unit/uiHud.test.ts plan/progress/3690-S-bughunt-depth-gauge-bounds.md`
  and `git diff --check`: exit 0.

Gate logs: `.cache/runs/20261024-045055-2-Mzmkpy/`. Python ran 167 tests in
11.956 s: **162 passed / 5 failed**. Four `test_ci_build_manifest` cases fail
with `spawnSync git EPERM`:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
The fifth is `test_golden_tooling`: its Node subtest “golden comparison refuses
partial sets, missing files and incompatible poses” receives empty child stdout
and fails JSON.parse with `Unexpected end of JSON input` at
`tools/tests/golden-manifest.test.mjs:151` (24/25 internal Node tests passed).
This matches the failures recorded by the finished 3640–3660 audits. The first
four demonstrate a subprocess permission block; this run does not establish the
fifth failure's underlying cause. Tooling remains out of scope. Smallest next
step: run the unchanged checks where child processes are permitted and capture
the golden child's status/stderr/stdout before proposing a correction. No tools
edits, retries, skips, timeout changes or assertion changes.

## Simplicity, rubric and limits

Runtime complexity and player behavior are unchanged. Ten cases extend one
existing capability, with no new abstraction, setting, guidance surface, site
branch or config mutation. Exact rating is quiet, intentional overrating warns,
and invalid external depth requests remain harmless. This protects predictable
exploration and honest depth reporting without altering rewards or factual site
content. No visual rubric scores are assigned.

Final review rechecked the unchanged audited SHA and exactly the two owned changed
paths. The test diff contains additions only; no supported regression required a
production fix and no failing-before/passing-after product result is claimed.

Actual local e2e mode is **none**. No hosted CI, GPU/WebGL, game rendering,
screenshots, unaided journeys, touch layout, manual listening or real-phone
performance validation. Production, tooling, DIRECTOR, shared fixtures, authored
data, geometry, snapshots and other worktrees remain read-only. No merge, push,
tag or hosted workflow dispatch.
