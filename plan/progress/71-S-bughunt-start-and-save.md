# S-bughunt — mission starts, saves and touch layout

Date: 2026-10-28. Base: `146a7da5`. Two audit rounds: shipped-content and migration checks first; full-prop, nonfinite-input and post-fix checks second.

## Ranked findings and reproduction

1. **P3 — nonfinite first-primary coordinates escape mission clearance (fixed).**
   `composedMissionSpawn` accepted a first primary with NaN X or Z and returned a non-null pose with NaN coordinates and yaw. Bounds/range comparisons with NaN are false, while the scoring expression can remain finite. This is a defensive correctness issue; no shipped site reproduced it, and upstream tile/POI validation limits its reachability. A one-line guard now rejects nonfinite first-primary coordinates before searching. No broader spawn algorithm change.

   Repro: use Titanic, first-primary position `(NaN, -480, 0)` or `(0, -480, NaN)`, flat seabed `-500`, empty props, default spawn settings, safe depth `-1000`, and a tile centered at `(0,0)` with bounds ±0.01 degrees. Previously returned a pose; now returns `null`. The permanent regression exercises all three axes with NaN and both infinities:

   ```sh
   npx vitest run tests/unit/gameSpawn.test.ts -t 'mission spawn rejects a nonfinite first primary' --configLoader runner --cache=false --pool=threads --maxWorkers=1
   ```

   Executed before the fix: **2 failed / 7 passed / 15 skipped**. Executed after the fix as part of the full file: **24 passed**.

2. **Open validation gap — touch start controls and briefing footer remain unverified in a browser.**
   Existing compact-briefing and touch journey specs were invoked at 390×844 and 844×390. Every invocation stopped before test execution because the preview server could not start. Debug output records localhost connections denied with `EPERM` for both `::1` and `127.0.0.1`. This is an environment blocker, not evidence of an overlap or a product failure. There are no new browser screenshots or browser passes.

   Manual repro/check still required: open Titanic and Great Blue Hole mission briefings on a touch device at each requested size; expand Advanced; check the Start at surface label/switch, mode segments, and Advanced control for overlap and hit testing; check Back to home, Free dive and Begin dive in the footer, both before and after expanding About this site. Start position now lives in Advanced; the former separate start-choice radiogroup is absent in the production saved-settings path. Static review found the removed CSS targeted that former structure, but cannot establish rendered layout.

No confirmed shipped-site terrain/prop/scan-floor regression or removed-key save-load regression was found in executed checks.

## Mission clearance evidence

`missionApproach.test.ts` passed all **81 tests** before the fix: all 13 sites × both modes × all three tiers, plus catalog/two pilot-route cases. It checks finite coordinates, tile bounds, rated depth, visible hull clearance, prop keepout, actual resolved scan radii including Arcade's 100 m floor, approach transit, and 64 camera-arm samples at desktop, portrait and landscape aspects. Its prop fixture loads procedural props only.

An additional local audit loads **every shipped prop**, including glTF geometry (only texture decoding is stubbed), at Low tier for all 13 sites and both modes. All **26 site/mode rows passed**, including 64 camera-arm samples at each of the three aspects. Minimum visible hull clearance: **15.50 m** at Hudson; minimum sampled arm terrain clearance: **23.44 m** there. Minimum margin outside the effective scan radius of every primary: **10 m** in Arcade and **80 m** in Realistic (79.99999999999999 from floating-point arithmetic).

| Site                 | Visible hull clearance, m | Camera arm clearance, m | Scan margin Arcade / Realistic, m |
| -------------------- | ------------------------: | ----------------------: | --------------------------------: |
| great-blue-hole      |                    109.49 |                  114.79 |                    50.00 / 106.80 |
| hunga-tonga-caldera  |                     30.27 |                   37.01 |                     20.00 / 84.00 |
| blake-plateau-corals |                     49.94 |                   54.80 |                    40.00 / 100.00 |
| lost-city            |                     46.07 |                   61.79 |                    28.00 / 124.00 |
| kamaehuakanaloa      |                     45.08 |                   56.59 |                     10.00 / 80.00 |
| axial-seamount-ashes |                     18.58 |                   25.90 |                     10.00 / 80.00 |
| hudson-canyon        |                     15.50 |                   23.44 |                     12.00 / 80.80 |
| monterey-canyon      |                     80.12 |                   94.24 |                    24.00 / 132.00 |
| endurance            |                     20.72 |                   27.99 |                     10.00 / 80.00 |
| titanic              |                     26.06 |                   33.33 |                    40.00 / 104.00 |
| bismarck             |                     21.38 |                   29.25 |                     10.00 / 80.00 |
| beebe-vent-field     |                     38.33 |                   48.32 |                    28.00 / 124.00 |
| challenger-deep      |                     17.17 |                   24.36 |                     40.00 / 92.00 |

