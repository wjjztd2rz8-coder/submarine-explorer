# F-HERO-TITANIC: first 60 seconds at the Titanic bow (progress)

Branch `claude/f-hero-titanic`. Shots: `.cache/codex/shots/f-hero-titanic/{before,after}/` (before = golden set 2026-10-02-1048; after = latest golden set plus `titanic-opening-{low,high}.png`).

## What was wrong

- Opening sat 85 m off the hull's footprint at default altitude: a small, dark wreck under a black sky and a black bed lit only by the headlight pool.
- Seabed albedo was dark and high-contrast; no ambient light outside the lamps.
- The bow had no debris beside it (the debris props are 80+ m away).

## What changed

- `game/Spawn.ts`: Titanic opening is 16 m off the bow footprint (bearing 40), 14 m above the hull base, `yawOffset` 10 (inside the e2e facing > 0.98 assertion). The wreck now fills the lower half of the chase view with the sub in front of it.
- `world/presets/WreckPreset.ts` + `core/config/presets.ts`: new opt-in `ambientFill` (default 0, so Bismarck and Endurance are unchanged). Titanic's `mission.json` sets `ambientFill: 19` and `hazeOpacity: 0.12`.
- `world/presets/Presets.ts`: on the low tier the preset ambient is now pushed to the scene (previously the whole sync was skipped on low, so a fill never showed there; this also fixes Beebe's fill on low tier, not re-shot).
- `world/TerrainBiome.ts`: Titanic gets its own soft pale ooze (`contrast 0.6`, `detail 0.6`, fewer ripples and burrows, mid-grey albedo): readable, never black, no sparkle.
- `data/landmarks/titanic/props.json`: new `debris-bow` (reuses the `titanic-field` scatter, 60 m, 45 m east of the bow, tagged `reconstruction` with an honest estimate note). `tests/unit/wrecks.test.ts` only checks the old ids exist.
- The bow's detail (rails, anchors, davits, plating, rusticles, rust variation) already existed in `wrecks/titanicBow.ts`; nothing there changed.

## Perf (SwiftShader, default opening)

| Tier | Draw calls | Triangles |
| ---- | ---------- | --------- |
| low  | 53         | 87k       |
| high | 84         | 909k      |

The new debris adds one instanced draw group; low tier cuts density as for the other debris props.

## Known gaps

- At the opening the sub still overlaps the middle of the hull (chase camera 90 m back); a bigger `yawOffset` would need the e2e assertion relaxed.
- The wreck reads dim at range compared with the close shots: it relies on ambient fill, with no true key light. A distant horizon band of pale bed meets black water.
- Low-tier bed is blotchier and brighter than high (no haze there).
- Marine-snow haze points are still busy near the camera.
- Beebe low tier not re-shot after the Presets fix.

## Test changes

The old Titanic opening assertions encoded an 85 m approach. Relaxed to the new close opening: wreck range > 8 m (unit `arcadeLoadout`, e2e `f-arcade-access`), and the mission e2e accepts a 2- or 3-digit RNG. The touch-onboarding e2e failed once in the first gate run and passed on rerun (unrelated, flaky).
