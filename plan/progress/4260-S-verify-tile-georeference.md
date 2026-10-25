# 4260 — S-verify: shipped tile georeferencing

DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**, 2026-10-25.
Audited HEAD: **`77d5016a5be519b212ca1b7746e4ee8992e826e9`**, pinned before
inspection; initial worktree clean. **Report only; no supported-path mismatch
found.** Local e2e mode: **none**.

All **13 shipped GMRT tiles**, **29,347,836 canonical bytes** and **7,336,959
samples** pass production metadata validation/Float32 decoding and an independent
little-endian comparison. At **91 representative indices**, the runtime grid
mapping agrees with independently derived geographic cell centers: maximum
absolute X residual **3.637978807091713e-12 m**, Z residual **0 m**, and geographic
residual **0 degrees** in the evaluated double arithmetic. No correction is proposed.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md, DIRECTOR's Backlog, seven simplicity rules and
review rubric, the newest dated comprehensive review (2026-10-25, Claude alone)
in REVIEWS.md, and OVERNIGHT-LOG.md through run 151. No applicable AGENTS.md
was found in this checkout or its ancestors. This explicit report-only,
nonvisual brief overrides the generic contribution instructions to run all
gates, fetch missing tiles and inspect screenshots.

Checked the main checkout's `.cache/codex/queue/`, `queue/launched.log`, the
launched 4240/4250/4260 briefs, and 4210/4220/4230 result files. Rechecked queue,
result-file presence and `git worktree list` after diagnostics: zero queued
briefs; 4240/4250/4260 launched at 17:03:03 CDT, with registered separate
worktrees and no result files yet. 4260 is this task, with no other matching
owner or completed note. `systemctl --user list-units --type=service
--state=running --no-legend 'subexp-*'` failed with **“Failed to connect to bus:
Operation not permitted”**; live service status is therefore unverified, not
inferred from missing results.

Registered held worktrees are 2980, 3050, 3310, 3320, 3340 and 3380. No patches
were collected, read as an oracle or depended on. Run 150 records cancellation
and removal of 4210/4220/4230 after their limit exits; their stale result-file
suggestions to continue are superseded by that log and this brief. Their slices,
4240/4250, held journeys/CI/touch, S-collision and its four expected failures
remain untouched. No new Backlog item was created.

## Contracts and existing coverage

