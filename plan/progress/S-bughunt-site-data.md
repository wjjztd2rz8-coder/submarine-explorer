# S-bughunt-site-data

2026-11-09 — DIRECTOR item 16l, brief 185.

## Audit and correction

- Round 1 checked all 13 indexed packs against their GMRT heightmaps and raw JSON, before game parsers can discard records. Inventory: 49 objectives, 52 POIs, 85 guide entries, 322 OBIS records, 75 props, 39 secrets and 26 samples. No missing objective/Journal/species references or duplicate scoped ids found. A separate read of all 126 JSON files under `data/` found no duplicate object keys. The map catalogue intentionally contains additional places without playable terrain packs.
- Round 2 checked Low/Medium/High terrain and real scan/vehicle/prop geometry for every objective, including optional surveys. The MARS POI's authored 888 m depth was 0.29–0.60 m below the detailed seabed. Runtime clamping already kept it scannable. Replace that rounded depth with `snap_to_seabed: true`, matching the seabed observatory's placement intent and preserving the published depth in its note. No coordinate or historical claims changed.

## Coverage and simplicity

`tests/unit/siteData.test.ts` loops the complete site index: raw ids remain unique within their namespaces, parsers retain every record, objectives resolve POIs, guide links reach real Journal entries, OBIS records reach Journal entries, and ordinary/rare/staged wildlife ids resolve to catalogue definitions and Journal text. It checks all objectives against actual terrain bounds, rated hull depths and seabed at all three tiers, rejecting buried explicit depths before runtime clamping can hide them.

Extend the existing `missionComposition.test.ts` scan capability from primary objectives to every objective. Candidate scan poses now also stay inside terrain bounds with hull clearance. The existing real submarine step, pitch/minimum-depth restrictions, procedural/model collisions and actual scanner completion checks remain intact. All-site coverage grows without a second scan-search implementation. No runtime code, new settings, guidance, layout patches or shared site branches; no gameplay/UI cuts.

## Validation

- `npx vitest run tests/unit/siteData.test.ts tests/unit/missionComposition.test.ts -t 'raw ids|indexes|every objective' --configLoader runner --cache=false` — **66 passed**, 80 unrelated composition cases skipped. The initial terrain test failed on the MARS marker in all three tiers before its data correction; the corrected data passes.
- `npm run typecheck` — passed.
- `npm run check:content` after the MARS correction — all 13 packs passed with zero errors or warnings.
- Rechecked all 13 raw-reference cases after including both staged-wildlife strategies — passed. Final focused log: `.cache/site-data-final-focused.log`.
- Searched `tests/e2e` for mission objectives, scan targets, seabed and Monterey/Journal coverage. Attempted the matching capability cases against the isolated gate build:
  - `GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/runs/20261109-111806-2-5MQ165/dist npx playwright test tests/e2e/content-missions.spec.ts -g 'monterey-canyon: briefing to primary scans to debrief' --output=.cache/site-data-mission-e2e`
  - `GATES_CONFIG_MODE=writable PW_PORT=4372 PW_OUTDIR=.cache/runs/20261109-111806-2-5MQ165/dist npx playwright test tests/e2e/journal-debrief.spec.ts -g 'monterey-canyon: Home -> first scan -> Journal -> second scan -> Journal -> debrief' --output=.cache/site-data-journal-e2e`
- Both Playwright commands exit before tests execute because the preview server cannot start. Direct preview confirms `listen EPERM: operation not permitted 127.0.0.1:4372`. Browser acceptance remains unverified.
- `GATES_CONFIG_MODE=writable tools/gates.sh` completed with **FAIL**; logs in `.cache/runs/20261109-111806-2-5MQ165/`. **All 196 unit files / 4,722 tests passed** (1,312.59 seconds). Content, root build/typecheck, project-base build/typecheck, attribution and repository-wide Prettier passed. Python has five failures: four build-manifest cases hit sandbox `spawnSync git EPERM`, and the golden comparison subprocess returns empty JSON. Root smoke/spawn-camera and project-base Playwright gates fail before executing tests because their preview server cannot start. These failures do not establish browser acceptance.
