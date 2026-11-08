# S-bughunt-scan-journal

Audited `ee243d5cae55c488b400b1e02dc0475ee62b2822` on 2026-11-08.

## Result

No confirmed scan-to-Journal defect found in the inspected code and passing
focused tests. This is an evidence-only audit: no production or test changes,
new settings, dependencies, or package identifiers in code. Existing capability
tests already exercise the suspected failures below; adding copies would not
strengthen the evidence. Browser verification remains incomplete because this
environment denies localhost connections and preview startup.

## Capability audit

| Capability                               | Code and existing regression coverage inspected and run                                                                                                                                  | Finding                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Range, minimum depth, facing and holding | `Scanner.ts`, `EffectiveSettings.ts`, modes/mission systems; `gameScanner.test.ts`, `f2-modes.test.ts`, `lifeDisposal.test.ts`                                                           | Arcade's 100 m floor applies after sensor scaling and mission caps, including wildlife and curiosity targets. Realistic restores authored reach. Leaving range, turning away and releasing interrupt rather than complete; progress decays and can resume.    |
| Keyboard and touch                       | `Input.ts`, `TouchControls.ts`; `subInput.test.ts`, `touchControlsAudit.test.ts`                                                                                                         | Actual Input sampling and DOM-event doubles exercise hold/release, interruption, objective selection, cancellation and multiple fingers. They are not native-device browser validation.                                                                       |
| Repeat scans                             | `Scanner.ts`, `DiscoveryStore.ts`; `gameScanner.test.ts`, `journalData.test.ts`, `discoveryReward1240.test.ts`                                                                           | Completed contacts are suppressed for the current dive. Restart/reload permits a new scan; persistent count increases while entry identity and first-discovery timestamp stay stable.                                                                         |
| Journal entry creation                   | `Discovery.ts`, `Guide.ts`, `JournalData.ts`, life/explore systems; `journalData.test.ts`, `discoveryReward1240.test.ts`                                                                 | Authored POIs resolve to their entries; shared entries unlock once, consecutive gallery entries stay distinct, and shipped wildlife, secrets and samples retain discovery keys. A wildlife-first scan also opens its site overview.                           |
| Persistence and rewards                  | `DiscoveryStore.ts`, progress system; `gameDiscoveryStore.test.ts`, `discoveryReward1240.test.ts`, `modesExploration.test.ts`                                                            | Supported saves retain discoveries across reconstruction and mode changes. Partial scans do not unlock entries or earn completion rewards. Return dives do not duplicate persistent rewards. Failed storage writes retain session state and prior saved data. |
| Debrief counts                           | `Discovery.ts`, `Objectives.ts`, mission/router and debrief; `gameObjectives.test.ts`, `missionCore.test.ts`, `missionRouter.test.ts`, `debriefReopen.test.ts`, `debriefSummary.test.ts` | Counts use distinct targets from this dive, including supplemental scans, independently of lifetime Journal unlocks. Snapshots remain stable, resets clear session counts, and a fresh mission requires fresh scans.                                          |

## Focused validation

Both commands passed, totaling **15 files / 518 tests**:

```sh
npm test -- --configLoader runner --cache=false tests/unit/gameScanner.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/discoveryReward1240.test.ts tests/unit/journalData.test.ts tests/unit/missionCore.test.ts tests/unit/missionRouter.test.ts tests/unit/gameObjectives.test.ts tests/unit/f2-modes.test.ts tests/unit/lifeDisposal.test.ts
npm test -- --configLoader runner --cache=false tests/unit/subInput.test.ts tests/unit/touchControlsAudit.test.ts tests/unit/debriefReopen.test.ts tests/unit/debriefSummary.test.ts tests/unit/modesExploration.test.ts tests/unit/progressScan.test.ts
```

Searched `tests/e2e` for scan, Journal, reload, mode and touch coverage. Attempted
these existing capability tests using `npx playwright test <spec> -g '<name>'`,
with an owned `dist-scan-journal` build, `GATES_CONFIG_MODE=writable`, and separate
preview ports:

- `d-scan.spec.ts`: `scanned contacts stay marked and cannot be rescanned until a new dive`
- `journal-debrief.spec.ts`: `scan the bow, persist across reload, open the Journal`
- `d-modes.spec.ts`: `Arcade, Realistic and Custom apply live and survive reload`
- `f1-touch.spec.ts`: `simultaneous flight and scan release on cancellation, blur, hiding and rotation`

These attempts failed before tests ran: Playwright's web-server probe reports
`connect EPERM` for both `::1` and `127.0.0.1`, and preview startup exits 1.
No browser assertions, screenshots, WebGL output, native touch, or real-phone
acceptance are claimed. No bypass, retries, assertion weakening or test skips
were introduced. Rerun these selections on a runner allowing browser/localhost
access to finish the browser portion of the audit.

## Required gates

`GATES_CONFIG_MODE=writable bash tools/gates.sh` finished with **exit 1**,
`FAIL gates (e2e=smoke)`. Logs: `.cache/runs/20261108-033305-2-LtX4yt/`.

- **PASS:** writable config preparation, strict content validation,
  TypeScript/production build, full units, attribution and repository-wide
  Prettier. Full units: **196 files / 4,631 tests passed**, 1,085.68 seconds.
- **FAIL, Python:** 169 tests ran, with five failures. Four build-manifest
  cases report `spawnSync git EPERM`. The golden-tooling case fails while
  parsing a comparison child's report with `Unexpected end of JSON input`;
  its cause was not established here. These tooling failures are outside the
  scan-to-Journal path; no tooling changes or weakened assertions were made.
- **FAIL, root smoke and project-base E2E:** preview startup exits 1 before
  browser tests run. The project-base TypeScript/bundle build succeeded
  before the preview failure. The targeted browser attempts above provide
  the explicit localhost `EPERM` diagnostic.

The isolated browser-test build was removed after the attempts. Final owned-note
formatting and `git diff --check` passed. The only working-tree addition is this
progress note. No commit, merge or push was performed.

An earlier isolated build-phase attempt bundled successfully, then failed its
provenance step with `spawnSync git EPERM`. This is not a passing build-phase
gate. The all-mode command performs its own TypeScript/production build.
