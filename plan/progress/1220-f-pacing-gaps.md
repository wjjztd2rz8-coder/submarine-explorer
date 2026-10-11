# 1220 Mission pacing: remaining long gaps

Scope: finish the Challenger Deep, Hunga Tonga and Hudson Canyon pacing follow-up in `f-mission-pacing.md`. Two rounds: implement and validate, then review the final changes and run the gates. No rendering, prop, terrain or generated tile changes.

## Routes and bathymetry

Each mission keeps two required scans. The scan nearest the existing scenic opening is followed by a new nearby terrain survey; the distant scan remains available as an optional longer survey. Challenger starts at Leggo; Hunga starts at its volcanic rim slope; Hudson starts at its coral-habitat ledge. Briefings and hints explain that choice; Hunga's briefing now reports the rim-slope depth (469 m).

| Site            | Old required gap | New required gap | New survey                                | Grid depth | Cell (row, column) |
| --------------- | ---------------: | ---------------: | ----------------------------------------- | ---------: | ------------------ |
| Challenger Deep |          4,139 m |            817 m | Eastern Pool floor transect               | 10,919.8 m | 450, 446           |
| Hunga Tonga     |          3,315 m |            660 m | Volcanic flank transect (pre-2022 survey) |    292.9 m | 306, 267           |
| Hudson Canyon   |          2,807 m |            555 m | Canyon flank transect                     |    976.7 m | 433, 936           |

Coordinates are exact cell centres in the shipped GMRT `heightmap.bin` grids (zero-based, north-first rows). POIs use `snap_to_seabed`; Journal entries cite GMRT and each tile's original GridServer request. They distinguish survey-grid readings from named features, historic lander deployments and observed coral colonies. These are real terrain surveys, with no new plausible landforms, props or staged encounters, so no new recreation/game-addition tag is needed. Existing tagged content stays tagged once through its existing Journal entry.

## Save compatibility and regression coverage

- Extended the existing discoveries-only migration with all three old objective role maps, preserving their earned completion, ratings and unlock credit without crediting the newly added scan. Renamed the route table to `PREVIOUS_OBJECTIVES` to cover both earlier pacing changes and 1220.
- Existing progress saves remain idempotent; new mission runs begin with their scans incomplete. Regression cases cover old primary-only routes, Challenger's full old route, reload idempotency, unchanged discovery records and unfinished old routes.
- Removed the long-gap allowlist completely. Every shipped mission must have at least two required targets and consecutive gaps of at most 1,500 m. The three new survey routes additionally enforce 1,000 m, check exact survey-cell coordinates and depths, and exercise mission completion with the remote target still unscanned.

## Validation

Round 1: focused pacing, migration and near-site tests passed (49 tests). Strict content validation passed for all 13 sites after expanding the new Journal explanations and adding the original GridServer source links.

Round 2: the full unit gate caught four opening regressions in the first route draft: Hunga and Hudson’s scenic openings were left far from a required target when the nearby scenic scan became optional. Reordered those two routes around their existing scenic scan, moved each new terrain survey nearby and made the remote scan optional. Rendering, camera and spawn code remain unchanged. The focused rerun passed all 66 tests across pacing, migration, near-site starts and phone opening/camera checks. Initial gate output is retained in `.cache/1220-initial-unit.log`.

Final run: `GATES_CONFIG_MODE=writable PW_PORT=4220 tools/gates.sh`.

| Gate                                   | Result                                                     |
| -------------------------------------- | ---------------------------------------------------------- |
| Config / TypeScript / production build | PASS                                                       |
| Unit                                   | PASS: 1,740 tests, 174 files (402.50 s)                    |
| Python                                 | PASS: 153 tests                                            |
| Strict content                         | PASS: all 13 sites, no errors or warnings                  |
| Attribution                            | PASS                                                       |
| Prettier                               | PASS                                                       |
| Browser smoke                          | BLOCKED: preview server could not start                    |
| Project-base browser checks            | BLOCKED: base build passed; preview server could not start |

The gate command exited 1 solely because both browser suites could not start their server. A direct preview probe confirmed the sandbox rejects binding localhost with `listen EPERM: operation not permitted 127.0.0.1:4220`. No browser tests executed or screenshots were produced, so browser acceptance remains unverified. Final logs: `.cache/gates/{build,unit,python,content,attribution,prettier,e2e,e2e-base}.log`.

Final diff review and `git diff --check` passed. Only the three content packs, save-migration route maps, pacing/migration tests, changelog and progress notes changed. All original POIs and their factual/reconstruction metadata are retained; no rendering or generated-data files changed.
