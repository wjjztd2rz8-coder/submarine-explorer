# Phase B contracts — shared schemas and wiring rules

Written 2026-09-22 by the orchestrator (Fable) before launching B1–B4. These are
the interfaces the Phase B packages meet at. **Treat this file as authoritative
for Phase B**; if you must deviate, say so in your final report and update this
file in the same change.

Environment note for agents: this repo now lives on a Linux desktop at
`/home/vijay/submarine-explorer` (the "high" graphics tier machine, AMD Radeon).
Node 22 is at `~/.local/node/bin` (already on PATH in new shells; if `node` is
not found, run `export PATH="$HOME/.local/node/bin:$PATH"`). Tiles for
`titanic`, `monterey-canyon`, `lost-city`, `demo-synthetic` are on disk.

## 0. Concurrency rules (several agents edit this checkout at once)

- Own your files (see `plan/WORK-PACKAGES.md`). Never edit another package's
  files. Shared files you may touch **additively only**: `src/core/Config.ts`
  (add a new section), `src/core/EventBus.ts` (add events listed in §4),
  `src/main.ts` (one contiguous block, see §5), `src/styles.css` (append a
  section with a `/* --- Bn --- */` header), `src/util/types.ts` (add types only).
- Do not run `npm run format` on the whole repo (it would rewrite other agents'
  in-progress files). Run `npx prettier --write <your files>` instead.
- Another agent's half-finished file may break `tsc` for a moment. If the error
  is in a file you do not own, wait a minute and retry; do not "fix" it. If it
  persists, report it.
- e2e isolation: build and test into your own output dir and port so you do not
  serve another agent's stale bundle:
  ```bash
  PW_OUTDIR=dist-b1 npm run build -- --outDir dist-b1
  PW_PORT=4181 PW_OUTDIR=dist-b1 npm run test:e2e            # whole suite
  PW_PORT=4181 PW_OUTDIR=dist-b1 npx playwright test tests/e2e/discovery.spec.ts
  ```
  Ports: B1 → 4181, B2 → 4182, B3 → 4183, B4 → 4184. Delete your `dist-bN/` at the end.
- Do not `git commit`. The orchestrator commits at the phase boundary.

## 1. Directory layout for per-landmark content

```
data/landmarks/<landmark-id>/
  mission.json    B2 writes, B3 reads      mission manifest (spawn, briefing, objectives)
  pois.json       B2 writes, B1 reads      scan targets
  props.json      B2 writes, B4 reads      placed 3D props
  guide.json      B2 writes, B1 reads      field-guide entries
  sources.md      B2 writes                human-readable source list / notes
```

`<landmark-id>` is the `id` in `data/landmarks.json` (e.g. `titanic`). The tile
that mission plays on is `mission.json.tile` (defaults to the same id). All of
this is served at `/data/landmarks/<id>/...` through the `public/data` symlink.
Every loader must treat a missing file as "none" and never throw at boot.

