# S-verify-16 — Lost City rims and manifest sonar

DIRECTOR.md Backlog 10. Reviewed checkout `40935d9`: Lost City art merge
`0c14247` (`f208eb9`, compared with its first parent `cbd72d6`) and sonar
migration `22f1698`. Only existing capability specs are extended. No production
code, snapshots, thresholds in existing assertions, or site data changed.

## Numeric findings

- `roughenTrunk` raises broken ledge strength **0.09 → 0.17** and undercut
  strength **0.07 → 0.12**, with the existing base/rim fade. A temporary
  comparison retaining current geometry but restoring just those two old
  strengths verified unchanged topology and triangle/draw counts at every tier.
  For the 100 × 100 × 60 m, seed-820 fixture, radial changes relative to the
  prop origin span **−1.010 / +1.348 m Low**, **−1.244 / +1.469 m Medium**,
  **−1.408 / +2.051 m High**. Side growth seating follows the changed surface,
  so these are composed-mesh changes, not isolated displacement amplitudes.
- The rolled bead acts only on irregular trunks: the shoulder swells by 20%
  near 94% height and returns to 7% at the edge. Trunk rim teeth halve from
  0.5 to 0.25; the broad notches remain. Tests isolate the shoulder/edge,
  check finite positions/normals, unchanged indices and matching cap/wall rim
  vertices. No added triangles from either the bead or stronger trunk relief.
- Rubble reuses the existing merged rock mesh and material. Medium/High raise
  Poseidon's cap from 190 to 260 blocks; Low retains no rubble. For its authored
  footprint, requested counts rise 92 → 125 on Medium and 154 → 209 on High
  (80 triangles per block), accounting for the measured increases below. The outer band
  admits 12% of candidates between outline radii 1.02 and 1.25 and excludes
  lone chimneys. Its support is `max(skirt, ground + 0.05)`.
  Tests exercise clustered/lone builders on sloped ground at all tiers, verify
  that actual outer-block vertices cross the ground surface, enforce block
  caps, and reject the build-plane edges.

Measured against the actual pre-merge builders, with the authored 12 Lost City
props, ID-derived seeds and ground `0.07*x - 0.1*z`:

| Tier   | Poseidon triangles before → after | All props before → after | Mesh draws before → after |
| ------ | --------------------------------- | ------------------------ | ------------------------- |
| Low    | 15,400 → 15,400                   | 44,120 → 44,120          | 14 → 14                   |
| Medium | 49,644 → 52,284                   | 123,400 → 126,040        | 14 → 14                   |
| High   | 69,972 → 74,372                   | 172,184 → 176,584        | 14 → 14                   |

Poseidon retains three mesh draws (rock and two habitat types); each lesser
chimney retains one. Counts include instanced mesh geometry and exclude Points
plumes/fringe, following `countGeo`; they are not full-scene GPU timings.
Every lesser chimney retains its triangle count. The seed-820 rock-only
fixture stays below 30k / 85k / 120k triangles and one mesh draw, with complete
buffer/index/anchor repeatability and changed-seed variation at all three tiers.

**Correction to the art note:** bounds are not entirely byte-identical.
Horizontal bounds and all collision boxes are unchanged; some `max.y` values
rise by **0.00116–0.03539 m**, including Poseidon High by **0.00360 m**.
The claim about an unchanged footprint is supported, but the broader claim
about unchanged bounds is too strong. No geometry tuning was made for this.

## Beebe and cross-site isolation

Loaded the pre-merge spire, tower and finger modules into ignored fixtures,
changing only import paths. Comparing every spire constructed by the authored
Beebe builders confirmed byte-identical attributes and indices: **17 spires
per tier, 51 total**. All three Beebe authored snapshot blocks are unchanged
across the Lost City merge; the only changed authored blocks are Lost City's.
Existing Beebe isolation and authored geometry specs retain their frozen
buffers, materials, vent anchors, collision and tier-budget assertions.

## Sonar policy

`SiteManifest.sonar` is optional and strictly validates nonempty hull POI IDs,
positive finite contour caps and boolean reef flags. Only Endurance has
`scourHullPoi: endurance-hull`; only Blue Hole has `maxContourIntervalM: 10`
and `reef: true`. All 13 site documents were compared across `22f1698`: these
two sonar sections are the only data differences.

The renderer reads one policy. It retains flatness gating for scour, interval
adaptation, measured survey depth limits and the reef's geographic containment
guard. Existing 36 frozen raster/contour/label/depth snapshots cover both
special sites, all zooms, DPR 1/2, palettes, absent hull and out-of-tile reef.
Added tests compare generic output with each of the other 11 sites plus an
unknown site on the same terrain, even when an Endurance hull POI is present.
A renamed hull anchor on an arbitrary site must reproduce the authored scour;
a missing configured anchor must fall back to generic contours.

## Simplicity review

**No DIRECTOR.md simplicity-rule violation found in either merged slice.**
No UI surface, guidance, layout override, setting, runtime config mutation,
dependency or site-identity branch was introduced. Lost City reuses its existing
builder/material/scatter; sonar replaces identity selectors and a separate hull
lookup with site-owned policy. This verification adds only capability tests,
with regression-purpose comments and no package-number source/test comments.
No existing regression assertion was weakened or snapshot rebaselined.

## Validation

- PASS: separate TypeScript check and `git diff --check`.
- PASS: focused sonar/manifest run, **313 tests in two files**, including
  unchanged snapshots. Historical geometry probe passed and was removed.
- Extended **two existing capability specs with 23 regression cases**:
  ten carbonate rim/budget/determinism/rubble cases and thirteen sonar policy
  isolation/anchor cases. Existing assertions and snapshots remain intact.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4380 bash tools/gates.sh` to
  completion, **exit 1**. Config preparation, strict content validation,
  production build, full unit suite, attribution and repository-wide Prettier
  passed. Units: **192 files / 2,828 tests**, 396.07 s. This includes the
  existing Beebe isolation, authored prop geometry, sonar palette/flat-guide
  and manifest validation suites.
- Python: **161/166 passed**, five failures already documented by the earlier
  sonar slice and verification reports. Four build-manifest tests fail at
  `spawnSync git EPERM`; golden tooling fails parsing empty CLI stdout with
  `Unexpected end of JSON input` at `golden-manifest.test.mjs:151`.
  No tooling or assertions were changed to bypass them.
- Smoke and project-base browser gates both stop before tests because their
  owned preview cannot start. The project-base build itself passed.
  A direct bind diagnostic confirms **`listen EPERM: operation not permitted
127.0.0.1:4380`**. Browser acceptance needs an environment permitting local
  preview startup; no rendered visual or real-phone acceptance is claimed.
- PASS: final changed-file formatting and diff checks after completing this note.

Gate logs: `.cache/runs/20261016-152032-28-ZcBW42/` and
`.cache/S-verify-16/gates.log`. Ignored comparison evidence:
`.cache/S-verify-16/{parent-comparison.log,numerics.json,sonar-source.diff,listen.log}`
and pre-merge module fixtures. Temporary historical imports/probe were removed
from tracked tests before the gates. No production fix was necessary; no
simplicity finding requires sending either merged slice back.
