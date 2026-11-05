# S-verify-pose-tools

2026-11-04. Verified merged checkout `19a639a4` against main `6a1fbe3a`;
their only differences are `plan/DIRECTOR.md` and `plan/OVERNIGHT-LOG.md`.
The runtime, site data and tooling being measured are identical.

No numeric discrepancy found in the requested hood evidence or shipped-opening
framing table. Verification limitations and unrelated gate failures are listed
below. No site data, visuals, runtime code, dependencies or safety rules changed.

## Reproduction

- Ran the complete pose search twice, plus saved-candidate verification twice.
  Both full-search outputs match exactly, as do both verification outputs.
  Search counts reproduce: **1,425 trials, 292 hull-clear trials, 12 finalists**.
- Compared every candidate and shipped baseline measurement in
  `T-bluehole-hood-poses.json` with the saved-candidate rerun: all agree within
  `1e-7` (the full-search bearing differs from the rounded saved fixture by
  approximately `2.4e-9` degrees). Displayed hood percentages, positions,
  distances and clearance values reproduce.
- Ran the diagnostics framing audit for all 13 sites and both viewports.
  All **26 rows / 130 displayed numeric cells** match `T-framing-metrics.md`.
  Both audit rounds pass **30/30** selected checks, and all 26 complete JSON
  records agree exactly between rounds.
  This comparison covers its shipped-opening table; its temporary exploratory
  five-site proposal probes are not part of that diagnostics table.
- A/B/C minimum hull-to-terrain gaps across Low/Medium/High reproduce as
  **0.869822 / 5.869822 / 4.541130 m**. Minimum camera-arm terrain gap is
  **24.282889 m**. The existing all-tier candidate test checks actual hull
  vertices, enclosing hull spheres against props, viewport containment and
  camera arms. First safety round: **42 passed** (3 candidate-tier cases and
  39 shipped mission route cases across all sites/tiers). The second round
  passes **43/43**, including the independent B projection check added below.
- The shipped Blue Hole mission's horizontal route check remains true on every
  tier. All A/B/C routes to either gallery remain false, exactly as previously
  reported; clear initial poses do not establish a navigable approach.

## Independent projection check

Extended the existing `lowTierFollowups.test.ts` capability spec with one
render-free candidate-B test, using real High terrain, props, submarine and
CameraRig at 1600×900 and 390×844. It constructs pinhole rays from the camera's
forward/right/up basis and FOV, without projection matrices, inverse matrices
or `Raycaster.setFromCamera`. Three's triangle ray intersections independently
check the diagnostic rasterizer's hood-only and depth-tested labels at **960
exact pixel centres per viewport**, including visible hood and occluded hood.
Both independent runs pass; the existing raster unit suite also passes
**5/5**. This is sampled geometric agreement, not an independent full-frame
area integration or rendered visual acceptance.

One test extends an existing capability spec and reuses its scene loader.
No new runtime abstraction, site branch, setting or UI surface was introduced.

## Commands and evidence

Ignored outputs and logs are under `.cache/pose-verification/`.

```sh
node tools/blue-hole-pose-search.mjs .cache/pose-verification/search-round1.json
node tools/blue-hole-pose-search.mjs --verify .cache/pose-verification/hood-round1.json
OPENING_GEOMETRY_AUDIT=1 npx vitest run \
  tests/unit/missionComposition.test.ts tests/unit/quality.test.ts \
  -t 'mission opening objective angular size|opening water fractions|diagnostic graphics tiers' \
  --configLoader runner --pool=threads --maxWorkers=1
npx vitest run tests/unit/lowTierFollowups.test.ts tests/unit/missionComposition.test.ts \
  -t 'saved hood candidates|pinhole rays|opening hulls clear terrain/props and the first scan is reachable' \
  --configLoader runner --pool=threads --maxWorkers=1
node tools/tests/pose-projection.test.mjs
GATES_CONFIG_MODE=writable PW_PORT=4266 PW_OUTDIR=dist-pose-verification bash tools/gates.sh
```

Searched `tests/e2e` for framing, opening, hood/gallery and approach capabilities.
Attempted the following existing specs, with two repetitions selected; neither
executed browser assertions because the configured preview process could not
start. A debug rerun reports `connect EPERM` for both `::1:4267` and
`127.0.0.1:4267`. No browser or screenshot acceptance is claimed.

```sh
PW_PORT=4267 PW_OUTDIR=dist-pose-verification GATES_CONFIG_MODE=writable \
  npx playwright test tests/e2e/opening-framing.spec.ts \
  -g '(great-blue-hole|beebe-vent-field|lost-city) high: mission previews and opens on an approach outside scan range' \
  --repeat-each=2 --output=.cache/pose-verification/e2e-opening
PW_PORT=4268 PW_OUTDIR=dist-pose-verification GATES_CONFIG_MODE=writable \
  npx playwright test tests/e2e/f-lowtier-followups.spec.ts \
  -g 'Blue Hole east gallery owns its scan card at both authored poses' \
  --repeat-each=2 --output=.cache/pose-verification/e2e-east
```

## Gate discrepancies

- Python gate: **5 failures / 167 tests**. Four unchanged build-manifest tests
  fail at `spawnSync git EPERM`; the unchanged golden-tooling test fails when
  parsing empty JSON stdout from its comparison CLI. See
  `.cache/gates/python.log`.
- Both browser gates (root smoke and project-base) fail before assertions:
  the preview process cannot start. Targeted browser checks have the same
  limitation, with localhost `EPERM` captured in the debug log above.
- All other gates pass: production root/project-base builds, content validation,
  attribution, repository formatting, and **4,556 unit tests across 194 files**.
  The complete unit run took 852 seconds. A final standalone TypeScript check,
  independent-B rerun, changed-file formatting and `git diff --check` also pass.
  Overall `tools/gates.sh` exits **1** for the Python and browser failures above.

Temporary build output was removed after verification. Only the existing
capability test and this progress note remain changed.
