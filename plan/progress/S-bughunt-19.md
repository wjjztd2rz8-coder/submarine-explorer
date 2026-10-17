# S-bughunt-19 — input, overlays and save migration

Backlog 8 (`S-bughunt`), 2026-10-17. Nonvisual bug hunt; no UI surface or setting added, no save schema/key changed.

## Confirmed and fixed

1. **Gamepad input returned after blur.** `Input.clear()` cleared sampled axes, but the next pad poll immediately restored thrust, scan and shortcuts while the window remained unfocused. Suspend pad contributions until window focus returns, keep polling button history, and baseline returning buttons so presses made while RAF was suspended cannot replay shortcuts. Held analog controls resume normally; edge actions require release/repress. Disposal resets the interruption state.
2. **Rotation retained unsampled touch shortcuts.** The layout reset called `endFrame()`, which cleared sampled flags and accumulated pinch/look deltas but left `edgeArmed` intact. A touch LIGHTS press followed by orientation/resize before sampling still fired afterward. Use `clear()` to discard the queued action as well as held input and motion.
3. **Expanded sonar intercepted modal input.** Its capture-phase wheel listener prevented Journal scrolling and changed map range behind Journal/Settings/Controls/Globe/briefing/debrief. The global range shortcuts also bypassed several overlays. Both now yield while a blocking overlay is open and resume after dismissal.
4. **Journal rotation left invisible input focused.** The spoilers switch can stay connected inside the desktop nav when the phone stylesheet hides that nav. Refresh only restored detached controls, leaving focus on an invisible input. Move focus to the visible article when a refresh hides the connected focused control.
5. **Damaged photo data broke ZIP downloads.** The v1 loader accepted anything beginning with the JPEG data-URL prefix, including empty or malformed base64. `Download all` then threw in `atob`. Validate base64 syntax/length before accepting photos on load/save, retaining decodable padded and unpadded old payloads and all intact neighboring photos. Migration remains in memory until a normal write; discoveries and other collections are untouched.
6. **Hidden sonar kept photo camera gestures.** Entering photo mode while sonar was expanded left the map's routing flag active. Touch drag did nothing, touch pinch zoomed the hidden map, and the global wheel listener also captured photo zoom. Touch routing now treats the map as inactive while framing a photo, and sonar's global handlers yield to photo mode. The map's expansion preference survives exit.

## Regression coverage

Extended existing capability specs only:

- `subInput.test.ts`: blur with background polling and suspended RAF; late background button presses, no replay, release/repress recovery.
- `touchControlsAudit.test.ts`: real touch button listeners interrupted by resize/orientation before sampling, then a fresh press; drag/pinch go to the photo camera when sonar is expanded; existing drag/pinch/scan interruption cases retained.
- `overlayFocus.test.ts`: wheel and +/- ownership for seven modal types above expanded sonar, followed by normal routing after dismissal.
- `journalGroups.test.ts`: connected switch becomes invisible on phone layout change; article receives focus.
- `photoStore.test.ts`: six corrupt payloads are skipped/rejected while intact old photos survive write/reload; five padded/unpadded valid payloads remain readable.
- `d-sonar.spec.ts`, `journal-debrief.spec.ts`: browser regressions for modal wheel routing, photo camera zoom with expanded sonar, and CSS-driven Journal rotation focus.

Each confirmed bug had a failing unit reproduction before its fix. Focused final run: **339 tests passed across 9 existing specs**, including app systems, save soak, photo mode and touch audits. Browser regressions are added but cannot execute here: preview fails with `listen EPERM: operation not permitted 127.0.0.1:4199`. Playwright test discovery succeeds for both new browser cases.

## Reviewed / reported without changing behavior

- v1/v2 bindings, settings, discovery namespaces, cosmetic grants, Daily and photo v1 round trips are covered by existing save-soak fixtures; no additional loss reproduced there. The separately queued legacy-retry star-award work remains outside this slice.
- **Binding migration conflict policy:** new scan/pitch/reset defaults claim keys before legacy custom remaps (`Input.loadBindings`). A v2 custom Sonar on G becomes unbound when Scan takes G. The existing v2 regression explicitly requires that outcome. Changing it needs a product decision, so that assertion remains intact.
- **Controller selection limitation:** input samples the first connected pad, rather than the most recently used pad. A second connected controller cannot take over while the first stays connected. No multi-pad behavior is promised by the current mapping; reported for a future decision.
- Reviewed pinch destination changes, coincident pointers, slow/diagonal sonar pinches, double-tap cancellation, multi-finger scan release, modal Escape/Tab ownership, native button activation, guide device switches and photo teardown. Existing regressions remain intact; no further confirmed defect from those paths.

## Gates

Requested command: `GATES_CONFIG_MODE=writable bash tools/gates.sh` (the repository-supported mode for the read-only dependency tree), **exit 1**. Logs: `.cache/runs/20261017-161912-31-rAIBUo/` and `.cache/bughunt-gates.log`.

- PASS: strict content, root build/typecheck, project-base build, attribution, repository-wide Prettier.
- Python: 166 tests, five failures. Four unchanged build-manifest tests fail on `spawnSync git EPERM`; the unchanged golden-manifest wrapper gets empty CLI JSON output (`Unexpected end of JSON input`). Tooling code was not changed.
- Browser smoke and project-base: preview server cannot start. The separate direct preview attempt confirms sandbox denial of the localhost listener. No browser execution or screenshot verification is claimed.
- Initial unit gate: 190 files passed; two failed. One failure exposed an unnecessary change to hidden-frame sampling: retain polled hidden input for the shell's frozen-input gate, and suspend pad contributions specifically on blur. The existing assertion remains unchanged and now passes. The other failure and three unhandled errors came from starting the gate while edits were in flight: its cached touch implementation called `endFrame()` against the updated mock. Final touch capability runs pass against matching source and tests.
- Final complete unit rerun (`npm test -- --configLoader runner --cache=false`): **PASS, 192 files / 3,077 tests**, 401.40 seconds, with source/tests held fixed. Log: `.cache/bughunt-final-unit.log`. No existing assertion was relaxed.

Final standalone production build/typecheck passed using the same bundled native Vite config technique as the gate. Targeted formatting and `git diff --check` passed.

The preliminary standalone `--phase build` bundle succeeded but its provenance step failed with sandbox `spawnSync git EPERM`; all-mode build does not use that provenance step. A direct runner build also hit the documented Vite late-import runner error; the gate's writable config bundling avoids it.
