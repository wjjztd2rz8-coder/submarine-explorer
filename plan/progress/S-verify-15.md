# S-verify-15 — DIRECTOR.md standing verification item

Reviewed the requested merges on `4ac96b6`: J-atoll-transit (`0b5d85d`,
`8d7f057`), V-monterey-floor (`30f3c2f`, `74bd0b1`, `9c48c0a`, `2947c7f`)
and V-lostcity-low (`2f84d43`, `e89dc28`). Later visual merges remain outside
this targeted review; the full unit run includes their current baselines.

## Findings and fixes

- The debrief's one-star next step already has unit and browser expectations
  for optional objectives and long transits. The existing unit table also
  covers return dives without fresh scans. The wording uses the existing
  summary line; no site branch or additional guidance surface was added.
- The western objective hint had no direct regression assertion. Extended
  `missionPacing.test.ts` to check both optional atoll surveys: the hint names
  optionality, a kilometre distance and the correct direction, and stays
  within 1 km of the authored coordinates. Distances from the first gallery
  contact are 4,506.4 m east and 6,258.0 m west, consistent with the rounded
  4 km / 6 km hints. Both remain optional and primaries alone can end the
  mission. No content correction was necessary.
- Monterey's existing floor test covered High-density pebble presence and
  ripples but missed cobble size, sand patches and lower tiers. Extended that
  capability table across Low, Medium and High, using resolved tier density;
  guards distinct patch slots/colours, patch strength and enlarged cobbles
  with unchanged seeded positions. Existing ripple and pebble-count
  assertions are retained.
- The anti-aliasing change was guarded only by rebaselined shader digests.
  Extended `terrainMaterialReady.test.ts` with checks of the injected shader
  on every tier: zero bias through 3 m, a smooth increasing ramp to five mip
  levels by 25 m, saturation at distance, and bias on every triplanar albedo
  tap. Low still omits normal/breakup defines and the extra albedo sample
  remains behind the existing compile-time switch. This checks shader
  contracts, not actual GPU output or phone readability.
- Removed the old package name/number in the mission pacing spec's comment
  and survey describe label. No new spec, snapshot baseline, runtime setting,
  dependency or production change. No production defect found in scope.

## Simplicity and snapshot audit

The requested production diffs contain no package-number history, layout
patches, runtime config mutation or new site-id branches. Monterey extends
the existing per-site biome table. Lost City's filtering is shared shader
math, without a new setting, fetch or site-specific condition. The debrief
uses its existing text surface.

Monterey's snapshot changes are confined to its biome/uniform hashes and
scatter hash/counts (6 to 7 draws; 164 to 1,701 instances in the fixture).
Lost City's merge changes shader digests across sites, as expected for shared
shader code. Neither merge weakens an assertion or raises a budget ceiling.
No snapshots were updated in this verification.

This is an audit of the named merges, not a claim that all legacy tests are
free of package labels. Older labels remain, for example in
`beebeIsolation.test.ts`, `beebeScatter.test.ts`, `heroMissionSpawn.test.ts`
and the old `f-bughunt-*` specs; this task adds no package-named tests.

## Validation

- Focused capability run: **4 files / 49 tests passed**.
- Production build, TypeScript, strict content validation, attribution,
  repository-wide Prettier and `git diff --check` passed.
- Full unit run: **192 files / 2,700 tests passed**, including all existing
  snapshots, in **534.93 s**. Command:
  `npm test -- --configLoader runner --cache=false --pool=threads`.
- Invoked `GATES_CONFIG_MODE=writable PW_PORT=4296 tools/gates.sh --no-e2e`.
  Config, content and build passed; interrupted the default fork-pool unit
  runner after it stalled at the RUN header and used the existing thread-pool
  workaround without changing shipped configuration.
- Python **161/166 passed**. Four build-manifest tests fail at
  `spawnSync git EPERM`. The golden CLI subprocess test also fails parsing
  empty report stdout (`Unexpected end of JSON input`). A minimal independent
  `execFile(node, ['-e', 'console.log(...)'])` also resolves with empty stdout,
  identifying a runner subprocess-capture problem unrelated to golden image
  comparison. No gate was weakened or skipped to claim a green run.
- Direct existing debrief browser regression attempt exits before assertions:
  preview startup fails and Playwright reports `connect EPERM` for IPv4/IPv6
  loopback. Browser acceptance and real-phone validation remain unverified.

Evidence: `.cache/S-verify-15/{focused,unit,typecheck,attribution,prettier,browser,gates}.log`
and `.cache/runs/20261016-101356-8-bIa79Q/`. Subprocess diagnostics are in
`.cache/S-verify-15/{golden-diagnostic,child-stdout}.log`.
