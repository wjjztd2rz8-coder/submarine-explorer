# F-INTEGRATE-660 — finished batch integration

## Plan

1. Run all gates against the existing seven-package merge; reproduce failures
   before changing code or expectations.
2. Review package interactions, the 590 follow-up fixes, changelog union and
   640's CI shard coverage. Keep retained assertions and the existing shard
   runner; drop 590 only if it still fails after a real fix attempt, as requested.
3. Verify the final edits and record the gate evidence. Do not merge or commit.

## Package inventory

| Package                           | Changes already present in this tree                                                                                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 640 — CI red fixes                | Duration-based assignment of individual tests to 20 single-worker shards, timing artifacts and completion of every shard case. Browser checks use frame/condition synchronization and native touch where appropriate.                                              |
| 650 — f27 verification            | Beebe's opening vertical chase offset is -38 m; credits retry crowded placement with 4 px margins/gaps while preserving the reading minimum and obstacles. Adds opening, credits, snow and Monterey geometry/performance coverage.                                 |
| 630 — fact check                  | Corrects Lost City/Monterey Journal, mission and wildlife copy and source notes; documents snapshot and authored-placement uncertainty without changing placement or numeric settings.                                                                             |
| 600 — Lost City                   | Broad irregular carbonate/slope beds in vertex colours and two instanced coral/anemone batches at Poseidon's inactive base. Ambient fill and terrain geometry are retained.                                                                                        |
| 610 — portrait pitch              | Adds fresh-profile portrait Low opening verification at all five heroes, including hull projection, HUD bounds, screenshots and diagnostics.                                                                                                                       |
| 620 — first minute                | Fades control guidance after actual movement or twelve seconds, records control learning separately, fades animal hints on movement and selects the objective before first navigation. Adds unit and desktop/touch browser coverage plus opt-in all-site captures. |
| 590 — Blue Hole/Journal (DROPPED) | Added surveyed Blue Hole geometry and native-touch Journal/debrief checks, corrected a camera fixture and compacted landscape telemetry. Dropped after the further integration fix still failed Realistic Surface HUD clearance.                                   |

## Integration changes and spec policy

- The initial sandbox pass required documentation only. The external browser
  gate subsequently exposed the runtime failures fixed below. No authored
  poses, site geometry, colours or assets changed.
- **Retained browser specs changed: none.** The explicit package drop removes
  `tests/e2e/f-bughunt-590.spec.ts` and `tests/unit/blueHoleSpawn.test.ts`, and
  restores `tests/unit/freeDiveComposition.test.ts` exactly from the 590 merge's
  first parent. This removes the package as authorized, rather than editing its
  failed assertion. `tests/unit/hintChip.test.ts` now supplies
  the animal hint's twelve seconds explicitly, preserving every fade/expiry
  assertion while restoring the nine-second default for other hints. Added
  default-expiry and coalesced-timer coverage. Added
  `tests/unit/portraitOpening.test.ts` to check actual surveyed openings and
  Low hull geometry against the portrait HUD lane, including rotation/reset.
  No retained assertion was removed or weakened; no stale browser expectation
  changed. The animal unit fixture explicitly requests the retained duration.
- `CHANGELOG.md`: consolidated the duplicated F-VERIFY-480/F-TOUCH-150 warm
  haze follow-up into one entry retaining both package references. Added the
  missing 640 and 630 summaries. Removed the dropped 590 entries and added its
  required Removed entry with the unresolved collision and reason. Reviewed
  the retained package entries and
  the Changed/Removed/Added sections: no merge markers, identical duplicate
  entries or orphaned union fragments remain. Historical implementation and
  follow-up entries remain separate when they describe different changes.
- No merges or commits were made. CI workflow, shard runner and timing data
  are unchanged.

## Initial sandbox gate result

