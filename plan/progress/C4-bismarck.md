# C4 Bismarck finish (this session)

Followed `plan/PHASE-C-CONTRACTS.md` §1-3, §5 (Bismarck is a war grave: `wreck` type,
`wreck` preset, GEBCO/GMRT fill only, hull class C). Only edited
`data/landmarks/bismarck/` (all 6 files, new) plus this note; did not touch `src/`,
`tests/` or any other landmark folder.

## What was done

1. Read `data/landmarks.json`'s `bismarck` entry and `data/tiles/bismarck/meta.json`,
   then sampled `heightmap.bin` directly (same bilinear convention as
   `validate_landmark.py`) to check terrain. The tile (bbox N 48.484/S 48.183/
   E -15.880/W -16.333, GMRT) is centred exactly on `data/landmarks.json`'s
   coordinate (48.3337N, 16.1068W); relief spans 3,812.9 m (a seamount summit in the
   tile's north corner) to 5,009.0 m.
2. **Position discrepancy, verified and documented rather than silently resolved.**
   Wikipedia's own infobox coordinate (confirmed via the MediaWiki API, not just the
   rendered page) is 48.1667N, 16.2W — about 20.7 km south-south-west of the
   landmarks.json/tile-centre coordinate, and **outside this tile's bounds**. A 2001
   H.M.S. Hood Association expedition report cites a third point, "vicinity of 4809N
   01607W" (48.15N, 16.117W), also outside the tile. Contemporary 1989 press coverage
   says Ballard's team kept the exact coordinates confidential, which may explain why
   the widely quoted DMS figure is a rounded approximation of the action/scuttling
   position rather than a precise wreck fix. We could not reconcile the three points
   this session; `bismarck-hull` uses the tile's own centre (the only coordinate this
   generated terrain supports) but is flagged `confidence: "medium"`, and both
   `guide.json`'s overview entry and `mission.json`'s briefing facts state the
   conflict plainly. Full writeup in `sources.md`.
3. Sourcing: Wikipedia (pursuit narrative, dimensions, casualties), kbismarck.com
   (hull condition, turret status), Magellan's own 2019 digital-twin survey
   announcement (primary for that survey), the H.M.S. Hood Association's 2001
   expedition report, a kbismarck.org forum thread on the turrets, and a 1991 U.S.
   Naval Institute Proceedings article on the shellfire-vs-scuttling debate. Every
   `guide.json` entry cites >= 2 sources. Full table with a Primary?/Secondary?
   column in `sources.md`.
4. **Bow/stern condition conflict**, also documented rather than resolved:
   `data/landmarks.json`'s own `wreck_meta.orientation_notes` says "bow separated
   from main hull"; kbismarck.com instead describes the hull as intact except a
   small stern fragment. `guide.json`'s `wreck-hull` entry states both. Per the task
   brief's explicit instruction, `props.json`'s hull uses `ends: ["prow", "rounded"]`
   (an intact bow/stern shape) regardless of this conflict.
5. `pois.json` (5 POIs): main hull (primary, medium confidence given the position
   issue), detached turret debris down-slope (secondary, low confidence — no public
   turret coordinates found), a battle-damage marker for the scuttling-vs-shellfire
   debate (secondary, medium), a real-terrain geology POI on the seamount flank
   (secondary, `reconstruction: false`, explains the coarse-fill limitation and gives
   this tile's own terrain readings vs. the published ~1 km/14.5° debris trail), and
   a memorial marker (secondary, no prop, `reconstruction: false`).
6. `props.json` (2 props): `procedural:hull-block` 251 x 36 x 15 m (height unsourced,
   heading arbitrary — both flagged) with `ends: ["prow", "rounded"]`, and a
   `procedural:debris` cluster standing in for the four detached main turrets,
   illustrative position down-slope, flagged `reconstruction: true` throughout.
7. `guide.json` (6 entries, `memorial_note` at top level): overview, the hull
   (including the bow/stern conflict), the turret debris, the sinking/scuttling
   debate, the seamount flank (real terrain, honest about the coarse fill and the
   unresolved skid-mark scale), and the memorial entry (~2,100 died, ~114 rescued).
   No salvage framing anywhere; every entry that touches the wreck itself carries
   respectful, museum-placard tone matching Endurance/Titanic.
8. `mission.json`: `hull_class: "C"` per the task brief (well beyond the site's
   ~4,875-4,791 m depending on coordinate), `environment.preset: "wreck"`, spawn
   1.5 km north-east of the hull at the surface, heading 225°. Descent at 3x sim
   speed (16.2 m/s) to ~4,875 m is ~5 minutes, well under the 12-minute guideline, so
   spawn is at the surface, not mid-water. `memorial_note` matches guide.json's.
9. `species.json`: `tools/obis_export.py --landmark bismarck --tile-bbox` returned 25
   taxa / 462 records, but every one has a reported depth range of ~5-10 m —
   near-surface plankton (dinoflagellates, copepods, diatoms), far shallower than the
   4,790+ m wreck; OBIS has no abyssal-depth records for this bbox. Noted explicitly
   in `species.json`'s own `note`; the deep-sea corals/sponges from
   `data/landmarks.json`'s `notable_species` are used only qualitatively (not as
   species-file entries, since OBIS did not return them here).

## Validator

```
$ python3 tools/validate_landmark.py bismarck --strict
OK: bismarck, 0 error(s), 0 warning(s)
```

(One warning on first pass — the memorial guide entry had only 1 source — fixed by
adding a second source.)

## Not verified / open

- **The three-way position discrepancy** (landmarks.json/tile-centre vs. Wikipedia vs.
  the 2001 H.M.S. Hood Association report) is the main open item. No source found
  this session resolves it; see `sources.md` for the full writeup and both
  candidate explanations.
- **Bow-separated vs. intact-hull-with-a-small-stern-fragment**: stated as an open
  conflict in `guide.json`, not resolved.
- **Hull height (15 m) and heading (20°)** in `props.json` are unsourced estimates.
- **Individual turret coordinates**: not published anywhere found; the turret-debris
  POI/prop is illustrative only (`confidence: "low"`).
- Exact casualty figures vary slightly by source (2,200-2,224 aboard, 110-118
  survivors cited variously); we use Wikipedia's 2,221 / ~114 and round to "roughly
  2,100 died" per the task brief.
