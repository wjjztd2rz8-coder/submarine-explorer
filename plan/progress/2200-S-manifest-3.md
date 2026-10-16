# S-manifest: prop profiles and material selection

Item: **S-manifest**. Baseline: `3035717`, including the merged habitat and
opening/life migrations (`190b616`, `35dc5bb`). This takes the next props/materials
slice from `S-manifest.md`.

## Migration

Inventory rows **23–30** in `2110-S-verify-9.md` now select capabilities through
`props.<prop-id>` in the owning site's `site.json`:

- Beebe: centre-relative rendered-ground sampling, optional cool-flow habitat,
  seabed material/biome binding, the hero smoker profile and both side-chimney
  variations. Existing `beebe_seabed` and `beebe_habitat` geometry extensions
  remain in `props.json`, including their optional/malformed-content behavior.
- Blue Hole: the east gallery selects the `hood` grotto variant. Mouth shape,
  apron construction, shader, pendant placement and sinking are unchanged.
  Apron dimensions, mesh density and shading parameters now live in the west
  gallery's manifest row; `PropsConfig.blueHoleApron` is a derived compatibility
  view, preserving generic gallery defaults and explicit config overrides.
- Lost City: Poseidon selects inactive-apron habitat. The non-lone-tower guard,
  independent RNG, ray seating and tier counts are unchanged.

The two crust membership selectors and the side-chimney table selector also use
these manifest rows. The material's shared numeric defaults remain shared; the
site-owned eligibility lists and chimney profiles are deleted from TypeScript.
The independent scatter-rock tuning remains for the terrain/scatter slice.

`PropManifest` is optional, typed and strictly validated by the existing eager
loader. `propManifest(id)` derives an index from those validated manifests, rejects
duplicate configured prop ids and supplies undefined for unconfigured props. This
supports direct/headless builders without a second tuning table or tile plumbing.
The shipped-content test verifies every binding belongs uniquely to its content pack.

This removes eight identity expressions, two repeated crust selectors and one
independent side-chimney table. **12 inventory expressions remain**, down from 20.
There are no new settings, UI, dependencies or site-id branches. Existing schema
field checks replace duplicate audio/event validation helpers as part of keeping
the validator simple. Tests extend existing capability files.

## Verification rounds

1. Before migration, the focused prop/framing/golden tests passed: **79 tests in
   six files**. Also captured **12 exact geometry/material golden snapshots**
   against an isolated archive of the baseline: Beebe, Blue Hole, Lost City and
   Axial, each at Low/Medium/High. The snapshots cover geometry attributes and
   indices, instance buffers/colors, materials, vent anchors, bounds, colliders
   and tier budgets.
2. Compared the migrated profiles with the former constants and checked every
   removed selector. Added validator table cases for policies, unknown fields,
   malformed sections, missing profile members, nonfinite/negative dimensions,
   colors, integer allocation counts and signed lean angles. Existing isolation
   snapshots are retained without rebaselining.
3. The migrated focused suite passes: **170 tests in 10 files**, including all
   12 new golden cases and the existing isolation/opening snapshots. Typecheck,
   production build, strict content validation, repository-wide Prettier,
   attribution and `git diff --check` pass. The ownership check also confirms
   every configured prop id is unique across all shipped content packs.

## Gate and browser evidence

- Final invocation: `GATES_CONFIG_MODE=writable PW_PORT=4223 bash tools/gates.sh --full-e2e`.
  Content and production build pass. The aggregate unit gate emitted only its
  RUN header for approximately eight minutes and was interrupted (exit 130).
  Its cause is not established; no full-unit pass or assertion failure is
  claimed. The focused 170-test result above is complete.
- Python: **162/166 pass**. Four existing build-manifest tests fail with
  `spawnSync git EPERM`, also reproducible with a standalone Node child-process
  invocation. No provenance check or test assertion was bypassed.
- Relevant browser discovery: **103 tests in three existing capability files**
  (`props`, `opening-framing`, `f-beebe-plumes`). Execution was attempted, but
  the owned preview cannot bind `127.0.0.1:4224` (`listen EPERM`). No browser,
  pixel/screenshot or full-e2e pass is claimed. The complete browser suite was
  also invoked separately and failed to start its preview for the same reason.
- A broad verbose diagnostic reported **1,342 passing cases with no observed
  failures** before interruption to start the final gate run. That diagnostic
  is not a complete unit-suite result.

Focused and build logs are in `.cache/manifest-validation/`; the final gate's
logs are in `.cache/runs/20261016-003441-2-dFgKt2/` (also linked from `.cache/gates/`).
Existing golden snapshots were not updated. The new prop goldens came from the isolated baseline archive,
including an unchanged Axial control site.

Full gates are **not green in this sandbox**: provenance subprocesses and preview
binding are denied, and the aggregate unit run is incomplete. No gate, runner
setting or regression assertion was weakened. Re-run the full gates in an
environment that permits the provenance subprocesses and local preview server.
