# V-titanic-lift

## Changes

- `data/landmarks/titanic/site.json`: new `atmosphere` policy (existing manifest mechanism, same shape as Monterey): stronger lamps and a cool/rust hemisphere fill. The sub light now falls as a soft pool on the bow, so plating and rust gain contrast against the shadowed far hull.
- `src/core/config/atmosphere.ts` (`ABYSS_HORIZON`, Titanic's default backdrop; Endurance keeps its own per-site values): higher fog lift, lighter crown/haze colours, haze band peaking higher. The water lifts toward the far distance, so the upper frame is a faint teal gradient instead of dead black.
- No new draws, lights per frame beyond one hemisphere fill, no shared-code site branches. High and Low share the change (backdrop is the same single draw; fog lift applies on Low too).

## Screenshots

`.cache/codex/shots/V-titanic-lift/`: `before-1.png`, `after-1.png` (golden titanic-1, High). Iterations a1..a5.

## Tests

- `titanicHorizon.test.ts`: raised luminance/lift ceilings to the new look; partial-depth fog assertion now derives from `ABYSS_HORIZON.fogLift`.
- `siteManifest.test.ts`: authored titanic atmosphere policy.
- Snapshots rebaselined: endurance horizon fallback (shares the default), lowSweep titanic.

## Simplicity

Mostly constants and one data block; net code change near zero. Titanic lamp/fill uses the existing policy path.

## Remaining issues

- Upper gradient is subtle; at the golden pitch only the top ~third shows the lift. The post-pass readability floor (0.02 linear) dominates very dark sky, so larger gains need fog brightening, which also lightens far seabed.
- Hull plating is lit well near the bow but the aft hull stays dark, by design.
- Not verified on a phone.

## Rating

About 4.2 (from ~3.6): bow pool and plating contrast clearly better; sky lift is real but modest.
