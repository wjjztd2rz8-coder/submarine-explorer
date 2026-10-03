# F-BUGHUNT-13: merged title acceptance audit

2026-10-03. Implementation and static verification complete. The orchestrator's
external gate run passes browser smoke and 7/8 project-base tests. **The remaining
motion-test locator is corrected; its browser rerun and full acceptance are pending.**

Read `plan/F-TITLE-SPEC.md` §8 (items 3–7), package A/D/E/F progress,
`F-TITLE-BC-REVIEW.md`, and `docs/title-scene.md`. No camera, lighting, terrain,
vehicle tuning, save key, mission URL or public identity changes. No commit made.

## Confirmed fixes

- **Shared canvas state:** the bridge previously inherited the gameplay target
  and depth-dependent exposure. It now presents to the canvas using boot exposure,
  clears the full canvas once on entry/resize, and restores target, exposure,
  clear colour/alpha and viewport/scissor in `finally`. Restore the target last:
  Three's offscreen targets have their own GL viewport/scissor. Tests cover normal
  drawing and exceptions, plus gameplay → title → gameplay draw handoff.
- **Static-frame invalidation:** a same-size resize can clear the WebGL buffer
  without changing the scene's cached dimensions; a pixel-ratio change has the
  same effect. Both now invalidate and clear for a new presentation. Reduced
  motion continues to draw only on dirty events, with no renderer calls during
  idle frames. Motion toggles still resume animation.
- **Tab return:** per-frame reconciliation misses a hidden interval when RAF
  stops entirely. A cleaned-up `visibilitychange` listener records that transition
  and requests a fresh frame on return. The regression sends visibility events
  with no intervening frame. This is unit evidence, not a native browser-tab test.
- **Teardown:** cancel the pending zero-delay optional-load timer; ignore late
  rejected loads after disposal, and retain existing late-crop disposal. Clear
  the context/diagnostics on teardown. No extra scene, renderer or subscriptions
  are constructed on repeated home entries.
- **Invalid Continue focus:** asynchronous mission-catalogue validation could
  disable the currently focused saved Continue button. `Home.setContinue(null)`
  now moves that focus to Dive sites without stealing another action's focus.
- **Hidden selector globe:** below the CSS height cutoff, its preview was hidden
  but `homeGlobe.isOpen` and rendering continued. The bridge now closes it when
  its container is hidden, the tab is hidden or a modal covers it, and reopens
  it on return. Menu entry/exit still uses the existing shell reconciliation.
- **Touch pin targets:** home CSS sized actionable globe buttons at 28 px. Home
  now expands their invisible hit areas to 48 px, with matching centred margins;
  the authored dot geometry and size remain unchanged. This stays within Home
  and the bridge rather than altering the shared globe stylesheet.
- **Offline title assets:** the existing stamped shell list omitted all three
  WOFF2 files, both SVG marks and Monterey metadata/float32 heightmap. `sw.js`
  now caches them during installation with scope-relative URLs. Fonts/marks use
  the deployment shell cache; immutable Monterey files retain the tile cache
  across installs. Optional failures do not reject installation of a complete
  mandatory shell. Existing cache names, navigation policy and required-shell
  install checks are unchanged.

## Acceptance items 3–7

| Item                                  | Code and test evidence                                                                                                                                                                                                                                                                                                                                                                                     | Browser status                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 3: focus, Enter, Escape, touch        | Existing Home DOM order/FocusTrap and shell modal priority reviewed; Home unit tests cover fresh/saved/invalid Continue. Shared browser suite checks Tab/Shift-Tab, both selector origins via Back/Escape, and Settings/Controls/Journal/Upgrades return. Saved Continue Enter checks the exact mission. Pin targets fixed and tested.                                                                     | Project-base passed; root audit pending                             |
| 4: home isolation, quit after dive    | Existing shell/input gates freeze physics, supplies, mission time and progress. Bridge render handoff regression passes. Browser snapshot checks pose, supplies, RP, discoveries and mission time/events before/after home input and quit; Journal remains usable.                                                                                                                                         | Project-base passed                                                 |
| 5: bypass routes and both bases       | Existing `publicUrl`, Vite CSS rewriting and shell URL helpers retain paths. Production builds inspected at `/` and `/submarine-explorer/`: three font URLs, HTML icon/manifest URLs, seven shipped optional worker assets. Worker unit tests exercise both scopes. Shared browser tests cover mission/tile/globe/debug bypass and saved/site launches.                                                    | Builds and project-base navigation passed                           |
| 6: lifecycle, reduced motion, battery | Unit tests cover tab events without hidden frames, all covering modal types, sites, repeated dive/home entries, single scene/subscription reuse, static idle, resize/DPR refresh, motion toggles and disposal. Existing TitleScene stable-transform/hidden-snow tests pass in the full suite. CSS-hidden globe closes. Browser suite covers OS/saved motion and allocation checks after quit/modal cycles. | Quit/modal checks passed; motion rerun and native tab/touch pending |
| 7: blocked assets                     | Rejected/late loads and teardown pass; optional worker requests can fail without rejecting required shell installation. Shared browser test aborts optional Monterey and font requests, checks fallback caption, inline mark, no fatal/unhandled error and usable site launch at both bases.                                                                                                               | Project-base passed                                                 |

