# 3200 — S-bughunt: caption consumer lifecycle

DIRECTOR Backlog item **9, S-verify / S-bughunt [Codex, standing]**,
specifically **S-bughunt**, the highest eligible nonvisual Codex entry.
Pinned checkout: **`a545afe00196649a2d6de4cf1c8039851aba9074`**.

The supported bus/DOM lifecycle audit is clean. Five consumer cases extend
`tests/unit/captions.test.ts`; its three original queue tests remain intact.
No production correction is indicated. `src/ui/Captions.ts` remains unchanged.

## Authority, evidence and ownership

Read DIRECTOR rules, simplicity requirements and rubric; CONTRIBUTING-AGENTS;
the newest 2026-10-22 review; OVERNIGHT-LOG tail through Run 82; launched briefs,
results/available final reports and progress evidence for 2130, 2540 and 2650.
2130 covers blocked/disposed audio callbacks and input focus; 2540 covers
settings/accessibility persistence and photo quota; 2650 verifies audio/gains,
fill and release guards. Their coverage is retained rather than repeated.
2650 has an empty cached last report; its checked-in `S-verify-21.md` supplies
the actual evidence. Older wrapper PASS summaries conflict with agent reports
of Python/tooling failures and browser startup blocks; they are not used as
validation here.

Before editing, rechecked top-level queue/launched briefs through 3210,
completion reports and live worktree progress notes for 3130–3180, plus all
registered worktrees' status, uncommitted diff statistics/file claims and
main-relative committed diff paths. No top-level queued Markdown brief or
caption-file ownership overlap was found. Rechecked SHA and owned paths
immediately before editing. Unmerged 2980 scarp and 3050 seam work stays
excluded; finished 3130 regression sensitivity, 3140 spawns, 3150 hosted CI,
3160 materials, 3170 ambient policy and 3180 wildlife linkage stay uncollected
and are not dependencies. 3190 owns currents tests and 3210 owns exploration
regression tests. No other package's changes were collected, copied or edited.
No DONE/CUT/IN FLIGHT visual item, parked Blue Hole work or owner-blocked
opening-rule work was reopened.

Only the existing caption capability spec and this matching progress note are
changed. No production, authored data, schema, snapshot, workflow, other test,
other progress note, tools or DIRECTOR change; no merge, push or tag.

## Runtime ownership trace and existing guards

- `src/audio/events.ts`: real `CaptionBus` synchronously dispatches a snapshot
  of its handler set; `on` returns the unsubscribe closure.
- `src/app/systems/audio.ts`: each initialization creates `AudioSystem`, passes
  its caption bus to `Captions`, supplies the saved enabled choice and
  `config.settings.captionMaxLines` / `captionMinDurationS`, then owns disposal.
  Current configuration is **two lines, 1.5 seconds minimum**, initially off.
- `src/ui/Settings.ts` persists the existing captions checkbox through Save.
  `src/app/systems/settings.ts` applies a changed captions choice immediately
  using `ctx.captions?.setEnabled(next.captions)`. The audio save subscriber
  updates audio settings separately. No migration or volume policy is added.
- `src/app/System.ts` disposes systems in reverse initialization order;
  `src/app/Disposables.ts` disposes callbacks newest first. Within audio's own
  cleanup, gesture handlers are removed, then captions unsubscribes and cancels
  its timeout before audio disposes. The settings subscriber is subsequently
  removed during system teardown. No async teardown gap or production caller
  invoking `Captions.show` / `setEnabled` after disposal was found. `ctx.expose`
  exposes diagnostics/test handles, not a supported post-disposal lifecycle.
- `Captions.show` accepts only enabled cues, refreshes/pushes into the current
  queue, renders and replaces the scheduled timeout. Timeout pruning uses
  `performance.now()` (Date fallback), independent of simulation time. Disable
  clears/renders the queue; its pending timeout can harmlessly finish on an empty
  queue. Re-enabling and receiving a new cue replaces that timer. Dispose
  unsubscribes, cancels the pending timer and removes the root.

Read the existing queue, audioTouchUnlock, audioLifecycle, audio/f3Audio and
settings save/screen/palette guards first. Queue math, mobile resume races,
paused/hidden emission, mute and saved gains, settings migration and audio graph
ownership already have capability guards. Those tests remain read-only; the
new cases exercise the actual DOM consumer through the real caption bus.

## Cue / timer / enable / dispose matrix

All times are milliseconds on a shared fake performance/timeout clock starting
at zero. DOM fixture semantics follow the established headless overlay fixtures:
appendChild moves an existing element, remove updates the parent, attributes
are stored, and children expose observable text/order. No jsdom dependency,
real WebAudio, renderer or browser is constructed.

