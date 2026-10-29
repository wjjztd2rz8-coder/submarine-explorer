# Phone acceptance automation

2026-10-29. Base: `2303e249`. Owner checklist: [4410-P2-phone-accept-checklist.md](4410-P2-phone-accept-checklist.md).

Added `tests/e2e/phone-accept.spec.ts`: seven capability tests at both **390×844** and **844×390**, with touch input, Low graphics and Arcade preferences. Reuses the existing clock, Home, HUD-clearance, scan and Journal helpers. No site-dependent branches or new controls.

| Capability               | Automated assertions                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home destination         | Fresh and remembered-site button names; matching scene caption; button fully in viewport and receives a tap; launch URL matches the named site.                                                                                                                                                                                                 |
| Home / Aa / Settings     | Active Low readout; Aa advances in 5-point increments to 150%; reload preserves 150%; next increment wraps to 80%. Close stays fully visible and receives taps after scrolling to Aa and at every scale. Home launch and Settings remain reachable at 150%. Visible Settings copy names no keys.                                                |
| Briefing / dive opening  | At 150%, objectives and Begin fit; touch controls are visible, in viewport and receive taps; shared HUD guard checks bounds and pairwise overlap with controls. No Boost control or visible keyboard instructions.                                                                                                                              |
| Scan / Journal / debrief | Loaded POI radii have a 100 m floor; 101 m produces distance-bearing approach copy; 100 m permits real held-touch scans for bow and stern. Results identify each subject as a new Journal entry; both entries appear; reader panel is opaque and Close reachable; debrief reports 2 of 2 primaries. Scan guidance/results clear touch controls. |
| Your sub                 | Home opener and Back reachable; preview canvas present; four named groups reachable; portrait preview/groups fit without scrolling; no horizontal panel overflow; unlocked swatch selection survives Back/reopen; no Journal cosmetic picker.                                                                                                   |
| Touch copy               | Visible briefing, HUD, Settings, pause, How to play and photo copy name no keyboard keys; help has no Boost; photo mode presents touch gestures and a reachable Capture. Hidden desktop instructions are excluded with `useInnerText`.                                                                                                          |
| Anchored event           | Beebe plume remains inactive outside arrival range and starts on entry without SCAN or a timer wait; effect group is at its authored subject; anchor projects into the viewport clear of touch controls; controls receive taps and shared HUD overlap guard passes.                                                                             |

The range and event checks set deterministic poses and freeze vehicle physics. They exercise the real scanner, event system, touch hold, recorder and UI; they do not establish normal piloting feel or performance. The cosmetic test alone uses a migrated cosmetic-unlock fixture; scan tests start with empty discovery records.

Small shared fix: `SettingsScreen.showControls` now labels the touch exit **Close**, retaining **Close (Esc)** for keyboard input. The old unconditional label was found by source inspection while adding the visible-copy assertion, not by an executed browser failure. Updated existing Settings e2e names and the existing unit cases for remembered, hardware and forced touch detection plus switching back to keyboard.

## Verification and execution block

