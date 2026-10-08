# Reviews

Dated director reviews, newest first. Comprehensive reviews run about daily, after release tags or after 8+ merges. Targeted reviews run when something stalls (dry backlog, red CI, idle capacity).

## 2026-10-08 evening comprehensive review, Claude alone (trigger: 8+ merges; golden 2026-10-08-202656 vs -155020)

Codex 5h budget was 0% (`codex-review.sh` exited 75), so there was no Sol second opinion; this is Claude's view only. The morning joint review still stands as the agreed baseline.

**Changed since the morning review:** merged 890 (phone HUD declutter), 900 (compact briefing), 920 (carve physics fix, Monterey free-dive range), 910 (Blue Hole wall relief redo), 875 (fidelity rollout) and 880 (f30 bug hunt), tagged f33/f34. Not yet verified by a human-style playthrough: 890/900 (960 queued).

**Per-site scores (readable / beautiful), High tier, vs the morning set:**

| Site            | Score   | Change | Biggest gap                                                                                                                                                                         |
| --------------- | ------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titanic         | 4 / 3.5 | same   | Sub parks dead centre over the bow and hides the scan target; flat haze band above the seabed (980)                                                                                 |
| Beebe           | 4 / 3.5 | same   | Lit sand disc still has a clean edge; chimneys blunt; plumes remain the best effect (930)                                                                                           |
| Great Blue Hole | 3 / 2.5 | +0.5   | 910 kept the gallery full-size and added boulders at the rim, with no sand blobs; but the bowl is still a smooth beige dune with a hard horizon ring and flat cones for stalactites |
| Lost City       | 4 / 3   | same   | Beehive chimney identical to the morning set; stacked-cone silhouette and saucer flanges unchanged (875 did not reach it)                                                           |
| Monterey        | 4 / 3   | same   | Regular corrugated "stacked plate" strata; the wall is now busy with life (good) but reads as a pattern (980)                                                                       |

No regressions in this set. Blue Hole 910 is accepted (it meets the acceptance criteria) but it is not yet beautiful.

**CI:** red since f29. Root causes found this run: (a) `montereyWallLife` ultra tier takes ~50 s on hosted runners and hit its 45 s timeout, now 120 s (fixed here); (b) 6/30 e2e shards fail after 12-22 min but `--log-failed` returns no e2e lines, so the cause needs the Playwright artifacts (970 queued).

**Process:** efficiency.sh: Claude idle ~124 h and Codex under-used ~112 h over two weeks, nearly all the Oct 6-8 weekly-gate lockout; since the reset the queue has stayed full. Codex's 5h window hit 0% at 10:50 CDT after the 875/880/910 burst, so today's third review could not use Sol; nothing to fix (floors worked). The watchdog tripped on the CODEX floor at 15:26 as designed.

**Play flow:** not re-captured this run; 960 verifies 890/900 on phone and desktop with fresh captures.

**New priorities:** see DIRECTOR.md. Order: (1) CI green (970); (2) hero route (940); (3) first-minute verification (960); (4) Blue Hole relief/horizon and Lost City towers (Claude/Sonnet, visual); (5) Titanic/Monterey (980); (6) Challenger/Endurance goldens (950).

**Stage:** ~67% to 1.0, about three weeks (unchanged from the morning agreement; Claude only).

**Needs owner:** nothing.

## 2026-10-08 joint review, Claude + Codex 6.1 Sol (owner request; golden set 2026-10-08-155020)

Both reviewed independently (Codex read-only, viewing all current goldens, the Oct 6 set and the flow captures), then reconciled in one round. Agreed position below; Claude's and Sol's raw reviews are in `.cache/review/`.

**Stage:** ~65% to 1.0, about **three calendar weeks** away. 1.0 = five hero sites beautiful >=4 across opening/approach/detail views; the other eight sites coherent with no major visual defect; an understandable first five minutes on desktop and phone; acceptable Low-tier performance on a real phone; hosted CI green; no known blockers. (Claude first said 2 weeks, Sol 3-5 weeks for a broader scope; both settled on 3.)

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), current main, High tier:**

