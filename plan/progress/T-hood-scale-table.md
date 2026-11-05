# T-hood-scale-table

2026-11-05 — **No tested scale/pose meets 25–30% visible hood in the top third
on both layouts with at least 5 m hull clearance.** There is therefore no
qualifying smallest scale/pose to name within this measured set. A larger
existing prop remains an authoring option, but neither the required scale nor
the need for a new geometry capability has been established.

The best measured compromise is **B, 3×, −25 m mount offset**: High visible
hood is **10.494% desktop / 24.202% portrait**, of which **10.494% / 24.018%**
of the whole screen lies in the top third. Minimum hull clearance is
**6.146 / 6.126 / 5.870 m on Low / Medium / High**. Across both layouts and all
tiers its worst upper-third coverage is **10.494%**. It fails the composition
target and the existing fixed-depth approach check; it is a review measurement,
not a proposed opening.

**B, 3×, 0 m** meets the composition number in portrait alone: upper-third
coverage is **28.499 / 28.299 / 28.274% on Low / Medium / High**, with the same
terrain-limited clearance. Its High desktop result is only **5.525%**. The
largest High desktop upper-third result, **28.815% at B, 3×, −50 m**, leaves
only **6.666%** in portrait and overlaps the enclosing hull sphere. Neither is
an all-layout answer. A and C never reach 5 m terrain clearance at these fixed
poses, independently of hood tuning.

**Measurement and scope.** Reused `tools/blue-hole-pose-search.mjs`,
`tools/lib/pose-projection.mjs`, and the saved A/B/C fixtures from
[T-bluehole-hood-poses.md](T-bluehole-hood-poses.md). Two deterministic rounds:
1.5×/2×/3× at −40/−20/0/+20/+40 m, followed by −60/−50/−35/−30/−25/−10 m.
Including unchanged baselines, this is **306 distinct tier/pose/scale/height
measurements, 612 full-resolution layout measurements**. The second round
checks the desktop-favouring lower mounts and refines the 3× clearance boundary.
This is a finite sample, not a continuous minimum or proof about other poses,
heights, or scales greater than 3×.

Every change is an in-memory uniform multiplier on **the complete existing
`karst-grotto-east` prop**, around its existing root, plus a world-Y offset.
The west prop, terrain, objective positions, A/B/C sub world positions, yaw and
camera settings stay fixed. `Props.replace()` rebuilds terrain-following
geometry and refreshes all colliders for each variant, as an actual existing-field
edit would. Only `grotto-overhang` + `stalactite-gallery` count as hood pixels;
the complete prop, including apron and compound colliders, counts for safety.
Nominal builder dimensions at 1.5×/2×/3× are respectively 84/112/168 m wide,
30/40/60 m projection, and 24/32/48 m high; these are not rendered bounds.

D = **1600×900**, P = **390×844**. Coverage is the union of rendered triangles
at pixel centres, clipped and depth-tested against terrain, other solid props,
the rest of the east prop, and the actual submarine. It excludes lighting, fog,
water effects and HUD. **Both coverage columns below are percentages of the
whole screen**; “top” means only hood pixels within the top third. A 25% result
therefore fills 75% of that third. The JSON also retains top-third fill and the
share of visible hood in that third, to avoid denominator ambiguity. Claude
still owns atmosphere, silhouette, and visual acceptance.

Clearance uses the previous audit's full-hull-vertex terrain minimum and
conservative enclosing-visible-hull-sphere distance to all prop colliders,
including the apron. `overlap` means the enclosing sphere intersects a collider;
it is not a negative measured penetration depth. All 306 cases keep the visible
hull inside both viewports and their 6 m prop-tested chase arm clear. The nine
1× baselines reproduce the previous saved audit **exactly**, including pixels,
clearance, sub poses and cameras.

**Best safe result per tested scale.** Ranked by the minimum upper-third
whole-screen fraction across both layouts and all three tiers; these are
measured maxima, not accepted placements.

