# V-challenger-lander-presence

Built: Leggo lander enlarged (props.json dimensions 26x26x34 -> 44x44x39 m: 1.7x wider; height is capped because deepOpening's audit needs every solid vertex within the 40 m scan radius, so the mast stays short) and given a bait-station glow in the shared builder `src/world/props/geo/lander.ts` (no site branch): additive halo sprite over the cage, additive lit pool on the seabed, and a shader-animated amphipod swarm (`makePlume`, one Points cloud). Fog is off on the glow so it survives the murk; additive only, so never darker.

See it: `GOLDEN_SITES=challenger-deep tools/golden.sh`; before `.cache/golden/2026-11-12-084527/`, after `.cache/codex/shots/V-challenger-lander-presence/after3.png`.

Tiers: swarm count 160*growth+40 (low 80, medium 136, high/ultra 200). Body stays 3 opaque draws; glow adds 3 more (sprite, pool, swarm). Body triangle budget unchanged; unit test `landerVerification` now budgets body and extras separately.

Rating vs target: lander roughly 2x taller in frame, warm glow pool and pink swarm around the cage read within 3 s; objective is now the brightest thing on screen. Gap: the sprite halo is clipped by the seabed (flat lower edge); raising it made a floating smudge and was reverted. Swarm is subtle at the 140 m opening distance.

Rebaselined (intended): tests/fixtures/challenger-keepout.json, deepOpening and freeDiveComposition snapshots (opening pose shifts with hero size). Test change: deepOpening scan-boundary audit skips meshes flagged `userData.lightOnly` (the additive pool). Solid seabed dressing scale is capped at 6.5 so it stays inside the scan sphere. Also seen: the pool has a hard lower edge where the seabed clips it.
