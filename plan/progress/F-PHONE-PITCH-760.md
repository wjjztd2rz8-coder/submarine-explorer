# F-PHONE-PITCH-760 — non-hero opening poses

2026-10-05. Sites fixed: **Bismarck** and **Hunga Tonga**. All eight non-hero sites now pass the requested numeric pose checks.

## Method and limits

`tests/unit/phonePitch.test.ts` uses the actual tile heightmaps, tier-specific `Terrain`, procedural `Props`, parsed/placed POIs, `Scanner.update(0, ...)`, `composedFreeDiveSpawn`, `composedMissionSpawn`, and `CameraRig.snap`. Arcade fits each site's depth with `chooseFreeDiveHull`, matching the existing scene tests.

Each of the eight sites is checked on **Low and Medium**, for both **free dive and near-site mission** openings, at **390×844 portrait**, **844×390 landscape**, and **16:9 desktop** aspect ratios: 32 poses and 96 camera checks, plus a test that the eight sites exactly complement the Director's five heroes.

- Hero proximity is 3D distance from the sub centre to the authored hero's transformed world bounding box, following the existing readability tests. Each distance must be within the configured **97.69 m chase radius**. This measures distance to the prop's footprint, which matters for a long wreck, rather than its origin.
- Camera clearance is eye Y minus `Terrain.sampleHeight` at the eye. The tests require at least **6 m**, and keep the camera at least **2 m underwater**.
- First primary distance is the 3D distance to the nearest mission primary; it must be **≤120 m**. The actual first-frame Scanner hint is separately required to exist and be **≤120 m**. Missions permit primary scans in any order: Hudson opens at the coral ledge and Hunga at the rim slope, beside their authored scenery.
- Hull collision (including a 4 m margin), seabed spawn clearance, and fitted hull depth are also checked.

These are headless numeric checks. They do not certify rendered beauty, touch HUD overlaps, or phone FPS. As in `marineSnowReadability.test.ts`, props are restricted to local procedural builders; Blake's two optional GLB rocks are excluded. Its authored procedural hero and all terrain/POIs are included. A target within 120 m can still require approaching its smaller authored scan radius; immediate scan readiness is not asserted.

## Results

All distances are metres. Paired values are **Low / Medium**. Free dive and near-site mission produced identical poses and measurements at each site; the table therefore covers both. All three aspect ratios passed.

| Site                   | Hero distance after | Camera terrain clearance after | First primary before | First primary after | Result                           |
| ---------------------- | ------------------: | -----------------------------: | -------------------: | ------------------: | -------------------------------- |
| Challenger Deep        |       67.59 / 67.59 |                  61.72 / 61.65 |        75.58 / 75.57 |       75.58 / 75.57 | Pass; pose retained              |
| Endurance              |       63.49 / 63.51 |                  60.35 / 60.51 |        78.09 / 78.11 |       78.09 / 78.11 | Pass; pose retained              |
| Axial Seamount / ASHES |       62.52 / 62.53 |                  58.74 / 59.33 |        60.34 / 60.33 |       60.34 / 60.33 | Pass; pose retained              |
| Hudson Canyon          |       75.06 / 75.05 |                101.43 / 100.97 |      106.35 / 106.34 |     106.35 / 106.34 | Pass; pose retained              |
| Kamaʻehuakanaloa       |       46.08 / 46.09 |                136.13 / 137.30 |        49.17 / 49.21 |       49.17 / 49.21 | Pass; pose retained              |
| Bismarck               |       48.51 / 48.62 |                  63.58 / 63.84 |      130.01 / 130.03 |     109.13 / 109.14 | Fixed: approach range 110 → 85 m |
| Hunga Tonga            |       75.00 / 75.00 |                  84.92 / 84.51 |      129.57 / 129.73 |     105.13 / 105.33 | Fixed: approach range 100 → 75 m |
| Blake Plateau          |       65.70 / 65.70 |                  77.15 / 77.71 |      103.09 / 103.19 |     103.09 / 103.19 | Pass; pose retained              |

Before the correction, Bismarck's first primary was about 130 m away. Hunga's first primary was about 130 m away and its hero footprint was 100 m away, beyond the 97.69 m arm. All cameras already cleared terrain on Low; the two shorter approaches retain safe camera and hull clearance. No camera configuration or POI data changes were needed.

| Site                   | Nearest mission primary  | Actual first Scanner hint    | Hint distance after (Low / Medium) |
| ---------------------- | ------------------------ | ---------------------------- | ---------------------------------: |
| Challenger Deep        | `cd-leggo-amphipod-site` | `cd-leggo-amphipod-site`     |                      75.58 / 75.57 |
| Endurance              | `endurance-hull`         | `endurance-rigging-debris`   |                      74.17 / 74.19 |
| Axial Seamount / ASHES | `axial-ashes-inferno`    | `axial-ashes-minor-chimneys` |                      35.00 / 35.06 |
| Hudson Canyon          | `hc-coral-ledge`         | `hc-coral-ledge`             |                    106.35 / 106.34 |
| Kamaʻehuakanaloa       | `kh-hiolo-north`         | `kh-hiolo-north`             |                      49.17 / 49.21 |
| Bismarck               | `bismarck-hull`          | `bismarck-hull`              |                    109.13 / 109.14 |
| Hunga Tonga            | `hunga-tonga-rim-wall`   | `hunga-tonga-rim-wall`       |                    105.13 / 105.33 |
| Blake Plateau          | `blake-coral-thicket`    | `blake-inter-mound-channel`  |                      56.54 / 56.68 |

## Validation

- Initial audit: 13 of 17 tests passed; four site/tier cases failed (Bismarck and Hunga, Low and Medium). Each failing case covered both openings.
- After fixes: **17/17** targeted tests passed; TypeScript typecheck passed.
- Gate command: `GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e` — **passed**: config, production build, **1,397 unit tests across 134 files**, **144 Python tests**, strict content validation, attribution, and repository formatting. Logs are in `.cache/gates/`.
- Browser E2E omitted because this sandbox cannot run browsers, per the task instructions.

To regenerate the detailed pose measurements, with `.cache` present:

```sh
PHONE_PITCH_AUDIT=1 npx vitest run tests/unit/phonePitch.test.ts --configLoader runner --cache=false
```

The optional audit writes `.cache/phone-pitch-measurements.json`; ordinary gate runs do not write this file.
