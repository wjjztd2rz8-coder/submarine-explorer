# C4 Hunga Tonga caldera finish (this session)

Followed `plan/PHASE-C-CONTRACTS.md` §1-3, §5 (the tile predates the 15 Jan 2022
eruption; must say so plainly, describe the real post-eruption caldera from sources,
fabricate nothing). Only edited `data/landmarks/hunga-tonga-caldera/` (all 6 files,
new) plus this note; did not touch `src/`, `tests/` or any other landmark folder.

## What was done

1. Read `data/landmarks.json`'s entry and `data/tiles/hunga-tonga-caldera/meta.json`,
   sampled `heightmap.bin` (bilinear, same convention as `validate_landmark.py`) to
   find real terrain: a shallow basin (~0 to ~150 m) around the islands, consistent
   with the caldera floor and island saddle _before_ the eruption, and deeper outer
   flanks down to ~1,950 m. `min_m`/`max_m` in the tile's own meta.json (-1951.36 to
   +82.09, part of the tile being the two islands above sea level) already implies
   this is pre-eruption data: the real post-eruption caldera floor is ~850 m, far
   deeper than anything in this tile.
2. Sourcing: NIWA's own TESMaP project page (primary, NIWA co-led the post-eruption
   survey), Walker et al. 2024 (peer-reviewed, AGU) for pre-eruption caldera depth/
   diameter and the 2015/2017 pre-eruption survey history, and Wikipedia for eruption
   facts (date, plume height, tsunami, casualties) cross-checked against the AGU
   paper's introduction. Every `guide.json` entry cites >= 2 sources after a warning
   pass added a second source to two entries that started with one.
3. `pois.json` (4 POIs, all real terrain, `reconstruction: false`): the pre-eruption
   caldera floor (primary, 131.6 m in this tile vs. ~150-155 m published — close
   agreement), the island saddle (secondary, ~0 m, the shallow connection between
   Hunga Tonga and Hunga Ha'apai islands before the eruption separated them), an
   inner caldera wall point (secondary, medium confidence — identified from the
   tile's own bathymetry, not a named surveyed feature), and the outer submarine
   flank of the ~2-km-tall edifice (secondary, high confidence, matches the AGU
   paper's edifice-height figure).
4. `props.json`: empty array, per the task brief ("no props").
5. `guide.json` (5 entries, no memorial_note — this is not a grave site): an overview
   entry that states plainly, in its first paragraph, that this terrain predates the
   eruption, and describes the real post-eruption caldera (depth ~850 m, diameter
   ~4.8 km, TESMaP survey) entirely from sources rather than the terrain; then four
   entries for the caldera floor, island saddle, rim wall and outer flank, each
   stating what is real pre-eruption survey data and, where relevant, what changed
   since. `mission.json`'s briefing and every objective title also say "pre-2022
   survey" explicitly, per the task brief.
6. `mission.json`: `hull_class: "B"` per the task brief (a seamount preset, well
   beyond the ~150-1,950 m depths in this tile), spawn over the pre-eruption caldera
   at (-20.558, -175.388) -- checked to be in >= 60 m of water (145.7 m seabed here)
   -- heading 250° toward the caldera floor. Descent is well under a minute even at
   the deepest POI (~1,029 m at 16.2 m/s, 3x sim speed), so no mid-water-spawn
   warning is needed.
7. `species.json`: `tools/obis_export.py --landmark hunga-tonga-caldera --tile-bbox`
   returned 25 taxa / 1,068 records, mostly shallow Tongan reef fish (damselfish,
   wrasses, surgeonfish, butterflyfish). The `note` flags that OBIS records cannot
   be reliably dated to before/after the eruption, so no claim is made either way;
   placement in the mission is invented, as always.

## Validator

```
$ python3 tools/validate_landmark.py hunga-tonga-caldera --strict
OK: hunga-tonga-caldera, 0 error(s), 0 warning(s)
```

(Two warnings on first pass -- `island-saddle` and `rim-wall` guide entries each had
only 1 source -- fixed by adding a second source to each.)

## Not verified / open

- No named source identifies the specific "inner caldera wall" point used for
  `hunga-tonga-rim-wall`; it is picked out from the tile's own bathymetry and flagged
  `confidence: "medium"`.
- Reported casualty counts for the 2022 eruption vary slightly (6-9 depending on
  whether missing-persons reports are included); `guide.json` uses the conservative
  "at least 6" rather than a single precise figure.
- `species.json`'s OBIS records cannot be dated to before or after the eruption;
  stated as an open limitation in the file's own `note` rather than assumed either way.
