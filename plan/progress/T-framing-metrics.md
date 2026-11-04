# T-framing-metrics — mission opening geometry

2026-11-04, Codex. Measured checkout `7805884b`. Diagnostics and evidence only: no runtime, site data, UI, settings or dependency changes. Extends the existing mission-composition capability and the shared diagnostic viewport list; no site branches.

## Method

All 13 sites, default Arcade, High tier, level sub, first snapped mission frame before physics drift. The same runtime spawn, real terrain and procedural/GLB prop geometry used by the existing opening-geometry test are retained. Both 1600×900 and 390×844 use the actual CameraRig aspect/FOV and authored chase parameters. The subject is the manifest hero associated with the first primary mission objective, not its scan sphere.

Width and height are the visible solid vertex envelope intersected with the viewport, divided by frame width/height. Y increases downward from 0 at the top to 1 at the bottom; the table gives the envelope centre, and the JSON also retains top/bottom. Sort by width fraction ascending, because the proposed-pose goal is 30% of frame width. The five worst **sites** use each site’s smaller width across the two layouts.

“Above horizon” means rays above the world-horizontal plane through the camera, rather than a fitted seabed skyline. A 40×24 grid of frame cell centres is raycast against visible solid terrain/scatter and prop meshes at the camera’s near/far planes. Empty means no solid hit. “Empty / frame” divides empty above-horizon cells by all 960 cells; “Empty / above” divides by above-horizon cells only. This is a coarse geometry estimate: a horizontal sample-row boundary can shift the frame share by about 2.1 percentage points. It excludes sub/HUD, water surface, marine life, particles, translucent plumes, fog and luminance.

These are clipped **envelopes**, including foundations, aprons, rigging and attached colonies; they do not establish visible silhouette area, terrain/sub occlusion, contrast or beauty. In particular Bismarck’s 53.09% envelope does not refute the review’s small-looking solid hull, and Lost City’s 23.96% includes the tower foundation/flank. Axial and Endurance retain the independent <5° height flags on both layouts.

## Current openings, smallest target width first

| Site                 | Viewport | Width % | Height % | Centre Y % | Empty / frame % | Empty / above % |
| -------------------- | -------- | ------: | -------: | ---------: | --------------: | --------------: |
| axial-seamount-ashes | 1600×900 |    0.93 |     1.94 |      64.52 |           29.27 |           78.06 |
| axial-seamount-ashes | 390×844  |    1.65 |     0.90 |      56.71 |           41.67 |           90.91 |
| kamaehuakanaloa      | 1600×900 |    8.12 |    12.60 |      72.40 |           33.65 |           62.12 |
| blake-plateau-corals | 1600×900 |    9.97 |    22.10 |      61.16 |           37.50 |          100.00 |
| endurance            | 1600×900 |   11.53 |     7.26 |      65.46 |           37.50 |          100.00 |
| challenger-deep      | 1600×900 |   13.48 |    17.35 |      57.57 |           22.60 |           60.28 |
| kamaehuakanaloa      | 390×844  |   14.43 |     5.82 |      60.35 |           43.23 |           86.46 |
| hudson-canyon        | 1600×900 |   16.41 |    14.79 |      64.29 |           29.69 |           79.17 |
| blake-plateau-corals | 390×844  |   17.73 |    10.21 |      55.15 |           45.83 |          100.00 |
| monterey-canyon      | 1600×900 |   20.20 |    32.19 |      50.86 |           22.81 |           60.83 |
| endurance            | 390×844  |   20.50 |     3.35 |      57.15 |           45.83 |          100.00 |
| great-blue-hole      | 1600×900 |   22.01 |    17.21 |      52.86 |           41.88 |           67.00 |
| lost-city            | 1600×900 |   23.96 |    30.43 |      67.76 |           37.50 |          100.00 |
| challenger-deep      | 390×844  |   23.97 |     8.02 |      53.50 |           37.50 |           81.82 |
| beebe-vent-field     | 1600×900 |   25.56 |    21.95 |      64.34 |           42.40 |           84.79 |
| hudson-canyon        | 390×844  |   29.18 |     6.84 |      56.60 |           41.67 |           90.91 |
| titanic              | 1600×900 |   32.79 |    22.05 |      70.17 |           37.50 |          100.00 |
| hunga-tonga-caldera  | 1600×900 |   33.92 |    49.61 |      49.80 |           22.19 |           59.17 |
| monterey-canyon      | 390×844  |   35.92 |    14.87 |      50.40 |           37.29 |           81.36 |
| great-blue-hole      | 390×844  |   39.12 |     7.95 |      51.32 |           46.04 |           78.93 |
| titanic              | 390×844  |   41.03 |    10.19 |      59.32 |           45.83 |          100.00 |
| lost-city            | 390×844  |   42.60 |    14.06 |      58.21 |           45.83 |          100.00 |
| beebe-vent-field     | 390×844  |   45.45 |    10.14 |      56.63 |           47.60 |           95.21 |
| bismarck             | 1600×900 |   53.09 |    26.40 |      72.71 |           37.50 |          100.00 |
| hunga-tonga-caldera  | 390×844  |   60.30 |    22.93 |      49.91 |           37.19 |           81.14 |
| bismarck             | 390×844  |   89.02 |    12.20 |      60.49 |           45.83 |          100.00 |

