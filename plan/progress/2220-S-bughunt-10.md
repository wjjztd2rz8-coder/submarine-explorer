# 2220 — S-bughunt-10

## Plan

Two rounds over changes in `git log --since=2026-10-14`: first restart/site
lifetimes and device guidance, then settings resolution and loop/timer bounds.
Reproduce small bugs in existing capability suites, make minimal fixes, and run
the repository gates. Record larger work as proposed Backlog items here.

## Progress

- Read `plan/DIRECTOR.md` and `CONTRIBUTING-AGENTS.md`; preserve the single
  guidance surface, resolved settings, per-site data, and capability tests.

## Round 1 — restart and device guidance

- Reproduced repeated disposal of the previous onboarding system clearing the
  next dive's Skip handler. Its cleanup collection was shared across factory
  instances, and disposal also reached through the mutable context to the next
  controls card. Cleanup now belongs to the factory instance and captures its
  own card and handler. The regression disposes the old instance again after
  initializing the next, then completes the new tutorial through Skip.
- Reproduced all four Shift/Control keys and pen pointer input changing tutorial
  copy to keyboard while TouchControls kept its touch layout. Onboarding now
  follows the same modifier and pointer rules as TouchControls. Existing normal
  keyboard, touch and gamepad transition coverage remains intact.
- All six added onboarding cases failed before the fixes. Evidence:
  `/tmp/2220-before.log`.

## Round 2 — settings and timer bounds

- Reproduced the confirmed discovery-reset reload timer firing after Settings
  disposal, for both persistent and session-only resets. Settings now owns one
  pending reload timer, replaces it on another reset, and cancels it on disposal.
  Both new cases failed before the fix (`/tmp/2220-before.log`).
  A further check verifies repeated requests retain one timer and a live screen
  still reloads exactly once after the delay.
- Reproduced asynchronous sensor-radius application after the previous site's
  modes system was disposed. Guard the callback with that initialization's
  lifetime, so a new initialization cannot reactivate it. The regression also
  verifies that the next site's radius is multiplied exactly once and its base
  radius stays pristine. Failed before the fix: `/tmp/2220-modes-before.log`.
- Reviewed Custom inheritance, false-valued options, malformed/future saves,
  Daily overrides, repeated effective resolution, and mode/supply transitions.
  Existing capability tests cover these; no config mutation or new setting.
- Reviewed production loop/timer sites: the physics loop caps its steps,
  tutorial advancement increases an index bounded by the steps array, photo
  quota retries shrink the capped photo list, guidance uses a per-frame clock,
  and the Daily refresh and photo/touch timers have teardown paths. The HUD
  animal-hint browser wait already has a finite 60-frame bound.

No visual tuning, layout, storage contracts or dependencies changed. No new
on-screen surface: fixes retain the existing guidance slot and Settings UI.

## Proposed Backlog items

- **S-runtime-disposal [Codex]:** complete resource teardown for the shared
  world/environment systems before supporting in-page site replacement.
  `src/app/systems/world.ts` does not dispose its Terrain (which exposes
  `dispose()`), and `src/app/systems/presets.ts` does not call
  `PresetSystem.dispose()`. Atmosphere resources also lack system teardown.
  Preset selection and landmark loading need stale-callback protection too.
  Acceptance: two real system lifetimes, including disposal before content
  resolves, leave no old scene objects, GPU resources, or environment events.
  This is broader than the small input/settings fixes in this package; current
  site selection navigates the page.
- **S-device-guidance [Codex]:** use one active-device source for timed guidance
  and refresh control labels when that device changes. Timed animal hints and
  scan-completion text retain their labels until expiry; Discovery's key-label
  callback always supplies keyboard bindings even for gamepad input. Acceptance:
  keyboard/touch/pad transitions update visible guidance without replaying or
  extending its lifetime, using the existing guidance slot.

## Validation

- Before fixes: **9 new regression cases failed**, existing cases passed.
- After fixes: **131 tests passed in six capability suites**
  (`/tmp/2220-after.log`), then **270 tests passed in 14 capability suites**
  including the live/repeated reload check (`/tmp/2220-capabilities-final.log`).
- Full unit gate: **191 files / 2,328 tests pass**, 472.61 seconds. Log:
  `.cache/runs/20261016-001722-7-eClZfP/unit.log`. This run started before the
  final live/repeated reload test was added; the final 270-test capability run
  covers that addition. Final TypeScript check passes (`/tmp/2220-typecheck.log`).
- Independent full unit run with `--pool=threads` also passes **191 files /
  2,328 tests**, 491.09 seconds (`/tmp/2220-unit-full.log`).
- Repository gates launched with
  `GATES_CONFIG_MODE=writable PW_PORT=4220 bash tools/gates.sh`.
  Production build (including TypeScript) and strict content validation pass.
- Python: **162/166 pass**; four existing build-manifest tests fail with
  `spawnSync git EPERM` in the restricted environment, including when git exits
  zero and produces a SHA. Log:
  `.cache/runs/20261016-001722-7-eClZfP/python.log`.
- Browser smoke and the full browser suite attempted against the gate's isolated
  build on port 4221; the gate also attempted root smoke and project-base on 4220.
  Preview cannot bind `127.0.0.1:4221` (`listen EPERM`), so no browser assertions
  or screenshot QA can run. Logs: `/tmp/2220-e2e-smoke.log`,
  `/tmp/2220-e2e-full.log`, `/tmp/2220-preview.log`, and the gate run's
  `e2e.log` / `e2e-base.log`. Gate failures are not waived or marked passed.
- Attribution, repository-wide Prettier (`/tmp/2220-prettier.log`) and
  `git diff --check` pass.

Implementation and both audit rounds are complete; changes are uncommitted.
The package remains pending an unrestricted gate run because Python and browser
gates cannot pass in this environment. No failing assertions were weakened and
no checks were skipped to obtain a green result.
