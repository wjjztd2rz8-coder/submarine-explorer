# V-titanic-palette

## What changed
- `paintWreck` gains an optional `muted` strength that pulls the weathered colour toward a grey-brown of the same brightness. Titanic bow and stern set it to 0.6. Other wrecks are untouched. Colour maths only; no geometry or budget change.

## Screenshots reviewed
`.cache/codex/shots/V-titanic-palette/` before-N, r1-N, r2-N (golden titanic poses 1-3). Before: peach/copper hull. r1 (muted 0.55, warm target): pinkish beige. r2 (0.6, cooler target): grey-brown with dark streaks and plate variation; opening view reads as a rusty grey-brown wreck, still readable.

## Gates
`PW_PORT=5871 tools/gates.sh`: all PASS, no snapshots re-baselined.

## Verdict
Clear improvement over peach. Not fully there.

## What's left
- Close view (pose 3) still slightly pale/pink where the headlight hits; the plate shader's warm tint (1.0,0.95,0.9) is shared and was left alone.
- Rusticles and some fittings stay bright orange; their colours are in the growth material and rusticle instances.
- Rust streaks are subtle at distance; stronger streaking would need a texture/shader change.