| Scale | Pose / offset | Visible D / P, High | Top D / P, High   | Worst top, all tiers/layouts | Hull clearance L / M / H |
| ----- | ------------- | ------------------- | ----------------- | ---------------------------- | ------------------------ |
| 1×    | B / +0 m      | 2.819% / 2.381%     | 2.819% / 2.122%   | 2.051%                       | 6.146 / 6.126 / 5.870 m  |
| 1.5×  | B / +0 m      | 4.813% / 7.550%     | 4.813% / 7.358%   | 4.813%                       | 6.146 / 6.126 / 5.870 m  |
| 2×    | B / -20 m     | 8.191% / 10.145%    | 8.191% / 9.725%   | 8.191%                       | 6.146 / 6.126 / 5.870 m  |
| 3×    | B / -25 m     | 10.494% / 24.202%   | 10.494% / 24.018% | 10.494%                      | 6.146 / 6.126 / 5.870 m  |

**Complete scale/height table.** Coverage, route prop-hit distances and authored
scan-sphere overlaps are High; hull clearances are Low / Medium / High. Every
tier's unrounded measurements are retained in
[T-hood-scale-table.json](T-hood-scale-table.json). “Path W/E” is the first sample
where the enlarged east prop collides with the 12 m sub keepout on the prior
fixed-depth route toward the western/eastern gallery; `—` means no prop hit
on that sampled segment. Distances follow the previous audit's route parameter,
not flown distance along a piloted route. “Scan W/E” means the east prop's
colliders overlap the fixed authored 36 m scan spheres (Y/N). These overlap
checks use runtime collider semantics, including solid space below apron
surfaces; they are not just triangle/sphere intersection checks.

