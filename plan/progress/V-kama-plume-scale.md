# V-kama-plume-scale

## What changed

- `data/landmarks/kamaehuakanaloa/mission.json`, `environment.overrides`: smokeOpacitySulfide 0.55 to 0.14, spreadM 3.5, sizeStartM 0.8, sizeEndM 2.2, riseHeightM 38, smokeParticles 7000, hazeGlow 0.5 to 0.8, hazeGlowSizeM 16. Data only; existing per-site override table, no code change.
- CHANGELOG entry added.

## Evidence (golden desktop, `GOLDEN_SITES=kamaehuakanaloa`)

- Before: `.cache/codex/shots/V-kama-plume-scale/before-1.png`, `before-2.png`
- After: `.cache/codex/shots/V-kama-plume-scale/after-1.png`, `after-2.png`

## Honest rating

About 3.8 of 5. Plume is roughly a third of the old width and clearly lighter; the glow pool at the base is wider than the plume and the slope stays lit. It still reads as two pale columns in pose 2 (the prop-level smoker plumes are unchanged and still dark), and it stays tan rather than fully transparent.

## Simplicity rules

Data only, no site branches, no new tests (no test covers these numbers), no package numbers in code.

## Gates

`PW_PORT=4881 tools/gates.sh`: python, content, build, unit PASS; e2e smoke+project-base 127 passed, 3 failed, all monterey-canyon `mission previews and opens on an approach` (expects a Scan objective, got `Survey the north canyon wall`); not touched by this data change, likely pre-existing on main. `npx playwright test -g kama`: 19 passed, 3 skipped.
