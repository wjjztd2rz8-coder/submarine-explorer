# F-HERO-VERIFY — two audit rounds, visual completion blocked

Read `plan/DIRECTOR.md` first. Base: `d676ad1`. No commits.

## Changes

- Great Blue Hole grotto: dimensions `[42, 16, 28]` → `[84, 32, 28]`. Doubles the horizontal footprint while keeping the drowned alcove submerged. Actual High/Low geometry tops are −11.15/−12.25 m. A uniform 2× enlargement would breach sea level by about 21/20 m; the earlier progress note's `[84, 28, 40]` also breaches by about 3/2 m. The current opening and camera arm remain clear.
- Lost City mission: adds `ambientFill: 8`, matching Beebe's existing fill. Previous Low screenshots show a black slope outside the headlight pool; current source still had fill 0. This uses the existing tier-independent vent ambient path.
- Reef preset: removes the Low-tier early return from `update`. Low now receives the same ambient scale/warmth as High while still creating no shafts. Blue Hole's ambient intensity at camera depths 30/100/125 m changes from approximately 0.549/0.487/0.456 to 0.823/0.731/0.668. Below 200 m the existing fade still removes the adjustment.

## Round 1: captures attempted; inherited images reviewed

Fresh capture and e2e could not run: preview binding fails with `listen EPERM 127.0.0.1:4298`; Chromium exits with `sandbox_host_linux.cc:41 ... Operation not permitted`. Browser runtime reports no available sessions. **No fresh PNGs were produced; no desktop/phone visual pass is claimed.**

Read-only reference images from the main checkout were copied to `.cache/hero-verify/reference/`. These predate this patch; some also predate other merged polish. Their provenance is retained in their names and this table:

| Site            | Reference screenshot paths (under `.cache/hero-verify/reference/`)                 | Findings / remaining verification                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titanic         | `titanic-desktop-high.png` (main golden 2315)                                      | Sub, bow detail and nearby seabed readable; redundant scan hint remains. Fresh Low/phone needed.                                                              |
| Lost City       | `lost-city-desktop-high.png` (2315), `lost-city-desktop-low.png` (vent package)    | Tower/sub readable; Low slope black. Fill added, but result needs fresh images.                                                                               |
| Beebe           | `beebe-desktop-high-older.png`, `beebe-desktop-low-before-fill.png` (vent package) | Sub partly hides chimneys; Low reference predates fill. Current fill 8 and Low synchronization are already present. Re-shoot before judging current lighting. |
| Great Blue Hole | `blue-hole-desktop-high.png`, `blue-hole-desktop-low.png` (Blue Hole package)      | Hole/sub readable, grotto small, Low interior dark. Footprint and Low reef lighting fixed; appearance still needs re-shoot.                                   |
| Monterey        | `monterey-desktop-high.png`, `monterey-desktop-low.png` (Monterey package)         | Wall/sub/seabed readable. Fresh phone and approach images needed.                                                                                             |

## Round 2: headless verification

Disposable probes use actual heightmaps, terrain sampling, procedural meshes and collision boxes. All five heroes × High/Low pass hull clearance and sampled chase-arm clearance. Hero target and sub centre project inside both 1600 × 900 and 390 × 844 camera frusta (20 combinations). This checks geometry, **not rendered visibility or HUD occlusion**. Artifacts: `.cache/hero-verify/current-openings.json`, `geometry-options.json`, `reef-lighting.json`. Eleven probe checks pass, including High/Low reef lighting parity and zero Low shaft objects.

Remaining gaps:

- Fresh Arcade screenshots for all 20 site/tier/viewport combinations; confirm seabed readability within ~40 m and actual sub visibility. Blue Hole's opening is about 93 m above the floor, so use the nearby wall/ledge and approach views to assess readability.
- Portrait HUD likely overlaps: readouts occupy nearly the full 390 px width at the same top offset as sonar; tutorial placement can cover the sub's projected position. Source evidence: `src/styles/flow.css` and `hud-layout.css`. Needs measured browser rectangles/screenshots and a UI-lane fix; no UI files changed.
- Duplicate scan prompt remains: `src/app/systems/onboard.ts` enables the hint whenever the scanner has a candidate, alongside the scan panel. Visible in reference screenshots.
- Phone tutorials, touch controls and Low post-fix appearance remain unverified. No phone reference screenshots were available.

## Checks and capture handoff

- Build/typecheck pass with a temporary copied Vite config at `.cache/hero-verify/vite.config.ts`. Default config bundling cannot write into the shared read-only `node_modules`; `--configLoader runner` fails the PWA close hook. The copied config uses a writable local cache without modifying tracked build configuration.
- `npm test -- --configLoader runner`: 81 files, 797 tests pass.
- `npm run test:py`: 121 tests pass.
- Strict Great Blue Hole and Lost City content validation: zero errors/warnings.
- Prettier applied to all four changed files. E2e attempted with an isolated preview/config; blocked at server startup.

Temporary equivalent capture script: `.cache/hero-verify/capture.mjs`. On a host permitting Chromium and localhost:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run build -- --config .cache/hero-verify/vite.config.ts --outDir dist-f-hero-verify
npm run preview -- --config .cache/hero-verify/vite.config.ts --outDir dist-f-hero-verify --port 4298 --strictPort
# In another terminal:
node .cache/hero-verify/capture.mjs http://localhost:4298/
```

It captures High/Low × desktop/touch portrait × five sites, each at spawn, 40 m, detail and a fresh tutorial-enabled spawn (80 PNGs), with pose/UI-rectangle manifests. Output: `.cache/golden/<UTC stamp>-hero-verify/<site>-<desktop|phone>-<high|low>-<1|2|3|tutorial>.png`. This is a planned output pattern, not an existing screenshot set. Generated build directories were removed after verification; reference images and probes remain in the worktree cache.
