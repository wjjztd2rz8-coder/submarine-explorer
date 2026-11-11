# V-challenger-lander-flag

## Changed

`src/world/props/geo/lander.ts` only.

- The flag was a flat swallow-tail triangle with an emissive orange material (it glowed). It is now an indexed cloth strip: 8 columns by 2 rows (16 triangles), hung from the mast on its left edge, rippled in depth with ripples growing away from the pole, and sagging slightly at the free end.
- Material: matt (roughness 1), not emissive, dull brick-orange `CLOTH` colour (0x6e2e12). The orange `FLAG` constant stays for the cable-coil torus.
- Triangles: the old flag was 2, the new one 16; lander stays inside 2000 (Low) / 3000 (High); still 3 draw calls. Header comment updated.

## Simplicity rules

1. Net simpler: 22 lines added, 38 removed; the hand-written vertex array became a loop.
2. No player text touched.
3. No layout patches.
4. No site branches.
5. No settings mutation.
6. No new spec; `landerVerification` and `props-geo` pass unchanged (run with vitest, 112 passed with deepOpening; full gates not run).
7. No package numbers in code.

## Screenshots

`.cache/codex/shots/V-challenger-lander-flag/{before,after}/challenger-deep-{1,2,3}.png` (golden free-dive, High tier, Challenger only).

## Remains

- Only the High tier was captured; Low not checked.
- Full `tools/gates.sh` not run; tsc and prettier clean, no eslint config exists in the repo root.
- Flag is a plain rectangle outline; no frayed tail or tie points.

## Rating

7/10: reads as hung, rippled, dull cloth instead of a glowing triangle; silhouette is still simple.
