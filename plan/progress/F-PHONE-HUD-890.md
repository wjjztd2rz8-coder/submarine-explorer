# F-PHONE-HUD-890 — Phone HUD declutter

2026-10-08: static gates pass; **browser acceptance remains open**. The
orchestrator ran full e2e outside the sandbox: 419 passed, 34 skipped and seven
failed; project-base e2e passed. The seven failures have presentation fixes
below, with every test/assertion unchanged in this follow-up. A new browser
run is required to establish that the fixes pass. Local Vite/Chromium remain
unavailable (`EPERM`), as confirmed during the initial implementation.

## Gate follow-up: seven failures

| Failure                             | Root cause                                                                                                                                                                                                            | Fix                                                                                                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 360×640 touch audit, 80/100/150%    | The shared 230 px tutorial offset crossed the submarine's projected centre on short portrait.                                                                                                                         | Use a 172 px bottom offset below 700 px height: the capped controls occupy 168 px, with a 4 px gap. The 390×844 dock remains unchanged.                                                                       |
| 667×375 touch audit, 80/100/150%    | ExploreNotice's separately imported narrow-landscape styles changed the scan panel to grid and its text wrapper to `display: contents`, adding rows above the tutorial.                                               | Explicitly keep visible phone scan cards and their text wrapper in flex layout, with selectors that win regardless of import order. Hidden cards still match the original hidden rules.                       |
| 844×390 Realistic Blue Hole Surface | The older powered-HUD `.hud-row:is(...)` selector outranked the generic flex row override, stacking labels above values. Complete supplies/current then pushed telemetry to y=220.97 over buttons beginning at y=202. | Match the powered selector's specificity to restore inline core rows. Reduce optional landscape supplies/current spacing and use 11 px / 13 px text, retaining every live value and both current speed units. |

Only `src/styles/hud-layout.css` changes implement these fixes. No e2e source,
assertion, geometry tolerance, timing or expected visibility was changed in
this follow-up. The old browser log is preserved at
`.cache/phone-hud-890-review/orchestrator-e2e-before.log`; failure evidence remains
in `test-results-gates-4372-1285924/`. The Realistic Surface screenshot and bounds
JSON were inspected. All four requested site/orientation 10 s gate captures
were also inspected and copied into the package's after directory; they precede
this follow-up and are not proof of the seven fixes.

## Changes

- Phone portrait through 480 px and short touch landscape through 900 px
  (including 844×390 and the existing 667×375 audit): keep ScanOverlay's target,
  distance, progress and turn/hold hint. Hide the duplicate waypoint chip,
  waypoint instruction and mission objective list while the scan card is up.
  Mission title, alerts and completion actions remain; the objective instruction
  returns when no scan card is visible. World/sonar contact symbols remain.
- Collapsed sonar is 96 px wide with its canvas capped at 96 px high. Remove
  the phone legend and collapse range controls into the expanded map, where
  both zoom buttons retain their 44 px hit targets. Tap the map or the existing
  SONAR button to expand. Desktop sonar input and styling are unchanged.
- Depth/knots share the first telemetry row; status/hull rating share the
  second. Keep the hull stress track. Surface depth reads SURFACED;
  complete depth/speed/hull descriptions remain in the DOM for assistive
  technology. Enabled supplies and currents retain additional rows.
- Tutorial instructions use short touch copy, without the step heading, title
  and dots. One 44 px Skip button calls the existing skip-step action; the last
  Skip finishes and persists the tutorial as before. The five steps, automatic
  advancement, events and desktop Skip step / Skip tutorial are unchanged.
  Dock the card above the controls, away from the chase submarine centre.
- Data chip sits below the collapsed sonar. Expanded sonar moves it to a
  reserved lower slot. Existing free-slot placement for open credits remains.
- All layout changes are gated on `html.is-touch` and phone media queries.
  Desktop/tablet layout rules remain in place. No scan, camera, physics,
  mission content, save schema or tutorial-step logic changes.

## Before/after screenshots

The orchestrator produced **10 s after captures** during its failing full gate.
They are now linked below. Fresh 60 s after captures and screenshots of the
seven fixed cases are still pending.

These four **historical before** PNGs were copied from the director's existing
510 audit and visually inspected. They are reference evidence, not a freshly
rendered control run from this checkout. The Blue Hole reference shows its older
atoll-dropoff approach; changes to that site's opening in other packages mean
it is not a controlled geometry comparison. The shared screenshot symlink was
replaced with a local directory because its target is outside writable roots;
no shared screenshots were altered.

| Viewport / site           | Before: existing, inspected                                                                                      | After: 10 s captured; 60 s pending                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 390×844 / Titanic         | [60 s before](../../.cache/codex/shots/890-f-phone-hud-declutter/before/390x844/titanic/06-dive-60s.png)         | [10 s after](../../.cache/codex/shots/890-f-phone-hud-declutter/after/390x844/titanic/06-dive-10s.png); `after/390x844/titanic/06-dive-60s.png` — pending                 |
| 390×844 / Great Blue Hole | [60 s before](../../.cache/codex/shots/890-f-phone-hud-declutter/before/390x844/great-blue-hole/06-dive-60s.png) | [10 s after](../../.cache/codex/shots/890-f-phone-hud-declutter/after/390x844/great-blue-hole/06-dive-10s.png); `after/390x844/great-blue-hole/06-dive-60s.png` — pending |
| 844×390 / Titanic         | [60 s before](../../.cache/codex/shots/890-f-phone-hud-declutter/before/844x390/titanic/06-dive-60s.png)         | [10 s after](../../.cache/codex/shots/890-f-phone-hud-declutter/after/844x390/titanic/06-dive-10s.png); `after/844x390/titanic/06-dive-60s.png` — pending                 |
| 844×390 / Great Blue Hole | [60 s before](../../.cache/codex/shots/890-f-phone-hud-declutter/before/844x390/great-blue-hole/06-dive-60s.png) | [10 s after](../../.cache/codex/shots/890-f-phone-hud-declutter/after/844x390/great-blue-hole/06-dive-10s.png); `after/844x390/great-blue-hole/06-dive-60s.png` — pending |

