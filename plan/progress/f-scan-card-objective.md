# F scan card follows the mission objective

Branch `claude/f-scan-card-objective`. Closes finding 3 of `f-newplayer-recapture.md`.

## Change

- `Scanner.setObjective(poiId)` plus `ScanView.objective{Id,Name,Distance,Radius,InRange,TurnDeg,VertDeg}`,
  computed each update from the fixed target with that id; cleared when the id is unknown or the target is
  scanned this dive. It is guidance only: `candidateId`, `nearest*` and scan logic are untouched.
- `src/app/systems/waypoints.ts` feeds it the same `nextScanObjective` the in-world waypoint uses.
- `ScanOverlay` idle branch: scannable candidate keeps "HOLD x TO SCAN" for the nearest contact; otherwise,
  when an objective exists and is not the nearest contact, the card shows kicker OBJECTIVE, the objective name,
  its range in the ring and TURN n deg / RISE / SINK (touch) / PITCH (desktop) toward it, or "CLOSE TO r M"
  when it is roughly ahead and out of range. No objective: the old nearest-contact behaviour.
- Card visibility conditions are unchanged (no new HUD element). Tutorial.ts untouched.

## Tests

- `tests/unit/gameScanner.test.ts`: objective fields, candidate unaffected, unknown/scanned objective cleared.
- `tests/unit/touchControlsAudit.test.ts`: overlay text for objective vs nearest, touch vs keyboard, candidate
  keeps the scan prompt, no-objective fallback.
- No existing assertions changed.

## Open

- The card still only appears when a contact is in scan range (unchanged), so far from any contact there is no
  card; the mission panel / waypoint cover that on desktop. Showing the card for a remote objective on touch
  would add HUD and was left as a decision.
