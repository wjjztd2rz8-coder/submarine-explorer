# Work packages — copy-pasteable subagent briefs

How to use: pick a package, paste the "Common preamble" followed by the package brief into a fresh Opus or Sonnet session (or an Agent-tool subagent). Packages in the same phase may run concurrently because they own disjoint files. Read `plan/MASTER-PLAN.md` §6 for the phase overview and model recommendations.

For OpenAI sessions, the owner maps Fable to **GPT-6 Astra** and both Opus and
Sonnet to **GPT-6 Sol**. Use Sol subagents for the briefs below and have the
orchestrator review and iterate on each completed package. The original model
labels are retained for Claude sessions.

---

## Common preamble (paste at the top of every brief)

```
You are working on Submarine Explorer, a browser game (Vite + TypeScript strict + Three.js, vitest, Playwright) that renders real ocean-floor bathymetry and lets players pilot a research submersible to real landmarks. Repo: /home/vijay/submarine-explorer.

Before writing code read, in order: README.md, CONTRIBUTING-AGENTS.md, docs/architecture.md, docs/tile-format.md, and plan/MASTER-PLAN.md sections 1–5. Respect the design pillars (real data, depth is felt, discovery is the reward, learn by doing, runs in a browser).

Rules:
- Only edit files your package OWNS (listed below) plus new files under those paths. If you must touch a shared file (Config.ts, main.ts, package.json), keep the change minimal and describe it in your final report.
- Do not change docs/tile-format.md or the tile binary layout.
- All tunables go in src/core/Config.ts with a comment and a sensible default.
- Keep dependencies minimal; any new npm package needs a one-line justification in your report and a row in ATTRIBUTION.md if it ships to the client.
- Every asset you add (model, texture, audio, image) needs a row in ATTRIBUTION.md with source URL and licence. CC0 or CC-BY only.
- Finish with: npm run build (zero TS errors), npm test, npm run test:e2e, and view the resulting screenshot yourself to confirm it looks right. Do not report done with a black or empty frame.
- Do not git commit unless the owner asked for it in this session.
- Final report (under 400 words): what you built, how to see it (URL params, keys), what you verified and how, anything stubbed, deviations from the brief.
```

---

## Phase A — Make it beautiful

### A1 · Terrain detail, materials and LOD (Opus)

OWNS: `src/world/Terrain.ts`, `src/world/TerrainChunk.ts` (new), `src/shaders/terrain.vert.glsl`, `src/shaders/terrain.frag.glsl` (new), `tests/unit/terrain*.test.ts`, `docs/terrain.md` (new).

Problem: source bathymetry cells are 50–450 m. At 5 m altitude the mesh reads as a faceted low-poly blanket. Goal: the seabed looks continuous and material-rich at all altitudes without lying about the large-scale shape.

Deliver:

1. Procedural detail displacement in the vertex shader (or CPU-side on chunk build, your call; justify): 2–3 octaves of value/simplex noise, amplitude ≤ 15 % of local cell size, scaled up on steep slopes (rocky) and down on flat abyssal plain (sediment). Deterministic from world position so chunks match at seams. Provide a `detailStrength` tunable (0 disables it; keep 0 as the "pure data" mode for the settings screen).
2. Triplanar PBR-ish material: sediment (flat, deep), rock/basalt (slope > 25°), lighter sand (shallow < 200 m). Use CC0 textures from `docs/assets.md` (ambientCG/Poly Haven) at 1K, or procedural if download is problematic. Normal-map detail from a tiling noise normal texture.
3. Chunk LOD: 3 levels via index-buffer skipping (full, ½, ¼) chosen by camera distance; skirts or stitching so cracks are not visible. Frustum culling per chunk (Three handles it if bounding spheres are correct; verify).
4. Keep `sampleHeight` returning the _data_ height plus the same procedural detail term (so collision matches what the player sees). Add unit tests that `sampleHeight` matches vertex positions within tolerance at chunk corners and centres.
5. Performance: log vertex count and draw calls to the debug GUI. Target ≥ 60 fps on the Titanic tile at 1080p on Apple M-series; document the measurement.

