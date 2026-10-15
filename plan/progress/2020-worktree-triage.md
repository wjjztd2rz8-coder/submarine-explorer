# 2020 — stale worktree triage

Reviewed on 2026-10-15 against **main `61b2caf`**, the starting commit of
`codex/2020-S-tests-step3-worktrees`. All ten worktree tips are ancestors of main:
**zero unique commits**. Each review included `git diff main` (committed history
plus working files), `git diff HEAD`, untracked files and the resume notes. Old
base-to-main differences mostly describe missing newer work, not salvage.

**Claude: all ten are ready for removal after this branch's changes are collected.**
No worktree was deleted, reset, cleaned or otherwise modified. Do not cherry-pick
whole old diffs: that would restore obsolete UI/fixtures and remove newer fixes.
The retained pieces below are already applied to this branch's working files.

## Per-worktree verdict

All paths are under `/home/vijay/subexp-wt/`.

| Worktree                         | Base; commits behind main | Valuable pieces absent from main, and disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Verdict                                                                            |
| -------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `1740-S-ci-green-3`              | `758c896`; 80             | Its only tracked edit is `f2-progress` clock/scan pacing. The newer 1840 version was imported by 1910 and is on main; main additionally keeps 1900's migration/swatch/focus cases. The old `S-tests.md` is superseded failure history. **Nothing to import.**                                                                                                                                                                                                                                                                                                                                                                                                                 | Superseded; remove after collection.                                               |
| `1750-S-render-rest`             | `758c896`; 80             | Same implementation candidates as 1850: sponge dispatch table and nightly JSON-report destination. **Retained via 1850** below. Its `S-render.md` is an old validation account, not current evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Salvaged via resume; remove after collection.                                      |
| `1760-S-bughunt-3`               | `758c896`; 80             | Reviewed all 191 tracked edits. The meaningful discovery-token, immediate Pause, terrain-isolation and guidance tests are superseded by the cleaner 1860 candidate, **retained via 1860**. Main already has the broader blocked-frame suppression in `Discovery`, `GuidanceSlot` and `ScanOverlay`; keep it. Reject the remaining comment/whitespace sweep, altered Beebe comment-matching expressions and source-hash snapshot churn. No snapshot baseline is imported.                                                                                                                                                                                                      | Salvaged via resume; remove after collection.                                      |
| `1770-S-tests-verify`            | `b7e0567`; 63             | **Retained:** optional `discoveryWait` argument in `helpers/dive.ts`, plus identical readiness call sites in HUD and Journal. Passing `{}` preserves the callers' former configured-default discovery timeout; ordinary calls retain 20 seconds and shell readiness remains 45 seconds. Main's clock-driven catalog readiness remains intact. Ignore Director blank-line edits and the historical note's failure list.                                                                                                                                                                                                                                                        | Small readiness consolidation salvaged; remove after collection.                   |
| `1780-R-release-ci`              | `b7e0567`; 63             | **Retained:** globe-pin hit-area test measures layout width AND height ≥44 and checks every ancestor's transform for shrinkage, improving main's 43.99px rounded-width guard. Preserve main's collapsed-site-sheet behavior. CI mode/equipment/button-count/Daily/animal-hint fixes are superseded by 1910/1920 and R-ci-triage on main. The scan-hold helper already ticks timed guidance on main. Reject stale 30-minute workflow / 60-second unit timeout increases without evidence from current CI; current hosted triage belongs to 2000.                                                                                                                               | One stronger input guard salvaged; remove after collection.                        |
| `1790-S-bughunt-4`               | `b7e0567`; 63             | **Retained:** idempotent golden mission pause; own-property alias lookup; their five failing-before edge cases and three missing-provenance cases; production-startup preservation tests for the three legacy saves; four guidance lifecycle browser rows and three browser save-migration rows in the existing capability tables. None of those fixes/tests was on main. Ignore Director formatting and obsolete gate narrative.                                                                                                                                                                                                                                             | Independent tooling fixes and capability guards salvaged; remove after collection. |
| `1800-S-hud-spec-repair`         | `422c25a`; 57             | All four edited specs (`d-modes`, `d-shell`, `d-sonar`, HUD animal guidance) are superseded by 1920/1910 and R-ci-triage. Main retains the exact mode/range setup, full eight-button AND native-radio checks, live scan-source withdrawal, hint visibility and seen-state checks. **Nothing to import.**                                                                                                                                                                                                                                                                                                                                                                      | Superseded; remove after collection.                                               |
| `1840-resume-1740-S-ci-green-3`  | `422c25a`; 57             | Its entire `f2-progress` patch is already on main via 1910. A direct current-file comparison differs only by the newer main's two migration/swatch/focus cases, which must remain. Its note repeats old CI findings and the 1760 review. **Nothing to import.**                                                                                                                                                                                                                                                                                                                                                                                                               | Superseded; remove after collection.                                               |
| `1850-resume-1750-S-render-rest` | `422c25a`; 57             | **Retained:** `SPONGE_SHAPES` dispatch preserves shape arithmetic and RNG consumption; existing fixed geometry/material/placement/collision digests pass. Nightly JSON now writes inside the uploaded evidence directory. Removed the no-match first-minute file/grep alternative while extending the actual review selection for the folded families. Preserve historical golden/phone/hosted limitations in this verdict; do not replace main's `S-render.md` with its old narrative.                                                                                                                                                                                       | Two small implementation changes salvaged; remove after collection.                |
| `1860-resume-1760-S-bughunt-3`   | `422c25a`; 57             | **Retained:** shared discovery-award validation in Cosmetics/Save, empty secret/sample rejection in Progress, immediate non-dive guidance dismissal in `systems/discovery`, and the matching discovery documentation. Existing cosmetics, modal-focus, terrain-detail and touch-controls capability tests gain malformed v0–v2 saves, keyboard/touch Pause, corrupt/future debrief-to-Journal storage, simultaneous guidance and 12 non-Lost-City sites × four tiers of mesh/collision isolation. Main's broader blocked-frame suppression remains. Reject unrelated package-marker cleanup and Beebe regex/source-comment changes; keep all source-hash snapshots unchanged. | Behavioral fixes and focused guards salvaged; remove after collection.             |