Command:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4660 tools/gates.sh --full-e2e
```

The writable config mode accommodates the read-only `node_modules` symlink.
Logs are preserved under `.cache/integrate660/round1/`, including `gates.log`
and each named gate log.

| Gate                           | Result                                                  |
| ------------------------------ | ------------------------------------------------------- |
| Config bundle                  | PASS                                                    |
| Typecheck and production build | PASS                                                    |
| Unit                           | PASS — 130 files, 1,357 tests                           |
| Python                         | PASS — 144 tests                                        |
| Strict content                 | PASS — all 13 packs                                     |
| Attribution                    | PASS                                                    |
| Repository Prettier            | PASS before tidy; final formatting check recorded below |
| Full E2E                       | BLOCKED before tests — preview process cannot start     |
| Project-base E2E               | Build PASS; browser checks BLOCKED before tests         |

**Overall full-gate exit status: 1; browser green is not established.** A
minimal Node TCP listener independently fails with `listen EPERM: operation
not permitted 127.0.0.1:4660`, confirming the sandbox prevents localhost
listening. This is infrastructure failure before any product assertion runs.
Permissions cannot be escalated in this session. Repeating the same blocked
browser gate would not test a fix.

## External full-gate follow-up and root causes

The orchestrator's browser-capable full gate passed build, unit, Python,
content, attribution, formatting and project-base E2E. Main E2E reported
**387 passed, 47 skipped, 7 failed (19.3 minutes)**. Preserved logs:
`.cache/integrate660/external-before-fix/`; original artifacts:
`test-results-gates-4370-327396/`.

1. **590 Realistic Blue Hole Surface: telemetry overlaps ballast.** 620 makes
   the current mission instruction visible immediately and allows wrapping;
   590 only compacted supplies/current/readout spacing. The objective panel
   still inherited its desktop heading/type/line height above those readouts.
   Compact that panel to 12 px / 1.25 and its heading to 10 px / 1.25 with a
   3 px gap, and give telemetry the objective column's 250 px border-box width
   to reduce wrapping. The active instruction, all supplies/meters and current
   fields remain present. The existing browser overlap, containment, visibility
   and frame-budget assertions remained intact during this real fix attempt.
   The next external gate still failed the same assertion; this attempt was
   unsuccessful and its landscape edits have now been rolled back.
2. **All five 610 portrait openings: hull clipping or HUD overlap.** The
   fixed 62-degree vertical FOV shrinks the horizontal frustum on 390×844;
   Lost City's hull projected to x=469.25 and y=921.71. Other hulls intersected
   controls, credits or the scan/toast stack. The Lost City PNG visibly
   confirms clipping and control coverage. `CameraRig.setAspect()` now keeps
   at least the configured horizontal FOV for portrait, including initial
   construction and rotation. Camera position, authored offsets, chase reset
   distances and landscape FOV remain the same. Tall portrait scan/hints
   follow the actual telemetry height in its right column, rather than the
   lower centre hull lane. A HUD ResizeObserver supplies that height and is
   disconnected on disposal. The short-phone layout retains its own rules.
3. **F3 onboarding pressure hint fails nine-second expiry.** 620 changed
   `HintChip.show()`'s default to twelve seconds for every hint, beyond its
   opening strip/animal scope. Restore the nine-second default and explicitly
   request twelve seconds only for animal guidance. Also schedule automatic
   fade and hide independently: a late/coalesced fade callback previously
   scheduled hide another 250 ms into the future, extending the deadline on
   a background tab or Playwright clock jump. Manual early fade remains
   idempotent; replacement, dismissal and disposal cancel both timers.

## Second external gate and required 590 drop

The next orchestrator run passed all static gates and project-base E2E.
Main E2E reported **393 passed, 47 skipped, 1 failed (18.7 minutes)**. All
five 610 portrait tests and the nine-second F3 hint expiry test now pass with
their original assertions. The sole remaining failure is still 590 Realistic
Surface: `.hud-readouts overlaps .tc-slider`, at `hudFits()` line 96, called
at line 218. Logs: `.cache/integrate660/external-after-fix/`; artifacts:
`test-results-gates-4370-360961/`.

**590 is DROPPED**, following task 2: its changes still failed after the
real objective/readout layout fix above. The collision remains unresolved;
this report does not claim reverting the package fixes that underlying bug.

Used `git diff 78ab30e^1 78ab30e --name-status` to identify all six package
paths, then restored each to the first-parent state without touching the Git
index or making a commit:

- Removed its added `tests/e2e/f-bughunt-590.spec.ts`,
  `tests/unit/blueHoleSpawn.test.ts` and `plan/progress/F-BUGHUNT-590.md`.
- Restored `tests/unit/freeDiveComposition.test.ts` byte-for-byte.
- Restored `src/styles/hud-layout.css`, removing 590's 16 landscape lines and
  the unsuccessful 660 landscape follow-up. Reapplied only the independent
  17-line tall portrait stack fix that resolved the 610 failures.
- Restored `CHANGELOG.md`, then reapplied the integration tidy, missing 640/630
  summaries and successful portrait/hint entry; recorded the drop under Removed.
  All other packages' entries remain.

Pre-drop copies of all six paths are under
`.cache/integrate660/external-after-fix/before-drop/`. The other six packages,
successful projection/HUD measurement/hint fixes and their regressions remain.

## Validation before the drop

Typecheck passes. The five real-terrain portrait regressions pass, including
rotation/reset; the five hint lifecycle tests pass, including delayed timer
delivery. The existing Beebe opening, CameraRig and Lost City opening tests
also pass with unchanged assertions. Their focused logs are in
`.cache/integrate660/{portrait-after,hints-after,followup-focused}.log`.
The focused log's initial hint fixture failure was corrected by explicitly
requesting the retained twelve-second animal lifetime as described above.

Static-gate command before the drop:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4660 tools/gates.sh --no-e2e
```

