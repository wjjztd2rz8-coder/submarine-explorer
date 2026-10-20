# P2-hull-a: propeller and thruster clearance fix

Item: **P2-hull-a**. Branch `claude/P2-hull-a`. Fix for the red acceptance cases
from `2710-P2-hull-a-geometry.md`; tests and helper unchanged.

## What moved (vehicle metres, `src/vehicles/hulls.ts`)

- Class A vertical thrusters: x +-1.78 to +-1.86 (saddle mounts +-1.58 to +-1.66), clear of the pontoons.
- Class A lateral thruster: y 0.95 to 1.42 (saddle mount y 0.79 to 1.26), above the fin and bail.
- Class C vertical thrusters: y 2.32 to 2.43, out of the solid crown; decorative well collars y 2.19 to 2.30.
- Class B untouched.

## Clearances (min gap, vehicle m; prop to hull / thruster to hull / thruster to parts)

| Case              | Before (Low / High)          | After (Low / High)                           |
| ----------------- | ---------------------------- | -------------------------------------------- |
| A vertical (2, 3) | 0 / 0 hull, thruster contact | 0.067 / 0.066 prop, 0.013 / 0.005 thruster   |
| A lateral (4)     | 0 (inside fin and bail)      | 0.060 prop, 0.016 thruster hull, 0.271 parts |
| C vertical (2, 3) | thruster 0 (inside crown)    | prop 0.178, thruster 0.014 / 0.013           |

All other units unchanged. Tightest remaining gaps: Class A High vertical thruster 5 mm, Class C lateral 6 mm (pre-existing).

## Gates

`PW_PORT=4766 tools/gates.sh`: python, content, build, unit, e2e smoke, e2e-base, attribution PASS. prettier FAIL on `plan/STATUS.md` only, which this item does not touch (already unformatted on main).

## Screenshots

`tests/e2e/f1-vehicles.spec.ts` (after `npm run build`) writes `.cache/codex/shots/f1-vehicles/hull-{A,B,C}-chase.png`; checked A and C, silhouettes read as before (small in frame).
