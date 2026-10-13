# 1410 — Blue Hole bowl facets

Status: two geometry/implementation review rounds complete; final gates running. **Fresh browser captures and visual acceptance are blocked by the workspace runtime.** All existing assertions are retained.

## Plan and scope

1. Inspect the supplied `2026-10-11-171945/great-blue-hole-2.png`, both gallery builders, Low budgets and the unresolved collision finding from 1360.
2. Round 1: resolve undersampled apron folds with smoother normals and more riser samples; vary sediment finish and shade concave contacts without adding textures, draws or changing the gallery roof/pendants.
3. Round 2: check gallery framing, exact Low triangle counts, normal continuity, rendered rock seating and collision measurements on actual GMRT terrain; refine and run full gates.
4. Retain before evidence and capture after images when the browser can run. Log any unavailable acceptance explicitly.

Simplicity: this extends the existing talus builder and gallery finish. No new UI, settings surface, dependency, geometry module or site branch in shared code. Tests extend the existing Blue Hole and talus capabilities.

## Round 1

- Inspected the supplied approach image: broad cream treads are broken into triangular wedges and abrupt riser transitions. The apron already had indexed smooth normals and a smooth material; the problem was coarse surface sampling, not `flatShading=true` (only the fallen rocks use that).
- Added optional central-difference normal sampling to `buildTalusMesh`, including the final contact fade and buried rim. Default callers retain triangle-derived normals. Blue Hole samples at 0.7 m, so Low's lighting no longer depends on its coarse triangle diagonals.
- Broadened the riser transition from 0.22 to 0.32 of each 1.7 m bed. The existing level-tread, bounded-lift and preserved-contact assertions still pass.
- Doubled rows across the apron on Medium/High/Ultra. A first trial reallocated Low's columns to rows within its existing triangle count, but shifted the east lower bound by 0.032 m. Removed that trial to retain exact framing bounds; Low keeps the original grid.
- Added restrained per-bed roughness through an interpolated vertex attribute, composed with existing west/east light shaders. Vertex colour now shades concave riser feet with a maximum 18% contact darkening, feathered out at wall and rim. Broad warm/cool silt variation remains; no contour texture is sampled.
- Existing fallen blocks are retained, with the existing rendered-triangle seating correction. No new rubble or sponge instances were necessary. Pendant and wall geometry are unchanged.
- Baseline focused suite: 35 tests pass. Round 1: 85 tests pass.

## Round 2

- Added capability coverage for grid-independent unit normals without moved vertices; exact Low submitted-triangle/draw budgets; unchanged gallery bounds/colliders and roof/pendant/sponge geometry; bounded, varied roughness; and preservation of existing east opening and scattered-light shaders.
- The new roughness-range check initially failed: the chosen 0.06 multiplier produced only a 0.017 spread on the flat-ground gallery. Increased the production multiplier to 0.10; did not loosen the assertion. The finish checks now pass (40 tests).
- The actual-terrain audit confirms exact gallery bounds on all four tiers and unchanged wall, pendant and sponge geometry hashes. Only the apron and higher-tier fallen-block seating matrices change.

| Tier   | West triangles before → after | East triangles before → after | Draws per gallery |
| ------ | ----------------------------- | ----------------------------- | ----------------- |
| Low    | 11,482 → 11,482               | 9,746 → 9,746                 | 4 → 4             |
| Medium | 35,694 → 37,972               | 32,778 → 34,398               | 5 → 5             |
| High   | 58,536 → 62,064               | 55,430 → 57,976               | 5 → 5             |
| Ultra  | 122,662 → 129,506             | 121,372 → 126,260             | 5 → 5             |

These are CPU-side submitted prop triangles, including instances, not browser renderer counters. Low still has no `fallen-blocks` draw. Source evidence: `.cache/1410/budget-before.json`, `.cache/1410/budget-final.json`.

## Collision and rock seating

The 1360 audit still passes its existing contact-detection and rock-seating assertions. All 384 Ultra rocks touch the rendered apron; maximum residual floating gap is below 0.000001 m. Its stronger clearance measurement still reports unresolved sphere/triangle intersections:

| Tier / gallery | Before unresolved / sampled | After unresolved / sampled |
| -------------- | --------------------------- | -------------------------- |
| Low west       | 37 / 107                    | 34 / 103                   |
| Low east       | 2 / 75                      | 2 / 70                     |
| Ultra west     | 228 / 694                   | 403 / 1,306                |
| Ultra east     | 6 / 491                     | 13 / 931                   |

Higher-tier rows double the sampling density; raw counts are not a like-for-like improvement/regression verdict. No sampled contact misses all colliders. The collision boxes remain exactly unchanged. Their profile omits the actual rendered terrace skin, so expanding boxes would also affect navigation through the galleries; that is outside a small visual correction and remains the separate collision work. This package does **not** claim full sphere clearance. Evidence: `.cache/1410/contacts-before.json`, `.cache/1410/contacts-final.json`.

## Screenshots and browser limitation

- `.cache/codex/shots/1410-f-bluehole-bowl-facets/before/` contains all five supplied high-tier Blue Hole golden PNGs plus the original pose manifest. `SOURCE.txt` identifies them as the supplied reference, not fresh captures.
- The checkout's shots path originally symlinked to a different, read-only checkout. Replaced that local symlink with a local directory so evidence stays in this writable workspace; no destination files were changed.
- Browser skill bootstrap and troubleshooting completed: no browser session is available (empty browser list).
- Local Vite preview is blocked by `listen EPERM` on `127.0.0.1:4410`. Standalone golden capture is also blocked at Chromium launch. Failure manifests are retained under the shots directory; **there are no fresh before/after screenshots** and no visual acceptance claim.

## Validation

Final results pending; logs are in `.cache/1410/` and `.cache/gates/`.

## Remaining visual acceptance

In a browser-capable workspace, run the retained build and authored poses:

```bash
npm run preview -- --port 4410 --strictPort --outDir dist-1410
GOLDEN_SITES=great-blue-hole GOLDEN_TIER=high \
  GOLDEN_LAYOUTS=desktop,portrait,landscape \
  node tools/golden-shots.mjs http://localhost:4410/
GOLDEN_SITES=great-blue-hole GOLDEN_TIER=low \
  GOLDEN_LAYOUTS=desktop,portrait,landscape \
  node tools/golden-shots.mjs http://localhost:4410/
PW_PORT=4411 PW_OUTDIR=dist-1410 tools/gates.sh --full-e2e
```

Copy each generated golden folder, including `poses.json`, into the local shots directory as `after-high` and `after-low`. Compare both gallery approach/detail poses to the supplied before references; inspect tread/riser shading, sediment tone, rock seating, wall/rim seams and Low phone readability. Move across risers to inspect flicker and the known collision-envelope gap. Static geometry evidence does not replace that review.
