# F1-WRECKS: hand-built wrecks

Status: done for wave 1. Gates green (build, unit, python, content, attribution, prettier, e2e, e2e-base).

## Done

- Wreck kit in `src/world/props/wrecks/`: lofted hulls (`kit.ts`), materials and procedural
  canvas textures (`materials.ts`, `textures.ts`), rusticle and growth instancing
  (`instances.ts`), tier table (`detail.ts`), builders for Titanic bow and stern, Bismarck
  and Endurance, and scatter kits (Titanic boilers and field, Bismarck turrets, field and
  landslide, Endurance rigging and stern).
- Wired through `procedural:*` props with a `wreck` id in each landmark's `props.json`.
  `Props` passes the quality tier to builders and supports compound colliders (one box
  per part).
- Interiors stubbed: every wreck has an `interior-entry` anchor (Grand Staircase well,
  torn Bismarck hull, open Endurance hatch, Titanic stern cavity).
- Dev preview harness at `/preview/wrecks.html` (dev server only).
- Merged main (F0-CORE). Fixed a `node:fs` type error in `tests/unit/wrecks.test.ts` and
  prettier issues. CHANGELOG and ATTRIBUTION updated (no third-party assets).

## Screenshots

`.cache/codex/shots/f1-wrecks/`: preview views (`*-N.png`) and in-game views (`game*.png`).
Titanic bow and stern read clearly and are warm and lit; Bismarck shows turret barbettes and
scattered debris; Endurance is pale and readable. Nothing was dark in the sub's lights.

## Deferred / known issues

- Interiors themselves (wave 2); only anchors exist.
- Endurance hull is hard to frame in-game: the chase camera cannot look down and the sub
  body hides it end-on. Not a wreck bug. The preview shows it well (slightly overexposed there).
- Bismarck is dark in the preview rig (preview lighting only); in-game it reads fine.
- No per-frame perf profile on a real low tier device; tier table is conservative
  (high: ~140k triangles for the Titanic bow at full detail, 7 draw calls).
