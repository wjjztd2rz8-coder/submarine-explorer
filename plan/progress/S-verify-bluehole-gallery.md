# S-verify-bluehole-gallery

Verify merged V-bluehole-gallery-2 (`35d20fa6`) numerically; no visual judging.

## Plan

1. Inspect the merged dimensions/radius and the production placement, spawn, scanner and budget paths.
2. Extend `blueHoleProps`, `missionOpeningSafety` and `terrainMerge1140`: pin the 92×22×20 m prop and 46 m authored radius; prove a collision-free opening approach and completed scan at the exact minimum depth in Arcade/Realistic on Low/Medium/High; check the composed free-dive hero pose and tier budgets.
3. Run focused unit checks and relevant existing E2E tests selected by capability/name. Fix only demonstrated defects, then repeat verification (two rounds).

## Progress

- Inspected `35d20fa6`, existing capability tests, spawn/scan radius resolution and E2E coverage. The authored radius is further capped for mission approaches and transformed by the active sensor/mode; verification must use that effective radius.
- Extended only the requested existing capability specs. No new spec, production change, data change or snapshot rebaseline.
- Round 1: original four-file baseline passed (75 tests). Extended capability run passed (67 tests); existing Blue Hole geometry and free-dive snapshot checks passed (4 tests). A mistaken test expectation of 32.5 m was corrected to 39 m after accounting for the shipped 1.2× equipment multiplier.
- Build passed using a locally bundled config loaded natively; the default loader cannot write into the shared read-only dependency tree. TypeScript, formatting and diff checks passed.
- Round 2: added free-dive camera-arm collision checks on desktop, portrait and landscape; all 67 capability tests passed again. All six mode/tier combinations pass, including all 18 camera layouts. Numeric audit records are saved in `.cache/bluehole-gallery-verification/opening-round{1,2}.json`.

## Results

The main prop is pinned at **92×22×20 m** and its authored POI radius at **46 m**. Mission setup caps the base radius to `(125 − 60) / 2 = 32.5 m`. With shipped equipment/sensors, the actual opening scan radius is **100 m Arcade / 39 m Realistic**. The mission starts **125 m** from the first primary on every tier.

The new scan checks use real survey heights, the tier-specific runtime terrain and placed prop colliders. They find a straight approach sampled at intervals no greater than 1 m, enforce the 8 m hull radius plus 4 m seabed clearance, aim within the vehicle's ±45° pitch limit, reject scanning at 9.999 m depth, and complete the actual Scanner hold at exactly **10 m** depth. All six combinations pass both rounds:

| Tier   | Mode      | Scan-station range (m) | Minimum route altitude above seabed (m) |
| ------ | --------- | ---------------------: | --------------------------------------: |
| Low    | Arcade    |                98.0627 |                                 17.4891 |
| Medium | Arcade    |                98.0627 |                                 17.4891 |
| High   | Arcade    |                98.0696 |                                 17.5983 |
| Low    | Realistic |                38.3805 |                                 61.7678 |
| Medium | Realistic |                38.3805 |                                 61.7678 |
| High   | Realistic |                38.3981 |                                 59.5374 |

The composed free-dive poses clear prop colliders with the full 8 m hull sphere and every transformed vertex of the 26 m Class B submarine, in both modes on all tiers. No hull contacts. The 18 mode/tier/layout camera-arm checks also have zero prop contacts and stay above the seabed; minimum arm altitude is 29.7919 m.

Full-prop geometry census (instances included; excludes terrain, submarine, wildlife and post-processing):

| Tier   | Mesh draws | Triangles | Local triangle ceiling |
| ------ | ---------: | --------: | ---------------------: |
| Low    |          7 |    23,880 |      24,000 (existing) |
| Medium |          9 |   102,546 |                103,000 |
| High   |          9 |   155,790 |                156,000 |

Medium/High guards extend `terrainMerge1140` using the current frozen geometry costs; the Low ceiling and draw pin are unchanged. These also fit the existing 1,200-draw / 1,200,000-triangle static prop limits. Existing Blue Hole geometry snapshots pass without updates. Actual rendered frame counters could not be measured in this environment.

## Commands and browser limitation

Successful commands:

```sh
npx vitest run --configLoader runner --cache=false tests/unit/blueHoleProps.test.ts tests/unit/missionOpeningSafety.test.ts tests/unit/terrainMerge1140.test.ts
npx vitest run --configLoader runner --cache=false tests/unit/props-geo.test.ts tests/unit/freeDiveComposition.test.ts -t 'great-blue-hole'
npx tsc --noEmit
npx prettier --check tests/unit/blueHoleProps.test.ts tests/unit/missionOpeningSafety.test.ts tests/unit/terrainMerge1140.test.ts
git diff --check
```

Build: bundle the unchanged `vite.config.ts` and its local imports under `.cache/gates/`, then `npx vite build --config .cache/gates/vite.config.js --configLoader native`. This completes the production bundle, public-data copy and PWA stamp. The runner loader alone hits Vite's existing late-import shutdown issue; no build tooling was changed.

Searched `tests/e2e` with `rg` for Blue Hole, scan, collision and budget coverage. Attempted the relevant existing capability tests with the requested spec/name form:

```sh
GATES_CONFIG_MODE=writable npx playwright test tests/e2e/opening-framing.spec.ts -g 'great-blue-hole.*mission previews and opens on an approach outside scan range'
GATES_CONFIG_MODE=writable npx playwright test tests/e2e/opening-framing.spec.ts -g 'great-blue-hole: underwater free-dive opening and 15 m detail'
GATES_CONFIG_MODE=writable npx playwright test tests/e2e/terrain-render.spec.ts -g 'great-blue-hole: karst-grotto across five wall views'
```

All three were blocked **before browser/test launch**: the preview server could not start. `DEBUG=pw:webserver` confirmed `connect EPERM` for both `::1:4370` and `127.0.0.1:4370`. They are not counted as passing. Browser scan integration and live frame budgets remain unverified here; the completed headless numeric checks do not establish GPU frame time or visual acceptance.

No demonstrated production defect; no production fix required by the completed numeric checks.
