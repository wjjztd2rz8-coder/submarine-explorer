# Status — 2026-09-23

## Claude session 2026-09-23 (latest)

- Reviewed and re-ran gates on the C6/C3/Lost City working tree: build,
  348 unit, 104 Python, 35 e2e (+1 opt-in skip), attribution — all green.
  Committed as `cc2cfbc`. C6 and C3 are done; see their progress notes.
- `monterey-canyon` was held out of the commit (validator error); a Sonnet
  agent finished it (`42c6e42`). C5 settings done on Opus (371 unit, 38 e2e);
  see `plan/progress/C5.md` for the unbuilt items (reset progress, LOD
  setting, reload button, gamepad). Challenger Deep is in progress (Sonnet).

## OpenAI continuation checkpoint (latest; supersedes historical notes below)

The owner requested codebase review followed by GPT-6 Sol implementation
subagents and orchestrator review. GPT-6 Astra replaces Fable; GPT-6 Sol
replaces both Sonnet and Opus. Original Claude instructions remain in the
plan and `CONTRIBUTING-AGENTS.md`.

The owner then reported approximately 30% usage remaining and noted that work
may need to continue later. Finish C6/C3 verification before starting another
package; preserve a reviewable working-tree checkpoint. Do not launch C5 or
new content work in this session.

### What the codebase review established

- A/B and C2 are already implemented, with known polish/hardware-validation
  gaps. The old statement that only the scaffold is committed is obsolete:
  `git log` includes Phase B integration and the Phase C checkpoint `dc66674`.
- C1 globe works but still needs its dedicated browser coverage and docs.
- C5 has `Save.ts`, `Captions.ts`, sonar palettes and HUD binding support, but
  no settings screen or runtime wiring.
- The two initially untracked content folders are prior work: preserve them.
  `lost-city` passes the landmark validator (three single-source warnings).
  `monterey-canyon` lacks `species.json` and `sources.md`; its declared
  `species_file` is therefore a validation error.
- Monterey's two required targets are about 17.5 km apart. Make the long
  transect optional when finishing that pack; even an optimistic 18 m/s
  transit takes over 16 minutes, before scanning/descent.

### This session

- Added the OpenAI model mapping without removing the Claude briefs.
- C6: deployment-base URL fixes, unit coverage and an opt-in project-base
  browser test. See `plan/progress/C6.md` and `docs/deploy.md`.
- C3: preset integration and review in progress; see `plan/progress/C3.md`
  for final verification and remaining visual limitations.
- Initial baseline: 344 unit tests, 104 Python tests, attribution check.
  The first integrated root-base build passed all 24 pre-existing browser
  tests (2.2 minutes); the orchestrator inspected the briefing screenshot.
  Final verification is recorded below when complete.
- Nothing was pushed or deployed; GitHub workflows remain unverified on
  GitHub itself. Local browser checks do not establish the owner's hardware
  performance target.

### Resume order

1. Review `git status`, this checkpoint, and C6/C3 progress notes. Preserve
   the existing content folders and all completed working-tree changes.
2. C5 settings/accessibility on GPT-6 Sol, then orchestrator review. Check
   saved rebinding conflicts after reload: `Input.loadBindings()` currently
   ignores empty key arrays, so displaced bindings may regain defaults.
   `resetBindings()` also needs guarded storage removal. Verify modal input,
   actual pause, captions, reduced motion, and keyboard/axe accessibility.
3. Finish and validate Lost City/Monterey content, including Monterey pacing;
   then the remaining C4 packs using the existing tools and honesty rules.
4. Finish C1 browser coverage, globe polish and `docs/globe.md`.
5. Phase C QA and documentation reconciliation. Phase D remains gated on
   the Phase C playtest and retrospective; no detailed D brief exists yet.

Use at most two Sol subagents at once. Review each package before progressing.
Do not push, create a repository or enable Pages without the owner's go-ahead.

---

## Historical checkpoint (retained for context; use latest section above)

## Phase C checkpoint — resume here (2026-09-22)

