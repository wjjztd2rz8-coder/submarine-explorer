# V-eight-sites-lit (d): Blake Plateau upper half

Shots: `.cache/codex/shots/V-eight-sites-lit-d/{before,after}-{desktop,portrait}.png` (mission opening, High tier, 1600x900 and 390x844).

## What changed

- `data/landmarks/blake-plateau-corals/site.json`: new optional `horizon` block (upper and haze colours, haze peak, fog lift, depth fade 450 to 650 m). At the 724 m opening the water now grades from a bluer top to the deep fog tone at the horizon, instead of a flat near-black void.
- `src/core/SiteManifest.ts`: the `horizon` block is validated (unknown keys rejected).
- `src/world/presets/ReefPreset.ts`: builds the existing unlit vertex-colour backdrop dome when the site data carries `horizon`, updates and disposes it with the preset. No site id appears in code.
- `src/world/presets/TitanicHorizon.ts`: the look type is exported and the depth fade band (`fadeStartM`, `fadeEndM`) is optional per site; defaults are the existing abyss values, so Titanic and Endurance are unchanged.
- `tests/unit/siteManifest.test.ts`: backdrop validation and "authored only for Blake" capability checks.

Cost: one extra draw call, one 32x16 dome with per-frame vertex colours, on every tier including Low (the dome is unlit and drawn before terrain, no depth writes). Within the Low budget in the perf spec if it passes below.

## Rating (conservative, my reading of the shots)

| Shot            | Before | After |
| --------------- | ------ | ----- |
| Blake desktop   | 3.3    | 3.7   |
| Blake portrait  | 3.3    | 3.7   |

The top now reads as water with depth, the horizon stays soft, and the coral mound plus sub remain the brightest masses. Still short of 4: the mound is a dark silhouette at 160 m and the upper column has no life or particles.

## Gates

See the final report block below.
