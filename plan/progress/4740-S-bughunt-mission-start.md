# 4740 — S-bughunt: mission start path across all 13 sites

Item: **S-bughunt**. Audited `7ccf1ad0c413d9a99e9396614a66f0015d5e8589`
plus the working-tree changes described below, 2026-10-28. Source and Node
unit/geometry tests only. **No browser, screenshots, or rendered visual acceptance.**

## Findings and scope

1. **Confirmed small defect: mission search checked the wrong camera arm.**
   `composedMissionSpawn` constructed a default chase rig for prop-clearance
   checks but returned the site's authored camera values. Kama authors a 35 m
   arm with +100 m vertical offset, so a candidate could pass the default-arm
   search and collide when the actual mission arm was applied. The existing
   working-tree fix calls `setChaseRadiusDefault` before the bearing search and
   shares the same manifest lookup with yaw/scoring/returned fields. The
   `gameSpawn` capability regression places an obstacle at the authored eye:
   **fails against HEAD**, **passes with the fix**. This is a reproduced latent
   defect; the audited shipped openings themselves have no arm collisions.
2. **All shipped near-site mission poses meet numeric safety constraints.**
   13 sites × Low/Medium/High × Arcade/Realistic = **78 starts**, each with
   desktop (1280×720), portrait phone (390×844), and landscape phone (844×390)
   cameras. No nonfinite pose, tile-boundary escape, wrong signed heading,
   hull under terrain, rating violation, or start inside a required contact's
   effective scan radius was found. All first-primary contacts project inside
   their camera frustums. The full-geometry suite loads every prop, including
   GLBs with only image decoding stubbed, and confirms 39 tier/site openings
   and first-primary approaches; zero contact frames or hull breaches.
3. **Report-only framing issue: Kama's raised mission arm loses the hull in
   landscape.** Its hull origin has vertical NDC **−1.892** at desktop and
   landscape-phone aspect ratios (visible interval −1…1), versus **−0.874**
   in portrait. This matches DIRECTOR's existing V-kama-opening follow-up.
   Full visible-vertex projection confirms that **the entire hull is below
   the frame on desktop and landscape phone on all tiers**: its highest
   vertex is NDC Y **−1.07653**. Portrait retains part of the hull but clips
   its lower extent (Y **−1.815…−0.497**). **Blue Hole also partially clips
   the hull below desktop/landscape frames on all tiers** after its safe
   surface-arm retraction: vertical minima are **−1.587 / −1.851 / −1.767**
   (Low/Medium/High), while maxima remain inside at **−0.423 / −0.370 / −0.387**.
   Blue Hole portrait and the other eleven sites keep the full hull within
   the measured horizontal/vertical frame bounds. Camera safety and primary visibility pass; changing the art
   composition is outside this numeric audit and is left to the visual lane.
4. **Report-only data/documentation drift: authored hull classes are not the
   runtime requirement.** `submarineSystem` fits `Progress.hullFor(briefing depth)` and passes that actual hull to mission
   loadout/router/start logic.
   Blue Hole, Hunga, Blake and Lost City fit A despite mission B; Bismarck and
   Beebe fit B despite mission C. These fitted classes safely cover the actual
   starts and approaches. `Spawn.ts`'s introductory claim that missions keep
   `mission.hull_class` is stale. No loadout or content changes made.
5. **Short ranges are deliberate, not an audit failure.** The current 110–240 m
   openings supersede the historical 150–300 m preference under DIRECTOR's
   small-subject exception. With shipped equipment and Arcade's 100 m floor,
   the minimum transit is **10 m**, not 60 m: the cap's 60 m intent applies
   before the additional equipment multiplier/floor. No range or scan gate
   was widened. Surface starts are a separate explicit option: all authored
   surface-start poses are finite; Y is −8 m except Challenger's authored
   6000 m start. Custom tuning, Daily offsets, debug URL overrides, and
   arbitrary aspect ratios are outside the enumerated matrix.

## Per-site evidence