| Pose | Scale | Offset m | Visible D / P % | Top D / P %     | Hull clearance L / M / H m  | Path W/E m | Scan W/E |
| ---- | ----- | -------- | --------------- | --------------- | --------------------------- | ---------- | -------- |
| A    | 1×    | +0       | 2.351 / 2.359   | 2.351 / 2.359   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 1×    | +0       | 2.819 / 2.381   | 2.819 / 2.122   | 6.146 / 6.126 / 5.870       | — / —      | N / Y    |
| C    | 1×    | +0       | 2.772 / 2.410   | 2.772 / 2.123   | 4.551 / 4.541 / 4.823       | — / —      | N / Y    |
| A    | 1.5×  | -60      | 0.000 / 0.000   | 0.000 / 0.000   | 1.146 / 1.126 / 0.870       | — / 32     | N / N    |
| B    | 1.5×  | -60      | 0.000 / 0.000   | 0.000 / 0.000   | 6.146 / 6.126 / 5.870       | — / 32     | N / N    |
| C    | 1.5×  | -60      | 0.000 / 0.000   | 0.000 / 0.000   | 4.551 / 4.541 / 4.823       | — / 24     | N / N    |
| A    | 1.5×  | -50      | 0.345 / 0.282   | 0.233 / 0.000   | 1.146 / 1.126 / 0.870       | — / 40     | N / Y    |
| B    | 1.5×  | -50      | 0.353 / 0.293   | 0.000 / 0.000   | 6.146 / 6.126 / 5.870       | — / 32     | N / Y    |
| C    | 1.5×  | -50      | 0.380 / 0.312   | 0.024 / 0.000   | 4.551 / 4.541 / 4.823       | — / 24     | N / Y    |
| A    | 1.5×  | -40      | 1.096 / 0.898   | 1.096 / 0.000   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 1.5×  | -40      | 1.084 / 0.893   | 0.852 / 0.000   | 6.146 / 6.126 / 5.870       | — / 48     | N / Y    |
| C    | 1.5×  | -40      | 1.099 / 0.901   | 0.893 / 0.000   | 4.551 / 4.541 / 4.823       | — / 48     | N / Y    |
| A    | 1.5×  | -35      | 1.726 / 1.418   | 1.726 / 0.128   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 1.5×  | -35      | 1.705 / 1.401   | 1.693 / 0.000   | 6.146 / 6.126 / 5.870       | — / —      | N / Y    |
| C    | 1.5×  | -35      | 1.737 / 1.428   | 1.732 / 0.020   | 4.551 / 4.541 / 4.823       | — / —      | N / Y    |
| A    | 1.5×  | -30      | 2.331 / 1.913   | 2.331 / 0.572   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 1.5×  | -30      | 2.279 / 1.870   | 2.279 / 0.128   | 6.146 / 6.126 / 5.870       | — / —      | N / Y    |
| C    | 1.5×  | -30      | 2.337 / 1.922   | 2.337 / 0.251   | 4.551 / 4.541 / 4.823       | — / —      | N / Y    |
| A    | 1.5×  | -25      | 2.942 / 2.457   | 2.942 / 1.848   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 1.5×  | -25      | 2.902 / 2.382   | 2.902 / 0.572   | 6.146 / 6.126 / 5.870       | — / —      | N / Y    |
| C    | 1.5×  | -25      | 2.987 / 2.457   | 2.987 / 0.823   | 4.551 / 4.541 / 4.823       | — / —      | N / Y    |
| A    | 1.5×  | -20      | 3.441 / 3.074   | 3.441 / 2.933   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 1.5×  | -20      | 3.574 / 2.975   | 3.574 / 1.872   | 6.146 / 6.126 / 5.870       | — / —      | N / Y    |
| C    | 1.5×  | -20      | 3.536 / 3.054   | 3.536 / 1.962   | 4.551 / 4.541 / 4.823       | — / —      | N / Y    |
| A    | 1.5×  | -10      | 3.754 / 5.268   | 3.754 / 5.268   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 1.5×  | -10      | 5.222 / 5.165   | 5.222 / 4.865   | 6.146 / 6.126 / 5.870       | — / —      | N / Y    |
| C    | 1.5×  | -10      | 5.020 / 5.254   | 5.020 / 4.844   | 4.551 / 4.541 / 4.823       | — / —      | N / Y    |
| A    | 1.5×  | +0       | 3.224 / 7.647   | 3.224 / 7.647   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 1.5×  | +0       | 4.813 / 7.550   | 4.813 / 7.358   | 6.146 / 6.126 / 5.870       | — / —      | N / Y    |
| C    | 1.5×  | +0       | 4.768 / 7.669   | 4.768 / 7.334   | 4.551 / 4.541 / 4.823       | — / —      | N / Y    |
| A    | 1.5×  | +20      | 1.050 / 10.372  | 1.050 / 10.372  | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 1.5×  | +20      | 1.937 / 10.146  | 1.937 / 10.146  | 6.146 / 6.126 / 5.870       | — / —      | N / Y    |
| C    | 1.5×  | +20      | 1.913 / 10.235  | 1.913 / 10.235  | 4.551 / 4.541 / 4.823       | — / —      | N / Y    |
| A    | 1.5×  | +40      | 0.174 / 13.707  | 0.174 / 13.707  | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 1.5×  | +40      | 1.101 / 13.670  | 1.101 / 13.670  | 6.146 / 6.126 / 5.870       | — / —      | N / Y    |
| C    | 1.5×  | +40      | 1.126 / 13.662  | 1.126 / 13.662  | 4.551 / 4.541 / 4.823       | — / —      | N / Y    |
| A    | 2×    | -60      | 2.632 / 1.590   | 0.678 / 0.000   | 1.146 / 1.126 / 0.870       | — / 16     | N / N    |
| B    | 2×    | -60      | 2.707 / 1.633   | 0.020 / 0.000   | 3.117 / 2.367 / 1.227       | — / 16     | N / N    |
| C    | 2×    | -60      | 2.637 / 1.786   | 0.165 / 0.000   | overlap / overlap / overlap | — / 16     | N / N    |
| A    | 2×    | -50      | 6.063 / 4.157   | 5.497 / 0.039   | 1.146 / 1.126 / 0.870       | — / 32     | N / Y    |
| B    | 2×    | -50      | 5.948 / 4.024   | 2.637 / 0.000   | 4.266 / 3.430 / 2.352       | — / 24     | N / Y    |
| C    | 2×    | -50      | 6.010 / 4.367   | 2.919 / 0.032   | 0.516 / overlap / overlap   | — / 24     | N / Y    |
| A    | 2×    | -40      | 8.141 / 6.067   | 8.141 / 1.678   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 2×    | -40      | 8.140 / 5.756   | 7.936 / 0.393   | 6.146 / 6.126 / 5.870       | — / 32     | N / Y    |
| C    | 2×    | -40      | 8.235 / 6.315   | 8.005 / 1.276   | 4.551 / 4.541 / 4.414       | — / 32     | N / Y    |
| A    | 2×    | -35      | 8.485 / 6.929   | 8.485 / 4.297   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 2×    | -35      | 8.790 / 6.536   | 8.762 / 1.678   | 6.146 / 6.126 / 5.870       | — / 48     | N / Y    |
| C    | 2×    | -35      | 8.609 / 7.145   | 8.581 / 2.686   | 4.551 / 4.541 / 4.823       | — / 48     | N / Y    |
| A    | 2×    | -30      | 8.064 / 7.907   | 8.064 / 6.923   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 2×    | -30      | 9.201 / 7.464   | 9.199 / 4.324   | 6.146 / 6.126 / 5.870       | — / 48     | N / Y    |
| C    | 2×    | -30      | 8.642 / 8.126   | 8.640 / 4.994   | 4.551 / 4.541 / 4.823       | — / 48     | N / Y    |
| A    | 2×    | -25      | 6.750 / 9.060   | 6.750 / 8.902   | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 2×    | -25      | 8.948 / 8.565   | 8.948 / 7.167   | 6.146 / 6.126 / 5.870       | — / 48     | N / Y    |
| C    | 2×    | -25      | 8.430 / 9.302   | 8.430 / 7.722   | 4.551 / 4.541 / 4.823       | — / 48     | N / Y    |
| A    | 2×    | -20      | 5.397 / 10.672  | 5.397 / 10.659  | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 2×    | -20      | 8.191 / 10.145  | 8.191 / 9.725   | 6.146 / 6.126 / 5.870       | — / 48     | N / Y    |
| C    | 2×    | -20      | 8.102 / 10.933  | 8.102 / 10.314  | 4.551 / 4.541 / 4.823       | — / 48     | N / Y    |
| A    | 2×    | -10      | 4.535 / 15.034  | 4.535 / 15.034  | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 2×    | -10      | 7.216 / 14.606  | 7.216 / 14.392  | 6.146 / 6.126 / 5.870       | — / 48     | N / Y    |
| C    | 2×    | -10      | 7.089 / 15.342  | 7.089 / 15.012  | 4.551 / 4.541 / 4.823       | — / 48     | N / Y    |
| A    | 2×    | +0       | 3.681 / 18.769  | 3.681 / 18.769  | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 2×    | +0       | 5.982 / 18.385  | 5.982 / 18.312  | 6.146 / 6.126 / 5.870       | — / 48     | N / Y    |
| C    | 2×    | +0       | 5.729 / 18.930  | 5.729 / 18.744  | 4.551 / 4.541 / 4.823       | — / 48     | N / Y    |
| A    | 2×    | +20      | 0.976 / 21.493  | 0.976 / 21.493  | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 2×    | +20      | 2.441 / 21.737  | 2.441 / 21.737  | 6.146 / 6.126 / 5.870       | — / 48     | N / Y    |
| C    | 2×    | +20      | 2.209 / 21.265  | 2.209 / 21.265  | 4.551 / 4.541 / 4.823       | — / 48     | N / Y    |
| A    | 2×    | +40      | 0.190 / 22.284  | 0.190 / 22.284  | 1.146 / 1.126 / 0.870       | — / —      | N / Y    |
| B    | 2×    | +40      | 1.405 / 23.630  | 1.405 / 23.630  | 6.146 / 6.126 / 5.870       | — / 48     | N / Y    |
| C    | 2×    | +40      | 1.398 / 23.594  | 1.398 / 23.594  | 4.551 / 4.541 / 4.823       | — / 48     | N / Y    |
| A    | 3×    | -60      | 29.238 / 13.289 | 26.158 / 2.775  | overlap / overlap / overlap | 8 / 8      | N / Y    |
| B    | 3×    | -60      | 30.197 / 12.054 | 20.122 / 0.692  | overlap / overlap / overlap | 8 / 8      | N / Y    |
| C    | 3×    | -60      | 31.529 / 14.655 | 20.373 / 2.195  | overlap / overlap / overlap | 16 / 8     | N / Y    |
| A    | 3×    | -50      | 24.288 / 16.344 | 24.150 / 10.663 | overlap / overlap / overlap | — / 8      | N / Y    |
| B    | 3×    | -50      | 29.467 / 15.146 | 28.815 / 6.666  | overlap / overlap / overlap | — / 8      | N / Y    |
| C    | 3×    | -50      | 28.687 / 17.545 | 27.448 / 8.693  | overlap / overlap / overlap | — / 8      | N / Y    |
| A    | 3×    | -40      | 14.183 / 19.310 | 14.183 / 18.167 | 0.641 / 1.126 / 0.133       | — / 40     | N / Y    |
| B    | 3×    | -40      | 20.055 / 18.155 | 19.999 / 14.549 | overlap / overlap / overlap | — / 8      | N / Y    |
| C    | 3×    | -40      | 19.780 / 20.387 | 19.717 / 16.740 | overlap / 0.695 / overlap   | — / 16     | N / Y    |
| A    | 3×    | -35      | 10.235 / 21.046 | 10.235 / 20.767 | 1.146 / 1.126 / 0.870       | — / 40     | N / Y    |
| B    | 3×    | -35      | 15.691 / 19.863 | 15.691 / 18.281 | 0.641 / 2.547 / 0.133       | — / 40     | N / Y    |
| C    | 3×    | -35      | 15.601 / 22.149 | 15.601 / 20.275 | 2.828 / 3.531 / 1.297       | — / 40     | N / Y    |
| A    | 3×    | -30      | 7.206 / 22.742  | 7.206 / 22.704  | 1.146 / 1.126 / 0.870       | — / 40     | N / Y    |
| B    | 3×    | -30      | 12.416 / 21.848 | 12.416 / 21.384 | 4.594 / 6.126 / 4.086       | — / 40     | N / Y    |
| C    | 3×    | -30      | 12.460 / 23.416 | 12.460 / 22.809 | 4.551 / 4.541 / 4.823       | — / 40     | N / Y    |
| A    | 3×    | -25      | 5.541 / 24.909  | 5.541 / 24.909  | 1.146 / 1.126 / 0.870       | — / 40     | N / Y    |
| B    | 3×    | -25      | 10.494 / 24.202 | 10.494 / 24.018 | 6.146 / 6.126 / 5.870       | — / 40     | N / Y    |
| C    | 3×    | -25      | 10.672 / 25.123 | 10.672 / 24.867 | 4.551 / 4.541 / 4.823       | — / 40     | N / Y    |
| A    | 3×    | -20      | 4.779 / 27.015  | 4.779 / 27.015  | 1.146 / 1.126 / 0.870       | — / 40     | N / Y    |
| B    | 3×    | -20      | 9.321 / 26.491  | 9.321 / 26.352  | 6.146 / 6.126 / 5.870       | — / 40     | N / Y    |
| C    | 3×    | -20      | 9.531 / 26.845  | 9.531 / 26.646  | 4.551 / 4.541 / 4.823       | — / 40     | N / Y    |
| A    | 3×    | -10      | 4.385 / 28.455  | 4.385 / 28.455  | 1.146 / 1.126 / 0.870       | — / 40     | N / Y    |
| B    | 3×    | -10      | 8.456 / 29.756  | 8.456 / 29.675  | 6.146 / 6.126 / 5.870       | — / 40     | N / Y    |
| C    | 3×    | -10      | 8.417 / 29.727  | 8.417 / 29.563  | 4.551 / 4.541 / 4.823       | — / 40     | N / Y    |
| A    | 3×    | +0       | 1.975 / 26.240  | 1.975 / 26.240  | 1.146 / 1.126 / 0.870       | — / 40     | N / Y    |
| B    | 3×    | +0       | 5.525 / 28.274  | 5.525 / 28.274  | 6.146 / 6.126 / 5.870       | — / 40     | N / Y    |
| C    | 3×    | +0       | 5.365 / 28.411  | 5.365 / 28.411  | 4.551 / 4.541 / 4.823       | — / 40     | N / Y    |
| A    | 3×    | +20      | 0.484 / 18.980  | 0.484 / 18.980  | 1.146 / 1.126 / 0.870       | — / 40     | N / Y    |
| B    | 3×    | +20      | 1.206 / 20.732  | 1.206 / 20.732  | 6.146 / 6.126 / 5.870       | — / 40     | N / Y    |
| C    | 3×    | +20      | 0.572 / 21.014  | 0.572 / 21.014  | 4.551 / 4.541 / 4.823       | — / 40     | N / Y    |
| A    | 3×    | +40      | 0.494 / 18.756  | 0.494 / 18.756  | 1.146 / 1.126 / 0.870       | — / 40     | N / Y    |
| B    | 3×    | +40      | 2.394 / 19.990  | 2.394 / 19.990  | 6.146 / 6.126 / 5.870       | — / 40     | N / Y    |
| C    | 3×    | +40      | 2.276 / 20.237  | 2.276 / 20.237  | 4.551 / 4.541 / 4.823       | — / 40     | N / Y    |