## Regression floors

The existing table-driven opening test now asserts these minimum widths on **both** layouts: Beebe 25%, Bismarck 50%, Blue Hole 21%, Hunga 33%, Lost City 23%, Monterey 20%, Titanic 30%. These preserve scale already achieved by shipped fixes; they are not a claim that every fixed opening has reached the new 30% aspiration. Existing small-height classification assertions remain intact. A synthetic scene test checks empty water, solid obstruction and transparent-effect exclusion.

## Pose proposals

**All five worst sites have data-only world-pose candidates meeting ≥30% clipped width on both layouts, with clear hulls and targets outside scan range.** Axial requires severe bottom clipping, and two other candidates clip laterally on phone; these are numeric handoffs for visual review, not accepted compositions.

The candidate rows are data-only world poses: x/y/z in tile-local metres, yaw in radians, level sub, and the existing CameraRig chase parameters. They are not installed site.json patches. The mission bearing/depth/range search can select a different world pose when these are translated to manifest controls, so the V-* implementation must remeasure the runtime result. Chase offsets select the arm direction before normalization to chaseRadius; -360 does not mean a 360 m arm. No hull scaling or scan-setting change was used.

| Site → subject                            | Desktop width % | Phone width % | Sub → target m | Effective scan m | Hull → floor min m | Camera arm → floor min m | Status                        |
| ----------------------------------------- | --------------: | ------------: | -------------: | ---------------: | -----------------: | -----------------------: | ----------------------------- |
| axial-seamount-ashes → `mushroom-chimney` |           34.26 |         31.70 |        106.645 |              100 |             15.265 |                    6.000 | ≥30% both; severe bottom crop |
| kamaehuakanaloa → `hiolo-north-chimney-1` |           31.29 |         50.30 |        105.171 |              100 |             10.715 |                   15.207 | ≥30% both                     |
| blake-plateau-corals → `lophelia-mound`   |           30.10 |         34.22 |        125.144 |              120 |             17.066 |                   29.414 | ≥30% both                     |
| endurance → `main-hull`                   |           34.14 |         60.69 |        106.292 |              100 |             15.266 |                   12.764 | ≥30% both                     |
| challenger-deep → `leggo-lander-marker`   |           30.10 |         53.52 |        106.982 |              100 |             15.387 |                   20.892 | ≥30% both                     |

All five rows are closer than their current mission opening and remain strictly outside the current effective first-target scan radius, including Arcade’s 100 m floor (Blake’s current effective radius is 120 m). Checked both layouts: actual visible hull vertices clear terrain; an 8 m collision sphere swept at 1 m intervals along the 26 m hull clears prop colliders; camera arm samples at 48 intervals clear prop colliders with 6 m spheres and maintain ≥6 m terrain clearance. Each view has unobstructed target hits in an 8×8 ray sample of its projected envelope, including the sub as an occluder. This establishes some visible solid target, not complete visibility or a navigable entire future approach.

Endurance’s replacement also has zero sub/target envelope overlap on both layouts. Blake retains a small envelope overlap (0.028% of desktop frame); it has visible target ray hits and no physical collision. Portrait clips Blake’s envelope from an unclipped 53.51% to 34.22%, and Kama’s from 55.62% to 50.30%. Those two candidates meet the requested clipped-width measure but need visual judgement about the crop. The Axial, Endurance and Kama candidates use a lateral, approximately quarter-turn view; the visible target can require turning the sub before approaching.

Axial’s factual first subject is about 4 m tall/wide, with a 100 m Arcade scan floor. The initial discrete searches found no ≥30% safe candidate. A broader search of 1,262,016 eye/heading combinations found the data below: the sub stays 106.645 m away while the camera moves to the side of the vent, just 6 m above terrain. It meets the literal width goal, but the visible solid envelope is **90.02–100% down the desktop frame**, only **9.98% high**, with its bottom cut off; phone is 68.49–100% down, 31.51% high, also cut off. The sparse visibility probe sees target geometry on 3/64 desktop rays and 22/64 phone rays. This is a particularly weak composition candidate despite passing the size metric. No factual vent resizing or scan-setting change was used.

