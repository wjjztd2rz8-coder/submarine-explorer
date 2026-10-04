# F-MONTEREY-WALL

## What changed

- `tools/golden-shots.mjs`: for sites whose hero carries wall-life (`wall-sponges-*`/`wall-corals-*` instanced meshes), poses 2 and 3 aim at the densest sponge/coral patch (9 m radius) from the wall's face side (local -Z, rotated up to ±0.9 rad until clear). Pose 3 is 26 m out (15 m put the camera inside the fans). Other sites unchanged.
- `src/world/props/geo/scarp.ts`: new preset field `bedContrast` (canyon 2.8, others 1 = unchanged). Canyon wall vertex colours gain stronger per-bed tone with ochre tint on weak beds, thin laminae, a shadow line under each ledge, dark erosion-gully runnels and fine grain. No geometry, draw-call or triangle change; wall-life placement untouched.
- `CHANGELOG.md` entry added.

## Shots (all in /home/vijay/subexp-wt/f-monterey-wall/.cache/golden/)

- Before (pose 2/3 empty water): /home/vijay/submarine-explorer/.cache/golden/2026-10-04-020114/monterey-canyon-{2,3}.png
- Final: 2026-10-04-024050/monterey-canyon-2.png (40 m, layered wall with fans) and monterey-canyon-3.png (26 m, best: ledges, laminae, fans)

## Gates

`PW_PORT=4890 tools/gates.sh`: static, unit, python, content, attribution, prettier, e2e smoke, e2e-base all PASS.
