# F-COPY-AUDIT

## Changes

- Reviewed all 13 published landmark guides and missions, the `_test` guide,
  contextual and tutorial hints, Journal copy, and strings throughout `src/ui`
  against `plan/DIRECTOR.md` and the content-tone rule.
- Shortened 43 objective titles and route hints. Each still names a physical
  feature or historical scan site and gives a route or depth; none asks the player
  to visit coordinates alone. Removed redundant optional wording from titles
  because the HUD already labels optional objectives.
- Removed repeated generic game-recreation explanations from guides. The Journal
  front page states the survey/recreation distinction once, including scenic
  landforms and staged animal encounters; existing Recreation tags remain.
  Kept historical absence details (Beehive, the Big Piece, Titanic's plaque),
  Bismarck's unresolved depth gap, survey limits and all scientific/history facts.
- Condensed contextual tips, locked-entry instructions and scan completion copy.
  Disabled the contextual scan-target hint because the scan panel already shows
  its target and control, as requested in the director notes. Other hints retain
  their timing, dismissal and persistence behavior.
- Added case-insensitive whole-word rejection of `illustrative` and
  `reconstructed` in mission objective `title` and `hint` fields. Python regression
  cases cover both fields, mixed case, punctuation and allowed provenance data.
- Updated existing e2e copy assertions and changed the hint persistence case to
  exercise the hull hint while checking the scan panel and absence of a duplicate
  scan hint. No commits.

## Verification

- Initial strict content check: all 13 published sites, zero errors or warnings.
- Focused content-validator suite: 33 passed.
- `bash tools/gates.sh --no-e2e`: PASS build, unit (887 tests across 87 files),
  Python (128 tests), strict content, attribution and Prettier.
- First gate attempt hit read-only shared `node_modules/.vite-temp` during build
  and unit startup. Replaced this worktree's ignored dependency-directory symlink
  with local package links and writable `.vite` / `.vite-temp` cache directories;
  the exact gate command then passed without changing project configuration.
- Second review removed remaining generic placement caveats from the ASHES minor
  chimneys and Lost City Beehive/IMAX entries, keeping named scan routes instead.
- Compared parsed landmark JSON against HEAD: only guide paragraphs and the 43
  objective title/hint pairs differ. All fact tables, reconstruction/confidence
  flags, source lists, coordinates, depth fields and other metadata are identical.
- No player guide or contextual hint uses the banned words; no generic
  game-recreation caveats remain in guide prose. `git diff --check` passed.
- Prettier run on all changed JSON, TypeScript and Markdown files. Python files
  follow the existing validator style (Prettier has no Python parser).
- E2e cannot run in this sandbox; browser assertions require an external gate run.

## Orchestrator gate follow-up

- External gates passed build, unit, Python, content, attribution, Prettier and
  e2e-base. Main e2e had 221 passes, 14 skips and one failure: the hint persistence
  test waited for a hull hint at Titanic even though its roughly 3,800 m spawn is
  only 58% of the fitted Class B hull's 6,500 m rating. The hint starts at 85%.
- Fixed the test's actual input conditions by using the existing Leggo scan spawn
  at Challenger Deep, naturally near the 11,000 m Class C rating. Waits for that
  spawn and asserts the fitted hull, the real hint threshold, a ratio below 1 and
  an intact hull. No fake ratings, changed warning thresholds or weakened assertions.
- Seeds unrelated hint IDs as already seen so ambient creatures cannot trigger a
  different hint after reload. Keeps the hull hint unseen initially and retains
  every visibility, expected text, scan-panel, dismissal, saved-ID and reload assertion,
  including the assertion that the duplicate scan hint is never consumed.
- Reload also waits for the Leggo spawn and verifies the scan panel is visible
  before asserting that the dismissed hull hint stays hidden.
- Follow-up `bash tools/gates.sh --no-e2e`: PASS build, unit (887), Python (128),
  content, attribution and Prettier. E2e cannot run in this sandbox; the
  orchestrator must verify this browser fixture repair externally.
