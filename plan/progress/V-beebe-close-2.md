# V-beebe-close-2

## Changes

- `SiteManifest.ts`: smoker profile gains optional `bodyShade` (albedo multiplier, default 0.95) and `bodyGlow` (self-lit crust tint, default 0.16), both validated.
- `smokers.ts`: body material reads those two values instead of constants (default behaviour unchanged for other sites).
- `beebe-vent-field/site.json` main smoker: `bodyShade` 0.5, `bodyGlow` 0.1, `throatColor` 0x9a3a0c -> 0xff691a (hotter orifice emissive).
- Tests: props-geo snapshots (3 Beebe buffer hashes) re-baselined; the smoker-profile capability test now asserts the authored `bodyShade`.

## Simplicity rules

Data-driven (rule 4), no new settings for players, no new geometry; two optional profile fields replace two hard-coded constants (rule 1).

## Evidence

`.cache/codex/shots/V-beebe-close-2/{before,after}-3.png`.

## Rating

About 4.3 (from ~4.0). Flank is darker and the orifices glow clearly orange; the readability invariant (ambient >= 6) is untouched.

## Remaining

The flank is still brown-leaning rather than true basalt; crust highlights are modest because they come from vertex colour in `mineralCrust`. The prettier gate flags `plan/OVERNIGHT-LOG.md` and `plan/PROCESS-LOG.md` (not touched here).
