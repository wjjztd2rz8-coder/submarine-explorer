# V-lostcity-slice3

## Cause

- The Poseidon crown read as thin broken sheets because the main trunk asked for 22 flow ridges round a cylinder of only ~44 segments: two vertices per ridge period, so the crests aliased into large planar facets. The torn rim added to it with quantised `steps` and narrow `bite` cuts in `rimDrop`.
- The slope banding repeated because the terrain terrace used a short period with a strong parallel sine bed (`reliefBed`) on top.

## Change

- `towers.ts`: trunk ridges 22/14 to 9/6 (ridges are still painted as fine striations); paint pulls slightly toward warm white (less grey-blue and trough stain, paler base).
- `spire.ts` `rimDrop`: deleted the stair-step and bite terms, softer broad scoop and tooth radius jitter.
- `core/config/terrain.ts` (Lost City fidelity table): terrace 16 m / 1.5, `reliefBed` 0, so the slope breaks into wandering ledges rather than stripes.

## Screenshots (`.cache/codex/shots/V-lostcity-slice3/{before,after}/`)

High and Low, desktop frames 2 and 3, portrait frame 3. After: the crown is a thick eroded mass, outline organic, slope shows ledges. Low is paler and warm, reads well.

## Honest rating

Before ~3.3, after ~3.9 (High). Not 4+: the very top still has a few flat facets, the fixed golden pose aims at the mouth so the foot rubble is out of frame (not changed; pose is tooling), Low terrain does not resolve the terrace ledges (nearSubdiv), and the tower is warm grey rather than bright white. No third attempt made.

## Net simpler

Replaced, not added: removed the `chip`/`steps`/`bite` rim code, lowered a ridge count, and retuned two existing config numbers. No new code paths, settings or site branches. Low triangle counts unchanged (segment and ring counts untouched).

## Gates

See below.