The shorter 105–107 m suggestions follow DIRECTOR’s explicit allowance to shorten an opening while preserving an out-of-scan approach. If adopted, their V-* package must update the old 110 m minimum assertions to protect that actual safety property.

```json
{
  "axial-seamount-ashes": {
    "x": -281.13360041445156,
    "y": -1517.3437464099331,
    "z": 1827.806185242308,
    "yaw": 0,
    "chaseRadius": 110.86334901857951,
    "chaseOffsetX": -1238.6884753499367,
    "chaseOffsetY": -232.33608454277223
  },
  "kamaehuakanaloa": {
    "x": -99.93096629224306,
    "y": -1297.6921304668429,
    "z": 570.2669809176225,
    "yaw": 1.1780972450961722,
    "chaseRadius": 125,
    "chaseOffsetX": -360,
    "chaseOffsetY": -60
  },
  "blake-plateau-corals": {
    "x": -28073.415997983888,
    "y": -740.2433349756477,
    "z": -17763.259748625784,
    "yaw": 1.701696020694464,
    "chaseRadius": 35,
    "chaseOffsetX": 0,
    "chaseOffsetY": -38
  },
  "endurance": {
    "x": -324.28686216156535,
    "y": -2978.475942437866,
    "z": 1074.411250117604,
    "yaw": 0,
    "chaseRadius": 150,
    "chaseOffsetX": -360,
    "chaseOffsetY": -60
  },
  "challenger-deep": {
    "x": -544.6570267248868,
    "y": -10904.378731131308,
    "z": 583.460738671965,
    "yaw": 0.7853981633974483,
    "chaseRadius": 35,
    "chaseOffsetX": 360,
    "chaseOffsetY": -60
  }
}
```

## Validation

Reproduce the shipped-opening measurements (no browser or network required):

```sh
mkdir -p .cache
OPENING_GEOMETRY_AUDIT=1 npx vitest run \
  tests/unit/missionComposition.test.ts tests/unit/quality.test.ts \
  -t 'mission opening objective angular size|opening water fractions|diagnostic graphics tiers' \
  --configLoader runner --pool=threads --maxWorkers=1
npx tsc --noEmit
```

The audit writes `.cache/opening-geometry.json`, including viewport, raw pose, width/height fractions, vertical bounds, angular spans, world-horizon position, empty-water sample counts and both empty-water denominators. `.cache/framing-round1.json` and the final audit are identical across all 26 openings.

- Two rounds: **27/27** opening/floor/water tests plus **3/3** existing diagnostic-tier checks in round one; **30/30** together in round two. The other 111 tests across these files were filtered out. Logs: `.cache/framing-final-round1.log`, `.cache/framing-tools.log`, `.cache/framing-final-round2.log`.
- Candidate safety/visibility probes use the same real meshes and camera helper with the world-pose data above; final probes **10/10 twice**, with ≥30% width asserted for all five sites on both layouts. Probe source/input and outputs: `.cache/framing-proposal-source.ts`, `.cache/framing-proposed-poses.json`, `.cache/framing-proposal-<site>-<width>.json`; logs `.cache/framing-proposals-round1.log` and `.cache/framing-proposals-round2.log`. These were temporary exploratory probes, not additional shipped tests. Earlier candidates were rejected when Endurance failed the phone floor and the initial Axial fallback was hidden behind the sub. The final Axial eye-position search is retained in `.cache/framing-eye-source.ts`, `.cache/framing-search-eye-axial.json` and `.cache/framing-search-eye.log`.
- TypeScript, Prettier on all three changed files, and `git diff --check` pass. No production build is needed for diagnostics/report-only changes.

Searched `tests/e2e` for mission/opening/framing capabilities and selected the existing High mission-preview/approach guards for Blue Hole, Beebe and Lost City. `--list` confirms six executions over two repeats. Attempted:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4334 npx playwright test \
  tests/e2e/opening-framing.spec.ts \
  -g '(great-blue-hole|beebe-vent-field|lost-city) high: mission previews and opens on an approach outside scan range' \
  --repeat-each=2 --output=.cache/framing-e2e
```

Playwright is **blocked before assertions**: preview cannot bind `127.0.0.1:4334` (`listen EPERM`). No E2E pass or rendered visual judgement is claimed. Logs: `.cache/framing-e2e.log`, `.cache/framing-e2e-list.log`, `.cache/framing-preview.log`.