| Site            | Score         | Biggest gap                                                                                                         |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Titanic         | 4/3.5/4/4/5/3 | Hull reads; sub parks over the bow; flat seabed with a haze band; debris like flat cards                            |
| Beebe           | 4/3/4/4/5/3   | Plumes are the best effect in the game; hard-edged lit sand disc; blunt small chimneys                              |
| Great Blue Hole | 3/2/3/3/5/3   | Reads as sand desert under a cyan sky; gallery a freestanding shell with teeth; crude sponges                       |
| Lost City       | 4/3/4/4/5/3   | Towers read as stacked cones with saucer flanges; ridge has large flat facets                                       |
| Monterey        | 4/3/3/3.5/4/3 | Corrugated "stacked plate" strata; comb jelly species mismatch (Bolinopsis infundibulum vs B. microptera, 840 note) |

Phone 3 is provisional: goldens are High tier with the tutorial off, so Low tier, onboarding and real-phone performance are untested.

**New finding (Sol):** the default mission does not go where the goldens look. Goldens load free dive; mission spawns keep the scenic opening only when a required objective is within 300 m. Blue Hole's primaries are the two atoll edges (the hole is not an objective), Monterey's are the shallow head and channel (the wall is optional). Queued 940.

**Agreed blockers, in order:** (1) a clear, uncluttered first five minutes through an unaided scan on desktop and phone (890, 900, then a real capture); (2) default missions lead to the hero scenery (940); (3) hero fidelity, Blue Hole first (910, 875), then terrain/material seams and sub occluding targets; (4) green hosted CI (6/30 shards red on run 37797816285) and an integrated full run on the release commit, including the carve fix (920); (5) all-13-site coverage and real-phone Low-tier checks.

**Corrections to Claude's draft:** the Blue Hole capsules are wall sponges (`stalactites.ts:369`), not fish (still crude); golden did report the Monterey capture failure (my `| tail` hid the exit code); some flow captures are from Oct 8, but no complete current-build audit exists.

**Needs owner:** nothing.

## 2026-10-08 targeted review (trigger: gate "e2e" failing repeatedly)

Diagnosis: false positive. The trigger counted all-time FAIL lines in Codex result files (Oct 1-5); the latest results pass. Fixed the trigger to a 2-day window (plan/PROCESS-LOG.md). No other action needed; the 850-910 queue is still the active plan.

## 2026-10-08 comprehensive review (triggers: 24 h, CI red x3, Claude idle, Codex starved, e2e gate; golden sets 2026-10-08-122501 and -132228)

**Changed since the last review:** the Claude weekly window reset, so this run collected seven finished Codex packages. Merged: 800 (integration of 770 Blue Hole first target ~100 m, 780 Titanic horizon soften, 790 hosted-CI fixes), 840 (terrain-texture fallback and dispatch bug fixes), 820 (Lost City carbonate triplanar texture and rounded flange), 810 (Monterey terrain fidelity: denser chunks near the canyon, cubic survey reconstruction, filtered detail normals). Merged then **reverted** 830 (Blue Hole wall relief) after looking at its golden. Full e2e passed on the merged main (before the 830 revert; smoke and project-base after).

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1-5:**

| Site            | Score           | Change            | Biggest gap                                                                                         |
| --------------- | --------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| Titanic         | 4/4.5/5/4/5/4   | +0.5              | Horizon now melts into haze and the hull is the brightest thing; sub is plain, seabed flat          |
| Beebe           | 4/3.5/4/4/5/4   | -0.5 (calibrated) | Seabed beyond the lit pool is a flat dark-orange plane with a hard skyline; sub pose odd (850)      |
| Great Blue Hole | 4/3/4/3.5/5/4   | same              | Target now 100 m away; walls still flat banded slabs, gallery reads as a dome (910)                 |
| Lost City       | 4/4/4/4/5/3     | same              | Tower bands soft and natural now; beehive/slab and phone framing remain                             |
| Monterey        | 4/3.5/4/3.5/5/3 | +1                | 810 terrain is smooth and natural instead of faceted; still dark teal-monochrome, few animals (860) |

**Regression caught:** 830 turned the Blue Hole slope into a camouflage patchwork of hard-edged sand blobs over brown rock and shrank the stalactite gallery. Reverted before pushing; 910 redoes it with explicit acceptance criteria.

**Play flow (first real look, from the 510 audit captures):** Home is clean and inviting (Arcade default, one filled button). Problems found: (1) the briefing is a wall of text before the first dive (4 facts, 5 hazards, objectives, mode, start choice, 3 buttons); (2) at 60 s on a 390x844 phone the scene is ~25% of the screen: sonar with legend, mission card, status card and the tutorial card cover the sub, and the same scan target appears three times; the Data chip overlaps the tutorial card; (3) the debrief says "Dive ended / Primary objectives unfinished" after a good scan and offers five actions; (4) the Journal lists seven "Unscanned target N" rows. Briefs 890 and 900 queued for (1) and (2); items 6-7 are in the Claude backlog.

