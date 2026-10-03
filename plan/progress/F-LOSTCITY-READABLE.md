# F-LOSTCITY-READABLE — Arcade opening (2026-10-03)

## Plan and prior-work audit

1. Check main, 380 and the vent/readability progress notes before tuning.
2. Preserve their terrain, tower, ambient and haze work; improve the remaining
   Arcade camera distance and test the real terrain/lighting inputs.
3. Run focused checks and `tools/gates.sh --full-e2e`; record visual limits honestly.

Checked main at `7dafe61` (worktree starts at `07778be`). Main merged 380 as
`670e068`; its `00fd274` adds `heroReadability.test.ts` and
`F-GOLDEN-CHECK.md`, with **no runtime tuning changes**. That audit reports
Lost City at 44 m from Poseidon's axis, +16 ambient fill, scene ambient 16.2331
and 99.691% fog transmission at 40 m on Medium. Its broad acceptance range is
12–80 m and ambient floor 12; it explicitly leaves visual acceptance open.

The vent commits (`4ed8c5f` and preceding tower/opening work), F-HERO-VERIFY,
F-LOSTCITY-2/-3/-4 already supplied the 44 m/18 m opening, pale carbonate
terrain, +16 ambient fill, lifted haze, blended talus and terrain mip bias.
F-GOLDEN-RUN's older archival opening showed a readable tower but a dark outer
slope; those images predate the later Lost City work. Nothing here duplicates
those material, geometry, content or lighting edits. The existing fill reaches
all graphics tiers independently of headlights.

## Changes

- Arcade free dive: 38 m horizontal range from Poseidon's axis, preserving the
  vent pass's 18 m height above the tower base, safe terrain-line search and
  10° yaw offset. Chase radius is 50 m instead of the default 97.7 m, bringing
  the camera within 95 m of the tower base (previously roughly 140 m).
- Arcade near-site missions apply the same authored chase radius. The camera-controls reset on Begin dive preserves this arm. Surface
  starts restore the default radius. This is scoped to Lost City.
- Realistic and Custom free dives retain the old 44 m range/default arm;
  Realistic mission selection is unchanged. Explicit location/depth probes,
  Daily starts, Arcade defaults and HUD remain unchanged.
- Preserve +16 ambient fill, haze, carbonate palette, terrain shader and tower.
  A stronger regression floor now protects the actual warm ambient outside the
  lamps rather than adding another lighting pass.

## Deterministic checks

`tests/unit/lostCityReadability.test.ts` uses the checked-in heightmap, actual
Terrain/Props builders, spawn/camera functions and PresetSystem on Low, Medium
and High. It requires the 38 m opening and 50 m arm, collision/seabed clearance,
full solid tower axis inside desktop/portrait framing, and an unchanged
44 m Realistic/Custom opening. At 0/5/10 seconds, with lamps disabled and fresh
atmosphere samples, it checks the +16 ambient reaches the scene without
accumulating. At the floor beneath the hull and eight bearings 40 m away,
linear ambient luminance multiplied by actual fog transmission must exceed
2.5 (380's general floor is 0.1). This measures light inputs, not image pixels.

`tests/e2e/f-lostcity-readable.spec.ts` checks the application wiring for Arcade
free dive and mission on all three tiers, plus the retained Realistic free-dive
opening. Missions go through the normal briefing and Begin dive; the check
catches any camera-controls reset that loses the authored arm. It freezes the opening, disables lamps, and checks actual scene ambient
and fog against the same floor. No screenshot brightness assertions.

## Validation

- Focused unit checks: **4 passed** (Low/Medium/High plus the actual
  mission-start camera event; Realistic/Custom/other sites retain their reset).
- Typecheck: **passed**.
- Main/380 original audit: **10 passed** against this patch, run from an
  ignored `.cache/main-audit` copy with a temporary test config. No tracked
  copy or changes to 380's files.
- `GATES_CONFIG_MODE=writable PW_PORT=4340 tools/gates.sh --full-e2e`:
  config, build/typecheck, unit (**105 files / 1144 tests**), Python
  (**140 tests**), strict content, attribution and Prettier passed. Both root
  and project-base browser gates failed before running tests, as detailed below.
  The project-base production build also passed.
- Browser suites could not start their preview server. The default Vite loader
  attempts to write `node_modules/.vite-temp` on the read-only shared dependency
  tree (`EROFS`). A direct retry with `--configLoader runner` avoids that write
  but then fails with `listen EPERM 127.0.0.1:4340`. Local serving is also blocked.
- Fresh visual first-ten-second acceptance and the seven browser checks remain
  **unverified**. Numeric framing/light-input checks do not certify perceived
  brightness, material detail or subjective composition.

Git's common metadata lives outside the writable worktree. A fast-forward to
main was rejected by the read-only filesystem; main's audit was inspected with
`git show`, and its test/report were not added to this branch.
