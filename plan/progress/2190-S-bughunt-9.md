# S-bughunt-9

Scope: audit save/load corruption and migration, pause/resume and phone rotation,
multi-touch cancellation, and Journal/debrief lifecycle edges. No visual tuning.

## Plan and progress

- Read existing persistence, input, shell/frame, Journal and debrief implementations
  and capability coverage. Existing suites already cover hostile storage,
  future-version protection, migration round trips, clock catch-up, and common
  touch interruption cases.
- Reproduce remaining edge cases in existing capability tests before changing
  source. Fix confirmed defects minimally; record unconfirmed concerns separately.
- Run focused capability tests, then `tools/gates.sh`; report actual results and
  any environment limitations.

## Confirmed defects

All regressions extend existing capability files. No new spec, styling, visual
asset, tuning value, save key or storage schema was introduced.

| Bug                                                                                                                                                           | Minimal fix and regression                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hidden tabs still passed sampled gamepad actions into gameplay, despite clock suppression. The Journal's special gamepad close path also bypassed the freeze. | Include document visibility in the shell gate and suppress the Journal close exception while hidden. `appSystems.test.ts` checks neutral gameplay, stopped steps/clocks, visible recovery without replaying a held edge, and hidden Journal input. |
| A photo camera drag survived pause because the flight controls were already hidden, so the visibility-transition cleanup never ran.                           | Release touch gestures during blocked, non-photo frames. `touchControlsAudit.test.ts` checks uninterrupted photo dragging across frames, pause/resume rejecting the old finger, and a fresh gesture working.                                       |
| Rotation cleared finger tracking but retained drag/pinch deltas already queued before the next animation frame.                                               | Discard per-frame input on layout reset. Real `Input` regressions cover both resize and orientationchange, cleared look/zoom, rejection of stale moves and fresh input afterward. Touch DOM doubles now supply the existing `endFrame()` method.   |
| Quitting to Home with a pending scan made Home's Journal open that entry instead of the front page.                                                           | Ignore and consume automatic scan focus in Home mode while retaining explicit entry navigation. `journalGroups.test.ts` checks Home, returning to a dive, and explicitly opening an entry.                                                         |

The first three new tests failed before their source fixes (60 existing tests
passed): `/tmp/bughunt-before.log`. Both queued-rotation cases failed before their
fix (33 existing cases passed): `/tmp/bughunt-rotation-before.log`.

## Other audit results

- Reviewed settings and bindings legacy fallback, malformed JSON and version
  shapes, future-version protection, read denial versus write success, and
  discovery/progress/onboarding/Daily/photo persistence. No new save/load defect
  confirmed. Existing tests cover recovery, protected bytes, quota and reloads.
- Reviewed multi-finger scan holds, pointercancel/lostpointercapture, stale
  pointer completion, visibility/blur/rotation cleanup, overlay focus, Journal
  asynchronous focus ownership, resumed and aborted mission debriefs, free-dive
  summaries, and repeat opening. Existing regressions remain intact.
- Suspected but unconfirmed: no additional concrete defect retained. Real-phone
  OS cancellation and rotation event ordering still needs device validation;
  synthetic unit events cannot establish that browser behavior.

## Validation

- Focused capability run: **18 files / 431 tests passed**, including save/load,
  migration, Daily, discoveries, photo persistence, input, touch, shell/clock,
  Journal, debrief, mission routing/abort and overlay focus.
  Log: `/tmp/bughunt-capabilities.log`.
- Final affected capability run including both rotation cases: **4 files / 81
  tests passed**. Log: `/tmp/bughunt-final-focused.log`.
- Typecheck and direct production build passed after correcting a readonly
  property assignment in the new test fixture. Log: `/tmp/bughunt-build.log`.
- Initial `GATES_CONFIG_MODE=writable bash tools/gates.sh` hit the documented
  sandbox `spawnSync git EPERM` in four Python build-manifest cases; the default
  unit fork pool stalled and was stopped. The initial build caught the fixture
  type error mentioned above. Logs: `/tmp/bughunt-gates.log` and
  `.cache/runs/20261015-181258-27-aeXi11/`.
- Final `tools/gates.sh` completed using writable configuration mode and a
  shell-only npm wrapper appending `--pool=threads` to unit execution. Assertions,
  timeouts, gate definitions and repository configuration are unchanged.
  Log: `/tmp/bughunt-gates-final.log`; detailed logs:
  `.cache/runs/20261015-181454-3-nc5xhw/`.
- **PASS:** full unit gate, **191 files / 2,324 tests**, in 455.28 seconds.
- **PASS:** TypeScript and production builds at `/` and `/submarine-explorer/`,
  strict content validation, attribution, repository-wide Prettier, and
  `git diff --check`.
- **Environment failure:** Python **162/166 pass**; four unchanged build-manifest
  tests fail at `spawnSync git EPERM`.
- **Blocked before browser assertions:** root smoke and project-base Playwright
  gates fail to start their owned preview server. Direct preview reproduces
  `listen EPERM: operation not permitted 127.0.0.1:4373`.
  Log: `/tmp/bughunt-preview.log`. No browser or real-device pass is claimed.

Changes are uncommitted. Temporary direct-build output was removed after checks;
gate logs remain available at the paths above.
