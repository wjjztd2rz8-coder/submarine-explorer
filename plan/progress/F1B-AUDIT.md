# F1B-AUDIT — merged touch / PWA / terrain verification

Audited 2026-10-01 at `89486c0`, against `88d40d8`, after reading
`plan/PHASE-F-PLAN.md`, `F1-TOUCH.md` and `F1-TERRAIN.md`. This is a docs-only
audit: **no source fixes and no commit**. References below are to this checkout.
P1 = fix before publishing this milestone; P2 = material correctness/performance
issue for the fix round; P3 = polish or a narrower risk.

**Recommendation: hold the milestone's PWA release until findings 1–4 and 7 are
fixed; touch-only play also needs findings 5–6.** If fixes cannot land before a
deploy, disable new service-worker registration. If a worker already shipped,
disabling registration alone does not remove its existing caches/control; ship a
deliberate recovery worker at the same URL and scope.

## Ranked findings

### 1. P1 — mutable game content is cached forever across releases

- **Location:** `public/sw.js:20`, `public/sw.js:67`, `public/sw.js:99`;
  `src/world/TileLoader.ts:147`; `src/game/ContentPath.ts:49`.
- **Evidence:** every `data/` request, including landmark `mission.json`, POIs,
  journal content and tile metadata, enters permanent `subexp-tiles-v1` through
  cache-first. Only `data/tiles/index.json` revalidates. These URLs have no content
  hashes or revision identifiers. The comment that a tile ID is immutable does
  not establish immutability of these files or of regenerated heightmaps.
  In an active-worker Chromium probe under `/submarine-explorer/`, fetching
  `data/audit.json`, changing its server response from `{"deploy":1}` to
  `{"deploy":2}`, calling registration `update()`, then fetching again still
  returned deploy 1. A code release with a new VERSION also preserves TILES.
- **Impact:** returning players can remain on old objectives/content and tile
  metadata indefinitely. Fresh index entries can describe a different generation
  from a cached metadata/heightmap pair.
- **Fix:** put mutable JSON/content in a release-versioned or network-first cache.
  Preserve binary tiles only under revisioned URLs or a manifest content hash;
  cache metadata and binary as one matching revision. Regression: update JSON and
  a same-ID tile across two deployments and verify a returning controlled client
  receives a coherent new pair without clearing browser storage.

### 2. P1 — the shell version misses public assets and actual emitted HTML

- **Location:** `tools/pwaPlugin.ts:44`, `tools/pwaPlugin.ts:63`;
  `public/sw.js:18`, `public/sw.js:101`.
- **Evidence:** VERSION hashes shell **names** plus `indexHtml`, not public file
  bytes. In the actual project-base build, the 14 precache entries were `''`, six
  JS/CSS files and seven static shell files; `index.html` was absent. The
  `generateBundle` hook runs before HTML is available in its inspected bundle,
  so this build leaves `indexHtml` empty. A direct plugin probe with the observed
  bundle shape changed output `index.html` and `manifest.webmanifest` from A to B;
  both produced VERSION `2a0444a091a4`.
- **Impact:** an HTML-only, icon-only, manifest-only, texture-only or model-only
  deployment can leave the SW bytes and cache names unchanged. For example a
  manifest rebrand or corrected public texture remains cache-first from the old
  release. HTML navigation itself is network-first, so this is **not** a claim
  that ordinary online navigation always pins old HTML.
- **Fix:** compute the release digest after all outputs exist, including emitted
  HTML and relevant public assets, or inject a reliable deploy/content revision.
  Build the shell list there too. Regression: independently change HTML,
  manifest, icon and terrain texture bytes while retaining their names; each
  build must change the worker's version and refresh the affected cached file.

### 3. P1 — a broken precache is allowed to replace a working release

- **Location:** `public/sw.js:30`, `public/sw.js:34`, `public/sw.js:37`,
  `public/sw.js:42`.
