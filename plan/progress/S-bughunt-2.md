# S-bughunt — second pass over settings, overlays and startup

Backlog item **S-bughunt [Codex]**, brief 1690 / second pass. Scope is the
S-resolve, S-modal and S-boot save/input/startup boundaries. No appearance changes,
new UI, settings, dependencies, site branches or capability cuts. Director and
tools are unchanged; no merge, push or tag.

## Confirmed defects and fixes

- A new D-pad Left press closed an open Journal underneath Settings. Discovery
  now checks the Journal's shared FocusTrap ownership before forwarding the edge
  through frozen input. The regression opens Pause → Journal → Settings, checks
  that the underlying Journal stays open, restores its Settings opener, ignores
  the held pad button, and returns focus to Pause after a fresh press.
- Switching Arcade → Realistic during “Head to…” disabled the approach waypoint.
  Mode resolution directly set visibility while the waypoint frame's cache still
  said it was enabled. Removed that second setter: the waypoint frame owns the
  effective preference and approach exception. The test keeps the approach
  visible, disables it once when scanning begins, and applies a Custom switch
  once across repeated frames.
- Reduced-motion edits called the waypoint setter twice, first ignoring the OS
  preference and then correcting it. Removed the redundant waypoint subscriber;
  Settings applies the combined saved/OS preference once. Tests check both edits
  and a subsequent OS preference change.
- Rapid Home list previews changed the globe orientation but kept the previous
  pin's focus/hover card. List navigation now clears those obsolete preview
  owners before pinning the requested site. Both focus and pointer-entry cases
  check several immediate switches.

`docs/discovery.md` documents the new Journal stack-ownership accessor. An
additional Home → Settings test checks forward/reverse Tab containment and focus
return after button/touch activation and after Escape.

The initial run reproduced five failures (four defects) in the existing
`overlayFocus.test.ts` capability suite. The approach fixture was corrected to
mark its objective resolved, then reproduced separately against the original
mode setter before the fix. Existing regression assertions remain unchanged;
the existing pad test's fixture now models top ownership explicitly.

## Simplicity

Removed competing live setters rather than adding another settings path. Overlay
input reads the existing stack. No guidance surface, layout patch, site branch,
runtime config mutation or package-number source comment was added. Tests extend
existing capability specs. No capability cut requires a CHANGELOG entry.

## Save/startup and input coverage

Added three actual boot/reload cases to `startupLifecycle.test.ts`: empty storage,
a legacy v2 settings blob with Standard speed, descent and sonar-marker fields
plus ROV bindings and an upgrade record, and corrupt settings/bindings/progress
JSON. All reach Home without a gameplay tile. After edits, a second boot keeps
Custom inheritance, the saved graphics tier, battery choice, reduced motion,
captions, palette, UI scale and remapped thrust key. Legacy source settings stay
byte-for-byte intact; retired live keys stay absent; legacy upgrades are retained.

Existing `saveSoak`, `settingsSave`, `subInput`, `quality`, `reducedMotion`,
`powerSystem`, `dailySystem` and startup cancellation/selection assertions were
run together with the new regressions. They cover individual malformed fields,
future-save protection, failed reads/writes, migration across 36 legacy mode /
speed / current combinations and 30 edits/reloads each, once-per-press pad edges,
touch/keyboard/pad combinations, tier precedence, live Daily resolution without
compounding, fitted hull/pose/supply preservation and stale selected-tile loads.

Settings deliberately refuses to open over Globe (`settingsSystem.canOpen`), as
documented in `docs/settings.md`; that restriction was retained. Existing overlay
tests cover Briefing and Debrief stacking, Globe/cluster chooser Escape order and
focus return, including the embedded Globe. No new routing or save defect was
confirmed beyond the four fixes above.

## Validation

- Focused overlays/systems/Daily/mission-approach run: **70 tests / 4 files PASS**.
- Typecheck: **PASS**.
- Final capability run: **259 tests / 11 files PASS**. The separate final Home
  overlay / startup run passed **80 tests / 2 files** (overlapping counts).
- Repository-wide `npx prettier --check .`: **PASS**; `git diff --check`: **PASS**.
- `GATES_CONFIG_MODE=writable PW_PORT=4319 bash tools/gates.sh`: **exit 1**.
  Config bundling, strict content and production build including TypeScript:
  **PASS**. Python: **161/165 PASS**, with four unchanged
  `test_ci_build_manifest` failures caused by sandboxed Node's `spawnSync git`
  returning `EPERM`. No tooling or assertions were changed.
- Full unit gate: **192 files / 2,172 tests PASS**, 482.98 seconds, no skips.
- Attribution and repository-wide gate Prettier: **PASS**.
- Root smoke and project-base browser gates: **blocked before test execution**;
  preview cannot bind localhost. The project-base production build passed. A
  separate preview with the gate's native bundled Vite config confirmed
  `listen EPERM: operation not permitted 127.0.0.1:4320`. No browser or visual
  acceptance is claimed.

Logs: `.cache/runs/20261013-230123-27-jjdRbu/` (all gates),
`/tmp/S-bughunt-2-{repro,waypoint-repro,focused,capabilities-final,overlay-startup,prettier,preview,gates}.log`.

Remaining: run the four blocked Python manifest checks and browser smoke /
project-base checks in an environment that permits Git subprocesses and localhost
listeners. The confirmed defects are fixed and their tests retained. Director,
tools, CSS and existing regression assertions are unchanged. No capability cuts.

Git staging was attempted and failed because
`/home/vijay/submarine-explorer/.git/worktrees/1690-S-bughunt-2/index.lock` cannot
be created on the read-only filesystem. Changes remain uncommitted; use
`game: fix S-bughunt settings and overlay regressions` when committing from an
environment with writable Git metadata. No merge, push or tag was attempted.