Daily remains in its specified position when available and hidden when absent.
Existing daily-system regressions exercise mode changes and cleared callbacks.
New browser coverage checks a visible Daily on touch and absence with an empty
mission catalogue. MissionSelect and globe pins retain native click/focus paths;
site list launch requires no hover.

## Orchestrator browser finding and correction

The orchestrator can launch Vite and Chromium outside this sandbox. Its
`tools/gates.sh` run passed build, unit, Python, content, attribution, formatting
and browser smoke. Project-base browser tests passed **7/8**, including focus and
modal return, saved Continue, invalid Continue/Daily absence, blocked fonts/tile,
route bypass and quit-to-home/allocation checks. The remaining test timed out
waiting for `getByLabel('Reduce motion', { exact: true })`.

Settings source and the retained browser error snapshot both show the label
`Reduce motion (no banking, particles or flashes)`;
its explanatory note is an accessible description, not part of that label.
The audit's shorter exact label matched no element. This is a test locator bug,
not evidence of an application motion failure. The shared root/project-base test
now scopes an exact checkbox role/name locator to Settings and uses the complete
existing label. It also checks the saved value after checking/unchecking, and
asserts that saved reduced motion remains static after the OS preference is
removed. Existing resize, idle draw-count, modal stop/resume and animation
assertions remain intact. No timeout increase, skipped test or application copy
change was introduced.

External evidence: `.cache/gates/e2e-base.log` and
`test-results-project-base-4470-2916034/base-url-reduced-motion-dr-08e73-d-resumes-after-modal-close-chromium/error-context.md`.
Correction validation: `npm run typecheck` passes; **67 tests across four Settings
and title unit files** pass; formatting and `git diff --check` pass. The corrected
test still needs the orchestrator's browser rerun; this sandbox
cannot execute that check. Root title/touch audits and native hidden-tab behavior
remain pending beyond the passed smoke coverage.

## Regression and gate evidence

- Replaced only the three changed production files temporarily with `HEAD`, ran
  the new unit files, and restored the fixes in `finally`: **10 failures / 32
  passes**. With fixes restored: **42/42 pass**. This includes both base scopes
  and normal/throwing renderer restoration. `.cache/f-bughunt-13-before.log`.
- `GATES_CONFIG_MODE=writable PW_PORT=4296 tools/gates.sh --full-e2e`:
  configuration, build/typecheck, **103 unit files / 1,132 tests**, **138 Python
  tests**, content, attribution and formatting pass. Root and project-base builds
  both succeed and stamp the worker. **Exit 1:** e2e and e2e-base fail at preview
  startup, before assertions. Retained log: `.cache/f-bughunt-13-full-gates.log`.
  Per-gate logs were subsequently replaced by the orchestrator run described above.
- Direct preview probe: `listen EPERM: operation not permitted 127.0.0.1:4297`.
  Independent Chromium launch also fails with
  `sandbox_host_linux.cc:41 ... Operation not permitted`.
  `.cache/f-bughunt-13-browser-environment.log`. No screenshots or actual browser
  measurements are claimed, and no assertions/gates were disabled to hide this.
- Separate retained production builds and asset checks:
  `.cache/f-bughunt-13-build/{root,project}/`,
  `.cache/f-bughunt-13-{root-build,base-build,base-assets}.log`. Both compiled CSS
  files prefix all three font URLs correctly; HTML icon/manifest links match the
  base; optional worker files exist and have nonempty payloads.
- Final explicit static-only gate: `GATES_CONFIG_MODE=writable PW_PORT=4296
tools/gates.sh --no-e2e` passes (exit 0). This does not replace the failed full
  gate or imply browser acceptance. `.cache/f-bughunt-13-static-gates.log`.
- `git diff --check` passes. Playwright discovers the new acceptance tests at
  root and project bases; the external run and remaining rerun are described above.

The supplied `node_modules` link led to a read-only installation. For validation,
used a local ignored directory with package symlinks to that installation and
local writable `.vite`/`.vite-temp` directories. No dependency/lockfile changes;
the original link is restored after checks. The shared installation is untouched.

## Handoff

Run `PW_PORT=4296 tools/gates.sh --full-e2e` on a host that permits a localhost
preview and Chromium. The new root suite is `tests/e2e/f-title-audit.spec.ts`;
`tests/e2e/base-url.spec.ts` registers the same shared assertions at the project
base. Re-run the corrected motion test at both bases, then the full title/touch
suite. Project-base focus, allocation and blocked-font checks already passed;
native hidden-tab resume and touch behavior still need browser validation. The
authored scene look is unchanged and its separate visual acceptance remains with the title owner.
