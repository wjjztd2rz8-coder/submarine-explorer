# V-kama-subject

## What changed

- Kama biome (src/world/TerrainBiome.ts): mottle 0.3 to 0.1, patch 0.2 to 0.08, stainAmount 0.12 to 0.06, colorB nearer colorA. Slope is now a calm even tint.
- Hiolo North pillow heap moved from ~95 m east to against the chimney's east flank (data/landmarks/kamaehuakanaloa/props.json), so it reads as the vent's lava apron instead of a stray lump. Note text updated; nothing cut.

## Images

- Before: /home/vijay/submarine-explorer/.cache/golden/2026-11-01-081522/kamaehuakanaloa-1-mission.png
- After: .cache/golden/2026-11-01-144100/kamaehuakanaloa-1-mission.png

## Rating

About 6.5/10 (was ~4). Blotches gone, lump explained, frame not darker.

## Gaps

- Plume base is only marginally better lit; the slope far from the sub is still dark blue-grey.
- Pillow heap partly clips into the steep slope; only the desktop opening was viewed.

## Second pass 2026-11-02 (V-kama-subject, backlog 6a)

- Opening pose closer (chaseRadius 45, yaw 23, rangeM kept at 110: 105 or less puts the sub inside scan range and breaks the approach-opening spec) plus a secondary chimney field in props.json.
- Site specs (`tools/site-specs.sh kamaehuakanaloa`) 14/14 pass; golden desktop viewed: vent site, glow pool and several plumes fill the lower-left third, slope still dark on the right. About 3.8.
