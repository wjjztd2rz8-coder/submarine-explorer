# Process log

Changes to how the work is done (tooling, scheduling, agent use), with the reason and the evidence. The owner delegated this on 2026-10-01; the only hard constraint is the usage floors.

- **2026-10-25 (night) — stale `current` dir blocks Sol start**
  - **Problem:** a plain directory at `.cache/review/current` (from the earlier Claude-alone review) made `rm -f` fail and `ln -sfn` nest a link inside it.
  - **Change:** `tools/codex-review.sh start` now uses `rm -rf .cache/review/current`. Treat efficiency.sh idle hours as sample-count estimates (Sol, 2026-10-25).
- **2026-10-25 — silent skipped Sol start stalls reconcile**
  - **Problem:** `codex-review.sh start` exited 75 (Codex 5h 6%) with output sent to /dev/null; the draft was then written with `mkdir -p .cache/review/current`, which made a plain directory, so `reconcile` waited 40 min for a session that never came.
  - **Change:** none to tools yet; run `tools/codex-review.sh start` once in the foreground for its exit code (it returns instantly when skipped), and only write the draft into `current` if it is a symlink.
- **2026-10-11 — one plan (owner)**
  - **Problem:** forward work came from several places that disagreed. DIRECTOR.md had 15 stacked "current/previous priorities" sections, RESUME-PROMPT picked packages from PHASE-F-PLAN §3 (waves already finished), there was a separate phone-feedback package table and a new simplification plan, and codex-refill read a 2026-10-06 note. The owner asked that the plan and all runs come from one source, to avoid disjointed development.
  - **Change:** DIRECTOR.md now holds one ordered Backlog with stable item IDs and lanes, plus the simplicity rules every package must meet. History moved to `plan/archive/DIRECTOR-HISTORY-2026-10.md`, and the simplification review was archived as evidence. RESUME-PROMPT §2, REVIEW-PROMPT step 4, `tools/codex-refill.sh` and `tools/codex-review.sh` read only DIRECTOR.md. Briefs, branches, progress notes and commits name the item ID. PHASE-F-PLAN and PHONE-FEEDBACK carry "reference only" banners.
- **2026-10-03 — F-CI-MAIN-RED**
  - Cached hosted logs identify a preset-tier test mismatch and a mission
    frame/ascent timing failure. Tests now choose the tier they exercise and
    synchronize with observed frames and mission state. Existing CI scheduling,
    retries, full discovery and gameplay stay unchanged.
  - Full local gates were attempted; static checks pass, while both browser
    gates cannot start a localhost preview in this sandbox. GitHub access and
    Git metadata writes are denied. The eight-run audit and two consecutive
    hosted green runs remain pending; see [the evidence report](progress/F-CI-MAIN-RED.md).
- **2026-10-01 night**
  - **Usage endpoint:** the Claude usage endpoint returned 429 for hours, and two runs were skipped. ai-limits now caches readings, backs off after errors and falls back to rate-limit headers.
  - **Start gate:** the Claude start gate no longer depends on Codex budget (Codex at 4% had blocked runs while Claude was at 98%).
  - **Timer:** it moved from 90 to 30 minutes so finished runs don't leave idle gaps.
  - **Codex watchdog:** it now re-arms after Codex's 5-hour reset.
  - **Codex queue:** added the queue and `tools/codex-dispatch.sh`, so Codex gets work while Claude is out of budget (it had sat idle for hours).
  - **Metrics:** added `tools/usage-sample.sh` (30-min metrics) and `tools/efficiency.sh` (summary).
  - **Director's brief:** added `plan/DIRECTOR.md`, so runs review packages against a rubric and send weak work back.
- **2026-10-02 16:50**
  - **Deadlock:** runs stopped from 10:30 to 16:45 (about 6 h lost) because Claude usage was unreadable. The likely cause: Claude Code refreshes its login token only while it runs, so with no runs starting, the token expired, the header fallback failed and the gate (which fails closed) kept blocking. `ai-limits` now refreshes the token with a tiny Haiku `claude -p` call when it is within 20 min of expiry.
  - **Idle Codex:** Codex was under-used for about 12.5 h overnight because the queue went empty and only Claude runs refill it. Fix: runs must leave at least 3 briefs queued when they exit (see RESUME-PROMPT).