- **Evidence:** each shell download failure is swallowed, then `skipWaiting()`
  runs and activation deletes old versioned caches. A controlled local two-release
  probe made every JS response 404 during release B's install. B still installed,
  emitted `controllerchange` and entered `activating`, with **zero JS entries**
  in `subexp-shell-B`. No integrity/completeness check protects the old release.
  The activation source then claims clients and removes old caches.
- **Impact:** a transient deploy/network failure can destroy the known-good
  offline shell. Eager takeover also lets new workers handle still-running old
  documents after their old hashed chunks have been deleted. A later old-page
  dynamic import may request an old chunk the new deploy no longer serves.
- **Fix:** require every critical HTML/JS/CSS shell entry to succeed before
  installation completes; optional icons may be handled separately. Choose a
  client handoff policy: activation on the next launch, or an explicit coordinated
  reload with retained old-shell support. Test partial 404s, network failure,
  two open old-release tabs and a deferred loader import during update. Old
  release must remain usable until the new shell and handoff are complete.

### 4. P1 — the first visited dive is not actually available offline

- **Location:** `src/app/boot.ts:69`, `src/app/boot.ts:87`;
  `src/app/systems/touch.ts:26`; `src/core/Pwa.ts:35`.
- **Evidence:** tile index, metadata and heightmap load before the app systems
  register the worker. First-install `clients.claim()` cannot retroactively cache
  those responses. In a fresh Chromium context, allowing automatic registration
  by overriding webdriver only for this probe, the first Titanic test dive became
  ready and controlled. Cache enumeration then contained the shell and several
  subsequently requested mission JSON files, but **no tile index, metadata or
  heightmap**. Going offline and reloading did not reach `__gameReady` in the
  observed four-second interval. Independently, those required responses were
  absent from CacheStorage, so the dive cannot be reconstructed offline.
- **Fix:** after worker readiness/control, explicitly cache the current site's
  complete dependency set, or establish control before loading the first dive.
  Mark a site offline-ready only after its required files are persisted. Do not
  expose uncached sites as playable offline. Regression: fresh profile, exactly
  one online visit, offline deep-link reload of that site, no second online reload.

### 5. P1 — Photo mode traps a touch-only player

- **Location:** `src/ui/TouchControls.ts:143`, `src/ui/PhotoMode.ts:70`,
  `src/ui/PhotoMode.ts:96`, `src/styles/photo.css:5`.
- **Evidence:** tapping PHOTO sets `photoMode.active=true`; the touch root becomes
  hidden. The viewfinder's only button is `Capture (Enter / Space)`. Its exit
  instruction is `Esc: exit photo mode`; there is no touch exit button. Global
  photo CSS also hides the pause overlay/control. Confirmed on emulated iPhone
  landscape with a real touch event.
- **Fix:** add a visible Exit/Back button to the viewfinder calling the existing
  exit path. Keep touch orbit/pinch usable and present touch-specific copy.
  Regression: enter, orbit, pinch, capture and exit a photo entirely by touch,
  then drive and pause again.

### 6. P1 — ROV deployment, vehicle pitch and camera view are unreachable by touch

- **Location:** `src/ui/TouchControls.ts:103`; `src/core/Input.ts:127`,
  `src/core/Input.ts:163`, `src/core/Input.ts:171`;
  `src/app/systems/rov.ts:64`; `src/app/systems/camera.ts:63`.
- **Evidence:** touch offers throttle/yaw, ballast, Scan, Boost, Lights, Sonar,
  Photo and Pause. No touch code sets `touchAxes.pitch` or emits `toggleRov` or
  `toggleCamera`. ROV HUD contains telemetry only; pause actions contain no ROV
  or camera control. Thus touch can neither deploy/retrieve the ROV nor choose
  first-person/chase nor deliberately pitch the submarine. Camera look is not
  vehicle pitch. This falls short of “every gameplay action reachable by touch.”
- **Fix:** provide an uncluttered secondary action drawer for ROV/view, plus a
  pitch control or an explicitly approved simplified steering design. Test a full
  ROV deploy/drive/scan/retrieve cycle, both camera views and nose-up/nose-down.
  Simulation speed is already reachable through Pause → Settings → Gameplay;
  it does not require another permanent button.

