# V-beebe-opening

## Changes

- data/landmarks/beebe-vent-field/site.json, opening.mission: rangeM 220 -> 155, added chaseRadius 46 and chaseOffsetY -8. Data only; no code change, no new fields (both chase fields already exist for other sites, e.g. Kamaehuakanaloa).

## Rule bend (owner 2026-10-22)

The 150-300 m opening range was shortened to 155 m. The primary POI scan radius is 150 m (opening-framing asserts range > scanRadius), so the target still starts outside scan range and the player has to approach. 150 m is the floor; 155 leaves a margin.

## Screenshots

.cache/codex/shots/V-beebe-opening/ (before-, r165-, r155c-, r155d- prefixes). r155d is the final state. Desktop: the sub sits large in the lower centre, the main smoker and a second glowing smoker share a warm orange light pool, and the seabed slope is readable around them. Before, the smokers were a few pixels tall (about 1.4% of the frame) and the scene near-black. Portrait: sub and smokers both read, but the sub's top edge nearly touches the smoker base.

## Tried and rejected

- rangeM 165, default chase: only a small gain; smokers still small and the sub tiny.
- rangeM 155, chaseRadius 34, chaseOffsetY -6: sub fills the lower third and hides the smokers in portrait.
- Going below 150 m: would put the target inside the 150 m scan radius and fail the opening-framing range check; not done.

## Tests

PW_PORT=5741 tools/gates.sh: python, content, build, e2e smoke, e2e-base, attribution green. The only failure was the unit golden tests/unit/missionApproach.test.ts (beebe 220 -> 155, intended; updated).

## Simplicity

Two existing fields added to one site's shared opening data; no site branches, no code.

## Remaining issues

The scene is still dark overall; the light pool comes from the smokers and the sub's lights. A brighter opening would need a lighting or exposure change, which is out of scope. In portrait the sub partly crowds the smoker base.

## Honest rating

About 6/10 against the brief: smokers and sub now share a warm pool with readable seabed; subject size is better but still modest on a phone.
