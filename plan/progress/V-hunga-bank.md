# V-hunga-bank

## What changed

- `src/world/props/geo/scarp.ts`: new optional preset field `cliff: { talusShade, crestLit }`. When set, the apron and its rocks are darkened at the wall base (fading over the first 70% of the reach) and the wall's top edge gets a lit lip. The `tuff` preset sets it (0.6 / 0.5); `canyon` and `hadal` are unchanged.
- Tests: new capability test "cliff read" in `tests/unit/scarpTerrain.test.ts` (talus darker at the wall than away from it; crest brighter than the mid wall). Tuff geometry hashes in `scarpTerrain.test.ts` and `terrainMerge1140.test.ts` updated, since vertex colours changed on purpose.

## Images

- Before: /home/vijay/submarine-explorer/.cache/golden/2026-11-03-044523/hunga-tonga-caldera-1-mission.png
- After (opening): .cache/golden/2026-11-03-182304/hunga-tonga-caldera-1-mission.png
- After (approach): plan/progress/V-hunga-bank-after.png

## Rating

About 4.1 (was 4.0). The approach view shows a lit crest lip and a darker foot, so the wall reads a little more as a cliff. At the opening distance the change is subtle: the apron is mostly covered by rocks and the wall is still a flat-topped slab. The bank behind the crest is unchanged. Never dark.

## Simplicity rules

- No site branch: the preset is the data (`cliff`), read by the shared builder.
- One guidance surface: one field, two numbers; no new modules or layout patches.
- Settings resolve once: values come from `P` at build time.
- Tests by capability: extended `scarpTerrain.test.ts`; snapshots changed only for the tuff preset.

## Gates

`PW_PORT=4871 tools/gates.sh` all PASS; `tools/site-specs.sh hunga-tonga-caldera` 10/10.
