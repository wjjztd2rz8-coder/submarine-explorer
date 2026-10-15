# S-daily: shorter Daily Dive wording

Backlog #9. Mechanics unchanged.

## Audit

The daily copy was already close to minimal. Each surface was checked:

- Home card (`src/ui/Home.ts` `setDaily`): title "Daily dive", line "<site> · <modifier>", stars line "★★☆ · N day streak", aria "Best today: N of 3 stars". Left as is. "Daily dive" is the card's accessible name and is matched by tests, and "today" in the aria label is load-bearing.
- Briefing summary prefix (`dailyMission`): modifier label "Calm water" / "Strong currents" / "Low light" plus the mission summary. Already one short fragment. Left as is.
- Debrief title: shows the mission title, so it inherits the daily title prefix.

## Change

| Surface                                                               | Old                            | New                       |
| --------------------------------------------------------------------- | ------------------------------ | ------------------------- |
| Briefing title and debrief title (`src/game/Daily.ts` `dailyMission`) | `Daily dive · <mission title>` | `Daily · <mission title>` |

No illustrative or reconstructed caveats were found in daily text, so none were removed.

## Tests updated

- `tests/e2e/f2-modes.spec.ts` (briefing title assertion): `toContainText('Daily dive')` became `toContainText('Daily ·')`. This matches the new prefix at the same strictness.

No unit test asserted the old title string. `tests/unit/daily.test.ts` only checks equality of `dailyMission` output.

## Verification

- `PW_PORT=4871 tools/gates.sh`: green (python, content, build, unit, e2e smoke, e2e-base, attribution, prettier).
- `tests/e2e/f2-modes.spec.ts` and `tests/e2e/d-shell.spec.ts` (chromium): 9 passed, 2 failed. The failures are the touch-target size check at `f2-modes.spec.ts:54`, which runs before the daily copy is reached. They fail the same way with the original spec file, so they predate this change. Gates runs only the smoke subset of e2e, so they are not in the gate.
