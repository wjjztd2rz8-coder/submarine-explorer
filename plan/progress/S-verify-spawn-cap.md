# S-verify: mission opening height cap

Verified 2026-11-04 at `cc3c4661`, compared with `4dce1c0a`.

## Plan and completion

1. Review `src/game/Spawn.ts`, its runtime caller/wrapper, and `tests/unit/missionShallowTarget.test.ts`.
2. Execute mission spawn logic for all 13 catalog sites on Low, Medium and High, using real terrain, placed primary POIs, hull ratings and prop collisions. Compare against a full checkout of the reference commit, then run the reference spawn function against current inputs to separate algorithm effects from other merged changes.
3. Check the surface ceiling, scan-depth cap, seabed gap and intended 3D distance. Fix only demonstrated production bugs and cover any test gap.
4. Search `tests/e2e` for mission opening coverage, run the relevant named test, and record results here.

Steps 1–3 complete. Step 4 command was attempted but the preview server cannot bind a local socket in this sandbox; browser validation remains blocked.

## Result

**No production bug found; `Spawn.ts` is unchanged.** All **39/39 current** openings are non-null, within the tile, at or below the **−8 m surface ceiling** (`y <= -8`), at or below the first primary's minimum scan depth, above the hull rating's safe-depth limit, and clear of prop collisions. The minimum seabed altitude is **22.854 m**, exceeding the required hull radius plus seabed clearance (**12 m**). All authored approach distances match within **9.1×10⁻¹³ m**. All **39/39 reference-commit** cases also pass the audit.

The preferred floor altitude is 22 m (8 m hull + 4 m seabed gap + 10 m extra spawn clearance). The cap may spend the extra 10 m, but preserves the mandatory 12 m gap. If the floor and scan-depth ceiling cannot both be satisfied, the function rejects the candidate. The runtime `DeepOpeningSpawn.composedMissionSpawn` forwards directly to the reviewed function, so these are the mission poses actually applied.

Values below are **Low / Medium / High**, depths are positive metres below the surface, distances are 3D distance to the first primary, and displacement is relative to `4dce1c0a`. Zero displacement can still include an orientation/camera change, noted explicitly.

| Site                 | Opening depth (m), L / M / H      | Intended and measured range (m) | Minimum seabed altitude (m) | Position displacement (m), L / M / H; other changes |
| -------------------- | --------------------------------- | ------------------------------: | --------------------------: | --------------------------------------------------- |
| great-blue-hole      | 44.000 / 44.000 / 44.000          |                             125 |                      80.384 | 40.590 / 41.663 / 41.298                            |
| hunga-tonga-caldera  | 443.613 / 449.704 / 449.807       |                             120 |                      29.918 | 16.382 / 15.441 / 15.444                            |
| blake-plateau-corals | 722.964 / 724.534 / 724.243       |                             160 |                      52.439 | 0                                                   |
| lost-city            | 728.648 / 726.720 / 726.830       |                             220 |                      60.127 | 0                                                   |
| kamaehuakanaloa      | 1282.984 / 1281.599 / 1281.692    |                             110 |                      33.899 | 0; yaw +3°, arm 60→45 m                             |
| axial-seamount-ashes | 1514.000 / 1514.000 / 1514.000    |                             110 |                      25.233 | 0                                                   |
| hudson-canyon        | 919.204 / 918.944 / 919.053       |                             112 |                      22.854 | 0                                                   |
| monterey-canyon      | 724.015 / 723.137 / 723.416       |                             240 |                      93.006 | 0                                                   |
| endurance            | 2973.000 / 2973.000 / 2973.000    |                             110 |                      27.381 | 0                                                   |
| titanic              | 3768.000 / 3768.000 / 3768.000    |                             140 |                      32.741 | 0                                                   |
| bismarck             | 4191.000 / 4191.000 / 4191.000    |                             110 |                      28.588 | 0; yaw −17°                                         |
| beebe-vent-field     | 4966.836 / 4966.971 / 4966.930    |                             155 |                      37.186 | 65.466 / 65.466 / 65.466                            |
| challenger-deep      | 10902.489 / 10902.782 / 10902.877 |                             140 |                      23.406 | 0                                                   |

## Every changed opening versus `4dce1c0a`

