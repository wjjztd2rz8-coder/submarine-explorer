# F-LOSTCITY-4: remove the checker repeat on Lost City terrain (progress)

Branch `claude/f-lostcity-4`. Shots: `.cache/codex/shots/f-lostcity-4/` (`base-*` before, `after-*` after; High and Low).

## Finding

The "checker" was not the texture tile repeating (the carbonate albedo is natural gravel) and not the vertex normals or baked cavity (both tested and ruled out). Zeroing the albedo contrast removed it, and it scaled with `materialTextureScaleM`: it was the gravel-scale albedo aliasing into a regular houndstooth on distant and grazing slopes, because mip selection / anisotropic taps were too sharp for a high-contrast pattern.

## What changed

- `src/shaders/terrain.frag.glsl`: `terrainAlbedo` takes the view distance and adds a mip bias `TERRAIN_FAR_MIP_BIAS (3.0) * smoothstep(3, 40, dist)` to every albedo fetch (all triplanar projections and the break-up sample). Near field (under 3 m) is unchanged; far field falls back to smooth mips. No extra fetches or ALU worth noting, so Low gets it too.
- CHANGELOG entry.

## Result

Lost City opening, High and Low: the weave is gone from the slope and far ridge. Mean luminance of the lower screen is unchanged (High 57.70 to 57.72, Low 72.65 to 72.18, about 0.7 percent on Low). Sub, framing, props untouched. Applies to every site's seabed.

## Known gaps

- Far terrain is now smoother; mid-range variation comes from the existing macro noise and stain only. A cheap second large-scale layer could be added if it reads bland.
- Verified under software WebGL (SwiftShader); real GPUs alias less, so the bias is conservative there.