| Sequence                                                                                               | Observation / guard                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First ballast at 0, sonar at 500, changed ballast text at 1000                                         | One ballast element is reused; text changes from Flooding to Blowing; order remains ballast then sonar. Root is attached and visible, with role=status, aria-live=polite and its existing Captions label.                                                                                                |
| Original ballast deadline 1500, sonar expiry 2000, refreshed ballast expiry 2500                       | Both lines survive 1500 and 1999; only ballast remains at 2000; DOM and exposed texts are empty at 2500, without a new cue. Short cue durations respect the configured 1.5 s minimum.                                                                                                                    |
| Empty queue receives shutter at 2600                                                                   | Scheduling restarts; shutter is still present at 4099 and gone by 4116. No new cue is needed to expire it.                                                                                                                                                                                               |
| Ballast, sonar, servo at 0 through explicit parent                                                     | Existing two-line limit evicts/detaches ballast, preserves the sonar element and order sonar/servo; sonar expires at 1500 while the longer servo remains until 2000.                                                                                                                                     |
| Initially disabled, source emits; then enabled with servo at 0, disabled at 500 and source emits again | Initial/disabled cues are dropped, root hides, existing DOM and queue clear. Enabling alone restores no old or dropped line.                                                                                                                                                                             |
| Re-enable and fresh same-ID servo at 1000, before original 2000 deadline                               | New line survives the old 2000 deadline and 2499; expires at 2500. Old timer cannot shorten the new lifetime.                                                                                                                                                                                            |
| Re-enable and fresh same-ID servo at 2500, after original 2000 deadline                                | Queue stays empty through the disabled interval; new line survives until 3999 and expires at 4000. Cleared cues never reappear.                                                                                                                                                                          |
| Dispose at 500 with original expiry 1500 pending                                                       | Timer count goes from one to zero; root detaches. Further bus emission never calls retired show or schedules a timer. No synthetic call on the disposed consumer is used.                                                                                                                                |
| Replacement on the same bus at 500, fresh ballast lasting 2 s                                          | Only replacement is attached; its cue survives the retired 1500 deadline and 2499, expires at 2500; retired DOM stays unchanged/detached and retired show receives no source call. A later shutter works in replacement; after its disposal, 10 s and another source emission leave no attachment/timer. |

The source-driven unsubscribe check spies on the retired consumer's public
`show` method only to detect accidental dispatch; it does not call it. Detached
caption text is not required to be erased on dispose: the real owner retires
the whole root. Reusing the same bus is a stronger isolation probe than normal
restart, where the audio system also creates a fresh bus.

### Failure classification and timing precision

No failing-before/passing-after **product fix** exists: production is unchanged
and all supported lifecycle cases pass. Initial draft execution was **7 passed,
1 failed / 8 total**, because a new assertion required the shutter to disappear
at exactly 4100 ms. Floating-point timeout conversion can schedule a fractional
millisecond early; the callback correctly retains the unexpired cue and
reschedules using the existing **16 ms floor**. The final new guard checks
presence at 4099 and absence by 4116, preserving that existing scheduling
semantics. This was a test-oracle correction, not a reproduced product defect
or relaxation of a historical assertion. Log: `/tmp/3200-captions.log`.

No disposed flag, timer refactor, new pause/visibility/mute policy or queue math
case was added. Synthetic direct method calls after disposal do not justify a
product correction without a real caller. Caption expiry remains wall-clock
based; pause, mute and hidden-tab policies remain unchanged.

## Simplicity and rubric

Production complexity and resource bounds are unchanged: one existing queue,
one pending expiry timer and one bus subscription per consumer, at most two
lines. Tests extend the existing capability spec; original assertions remain
intact, with no retries, skips, timeout inflation, dependency or package number
in code. There is no new element or guidance surface to replace/merge, no
setting, config mutation, site branch, CSS/layout patch or cue-policy change.

This supports behavioral accessibility and understandable existing cue text;
retained discoveries, all 13 site identities, real GMRT terrain, five hero set
pieces, scanning, Journal, marine life, keyboard/pad/touch input, established
budgets and Arcade default are untouched. Readability, beauty, composition,
visual Phone-OK and real-phone acceptance remain with Claude/owner. DOM status
and polite-live attributes establish markup only, not a screen-reader
announcement or assistive-technology compatibility.

## Validation

- Focused command: `npm test -- --configLoader runner --cache=false tests/unit/captions.test.ts tests/unit/audioTouchUnlock.test.ts tests/unit/audioLifecycle.test.ts tests/unit/audio.test.ts tests/unit/f3Audio.test.ts tests/unit/settingsSave.test.ts tests/unit/settingsScreen.test.ts tests/unit/settingsPalette.test.ts`: **PASS, 144 tests / 8 files**, exit **0**, **1.83 s**. Caption spec: **8 tests**, including **5** added consumer cases. Log: `/tmp/3200-focused.log`.
- `npm run typecheck`: **PASS**, exit **0**; `/tmp/3200-typecheck.log`.
- Owned test formatted with Prettier; `git diff --check`: **PASS**.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **completed, exit 1, FAIL gates (e2e=none)**. Aggregate log:
  `/tmp/3200-gates.log`; detailed logs:
  `.cache/runs/20261022-172114-7-Kava0U/`.
- Aggregate **PASS**: writable config preparation, strict content validation,
  production build/typecheck, full units (**192 files / 3,524 tests**, all
  passed, **542.08 s**), attribution and repository-wide Prettier. No unit
  assertion failures, skips, expected failures or retries. The production
  build retains its existing non-failing chunk-size warning.
- Aggregate **FAIL**: Python tooling, **162 passed / 5 failed / 167 total**,
  **8.960 s**. Four `test_ci_build_manifest` cases report `spawnSync git EPERM`
  (subprocess environment blocks). `test_golden_tooling` reports
  `Unexpected end of JSON input` in `golden-manifest.test.mjs`; its underlying
  cause is not established here. These match the failures documented by the
  earlier packages. No caption product failure or unrelated repair is claimed.
- Final owned-file Prettier check and `git diff --check`: **PASS**. Final SHA
  remains pinned; only the caption test and this note differ. Production
  `src/ui/Captions.ts` has no diff. No other package was committed/collected.

Actual e2e mode: **none**. No browser launch, game rendering or screenshots.
Existing read-only audio checks use their fake AudioContext fixture, not real
WebAudio. Headless DOM/timer evidence does not establish visual readability,
assistive-technology compatibility, GPU behavior, successful unaided play,
visual acceptance or real-phone performance.
