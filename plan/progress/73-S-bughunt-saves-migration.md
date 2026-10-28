# S-bughunt — save/settings migration after dead-config sweeps

Date: 2026-10-28. Base: `6608172b`. Serves standing **S-bughunt**, DIRECTOR Backlog 12. Two audit rounds completed. No confirmed migration correctness bug was found; no production fix or permanent test change was justified. Only this progress note is a tracked change.

## Ranked findings and repro steps

1. **Highest priority: browser migration remains unverified (validation gap, not a confirmed product defect).** The selected soak, legacy-progress and settings-isolation checks, plus the full e2e invocation, all exited 1 before executing tests. Debug output shows `connect EPERM` for both `::1` and `127.0.0.1`, followed by preview-server exit 1. Headless store tests cannot establish rendered Journal behavior or complete browser startup.

   Repro: build the isolated output as below, then execute the three focused Playwright commands below. On a permitted runner, seed the soak spec's v1 display preferences/bindings, mixed Journal namespaces and v0 research; complete its four-dive/reload journey. Check that legacy discovery credit is available before a deep mission fits its vehicle, and that resetting discoveries preserves settings and bindings. No browser pass, screenshot inspection or visual acceptance is claimed here.

2. **Lower priority: the permanent migration specs do not explicitly name the swept water/terrace extension fields (unit coverage gap).** `settingsSave.test.ts` and `saveSoak.test.ts` already cover all settings versions, removed gameplay controls, unknown extensions, storage failures, cross-store isolation and historical progress fixtures. Searching those two files for `fogDensityShallow|fogDensityDeep|fogDeepAt|deepColor|ambientIntensity|terrace` returns no matches. The precise combined post-sweep scenario is currently local audit evidence, rather than an additional permanent regression. This is not evidence of data loss.

   Repro: for each settings version unversioned/0/1/2/3, seed each of `legacy-save-spent-kit.json`, `legacy-save-secret-sample.json` and `legacy-save-hero-stars.json` into one storage map. Seed legacy preferences under v1/v2/current keys as appropriate, with captions=true, Ultra tier, postFx=false, retired top-level and gameplay controls, removed `water` fields and `terrain.fidelity.terrace`. Load `Save`, call production `loadSavedProgress`, edit captions, reset settings, and reconstruct both stores. Compare every discovery record/count/timestamp and aggregate scan stats, Journal unlocked entry IDs, ratings, balances and cosmetic selections; compare effective settings with the unknown water/terrain extensions removed. **All 15 combinations passed.** The unknown extensions remain inert and preserved; retired settings controls are removed. Consider extending the existing soak table if this specific historical extension case needs ongoing coverage; no new schema or migration layer is indicated.

## Round 1 — fixtures, schema paths and existing coverage

Read `CONTRIBUTING-AGENTS.md`, DIRECTOR's standing item/simplicity rules, prior save audits, the 4750–4770 notes and the 4780 diff. Inspected `Save`, `ProgressSave`, `DiscoveryStore`, `creditPreviousDives`, production `loadSavedProgress`, Journal unlock readers and effective-settings resolution.

The 4750 water deletions (`b17e3a50`) remove GameConfig tuning, not SettingsData members. 4760/4770 remove unused exports/types; 4780 (`4865993c`) only changes unit-helper visibility. None changes a storage key or persisted schema. Also checked the earlier terrace removal (`c2c0e237`): it was runtime terrain fidelity tuning, not a required player preference.

Executed focused units: **5 files / 175 passed**. This includes all three legacy earned-progress fixtures through production startup/reload, legacy settings versions, malformed saves/default repair, retired controls, research reconstruction and mission-credit retry/isolation. Fixture metadata explicitly identifies deterministic legacy-runtime scenarios from `526362e7`, not captured real-player saves; earlier settings/discovery schema versions are represented by inline fixtures.

## Round 2 — combined fixtures and Journal checks

Executed the combined 15-case audit described above: **15 passed**. Settings v0/v1/unversioned saves receive current Arcade gameplay defaults; v2/v3 Custom choices preserve valid switches and map gentle currents to realistic. Missing UI scale and hull-warning settings become 100 and both. Captions, postFx=false and Ultra→High survive load; original legacy-key bytes remain intact. Reset does not resurrect old preferences on reload.

Full discovery snapshots and stored discovery bytes remain identical, including the fixtures' five Journal namespaces, six scans, first-scan timestamps and repeated secret count of two. Existing mission ratings, balances and cosmetics survive production startup and reload; recovery may add missing discovery reward tokens. Loaded Titanic content retains the same unlocked Journal entry IDs. This is a content-model check; it does not render the Journal.

