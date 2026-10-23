# 3400 — S-bughunt: mission catalog failure and recovery

Item: **S-bughunt**, DIRECTOR Backlog 9 (**S-verify / S-bughunt [Codex,
standing]**). Pinned checkout: `db48e944cd9e9c85b38209393185dae2395b2b65`.

Clean behavioral audit: no supported aggregation or consumer defect reproduced.
Two missing contract guards were added to `tests/unit/missionCore.test.ts`.
Production code, parsing, mission state behavior and authored content are unchanged.

## Intake and ownership

Read DIRECTOR Backlog, simplicity rules and rubric, newest REVIEWS entry
(2026-10-23 morning, Claude alone), OVERNIGHT-LOG through run 93, and
CONTRIBUTING-AGENTS. Read launched 2500/2530 briefs, result wrappers and collected
picker reports (`S-verify-picker-density.md`, `S-bughunt-21.md`), 3320's
content-fallback report/result, this brief and the 3390/3410 ownership scopes.
Reviewed finished 3360/3370/3380 final reports for collection status only; did not
reopen their work. Historical result wrappers label gates/browser PASS while
their embedded reports record failures and no browser acceptance; those labels
are not validation evidence here.

Initial HEAD/status were pinned and clean. `git worktree list --porcelain` and
read-only status/owned-path diffs across sibling worktrees showed no overlap on
missionCore or Mission.ts before editing. Finished 3360 (assets test), 3370
(camera/firstMove) and 3380 (report) remain uncollected and were not imported.
3390 owns rubble/boulder tests; 3410 is report-only. 2980/3050 and their four
expected failures, 3310's journey extension, 3320-R full e2e and 3340 touch audit
remain with their owners. Only the mission-core capability test and this matching
note are edited; no dependency on any uncollected patch.

## Coverage mapped before adding cases

Existing `missionCore.test.ts` guards all 13 shipped missions exactly once,
manifest order and authored titles/depths, reverse completion with equal depths,
missing/null/nonnumeric depth remaining null in authored position, missing files,
unsafe folder/tile/landmark IDs, manifest deduplication and parser rejection of
unusable spawns/objectives. The existing missing-file aggregate case already
keeps its usable neighbors. Those guards and every historical assertion remain.
2500 supplied the ordering/tie coverage; 2530 supplied missing-depth coverage.

Existing `globe.test.ts` guards mission > tile > catalogue precedence, a pending
free dive when an indexed mission is absent but its tile exists, and the real
`loadGlobeCatalog` retaining Titanic while Lost City's malformed JSON is skipped.
The last test's title mentions HTML fallback, but its failed mission fixture is
actually malformed JSON; the injected fetch defaults other absent URLs to HTML.
It asserts mission/tile/catalogue states, the named pending row and no warnings.
Existing `overlayFocus.test.ts` guards real-loader picker order/activation and
progress rerenders, and Globe selection/teardown. `daily.test.ts` guards empty
Daily candidates and filtering missing tiles; `missionRouter.test.ts` guards a
missing selected mission returning the existing free-dive route and tile choice.

3320 already checks ContentPath's fetch/body rejection, non-OK, HTML and malformed
JSON conversion, public optional-loader recovery and real Journal fallback.
None of that failure-stage matrix is repeated. The additions cover aggregation
of mixed failure types, fresh aggregate recovery and rejected-index emptiness.

## Batch settlement and recovery evidence

The test uses real `loadMissionSummaries` → `loadMission` → `fetchContentJson` →
`parseMission`, with only the existing `FetchJson` boundary injected. The
manifest is `{ version: 1, landmarks: ['site', 'failed', 'invalid', 'neighbor'] }`.
Documents extend the existing valid mission fixture; `invalid` is valid JSON
with no objectives, rejected by the mission validator rather than JSON parsing.

All four mission requests start before manual settlement. Fetch promises settle
in this recorded order: **neighbor, invalid, failed, site**. `failed` rejects
at the fetch boundary; the others return successful JSON responses. The aggregate
fulfills with exactly these complete summary objects in manifest order:

| id       | title         | summary | tile          | depthM |
| -------- | ------------- | ------- | ------------- | ------ |
| site     | Test dive     | Go.     | site-tile     | 3800   |
| neighbor | Neighbor dive | Nearby. | neighbor-tile | 125    |

