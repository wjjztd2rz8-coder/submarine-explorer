# Phase C contracts — shared schemas and wiring rules

Written 2026-09-22 by the orchestrator (Fable) before launching C1, C3, C4a–d,
C5, C6. Extends `plan/PHASE-B-CONTRACTS.md` (still authoritative for
pois/guide/props/mission JSON, events and the fenced-block rule in `main.ts`).
C2 (tiles) already shipped: every Tier-2 landmark has a tile whose id equals the
landmark id (see `docs/tiles-inventory.md`).

## 0. Concurrency rules (eight agents edit this checkout at once)

Same as Phase B §0, plus:

- Fenced blocks in `src/main.ts` are named `// --- C1 begin/end ---`, `C3`, `C5`.
  Content packs (C4a–d) and C6 never edit `src/`.
- `data/landmarks/index.json` is **pre-populated with all 13 ids** by the
  orchestrator. Content packs must not edit it. A listed landmark without a
  `mission.json` is skipped with a console warning (already handled).
- `ATTRIBUTION.md` is append-only; add rows under the right heading.
- e2e ports: C1 → 4201, C3 → 4203, C4a → 4204, C4b → 4205, C4c → 4206,
  C4d → 4207, C5 → 4208, C6 → 4209. Build into `dist-<pkg>/` and delete it after.
- Never run `npm run format` on the repo; prettier only your own files.
- No git commits. The orchestrator commits at the phase boundary.
- Node: `export PATH="$HOME/.local/node/bin:$PATH"` in every shell.

## 1. Landmark → tile → environment preset

| landmark id          | type     | tile id (same)       | preset   | notes                                                   |
| -------------------- | -------- | -------------------- | -------- | ------------------------------------------------------- |
| titanic              | wreck    | titanic              | wreck    | shipped in Phase B                                      |
| challenger-deep      | trench   | challenger-deep      | trench   | needs hull class C                                      |
| lost-city            | vent     | lost-city            | vent     | carbonate (white) chimneys, alkaline, not black smokers |
| monterey-canyon      | canyon   | monterey-canyon      | canyon   |                                                         |
| endurance            | wreck    | endurance            | wreck    | GEBCO fill only (smooth seabed); memorial site          |
| axial-seamount-ashes | vent     | axial-seamount-ashes | vent     | black smokers on a seamount caldera                     |
| hudson-canyon        | canyon   | hudson-canyon        | canyon   | shallow head (~50 m) to 1.6 km                          |
| kamaehuakanaloa      | seamount | kamaehuakanaloa      | seamount | formerly Lōʻihi; use the current official name          |
| beebe-vent-field     | vent     | beebe-vent-field     | vent     | deepest known vents (~4,960 m); hull class C            |
| great-blue-hole      | hole     | great-blue-hole      | reef     | GMRT does NOT resolve the hole (see §5)                 |
| bismarck             | wreck    | bismarck             | wreck    | war grave; GEBCO fill; hull class C                     |
| hunga-tonga-caldera  | seamount | hunga-tonga-caldera  | seamount | survey predates the 2022 eruption (see §5)              |
| blake-plateau-corals | ridge    | blake-plateau-corals | reef     | deep-sea coral mounds, ~500–900 m; 1202×1201 tile       |

Type → preset default mapping (C3 implements; `mission.json.environment.preset`
overrides): `vent→vent`, `seep→brine`, `canyon→canyon`, `reef|hole→reef`,
`trench→trench`, `wreck→wreck`, `seamount|ridge→seamount`, anything else →
`default`. The landmark `type` comes from `data/landmarks.json`.

## 2. `mission.json` additions (optional keys; B3's loader ignores unknown keys)

```json
{
  "environment": {
    "preset": "vent",
    "overrides": { "smokeIntensity": 0.6, "currentDirDeg": 220, "currentSpeedMps": 0.4 }
  },
  "species_file": "species.json"
}
```

- `environment.preset`: one of `vent | brine | canyon | reef | trench | wreck | seamount | default`.
- `environment.overrides`: keys are defined by C3 in `docs/presets.md` and
  `Config.presets`; unknown keys are ignored with a warning.
- `species_file`: defaults to `species.json` in the same folder; C1's field-guide
  species tab reads it (see §3).

## 3. `species.json` (C4a writes `tools/obis_export.py`; every pack produces the file)

