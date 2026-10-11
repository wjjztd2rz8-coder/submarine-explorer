# 1370 — Journal, debrief and photo-mode bug hunt

Date: 2026-10-11. Requested rounds: 2.

## Result and limits

Completed two source/unit audit passes. Fixed one small photo-mode focus defect.
Existing assertions remain intact; new checks are additive. Journal entry links,
scan persistence, photo persistence, debrief transitions and the single-note/tag
copy rule passed the relevant runnable tests.

**The rendered desktop/touch audit remains pending.** No connected browser was
available through the browser skill. Local Vite preview failed with
`listen EPERM ... 127.0.0.1:4370`; direct Chromium launch also failed with
`sandbox_host_linux.cc:41 ... shutdown: Operation not permitted`. Playwright
could discover tests but could not start its preview server. No screenshots were
produced or inspected, and no viewport overlap or live browser focus claim is
marked passed.

Target matrix: desktop 1600×900, touch landscape 844×390, touch portrait 390×844.
The new browser regression contains each profile and two enter/exit rounds.

## Findings

| ID    | Severity / status                                                 | Evidence and player impact                                                                                                                                                                                                                                                                                                    | Action                                                                                                                                                                                                                                                                    |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JDP-1 | P2 — fixed; source + unit reproduction                            | `PhotoMode.setActive(false)` deactivated its focus trap while `body.photo-active` still hid dive controls. `visibility:hidden` leaves layout boxes, so `FocusTrap` attempted to focus the previous HUD control but the browser could not accept that focus. Closing photo mode therefore lost the player's keyboard position. | Remove the photo visibility class before deactivating the trap. Entry still records/blurs the previous focus before hiding the HUD. Added a two-round unit regression that failed before the fix and passed afterward, plus browser regression cases for Done and Escape. |
| JDP-2 | Render verification pending — possible portrait feedback clipping | Success toasts use `white-space:nowrap` with no width cap in `src/styles/photo.css`. A full gallery produces the longer “Saved to Journal · oldest photo removed (keeps 24)” message. Error toasts have a width cap, but ordinary success toasts do not.                                                                      | Measure at 390×844, including 150% UI scale and quota-driven multiple-photo removal. No speculative CSS change made.                                                                                                                                                      |
| JDP-3 | Render verification pending — possible long-caption overlap       | Photo caption and feedback are independently positioned: `.photo-mode-top` starts at 16px and `.photo-mode-toast` at 84px. Long site/POI captions can wrap; the feedback does not follow the caption's actual height.                                                                                                         | Capture a long-caption/empty-frame shot on both touch sizes and check the two boxes for intersection. No speculative positioning change made.                                                                                                                             |

## Pass 1 — routes, state and keyboard source audit

- Journal is reachable from home, Pause, debrief and the dive shortcut. Site
  headers route back to the overview; category disclosures preserve their state
  through refreshes. Direct scan navigation reveals the correct category.
  The photo viewer has an All photos return action, download and delete actions.
- Unlocks read `subexplorer.discoveries.v1`. `DiscoveryStore` reloads recorded
  scans, keeps first discovery timestamps on repeat scans, and isolates sites.
  Journal reads do not rewrite the store. Mission objectives deliberately count
  scans from the current dive; they are not restored from Journal discoveries.
- Photos use the independent `subexplorer.photos.v1` store. Reload, deletion,
  gallery limits, failed writes and newer-format protection have existing unit
  coverage. Photo deletion does not write discoveries.
- Journal spoilers, selected page and expanded groups are session navigation
  state, not persisted discoveries. Reload starts a new mission/dive; debrief
  duration and objective progress are per-dive state. These are not recorded as
  persistence defects.
- Debrief exposes Keep exploring, Journal, Dive sites, replay and Home. More
  hides secondary actions until expanded. Reopening resets More and scroll.
  Escape resumes a resumable debrief; an aborted dive requires an explicit exit
  choice. That is intentional, rather than an Escape dead end.
- Focus traps stack, skip hidden controls and collapsed disclosure content, and
  let the Journal own Tab while it is above a debrief. Native Enter/Space on UI
  controls are excluded from flight/capture bindings. JDP-1 was the clear focus
  restoration defect.