A fresh explicit aggregate call uses the same document mapping with the failed
request now successful. It yields exactly **site, failed, neighbor**; `invalid`
remains omitted. The restored summary is `{ id: 'failed', title: 'Restored dive',
summary: 'Restored.', depthM: 750, tile: 'restored-tile' }`. Full-array equality
checks identity, title, summary, tile, depth, position and absence of extra or
duplicate rows. The first result remains unchanged after that call.

The second guard manually rejects the manifest fetch at the same request stage.
The real aggregate fulfills with `[]` and requests only
`/data/landmarks/index.json`; it invents no mission IDs.

No failing-before/passing-after runtime correction was needed: both added guards
pass against the pinned implementation. There is no automatic retry, cache
invalidation or live UI refresh claim. All injected requests settle; this does
not establish readiness, cancellation or timeout behavior for a never-settling
request. `Promise.all` still awaits the entire batch.

## Actual callers and existing fallback policy

The loader contract (`src/game/Mission.ts:241`) is manifest-order summaries,
skipping unusable missions. ContentPath catches request/body/JSON errors to
null; `loadMission` maps null to null and validates documents; the aggregate
filters nulls. These request-local results do not themselves choose a site.

**Home/shell:** `src/app/systems/shell.ts:99,160` loads summaries once, checks
`disposed`, assigns `ctx.missionSummaries` and passes the exact list to both
MissionSelect instances. `MissionSelect.ts:200,216` replaces its rows, filters
pending IDs against loaded IDs and hides the missions section when both are
empty. Independently created tile buttons remain available from the tile index.
Partial summaries keep their original mission IDs/titles/tiles/depths; existing
pending rows come from Globe's catalogue, not from the mission loader inventing
summary rows. Pending entries with a tile use the existing free-dive handler;
those without one are disabled (`MissionSelect.ts:348`).

Home's primary Dive button has a separate existing policy
(`shell.ts:26,77,96,100`): use `app.lastSite` only if its mission is in the loaded
list, otherwise use `FIRST_MISSION_ID`, currently Titanic. If no matching summary
provides a title, `Home.ts:190` leaves the label as “Dive”. Thus an empty catalog
or omitted last mission does **not** make Home pick the first usable summary;
it retains the existing Titanic choice. Selecting it navigates to its mission
URL and directly loads that mission again on the next boot. This is a new
navigation request, not automatic catalog retry. If that mission document is
also unavailable, `MissionRouter.ts:63` returns null; `boot.ts:87` then uses the
existing tile-selection policy. The missing-route and default-tile controls
are existing tests, not a new fallback added by this audit.

**Globe:** `GlobeModel.ts:200` independently loads `/data/landmarks.json`, the
mission index, and the real summary aggregate. Its index request is separate
from the aggregate's index request. If both index requests reject, summaries
and index IDs are empty: `pending` is empty, but successfully parsed catalogue
sites remain **tile** when a matching tile exists, otherwise **catalogue**.
An empty _mission_ catalog therefore need not mean an empty Globe. If the
catalogue request also fails, there are no sites to build. If only one of the
two index requests fails, results may differ: surviving direct index IDs can
produce pending rows, or surviving summaries can still produce mission pins.
There is no shared cache or cross-request atomicity guarantee.

With a valid index and one failed mission request, the available neighbor remains
a mission; the failed indexed site becomes pending, with its catalogue name
(or ID if absent). `buildSites` marks a catalogue site as tile/catalogue according
to tile availability, and sorts pins by state then longitude/ID; pin order is a
separate existing policy from mission-list manifest order. `Globe.ts:321` passes
sites to the view unless disposed. `Globe.ts:435` leaves catalogue-only pins
nonlaunchable, navigates mission pins with `missionUrl` and tile pins with
`tileUrl`. Shell's selection event uses the summary's tile when present, otherwise
the site ID (`shell.ts:226`). No new launch/fallback behavior was introduced.

**Boot/Daily:** `boot.ts:76` requests summaries only for the matching Daily URL;
`unlockedDailySites` filters for available tile and known depth, then `dailyDive`
returns null for an empty candidate list. The initial route remains in place
when there is no Daily candidate. A partial catalog restricts Daily selection
to its usable candidates. The Home Daily system similarly clears the existing
Daily card on no candidate (`systems/daily.ts:29`).

