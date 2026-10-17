# S-verify — Beebe smoker profile

DIRECTOR.md Backlog 8 (S-verify, standing). Numeric/data-contract audit of merge `24c0572342ed9a26484859b3e4bf7e8b50197136`
(V-beebe-close slice 2), compared with first parent `0127ee8`. Worktree starts
at `92ec9e0`; the audited merge is an ancestor. Read `V-beebe-close-2.md`, its
merge diff and the earlier profile contract in `S-verify-14.md`. This slice covers
the new material fields and throat emission, without reopening lamps or geometry.

## Confirmed contract defect

`SmokerProfile` promises numeric `bodyShade` and `bodyGlow`, but validation left
both undefined when omitted. The builder's fallbacks hid the missing resolved
values. An extended existing manifest test failed on exactly these two absent
properties before the fix (442 other cases passed).

Resolve 0.95 and 0.16 alongside the existing taper/throat defaults in
`validateSiteManifest`, copying the profile without changing its source. The
builder now reads the resolved numbers directly; its unprofiled 1.25/0.13 branch
is unchanged. `docs/props.md` now documents both optional input fields, ranges,
defaults and the separate unprofiled behavior. No authored tuning changed.

Both fields accept finite numbers in `(0, 1]`; zero is outside the documented
contract, including for glow. Manifest guards cover the smallest positive JS
number, 0.01 and 1, and reject zero, negatives, just above 1, NaN, both infinities,
null, strings, booleans, objects and arrays. Throat RGB accepts integer endpoints
0 and 0xffffff and rejects malformed, fractional, negative and overflowing
values. An absent optional field (including JS `undefined`) resolves its default;
explicit null is rejected before default resolution.

## Numeric and state evidence

Data flows from bundled `site.json` through validation and `propManifest` to the
smoker builder. Beebe authors shade 0.5, glow 0.1 and throat decimal **16738330**,
which is **0xff681a**. The earlier progress note says 0xff691a; that hexadecimal
annotation does not match its merged JSON. Preserve the authored decimal value
and leave any intended color change to Claude.

With headless detail textures absent, body RGB channels are each **0.035** for
Beebe, **0.0665** for an omitted-field profile and **0.08750000000000001** for an
unprofiled smoker. Body emissive RGB is linear `Color(0xff9a68) * bodyGlow`;
Beebe yields `[0.1, 0.03231432091022285, 0.013843161502267547]`.
`emissiveIntensity` remains 1. The shader floor remains 0.5; only material
uniform values change, so a shared shader program key is appropriate.

`geoMaterial` creates a fresh material/color each call; `vertexGlow` updates
that material's emissive and callback. Only detail textures are cached. No
profile writes or shared mutable material state were found. New guards freeze
resolved profiles, retain the original source JSON, interleave Beebe and Axial
clusters, mutate an earlier cluster's color/emissive and check peers and later
builds. They check all geometry attributes, instance matrices, bounds, colliders
and vent tops for finite values.

The existing props capability spec now compares all geometry/instance buffers,
transforms, bounds, collision boxes, vent tops and costs across Low/Medium/High
while independently changing shade, glow and throat, omitting the new fields,
restoring explicit prior defaults and using accepted extreme values. Repeated
authored Beebe and unprofiled Axial builds also compare material-inclusive output.
The existing golden evidence helper is shared without changing its default
serialization or snapshots.

The merge's three changed Beebe `buffers` hashes include material properties;
they are not geometry-only hashes. Its diff changes body albedo/emissive and
mouth emissive, with unchanged placement hashes, vent tops and budgets. The
material-only comparisons explicitly include the pre-slice 0.95/0.16 body values
and 0x9a3a0c throat. No snapshot rebaseline is needed in this audit. The unchanged
authored hero costs/anchors are:

| Tier   | Full draws | Full triangles | Explicit collider boxes | Vent top (local m) |
| ------ | ---------: | -------------: | ----------------------: | -----------------: |
| Low    |          9 |         18,010 |                      13 |  27.84017557996292 |
| Medium |          9 |         88,022 |                      13 |  27.84017557996292 |
| High   |          9 |        148,058 |                      13 |  27.84017557996292 |

The shipped smoker-cluster set is Beebe's hero and Axial's
`ashes-smoker-mound`; both are exercised in every tier. Other sites' golden
buffers/materials and Beebe's two other chimney snapshots remain unchanged.

## Validation

- Focused final run:
  `npx vitest run tests/unit/siteManifest.test.ts tests/unit/props-geo.test.ts tests/unit/beebeIsolation.test.ts tests/unit/props-collision.test.ts tests/unit/perf-budget.test.ts --configLoader runner --cache=false --pool=threads`:
  **5 files / 552 tests passed**, 72.13 s. All existing snapshots passed unchanged.
- Required gate invocation: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Config, strict content and production build (including TypeScript) **passed**.
  Python reported **161/166 passed**. Four provenance tests fail at child
  `git rev-parse HEAD` with `spawnSync git EPERM` (environment restriction).
  Separately, `test_golden_tooling` fails parsing an empty CLI report with
  `Unexpected end of JSON input`; no smoker code is involved and its root cause
  was not established. A direct narrow Node test retry also exited unsuccessfully.
  The same five signatures are documented in `2360-S-bughunt-beebe-lamps.md`.
- The gate's default fork-pool unit invocation was interrupted too early (exit
  130), before attribution/formatting. Its lack of incremental output does not
  establish a stall: the earlier audit records a 467.16 s full run. The final
  full unit supplement, `npx vitest run --configLoader runner --cache=false --pool=threads`, **passed: 192 files / 3,094 tests**, 521.16 s. All test
  assertions and configured timeouts were retained. The aggregate gate invocation
  itself remains interrupted; the separate full unit and static checks do not
  turn its five Python failures green.
- Separate final `npm run typecheck`, `python3 tools/check_attribution.py`,
  repository-wide `npx prettier --check .` and `git diff --check` **passed**.
- `--no-e2e` deliberately keeps this audit nonvisual; browser/game rendering
  and browser assertions were not run. No assertion, timeout or tooling change
  was used to bypass a gate failure.

Gate logs: `.cache/runs/20261017-164901-2-NCymKP/`. Focused results and separate
static checks: `.cache/S-verify-beebe-profile/`.

## Simplicity and limits

Defaults now resolve in one place, using the existing validator and builder.
No new runtime abstraction, setting, dependency, site branch, UI, guidance,
layout, geometry or art tuning. Existing capability specs are extended; no new
spec or relaxed assertion/timeout. `tools/` and `plan/DIRECTOR.md` are untouched.
No game rendering, screenshots, brightness/glow/color aesthetic judgment or
phone acceptance. Headless textures are null; browser texture upload, compiled
GPU shader execution and GPU resource lifetime are not certified here. Beauty,
phone appearance and screenshot acceptance remain with Claude.
