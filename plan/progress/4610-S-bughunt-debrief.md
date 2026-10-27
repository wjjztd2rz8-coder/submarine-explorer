# S-bughunt: debrief, rewards and objective flow

Serves DIRECTOR Backlog **9, S-verify / S-bughunt / S-dead (Codex)**.
Starting HEAD: `e3700acd7cef61dc558f12eeb2f203866724d191`; initial worktree clean.

## Confirmed bug and minimal fix

Photo credit lagged behind photo persistence. `render.capture` saved both manual
photos and automatic scan stills after the progress system's `play.mission`
poll. A player surfacing before the next animation frame therefore received a
two-star debrief and saved best despite having successfully earned the photo
bonus. Banner surfacing, and Photo mode's Pause followed by Surface, can run
between frames; the rating callback reads the uncredited bonus synchronously.

Both successful capture paths now award their existing photo token immediately.
Removed the photo-array polling state and frame hook from the progress system.
The reward identity, photo storage and best-rating rules are unchanged. Failed
readback, failed storage and scenery-only photos earn no bonus. Boot still
backfills old photo tokens without assigning a current-dive bonus.

Extended only the existing `tests/unit/photoMode.test.ts` capability. Its real
photo/progress systems, SystemRunner, Scanner, Mission, PhotoStore and Progress
exercise capture followed by mission end with no intervening frame. Both
automatic and manual variants failed before the fix: expected three stars and
best three, received two and two; the other twelve tests passed. Before log:
`/tmp/debrief-photo-before.log`. Canvas readback and DOM operations are doubles;
this is a state/persistence regression, not rendered-photo acceptance.

The four new cases also check return dives requiring a fresh bonus, repeat
photo credit without duplicate tokens, zero stars on abort while retaining the
historical best, readback/storage failures followed by recovery, and a saved
scenery photo without a bonus. Production code is seven lines shorter; the fix
introduces no module, event, dependency, setting, guidance surface,
site branch or configuration mutation. No package numbers were added to code,
no capability specs were created, and no existing assertion was relaxed.

## Audit coverage and findings

Read DIRECTOR, CONTRIBUTING-AGENTS, earlier mission/debrief audit notes and the
production Mission, MissionRouter, Progress, Discovery, Scanner, SessionStats,
Debrief, PhotoStore, progress/photo/mission/discovery/power/journal systems and
frame scheduling. No other defect was confirmed in the requested flow.

| Boundary                | Evidence and result                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objectives in any order | Temporary headless probe loads all thirteen authored missions and their POI IDs, enumerates every objective permutation with and without a bonus, and surfaces/resumes after each prefix. **828 order/bonus runs, 3,732 surface/resume checks pass**. Duplicate scans emit no additional objective events; mission completion fires once. Existing router coverage checks optional-first/reversed primaries and pending/open/dismissed banner promotion.       |
| Star tally              | Every probe prefix checks preview and finished stars against completed primaries/optionals and bonus eligibility. Existing progress coverage retains unresolved-POI exclusion, best ratings, migration and idempotent token guards. The new capture regression fixes the confirmed third-star timing gap.                                                                                                                                                      |
| Headline text           | Every probe prefix checks `Back at the surface`, `Primaries complete` or `All objectives complete`, with `Dive aborted` after failure. Existing router/summary capabilities check rendered text, counts and next suggestions. No wording change was justified.                                                                                                                                                                                                 |
| Repeat missions         | Each probe restarts to zero objectives/time, rescans with `firstTime: false`, and earns two current-run stars without inheriting the prior bonus or lowering the best. The new photo cases check repeated subjects still earn a new dive's bonus without duplicating tokens.                                                                                                                                                                                   |
| Abort mid-mission       | Existing abort and router capabilities cover crush/power, partial/completed objectives, pending/open completion banners, stale actions, no resume and no successful completion event. The capture regression also checks zero aborted stars with a previously earned bonus and best rating.                                                                                                                                                                    |
| Scan during dive end    | Probe scan events after surfacing leave objective counts unchanged. Existing Discovery regression holds a partial beam under the debrief and resumes it only when exploring; router cases cover ascent scans immediately before abort and delayed blow completion. Production order is `events` → `scan.discovery` → `play.mission`, so a completed scan on the last ascent frame is counted before the aborted summary, without restoring completion actions. |

The temporary probe is `.cache/debrief-flow-probe.mjs`, importing production
exports through a Vite library bundle under `.cache/debrief-audit-bundle/`.
Command: `node .cache/debrief-flow-probe.mjs`; exit **0**;
`/tmp/debrief-flow-probe.log`. An initial direct Rolldown harness lacked Vite's
`import.meta.env`/glob transforms; using the real Vite transforms resolved the
harness issue. No application change was made for it. This probe exercises the
pure flow/rating/text functions, not physical transit or UI layout.

## Validation

- Focused final run: `npm test -- --configLoader runner --cache=false
tests/unit/photoMode.test.ts tests/unit/progress.test.ts
tests/unit/missionRouter.test.ts tests/unit/missionCore.test.ts
tests/unit/missionAbort.test.ts tests/unit/debriefSummary.test.ts
tests/unit/debriefReopen.test.ts tests/unit/discoveryReward1240.test.ts
tests/unit/overlayFocus.test.ts tests/unit/photoStore.test.ts` — **10 files /
  382 tests passed**, exit **0**, 3.90 s. Log:
  `/tmp/debrief-focused-final.log`.
- All-mission permutation probe — **passed**, as detailed above.
- Owned source/spec formatting and `git diff --check` — **passed**.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` — **exit 1,
  FAIL gates (e2e=none)**, solely the Python failures below. Config preparation,
  strict content validation, TypeScript/production build, full units,
  attribution and repository-wide formatting **passed**. Logs:
  `/tmp/debrief-gates.log`, `.cache/runs/20261027-034939-3-vcor9W/`.
- Final-source full units: **192 files / 4,333 tests passed**, 660.10 s.
  Log: `.cache/runs/20261027-034939-3-vcor9W/unit.log`. No runtime/spec edits
  followed this run.
- Python gate: **167 tests / five failures**. Four CI build-manifest cases fail
  with `spawnSync git EPERM`; golden tooling reports `Unexpected end of JSON
input` while parsing child output. These match earlier recorded failures;
  Python remains a failed gate. No tooling change, skip or relaxed check was
  introduced. Log: `.cache/runs/20261027-034939-3-vcor9W/python.log`.

Actual e2e mode: **none**, following DIRECTOR's browser-off Codex lane. No
browser, screenshot, WebGL, visual/phone acceptance or hosted CI is claimed.
No Director/content/tooling edits, merge, push or tag.