An additional **6 files / 201 tests passed**, covering discovery-store migration, Journal content/unlock behavior, hero mission/Journal links, grouping, gameplay modes and audio defaults. No gap was found in permanent coverage for malformed currents, future-version protection, failed reads, retired gameplay keys, damaged legacy pending evidence, or repeated mission-credit recovery. No new duplicate tests were committed.

Local audit files: `.cache/migration-audit.test.ts` and `.cache/migration-audit-vitest.mjs`. An initial audit invocation failed all 15 cases because the harness passed `undefined` where `loadJournalSite` requires a catalogue Map; corrected the harness to pass `new Map()`. This was not a product defect. The final enhanced audit passed all 15 cases, including inert extension checks and unchanged DEFAULT_CONFIG.

## Executed checks

```sh
# Round 1: 175 passed; /tmp/73-migration-round1.log
npx vitest run tests/unit/settingsSave.test.ts tests/unit/saveSoak.test.ts tests/unit/progress.test.ts tests/unit/progressMigration.test.ts tests/unit/progressScan.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1

# Round 2: 15 passed; /tmp/73-migration-round2.log
npx vitest run --config .cache/migration-audit-vitest.mjs --configLoader native --cache=false --pool=threads

# Journal/discovery/defaults: 201 passed; /tmp/73-journal-unit.log
npx vitest run tests/unit/gameDiscoveryStore.test.ts tests/unit/journalData.test.ts tests/unit/heroMissionJournal.test.ts tests/unit/journalGroups.test.ts tests/unit/f2-modes.test.ts tests/unit/f3Audio.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1
```

Production build: ordinary `npm run build -- --outDir dist-saves-migration` passed TypeScript then failed loading Vite config because shared `node_modules/.vite-temp` is read-only (`EROFS`). Bundling the unchanged Vite config into the writable workspace succeeded:

```sh
node --input-type=module - <<'JS'
import { build } from 'rolldown';
await build({ input: 'vite.config.ts', platform: 'node', external: ['vite'],
  output: { file: '.cache/migration-vite.config.mjs', format: 'esm' } });
JS
npm run build -- --outDir dist-saves-migration --config .cache/migration-vite.config.mjs --configLoader native
```

Result: **PASS**, including TypeScript, filtered public assets and service-worker stamping; existing chunk-size warning. Logs: `/tmp/73-build.log`, `/tmp/73-build-native.log`. No tracked config or tools changes.

Grepped `tests/e2e` for migration, localStorage, legacy credit, Journal, settings and reload capabilities. Executed these focused commands against the isolated output; all were **blocked before test execution**:

```sh
DEBUG=pw:webserver GATES_CONFIG_MODE=writable PW_OUTDIR=dist-saves-migration PW_PORT=4273 npx playwright test tests/e2e/f-save-soak.spec.ts -g 'four dives, mode switches, restarts and reloads preserve saves without scene leaks or errors' --output=.cache/migration-e2e-soak
DEBUG=pw:webserver GATES_CONFIG_MODE=writable PW_OUTDIR=dist-saves-migration PW_PORT=4274 npx playwright test tests/e2e/f2-progress.spec.ts -g 'old discoveries are credited before fitting a deep-mission vehicle' --output=.cache/migration-e2e-progress
DEBUG=pw:webserver GATES_CONFIG_MODE=writable PW_OUTDIR=dist-saves-migration PW_PORT=4278 npx playwright test tests/e2e/settings.spec.ts -g 'reset discoveries confirms, preserves other saves, and refreshes this dive' --output=.cache/migration-e2e-settings
GATES_CONFIG_MODE=writable PW_OUTDIR=dist-saves-migration PW_PORT=4279 npm run test:e2e -- --output=.cache/migration-e2e-full
```

Logs: `/tmp/73-e2e-{soak,progress,settings,full}.log`. No behavior change was made; these attempts independently check the requested migration capabilities.

`npm run test:py`: **FAIL**, 167 tests / five failures (162 passed). Four build-manifest tests report `spawnSync git EPERM`; `test_golden_tooling` reports `Unexpected end of JSON input` in the golden-comparison child test. These match earlier notes' failure signatures, but remain failed checks in this run. Log: `/tmp/73-python.log`.

Full unit command: `timeout 180s npm test -- --configLoader runner --cache=false --pool=threads --maxWorkers=1`; **INCOMPLETE**, exit 124 after 180 seconds. It printed the Vitest banner but no file results or assertion failures before timeout. No full-suite pass is claimed. Log: `/tmp/73-unit-full.log`.

Progress-note Prettier check and `git diff --check`: **PASS**. Removed the owned isolated build output after the e2e attempts; local audit sources and logs remain available. Final status contains only this new progress note.

No merge, push, tag, DIRECTOR edit or tools edit. No settings, dependencies, site branches, abstractions, gameplay changes or UI additions. This evidence-only audit preserves the scan/Journal core and makes no visual or phone-performance claim.