### 7. P1 — tile caching has no storage limit or eviction policy

- **Location:** `public/sw.js:20`, `public/sw.js:67`, `public/sw.js:99`.
- **Evidence:** successful `data/` GETs are added forever with no byte cap, site
  count, LRU, quota handling or clear-cache UI. Query variants are distinct cache
  keys. Current on-disk tile payloads total **29,958,789 bytes (28.57 MiB)**,
  including **29,937,660 bytes** of heightmaps; the largest heightmap is
  **5,774,408 bytes (5.51 MiB)**. All current `public/data` totals **30,680,529
  bytes (29.26 MiB)**. These are decoded file bytes, not HTTP compressed transfer
  sizes; browser cache metadata adds overhead. Public assets add another
  **7,356,353 bytes (7.02 MiB)** if all are visited, and the shell adds roughly
  1.46 MB including its duplicate root HTML cache entry. Current content is
  modest, but there is no policy preventing unlimited growth over site additions,
  revisions or URL variants.
- **Fix:** choose and enforce a budget, e.g. a **proposed** 64 MiB tile budget and
  whole-site LRU eviction with the current site protected. Track bytes after
  successful writes and handle quota failures. Canonicalize supported tile URLs;
  evict a site's metadata, binary and content together. Test synthetic oversized
  tiles, quota failure and repeated site visits. Budget/site count is an
  orchestrator decision, not an existing product requirement.

### 8. P2 — blur/resize can leave thrust held; multi-touch buttons release too early

- **Location:** `src/ui/TouchControls.ts:171`, `src/ui/TouchControls.ts:221`,
  `src/ui/TouchControls.ts:295`, `src/ui/TouchControls.ts:416`;
  `src/core/Input.ts:519`.
- **Evidence:** stick/slider correctly clear on `pointerup`, `pointercancel` and
  `lostpointercapture`. However TouchControls has no blur, visibility or
  orientation/resize reset. Input's blur handler clears keyboard/mouse state only.
  A CDP-held stick measured throttle `0.9859708193`; it stayed at that value after
  `window.blur` and a landscape-to-portrait viewport resize, clearing only after
  an explicit touch cancellation. Stick center/radius are also captured only at
  pointerdown, so a resize invalidates the drag geometry. Hold buttons track one
  Set membership rather than owning pointer IDs: two touches on Scan held it,
  lifting one finger cleared Scan while the second stayed down.
- **Fix:** release/cancel all touch state on blur, hidden visibility and viewport
  orientation changes; explicitly release captures and reset gesture baselines.
  Give each hold button one owning pointer (ignore extras), or count its active
  pointer IDs. Test touchcancel and capture loss independently, two-finger Scan,
  simultaneous stick/ballast/Boost, rotate mid-hold and background/resume.

### 9. P2 — slow sonar pinch never accumulates enough movement to zoom

- **Location:** `src/ui/TouchControls.ts:376`, `src/ui/TouchControls.ts:380`;
  `src/styles/sonar.css:15`.
- **Evidence:** `pinchDist` advances on every event, but sonar only steps when
  the individual event's delta exceeds 14. Slow movements below that threshold
  are discarded forever. A CDP pinch on the expanded sonar increased finger
  separation from 50 to 100 CSS px over 25 small moves: `zoomWheel` was called
  **zero times** and target range stayed 1000. The map's computed `touch-action`
  is `auto`, while the main scene canvas correctly has `none`; native gesture
  interception on physical browsers remains a separate unverified risk.
- **Fix:** accumulate distance/log-scale change and step when the accumulated
  threshold is crossed, preserving the remainder and the existing rate limiter.
  Set the map gesture surface's touch-action deliberately. Test the same total
  pinch delivered as many small events and a few large events, plus pinch→single
  finger transitions and cancellation. Main-camera pinch already feeds a
  continuous wheel delta and does not have this threshold bug.

### 10. P2 — scatter samples the analytic ground, not the rendered triangle surface