Acceptance: screenshots at 5 m, 50 m, 500 m altitude over the Titanic and Monterey tiles show no visible cell grid and no cracks; tests green; `docs/terrain.md` explains the detail layer and how to tune or disable it.

### A2 · Underwater atmosphere and post-processing (Opus)

OWNS: `src/world/Water.ts`, `src/render/` (new: `Atmosphere.ts`, `PostStack.ts`, `MarineSnow.ts`, `Headlights.ts`), `src/shaders/post*.glsl`, `docs/atmosphere.md` (new).

Deliver:

1. Depth-driven light model: ambient colour/intensity and fog colour/density as piecewise functions of camera depth (surface 0–20 m bright blue-green; 20–200 m dimming teal; 200–1,000 m near-black blue; > 1,000 m black). Values in Config. Expose a "depth band" event on the EventBus for audio/UI.
2. Sub headlights: two spot lights plus a soft cone sprite/volume fake; toggle with L; shadow optional if cheap.
3. Marine snow: GPU points field that follows the camera and wraps, density and drift by depth band.
4. Caustics on terrain above 60 m (animated texture projection or procedural); fades out with depth.
5. Post stack (pmndrs `postprocessing` or hand-rolled): vignette, subtle chromatic aberration, colour grading LUT per band, optional god rays above 60 m. Must be togglable for performance.
6. Surface: simple animated water plane seen from below with Fresnel, only rendered when camera depth < 100 m.

Acceptance: `?tile=titanic&depth=10`, `&depth=300`, `&depth=3800` (add the query param to spawn the sub at that depth) produce three clearly distinct screenshots saved to `docs/img/atmosphere-*.png`; frame time overhead of the post stack ≤ 3 ms on M-series; `docs/atmosphere.md` documents bands and tunables.

### A3 · Submarine feel and input (Opus)

OWNS: `src/sub/*`, `src/core/Input.ts`, `tests/unit/sub*.test.ts`, `docs/playtest-A3.md` (new).

Deliver:

1. Tune arcade physics: thrust curve, quadratic drag, angular damping, pitch limits ±45°, banking roll on yaw (visual only), ballast with inertia, neutral buoyancy trim. Add "sim speed" multiplier (1×, 2×, 3×) surfaced later in settings.
2. Camera rig: chase cam with positional lag and look-ahead, collision with terrain (camera never clips below seabed), first-person periscope/viewport toggle (C), free orbit for photo mode hook.
3. Input: keyboard, mouse (optional mouse-look in FP), gamepad (standard mapping), remappable action map serialised to localStorage. Provide `Input.actions` abstraction so UI can show bindings.
4. Collision feedback: hull stress value 0–1 from impact speed and crush-depth proximity; emit events; camera shake; expose to HUD and audio.
5. Crush depth: per hull class table in Config; warning at 90 %, emergency blow at 100 % (sub rises automatically, controls locked 5 s), mission-restart hook event.

Acceptance: `docs/playtest-A3.md` lists 10 manual checks (e.g. "full thrust reaches terminal velocity within 8 s", "nose-down into seabed pushes out without tunnelling at 6 m/s") and each is either automated in vitest or verified by you in a Playwright script with scripted key presses; tests green.

### A4 · Audio system (Sonnet)

OWNS: `src/audio/*`, `public/audio/*`, `ATTRIBUTION.md` (rows), `docs/audio.md` (new).

Deliver:

1. WebAudio graph: master → depth low-pass (cutoff falls with depth) → buses (ambient, sub, ui, sonar). Unlock on first user gesture.
2. Sonar ping: synthesised or CC0 sample; echo returns with delay = 2·range/1500 s to the nearest terrain/POI along the beam (use Terrain.sampleHeight ray-march); volume by range. Pressing Tab or the ping key triggers it.
3. Ambient beds by depth band (crossfade), thruster loop pitch-modulated by throttle, ballast hiss, hull creaks triggered by hull-stress events, collision thud, discovery chime.
4. Sources: CC0 from freesound/NOAA PMEL per `docs/assets.md`; convert to OGG/Opus ≤ 200 KB each (ffmpeg may be absent; if so, keep WAV under 300 KB or synthesise).
5. Subtitle/caption events for each cue (for accessibility package C5).

