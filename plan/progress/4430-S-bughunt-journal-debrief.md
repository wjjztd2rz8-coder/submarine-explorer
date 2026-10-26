# 4430 S-bughunt: Journal photo crop and debrief tally

Item: **V-journal-polish**. Two review rounds; no new package-named specs.

## Plan

1. Trace automatic still projection/cropping, mission primary counts/debrief wording,
   Journal photo fallback, focus/Escape ownership and home/pause visibility.
2. Reproduce real defects in existing capability specs, fix minimally, then review
   the fixes and boundary cases in a second round.
3. Run `tools/gates.sh`; record results and distinguish unit evidence from browser QA.

## Round 1 — finding and minimal fix

Reviewed the repository conventions and Director simplicity rules, then traced
`photo.ts`, `PhotoMode.ts`, `Mission.ts`, `MissionRouter.ts`, `Journal.ts`,
`FocusTrap.ts`, shell/Journal/pause systems, settings, and the Journal/menu/photo/
flow/accessibility CSS and their existing capability specs.

**Confirmed defect: failed canvas readback escapes the nullable capture path.**
`canvasThumbnail` checked width but accepted a zero-height source, passing it to
`drawImage`. It also propagated drawing/encoding exceptions. The automatic-still
caller runs in `render.capture`; an exception skips the remaining frame hooks
(including input edge cleanup), rather than leaving the discovery without a photo.
The next RAF is already scheduled, so this is an interrupted frame, not proof of
permanently stopped rendering. Manual captures also bypassed their failure toast.

Added regressions in `photoStore.test.ts`: zero-height input, a drawing
`InvalidStateError`, and an encoding `SecurityError`; exception cases also require
the next healthy capture to succeed. Before the fix: **3 failed, 38 passed**.

Minimal fix in `PhotoMode.ts`: reject either empty source dimension before drawing;
return `null` on drawing/encoding failure. Existing callers already handle `null`.
No crop policy, tally, UI state, dependencies or public signatures changed.

## Round 2 — boundary review and regressions

| Case                               | Evidence and result                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subject at vertical frame edge     | Existing thumbnail test checks top/bottom band clamping. Added real-camera projection handoff cases for both a POI and wildlife at normalized Y 0.05, 0.95 and 0.5 in `photoMode.test.ts`; saved subject identity remains correct.                                                                                                                                        |
| Tiny / huge subjects               | The crop retains full source width and uses a fixed band around the center. It neither enlarges a tiny subject nor fits a huge subject's bounds. These are remaining framing limitations, not fixed by this robustness patch.                                                                                                                                             |
| Zero primaries                     | Added wording cases with zero resolvable primaries and either zero objectives or partial optional progress. Both stay “Back at the surface.” `primaryCounts()` and `primaryComplete` use the same resolved-primary set; existing mission tests cover missing POIs.                                                                                                        |
| All primaries done, optionals open | Existing wording case remains “Primaries complete” with “2 of 2 primary objectives · 1:15”; it does not suggest all objectives are complete. Mission.end selects `all` only when all resolvable objectives are complete; abort wording wins over either tally.                                                                                                            |
| Entries without a photo            | Existing `journalGroups` cases cover absent/empty collections, other sites/subjects, untagged photos and deleting a hero. Added system case: an unavailable still preserves the real Scanner discovery and a later subject can still receive a photo.                                                                                                                     |
| RTL / long names                   | Titles and captions use `textContent`/`alt`; body and navigation wrap long text and the breadcrumb ellipsizes. RTL layout remains unverified: several borders, indents and text alignments use physical left/right properties; there is no Journal-specific direction adaptation. No visual or localization acceptance claimed.                                           |
| 150% UI scale                      | Settings clamp at 150%; Journal text clamps at 21px; grid columns allow shrinking and the article scrolls. Debrief caps its height and scrolls, with wrapping actions/text in flow.css. Native layout and long-name combinations still require browser QA.                                                                                                                |
| Reduced motion                     | Journal's switch has a media-query exemption; global accessibility CSS also disables transitions/animations on pseudo-elements for both system preference and saved reduced motion. Settings synchronizes the HTML attribute. Source review only for CSS behavior in this run.                                                                                            |
| Focus return                       | Journal.close calls FocusTrap.hide: hide the Journal (revealing the CSS-hidden menu), remove its trap, then restore the connected, visible opener in the exposed top overlay. Existing `overlayFocus` cases pass for return focus, removed/hidden openers, stacked overlays and disposal. Native CSS/focus interaction could not be rerun.                                |
| Escape / pause state               | Top trap consumes Escape before closing; held repeats do not dismiss another overlay. Existing shell/overlay tests cover Journal above pause/debrief and both listener registration orders. Journal visibility does not change app state; the underlying pause trap stays active until Journal closes. Pad/modal ownership is covered in the existing overlay capability. |

