# f-bluehole-squiggle

## Render-path findings

- This worktree started at `cf191d8` on main. The brief's `claude/f-bluehole-floor` branch and worktree no longer exist. The follow-up floor2 work is already merged (`429b30c`, implementation `b9b13a9`, `39241c9`, `64cc9c1`); preserve it rather than importing an obsolete branch.
- The visible floor in golden `great-blue-hole-2` is the **gallery talus apron**, built in `src/world/props/geo/stalactites.ts`, above the terrain heightfield. Its original material used `geo/textures.ts`'s canvas `rock` map: a narrow threshold around the 0.5 noise contour (`crack`) supplies both albedo and bump. This is a different map from `public/assets/terrain/silt_a.jpg`.
- The terrain's triplanar A/B silt sampling is already neutralised by Blue Hole `contrast: 0`; texture normals are already off (`detail: 0`). Changing those settings cannot affect the apron prop. The terrain breakup gate from floor2 remains in place.
- Floor2 already removed the apron/wall map and bump map. The saved golden set `2026-10-11-100422`, inspected here, shows **no thin contour squiggles**, but still a smooth lumpy grey-green ramp. Historical views copied to `.cache/bluehole-squiggle/historical-before/`; these are existing golden captures, not a fresh baseline of this task.
- Root cause of the remaining ramp: `blueHoleApron` terraces the underlying terrain, while `buildTalusMesh` overlays it with a concave rubble skirt. Height-keyed vertex colour alone does not supply level sediment treads.

## Changes

- `PropsConfig.blueHoleApron`: 1.7 m sediment beds, 0.22 riser fraction.
- Optional terraces on `TalusShape`: step the **final surface elevation**, so sloping ground does not tilt the beds. Raise sediment by less than one bed; feather to the unchanged wall contact and buried outer rim. Only the two Blue Hole gallery builders opt in. Mesh construction, rock seating, support checks and normals all use the same depth function.
- Replace the apron's narrow dark painted joints with broader, lighter per-bed tones. Existing neutral mapless material, lights, fog, terrain textures and pendant envelope remain intact. Name the mesh `grotto-sediment-apron` for direct material isolation.
- Unit checks distinguish level treads from risers, bound the lift, preserve contacts, verify rock seating and triangle counts. Material checks inject a non-null texture (unlike normal Node behaviour) to catch restoration of the contour map while preserving pendant textures.
- Updated only the intentional Blue Hole Low geometry digest: 8 draws / 21,228 triangles unchanged. Other sites' buffer baselines remain pinned.

## Browser review harness

`tests/e2e/f-bluehole-squiggle.spec.ts` runs with full gates. While these edits are uncommitted, it builds HEAD's three original sources in isolation and calls **tools/golden-shots.mjs** for before/after High desktop views of both galleries. On clean committed checkouts it captures current views only.

Outputs: `.cache/bluehole-squiggle/index.html`, `comparison.json`, `before-*.png`, `after-*.png` and four pose-2 material diagnostics:

1. Complete production floor.
2. Terrain procedural detail off (ripples, burrows, rock detail).
3. Apron hidden (reveals underlying terrain).
4. Original rock albedo/bump restored on the apron, normalised by its mean for equal illumination.

The harness checks no page errors, loaded props, unchanged solid tessellation, actual mapless apron/wall state, neutral terrain texture uniforms and floor screenshot luminance (central 680 x 200 region, within 3% for moving snow/caustics). The orchestrator subsequently ran this harness successfully outside the sandbox; measured brightness and visual review are recorded below.

## Initial sandbox validation

- Initial static gates all passed with `GATES_CONFIG_MODE=writable PW_PORT=4280 tools/gates.sh --no-e2e`. Native locally bundled Vite config avoids the read-only dependency tree and the runner's PWA closeBundle failure.
- Targeted geometry, pendant, collision and phone tests pass; Blue Hole Low snapshot updated intentionally without changing its budget.
- Final full gate run and its precise outcome are recorded below once finished.
- Fresh capture attempt with `GOLDEN_SITES=great-blue-hole node tools/golden-shots.mjs --base-url http://127.0.0.1:4280/` failed at Chromium launch (`sandbox_host_linux.cc: shutdown: Operation not permitted`). Incomplete manifest: `.cache/golden/2026-10-11-114247/poses.json` (zero captures). Vite preview separately failed `listen EPERM 127.0.0.1:4280`.
- The managed sandbox prohibits servers/browser launch and writing the shared Git metadata. No claim of successful fresh before/after review, browser gate pass, commit, rebase or merge. Main advanced during this task; rebase after the full gates outside this sandbox.

### Initial local full gate result

