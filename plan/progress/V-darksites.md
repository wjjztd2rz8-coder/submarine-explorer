# V-darksites

Mission-mode golden frames, desktop and portrait, high tier. Before: `.cache/golden/2026-10-15-135505`.
After: `.cache/golden/2026-10-15-141805` (final values). Intermediate tries: `-140417` (ambient 7), `-141300` (ambient 5).

## Scores (1-5, desktop and portrait agree)

| Site     | Before | After | Notes                                                                                  |
| -------- | ------ | ----- | -------------------------------------------------------------------------------------- |
| Blake    | 3      | 3.5   | Floor, rubble and the mound silhouette now read; still the darkest of the four.        |
| Bismarck | 3      | 3.5   | Dropstone field and hull plates read beyond the lamp pool; stays cold and muted.       |
| Hunga    | 3      | 3.5   | Rim slope and basin patches read; orange lamp pool still gives the sub a clear anchor. |
| Hudson   | 2.5    | 3.5   | Ledge and floor readable; the big pale blobs (sediment plumes) are now faint haze.     |

## What changed (data only, no site branches)

- `SITE_SEABED_LIGHT` (src/core/config/atmosphere.ts): a per-site ambient floor (colour 0x879399, intensity 6) on the bands
  at 200 m and deeper for those four sites, via `siteLightWater`, composed next to `deepSiteWater` / `lowSiteWater`.
  Same pattern as the Low-tier table. Medium and High only; Low keeps its calibrated floor. Surface bands untouched.
- Hudson `mission.json` canyon-preset overrides: `plumeOpacity` 0.1, `plumeSizeM` 2.2, darker `plumeColor`. The "flat,
  out of scale sponge blobs" were the preset's sediment plumes catching the new light, not sponges (same override
  pattern as Monterey).
- Test: `tests/unit/lowSweepReadability.test.ts` covers the table (shallow bands unchanged, deep ambient raised, Low and unlisted sites identity).

Hero sites are not in the table. Gates: `PW_PORT=5872 tools/gates.sh` all PASS, no snapshots regenerated.

## Remaining

Blake is still the dimmest (dark carbonate palette); a brighter `colorA/B/C` in its biome entry is the next lever.
Bismarck hull and Hunga rim are small silhouettes at the 150-160 m approach; nothing further done here.
