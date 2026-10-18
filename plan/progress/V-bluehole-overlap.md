# V-bluehole-overlap

## Change and regression

Confirmed the east roof bug on the real Blue Hole survey tile. Restoring the
old 0.43 m missed-contact bound without changing production code fails on Low,
Medium and High: the shallow centre probe registers no collision and overlaps
the rendered roof by 0.440138, 0.451407 and 0.438178 m respectively.

`wallColliders` now accepts the same raw-profile vertical deformation callback
as `extrudeProfile`. Each slice samples its profile vertices and crossings at
the existing horizontal sample positions, expanding its vertical extent for
positive and negative rise. It preserves the original box volume and applies
the expansion after the original crest cap. Treating rise as a ground lift
would move slice bottoms and can leave gaps; capping after rise would discard
raised roof faces. The existing hood manifest flag supplies `roofRise`.

The original boxes still generate the distant impostor before physics boxes
are replaced. Full meshes, materials, layout, CSS, terrain and authored data
are unchanged. Collision counts and the per-frame solver are unchanged; the
hood's wall boxes are built twice at prop construction to preserve its visual
proxy. No settings, UI, guidance surfaces, modules or dependencies were added.

Extended `blueHoleCollision.test.ts`: all ten original shallow/deep roof
contacts must now register a hit on each tier. The restored 0.43 m bound applies
to **every shallow contact**, strengthening the previous missed-contact-only
guard. Repeated resolution must remain stable. Five independently clear poses
above the roof must remain unmoved on each tier. Existing apron, gallery water,
re-placement, rebuild and collision-disabled guards remain intact.

## Measurements

Hull radius is 8 m. Distances below are independently measured against every
transformed rendered roof triangle, not against the collision boxes.

| Tier   | Centre shallow clearance before / after (m) | Minimum shallow clearance after (m) | Worst deep overlap before / after (m) |
| ------ | ------------------------------------------- | ----------------------------------- | ------------------------------------- |
| Low    | 7.559862 / 8.470541                         | 8.242745                            | 0.627633 / 0.027198                   |
| Medium | 7.548593 / 8.407311                         | 8.103956                            | 0.688642 / 0.146667                   |
| High   | 7.561822 / 8.254604                         | 7.780119                            | 0.830675 / 0.598588                   |

All 30 roof probes now register collision, versus 27 before. Maximum second-call
movement is approximately 3.6e-15 m. The reported centre overlap is resolved.
The coarse wall boxes still approximate the tapered roof: the High deep probe
at local x=16 m retains 0.598588 m overlap (previously 0.470331 m at that exact
probe). The unchanged 0.85 m deep-contact budget remains necessary; this does
not claim exact clearance everywhere on the roof. The restored 0.43 m shallow
budget passes with a worst measured overlap of 0.219881 m.

Both galleries across all tiers retain 2,997 resolved apron contacts and 99
unmoved open-water probes. Minimum apron clearance is 7.999999995 m; maximum
remaining volume penetration is below 2.5e-14 m.

## Validation

Passed capability checks:

- `VERIFY_1495=1 npm test -- --configLoader runner --cache=false
tests/unit/blueHoleCollision.test.ts tests/unit/blueHoleProps.test.ts
tests/unit/blueHoleOpening.test.ts tests/unit/blueHoleWall.test.ts
tests/unit/geo-colliders.test.ts tests/unit/props-collision.test.ts
tests/unit/props-geo.test.ts tests/unit/terrainMerge1140.test.ts` initially
  passed 173/176 tests. Its only failures were the three expected east-gallery
  placement hashes. The same run with `--pool=threads` reproduced that result.
- Reviewed and refreshed only those three placement hashes via
  `props-geo.test.ts -t great-blue-hole --update`. Every full/impostor buffer,
  material and mesh-budget hash stayed unchanged. The final **entire**
  `props-geo.test.ts` rerun passed **73/73**, giving **176/176** capability tests
  passing across the final runs. No behavioral assertion or timeout was relaxed.
- Formatting of the changed source/test/progress files and `git diff --check`
  passed. The generated snapshot format is maintained by Vitest.

Required gate invocation:
`GATES_CONFIG_MODE=writable PW_PORT=4258 PW_OUTDIR=dist-V-bluehole-overlap bash tools/gates.sh`.
The documented writable-config mode avoids writes into the shared dependency
tree. **Exit 1; the aggregate gate is not green.** Config, strict content,
production build/typecheck, attribution and repository-wide Prettier passed.
The project-base production build also passed before its browser start failed.

The gate's unit run covered **192 files / 3,224 tests** in 440.19 s:
**3,221 passed**, with only the three old east-gallery placement snapshots
failing. This run started before those snapshots were refreshed. The final
73/73 prop-suite rerun above verifies their correction, including all other
tests in that file; no other full-suite unit failures occurred. The gate's root
smoke and project-base browser steps both failed to start their preview server.

Execution/tooling failures, separate from the collision regression:

- Python gate: **161/166 passed**. Four provenance tests fail with
  `spawnSync git EPERM`. The golden-tooling test fails parsing subprocess JSON
  (`Unexpected end of JSON input`); its underlying cause is unconfirmed here.
- Attempted five existing Blue Hole browser capability checks: three mesh/depth
  agreement cases, the underwater opening/detail approach, and the authored east
  grotto close pose. Playwright exits before running any test because the preview
  server cannot start. Running that preview directly confirms
  `listen EPERM: operation not permitted 127.0.0.1:4259`.

Logs and measured probe evidence are under `.cache/V-bluehole-overlap/`, with
`clearance.json` retaining the nine roof/apron measurement groups. The existing
optional evidence hook also writes `.cache/1495/clearance.json`. Canonical gate
logs are in `.cache/runs/20261018-131908-3-IiFefP/`. The owned build output
`dist-V-bluehole-overlap` was removed after validation.

Scope follows the numerical/behavioral rubric: contact feedback now catches the
previous shallow miss, repeated contacts stay stable, and clear water remains
open. Beauty, phone appearance and screenshot acceptance remain with Claude;
no visual acceptance is claimed. No changes to `tools/` or `plan/DIRECTOR.md`,
and no merge, push or tag.
