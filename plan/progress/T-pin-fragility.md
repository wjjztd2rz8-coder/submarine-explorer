# T-pin-fragility

No game behavior changes. Replace test-only content totals with expectations from
the same `data/landmarks` and `data/secrets` documents loaded by the game.

## Plan and progress

- Audit e2e/unit count assertions, retaining fixed capability/resource budgets and
  counts belonging to locally constructed fixtures or scripted actions.
- Replace prop totals and model/procedural splits, site totals, declared POI and
  curiosity totals, and mission objective totals with authored-data expectations.
  Shared raw content reads live in `tests/content.ts`; expectations deliberately
  bypass runtime parsers so rejected entries cannot reduce the expected count.
- Extend `props-loader.test.ts` with a cheap catalog-wide declaration/validation
  guard (including `_test`), already included by the unit gate. Strengthen the
  existing static prop budget census to require all declared IDs/counts and model
  kinds, with zero failures/skips. No new gate or browser workload is necessary.
- The e2e prop budget and curiosity table now follow the landmark index. This also
  restores the missing Monterey curiosity case. Frame/geometry/fill ceilings and
  focused geometry regression pins remain intact.

## Validation

- Initial focused unit run: props loader + performance budget, 90 tests passed.
- TypeScript passes. Playwright discovery passes for all nine changed root-base
  specs (147 tests); new/shared JSON imports use Node import attributes.
- `GATES_CONFIG_MODE=writable PW_PORT=4192 PW_OUTDIR=dist-content-counts bash
tools/gates.sh` finished with exit 1. Content and build passed. Python tooling has
  sandbox failures (`spawnSync git EPERM` in build-manifest tests; golden comparison
  subprocess produced empty JSON).
- Focused `npx playwright test <spec> -g '<test name>'` attempts cover opening prop
  budgets, fixture load/debug editor, all-site curiosity counts, Realistic mission
  availability, mission briefing/scan flow, nested Journal site counts/opening
  life, Home Journal/fixture/mission flow and catalog addition tags. The preview
  cannot bind its local port: `listen EPERM 127.0.0.1:4193`; no browser assertions
  executed. Project-base coverage is also part of gates.
- Second audit found the remaining Lost City `count: 12` match-object pin, opening
  life group/population totals, and Monterey's stale `3/5 secrets` Journal text.
  All now use authored declarations. Pose snapshots, implementation-level mesh
  counts, resource ceilings, zero-error checks, and scripted action counts remain.
- Mutation controls passed: an in-memory filesystem override adds a valid Kama
  prop and the actual new guard passes; duplicating an existing ID makes the
  same guard fail on `parsed.errors`. Both controls finish in about one second;
  no content files were modified. Logs: `.cache/content-counts-mutation-*.log`.
- Final literal-count audit also replaced site totals in the phone photo gallery,
  Arcade site access, and mission-pacing inventory checks.
- Affected unit rerun passed: 987 tests in 17 files, plus mission pacing's 19
  tests (1,006 tests across all 18 changed unit specs). Logs:
  `.cache/content-counts-unit.log` and `.cache/content-counts-pacing.log`.
- Final TypeScript, changed-file Prettier, and `git diff --check` passed.
- Project-base test discovery also passes. Every changed e2e spec has a focused
  execution attempt; all remain blocked at preview startup by local-port policy.
- Full unit gate passed: **4,403 tests in 192 files**. Root and project-base builds,
  strict content validation, attribution, and whole-repository Prettier passed.
- Full gates finished red only in Python tooling (four build-manifest tests with
  `spawnSync git EPERM`, one golden comparison JSON parse failure) and both browser
  phases (preview cannot bind a local socket). The affected test changes and all
  other unit tests pass. Browser assertions remain unverified in this sandbox.
- Final diff contains only tests and this note. Retained builds and temporary
  mutation harnesses were removed; diagnostic logs remain under `.cache/`.

## Specs changed

E2E (`tests/e2e/`):

- `base-url.spec.ts`
- `d-photo.spec.ts`
- `f-arcade-access.spec.ts`
- `f-perf-budget.spec.ts`
- `f-verify-1000.spec.ts`
- `f2-explore.spec.ts`
- `f2-progress.spec.ts`
- `journal-debrief.spec.ts`
- `mission.spec.ts`
- `props.spec.ts`

Unit (`tests/unit/`):

- `blueHoleCollision.test.ts`
- `copyJournal.test.ts`
- `currents.test.ts`
- `discoveryReward1240.test.ts`
- `exploreTerrain.test.ts`
- `f-bughunt-5.test.ts`
- `journalData.test.ts`
- `missionComposition.test.ts`
- `missionCore.test.ts`
- `missionPacing.test.ts`
- `montereyBoulders.test.ts`
- `montereyFrameBudget.test.ts`
- `montereyOpening.test.ts`
- `montereyWallLife.test.ts`
- `perf-budget.test.ts`
- `presets.test.ts`
- `props-loader.test.ts`
- `siteManifest.test.ts`
