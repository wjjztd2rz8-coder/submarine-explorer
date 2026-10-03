# F-BUGHUNT-6 — modes, free dive and Daily dive

2026-10-03. Two audit/fix rounds in the current worktree; no commit. Read
`plan/DIRECTOR.md`, F2-MODES and the previous bug-hunt notes. Preserve the
loaded-dive hull policy: settings changes apply live to gameplay options, but
hull fitting and mission access resolve again only when the next dive loads.

## Round 1 — Daily access

- Confirmed: Daily candidate filtering called `Progress.canDive` without a
  mode, applying Realistic's research gate even to Arcade and Custom. Boot
  also selected Daily before reading saved settings. Both the card and route
  now explicitly use the selected mode; boot captures settings before loading
  catalogues. Downloaded-tile and known-depth checks remain required.
- The Daily card now refreshes synchronously on mode changes and removes that
  subscription on disposal. The active Daily definition stays unchanged.
- Wrote boot and card integration regressions first: two failures against the
  original code, captured in `.cache/bughunt-6-round1-red.log`. Boot tests reload
  actual Arcade/Realistic saves, select the expected deep/shallow route, preserve
  stored preferences and straddle UTC midnight. After fixing, the focused
  mode/Daily/hull suite passed all 50 tests.

## Round 2 — rewards and persistence

- Confirmed: Daily primary completion awarded `primary:<ordinary mission>`;
  debrief then awarded `primary:daily-YYYY-MM-DD`, paying the primary reward
  twice. A focus Daily could also consume an ordinary mission's primary reward
  before all its authored goals were completed. Both Daily paths now use the
  same dated reward key. Normal missions retain their ordinary identity.
- Wrote a failing integration regression before fixing, captured in
  `.cache/bughunt-6-round2-red.log`. It checks the 70 RP primary/two-star total,
  idempotent replay, both live mode changes and the later ordinary reward.
- Added four exploration integration checks using the real Explore system,
  scanner, discovery store and progress save: both mode directions in free and
  Daily dives, switching halfway through scanning, then reloading. Secrets and
  sample discovery records persist; rewards stay idempotent; collected sample
  lists start empty and can be populated again on a return dive as intended.
- Existing tests cover 0–3 stars, aborted/incomplete dives, best-rating reloads,
  repeated photo/species bonuses, denied/future saves, deferred hull changes in
  missions/free dives/briefings/ROV deployment, and safe initial depth gating.
  The broader focused audit passed 125 tests before the four new exploration
  checks, which also passed. No production change was needed in these paths.

## Validation

- `PW_PORT=4283 tools/gates.sh`: **PASS build, unit, Python, strict content,
  attribution and Prettier**. Full unit suite: **91 files / 940 tests passed**.
  Both e2e and e2e-base stop before test execution because their Vite preview
  cannot start in this sandbox. A direct Vite startup confirms
  `listen EPERM: operation not permitted 127.0.0.1:4283`; project-base build
  passes. No browser execution or screenshots are claimed.
- Daily unit/boot/system suites passed under `TZ=UTC`, `TZ=America/Chicago`
  and `TZ=Pacific/Kiritimati`: **15 tests in each process timezone**. This
  includes equal seed/date/access behaviour and loading across UTC midnight.
- Updated the fresh-pilot Playwright check to exercise both Arcade and
  Realistic explicitly, with saved-mode, zero-research, hull sufficiency and
  Realistic depth-limit assertions. All six `f2-modes.spec.ts` tests collect.
  Final strict typecheck, focused tests, changed-file formatting and
  `git diff --check` pass.
- The external read-only node_modules symlink prevents Vite's temporary config
  writes. For checks, temporarily use ignored local package links to the same
  installed dependencies with writable Vite cache directories; restore the
  original symlink afterwards. No dependency or gate configuration changes.

## Unfixed findings and limits

- No other confirmed defect remains from these two rounds. Sample collection
  being per-dive is intentional; persisted discovery/reward state is shared
  across modes. Ratings likewise remain shared, as the existing save schema
  and best-site policy specify.
- Browser-rendered mode controls, Daily card transitions and debrief layouts
  still require browser acceptance if the sandbox blocks Playwright. No visual
  or browser pass is inferred from the headless integration tests.