The local synthetic audit additionally checks NaN/infinite terrain, impossible surface/depth clearance, nonfinite first-primary axes and missing primaries. Post-fix: **14 audit tests passed** (13 site tests plus the edge-case test). `TileLoader` rejects nonfinite height samples and invalid metadata before terrain creation; mission parsing rejects malformed authored near-site overrides. Sparse terrain/prop sampling remains sampling, not a continuous collision proof.

Local evidence: `.cache/bughunt-opening.audit.test.ts`, `.cache/bughunt-full-props.json`, `.cache/bughunt-full-props-after.log`.

## Save/settings migration evidence

Reviewed `Save.load`, `migrate`, `sanitizeGameplay`, progress migration and the recent sweep diffs (`b17e3a50`, `c2c0e237`, `73632a64`, `89e774bd`, `4865993c`). Removed water fields (`fogDensityShallow`, `fogDensityDeep`, `fogDeepAt`, `deepColor`, `ambientIntensity`) and the terrain terrace config were GameConfig tuning, not required SettingsData members. Asset exports, helper visibility and type aliases do not change stored JSON schemas.

`settingsSave.test.ts` and `saveSoak.test.ts`: **118 passed**. Coverage includes legacy settings and earned-progress fixtures, malformed/current-key recovery, protected future versions, unknown extensions, and repeated edits/reloads with retired gameplay keys (`speedProfile`, `descentProfile`, `lights`, `sensors`, `sonarMarkers`, `simSpeed`) and `simSpeedDefault`. Removed controls are discarded; unknown extensions survive.

A second local audit seeds unversioned/v0/v1/v2/v3 settings with removed water/terrace extensions and retired gameplay keys, loads through `Save`, edits captions, and reloads. **5 passed**. Existing captions and Ultra→High migration survive; legacy blobs remain intact; obsolete gameplay keys do not reach effective settings. No migration code change was needed.

Local evidence: `.cache/bughunt-migration.audit.test.ts`, `.cache/bughunt-migration.log`.

## Executed commands and results

```sh
# Round 1: 214 passed (81 approach + 15 original spawn + 118 save/settings).
npx vitest run tests/unit/missionApproach.test.ts tests/unit/gameSpawn.test.ts tests/unit/settingsSave.test.ts tests/unit/saveSoak.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1

# Round 2: 24 spawn passed, 14 full-prop/edge audit passed, 5 migration audit passed.
npx vitest run tests/unit/gameSpawn.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1
npx vitest run --config .cache/bughunt-vitest.mjs --configLoader native
npx vitest run --config .cache/bughunt-migration-vitest.mjs --configLoader native

# Post-fix full approach matrix: 81 passed in 133.15 s.
npx vitest run tests/unit/missionApproach.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1

npx tsc --noEmit
npx prettier --check src/game/Spawn.ts tests/unit/gameSpawn.test.ts
npx vite build --config .cache/bughunt-vite.mjs --configLoader native
git diff --check
```

TypeScript, changed-code formatting, production bundle and whitespace checks passed. The ordinary build initially failed writing to the shared read-only `node_modules/.vite-temp`; the runner-loader build then hit the existing PWA plugin's late-import lifecycle error. A local Rolldown bundle of the unchanged Vite config with the native loader produced the successful build. No tool or config source was changed. The normal large-chunk warning remains.

Grepped `tests/e2e` for the affected start, mission-opening, save, start-choice, footer, overlap and viewport capabilities. The following commands were **executed and blocked before any test ran**, with `GATES_CONFIG_MODE=writable`, separate `PW_PORT` values 4271–4276 and output/log directories under `.cache/bughunt-e2e-*`:

```sh
npx playwright test tests/e2e/f-briefing-900.spec.ts -g 'compact briefing (390x844|844x390)'
npx playwright test tests/e2e/f-bughunt-960.spec.ts -g '960 (390x844|844x390).*titanic arcade low: briefing, assisted scan, Journal, debrief and saves'
npx playwright test tests/e2e/f-save-soak.spec.ts -g 'four dives, mode switches, restarts and reloads preserve saves without scene leaks or errors'
npx playwright test tests/e2e/d-start.spec.ts -g 'Custom near-site starts retain the authored approach at deep and shallow sites'
npx playwright test tests/e2e/opening-framing.spec.ts -g 'titanic low: mission previews and opens on an approach outside scan range'
```

The opening and d-start attempts were made against the rebuilt post-fix bundle. The compact-briefing spec sets phone viewport sizes without touch emulation; the 960 journey spec explicitly enables `hasTouch` and `isMobile` at both requested sizes. Neither establishes a pass here. Debug details: `.cache/bughunt-e2e-briefing-debug.log`.

No merge, push, tag, DIRECTOR edit or tools edit.

## External gate follow-up

The orchestrator's external run is recorded in `.cache/runs/20261028-080754-4007412-TRpJQN/`. Its supplied output reports **PASS python**, **PASS content** and **PASS build**. Local logs confirm 167 Python tests passed, all 13 content sites validated with zero warnings/errors, and the production bundle built successfully outside this sandbox. The unit log was still updating when this follow-up began; it had no failure or final summary. Browser and project-base outcomes were not supplied. No additional code or assertion change is justified by these passing gates alone.
