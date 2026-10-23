# S-verify — overlapping asset preload batches

Brief **3360**, serving **S-verify / S-bughunt**, DIRECTOR Backlog 9.
Pinned checkout: `d8b0d5990bb8f79037e44f07e2b97b6117fbd340` (2026-10-23).
Clean supported-contract audit: no accounting/cache defect reproduced;
`src/core/assets/AssetService.ts` is unchanged. One test extends the existing
`tests/unit/assets.test.ts` capability spec.

## Scope and ownership

Read DIRECTOR Backlog, simplicity rules and rubric; newest REVIEWS entry
(2026-10-23 morning); OVERNIGHT-LOG through run 93; launched 3360/3370 briefs;
1510/2810 launched briefs, results and progress; and collected 3350 progress/result.
Rechecked HEAD, clean initial status, worktree list, local processes and adjacent
3370 status before editing. No overlapping ownership found. 3350 is already
collected; 3370 owns first-move/camera work; 3380 owns CI watch. 3310 journeys,
3320-R e2e, 3340 touch and the owner-blocked collision candidates remain separate.
No other worktree was collected or used as a dependency.

1510's retained ordinary loading/caching and 2810's resource ownership/late
callbacks are controls, not reopened work. Their result wrappers report PASS
more broadly than their agent reports: particularly 2810 records Python failures
and sandbox-blocked browser checks. Those wrappers are not current acceptance
evidence. No decoder, fixture, base-URL or disposal audit was repeated.

## Documented contract and actual use

- `AssetService.ts` documents model caching, texture caching per URL/options,
  cache warming and failure reporting without batch rejection. Loader comments
  allow a later explicit request after failure. Successful resources are shared;
  scene cloning belongs to model callers.
- `manifest.ts` accepts bare strings and explicit typed model/texture requests,
  documents texture defaults and repeat options, and exposes `PreloadResult`.
  `preload` maps every input entry to an outcome and computes
  `loaded = list.length - failed.length`; duplicate successful entries each count
  as loaded, and duplicate failed entries each retain a failure. The result type
  has no separate unique-URL counting promise. Deduplication is an explicit
  `mergeManifests` helper behavior, not an implicit preload step.
- Cache keys use the resolved model URL, or resolved texture URL plus effective
  sRGB/repeat options. Failure results use each request's authored URL, even when
  two authored forms resolve to the same loader URL. The test uses the existing
  deployment-base resolver solely to exercise this identity boundary; URL policy
  and its existing tests stay unchanged.
- Searching all `src` TypeScript found **no production preload caller**, manifest
  merge caller or service texture-load caller. `src/world/PropLoader.ts` imports
  the singleton; `ModelCache.get()` calls `assets.loadGLTF(modelLoadUrl(url))`
  and clones its scene for `Props`. This is the actual shipped service consumer.
  Mixed/overlapping preload is a supported public service contract, not a
  demonstrated shipped-player path or defect. No new production caller was added.
- Historical F0-CORE and architecture text also promise never-rejecting preload,
  but describe decoder support removed by 1510. Current source and 1510 evidence
  govern ordinary formats here; stale decoder prose is read-only/out of scope.

## Existing versus added guards

Existing tests remain intact: single-model sharing, model-only mixed success and
failure, kind inference, manifest merge, URL handling, texture option isolation,
texture disposal, sequential model/texture failures and explicit retry, and
plain GLB parser fixtures. No assertions, tolerances, skips or timeouts changed.

The added test holds the existing mocked GLTFLoader and spied TextureLoader
`loadAsync` boundaries with manually settled promises. No timers, network, image
decoding, renderer or WebGL are used by the added case. Both batches share a
pending model M, successful texture T and failed texture F. Only the first also
waits for independent model I. Bare and explicit requests, root and already
resolved URLs, and omitted versus explicit default sRGB options share supported
keys. Existing non-default option isolation remains covered by its original test.

| Batch  | Authored input rows                                              | Final result                                                                            |
| ------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| First  | M, T, F, I, resolved M, resolved F                               | 4 loaded; two F failures in input order, preserving the root and resolved authored URLs |
| Second | explicit F with sRGB true, resolved M, resolved T with sRGB true | 2 loaded; one F failure preserving its root-authored URL                                |

Settlement is deliberately different from input/batch order:

1. Both batches start before any loader settles. The two model requests enter
   through an explicit loader handshake; there is one underlying M load, one I
   load, one T load and one F load.
2. T succeeds first; F rejects with `Error('texture unavailable')` while M/I
   remain pending. A cached T lookup returns the identical texture.