`GATES_CONFIG_MODE=writable PW_PORT=4280 tools/gates.sh --full-e2e`:

- PASS config, build, unit (177 files / **1,777 tests**), Python (**156 tests**), content, attribution, prettier.
- FAIL e2e and e2e-base **before test execution**: `Process from config.webServer was not able to start. Exit code: 1`. Preview's independent diagnostic is the `listen EPERM` above; the golden tool separately confirms Chromium is prohibited too. Logs: `.cache/gates/{e2e,e2e-base}.log`.
- Typecheck and `git diff --check` also pass after the last edits.
- Both historical floor2 pose-2 shots were inspected: the before has obvious thin noise-contour outlines on apron and wall; the after removes them. Copies: `.cache/bluehole-squiggle/historical-before/contour-map-{before,after}-floor2.png`. This corroborates the existing material removal; it is **not** visual approval of the new terrace geometry.

## Outside full E2E, round 1

The orchestrator ran `tools/gates.sh --full-e2e` outside the sandbox. Build, unit, Python, content, attribution, prettier and e2e-base **PASS**. Full E2E: **642 passed / 49 skipped / 11 failed**. `f-bluehole-squiggle.spec.ts` passed and produced complete before/after golden manifests and all four material diagnostics.

- Reviewed fresh west pose 2 before/after: the lumpy ramp becomes visible sediment treads and risers; no thin apron outlines. East pose 2 also shows stepped sediment behind the gallery pendants.
- Terrain-detail-off leaves the stepped apron visible. Apron-hidden reveals the separate underlying terrain. Restoring the old apron rock map reproduces the exact thin contour squiggles on the stepped surface. This directly isolates the prop material, independently of the terrain triplanar/detail path.
- `comparison.json`: floor ROI luminance **144.958 before / 158.766 after**, ratio **1.095258 (+9.53%)**. This measures the central pose-2 floor region, not every pixel of every gallery view. Solid vertex counts are unchanged, both capture manifests are complete, and no page errors were recorded.
- Review artifact: `.cache/bluehole-squiggle/index.html`; fresh captures are made by `tools/golden-shots.mjs` as requested.

## Round 1 camera failure repairs

All 11 failures were obsolete E2E camera expectations after intentional changes already merged into this worktree's HEAD, not Blue Hole regressions:

- `f-bughunt-18.spec.ts`: four failures pinned Lost City Arcade to 50 m, but `f-lostcity-tower` (`ea10c39`, see `plan/progress/f-lostcity-tower.md`) deliberately uses **66 m** with **+8 m vertical offset** to clear the tower tip and scan card. Updated all exact opening/reset/photo-return pins to 66 m. Zoom endpoints, terrain clearance, photo freezing/return, Realistic/Custom/surface/global-radius checks remain enforced.
- `f-lostcity-readable.spec.ts`: six failures required camera-to-tower-foot <95 m, incompatible with that authored arm (actual 106.4–107.1 m). Replaced that obsolete distance proxy with independently pinned **actual eye offsets** (66 m along local [-20,46,90]) and projection checks for the entire **60 m tower axis** inside the central 90% of the view and camera depth range. The exact arm pin is 66 m. Existing opening range, altitude, ambient fill, all nine floor-light proxies and disabled-headlight assertions remain enforced; no broader distance threshold substituted.
- `f-challenger-opening.spec.ts`: one failure required a centred Challenger hull, while `f-challenger-cam` (`d3e6336`, see `plan/progress/f-challenger-cam.md`) deliberately puts it right of centre to expose the Leggo lander. Replaced that obsolete Challenger requirement with every visible hull vertex/instance inside the viewport and depth range, clear of HUD zones, plus **12 px lander-centre clearance from the hull screen span**. Other sites still require exact centring; level pitch/roll and starting-depth hint grace checks remain enforced.
- Lost City unit camera fixtures now pass the authored Y offset as well as X/radius to the rig, exercising the actual live opening rather than omitting the tower pass's +8 m shift. All geometry/collision/lighting/photo-return assertions remain enforced.

Post-repair validation: targeted camera units **14/14 PASS** (Lost City Camera, Lost City Readability and Challenger Portrait); Playwright discovers all **19** tests in the repaired three files. `GATES_CONFIG_MODE=writable PW_PORT=4280 tools/gates.sh --no-e2e` **PASS** after the repairs: config, build/typecheck, unit (**177 files / 1,777 tests**), Python (**156 tests**), content, attribution and prettier. `git diff --check` also passes. Browser execution of these repairs is **pending the orchestrator's next outside run**; local Vite/Chromium remain prohibited.

Full outside gates must pass before committing/rebasing/merging. Shared Git metadata is read-only here; no commit, rebase or merge is claimed.
