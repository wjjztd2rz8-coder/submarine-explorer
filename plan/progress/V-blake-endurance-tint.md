# V-blake-endurance-tint

## What changed

Data only, no code (the existing capabilities already did the job, so this is net simpler than a new prop variant):

- `data/landmarks/blake-plateau-corals/props.json`: `coral-mound-f`, a 40x26x7 m `coral-mound` placed ~70 m ahead and 22 m left of the opening pose. It reuses the lit mound builder, so it is clearly paler than the seabed. It replaces nothing; it is the mound kit's existing look, one more instance.
- `data/landmarks/endurance/props.json`: `fallen-spars`, a 34 m `endurance-rigging` scatter ~28 m ahead and 14 m right of the opening pose. Journal-style "Game addition" note, once.

Positions were derived from the golden pose (position, yaw); the spawn is computed from the objective, so moving the objective or hero bearing moves the opening and these props need re-placing.

## Images

- Before: `.cache/golden/2026-11-03-161633/{blake-plateau-corals,endurance}-1-mission.png`
- After (final): Blake `.cache/golden/2026-11-03-162950/blake-plateau-corals-1-mission.png`; Endurance `.cache/golden/2026-11-03-163943/endurance-1-mission.png`
- Tried and dropped on Endurance (don't read at the opening range): `endurance-stern` stone/silt kit (invisible, it is a tight ring around the hull) and `canyon-ledge` (dark grey-green against pale sand).

## Rating (honest)

- Blake: 3.5 to about 4.0. Pale mound lower-centre, objective cluster and sub still readable, not dark.
- Endurance: 3.5 to about 3.6. Spars read as debris in the lower centre, but they are thin dark lines, not a lit feature.

## Gaps

- Endurance needs a genuinely lit, pale foreground mass (ice-rafted dropstone/boulder kit with vertexGlow, or a lit wood material on the rigging kit). That is a small code capability; left for a follow-up item.
- Only the desktop opening was re-captured; portrait/landscape not reviewed.

## Gates

See the bottom of this file once filled in by the final run.
