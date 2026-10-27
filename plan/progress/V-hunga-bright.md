# V-hunga-bright

## What changed

- `data/landmarks/hunga-tonga-caldera/site.json`, `atmosphere.lamps`: intensity 3, distance 1.2, fillIntensity 3.5, fillDistance 1.4 (defaults are lower). Data only; the existing per-site lamps mechanism (as Beebe, Monterey, Titanic) does the work.
- `tests/unit/siteManifest.test.ts`: the authored-atmosphere policy test expects Hunga's lamps.
- Tried and dropped: a Titanic-style hemisphere fill. It added a scene light, which the Low-readability spec forbids for tiered sites (Hunga already has a lifted tier fill).

## Evidence (mission opening, 120 m, `tools/golden.sh`, high tier)

- Before: `.cache/codex/shots/V-hunga-bright/before-hunga-tonga-caldera-1-mission.png` (and `-portrait-1-`)
- After: `.cache/codex/shots/V-hunga-bright/after-hunga-tonga-caldera-1-mission.png` (and `-portrait-1-`)

## Honest rating

- About 4.0 of 5 (was 3.6). The lamp glow pool under the sub is clearly wider and brighter, and the rim banding is a little more legible; the rim itself is a modest lift, not a transformation. Still moody, not dark. A stronger rim lift would need the shared tier fill, which is out of scope here.

## Simplicity rules

- Net simpler: per-site data only, no shared-code branch, no runtime mutation, no new spec, no new draws or lights.

## Gates

See the end of this note.
