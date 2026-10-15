# 1920 — S-bughunt

Base: main `8beae85`. Scope: the eight animal-guidance placement cases in
`hud-touch`, plus `d-modes`, `d-shell` and `d-sonar`, reported in the
2026-10-14 12:14 overnight log. Review the uncommitted 1800 repair against
current main without weakening guards or reverting S-hud/S-picker.

## Plan

1. Reproduce the original failures and trace each fixture/assertion to current
   runtime behavior and the intentional simplification contracts.
2. Salvage the compatible 1800 repair, review fixture isolation and exact
   assertions, and validate the affected capability specs and repository gates.

## Round 1 — diagnosis and salvage

Read the overnight log, current specs, runtime paths and the complete uncommitted
1800 diff. That diff applies cleanly to current main. Its previous browser runs
never reached assertions; our baseline attempt also stops at preview startup.

The failures have stale fixtures/assertions after **S-rewards / S-guidance**,
rather than an established S-hud or S-picker runtime regression:

| Spec                         | Root cause                                                                                                                                                                                                                                                                                                                                                  | Repair and retained guards                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `d-modes`                    | S-rewards (`d5e0104`) equips every pilot. The old expectations omit the kit's 1.2 scan and 1.24 thrust multipliers.                                                                                                                                                                                                                                         | Derive exact authored bow radii and forward cap from the independent tuning modules: Arcade 480 m, Realistic 240 m and 1.736 m/s. Keep lights, vertical cap, live mode application, Custom reload and migration guards.                                                                                                                          |
| `d-shell`                    | The same commit removed Upgrades and updated the ordered action list, but left the aggregate button count at nine. Radios are inputs, not buttons.                                                                                                                                                                                                          | Keep exact six actions and eight ordered menu entries. Correct the exact aggregate count to eight and add selected/visible mode-radio and collapsed-Advanced checks. Keep focus, pause/input, resource-tree and globe checks.                                                                                                                    |
| `d-sonar`                    | The old fixture assumes the opening puts the stern beyond Realistic's sonar range. The fixed kit changes Realistic to 725 m and Arcade to 2900 m; the test never establishes a discriminating distance.                                                                                                                                                     | Wait for POIs and props; hold the sub 1812.5 m horizontally from the stern. Keep visible → hidden → visible across Arcade → Realistic → Arcade. Restore the opening and normal stepping before the existing 1 m / 2000 m checks. Keep Whole tile, icon, zoom and palette guards.                                                                 |
| Eight animal-placement cases | The fixture calls `ScanOverlay.setSuppressed(true)` as though it withdraws only the scan source. S-guidance (`40e05f90`) forwards this to the shared slot, rejecting every source. Also, `Discovery.update` resets suppression from actual covered-play state every frame and re-offers the scan, so a one-shot suppression cannot clear that live contact. | Reuse the existing source-withdrawal helper, which removes `scan` and holds the overlay update. Retain live animal spawning, tutorial dismissal, unseen-while-scan-busy, device copy, viewport/scale/site matrix, geometry, clipping, overlap and lifetime assertions. Add explicit hint-visible, scan-hidden and seen-after-display assertions. |

## Round 2 — frame-level reproduction and guard review

Salvaged the four 1800 spec edits, with two follow-up corrections: retain Home's
exact aggregate button-count guard, and remove the sonar fixture's temporary
`sub.step` override after restoring its opening.

An ignored diagnostic fixture under `.cache/1920-bughunt/` exercises the actual
resolver, sonar visibility function, scan overlay, hint engine and a real
`Discovery.update` frame. All four probes pass:

- Old bare-kit mode expectations contradict the resolver's exact values.
- At 1812.5 m the actual sonar gate includes Arcade and excludes Realistic.
- Global suppression rejects a hint even if its engine marks it seen. This is
  a suppression-contract probe, not a reproduction of the whole live game frame.
- The real Discovery frame reverses one-shot suppression and reinstates the scan;
  withdrawing the source and holding its update lets the hint display instead.

This last check refines 1800's explanation: the old live fixture need not consume
the animal hint invisibly; the restored scan can continue deferring it. Both paths
show why global suppression is the wrong fixture operation. No runtime fix is
justified by these reported failures. No thresholds/timeouts loosened, assertions
skipped, new runtime branches, CSS patches or dependencies added.

## Validation

- PASS: `npm run build` with a locally bundled native Vite config and isolated
  output, including TypeScript. PASS: project-base build by the same mechanism.
  Logs: `.cache/1920-bughunt/{build-direct,build-base}.log`.
- PASS: existing focused unit capability suite, **11 files / 139 tests**,
  covering guidance, onboarding, equipment, modes, settings and sonar. Command:
  `npm test -- --configLoader runner --cache=false --pool=threads` with
  `guidance`, `progress`, `f3Onboard`, `onboardCompletion`, `f2-modes`,
  `modesExploration`, `settingsSave`, `settingsScreen`, `settingsPalette`,
  `sonarFlat1250` and `sonarPalette1200` unit files. Log:
  `.cache/1920-bughunt/capability-unit.log`.
- PASS: four headless diagnostic probes. Re-run:
  `npm test -- --config .cache/1920-bughunt/reproduce.config.ts --configLoader runner --cache=false`.
  Log: `.cache/1920-bughunt/reproduce.log`.
- PASS: Playwright discovery, **161 tests in four files**, including all
  **11 reported cases**. Logs: `.cache/1920-bughunt/{discovery,affected-discovery}.log`.
- PASS: strict content validation, attribution, changed-spec Prettier and
  `git diff --check`.
- BLOCKED: baseline and repaired affected-spec browser execution, plus
  project-base browser execution, fail before assertions at preview startup.
  Direct diagnosis confirms `listen EPERM` on `127.0.0.1:4192`. Logs:
  `.cache/1920-bughunt/{baseline,repaired,preview,base-e2e}.log`.
  No Chromium assertion pass or screenshot review is claimed. Browser reproduction
  and verification remain necessary on a runner that permits localhost sockets.
- Python: **162 / 166 pass**, with four build-manifest tests failing on
  sandbox `spawnSync git EPERM`. The phase-build gate also bundles successfully
  but fails during build-manifest creation for that same error. Logs:
  `.cache/1920-bughunt/{python,build}.log`.
- Full default unit command: no tests reported before the diagnostic 90 s bound
  expired (exit 124). The focused thread pool succeeds; full thread-pool run is
  still pending. Logs: `.cache/1920-bughunt/{unit,unit-threads}.log`.

Edits remain uncommitted in this worktree. The 1800 worktree was read only and
its original uncommitted work was preserved.
