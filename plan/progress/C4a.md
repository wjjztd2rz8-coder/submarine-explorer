# C4a progress (stopped early on budget; landmarks NOT started)

## Tools (done, stdlib only, Python 3.9)

- `tools/obis_export.py --landmark <id> [--bbox N S E W | --tile-bbox] [--depth-min M --depth-max M] [--max 25] [--rank species|genus|any] [--depth-sample 2000] [--out path] [--refresh]`
  OBIS v3 `checklist` (paged, gives per-taxon record counts + taxonomy) ranks taxa; one `occurrence` page per kept taxon gives `depthRange_m` + most common `vernacularName` -> `commonName`. `group` from phylum/class. Cache `.cache/obis/`, >= 1 s sleep. Extra keys: `rank_filter`, `taxa_in_bbox`, `taxa_matching_rank`, `records_in_bbox`, per-species `taxonRank`.
  Why not occurrence paging: Monterey bbox has ~2.3 M occurrence records.
- `tools/validate_landmark.py <id>... | --all [--depth-tolerance 60] [--strict] [--quiet]`: JSON parse, pois/guide/mission/props/species schemas, guide_entry + objective poi refs, bbox, POI depth vs terrain (bilinear, same grid convention as Terrain.ts), hull class from Config.ts vs deepest POI (snapped POIs use terrain), spawn above seabed, preset list, props via validate_props + `reconstruction: true`.
- Tests: `tools/tests/test_obis_export.py` (18, urllib mocked), `tools/tests/test_validate_landmark.py` (24, temp repo + synthetic tile). `npm run test:py`: 104 OK.
- `validate_landmark.py titanic`: OK, 0 errors; warnings: no species.json, no mission `environment`.

## Notes for the next session (landmarks)

- Descent: 5.37 m/s vertical terminal (docs/missions.md), so 10,900 m is about 11.3 min at 3x plus transit. Plan: challenger-deep `spawn.depth_m` 6000 and say so in the briefing.
- Challenger tile: deepest cell 10,930.9 m at 11.3737 N 142.5973 E (Eastern Pool); 2nd basin 10,926.5 m at 11.3676 N 142.4270 E (~18.6 km west, make it secondary); axis sills at 142.518 E (10,720 m) and 142.496 E. North (inner) wall is steepest: 11.4055 N 142.5830 E, ~9,976 m, ~27 deg smoothed, a good geology POI. The published pin 11.3733/142.5917 reads 10,918 m. Hull C crush 11,000 m; warn band starts at 9,900 m (crushWarnRatio 0.9).
- Lost City tile: summit 724 m at 30.1255 N -42.1186 W. The landmarks.json pin (30.1167, -42.1167) reads 1,332 m (on the south wall), so do NOT use it for Poseidon; 30.125/-42.1183 reads 731 m. OBIS ICoMM samples sit at 30.124/-42.1193 (794 m). The south wall drops ~1,000 m within 2 km south of 30.12 N. OBIS: 192 taxa in the bbox, almost all microbial (ICoMM 2003, no depths), so run with `--rank any` or `genus` and say so.
- Monterey tile covers the canyon only to 2,333 m (published 3,600 m is outside). MARS (36.7128 N, -122.1868 W, 891 m) is inside (west edge -122.2004). OBIS has ~2.3 M records / 6,464 taxa; with 200-3600 m there are 884 taxa (top: Funiculina, Heteropolypus ritteri, Umbellula lindahli).
- `procedural:chimney` is basalt-coloured and props have no tint key, so Lost City's white carbonate chimneys will render grey. B4/C3 needs a colour/material option (e.g. `material_hint`).
