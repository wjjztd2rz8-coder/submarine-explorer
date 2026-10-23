# 3440 — S-verify: settings, input and accessibility unit gaps

Item: DIRECTOR Backlog 9, **S-verify / S-bughunt**. Initial HEAD:
`e4ce192496195c06acfb655ac3d05dd559391691`; initial worktree clean.

## Plan

1. Map the existing capability specs to settings, keyboard/pad/touch input and
   accessibility consumers. Separate uncovered boundaries from already guarded
   failures.
2. Add at most six focused cases to existing capability specs, reproduce any
   failure before changing production code, and make the smallest correction.
3. Run the focused specs and `tools/gates.sh`, review the diff, and record the
   exact results and remaining limits here and in the final report.

## Coverage map and initial gaps

| Module / capability                                                       | Existing unit specs and failure guards                                                                                                                                                                                                                | Uncovered boundary selected for this audit                                                                                  |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/core/Save.ts` settings persistence                                   | `settingsSave`: corrupt JSON, malformed versions/fields, legacy recovery, future-version protection, throwing reads/writes, silently dropped writes, unchanged retries, accessibility migration/reset. `saveSoak`: protected versions and extensions. | Accessing the global `localStorage` property itself throws, before storage methods can run.                                 |
| `src/core/Input.ts` keyboard and bindings                                 | `subInput`: mapping/edges, focus/blur/visibility, conflicts, corrupt JSON, throwing storage methods, old/retired actions, migrations. `settingsScreen`: reserved keys and unknown rebind actions. `saveSoak`: protected binding versions.             | Mixed malformed known bindings and an unknown saved action; unavailable gamepad API; API throws after an active pad sample. |
| `src/core/Input.ts` pad and app input gate                                | `subInput`, `appSystems`, `cameraControls`: sparse/disconnected pads, handoff, dead zones, simultaneous sources, edges, hidden/editing focus, pause/re-entry.                                                                                         | Missing pad is already guarded; denied polling is not.                                                                      |
| `src/core/Touch.ts` touch detection/math                                  | `touch`: corrupt flags, denied storage methods, hardware capability matrix, stick/slider bounds and zero radius, tap/pinch helpers.                                                                                                                   | Touch hardware reports points but media-query detection is unavailable.                                                     |
| `src/ui/TouchControls.ts`, `src/app/systems/input.ts`                     | `touchControls`, `touchControlsAudit`, `appSystems`, `overlayFocus`: interruption/cancellation, held fingers, resizing, gestures, DOM cleanup and input freeze.                                                                                       | Existing failure guards are substantial; no duplicate case planned.                                                         |
| Accessibility settings in `src/core/config/ui.ts`, `Config.ts`, `Save.ts` | `settingsSave`, `settingsPalette`, `settingsScreen`, `presets`: field repair, scale bounds, palette luminance/interpolation and fallback. These constants have no storage/device failure path of their own.                                           | No whole core settings/input module lacks failure coverage; gaps are specific boundaries.                                   |
| `src/app/systems/settings.ts` live accessibility                          | `overlayFocus`: saved/OS reduced-motion combinations, reload, scale edits.                                                                                                                                                                            | Live accessibility consumers during failed persistence, and detached save/media subscriptions after disposal.               |
| `src/render/reducedMotion.ts`, `src/ui/Captions.ts`                       | `reducedMotion`: failed draw restores particles. `captions`: malformed cue duration, queue limits/expiry, enable/disable and disposal.                                                                                                                | Existing failure guards retained.                                                                                           |

## Progress

- Read DIRECTOR simplicity rules and CONTRIBUTING-AGENTS. All additions will go
  into existing capability specs; no assertion relaxation, new dependency,
  settings surface, or configuration mutation is planned.
- Added exactly six `it` cases across `settingsSave`, `subInput` (three),
  `touch`, and `overlayFocus`; no parameterized expansion or new spec file.
- Before the fix, the four focused specs ran **265 passed, 1 failed**.
  The denied-gamepad case threw `SecurityError: Gamepad access denied` from
  `Input.sample`; the other five additions passed unchanged production code.
- Real defect: optional pad polling could throw before returning keyboard/touch
  state, interrupting the input frame. The correction catches only pad API
  access and feeds the existing no-pad branch, which clears pad activity and
  held-button bookkeeping. No alternate input model, retry loop, or logging
  surface was added. The regression also checks active-pad → denial → restored
  polling and a fresh edge, with explicit axis/scan/edge assertions.
- After the correction, all four focused specs pass: **266 tests passed**.
  Command: `npm test -- --configLoader runner --cache=false
tests/unit/settingsSave.test.ts tests/unit/subInput.test.ts
tests/unit/touch.test.ts tests/unit/overlayFocus.test.ts`.
- Canonical gate command: `GATES_CONFIG_MODE=writable bash tools/gates.sh`.
  Writable config mode uses the existing gate support for the shared read-only
  dependency tree. Run logs: `.cache/runs/20261023-103312-2-17ekrz/`.
  Full gate results pending.

## Gate failures already observed

Python ran **167 tests / 5 failures**. Four `test_ci_build_manifest` cases
fail at `spawnSync git EPERM`: `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden_tooling` fails with `Unexpected end of JSON input` while parsing
subprocess stdout at `tools/tests/golden-manifest.test.mjs:151`; the underlying
golden-child cause is not established here. These are the same five failures
documented by the earlier 3360, 3390 and 3400 audits. No tool or assertion was
changed to conceal them. Config preparation, strict content and production
build have passed; the full unit and browser gate results are still pending.

## Scope and acceptance limits

The six cases exercise injected storage/device boundaries and the existing
headless DOM fixture. They establish fallback behavior, per-field binding
recovery, live accessibility application and subscription cleanup. They do not
establish exhaustive branch coverage, physical-device behavior or visual
acceptance. There is no dedicated core accessibility module: settings live in
Save/config, then flow through the settings system to individual consumers.

Exactly one production expression was replaced with a guarded optional API
read. All existing assertions remain, including the collision expected-failure
cases. No dependency, new spec, setting, UI, layout, authored data, runtime
config mutation, public API or storage schema changed. The net-simpler rationale
is to reuse the existing no-pad path instead of adding separate recovery state.