- **Location:** `src/world/Terrain.ts:173`, `src/world/Terrain.ts:262`;
  `src/world/scatter/ScatterPlacement.ts:194`; `src/world/TerrainChunk.ts:176`.
- **Evidence:** scatter Y uses continuous `sampleHeight`, including procedural
  detail; terrain rendering linearly interpolates sampled mesh vertices. They
  agree at vertices, not generally between them. A browser probe compared 67
  resident low-tier test-dive scatter positions to their current indexed terrain
  triangles and found a worst absolute difference of **0.4926068666 m**, at
  `(x=2.6162974685, z=176.3739631325)`. Analytic ground was higher there. That
  error is substantial beside the 0.12–0.7 m dropstone size range; subtracting
  embed does not generally remove it. This is a measured placement discrepancy,
  not a screenshot-based claim that every rock visibly floats.
- **Fix:** sample the resident mesh triangle surface/normal for placement, or
  provide a deterministic near-ground surface representation shared by scatter
  and rendering. Account for LOD changes without popping. Regression: measure
  scatter bases against rendered triangles at low/medium and around LOD borders;
  set a small explicit tolerance suitable for the smallest scatter forms.

### 11. P2 — scatter update allocates and scans even when stationary

- **Location:** `src/world/scatter/Scatter.ts:139`,
  `src/world/scatter/Scatter.ts:146`, `src/world/scatter/Scatter.ts:162`.
- **Evidence:** every rendered frame creates `missing`, scans the radius grid,
  constructs `${i},${j}` strings and parses every resident key using
  `split(',').map(Number)`, including destructuring temporary arrays. At radius
  90 m the grid is 3–4 cells per axis; at 320 m it is 11–12 per axis. Those
  allocations persist after every needed cell has settled. Rebuilds additionally
  allocate a Map and traverse all resident instances. The two-cell generation
  budget bounds cell count, not elapsed CPU time or rebuild/upload work.
- **Fix:** store numeric cell coordinates with cached results, reuse candidate
  storage and only reconcile cell membership when the camera's cell/coverage
  changes. Profile generation/rebuild separately on real low-tier phones; use a
  measured time budget if needed. Keep current reusable transform/color scratch
  objects and bounded instance buffers. Regression: stationary steady-state
  allocation profile, long travel and a teleport at each tier.

### 12. P2 — safe areas cover touch controls, but not all touch menus/maps

- **Location:** `index.html:6`; `src/styles/touch.css:33`,
  `src/styles/touch.css:81`, `src/styles/touch.css:178`;
  `src/styles/sonar.css:16`; `src/styles/menus.css:294`;
  `src/styles/settings.css:39`.
- **Evidence:** viewport-fit cover and touch stick/slider/button safe-area
  offsets are present. Sonar still sits at `left:12px` with no left inset. Pause
  and Settings panels use viewport widths/heights without safe-area padding;
  their edge targets can intrude into cutouts on short landscape screens. This
  is a CSS/layout risk: Chromium device emulation here did **not** provide real
  nonzero hardware safe-area insets. At default UI scale the measured 390×844
  portrait stick and action grid did not overlap.
- **Fix:** apply safe-area-aware usable bounds to menus/map headers and account
  for both notch directions, browser bars and increased UI scale. Validate on
  physical iOS Safari and installed mode, plus small Android landscape. Do not
  treat device-descriptor screenshots with zero insets as safe-area verification.

### 13. P2 — cache writes and revalidation are detached from worker event lifetime

- **Location:** `public/sw.js:58`, `public/sw.js:72`, `public/sw.js:79`.
- **Evidence:** `cache.put()` promises are not awaited or caught. With a cached
  index, stale-while-revalidate returns the hit immediately without passing its
  fetch/write to `event.waitUntil`. Consequently response completion is not
  evidence that the visited site's bytes were persisted; quota/write failures
  are unhandled, and background revalidation lacks a guaranteed event lifetime.
  This finding is source-based, not an observed Chromium termination failure.
