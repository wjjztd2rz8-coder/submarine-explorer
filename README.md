# Submarine Explorer

A browser submarine simulator that flies over **real ocean-floor bathymetry**,
downloaded from the [GMRT](https://www.gmrt.org) Global Multi-Resolution
Topography synthesis. No invented terrain: what you see is measured seafloor.

Two dive sites ship with the repo:

| Tile                                         | Grid      | Depth range        | Cell size |
| -------------------------------------------- | --------- | ------------------ | --------- |
| `titanic` — the wreck site, North Atlantic   | 548 x 546 | -3978 m to -3339 m | 46 x 61 m |
| `monterey-canyon` — Monterey Bay, California | 820 x 638 | -2333 m to +265 m  | 49 x 61 m |

## Setup

Requires Node 20+ and Python 3.9+ (standard library only — no numpy, no GDAL).

```bash
npm install
npx playwright install chromium     # only needed for the e2e smoke test
```

Then fetch at least one tile (the repo ships without the binary heightmaps):

```bash
python3 tools/fetch_tile.py --id titanic \
    --north 41.88 --south 41.58 --east -49.80 --west -50.10

python3 tools/fetch_tile.py --id monterey-canyon \
    --north 36.95 --south 36.60 --east -121.75 --west -122.20
```

If GMRT is unreachable, generate a stand-in so the engine still runs:

```bash
python3 tools/make_synthetic_tile.py --id demo-synthetic --cols 384 --rows 384
```

Then:

```bash
npm run dev          # http://localhost:5173
```

## Commands

| Command                           | What it does                                                 |
| --------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                     | Vite dev server with HMR                                     |
| `npm run build`                   | type-check (`tsc --noEmit`) then production build to `dist/` |
| `npm run preview`                 | serve `dist/` on :4173                                       |
| `npm test`                        | vitest unit tests                                            |
| `npm run test:watch`              | vitest in watch mode                                         |
| `npm run test:py`                 | Python unit tests for the ESRI ASCII parser                  |
| `npm run test:e2e`                | Playwright smoke test (needs `npm run build` first)          |
| `npm run typecheck`               | type-check only                                              |
| `npm run format` / `format:check` | prettier                                                     |

The e2e test boots the built game on both tiles, waits for `window.__gameReady`,
asserts there were no console errors, and writes screenshots to
`tests/e2e/screenshots/<tile>.png`.

## Controls

| Key       | Action                             |
| --------- | ---------------------------------- |
| `W` / `S` | forward / reverse thrust           |
| `A` / `D` | yaw to port / starboard            |
| `R` / `F` | pitch up / down                    |
| `Space`   | blow ballast (rise)                |
| `Shift`   | flood ballast (dive)               |
| `X`       | boost                              |
| `C`       | toggle chase / first-person camera |
| `M`       | toggle sonar minimap               |

A gamepad works too, and takes over automatically whenever a stick is deflected.

## Architecture overview

```
tools/     Python pipeline: GMRT -> data/tiles/<id>/{meta.json,heightmap.bin}
data/      tile output + landmarks.json  (served at /data via public/data symlink)
src/
  core/    Time (fixed 60 Hz), Input, EventBus, Config (all tuning constants)
  world/   TileLoader, Terrain (chunked mesh + height sampling), Water, Landmarks
  sub/     Submarine (physics), SubMesh (placeholder hull), CameraRig
  ui/      HUD (DOM), Sonar (2D canvas), MissionSelect (DOM)
  shaders/ underwater post-process pass
  util/    geo.ts (lat/lon <-> world metres), types.ts (data contracts)
tests/
  unit/    vitest
  e2e/     Playwright smoke test + screenshots
```

Full detail, including the module diagram, data flow and performance budget, is
in [`docs/architecture.md`](docs/architecture.md). The tile format contract is in
[`docs/tile-format.md`](docs/tile-format.md).

## Conventions

**World space.** `+X` east, `+Z` **south**, `+Y` up. Sea level is `y = 0`, so all
seabed elevations are negative metres. The origin is the tile centre. `+Z = south`
means a top-down view is a conventional north-up map, and the heightmap's row
order (row 0 = north) needs no flipping. All conversion lives in `src/util/geo.ts`.

**Units.** SI everywhere in code: metres, seconds, radians. The HUD converts to
knots and degrees for display only.

**Fixed-step physics.** `Submarine.step()` is only ever called with `dt = 1/60`.
Anything visual uses the real frame delta.

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
3. If the site is already in `data/landmarks.json`, you can take the bbox from
   there instead:
   ```bash
   python3 tools/fetch_tile.py --from-landmarks data/landmarks.json --id my-site
   ```
4. Sanity-check it — this prints the stats and an ASCII depth map:
   ```bash
   python3 tools/inspect_tile.py my-site
   ```
5. That is it. `data/tiles/index.json` is rewritten automatically and the tile
   shows up in the in-game DIVE SITES list. Open it directly with
   `http://localhost:5173/?tile=my-site`.

## How to add a landmark

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
      "depth_m": -3800,
      "description": "Bow section, split from the stern by ~600 m."
    }
  ]
}
```

- `name` (or `id`) becomes the on-screen label.
- `depth_m` pins the marker at that depth; omit it and the marker sits on the
  seabed, sampled from the heightmap.
- Markers also appear as blips on the sonar minimap.

`Landmarks.ts` also accepts a bare array, an id-keyed object, or a GeoJSON
`FeatureCollection`, and treats a missing file as "no landmarks" rather than an
error — so the game still boots if nobody has written the file yet.

## Attribution

Bathymetry from the Global Multi-Resolution Topography (GMRT) Synthesis.
Ryan, W.B.F., et al. (2009), _Global Multi-Resolution Topography synthesis_,
Geochem. Geophys. Geosyst., 10, Q03014,
[doi:10.1029/2008GC002332](https://doi.org/10.1029/2008GC002332).

## URL parameters (Phase A)

| param                     | effect                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `?tile=<id>`              | which tile from `data/tiles/index.json` to load                                                                    |
| `?tier=low\|medium\|high` | graphics tier (medium = this Mac's 60 fps target; high = discrete GPU). See docs/terrain.md and docs/atmosphere.md |
| `?depth=<m>`              | spawn the boat at that depth (clamped above the seabed); used for the atmosphere reference frames                  |
| `?debugTerrain=1`         | log chunks, LOD counts, atmosphere band, draw calls and fps once a second                                          |

Keys: W/S thrust, A/D yaw, R/F pitch, Space/Shift ballast, X boost, C camera, M sonar, **L headlights**, Q/Tab sonar ping, G scan (hold), T sim speed, P photo mode.