Paused for the owner's usage budget ($20/month plan, 5-hour window). Tree is
green at this commit: build, 344 unit, 104 Python, 24 e2e, attribution check.
Per-package notes with exact next steps are in `plan/progress/<pkg>.md`.

| Pkg           | State                                                              | Next session                                                                                                                 |
| ------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| C6 CI/deploy  | done, verified locally                                             | fix 6 absolute `/data` `/assets` URLs to use `import.meta.env.BASE_URL` (list in progress/C6.md); owner decides when to push |
| C1 globe      | works in browser (`?globe=1`, key N), unit-tested                  | e2e spec, docs/globe.md, thinner cyan rim                                                                                    |
| C3 presets    | 8 presets written + unit-tested, **not wired** into main.ts        | wire per progress/C3.md, e2e screenshots, docs/presets.md, Atmosphere knobs                                                  |
| C4a tools     | `tools/obis_export.py`, `tools/validate_landmark.py` done + tested | —                                                                                                                            |
| C4a–d content | no landmark folders yet                                            | 12 landmarks on **Sonnet**, one pack at a time; terrain notes in progress/C4a.md                                             |
| C5 settings   | Save.ts, Captions.ts, Sonar/HUD edits partial, not wired           | resume the C5 brief (Opus)                                                                                                   |

Pacing rule (owner): at most 1–2 agents at a time; Sonnet for content, QA and
docs; Opus for engine work; commit a green checkpoint before the window ends.

Phases A and B are integrated in the working tree, along with C2 (tiles). The
commit covering A + B + C2 is still pending: the only commit is the initial
scaffold. The QA pass for Phase B is being written to `plan/QA-B.md`.

## Shipped

| Pkg | What                                                                                                                                   | Doc                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| A1  | Terrain detail noise, triplanar procedural material, 3-level chunk LOD with skirts, graphics tiers (`?tier=`)                          | `docs/terrain.md`                                |
| A2  | Depth bands (`env:depthBand`), fog/lights, headlights (L), marine snow, caustics, surface lid, post pass (tint + vignette), `?depth=`  | `docs/atmosphere.md`                             |
| A3  | Tuned physics, sim speed (T), hull classes, crush depth + emergency blow, hull stress, chase/first-person/orbit rig, remappable input  | `docs/playtest-A3.md`                            |
| A4  | WebAudio graph, depth low-pass, sonar ping with 2d/1500 echo, ambient beds, thruster/ballast/creak/thud/alarm cues, captions bus       | `docs/audio.md`                                  |
| A5  | Art direction and mood board                                                                                                           | `docs/art-direction.md`                          |
| B1  | POIs, scan beam (hold G), `DiscoveryStore` (`subexplorer.discoveries.v1`), field guide (J), debrief, `?poi=`/`?landmark=`/`?debrief=1` | `docs/discovery.md`                              |
| B2  | Titanic content pack: 8 POIs, 9 guide entries, 5 procedural props, mission with 2 primary + 2 secondary objectives, sources            | `data/landmarks/titanic/sources.md`              |
| B3  | `?mission=` router, briefing (freezes game), objectives panel + nav line, completion → debrief, MISSIONS list, `?skipBriefing=1`       | `docs/missions.md`                               |
| B4  | `props.json` loader + validator, procedural hull/debris/chimney, 2 CC0 GLBs, LOD + impostors, prop collision, `?at=`, `?debugProps=1`  | `docs/props.md`                                  |
| C2  | 13 Tier-2 GMRT tiles (`tools/fetch_all.py`), gzip + 16-bit variant (`tools/compress_tiles.py`), coverage report                        | `docs/tiles-inventory.md`, `docs/tile-format.md` |
| fix | QA-A #1: sonar minimap takes the tile's aspect (F2); HUD help lists the systems keys (F3)                                              | `tests/unit/uiSonar.test.ts`                     |

Contracts for the Phase B packages: `plan/PHASE-B-CONTRACTS.md`.

## Gates (measured 2026-09-22 by the docs pass)