- **Fix:** explicitly await critical persistence or attach background work to
  fetch event `waitUntil`, with handled failures. Keep network delivery working
  when optional cache writes fail. Add failure injection and an offline-readback
  check after a completed visit.

### 14. P3 — input-mode switching and pointer-look need hybrid-device follow-up

- **Location:** `src/ui/TouchControls.ts:180`, `src/ui/TouchControls.ts:188`;
  `src/app/systems/pointer.ts:76`, `src/app/systems/pointer.ts:121`;
  `src/core/Input.ts:662`.
- **Evidence:** touch pointerdown shows controls; mouse pointerdown and ordinary
  keys hide them and release touch state. Shift/Ctrl are intentionally excluded,
  although they themselves drive Boost/ballast. Pad activity never changes touch
  mode. Hiding `.settings-pointer-lock` and the hint does not disable a previously
  saved pointer-look preference; document click/requestPointerLook has no touch
  guard. Camera gesture listeners accept touches whenever their target matches,
  including a frozen/hidden-control canvas. The SEEN_KEY is written but never
  read. No ordinary desktop keyboard/mouse regression was established by the
  input-path review.
- **Fix:** gate pointer-lock requests on actual mouse intent, define pad and
  modifier-only switching explicitly, and gate hidden gesture collection by
  dive/photo state. Test touch→mouse→touch, active pad takeover and a persisted
  mouse-look preference on a touch device; maintain normal desktop drag/wheel.

### 15. P3 — biome bias is reversed; prop exclusion is not connected

- **Location:** `src/world/TerrainBiome.ts:74`;
  `src/shaders/terrain.frag.glsl:197`; `src/world/Terrain.ts:171`;
  `src/world/scatter/ScatterPlacement.ts:171`.
- **Evidence:** the Biome contract says positive `rockBias` shows hard substrate
  on gentler slopes. Shader subtraction of `uRockBias * 0.06` instead reduces
  rock coverage. Scatter's substrate test omits this bias/cavity adjustment.
  Scatter supports `exclude`, but Terrain never supplies one, so placement has
  no awareness of wreck/hero-prop footprints. The latter is a placement risk,
  not a demonstrated collision with a specific prop.
- **Fix:** choose/document the intended bias sign, align scatter's substrate
  test where practical, and pass site-prop exclusions before generating cells.
  Test positive/negative bias on the same slope and a synthetic excluded box.

### 16. P3 — attribution coverage omits the new generated PWA icons

- **Location:** `tools/make_icons.mjs:2`; `ATTRIBUTION.md:18`;
  `tools/check_attribution.py:40`.
- **Evidence:** all ten terrain files are named and licensed in five attribution
  entries (verified below). The five `public/icons/*.png` files are generated
  from the existing favicon, but have no explicit original/procedural attribution
  entry. The checker scans `public/assets/` and `public/audio/`, so its green
  result cannot enforce the phase's “every file gets a row” rule for icons.
- **Fix:** record the five icons as original project artwork, referencing their
  generator/source favicon and the project's applicable licence. Extend coverage
  for shipped icon artwork. No third-party licence violation was established.

## Terrain cost, memory and lifecycle review

These are shader-source texture instruction counts, **not** GPU timings or
physical texel reads after filtering/anisotropy. Branch execution depends on
surface direction and biome blend weights. Lighting/postprocessing is additional.

| Tier   | Albedo/normal maps loaded              | Common flat A-only / A+B texture fetches | Maximum triplanar texture fetches per fragment                      |
| ------ | -------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| low    | Unique albedos only; no packed normals | 1 / 2                                    | 9 = 3 slots × 3 projections                                         |
| medium | Unique albedos and packed normals      | 3 / 5                                    | 19 = 9 albedo + 1 primary Y-projection breakup + 9 normal/roughness |
| high   | Same shader switches/maps as medium    | 3 / 5                                    | 19                                                                  |
| ultra  | Same shader switches/maps as medium    | 3 / 5                                    | 19                                                                  |

