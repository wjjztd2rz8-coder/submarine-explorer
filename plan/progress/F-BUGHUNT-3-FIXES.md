# F-BUGHUNT-3-FIXES

2026-10-02. Read `plan/DIRECTOR.md` and `plan/progress/F-BUGHUNT-3.md` before
implementation. Fixed the requested findings in this worktree; no commit.

## Round 1 — implementation and regression coverage

- **P1 / live hull refit:** chose the deferred policy. Hull and loaded-mission
  access are fixed when the site loads, including the briefing, resuming,
  restarting and piloting the ROV. Mode edits and hull research affect the next
  loaded dive; the site chooser still shows access for the saved mode. Other
  gameplay profiles remain live. A HUD notice explains the deferred changes.
  Mission start poses and briefing hull/rating/hazard copy use the effective
  fitted hull, even if the route's authored hull is stale.
- **P1 / locked deep links:** fit the effective hull before choosing the initial
  free-dive pose and clamp it above its rated depth by the hull radius. Pressure
  safety no longer depends on an optional props download. Preserve explicit
  mission URL probe behavior.
- **P1 / Monterey:** confirmed the existing F-BUGHUNT-FIXES primary-constrained
  composition already fixes the distant wall opening. Added a mission-system
  regression using actual low-tier terrain/POIs and procedural props, with no URL
  position override. It checks the initial preview and late props reframe remain
  within 300 m of a primary and outside hull collisions; the canyon wall must
  actually load. Free-dive hero composition and authored objectives are unchanged.
- **P2 / Daily Low light:** the ROV system reads the effective run light profile
  at boot and on saved gameplay and progress changes. Daily enforcement restores
  both vehicles. Saved enhanced preferences are preserved. ROV subscriptions are
  owned by each system instance and removed on disposal.
- Physics regressions step after both mode directions in a deep active dive,
  Arcade and unlocked Realistic briefings, and a deployed ROV (then the sub after
  retrieval). Check `hullBreached` and `emergencyBlow`, rather than only class.
  Six locked deep sites cover held, failed and absent props fetches, stepping
  before initialization, before download completion and after completion. A
  direct Realistic tile link and a newly loaded deferred downgrade are covered.
  Briefing and ROV HUD views are stubbed; routing, saves, progression, terrain,
  submarine/ROV physics, props and ROV lamp meshes are real.
- Extended `dailySystem.test.ts` to inspect both actual SpotLights' intensity and
  range and the fill light before/after Realistic → Arcade settings and a live
  light-range purchase. Submarine preset and preserved saved preference checks
  remain. Changelog and settings policy documentation updated.

## Round 2 — review and gates

- Removed redundant transient hull fits during spawn initialization; mission
  loadout also receives the effective hull. Checked loaded-dive policy against
  mission start, preview, props reframe, resume and restart paths.
- `tools/gates.sh` with `PW_PORT=4263`: **PASS build, unit, Python, content,
  attribution and Prettier**. Full unit suite: **81 files / 821 tests passed**.
  Production builds pass for both root and project base, including the existing
  public-copy and PWA plugins.
- Used a temporary writable copy of the installed dependencies under
  `/tmp/f-bughunt-3-deps/node_modules` while running the unchanged gates, because
  the original shared node_modules symlink cannot accept Vite's config cache.
  Restored the original symlink after each run; no package, lockfile, gate,
  formatter or browser configuration changes.
- **Browser gates remain blocked:** e2e and e2e-base both fail before tests because
  Playwright's preview server cannot start. Direct verification reports
  `listen EPERM: operation not permitted 127.0.0.1:4263`. No rendered visual,
  console, phone or golden-shot pass is claimed. The full gate command therefore
  exits nonzero and must be rerun in an environment permitting localhost.
- Ran `npx prettier --write` on all changed files. `git diff --check` passes.
  No assets or content-schema changes; no commit made.
