# U-journal-first-visit

## What changed

- `src/ui/Journal.ts`: `groupRows` now just filters to earned entries (or all when spoilers are on). Groups with no rows are not rendered, on the site page or the desktop tree. Removed the "N more to find" / "not yet identified" notes, `HOW_TO_FIND`, the "No scans logged" tag, and the zero-progress chips. A site with nothing earned, and the front page with nothing logged, show one line: "Scan something on a dive to add it here." Net -60 lines in Journal.ts; three dead CSS rules deleted (`.jr-hidden-note`, `.jr-row-note`, `.jr-more-to-find`).
- Merged/replaced: the locked note, the tag and the count notes became the single hint line. No new element, no new setting, no site branches.
- Tests: `journalGroups.test.ts` starts with everything earned and gains a first-visit test (one hint, no groups, no rows, no chips); `journal-debrief.spec.ts` and `globe.spec.ts` assert groups are absent until spoilers are on instead of "more to find" notes.

## Gates

- Full vitest: 4435 passed (before the last test additions); journalGroups 44 passed after.
- e2e: journal-debrief, globe, f2-explore, f-content-fix: all pass except 3 "frozen debrief 1280x720" tests failing at `.objectives-panel` visibility; the same 3 fail on main (verified), so not caused by this change.
- `PW_PORT=4711 tools/gates.sh`: python, content, build, unit, e2e (smoke), e2e-base, attribution, prettier all PASS.

## Screenshots viewed (.cache/codex/shots/jfv/)

before-* and after-* for desktop 1280x800 and phone 390x844: empty first visit (site page, phone front page) and after one scan. Both read cleanly: the empty state is a short hint; after one scan only the earned groups appear.

## Left as is

The desktop tree still shows "0/4 points of interest" per site and "0 / 55 LOGGED" in its footer, and the front page lists every site card.
