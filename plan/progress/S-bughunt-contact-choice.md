# S-bughunt contact-choice

Scope: S-bughunt, Backlog 8; behavioral review of contact-choice merge `9e2cd8d`, following `J-contact-choice.md` and the existing guidance capability coverage. Reviewed observable text, target identity, priority and source withdrawal using deterministic Scanner/ScanOverlay/GuidanceSlot DOM fixtures. No visual acceptance claimed.

## Demonstrated regressions and fixes

1. **Result guidance was a frozen snapshot.** On touch, show a result beside an optional Memorial with Stern 300 m to port, then face Stern: the result still said `Stern · TURN 90° PORT` instead of `Stern · 300 m AHEAD`. A result created while completing the current objective also missed the next objective assigned afterward. Switching from desktop to touch during a result retained the Journal line. The same snapshot retained obsolete objective/input details after their source changed. Both NEW ENTRY and SCAN COMPLETE now refresh their detail from the current objective, input mode and bindings. The result keeps its title, original lifetime and priority age; active/interrupted scans and warnings retain priority.
2. **An in-range objective could request the wrong vertical action.** Put Memorial 5 m ahead and Stern 30 m ahead / 40 m above, inside Stern's 60 m scan radius but outside the facing cone. Memorial is the ready optional contact; its touch cue said `Stern · DIVE DEEPER`, sending the pilot away from Stern. The shared cue now uses the existing RISE/SINK TOWARD TARGET instructions when the objective is in scan range, and retains DIVE DEEPER for the minimum-depth case outside scan eligibility. Both contact and result cards use that cue.
3. **Being in range incorrectly suppressed a still-needed result cue.** After a wildlife result, leave Stern as the only contact, 50 m to starboard inside its 60 m radius but outside the scan cone. The result said OPEN JOURNAL despite Stern still needing a 90° turn. The cue now retires when the objective is the actual scan candidate, rather than merely the nearest contact in range. Facing Stern removes the cue again.

Before the initial source fix, the expanded guidance spec reported 7 failing cases / 27 passing cases: stale direction (first/repeat result), input-mode refresh (first/repeat), next-objective handoff, and vertical guidance above/below. The additional in-range/out-of-cone fixture then failed separately (OPEN JOURNAL instead of the objective turn). After the fixes, all 35 guidance cases pass.

## Regression coverage

Extended `tests/unit/guidance.test.ts`; no new package-specific spec. Covered:

- Optional contact beside a different objective; switching that contact into the objective without clearing the overlay; objective removal; bound desktop scan-key changes.
- A farther eligible objective winning the target name and scan prompt over a nearer optional contact.
- Leaving/re-entering range, removing idle/active targets, and withdrawing all guidance when both sources disappear.
- Result over an idle ready contact; scanning/interruption over the result; urgent warning over interruption; recovery after withdrawal; ready-contact return after the existing three-second result grace.
- First/repeat result direction changes, objective arrival/removal, next-objective assignment following real scanner completion, in-range objectives still needing aim, desktop/touch changes and Journal-key changes.
- Original result expiry despite repeated detail updates; one guidance slot. Existing suppression/reset capability cases also remain in place.

## Validation

- Focused existing capability checks: **114 tests passed across 5 files** (`guidance`, `touchControlsAudit`, `gameScanner`, `missionApproachWaypoint`, `missionApproachSystem`), using `npm test -- --configLoader runner --cache=false` with those paths. Final typecheck and production build passed (using the gate-generated native Vite config for the read-only dependency tree).
- `GATES_CONFIG_MODE=writable bash tools/gates.sh`: **overall exit 1**. PASS: config, content, root build, full unit suite (**192 files / 3,156 tests**, 518.75 s), attribution and repository-wide Prettier. FAIL: Python, root browser smoke and project-base browser checks (details below). The project-base build itself passed. Logs: `.cache/runs/20261017-211801-2-bJMqiN/`. Writable mode is the existing supported mode for the shared read-only dependency tree; no tooling/assertion/timeout changes.
- Existing browser capabilities `d-scan.spec.ts` and `d-input-hud.spec.ts`: **could not start the preview server**. Direct preview diagnosis: `listen EPERM: operation not permitted 127.0.0.1:4371`; no browser assertions ran.

## Deferred findings and scope

- Gate Python tooling: **161/166 outer tests passed, 5 failed**. Four build-manifest failures report the environment error `spawnSync git EPERM`; the fifth is an unrelated golden comparison tooling failure (`Unexpected end of JSON input` when parsing subprocess stdout), whose underlying cause was not established. These are outside scan guidance; no tooling changed.
- Both gate browser suites also stopped at preview-server startup, before any assertions. The separately attempted scan/input capabilities exposed the explicit `listen EPERM` error above.
- Browser/visual verification remains for an environment that permits the preview server and for Claude's visual review. No art, layout, CSS, wording redesign, extra surface, setting, site branch or config mutation. Existing guidance text stays in the same slot; no surface added or replaced.
- Home/site-picker density, Journal/photo/modal behavior, migration and legacy-retry star awards were not changed. No merge, push or tag; `tools/` and `plan/DIRECTOR.md` untouched.
