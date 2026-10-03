# F-BEEBE-PLUME-VARIETY

Branch claude/f-beebe-plume-variety.

- VentPreset: new `aVar` attribute per particle (per-vent height 0.7-1.25, width 0.55-1.55, opacity 0.55-1.05, lean 0.45-1.65), derived deterministically from the orifice position via `ventVariety`.
- Lean: site-wide ambient lean direction plus the real current; bend grows as t^1.7 so columns start upright. Per-vent angle jitter from height scale.
- White-smoker wisps: 16% of each vent's particles re-purposed as a small pale plume 1-2 m beside the orifice (sulfide only); no extra draw call.
- Lit haze: one additive `ventHaze` Points draw (3 soft warm sprites per orifice, params `hazeGlow`, `hazeGlowSizeM`).
- smokePlume (smoker-cluster props): per-seed width, opacity, lean variety; cull bounds widened.
- Screenshots: .cache/golden/2026-10-03-234203 (first pass), .cache/golden/2026-10-03-234325 (final) vs previous /home/vijay/submarine-explorer/.cache/golden/2026-10-03-230949.
