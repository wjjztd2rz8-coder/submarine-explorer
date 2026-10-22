# S-bughunt — terrain map teardown

Backlog item **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**. Audited checkout: `f8a4d49162d8172aa9a7c10237125e402ab30515`.
Non-visual lifetime hunt; no production defect reproduced in the supported
callback orderings. Only the existing readiness capability spec and this note
change. `TerrainMaterial.ts` and `Terrain.ts` remain unchanged.

## Provenance and ownership

Read Director rules and rubric, the newest 2026-10-21 evening review,
overnight-log through run 80, `S-bughunt-lowtier-journey.md` (2810),
`2900-S-verify-monterey-tint.md`, their wrapper results, launched briefs and
available results/progress for 2920–3030. Wrapper smoke PASS labels are
external wrapper reports, not this audit's browser evidence. Both earlier
notes record their own environment/validation limits separately.

Before editing, inspected every registered worktree's status and the
finished-but-uncollected notes. Main and this checkout were clean. Uncollected
2930 owns power/overlay focus; 2940 owns shell/touch e2e expectations; 2950/2960
have report-only results; 2970 owns wall-life tests. Active 2980 owns
scarp/collider tests and production repair; 2990 owns mission-contact tests;
3000 owns event terrain tests. Launched 3010 owns Terrain.ts and its terrain
capability specs; 3030 owns service-worker/cache specs. 2920 tint, earlier
completed packages, the held settings brief and parked silhouette work do not
claim the readiness spec. No ownership conflict found, and no changes were
collected or copied. Work uses only the pinned checkout.

## Actual ownership and ordering

- Each `createTerrainMaterial` creates two private fallback DataTextures and
  a private request map. File-name deduplication is per material: A/B sand
  slots share one albedo request and, on High, one normal request. Slot C is
  basalt. Low requests two images; High requests four. Identical replacement
  materials create separate textures and requests; there is no global cache.
- `loadSeabedTexture` creates its Texture synchronously and puts its readiness
  promise in userData. Success assigns the Image and sets needsUpdate before
  resolving that Texture; error warns and resolves null. Bindings run in
  promise handlers, so a synchronous Image callback precedes uniform binding.
- Every slot binding handler is registered before Promise.all's completion
  handler. `texturesReady` resolves undefined after all requests settle,
  including errors; only then are unneeded placeholders disposed. Failed live
  slots retain their fallback. Low's unused normal placeholder is released.
- `rockTexture` is the underlying C-albedo promise, not the all-maps barrier.
  It resolves the loaded texture on success and null on error/under Node.
  Disposal does not cancel it. High can resolve rockTexture while a normal
  request is still pending. Node creates only two fallbacks and is immediately
  ready.
- Terrain owns the returned texture list. Its existing dispose order is
  Scatter, chunks, material, each returned texture, then root clear. The test
  exercises the material-then-textures portion directly, without changing
  Terrain.ts. Material.dispose alone does not dispose Three textures.
- Scatter's existing rockTexture handler checks `this.disposed` and the rock
  material before binding. Scatter.dispose marks disposed and clears its
  materials before Terrain releases texture ownership. Thus a late successful
  C promise cannot repopulate that removed consumer.

## Callback/owner matrix and promise evidence

The existing controllable Image fixtures now share one helper. All previous
assertions remain; no renderer or network is constructed.

| Cases                                                                        | Owner state at disposal                                                                      | Completion order/outcome                                                                                                        | Assertions                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 32 new cases: Low/High × zero/some settled × forward/reverse × four failures | Dispose old material and every returned texture; identical replacement is alive concurrently | All success, sand albedo error, basalt albedo error, all errors; success/error requests run in either creation or reverse order | Old barrier stays pending until last request, then resolves undefined; old C resolves its own texture/null; replacement remains pending until its own final request; successful live slots bind their own images and shared A/B slots agree; failed live slots keep undisposed fallbacks |
| 4 new cases: Low/High × success/error                                        | All Image callbacks have fired, but no promise handler has run yet                           | Reverse callbacks, synchronous teardown, then microtask settlement                                                              | Barrier and C promise settle under the same success/null contract, with no exception/rejection                                                                                                                                                                                           |
| Existing controls                                                            | Owner alive                                                                                  | Successful per-request loads, individual/all map failures, Node fallback, tier shader-source selection                          | Previous readiness/fallback-release/rockTexture and distance-filtering assertions retained                                                                                                                                                                                               |

Each Image delivers one terminal load/error event; duplicate events and reuse
of a disposed owner are outside this matrix. The matrix checks C's early
outcome when already settled, and pending state
when its image is still outstanding. Promise state checks drain only the
existing microtask chain; no timers, retries, skips or timeout changes.

## Resource evidence and replacement isolation

