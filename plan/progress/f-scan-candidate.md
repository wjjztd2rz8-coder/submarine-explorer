# f-scan-candidate

## Plan
Bug-hunt 1330: idle scan card named the nearest contact (`view.nearest*`) while Scan scanned `candidateId` (in-cone). Fix in `Scanner.update`: after candidate selection, promote the candidate to `nearest*` so card, reticle and HUD prompt (all read `nearest*`) share one selection. Candidate choice among in-cone contacts now prefers the mission objective, then nearest.

## Progress
- Scanner.ts change done; unit test added in tests/unit/gameScanner.test.ts (two contacts, nearer off-axis). No existing assertions changed.
- CHANGELOG line added.
