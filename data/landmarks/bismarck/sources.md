# Bismarck site content: sources and notes (package C4)

Researched 2026-09-23. Files: `pois.json`, `guide.json`, `props.json`, `mission.json`,
`species.json` in this folder. Tile: `data/tiles/bismarck` (GMRT Synthesis; bbox
N 48.48396 / S 48.18349 / E -15.88019 / W -16.33337; `min_m` -5009.03, `max_m` -3812.92,
cellsize ~41 x 61 m). Bismarck is a war grave per `plan/PHASE-C-CONTRACTS.md` §5:
`memorial_note` is set in both `guide.json` and `mission.json`, tone is respectful
throughout, and there is no salvage framing anywhere.

## Sources consulted

| #   | Source                                                                  | URL                                                                      | Used for                                                                                                                                                                                                             | Primary?                                                                       |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | German battleship Bismarck — Wikipedia                                  | https://en.wikipedia.org/wiki/German_battleship_Bismarck                 | Pursuit narrative (Denmark Strait, Hood, torpedo hits, final battle), dimensions (251 m / 36 m), crew complement (2,221), casualties (~114 survivors), sinking date/time, discovery date, infobox coordinates        | Secondary, but the most complete single account found                          |
| 2   | The Wreck of the Bismarck — kbismarck.com                               | https://www.kbismarck.com/wreck.html                                     | Hull condition ("surprisingly good condition", "intact" except a small stern piece), turret orientation (upside-down), 2001 McDowell expedition using Ballard's coordinates, approximate depth/distance from Brest   | Enthusiast reference site, treated as secondary but detailed and long-standing |
| 3   | vROV Pilot: Bismarck — Magellan                                         | https://www.magellan.gg/vrov-pilot-bismarck/                             | 2019 digital-twin survey, ~1 km debris trail, turrets/armour/Admiral's Bridge in the debris field, depth (~4,790 m)                                                                                                  | Primary for the 2019 survey (the company that ran it)                          |
| 4   | H.M.S. Hood Association, 2001 Expedition — Wreck of Battleship Bismarck | https://www.hmshood.org.uk/hoodtoday/2001expedition/bismarck/encrypt.htm | Coordinate "vicinity of 4809N 01607W" (48.15N, 16.117W), 14.5° slope, hull slid ~1.5 km after impact, one turret (possibly Caesar) found with smashed rotating structure, other three not located by this expedition | Secondary (expedition report, not the primary surveyors)                       |
| 5   | Bismarck Wreck: Main Gun Barrels — Naval History Forums (kbismarck.org) | https://www.kbismarck.org/forum/viewtopic.php?t=1470                     | Turrets unbolted from below, broke free and fell separately; roughly in line on the seabed, one pushed out of line by the sliding hull                                                                               | Enthusiast forum, secondary                                                    |
| 6   | Who Sank the Bismarck? — U.S. Naval Institute Proceedings, June 1991    | https://www.usni.org/magazines/proceedings/1991/june/who-sank-bismarck   | Shellfire-vs-scuttling historiographical debate                                                                                                                                                                      | Secondary, professional naval journal                                          |
| 7   | Wikipedia geocoordinate API (`action=query&prop=coordinates`)           | (API call, same article as #1)                                           | Confirmed the infobox coordinate is 48.16667N, 16.2W (the commonly quoted "48°10'N 16°12'W")                                                                                                                         | Same as #1                                                                     |
| 8   | GMRT Synthesis (Ryan et al. 2009), doi:10.1029/2008GC002332             | https://www.gmrt.org/                                                    | Tile terrain, seamount summit/flank readings                                                                                                                                                                         | Primary — the dataset itself                                                   |
| 9   | `data/landmarks.json` (repo)                                            | —                                                                        | Landmark id/bbox/coordinate/`wreck_meta` (bow "separated from main hull", 251 m length)                                                                                                                              | Repo data, not an external source; flagged where it conflicts with #1/#2 below |

## Position discrepancy -- resolved 2026-09

Follow-up session, 2026-09-23: chose the H.M.S. Hood Association's 2001 expedition
fix ("vicinity of 4809N 01607W" = 48.15N, 16.117W, source 4) as the wreck position,
since it is the most specific sourced coordinate of the three found (an expedition
report giving a location to the minute, versus Wikipedia's rounded DMS infobox
figure). A targeted web search this session for a more precise primary source (an
official 1989 survey report with a decimal coordinate) turned up nothing more
authoritative, but did surface a third independent figure, "approximately
48°09'N, 016°07'W", matching the Hood Association's point rather than Wikipedia's
48°10'N/16°12'W -- treated as corroboration, not proof.

`data/landmarks.json`, `pois.json`, `props.json`, `mission.json` and this file were
updated to use 48.15N, 16.117W, and `data/tiles/bismarck` was regenerated around it
(GMRT Synthesis; new bbox N 48.3/S 48.0/E -15.8922/W -16.3418, ~0.3° square, 820x545
cells at ~41x61 m/cell). The old tile centred on the unsourced 48.3336N/-16.1067W
point (see the retained discussion below for the original three-way discrepancy) is
gone; the new tile's south edge no longer needs to reach it.

**New residual gap, found this session:** at 48.15N, 16.117W the new tile's terrain
reads about 4,218.5 m -- roughly 570 m shallower than the 4,790-4,791 m commonly
published for the wreck's depth, and a much larger gap than the old tile's 84 m
mismatch. Sampling the terrain around this point shows a seamount summit about 3 km
north-east (shoaling to ~4,024 m) and depths matching the published 4,790 m appear a
few kilometres south-west, well outside the "vicinity of" precision the Hood
Association source claims. Per the task brief's explicit instruction, we did not
walk the coordinate further to chase a depth match -- multiple points on this coarse,
undulating terrain happen to read close to 4,790 m, and picking one would fabricate
precision no source supports. Instead this gap is reported plainly in `guide.json`
(`wreck-hull`, `seamount-flank` entries), `mission.json`'s briefing facts, and the
`bismarck-hull` POI note: the chosen coordinate is a sourced "vicinity" position on
the seamount's upper flank, not a survey fix guaranteed to land exactly on the hull's
final resting depth. `bismarck-skid-trail` and `bismarck-turret-debris` were moved
up-slope (north-east, toward the summit) of the hull to be physically consistent with
accounts of the turrets striking the seamount first and the hull sliding further
downslope afterward -- this is an inference from the account, not a surveyed
position, and is flagged as such.

## Position discrepancy (original discussion, kept for context)

`data/landmarks.json`'s `bismarck` entry gives lat 48.3336, lon -16.1067, and cites the
Wikipedia article as `coordinate_source`. **Wikipedia's own infobox coordinate is
48.16667N, 16.2W** (confirmed via the MediaWiki API, source 7) — about **20.7 km
south-south-west** of the landmarks.json point (haversine, this session). The
H.M.S. Hood Association's 2001 expedition report (source 4) separately cites "the
vicinity of 4809N 01607W" (48.15N, 16.117W), a third point, about 20.4 km south of
the landmarks.json coordinate and roughly 4 km west of Wikipedia's.

`data/tiles/bismarck` (already generated by C2, not owned by this pack) is centred
exactly on the landmarks.json coordinate — both the Wikipedia coordinate and the
2001-expedition coordinate fall **outside this tile's bounds** (south edge at
48.18349N). We could not regenerate the tile (out of scope for C4) and could not find
a primary source (an official survey report with a decimal coordinate) that
reconciles the three points this session. Two plausible explanations, neither
confirmed:

