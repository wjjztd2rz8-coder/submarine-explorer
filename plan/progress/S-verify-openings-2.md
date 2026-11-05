# S-verify-openings-2 — Lost City / Bismarck mission openings

2026-11-05. Verified the merged changes described in
[V-lostcity-tower-scale](V-lostcity-tower-scale.md). Numerical and schema checks
pass; live browser acceptance is blocked by this sandbox's localhost socket
restriction. No gameplay pose, prop geometry, free-dive data or site-specific
runtime branch was changed.

## Round 1: geometry and effective scan range

Added `tests/unit/missionOpeningSafety.test.ts`: real heightmaps and procedural
props, both sites, Low/Medium/High, Arcade/Realistic, at 1600×900, 390×844 and
844×390 (36 combinations). Each checks the actual composed mission pose, resolved
sensor multiplier and scan floor, scanner rejection of the first target, eye
clearance, a 3×3 near-plane grid, 101 samples along the complete arm, collision
proxies and independent ray intersections against rendered terrain/prop meshes.

| Site      | Mission range | Arcade effective radius | Realistic effective radius | Minimum eye clearance | Minimum near-plane clearance | Minimum arm clearance |
| --------- | ------------- | ----------------------- | -------------------------- | --------------------- | ---------------------------- | --------------------- |
| Lost City | 130 m         | 100 m                   | 42 m                       | 114.03 m              | 111.92 m                     | 29.60 m               |
| Bismarck  | 110 m         | 100 m                   | 30 m                       | 82.75 m               | 81.97 m                      | 36.33 m               |

All tiers/modes/layouts pass without terrain or prop intersections. Bismarck's
accepted approach is 90° in the hero's local frame. Lost City's safe search
selects 112.5° from its inherited 90° preference. The authored chase radius is
80 m for both missions.

Free-dive poses compare exactly in both modes and all tiers when the old mission
fields are restored (Lost City range 220/default camera; Bismarck inherited
bearing/default camera). This guards against leaking the mission-only bearing
and camera settings into free dive. Bismarck's free-dive bearing stays 50°;
Lost City's Arcade override and Realistic framing remain unchanged.
Both `opening.freeDive` sections also compare exactly against the pre-scale
revision `554aadf4^`.

## Round 2: schema, content gate and browser coverage

Found and fixed two small verification gaps:

- The runtime schema already accepted optional finite `opening.mission.bearing`,
  but authoring docs omitted it and still claimed a 150–300 m mission range.
  Updated `docs/missions.md` with current ranges, degrees/local-axis semantics,
  omission fallback, safe-search behavior and the independent free-dive bearing.
- `npm run check:content` parsed `site.json` but never checked its mission framing.
  The Python content validator now checks optional mission framing types, finite
  numbers, positive ranges/radii/depths, required `rangeM`, and unknown fields.
  It preserves packs without `site.json` or without mission framing.

Added runtime-schema and content-gate cases for omitted/zero/signed/wrapped
bearings and rejection of null, boolean, string, container and nonfinite values.
Added a synthetic rotated-hero spawn test proving explicit zero takes precedence
and only omission inherits the free-dive bearing. The source remains generic.

Searched `tests/e2e` for opening, mission, camera, scan and free-dive coverage.
Extended `opening-framing.spec.ts` with 36 live mission cases covering the same
matrix, preview-versus-Begin stability, effective scanner radius and the whole
camera arm/near plane. Playwright discovery lists all 36 cases. Attempted the
new matrix and existing Lost City Arcade mission, Realistic free-dive, mission
preview and Bismarck portrait cases with `npx playwright test <spec> -g ...`.
Both commands fail before any test starts: Vite preview cannot bind
`127.0.0.1:4193` (`listen EPERM`). No browser or visual pass is claimed.

## Validation

- Focused Vitest: **514 tests passed** across `missionOpeningSafety`, `gameSpawn`
  and `siteManifest`; the safety matrix was rerun after adding the scanner and
  bearing checks. Optional numeric evidence: set
  `OPENING_SAFETY_AUDIT=.cache/mission-opening-safety.json` when running Vitest.
- Python landmark validator: **35 tests passed**.
- Typecheck: passed.
- Attribution (14 assets), repository-wide Prettier and `git diff --check`: passed.
- `GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/verify-openings-dist bash tools/gates.sh --no-e2e`:
  content and build passed. Interrupted after about nine minutes (exit 130),
  with the aggregate unit stage still showing only its RUN banner and no result.
  It is not counted as a pass; aggregate browser checks were disabled for this
  static run, and attribution/formatting passed separately. Logs are in
  `.cache/runs/20261105-132927-2-76dLia/`.
  The Python gate has five failures in untouched tooling tests: four
  `test_ci_build_manifest` failures report `spawnSync git EPERM`; the golden
  comparison CLI test reports empty JSON output. These are separate from the
  passing landmark-validator tests and match the previously recorded sandbox
  failures in `4660-S-bughunt-journal.md`.
- Targeted Playwright: **blocked before test execution** by `listen EPERM`.

Live-browser execution and a completely green gate run remain required in an
environment permitting the preview socket and tooling child processes.