These results are separate from promise fulfillment:

- Every old returned texture receives disposal during owner teardown. The
  returned list remains bounded at 4 textures on Low and 6 on High, including
  fallbacks; completing callbacks starts no additional Image requests or list
  entries. Repeated dispose events are explicitly allowed for old resources.
- While the replacement has successful maps and/or fallbacks bound, every old
  outstanding request settles individually. After each callback, replacement
  uniform values, texture image identities, Texture/source versions and all
  texture disposal observers remain unchanged. Replacement textures share no
  identity with old textures. Its own last callback subsequently completes
  normal successful binding or error fallback behavior.
- Every failed replacement slot retains the correct fallback with no dispose
  event; every successfully bound replacement map remains undisposed. Once
  readiness releases an unused placeholder, final owner cleanup may dispose
  it again. No exactly-once condition is added to that teardown API. The
  pre-existing exactly-once assertions concern release while the owner is
  alive, before teardown, and remain intact.

Late success on the pinned implementation **does** assign an image, increment
needsUpdate versions and bind maps in the old private uniforms after disposal.
The old all-maps handler may also dispose an already-released placeholder.
Those observations alone do not demonstrate a resource leak or visible stale
binding. Installed Three 0.186.0's Material/Texture.dispose dispatch events;
WebGLTextures removes its disposal listener and deallocates initialized
resources. Setting needsUpdate changes CPU version state; it does not itself
allocate/upload GPU textures. The old chunks/root and Scatter consumer are
removed by the existing owner path, and the per-material closures never reach
the replacement. No old object is rendered again in that path.

Pending requests necessarily retain their Image/texture/promise closures until
settlement. Successful textures retain their Image; the Image's callbacks can
form a local cycle. No global root/cache or repeated request growth was found
in this path. The fixture intentionally retains all images for delivery, so
it cannot establish browser garbage collection. No heap/GPU measurement or
claim of physical network cancellation is made. A resource or integration
failure requiring a Terrain.ts change was not reproduced; no speculative
production guard or cancellation framework is added.

## Simplicity and rubric

The clean hunt is complete with missing asynchronous ownership coverage added
to the existing capability spec. No production state, cache, dependency,
setting, guidance surface, layout patch, per-site branch, shader tuning,
config mutation, new spec file, budget or snapshot change. Existing fixture
setup is consolidated. All guards remain in terrainMaterialReady.test.ts.

Real GMRT data, all 13 identities, the five heroes, scanning, Journal, marine
life, keyboard/pad/touch and accessibility are untouched; Arcade stays default.
The applicable rubric evidence is understandable readiness/error behavior,
private resource ownership and retained discoveries protected by unchanged
consumer teardown. Headless checks establish no visual readability, beauty,
composition, shader/GPU acceptance, unaided play or real-phone resource/frame
performance. Those judgements remain with Claude/owner.

## Validation

- Baseline: `npm test -- --configLoader runner --cache=false tests/unit/terrainMaterialReady.test.ts tests/unit/beebeIsolation.test.ts tests/unit/lostCityBiome.test.ts`:
  **PASS, 3 files / 22 tests**, 4.21 s; `/tmp/3020-baseline.log`.
- After extension, same command: **PASS, 3 files / 58 tests**, 4.06 s;
  `/tmp/3020-focused.log`. Existing material/isolation controls are read-only;
  no snapshot writes, colour sampling or buffer rebaseline.
- `npm run typecheck`: **PASS**, exit 0; `/tmp/3020-typecheck.log`.
- Required aggregate: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`;
  **completed, exit 1, `FAIL gates (e2e=none)`**. Log:
  `/tmp/3020-gates.log`; detailed logs:
  `.cache/runs/20261021-083937-32-GseY4v/`.
- Aggregate **PASS**: writable config preparation, strict content validation,
  TypeScript/production build, full units (**192 files / 3,425 tests**,
  526.22 s), attribution (**14 assets**) and repository-wide Prettier.
  The existing non-failing Vite chunk-size warning remains.
- Aggregate **FAIL**: unchanged Python tooling, **5 failures / 167 tests**
  (162 passed). Four CI-build-manifest fixtures report `spawnSync git EPERM`
  (environment restriction). The golden-tooling subprocess reports
  `Unexpected end of JSON input`; its underlying cause is not established
  here. These match earlier recorded failures; no unrelated tooling repair,
  gate retry, assertion relaxation or timeout increase.
- Final owned-file Prettier and `git diff --check`: **PASS**. Only the owned
  readiness spec and this note changed. Production and snapshots have no diff;
  HEAD remains pinned. No merge, push or tag.
- Actual e2e mode **none**: browser and project-base assertions are omitted
  by instruction, not reported as passes or environment blocks. No browser,
  renderer, screenshot or game launch.
