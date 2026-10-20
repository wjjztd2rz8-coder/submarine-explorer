# V-challenger-seabed

## Changed

- `src/world/props/geo/lander.ts` only (plus rebaselined fixtures and snapshots).
- Seabed dressing merged into the existing frame mesh (no new draw call): a dark disturbed-sediment halo around the footprint with alternating light and dark radial furrow bands and a ragged edge that dips under the floor, and six flattened, lumpy, half-buried clasts of varied size. It follows `groundHeight`, so it sits on the sloping floor. The frame bounds, impostor and collider still describe the lander alone, so placement is unchanged by the dressing.
- The three per-foot mud discs are removed (the halo replaces them). Low-tier legs use fewer rings. Triangles: low 1985 (budget 2000), medium/high 2822 (budget 3000).
- Flag: smaller (0.8 x 0.45 units, was 1.15 x 0.62) and hung about 60% up the mast instead of at the top, so it sits in open water clear of the objective card at 1280x720 and 390x844 in the opening poses (card bottom y 110 / 200; flag y 220-300 / 320-355).
- Rebaselined: `tests/fixtures/challenger-keepout.json`, deepOpening and freeDiveComposition snapshots (hero bounds moved a little because the flag and pads shrank).

## Simplicity rules

1. Net simpler: halo replaces the foot mud discs; no new element, setting or draw call.
2. No player text.
3. No HUD or layout patch: the flag moved, not the card.
4. No site branches: builder reads dims, tier and the ground sampler.
5. No settings or config mutation.
6. No new spec; `landerVerification` and the existing snapshot/fixture specs cover it.
7. No package numbers in code.

## Screenshots

`.cache/codex/shots/V-challenger-seabed-2/before/` and `after/` (`low-*` and `high-*`, desktop and portrait, poses 1-3; before holds high mission openings and free-dive poses).

## Remains

- Halo reads as a darker patch with a faint angular edge in some views, not fine ripples; its furrows are colour only. Fine ripples come from the existing terrain ripple term.
- Clasts are few and low-poly at 48 m; the polygonal faceting shows at close range.
- Flag is still a bright saturated shape at Low (Low tone mapping is brighter).
- Not checked: the 200 m mission opening shows the lander too small for the dressing to read.

## Rating

5/10 on composition (flag clear of the card is solid; seabed reads richer only modestly).