- **Great Blue Hole:** old depths 11.605 / 10.270 / 10.633 m → authored **44 m** on all tiers. Position moves 40.590 / 41.663 / 41.298 m; approach remains **125 m**. Chase offsets change X −16→−44 m and Y −30→−50 m; yaw and 46 m arm stay the same. This includes later authored opening-depth/camera changes as well as the shallow-target work. Running the old spawn function with current Blue Hole terrain/content returns **null on all three tiers**, confirming that restoring the old logic would lose the composed approach.
- **Hunga Tonga:** position moves 16.382 / 15.441 / 15.444 m, heading +7.5°, approach remains **120 m**. The reference function reproduces the current pose exactly when given current inputs. The manifest changes the free-dive bearing (also used by mission spawn), and adds the caldera-rim carve. This is unrelated to the height cap.
- **Beebe:** position moves **65.466 m** on every tier, with unchanged depth and yaw. The authored approach is **220→155 m**, with a 46 m chase arm and −8 m vertical offset. The reference function with current inputs reproduces it exactly; this is unrelated to the cap.
- **Kamaʻehuakanaloa:** position unchanged; yaw +3° and chase radius **60→45 m** on every tier. The reference function with current inputs reproduces these authored changes exactly.
- **Bismarck:** position unchanged; yaw −17° on every tier. The reference function with current inputs reproduces the authored heading change exactly.

The remaining eight sites have identical returned poses, including yaw and camera fields. On current inputs, **36/39** returned poses are identical with the old and new spawn functions; only Blue Hole differs.

## Test gap and changes

The original shallow-target test omits `minDepthM`, and Blue Hole now has an authored 44 m opening depth. It can therefore pass even with the preferred-height cap removed. Added two focused tests to `tests/unit/missionShallowTarget.test.ts` using a site without authored opening overrides:

- Missing, 10 m and 16 m scan-depth limits cap the opening correctly, preserve the minimum hull gap, and retain the default 220 m approach distance.
- A −22 m floor permits a −10 m opening with exactly 12 m clearance; a −21.9 m floor must return null instead of violating the hull gap or scan depth.

A scratch mutation replacing `min(floor + clearance, ceiling)` with `floor + clearance` leaves the original test passing and makes **both new tests fail**. The mutation was removed; no production changes ship.

## Validation and limits

- `npx vitest run tests/unit/missionShallowTarget.test.ts tests/unit/missionApproach.test.ts --configLoader runner --cache=false --pool threads --maxWorkers 1` — **84 passed**. The mission-approach suite covers all 13 sites × three tiers × Arcade/Realistic, including bounds, hull/route/camera clearance, navigation framing and two pilot routes.
- Scratch comparison audit: **39 passed at HEAD + 39 passed at `4dce1c0a`**. Uses real `Terrain`, `Props`, parsed mission/POI data and Arcade effective camera/hull settings. For Blake's two imported GLBs, loads the actual geometry/transforms with image/material references removed for Node; collision geometry and bounds are retained. No content props are omitted. An initial scratch assertion that all props were procedural was corrected to handle these two assets before the final passing audit.
- `npm run build -- --config .cache/s-verify-spawn-cap/vite.config.mjs --configLoader native` — passed (local bundled config avoids the read-only dependency tree); `npx tsc --noEmit` and Prettier checks passed.
- Searched `tests/e2e` for `spawn`, `opening`, `approach`, `shallow` and `underwater`. Relevant coverage is `opening-framing.spec.ts`, especially the mission preview/Begin approach test.
- `GATES_CONFIG_MODE=writable npx playwright test tests/e2e/opening-framing.spec.ts -g 'great-blue-hole low: mission previews and opens on an approach outside scan range'` — **blocked before tests ran**: web server exits; direct preview diagnosis reports `listen EPERM: operation not permitted 127.0.0.1:4173`. No browser-pass claim is made.

Local scratch evidence is retained under `.cache/s-verify-spawn-cap/`: `current.json`, `baseline.json`, `audit-final.log`, `audit-baseline-final.log`, `unit.log`, `no-cap.log`, `e2e.log`, and `spawn-audit.test.ts` (copy into `tests/unit/` and restore the saved reference Spawn module to rerun). Only this report and the two focused regression tests are shipped changes. This is numerical/capability verification, not visual approval of the openings.
