# S-verify-14 — DIRECTOR.md item 10

## Plan and scope

1. Inspect the V-beebe-stack and V-challenger-lander merge diffs, profile data,
   budgets and snapshot history; review the Home Controls accessibility spec fix.
2. Hunt malformed profile/radius inputs and fix demonstrated defects with tests
   of the affected capability. Preserve authored geometry and existing budgets.
3. Run `tools/gates.sh`, supplement restricted runner failures where possible,
   and record evidence and remaining validation limits.

## Findings and fixes

- Reviewed Beebe commits `a5b5062`, `2320bf3` / merge `7e560c6`, lander
  `e80d722` / merge `98ce6fd`, accessibility fix `f28952f`, and follow-up
  title spec correction `e142419`.
- No new site-id branches or package-number annotations in the merged production
  changes. Smoker selection/albedo use the manifest profile; the lander uses
  dimensions and tier. Beebe's shelves remain data: main count 3, step 0.21,
  jitter 0.9, with taper 0.3 and throat RGB 10107404.
- **Fixed:** the validator accepted `topFraction > 1`, allowing an inverted
  taper. It now requires a finite value in `(0, 1]`. Zero is rejected for this
  open-mouth profile; pointed spire primitives retain their existing zero-tip
  support and finite-geometry regression test.
- **Fixed:** the two new fields had no compatibility defaults in validation.
  Missing `topFraction` and `throatColor` now resolve once to the original 0.45
  taper and black/unlit emission (0), respectively, without mutating input data.
  Both fields, units/ranges and defaults are documented on `SmokerProfile` in
  `SiteManifest.ts` and in `docs/props.md`.
- Extended the existing manifest tests for missing fields, authored values,
  boundary 1, NaN/Infinity, negative/zero/out-of-range taper, bad colours and
  zero mouth/base/tip radii. Existing finite/positive checks already reject
  non-finite shape fields and zero mouth radii before construction.
- Extended existing prop geometry tests with an arbitrary prop id: validated
  profile controls actual mouth radius, emission and relative body albedo on
  all three tiers; position/normal/colour buffers remain finite. No new test
  module, settings or dependencies. Corrected the lander's obsolete glass-float
  header to describe foam.

## Geometry, colour and snapshot audit

| Tier   | Lander triangles / ceiling | Lander draws | Beebe hero triangles (before → after) | Beebe hero draws |
| ------ | -------------------------- | ------------ | ------------------------------------- | ---------------- |
| Low    | 1,785 / 2,000              | 3            | 18,430 → 18,010                       | 9                |
| Medium | 2,754 / 3,000              | 3            | 88,610 → 88,022                       | 9                |
| High   | 2,754 / 3,000              | 3            | 148,814 → 148,058                     | 9                |

- The Low lander floats still use 20 faces each; Medium/High still use 80.
  `foamSphere` retains the prior tier rule. Noise deformation and normals run
  only at construction. Faceting is the existing tessellation choice. Added
  frame details raise total triangles from 1,393/2,182 to 1,785/2,754, within
  the unchanged 2,000/3,000 ceilings and unchanged three draws. This establishes
  geometry cost, not measured phone/GPU frame time.
- Chimneys 2 and 3 deliberately share the new `paintCrust` bands: the merge
  progress note explicitly names them. Their builder/shape data did not change.
  Their snapshots changed aggregate colour-containing buffer hashes while
  retaining triangle/draw counts, placement/collision hashes and vent anchors.
- **Qualification to “only geometry hashes”:** `2320bf3` also lowered hero
  triangle counts, correctly accounting for three fewer main shelves. Its
  snapshot changes are confined to geometry/buffer hashes and those cost
  reductions. Draws, placement/collision hashes, vent heights and impostors
  remain unchanged. The terrain-merge snapshot likewise changes only the
  Beebe Low aggregate buffer hash and triangles (20,758 → 20,338). No budget
  ceiling was raised. This task does not rebaseline any snapshot.
- Home Controls now targets `.controls-card` in the accessibility spec, while
  Journal/Settings retain their own dialogs. The existing assertions still
  exercise both Tab directions, Escape, visible focus and opener restoration.
  The matching title test checks paused title rendering and usable menu return.

## Validation progress

- Initial focused run: **5 files / 142 tests passed**, including profile
  validation, lander budgets, all-tier prop snapshots, Beebe isolation and
  finite pointed-spire tips. Follow-up capability tests and final suite pending.
- Required gate invocation:
  `GATES_CONFIG_MODE=writable PW_PORT=4294 PW_OUTDIR=dist-s-verify-14 tools/gates.sh`.
  Config, strict content and production build passed. Python: **162/166 passed**;
  four existing build-manifest tests failed at child `git` with `spawnSync git
EPERM`. Default fork-pool unit runner stalled at its RUN header and was
  interrupted; retry uses the established thread pool workaround, with no
  shipped test configuration changes.
- Targeted Home accessibility/title browser attempt could not start the preview
  server and exited before assertions. Debug output reports `connect EPERM` on
  IPv4/IPv6 loopback; direct preview confirms `listen EPERM 127.0.0.1:4295`.
- Final TypeScript check, attribution and repository-wide Prettier passed.
  The three new arbitrary-id capability checks pass. Full unit run pending.
- Retried the canonical build phase against the final source:
  `GATES_CONFIG_MODE=writable PW_PORT=4294 PW_OUTDIR=dist-s-verify-14 tools/gates.sh --phase build`.
  Native-config production bundle and service-worker stamping succeeded, but
  build provenance stamping then failed at `spawnSync git EPERM`. A separate
  runner-config attempt encountered the known Vite/PWA module-runner shutdown
  issue; the gate's native-config path avoids it. No provenance guard or test
  configuration was changed to hide these restrictions.

Evidence: initial aggregate logs in
`.cache/runs/20261016-064652-2-IRRDnZ/`; final build phase in
`.cache/runs/20261016-065018-3-uKRKPB/`; final unit, capability, TypeScript,
formatting, attribution and browser diagnostics in `.cache/S-verify-14/`.

## Simplicity and limits

No UI or visual tuning, extra guidance surfaces, layout patches, runtime config
mutation or new dependencies. Existing profiles keep the same resolved authored
values. Browser/phone visual acceptance remains with the visual review lane.
