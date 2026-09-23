# Submarine Explorer

A browser submarine simulator that flies over **real ocean-floor bathymetry**,
downloaded from the [GMRT](https://www.gmrt.org) Global Multi-Resolution
Topography synthesis. No invented terrain: what you see is measured seafloor,
plus a small procedural detail layer (`docs/terrain.md`) and placed props that
the field guide marks as reconstructions.

## Dive sites

Thirteen GMRT tiles (one per Tier-2 landmark, tile id = landmark id) plus a
synthetic stand-in ship in `data/tiles/`. Full table with bboxes, cell sizes,
file sizes, multibeam coverage and caveats: [`docs/tiles-inventory.md`](docs/tiles-inventory.md).

| Tile                   | Site                                    | Grid      | Depth range m  |
| ---------------------- | --------------------------------------- | --------- | -------------- |
| `titanic`              | RMS Titanic wreck, North Atlantic       | 548×546   | -3978 … -3339  |
| `challenger-deep`      | Challenger Deep, Mariana Trench         | 911×911   | -10931 … -5936 |
| `lost-city`            | Lost City hydrothermal field            | 367×310   | -5002 … -724   |
| `monterey-canyon`      | Monterey Canyon, California             | 820×638   | -2333 … +265   |
| `endurance`            | Endurance wreck, Weddell Sea            | 1202×545  | -3096 … -2915  |
| `axial-seamount-ashes` | Axial Seamount / ASHES vent field       | 1050×727  | -2853 … -1392  |
| `hudson-canyon`        | Hudson Canyon (shelf break, upper)      | 1093×910  | -1683 … -68    |
| `kamaehuakanaloa`      | Kamaʻehuakanaloa (Lōʻihi) Seamount      | 580×547   | -5027 … -975   |
| `beebe-vent-field`     | Beebe vent field, Cayman Trough         | 579×546   | -6575 … -2087  |
| `great-blue-hole`      | Great Blue Hole (hole below grid res.)  | 574×547   | -3643 … +98    |
| `bismarck`             | Bismarck wreck site                     | 825×547   | -5009 … -3813  |
| `hunga-tonga-caldera`  | Hunga Tonga–Hunga Haʻapai (pre-2022)    | 586×546   | -1951 … +82    |
| `blake-plateau-corals` | Blake Plateau coral mounds              | 1202×1201 | -960 … -580    |
| `demo-synthetic`       | synthetic, not a landmark (offline use) | 384×384   | -4367 … -3072  |

Cells are ~40–60 m (22 m E-W on `endurance`). `great-blue-hole` and
`hunga-tonga-caldera` do not show the feature they are named for; see the
inventory. One site, `titanic`, has a full mission (`?mission=titanic`).

## Setup

Requires Node 22.12+ (vitest 5) and Python 3.9+ (standard library only — no
numpy, no GDAL).

```bash
npm install
npx playwright install chromium     # only needed for the e2e tests
npm run dev                          # http://localhost:5173
```

The float32 heightmaps and `heightmap16.bin` variants are in the repo; the
`.gz`/`.br` copies and the raw download cache (`.cache/gmrt-raw/`) are
gitignored. To regenerate tiles:

```bash
python3 tools/fetch_all.py --skip-existing     # every Tier-2 landmark missing a tile
python3 tools/compress_tiles.py --quant16      # .gz (+ .br if brotli is on PATH) and heightmap16.bin
```

If GMRT is unreachable, generate a stand-in so the engine still runs:

```bash
python3 tools/make_synthetic_tile.py --id demo-synthetic --cols 384 --rows 384
```

## Commands

| Command                           | What it does                                                           |
| --------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server with HMR on :5173                                      |
| `npm run build`                   | type-check (`tsc --noEmit`) then production build to `dist/`           |
| `npm run preview`                 | serve `dist/` on :4173                                                 |
| `npm test`                        | vitest unit tests (`tests/unit/`)                                      |
| `npm run test:watch`              | vitest in watch mode                                                   |
| `npm run test:py`                 | Python unit tests (`tools/tests/`: parser, fetch_all, compress, props) |
| `npm run test:e2e`                | Playwright suite (`tests/e2e/`); needs a build first                   |
| `npm run typecheck`               | type-check only                                                        |
| `npm run format` / `format:check` | prettier over the whole repo (see CONTRIBUTING-AGENTS.md before use)   |

e2e environment variables (`playwright.config.ts`, `tests/e2e/smoke.spec.ts`):

| Variable     | Default | Effect                                                               |
| ------------ | ------- | -------------------------------------------------------------------- |
| `PW_PORT`    | `4173`  | port `vite preview` is started on and the tests browse to            |
| `PW_OUTDIR`  | `dist`  | build directory `vite preview` serves                                |
| `SMOKE_TILE` | —       | smoke-test only this tile instead of `titanic` and `monterey-canyon` |

When several people or agents run e2e in one checkout, give each its own
output and port so nobody serves a stale bundle:

```bash
npm run build -- --outDir dist-mine
PW_PORT=4190 PW_OUTDIR=dist-mine npm run test:e2e
```

The suite boots the built game, waits for `window.__gameReady`, asserts there
were no console errors, and writes screenshots to `tests/e2e/screenshots/`.

### Deploying

The site is a static build. `.github/workflows/ci.yml` runs every check above on
pushes and pull requests to `main` (`npm run ci` runs the same steps locally),
and `.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages after CI
passes on `main`. Set `VITE_BASE=/<repo>/` when building for a sub-path.
`npm run check:attribution` fails when a file under `public/assets/` or
`public/audio/` has no row in `ATTRIBUTION.md`. See
[`docs/deploy.md`](docs/deploy.md) for enabling Pages, custom domains, caching
and licences ([`LICENSE`](LICENSE), [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md)).

## Controls

Defaults from `defaultActions()` in `src/core/Input.ts`. Keys are rebindable
(`Input.rebind`, saved to `localStorage` key `subexplorer.bindings.v1`).

| Key                  | Action                                 | Gamepad (standard mapping) |
| -------------------- | -------------------------------------- | -------------------------- |
| `W` / `S` (or ↑ / ↓) | ahead / astern                         | left stick                 |
| `A` / `D` (or ← / →) | yaw to port / starboard                | left stick                 |
| `R` / `F`            | nose up / down                         | right stick                |
| `Space` / `Shift`    | blow ballast (rise) / flood (dive)     | A / B                      |
| `X`                  | boost                                  | right trigger              |
| `C`                  | chase / first-person camera            | Y                          |
| `P`                  | free-orbit photo mode                  | Start                      |
| `M`                  | sonar minimap                          | Back                       |
| `L`                  | headlights                             | X                          |
| `Q` (or `Tab`)       | sonar ping (echo delay = 2·range/1500) | left bumper                |
| `G` (hold)           | scan the POI you are facing            | right bumper               |
| `T`                  | sim speed 1× / 2× / 3×                 | D-pad up                   |
| `J`                  | field guide                            | —                          |
| `Enter`              | begin dive (mission briefing)          | —                          |
| `Esc`                | close field guide, then debrief        | —                          |

A gamepad takes over automatically whenever a stick or button is deflected.
Gamepad buttons are not rebindable yet.

## URL parameters

| Param                     | Effect                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `?tile=<id>`              | tile from `data/tiles/index.json`; default `Config.defaultTileId` (`titanic`), else the first indexed tile           |
| `?tier=low\|medium\|high` | graphics tier (terrain subdiv/LOD, post pass, snow, caustics). See `docs/terrain.md`, `docs/atmosphere.md`           |
| `?depth=<m>`              | spawn at that depth (clamped 40 m above the seabed); with `?at=`, the depth for that spawn                           |
| `?debugTerrain=1`         | log chunks, LOD counts, depth band, draw calls, fps and prop LOD counts once a second                                |
| `?mission=<id>`           | play `data/landmarks/<id>/mission.json`; implies its tile and content folder (`docs/missions.md`)                    |
| `?skipBriefing=1`         | with `?mission=`: start without the briefing card                                                                    |
| `?landmark=<id>`          | content folder (`data/landmarks/<id>/`) for POIs, guide and props; default the tile id (`_test` is the test fixture) |
| `?poi=<poiId>`            | spawn 80 m from that POI, facing it, at its depth (`docs/discovery.md`)                                              |
| `?at=lat,lon[,heading]`   | spawn at a coordinate, facing `heading` degrees (default north) (`docs/props.md`)                                    |
| `?debrief=1`              | open the debrief 3 s after boot                                                                                      |
| `?debugProps=1`           | prop placement tool: select, nudge, rotate, copy JSON (`docs/props.md`)                                              |

Examples: `/?mission=titanic`, `/?tile=titanic&landmark=_test&poi=test-bow`
(then hold `G`), `/?tile=titanic&depth=3790&at=41.7290,-49.9500,0`.

## Architecture overview

```
tools/                 Python pipeline (stdlib only)
  fetch_tile.py          one GMRT bbox -> data/tiles/<id>/
  fetch_all.py           every Tier-2 landmark: plan bbox, pick resolution, cache, ETOPO fallback
  compress_tiles.py      heightmap*.bin.gz/.br + optional 16-bit heightmap16.bin
  validate_props.py      props.json checker (schema, bbox, GLB size, attribution)
  inspect_tile.py        stats + ASCII depth map
  make_synthetic_tile.py offline stand-in tile
  esri_ascii.py, tile_writer.py, tests/
data/                  served at /data via the public/data symlink
  tiles/<id>/            meta.json, heightmap.bin, heightmap16.bin; tiles/index.json
  landmarks.json         landmark catalogue (markers, names, depths)
  landmarks/index.json   content folders that have a mission.json
  landmarks/<id>/        mission.json, pois.json, guide.json, props.json, sources.md
public/assets/         GLB models (models/) and Draco decoders (decoders/draco/)
src/
  core/        Time (fixed 60 Hz), Input (action map), EventBus, Config (all tunables)
  world/       TileLoader, Terrain* (chunks, detail noise, material, LOD), Water, Landmarks,
               Props + PropLoader (placed props, LOD/impostors, collision)
  world/props/ Procedural builders, Collision, PlacementDebug, Wiring (?at=, sub push-out)
  render/      Atmosphere (depth bands, fog, lights), Headlights, MarineSnow, caustics
  game/        Pois, Guide, Scanner, DiscoveryStore, Objectives, Discovery, Mission, MissionRouter, ContentPath
  audio/       WebAudio graph, sonar ping/echo, ambient beds, cues (all synthesised)
  sub/         Submarine (physics), SubMesh (placeholder hull), CameraRig
  ui/          HUD, Sonar, MissionSelect, ScanOverlay, FieldGuide, Debrief, Briefing, ObjectivesPanel
  shaders/     underwater post pass, terrain GLSL
  util/        geo.ts (lat/lon <-> world metres), types.ts (data contracts)
tests/
  unit/        vitest
  e2e/         Playwright specs + screenshots/
```

Module diagram, frame loop, events and performance budget:
[`docs/architecture.md`](docs/architecture.md). Tile format contract:
[`docs/tile-format.md`](docs/tile-format.md). Per-landmark content schemas:
[`plan/PHASE-B-CONTRACTS.md`](plan/PHASE-B-CONTRACTS.md) §2.

## Conventions

**World space.** `+X` east, `+Z` **south**, `+Y` up. Sea level is `y = 0`, so all
seabed elevations are negative metres. The origin is the tile centre. `+Z = south`
means a top-down view is a conventional north-up map, and the heightmap's row
order (row 0 = north) needs no flipping. All conversion lives in `src/util/geo.ts`.

**Depths in content files** (`data/landmarks.json`, `data/landmarks/<id>/*.json`)
are **positive** magnitudes (`depth_m: 3800`); the engine uses `y = -depth_m`.

**Units.** SI everywhere in code: metres, seconds, radians. The HUD converts to
knots and degrees for display only.

**Fixed-step physics.** `Submarine.step()` is only ever called with `dt = 1/60`;
sim speed runs more whole steps per frame rather than a bigger `dt`. Anything
visual uses the real frame delta.

**Config.** Every tunable number lives in `src/core/Config.ts`. Do not scatter
magic numbers through modules.

**Static data.** `public/data` is a symlink to `../data`, so Vite serves the
pipeline's output at `/data/...` in dev and copies it into `dist/` on build.
The pipeline never needs to know the web app exists.

**Types.** TypeScript strict mode, ES modules, `.js` extensions on relative
imports (required by `verbatimModuleSyntax`).

## How to add a tile

1. Pick a bounding box. Aim for roughly 500–1500 columns; at GMRT's `high`
   resolution (~61 m/node) that is about 0.3–0.8 degrees per side.
2. Fetch it:
   ```bash
   python3 tools/fetch_tile.py --id my-site \
       --north 12.5 --south 12.2 --east -60.1 --west -60.4 --resolution high
   ```
   Options: `--resolution low|med|high|max`, `--layer topo|topo-mask`,
   `--out data/tiles`, `--force` (bypass the 4M-cell guard), `--timeout`.
   The script probes GMRT's metadata endpoint first and automatically drops to a
   coarser resolution if the grid is too large or the request fails.
3. If the site is already in `data/landmarks.json`, take the bbox from there
   (`--from-landmarks data/landmarks.json --id my-site`), or add the id to
   `TIER2` in `tools/fetch_all.py` and run `python3 tools/fetch_all.py --only my-site`
   to get its bbox planning, caching and fallback.
4. Optionally `python3 tools/compress_tiles.py --only my-site --quant16`.
5. Sanity-check it — this prints the stats and an ASCII depth map:
   ```bash
   python3 tools/inspect_tile.py my-site
   ```
6. `data/tiles/index.json` is rewritten automatically and the tile shows up in
   the in-game DIVE SITES list. Open it with `http://localhost:5173/?tile=my-site`.

## How to add a landmark marker

Add an entry to `data/landmarks.json`. Anything with a numeric `lat` and `lon`
inside the current tile's bbox is placed automatically; everything else is
optional:

```json
{
  "landmarks": [
    {
      "id": "rms-titanic",
      "name": "RMS Titanic",
      "lat": 41.7325,
      "lon": -49.9469,
      "depth_m": 3800,
      "description": "Bow section, split from the stern by ~600 m."
    }
  ]
}
```

- `name` (or `id`) becomes the on-screen label.
- `depth_m` (positive magnitude) pins the marker at that depth; omit it and the
  marker sits on the seabed, sampled from the heightmap.
- Markers also appear as blips on the sonar minimap.

`Landmarks.ts` also accepts a bare array, an id-keyed object, or a GeoJSON
`FeatureCollection`, and treats a missing file as "no landmarks" rather than an
error.

## How to add a landmark mission

A mission is a content folder `data/landmarks/<id>/` where `<id>` is the
landmark id (and, by default, the tile id). Schemas are authoritative in
[`plan/PHASE-B-CONTRACTS.md`](plan/PHASE-B-CONTRACTS.md) §2; `data/landmarks/titanic/`
is the worked example. Every file is optional to the engine — a missing one
means "none", never a boot error.

1. Make sure the tile exists (`data/tiles/<id>/`, see above).
2. `pois.json` — scan targets: `lat`/`lon`, `depth_m` or `snap_to_seabed`,
   `radius_m`, `kind`, `primary`, `guide_entry`, `reconstruction`, `sources`
   (`docs/discovery.md`).
3. `guide.json` — field-guide entries keyed by the POIs' `guide_entry`:
   paragraphs, facts, optional image (must get an `ATTRIBUTION.md` row), sources,
   `confidence`, optional `memorial_note`.
4. `props.json` — placed props: `procedural:hull-block|debris|chimney` or a GLB
   under `/assets/models/` (`docs/props.md`). Check it:
   ```bash
   python3 tools/validate_props.py data/landmarks/<id>/props.json --tile <id>
   ```
5. `mission.json` — tile, title, `hull_class`, surface `spawn`, briefing,
   `scan` objectives (at least one `primary`), `"completion": "all_primary"`
   (`docs/missions.md`).
6. `sources.md` — human-readable citations for every fact.
7. Append `<id>` to `data/landmarks/index.json` so the MISSIONS list shows it.

Try it with `/?mission=<id>`, or `/?tile=<id>&poi=<poiId>` to jump to a POI.

## Attribution

Bathymetry from the Global Multi-Resolution Topography (GMRT) Synthesis.
Ryan, W.B.F., et al. (2009), _Global Multi-Resolution Topography synthesis_,
Geochem. Geophys. Geosyst., 10, Q03014,
[doi:10.1029/2008GC002332](https://doi.org/10.1029/2008GC002332).
3D models, decoders and other assets: [`ATTRIBUTION.md`](ATTRIBUTION.md).