**Process:** efficiency.sh: Claude idle ~120 h and Codex under-used ~112 h over the last two weeks, almost all due to the 5% weekly Claude gate on Oct 6-8 (231 skipped runs) and an empty Codex queue; the queue now holds seven briefs. New finding: `resume.sh` wrote one skip line per 30-min tick into the tracked `plan/OVERNIGHT-LOG.md`; prettier failed on those lines, which broke the prettier gate in every full run and left the tree dirty for the next run. Skips now go to `.cache/skips.log` (efficiency.sh reads both). Merge conflicts were trivial (log files, one add/add test name); unit test `montereyWallLife` times out at 15 s when three gates run in parallel, so gates run one at a time. CI on main is still red as of the last hosted run (26 min, f29+); 880 verifies after the f30 push.

**New priorities:** see DIRECTOR.md.

**Needs owner:** nothing.

## 2026-10-06 comprehensive review (triggers: 24 h, 8+ merges, tag f29, Claude idle; golden set 2026-10-06-121603)

**Changed since the last review (f27):** f28/f29 merged the 660 integration batch (590-650), 670 Titanic horizon, 680 Beebe framing, 690 Blue Hole grotto, 700 Monterey canyon read, 710 Lost City close-up texture and 720 debrief/Journal polish. Today I merged 760 (Bismarck and Hunga Tonga first targets now ~105-110 m) and 740 (tutorial Skip now fires the completion toast, plus Journal regression tests).

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1-5:**

| Site            | Score       | Change | Biggest gap                                                                            |
| --------------- | ----------- | ------ | -------------------------------------------------------------------------------------- |
| Titanic         | 4/4/5/4/5/4 | same   | Seabed haze still ends in a visible horizon line above near-black sky (780)            |
| Beebe           | 4/4/4/4/5/4 | same+  | Smoker and sub now sit side by side and read well; seabed still sparse and dark        |
| Great Blue Hole | 3/4/4/3/5/4 | +0.5   | Wall banding and ledge now give depth; scan target still 203 m away, toast stack (770) |
| Lost City       | 4/4/4/4/5/3 | +      | Banded Poseidon tower and base life now read; beehive/slab still plain at distance     |
| Monterey        | 4/4/4/3/5/3 | same   | Fractured wall reads; very dark and sparse fish in the first frame                     |

**Play flow:** still not captured by a real browser (Codex cannot launch one). The 720 polish and 740 fixes address the audit findings from source. A Claude-side Home -> site -> 60 s capture is still the top Claude item, deferred because the Claude weekly window is at ~10% until 2026-10-08 07:00.

**Process:** Claude weekly budget is the constraint (10% left), so Claude idle time is expected and not waste; Codex was starved for ~24 h because the queue was empty after 760 (fixed: three briefs queued, 770/780/790). Hosted CI on main is still red (7+ of 20 shards, run 37292557785), so brief 790 hands this to Codex with `gh` access. Watchdog trips all recovered.

**New priorities:** see DIRECTOR.md.

**Needs owner:** nothing. (Claude weekly resets Thu 2026-10-08 07:00; Codex weekly 39% left.)

## 2026-10-05 targeted review (trigger: CI red x3)

- **Diagnosis:** two stacked causes. Prettier failed on `plan/OVERNIGHT-LOG.md` and `plan/PROCESS-LOG.md` (fixed). Codex 640's shard rebalance and race fixes were never merged; I merged them (conflict only in PROCESS-LOG). Its first hosted run still failed in 12/20 shards: `--global-timeout=900000` cut each shard at 15 min ("10 did not run"), and one 240 s test timeout per shard (f-save-soak, f-flow-audit-510, f-bughunt-18, f-a11y globe, atmosphere). The hosted runner is ~2x slower than the timing file assumed.
- **Fix pushed:** global timeout 25 min. Brief 730 queued for Codex to read the next hosted run, fix leftover test races and recalibrate `tools/e2e-timings.json`. If the run after 5c8a400 is still red, shard count or the heavy soak/flow tests need trimming.
- **Needs owner:** none.