**Collision and objective interpretation.** Every case still fails the existing
fixed-depth route toward **both** galleries because of terrain. The first terrain
failure is at route parameter 16 or 24 m toward east and 168 or 176 m toward west,
depending on pose/tier. This uses the prior 8 m steps, 12 m keepout, and 32.5 m
mission scan-cap endpoint. It is a sampled comparison, not a continuous swept-hull
or piloted 3D route guarantee. No route rule was relaxed.

For the best compromise, B / 3× / −25 m, the east-directed route first fails
terrain at 24 m and also hits the east prop at 40 m on every tier. The west route
hits terrain at 168 m and no prop. Lower 3× mounts can add collisions even to the
west-directed departure; the table records those rather than hiding them behind
the pre-existing terrain failure.

The east prop overlaps **neither the western authored 36 m sphere nor its Arcade
100 m sphere in any variant**. The east 36 m sphere already overlaps the unchanged
prop; some deeply lowered variants cease overlapping it. The east 100 m resolved
sphere overlaps the prop in every variant. Overlap with part of a scan region
does not mean the entire scan region is blocked, and no scanner rule treats the
whole scan sphere as a keepout. The objective centre itself is already inside
runtime collision space at baseline. Scan reachability cannot be inferred from
this overlap flag alone.

A/B/C remain roughly 81–84 m from the eastern objective, already inside Arcade's
100 m resolved scan floor, and roughly 224–229 m from the western gallery. Both
objectives remain at their original coordinates and height throughout this
experiment. The shipped opening still faces the west gallery; these measurements
do not change its subject, route, or objective order.

