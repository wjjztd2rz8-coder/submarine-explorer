# S-bughunt: Settings/Aa and journey-driver review

## Plan and result

Review changes since `f65` (`b7f3ca59`) in two rounds: trace persistence,
keyboard ownership and CSS consumers; then exercise capability checks across
quality, mode and phone dimensions. Extend existing specs where coverage is
missing, fix only reproduced production defects, and run `tools/gates.sh`.

No production defect was confirmed by the static review or executable DOM/unit
checks. Browser acceptance is blocked by this sandbox, so this is not a clean
browser acceptance result. No speculative production or CSS fix is included.

## Round 1: history and ownership

- `ea4d7e34`: Aa replaces the increase button and cycles the existing saved
  scale through 150% back to 80%; it adds no separate preference.
- `d59d1abc`: the clipping correction wraps the Settings header and bounds
  native selects. The existing Aa tests cover Home/dive at desktop, 390×844
  and 844×390, but force Low and leave Advanced closed.
- `7d927308` (merged by `79812c8f`): the journey extension and driver correction
  change only the Journal/debrief spec. The pilot falls back to the visible
  AHEAD distance when the waypoint label is absent. Exact scan identity,
  discovery counts and both five-minute deadlines remain enforced. Its Aa
  interaction returns to 100% before piloting; it does not verify a journey at
  maximum scale.
- `Save` preserves scale during preset/Custom and quality edits; migration,
  persistence failures and reset already have capability coverage. Initial
  CSS values come from Home's title renderer or the dive renderer; live scale
  edits come from the Settings save subscription. Resize reads the current
  save rather than a boot snapshot.
- Settings uses the shared top-overlay dispatcher. Existing tests exercise
  Tab/Shift+Tab, capture cancellation, repeated Escape, nested modal ownership,
  header navigation and return to the opener. No confirmed keyboard escape or
  focus trap regression was found.

The initial settings-screen/save unit check passed all 55 tests.

## Round 2: coverage added and rerun

Extended `tests/unit/overlayFocus.test.ts` using its existing DOM harness:
18 rows (both phone widths × Low/Medium/High × Arcade/Realistic/Custom) use
real Save, Settings and Home resize consumers. Each row checks 150% through
quality/mode edits and a new session, resize, Aa wrap to 80%, and reset to
100%, including the saved value, readout and CSS variable. This is a DOM
consumer test, not a rendering or quality-performance measurement.

Extended `tests/e2e/settings.spec.ts` with four table-driven phone/Home/dive
cases. They exercise all three tiers and modes at 80%, 100% and 150%, check
the actual tier after reload, inspect horizontal overflow with Advanced open,
and rotate at 150%. Native slider keys and Aa change the preference. Existing
focus, freeze, clipping, persistence and URL-override guards are retained.
These additions probe coverage gaps; they are not claimed as failing-before
regressions, because no bug was reproduced.

Two targeted rounds passed **255 tests in six files** each: `overlayFocus`,
`settingsSave`, `settingsScreen`, `predive`, `uiHud` and `mobileResize1350`.
The second round log is `.cache/bughunt-settings/round-2-unit.log`.
Typecheck and changed-file Prettier pass; `git diff --check` passes.
Playwright discovery lists 36 Settings cases with `--repeat-each=2`.

## Gate and browser limits

Ran `GATES_CONFIG_MODE=writable bash tools/gates.sh`. Logs are in
`.cache/runs/20261026-064958-2-VKhM2p/`:

- Pass: config preparation, strict content validation and production build.
- Python: 167 tests, five failures. Four build-manifest checks report
  `spawnSync git EPERM`; the golden-tool subprocess check receives empty JSON
  output. These files were not changed.
- Full unit phase printed only its RUN header and made no further progress
  for several minutes; interrupted with Ctrl-C (exit 130). The gate did not
  reach its remaining phases and is not claimed green.
- Separate attribution passes. Repository-wide Prettier fails on unchanged
  `plan/OVERNIGHT-LOG.md`; both changed test files pass.

The two-repeat Settings browser command fails before any test body runs:
the preview cannot listen on localhost (`listen EPERM 127.0.0.1:4374`). Logs:
`.cache/bughunt-settings/browser.log` and `preview.log`. An independent
Chromium startup also fails with `sandbox_host_linux.cc` / `shutdown:
Operation not permitted`. Rendered clipping, browser-native keyboard behavior
and both journey rounds therefore remain unverified here.

On a browser-capable runner, build current HEAD and run:

```sh
npm run build
npx playwright test tests/e2e/settings.spec.ts --repeat-each=2
npx playwright test tests/e2e/journal-debrief.spec.ts --grep 'unaided journey' --repeat-each=2
bash tools/gates.sh
```

## Simplicity

Only existing capability specs, this evidence note and plan-log formatting change. No UI elements,
settings, runtime config mutation, CSS layout patches, package-named specs or
production branches are added. Browser-blocked hypotheses are not promoted
to confirmed defects or production fixes.

## Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh` outside the sandbox. Run
`.cache/runs/20261026-065608-2221652-TtrWUc/` passed Python, content, build,
the full unit suite, smoke e2e, project-base e2e and attribution. Only Prettier
failed, on `plan/OVERNIGHT-LOG.md`.

The cause was trailing whitespace on the run 161 collection entry. Applied
Prettier to that file; its only change removes that whitespace. No assertions
or gate configuration changed. Repository-wide Prettier and `git diff --check`
pass after the correction. The orchestrator's smoke gate does not execute the
Settings matrix or the two unaided journey rounds; those browser acceptance
checks remain outstanding.
