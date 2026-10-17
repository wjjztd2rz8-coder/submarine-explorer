# S-verify-18 — merged numerics and simplicity verification

2026-10-17. Backlog 8, S-verify. Reviewed Endurance wreck policy (`552e484`), Lost City terraces (`ee41267`), and Blue Hole hood (`fbad800`) against current main `92ec9e0`.

## Findings

- **Endurance: verified.** The validated `SiteManifest.wreck` owns the hull anchor, particle ceilings, and horizon. `PresetSystem` supplies the manifest at entry; `WreckPreset.enter` resolves its local parameters once. Existing validator tables reject nonfinite, malformed, and out-of-range policy values. Existing equivalence snapshots and renamed-site/renamed-hull, absent-policy, and absent-hull tests remain intact. Extended the frozen-input test to all three tiers and froze the nested policy too: scene output matches the authored baseline without modifying mission parameters or site data.
- **Terraces: verified.** Extended `terrain-detail.test.ts` with capability tests for deterministic finite relief, bounded terrace displacement, positive/negative displacement, slope/focus/detail-strength gating, and equivalent behavior with the profile moved to an unknown site. Low matches terrace-free geometry attributes, indices, statistics, detail, and collision. Medium/High finite near-mesh vertices and shared chunk edges agree, and 60 off-lattice vertical raycasts per tier agree with physics within 1 mm.
- **Hood geometry: verified.** Existing all-tier seeded finite-buffer/bounds/collider checks still apply to both galleries. New welded-edge checks find no exposed cracks through the roof shell or cap joins; the only unpaired edges are at the bottom sediment join. Renaming the prop while retaining its hood policy preserves roof attributes and collision boxes. Hood interior vertex colors are darker than the same builder with the flag disabled. These are numerical checks, not a visual acceptance review.
- **Hood collision: inherited approximation remains.** `wallColliders` consumes `wallDisp` but not `roofRise`. A hull sphere can overlap the rendered roof after box push-out; one shallow roof probe per tier misses the boxes. This predates the hood merge and improved in the sampled region, but collision and visual geometry are not exact here. The existing apron tests still demand exact rendered-triangle clearance and open water; none of those assertions were loosened.

Ten roof probes per tier use the shipped terrain and placed east gallery: local x = -16, -8, 0, 8, 16 m, local z = -14 m, hull radius 8 m, and initial vertical penetrations 0.4/2.5 m. Independently measure distance to every transformed rendered roof triangle after collision:

| Tier   | Worst residual roof overlap before hood merge | Current | Missed shallow contacts before → current |
| ------ | --------------------------------------------- | ------- | ---------------------------------------- |
| Low    | 1.272 m                                       | 0.624 m | 3 → 1                                    |
| Medium | 1.292 m                                       | 0.676 m | 3 → 1                                    |
| High   | 1.466 m                                       | 0.839 m | 3 → 1                                    |

The comparison temporarily used `fbad800^1`'s builder and restored the current file byte-for-byte. Exploratory measurement logs (before the final proxy-error assertions): `.cache/S-verify-18/hood-before.log` and `.cache/S-verify-18/hood-current.log`. The new capability test bounds current overlap to 0.85 m, missed-contact overlap to 0.43 m, requires all deeper contacts, and requires stable resolved positions. It deliberately documents the proxy limitation instead of claiming exact roof collision. Return exact roof collision to the existing V-bluehole-hood follow-up.

## Simplicity

- No site-id branches were added by these three merges. The wreck literals were removed in favor of data; terrain uses optional `terrace`; grotto uses the existing manifest `hood` flag. Renamed fixtures exercise capabilities independently of site/prop identity.
- No runtime config mutation or new settings/UI surfaces. Wreck parameters resolve at entry, terrain selects the fidelity profile at construction, and grotto reads the policy at build time.
- Added 19 cases by extending only existing capability specs: `enduranceAtmosphere`, `terrain-detail`, `blueHoleProps`, and `blueHoleCollision`. No new spec files, snapshots, source behavior, or package-number comments.

## Validation

- PASS: final focused run, **5 files / 536 tests**, including every extended capability spec and the manifest validator. Log: `.cache/S-verify-18/focused.log`.
- PASS: final separate TypeScript check, changed-file Prettier and `git diff --check`.
- Ran `GATES_CONFIG_MODE=writable bash tools/gates.sh`. **Exit 1**. The initial root build caught a missing test-only attribute type annotation; fixed it and confirmed final TypeScript passes. Root smoke was consequently skipped by that run; the independent smoke attempt below confirms the preview restriction.
- A supplemental `tools/gates.sh --phase build` bundled successfully; its CI provenance writer then failed at `spawnSync git EPERM`. Log: `.cache/runs/20261017-162014-2-1xPYde/build.log`.
- Python: **161/166 pass**. Four build-manifest fixtures fail at `spawnSync git EPERM`; the golden CLI test fails parsing empty stdout (`Unexpected end of JSON input`). These same five failures are already documented in `S-verify-16.md` and `S-verify-17.md`. No tooling assertions changed.
- Independent root smoke cannot start its preview. Direct diagnosis confirms `listen EPERM: operation not permitted 127.0.0.1:4371`. Browser assertions, rendered golden acceptance and real-phone acceptance are not claimed.

Canonical gate logs: `.cache/runs/20261017-161903-2-Zxbo4R/`.

- PASS: full unit gate, **192 files / 3,072 tests**, including unchanged snapshots, in **438.65 s**.
- PASS: gate config preparation, strict content validation, attribution, and repository-wide Prettier. The project-base production build (including TypeScript) also passed on the final tests.
- Project-base browser gate failed before assertions because its owned preview could not start, consistent with the independent loopback diagnostic. No browser-test result is claimed.
- The final focused run and separate typecheck include the final test cleanup; no runtime source or snapshot changes were made.

Verification is complete with the inherited roof-proxy limitation returned to V-bluehole-hood. Python/provenance and browser acceptance still need a runtime that permits child Git and loopback sockets.
