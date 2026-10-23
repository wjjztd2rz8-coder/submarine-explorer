# S-bughunt — tile request/body failure and optional fallback

Brief **3350**, serving **S-verify / S-bughunt**, `plan/DIRECTOR.md` Backlog 9.
Pinned checkout: `745ab466b868e17e168988739b9f65cf6602944b` (2026-10-23).
Clean supported-behavior audit: no production defect reproduced and
`src/world/TileLoader.ts` is unchanged. Ten table-driven cases extend the existing
`tests/unit/TileLoader.test.ts` capability spec; the existing optional-success
and missing-file cases now also check signal forwarding.

## Scope and ownership

Read DIRECTOR Backlog/simplicity/rubric, newest REVIEWS entry (2026-10-23 05:05),
OVERNIGHT-LOG through run 89, the launched 3350 brief and queue/launch records.
Rechecked `git worktree list`, local status and queued 3360/3370 ownership before
editing. Other live work includes 3310 journeys, 3320-R e2e and 3340 touch;
2980/3050 remain parked for the collision lane. No overlapping ownership found.
Main advanced independently while this checkout remained pinned; no changes were
collected or used from another checkout.

Read the 140-f-bughunt-5 findings/results and `F-BUGHUNT-5.md`, the 1550/1590
startup briefs/results and `S-boot.md`, and 2810's result and
`S-bughunt-lowtier-journey.md`. Their validation, startup lifetime/rollback,
resource cleanup and late-callback repairs are controls, not reopened work.
Only the owned loader spec and this note change. App, Terrain, assets, generated
tiles, metadata, tools and all other tests remain read-only.

## Actual callers and existing controls

- `src/app/boot.ts` constructs `new TileLoader()` and loads the index. It passes
  no options: canonical float32 is the application path, even with quant keys.
  `loadIndex()` independently catches request/JSON failures and returns an empty
  list; it has no signal argument. No index policy changed in this audit.
- `src/app/startup.ts` calls `request.loader.load(request.tileId, signal)` inside
  the real `DeferredStartup` load operation, alongside the deferred systems import.
  Uncancelled load rejection propagates through `DeferredStartup.fail()` to the
  runtime's catch, which disposes the attempt, emits `tile:error` and calls
  `showFatal`. Non-persisted `pagehide` aborts the lifetime. Cancelled rejection
  returns `cancelled`, without fatal reporting or initialization. Cached-page
  lifetime behavior remains covered by `startupLifecycle.test.ts`.
- `src/app/systems/title.ts` calls the same loader for Monterey without a signal;
  `loadTitleCrop` awaits it. The title's existing catch warns and keeps its fallback
  shot, with disposal checked on completion. The standalone `loadTitleCrop` default
  also constructs a default loader. Neither title path enables `prefer16`.
- `src/app/systems/world.ts` constructs Terrain from the completed `ctx.tile`
  supplied by startup, with no second TileLoader request or loading options.
- Existing `TileLoader.test.ts` controls retain exact float32/row-order decoding,
  missing tile/index behavior, malformed metadata and length rejection, default
  float32 choice, quantisation tolerance, successful optional loading, missing
  optional-file fallback and absent-quant-key bypass. `f-bughunt-5.test.ts` already
  rejects malformed metadata before binary IO, nonfinite canonical samples,
  invalid quantisation and decoded overflow, and checks canonical fallback after
  optional overflow. These assertions were neither copied nor relaxed.
- Existing startup tests already check original error preservation, failed-load
  cleanup, independent selections, cancelled rejections, no stale initialization,
  runtime fatal reporting, page teardown and title fallback. New cases connect
  those boundaries to the actual loader rather than replacing startup coverage.

## Request, body, recovery and fallback outcomes

All new fault timings use explicit deferred promises and entered-stage handshakes,
without sleeps, retries, timeout changes or network requests.

| Case                             | Public loader / caller outcome                                                         | Recovery and signal evidence                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rejected metadata fetch          | Runtime emits `tile:error` and calls the existing fatal handler; no systems initialize | Only metadata requested for the failed tile; same loader then returns another tile's complete metadata and exact Float32 heights with a fresh signal |
| Rejected metadata JSON body      | Same failure boundary, including a `SyntaxError`; no binary request                    | Same independent recovery; no failed metadata or dimensions retained                                                                                 |
| Rejected canonical fetch         | Existing failure boundary after valid metadata; no fabricated tile                     | Same independent recovery with different dimensions and height values                                                                                |
| Rejected canonical `arrayBuffer` | Existing failure boundary; no partial tile published                                   | Same independent recovery; every failed-attempt request uses its lifetime signal                                                                     |
| Optional file missing (404)      | Existing test: canonical float32 succeeds                                              | Existing fallback control retained; added signal identity checks on every request                                                                    |
| Optional non-ok (503)            | Canonical float32 succeeds without reading the non-ok body                             | New case checks full metadata/heights, ordered requests and the identical caller signal on metadata, optional and canonical requests                 |
| Rejected optional request        | Canonical float32 succeeds                                                             | Same complete-result and signal assertions                                                                                                           |
| Rejected optional `arrayBuffer`  | Canonical float32 succeeds                                                             | Same assertions; failure is held at body consumption, not the response                                                                               |
| Wrong-sized optional payload     | Decode rejects it and canonical float32 succeeds                                       | Same assertions; numeric/overflow guards remain the earlier controls                                                                                 |
| Successful optional payload      | Existing quantised-success behavior and tolerance retained; canonical not requested    | Added signal identity checks on metadata and optional requests                                                                                       |

