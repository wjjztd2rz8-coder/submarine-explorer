# F-TITLE-LOOK: title scene polish

Status: complete. 2026-10-03. Files: `src/render/title/TitleScene.ts`, `TitleTerrain.ts`,
`tests/unit/titleScene.test.ts`, `titleRealTile.test.ts`, CHANGELOG.

## What changed

- Camera: offset (36, 17, 72) from the hull, look (-5, 1, -40), roll -3 degrees. Looks NW from
  the SE across the Monterey channel, so the terrace drops to the west channel on the left and
  rises on the right as a diagonal; the hull sits on that diagonal. The real relief near the
  anchor is gentle (about 5-10 degree slopes, ~100 m over 600 m); the strongest real structure is
  the channel to the W/NW, hence this heading. Terrain heights are untouched (still 160x160 cells,
  bilinear, no vertical exaggeration, no smoothing).
- Hull hovers `vehicleAboveFloorM` = 8.8 m (skids ~2 m up) over the sampled floor; `clearanceM`
  7 m (was 12 m) guards rig and camera. A shadow mesh is draped on the real floor beneath the hull
  (14x14 grid, one draw call).
- Lamps are aimed each frame at the sampled seabed 9 m ahead of the bow, so the pool lands on the
  sediment; each lamp has an additive fresnel cone (ShaderMaterial, no fog) as a cheap beam.
- Palette: teal-navy depth gradient, slate-teal on steep faces, warm sediment only near the anchor
  (colour mottling by hash; never heights). Fog 0x0f3a52 at 0.0018, gradient sky dome, hemisphere
  0x4a9cc4, rim 0x8fd0ea. Snow uses a soft round sprite, 170x80x170 m box.
- Framing: desktop x0.60/y0.58, silhouette 0.20; portrait x0.5/y0.4 (clear of the caption);
  short-landscape x0.4. Camera zoom floor lowered 1 -> 0.6 so the silhouette spec can be met.
- Sway: 0.8 m / 0.3 degrees (keeps total view swing under 1 degree at the closer camera).
- Budgets: High 25-26 calls / ~83k tris, Low 11 calls / ~16k (visible) in the lab harness.

## Deviations from F-TITLE-SPEC section 5 (shot-only)

Camera block, 35 m vehicle height and 12 m clearance were replaced per the director brief.
Honesty rules kept: real GMRT crop, real metres, single caption.

## Evidence

`.cache/codex/shots/f-title-look/`: `app-*` are the real Home at 1920x1080, 1280x720, 390x844,
844x390; `e3-1920x1080-high.png` is the bare scene (scratch harness in `.cache/look/`).

## Remaining weaknesses

- Source cells are 50-60 m, so ridges are soft with faint grid creases; real canyon walls are
  not dramatic at this anchor.
- Beams read as warm pools more than shafts of light; no depth-aware particle glow.
- Hull still reads slightly floating in stills; skids are 2 m above floor by design.
- Pool is overexposed at its core on High (ACES clips the lamp centre).
- 844x390 and portrait bands show only a crop of the pool.
