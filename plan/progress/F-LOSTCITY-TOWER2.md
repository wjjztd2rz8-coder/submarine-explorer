# F-LOSTCITY-TOWER2

Branch claude/f-lostcity-tower2. Files: src/world/props/geo/towers.ts, tools/golden-shots.mjs, tools/lostcity-poses.json (new), CHANGELOG.

## Built

- Palette: OLD/LIVE/CREAM/GREYBLUE/STAIN/TROUGH all lifted (LIVE 0xfaf6ec); ridge crest/trough multiplier 0.56..1.26 narrowed to 0.8..1.1; seams and streak noise cut. No brown clay tone remains on the trunk.
- Striations: two sine bands per spire in angle (4.5x and 11x the ridge count), perturbed by the ridge noise and height, pale/shaded, strongest on the upper trunk. Vertex colour only, no new draw.
- Orifice: white brucite fringe painted on the lip, narrower dark throat, plus one flat additive ring mesh per tall spire (top 3; shared RingGeometry and MeshBasicMaterial, opacity 0.14). The existing tier-scaled shimmerPlume stays the rising haze. All tiers get the ring (3 tiny draws).
- Golden pose: lost-city shots 2/3 now use tools/lostcity-poses.json (target 56 m up the trunk, 66 m above the seabed, 32 m standoff, from the SE) so the Poseidon mouth is framed beneath the HUD label. Filenames unchanged.

## Shots

.cache/codex/shots/f-lostcity-tower2/: base-high-{1,2,3}, after-high-{1,2,3}, after-low-{1,2,3} (no low base; shot framing differs from base-3 by design).

## Known gaps

- The surrounding seabed is the pale Lost City sediment, so contrast with the tower comes from the tower being brighter, not from a dark bed (terrain not touched).
- Striations are limited by trunk vertex density; subtle at range.
- The side-orifice smudge on the main trunk is still a soft vertex-painted blob.
- Unrelated: main checkout's node_modules was emptied during the work; this worktree now has its own `npm ci` install instead of the symlink.
