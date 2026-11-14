# U-debrief-stars (DIRECTOR item 41)

Source: findings 13 and 14 in `plan/progress/U-play-flow-recheck.md`.

## Stars explained (finding 13)

- Added one line under the star row, shown only when a dive has a rating:
  "Stars: 1 for the primary objectives, 2 for all, 3 with a photo or species scan."
- Replaced the 1-star hint "Finish the optional objectives for 2 stars; some are a long transit away."
  with "Finish the optional objectives." The 2-star meaning now lives in the new line.
- Word count: the new line adds about 15 words; the 1-star hint drops about 10. Net is about +5 words
  on that path, not fewer. The star line is the one explanation; the 2-star hint ("Take a photo or scan a
  species for 3 stars.") is kept as the action to take.

## Debrief CTA (finding 14)

- After a dive without Keep exploring as primary, the primary button is now "Dive again" (was "Dive sites").
  The debrief primary selection checks `dive-again` before `dive-sites`.
- "Dive sites" moves to the quiet secondary row (beside Journal) when Dive again is primary.
  With Keep exploring primary (unstarted dive), Dive sites stays the quiet link. Secondary row shape is unchanged.
- Aborted dives: the primary is still "Dive again" (its existing flag), now reached through the same rule.

## Tests updated (old strings and order)

- `tests/unit/debriefSummary.test.ts`: 1-star hint text.
- `tests/unit/debriefReopen.test.ts`: primary after a scan is Dive again; More contents follow.
- `tests/e2e/journal-debrief.spec.ts`, `tests/e2e/mission.spec.ts`: 1-star hint text and button order.
- `tests/e2e/f2-progress.spec.ts`: opens More before clicking Dive sites when it is there.
- `tests/e2e/f-save-soak.spec.ts`: helper comment no longer says Dive again sits under More.

Verified: `npx vitest run` on the 24 unit spec files that mention the debrief (1061 tests passing);
`npx prettier --check` on changed files. E2E specs not run here.
