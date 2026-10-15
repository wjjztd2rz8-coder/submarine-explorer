# V-sub-scale

## Approach (data only; camera tweaks reverted, `src/` identical to main)

Earlier camera-only attempts (Beebe range/radius, Challenger radius 84) gave little and were reverted as churn.

- Challenger: lander `dimensions_m` [9,9,12] to [26,26,34] in `data/landmarks/challenger-deep/props.json`. The note already says Leggo's real size is unknown, so this stays honest. Desktop: lander about as tall as the sub (flag to foot ~330 px against ~310 px); phone: clearly larger. MET.
- Beebe: hero stack `dimensions_m` [26,20,12] to [31,24,16]. Stack body is now ~190 px tall against the sub's ~290 px on desktop, but with the plume it reads as the larger subject. PARTLY MET. A bigger stack ([44,34,24], visually clearly taller than the sub) was tried and broke beebeFraming (orifice no longer visible), the beebeSeabed bounds (-40 z) and props-geo; those guard geometry/framing, so the size was backed off rather than loosening them.
- Guards kept: heroReadability maxRange 80, beebeFraming orifice-left, all untouched. Deliberate test updates: terrainMerge1140 Beebe triangle budget 19938 to 20758 (draws unchanged, comment explains), plus snapshots for beebeIsolation and terrainMerge1140.

## Evidence

Before: `.cache/golden/2026-10-15-105607/`. After: Challenger `.cache/golden/2026-10-15-132915/`, Beebe `.cache/golden/2026-10-15-134721/`.

## Gate

`PW_PORT=4733 tools/gates.sh` passes (all eight stages).

## Verdict

Challenger met; Beebe partly met (stack plus plume dominate, stack alone still shorter than the sub on desktop).