## 2026-10-05 comprehensive review (trigger: tag f27 / Claude idle; golden set 2026-10-05-054554)

**Changed since the last review (f25):** f26/f27 merged Codex 570 (thinner Titanic snow), 580 (credits and licence hit fix), 560 and Claude's Beebe/Monterey package (nearer Beebe pose, fractured Monterey boulders). Seven finished Codex packages (590-650) sit pre-merged in integration worktree 660, which is still going green; 670/680 are running.

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1-5:**

| Site            | Score       | Change | Biggest gap                                                                    |
| --------------- | ----------- | ------ | ------------------------------------------------------------------------------ |
| Titanic         | 4/4/5/4/5/4 | same   | Hull and snow now good; sky above a hard horizon band is near-black (670)      |
| Beebe           | 4/4/4/4/5/4 | +      | Seabed warmer and lit; sub now hides the nearest chimney (680)                 |
| Great Blue Hole | 3/3/4/3/5/4 | -0.5   | Flat orange wall, scan target 203 m away, toast and scan card stack at the top |
| Lost City       | 4/4/4/3/5/3 | same   | Tower carbonate reads smooth; base life sparse (600/710)                       |
| Monterey        | 4/4/4/3/5/3 | +      | Fractured boulders and wall life read well; fish sparse, wall still dark       |

**Play flow:** not observed. 620's audit has no screenshots because Codex sandboxes cannot start a browser (listen EPERM). Source findings: key strip lingers too long, "Survey" wording, nav and waypoint can pick different targets, tutorial may ask for lights while a scan is ready (all but the last two fixed in 620). A real Claude-side capture pass is backlog item 2.

**Process:** efficiency.sh shows Claude idle 43 h and Codex under-used 39 h, caused by the weekly pacing gate skipping 83 runs and an empty Codex queue (already addressed in PROCESS-LOG 2026-10-05 00:20: Codex integrates, pacing relaxed). Watchdog tripped 29 times, all recovering. Codex pass rate 85/91. New process lesson: Codex cannot verify visuals, so every Codex UI package still needs a Claude screenshot review. Queue holds 690, 700, 710; three more candidates are listed in DIRECTOR.

**New priorities:** see DIRECTOR.md (land 660 batch, real first-minute capture, Blue Hole opening, Beebe, Lost City, Journal polish).

**Needs owner:** nothing.

## 2026-10-04 comprehensive review (trigger: tag f25; golden set 2026-10-04-094934)

**Changed since the last review (f24):** only Codex 550 (toast stacks under the scan target) and the CI shard/timeout fix. Golden set is otherwise unchanged, so scores are the same as the f24 entry below (Titanic 4/4/5/4/5/4, Beebe 4/4/4/4/5/4, Blue Hole 4/4/4/4/5/4, Lost City 4/4/4/3/5/3, Monterey 4/4/4/3/5/3).

**Biggest gaps (unchanged):** Titanic snow flecks still blanket the hull and foreground with a near-black sky (570 in round 3); Beebe sub small and seabed flat (560 finished, unmerged); Lost City beehive slab (600 running).

**Play flow:** not re-captured; 510 audit spec is green, 610/620 queued.

**Process:** the real bottleneck is merge throughput, not budget. Four Codex worktrees (530, 540, 560, 580) are finished but unmerged because each merge costs a full-e2e gate run. Plan: batch-merge 540+560+580 in one run with one full-e2e. Latest CI run on main was still in progress at review time; the previous one failed at 27 min (shard timeout fix of f24 not yet confirmed; Codex 640 diagnoses). Claude weekly is 18%, so one package per run.

**New priorities:** DIRECTOR.md (item 1 now: batch-merge 540/560/580, then 530).

**Needs owner:** nothing.

## 2026-10-04 comprehensive review (trigger: tag f24; golden set 2026-10-04-082207)

**Changed since the last review (f23):** per-site opening pitch (`chaseOffsetY`), Blue Hole spawn 22 m below the ledge, west alcove close pose, Monterey fan palette (f24).

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1-5:**

