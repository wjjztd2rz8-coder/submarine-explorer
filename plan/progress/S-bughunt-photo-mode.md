# S-bughunt-photo-mode

2026-11-10 — DIRECTOR item 16n; two audit rounds.

## Confirmed defects

- The empty gallery instructed phone users to press P and Enter. Two failing-first
  cases reproduced the keyboard-dependent wording. The existing hint now names
  photo mode and Capture, which also avoids stale instructions after key rebinding.
- Thumbnail creation caught drawing and encoding errors but acquired the 2D
  context outside that boundary. A failing-first SecurityError case escaped the
  helper instead of returning a missing capture. Moved context acquisition into
  the existing try block; the existing capture error and retry path handle it.

Net simpler: replace the existing empty-state text and reuse the existing error
boundary. Runtime line count stays flat; no new surface, settings, dependencies,
storage format or state. No package numbers added to source or tests.

## Audit coverage

- Round one traced photo entry, paused/debrief blocking, queued button captures,
  render-time readback, storage persistence and gallery empty-state instructions.
  Reproduced the two defects above before fixing them.
- Round two checked capture cancellation over two blocked frames/lifetimes,
  quota eviction and oversized-image failure, private-mode access/write denial,
  read-only future saves, failed deletion and retry, single/ZIP exports, download
  URL cleanup, keyboard/touch switching, resize/orientation handlers, camera
  projection updates and portrait/landscape capture dimensions. No further
  defect confirmed. Gallery sharing uses the existing JPEG/ZIP download actions.
- Extend existing photo capability units and `tests/e2e/d-photo.spec.ts`.
  Browser regressions cover denied-context recovery and empty touch galleries in
  portrait and landscape. No visual styling changes.

## Validation

- Red: `npx vitest run tests/unit/photoMode.test.ts tests/unit/photoStore.test.ts -t 'empty gallery guidance|browser context exception' --configLoader runner --cache=false`
  failed all three new cases before runtime edits.
- Green: photo mode/store suites passed all 63 tests, including the two additional
  pause/debrief cancellation cases. Camera rig/control, touch controls and ZIP
  export suites passed all 42 tests (105 focused tests total).
- Grepped `tests/e2e` for photo, gallery, orientation and touch capabilities.
  Ran `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-photo-mode PW_PORT=4188 npx playwright test tests/e2e/d-photo.spec.ts -g 'photo mode freezes the sim|a full photo store|a full phone gallery|a denied photo canvas context|empty gallery guidance' --output=.cache/photo-e2e`
  and `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-photo-mode PW_PORT=4189 npx playwright test tests/e2e/phone-accept.spec.ts -g 'touch help and photo gestures name no keyboard keys or boost' --output=.cache/photo-phone-e2e`.
  Both stopped before browser execution at preview startup. An exact-name rerun
  of the denied-context case with `DEBUG=pw:webserver` confirmed localhost
  connections fail with `EPERM` on both IPv4 and IPv6. Browser acceptance remains
  unverified in this sandbox.
- Full gates: `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-photo-mode PW_PORT=4187 bash tools/gates.sh`.
  Finished with exit 1 (`FAIL gates (e2e=smoke)`). Logs:
  `.cache/runs/20261110-004754-2-doyE1v/`. All **4,812 unit tests across 196 files
  passed** (1010.17 s). Root/project-base build/typecheck, content and attribution
  pass. Root smoke and project-base browser gates fail at preview startup.
  Python ran 169 tests with five failures matching prior audit evidence: four
  build-manifest cases cannot spawn git (`EPERM`), and golden comparison receives
  empty JSON. Repository-wide Prettier flags the untouched `plan/OVERNIGHT-LOG.md`;
  formatting checks pass for every file changed by this task.

## Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh` outside this sandbox; Python, content,
build, unit, smoke, project-base and attribution all passed. Its sole failure
was Prettier in `plan/OVERNIGHT-LOG.md` (log:
`.cache/runs/20261110-010603-2204348-umc97D/prettier.log`). Prettier required
one blank line between the November 9 22:42 heading and its following list.
Applied that formatting correction without changing content, runtime behavior,
tests, assertions or gate configuration. Repository-wide `npx prettier --check .`
and `git diff --check` pass after the correction. The sandbox-only Python/browser
failures above do not reproduce in the orchestrator's run; targeted photo browser
regressions remain unverified here.
