# F-TITLE-G: integration QA

Status: tests and documentation delivered; three test assumptions corrected after the orchestrator browser run; full E2E rerun pending. 2026-10-03.

## Delivered

- `tests/e2e/d-shell.spec.ts`: checks the complete menu DOM order, including Daily
  and mode between Free dive and Journal; explicitly checks the embedded globe
  after Dive sites and its closure/focus return on Escape. Existing mission/pin
  launch, URL bypass, pause, scrolling and quit coverage remains intact.
- `tests/e2e/f-touch-audit.spec.ts`: checks the same menu order and both selector
  entries by touch at 390×844, 667×375 and 844×390. Globe/list bounds, Back tap
  reachability, globe closure and origin focus are covered before exercising the
  existing expanded mode/Daily/Journal flows.
- New `tests/e2e/f-title-scene.spec.ts`: 16 integration cases covering real shared
  canvas presentation and Low/High draw budgets; Dive sites and Free dive globe
  handoff; Back/Escape focus return and visible selector keyboard focus; Free dive
  tile launch; OS and saved reduced motion (stable camera/vehicle transforms,
  hidden snow, idle draw count, resize invalidation and live animation resume);
  modal draw suspension/resume; direct mission → quit → lazy home scene → Continue,
  including frozen gameplay pose; blocked optional Monterey/font requests and honest
  fallback; and mobile plate bounds, nonoverlap and 48 px action hit targets at
  320×568, 390×844, 667×375 and 844×390. Screenshots are retained through Playwright's
  `testInfo.outputPath` for desktop Low/High and mobile home/sites runs.
- `docs/architecture.md`: corrected the old globe-on-home description, menu/focus
  flow, shared-renderer draw branch, lazy crop lifecycle, fallback, motion/budgets,
  debug diagnostics and unchanged persistent/project identities.
- Added the F-TITLE-G CHANGELOG entry. The existing `f1-touch.spec.ts` manifest
  assertion already expects Bathyline; no further change was needed there.

Follow-up root-cause corrections after the orchestrator's full browser run:

- Home Controls intentionally opens `SettingsScreen.showControls(true)`, not the
  separate device-layout card used by Pause. The modal regression now asserts the
  Settings root's exact **Controls** accessible name, visible Controls region and
  focused Back to Settings button, then checks Escape/focus return and title resume.
- `shellUrl` intentionally retains `tier` and `touch` when stripping mission/debug
  parameters. The quit regression checks the complete home parameter map is exactly
  `{ tier: 'low' }`, and Continue restores exactly `{ mission: 'titanic', tier: 'low' }`.
  It still rejects any stale mission, skipBriefing or other unexpected parameters.
- Below 600 px, the spec and CSS scroll the whole home panel. A 1,018.8 px menu body
  is valid content inside that scrollport at 320×568. Mobile checks now measure
  visible regions clipped only by actual scrolling ancestors (never by the shell or
  viewport), require those scrollports to stay inside the viewport, reject horizontal
  content overflow, and check visible region nonoverlap after every action is scrolled
  into view. All 48 px sizes and centre hit-target assertions remain in place.

No application or visual files changed, including `src/app/systems/title.ts`.
No overlap with 330-f-bughunt-13. No feature cuts or look retuning.

## Verification

The orchestrator ran `tools/gates.sh --full-e2e` outside this sandbox:

- PASS build, unit, Python, content, attribution and repository-wide Prettier.
- Full E2E: 267 passed, 14 existing opt-in tests skipped, 3 failed. All three
  failures were in the new title spec; their causes and corrections are listed above.
  The other 13 new title cases passed, including Low/High budgets, selectors,
  reduced-motion transforms and mobile 390×844/667×375/844×390 layouts.
- PASS project-base E2E: 1 test passed.
- Browser artifacts: `test-results-gates-4371-2932637/`, including Low/High and mobile
  home/sites screenshots plus the three failure contexts. Logs remain in
  `.cache/gates/e2e.log` and `.cache/gates/e2e-base.log`.

After the corrections, local validation:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4360 PW_OUTDIR=dist-title-qa tools/gates.sh --no-e2e
npx playwright test tests/e2e/f-title-scene.spec.ts tests/e2e/d-shell.spec.ts tests/e2e/f-touch-audit.spec.ts --list
```

- PASS build/typecheck; unit: 102 files/1,115 tests; Python: 138 tests; content,
  attribution and repository-wide Prettier; `git diff --check`.
- PASS Playwright discovery: 37 tests in the three QA specs, including all 16 title
  cases. Assertions and test count are retained; no retries, skips or timeouts added.
- Local browser rerun is unavailable: this sandbox forbids preview server binding
  (`listen EPERM`) and standard Vite preview also hits a read-only dependency cache.
  This restriction does not describe the orchestrator's successful browser startup.

## Remaining release verification

The corrected tests await an orchestrator rerun of `tools/gates.sh --full-e2e`.
The requested full-green result is **not yet confirmed**; the last browser results
above precede these corrections. Review the generated Low/High and mobile screenshots
there. Existing title layout, route, PWA, accessibility and project-base coverage
remains included. Hidden-tab lifecycle and resource disposal are covered by existing
unit tests; real-device safe insets and 200% text-size visual acceptance remain manual
checks. No application bug or visual retuning was needed for these three failures.