| Site            | Score       | Change | Biggest gap                                                                                           |
| --------------- | ----------- | ------ | ----------------------------------------------------------------------------------------------------- |
| Titanic         | 4/4/5/4/5/4 | same   | Snow flecks still blanket the hull and foreground (570 running); sky above the haze near-black        |
| Beebe           | 4/4/4/4/5/4 | same   | Sub small in frame; seabed flat and dark (560 finished, unmerged); plumes good                        |
| Great Blue Hole | 4/4/4/4/5/4 | +0.25  | Shot 1 now shows sub, wall bands and ledge with the stalactite gallery target; toast still left (550) |
| Lost City       | 4/4/4/3/5/3 | same   | Beehive chimney is a smooth white slab, no base life (600 queued)                                     |
| Monterey Canyon | 4/4/4/3/5/3 | +0.1   | Pinks in the fans read well; a hex boulder still reads fake                                           |

**Play flow:** not re-captured (Claude weekly 18%). The 510 audit spec covers Home, site pick, first minute, Journal and debrief and is green on main. Codex 610 (portrait/low tier) and 620 (first-minute audit) now cover the gap.

**Process:** CI has been red on main for ~6 pushes in a row because 7 of 16 e2e shards hit the 20-min global timeout (the suite grew with the 510/520 verification specs); the failures are timeouts, not test failures. Fixed in ci.yml: 20 shards, 26-min global timeout, 30-min job timeout (logged in PROCESS-LOG). Efficiency idle numbers are mostly budget-gate skips (48 of 50). Three Codex worktrees (540-560) finished but sat unmerged since the last review; merging them is now item 1.

**New priorities:** see DIRECTOR.md.

**Needs owner:** nothing.

## 2026-10-04 comprehensive review (trigger: tag f23; golden set 2026-10-04-062459)

**Changed since the last review (f22):** Blue Hole spawn now inside the hole with a banded wall and lighter alcoves (f23); Codex 510 (Journal/debrief fixes plus a 15-flow audit spec) and 520 (verification specs) merged. 530 still waits on Codex 580.

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1-5:**

| Site            | Score       | Change | Biggest gap                                                                                                         |
| --------------- | ----------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| Titanic         | 4/4/5/4/5/4 | same   | Snow flecks still blanket the hull and foreground (570); far field near-black                                       |
| Beebe           | 4/4/4/4/5/4 | same   | Sub small in frame; flat dark seabed (560 running); plumes good                                                     |
| Great Blue Hole | 4/4/4/3/5/4 | +0.25  | Sub now in the hole and the banded wall reads. Toast still in the left column (550), spawn pitch fixed by pose only |
| Lost City       | 4/4/4/3/5/3 | same   | Beehive chimney is a smooth white slab, no life at the base (600)                                                   |
| Monterey Canyon | 4/4/4/3/5/3 | same   | Wall bands and corals good; coral is flat white, a hex boulder reads fake                                           |

**Play flow:** Not re-captured this run (budget: Claude weekly 20%). The 510 audit spec covers Home, site pick, first minute, Journal and debrief and is green on main. Known open items: the "Animal nearby" toast crowds the left column on the open-water sites, and Lost City/Monterey close shots are tight cockpit views with little context.

**Process:** efficiency's ~23 h Claude idle and ~22 h Codex under-used are mostly stale: they were budget-gate skips (48 of 50 skips), and Codex now has 540/550/560 running with 570-600 queued. Claude weekly is 20%, so Claude packages are rationed to one per run. CI on the f23-era main push is the last failure (21 min); the run on the newest commit was still in progress at review time. No tooling change needed.

**New priorities:** see DIRECTOR.md.

**Needs owner:** nothing.

## 2026-10-04 comprehensive review (trigger: tag f22; golden set 2026-10-04-031944)

**Changed since the last review (f20):** Monterey banded canyon wall and wall-life golden poses (f22), Codex 480/490/500 merged (rebrand verify, Lost City camera, CI hud-tips stability), vent haze config deduped.

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1-5:**

| Site            | Score       | Change | Biggest gap                                                             |
| --------------- | ----------- | ------ | ----------------------------------------------------------------------- |
| Titanic         | 4/4/5/4/5/4 | same   | Snow flecks still dense over the lower hull (570)                       |
| Beebe           | 4/4/4/4/5/4 | same   | Seabed dark brown, sub small in frame; plumes good                      |
| Great Blue Hole | 4/4/4/3/5/4 | same   | Spawn frame is a flat sand wall with one dome; toast in left column     |
| Lost City       | 4/4/4/3/5/3 | same   | Tower and flanges strong; slope banding still faint; no tower-base life |
| Monterey Canyon | 4/4/4/3/5/3 | +0.25  | Pose 3 now a strong banded wall with corals; walls still flat-shaded    |