Ranges are submarine-origin → first primary **3D metres**. Headings are
clockwise from north (+X east, +Z south); authored signed yaw offsets are
included. Centre clearances list **Low / Medium / High**, metres above runtime
terrain. Hull gap is the minimum over actual visible hull vertices and all
three tiers, using the fitted hull. Scan radii include equipment and mode
floor; all required contacts, not only the first, start outside range.
Arcade/Realistic poses and all three cameras are identical for every tier.

| Site                 | Range m | Heading ° (all tiers) | Centre clearance L / M / H m | Min hull gap m | Fitted / mission hull | First scan radius Arcade / Realistic m |
| -------------------- | ------: | --------------------: | ---------------------------: | -------------: | :-------------------: | -------------------------------------: |
| great-blue-hole      |     150 |                 270.0 |     114.63 / 115.94 / 115.59 |         109.49 |         A / B         |                           100.0 / 43.2 |
| hunga-tonga-caldera  |     120 |                  90.0 |        36.24 / 35.45 / 35.43 |          29.36 |         A / B         |                           100.0 / 36.0 |
| blake-plateau-corals |     160 |                 110.0 |        54.31 / 52.44 / 52.79 |          48.03 |         A / B         |                           120.0 / 60.0 |
| lost-city            |     220 |                 247.5 |        60.13 / 61.24 / 61.29 |          45.85 |         A / B         |                           192.0 / 96.0 |
| kamaehuakanaloa      |     110 |                 355.0 |        56.16 / 58.80 / 58.67 |          45.08 |         B / B         |                           100.0 / 30.0 |
| axial-seamount-ashes |     110 |                 270.0 |        25.35 / 25.23 / 25.28 |          18.50 |         B / B         |                           100.0 / 30.0 |
| hudson-canyon        |     112 |                 202.5 |        22.85 / 23.14 / 23.16 |          15.50 |         B / B         |                           100.0 / 31.2 |
| monterey-canyon      |     240 |                   0.0 |        93.01 / 94.46 / 94.14 |          80.12 |         B / B         |                          216.0 / 108.0 |
| endurance            |     110 |                 295.0 |        27.38 / 27.42 / 27.43 |          20.72 |         B / B         |                           100.0 / 30.0 |
| titanic              |     140 |                 315.0 |        32.74 / 32.91 / 32.83 |          26.06 |         B / B         |                           100.0 / 36.0 |
| bismarck             |     110 |                 275.0 |        28.59 / 28.89 / 28.87 |          21.38 |         B / C         |                           100.0 / 30.0 |
| beebe-vent-field     |     220 |                 187.5 |        47.47 / 47.59 / 47.49 |          38.14 |         B / C         |                           192.0 / 96.0 |
| challenger-deep      |     140 |                 340.0 |        23.75 / 23.41 / 23.41 |          16.82 |         C / C         |                           100.0 / 48.0 |

All sites use the default `(0,38,90)` m local chase direction, normalized to
**97.6934 m**, except Kama: **35 m** with +100 m local vertical offset. Blue
Hole's default arm retracts to **24.6940 m** to remain underwater; that is
intentional `CameraRig` surface handling. No other measured arm retracts.
The sampled actual camera-arm bed gap is at least **23.44 m**, versus the
6 m required clearance, and none of its 64 samples collides with procedural
props at radius 6 m. This is finite sampling, not a proof of continuous swept
volume clearance. The visible-hull minimum is **15.5009 m** at Low Hudson.
Signed yaw offsets are **+35° Titanic**; **+25° Endurance/Bismarck/Challenger**;
**0° elsewhere**. Controlled Arcade first scans complete within **10.967 s**
on all 39 site/tier rows; this is an automated pilot, not player timing.

## Changes and simplicity

At entry, `src/game/Spawn.ts`, `tests/unit/gameSpawn.test.ts`, and the untracked
`tests/unit/missionOpening.audit.test.ts` already contained work in progress.
Preserved and verified the runtime fix and synthetic capability regression.
Extended existing **missionApproach** coverage to both modes for every site,
uses runtime depth-fitted hulls, checks finite coordinates and tile bounds,
and applies returned camera controls plus landscape-phone projection before
checking 64 arm samples. Existing signed-heading, full-hull, scan, transit,
and two-leg pilot assertions remain. Fixed the existing audit test's optional
briefing-depth type error with the same tile-depth fallback as runtime, and
formatted that file. Archived the duplicate scratch audit under `.cache/mission-start-audit/`
after verification; its exact original and the starting diff are also
preserved there. Permanent coverage remains in the existing capability specs.

