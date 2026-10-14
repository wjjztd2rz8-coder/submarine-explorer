# S-bughunt — save, input and teardown audit

Backlog item **S-bughunt [Codex]**, brief 1630. Non-visual work only; no capability cuts, new UI, settings, dependencies or site-specific branches. `plan/DIRECTOR.md` and `tools/` are unchanged.

## Confirmed defects fixed

- Failed storage reads could erase intact bindings, research, discoveries/Journal, Daily, photos and onboarding when writes still succeeded. Reads now distinguish storage failure from malformed JSON: unreadable keys remain protected; corrupt JSON still permits fresh work. Settings already had this guard. The seven-key matrix in `tests/unit/saveSoak.test.ts` reproduces the destructive write and checks byte-for-byte preservation, alongside existing corrupt/legacy/future-save assertions. Added Journal namespace migration/reload coverage for POIs, life, events, samples and secrets.
- Completing a Daily with a damaged but safe-integer maximum streak saved an unsafe counter, which loaded as an empty record. Saturate the increment, preserving its date and streak on reload (`tests/unit/daily.test.ts`).
- Focus loss cleared keys but left queued toggle actions, touch values and wheel deltas behind; disposal also retained sampled motion. One input clear operation now resets these values on blur, hidden-document visibility changes and disposal. Tests use real EventTarget listener dispatch plus the existing action injector.
- Held keyboard input resumed piloting after pause or Home, including keys pressed behind menus. Shell state changes and frozen frames now discard it; photo mode retains its camera controls. Gamepad press history remains intact so a held toggle does not fire again after pause. Existing input/system specs check keyboard/touch/pad combinations, opposing keys and release/repress behavior.
- Calling `Input.attach()` twice leaked the first listener set. Attachment is idempotent, and the input system now registers input and bus cleanup through `Disposables`. Re-entry tests prove the disposed input receives no subsequent key events while its replacement still works.
- Journal disposal left its anonymous media-query listener installed. The callback now has a stable identity and is removed. The existing Journal lifecycle spec dispatches a rotation event after disposal/recreation and checks that only the new Journal refreshes.

The first focused run against the original source reproduced 12 regression failures; after the fixes, those assertions pass. DOM doubles were extended only to model listener dispatch and node removal. Existing assertions were retained; no skips or thresholds were relaxed.

## Coverage and remaining suspicions

- Existing touch tests cover rotation/resize while thrust, ballast, scan and camera pointers are held, multiple fingers on Scan, boost interruption and hint-timer cancellation. Existing gamepad tests cover disconnection, analog/button combinations and once-per-press edges. Added simultaneous input and pause history coverage to `subInput.test.ts`.
- Added two non-visual browser assertions in existing capability specs: held keys/queued toggles across pause and blur (`d-input-hud.spec.ts`), and dive → Home → another free-dive site with one HUD/touch/Home tree and neutral input (`d-shell.spec.ts`). Browser execution is blocked by this sandbox's localhost listen restriction; these assertions still need execution in an environment that can start the preview server.
- **Unconfirmed:** `src/app/systems/discovery.ts:12` does not call `Discovery.dispose()` from a system dispose hook, and `src/app/systems/mission.ts:46` only disposes subscriptions, not its MissionRouter. An actual same-document full system reinitialization could retain dialogs/listeners. Current site selection navigates to a new document (`src/app/systems/shell.ts:76` and `:80`), so ordinary re-entry does not establish that leak. Avoided expanding this bug hunt into the separate boot migration.
- **Unconfirmed:** `src/app/loop.ts:76` always schedules the next RAF and exposes no stop function. Multiple in-page loop starts could duplicate updates, but current navigation reloads the document; no normal-flow reproduction found.
- **Unconfirmed:** `src/ui/HUD.ts:197` schedules a notice timeout without cancellation in `dispose()` (`src/ui/HUD.ts:320`). It could retain a detached HUD for six seconds on same-document teardown; no accumulating timer or duplicate live HUD reproduced in ordinary Home navigation.
- **Unconfirmed:** `src/core/Save.ts:249` falls back to legacy settings only when the current parsed value is not an object. A syntactically valid but empty/partial current object can shadow an intact legacy blob; precedence for those two copies is not specified, so no migration policy was changed.

## Verification

- Focused save/input/Journal/touch/system tests: **139 passing assertions** across six existing specs (61 input/system/touch; 78 save/Daily/Journal). The existing research regression plus save spec also passed after the persistence guard correction (74 assertions).
- `GATES_CONFIG_MODE=writable bash tools/gates.sh`: **exit 1**. This is the repository-supported configuration for a read-only dependency tree. Build/typecheck, strict content, attribution and repository-wide Prettier passed. Python ran 165 tests with four failures in unchanged build-manifest tests caused by Node `spawnSync git EPERM`.
- The gate's first full unit run reported 191 passing files, 2,052 passing assertions and one failure: the new storage-read guard initially disabled session research awards. Corrected the implementation rather than weakening the existing `progress.test.ts:86` assertion.
- **Final full unit rerun passed: 192 files, 2,056 tests**, using `npm test -- --configLoader runner --cache=false` (468.27 seconds). The gate's earlier unit failure is resolved; its sandbox-related Python and browser failures remain.
- Targeted Playwright execution attempted for both added tests. Preview failed before test execution; direct preview reproduced `listen EPERM: operation not permitted 127.0.0.1:4317`.
- Root smoke and project-base browser gates both failed before test execution because the preview server could not start. The project-base production build succeeded. Playwright `--list` successfully discovers both added cases.
- Latest-source `npm run build` (using the gate's writable native config and an isolated output directory), `npm run typecheck`, repository-wide `npx prettier --check .` and `git diff --check`: **passed**. No appearance changes; the existing large-chunk warning remains.
- Gate logs: `.cache/runs/20261013-125005-34-LxCMRD/`. Final rerun/build/targeted-browser logs: `/tmp/S-bughunt-unit-final.log`, `/tmp/S-bughunt-build-final.log`, `/tmp/S-bughunt-e2e.log`.
- No merge, push or tag performed. No capability was cut, so no cut entry in CHANGELOG.md is required.
