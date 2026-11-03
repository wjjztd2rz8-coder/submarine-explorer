# U-tutorial-depth-skip (2026-11-03)

Source: plan/progress/U-play-walkthrough-2.md issue 2. The dive tutorial's step 2
("Hold Space to rise or Ctrl to sink") had no purpose on flat-seabed sites such as
Beebe, where the first target is already at nearly the same depth.

## What changed

- `src/game/Tutorial.ts`: `DEPTH_SKIP_M = 15`. `TutorialSample` gains an optional
  `targetGapM` (metres between the sub and the first target). On the depth step,
  `update()` advances at once when `targetGapM <= DEPTH_SKIP_M`. Without a target
  the step is unchanged.
- `src/app/systems/onboard.ts`: each frame, finds the first target (the mission's
  next scan objective, looked up in `scanner.getTargets()`) and passes
  `|sub.depth - target.position.y|` as `targetGapM`.
- No site-specific branches, no package numbers in code, no layout changes.

## Tests

- `tests/unit/f3Onboard.test.ts`:
  - "skips depth step when target is within 15 m of the sub" (15 m skips, 15.5 m keeps the step).
  - "keeps the depth step when no target is known".
- `f3-onboard.spec.ts` and `f-beebe-plumes.spec.ts`: 13/13 pass.
- `f-bughunt-960.spec.ts` (Titanic and Great Blue Hole, 390 and 844 widths, all tiers): 24/24 pass.
- No e2e spec expected the depth step on a flat-seabed site that needed changing. The
  "Rise and sink" and "Hold Space to rise or Ctrl to sink" texts that match in the
  specs are the controls card and the depth-step text on a non-skipped site.
- Beebe-specific skip is covered by the unit test only; no e2e run on Beebe was added.

## Gates

`PW_PORT=4311 tools/gates.sh` (default smoke e2e): EXIT 0. Passed: python, content,
build, unit, e2e, e2e-base, attribution, prettier, gates (e2e=smoke).