Acceptance: unit test for echo delay maths; manual check list in `docs/audio.md`; all files attributed; no audio autoplay errors in console.

### A5 · Art direction and mood board (Sonnet)

OWNS: `docs/art-direction.md`, `docs/img/moodboard/*`.

Deliver: palette per depth band (hex values), fog/lighting reference images (public-domain NOAA Ocean Exploration stills, cited), prop style guide (realistic-leaning, restrained), HUD visual language (monospace, thin lines, amber warnings, cyan sonar), typography choice from `docs/assets.md`, do/don't list. Include a one-page summary that A1/A2 can follow without reading the rest.

---

## Phase B — Vertical slice: Titanic

### B1 · Scan, discovery, field guide, debrief (Opus)

> **Shipped 2026-09-22** — `docs/discovery.md`. Scan key is G (not F); contracts: `plan/PHASE-B-CONTRACTS.md`.

OWNS: `src/game/` (new: `Scanner.ts`, `DiscoveryStore.ts`, `Objectives.ts`), `src/ui/FieldGuide.ts`, `src/ui/Debrief.ts`, `tests/unit/game*.test.ts`, `tests/e2e/discovery.spec.ts`.

Deliver: scan beam (hold F while within range and facing the POI; 3–5 s progress ring; interrupted if you look away), POI definition schema (`data/landmarks/<id>/pois.json`: id, name, lat, lon, depth, radius, kind, guide_entry), `DiscoveryStore` in localStorage with schema version + migration, field-guide overlay (DOM; entries with title, image, text, sources, "reconstruction" badge when applicable), debrief screen (distance, max depth, time, discoveries, "new entries"). e2e test: load Titanic, teleport near bow POI via debug param, scan, reload, assert persisted.

### B2 · Titanic site content (Sonnet)

> **Shipped 2026-09-22** — `data/landmarks/titanic/` (`guide.json` rather than `guide.md`; also `mission.json`), sources in `sources.md`.

OWNS: `data/landmarks/titanic/*` (`pois.json`, `props.json`, `guide.md`, `sources.md`).

Deliver: bow and stern positions (~600 m apart, stern ~ south-east of bow; verify against published survey maps and cite), debris-field POIs (boilers, the "big piece" area, bollards), hazards, memorial note, field-guide entries with sources, secondary objectives. Placeholder prop definitions for hull sections using procedural boxes at real dimensions and heading until B4 lands. Everything with URLs; `confidence` field per POI.

### B3 · Mission flow (Sonnet)

> **Shipped 2026-09-22** — `docs/missions.md`. Missions start at 3× sim speed to meet the 10-minute budget.

OWNS: `src/game/Mission.ts`, `src/game/MissionRouter.ts`, `src/ui/Briefing.ts`, `src/ui/MissionSelect.ts` (extend), `tests/e2e/mission.spec.ts`.

Deliver: `?mission=<landmark-id>` router loading tile + POIs + props; briefing card (facts, depth, hazards, controls reminder); surface spawn and descent; objectives HUD; completion condition (primary POI scanned) → debrief → back to select; restart. Playable start to finish in under 10 minutes at 2× sim speed.

### B4 · Prop pipeline (Opus)

> **Shipped 2026-09-22** — `docs/props.md`. No CC0 wreck GLB was found; `procedural:hull-block` stands in.

OWNS: `src/world/Props.ts`, `src/world/PropLoader.ts`, `tools/validate_props.py`, `docs/props.md`, `public/assets/models/*`.