- TypeScript and final production build: **pass**. Build uses the repository's existing writable-config approach: bundle `vite.config.ts` locally with Rolldown, then `npm run build -- --config .cache/phone-accept-vite.config.mjs --configLoader native --outDir .cache/phone-accept-dist`. Log: `.cache/phone-accept-build.log`. An initial runner-config build hit the existing late-import/PWA `Vite module runner has been closed` problem; the native build resolved it without tooling changes.
- Targeted existing unit capability: **3 passed**, 182 unrelated cases not selected: `npm test -- --configLoader runner --cache=false tests/unit/overlayFocus.test.ts -t 'uses .* touch detection for Home Settings'`.
- Playwright discovery: **14 tests in one file**. Log: `.cache/phone-accept-discovery.log`.
- Searched `tests/e2e` for the changed capability and attempted the actual named tests, including the existing regression:

  ```sh
  PW_OUTDIR=.cache/phone-accept-dist PW_PORT=4267 GATES_CONFIG_MODE=writable npx playwright test tests/e2e/phone-accept.spec.ts -g 'phone acceptance' --output=.cache/phone-accept-results/acceptance
  PW_OUTDIR=.cache/phone-accept-dist PW_PORT=4268 GATES_CONFIG_MODE=writable npx playwright test tests/e2e/settings.spec.ts -g 'Aa cycles and persists UI scale from' --output=.cache/phone-accept-results/settings
  ```

  Both stop before browser tests execute: preview startup fails, and `DEBUG=pw:webserver` shows `connect EPERM` on both `::1:4267` and `127.0.0.1:4267`. Logs: `.cache/phone-accept-e2e.log`, `.cache/phone-accept-settings-e2e.log`. A baseline `d-shell.spec.ts -g 'Home button and caption share the launch destination'` attempt has the same block (`.cache/phone-accept-baseline.log`). **No browser assertions ran; no screenshot exists from this environment.** These are execution failures, not passing acceptance results or demonstrated main-branch assertion failures.

- Each new test saves `testInfo.outputPath('phone.png')` after success or assertion failure; the opening test also saves `briefing.png`. With the command above these belong under `.cache/phone-accept-results/acceptance/<test-directory>/`. No fabricated screenshot paths or `test.fixme` annotations were added: no browser assertion failure was observed to justify quarantining one. Runtime failures still need a permitted runner, screenshot inspection, and either a small shared fix or an explicit `test.fixme` with evidence as requested.
- Changed-file Prettier and `git diff --check`: **pass**.

## Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh` outside this sandbox. Its logs in `.cache/runs/20261029-025820-483020-4gwxub/` show Python, content, build, unit (**4,433 tests in 192 files**), root smoke e2e (**3 tests**), project-base e2e (**8 tests**) and attribution passing. Only repository-wide Prettier failed.

Root cause: the ordered backlog in `plan/DIRECTOR.md` had inconsistent list markers after item 7 (`11, 12, 8, 9, 10`). Applied Prettier's canonical numbering (`8, 9, 10, 11, 12`); wording and order are unchanged. The user's explicit follow-up instruction to fix the gate failure authorizes this formatting-only exception to the original no-`DIRECTOR.md`-edits constraint. No assertions, ignore rules, gate commands or test selection were weakened.

Repository-wide `npx prettier --check .` and `git diff --check`: **pass** after the fix. Formatting log: `.cache/phone-accept-prettier.log`. The complete gate has not been rerun here. The orchestrator's smoke and project-base passes do not establish results for the 14 new phone-acceptance tests; their targeted browser execution remains pending a permitted runner.

## Owner-only checks still pending

- **First-five-minute journey / Home / opening:** actual phone readability, intuitive next action, natural first/second-scan elapsed time, and the opening's documentary appearance with submarine, seabed and an interesting target.
- **Approach and scans in both orientations:** cruise/turn/rise/sink/look feel, ease of holding SCAN, clarity of next-objective guidance during ordinary travel, discovery reward, and whether 150% needs reducing on the physical phone.
- **Journal and debrief:** perceived absence of ghost text/cyan artifacts, photo subject composition, and whether Sources/Recreation explanations read naturally without repetition. The spec checks opaque DOM backing and counts, not image aesthetics or editorial quality.
- **Your sub / event:** perceived preview updates, overall clutter, whether the optional plume is naturally findable and recognisable near its subject, and whether the sighting feels connected to arrival.
- **Lost City Low → High → Low:** actual-device responsiveness, plume/pan stutter and readability comparison. No performance acceptance is inferred from paused-clock browser tests.

The complete owner checklist remains pending. This focused Low-tier spec does not replace the continuous touch journey, physical rotation, High-tier reload comparison, photo-composition review or hosted deployment/SHA verification. No merge, push or `tools/` edits. `DIRECTOR.md` has only the follow-up formatting correction described above.
