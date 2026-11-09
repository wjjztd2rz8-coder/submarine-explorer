# S-bughunt-journal-ui

2026-11-09 — DIRECTOR item 16m. Read `plan/DIRECTOR.md` first and
`CONTRIBUTING-AGENTS.md`; the initial worktree was clean.

## Round 1: failing-first empty-state regression

A first wildlife, secret or sample discovery unlocks a site and its entries,
but the Journal front page still said “Scan something on a dive to add it
here.” `renderFront` used the POI count to decide whether anything was earned,
even though the existing site-unlock predicate also recognizes these scans.

Six cases in the existing `journalGroups.test.ts` failed on unchanged source:
each discovery type in desktop and phone layouts retained the empty hint.
They now pass, check one scanned site, suppress unearned POI rows, and repeat
navigation/close/reopen twice. The fix uses the already-computed scanned-site
count and omits the zero POI chip when only another discovery kind is earned.

Simplicity: removed the POI-only empty-state decision and misleading hint
after non-POI scans. Reuse the existing progress chips and unlock predicate;
no new UI, settings, dependency, CSS, save state or site-specific branch.

## Round 2: remaining boundaries

- Tags: `journalEntryTag` gives one provenance tag; only spoiler previews of
  locked entries add the separate Undiscovered status. Existing real-content
  and DOM tests cover recreations, staged wildlife, secrets and samples.
- Filtering: earned rows use `isEntryUnlocked`; spoilers reveal locked rows
  without writing discoveries. Empty groups disappear when spoilers turn off.
  The new cases require earned wildlife/Find rows without unlocking POIs.
- Current entry: guide IDs and relative wildlife/Find keys resolve against the
  current site. Existing cold-load cases publish its content before unrelated
  requests finish and preserve subsequent navigation. Site changes boot a new
  page; browsing another site within the current dive intentionally persists.
- Empty state: no scans and unavailable catalogues retain their distinct
  existing hints. Non-POI first scans were the only confirmed defect.
- Narrow text: reviewed the existing shrinking grid tracks, wrapping titles,
  row labels and references, and phone fact-label wrapping. Added a native
  360px test with unbroken titles, paragraphs, facts and source labels; it also
  checks Close → first site, entry activation, Back and Escape/opener focus.
  Native geometry remains unverified because the browser cannot start here.
- Keyboard: existing Journal and stacked-overlay unit tests cover collapsed
  disclosures, refresh replacement, rotation, Escape and opener focus return.
  New browser first-discovery cases check tags, filtering and focus return
  before and after reload at desktop and 360px widths. No further fix confirmed.

## Validation

- Failing-first run: `npx vitest run tests/unit/journalGroups.test.ts
--configLoader runner --cache=false -t 'shows earned front-page progress'`:
  **6 failed**, all retaining the incorrect hint.
- Final focused run: Journal groups/data/about/copy, hero Mission-to-Journal
  and overlay focus capabilities: **6 files / 404 tests passed**.
  Log: `.cache/journal-ui-focused.log`.
- `npm run typecheck`: passed after adding the browser cases.
- Searched `tests/e2e` for Journal/spoiler/focus/overflow coverage and extended
  the existing `journal-debrief.spec.ts`. The capability filter discovers
  **17 tests**; `.cache/journal-ui-e2e-list.log`.
- Attempted `GATES_CONFIG_MODE=writable PW_PORT=4339
PW_OUTDIR=.cache/journal-ui-dist npx playwright test
tests/e2e/journal-debrief.spec.ts -g 'first .* replaces the empty Journal
hint|360px Journal contains long text|cold dive Journal shows cached
entries|Journal rotation releases focus|unavailable Home Journal
catalogue|home front page, site entries, spoilers, reload'
--output=.cache/journal-ui-e2e`. Exit 1 before test bodies: preview startup
  is blocked. Direct preview confirms `listen EPERM` on `127.0.0.1:4340`.
  Logs: `.cache/journal-ui-e2e.log`, `.cache/journal-ui-preview.log`.
- Full gate command: `GATES_CONFIG_MODE=writable PW_PORT=4338
PW_OUTDIR=.cache/journal-ui-dist tools/gates.sh`.
  Log: `.cache/journal-ui-gates.log`; run directory:
  `.cache/runs/20261109-141617-7-uQbxOF/`. Completed, exit **1**:
  - **196 unit files / 4,762 tests passed** (922.80 seconds).
  - Content, root and project-base builds/typechecks, attribution and
    repository-wide Prettier passed.
  - Python: **164 passed / 5 failed**. Four manifest cases report
    `spawnSync git EPERM`; the golden comparison subprocess returns empty JSON.
    These match the previously documented sandbox failures.
  - Root smoke and project-base browser gates both exit before test bodies
    because their preview server cannot start.
- After grouping the new reading cases under the existing service-worker
  blocking fixture, typecheck, changed-file formatting, capability discovery
  and the targeted Playwright command were repeated. Browser startup remains
  blocked. Removed the isolated build after verification; retained the logs.

No browser, screenshot or real-phone acceptance is claimed.
