# V-bismarck-framing

## What changed

- `data/landmarks/bismarck/site.json`: opening `yawOffset` 25 to 8, so the main hull sits just left of centre instead of low-left and half off-frame (range stays 110 m, the scan-contact guard).
- `data/landmarks/bismarck/mission.json`: wreck-preset overrides `snowScale` 0.3, `hazeParticles` 1500, `motesPerHull` 200 (the bokeh in the lower right was mostly the wreck haze layer plus marine snow).
- `src/world/presets/WreckPreset.ts`: one line, wreck preset now honours `snowScale` like the canyon and trench presets (generic, default 1, no site branch).

Not changed: boulders (still big and grey), hull size (range pinned at 110 m), props, snapshots.

## Image

- Before: `/home/vijay/submarine-explorer/.cache/golden/2026-11-04-033854/bismarck-1-mission.png`
- After: `.cache/golden/2026-11-04-041109/bismarck-1-mission.png` (in the worktree)

## Rating (honest)

About 3.9 (was ~3.5). Snow is down to a few motes and the hull is clear and near centre. Gaps: hull fills only about a quarter of the width (not a third) because the opening cannot close inside 110 m; the foreground boulders are unchanged; the sub overlaps the hull's right end.
