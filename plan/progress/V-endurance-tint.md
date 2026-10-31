# V-endurance-tint

## What changed

- `data/landmarks/endurance/site.json`: new `wreck.hullTint` (0xFFD9A8), a colour multiplier on the site's wooden hull.
- `src/core/SiteManifest.ts`: `hullTint` is an optional, validated `wreck` field.
- `src/world/presets/WreckPreset.ts`: on enter, wood-hull meshes get their own cloned material with the tint applied; the clones are disposed on exit, so the shared material cache stays untinted for other sites.

## Why

The previous lamps attempt was invisible because the hull sits outside the lamp pool. A material tint needs no light, draw or setting and is driven by site data only.

## Evidence

`.cache/codex/shots/V-endurance-tint/{before,after}/{desktop,portrait}.png` (mission opening, 110 m). The hull goes from rust-red to a warm golden wood tone against the cold water; the change is visible in both layouts but the hull is small in the opening frame.

## Honest rating

About 3.5 of 5 (from 3.4). A modest, real improvement in subject colour; the composition (small hull at range) is unchanged, so it is not a step change. The ice-encrusted read is not addressed.

## Simplicity notes

Net +about 20 lines, no new light, draw or setting, no site branch in shared code. The tint is per-site data. No new spec; the manifest validator covers the field.

## Gates

`PW_PORT=4871 tools/gates.sh` passed (python, content, build, unit, e2e smoke, e2e-base, attribution, prettier). No snapshots needed updating.
