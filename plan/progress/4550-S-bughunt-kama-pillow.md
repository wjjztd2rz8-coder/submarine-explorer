# 4550 — V-eight-sites-lit / S-bughunt: Kama pillow-field sightline

Input: `3e478036da49d53f083aa931954227a7dc107731`, 2026-10-26. Read [DIRECTOR.md](../DIRECTOR.md) and [4500](4500-S-bughunt-eight-sites.md). Applied a placement-only fix to the invented scenic pillow field; extended the existing mission-composition and free-dive capability tests.

## Cause and smallest data change

`data/landmarks/kamaehuakanaloa/props.json` placed `hiolo-north-pillows` at latitude 18.91232, longitude −155.26765, about **13.7 m east and 11.1 m south** of `hiolo-north-chimney-1`. The field's nominal footprint is **36×30 m** (ellipse radii 18×15 m), height 5 m, heading 0°, scale 1. Its near side crosses the southeast mission camera's view of the **1.6×1.6×3.2 m** chimney.

The builder chain is `Props.build` → geology registry → `buildGeo` → `buildPillowField` (`src/world/props/geo/pillow.ts`). The field follows local terrain, thickens its relief with a slope gain capped at 2.2, and adds pillow ellipsoids above the height mesh. `Props.place` applies the authored scale. The chimney builder uses half its authored diameter as base radius and its authored height directly. Neither prop has an accidental scale multiplier. The prop bounding sphere controls LOD/culling; occlusion reproduced against the built triangles independently of that radius or the collision boxes. Relative placement caused the blockage.

Final change: **only the field's longitude, −155.26765 → −155.26755**, moving it **10.5 m east**. It now sits about 26.7 m east-southeast of the chimney. Retained the field's footprint, height, heading, scale and latitude. Updated its existing game-addition note to describe the invented position. One placement coordinate fixes the sightline without adopting 4500's optional enlargement and northwest relocation.

Real vent and POI locations, chimney dimensions, basalt/iron-mat interpretation and the mission's 130 m approach remain intact. No builder, schema, shared runtime branch or UI changes were needed.

## Orchestrator follow-up: free-dive regression

The first attempt moved the field **21.1 m east**. The orchestrator's outside-sandbox gate run (`.cache/runs/20261026-224205-2854263-2dHAaV/`) completed: **4,294 unit tests passed, 2 failed**; Python, content, build, smoke e2e, project-base e2e, attribution and formatting passed. The two failures exposed an unintended free-dive change that the original mission-only verification missed.

`DeepOpeningSpawn.reframe` anchors free-dive distance to the pillow field, derives altitude from that prop's seabed elevation plus the authored altitude and terrain clearance, and aims yaw at the vent. Moving the field onto shallower ground raised the framed opening from y = −1282.260 to **−1269.030 m**. Horizontal facing remained correct, but the vent fell outside the level scanner's 35° cone. `lowTierFollowups` correctly rejected the null scan candidate. The changed framed pose also invalidated `freeDiveComposition`'s saved coordinates; its subsequent mode snapshots were reported obsolete because the first assertion stopped the case.

Halving the move to **10.5 m east** clears all 27 mission sightline rays while retaining a level-beam Hiolo North scan candidate at every tier. The snapshot fixture's final framed pose is x = **−180.950448**, y = **−1275.644927**, z = **518.203297**, yaw = **0.814262025 rad**. The base spawn remains identical. Refreshed only the three Kama framed-pose snapshots (Arcade, Realistic, Custom), after validating the final geometry and scan behavior.

Strengthened the existing all-tier free/mission framing cases in `lowTierFollowups.test.ts`: each free-dive opening must present **`kh-hiolo-north`** as the actual Scanner candidate with a level beam, within 120 m. The original Low opening/approach scan assertion, framing thresholds, collision checks and all mission sightline assertions remain intact. With the rejected 21.1 m move, the original Low case and all three strengthened tier cases fail (**4 failures**, `.cache/4550-free-scan-baseline.log`). The final 10.5 m move passes them.

## Capability evidence

Extended `tests/unit/missionComposition.test.ts` using its existing all-site/all-tier runtime spawn and approach cases. A small subject table identifies Kama's first chimney. At the actual loaded mission spawn, the test updates terrain/prop LOD and casts rays through the chimney's local-bounds centreline at **25%, 50% and 75% height**. Each point must be in frame and its nearest solid triangle must belong to the chimney, after including terrain, all visible props and the player hull. Hidden LODs and transparent effects are excluded.

The checks cover **1600×900, 390×844 and 844×390** at **Low/Medium/High**: all **27 rays** hit the chimney first with the final placement. Before any data change, all three tier cases failed with `blocked by hiolo-north-pillows` at the first lower-body ray (`.cache/4550-baseline.log`).

Final focused command:

```sh
SPAWN_AUDIT=1 npx vitest run tests/unit/freeDiveComposition.test.ts \
  tests/unit/lowTierFollowups.test.ts tests/unit/missionComposition.test.ts \
  tests/unit/missionApproach.test.ts --configLoader runner --cache=false \
  -t 'kamaehuakanaloa|Kamaehuakanaloa'
```

**13 passed**, 125 unrelated cases skipped; all three Kama mode snapshots pass without update. Evidence: `.cache/4550-followup-capability.log`, `.cache/spawn-audit.json`.

| Tier   | Mission range / Arcade scan radius (m) | First scan (s) | Prop contact frames | Minimum pilot terrain clearance (m) |
| ------ | -------------------------------------: | -------------: | ------------------: | ----------------------------------: |
| Low    |                              130 / 100 |          9.067 |                   0 |                              18.072 |
| Medium |                              130 / 100 |          9.067 |                   0 |                              20.043 |
| High   |                              130 / 100 |          9.067 |                   0 |                              19.605 |

Unfiltered final run of all four affected specs: **138/138 tests passed**, 116.28 s (`.cache/4550-followup-full-capability.log`).

These checks establish geometric line of sight, safe hulls, a reachable mission scan and a level-beam free-dive scan candidate. The chimney remains physically small; the change does not establish a 0.4% phone-frame area or visual acceptance. Visual acceptance remains with V-eight-sites-lit.

## Gates and limits

The original local `GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e` attempt passed build/content but encountered sandbox subprocess errors in Python tooling; its full unit phase and a thread-worker retry were interrupted after several minutes with only a RUN header. Logs: `.cache/runs/20261026-223234-2-nefvxi/`, `.cache/4550-unit-threads.log`. The orchestrator subsequently completed the outside-sandbox run described above in **800.24 s**, identifying the two regressions now fixed. Its green browser gates apply to the earlier 21.1 m placement; no browser pass is claimed for the revised placement.

Final local validation: **typecheck, strict content validation for all 13 sites, repository-wide Prettier, attribution and `git diff --check` passed**. No full-suite or aggregate gate pass is claimed for the final placement. The orchestrator can rerun the complete gates outside this sandbox.