**Play flow:** The "Animal nearby" toast still crowds the left column on Blue Hole and Lost City (Codex 550 queued). Codex 510 (Journal/debrief audit) and 520/530 (verification) are finished but unmerged; 510 could not render in the Codex sandbox, so its visual claims are unreviewed until the merge gates capture the PNGs.

**Process:** efficiency shows ~22 h Claude idle and ~21 h Codex under-used, almost all budget-gate skips (Claude weekly 22%, Codex 5h floors); not a scheduling bug. CI on f21 failed (20 min shard run); the in-progress run on the latest main is the check for Codex 500's stability fix. Codex 5h is 4% until the 00:00 reset, so no Codex launches this run.

**New priorities:** see DIRECTOR.md (Blue Hole spawn, Lost City banding, Beebe sub scale, Titanic, debrief polish, merge 510/520/530).

**Needs owner:** nothing.

## 2026-10-04 comprehensive review (trigger: tag f20; golden set 2026-10-04-020114)

**Changed since the last review:** HUD attribution footer chip (the 5-line GMRT citation is gone, Titanic shot 1 is much cleaner), touch 150% overlap fix, Titanic far-field lift and thinner snow (460), vent haze gating.

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1-5:**

| Site            | Score       | Change | Biggest gap                                                         |
| --------------- | ----------- | ------ | ------------------------------------------------------------------- |
| Titanic         | 4/4/5/4/5/4 | +0.5   | Snow flecks still dense over the lower hull; far field near black   |
| Beebe           | 4/4/4/4/5/4 | same   | Seabed dark brown, sub small in frame                               |
| Great Blue Hole | 4/4/4/3/5/4 | same   | Spawn frame flat sand wall with lone dome; toast crowds left column |
| Lost City       | 4/4/4/3/5/3 | same   | Tower strong; banding faint                                         |
| Monterey Canyon | 4/3/4/3/5/3 | same   | Wall still a ribbed slab; toast crowds left column                  |

**Play flow:** HUD footer is clean now. Remaining clutter: "Animal nearby" toast (Codex 550). Audit 510 (journal/debrief) still running; not re-reviewed by me this run.

**Process:** efficiency idle figures are dominated by the earlier Claude weekly squeeze (budget-gate skips); Codex had 4 tasks running. CI on main still red on some pushes (Codex 500 triage pending merge). No Claude package this run (weekly 23%).

**New priorities:** see DIRECTOR.md. Queued Codex 550 toast, 560 Beebe seabed, 570 Titanic snow alongside 540.

**Needs owner:** nothing.

## 2026-10-03 evening comprehensive review (trigger: tag f19; golden set 2026-10-04-002012)

**Changed since the night review:** Lost City surroundings (textured slope, talus, flanges) and Beebe plume variety (per-vent width/lean, current bend, haze), both in f19.

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1-5:**

| Site            | Score       | Change | Biggest gap                                                          |
| --------------- | ----------- | ------ | -------------------------------------------------------------------- |
| Titanic         | 4/4/4/4/5/4 | same   | Dense marine snow over the ship; far field near black (460)          |
| Beebe           | 4/4/4/4/5/4 | +0.5   | Plumes now varied and bent; seabed near black-brown, sub reads small |
| Great Blue Hole | 4/4/4/3/5/4 | same   | Spawn frame mostly flat sand wall; grotto a dark mound               |
| Lost City       | 4/4/4/3/5/3 | +0.5   | Tower big and clear, slope textured; banding faint                   |
| Monterey Canyon | 4/3/4/3/5/3 | same   | Wall smooth slab; poses 2/3 auto-pick wall backs                     |

**Play flow:** unchanged from the last review; the 5-line GMRT citation and the "Animal nearby" toast still crowd the HUD (450 footer and a Claude toast package queued). Audit 510 pending.

**Process:** CI on main is still red or cancelled on rapid pushes (500 triages). Claude weekly 24%, so no new Claude package this run; Codex has 6 briefs queued and 3 stalled worktrees. Efficiency idle figures before today are overstated (sampler fix, see PROCESS-LOG).

**New priorities:** see DIRECTOR.md (Monterey poses/wall, Blue Hole spawn, toast, Titanic lift, Beebe seabed, Lost City banding).

**Needs owner:** nothing.

## 2026-10-03 night comprehensive review (triggers: 8+ merges, tag f18; golden set 2026-10-03-230949)