The band threshold is aspect ratio 4:3, so square and 5:4 landscape sources are
cropped too; widescreen landscape and manual photo-mode captures retain the full
frame. The crop is center-based, with no horizontal recentering or subject-bounds
fit. Automatic stills are best effort and an unsuccessful first-scan still is not
retried on a repeat scan. These existing behaviors remain unchanged.

## Validation

- Before the fix, `photoStore.test.ts`: **3 failed, 38 passed**. After the fix
  and second-round additions, the three changed capability specs: **180 passed**.
- Final focused run: **490 passed in 11 existing specs**, exit 0, 2.18 s.
  Includes `photoStore`, `photoMode`, `journalData`, `journalGroups`, `overlayFocus`,
  `shellEscape`, `missionCore`, `missionRouter`, `missionAbort`, `debriefReopen`
  and `debriefSummary`. Log: `.cache/4430-focused.log`. Command:

  ```sh
  npm test -- --configLoader runner --cache=false \
    tests/unit/photoStore.test.ts tests/unit/photoMode.test.ts \
    tests/unit/journalData.test.ts tests/unit/journalGroups.test.ts \
    tests/unit/overlayFocus.test.ts tests/unit/shellEscape.test.ts \
    tests/unit/missionCore.test.ts tests/unit/missionRouter.test.ts \
    tests/unit/missionAbort.test.ts tests/unit/debriefReopen.test.ts \
    tests/unit/debriefSummary.test.ts
  ```

- Ran `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-4430 PW_PORT=4430 tools/gates.sh`.
  Writable config mode avoids writes into the shared dependency tree.
  Logs: `.cache/runs/20261026-135405-2-WlzZmS/`.
  - Passed: config preparation, strict content validation and production build
    (including TypeScript).
  - Python: 167 tests, five failures in unchanged tooling. Four build-manifest
    checks report `spawnSync git EPERM`; the golden-tooling subprocess check
    reports `Unexpected end of JSON input` from an empty JSON result.
  - Full unit phase printed only its RUN header for over five minutes. Interrupted
    with Ctrl-C, exit 130. The same sandbox stall is documented in the earlier
    4370 and 4340 progress notes. No full-suite pass is claimed.
  - The interrupted gate did not reach browser, attribution or formatting phases.
    Separate `python3 tools/check_attribution.py` and repository-wide
    `npx prettier --check .` both passed. `git diff --check` passed.
- Targeted existing browser checks (home modal focus, pause Journal focus, primary/
  optional journey, first-scan stills across desktop/portrait/landscape) were
  attempted with Playwright on port 4431. The preview could not start. A direct
  preview diagnostic confirms `listen EPERM: operation not permitted 127.0.0.1`.
  No browser test body or screenshot ran. RTL/long names, 150% layout, reduced-motion
  appearance and native focus return remain browser-validation gaps. The generated
  retained build was moved to `/tmp/4430-journal-build-20261026` after the diagnostic.

**Aggregate gates are incomplete, not green.** No gate definitions, unrelated
Python tooling or browser assertions were changed to work around the sandbox.