All after paths are relative to `.cache/codex/shots/890-f-phone-hud-declutter/`.
The 510 spec now includes both requested sites in both phone orientations and
can capture 10/30/60 simulation seconds plus the complete Home/Journal/debrief
journey, with geometry manifests. Existing site/viewport journeys remain.

## E2e expectation changes

Only expectations affected by the presentation were changed:

- `f-touch-audit`, `f-bughunt-15`, `f-hud-layout`, `f3-onboard`, `f-verify-530`:
  operate the existing skip-step button by its component selector or the single
  accessible name Skip on phones. Desktop/tablet retain both original names.
  All five step checks remain; the hidden step count assertion becomes the
  equivalent `data-step` assertion. Final dismissal uses the last Skip.
- `f-toast-placement`, `f-verify-740`, touch `f3-onboard`: dismiss through the
  visible phone Skip actions, checking advancement each time, instead of the
  removed phone Skip tutorial action. Desktop keeps Skip tutorial. Toast,
  Journal, Controls, saved completion and geometry assertions remain.
- `f-first-minute-620`, `f-copy-regress`: in-range phones assert that the mission
  row is hidden and the single scan name/hint is visible. Other states still
  assert the current mission row. The authored-copy fixture measures every
  title/hint with the scan card hidden in the same synchronous browser task,
  preserving every text, visibility, clipping and bounds assertion.
- `f-touch-audit`: collapsed zoom buttons are intentionally hidden. Expanded
  zoom buttons still each undergo the original 44 px hit-test assertions.
  Expansion now starts by tapping the map; the SONAR button still closes it.
  All existing panel containment, pairwise overlap, control reachability,
  long scan-name, mission, menu and Journal checks remain.
- Additional checks in the 510/touch audits assert the 96 px sonar, hidden
  legend/compact zoom controls, exactly one visible Skip, at most two actual
  instruction lines without clipping, the two telemetry rows, hidden duplicate
  target labels, and no tutorial overlap with the submarine's actual camera
  projection. The orchestrator executed these assertions: the requested 390×844 and 844×390 Arcade cases passed; the six smaller-phone failures above remain pending revalidation.

## Verification and remaining work

- Follow-up local validation: PASS build/typecheck, all 1,459 unit tests in
  143 files, 148 Python tests, strict content, attribution, repository Prettier
  and `git diff --check`. The combined local static gate was interrupted during
  unit execution; the full unit suite and remaining checks were then run
  separately and passed. Logs: `.cache/phone-hud-890-review/`.
- For quick external revalidation after rebuilding, run
  `PW_PORT=4372 PW_OUTDIR=dist-phone-890 npx playwright test tests/e2e/f-touch-audit.spec.ts tests/e2e/f-verify-740.spec.ts --repeat-each=3 --output=test-results-phone-890-fixes`,
  then run the full gates and 60 s captures below. Local browser execution is
  still unavailable; no post-fix browser pass is claimed.
- Full gate command: `GATES_CONFIG_MODE=writable PW_PORT=4890 PW_OUTDIR=dist-phone-890 tools/gates.sh --full-e2e`.
- PASS build/typecheck; 143 unit files, 1,459 tests; Python; strict content;
  attribution; repository Prettier; `git diff --check`. Vite's default config
  bundler cannot write to the shared read-only node_modules directory, so the
  repository's existing writable-config gate mode was used.
- Final source rebuild passed after the last presentation refinements; all
  46 existing HUD/sonar/onboarding tests in six selected unit files passed.
  Logs: `.cache/phone-hud-890-final-build.log` and
  `.cache/phone-hud-890-final-unit.log`.
- External full-suite e2e: 419 passed, 34 skipped, seven failed (listed above).
  External project-base e2e: PASS. All nine 510 journeys passed at the default
  10 s capture duration. This follow-up still needs external browser validation.
  Preserved logs: `.cache/phone-hud-890-review/orchestrator-e2e-before.log` and
  `.cache/phone-hud-890-review/orchestrator-e2e-base-before.log`.
- 510 + touch audit, three requested repetitions: blocked before tests. Log:
  `.cache/phone-hud-890-audits.log`. No behavioral/browser pass is inferred from
  passing static checks or source geometry review. The 60 s three-repeat run
  still requires the orchestrator.

Run in a browser-capable checkout, then inspect all four 60 s after images,
all-step touch audit and expanded sonar screenshots, and desktop captures:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4890 PW_OUTDIR=dist-phone-890 tools/gates.sh --full-e2e
GATES_CONFIG_MODE=writable PW_PORT=4890 PW_OUTDIR=dist-phone-890 \
  FLOW_AUDIT_SECONDS=60 \
  FLOW_AUDIT_SHOTS=.cache/codex/shots/890-f-phone-hud-declutter/after \
  npx playwright test tests/e2e/f-flow-audit-510.spec.ts tests/e2e/f-touch-audit.spec.ts \
  --repeat-each=3 --output=test-results-phone-890
```

Acceptance remains open until those audits pass and the fresh screenshots show
legible instruments, reachable controls and an unobscured submarine centre at
both requested sizes and sites.