**Changed since the late review:** Lost City Arcade opening camera (400), touch HUD fixes (395), e2e stability (390/420), Bathyline rebrand (mark, icons, share image), CI life-scan fix. No visual-site changes except Lost City camera; no new golden run needed (the set was taken at f18).

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1-5 each:**

| Site            | Score       | Change | Biggest gap                                                                         |
| --------------- | ----------- | ------ | ----------------------------------------------------------------------------------- |
| Titanic         | 4/4/4/4/5/4 | same   | Dense bright marine snow over the ship; far field near black (460 queued)           |
| Beebe           | 4/4/4/4/5/4 | same   | Plumes still evenly spaced uniform columns; no lean/width variety                   |
| Great Blue Hole | 4/4/4/3/5/4 | same   | Spawn frame is mostly flat sand wall; grotto reads as a small dark mound            |
| Lost City       | 4/3/4/3/5/3 | +1     | Tower now large and readable; slope is bare brown, corals look pasted on            |
| Monterey Canyon | 4/3/4/3/5/3 | same   | Wall reads as a canyon but is a smooth green slab; pose 2 sits inside the hull ring |

**Play flow:** unchanged. Persistent clutter: 5-line GMRT citation (450 hud footer queued) and the "Animal nearby" toast at top-left under the sonar. Audit queued as 510.

**Process:** CI on main has been red on nearly every push (e2e shards failing on `.hud-control-tips` stability, content-missions and software-GL toBeVisible timeouts); the run on the newest main sha was still in progress at review time. Queued 500 to triage real regressions vs flakes. Codex at its 5% floor until 21:15; worktrees 450 hud/450 triage/460 stalled with uncommitted work, 6 briefs queued so it will not idle. Claude 96% 5h but weekly 26%, so at most 2 packages.

**New priorities:** see DIRECTOR.md (Lost City surroundings, Beebe plume variety first).

**Needs owner:** nothing blocking.

## 2026-10-03 15:30 — targeted review (false positive: "Claude idle ≥ 50% for 2 h")

- Claude was not idle: runs started 13:26, 14:08, 14:28, 14:57 and 15:15 (merges f16, f17, Monterey canyon and polish, Blue Hole). The sampler missed them because it matched only `claude -p Resume Submarine…` and review-run prompts start differently; runs are also short compared with the 30-min sampling.
- Fixed `tools/usage-sample.sh` and `tools/review-triggers.sh` (see PROCESS-LOG). Idle-hours figures in `efficiency.sh` before today are overstated.
- Real constraint: Codex is at its 5% floor until 15:45, so worktrees 390/395/400 are stalled and 8 briefs are queued (the queue is not dry). Claude weekly is 31%, so no new Claude package was started this run. CI on main was still running the f2-life scan fix (Codex 440 queued).
- Needs owner: nothing.

## 2026-10-03 late comprehensive review (trigger: tag f17; golden set 2026-10-03-195811)

**Changed since the evening review:** Monterey flanking canyon walls and wall life, Blue Hole strata banding / alcoves / second grotto (f17). Beebe plumes (f16) already scored.

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1-5 each:**

| Site            | Score       | Change | Biggest gap                                                                  |
| --------------- | ----------- | ------ | ---------------------------------------------------------------------------- |
| Titanic         | 4/4/4/4/5/4 | same   | Snow clutter and near-black far field (460)                                  |
| Beebe           | 4/4/4/4/5/4 | same   | Plume variety: lean, width, haze                                             |
| Great Blue Hole | 4/4/4/3/5/4 | +1     | Spawn pose shows a flat water surface; east grotto shelf tops are pale slabs |
| Lost City       | 3/3/3/3/5/3 | same   | Tower reads; slope around it is bare brown; 400 camera work still unmerged   |
| Monterey Canyon | 4/3/4/3/5/3 | +1     | Now reads as a canyon; wall sponges are pale cups; west wall faint           |

**Play flow:** unchanged. Remaining clutter: 5-line GMRT citation (Codex 450) and the "Animal nearby" toast overlapping the sonar legend on 1600x900 (visible in every golden frame; the toast sits under the legend, so it is cramped rather than overlapped, but still the first thing on screen).

**Process:** Claude 5h at 64% with nothing unblocked is the recurring pattern: Lost City and toast work wait on Codex worktrees 400/395 that are stalled at the 5% Codex floor until 15:45. Fix: Claude packages are now picked to avoid files owned by stalled worktrees (Monterey this run). CI on main still red from the `f2-life` scan test (Codex 440 queued, fail-fast off). 8 Codex briefs queued, so Codex will not idle after reset.