**PASS:** config bundle, build/typecheck, **131 unit files / 1,364 tests**,
**144 Python tests**, all 13 strict content packs, attribution and repository
Prettier. Final `git diff --check` also passes. Gate and individual logs are
preserved under `.cache/integrate660/followup/`.

The second external gate confirms the portrait and hint fixes; 590 still
failed as described above. Final verification after dropping it is below.

## Shard verification and final review

Before the drop, Playwright discovery succeeded without starting a server:
**441 cases**, with
21 declared skipped at discovery (the opt-in first-minute captures additionally
skip at execution by default). Applied the unchanged 640 collector, balancer
and literal selectors to this discovery JSON: every case matches exactly one
of the 20 shard selectors. Shards contain 21–24 cases; estimates range from
1,004.2 to 1,006.1 seconds. These are inherited timing/fallback estimates,
not measured runtimes or proof of fitting CI's 900-second suite budget.
Discovery and plan evidence: `.cache/integrate660/discovery.json` and
`shard-plan.json`. The CLI's synchronous discovery subprocess is restricted
here (`spawnSync npx EPERM`); direct Playwright discovery followed by the
exported balancing functions verifies the same selection logic.

Final verification includes repository Prettier and `git diff --check` after
the code, regression and changelog/report changes. CI workflow, shard runner,
timing estimates and every retained browser selector/assertion remain unchanged.

## Final validation after the drop

`GATES_CONFIG_MODE=writable PW_PORT=4660 tools/gates.sh --no-e2e` passes
config bundle, production build/typecheck, **130 unit files / 1,362 tests**,
**144 Python tests**, all 13 strict content packs, attribution and repository
Prettier. Logs: `.cache/integrate660/after-drop/`. Final formatting and
`git diff --check` pass after the report update.

Fresh Playwright discovery lists **432 cases** (nine fewer after removing the
590 spec), with 21 declared skipped. The unchanged 640 balancer assigns every
case exactly once to its 20 shards, 21–22 cases per shard; inherited estimated
durations range from 983.6 to 985.3 seconds. No 590 case remains in discovery.
Evidence: `after-drop/discovery.json` and `after-drop/shard-plan.json` in the
same log directory. CI workflow, balancing algorithm and timing data are intact.

Verified that `freeDiveComposition.test.ts` exactly matches `78ab30e^1`, the
three added 590 files are absent, and the only CSS change relative to that
first parent is the independent 17-line portrait fix. Changelog duplicate,
merge-marker and removed-report reference checks pass. No merge or commit was
made.

**Final full-E2E result remains pending externally.** The preceding 393-pass
browser run includes 590 and cannot establish this final tree's result. Its
original 610 and hint assertions passed; no passing post-drop browser result
is claimed.

Required browser-capable follow-up (the orchestrator runs gates after rounds):

```bash
tools/gates.sh --full-e2e
```

Use that run's actual failed assertions for any further integration fix. This
report does not substitute discovery or passing geometry tests for browser
execution, and does not claim the tree is fully green.