Depth convention in these files: **`depth_m` is a positive magnitude** ("3800 m
deep"), matching `data/landmarks.json`. Engine code converts to world Y with
`-depth_m`. Use `"snap_to_seabed": true` instead of `depth_m` to sit on the
terrain (engine samples `Terrain.sampleHeight`).

## 2. Schemas

### 2.1 `pois.json` (B1 defines loader + TS type in `src/game/Pois.ts`; B2 authors)

```json
{
  "version": 1,
  "landmark": "titanic",
  "pois": [
    {
      "id": "titanic-bow",
      "name": "Bow section",
      "lat": 41.7325,
      "lon": -49.9469,
      "depth_m": 3800,
      "radius_m": 150,
      "kind": "wreck",
      "primary": true,
      "scan_seconds": 4,
      "guide_entry": "bow",
      "confidence": "high",
      "reconstruction": true,
      "sources": ["https://..."]
    }
  ]
}
```

- `radius_m`: the sub must be within this distance of the POI to scan it.
- `kind`: one of `wreck | debris | vent | geology | biology | artifact | memorial | other`.
- `primary`: scanning all primary POIs completes the mission (B3).
- `scan_seconds`: optional; default from `Config.scan.defaultSeconds`.
- `guide_entry`: key into `guide.json.entries[].id`.
- `reconstruction`: true when what the player sees at this POI is a placed prop
  rather than survey data; the field guide shows an "artist's reconstruction" badge.
- Either `depth_m` or `"snap_to_seabed": true`.

### 2.2 `guide.json` (B1 renders; B2 authors)

```json
{
  "version": 1,
  "landmark": "titanic",
  "memorial_note": "optional string shown at the top of every entry for this landmark",
  "entries": [
    {
      "id": "bow",
      "title": "The bow section",
      "paragraphs": ["Plain-text paragraph.", "Another paragraph."],
      "facts": [{ "label": "Depth", "value": "3,800 m" }],
      "image": {
        "url": "/data/landmarks/titanic/img/bow.jpg",
        "credit": "NOAA ...",
        "license": "Public domain"
      },
      "reconstruction": true,
      "sources": [{ "title": "Wreck of the Titanic — Wikipedia", "url": "https://..." }],
      "confidence": "high"
    }
  ]
}
```

`image` is optional. If B2 downloads an image it must be public domain / CC and
get a row in `ATTRIBUTION.md`; otherwise omit `image`.

### 2.3 `props.json` (B4 defines loader + validator; B2 authors)

```json
{
  "version": 1,
  "landmark": "titanic",
  "props": [
    {
      "id": "bow-hull",
      "model": "procedural:hull-block",
      "lat": 41.7325,
      "lon": -49.9469,
      "snap_to_seabed": true,
      "heading_deg": 0,
      "scale": 1,
      "dimensions_m": [140, 28, 30],
      "lod_distance_m": 1500,
      "collision": "box",
      "reconstruction": true,
      "note": "Bow section, ~140 m of the 269 m hull, heading roughly north."
    },
    {
      "id": "boulder-1",
      "model": "/assets/models/rock_01.glb",
      "lat": 41.73,
      "lon": -49.95,
      "snap_to_seabed": true,
      "heading_deg": 120,
      "scale": 3.0,
      "lod_distance_m": 600,
      "collision": "sphere"
    }
  ]
}
```

- `model`: either a URL under `/assets/models/` (GLB; B4 loads with GLTFLoader,
  Draco/Meshopt decoders from `three/examples/jsm`) or a `procedural:<name>`
  placeholder that B4 builds from primitives. B4 must support at least
  `procedural:hull-block` (a box with `dimensions_m` [length, width, height],
  rust-coloured, length along the heading), `procedural:debris` (a scattered
  cluster of small boxes within `dimensions_m[0]` metres) and
  `procedural:chimney` (a tapered cylinder, height `dimensions_m[2]`).
- `heading_deg`: compass heading of the prop's local −Z (0 = north, 90 = east),
  matching the sub's yaw convention.
- `scale`: number or `[x, y, z]`.
- `collision`: `none | sphere | box`. B4 exposes collision to the sub via the
  existing `HeightField`-style narrow interface (see §3) — not by importing `Submarine`.
- Unknown keys are ignored; missing optional keys use `Config.props` defaults.
- (B4 addition) Optional `y_offset_m` (number, added to the resolved Y) and
  `align_to_slope` (bool, tilt a snapped prop to the terrain normal). A negative
  `depth_m` is an error (entry skipped), not flipped. Full rules: `docs/props.md`.

### 2.4 `mission.json` (B3 defines loader; B2 authors)

```json
{
  "version": 1,
  "landmark": "titanic",
  "tile": "titanic",
  "title": "Titanic dive",
  "hull_class": "B",
  "spawn": { "lat": 41.74, "lon": -49.97, "depth_m": 5, "heading_deg": 150 },
  "briefing": {
    "summary": "One or two sentences.",
    "depth_m": 3800,
    "facts": ["...", "..."],
    "hazards": ["...", "..."],
    "memorial_note": "optional"
  },
  "objectives": [
    {
      "id": "find-bow",
      "type": "scan",
      "poi": "titanic-bow",
      "primary": true,
      "title": "Locate and scan the bow"
    },
    {
      "id": "debris",
      "type": "scan",
      "poi": "titanic-boilers",
      "primary": false,
      "title": "Survey the boiler field"
    }
  ],
  "completion": "all_primary"
}
```

`spawn.depth_m` of 5 means a surface start. `hull_class` keys `Config.submarine.hullClasses`.

## 3. Engine interfaces

- POI world positions: `latLonToWorld(meta, lat, lon)` from `src/util/geo.ts`;
  Y = `-depth_m` or `terrain.sampleHeight(x, z)` when snapping.
- "Facing the POI" for the scan beam: angle between `sub.getForward()` and the
  unit vector sub→POI is below `Config.scan.coneHalfAngleDeg`.
- Scanner input: `InputState.scan` (hold G / gamepad RB) already exists.
- Discovery persistence key: `subexplorer.discoveries.v1` (JSON, versioned,
  with a `migrate()` that upgrades older shapes). Shape:
  `{ version: 1, discovered: { "<landmark>/<poiId>": { at: ISOString, count: n } }, stats: {...} }`.
- Props collision: B4 exports `Props.collide(position: Vector3, radius: number, out: Vector3): boolean`
  (pushes `position` out of any prop volume, writes the push normal into `out`).
  B4 wires it into the frame loop **after** `sub.step()` in its main.ts block; it
  does not modify `Submarine.ts`.
- Debug/test hooks (all read from `URLSearchParams` in main.ts):
  - `?poi=<poiId>` — spawn the sub 80 m from that POI, facing it, at the POI's
    depth (B1 implements; B3 must preserve it because `tests/e2e/discovery.spec.ts` uses it).
  - `?landmark=<id>` — which `data/landmarks/<id>/` content folder to load for
    the current tile (default: the tile id). Lets tests use a fixture folder:
    B1 owns `data/landmarks/_test/pois.json` + `guide.json`, B4 owns
    `data/landmarks/_test/props.json`; both use Titanic-tile coordinates so
    `?tile=titanic&landmark=_test` works without B2's content. B1 implements the
    param (a tiny shared helper `src/game/ContentPath.ts` exporting
    `landmarkIdFor(params, tileId)` and `contentUrl(landmarkId, file)`); B4 may
    import that helper, and until it exists may read `params.get('landmark') ?? tileId` inline.
  - `?mission=<landmark-id>` — B3's mission router (implies the tile and landmark).
  - `?debugProps=1` — B4's placement tool.
- `window.__game` gains: `scanner`, `discoveries` (B1); `props` (B4);
  `mission` (B3). Add them to the existing object literal; do not restructure it.

## 4. EventBus additions (`GameEvents` in `src/core/EventBus.ts`)

Add exactly these, each package adds only its own group:

```ts
// --- B1: scan & discovery --------------------------------------------------
'scan:started':  { poiId: string };
'scan:progress': { poiId: string; progress: number };          // 0..1, emitted at most ~10 Hz
'scan:aborted':  { poiId: string; reason: 'range' | 'facing' | 'released' };
'scan:complete': { poiId: string; landmarkId: string; firstTime: boolean };
'guide:opened':  { entryId: string };
// --- B3: mission flow --------------------------------------------------------
'mission:started':  { missionId: string; tileId: string };
'mission:objective': { missionId: string; objectiveId: string; complete: boolean };
'mission:complete': { missionId: string; durationS: number };
'mission:restart':  { missionId: string };
// --- B4: props -------------------------------------------------------------
'props:loaded': { landmarkId: string; count: number; models: number; procedural: number };
```

Audio (A4) already listens for the discovery chime hook; B1 should emit
`scan:complete`, and the audio package may later subscribe. Do not edit `src/audio/**`.

## 5. `src/main.ts` wiring blocks

`main.ts` is shared. Each package inserts **one** contiguous block per location,
fenced with comments so the orchestrator can reconcile:

```ts
// --- B1 begin ---
...
// --- B1 end ---
```

Locations: (a) imports at the top, (b) construction after `const sonar = ...`,
(c) per-frame calls after `sonar.update(s);` and before `terrain.update(rig.camera);`,
(d) the `window.__game` literal. Keep blocks small; put logic in your own modules.
(B4 note) B4 also has a fifth one-line block right after the `sub.step()` loop,
for prop collision, as §3 requires ("after `sub.step()`").
B3 runs after B1/B2/B4 and is allowed to refactor main.ts's boot sequence into
`MissionRouter`, keeping the fenced blocks' behaviour.

## 6. Config sections

Add one top-level section per package to `makeConfig()` and its interface:
`scan` (B1), `props` (B4), `mission` (B3). Comment every value.

## 7. Definition of done for each package (in addition to WORK-PACKAGES.md)

- `npm run build` (zero TS errors), `npm test`, `npm run test:py`, your e2e
  spec(s) and the existing e2e suite all pass, run with your own `PW_PORT`/`PW_OUTDIR`.
- You looked at your screenshot(s) and they show what you built.
- Your files are prettier-formatted (`npx prettier --write <files>`).
- Docs: B1 → `docs/discovery.md`; B4 → `docs/props.md`; B3 → `docs/missions.md`;
  B2 → `data/landmarks/titanic/sources.md`. Keep them short and factual.
- Final report ≤ 400 words: built / how to see it / verified how / stubbed / deviations.