Sources in repo: `src/core/config/terrain.ts:145`,
`src/world/TerrainMaterial.ts:114`, `src/shaders/terrain.frag.glsl:134`,
`src/shaders/terrain.frag.glsl:155`, `src/shaders/terrain.frag.glsl:207`.
Projections/slots at or below 2% are skipped. Medium+ still fetches packed normal
and roughness maps beyond the normal fade distance: fade changes strength, not
sampling. Low retains analytic ripples, three base macro/stain noise evaluations,
and a near-field 3×3 bioturbation neighborhood with at least 27 hash calls when
that branch runs (`terrain.frag.glsl:104`, `:243`). Thus “no PBR normals” is not a
cheap flat shader; physical-phone profiling remains required before a 30 fps
claim. Consider a separate low-tier bioturbation option after profiling.

All five `_a.jpg` files are RGB JPEG, 1024×1024; all five `_n.jpg` files are RGB
JPEG, 512×512, packing OpenGL normal XY into RG and roughness into B. Pillow
inspection verified the shipped files, not just the generator's stated sizes.
Albedos total **889,948 bytes**, normals **891,437 bytes**, combined
**1,781,385 bytes (1.70 MiB)**. Textures use repeat wrapping, generated mipmaps,
linear filtering and anisotropy 4; albedo is marked sRGB, packed maps have no color
space conversion (`TerrainMaterial.ts:163`). JPEG compression does not provide
GPU block compression. At an estimated RGBA8 GPU allocation with full mip chains,
three distinct albedos cost roughly **16 MiB**, plus **4 MiB** for three 512² maps
at medium+. Two distinct sets cost roughly 10.67 / 13.33 MiB respectively. These
are estimates excluding decoded image copies, placeholders, driver overhead and
other scene textures. The per-material Map deduplicates identical slots; maps
are not duplicated just because slot A equals C. `textureSize` is informational;
low does not downsize its 1024² albedos.

Scatter is bounded spatially and by **4096 instances per kind**. It generates at
most two missing cells per frame, prunes cells beyond `R + 2.2 × 64 m`, shares
geometry/material per kind and reuses math scratch objects. Each full matrix and
RGB instance buffer is about **304 KiB per kind**; four kinds reserve roughly
1.19 MiB independent of actual visible count. `frustumCulled=false` submits
resident meshes even when the camera faces away; range uses XZ distance rather
than camera altitude. Consider those costs in a phone profile.

A standalone Node probe using the current modules, flat synthetic ground and the
Blake biome at low density/range settled to 12 cells/66 instances/4 calls; after
100 updates moving 64 m each, it held 10 cells/51 instances/3 calls. All four
mesh dispose events fired and the group became empty. Terrain disposes scatter,
chunks, shared material and each loaded/placeholder texture. **No unbounded
scatter-cell growth or proven GPU disposal leak was found.** Pending image loads
are not cancelled, and their callbacks may run after Terrain.dispose; add a
disposed guard/error settlement if introducing shared texture caching. Do not
mistake that source risk for a measured permanent GPU leak.

Repeated `placeCell(0,0,...)` calls with identical biome, seed, density and flat
ground produced byte-identical JSON (20 instances). RNG and noise are seeded.
Resident gathering follows Map insertion order, however: if a crowded kind hits
the 4096 cap, different travel histories can choose different retained subsets.
Deterministic nearest-first/stable cell ordering would remove that narrower
history dependence. Placement is deterministic for a fixed tier; tier changes
are not promised to keep a strict subset of identical instances.

## Touch action and UI coverage

