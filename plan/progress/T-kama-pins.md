# T-kama-pins — capability pins for the Kama subject retry

Serves DIRECTOR item 2, V-hunga-kama-subject. Tests and this note only; no scene data, production code or camera tuning changed.

## Contract

- `missionComposition.test.ts` derives the opening subject from `site.json` (`reframe.aimHero`, falling back to `freeDive.hero`) and required contacts from `mission.json`/`pois.json`. A subject must belong to the first contact's scan neighbourhood. The visible solid body of that subject's kind within that neighbourhood represents the vent site; one particular chimney ID is no longer mandatory. Terrain and all visible solid props still participate in occlusion.
- Mission sightlines use the supported first-person view at the actual opening, across desktop, portrait and landscape, on all three tiers. The old test used an untuned chase arm. Applying the actual mission chase arm reveals that the shipped player hull covers the small vent; the pilot view tests the environmental sightline without pretending that the hull is absent from chase view. Authored chase framing and camera clearance are checked separately. This does not claim unobstructed vent geometry behind the hull in the mission chase screenshot.
- The same runtime mission approach test now pilots continuously through **both primary scans**, including prop contact, terrain clearance, hull safety and scanner completion. The second leg uses the navigation cue and altitude control rather than driving forward while turning. Other sites retain their original single-contact route and controller.
- `lowTierFollowups.test.ts` replaces the two overlapping pillow-framing cases with one all-tier capability matrix: free/mission openings, three aspect ratios, the data-selected subject's middle and upper solid body in frame, safe hull/camera, readable depth-dependent ambient fill, and the first required contact inside the free opening's actual level scanner beam. No pillow footprint, capture coordinates, fixed scan ID or 120 m literal defines this case.
- The shared test helper samples solid geometry, excluding hidden LODs and transparent plumes. Middle and upper body must be visible; a tip/plume alone fails. A grounded cluster's buried base may blend into the slope. The old requirement to expose every fixed chimney centreline sample and contain the entire pillow field was an art pin, superseded here by the requested capability contract.
- An in-memory fixture renames the cluster, changes its dimensions to 18×16×6 and re-aims/re-anchors the opening at it. It passes on all tiers without editing shipped data. An opaque foreground blocker fails the visibility probe in every matrix cell.
- `freeDiveComposition.test.ts` replaces only Kama's three absolute pose snapshots with solid-subject framing and hull/camera clearance checks for both spawn passes and all three modes. Other sites' snapshots remain intact.
- `opening-framing.spec.ts` derives Kama's subject and expected heading offset from site data, and checks its solid-body centre in frame, live ambient fill and camera prop clearance. Other catalog subjects retain their existing expectations.

## Simplicity

Consolidated duplicate framing coverage in the existing capability specs and shared their solid-geometry probe. No new spec, runtime branch, setting, guidance surface or layout patch. The art retry remains Claude's work; these numeric checks do not grant visual acceptance.

## Validation

- Focused final Kama run: **12 passed**, 80 unrelated cases skipped, across the three changed unit specs. Includes shipped and taller renamed subjects, all tiers, all three modes in the composition case, occluder controls and both primary scans. Log: `.cache/T-kama-pins-focused.log`.
- Unfiltered final run of all three changed unit specs: **92/92 passed**, 89.73 s. Log: `.cache/T-kama-pins-unit-final.log`.
- Final typecheck and production build passed using the same bundled native Vite config loading as the writable gate mode. Log: `.cache/T-kama-pins-build-final.log`. Strict content validation, attribution, repository-wide Prettier and `git diff --check` passed.
- Required e2e searches found `opening-framing.spec.ts` and `content-missions.spec.ts`. Both targeted commands were run against the isolated production build (removed after verification):

  ```sh
  GATES_CONFIG_MODE=writable PW_OUTDIR=dist-T-kama-pins PW_PORT=4282 PW_RENDER_REVIEW=1 \
    npx playwright test tests/e2e/opening-framing.spec.ts \
    -g 'kamaehuakanaloa: underwater free-dive opening'
  GATES_CONFIG_MODE=writable PW_OUTDIR=dist-T-kama-pins PW_PORT=4283 \
    npx playwright test tests/e2e/content-missions.spec.ts \
    -g 'kamaehuakanaloa: briefing to primary scans to debrief'
  ```

  Neither reached browser assertions: Vite preview cannot bind a localhost port in this sandbox (`listen EPERM: operation not permitted 127.0.0.1:4282`). No browser pass or screenshot review is claimed.

- `GATES_CONFIG_MODE=writable PW_PORT=4281 PW_OUTDIR=dist-T-kama-pins tools/gates.sh` attempted the requested gate set. Python tooling failed independently with `spawnSync git EPERM` in four build-manifest tests and a golden-tool subprocess failure. Content passed. The first build caught an intermediate test variable typo, since fixed and verified by the final successful build. The aggregate unit phase had not completed after several minutes and was interrupted before the final unfiltered 92-test run; aggregate browser gates were not reached. A separate `--phase build` run bundled successfully, then its provenance step failed with the same `spawnSync git EPERM`. Logs are under `.cache/runs/20261028-130529-2-1XwT8a/` and `.cache/runs/20261028-130640-2-nvR6lr/`. No complete gate pass is claimed.