```json
{
  "version": 1,
  "landmark": "lost-city",
  "source": "OBIS",
  "source_url": "https://api.obis.org/v3/occurrence?...",
  "fetched_at": "2026-09-22T00:00:00Z",
  "bbox": { "north": 30.2, "south": 30.03, "east": -42.02, "west": -42.22 },
  "depth_filter_m": [600, 1000],
  "note": "Occurrence records within the tile bbox; placement in the game is invented.",
  "species": [
    {
      "scientificName": "Bathymodiolus azoricus",
      "commonName": "vent mussel",
      "aphiaID": 137180,
      "records": 42,
      "depthRange_m": [750, 900],
      "group": "mollusc"
    }
  ]
}
```

- `tools/obis_export.py --landmark <id> [--bbox N S E W] [--depth-min --depth-max] [--max 40] --out data/landmarks/<id>/species.json`
  uses the OBIS v3 `occurrence` endpoint (or `checklist`) with a WKT polygon
  from the landmark bbox, aggregates by `scientificName`, keeps the top N by
  record count, and writes the shape above. Stdlib only (urllib + json). Sleep
  ≥ 1 s between requests; cache raw responses in `.cache/obis/`.
- `commonName` and `group` are optional; fill from the record's taxonomy where
  available, else omit. Never invent species; if OBIS returns nothing for a
  bbox, write an empty `species` array and say so in `note`.
- Packs C4b–d: if `tools/obis_export.py` does not exist yet when you need it,
  wait for it (poll every few minutes for up to ~30 min) rather than writing
  your own; if it still is not there, call the OBIS API with curl and write the
  same shape by hand, noting it in your report.

## 4. Settings and save (C5)

- Settings key `subexplorer.settings.v1`: `{ version, graphicsTier, postFx, detailStrength, simSpeedDefault, reduceMotion, captions, sonarPalette, bindings? }`.
  `Save.ts` wraps settings + a pointer to the discoveries key (do not move
  `subexplorer.discoveries.v1` or `subexplorer.bindings.v1`).
- The graphics tier from settings applies at boot in `main.ts` unless `?tier=` is given.
- `CameraRig.reduceMotion` already exists; `Input.rebind` and `Input.actions` exist;
  `AudioSystem.captions` (a `CaptionBus`) exists with no consumer — C5 renders it.
- Colour-blind sonar palette: `Sonar.ts` gets a `setPalette(name)`; C5 owns that
  edit and the palette table in Config.

## 5. Honesty rules for content packs

- Everything the terrain cannot show is a placed prop flagged `reconstruction: true`.
- **Great Blue Hole**: the GMRT tile has no multibeam at the site and the ~300 m
  hole does not appear. Do not fabricate terrain. The mission scans the reef
  rim/reef-flat geology (real data) and the field guide explains the resolution
  limit. Props may mark the hole's rim outline (e.g. a `procedural:debris`-style
  ring of small markers is NOT appropriate — keep it to a single memorial-free
  "survey marker" POI at the real centre with `reconstruction: false, kind: geology`
  and explain in the guide).
- **Hunga Tonga**: the survey predates the January 2022 eruption; the tile shows
  the pre-eruption summit. The guide must say so and describe the post-eruption
  caldera from sources.
- **Bismarck, Endurance, Titanic**: war graves / memorial sites: `memorial_note`
  in guide.json and mission.json, respectful tone, no salvage framing.
- Species placement is invented; say so in `species.json.note` and the guide.
- Every fact needs a source URL; `confidence` on every POI.

## 6. Deployment (C6)

- Static build only. The workflow builds, runs unit + Python + e2e (Chromium
  falls back to SwiftShader in CI; the GPU flags are harmless), and deploys
  `dist/` to GitHub Pages on `main`. **C6 prepares the workflow files and docs
  but must not push, create a repository, or enable Pages** — the owner does that.
- `vite.config.ts` `base` comes from `VITE_BASE` (default `/`).
- Exclude `data/tiles/_samples/` and `.gz`/`heightmap16.bin` from the build
  output (they are already gitignored except `_samples`; move `_samples` under
  `tools/fixtures/` and update the two docs that mention it).
- `tools/check_attribution.py` fails when a file under `public/assets/**` or
  `public/audio/**` has no row in `ATTRIBUTION.md`.
