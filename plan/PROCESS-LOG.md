# Process log

Changes to how the work is done (tooling, scheduling, agent use), with the reason and the evidence. The owner delegated this on 2026-10-01; the only hard constraint is the usage floors.

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