The successful recovery comparisons include all documented fixture metadata,
dimensions, bounds, centre, spacing, extrema, attribution and the full ordered
height array. Failure tests invoke real `startRuntime` and `DeferredStartup` with
an injected real loader. Only system factories, fatal presentation and minimal
DOM surfaces are stubbed; no game systems, renderer or browser are launched.
Runtime fatal handling consumes the rejected start, so these tests observe its
event/handler rather than expecting `startRuntime()` itself to reject. Recovery
uses the public loader directly: it does not claim an in-page retry UI exists.

## Cancellation and reachability limits

Two cases hold the optional fetch or its body, dispatch non-persisted `pagehide`
through actual `startRuntime`, and model native fetch abort behavior. Both observe
the lifetime signal abort, no `tile:error`/fatal presentation, no system factory
initialization or published game, and no canonical body consumption. The same
loader subsequently loads an independent valid tile with a fresh signal.

Current implementation catches the optional abort and invokes canonical fetch
with the same already-aborted signal. The injected fetch rejects at entry via
`signal.throwIfAborted()` before providing any canonical response/body. Thus the
extra function invocation is not evidence of fresh network IO or a swallowed
cancellation. The test protects cancellation at the caller boundary without
requiring that fallback invocation to occur.

`prefer16` is supported by the loader contract but is **not enabled by any current
application constructor**. Passing that loader into runtime is an integration
probe, not a production configuration change. The format document promises
optional fetch/decode fallback, not prompt cancellation, a particular abort error
type, or zero post-abort fetch-function invocations. A custom FetchLike that
ignores signals can resolve a tile after cancellation; existing DeferredStartup
coverage protects against its stale initialization. Direct-load abort semantics
with such an adapter are undocumented, and a synthetic non-abortable/hanging
adapter is not treated as a supported product defect. No new cancellation,
message, metadata-ID or retry policy is prescribed.

## Simplicity and retained failures

No supported loader defect remains from this audit, so there is no source fix to
propose. Metadata/canonical IO failures remain failures, optional failures require
a valid canonical file to recover, and cancellation remains owned by the existing
startup lifetime. There is no automatic retry loop or extra startup/per-frame
state. Runtime is unchanged; test additions cover materially missing request/body
contracts in one existing spec. No new UI, guidance, layout patch, site branch,
setting/config mutation, dependency, schema, authored content, snapshot or budget
change. Existing historical assertions and tolerances remain intact. This
preserves the rubric's exploration/reward/honesty behavior without claiming new
visual, readable-opening or phone acceptance; Claude/owner retain those judgments.

## Validation

- `npm test -- --configLoader runner --cache=false tests/unit/TileLoader.test.ts tests/unit/startupLifecycle.test.ts tests/unit/titleLifecycle.test.ts tests/unit/f-bughunt-5.test.ts`:
  **PASS**, 4 files / 97 tests, exit 0. Initial run: 9.07 s; follow-up without an
  unnecessary cancellation invocation constraint: 9.00 s, `/tmp/3350-focused.log`.
  Final run with signal assertions outside the consuming cancellation boundary
  and on missing-file fallback: **16.11 s**, `/tmp/3350-focused-final.log`.
- `npm run typecheck`: **PASS**, exit 0, including after the final test refinement
  (`/tmp/3350-typecheck-final.log`).
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`: **FAIL,
  exit 1**, `FAIL gates (e2e=none)`, solely at the Python gate described below.
  Config preparation, strict content, TypeScript/root production build, full
  units, attribution (14 assets) and repository-wide Prettier **PASS**. The
  existing build chunk-size warning is informational. Units: **192 files;
  3,835 passed / 4 existing expected failures (3,839 total)**, **665.17 s**.
  No unexpected unit assertion failure or skip. Aggregate log:
  `/tmp/3350-gates.log`; per-gate logs:
  `.cache/runs/20261023-060813-27-tkn0me/`.
- The aggregate run began before the final test-only signal assertions were
  added. The final focused run and typecheck above validate the finished spec;
  production source remained unchanged throughout. No gate wrapper PASS is
  substituted for the failed Python command.
- Final formatting writes/checks are restricted to the owned test/note;
  `git diff --check` passes. Final HEAD still matches the pinned SHA and status
  contains only the owned loader spec and matching progress note. No ownership
  conflict or change to other-package files, tools or DIRECTOR.

Retained Python failures from the required run: **167 tests / 5 failures**,
10.397 s. Four `test_ci_build_manifest` cases fail with `spawnSync git EPERM`:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden_tooling` reports `Unexpected end of JSON input` at
`tools/tests/golden-manifest.test.mjs:151` while parsing subprocess stdout.
The latter's underlying cause is not established here. These match prior
`3320-S-bughunt-content-fallback.md` and `3330-S-verify-guide-base-links.md`
reports and do not demonstrate a tile-loader failure. Smallest follow-up: run
unchanged manifest checks where subprocess permissions work; inspect the golden
child's exit status/stdout/stderr before proposing any tooling correction. No
tooling, assertion, skip or timeout change is proposed in this ownership slice.

Actual local e2e mode is **none**. No hosted workflows, GPU/game rendering,
screenshots, visual judgments, offline-play, actual browser fetch/network
cancellation or real-phone validation. No merge, push, tag or workflow dispatch.
