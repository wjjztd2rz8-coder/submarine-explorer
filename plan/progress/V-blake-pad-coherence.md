# V-blake-pad-coherence

Changed (one generic mechanism, `src/world/props/geo/coral.ts`, applies to every coral mound):

- Mound height profile keeps falling past the rim (no -3 cliff at r=1), so the edge sinks into the terrain.
- Vertex colour fades from pale framework to a seabed sediment tint within 4 m of the ground.

Net: about +6 lines, no new settings, no site branches.

Evidence: `.cache/codex/shots/opening-framing/underwater/blake-plateau-corals-40m.png` (PW_RENDER_REVIEW=1). Before: hard disc silhouette with a warm lip. After: base blends; the lower-front rim is still faintly lighter than the floor.

Self-rating: 3.5/4 on rubric (coherent, minor residual rim). props-geo unit 92 pass.
