# S-bughunt: current mode for delayed free-dive placement

Date: 2026-10-25. Backlog **7, S-verify / S-bughunt [Codex, standing]**.
Audited HEAD: `ddcaaac5c141473ba4823e85a675384f2e27d887` (initially clean).
Local e2e mode: **none**.

## Ownership and evidence

Before edits, read DIRECTOR's Backlog, simplicity rules and rubric, the newest
dated REVIEWS entry (2026-10-24 night; the 2026-10-23 late entry appears above it),
OVERNIGHT-LOG through run 133, CONTRIBUTING-AGENTS, the launched 3940/3950/3970
briefs, 3940/3950 result wrappers, and 3950's complete worktree note including
its retained D1 executable. Read the current props/modes/EffectiveSettings,
context, opening solver, Save, CameraRig, dailyBoot/firstMove/lifeDisposal
capabilities and the 3410/3420/3490 evidence. Read-only provenance checks:

```sh
git rev-parse HEAD
git status --short
git worktree list --porcelain
git worktree list --porcelain | sed -n 's/^worktree //p' | while IFS= read -r wt; do
  git -C "$wt" status --short
  git -C "$wt" diff --stat
done
git -C /home/vijay/subexp-wt/3940-S-resolve-pure-settings diff -- src/game/EffectiveSettings.ts
git diff main -- src/app/systems/props.ts tests/unit/dailyBoot.test.ts
```

At the initial check, main and this checkout shared the audited SHA, with no collected D1 fix. No other
registered worktree changes either owned code/test file. 3950 owns only its
uncollected report; its result says one confirmed defect and no fix. Its retained
baseline is this same SHA. 3940 has uncollected EffectiveSettings/S-resolve edits
and a new effectiveSettings capability; none is imported or required here.
3930 retains its coral note; 2980/3050 collision diffs, 3310 journeys, 3320,
3340 touch, 3380 and 3970/3980 remain untouched. The 3970 brief explicitly owns
only its independent life-motion report. Rechecked main/3940/3950 ownership and
the unchanged production diff immediately before the one-line correction.

3950's result wrapper advertises smoke/gates PASS; its own note reports scoped
headless commands and no full gate or visual claim. Those wrapper labels are
not validation of this correction. The note was read directly at
`/home/vijay/subexp-wt/3950-S-bughunt-settings-apply/plan/progress/3950-S-bughunt-settings-apply.md`;
its package was neither copied nor collected.

## Reproduction and correction

Extended only the existing dailyBoot capability, keeping its existing three
tests and IO/renderer mocks. The reduced fixture runs four placements total:
Arcade → Realistic and Realistic → Arcade with props pending, each compared to
a fresh placement in the selected mode. It uses real Save, modesSystem's live
subscription, effective resolution, Submarine, CameraRig and DeepOpeningSpawn /
Spawn, with shipped Lost City metadata and unchanged opening overrides.
Only optional prop IO, hero mesh/collision and ancillary UI consumers are mocked.
The synthetic hero has local bounds `(-5,0,-5)` to `(5,30,5)`, sits at `(0,-800,0)`
on flat ground `y=-800`; Class B starts at `(0,-750,0)`. Props.load waits on an
explicit promise. The mode changes while paused, before resolving that promise.
No game rendering or WebGL context is constructed by the new cases.

The comparison includes exact numerical sub position/yaw/pitch, camera
position/quaternion and chase radius. Fresh controls assert the established
38/44 m horizontal ranges and 66/97.6933979345585 m radii. Zoom then reset/snap
checks installed chase defaults and offsets. Another real saved mode switch
after completion must leave the settled pose and camera state unchanged.

Before changing production, the new comparisons failed in both directions:

| Pending switch     | Baseline range / chase radius | Fresh selected-mode control |
| ------------------ | ----------------------------- | --------------------------- |
| Arcade → Realistic | 38 / 66 m                     | 44 / 97.6933979345585 m     |
| Realistic → Arcade | 44 / 97.6933979345585 m       | 38 / 66 m                   |

Both fixtures also observed `y=-778`, pitch `0`, and yaw
`-1.3962634015954638`; the full camera and position differences are retained in
`/tmp/live-mode-placement/before.log`.

The production correction changes only the completion-time argument from
`ctx.settings.gameplayMode` to `ctx.save.get().gameplayMode`. context explicitly
documents settings as a boot snapshot. Current EffectiveSettings has a resolved
current **water** mode but no selected gameplay-mode field with this contract;
speedName or Custom's base preset is not an equivalent selector. The existing
resolver and current `ctx.effective.camera` read remain intact. No config
mutation, new field, listener, cache, resolver, policy or site branch is added.
The solver still selects `authored.modes[gameplayMode]`, so Custom keeps its
existing authored fallback, rather than being coerced to its remembered preset.
The existing `arcadeLoadout.test.ts` Lost City free-dive cases directly check the
opening and installed reset radius in Arcade, Realistic and Custom; the full
unit gate passes those unchanged cases as well.