Deliver: GLB loading (GLTFLoader + Draco/Meshopt decoders from three examples), `props.json` schema (id, model, lat, lon, depth or `snap_to_seabed`, heading_deg, scale, lod_distance, collision: none|sphere|box), placement debug tool (`?debugProps=1`: click to move, print JSON), far-distance impostor (sprite) swap, frustum/distance culling. Import one CC0 rock and one CC0 wreck/hull piece from `docs/assets.md`, attribute them, and place them on the Titanic tile at real coordinates.

---

## Phase C — World tour

### C1 · Globe mission select (Opus)

OWNS: `src/ui/Globe.ts`, `src/ui/MissionSelect.ts`, `public/assets/globe/*`. Natural Earth II or Blue Marble texture (public domain, ≤ 4K), lat/lon → sphere placement of landmark pins from `data/landmarks.json`, hover card (name, depth, type, "tile available" badge from `data/tiles/index.json`), click → mission. Orbit controls with inertia, auto-rotate idle. Bathymetric shading (ETOPO-derived low-res) optional.

### C2 · Tile batch fetch and compression (Sonnet)

> **Shipped 2026-09-22 (early, with Phase B)** — `docs/tiles-inventory.md`, `docs/tile-format.md`. No `.br` yet (brotli CLI absent).

OWNS: `tools/fetch_all.py`, `tools/compress_tiles.py`, `data/tiles/*` (new tiles), `docs/tiles-inventory.md`. Fetch tiles for the Tier-2 landmark list (see `docs/landmarks.md` proposal; owner may override), choose per-landmark resolution to keep each ≤ 8 MB, generate `index.json`, add optional 16-bit quantised variant + brotli, report total size. Respect GMRT rate limits (sleep between requests; cache raw `.asc` in gitignored `.cache/gmrt-raw/`).

### C3 · Environment presets by landmark type (Opus)

OWNS: `src/world/presets/*`, `docs/presets.md`. Vent field: chimney smoke particles, shimmer refraction, warm point lights; brine pool: reflective layer at a fixed depth with mist; canyon: current force field pushing the sub, sediment plumes; reef (shallow): light shafts, brighter palette; trench: extreme darkness, pressure creaks more frequent. Preset chosen from landmark `type` with per-landmark overrides.

### C4a–C4d · Landmark content packs (Sonnet, one agent per pack)

OWNS: `data/landmarks/<id>/*` for 3 landmarks each. Same deliverables as B2. Suggested packs (adjust to owner picks): (a) Challenger Deep, Lost City, Monterey Canyon; (b) Endurance, Axial Seamount, Hudson Canyon; (c) Kamaʻehuakanaloa, Beebe vent field, Great Blue Hole; (d) Bismarck, Hunga Tonga caldera, Blake Plateau coral mounds. Species lists from an offline OBIS export (`tools/obis_export.py`, write it in pack (a) and reuse).

### C5 · Settings, save, accessibility (Sonnet)

OWNS: `src/ui/Settings.ts`, `src/core/Save.ts`, `docs/accessibility.md`. Settings: graphics tier (post stack, detail strength, LOD bias), sim speed, key remap UI, colour-blind sonar palettes, motion reduction (no camera shake/banking), captions for audio cues, reset progress. Lighthouse/axe accessibility ≥ 90 on menus.

### C6 · CI and deployment (Sonnet)

OWNS: `.github/workflows/*`, `docs/deploy.md`, `tools/check_attribution.py`. Build + unit tests + Playwright on push; deploy `dist/` to GitHub Pages on main; cache headers for `/data/tiles`; attribution check fails CI for unattributed files under `public/assets` or `public/audio`.

---

## Cross-cutting

### QA pass (Sonnet, end of each phase)

Run all tests, play every available mission via Playwright with scripted inputs, capture screenshots, compare against previous phase's set, list regressions and rough edges in `plan/QA-<phase>.md` ranked by severity. Do not fix; report.

### Docs reconciliation (Sonnet, end of each phase)

Diff README/architecture/CONTRIBUTING against the code; update; list stale statements removed. Keep `plan/MASTER-PLAN.md` §6 tables in sync with what shipped.
