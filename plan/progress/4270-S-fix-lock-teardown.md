# 4270 — S-fix-lock-teardown

DIRECTOR Backlog **5c**. Base SHA: `d0aa05723536518d258c98d1c48c8298a6af0e60`;
checkout initially clean. Read the 4240 note and retained
`/tmp/4240-lock-settlement/minimal.test.ts` reproduction.

## Change

The pointer system now retains its existing change/error subscriptions through
final disposal only while a pointer request is pending. A late change releases
this canvas's lock and removes both subscriptions before returning, without
updating disposed Input, hints or app state. A late error removes both
subscriptions. Promise completion/rejection also removes retained subscriptions;
the existing late-promise release guard remains. Settled disposal still removes
the listeners immediately.

Removed the synthetic promise around the legacy void return. That continuation
cannot establish completion, and must not remove pending observers if disposal
occurs before its microtask. Real promise returns retain their continuations.

Extended the existing pointer teardown capability in `overlayFocus.test.ts`:
real `SystemRunner` disposal, connected canvas, gesture-triggered void request,
microtask flush before disposal, late ownership/change, exactly one exit and
ownership cleared. The comment states the lock-leak regression it guards.
Additional rows cover disposal before that microtask, denial, and another
canvas's ownership. Both terminal subscriptions must be removed on each outcome;
later events must neither release again nor mutate disposed Input or app state.
The existing settled, pending keyboard and pending promise cases remain intact.
All new coverage uses the existing CPU DOM fixture; no rendering or new spec.

## Commands and outcomes

- Before the source fix:
  `npm test -- --configLoader runner --cache=false tests/unit/overlayFocus.test.ts -t 'pending legacy void request'`
  reproduced the defect: **1 failed / 2 passed**, with expected one exit versus
  zero. Log: `/tmp/4270-before.log`.
- After the first fix, focused pointer/input/system coverage passed **3 files /
  228 tests**. Review identified the pre-microtask disposal variant; removed the
  synthetic wrapper and added that row. The same command,
  `npm test -- --configLoader runner --cache=false tests/unit/overlayFocus.test.ts tests/unit/subInput.test.ts tests/unit/appSystems.test.ts`,
  then passed **3 files / 229 tests**. Log: `/tmp/4270-focused.log`.
- `GATES_CONFIG_MODE=writable PW_PORT=4270 bash tools/gates.sh`: initial build
  caught a test-fixture type mismatch because current DOM declarations only
  admit promise returns. Corrected the legacy stand-in with `Object.assign`;
  production/public types remain unchanged. Python also reported failures in
  unchanged tooling (four manifest tests hit `spawnSync git EPERM`; the golden
  subprocess test received incomplete JSON). Stopped this superseded run during
  its unresponsive full-unit phase (exit **130**). Log: `/tmp/4270-gates.log`;
  gate artifacts: `.cache/runs/20261025-181723-7-9wdthw/`.
- Final source/fixture validation:
  `npm test -- --configLoader runner --cache=false tests/unit/overlayFocus.test.ts tests/unit/subInput.test.ts tests/unit/appSystems.test.ts`
  exited **0**, **3 files / 229 tests passed**, including acquisition after a
  post-disposal microtask in both disposal timing rows. Log:
  `/tmp/4270-focused-final.log`. `npm run typecheck` exited **0**;
  log: `/tmp/4270-typecheck.log`.
- `GATES_CONFIG_MODE=writable PW_PORT=4271 bash tools/gates.sh` against the
  corrected files: **config, content and build passed**. Python repeated the
  same **5 failures / 167 tests** in unchanged tooling. Full Vitest produced
  only its startup banner and no result for approximately **six minutes**;
  interrupted the run at that point (exit **130**). Attribution, formatting and
  browser phases were not reached by this gate invocation. Log:
  `/tmp/4270-gates-final.log`; artifacts:
  `.cache/runs/20261025-181856-7-4Ws9T5/`. Full-unit acceptance remains
  unestablished; there is no passing aggregate-gates claim.
- Ran the remaining available checks separately:
  `python3 tools/check_attribution.py` exited **0** (14 assets attributed), and
  `node_modules/.bin/prettier --check .` exited **0**; log:
  `/tmp/4270-prettier.log`.
- `GATES_CONFIG_MODE=writable PW_PORT=4272 PW_OUTDIR=.cache/runs/20261025-181856-7-4Ws9T5/dist PW_REUSE_SERVER=0 timeout 120s npm run test:e2e -- tests/e2e/smoke.spec.ts --output=.cache/4270-test-results`
  exited **1** before browser tests because its preview server could not start.
  Direct `npm run preview -- --port 4272 --strictPort --outDir .cache/runs/20261025-181856-7-4Ws9T5/dist --configLoader runner`
  confirmed sandbox **`listen EPERM` on `127.0.0.1:4272`**, exit **1**. Logs:
  `/tmp/4270-smoke.log`, `/tmp/4270-preview.log`. No project-base browser run or
  visual/device acceptance is claimed.
- Formatted only the three owned files; their final Prettier check and
  `git diff --check` passed. Checked the new note separately with
  `git diff --no-index --check /dev/null plan/progress/4270-S-fix-lock-teardown.md`:
  no whitespace diagnostics (exit **1**, the no-index new-file difference).

## Simplicity assessment

One conditional lifetime for the two existing terminal listeners, using the
existing `Disposables` helper. No new polling, timer, registry, runtime, state
flag, dependency or public API. Removed the misleading void promise wrapper.
No on-screen element, setting, guidance, art, CSS/layout, per-site branch or
runtime config mutation. Arcade default and keyboard/pad/touch behavior are
unchanged. Only pointer lifecycle code, its existing capability spec and this
note are edited; `tools/` and `plan/DIRECTOR.md` are untouched. No merge or push.