3410/3420/3490 protections remain intact: the disposed check runs first;
Home/mission/at/poi/depth exclusions and the `<2 m` displacement guard are
unchanged; actual placement still calls reanchorFirstMove immediately after
sub.reset, and camera default/snap ordering is unchanged. No settled-dive mode
listener or new reset path exists. Existing firstMove guards retain partial
movement, learned movement, no-reset depth probes, mission readiness and restart
coverage across all 13 sites and both modes. Existing props-loader protects
late completion after disposal; lifeDisposal protects pending/loaded life
teardown and restoration of species scan reach after mode switching.

## Actual validation

All commands run from this checkout with installed tooling; logs below are
local process results, separate from any orchestrator/wrapper status.

```sh
node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/dailyBoot.test.ts
```

Before production edits: exit **1**, **2 failed / 3 passed**, 654 ms.
Both failures are exact fresh-selected-mode comparisons; all fresh-value,
reset-default and settled-switch assertions completed. Log:
`/tmp/live-mode-placement/before.log`.

```sh
node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/dailyBoot.test.ts tests/unit/firstMove.test.ts tests/unit/lifeDisposal.test.ts tests/unit/f2-modes.test.ts tests/unit/modesExploration.test.ts
```

After correction: exit **0**, **5 files / 162 tests passed**, 49.48 s;
log `/tmp/live-mode-placement/focused.log`. This includes both new comparisons,
the complete firstMove and lifeDisposal capabilities and the current
f2-modes/modesExploration checks (including Custom and frozen-input
purity/no-compounding coverage).

```sh
npm run typecheck
```

Initial new-fixture check: exit **1**, two TS2683 diagnostics on the mock's
untyped `this`. Added `this: Props` to the owned test mock; subsequent check:
exit **0**, no diagnostics (`/tmp/live-mode-placement/typecheck-final.log`).
No production change beyond the single read was needed.

```sh
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Exit **1**, actual summary **FAIL gates (e2e=none)**. Aggregate log
`/tmp/live-mode-placement/gates.log`, per-gate logs
`.cache/runs/20261025-020824-18-uxbqa2/`:

| Gate        | Actual result                                                |
| ----------- | ------------------------------------------------------------ |
| config      | PASS                                                         |
| content     | PASS; all shipped sites report zero errors/warnings          |
| build       | PASS; TypeScript and production Vite bundle complete         |
| unit        | PASS; **192 files, 4229 passed / 4 expected fail**, 595.71 s |
| attribution | PASS                                                         |
| prettier    | PASS; repository check only, no unowned formatting           |
| python      | FAIL; **5 failures / 167 tests**, 9.709 s                    |

The four existing collision expected-failure cases remain unchanged. No e2e or
project-base browser gate ran. Four unchanged
`test_ci_build_manifest.py` cases fail with `spawnSync git EPERM` at
`tools/ci-build-manifest.mjs:11`; `test_golden_tooling` fails on
`Unexpected end of JSON input` at `tools/tests/golden-manifest.test.mjs:151`.
These match the previously documented 3490 sandbox/tooling failures and do not
exercise this TypeScript change. No tools, configuration or dependencies were
modified, no gate was retried, and no wrapper PASS status is substituted for
this local command's exit **1**.

Final owned-file checks:

```sh
node_modules/.bin/prettier --write src/app/systems/props.ts tests/unit/dailyBoot.test.ts plan/progress/3960-S-bughunt-live-mode-placement.md
node_modules/.bin/prettier --check src/app/systems/props.ts tests/unit/dailyBoot.test.ts plan/progress/3960-S-bughunt-live-mode-placement.md
git diff --check
git diff --no-index --check /dev/null plan/progress/3960-S-bughunt-live-mode-placement.md
git rev-parse HEAD
git status --short
```

Owned-file format write/check: exit **0**; all matched files formatted.
`git diff --check`: exit **0**, no diagnostics. The additional no-index check of
the untracked note: exit **1**, no whitespace diagnostics (new-file difference).
HEAD remains the audited SHA; status lists only the two owned code/test files
and this new note. A final registered-worktree check finds owned code/test
diffs only in this worktree. Main advanced independently to
`5096924e85b64fa6d90cebe40c149f0ecedf8c13` (Run 134 log); the diff from the
audited SHA for props.ts and dailyBoot.test.ts is empty. No D1 repair was
collected while this package ran; no rebase or other worktree write occurred.

## Simplicity, rubric and limits

Net simpler: replace one stale read with an existing current source, adding no
runtime machinery. Extend one existing capability with two behavioral cases;
no audit-wide boot matrix, new spec, setting, UI/guidance surface, layout patch,
save schema, dependency, data edit, tolerance change or package number in code.
Preserve the resolved-settings contract and Arcade default. Correct selection
keeps exploration consistent with the chosen mode; honest evidence is numerical
and explicitly bounded. Real GMRT terrain, all 13 site identities, five hero
set pieces, scanning, Journal, marine life, input and accessibility are untouched.

The synthetic terrain/prop boundary isolates scheduling and does not establish
real-world load frequency, rendered appearance, camera composition, GPU cost,
unaided journeys, touch layout or physical-phone performance. Readability,
beauty and Phone-OK judgement remain with Claude/owner; no visual or rewardingness
score is claimed. No browser, screenshots, local e2e, merge, push, tag or hosted
workflow action. Ownership stays limited to props.ts, dailyBoot.test.ts and this
note; no worktree/package collection or dependency on 3940.
