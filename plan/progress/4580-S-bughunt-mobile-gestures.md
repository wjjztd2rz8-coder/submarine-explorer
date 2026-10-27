# S-bughunt: phone gestures and interrupted input

Audited `d4bbfcd1b348be051b9ae1eec1b4022ee0e06af7` for the standing
**S-verify / S-bughunt [Codex]** item in `plan/DIRECTOR.md`. Initial checkout
was clean. Read the director's scope and simplicity rules and
`CONTRIBUTING-AGENTS.md`. Static and unit work only; no browser, screenshots,
rendering, native touch delivery or real-phone acceptance.

## Confirmed defects and fixes

- **Swipe-up site list:** header and grab-bar listeners each kept a Y coordinate
  without a pointer owner. A second finger could replace or finish a swipe;
  capture loss, app switching, closing the list and hiding Home retained old
  coordinates. Store one shared pointer owner, ignore other fingers, and cancel
  on interruption or navigation. Release capture when the gesture ends.
- **Globe drag:** a second finger replaced the drag owner. Lost capture, blur and
  page hiding left the drag active; closing the globe retained its dragging
  class and release velocity. Keep the first owner and share one end path that
  clears capture and the class. Interruptions discard fling velocity; ordinary
  pointer release retains the existing fling behavior. Blur/hidden also clear
  held orbit keys.
- **Camera gesture lifetime:** canvas downs were accepted behind paused controls;
  a drag begun there could become active on resume. Capture loss did not end
  camera tracking, and exiting photo mode retained its drag. Reject new gestures
  while gameplay/photo controls are inactive or the document is hidden, end
  tracking on lost capture, and reset ownership across photo transitions.
- **Modals between frames:** releasing controls only during the frame update
  missed overlays that opened and closed before the next frame. Old joystick,
  ballast, scan, camera, sheet and globe owners could survive. Add a small
  opening observer to the existing FocusTrap dispatcher and reuse each control's
  cancellation path immediately. Touch input also discards pending edges and
  camera deltas. Release flight and scan captures so an old captured finger no
  longer owns events over the modal. Stale releases cannot cancel a new scan.

All new regression cases extend `tests/unit/touchControlsAudit.test.ts`.
Existing Home, modal-focus and Daily specs only gain the document EventTarget
and capture methods required by the real listeners. No new spec, dependency,
setting, UI, CSS, package-number comment, site branch or tolerance change.
The shared modal notification avoids separate app-state hooks for every overlay.

## Regression evidence

Before fixes, the first regression run produced **14 assertion failures / 49
passes** in the touch capability spec. These demonstrated pointer takeover,
stale sheet and globe gestures, and camera motion after pause/photo/capture
interruptions. A second run isolated **3 more failing cases / 63 passes** for
real FocusTrap open/close cycles between frames. Final coverage also checks
same-handle second fingers, capture release, queued edges and camera deltas.
The final spec was then run against a separate source copy with all four changed
UI modules restored from the audited HEAD: **19 assertion failures / 49 passes**.
The two already-correct pointercancel cases remain passing. The fixture models
native pointerup/cancel capture release, so these do not become false regressions.
That temporary baseline copy was removed.

The existing tests still cover scan held by two fingers, unrelated cancellation
IDs, joystick/ballast cancellation, hidden/blur/rotation releases, fresh scan
ownership after stale releases, double-tap resets, pinch conflicts and scan
interruption through real Input/Scanner consumers. The prior grab-bar guard
still verifies that a swipe's trailing click is ignored and keyboard activation
continues to work.

## Validation

- Final targeted touch/Home/globe/modal-focus/Daily run: **6 files / 306 tests passed**.
  The touch capability spec now has **68 cases**, including **21 added cases**.
- Production build and strict TypeScript: **passed**, using a locally bundled
  native Vite config, as in the repository's writable gate mode:
  `npm run build -- --config .cache/4580-vite.config.mjs --configLoader native`.
  Standard bundling cannot write to the read-only shared dependency tree;
  Vite's runner also closes before the PWA plugin's late imports. No production
  build configuration was changed.
- Full unit run: `npm test -- --configLoader runner --cache=false` produced
  only its startup banner for roughly eight minutes. Stopped with SIGINT
  (exit **130**); there is **no full-suite result**. The final focused run above
  passes; no broad-suite pass is claimed.
- Python: **167 tests / 5 failures**. Four existing `test_ci_build_manifest`
  cases fail on `spawnSync git EPERM`; `test_golden_tooling` fails on
  `Unexpected end of JSON input`. These match the recorded environment failures
  in `plan/progress/3710-S-bughunt-touch-input-state.md`.
- Writable build gate: Vite build and service-worker stamping pass; the gate
  then fails in `tools/ci-build-manifest.mjs` on the same `spawnSync git EPERM`.
- Prettier check and `git diff --check`: **passed**.
- Browser/e2e: deliberately not run, per brief.

Logs: `/tmp/4580-red.log`, `/tmp/4580-modal-red.log`,
`/tmp/4580-final-before.log`, `/tmp/4580-targeted.log`, `/tmp/4580-unit.log`, `/tmp/4580-python.log`,
`/tmp/4580-build-native.log`, `/tmp/4580-build-gate.log`.