| Action / flow                                                          | Current touch route                                 | Result                                                                                                 |
| ---------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Forward/reverse, yaw                                                   | Virtual stick                                       | Implemented; cancellation clears; lifecycle issue in finding 8                                         |
| Rise/sink                                                              | Ballast slider                                      | Implemented; explicit pointercancel/capture-loss handlers                                              |
| Boost / Scan                                                           | Hold buttons                                        | Implemented; multi-touch ownership issue in finding 8                                                  |
| Headlights / expanded sonar                                            | Tap buttons                                         | Implemented                                                                                            |
| Camera look / camera zoom                                              | Scene drag / pinch                                  | Implemented on canvas; gesture state cleanup needs lifecycle coverage                                  |
| Camera reset                                                           | Scene double tap                                    | Implemented; existing test merely taps, without asserting reset                                        |
| Vehicle pitch / ROV / camera view                                      | No route found                                      | Finding 6                                                                                              |
| Simulation speed                                                       | Pause → Settings → Gameplay                         | Existing select provides touch access                                                                  |
| Photo capture                                                          | PHOTO → Capture                                     | Implemented; exiting is blocked (finding 5)                                                            |
| Pause/resume, objectives, site list, Journal, Settings, Controls, quit | Pause menu buttons and existing close/back controls | DOM routes exist; Pause → Settings was exercised by real taps                                          |
| Sonar zoom                                                             | Existing +/− buttons; expanded-map pinch            | Buttons exist; slow pinch fails (finding 9)                                                            |
| Globe orbit/site selection                                             | Existing pointer drag and pin buttons               | Routes exist; globe zoom is wheel/keyboard only (`Globe.ts:547`, `:599`), with no pinch or +/− buttons |

Menus use coarse-pointer minimum target rules and native clicks/selects. The
globe's touch zoom gap needs a secondary zoom control or pinch before claiming
complete mobile menu parity. Long Journal/site-list scroll, nonzero safe areas,
maximum UI scale, physical WebKit and Android browser behavior were **not** fully
playtested here. Portrait controls at the tested default scale had no stick/grid
overlap; existing HUD crowding remains the F1-TOUCH progress note's known issue.

## Licence verification and attribution mapping

Checked publisher asset pages on 2026-10-01. Every new terrain texture is usable
under the requested licence policy. No NC, ND or SA asset was found. The names
below are quoted licence labels, with the source-page URLs.