**Existing authoring surface.** If a visually accepted scale/mount change is
chosen later, use `data/landmarks/great-blue-hole/props.json`, the
`id: "karst-grotto-east"` entry's existing **`scale`** and **`y_offset_m`** fields.
`src/world/PropLoader.ts` already parses both; `Props.replace()` and
`Props.place()` in `src/world/Props.ts` already rebuild/reposition the geometry
and colliders. No site-specific branch, new builder parameter, or new capability
is required to test uniform whole-prop scaling or mount height. Scaling only the
two child meshes would be a different experiment and would need matching apron
and collider handling. This report does not establish that such selective scaling
is necessary. No runtime code, site data, mission pose, scan radius or collision
rule was changed.

**Reproduce.** Run from the repository root. The two commands include repeated
1× baselines; merge by tier/pose/scale/offset, as in the retained JSON.

```sh
node tools/blue-hole-pose-search.mjs --scale-table .cache/hood-scale/round1.json
BLUEHOLE_OFFSETS=-60,-50,-35,-30,-25,-10 \
  node tools/blue-hole-pose-search.mjs --scale-table .cache/hood-scale/round2.json
node tools/tests/pose-projection.test.mjs
```

**Validation and gate follow-up.** CPU projection tests pass (5/5), and the
nine baseline tier/pose combinations match the previous committed audit exactly.
The retained dataset has 306 unique rows, all hulls onscreen, all chase arms clear
of props, and no variant passing the combined 25%/5 m threshold. Numeric
measurements and conclusions are unchanged by the test-performance fix below.

