# 2090 — S-verify, eighth pass

Reviewed HEAD: `79aed4c`. Two rounds: source/history and capability inventory,
then added coverage, review and validation. The requested visual commits predate
2060's merge (2060 reviewed `aa059aa`); they were explicitly re-audited alongside
V-eight-sites and 2070 rather than omitted from a merge-date-only diff.

## Round 1 — audit

- **V-headlight (`78f9fcf`, `46b191a`):** the surviving shader change is only
  the detailed-terrain roughness blend. Clamped texture roughness 0.4–1.0 now
  yields 0.775–0.925; Low retains its existing non-PBR branch. Normal/albedo,
  light, caustic and output logic are unchanged. Medium and High use the blend.
  The snapshot update changes the shared terrain shader hashes, not geometry
  or uniforms. No snapshots were regenerated in this audit.
- **Shared-noise inventory:** `TerrainMaterial` is the only loader of the full
  terrain packed-normal map set. There is one additional lit consumer:
  `LostCityCarbonate` loads the same `carbonate_n.jpg` used by Blue Hole and
  other carbonate terrain. Its separate roughness path already clamps to
  0.72–0.98, and Low does not load the packed map. Thus a blanket assertion
  that no other lit material reads that texture would be incorrect. Geo props
  otherwise use their generated detail/bump textures; wrecks generate their
  own maps. No new visual defect was confirmed in the shared carbonate path;
  fresh lamp-pool image verification remains blocked below.
- **V-titanic plates (`069c081`):** this is intentionally shared steel, as stated
  in `V-titanic-2.md`. Live direct callers are Titanic bow/stern, Bismarck hull,
  and the steel branch of wreck scatter. The authored steel scatter kits are
  Titanic/Bismarck; Endurance's hull/rigging/stern use wood/fittings/growth.
  No unrelated site or generic material acquires this shader. Materials remain
  cached by texture size and normal-map flag.
- **Low/Medium cost:** the plate layer adds two plate hashes plus four hashes
  inside one 2D noise evaluation: six sine hashes per covered fragment, with
  fixed arithmetic and no loops. It adds no sampler, texture fetch, uniform,
  geometry, draw call or per-frame CPU update. The ALU cost applies equally
  on every tier; Low remains 256 px/no normal map, Medium 512 px/no normal map,
  High 512 px/normal map. This is a static cost audit, not a phone GPU timing
  measurement; there is no evidence supporting a tier/visual change here.
- **Fallback compilation:** the installed Three renderer requires WebGL2
  (WebGL1 support was removed in r163). Independently compiled the exact plate
  declarations/body in a surfaceless Mesa GLES context as GLSL ES 1.00 and
  3.00, highp and mediump, with `USE_MAP` both on and off: all eight compile.
  This checks the patch's syntax and guarded UV access, not an unsupported
  complete WebGL1 renderer. Reproducer: `/tmp/2090-shader-check.py`.
- **V-eight-sites (`e6298bf`):** only Bismarck 240→150 m, Hudson 240→160 m,
  Hunga/Blake 260→160 m changed. All 13 sites remain in the approach table.
  Existing capability tests cover each site/tier's first primary, hull and
  camera clearance, collision-free transit, projection in desktop/portrait/
  landscape, every sensor's scan/sonar ranges, pre/post-props spawn and legal
  minimum-depth scanning using the real submarine/scanner. These establish
  geometric visibility/reachability; they do not measure rendered contrast.
- **2070:** shell/visibility transitions suppress the resumed interval, frozen
  frames discard fractional physics backlog, and camera/UI time continues.
  Mission updates receive `clockDt`; Discovery forwards that same delta to
  `SessionStats`; physics, power and scan progress use admitted fixed steps.

## Round 2 — capability coverage and review

- Extended `appSystems.test.ts`'s existing resume capability with real `Mission`
  and `SessionStats` counters, multiple throttled hidden-tab frames, visibility
  return, and an 8 ms fractional interval interrupted by pause/resume. The
  resumed frame admits no steps/time; the following 8 ms admits no stale
  physics step, and another 9 ms admits exactly one. Both duration counters
  accumulate exactly 0.325 s of admitted play. Existing frozen-frame, UI-time
  and RAF/listener disposal checks remain intact.
- Added a textured-material capability to `wrecks.test.ts`. Ordinary Node wreck
  tests receive null canvas maps and therefore skip the plate patch. The new
  test supplies texture objects to the real material factory at all three
  tiers and checks shared caching, texture/normal budgets, unchanged vertex
  shader and standard lighting chunks, no additional sampler/fetch/uniform,
  non-emissive steel, and a distinct program key from fittings. Module isolation
  keeps these fixtures out of the ordinary builder tests.
- **Confirmed new application bugs: none.** No runtime source, tuning, content,
  assets, CSS or snapshots changed. Coverage was added to existing capability
  specs; no package-named spec, UI, setting or runtime abstraction was added.
- Sensitivity check: a temporary Vite transform removed the plate hook and
  restored counting the resumed frame's delta. The material and clock
  capabilities both failed (two failures, 43 passes); production files were
  never mutated. Log: `/tmp/2090-sensitivity.log`.

## Validation

- PASS: broad unit run, **190 files / 2,267 tests**, 484.50 s. Started before
  coverage edits; the final focused run below verifies the added assertions.
  Command: `npx vitest run --configLoader runner --pool=threads --cache=false`.
  Log: `/tmp/2090-unit-round1.log`.
- PASS: final focused run, **7 files / 119 tests**: `appSystems`, `wrecks`,
  `missionApproach`, `missionComposition`, `missionApproachSystem`,
  `beebeIsolation`, `beebeScatter`. Same Vitest options, with those existing
  files supplied explicitly. This includes all 39 site/tier approaches, the
  13-site scan/clearance table and unchanged shader/geometry snapshots.
  Log: `/tmp/2090-focused-final.log`.
- PASS: typecheck and production build. Bundled the existing Vite config with
  Rolldown into `.cache/2090-vite.config.mjs`, then ran
  `npm run build -- --config .cache/2090-vite.config.mjs --configLoader native --outDir dist-2090`.
  The emitted CSS and application chunk hashes match the initial audit build.
  Logs: `/tmp/2090-typecheck.log`, `/tmp/2090-build-final.log`.
- PASS: all eight isolated GLES shader compilations; strict content validation;
  attribution; changed-file Prettier and `git diff --check`.
- Python: **162/166 pass**. Four existing CI build-manifest tests fail because
  this sandbox reports `spawnSync git EPERM`; the same restriction prevents
  the gates wrapper's post-build manifest write. The direct production build
  above succeeds. Logs: `/tmp/2090-python.log`, `/tmp/2090-build.log`.
- Browser suite attempted against the isolated build on port 4209 (smoke,
  opening-framing and mission specs). Preview cannot bind
  `127.0.0.1:4209` (`listen EPERM`), so no browser assertions or fresh screenshot
  QA are claimed. Existing V-headlight/V-titanic screenshot paths are historical
  evidence, not images inspected in this worktree. Real-phone GPU cost and
  rendered lamp-pool/first-target contrast remain unmeasured here.
  Logs: `/tmp/2090-browser.log`, `/tmp/2090-preview.log`.

Isolated `dist-2090` output removed after validation. Changes are uncommitted.
