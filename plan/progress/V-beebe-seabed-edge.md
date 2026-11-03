# V-beebe-seabed-edge

## What changed
- Site `horizon` type and validator (`src/core/SiteManifest.ts`) accept an optional `fogHaze` fraction (0..1; out of range or non-number is rejected). The existing preset path already passes the whole site horizon to `TitanicHorizon`, which already supported `fogHaze`, so no consumer change and no site branch.
- Beebe site data (`data/landmarks/beebe-vent-field/site.json`): `fogHaze: 0.5`; hazeColor and fogLift unchanged.
- Unit test (`tests/unit/siteManifest.test.ts`, graded-backdrop block): accepts 0, 0.4, 1; rejects -0.1, 1.1 and a string.

## Frame
Before/after mission opening: `.cache/codex/shots/V-beebe-seabed-edge/before-beebe-vent-field-1-mission.png` and `after1.png`.
The navy band between seabed and horizon is gone; the water now lifts into teal from the seabed edge upward and the plumes read as dark columns against it. Honest score: about 4.2. It reads as a documentary still. Slight cost: the water is a little flatter and more uniform than before, with less deep-water mood, and the seabed far slope is a bit murkier. I stopped at the first value since the band was the stated flaw.

## Gates
- `tools/site-specs.sh beebe-vent-field`: 47 passed.
- `PW_PORT=4931 tools/gates.sh`: see final report in the run log (result recorded below).
