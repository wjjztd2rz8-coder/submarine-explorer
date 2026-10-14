# S-rewards — fixed equipment and discovery cosmetics

Backlog ID: **S-rewards**, requested as item 19 in the brief; the current Director list places the same stable item at 16. Owner decision: 2026-10-12. Work stays within this item. No Director or tools edits; no merge, push or tag.

## Changes

- Cut purchases, RP earnings and hull gates, deleting the Upgrades modal, its stylesheet and menu injections. The resolved complete kit is identical for fresh and purchased saves. Hull class follows mission/tile depth in every mode; Blue Hole retains A. Mode changes retain the loaded depth-fitted hull and no longer announce obsolete access changes.
- One native picker in the Journal front page replaces the workshop: paint, decal and photo-frame choices. Cosmetic definitions and their discovery thresholds are data. Existing paint shaders, hull decal atlas/placements and photo capture handle application. Sub choices apply at construction and survive hull swaps; frames are baked into new photos. Existing Low-tier decal omission remains.
- Samples and secrets share Journal Finds, with original discovery/save keys. Sample scans now log Journal entries; sightings remain Journal/debrief records without RP approach/confirmation checklists.
- Progress schema v2 retains archived balances/purchase records, ratings, Daily records and original reward identities. Migration recovers damaged legacy balances from tokens/purchase levels, grants cosmetics for past RP including spending, and keeps all formerly earned paint/lamp choices. Initial discovery-only legacy backfill also preserves prior star cosmetics. A persisted backfill boundary prevents retries from reinterpreting modern star/mission records as legacy cosmetic grants. Future-version saves remain read-only. Modern stars, Daily streaks, objectives, photos and events do not unlock cosmetics.
- README documents the complete kit, cosmetics, finds and migration. CHANGELOG records every capability cut.

## Simplicity review

1. Net simpler: the picker replaces the Upgrades modal and menu entries; purchase tracks, lock notices, access UI, live purchase/cosmetic subscriptions and workshop CSS are removed.
2. No new floating guidance. The obsolete access notice and event checklist wording are removed.
3. No layout patches, offsets or media cases. Picker reuses Journal classes and native form controls.
4. No site branches added; existing depth and cosmetic data tables decide behavior.
5. Equipment resolves once from pristine config through the existing effective-settings resolver; cosmetics are build data. Config is never mutated. The resolver no longer accepts progress/purchase state, and Daily selection no longer checks research access.
6. Existing capability specs extended for saves, equipment, modal focus, Journal finds, decal construction and photo capture. Obsolete purchase/lock expectations changed to the authorized fixed-kit behavior. Corruption, future-version protection, idempotence, pressure/clearance, focus/Escape, best-rating and content guards remain; no skips.
7. No package numbers in new source/test comments.
8. Reuse DOM helpers, paint shader, decal atlas and photo-capture path.

## Verification

- Runtime source is **466 lines smaller**, including the new migration table (390 added, 856 removed).
- Typecheck: PASS after deleting the resolver's unused progress argument and Daily's hull-access arguments.
- Build: PASS using `npm run build -- --config .cache/codex/S-rewards/vite.config.mjs --configLoader native --outDir .cache/codex/S-rewards/dist`. The ordinary build hit the known read-only `node_modules/.vite-temp` restriction; the repository's writable native-config mechanism succeeds. Logs: `.cache/codex/S-rewards/{build-default,build-final,typecheck-final}.log`.
- `GATES_CONFIG_MODE=writable PW_PORT=4290 bash tools/gates.sh`: config, content, build, attribution and whole-repository prettier PASS. Python: 161/165 PASS; four build-manifest tests fail because the sandbox rejects `spawnSync git` with `EPERM`. Root smoke and project-base browser suites cannot start their preview servers. Direct preview diagnosis confirms `listen EPERM` on `127.0.0.1:4290`. No browser assertions ran. Log: `.cache/codex/S-rewards/gates.log`; phase logs: `.cache/runs/20261013-231020-32-Mqv2QJ/`.
- Gate unit phase: 192 files, 2,165 tests; 2,162 passed and three DOM-free Journal navigation fixtures exposed an unguarded pointer-lock release. Fixed the source with a DOM guard; all existing navigation/focus assertions then passed (2 files / 51 tests), without modifying those navigation tests. Follow-up event narration, Daily boot and debrief wording: 3 files / 17 tests PASS. The subsequent full run passed **192 files / 2,165 tests** in 395.12 s. Final review then reproduced a backfill-retry defect: modern three-star Titanic records were being converted to legacy cosmetics after a failed old-content fetch. Restricted conversion to the first backfill, retaining its existing persisted boundary. The extended retry regression fails before the fix and passes afterwards; the focused save/cosmetic/navigation set passes **5 files / 114 tests**. The **final full rerun passes 192 files / 2,165 tests** in **321.01 s**, after all runtime changes. Logs: `.cache/codex/S-rewards/{unit-before-retry-fix,retry-regression-before,retry-regression-after,unit-final}.log`.
- Final whole-repository `npm run format:check` and `git diff --check`: PASS. No Director, tools, site data, geometry or past-bug clearance/frame assertions were changed.
- Git staging was attempted and denied: `/home/vijay/submarine-explorer/.git/worktrees/1600-S-rewards/index.lock` cannot be created on the read-only filesystem. Changes remain uncommitted. An eventual commit should name **S-rewards**, e.g. `game: simplify S-rewards to discovery cosmetics`. No merge, push or tag.

## Remaining

Claude reviews cosmetic appearance and the reused Journal picker on desktop/phone. No visual tuning performed. Browser capability checks require an environment that permits preview sockets. Commit creation requires writable worktree metadata. The full-kit code, migration, documentation and tests are otherwise implemented.