The runtime change reuses existing camera and manifest APIs; repeated mission
manifest reads were merged. No site branches, dependencies, settings, UI,
schema changes, package-number code comments, or altered scene/data tuning.
Lasting added guards are in existing capability specs. The pre-existing
scratch audit was archived rather than shipping duplicate coverage; no user
work was discarded.

## Gates and reproducibility

| Gate                                          | Result                                                                                                                                                                                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Camera collision regression, committed source | Expected **FAIL**, authored eye hits obstacle                                                                                                                                                                                                                         |
| Camera collision regression, working tree     | **PASS**, `gameSpawn`: 13 tests                                                                                                                                                                                                                                       |
| Expanded mission approach capability          | **PASS**, 81 tests, 133.30 s                                                                                                                                                                                                                                          |
| Full-prop mission composition capability      | **PASS**, 66 tests, 86.81 s                                                                                                                                                                                                                                           |
| Original opening audit / saved metric audit   | **PASS**, 79 / 79 tests; 78 site/tier/mode rows each                                                                                                                                                                                                                  |
| TypeScript                                    | **PASS**, `npx tsc --noEmit`                                                                                                                                                                                                                                          |
| Production bundle                             | **PASS**, writable bundled Vite config with native loader; ordinary chunk-size warning                                                                                                                                                                                |
| Hull-frustum geometry                         | **PASS**, one scratch audit, 117 site/tier/layout bounds; two report-only clipping findings                                                                                                                                                                           |
| Full unit suite                               | **PASS**, 193 files, 4,449 tests, 737.74 s; includes the temporary audit before archival                                                                                                                                                                              |
| Python                                        | **FAIL**, 167 tests run, 5 failures: four build-manifest tests report `spawnSync git EPERM`; golden tooling reports `Unexpected end of JSON input` from child CLI stdout. The golden-only recheck fails identically. No mission-path Python change or gate loosening. |
| Strict content                                | **PASS**, all 13 sites, zero warnings/errors                                                                                                                                                                                                                          |
| Attribution                                   | **PASS**, 14 assets                                                                                                                                                                                                                                                   |
| Repository Prettier / diff whitespace         | **PASS** / **PASS**, including final report                                                                                                                                                                                                                           |
| Playwright                                    | **Not executed: explicit no-browser scope.** Discovery only found 15 matching opening tests and one briefing/start test. Browser gate remains unverified.                                                                                                             |

Focused commands (threads avoid the restricted runner's stalled fork pool):

```sh
npx vitest run tests/unit/gameSpawn.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1
npx vitest run tests/unit/missionApproach.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1
SPAWN_AUDIT=1 npx vitest run tests/unit/missionComposition.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1
npm test -- --configLoader runner --cache=false --pool=threads
```

Grepped `tests/e2e` for mission start, opening and camera capabilities. The
following matching commands were used with **`--list` only**; they still need
execution in a browser-enabled validation run before browser acceptance:

```sh
npx playwright test tests/e2e/opening-framing.spec.ts -g 'mission previews and opens on an approach outside scan range'
npx playwright test tests/e2e/mission.spec.ts -g 'briefing freezes the game; Enter starts near the site with objectives'
```

Those mission-preview cases cover five heroes, not all 13; non-hero capture
cases also live in `opening-framing.spec.ts`. Unit coverage supplies the full
13-site matrix here. No Playwright pass or screenshot inspection is claimed.

Local ignored evidence: `.cache/mission-start-audit/` contains `results.json`,
`full-props.json`, `metrics.test.ts`, `hull-frames.json`, focused/gate logs,
`regression-before.log`, `initial.diff`, `missionOpening.initial.ts`, and
`inputs.sha256`. The latter covers source, capability tests, site/mission/POI/
prop data and canonical float heightmaps; its SHA-256 is
`5b2e650c4316a13f6fa453d6caf1154225d8a060ca3d7837ce9d634eaf01bfa2`.
These scratch artifacts are local evidence, not committed deliverables.
