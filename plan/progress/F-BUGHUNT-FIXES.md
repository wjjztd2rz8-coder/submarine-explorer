# F-BUGHUNT-FIXES

Implemented findings **1, 2, 4, 5, 6, 7** from `F-BUGHUNT-1.md` in the current
worktree. Finding 3 remains the existing F-BUGHUNT-2 implementation. No commits.

## Round 1 — implementation and focused regression checks

- **1 / photo:** visible Capture, Done and Pause controls in the photo overlay,
  with 44 px minimum targets and updated touch/keyboard help. Done calls
  `ctx.exitPhotoMode`; Pause uses the shell state transition, which exits photo
  mode and restores the pause menu. Unit coverage exercises actual DOM listeners,
  rig exit, clearing queued orbit input, cancelling a queued capture, and Pause.
  Desktop e2e includes clicking Done. The new touch e2e completes all five tutorial
  steps, captures, exits, moves, and pauses without keyboard input (it restores the
  initial scan approach after practising movement and depth).
- **2 / mission opening:** `composedMissionSpawn` only accepts a free-dive hero
  pose within 300 m of a primary. Otherwise it searches a safe,
  prop-clear approach to a primary, using the fitted hull's rated depth. This
  applies before props finish loading and to the late `props:loaded` reframe.
  Free dives retain their hero composition; Realistic, daily and explicit URL
  starts retain their existing policies. Actual low-tier terrain tests cover all
  13 sites both before and after procedural props load, including seabed/hull
  clearance and both horizontal and 3D 300 m bounds. External GLB geometry remains browser coverage.
- **4 / save recovery:** deduplicated recognised reward tokens give a lower bound
  on lifetime RP. Known, capped purchased levels determine spent RP. Lifetime is
  at least earned rewards and valid spendable RP plus purchases; spendable RP is
  at least token earnings minus purchases. Missing/malformed spendable balances
  are recovered from lifetime minus purchases. Existing awards, upgrades, ratings
  and future-version write protection survive. Typed discovery restoration pays
  species globally and secrets/samples per site instead of generic POI credit.
  Regression fixtures cover both damaged balances, either balance alone, numeric
  contradictions, reload, purchases, repeat rewards and typed discovery identity.
- **5 / migration retry:** persist the failed-site list in `legacyPending` and
  leave `legacyCredited` false until every pending site resolves. Later retries
  cannot retroactively rate sites first discovered after migration started.
  Rewards remain token-idempotent. HTTP 404/410 explicitly means optional mission
  content is absent; network errors, other failed responses, and unparseable
  content remain pending. Tests cover unavailable content → reload → successful
  recovery, no extra modern ratings, and truly absent optional missions.
- **6 / teardown:** reject late life-load completion after dispose, remove owned
  scene objects/listeners, clear `ctx.life` and detach owned scanner targets.
  `Life.dispose` disables updates and clears its targets; scanner detachment
  immediately clears active scans and stale candidate/nearest presentation.
  Regression tests cover disposal before fetch completion, loaded disposal,
  repeated disposal, and subsequent updates/events.
- **7 / allocations:** reuse the best-agent Map and mutate its candidate records
  after species warmup. Frozen frames still refresh selection for piloting/view
  changes. A populated fixture counts **zero new Maps across 120 frozen frames**,
  preserves target objects and stickiness, switches when the held animal leaves,
  and removes targets when all eligible animals leave. No wall-clock threshold.

## Round 2 — verification and limitations

- Full unit suite: **80 files / 793 tests passed** using
  `npx vitest run --configLoader runner --reporter=dot`.
- `npm run typecheck`: passed.
- Production build: passed using the unchanged Vite config bundled by Rolldown
  into ignored `.cache/f-bughunt/vite.config.mjs`, then
  `npx vite build --config .cache/f-bughunt/vite.config.mjs --configLoader native`.
  This retains the public-copy and PWA plugins. The default config loader cannot
  write to shared read-only `node_modules`; runner-loader build also hits Vite's
  existing closed-module-runner error in the PWA close hook.
- Playwright touch regression was attempted, but server startup/local HTTP probes
  fail in the sandbox (`EPERM` connecting to localhost; default preview also needs
  the read-only config cache). No successful browser run or rendered touch QA is
  claimed. Run `tests/e2e/f3-onboard.spec.ts` and `tests/e2e/d-photo.spec.ts` in an
  environment permitting localhost, and verify the mission nav arrow there.
- Ran `npx prettier --write` on every changed/new file. Final `tools/gates.sh --no-e2e`: **PASS Python, content, attribution,
  Prettier**. Default build/unit commands fail solely on the shared config-cache
  `EROFS`; the separately executed typecheck, full runner-loader unit suite and
  production build above pass. `git diff --check` passes. Playwright lists all
  eight photo/onboarding specs successfully; actual execution remains blocked.

## Orchestrator gate follow-up — touch gesture readiness

The orchestrator's unrestricted gates passed build, unit, Python, content,
attribution, Prettier and e2e-base. The main e2e run had **210 passed, 14 skipped,
1 failed**: the new touch tutorial/photo test dereferenced a null stick bounding
box immediately after Done.

Root cause: `ctx.exitPhotoMode` hides the photo overlay synchronously in the
button click handler, while `createTouchSystem` restores the controls during the
next frame's `late.input`. The custom CDP gesture helper called `boundingBox`
without a retrying readiness assertion; the checks for hidden photo/tutorial
cards could finish before the touch controls refreshed.

Fixed the gesture helper to assert the target is visible before reading its
bounds and to assert the bounds are non-null. Added explicit assertions that the
touch root hides during photo mode and returns after Done. Kept every existing
assertion: five tutorial steps, 44 px targets, saved capture, completed tutorial,
post-exit thrust/speed, Pause and Resume. No forced visibility/input changes,
fixed sleeps, increased timeouts, or skipped assertions.

Follow-up validation: `npm run typecheck` passes; the full runner-loader unit suite
still passes **80 files / 793 tests**; Playwright lists the eight photo/onboarding
specs successfully. Ran `npx prettier --write` on the changed test and this note;
`git diff --check` passes. Production sources are unchanged by this follow-up.
Browser execution remains unavailable in this sandbox, so the orchestrator must
rerun the touch regression (and its full e2e gate):

```sh
npx playwright test tests/e2e/f3-onboard.spec.ts --grep 'PHOTO capture'
```
