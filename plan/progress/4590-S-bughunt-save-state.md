# S-bughunt: persistence and reload audit

Serves the standing **S-verify / S-bughunt [Codex]** item in
`plan/DIRECTOR.md`. Audited HEAD:
`d4bbfcd1b348be051b9ae1eec1b4022ee0e06af7`. Initial worktree was clean.

## Confirmed bug and minimal fix

Discovery/photo storage and reward storage use separate localStorage keys.
After `legacyCredited` became true, `creditPreviousDives` returned before
checking either collection. If a Journal write succeeded but the subsequent
reward write failed, later boots never restored that discovery's cosmetic
credit. A saved photograph could likewise miss its reward if navigation
interrupted the frame that detects new photos. The Journal retained the item,
but discovery-based cosmetic progress remained incomplete.

Moved the existing early return below the existing discovery/photo credit
loops in `src/game/ProgressMigration.ts`. Startup now reconciles missing
discovery tokens on every boot. Existing token deduplication makes recovery
idempotent. The legacy boundary still guards all mission-content fetching,
objective/primary credit, inferred historical stars and historical grants.
No schema, key, dependency or additional storage write mechanism was added.

Extended the existing `tests/unit/saveSoak.test.ts` capability with three
production-startup regressions: reward writes throw `QuotaExceededError`,
silently drop, or never run after successful Journal writes. Each covers POI,
wildlife, secret, sample and photo credit; ambient events remain uncredited.
The tests retain an already completed site's stars and verify no stars,
historical grants or current-dive bonus are invented, no mission fetch occurs,
repaired tokens persist, a second boot is idempotent, and discovery/photo bytes
stay intact.

Before the fix: **3 failures / 64 passes** in the save capability; each new
case lacks all five expected discovery/photo tokens. Log:
`/tmp/4590-save-before.log`.

The first fix run exposed three existing legacy-fixture assertions that
required startup to skip all credit and leave progress bytes untouched. That
behavior also prevented the repair. Updated those cases to compare the exact
migrated record plus an explicit, deduplicated list of discovery tokens;
every balance, rating, upgrade, selection and historical grant remains checked
by whole-record equality. Discovery/daily bytes and collection count remain
checked too. This changes the expected eager repair, preserving the original
guards against economic drift and data loss. No assertion tolerance, timeout,
skip or expected failure was relaxed.

## Audit coverage

| Boundary                         | Evidence and result                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Corrupt JSON and partial records | Existing save-soak, settings, discovery, photo and progress capabilities recover defaults or valid fields independently and preserve other collections. Future schemas and failed reads protect original bytes.                                                                                                                                                   |
| Older schemas                    | Existing settings/binding migration cases, discovery shapes and serialized legacy progress fixtures pass, including repeated edits/reloads and preserved cosmetic grants.                                                                                                                                                                                         |
| Quota failures                   | Settings retain session choices, flag reload as unsafe and retry unchanged choices. Photos evict oldest items only for actual quota errors, preserving the collection if even one photo cannot fit. New regressions repair persisted discoveries whose reward writes failed.                                                                                      |
| Private-mode failures            | Accessor/read/write exception guards were traced in Save, Input, DiscoveryStore, PhotoStore, DailySave, TutorialSave and shell last-site storage. Existing capabilities exercise denied access and session fallback without overwriting unread data.                                                                                                              |
| Partial writes                   | New regressions cover cross-key partial saves and interrupted reward processing. Existing settings/photo cases detect silently dropped writes; progress migration reconstructs damaged rating summaries from rating tokens. Native localStorage setItem replaces one key atomically; the game does not provide a transaction spanning collections.                |
| Reload mid-mission               | Existing `missionCore.test.ts` reload regression retains completed Journal scans, discards incomplete scans and resets mission objectives, elapsed time and scanner state. The opening objective remains scannable; rescanning preserves its first-discovery time. Existing progress migration tests prevent modern scans from inventing finished dives or stars. |

If storage is denied or full for every write, progress can only live in the
current session. Recovery here requires the discovery or photo to have reached
durable storage; it cannot recreate an item whose own write failed. No broader
transaction or mission-resume feature was introduced.

## Validation

- Focused final-source capabilities: **10 files / 432 tests passed**, exit 0.
  Command: `npm test -- --configLoader runner --cache=false
tests/unit/saveSoak.test.ts tests/unit/progressMigration.test.ts
tests/unit/progress.test.ts tests/unit/missionCore.test.ts
tests/unit/settingsSave.test.ts tests/unit/gameDiscoveryStore.test.ts
tests/unit/photoStore.test.ts tests/unit/journalData.test.ts
tests/unit/daily.test.ts tests/unit/f3Onboard.test.ts`.
- Owned source/test Prettier and `git diff --check`: passed.
- Full no-browser gates: `GATES_CONFIG_MODE=writable bash tools/gates.sh
--no-e2e`; aggregate log `/tmp/4590-gates.log`, per-check logs under
  `.cache/runs/20261026-233337-7-sQs2Tf/`. Configuration preparation, content
  validation, production build (including TypeScript), units, attribution and
  repository-wide Prettier passed. The build retains the existing chunk-size
  warning. Aggregate exit **1**, solely from the Python gate; e2e mode **none**.
- Full units: **192 files / 4,299 tests passed**, exit 0, **697.35 s**, on the
  final unchanged source. Log: `.cache/runs/20261026-233337-7-sQs2Tf/unit.log`.
- Python gate: **167 tests / 162 passes / 5 failures**. Four build-manifest cases report
  `spawnSync git EPERM`; `test_golden_tooling` reports `Unexpected end of JSON
input` in a child-output parse. These match the earlier audit signatures
  documented in `plan/progress/4040-S-bughunt-debrief-save.md`; they remain
  failed checks. No Python, build-manifest or golden tooling was changed.

One confirmed persistence defect was fixed. No additional defect was confirmed
in the requested boundaries. Browser boot, WebGL and real-device private-mode
behavior were not exercised; storage failures were tested with injected stores.

Simplicity: reuses existing recovery and deduplication, extends an existing
capability spec only, adds no UI/settings/site branches or runtime Config
mutation, and introduces no package numbers in source/test comments. Browser
and visual checks are excluded by DIRECTOR's Codex lane. No commit, merge,
push or tag was requested or performed.