- The widely quoted "48°10'N 16°12'W" is a rounded DMS figure describing the
  scuttling/action position from 1941-era press and Admiralty accounts, not a precise
  1989 survey fix — contemporary reporting on Ballard's expedition said his team kept
  the exact coordinates confidential.
- `data/landmarks.json`'s coordinate may derive from a different, more precise source
  (a later expedition's GPS fix) that was not identified this session.

Given this, `bismarck-hull`'s `pois.json`/`props.json` entries use the tile's own
centre coordinate (the only one this tile's terrain supports) but are flagged
`confidence: "medium"` rather than `"high"`, and both `guide.json`'s `overview` entry
and `mission.json`'s facts state the conflict plainly rather than presenting either
coordinate as settled. This is analogous to the Endurance pack's Worsley-position
discrepancy (`plan/progress/C4-endurance.md`): report both, do not silently pick one.

## Depth check (superseded 2026-09; kept for context on the old tile)

| Point                             | lat, lon            | Tile terrain | Published                               |
| --------------------------------- | ------------------- | ------------ | --------------------------------------- |
| bismarck-hull (old tile centre)   | 48.33372, -16.10678 | 4,874.9 m    | 4,790-4,791 m (sources 1-2)             |
| bismarck-turret-debris (old)      | 48.3387, -16.1168   | 4,891.8 m    | (illustrative, no published coordinate) |
| bismarck-skid-trail (old)         | 48.336, -16.112     | 4,885.3 m    | (illustrative)                          |
| Old tile shallowest cell (summit) | 48.46336, -16.32980 | 3,812.9 m    | (GMRT only)                             |
| Old tile deepest cell             | 48.24528, -16.22543 | 5,009.0 m    | (GMRT only)                             |

The old hull reading was 84 m deeper than the commonly published 4,790-4,791 m — a
larger gap than Endurance's 7.7 m, consistent with the position discrepancy above:
that tile was centred on a different point than the one most sources use for the
depth figure.

## Depth check on the new tile (2026-09, bilinear sample of `heightmap.bin`)

| Point                         | lat, lon                           | Tile terrain | Published                               |
| ----------------------------- | ---------------------------------- | ------------ | --------------------------------------- |
| bismarck-hull                 | 48.15, -16.117                     | 4,218.5 m    | 4,790-4,791 m (sources 1-2)             |
| bismarck-turret-debris        | 48.15114, -16.10497                | 4,129.2 m    | (illustrative, no published coordinate) |
| bismarck-skid-trail           | 48.15063, -16.11032                | 4,182.1 m    | (illustrative)                          |
| Tile shallowest cell (summit) | 48.15504, -16.08147                | 4,023.8 m    | (GMRT only)                             |
| Tile deepest cell             | (unsampled; see meta.json `min_m`) | 5,009.1 m    | (GMRT only)                             |

The new hull reading is about 570 m shallower than the commonly published depth --
a much larger gap than the old tile's, because the sourced coordinate marks a
"vicinity" position on the seamount's upper flank rather than a decimal survey fix at
the hull's exact final resting spot. See "Position discrepancy -- resolved 2026-09"
above for why this was not corrected by moving the coordinate further.

## Bow/stern condition conflict

`data/landmarks.json`'s `wreck_meta.orientation_notes` states "upright on seabed, bow
separated from main hull." kbismarck.com (source 2) instead describes the hull as
"intact" with only "a small part of the stern that broke away at frame 10.5." These
are hard to reconcile from the sources gathered this session — they may describe
different things (a detached bow _section_ vs. a small stern _fragment_), or one may
be imprecise. Per `docs/props.md`'s hull-block `ends` field and the task brief's
explicit instruction, `props.json`'s hull uses `ends: ["prow", "rounded"]` (an intact
bow and stern shape, matching the "surprisingly good condition" account), and
`guide.json`'s `wreck-hull` entry states both claims rather than silently resolving
them.

## Fabricated vs. sourced

| Item               | Sourced (measured/published)                                                    | Reconstructed / estimated                                                                           |
| ------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Seabed terrain     | GMRT Synthesis (real, coarse)                                                   | Render-time detail noise (engine)                                                                   |
| Wreck position     | Conflicting published coordinates (see above)                                   | Tile-centre coordinate used, flagged medium confidence                                              |
| Wreck depth        | 4,790-4,791 m published; terrain reads 4,874.9 m at the used coordinate         | —                                                                                                   |
| Hull length / beam | 251 m / 36 m (published)                                                        | Box shape; 15 m height (unsourced estimate)                                                         |
| Hull heading       | "Upright" (qualitative)                                                         | Exact 20° value (arbitrary; no heading published)                                                   |
| Hull end shapes    | "Intact" per kbismarck.com                                                      | `[prow, rounded]`; conflicts with landmarks.json's "bow separated" note (both stated in guide.json) |
| Turret debris      | Turrets broke free and fell separately (multiple sources); Ballard found 1 of 4 | Exact positions (illustrative, up-slope of hull); debris-cluster stand-in shape                     |
| Battle-damage POI  | Pursuit, sinking timeline, scuttling-vs-shellfire debate (well sourced)         | Marker position (illustrative; no single "damage site" is surveyed)                                 |
| Seamount-flank POI | Real tile terrain readings                                                      | Interpretation ("this is a smoothed version of the real slope"), inference flagged as such          |
| Casualty figures   | 2,221 aboard, ~114 rescued, ~2,100 died (Wikipedia)                             | —                                                                                                   |
| Spawn point        | —                                                                               | Chosen for gameplay: 1.5 km NE of the hull, heading 225°                                            |

## Not verified / open

- **The wreck-depth-vs-terrain gap** (see "Depth check on the new tile" above) is
  now the main open item: the chosen coordinate (H.M.S. Hood Association 2001 fix)
  reads ~570 m shallower on this tile than the published wreck depth. No source
  consulted resolves whether this is because the "vicinity of" coordinate is
  imprecise, because the hull is further downslope than this point, or because
  GMRT's coarse fill here is simply wrong at this scale.
- **The original three-way position discrepancy** (landmarks.json's old unsourced
  point / Wikipedia's rounded infobox / the Hood Association fix) was resolved this
  session by choosing the Hood Association point, corroborated by a third published
  figure; see "Position discrepancy -- resolved 2026-09" above.
- **Bow-separated vs. stern-fragment-only** hull condition (previous section) is
  stated as an open conflict in `guide.json` rather than resolved.
- **Hull height (15 m) and heading (20°)** in `props.json` are unsourced estimates,
  flagged as such in the prop's own `note`.
- **Individual turret coordinates** are not published in any source found this
  session; the turret-debris POI/prop position is illustrative only, hence
  `confidence: "low"`.
- **Exact casualty figures** vary slightly by source (some cite 2,200-2,224 aboard,
  110-118 survivors); we use Wikipedia's 2,221 / ~114 and round to "roughly 2,100
  died" per the task brief, without claiming more precision than the sources support.

## OBIS command

```
python3 tools/obis_export.py --landmark bismarck --tile-bbox --out data/landmarks/bismarck/species.json
```

See `species.json`'s own `note` for the result and any widening applied.
