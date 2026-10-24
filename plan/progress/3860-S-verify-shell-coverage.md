# 3860 — S-bughunt: shell coverage audit

Audited SHA: `50bc6ef90efc2be53d9a03d1b4639dbb011bbb2a`, initially clean.
Standing item: **S-verify / S-bughunt [Codex]**, specifically **S-bughunt**.
The brief calls this Backlog 9; at this SHA its source ordinal is 7. Stable
item IDs determine scope. Only this progress note changes; production and
all tests remain read-only.

## Round 1: provenance and ownership

Read DIRECTOR's Backlog, simplicity rules and rubric; the newest dated
[afternoon review](../REVIEWS.md#2026-10-24-afternoon-comprehensive-review-claude-alone-golden-2026-10-24-165922)
(the older Oct 23 targeted entry precedes it in the file); OVERNIGHT through
[run 122](../OVERNIGHT-LOG.md#2026-10-24-1536-cdt-headless-run-122-claude-collection--ci-fix);
CONTRIBUTING-AGENTS; launched shell/scatter/CI briefs and 3820's result;
[3820's detailed note](3820-R-shell-journey-timing.md),
[3030's separate offline-shell audit](3030-S-verify-lazy-shell-cache.md) and
[3720's pause/resume audit](3720-S-bughunt-pause-resume-clock.md).

`git show 50bc6ef9 -- tests/e2e/d-shell.spec.ts` establishes that 3820's
cheaper journey is already collected in the pinned checkout. Run 122 records
the director's local 5/5 shell result; that historical report is not execution
evidence from this audit. Its wrapper smoke/base PASS likewise does not prove
hosted full-suite success or journey timing. No browser execution is authorized
here.

Inspected registered worktree statuses, tracked diff summaries/path sets and
relevant e2e diffs before editing, then rechecked ownership. Held 2980/3050
collision patches, 3310's committed journey extension, 3320's report, 3340's
touch inventory and 3380's CI report remain with their owners. None supplies
evidence needed by this map. Concurrent scatter-contract 3860, scatter-cost
3870 and CI 3880 use different notes/specs; their pending DIRECTOR formatting
patches are not needed at this SHA. No other registered worktree modifies
`d-shell.spec.ts`, `settings.spec.ts` or `f-title-scene.spec.ts` relative to its
own HEAD. No held patch was copied or collected.

At the pre-edit recheck, main had advanced only to `c1162a11` (run 123 log);
`git diff --name-only 50bc6ef9 c1162a11` lists only OVERNIGHT-LOG. This worktree
remains pinned to the audited SHA.

## Round 2: existing capability map and decision

The following guards are committed at the audited SHA. E2e entries are source
citations, not claims that browser tests ran locally.

| Supported contract                                                                    | Existing capability guards                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home creates no dive tile/simulation; selected load stays pending until ready         | [d-shell:145](../../tests/e2e/d-shell.spec.ts#L145) checks absent dive resources before/after held input; [d-shell:290](../../tests/e2e/d-shell.spec.ts#L290) holds the tile response and checks loading, readiness and no submarine. Headless [startupLifecycle:59](../../tests/unit/startupLifecycle.test.ts#L59), [:469](../../tests/unit/startupLifecycle.test.ts#L469) and [:487](../../tests/unit/startupLifecycle.test.ts#L487) cover no loads/factory calls and deferred initialization/readiness.                                                                                                                                               |
| Home menu order, default Arcade, selected-site and globe-pin routing                  | [d-shell:92](../../tests/e2e/d-shell.spec.ts#L92) retains action/radio order, Arcade default, site labels and mission URL; [:279](../../tests/e2e/d-shell.spec.ts#L279) checks keyboard pin activation. [homeFocus:163](../../tests/unit/homeFocus.test.ts#L163) checks pending/known/removed saved destinations, mission-start timing, differing mission/tile IDs, stale catalogue resolution and enabled Dive focus/action; [overlayFocus:286](../../tests/unit/overlayFocus.test.ts#L286) guards authored row/Tab/activation order.                                                                                                                   |
| Direct URLs bypass Home; site chooser closes to its opener                            | [d-shell:243](../../tests/e2e/d-shell.spec.ts#L243) retains five URL probes, chooser focus containment and Escape return. [startupLifecycle:96](../../tests/unit/startupLifecycle.test.ts#L96) guards direct mission/free-dive routes; [:712](../../tests/unit/startupLifecycle.test.ts#L712) guards boot's Home/dive boundary; [overlayFocus:1995](../../tests/unit/overlayFocus.test.ts#L1995) checks chooser Escape beneath Settings.                                                                                                                                                                                                                 |
| Pause freezes held thrust; Objectives returns to Pause before resuming                | [d-shell:206](../../tests/e2e/d-shell.spec.ts#L206) checks exact pose equality with two required frame callbacks **and the retained 400 ms minimum**, objective count/hint, Pause/dive/Home states and Quit URL. [appSystems:82](../../tests/unit/appSystems.test.ts#L82) checks real loop freeze/resume accounting; [shellEscape:91](../../tests/unit/shellEscape.test.ts#L91) checks Escape ownership and cleanup; [overlayFocus:1995](../../tests/unit/overlayFocus.test.ts#L1995) checks nested pause views.                                                                                                                                         |
| Pause Tab wraps in both directions; Settings/Journal own their keys and restore focus | [d-shell:215](../../tests/e2e/d-shell.spec.ts#L215) explicitly wraps Quit → Resume → Quit. Removed Settings detour is covered by [settings:165](../../tests/e2e/settings.spec.ts#L165) and [:385](../../tests/e2e/settings.spec.ts#L385), including keyboard activation, nested Escape and opener focus. Headless [overlayFocus:422](../../tests/unit/overlayFocus.test.ts#L422), [:459](../../tests/unit/overlayFocus.test.ts#L459), [:1097](../../tests/unit/overlayFocus.test.ts#L1097) and [:1130](../../tests/unit/overlayFocus.test.ts#L1130) guard top ownership, forward/backward wrapping, touch/Escape dismissal and gamepad Journal behavior. |
| Quit freezes the submarine and Dive re-enters the last mission                        | Removed duplicate remains in [f-title-scene:284](../../tests/e2e/f-title-scene.spec.ts#L284): exact pose equality under held thrust over eight callbacks/500 ms, stripped route params, preserved tier, focused Dive and last-mission re-entry. [homeFocus:177](../../tests/unit/homeFocus.test.ts#L177) covers saved destination across repeated state changes; [appSystems:266](../../tests/unit/appSystems.test.ts#L266) proves held keys are cleared on Pause/Home and old listeners cannot affect re-entry.                                                                                                                                         |
| Repeated Home/dive lifetimes leave one control/modal owner and release listeners      | [d-shell:9](../../tests/e2e/d-shell.spec.ts#L9) keeps one HUD/touch/Home tree and checks zero stale throttle followed by working fresh input. [startupLifecycle:433](../../tests/unit/startupLifecycle.test.ts#L433) covers three navigation cycles with one loop and full disposal; [overlayFocus:2534](../../tests/unit/overlayFocus.test.ts#L2534) covers three shell lifetimes, controls focus, zero timers/DOM/listeners after disposal; [:3139](../../tests/unit/overlayFocus.test.ts#L3139) covers shell/Globe teardown.                                                                                                                          |

Production matches these contracts: [shell.ts:49](../../src/app/systems/shell.ts#L49)
gates frozen/blocked state; [:120](../../src/app/systems/shell.ts#L120) constructs
Pause actions including Quit; [:178](../../src/app/systems/shell.ts#L178) updates
shell state; [:270](../../src/app/systems/shell.ts#L270) handles unowned Escape.
[PauseMenu.ts:123](../../src/ui/PauseMenu.ts#L123) returns from detail views before
resuming. The shared [frame helper](../../tests/e2e/helpers/frames.ts#L4)
requires both callback count and elapsed minimum; reducing the count did not
remove the pause observation window.

**Finding:** no materially missing supported contract or reproduced shell
regression. Keep the existing capability specs unchanged. Diagnostic screenshots
and the larger viewport removed by 3820 were not functional acceptance guards;
visual coverage/quality is outside this audit. No failing-before/passing-after
claim applies. The existing 90/240 s policies, all assertions, tolerances,
budgets, snapshots, retries and skips remain unchanged.

## Validation

Focused existing headless capabilities:

```bash
npm test -- --configLoader runner --cache=false tests/unit/shellEscape.test.ts tests/unit/homeFocus.test.ts tests/unit/overlayFocus.test.ts tests/unit/appSystems.test.ts tests/unit/startupLifecycle.test.ts tests/unit/settingsSave.test.ts
```

**Exit 0: 6 files / 255 tests passed**, 2.20 s. Log:
`/tmp/3860-shell-focused.log`. DOM/event/RAF/renderer doubles are used; no
browser or WebGL context was created.

Required command:

```bash
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

**Interrupted, exit 130**: full unit execution remained at its startup banner
for over two minutes, with no test results, before Ctrl-C. No aggregate gate
PASS/FAIL summary was reached. Log: `/tmp/3860-shell-gates.log`; detailed logs:
`.cache/runs/20261024-154602-3-ziqwFM/`.

| Stage                  | Actual outcome                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| config                 | PASS                                                              |
| Python                 | FAIL: 167 tests, five failures, 10.123 s (162 passed)             |
| content                | PASS: all 13 sites                                                |
| build                  | PASS: TypeScript and Vite production bundling                     |
| unit                   | Incomplete: startup banner only; no full-suite result             |
| e2e / e2e-base         | Not run: requested mode none                                      |
| attribution / Prettier | Not reached by this gate invocation; separate checks below passed |

Four `test_ci_build_manifest` failures report `spawnSync git EPERM`:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail` and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden_tooling` fails its nested comparison case, “golden comparison
refuses partial sets, missing files and incompatible poses”, with
`Unexpected end of JSON input` at `tools/tests/golden-manifest.test.mjs:151`;
the nested suite reports 24/25 passing. The underlying reason for that empty
child output is not established here. These signatures and the full-unit
startup stall also appear in the committed 3820/3720 notes; they are not shell
regression evidence or successful checks hidden by a wrapper label.

Smallest follow-up: run the unchanged failing tooling/full unit command where
child-process execution works, then inspect the golden child status/stderr
before proposing a correction. No tool, production or assertion changes are
authorized by this shell audit.

Supplemental commands:

```bash
npx playwright test tests/e2e/d-shell.spec.ts --list
python3 tools/check_attribution.py && npx prettier --check .
npx prettier --write plan/progress/3860-S-verify-shell-coverage.md
npx prettier --check plan/progress/3860-S-verify-shell-coverage.md
git diff --check
```

- Playwright discovery: **exit 0**, five tests in one file; no server/browser
  launched and no e2e test executed.
- Attribution and repository-wide Prettier: **exit 0**, 14 assets attributed;
  all matched files formatted. These are separate checks, not completion of
  the interrupted gate invocation.
- Owned-note formatting/check and whitespace check: **exit 0**. Local citation
  targets/line bounds checked with Python: **exit 0**.
- Actual local e2e mode: **none**. No failing-before/passing-after evidence.

## Simplicity, rubric and limits

Evidence note only: no redundant test or runtime complexity added, no UI,
guidance, settings, site branches, configuration mutation, dependency or schema
changes. Existing guards protect predictable input, accessible focus and the
exploration/reward loop. Arcade, GMRT terrain, 13 site identities, five hero
set pieces, scanning, Journal and marine life remain untouched.

No game rendering, browser launch, WebGL context, screenshots or pixel
acceptance. No hosted CI, journey duration, GPU, unaided journey, visual
readability/beauty, touch layout or real-phone performance validation claimed.
No merge, push, tag, workflow dispatch or other-worktree mutation.
