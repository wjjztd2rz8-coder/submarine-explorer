# S-verify-phone-hud

Status: verification INCOMPLETE, environment blocked (Codex, 2026-11-04). No product defect reproduced; no product code changed.

## Scope and plan

Verify Home, site selection, briefing, the first 60 seconds of HUD, pause/Surface and debrief for every catalog site at 390×844 and 844×390, with native touch enabled and Low/Arcade defaults.

1. Read `plan/DIRECTOR.md` and search existing capability specs.
2. Run `phone-accept.spec.ts`, `hud-touch.spec.ts` and `f1-touch.spec.ts` against the current build.
3. Extend existing capability coverage for gaps; fix only demonstrated defects.
4. Run named regression cases and static checks; record results and limits.

## Round 1: coverage audit and baseline attempt

Searched `tests/e2e` for guidance, half-height selection, Home fit, tutorial/depth skip, opening poses, Surface, debrief and touch controls. Relevant coverage: `phone-accept.spec.ts`, `hud-touch.spec.ts`, `f1-touch.spec.ts`, `globe-pins.spec.ts`, `f-title-layout.spec.ts` and `journal-debrief.spec.ts`.

- Existing all-site tutorial/reload coverage includes both requested viewports, but freezes or moves the submarine and does not cover an ordinary idle first minute.
- Phone acceptance covers Home and briefing at both sizes, mostly at Titanic. No explicit assertion guarded the full-row pause Surface action.
- Portrait half-height selection already has a globe-pins regression guard. Landscape intentionally displays the list beside the globe (`home.css`), so a half-height assertion there would contradict the design.
- Baseline command attempted:

  ```sh
  GATES_CONFIG_MODE=writable PW_PORT=4351 npx playwright test tests/e2e/phone-accept.spec.ts tests/e2e/hud-touch.spec.ts tests/e2e/f1-touch.spec.ts --output=.cache/phone-hud-baseline
  ```

  Failed before any test executed: the preview server could not start. Running its command directly identified `listen EPERM: operation not permitted 127.0.0.1:4351`. This sandbox denies opening the local server port. No phone screenshots or runtime acceptance results were produced.

## Round 2: capability gaps and static verification

Extended `tests/e2e/phone-accept.spec.ts` with one catalog-driven test at each requested viewport: 26 new cases. Each case:

- Uses native touch and the real Home → site selection → briefing flow. Seeds progression only to expose every destination, leaves scans/tutorial history fresh, and requests reduced motion for stable geometry reads.
- Measures portrait selection at half viewport height before expansion, deliberately scrolls the site list, and checks hit targets before tapping.
- Checks every briefing objective and Begin for viewport reachability.
- Advances 60 seconds in 100 ms frames, retaining normal physics and wildlife; checks HUD overlap every second and asserts the mission clock advanced a full minute. No teleport or frozen submarine is used during this interval.
- Saves Home, picker, briefing, HUD at 0/21/60 seconds, pause and debrief screenshots when run.
- Guards Titanic's delayed `Marker N m ahead` guidance in both orientations.
- Dismisses the tutorial through its touch Skip controls, rechecks the HUD, measures Surface across the whole pause grid, opens debrief, checks its primary/More options and all expanded actions, then returns Home.

The matrix uses all 13 catalog sites: Great Blue Hole, Hunga Tonga, Blake Plateau, Lost City, Kamaʻehuakanaloa, Axial Seamount, Hudson Canyon, Monterey Canyon, Endurance, Titanic, Bismarck, Beebe and Challenger Deep. **Both orientations at every site remain runtime-unverified.** The idle-minute cases supplement the existing active touch, tutorial, scan/reward and reload specs; they do not establish a successful piloted approach at each site.

### Checks completed

- `npm run typecheck`: PASS.
- `npx prettier --check tests/e2e/phone-accept.spec.ts plan/progress/S-verify-phone-hud.md`: PASS.
- `git diff --check`: PASS.
- `npx vitest run tests/unit/guidance.test.ts --configLoader runner --cache=false`: 149 PASS.
- `npx vitest run tests/unit/f3Onboard.test.ts tests/unit/onboardCompletion.test.ts --configLoader runner --cache=false`: 61 PASS, including the depth-skip boundary.
- Playwright discovery: 26 new matrix cases; 233 total tests across the three requested phone/touch spec files. Discovery is not execution.
- App production build: PASS using a temporary local Rolldown bundle of `vite.config.ts`, then `npm run build -- --config .cache/phone-hud-vite.config.mjs --configLoader native`. This uses the same config bundling strategy as writable gates mode and avoids writes to the read-only shared dependencies. The initial gates build bundled successfully but its separate CI-manifest step failed with `spawnSync git EPERM`; the direct production build exited 0.

### Named browser runs attempted

All three commands below failed at preview startup, before executing tests, for the same port-binding restriction:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4351 npx playwright test tests/e2e/phone-accept.spec.ts -g 'site picker, briefing, first minute and Surface stay reachable' --output=.cache/phone-hud-first-minute
GATES_CONFIG_MODE=writable PW_PORT=4352 npx playwright test tests/e2e/hud-touch.spec.ts -g 'catalog tutorial and reload.*(390x844|844x390)' --output=.cache/phone-hud-catalog
GATES_CONFIG_MODE=writable PW_PORT=4353 npx playwright test tests/e2e/f1-touch.spec.ts -g 'stick moves the sub, scan holds, pause opens by touch' --output=.cache/phone-hud-touch-input
```

## Remaining work

Run the full three-spec command and the named matrix in an environment that permits the preview server/browser, inspect the generated screenshots/geometry failures, and fix only demonstrated defects. This item is not ready to mark DONE. No real-phone or visual acceptance is claimed.

## Simplicity

Only existing capability coverage and this evidence note changed. No new product UI, settings, per-site tuning, layout patches or package-named spec; existing regression assertions remain intact.
