# V-beebe-chimney-stacks

## Changed

- Three optional per-site smoker-profile fields (`stackRadiusPerM`, `stackRadiusBaseM`, `stackGapM`) replace the hard-coded stack radius law and ring spacing in `src/world/props/geo/smokers.ts`. Defaults reproduce the old behaviour; schema and defaults in `src/core/SiteManifest.ts`.
- Beebe data (`data/landmarks/beebe-vent-field/site.json`): slimmer stacks (0.075 m radius per m height + 0.45 m, was 0.15 + 0.6), 2.5 m extra gap so side stacks stand clear of the hero, `topFraction` 0.42 and `topMouthRadiusFraction` 0.8 for wider orifices.
- No site branches; no new spec (existing manifest and Beebe specs cover the fields).

## Screenshots

`.cache/codex/shots/V-beebe-chimney-stacks/beebe-vent-field-{1,2,3}.png` (golden free-dive, desktop, High). Before: `.cache/codex/shots/V-beebe-stack/after/`.

## Honest rating

6.5/10, up from 6. The approach frame and mid pose now show a separated cluster of slim stacks of different heights standing clear of the mound, instead of one broad folded cone. Still short of the target: tops are ragged and spiky, the vent bores read only as small orange glints from the golden angles (the dark bore is not clearly visible), the hero's lower trunk is still wide with flange collars, and the close frame is washed pale/beige by headlights.

## Gates

Gate mode: `PW_PORT=4881 tools/gates.sh` (smoke + project-base e2e). The run passed python, content, build, unit, e2e, e2e-base and attribution; prettier initially flagged two files, fixed afterwards and verified with `prettier --check`. Geometry snapshots for Beebe were regenerated on purpose. No --full-e2e run.
