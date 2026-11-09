# U-journal-open-current (2026-11-08)

Baseline: `9be23de8` (current checkout of main). Evidence:
`plan/progress/U-play-walkthrough-3.md`, issue 4. The existing current-site
selection in `Journal.open()` is correct and is retained. Tutorial/depth work
belongs to the separate item and is untouched.

## Reproduction and change

The remaining gap is a cold Journal catalogue, not an incorrect opening route.
`loadJournalSites()` waited for every site's files, then `Journal.load()` waited
for that entire catalogue and tile sources before exposing any entries.
`renderContent()` used “All dive sites” whenever the selected site's record was
not yet available. Thus a ready Titanic guide and a saved bow discovery could
still be hidden behind the loading message if any other site was slow.

The new lifecycle test failed on the unchanged source with the same wrong
breadcrumb in both layouts (`All dive sites`, expected `Reef`). A separate
temporary copy of the original HEAD source confirmed the full condition in both
layouts: after 300 ms, `viewKey` is still the current site, the breadcrumb is
“All dive sites”, and the body is “Loading the Journal…”; releasing the unrelated
response reveals the current site. Those two baseline assertions pass;
`.cache/journal-baseline.log` records the run. Browser reproduction is unverified
here: Playwright's preview cannot connect to localhost in this sandbox (`EPERM`
for IPv4 and IPv6).

- The existing loader now reports each completed site while retaining the final
  catalogue's original index order and one shared load promise. Journal publishes
  only the current site early; all remaining sites replace that interim data
  when the full load completes. No duplicate content fetch or new cache.
- The breadcrumb derives from the selected site even before its content arrives.
  The existing loading text appears only after 200 ms; ready entries replace it
  while unrelated requests remain pending.
- Focused entries resolve from the active view when their site arrives. This
  removes the old promise-identity navigation repair, so completing the remaining
  catalogue cannot undo later navigation.
- Cut: the all-sites readiness barrier for viewing current-site entries. No new
  guidance surface, layout rule, setting or site-specific branch.

## Verification

- Extended existing `tests/unit/journalGroups.test.ts`: desktop and phone,
  default and focused opening, held current-site and unrelated responses,
  delayed loading text, ready entry display, and navigation retained after the
  catalogue completes. Existing empty/missing/corrupt/offline Home cases also
  check that the loading message is deferred even when the catalogue fails.
- `npx vitest run tests/unit/journalGroups.test.ts tests/unit/journalData.test.ts
--configLoader runner --cache=false`: **178 passed**.
- `npm run typecheck`: **PASS**.
- Grepped `tests/e2e` for Journal opening/loading/focus coverage and added desktop
  1280x720 and phone 390x844 cases to `journal-debrief.spec.ts`. The test holds
  Beebe's guide response, opens Titanic from Pause with a saved bow discovery,
  checks the current site and entry before release, then checks reopening and
  the complete catalogue after release. The phone case uses touch input to open
  Pause and Journal and to close/reopen Journal, with service workers blocked.
- Attempted the capability cases with:
  `GATES_CONFIG_MODE=writable PW_PORT=4316 PW_OUTDIR=.cache/journal-final-dist
npx playwright test tests/e2e/journal-debrief.spec.ts -g 'cold dive Journal shows
cached entries|unavailable Home Journal catalogue|home front page, site entries,
spoilers, reload|consecutive gallery scans unlock distinct Journal entries|Journal
rotation releases focus' --output=.cache/journal-targeted-results`.
  **Blocked before tests:** preview startup fails under the localhost restriction.
  Log: `.cache/journal-targeted.log`; diagnostic run reports `connect EPERM`.
- Full `GATES_CONFIG_MODE=writable PW_PORT=4315
PW_OUTDIR=.cache/journal-final-dist tools/gates.sh`: **not green; interrupted
  (exit 130)** after the full unit stage produced no results for over seven
  minutes. Completed stages: content **PASS**, build **PASS**, Python **FAIL**
  (169 cases, five failures: four manifest tests report `spawnSync git EPERM`;
  the golden comparison CLI test receives empty JSON output). The full unit
  stage is incomplete; this run did not reach its browser stages. Logs:
  `.cache/journal-gates.log`, `.cache/gates/python.log`, `.cache/gates/unit.log`.
- Ran attribution and repository-wide Prettier independently: both **PASS**.
  The targeted Playwright command above was retried against the final build;
  preview startup remains blocked before any browser tests execute.

No browser pass or visual acceptance is claimed.
