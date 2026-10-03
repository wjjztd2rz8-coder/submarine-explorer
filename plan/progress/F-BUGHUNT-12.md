# F-BUGHUNT-12 — regression sweep over 2026-10-03 merges

## Plan and scope

1. Review main's commits since local midnight on 2026-10-03, concentrating on
   bughunt-8/10, CI split, title B/C and terrain mip bias, plus the earlier
   audio/mobile, touch and save changes on the same day.
2. Reproduce confirmed bugs with failing tests before changing production code.
3. Make minimal fixes, with one CHANGELOG entry per fix, retaining save versions
   and the intentionally deferred F-TITLE-E bridge.
4. Run focused tests, `tools/gates.sh`, and report evidence and limitations.

## Progress

- Clean starting checkout at `58f5ef3` (also main). Git's bare date filter used
  the current time of day and returned no commits; the review uses explicit
  `--since='2026-10-03 00:00:00 -0500'` to include the whole day.
- No bughunt-9 commit is on main; the overnight log lists that package as queued.
  Its intended audio/mobile area is covered by reviewing today's earlier merges.
- Both title modules are intentionally unreferenced pending F-TITLE-E. Their
  exports are audited directly, without implementing that separate redesign.
- Code fixes and focused validation are complete. Browser acceptance is blocked
  by this environment's localhost bind denial; the full gate is not green.

## Confirmed bugs and fixes

Every fix below had failing regression coverage before production edits. The
initial test run had **15 failures / 37 passes** across the three affected
suites (`/tmp/f-bughunt-12-red.log`). One additional portrait renderer error
check already passed and protects the behavior while extending it to desktop.

| Bug                                                                              | Reproduction and minimal fix                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title strobe violates steady-light spec, and freezes bright under reduced motion | Real vehicle material/halo checks fail at construction. Suppress its navigation flash in every title motion mode; retain the steady lamps and existing vehicle API. Checks also cover runtime motion and tier changes.                 |
| Downward hover breaches 12 m floor clearance                                     | A ridge at the vehicle raises its base to exactly the clearance floor; negative hover sinks below it. Clamp the final posed vehicle height, tested over a complete 40 s loop.                                                          |
| Ultra title quality creates an empty snow buffer                                 | Constructor and quality-change calls receive the game's resolved Ultra tier, absent from the original title union/maps. Accept the existing GraphicsTier union and add Medium+ budgets/counts for Ultra.                               |
| Title frame cap exceeds 30 fps                                                   | The 2 ms scheduling allowance presents 315 frames in 10 s at 63 Hz. Use only a numerical-roundoff allowance at the 1/30 s threshold. Existing 60 Hz scheduling still passes.                                                           |
| Desktop title draw inherits another draw's viewport/scissor                      | A shared renderer left in a small viewport clips the full title. Set and restore viewport/scissor for every layout, with exception/retry coverage and both enabled/disabled scissor restoration.                                       |
| Title snow starts around an outdated anchor                                      | Constructor places snow before computing the vehicle base; crop replacement also leaves the old snow centre until update. Position snow after posing the current anchor, including immediate asset changes before a draw.              |
| Camera gestures retain or impersonate pending double taps                        | Tap → cancel/drag → tap resets the camera; a two-finger press/release can itself count as the second tap. Reset the sequence after non-taps and mark every multi-finger participant ineligible as a tap. Fresh double taps still work. |
| Touch teardown leaves canvas gesture styling behind                              | Starting with `touch-action: pan-y`, disposal leaves `none`. Restore the prior inline value if it is still the value this control owns.                                                                                                |
| Repeat touch teardown disables rebuilt controls                                  | Dispose old controls, rebuild using the same input, dispose old again: touch input and layout class are cleared. Make disposal idempotent and ignore stale public update/mode calls.                                                   |
| Empty legacy animal/photo subjects earn an undeserved bonus                      | Persisted `life:` or empty photo POI IDs grant three stars despite proving no subject. Require a nonempty subject, matching current reward handling; retain two-star completion, ordinary legacy credits, and migration cleanup.       |

There is one CHANGELOG line per fix. No save key/version, dependency, content
pack, gameplay feature, browser assertion or gate selection was changed.