| Gate               | Result                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`    | green: `tsc` has zero errors and vite builds 65 modules. Main chunk is 732.7 kB (198.0 kB gzip), which trips vite's 500 kB chunk warning. Dist is 84 MB.            |
| `npm test`         | green: 258 tests in 23 files                                                                                                                                        |
| `npm run test:py`  | green: 42 tests                                                                                                                                                     |
| `npm run test:e2e` | not run by the docs pass because the QA agent is using the ports. Specs: smoke (×2 tiles), atmosphere, sub-playtest, discovery, mission, props. See `plan/QA-B.md`. |

## Known gaps

Rendering / feel

- Chromatic aberration and god rays: Config has them (`aberrationStrength`,
  `godRayStrength`, `tiers.*.godRays`), but the post shader reads none of them.
- No Fresnel/reflective surface lid. The lid is a tinted translucent plane.
  The grade is a single tint rather than a LUT.
- There is still a faint cell-aligned pattern visible from altitude (QA-A #2).
  No fps figure has been recorded for the medium tier (QA-A #4).
- Large tiles are kept under the 4M resident-vertex budget by automatically
  lowering the per-cell subdivision (`Config.terrain.maxVertices`); e.g.
  `blake-plateau-corals` renders at subdiv 1 on every tier (fixed after QA-B).
- Pointer lock is not requested. Gamepad buttons are not rebindable. Nothing
  sets `CameraRig.reduceMotion` yet (C5). The HUD help text is hardcoded, so it
  does not follow rebinding.

Game

- Crush depth in a mission now shows a HULL FAILURE strip during the emergency
  blow and then opens a "Dive aborted" debrief (`mission:aborted`), per the
  DECISIONS failure model (fixed after QA-B). In free dive the HUD keeps showing
  HULL BREACH after the blow.
- Mission objectives count only scans made during the current run, not saved
  discoveries, so a repeat dive has to find everything again. Only the `scan`
  objective type and the `all_primary` rule exist.
- Audio plays the discovery chime on `scan:complete` (quiet tick on repeats).
  Nothing subscribes to `env:depthBand` (ambient already crossfades from depth).
  Captions have no on-screen consumer (C5).
  `ui:selectTile` is declared but never emitted.
- No CC0 wreck GLB was found, so `procedural:hull-block` stands in for hulls.
  Impostors are silhouettes, not sprites.
- Only `titanic` has a mission. The other 12 tiles are free dives (C4a–d).

Data / build

- `great-blue-hole`: the hole is below GMRT's grid resolution (GEBCO fill, 0 %
  multibeam). `hunga-tonga-caldera`: the terrain is pre-2022-eruption
  multibeam, so there is no caldera. `endurance` and `bismarck` have 0 %
  multibeam. `lost-city` (367×310) is below the 500-cell target. See
  `docs/tiles-inventory.md`.
- No `.br` files exist yet, because the brotli CLI is absent on the build
  machine.
- Tile copies nobody requests are shipped in `dist/`. `vite build` copies all
  of `data/`, including `heightmap*.bin.gz` (31 MB), `heightmap16.bin` (15 MB)
  and `_samples/` (2.6 MB). The loader never requests any of them, because
  `main.ts` does not pass `prefer16`.
- Draco decoders are in the bundle twice. Vite emits hashed copies of the
  `three/examples` decoders (two `.wasm`, two wrappers, the JS decoder) in
  addition to `public/assets/decoders/draco/`, which is the only copy
  `PropLoader` uses.
- `tools/build_landmarks.py` writes to a hardcoded
  `/Users/vijay/submarine-explorer/...` path and has no argparse. Even
  `--help` crashes on this machine.

## Next

Phase C:

- C1: globe mission select.
- C3: environment presets.
- C4a–d: content packs for the other 12 landmarks, using the Titanic pack as
  the template (README "How to add a landmark mission").
- C5: settings and accessibility, which will also close the reduce-motion,
  captions and rebind-UI gaps.
- C6: CI and Pages deploy, including the attribution check and pruning the
  unused tile variants from `dist/`.

C2 is done. Phase D follows the Phase C playtest. The owner decides when to
commit A + B + C2.