| Source / existing evidence                                                                                                                  | Established behavior and remaining boundary                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Tile format](../../docs/tile-format.md), [architecture coordinate convention](../../docs/architecture.md#coordinate-conventions)           | Canonical little-endian Float32, row-major, north first, west first; negative elevations; actual bbox and center; +X east, +Z south; documented grid-position formula.                                                                                                                                                                                                        |
| [ESRI parser](../../tools/esri_ascii.py), [tile writer](../../tools/tile_writer.py) (read only)                                             | Bbox describes outside cell edges: east = west + cols × cellsize, north = south + rows × cellsize. Center-origin ESRI headers are normalized by subtracting half a cell. Writer preserves bbox/center/spacing as JSON numbers and packs values with `<f`; no fixed decimal rounding of those metadata fields.                                                                 |
| [geo](../../src/util/geo.ts), [geo capability](../../tests/unit/geo.test.ts)                                                                | Synthetic fixtures pin axis signs, center origin, cosine longitude scale, forward/inverse conversion and full-cell footprint sizes. They do not combine real stored bytes with bbox-derived cell-center coordinates.                                                                                                                                                          |
| [TileLoader](../../src/world/TileLoader.ts), [loader capability](../../tests/unit/TileLoader.test.ts)                                       | `load()` calls `validateMeta()` then `decodeHeightmap()` on the default canonical path. Safe dimensions, positive finite spacing, geographic bounds/center, ordered finite extrema, exact byte count and finite samples are guarded. Row identity/endian fixtures are synthetic. These guards do not assert geographic consistency among bbox, dimensions and metric spacing. |
| [140 / F-BUGHUNT-5](F-BUGHUNT-5.md), [retained capability](../../tests/unit/f-bughunt-5.test.ts)                                            | Added malformed-metadata and nonfinite-sample rejection; current shipped-data test validates metadata and decoding. It does not derive geographic coordinates for loaded indices. The historical result wrapper says e2e PASS, but its own final report says e2e could not run; no browser acceptance is borrowed from that label.                                            |
| [Terrain](../../src/world/Terrain.ts), [Terrain capability](../../tests/unit/Terrain.test.ts), [3010](3010-S-bughunt-low-ground-contact.md) | Constructor sets dx/dz from metadata and sample spans to `(dimension - 1) × spacing`. Public `worldXOfCol`, `worldZOfRow`, `heightAtCell` feed the actual sampling/build paths. Synthetic cell-center sampling and 3010's real triangle/contact evidence establish different relationships; neither compares shipped indices to independently derived latitude/longitude.     |
| [3350](3350-S-bughunt-tile-load-fallback.md)                                                                                                | Request/body failures, optional fallback and startup cancellation; no shipped geographic-lattice comparison.                                                                                                                                                                                                                                                                  |
| [4030](4030-S-verify-life-clamp-shipped.md), [4200](4200-S-verify-journal-scans.md)                                                         | Real shipped terrain supports life-clamp and scan/Journal observations. Those audits accept Terrain's coordinates and do not independently check their geographic interpretation. Their population, target, collision and mesh sweeps were not repeated.                                                                                                                      |

The material gap is thus the **real stored grid → runtime geographic lattice**
relationship. Existing decoder safety evidence alone is insufficient for it.

## Loaded provenance

IDs come from `data/landmarks/index.json`, cross-checked against
`data/tiles/index.json`: all 13 site IDs have `source: "GMRT"`. The tile index
also lists **`demo-synthetic`**, whose own metadata declares `source:
"synthetic"` and `synthetic: true`; it is not one of the 13 site IDs and is
excluded from the real-survey findings. No replacement data was generated.

Each listed input is the existing `data/tiles/<id>/meta.json` and
`heightmap.bin` in the clean pinned checkout. All metadata records use
`https://www.gmrt.org/services/GridServer` request URLs, `layer: topo`, GMRT
attribution and `nodata_count: 0`. These are stored provenance declarations,
not a new verification of the remote service or original surveys.

| Tile ID              | Cols × rows | Canonical bytes | Stored fetched_at (UTC) | Float32 SHA-256 prefix |
| -------------------- | ----------- | --------------: | ----------------------- | ---------------------- |
| great-blue-hole      | 574 × 547   |       1,255,912 | 2026-09-23T02:03:34Z    | ae41c493839f68f1       |
| hunga-tonga-caldera  | 586 × 546   |       1,279,824 | 2026-09-23T02:03:53Z    | df2eb4673460cf84       |
| blake-plateau-corals | 1202 × 1201 |       5,774,408 | 2026-09-23T02:04:09Z    | 914656105c809a0c       |
| lost-city            | 367 × 310   |         455,080 | 2026-09-17T01:25:34Z    | 3d582c46b14dcd92       |
| kamaehuakanaloa      | 580 × 547   |       1,269,040 | 2026-09-23T02:03:21Z    | 4cd71ddc8eaf9b2a       |
| axial-seamount-ashes | 1050 × 727  |       3,053,400 | 2026-09-23T02:03:04Z    | 23927839874e0f71       |
| hudson-canyon        | 1093 × 910  |       3,978,520 | 2026-09-23T02:03:15Z    | 8cb737ddcf3e801c       |
| monterey-canyon      | 820 × 638   |       2,092,640 | 2026-09-17T00:59:49Z    | 3d1a4f5f8cc39871       |
| endurance            | 1202 × 545  |       2,620,360 | 2026-09-23T02:02:55Z    | 85f302b2fe225f67       |
| titanic              | 548 × 546   |       1,196,832 | 2026-09-17T00:59:40Z    | a94b41870ce15a77       |
| bismarck             | 820 × 545   |       1,787,600 | 2026-09-23T11:32:18Z    | b1e0b6bf22768441       |
| beebe-vent-field     | 579 × 546   |       1,264,536 | 2026-09-23T02:03:28Z    | d44bf77993eb983f       |
| challenger-deep      | 911 × 911   |       3,319,684 | 2026-09-23T02:02:47Z    | d7a3d8496b3bded2       |

Full hashes of both indexes and every loaded metadata/binary file, plus exact
request URLs and dimensions, are retained in `/tmp/4260-tile-georeference/`:
`inputs.json`, `summaries.json`, `observations.json`. The SHA-256 of `inputs.json`
is `ab9411d5302d44ef0e6b01b40678ba19f79cdc7e54c75445d6c8189a1abd36ff`.
The inventory document's historical totals are not substituted for measured
local byte counts. No input is missing or inaccessible.

## Independent mapping and sample observations

For each actual bbox, derive independently:

```text
dlon = (east - west) / cols
dlat = (north - south) / rows
lon(col) = west + (col + 0.5) * dlon
lat(row) = north - (row + 0.5) * dlat
expectedX = (lon - center.lon) * 111320 * cos(center.lat * pi / 180)
expectedZ = (center.lat - lat) * 111320
```

The runtime comparison calls actual `Terrain.worldXOfCol(col)` and
`worldZOfRow(row)`, then actual `worldToLatLon`. The constructor and mapping
methods are executed in their normal order on the real loaded Tile. No mapping
method is copied or replaced. `latLonToWorld` is also checked against the
independent expected world coordinates.

The disposable Vitest diagnostic substitutes only render dependencies:
`createTerrainMaterial` returns an inert material record, Scatter supplies an
empty Group, and private `Terrain.build` returns zero mesh statistics.
TerrainChunk construction throws if reached. The real constructor initializes
all dimensions, spacing and half-spans; no fabricated Terrain receiver or
hand-assigned geometry fields are used. All 13 constructors complete, with zero
vertices/chunks and only the empty scatter child. This verifies the production
numeric consumer with meshing suppressed; it does not establish complete
Terrain construction/rendering acceptance. Neither `sampleHeight` nor authored
reconstructions are used as raw-data identity oracles.

Seven indices per tile cover all four corners, the lower-index central sample,
and asymmetric interiors `(floor(cols/5), floor(2*rows/3))` and
`(floor(3*cols/4), floor(rows/7))`. The fractional index pair
`((cols-1)/2, (rows-1)/2)` separately maps to the origin; even dimensions do
not put a stored sample at that axis's center.

Representative retained records follow. Coordinates are decimal degrees; the
runtime inverse equals each displayed documented pair, with **zero unrounded
geographic residual**. Heights are identical among loaded Float32,
`heightAtCell(col,row)` and independent `Buffer.readFloatLE(4*index)`.

| Tile                | (col, row); index   | Documented latitude, longitude           | Runtime X, Z (m; rounded)          | Stored / independent Y (m) |
| ------------------- | ------------------- | ---------------------------------------- | ---------------------------------- | -------------------------: |
| titanic             | (0, 0); 0           | 41.879493824765326, -50.100677490234375  | -12481.359785539, -16663.348388672 |           -3659.4599609375 |
| titanic             | (547, 545); 299207  | 41.580116383359076, -49.800201416015625  | 12481.359785539, 16663.348388672   |          -3369.89990234375 |
| titanic             | (273, 272); 149329  | 41.730079762265326, -49.950714111328125  | -22.817842387, -30.574951172       |         -3802.590087890625 |
| titanic             | (109, 364); 199581  | 41.679542652890326, -50.040802001953125  | -7507.070145233, 5595.216064453    |         -3866.860107421875 |
| endurance           | (0, 0); 0           | -68.58010138117483, -52.648956298828125  | -13321.146860210, -16632.773437500 |           -2929.7900390625 |
| endurance           | (1201, 544); 655089 | -68.87892950617483, -51.989227294921875  | 13321.146860210, 16632.773437500   |         -3080.800048828125 |
| endurance           | (600, 272); 327544  | -68.72951544367483, -52.319366455078125  | -11.091712623, 0                   |         -3003.909912109375 |
| endurance           | (240, 363); 436566  | -68.77950323664358, -52.517120361328125  | -7997.124801175, 5564.641113281    |         -2958.340087890625 |
| hunga-tonga-caldera | (117, 364); 213421  | -20.599863857146993, -175.49642944335938 | -10048.928557365, 5595.216064453   |        -1305.6300048828125 |

This includes both southern surveys, at moderate and high southern latitude,
without changing north-first semantics: row zero still has the most northerly
latitude and negative Z. For example, Titanic's asymmetric sample has byte
offset **798324**, Endurance's **1746264**. Their reversed-row values are
respectively **-3819.840087890625** and **-2953.6298828125**; reversed-column
values are **-3700.179931640625** and **-3048.3798828125**. Across all 91 records,
84 reversed-row and 86 reversed-column controls differ. Center-line coincidences
or equal bathymetric values do not provide directional discrimination by
themselves; the asymmetric records and all-byte equality do.

### Edge offsets and precision

An outside bbox corner is **not** a sample center. The north-west sample is
half a cell east and south of it. `tileWidthMeters` / `tileHeightMeters` describe
`dimension × spacing`; Terrain's sample spans describe `(dimension - 1) ×
spacing`. Their difference is one full cell, split between opposite edges.
For Titanic those half-cell offsets are **22.81784238672555 m X** and
**30.574951171875 m Z**; for Endurance they are **11.091712622989155 m X** and
the same **30.574951171875 m Z**. These expected offsets are not mismatches.

For every tile, bbox-derived metric spacings equal the serialized spacings in
the evaluated arithmetic, and the stored center equals the bbox midpoint.
Current real grids have `cellsize_deg = 0.00054931640625`; the writer preserves
these values without fixed decimal truncation. Diagnostic comparison thresholds
are **1e-6 m** per world axis and **1e-10 degrees** per geographic axis, allowing
double arithmetic without imposing new product tolerances. Measured residuals
are reported above, not replaced by these thresholds. No external geodesic or
ellipsoid model is used: the comparison uses only the documented 111320 and
center-latitude cosine approximation. Its real-world geodetic error is untested.

All canonical bytes have exactly `cols * rows * 4` length. Production decoding
rejects nonfinite samples; a separate complete byte walk checks finiteness and
exact `Object.is` equality to independent little-endian reads, yielding **zero
mismatches**. Float32 serialization is separate from horizontal geometry:
stored extrema differ from decimal metadata extrema by at most
**0.0003515624994179234 m** (Challenger Deep). Every metadata extremum rounds to
exactly its stored Float32 extremum; the deepest grid's half-ULP is
0.00048828125 m. Decimal extrema versus Float32 bytes are not treated as a defect.

## Commands and actual outcomes

All commands run from this worktree unless an absolute path is shown. Disposable
sources/configuration and logs remain under `/tmp/4260-tile-georeference/`.
No wrapper gate was run or credited as evidence.

| Command                                                                                                                                                       | Actual outcome                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git rev-parse HEAD`; `git status --short`; `git worktree list --porcelain`                                                                                   | Pinned SHA above; initial status empty; held and concurrent worktrees identified. Repeat after diagnostics retained that SHA and clean status before writing this note.                                                                                                 |
| `systemctl --user list-units --type=service --state=running --no-legend 'subexp-*'`                                                                           | Exit 1, bus access denied; environment limitation on live-task inspection, not a product failure. Queue/launched/result files and registered worktrees remain the available evidence.                                                                                   |
| `node_modules/.bin/vitest run --config /tmp/4260-tile-georeference/vitest.config.mjs --configLoader runner --cache=false`                                     | Exit 0; **1 file / 1 diagnostic passed**, 495 ms. Log: `probe.log`. Config uses Node, two workers, 30 s timeout and only the retained `/tmp/…/probe.test.ts`; no repository config edit.                                                                                |
| `python3 /tmp/4260-tile-georeference/summarize.py`                                                                                                            | Exit 0. Aggregates retained observations: 13 surveys, 29,347,836 bytes, 7,336,959 finite samples, zero LE mismatches, 91 mapped indices; residuals and serialization observations above. Log: `summary.log`. This reads probe results; it is not a second product test. |
| `npm test -- --configLoader runner --cache=false tests/unit/geo.test.ts tests/unit/TileLoader.test.ts`                                                        | Exit 0; **2 files / 35 tests passed**, 284 ms. Log: `capabilities.log`. Existing capability tests unchanged. Terrain mesh specs and the broad 140 suite were inspected but not rerun.                                                                                   |
| `node_modules/.bin/prettier --write plan/progress/4260-S-verify-tile-georeference.md`                                                                         | Exit 0; owned-note formatting completed (67 ms initial run).                                                                                                                                                                                                            |
| `node_modules/.bin/prettier --check plan/progress/4260-S-verify-tile-georeference.md`; `git diff --check -- plan/progress/4260-S-verify-tile-georeference.md` | Exit 0; Prettier reports all matched files use its style; diff whitespace check is clean. The note is untracked, so the additional no-index check below checks its full contents.                                                                                       |

Final verification also runs `git diff --no-index --check /dev/null
plan/progress/4260-S-verify-tile-georeference.md` to include the complete new
file: exit 1 with no whitespace diagnostics (the new file differs from
`/dev/null`). An explicit owned-note whitespace assertion below exits 0. Final `git status --short` lists only this
untracked note, and `git rev-parse HEAD` retains the audited SHA.

```bash
python3 - <<'PY'
from pathlib import Path
p = Path("plan/progress/4260-S-verify-tile-georeference.md")
s = p.read_text()
assert s.endswith("\n")
assert all(line == line.rstrip() for line in s.splitlines())
print("owned-note whitespace: PASS")
PY
```

## Simplicity, rubric and limits

The smallest result is this evidence note: no demonstrated supported-path defect,
no correction, no permanent test or runtime machinery. No guidance surface,
layout patch, site branch, setting, config mutation, package comment, dependency,
API/schema, assertion, tolerance, budget, count or skip changes. All seven
simplicity rules remain satisfied. Only this named progress note is written in
the repository; diagnostic sources and outputs are disposable `/tmp` artifacts.

Correctness and honesty are bounded to stored data, byte interpretation and the
actual numeric mapping. GMRT provenance does not imply every cell is a direct
survey measurement: [the existing inventory](../../docs/tiles-inventory.md)
already describes GEBCO fill and unresolved/pre-eruption named features. Zero
NODATA metadata does not establish survey accuracy. Self-consistency cannot
detect an upstream wrong bbox, wrong source geolocation or a consistently
mislabelled source grid. Those are outside this audit.

The 13 site identities, five heroes, real terrain inputs, scan/Journal, marine
life, keyboard/pad/touch input, accessibility and Arcade default are preserved
by making no changes to them. Rewarding exploration behavior is not newly
validated here. Beauty, first-ten-second visual readability, touch layout and
real-phone acceptance remain with Claude/owner. No downloads, regeneration,
quant16 rollout, terrain meshing, props/collision investigation, shader review,
all-target matrix, browser, rendering, WebGL/GPU, screenshots, hosted CI or
unaided journey validation occurred. No merge, push, tag or hosted workflow
operation was performed.