| Shipped files                        | Source and verified licence                                                                                                                              | Attribution coverage                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `silt_a.jpg`, `silt_n.jpg`           | [ambientCG Ground095A](https://ambientcg.com/view?id=Ground095A): “Creative Commons CC0”; asset page's licence section states this applies to all assets | `ATTRIBUTION.md:20`, both filenames                                                |
| `sand_a.jpg`, `sand_n.jpg`           | [ambientCG Ground094C](https://ambientcg.com/view?id=Ground094C): “Creative Commons CC0”                                                                 | `ATTRIBUTION.md:21`, both filenames                                                |
| `basalt_a.jpg`, `basalt_n.jpg`       | [ambientCG Rock035](https://ambientcg.com/view?id=Rock035): “Creative Commons CC0”                                                                       | `ATTRIBUTION.md:22`, both filenames                                                |
| `rubble_a.jpg`, `rubble_n.jpg`       | [Poly Haven Coral Mud 01](https://polyhaven.com/a/coral_mud_01): “CC0 License”; author displayed as Rob Tuytel                                           | `ATTRIBUTION.md:23`, both filenames; adding the named author improves completeness |
| `carbonate_a.jpg`, `carbonate_n.jpg` | [Poly Haven Coral Ground 02](https://polyhaven.com/a/coral_ground_02): “CC0 License”; author displayed as Rob Tuytel                                     | `ATTRIBUTION.md:24`, both filenames; adding the named author improves completeness |

The [ambientCG licence page](https://docs.ambientcg.com/license/) linked from
the asset pages specifies “Creative Commons CC0 1.0 Universal License”, matching
the attribution entries' CC0 1.0 designation.
The [Poly Haven asset licence](https://polyhaven.com/license) linked by both
source pages confirms CC0 applies to assets and permits modification and
redistribution. No new third-party download was added by this audit. Generated
PWA icon documentation is covered by finding 16. This audit makes no new factual
claims about real sites or species; biome names above refer to repository keys
and test fixtures, not ecological verification.

## Verification performed and limits

- Inspected the requested diff and related boot, input, camera, photo, ROV, menu,
  tile/content loading, attribution and build-plugin code. HEAD matches the
  specified merged revision.
- Type checking completed successfully in the initial `npm run build` attempt.
  Normal Vite config bundling then failed because this worktree's node_modules
  symlink targets read-only storage (`.vite-temp` EROFS). Runner loading also
  failed at the plugin's dynamic closeBundle import. This is a local tool/loading
  constraint, not a demonstrated default-build regression.
- Built successfully with `VITE_BASE=/submarine-explorer/`, using equivalent
  Node-stripped config/plugin modules in `/tmp` and Vite's native config loader;
  output and preview were in `/tmp`. Verified rewritten manifest/icon/JS/CSS
  paths, relative manifest start URL/scope/icons, worker scope and emitted worker
  version. No source configuration was changed.
- `npx vitest run tests/unit/touch.test.ts tests/unit/terrain-detail.test.ts
--no-cache --configLoader runner`: **29 tests passed**. These tests cover
  input helper math/registration predicate and existing terrain detail, not the
  new scatter lifecycle or service-worker fetch/update behavior.
- Fresh normal webdriver context had zero worker registrations, as intended.
  Separate focused probes explicitly registered the worker or temporarily
  overrode webdriver to exercise its actual lifecycle. A warm shell navigation
  succeeded offline. A cached data-only release stayed stale; a partial precache
  entered activation; a first-visit dive lacked required cached tile files.
- A previously installed worker is not disabled by `navigator.webdriver`: the
  guard prevents **registration only**. If an automation harness reuses an
  installed browser profile, it must unregister/clear this app's caches before
  navigation (and account for an already-controlled page), or use a fresh
  context. Existing e2e contexts avoid this by starting fresh.
- Shell fallback handles network exceptions, not HTTP 404/5xx. Consider cached
  navigation fallback on a transient 5xx; an unvisited tile currently has no
  explicit offline recovery/selection UI.
- Inspected disposal and used standalone placement/streaming/dispose probes;
  measured actual low-tier scatter-to-triangle offsets in Chromium. These probes
  were temporary, not persisted regression tests. No physical-device GPU memory
  or sustained frame-rate measurement was performed.
- `npm run check:content`: **all 13 landmarks passed**. Attribution check:
  **13 checked asset files passed** (decoder folders are exempt by design).
- Existing touch e2e covers movement/Scan/Pause/device layouts and registration
  absence, but not cancel/rotation/multi-touch/photo exit/pinch semantics. Terrain
  e2e gathers screenshots and errors; it does not assert pixel content, despite
  its “frame is not blank” comment. Neither suite covers a real SW update.
- Formatted this document with `npx prettier --write
plan/progress/F1B-AUDIT.md` and checked its formatting before delivery. The
  orchestrator should run the full gates after merging fix packages.

## Fix-round brief and decisions

1. **PWA fix package:** findings 1–4, 7 and 13 together. Add active-worker tests
   at the project base: first visit/offline, data/static-only update, failed
   shell install, multiple live tabs, old deferred chunks, cache quota/eviction
   and offline uncached-site recovery. Keep ordinary tests' fresh-profile
   webdriver skip. Decide cache budget and update/handoff policy before coding.
2. **Touch fix package:** findings 5–6, 8–9 and 12; fold in hybrid switching and
   globe zoom. Require an entire dive including ROV and photo entry/exit without
   keyboard events. Decide the compact pitch/action-drawer design. Retain
   desktop drag, wheel, pointer look and remappable keys.
3. **Terrain fix package:** findings 10–11 and 15. Add placement/triangle agreement,
   exclusion/bias and steady-state allocation checks. Profile low-tier analytic
   shading before changing its visual budget. Preserve the verified CC0 texture
   attribution entries and current bounded disposal behavior.
4. **Docs polish:** original icon rows and named Poly Haven author; move remaining
   touch-specific copy/HUD crowding into the upcoming brand/onboarding briefs.

No licence replacement decision is required. Release approval, tile budget,
worker handoff policy and pitch/control layout remain with the orchestrator.