## Sweep findings and exported API coverage

- **Bughunt-8 / touch and Daily:** reviewed global listener removal, held-pointer
  release, layout/focus/modal transitions, rebuilt controls, inaccessible Daily
  card hiding/recovery and its launch closure. The new gesture/teardown tests
  extend the existing interruption coverage.
- **Bughunt-10 / save compatibility:** reviewed own-property rating keys,
  reward-ledger star recovery, upgrade cost accounting, purchase/reload paths,
  read-only future records and legacy site-specific animal credit. Existing
  tests cover uppercase/underscore/prototype-named IDs and recovery without
  duplicate RP; the empty legacy subject bug above is the additional finding.
- **Audio/mobile area intended for bughunt-9:** reviewed today's earlier audio
  unlock, pause/visibility and managed-source teardown changes, reduced-motion
  particle/strobe handling, late marine-life loading, DynamicResolution bounds,
  focus and touch-target changes. No further confirmed defect in those diffs.
- **CI split:** reviewed default smoke versus CI/full opt-in selection,
  project-base inclusion, isolated outputs/ports and failure propagation. The
  existing seven orchestration tests pass, as does the Python suite. This run
  also confirms project-base is still attempted after smoke server failure.
- **Mip bias:** reviewed the exact shader diff and comparison tool. All
  triplanar albedo axes and breakup taps receive the same distance bias;
  `length(vViewPosition)` is already available on every tier. Offline tool tests
  pass. No shader change made; visual anti-aliasing/luminance acceptance still
  requires browser execution.
- **Title exports:** `buildTitleCrop`, `loadTitleCrop`, `TITLE_ANCHOR`,
  `TitleScene`, `TITLE_SHOT` and `regionFor` have executable coverage. Added a
  default-loader integration check serving the real checked-in Monterey bytes
  through a mocked fetch: it verifies the fixed tile URLs, composes both modules
  on all four resolved tiers, and checks geometry budgets and camera/vehicle
  floor clearance over the entire sway loop. No network, storage or active
  route writes occur. F-TITLE-E remains separate, so browser gameplay gates do
  not yet exercise title rendering.

## Validation

- Focused five suites: **78 tests pass**, including **17 added cases** (16
  regression/error-path cases and one real-tile integration case). TypeScript
  passes. Corrected a test-only reward total from 90 to 85 RP after checking
  the configured reward amounts; the original failures were at the preceding
  star assertion, before reaching that total.
- `PW_PORT=4320 tools/gates.sh`: **PASS build, unit, Python, strict content,
  attribution, Prettier**. At this run: **99 unit files / 1,060 tests** and
  **136 Python tests**. Root and project-base production builds both pass.
- **FAIL e2e and e2e-base before any browser tests run.** Direct Vite probe
  confirms `listen EPERM: operation not permitted 127.0.0.1:4320` in
  `/tmp/f-bughunt-12-listen.log`. Full gate output is preserved in
  `/tmp/f-bughunt-12-gates.log`, per-gate logs in `.cache/gates/`.
  No browser assertions, screenshots or visual sign-off are claimed.
- Final `PW_PORT=4320 tools/gates.sh --no-e2e` after adding the real-tile
  integration check: **exit 0, all six static gates pass**, including **99 unit
  files / 1,061 tests** and **136 Python tests**. Preserved output:
  `/tmp/f-bughunt-12-static-gates.log`. This explicit static-only pass does not
  replace the failed full gate or imply any browser acceptance.
- `git diff --check`: passes.
- The supplied `node_modules` link points to a read-only tree. Validation uses
  a temporary dependency copy in `/tmp/f-bughunt-12-deps/node_modules`, with its
  copied absolute nested dependency link removed to avoid duplicate Playwright
  instances. The original workspace link was restored after final checks; no
  package or lockfile changes.

## Final handoff

Ten bugs fixed with test-first evidence and changelog entries. Code/static
validation can be completed here. A green complete gate and visual acceptance
remain pending on an environment that permits Playwright's localhost preview
server. Re-run `PW_PORT=4320 tools/gates.sh --full-e2e` there; keep the existing
assertions and project-base gate intact.
