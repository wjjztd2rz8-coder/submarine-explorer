# S-verify: frame clock blur/focus audit

Serves DIRECTOR Backlog 9 (`S-verify / S-bughunt`). No push.

## Plan

1. Round 1: trace blur/focus through frame clocks, Pause/debrief, Scanner,
   quality sampling and touch input. Extend existing capability specs only.
2. Round 2: challenge repeated transitions, fractional physics recovery,
   active quality samples and teardown; fix only a demonstrated defect.
3. Run focused specs and the canonical gates; record evidence and limits.

## Progress

- Read `plan/DIRECTOR.md` and `CONTRIBUTING-AGENTS.md`; worktree started clean.
- Round 1: no production defect demonstrated. The loop uses one boolean reset,
  so multiple events before a RAF coalesce. An event separated by a RAF resets
  its own interrupted interval. `wasFrozen` excludes the first interval after
  Pause/debrief closes. `Time.discardSteps()` prevents fractional backlog.
  Accumulated mission/dive totals never reset. Visible unfocused RAFs after
  the transition retain the existing active-play policy; blur is not a modal.
- Extended `appSystems.test.ts` to use the real shell freeze gate, exercise
  repeated visible blur/focus pairs in Pause and free-dive debrief, and compare
  exact mission/dive totals after each active interval. Repeated touch-mode
  pairs recover quality sampling on the following active frames, including
  actual dynamic-resolution reduction under load. Listener removal checks
  compare the registered callback identity.
- Extended `overlayFocus.test.ts`'s existing partial-scan table to keyboard and
  touch-held input, free-dive debrief and visible blur without visibility events.
  Touch pairs inside Pause/Journal/debrief preserve frozen scan progress, abort
  once, exclude the returning interval and permit exactly one saved completion
  on a new hold. Original keyboard boundary cases remain covered.
- Initial focused run: 247 tests passed across four specs.
- Round 2: traced mission debrief's `MissionRouter.frozen` getter and the free-dive
  debrief's shell gate; both feed the same input/clock gate. Mission update and
  discovery statistics consume `clockDt`, while Scanner consumes fixed steps.
  Rendering retains its separate clamped delta and elapsed time.
- Repeated-transition checks retain the original quality assertions before the
  active-load phase. Forty cycles each send three pairs before RAF, exclude
  the interrupted interval, then count exactly 50 ms of active play. Quality
  telemetry rises above 45 ms and dynamic resolution responds, proving active
  samples continue after the events.
- Extended the existing touch control release cases: focus after interruption
  cannot restore old axes or held Scan; stale captured pointers remain inert
  and fresh gestures still work. Verified loop listener removal uses the same
  registered callbacks. Runtime cleanup registers loop stop after system
  teardown, so its reverse-order disposal stops RAF/listeners first.
- Final focused suite: **404 passed across seven existing capability specs**:
  `appSystems`, `overlayFocus`, `quality`, `touchControlsAudit`, `missionRouter`,
  `gameScanner`, `subInput`. Command:
  `npm test -- --configLoader runner --cache=false <spec paths>`.
- Both audit rounds found no additional production defect. Production code is
  unchanged; only three existing capability specs and this note changed.

## Gates

Command: `GATES_CONFIG_MODE=writable PW_PORT=4359 bash tools/gates.sh`
(smoke + project-base). Logs: `.cache/runs/20261023-231745-2-PDbld2/`.

- Overall: **FAIL**, exit 1 (`e2e=smoke`).
- PASS config preparation, strict content validation, both production builds
  (root and project base), including TypeScript.
- PASS full unit suite: **192 specs, 4,094 passed tests and four existing
  expected failures** (4,098 total), 604.60 seconds. The collision expected
  failures remain intact.
- Python: **167 tests, five failures** matching the earlier lifecycle report:
  four manifest tests report `spawnSync git EPERM`; golden tooling reports
  `Unexpected end of JSON input` from comparison child stdout. No tooling or
  assertions were changed to bypass these failures.
- Browser smoke and project-base checks both failed before any browser test
  ran: `Process from config.webServer was not able to start. Exit code: 1`.
  The logs contain no deeper startup cause. This matches the earlier lifecycle
  audit's failure signature; no browser acceptance or fresh screenshots are
  claimed, and no tooling was changed to bypass the failure.
- PASS attribution and repository-wide formatting. Final changed-file
  formatting and `git diff --check` also pass.
- No push or commit; the gate failures and device-validation limits remain
  explicit for collection.

## Simplicity

Tests and this evidence note only. No source changes, abstractions, dependencies,
settings, UI, site branches or relaxed regression assertions.

## Acceptance limits

Controlled RAF timestamps and synthetic DOM events check the event contract.
Physical iOS Safari keyboard/share/address-bar behavior is not device-tested.