The orchestrator's unrestricted `tools/gates.sh` run passed Python, content,
production build, root smoke e2e, project-base e2e, attribution and formatting.
Its only failure was `Blue Hole saved hood pose B agrees with pinhole rays on
both actual viewports`: it exceeded the existing **30,000 ms** unit-test limit.
The other **4,583 tests passed**. Logs are under
`.cache/runs/20261105-070912-4129375-HVFp4b/`. This identifies a real test-runtime
problem separately from this sandbox's process/network restrictions.

Profiling the original test here measured **5.68 s scene setup, 0.58 s total
rasterization, and 21.36 s raycasting**. Each of the 1,920 pinhole rays traversed
dense meshes, and hood geometry was queried separately as well as in the full
scene. Those costs left too little margin for suite contention.

The fix is confined to tests. `tests/unit/helpers/partitionedRaycast.ts` batches
static geometry's original triangle indices into groups with conservative bounds;
Three's existing raycaster still intersects the candidate triangles with the
original vertex attributes, material and world transform. All intersections are
retained, so a hood behind terrain still establishes projected hood while the
nearest intersection establishes visible hood. Specialized/instanced/deformed
meshes and material arrays retain their native raycast. Batches are rebuilt after
each viewport's terrain LOD selection. No rasterizer matrices enter the
independent pinhole construction.