- **2026-10-03 12:40**
  - **No-op runs:** since the 30-min timer, ~15 runs in a row found nothing to do and still read the whole context (~1% of Claude's 5h each), while Claude idled ~15 h at ≥ 50%. Two causes:
    - (a) DIRECTOR.md priorities had run dry, so runs saw "no unblocked visual package". The list is now refilled, with a rule to refill rather than idle.
    - (b) Golden shots looked blocked ("needs a browser host") but only lacked a preview server. Added `tools/golden.sh` (build + serve on 127.0.0.1 + capture).
  - **resume.sh** now skips a Claude run when the work state (HEAD, worktrees, Codex results, queue) is unchanged since the last run started, while still running at least every 3 h.
- **2026-10-03 13:00 — review triggers.** Owner observation: their prompted review found far more than routine runs did. `tools/review-triggers.sh` runs every tick (cheap) and flags the next run as a review:
  - **Comprehensive:** daily, after a release tag or after 8+ merges.
  - **Targeted:** a dry backlog (3 empty runs), CI red ×3, Claude idle ≥ 2 h, an empty Codex queue ≥ 2 h, or a repeatedly failing gate.
    The review steps are in `plan/REVIEW-PROMPT.md`; results go to `plan/REVIEWS.md` (pushed).
- **2026-10-03 15:30 — false "Claude idle" trigger.** The targeted review fired for "Claude idle ≥ 50% for 2 h" although runs happened at 13:26, 14:08, 14:28, 14:57 and 15:15. Cause: `usage-sample.sh` detected a run with `pgrep 'claude -p Resume Submarine'`, which never matches review runs ("THIS RUN IS A…"), and runs are short, so samples at :15/:45 missed them. It now checks `--permission-mode bypassPermissions` or a fresh `orchestrator.active`, and `review-triggers.sh` also requires that no `resume-*.log` was written in the last 2 h. `efficiency.sh` idle hours before this fix are overstated.

## 2026-10-03 19:00 — stale Codex reading after a manual reset

- Owner applied a Codex reset; ai-limits still read 6% from the last Codex session log (Codex reports usage only inside its own runs), so the dispatcher would have waited until a natural reset with 6 briefs queued.
- Fix: tools/codex-dispatch.sh refreshes the reading (`ai-limits --refresh`, one tiny Codex prompt) when it says low, no Codex task is running and the reading is >30 min old. Launched 470/480/490 immediately.

## 2026-10-04 08:30 — CI e2e shards timing out

- CI on main failed for ~6 consecutive pushes. Cause: 7 of 16 e2e shards hit `--global-timeout=1200000` (20 min); no assertion failures. The 510/520 specs lengthened the suite on the software-GPU runners.
- Fix: 20 shards, `--global-timeout=1560000`, job `timeout-minutes: 30`. Watch the next run; if still timing out, split the heaviest specs rather than adding more shards (public-repo concurrency is 20 jobs).

## 2026-10-04 06:10 — Claude weekly pacing

- Claude weekly was 18% left with 4 days to the Oct 8 reset. Every release tag (f22–f25, ~one per run) triggered a full comprehensive review, so Claude spent most of the night on reviews and gates.
- resume.sh gate now requires weekly left ≥ max(10, 7 + 2.5 × days to reset): roughly one Claude run a day until Oct 8, Codex carries the build work.
- review-triggers.sh: a new tag only triggers a comprehensive review ≥12 h after the last one.
- OVERNIGHT-LOG entries had guessed times (e.g. "~10:00-11:00" written before 06:00); RESUME-PROMPT now says to take the time from `date`.

## 2026-10-05 00:20 — Codex starved by Claude pacing; merges moved to Codex

- With the weekly pacing gate (7 + 2.5%/day) Claude skipped every run from 08:40 Oct 4, so nobody refilled the Codex queue or merged: Codex sat idle ~15 h at 100% and seven finished packages waited unmerged.
- Merges no longer need a Claude full-e2e: Claude (cheap, git only) commits finished Codex worktrees and pre-merges them into an integration worktree; a Codex task (660) makes it full-e2e green; Claude then only reviews screenshots and fast-forwards main. Codex sandboxes can't commit (the worktree .git dir is outside the sandbox), so the git step stays with Claude.
- Pacing relaxed to 7 + 1.5%/day so about one short Claude run a day can review/merge and refill the queue.
- Follow-up: the queue should hold enough briefs for a day of Codex when Claude is rationed.

## 2026-10-04 — 640: diagnose red main CI and shorten browser shards

- Audited all 22 job logs from [run 37189080100](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37189080100) and the latest completed [run 37197436369](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37197436369), using `gh run list --workflow CI --branch main` and `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/<id>/logs`. The newer run 37203012584 was still running during the audit.
- Static failures were real gate failures, separate from the Node deprecation and bundle-size warnings. Job 111397332001 failed `npm test`: `heroIntegrity.test.ts`'s Monterey medium case exceeded Vitest's default 5 s while checking real terrain, every mesh vertex and legal scan approaches. Give only that geometry matrix a 15 s budget, keeping its assertions. In run 37197436369 unit tests and attribution passed, then Prettier failed on this file; reformatted it.
- Browser failures: the hull hint's 9 s lifetime expired during screenshot/click round trips; toast-placement tests also raced `clock.pauseAt(Date.now() + 1000)` and sometimes tried to pause in the past. Pause the Playwright clock on the blank page before navigation, then explicitly render frames while content loads. Preserve the real hint trigger, hit tests, dismissal and saved-history checks; also check actual timed expiry and persistence after reload. The touch onboarding scan now uses the existing held-input scan helper. The chase-camera test waits for observed rotation/settling and always releases its key instead of assuming 15 wall seconds are enough.
- Runtime evidence from list-reporter logs:

  | Dominant work              | Hosted evidence                                                                                | Change                                                                                                                                                                                                                                                                                                     |
  | -------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `f-flow-audit-510.spec.ts` | Titanic alone 9.8 min; Lost City hit its 15 min case timeout; shards 7–8 exhausted 26 min      | 15 journeys become 5: every hero site, distributed across desktop and both touch orientations. Seed only Low graphics for fresh-player navigation; observe 10 real simulation seconds instead of repeating idle minutes.                                                                                   |
  | `f-save-soak.spec.ts`      | Hit 10 min on both attempts; shard 9 exhausted its suite budget                                | 4 dives and 3 live-scene restarts per dive replace 10 × 10. Each mode still has a baseline and a repeated comparison; migration, bindings, movement, reloads and resource counts remain checked.                                                                                                           |
  | `f-a11y.spec.ts`           | Four-minute timeouts during full Tab walks; shard 4 reached 26 min                             | Split briefing, pause details, controls/Journal and photo/debrief into independent cases. Keep every control walk, focus restoration and contrast assertion.                                                                                                                                               |
  | Touch/HUD audit matrices   | Touch audit's observed completions totalled 23.1 min in the older run; hero touch HUD 11.7 min | Rotate hero sites across touch sizes, keep Beebe at every size and both scales, alternate animal habitats across the complete toast size/scale matrix, and run full menu/Journal journeys at 390×844 portrait and 667×375 landscape. Keep every touch breakpoint. Read HUD rectangles in one browser call. |
  | Camera/performance repeats | Lost City camera checks repeat routes × sizes; frame-budget tests render 90 frames per site    | Cover both routes and sizes without repeating their Cartesian product. Performance checks retain all five heroes and actual peak counters over 30 renders after 5 settling frames.                                                                                                                         |

- Keep the existing 20 browser jobs. Count-based contiguous sharding placed adjacent expensive specs together: older successful shards ranged from 1.3 to 24.4 min. `tools/e2e-shards.mjs` discovers the complete current suite and greedily distributes the longest estimated cases first. `tools/e2e-timings.json` records mean successful hosted durations from the two audited runs; failed waits are excluded, and unseen/trimmed cases use explicit fallback estimates. New tests are included automatically. Source locations and entry-file title paths are distinguished so tests declared in shared helpers are included correctly. The planner estimates 14.0 min per shard, including 2 s per test for startup; this is a scheduling estimate, not a hosted measurement of this patch.
- CI now has a 15 min browser-suite budget and uploads JSON timing reports on success or failure. Refresh the historical timings from those reports after the first hosted run. No additional shards, removed sites, art or gameplay changes.
- Final project-base validation exposed another timing race in `helpers/titleAudit.ts`: the renderer allocation baseline could be read before async content and the title crop had rendered (90 geometries became 92). Wait for loaded content and actual frames before sampling, retaining exact geometry/texture/object equality and gameplay preservation assertions.
- Validation: all 371 discovered cases were checked against Playwright's actual `--list --grep` selection across all 20 assignments, with no overlaps or omissions, including shared-helper and opt-in cases. Local gates pass: 144 Python tests, all 13 strict mission-pack validations, build/typecheck, 1,330 Vitest tests, attribution (14 assets), and full Prettier. All 81 current cases in the changed feature specs have passing browser results across targeted runs. The exact shard runner passed 17 cases with 2 existing opt-in skips in 2.6 min and wrote its JSON timing artifact. The complete project-base gate passed all 8 cases; the allocation regression additionally passed three consecutive root runs and three consecutive project-base runs with retries disabled. The full suite was not executed as one local run, and the patch has not run through all 20 hosted shards; hosted runtime confirmation remains pending.

## 2026-10-05 — CI red x3 (targeted review)

- Causes: (1) Prettier failed on the plan logs; fixed. (2) Merged Codex 640 (balanced shards, race fixes). Its first hosted run still failed in 12 of 20 shards: shards hit the `--global-timeout=900000` cut and reported "N did not run" plus one 240 s test timeout each (soak, flow-audit, bughunt-18, a11y globe, atmosphere). The hosted runner is ~2x slower than the e2e-timings estimates.
- Fix: global timeout raised to 25 min (job limit is 30). Brief 730 queued for Codex to read the next hosted run, fix the remaining test-level races and recalibrate `tools/e2e-timings.json` from real durations.

## 2026-10-06 21:45 — Codex self-refills its queue

- Codex idled again (~12 h, 09:20-21:40 Oct 6) with 100% 5h and 32% weekly: the "leave >=3 briefs" rule depends on Claude runs, which are paced out until the weekly reset.
- New tools/codex-refill.sh: when the queue is empty, slots are free and Codex has budget, the dispatcher (every 30 min, no Claude needed) asks Codex to write 3 briefs from DIRECTOR.md/REVIEWS.md, at most every 2 h. Briefs may not merge, push or touch tools/DIRECTOR. Claude still reviews everything before it reaches main.
- Same session: pre-merged 770/780/790 into integration worktree 800 (clean) and queued the first fidelity-pass prototypes 810 (Monterey terrain), 820 (Lost City close-up redo), 830 (Blue Hole dome/walls), 840 (bug hunt f28-f30).

## 2026-10-06 — F-CI-790 hosted timing and frame synchronization

- Retrieved all 20 timing artifacts and raw logs for main run 37292557785 after
  `gh run view --log-failed` returned empty output. Classified seven red shards:
  three suite timeouts, simulation-starved movement waits, and desktop WebGL/DOM
  audits exhausting individual budgets. One separate a11y flake passed on retry.
- Preserve exact assertions and full coverage; explicitly advance rendered frames
  for movement, content allocation baselines and desktop debrief/current audits.
  Preserve the verification's 90 frames with a scoped 300s hosted test budget.
- Import 380 completed hosted test costs, including observed retries; never record
  omitted/skipped work as zero. Add a reusable JSON importer and its unit check.
  Increase CI to 30 duration-balanced shards with the existing 25-minute global
  budget. Measurements show 1.10× median slowdown, not a universal 2× factor.
- Validation and exact next-run expectations are in [F-CI-790](progress/F-CI-790.md).
  Claude must push and verify hosted acceptance; no remote mutation here.
- Broader regression found a POI/wildlife readiness ordering race in the toast
  spec and reproduced the accessibility clock flake. Wait for discovery content;
  recover only an auxiliary page closing during context-wide clock advancement.
  Keep all audit assertions and propagate main-page/work errors, verified by
  negative unit checks and 15 repeated real accessibility audits.
- The onboarding hint test also now observes the post-teleport live scan
  candidate, rather than its earlier spawn marker. Final gates pass (1,426 unit
  tests, 144 Python tests, smoke/project-base); repeat flow/soak and accessibility
  audits pass with retries disabled. Full local e2e and hosted green remain
  separate acceptance checks; see the progress note for precise coverage.

## 2026-10-08 comprehensive review

- **Skip lines broke the prettier gate.** `tools/resume.sh` appended a line per skipped 30-min tick to the tracked `plan/OVERNIGHT-LOG.md`; the unformatted lines failed `prettier --check` in every full gate and kept the working tree dirty. Skips now go to `.cache/skips.log`; `tools/efficiency.sh` reads both files.
- **Gates one at a time.** Three parallel `tools/gates.sh` runs made `tests/unit/montereyWallLife.test.ts` time out at 15 s; run gates sequentially.
- **Revert instead of fix-later.** 830 passed gates but its golden showed a visual regression; the merge was reverted and a redo (910) queued with acceptance criteria tied to the golden file names.
- **Queue refilled:** 850-910 (seven briefs) so Codex has work while Claude's window is spent.

## 2026-10-08 targeted review: "e2e failing repeatedly"

- **Root cause: stale trigger, not a live failure.** `tools/review-triggers.sh` counted every `FAIL` line in all historical `.cache/codex/*-result.md` (4 old e2e failures from Oct 1-5), so the trigger could never clear. The last seven Codex results (Oct 6) all pass the full suite. The count now only reads results from the last 2 days.

## 2026-10-08 11:02 CDT: Haiku for small Claude tasks; quieter run trigger

- **Owner (2026-10-08):** Haiku 5.5 (`model: "haiku"`, verified to resolve to claude-haiku-5-5) now takes smaller, well-scoped Claude tasks instead of Sonnet. Sonnet stays the main contributor for visual-heavy, multi-file and judgment work; Opus only after Sonnet fails twice. Claude-only change: Codex model choice is unchanged. RESUME-PROMPT §2 updated.
- **Run trigger:** two Sonnet headless runs this morning only logged "nothing to collect". They were started by the dispatcher launching briefs (new worktree, queue file moved) and by each run's own log commit changing HEAD. The resume.sh state hash now covers only non-log commits, finished Codex results and paused Claude packages.

## 2026-10-08 11:41 CDT: Codex self-refill never ran from the timer

- `.cache/codex/refill.log` showed "codex: command not found" for every refill since 2026-10-07: the timer's PATH lacks /home/linuxbrew/.linuxbrew/bin. Added it to codex-dispatch.sh and codex-refill.sh. The queue only stayed fed because Claude's reviews wrote briefs.
- 890 and 900 ended after their Codex round with no result file and no unit exit in the journal (cause unknown; a chrome-headless core dump at each start). Their worktrees are complete; the next Claude run gates them (RESUME-PROMPT §1).

## 2026-10-08 11:44 CDT: comprehensive reviews are joint with Codex Sol

- **Owner (2026-10-08):** the joint review helped, so every comprehensive review now runs it. Sol found a blocker Claude missed (default missions skip the hero scenery) and corrected two Claude errors. `tools/codex-review.sh start` runs Sol's independent, read-only review in the background while Claude reviews; `reconcile` sends Claude's draft back for one round and returns an agreed summary. REVIEW-PROMPT step 0. Skips (exit 75) when Codex 5h < 20% or weekly < 10%.

- **2026-10-08 evening:** Codex 5h hit 0% right after the 875/880/910 burst, so the joint review ran Claude-only (script exits 75 as designed). CI root cause (montereyWallLife ultra 45 s timeout) fixed; e2e shard failures need artifacts (970). `gh run view --log-failed` returns no e2e lines; fetch Playwright artifacts instead.

## 2026-10-09 review: no change needed; idle capacity was the weekly-gate lockout (already resolved). Sol review skipped at Codex 6%; reviews should start Sol only when Codex 5h >= ~15%.

## 2026-10-09 midday review

- Finding: Codex tasks 1060/1070/1080 were killed by the Codex 5h floor mid-round and left uncommitted worktrees, with no auto-resume path until the next Claude collection run. Hosted CI failures grew (10+ shards) while the fix sat stranded. Action: prioritised in DIRECTOR.md items 1-2; no tooling change (floors are by design). Idea if it recurs: have codex-dispatch relaunch unfinished worktrees first when budget returns.

## 2026-10-09 evening comprehensive review

- Finding: `golden.sh` for Monterey hit repeated 30 s screenshot timeouts while three Codex tasks and the Sol review shared the CPU; the desktop set shipped 20 of 23 images. Action: reviews should capture Monterey first or alone (`GOLDEN_SITES=monterey-canyon`) before launching Sol; this review used the previous Monterey shot.
- Finding: `pgrep -f golden.sh` matches the headless `claude -p` process (its prompt text contains the script name), so waits built on it never end. Wait on the specific PID instead.
- Finding: Endurance golden was byte-identical across two sets; nothing in the backlog covered it until now (queued 1180). Backlog audits should list every site in the contact sheet, not only the five hero sites.
- Hosted CI still red (e2e shards); 1120 owns triage.

## 2026-10-09 late comprehensive review

- Finding: three comprehensive reviews in one day merely re-score the same set; the 8+ merges trigger counts `--merges` including Codex collection merges. Action: none yet; consider requiring a new golden diff or 24 h. Sol skipped at Codex 11% (exit 75, as designed).

## 2026-10-09 22:30 review

- Hosted CI red had three causes, not one: a unit test writing to a missing `.cache/` (fixed), a Playwright apt-lock flake in project-base, and e2e shard 300 s timeouts. Lesson: read the failing static job first; it was a one-line fix hidden behind "e2e red".
- Codex weekly at 6% blocks Sol reviews and dispatch until 15 Oct; Claude carries packages.
- 2026-10-10: gates.sh leaves preview servers on PW_PORT, so reruns on that port false-fail ('port in use'); golden runs by agents need a free GOLDEN_PORT. Workaround: fuser -k <port>/tcp; fix in tools/gates.sh worth a Haiku item.

## 2026-10-11 13:15 review run

- Sol review plus 3 running Codex tasks exhausted Codex 5h (63% to 0 in ~25 min), so the reconcile round failed. Rule: start Sol only when fewer than 2 Codex tasks run or Codex 5h >= 70%.
- `.cache/review/current` is a symlink written by `codex-review.sh start`; creating it with mkdir breaks `reconcile` (it waited forever). Write the draft only after `start` has made the link.
- Shard-7 CI failure traced via `gh api repos/:owner/:repo/actions/jobs/<id>/logs` (`gh run view --log-failed` printed nothing).

## 2026-10-11 15:30 owner-requested review follow-ups (interactive)

- **Codex browser access.** The owner asked whether Codex could get a browser. The Codex chrome plugin (ChatGPT extension) is not installed and finds no supported browser (the default is Brave Origin), and it would drive the owner's own window, which doesn't suit headless runs. Instead, `tools/codex-browser.sh` starts a Vite dev server of the task's checkout and passes a headless Playwright MCP server (`~/.local/share/pw-mcp`, @playwright/mcp 0.0.83, Playwright's Chromium) to `codex exec`. Outside Codex, the MCP server rendered the game with WebGL. Whether codex-spawned MCP servers escape the sandbox is checked by `.cache/owner-review-kickoff.sh` at 16:48 (result in `.cache/codex/browser-smoke.md`; failure writes `.cache/codex/browser-off`, which disables it).
- **Dispatch cap.** `.cache/codex/dispatch-max` overrides MAX (set to 1 until Sol's reconcile; a timer removes it at 20:30 regardless), which applies the 13:15 rule above automatically.
- **STATUS.md** was a Phase D2 page from Sept 24. It is archived, and each comprehensive review now rewrites a one-page plan/STATUS.md.
- **Test suite:** Codex 1405 sweeps for redundant, slow and obsolete tests (report only); Claude then prunes from its report.

## 2026-10-11 18:30: phone-feedback session (interactive)

- **Merge check for emptied files.** f-journal-mobile's wip commit accidentally emptied `tests/e2e/f-touch-audit.spec.ts` (303 deletions). Its own gates then passed because the spec was gone. I caught it as a merge conflict, restored main's version, and it passes against the new Journal. Rule: before merging any agent branch, run `git diff --numstat main..<branch>` and look for test files with only deletions.
- **Dispatcher paused for phone work.** `dispatch-max` is 0, the uncap timer is stopped, and the seven queued briefs moved to `.cache/codex/queue/hold/`. This gives the Codex reset at 21:48 to the scheduled phone resumes (1391r 21:55, 1393r 21:57). Restore it after those merge: move the briefs back and `rm .cache/codex/dispatch-max`.
- **Budget.** Two parallel Sonnet agents used about 42% of the Claude 5h window in about 20 minutes, three times in a row. The Claude weekly is at 20% on Oct 11, with the reset on Oct 15. Until then, run at most one Claude agent at a time.

## 2026-10-12 21:30: resume-all session (interactive)

- **Stall.** The three phone packages (1391/1392/1393) passed full gates by 03:14 but sat unmerged for 18 h: the interactive lock timer kept headless runs out after the phone thread ended. Rule: an interactive thread that stops for the day removes its `interactive` line from `.cache/orchestrator.active` (or stops `subexp-interactive-lock.timer`) so `resume.sh` can collect finished work.
- **Worktree cleanup lost uncommitted work.** I force-removed the 1380 and 1400 worktrees believing them merged (branch tips were on main). 1400's content fixes were uncommitted and 1380's test was untracked (my `grep -v '^??'` hid it). Both were rebuilt exactly from the Codex session rollouts (`~/.codex/sessions/...jsonl`: replay the edit scripts / apply_patch bodies). Rule: before `git worktree remove`, run `git status --porcelain` with untracked files shown and never use `--force` on a non-empty status.

## 2026-10-13 06:00: collection backlog (review run)

- **Stall.** Twelve Codex worktrees finished between 22:00 and 02:30 and waited for a Claude run with budget (Claude sat on its 20% floor, 16% at 00:20). Codex capacity was not the limit; collection was.
- **Change.** Collection can be scripted: for each finished worktree, commit, merge main in, run `tools/gates.sh`, merge to main only on PASS, stop on conflict (a /tmp script this run: 7 of 8 merged unattended, 1 conflict resolved by hand, 2 Claude branches via a Sonnet agent for the 6-file conflict). Follow-up for a future run: promote it to `tools/collect-codex.sh` if the pattern recurs.
- **Merge hazard seen again.** A package that cuts a feature (S-rov) conflicts with a package that edits the same code (S-bugs): ordering cuts before bug fixes avoids it, or run the cut last.
- **Hosted CI.** Shards fail on software-GL timeouts, not logic. Codex 1610 moves captures to nightly and keeps cheap assertions.

## 2026-10-13 (targeted review): collection stalled 13 h

- **Symptom:** CI red, Claude idle at 100% and Codex empty from about 09:00 to 21:15, with ten finished Codex packages uncollected in their worktrees.
- **Root cause:** `tools/resume.sh` computed its work-state hash with `ls` over a missing `paused-packages.md`; under `set -o pipefail` that exited 2, so every 30-minute timer run failed before starting Claude (journal: `subexp-resume.service ... status=2/INVALIDARGUMENT`). It was fixed in 316a2a9 at 21:15 but nothing had noticed in 12 hours, and `skips.log` records nothing for crashes.
- **Fix to adopt:** failed timer runs must be visible. `tools/review-triggers.sh` already fires on idle capacity, which is how this was caught; the cheap extra guard is `tools/efficiency.sh` listing `systemctl --user status subexp-resume.service` failures. Also: the dispatcher kept the Codex queue empty because I had not queued behind S-resolve; four briefs are now queued.

## 2026-10-14 (comprehensive review)

- **Finding:** Codex packages finish uncommitted (sandbox cannot write git metadata) and wait for a Claude run to be gated and merged; four were collected in one pass today, and each needed a main merge with conflicts in shared test files. Queue was empty at review start.
- **Change:** five briefs queued (1710 to 1750); S-tests step 2 moved to the Codex lane (non-visual) to keep Claude's budget for visual items. Large Claude packages are split (S-guidance took 2.4 h in one agent).
- **Check:** a merge that passes smoke can still break a unit test hidden by a conflict resolution (S-rewards Journal pointer lock); merge main into the package branch and run the full unit gate there before merging, as done today.

## 2026-10-15 (comprehensive review, pm)

- **Finding:** 11 of the last 15 hosted CI runs on main were `cancelled`, not failed. `ci.yml` had `cancel-in-progress: true` and the push rule pushes after every merge, so each push cancelled the 45-minute run before it completed. This, more than test quality, is why hosted CI has "never been green" and why releases (f53) stalled.
- **Change:** `cancel-in-progress` now applies only to pull requests; runs on main finish (GitHub still collapses queued runs to the newest). Expect one completed result per ~45 min of merges. Tag only when a completed run on the tagged commit is green.
- **Codex:** 5h at 6%, so the joint review's Sol pass was skipped again (exit 75); 2060/2070/2080 are queued.

## 2026-10-15 eve

- Removed 13 stale Codex worktrees/branches (1740-1860, 2030-2050); all committed work was already on main, leftovers were uncommitted.
- Hosted CI "cancelled" runs have no jobs: concurrency keeps one pending run and supersedes older pending ones, so with ~60 min CI and a push per merge, many runs never start. Not a defect; tags need a completed green run. 2150 triages the one red shard.
- tools/golden.sh took 9.5 min and Monterey capture timed out; queued V-golden-monterey.

## 2026-10-16

- Comprehensive review: Codex finished 2210/2220 but nobody collected them for a run; collection is step 1 of every run, so no change except noting it. Efficiency idle totals are sample extrapolations (Sol), reported as upper bounds. Added standing Codex item S-verify/S-bughunt so a verification brief is always queued after visual merges.

## 2026-10-16 (second review)

- Codex 5h at 3% all morning made a joint review impossible; review ran Claude alone. No tooling change: the budget gate is working as designed, and Claude carries visual work while Codex recovers. Queue refilled to four small briefs so Codex starts when it resets (10:15).

## 2026-10-16 10:20: workflow audit (interactive, owner-delegated)

- **Codex spent its week in ~29 h.** The weekly window went from 85% to 9% between 04:36 Oct 15 and 07:15 Oct 16, because the dispatcher only checked the 5h window (weekly ≥ 8%), which shut the lane for 6 days. The owner used a Codex reset. Change: `codex-dispatch.sh` paces the week (weekly left ≥ 8 + 92·days/7 − 15: a 15% head start, then roughly linear). The prompt no longer lets runs launch Codex around the dispatcher.
- **Claude's week was on track to run dry ~4 days early** (31% in 27 h). The old 1.5%/day reserve was too loose. Change: the `resume.sh` gate needs weekly left ≥ 7 + 93·days/7 − 20 (a 20% head start, then linear). Runs will skip more often; that is intended.
- **Dispatch and sampling stopped during every headless run.** `subexp-resume.service` is a oneshot, and its timer can't fire while a run is active (runs last 30–90 min), so neither Codex dispatch nor `usage.csv` sampling ran then. Change: a new `subexp-tick.timer`/`.service` in `~/.config/systemd/user/` (outside the repo) runs `usage-sample.sh; codex-dispatch.sh` every 15 min; `resume.sh` no longer calls them. Unit-count filters exclude `subexp-tick` as well as `subexp-resume`.
- **Every successful headless run showed as failed in systemd** (26 in 24 h). The run deletes `.cache/orchestrator.active` itself; the last line of `resume.sh` then returned grep's exit 2. That made the 2026-10-13 "failed timer runs must be visible" guard useless. Fixed. `efficiency.sh` now counts failed timer runs over 24 h.
- **The efficiency report was lifetime-only** ("204 h idle"), so it couldn't be acted on. It now reports 24 h and 7 d windows, plus weekly burn and run-out per side, which would have flagged the Codex burn a day earlier.
- **Review rule:** judge visual packages from screenshots, not the agent's self-rating. After a low-gain second pass, rewrite the brief around a target composition (added to RESUME-PROMPT §3).
- **Cleanup:** cleared five stale failed Codex units. Dropped V-endurance-aim: its worktree and branch are removed, and the work is kept as tag `parked/V-endurance-aim` (5fa58fc). DIRECTOR item 6 should be marked CUT by the next run (run 32 had DIRECTOR.md open).

## 2026-10-17 review

- Prop-adding packages can break `f-perf-budget.spec.ts` (Low-tier prop counts), which gates.sh does not run. Run 41's CI failed on it. Rule added to V-titanic-seabed in DIRECTOR.md; fixed in 3e554a0.

## 2026-10-17 targeted review: false "Claude idle" trigger

- Cause: review-triggers.sh fired "Claude idle at >=50% for 2 h" while resume.sh was correctly skipping runs on the weekly pacing gate (52% left vs 53.4% floor). Idle was deliberate, not waste; efficiency.sh's idle hours overstate it for the same reason.
- Fix: the idle trigger now requires the same weekly pacing check as resume.sh (claude_week_ok). Codex queue 2430-2460 also waits on its weekly pacing by design (burn ~24%/day).

## 2026-10-18 midday review: Codex weekly head start 15% -> 30% (owner)

- The owner asked why the queue waited ~10 h for the weekly pacing gate when Codex had budget. They had also already used their one Claude reset, so Claude is the scarce lane until Oct 22 and Codex should carry more of the work early in its week.
- Change: `codex-dispatch.sh` needs weekly left >= 8 + 92*days/7 - 30 (was -15). At 65% left with 6.2 days to go, it opened at once; 2541-2543 launched 11:21. It still throttles to about linear after roughly half a day at three tasks, so the Oct 15-16 "week gone in 29 h" failure stays guarded.
- Merge verification gap (smoke-only gates hid a red e2e): R-merge-verify queued and launched.
- **Later the same day: Codex weekly pacing off until Nov 2 (owner tip, verified).** The owner suspected global Codex resets that aren't banked. `.cache/metrics/usage.csv` shows the Codex week refilled to 90-100% nine times in 16 days (Oct 2, 3, 6, 8, 11, 12, 15, 16, 17); only Oct 17 16:15 fits the natural weekly reset. A Haiku web check found OpenAI global resets (Sept 7, Oct 2) and an Oct 4 "28-day: an improvement or a full reset each day" pledge (moderate-high confidence; the individual October days are unverified). Pacing to one refill a week was therefore wasting budget. `codex-dispatch.sh` now needs only weekly ≥ 8% and 5h ≥ 20% until Nov 2, then the paced rule returns. If refills stop before then, the watchdog floor still stops the lane at 7%.
- **2026-10-18 14:50 — false "Claude idle" trigger**
  - **Evidence:** the trigger fired with Claude 5h at 73-100% and the week at 36% left, exactly on the resume.sh pace line (36.0). Runs had been skipped by the weekly gate (322 skips), which is deliberate, not idle.
  - **Change:** `claude_week_ok()` in `tools/review-triggers.sh` now needs a 3-point margin above the pace line, so sitting on the line no longer counts as idle.

## 2026-10-19 review

- Codex queue had run dry (only hold/launched) while Codex sat below its weekly pace gate; refilled 2700-2730 so dispatch has work when the pace line reopens. Cause: briefs get consumed faster than reviews refill; next runs should top the queue up to 3 each time (already in the resume prompt).
- Merge policy conflict (RESUME-PROMPT "merges don't wait for CI" vs R-merge-verify guard): kept the owner's rule; noted in DIRECTOR.

## 2026-10-20: finished Codex work waits for a Claude run

Nine Codex worktrees finished 2026-10-18/19 but stayed uncommitted until this review, because only Claude runs collect and the weekly gate skipped runs for ~40 h. Also efficiency.sh's skip and idle counts are not date-filtered and the usage telemetry had a 39 h gap (Sol), so treat its 7-day figures as indicative. Follow-up: the collection step stays in resume; no tooling change made (Claude week is on the pace line, a Codex-side auto-merge would break the rule that Claude reviews Codex diffs).

## 2026-10-21: codex-review start skipped silently, reconcile reused a stale review

Run 72's `start` exited 75 (Codex 5h 17% < 20%) under nohup, so nobody saw it; `current` still pointed at the previous review and `reconcile` answered against the old golden set. Fix: `start` removes `.cache/review/current` before the budget check, and `reconcile` exits 75 at once if it is missing, so a skipped Sol review means "review alone" instead of stale reconciliation.

## 2026-10-22 (targeted review: Codex starved 2 h)

- Cause: not a scheduling fault. Codex verify briefs finish in ~15 min, the last nine launched 17:18-19:33, and Codex 5h fell to 18% (< 20% dispatch gate) until its 22:15 reset; refill runs at most every 2 h. Queue was therefore empty and unlaunchable.
- Fix: queued three R-ci-green briefs (3250-3270) so the 22:15 reset launches real work; collected 3130-3240 (12 worktrees) in one Sonnet pass. S-verify slices are now near diminishing returns (nine clean audits, one real Sonar fix, one CI pin), so the refill should prefer R-ci-green and S-* items over more verify briefs.

## 2026-10-22 (night): joint review plumbing

Creating `.cache/review/current` as a directory before `codex-review.sh start` makes its `ln -sfn` nest inside it, so reconcile never finds `sol-review.md` and hangs; killing a reconcile mid-run leaves a `codex exec resume` process holding the thread (later reconciles fail with "active writer"). Rule: never create `.cache/review/current` by hand (write the draft only after `start` has made the symlink), and wait for a stale resume process to exit before retrying. Background Bash commands are stopped after 10 min regardless of `timeout`; poll the output file in 10-min foreground loops.

- 2026-10-23 review: no process change; Codex queue refilled (3380). Sol skipped (Codex 5h 11%).

## 2026-10-23 evening (targeted review: Claude idle at >=50% for 2 h)

- Cause: `resume.sh` skips a headless run for 3 h when main's non-log HEAD and Codex results are unchanged. Run 100 (16:25) found nothing new, so runs at 17:15-18:15 all exited "no new work" while Claude sat at 76-79% with unblocked Sonnet items (V-challenger-ripples, V-monterey-apron). The skip is right for collection, wrong when a Claude lane has work.
- Fix: skip window 3 h -> 90 min, so an idle Claude gets a package-starting run at most 90 min after the last one. Backlog items stay the source; a run that finds nothing still exits cheaply.

## 2026-10-24 midday (comprehensive review)

- Finding: Claude idled 14-28 h of the last 24 h at 100% 5h: runs 105-111 ended "collection only/no-op" without starting a package although Backlog items 1-6 were unblocked. Cause was run judgment, not a gate (skip window already 90 min).
- Fix: rule in the run notes, not tooling: any run with Claude 5h >= 45% and week on pace starts one Sonnet package after collecting. Gates on a loaded machine take 20-40 min; run them backgrounded.
- Codex bug hunts: ~1 real defect in 25 audits; shift briefs to verifying new visual packages and CI.

## 2026-10-25 targeted review: Codex starved

- Cause: the only Codex-lane item was the standing verify/bug-hunt item, whose last 14+ briefs found no defects, and the refill cooldown was 2 h. Fix: added real Codex items (5b P2-text-size, 5c S-fix-lock-teardown), cooldown 45 min, refill prompt told not to repeat audits. Briefs 4270-4290 launched.

## 2026-10-26

- review-triggers.sh: "Codex starved" now requires zero running tasks (was <2); an intentionally empty, rationed queue with one task running is not starvation. Red CI traced to 4280's Aa spec at 150% scale; fix rides with 4330.

## 2026-10-26 comprehensive review

- Main CI was red for four pushes on two specs whose failing case changes per run; runs were being logged "CI pending" without triage. Triage by failing spec name is now Backlog item 1 (R-ci-green), with briefs 4380 and 4390. Reason: a red main hides new breakages and blocks Pages deploys.
- `.cache/review/current` reconcile needs a 50-minute foreground timeout, but the Bash tool caps at 10 minutes: the call is auto-backgrounded and its output file read afterwards. No tooling change needed.

## 2026-10-26 targeted review (Codex starved)

- Starvation was the Codex 5h budget (5-7% after the Sol review; dispatcher needs 20%), not an empty queue. Refill found no unblocked non-visual Backlog item. Unblocked S-collision (director decision) and queued 4450. No tooling change: the pacing gate worked as designed.

## 2026-10-26 evening review

- Codex review script exited 75 (Codex 5h 5%): reviewed alone and said so in REVIEWS.md. No tooling change; Codex weekly burn (~55%/day) is the limit, not scheduling. Golden set has no Axial/Kama/Hunga captures; added as first step of V-eight-sites-lit.

## 2026-10-27 review

- Sol review skipped (Codex 5h 5%). No tooling change; tools/gates.sh runtime under Codex load (>10 min) noted, run via systemd-run. Reason: nothing wasted found by efficiency.sh beyond budget-gate skips.

## 2026-10-28

- golden.sh (10 sites) exceeds a 550 s tool timeout and dies mid-set, losing Hunga. Queued as T-golden-hunga (per-site timeout, continue on failure). Sol review skipped: Codex weekly 7% until Nov 2.

## 2026-10-28 review: Sol cost

Sol's round 1 plus the reconcile round used ~485k tokens and hit the Codex 5h limit before reconcile finished. No change made: comprehensive reviews already run only every ~8 merges. Reviewing: if reconcile fails again, the review entry records it as not fully agreed.

## 2026-10-28 targeted review

- Red CI x4 came from a pinned prop count in f-perf-budget that gates.sh doesn't exercise. Fix: spec updated; Codex 80 T-pin-fragility derives counts from data and adds a gates-level guard.
- Codex queue sat empty after its 5h window recovered (runs 211-213 logged "empty on purpose"). Rule: no-op runs must re-check Codex 5h/week and refill to 3 briefs when healthy.
