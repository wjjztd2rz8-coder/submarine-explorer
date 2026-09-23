# Submarine Explorer — Master Plan

Status: v0.1 draft, 2026-09-16. Author: Fable 5.1 (planning pass). Intended readers: the project owner and the Opus/Sonnet subagents that will build the game.

OpenAI model mapping (owner instruction, 2026-09-22): **GPT-6 Astra** takes the
Fable planning/orchestration role; **GPT-6 Sol** takes every Opus and Sonnet
implementation, QA, and documentation role. Original Claude briefs remain
below. Consult `plan/STATUS.md` for the latest verified implementation state.

Companion documents (written in this same planning pass):

| Doc                                                                                  | What it holds                                                        |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `docs/data-sources.md`                                                               | Verified bathymetry datasets, APIs, licenses, tested fetch commands  |
| `docs/landmarks.md` + `data/landmarks.json`                                          | 50–70 real landmarks with coordinates, depths, facts, gameplay hooks |
| `docs/assets.md`                                                                     | 3D models, textures, audio, imagery, fonts, npm libs, licensing plan |
| `docs/architecture.md`, `docs/tile-format.md`, `README.md`, `CONTRIBUTING-AGENTS.md` | Technical framework produced by the scaffold agent                   |
| `plan/WORK-PACKAGES.md`                                                              | Copy-pasteable subagent briefs (this plan's Section 6, expanded)     |
| `plan/OPEN-QUESTIONS.md`                                                             | Decisions the owner must make                                        |

---

## 1. Vision

**One sentence:** A calm, awe-driven exploration game where you pilot a research submersible over the _real_ ocean floor and discover real landmarks — the Titanic debris field, Challenger Deep, the Lost City vents, Monterey Canyon — rendered from genuine bathymetric survey data with real depths, real distances and real facts.

**Reference feel:** Subnautica's atmosphere and sense of depth dread, Outer Wilds' curiosity-driven discovery, Google Earth's "it's really there" credibility, and Abzû's serenity. It is _not_ a combat game and _not_ a survival crafting game (see Section 2 for the tiers where light survival mechanics enter).

**Design pillars** (every feature must serve at least one; use these to settle arguments):

1. **It's real.** Terrain, depths, coordinates, landmark positions and facts come from cited datasets. Where we fabricate (a wreck mesh, a vent chimney model, marine life placement), we say so in the field guide.
2. **Depth is felt.** Light, colour, sound, pressure warnings, and speed all change with depth. 4,000 m must feel different from 40 m.
3. **Discovery is the reward.** Sonar returns, silhouettes in the fog, a debris trail leading somewhere. Landmarks are found, not fast-travelled to (except via the mission map).
4. **Learn by doing.** Every landmark has a field-guide entry unlocked by scanning it. No quizzes, no lectures.
5. **Runs in a browser.** No install, shareable by URL, works on an integrated GPU laptop at 60 fps.

## 2. Scope tiers

Build in this order. Each tier is shippable on its own.

### Tier 0 — Foundation (scaffold agent, this pass)

Real tile loads, chunked terrain renders, arcade submarine flies, HUD shows depth/heading/altitude, sonar minimap, mission select lists tiles. Tests and a Playwright screenshot pass.

### Tier 1 — Vertical slice: "Titanic dive" (target: first milestone)

One landmark polished end-to-end. Descent from the surface, darkness by 200 m, headlights on, seabed at ~3,800 m, sonar contact, find the bow, scan it, field-guide unlock, ascend. Establishes the art direction, the audio direction, and the scan/discovery loop. Everything later is "more of this."

### Tier 2 — World tour (8–12 landmarks)

Mission select on a 3D globe (Natural Earth texture). Landmarks across all types: trench, vent field, seamount, canyon, wreck, reef, brine pool. Per-type environment presets (vent smoke particles, brine-pool shimmer, canyon currents). Field guide with imagery. Save progress in `localStorage`.

### Tier 3 — Systems depth

Battery/oxygen as a _pacing_ mechanism (not death spiral), sample collection, marine life encounters from OBIS-informed spawn tables, photo mode, ROV deployment from the sub for tight spaces (wreck interiors), currents from ocean model data, day/night at the surface, optional VR later.

### Tier 4 — Stretch

Procedural streaming of _any_ point on Earth from GMRT/GEBCO (type coordinates, dive there), multiplayer spectate, user-made missions, mobile touch controls.

## 3. Core gameplay loop (Tier 1+)

```
Mission select (globe) → Briefing card (real facts, depth, hazards)
   → Surface start → Dive (ballast) → Navigate by sonar + compass + landmark bearings
   → Contact (sonar blip, fog silhouette) → Approach & Scan (hold beam on target 3–5 s)
   → Field-guide unlock + optional secondary objectives (debris field, second vent, canyon wall)
   → Ascend or continue → Debrief (distance travelled, max depth, discoveries)
```

Scan targets are placed in `data/landmarks.json` (primary) and per-tile `points_of_interest` (secondary, added by content agents). Discovery state persists per browser.

**Controls (keyboard default; gamepad mapped):** W/S thrust, A/D yaw, Q/E or mouse pitch, Space/Shift ballast up/down, L lights, F scan, Tab sonar full-screen, M mission map, C camera toggle.

**Submarine model (arcade, tunable in `Config`):** max speed 3 m/s cruise / 6 m/s sprint (real research subs do ~1–2 kn; we exaggerate ×2–3 for fun and say so in settings as "sim speed"), turn rate 30°/s, vertical rate 1.5 m/s, crush depth per hull class (Class A: 1,000 m; Class B: 4,500 m; Class C: 11,000 m — unlocked by discoveries, gating trench content). Terrain collision is a soft push-out with hull-stress feedback; there is no game-over from collision, only from exceeding crush depth (auto-emergency-blow, mission restart).

## 4. Data & content strategy

**Bathymetry (terrain):** GMRT GridServer is the primary source because it serves arbitrary bounding boxes on demand in ESRI ASCII (no GDAL needed) and merges the best available multibeam with GEBCO fill. Tiles are fetched offline by `tools/fetch_tile.py`, converted to `heightmap.bin` (Float32) + `meta.json`, and committed under `data/tiles/`. GEBCO 2025 and ETOPO 2022 are fallbacks and the source for the low-res globe. See `docs/data-sources.md` for verified specifics and observed resolutions.

**Resolution reality check.** Open bathymetry is coarse relative to game scale: GMRT multibeam is ~50–100 m per cell where surveys exist; GEBCO fill is ~450 m. A wreck like Titanic (269 m long) is _one to three cells_. Therefore:

- Terrain gives the _setting_ (the canyon, the trench wall, the seamount flank). It will not give the wreck. Wrecks, chimneys, and reefs are **placed 3D props** at their real coordinates on top of the real terrain.
- Terrain must be **detail-augmented** at render time: a procedural noise displacement layer (2–3 octaves, amplitude scaled by local slope) plus normal-map detail, so 100 m cells don't read as a low-poly blanket at 5 m altitude. This is a Tier 1 work package and the single most important visual task.
- Where genuine high-res site data exists (some MBARI/MGDS/NOAA surveys at 1–25 m), a per-landmark override tile can be layered in. Track in `docs/data-sources.md` §7.

**Landmarks:** `data/landmarks.json` is the single source of truth. Schema is documented in `docs/landmarks.md`. Content agents add `points_of_interest`, field-guide text, and prop placements per landmark in `data/landmarks/<id>/` (a folder per landmark, keeping the main file small).

**Props (wrecks, vents, life):** Start with procedural/placeholder meshes (the scaffold already uses primitives for the sub). Replace with CC0/CC-BY GLBs listed in `docs/assets.md`. Every asset gets a row in `ATTRIBUTION.md` at the moment it is added; a CI check fails the build if a file in `public/assets/` lacks one.

**Auxiliary data (Tier 2–3):** World Ocean Atlas for temperature-by-depth readout; OBIS for species spawn tables per landmark (pre-baked into JSON offline, never live-queried by the game); HYCOM/OSCAR-derived current vectors as a simple per-tile field.

## 5. Technical architecture (summary; authoritative detail in `docs/architecture.md`)

- **Stack:** Vite + TypeScript (strict) + Three.js, no UI framework. vitest for unit tests, Playwright for visual smoke tests. Python 3.9 stdlib for the offline data pipeline. Zero native dependencies so any agent or machine can build it.
- **Coordinate convention:** X east, Y up (sea level 0, terrain negative), Z south, metres, origin at tile centre. `src/util/geo.ts` converts to and from lat/lon using tile meta.
- **Terrain:** chunked displaced planes (128×128 cells per chunk) with per-vertex depth colour. Tier 1 adds: procedural detail displacement in the vertex shader, triplanar material, distance-based chunk LOD (skip-index buffers), and frustum culling. Tier 4 adds streaming of neighbouring tiles.
- **Loop:** fixed 60 Hz physics, variable render. All tunables live in `src/core/Config.ts` and are exposed through a debug GUI (`?debug=1`).
- **Rendering mood:** exponential fog whose colour and density are functions of depth (blue-green near surface → black below 1,000 m); sub headlights as spotlights with volumetric-ish cone sprite; marine-snow particle field around the camera; post-process: vignette, slight chromatic aberration, caustics only above ~60 m.
- **Audio:** WebAudio graph with depth-driven low-pass filter; sonar ping with range-scaled echo delay (echo time = 2·distance/1,500 m/s — a real, teachable detail).
- **Persistence:** `localStorage` JSON `{discoveries, hull_class, settings}`; versioned with migrations.
- **Performance budget:** ≤ 4 M terrain vertices resident, ≤ 300 draw calls, ≤ 100 MB GPU memory, 60 fps on Apple M-series integrated GPU, 30 fps floor on 2019 Intel iGPU.
- **Build outputs:** static site; deployable to GitHub Pages / Cloudflare Pages / Netlify with no server. Tiles are static files (~2–8 MB each); Tier 2 adds gzip/brotli and optional 16-bit quantisation.

## 6. Work packages for subagents

Conventions for all packages: each is sized for one agent session; lists files it _owns_ (others must not edit them concurrently); has binary acceptance criteria; ends with `npm run build && npm test && npm run e2e` green and a screenshot in `tests/e2e/screenshots/`. Recommended model: **Opus** for rendering/physics/architecture packages, **Sonnet** for content, data, UI polish and docs. Packages within a phase can run in parallel; phases are sequential. Full copy-pasteable briefs are in `plan/WORK-PACKAGES.md`.

### Phase A — Make it beautiful (Tier 1 tech) — run in parallel

| #   | Package                                                                                                                                                                            | Model  | Owns                                                      | Done when                                                                                                              | Status                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A1  | Terrain detail & LOD: procedural displacement + normal detail in shader, triplanar seabed material (sand/silt/rock by slope+depth), chunk LOD, frustum culling                     | Opus   | `src/world/Terrain*.ts`, `src/shaders/terrain*`           | Titanic tile at 5 m altitude shows no visible cell grid; ≥ 60 fps on M-series; unit tests still pass                   | shipped — `docs/terrain.md` (fps not yet measured)                         |
| A2  | Underwater atmosphere: depth-driven fog & colour grading, headlight cone, marine snow, caustics above 60 m, post-process stack                                                     | Opus   | `src/world/Water.ts`, `src/render/*`, `src/shaders/post*` | Screenshots at 10 m / 300 m / 3,800 m are visibly distinct and match a reference mood board in `docs/art-direction.md` | partial — `docs/atmosphere.md` (no aberration, god rays, Fresnel lid, LUT) |
| A3  | Submarine feel: tuned physics, camera rig with lag & banking, control remap UI, gamepad, collision feedback (hull stress meter, camera shake, audio hook)                          | Opus   | `src/sub/*`, `src/core/Input.ts`                          | Playtest script in `docs/playtest-A3.md` passes; physics unit tests extended                                           | shipped — `docs/playtest-A3.md` (remap UI is C5)                           |
| A4  | Audio system: WebAudio graph, depth low-pass, sonar ping with physically-timed echo, ambient beds per depth band, thruster/ballast SFX (placeholders or CC0 from `docs/assets.md`) | Sonnet | `src/audio/*`, `public/audio/*`, `ATTRIBUTION.md`         | Ping echo delay equals 2d/1500 within 5 %; all files attributed                                                        | shipped — `docs/audio.md` (all synthesised; chime not wired)               |
| A5  | Art direction doc + mood board: palettes per depth band, prop style guide, HUD visual language, reference images (public domain NOAA)                                              | Sonnet | `docs/art-direction.md`                                   | Reviewed by owner                                                                                                      | shipped — `docs/art-direction.md`                                          |

### Phase B — Vertical slice content: Titanic

| #   | Package                                                                                                                                                                                      | Model  | Owns                                                      | Done when                                                                                  | Status                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| B1  | Scan & discovery system: scan beam, progress ring, `DiscoveryStore` (localStorage, versioned), field-guide overlay UI, debrief screen                                                        | Opus   | `src/game/*`, `src/ui/FieldGuide.ts`, `src/ui/Debrief.ts` | Scanning a POI persists across reload; e2e test covers it                                  | shipped — `docs/discovery.md`                                        |
| B2  | Titanic site content: bow/stern/debris POIs at surveyed offsets, placeholder wreck props (procedural hull blocks) at real orientation, field-guide text with citations, secondary objectives | Sonnet | `data/landmarks/titanic/*`                                | Loads without errors; facts cite sources; owner review                                     | shipped — `data/landmarks/titanic/sources.md` (owner review pending) |
| B3  | Mission flow: surface start, descent sequence, briefing card, mission complete conditions, restart; `?tile=` → mission router                                                                | Sonnet | `src/game/Mission*.ts`, `src/ui/Briefing.ts`              | Full loop playable start to debrief in < 10 min                                            | shipped — `docs/missions.md` (no crush-depth restart)                |
| B4  | Prop pipeline: GLB loading with Draco/Meshopt, LOD/impostor for far props, placement authoring format `props.json`, in-game placement debug tool                                             | Opus   | `src/world/Props.ts`, `tools/validate_props.py`           | A CC0 wreck/rock GLB from `docs/assets.md` renders at a real coordinate with correct scale | shipped — `docs/props.md` (no CC0 wreck GLB; procedural hull)        |

### Phase C — World tour (Tier 2) — high parallelism, one Sonnet agent per 2–3 landmarks

> Status 2026-09-23: Phase C implementation is in final close-out.
> Automated QA is recorded in `plan/QA-C.md` and its addenda. The owner
> playtest and public deployment remain pending; M3 is not yet fully accepted.
> Live status and verification: `plan/STATUS.md`.

| #       | Package                                                                                                                                          | Model     | Done when                                              | Status                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1      | Globe mission select: Three.js sphere with Natural Earth texture, landmark pins from `landmarks.json`, hover cards, tile-availability badges     | Opus      | Selecting a pin launches its mission                   | shipped — `docs/globe.md`, `tests/e2e/globe.spec.ts`; 68 pins, 13 mission-state, no console errors (QA-C)                                                         |
| C2      | Tile batch fetch: fetch all Tier-2 landmark tiles via pipeline, choose resolutions, add `tools/fetch_all.py`, size report, brotli precompression | Sonnet    | `data/tiles/index.json` lists ≥ 10 tiles ≤ 80 MB total | shipped — `docs/tiles-inventory.md` (no `.br` yet)                                                                                                                |
| C3      | Environment presets per landmark type (vent smoke, brine-pool shimmer layer, canyon current push, reef light shafts)                             | Opus      | Each preset has a screenshot in docs                   | shipped — `docs/presets.md`; all 8 presets reachable and visually distinct (QA-C)                                                                                 |
| C4a–C4d | Landmark content packs (3 landmarks each): POIs, props, field guide, hazards, species list from OBIS export                                      | Sonnet ×4 | Each landmark playable start → debrief                 | shipped — all 13 landmarks playable start→debrief, `species.json` for all 13 (titanic added in the QA-C fix pass)                                                 |
| C5      | Save/settings/accessibility: settings screen, key remap, colour-blind sonar palette, motion-reduction toggle, subtitles for audio cues           | Sonnet    | Axe/lighthouse a11y pass ≥ 90                          | shipped — `docs/settings.md`, `tests/e2e/settings.spec.ts`; O opens/freezes, reduce-motion and deuteranopia palette persist across reload, captions render (QA-C) |
| C6      | Deployment: GitHub Actions build+test, Pages deploy, tile CDN caching headers, `ATTRIBUTION.md` check                                            | Sonnet    | Public URL live                                        | prepared — project-base browser test passes; not published (owner decision)                                                                                       |

### Phase D — Systems (Tier 3), scheduled after C playtest

Battery/oxygen pacing, samples & inventory, marine life agents (boids + species tables), ROV mode, photo mode, currents field, surface day/night. Proposed briefs are in `plan/PHASE-D-BRIEFS.md`, informed by Phase C QA. The owner confirmed that Phase C has not yet been playtested; refine the briefs after that feedback and write contracts before any Phase D code.

### Ongoing / cross-cutting

- **QA agent (Sonnet, after each phase):** runs the full test suite, plays each mission via Playwright scripted inputs, files findings in `plan/QA-<phase>.md`.
- **Docs agent (Sonnet, end of each phase):** reconciles README/architecture with reality.

## 7. Risks & mitigations

| Risk                                                           | Impact            | Mitigation                                                                                                                          |
| -------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Open bathymetry too coarse; game looks like a low-poly blanket | Pillar 1 & 2 fail | A1 procedural detail layer; props carry the close-up; honest "survey resolution" readout in HUD as a feature                        |
| GMRT rate limits / outages / terms change                      | Pipeline blocked  | Tiles are fetched offline and committed; fallback chain GMRT → GEBCO sub-grid → ETOPO; cache raw `.asc` in `data/raw/` (gitignored) |
| Tile sizes bloat repo & page load                              | Slow first load   | 16-bit quantisation + brotli (C2); Git LFS if `data/` > 200 MB; lazy-load per mission                                               |
| Three.js performance on iGPU with 4 M verts                    | Pillar 5 fails    | Chunk LOD (A1), hard vertex budget in Config, Playwright perf assertion on frame time                                               |
| Asset licensing mistakes                                       | Legal / takedown  | CC0 first; `ATTRIBUTION.md` enforced by CI; no Sketchfab "standard license" assets                                                  |
| Factual errors in field guide                                  | Credibility       | Every fact carries a URL; `confidence` field; owner review gate on content packs                                                    |
| Subagents diverge on conventions                               | Integration pain  | `CONTRIBUTING-AGENTS.md`, file ownership per package, `docs/tile-format.md` as contract, tests as guardrails                        |
| Scope creep into survival/crafting                             | Loses focus       | Pillars + tiers; Phase D gated behind C playtest                                                                                    |

## 8. Milestones (calendar-free; sequence only)

1. **M0 Foundation** — scaffold green, two real tiles load. _(this pass)_
2. **M1 Looks like the ocean** — Phase A merged; screenshot set approved.
3. **M2 Titanic dive** — Phase B; owner completes a mission start to debrief.
4. **M3 World tour** — Phase C; ≥ 10 landmarks, public URL.
5. **M4 Systems** — Phase D as scoped after M3.

## 9. What the owner must decide (summary; full list in `plan/OPEN-QUESTIONS.md`)

Default assumptions used in this plan are marked **(default)**. If you are happy with all defaults, no answers are needed to start Phase A.

1. Engine: web/Three.js **(default)** vs Godot 4 vs Unity.
2. Tone: serene educational exploration **(default)** vs survival tension vs arcade.
3. Realism of sub speed: ×2–3 exaggeration with a "sim speed" setting **(default)** vs true speeds.
4. Fabrication policy for wrecks/props: placed props flagged in field guide **(default)** vs terrain only.
5. Target platforms: desktop browser first **(default)**; mobile and VR later?
6. Hosting: GitHub Pages **(default)**; repo public or private?
7. Licensing: game code MIT **(default)**; content CC-BY-SA?
8. Project name (working title "Submarine Explorer"; folder `~/submarine-explorer`).
9. Budget/model mix: Opus for A1–A3, B1, B4, C1, C3; Sonnet elsewhere **(default)**.
10. Which 8–12 landmarks for Tier 2 (a proposed list is in `docs/landmarks.md` once the catalog agent finishes).
