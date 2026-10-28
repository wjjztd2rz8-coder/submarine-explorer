# S-bughunt: Home, Journal and debrief state

Standing DIRECTOR item **S-bughunt**, brief 82. Two audit rounds on
`e8118a5f0f6faaf0e50064a80b17cb88c443fb69`; initial worktree clean.
Read CONTRIBUTING-AGENTS and DIRECTOR's simplicity rules.

## Round 1: reproduced and fixed

From Home, open Journal with an empty landmark index, a missing index, corrupt
JSON, or failed fetches. The content loaders settle successfully with no sites,
but the Journal continues displaying **Loading the Journal…** indefinitely.
This affects both desktop and phone, including closing and reopening Journal.

`journalGroups.test.ts` reproduces all four cases in both layouts using the
real Journal loader and deferred fetch responses. Before the fix, all **8 cases
failed**: the settled message was still the loading message.

The fix records when the existing load completes and displays **No Journal
sites available.** when the completed catalogue is empty. The pending state
still displays the loading message. Tests also require front-page navigation,
Close, opener focus restoration, and a stable message after reopening.

Simplicity: one completion flag distinguishes two previously conflated states;
the message replaces the existing loading text in the same element. No new
surface, settings, dependency, layout rule, routing behavior or save schema.

Extended the existing `journal-debrief.spec.ts` capability spec with six
browser cases: empty/missing/corrupt index at desktop and phone widths. Each
opens/closes twice, restores focus and preserves the discovery save bytes.
These browser cases were discovered successfully but could not execute here.

## Round 2: state boundaries and remaining verification

| Boundary                                | Evidence and result                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replay and stale debrief                | `missionRouter`, `missionCore`, `discoveryReward1240` and `debriefReopen` tests pass. Restart clears objective credit and dive-local scans/entries while preserving Journal unlocks and reward history. Reopened summaries reset their scroll and More state. Actual Dive again reloads the page. No further reproduced defect.                                       |
| Empty discovery save                    | Existing Journal locked-site/front-page tests and zero-scan debrief cases pass. An empty discovery collection still has catalogue sites; it is distinct from the empty-catalogue defect above.                                                                                                                                                                        |
| Missing/corrupt storage                 | `saveSoak` covers absent and damaged keys, subsequent writes/reloads, independent collections, denied reads and protected future versions. These cases pass; no save changes made.                                                                                                                                                                                    |
| Home and browser Back                   | `homeFocus` checks last-site fallback, replacement/disposed catalogues and popstate reload handling. `overlayFocus` checks Home site Escape and opener focus. Tests pass. Native browser history remains unverified.                                                                                                                                                  |
| Journal back-navigation and phone       | Existing `journalGroups` cases check entry → site → front, wildlife selection after another site, rotation and pending scan focus. `overlayFocus` checks Journal over debrief, including return focus and abort decisions. Tests pass; physical touch and layout acceptance remain unverified.                                                                        |
| Repeated input                          | Briefing hides synchronously before invoking Begin, and a hidden briefing rejects another Begin. Mission end/resume have state guards. Existing swipe tests check suppression of a swipe's trailing click and subsequent keyboard activation. Native double taps and real-phone hit targets still require browser/device validation. No speculative input/layout fix. |
| Recovery after an unavailable catalogue | Loading is deliberately cached once per Journal instance. Reopening now shows the finished empty state, but retrying after connectivity/content recovery still requires a page reload. No retry control or retry policy added in this small fix.                                                                                                                      |

## Validation

Focused commands passed: **10 files / 545 tests** total, including the eight
new regressions:

```sh
npx vitest run --configLoader runner --cache=false \
  tests/unit/journalGroups.test.ts tests/unit/homeFocus.test.ts \
  tests/unit/missionRouter.test.ts tests/unit/debriefReopen.test.ts \
  tests/unit/saveSoak.test.ts tests/unit/overlayFocus.test.ts
# 6 files / 363 tests
npx vitest run --configLoader runner --cache=false \
  tests/unit/discoveryReward1240.test.ts tests/unit/journalData.test.ts \
  tests/unit/debriefSummary.test.ts tests/unit/missionCore.test.ts
# 4 files / 182 tests
```

Ran the requested gate entrypoint:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4282 PW_OUTDIR=dist-journal-home bash tools/gates.sh
```

Config, content and build passed, including TypeScript, application bundling,
public-data copying and service-worker stamping. Python ran **167 tests with
5 failures** in unchanged tooling: four provenance tests report
`spawnSync git EPERM`; golden tooling reports `Unexpected end of JSON input`
from child output. These match the previously recorded sandbox failures in
`S-bughunt-journal2.md`. Full Vitest printed its RUN header and made no further
progress for over a minute; interrupted the owned gate session with Ctrl-C
(exit 130). The gate never reached its browser, attribution or formatting
stages. Logs: `.cache/runs/20261028-130138-2-zZGizG/`.

Searched `tests/e2e` with `rg` for Journal, replay, empty/corrupt saves, Home,
Back and touch capabilities. Ran these commands with
`GATES_CONFIG_MODE=writable PW_PORT=4283 PW_OUTDIR=dist-journal-home`:

```sh
npx playwright test tests/e2e/journal-debrief.spec.ts -g 'unavailable Home Journal catalogue|home front page, site entries, spoilers, reload|Home from the debrief; Dive again starts a fresh dive'
npx playwright test tests/e2e/hud-touch.spec.ts -g 'journal spoilers, navigation, entries and Close remain reachable'
npx playwright test tests/e2e/d-shell.spec.ts -g 'browser Back and Forward resolve the URL after quitting to Home|home, site grid, pause, objectives, resume and quit'
npx playwright test tests/e2e/smoke.spec.ts -g 'loads'
npx playwright test tests/e2e/smoke.spec.ts -g 'plain root opens the home shell'
```

Each exited 1 before any test body because the preview server could not start.
A direct preview diagnostic confirms
`listen EPERM: operation not permitted 127.0.0.1:4283`.
`npx playwright test tests/e2e/journal-debrief.spec.ts -g 'unavailable Home Journal catalogue' --list`
passes and discovers all six new cases. No browser pass, screenshots or visual
acceptance claimed. Retained build removed after the attempts.

Standalone attribution, repository-wide formatting and `git diff --check`
passed after the interrupted gate. Aggregate gates remain incomplete.