3. A later explicit `loadTexture(F, { srgb: true })` starts exactly one fresh
   request and succeeds while the original batches are still pending. Root and
   resolved lookups share that recovered texture; unrelated T remains the same
   cached success. This is an interleaving probe, not an automatic retry loop.
4. M succeeds. The second preload fulfills with its own original failure, despite
   the successful retry. The first preload's settlement callback has not run.
5. I succeeds last. The first preload fulfills with its own entry-based totals
   and two original failures, even though F is now cached successfully. Cached
   model lookups return their exact loaded objects. Final loader calls are two
   models and three textures (T, initial F, explicit F retry); retained cache sizes
   are two models and two textures.

This fills the missing cross-batch accounting/recovery boundary without a second
retry matrix or any new resource ownership, cancellation or manifest policy.

## Simplicity, retained failures and limits

No supported asset defect was reproduced, so no runtime correction is proposed.
Original batch failures remain failures after a later successful load; there is
no demand to rewrite outcomes or retry automatically. No malformed typed inputs,
global clearing, cloned-resource or cancellation contract is added.

Only the owned capability spec and this note change. Runtime has no added state,
UI, guidance surface, setting, site branch, layout patch, config mutation,
dependency, asset or schema. Existing historical guards and product budgets stay
intact. The rubric's exploration, factual content, input/accessibility and reward
behavior are protected by the unchanged runtime. Readability, beauty and phone
acceptance remain Claude/owner judgments, not conclusions from mock loaders.

## Validation

- Baseline `npm test -- --configLoader runner --cache=false tests/unit/assets.test.ts tests/unit/props-loader.test.ts`:
  **PASS**, exit 0, 2 files / 60 tests, 847 ms.
- Same focused command after the addition: **PASS**, exit 0, 2 files / 61 tests,
  813 ms. This includes the unchanged texture option/retry and actual model caller
  capabilities. Existing parser tests run as controls; their stubbed image IO
  does not establish JPEG decoding or visual correctness.
- The initial gate attempt caught TS2322 in the new mock promises: Three's texture
  loader requires `Texture<HTMLImageElement>`, rather than the default
  `Texture<unknown>`. Corrected only those new mock types. The initial aggregate
  was interrupted during units (exit 130) to validate the finished test instead;
  it is not a gate pass. Logs: `/tmp/3360-gates.log` and
  `.cache/runs/20261023-084940-3-SRZCLM/`.
- After that correction, `npm run typecheck`: **PASS**, exit 0; the same focused
  command: **PASS**, exit 0, 2 files / 61 tests, 907 ms.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **FAIL**, exit 1, `FAIL gates (e2e=none)`, solely at Python. Config preparation,
  strict content, TypeScript/root production build, full units, attribution
  (14 assets) and repository-wide Prettier **PASS**. The build's existing large
  chunk warning is informational. Full units, via
  `npm test -- --configLoader runner --cache=false`: **192 files / 3,838 passed /
  4 existing expected failures (3,842 total)**, 586.06 s. No unexpected unit
  assertion failure or skip. Finished test code remained fixed throughout this
  restarted run. Aggregate log: `/tmp/3360-gates-final.log`; per-gate logs:
  `.cache/runs/20261023-085103-3-TMTfpt/`. No wrapper PASS substitutes for the
  failed Python command.
- Final formatting writes/checks are restricted to the owned test/note;
  `git diff --check` passes. Final HEAD still matches the pinned SHA and status
  contains only `tests/unit/assets.test.ts` and this note. No source correction,
  ownership conflict, tooling or DIRECTOR change.

Retained Python failures in the restarted gate: **167 outer tests / 5 failures**,
10.276 s. Four `test_ci_build_manifest` cases fail with `spawnSync git EPERM`:
`test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden_tooling` fails with `Unexpected end of JSON input` while parsing
subprocess stdout at `tools/tests/golden-manifest.test.mjs:151`. The underlying
golden-child cause is not established here. These reproduce the collected 3350
report's tooling/environment failures and do not demonstrate asset accounting or
cache failures. Smallest follow-up: rerun unchanged manifest checks with working
subprocess permissions; inspect the golden child's exit status/stdout/stderr
before proposing a tooling correction. Tools, assertions and timeouts stay intact.

Actual local e2e mode is **none**. No browser launch, game rendering, screenshots,
GPU, hosted workflow, offline-play or real-phone validation. Fake loader success
means service accounting/cache behavior only. No merge, push, tag or workflow
dispatch.