## Diff fingerprints

These identify the reviewed **uncommitted tracked patches**, not the much larger
backward base-to-main diffs. Untracked progress notes were read separately.

| Worktree                         | Tracked edited files | Files differing from main | SHA-256 of `git diff HEAD` (first 16 hex) |
| -------------------------------- | -------------------: | ------------------------: | ----------------------------------------- |
| `1740-S-ci-green-3`              |                    1 |                       175 | `e11180fe633ad46d`                        |
| `1750-S-render-rest`             |                    3 |                       178 | `3057bb1a171c430a`                        |
| `1760-S-bughunt-3`               |                  191 |                       322 | `444c1d011b196e5b`                        |
| `1770-S-tests-verify`            |                    4 |                        90 | `805376291d71b495`                        |
| `1780-R-release-ci`              |                    9 |                        91 | `83c5d72db2754f77`                        |
| `1790-S-bughunt-4`               |                    9 |                        95 | `dfc25aed56cea9bd`                        |
| `1800-S-hud-spec-repair`         |                    4 |                        85 | `403009d569d04a50`                        |
| `1840-resume-1740-S-ci-green-3`  |                    1 |                        86 | `b16cc4082de2332e`                        |
| `1850-resume-1750-S-render-rest` |                    3 |                        89 | `15044d09a7ffeeea`                        |
| `1860-resume-1760-S-bughunt-3`   |                   26 |                       108 | `8291a2ba32da4be9`                        |

The 1850 and 1860 checkpoint repositories have empty diffs against their
respective working files, so their bundle exports add no unique implementation
beyond the diffs reviewed here. The stale reports are not evidence of current hosted success.

## Validation of the retained pieces

- Full unit coverage: **190 files / 2,280 tests pass**, no skips. The six affected
  unit capability files account for **283 passing tests**, including the scarp
  output-equivalence digests. The four production token/Pause files restored to
  main in an isolated copy reproduce **three malformed-save failures** and
  **two immediate Pause failures**; the current source passes all five.
- Golden tooling: **23 tests pass** (6 frame, 12 option, 5 manifest tests), run
  directly so individual cases execute and report. The generic `node --test`
  wrapper's file-level summary is not the evidence for those case counts.
- Typecheck and Vite production bundle pass. The canonical build phase subsequently
  fails in the unchanged build-manifest helper at `spawnSync git EPERM`, even
  though Git returns the correct SHA and status 0. Python likewise passes 162/166,
  with the same four manifest subprocess failures; no failure is suppressed.
- Browser execution cannot start the owned preview in this sandbox; the attempted
  folded-capability run fails before executing assertions. No new browser, pixel,
  hosted-workflow or wall-time success is claimed.
- See [2020-S-tests-step3.md](2020-S-tests-step3.md) for the complete final unit,
  formatting, discovery and assertion-retention results for this branch.

Evidence lives under `.cache/2020/` in this worktree: `worktree-evidence.json`,
`versions.json`, individual salvage patches, baseline reproduction logs,
`salvage-units.log`, `golden-*-direct.log`, `python.log` and `build.log`.
