# 3480 — S-bughunt: save migration and progress persistence

Serves DIRECTOR Backlog 9 (S-verify / S-bughunt). Scope: headless unit tests only.

## Plan

1. Audit settings/progress migration, discovery persistence, and Journal/mission loading for old saves, partial lists, duplicate IDs, unknown sites, and mid-mission reloads.
2. Add focused regression cases to existing capability specs; reproduce and minimally fix confirmed defects.
3. Review the changes in a second audit round, run `tools/gates.sh --no-e2e`, and record a final report.

## Progress

- Read `plan/DIRECTOR.md`, repository conventions, and the gate runner. No browser work is required or planned.
- Located separate settings, research progress, and discovery stores; Journal unlocks read the discovery store rather than settings.
- Round 1: reproduced discovery loss when a partial `discovered` field masks the legacy `discoveries` field in the same save. Three regression cases failed before the fix. Migration now fills missing valid records from the legacy field, deduplicates IDs, and retains current timestamps/counts for overlapping records. The next scan persists the recovered union.
- Added cases to existing discovery-store, Journal-data, mission-core, and settings-save capability specs. No new spec files or package identifiers in code.
- Round 2: checked map/list collisions, malformed sibling records, unknown/retired site namespaces, future-version protection, and settings recovery/reset isolation. A damaged current map entry can recover from intact legacy evidence; duplicate evidence neither replaces valid current metadata nor inflates scan counts.
- A headless Scanner/Mission reload case verifies that a completed scan persists immediately, an unfinished beam does not persist, the new dive opens with fresh objectives and clock, and a previously logged opening target can be scanned again to advance the mission.
- `src/core/Save.ts` required no production change: existing sanitization and storage protections hold, and added tests confirm older/corrupt settings recovery, edits, and reset leave discovery and research bytes untouched.
- Targeted validation: 8 capability specs / 358 tests passed, including 12 added cases. The full headless gate runner is in progress.

## Final report

One confirmed migration defect fixed with a small change confined to `src/game/DiscoveryStore.ts`. Journal and mission runtime behavior needed no changes. No settings, UI, schema, storage-key, or dependency changes.

For example, `{"version":1,"discovered":[],"discoveries":["titanic/bow"]}` previously loaded an empty Journal store and lost the readable legacy entry on the next scan. It now recovers `titanic/bow` and persists it with subsequent discoveries. Existing current records take precedence over duplicate legacy evidence, so their first-discovery timestamps and scan counts survive.

Validation results will be recorded after `tools/gates.sh --no-e2e` finishes. Browser tests are intentionally excluded by the brief.