**No assertion, ray sample, viewport, geometry detail, coverage threshold or
timeout was reduced or relaxed.** Both full-resolution rasterizations, all
1,920 pixel comparisons for each label, and the positive/occluded-hit checks
remain. The default 30 s timeout and gate script remain unchanged. Three added
equivalence tests compare complete batched/native Three intersections across
indexed and non-indexed meshes, transforms, front/back/double sided materials,
draw ranges, near/far clipping and instanced meshes; they compare identity,
distance, point, face index, face data and UVs.

```sh
npx vitest run --configLoader runner --cache=false --reporter=verbose \
  tests/unit/lowTierFollowups.test.ts tests/unit/partitionedRaycast.test.ts
```

**Result: 20 tests passed**, including the complete affected spec. The formerly
timed-out test completed in **7.231 s** in this run; both files completed in
39.88 s. Two additional fresh concurrent runs passed in **7.498 s and 7.468 s**
for this test (8.16 s / 8.14 s total processes), retaining ample margin under the
30 s limit. TypeScript and repository-wide formatting checks pass. A complete
post-fix gate run still requires the orchestrator's unrestricted environment;
the earlier full gate result is not presented as a post-fix pass.

Relevant e2e specs were found with `rg` in `tests/e2e`. The original targeted
commands below, and a post-fix rerun of the east-gallery command, fail here before
browser tests execute because the Playwright web server cannot start. Earlier
`DEBUG=pw:webserver` output records `connect EPERM` to both `::1` and
`127.0.0.1`. The orchestrator's unrestricted smoke and project-base e2e gates
passed before this test-only fix. No site/runtime behavior changed; Claude still
owns visual acceptance of any future hood authoring change.

```sh
PW_PORT=4195 PW_OUTDIR=dist-hood-scale GATES_CONFIG_MODE=writable \
  npx playwright test tests/e2e/opening-framing.spec.ts \
  -g 'great-blue-hole.*(mission previews and opens on an approach outside scan range|sub and HUD remain fully visible after 3 s|underwater free-dive opening)'
PW_PORT=4196 PW_OUTDIR=dist-hood-scale GATES_CONFIG_MODE=writable \
  npx playwright test tests/e2e/f-lowtier-followups.spec.ts \
  -g 'Blue Hole east gallery owns its scan card at both authored poses'
```
