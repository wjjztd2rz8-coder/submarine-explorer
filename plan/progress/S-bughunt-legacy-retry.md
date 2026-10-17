# S-bughunt — legacy retry evidence

Scope: `plan/DIRECTOR.md` Backlog 8, carried from the larger finding in
`plan/progress/S-bughunt-16.md`.

## Decision and implementation

Freeze each site's discovery keys and photo/wildlife bonus when legacy migration
first runs. Store `{ site, keys, bonus }` records in the existing `legacyPending`
field. Retrying content loading uses only that evidence, including after another
offline retry and reload. This retains genuine old completions without allowing
later primary, secondary, animal or photo discoveries to improve old stars.
An old photo's bonus also survives removal from the gallery before retry.

Older pending records contain only site IDs, so their original evidence is already
lost. Retire those retries without fetching or awarding more legacy stars; retain
existing ratings and cosmetic grants. Normal dive ratings remain available.
The save reader accepts both representations and sanitizes snapshot keys by site.
`docs/architecture.md` documents the boundary and compatibility policy.

Simplicity: no setting, UI, dependency, tuning value, site branch, storage key,
top-level save field or version bump. Only the existing pending field gains the
evidence required for safe retries. Tests extend the existing progress/migration
capability spec.

## Regression evidence

- Before the source change, the extended migration spec had **6 failures / 23
  passes**: later primaries (0 → 2 stars), secondaries (1 → 2), wildlife and photos
  (2 → 3), removed old photo evidence (3 → 2), and unsafe site-only retry fetching.
  Log: `/tmp/S-bughunt-legacy-retry-before.log`.
- After the change, **4 focused suites / 149 tests pass**, covering migration,
  progress, save persistence and cosmetics. The new cases reload discovery and
  progress stores, retry offline twice, simulate an aborted later dive, and verify
  final retry idempotency. Existing tests retain old-route credit, newer-site
  isolation, modern ratings and cosmetic isolation.
  Log: `/tmp/S-bughunt-legacy-retry-focused.log`.

## Gates

Ran `GATES_CONFIG_MODE=writable PW_PORT=4320 bash tools/gates.sh --full-e2e`.
Logs: `/tmp/S-bughunt-legacy-retry-gates.log` and
`.cache/runs/20261017-164636-3-6FZKZ7/`.

- PASS: production build (including TypeScript), strict content validation,
  attribution and repository-wide Prettier.
- PASS: full unit gate, **192 files / 3,060 tests**, 512.99 seconds.
- Python: **161/166 pass**. The same five failures documented in
  `S-bughunt-16.md` recur in unchanged tooling: four build-manifest cases fail
  with `spawnSync git EPERM`; the golden comparison CLI case fails parsing empty
  stdout with `Unexpected end of JSON input` at
  `tools/tests/golden-manifest.test.mjs:151`. No assertions were changed.
- Both full Playwright and project-base browser gates fail before browser
  assertions because their owned preview server cannot start. The project-base
  production build passes. A direct Vite preview using the same port and config
  loader reproduces `listen EPERM: operation not permitted 127.0.0.1:4320`.
  Log: `/tmp/S-bughunt-legacy-retry-preview.log`. No browser or screenshot pass is
  claimed.
- The gate run exits **1** for Python and the two browser gates. Those gate
  failures remain outstanding; the implementation and regression tests are
  complete. Changes are uncommitted.
- PASS: final `git diff --check` and formatting check for the completed progress
  note.