**New priorities:** see DIRECTOR.md.

**Needs owner:** nothing blocking.

## 2026-10-03 evening comprehensive review (trigger: tag f16; golden set 2026-10-03-190819)

**Changed since the last review (same day):** Blue Hole spawn dome fixed (seated alcove, stepped ledge), Beebe billowing plumes merged (f16), CI `fail-fast` turned off.

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1–5 each:**

| Site            | Score       | Change | Biggest gap                                                              |
| --------------- | ----------- | ------ | ------------------------------------------------------------------------ |
| Titanic         | 4/4/4/4/5/4 | same   | Foreground marine snow still big and bright; far field near black (460)  |
| Beebe           | 4/4/4/4/5/4 | +1     | Plumes are tall uniform columns; no flow variation or lit hot-water haze |
| Great Blue Hole | 4/3/4/3/5/4 | +2     | Wall is flat tan; rim apron smeared; floor plain                         |
| Lost City       | 3/3/3/3/5/3 | +1     | Tiered tower reads, but surroundings are bare brown slope, milky light   |
| Monterey Canyon | 3/3/4/3/5/3 | same   | Still a lone striated mound, no opposing wall or depth fall-off          |

**Play flow:** unchanged from the morning review. Clutter remains the 5-line GMRT citation block on every frame (450 queued) and the "Animal nearby" toast overlapping the sonar legend on 1600x900.

**Process:** CI is still red on every main push (shard 12, `f2-life` scan test timing out on the software-GL runner). Because `fail-fast` was true, other shards were hidden; now false, so the next push shows the full picture. Codex 440 owns the real fix. Codex 5h is at the 5% floor until 15:45, so 390/395/400 worktrees are stalled with uncommitted work; they resume from the queue after reset. Claude idled ~17 h and Codex ~19.5 h earlier in the day (already logged and fixed in PROCESS-LOG).

**New priorities:** see DIRECTOR.md (Monterey canyon first, then Lost City surroundings, Blue Hole wall, Beebe plume variety, Titanic lift).

**Needs owner:** nothing blocking.

## 2026-10-03 comprehensive review (trigger: tag f15)

**Changed since the last review:** first review. Since 2026-10-02: title screen (Bathyline), touch/short-landscape fixes, share image, readability unit tests for all 5 heroes, bughunts 13/14.

**Per-site scores (readable / beautiful / simple / rewarding / honest / phone), 1–5 each, from golden set 2026-10-03-175107:**

| Site            | Score       | Biggest gap                                                     |
| --------------- | ----------- | --------------------------------------------------------------- |
| Titanic         | 4/4/4/4/5/4 | Foreground marine snow too big and bright; far field near black |
| Monterey Canyon | 3/3/4/3/5/3 | Reads as a lone mound, not a canyon; thin life on the wall      |
| Beebe           | 3/3/4/3/5/3 | Plumes are smooth grey funnels, not billowing smoke             |
| Great Blue Hole | 2/3/4/2/5/3 | Floating dark dome prop at spawn; flat floor                    |
| Lost City       | 2/2/3/2/5/3 | Close-up tower is a smeared white blob (Codex 400 in flight)    |

**Play flow:** Home (Dive sites / Arcade-Realistic cards) is clear and phone-OK. Debrief is clear and rewarding, with real next steps. Clutter: the 5-line GMRT citation block bottom-right on every frame (queued 450 HUD footer).

**Process:** Claude idled ~16 h and Codex was under-used ~19.5 h before the 2026-10-03 fixes (see PROCESS-LOG). CI has been red on every main push since 13:40; cause found: `f2-life.spec.ts:116` scan test times out on the runner (20 s), and fail-fast hides other shards. Queued 440 to fix it. Codex 5h is at the 5% floor until 15:45, so worktrees 390/395/400 are stalled and will resume from the queue then.

**New priorities:** see DIRECTOR.md (Blue Hole spawn, Lost City, Beebe plumes, Monterey canyon, Titanic lift). Codex: 440 CI fix, 450 attribution footer, 460 snow audit added to 410/420/430/rebrand/site-triage.

**Needs owner:** nothing blocking. Optional: a real logo/mark for Bathyline (the share image still uses the draft mark).