Evidence limits: the failed-mission Globe model behavior is exercised by its
existing real-loader guard; picker/Daily/router controls pass. Empty-index
Home/Globe wiring above is a source trace combined with the new loader guard,
not an injected full-shell/boot failure test or browser observation. No dedicated
empty-index consumer guard was found in the inspected specs. No supported
consumer defect was established, so no proposed product correction is retained.

## Simplicity and rubric

Retained the small request-local implementation and existing consumer policies.
Two guards extend one capability spec; no new runtime helper, UI, guidance,
setting, site branch, config mutation, dependency or save schema. Historical
assertions, tolerances, budgets, instance counts and snapshots are unchanged;
no skips, retries or inflated timeouts. Behavioral simplicity/honesty is evidenced
by retained identities/fields and omission of unusable documents. All 13 site
identities, five heroes, GMRT terrain, scan/Journal/life/input/accessibility and
Arcade default retain their existing implementation. Visual rubric items and
phone acceptance remain with Claude/owner.

## Validation

- Initial focused command:
  `./node_modules/.bin/vitest run tests/unit/missionCore.test.ts tests/unit/globe.test.ts tests/unit/overlayFocus.test.ts tests/unit/daily.test.ts --configLoader runner --cache=false`
  — **PASS, exit 0, 4 files / 197 tests**, 2.53 s; `/tmp/3400-focused.log`.
- First required-gate attempt exposed TS2345 in the added fixture: inferred
  template-literal Map keys could not accept FetchJson's string URL. Corrected
  only that test key type; no product failure. That attempt was interrupted
  (**exit 130**) after build failed, while units were running; no aggregate
  pass claimed. Logs: `/tmp/3400-gates.log`,
  `.cache/runs/20261023-092303-3-Mts7Em/`.
- `npm run typecheck` after the correction — **PASS, exit 0**;
  `/tmp/3400-typecheck.log`.
- Final focused command:
  `./node_modules/.bin/vitest run tests/unit/missionCore.test.ts tests/unit/globe.test.ts tests/unit/overlayFocus.test.ts tests/unit/daily.test.ts tests/unit/missionRouter.test.ts --configLoader runner --cache=false`
  — **PASS, exit 0, 5 files / 247 tests**, 3.03 s;
  `/tmp/3400-focused-final.log`.
- `./node_modules/.bin/prettier --write tests/unit/missionCore.test.ts`
  and `git diff --check` — **PASS**.
- Corrected required gate:
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`
  — **FAIL, exit 1**, `FAIL gates (e2e=none)`, solely on the five Python tooling
  checks below. Config preparation, strict content, TypeScript/production build,
  full units, attribution and repository-wide Prettier **PASS**. Full units:
  **192 files passed; 3,839 passed / 4 existing expected failures (3,843 total)**,
  600.88 s; no unexpected unit failures or skips. Aggregate log:
  `/tmp/3400-gates-final.log`; per-gate logs:
  `.cache/runs/20261023-092348-3-iqZZ3r/`.

Python ran **167 tests / 5 failures**, 12.114 s. The four failing
`test_ci_build_manifest` cases report `spawnSync git EPERM`:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden_tooling` reports `Unexpected end of JSON input` parsing child stdout
at `golden-manifest.test.mjs:151`; its underlying child failure was not established.
These match the tooling failures recorded in 2500/2530/3320, rather than failures
of mission aggregation. No tooling fix or weakened assertion was attempted.
The production build retains the existing non-failing chunk-size warning.

Final owned-file formatting command:
`./node_modules/.bin/prettier --check tests/unit/missionCore.test.ts plan/progress/3400-S-bughunt-mission-catalog-failures.md`
and `git diff --check` — **PASS**. Final HEAD remains the pinned SHA; status
contains only the owned test and this note. Rechecked sibling worktree status
and owned-path diffs after validation: no competing edits to missionCore or
Mission.ts. No finished work was collected.

Actual e2e mode: **none**. No browser launch, game rendering, screenshot, remote
availability, offline-play, hosted CI, GPU, visual, touch-layout or real-phone
acceptance claim. No merge, push, tag or workflow action; tools, DIRECTOR and
all unowned product/tests/content files are unchanged.