- Journal suppresses the scan card through `Discovery.update`; mission debrief
  CSS suppresses the scan overlay immediately. Tutorial/hint updates hide their
  content when play is frozen. Photo CSS hides all body overlays except the
  canvas and viewfinder. These mechanisms were reviewed, but rendered overlap
  and pointer hit testing require the pending browser matrix.
- Player prose across all 13 shipped sites contains no repeated illustrative /
  reconstructed caveat. The one honesty note is on the Journal front page;
  entries use one Recreation or Game addition tag where applicable. Technical
  JSON `reconstruction` flags and author-facing POI/prop notes are not displayed
  as caveat paragraphs. Mission prose, objective hints, memorial notes and image
  captions now have additional copy assertions.

## Pass 2 — regression and review

- The new photo lifecycle test models the browser's refusal to focus a
  `visibility:hidden` control while retaining its layout box. It exercises real
  PhotoMode/FocusTrap listeners and repeats open → Done → restored focus twice.
  It failed against the original ordering and passes after the production fix.
- Added a two-round Journal assertion: refresh leaves one front-page honesty
  note, while an entry has its single provenance tag and no honesty note.
- Added `tests/e2e/f-journal-photo-1370.spec.ts`: real PHOTO taps at touch sizes,
  prior HUD focus restoration, capture, Done, keyboard Tab/Shift+Tab wrapping and
  Escape without opening Pause. Touch PHOTO's pointer handler preserves prior
  HUD focus; keyboard input intentionally changes input modality. Browser cases
  are unexecuted because of the environment limit above.
- Reviewed the final diff: only the focus restoration order changes production
  behavior. No storage keys, content metadata, existing expectations or layout
  rules were altered.

## Validation

- Targeted audit, pass 1: **14 files / 171 tests passed**.
- Targeted audit, pass 2: **14 files / 171 tests passed**.
- Initial full unit run: **180 files / 1815 tests passed**. Fresh final full unit
  run: **180 files / 1816 tests passed** (300.30s).
- Final build: passed, using the repository's writable-config approach (local
  Rolldown config bundle + Vite native loader). The default loader cannot write
  into the read-only dependency tree; Vite's runner also fails on the existing
  PWA plugin's late dynamic imports. Neither required a repository change.
- Python: **156 tests passed**. Strict content validation: all 13 sites passed.
- Typecheck, changed-file formatting and `git diff --check` passed. New Playwright
  spec discovery: **3 cases**, each with two rounds. Browser suite attempt blocked
  before tests ran. Temporary `dist-1370` build output was removed after validation.
- Logs: `.cache/1370/audit-round-{1,2}.log`, `unit-baseline.log`, `unit-final.log`,
  `python.log`, `content.log`, `build-final.log`, `e2e.log` (local, ignored).

## Pending browser pass

At each target size, use two rounds and inspect screenshots as well as assertions:

1. Fresh-player scan card with tutorial, then contextual hint chip. Open Journal
   from Pause and debrief. Check entry heading, sources, provenance tag, Contents
   navigation and return focus. Check pointer/touch hit testing and Tab in both
   directions, including collapsed categories.
2. Scan a real target, reload twice, reopen its entry and check the scanned state.
   Confirm a new mission starts with fresh objectives while Journal retains scans.
3. Surface with zero scans and with a scan; open/close Journal, expand More,
   resume, surface again, and leave via Dive sites/Home. Exercise aborted debrief
   exit choices and confirm no hidden control receives focus.
4. Enter photo mode with the scan card/tutorial present; orbit, pinch/wheel,
   capture, Done/Escape/Pause, and return to play. Check JDP-2/JDP-3, inspect actual
   saved images, reload their gallery and delete a photo without changing scans.

Example after a successful isolated build:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4370 PW_OUTDIR=dist-1370 ROUNDS=2 \
  npm run test:e2e -- tests/e2e/f-journal-photo-1370.spec.ts \
  tests/e2e/f-journal-debrief-1060.spec.ts \
  tests/e2e/f-debrief-zero-1160.spec.ts tests/e2e/d-photo.spec.ts \
  --output=test-results-1370
```

The existing 1060/1160 suites cover desktop and portrait, so also run their flows
at 844×390 in a local touch project; the new photo-focus spec already includes
that landscape profile. Do not weaken assertions to obtain a passing run.
