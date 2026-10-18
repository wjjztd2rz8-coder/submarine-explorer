# V-lostcity-rim

## What changed

- `rimDrop` (`spire.ts`): carbonate trunks get a staircase term and narrow deep bites from a fine angular noise, and the broad drop is reduced (1.6 to 1.1), so the torn rim is notched at several scales instead of a few long slabs. Crusted sulfide stacks (non-trunk) keep their previous values.
- Carbonate column angular segments 26 to 40 per density unit (`towers.ts`): notches need the vertex resolution at the rim to read.

## Simplicity

No settings, UI, materials, site branches or tests added. About 10 lines changed in two files. Brucite fins already follow `rimDrop`, so they sit in the notches. Re-baselined, intended: `props-geo`, `terrainMerge1140` (Low lost-city triangles 44120 to 50712, still inside the existing budget assertion; draws unchanged at 14).

## Screenshots

`.cache/golden/2026-10-18-090723/lost-city-{1,2,3}.png`; before: `.cache/golden/2026-10-18-084650/lost-city-3.png`.

## Rating

Before about 4.1; after about 4.3. Rim silhouette is now jagged and notched with varied depths. Frames 1 and 2 unchanged in feel.

## Residuals

- A few steep slab-like faces remain at the rim in lost-city-3 and the stair steps read slightly shard-like rather than eroded; softening the staircase would help.
- Low tier triangle cost up about 15 percent for Lost City.
