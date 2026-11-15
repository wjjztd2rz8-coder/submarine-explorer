# Bathyline

Browser game: pilot a research sub over real seafloor bathymetry from
[GMRT](https://www.gmrt.org), scan famous sites, and read short field-guide facts.
Play on desktop or phone (keyboard, gamepad, or touch).

**Live build:** https://wjjztd2rz8-coder.github.io/submarine-explorer/

## Playing it

You need a browser with WebGL2.

**Home** offers **Dive** (continues a guided tour from your last progress), **Dive
sites**, **Free dive**, **Journal**, **Settings**, and **Controls**. The tour has
thirteen real missions in a fixed order (Titanic first for new players). Each site
uses a GMRT heightmap tile and its own mission pack under `data/landmarks/`.

A dive starts with a short briefing, then a few minutes of piloting. Sonar lists
**contacts** along the route; follow them to landmarks, move in range, and hold
**scan** on a glowing target. A finished scan opens a close-up **reveal** with one
real fact from the guide data. Progress and Journal entries persist in the browser.

When you surface or finish the route, a **debrief** summarizes the dive and names the
next tour site. **Esc** opens pause (Resume, objectives, Journal, Settings, data
credits, quit). Menus freeze the simulation.

Gameplay modes (Arcade, Realistic, Custom), URL parameters, and the full control map
are documented in-game under **Controls** and in `docs/` for developers.

## Dive sites

Thirteen landmark missions (see `data/landmarks/index.json`): Great Blue Hole, Hunga
Tonga caldera, Blake Plateau corals, Lost City, Kamaʻehuakanaloa, Axial Seamount,
Hudson Canyon, Monterey Canyon, Endurance, Titanic, Bismarck, Beebe vent field, and
Challenger Deep. Tile details: [`docs/tiles-inventory.md`](docs/tiles-inventory.md).

## Setup

Node 22.12+ and Python 3.9+ (stdlib only for tile tools).

```bash
npm install
npm run dev    # http://localhost:5173
```

For e2e tests: `npx playwright install chromium`.

Heightmaps are checked in; regenerate with `python3 tools/fetch_all.py` and
`python3 tools/compress_tiles.py` (see `tools/`).

## Commands

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Vite dev server                     |
| `npm run build`     | Typecheck and production build      |
| `npm run preview`   | Serve `dist/`                       |
| `npm test`          | Vitest unit tests                   |
| `npm run typecheck` | TypeScript only                     |
| `npm run test:e2e`  | Playwright (needs a build first)    |
| `npm run ci`        | Full gate script (`tools/gates.sh`) |

## Licence and data credits

Code: [MIT](LICENSE). Game content: [LICENSE-CONTENT.md](LICENSE-CONTENT.md). Asset
and model credits: [ATTRIBUTION.md](ATTRIBUTION.md).

Bathymetry: Global Multi-Resolution Topography (GMRT) synthesis —
[Ryan et al. (2009)](https://doi.org/10.1029/2008GC002332). In-game **Data credits**
lists the tile source for each dive.
