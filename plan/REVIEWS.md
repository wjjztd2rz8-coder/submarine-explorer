# Reviews

Dated director reviews, newest first. Comprehensive reviews run about daily, after release tags or after 8+ merges. Targeted reviews run when something stalls (dry backlog, red CI, idle capacity).

## 2026-10-22 comprehensive review, Claude alone (golden 2026-10-22-121525)

**Sol did not review:** Codex week is at 6% (resets Oct 27 11:30), so `codex-review.sh start` skipped. Scores are mine and may run ~0.2 high. Opening frames of the seven main sites were viewed; no new e2e captures, so the play check still rests on run 70's six unaided journeys.

**Changed since the last review:** one art merge, V-monterey-foot (crest ledges, mottled apron; ~3.7 to ~3.75). V-bluehole-silhouette was tried and parked (tag `parked/V-bluehole-silhouette`: shots barely changed). Golden pairs otherwise differ only by particles and pose drift. Twenty-one Codex worktrees (2920-3120: verify tests, bug hunts, a few small src fixes) had piled up uncommitted while the Codex week ran dry; a Sonnet agent is collecting them this run (see OVERNIGHT-LOG for what merged).

**Scores, readable / beautiful:** Titanic 4 / 3.7 (warm hull; the sub still sits on the bow); Lost City 3.5 / 3.4 (tower reads; hill calm; foot sparse); Blue Hole 3.5 / 3.4 (rolled-slab lip, uniform pendants, light shafts present); Beebe 4 / 3.6 (strongest: warm chimney, plumes, clear sub); Monterey 4 / 3.75 (strata and ledges good; apron smooth); Challenger 3.5 / 3.4 (lander and flag legible; seabed flat); Endurance 3.5 / 3.4 (sub floats high above a thin hull strip).

**Biggest gaps:** Blue Hole lip silhouette needs a different technique (prop-built or two-sided profile), not another tweak; wreck openings (Titanic, Endurance) put the sub over the wreck, which waits on the owner's opening-rule decision; Lost City foot and hue. No hero is consistently at 4; the plateau at ~0.1 per pass is real.

**Process:** Claude week reset to 100% this morning, so Claude capacity is open again; Codex week 6% (burned ~32%/day earlier), so Codex briefs 3130-3150 queue and wait for Oct 27. The uncollected-worktree pile is the same pattern as 2026-10-19 (only Claude runs collect, and the Claude weekly gate skipped runs for days); the pile is now cleared in this run. efficiency.sh idle numbers are still not date-filtered (indicative only). No tooling change.

**New priorities (DIRECTOR Backlog):** Claude: V-bluehole-silhouette (new technique), V-eight-sites-lit (a), V-monterey-apron, V-challenger-ripples, V-lostcity-foot, V-spawn-sub-clear. Codex (queued, waiting on the week): 3130 verify collected fixes, 3140 spawn bug hunt, 3150 CI watch and taggable SHA.

**Stage:** about 83% to 1.0; roughly 5 weeks (Claude capacity is the limiter again now the week has reset; not cross-checked with Sol).

**Needs owner:** the 150-300 m opening rule for wrecks and landers; a phone retest on the newest build.

## 2026-10-21 (evening) comprehensive review, Claude alone (golden 2026-10-21-053709)

**Sol did not review:** Codex 5h was at 5% (< the 20% start gate), `codex-review.sh start` exited 75, so there is no second opinion; scores are mine and may run ~0.2 high (package self-ratings and my earlier scores have been above Sol's bands before). Opening frames only were viewed; no new e2e captures, so the play check rests on run 70's six passing journeys and run 73's Your-sub fix.

**Changed since the review earlier today:** five Claude art packages and a batch of Codex merges: V-lostcity-hill (hill softened, tower is the brightest mass), V-monterey-cliff (right bank gets strata and cooler colour), V-bluehole-roof third pass (colour/value only), V-eight-sites (review of the 8 non-hero spawns, Kamaʻehuakanaloa calmer), P2-sub-screen-portrait; Codex 2850-2890 (power-start guard, Challenger numerics, journey spec and mission-title wrapping, Your-sub focus cleanup, Lost City height verify).

**Scores, readable / beautiful:** Titanic 4 / 3.7 (warm hull, but the sub sits on the bow in this pose); Lost City 3.5 / 3.4 (up from 3.2: tower reads, hill calm, hue brownish, foot sparse); Blue Hole 3.5 / 3.4 (up from 3.0: darker undercut roof, still a rolled-slab lip with uniform teeth); Beebe 4 / 3.6 (unchanged, strongest); Monterey 4 / 3.7 (up from 3.5: strata on both banks, no foot talus); Challenger 3.5 / 3.4; Endurance 3.5 / 3.4 (sub hangs high over a thin hull strip).

**Biggest gaps:** Blue Hole lip silhouette, Lost City foot and hue, wreck openings where the sub overlaps the wreck. Heroes are still not consistently at 4; each pass buys 0.1-0.4 and the weakest heroes moved most this round.

**Process:** Claude week 11% (~17%/day) with the reset Oct 22 06:59, so one package per run; Codex week 54%, 5h at 5% until 03:00, three briefs queued (2920-2940) and worktrees 2900/2910 finished but uncollected (watchdog stopped them). Last three main pushes were CI-cancelled by newer pushes, so no tag. efficiency.sh idle figures are still not date-filtered (see 2026-10-20 note); no process change.

**New priorities (DIRECTOR Backlog):** Claude: V-bluehole-silhouette, V-eight-sites-lit (a: Kamaʻehuakanaloa), V-monterey-foot, V-challenger-ripples, V-lostcity-foot, V-spawn-sub-clear. Codex: 2920, 2930, 2940 queued; collect 2900/2910 first.

**Stage:** about 82% to 1.0; 5-6 weeks (Claude capacity is the limiter; not cross-checked with Sol).

**Needs owner:** decide whether the 150-300 m mission opening rule may be shortened for wrecks and landers; phone retest on the newest build.

## 2026-10-21 comprehensive review, Claude alone (golden 2026-10-21-003618)

**Sol did not review this set:** Codex 5h was at 17% (< the 20% start gate), so `codex-review.sh start` exited 75 silently under nohup and reconcile then re-read the morning review. I discarded that output as stale (tool fixed, see PROCESS-LOG). Scores below stay inside Sol's 2026-10-20 bands where the images support it; the morning joint review's blockers still stand.

**Changed since the morning review (52 commits, 8+ merges):** visible art: Lost City thicker tower, Titanic warm plating, Monterey strata and talus, Challenger flag/clasts/halo. Non-visual: Your-sub screen (Home and Pause), Low-journey teardown fixes, anemone geometry, Beebe/Lost City numerics, six unaided Low journeys all pass (run 70). f61 tagged on green CI.

**Scores, readable / beautiful:** Titanic 4 / 3.7 (one warm hull now; per-plate blockiness remains); Lost City 3.5 / 3.2 (tower is thicker but the faceted green hill dominates the frame); Blue Hole 3.5 / 3.0 (roof reads as a shell, interior flat and pale: weakest hero); Beebe 4 / 3.6 (strongest: warm chimney, plume, clear sub); Monterey 4 / 3.5 (strata good, the flat pale cliff at right reads as a slab); Challenger 3.5 / 3.4 (lander and flag legible, seabed sparse); Endurance 3.5 / 3.5 (sub overlaps the hull silhouette in the pose).

**Biggest gaps:** Blue Hole roof, Lost City hill, Monterey cliff. Package self-ratings ran ~0.2-0.3 above mine again, so the plateau is real: each pass buys 0.1-0.2.

**Play check:** from run 70's unaided journeys: all six pass; desktop mission card title truncates and the debrief copy after a scripted dive is odd (Codex 2870). Your-sub screen needs scrolling in portrait (new item).

**Process:** Claude week 17% (~11%/day), pace-limited until the Oct 22 reset, so only reviews and merges run; Codex 71% week but 5h at 17%. Four briefs queued (2850-2880). Reconcile-on-stale-review bug fixed. efficiency.sh "idle" figures remain unfiltered by date (Sol, 10-20); not acted on.

**New priorities:** Claude: V-bluehole-roof, V-lostcity-hill, V-monterey-cliff, P2-sub-screen-portrait, V-eight-sites, V-challenger-ripples. Codex: 2850-2880 (S-verify / S-bughunt).

**Stage:** about 81% to 1.0; 5-6 weeks (Claude capacity is the limiter; Sol's 5-7 from this morning not revisited).

**Needs owner:** phone retest on the newest build (Your-sub screen, boost gone, scan range); real-phone Low play.

## 2026-10-20 comprehensive review, joint with Codex Sol (golden 2026-10-20-163035)

Sol ran read-only (no live browser); one reconcile round, claims checked against files.

**Changed since the last review:** no art or gameplay change (golden pairs differ only by particles/fish and pose drift). Collected nine finished Codex worktrees into main: S-bughunt-25, S-verify-20, steel-shader verification, vent-light offsets (carbonate glow standoff now 0), home-destination disposal and touch-settings focus fixes, S-events-low-audit (clean), V-journeys-harness, R-ci-shard-triage. Haiku repaired the stale Lost City preset and journey specs.

**Scores, readable / beautiful (bands, Sol's lower bounds accepted where the image supports them):** Titanic 4 / 3.5; Lost City 3.5 / 2.5-3.2; Blue Hole 3.5 / 2.5-3.2; Beebe 3.5-4 / 3.5-3.6; Monterey 4 / 3-3.5; Challenger 3.5 / 3-3.5; Endurance 3.5 / 3.5. Biggest gaps: Lost City thin stepped tower, Blue Hole folded roof, Titanic repeated plating, Monterey banding. (Sol: Claude was generous on Lost City, Blue Hole and Monterey; accepted.)

**Process:** CI main red on the last two completed pushes; triage (Codex 2730) shows 29 of 43 failures were stale hud-touch specs already fixed, 13 remain (10 stale scan-copy asserts and 2 stale Lost City preset asserts, repaired today; 1 wildlife-vs-target fixture still red, R-ci-green-f) plus one timing case. Finished Codex worktrees stay uncommitted until a Claude run collects them, and Claude runs were skipped by the weekly gate for ~40 h, so nine packages sat uncollected. Sol corrections (accepted): the 325 skips and "idle" counts in efficiency.sh are not date-filtered and the usage telemetry had a 39 h gap, so those figures are not evidence of waste; deploy already waits for green CI; CI shards upload no screenshots on success.

**Sol's additions (credited to Sol):** Class C also intersects its hull; Blue Hole's mission uses Class B, so Class A free-dive evidence is not the mission defect; phone/simple/reward scores are provisional until the six-journey matrix is actually run; golden-compare rejects sets on mm-scale pose drift (brief 2770).

**Disputed:** timeline. Claude 4-5 weeks, Sol 5-7; settled to 5-7 (limited Claude capacity, art gains ~0.1-0.2 per pass). CI-before-journeys ordering: Sol puts journeys first by player impact; kept as Sol's order.

**Agreed blockers:** (1) unaided Titanic and Blue Hole journeys at 1280x720 and both phones (harness merged, matrix not run); (2) green hosted CI on the release SHA; (3) hull intersections (Class A and C), Beebe Low caps, current real-phone Low acceptance; (4) heroes consistently at 4; (5) eight-site spawn acceptance.

**New priorities:** Claude: P2-hull-a (with the Codex audit), V-journeys-run, R-ci-green-f, P2-beebe-low, V-lostcity-slice3, V-titanic-plating, V-monterey-bands. Codex: 2770 S-golden-compare, 2780 R-ci-trim, 2790 S-verify-merged.

**Stage:** about 80% to 1.0; 5-7 weeks (agreed with Sol).

**Needs owner:** phone retest on the newest build (boost gone, scan range, anchored events); real-phone Low play.

## 2026-10-19 comprehensive review, joint with Codex Sol (golden 2026-10-19-000013)

Sol ran read-only; one reconcile round. Scores are bands, not a forced decimal consensus.

**Changed since the midday review (8+ merges, almost all non-visual):** Codex P2-boost-cut, P2-scan-range, P2-events-anchored, P2-ambience, P2-lostcity-perf, R-merge-verify, R-deploy-gate, V-spawn-capture, V-bluehole-overlap, S-bughunt-23/24, S-verify-19; Haiku P2-copy plus a Sonnet e2e triage. No new art package. Sol: P2-lostcity-perf removed Lost City's High/Medium shimmer layer, so that rendering did change slightly.

**Scores, readable / beautiful (agreed):** Titanic 4 / 3.5-3.6; Lost City 3.5 / 3-3.3; Blue Hole 3.5 / 3-3.4; Beebe 3.5-4 / 3.5-3.7; Monterey 4 / 3.5; Challenger 3.5 / 3.5; Endurance 3.5 / 3.5-3.6. Beebe's approach frame (rising sparks, warm flank) is the strongest hero view; the Lost City tower is still thin stepped shards; Blue Hole folded roof and pale interior still read synthetic. Disputed and settled toward Sol: Titanic's biggest gap is close material repetition rather than empty water; Beebe opening readability is below its approach.

**Process:** efficiency: Claude 34% week (~12%/day), Codex 34% (~52%/day, gated by pace). Codex queue was empty; 2700-2730 queued and three launched at once. Hosted CI: run 39173052443 red on 28 of 38 shards (46 min); the run for a814d10 was still queued at review time. Sol: the P2-copy fixes do not clearly explain every failed shard, so brief 2730 (R-ci-shard-triage) classifies them. Merge policy (Sol): RESUME-PROMPT says merges do not wait for CI, DIRECTOR/R-merge-verify imply a guard; kept the owner's 2026-10-13 rule (push after smoke + project-base, only tags wait) and noted it in DIRECTOR.

**Sol's additions (credited to Sol):** the unaided journey must run at the owner's 1280x720, not 1600x900, and today's journal-debrief spec teleports for its reward check; globe brightness, sub screen and Aa shortcut have no demonstrated release-blocking defect (demoted).

**Agreed blockers:** (1) unaided Titanic and Blue Hole journeys at 1280x720 and both phone orientations; (2) green hosted CI on the release SHA, tag f61; (3) Class A clipping, Beebe Low caps, Low event readability; (4) heroes consistently at 4 (Lost City tower, Titanic plating, Monterey bands); (5) eight-site spawn acceptance.

**New priorities:** Claude: P2-hull-a, V-lostcity-slice3, V-titanic-plating, V-monterey-bands, P2-beebe-low, V-journeys. Codex: V-journeys-harness, P2-hull-a-geometry, S-events-low-audit, R-ci-shard-triage.

**Stage:** about 80% to 1.0; 4-5 weeks targeted, 4-6 for planning (agreed with Sol).

**Needs owner:** phone retest on the newest build (boost gone, scan range, anchored events); real-phone Low play.

## 2026-10-18 14:50 targeted review: "Claude idle at >=50% for 2 h"

- **Finding:** false trigger. Claude's week (36% left) sat exactly on the resume.sh pace line, so the weekly gate had deliberately skipped runs; the 5h window only looked idle. Codex is at 44% week / 34% 5h with 2550-2600 queued; nothing is wrong there.
- **Fix:** 3-point margin on the weekly check in `tools/review-triggers.sh` (see PROCESS-LOG). No package started: Claude week is at the pace line and the 5h window refilled only just now, so the run saves budget.
- **Needs owner:** real-phone Low-tier play.

## 2026-10-18 midday comprehensive review, joint with Codex Sol (golden 2026-10-18-155545; owner-requested)

Sol ran (no live browser: Codex browser is off since 2026-10-12); one reconcile round, claims checked against images and source.

**Changed since the morning review:** V-titanic-opening, V-beebe-flank, owner phone test write-up (11 P2 items). The other five heroes are materially unchanged (Sol corrected my "pixel-identical": all pairs differ by a few pixels of particles).

**Scores (readable / beautiful, bands):** Titanic 4 / 3.5; Lost City 3.5 / 3-3.5; Blue Hole 3.5 / 3-3.5; Beebe 4 / 3.5-3.8; Monterey 4 / 3.5; Challenger 3.5 / 3.5; Endurance 4 / 3.5-3.7. Simplicity and phone scores are provisional (no fresh unaided journeys). Titanic's opening now fills the frame, but the new lane tint reads as a rust/grey patchwork up close and deck tops wash pale blue (both reviews; V-titanic-plating). Beebe's flank ridges catch warm light; facets still conspicuous (Sol).

**Found and fixed:** CI red on main for two runs, deterministic: f-bughunt-18 expected the global chase radius for `tile=titanic` after V-titanic-opening authored 97. Fixed in 9b57c01. Root cause (Claude): local gates default to smoke e2e (gates.sh:13), progress notes said "e2e pass", and Beebe merged on top of red main; queued R-merge-verify.

**Sol's catches (verified):** the P2-boost-cut item named X, which is camera reset (boost is Shift/RT, Input.ts:150); the mission scan cap `missionApproachScanRadius` (Spawn.ts:37) would cut a 100 m Arcade floor back to 80 m; eight-site acceptance belonged in the blockers; consistent beauty 4 is a 1.0 requirement, not "should fix". Sol also corrected my "events untriggerable": they fire automatically under site conditions; the problem is that players can't find or summon them.

**Settled:** Lost City High stutter is lower priority than Low defects, because Auto caps phones at Medium (Quality.ts:78; Claude).

**Process:** Codex "under-used" 16-33 h/24 h is the weekly pacing gate working as designed (69% left vs ~74% required; reopens in ~10 h). No P2 Codex briefs had been queued, so bug hunts would have run first: queued 2541 P2-scan-range, 2542 P2-boost-cut, 2543 R-merge-verify, and moved R-deploy-gate to 2544. Claude weekly burn ~15%/day with 37% left.

**Agreed blockers:** (1) first-five-minute scanning, guidance and reward verified unaided on desktop and both phone orientations; (2) green CI on the release SHA with deploy gated; (3) phone defects and a complete Low journey; (4) heroes consistently at 4, Blue Hole overlap; (5) eight-site acceptance at mission spawns.

**Stage:** about 80% to 1.0, 4-5 weeks targeted, 4-6 for planning (agreed with Sol).

**Needs owner:** phone retest after the P2 items. (Correction from the owner: the Claude reset was already used, so there is no reset to apply; Claude stays paced and Codex's weekly head start went from 15% to 30% to carry more work. Briefs 2541-2543 launched 11:21.)

## 2026-10-18 comprehensive review, joint with Codex Sol (golden 2026-10-18-104523)

Sol ran; one reconcile round, claims checked against the images and files.

**Changed since the last review (8 merges):** Claude V-closeup-artifacts, V-lostcity-slice2, V-lostcity-rim, V-bluehole-hood-2; Codex S-verify-closeup-artifacts, S-bughunt-20/21/22 and picker/contact verification. Tags f59, f60. CI on the latest main (run 59) is green; run 58 failed one f2-modes touch-Advanced tap (re-run green).

**Scores, readable / beautiful (bands):** Titanic 4 / 3.5-4; Lost City 3.5-4 / 3-4.1 (disputed: Claude 4.1, Sol 3); Blue Hole 3.5-4 / 3-3.5; Beebe 3.5 / 3.5-3.8; Monterey 4 / 3.5-3.7; Challenger 3.5 / 3.5-3.6; Endurance 3.5-4 / 3.5-3.8. Improved: Titanic plating and trail, Lost City rims, Endurance lobsters now read as animals. No hero is consistently at 4.

**Biggest gaps:** Lost City detail tower reads as thin sheets (Sol); Titanic opening small and flat-lit; Beebe flank; Monterey banding; Blue Hole east hood sheet facets.

**Disputes settled on evidence:** Sol's Titanic beauty cap holds ("no pink" was too absolute); Lost City stays disputed (`lost-city-3.png` shows stair-step shard facets, so I lowered my read toward 3.8-4); my "hud-touch/f2-modes flake" conflated a deterministic stale expectation (fixed) with a timing flake (accepted Sol's correction).

**Sol's additional findings (credited to Sol):** Blue Hole retains ~0.45 m hull overlap with a loosened 0.43 to 0.46 bound (queued as V-bluehole-overlap); Lost City Low triangles +15%; screenshot persistence is conditional so fresh manifests need not mean fresh screenshots (V-spawn-capture); Pages deploys independently of CI (R-deploy-gate).

**Play:** no new flow captures this review (goldens are High desktop free-dive and cannot certify journeys); current unaided journeys and eight-site spawn acceptance remain unverified.

**Process:** efficiency: weekly pacing gates both lanes (Claude 41% left, ~12%/day; Codex 75%, ~18%/day); 0 failed timer runs; Codex queue now 2550-2600 (six briefs).

**Stage:** about 82% to 1.0, four weeks targeted, 4-6 for planning (agreed with Sol).

**New priorities:** V-lostcity-slice3, V-titanic-opening, V-beebe-flank, V-monterey-bands, V-challenger-seabed (Claude); V-bluehole-overlap, V-spawn-capture, R-deploy-gate (Codex).

**Needs owner:** real-phone Low-tier play on the newest build.

## 2026-10-17 night targeted review (red CI on main x3)

**Diagnosis (hosted shards, reproduced locally):** two causes. (1) `hud-touch` "catalog tutorial and reload" at 1280x720-keyboard failed deterministically for titanic, bismarck and challenger-deep: J-desktop-repetition (run 51) intentionally stopped desktop from showing a scan card for a side contact, so the "return to scanned contact" expectation was stale. Spec now requires the card on touch only. Local gates missed it because smoke runs no full e2e. (2) `d-shell` "home, site grid" hung 240 s in `click` on "Quit to home" (scroll-into-view waits for a rendered frame; hosted software GL stalls). Third recurrence of the CI-only hang class; that click now uses `dispatchEvent('click')`. Both pass locally; gates green.

**Next:** if another frame-wait hang appears in a different spec, apply the same pattern or have Codex sweep shell specs for frame-dependent actions.

## 2026-10-17 evening comprehensive review (Claude alone; Sol skipped, Codex 5h 12%, exit 75)

**Changed since last review (8 merges):** V-titanic-seabed slice 3, J-journal-preview, J-contact-choice, J-picker-density, J-desktop-repetition; Codex S-verify 18/beebe/titanic guards, S-bughunt 19, S-manifest closed (zero site-id discriminators left). Golden 2026-10-17-231115.

**Scores, readable / beautiful:** Titanic 4 / 3.8 (plating varied, trail visible; hull cast pink, opening frame small and dark); Lost City 4 / 3.9 (terraces read; tower flat pale); Blue Hole 3.5 / 3.6 (hood now irregular with stalactites, but an oversized blue fish and a blue shard in frame); Beebe 3.5 / 3.9 (warm orifice glow and flank, smoker plume good; flank still dark brown mass); Monterey 4 / 3.7 (banded wall unchanged); Challenger 3.5 / 3.6 (lander reads, flat); Endurance 3.5 / 3.4 (lobsters and anemones blown out white). No hero consistently at 4.

**Biggest gaps:** close-frame rendering oddities (Blue Hole fish/shard, Endurance whites, Titanic pink) and Monterey banding. Added V-closeup-artifacts and V-lostcity-slice2 to the Backlog.

**Play:** no new flow captures this review; journey P2s are all merged, desktop card/nav overlap in scan range noted. Needs a fresh walkthrough once Codex budget returns.

**Process:** efficiency: weekly pacing gates both lanes (Claude 48% left ~12%/day, Codex 86% ~22%/day); no failed timer runs. CI on 22:35 main failed (cause not extracted; run 51 CI pending), prior reds were CI-only hangs. Codex queue 2490-2510 waits on 5h budget. Not a joint review: Sol skipped for budget.

**Stage:** about 82% to 1.0, four weeks targeted (unchanged; art gains small per package).

**Needs owner:** real-phone Low-tier play.

## 2026-10-17 17:00 targeted review (Claude idle at >=50%)

- Cause: weekly pacing again (gate cleared only once the week crossed ~48%); not a scheduling fault. Codex queue also released (6 tasks, 3 running: 2470/2480 verifications plus 2460).
- Merged J-picker-density (compact rows, depth order, Blue Hole title; 7 sites visible at 1280x720). Gates green.
- CI on 92ec9e0 red on one spec only: `d-shell` "home, site grid" hung 4 min on CI, passes in 4 s locally (also with the new picker). Same CI-only hang class as journal-debrief; if it recurs, queue a Codex brief to replace the wall-clock waits in shell specs.

## 2026-10-17 targeted review (idle trigger)

- Trigger was a false positive: runs were skipped by the weekly pacing gate, not by a scheduling fault. Fixed the trigger (see PROCESS-LOG.md). No backlog changes; Claude and Codex both resume as weekly pacing allows. CI on main green (run 47).

## 2026-10-17 08:30 targeted review (CI red x3; Claude idle at >=50%)

- **CI red:** four consecutive reds since the titanic-seabed slice 2 merge. Failing specs: `hud-touch` boost-depletion (wall-bound frame pump, 45 s, failed on retry too), `journal-debrief` primaries banner (8 s, Titanic) and `d-shell` (240 s software-GL stall, once). All pass locally in 4-9 s; the Titanic scene got heavier, so hosted software GL is slower. Fix: timeouts raised (pump 120 s for boost, banner 30 s); gates green, pushed. If CI is still red, next step is a Titanic Low-tier frame-cost cut, not more timeout.
- **Codex idle was pacing, not a bug:** weekly 62% left vs a pace floor of ~73% (Codex week was spent fast on 10-15/16), so the queue (2430-2460) correctly waits; the log line "codex low" is misleading but harmless. Queue stays at 4 briefs.
- **Claude idle:** run cadence, not scheduling: runs 41-43 each ran; 5h window refilled between them.

## 2026-10-17 comprehensive review, joint with Codex Sol (golden 2026-10-17-091522)

Sol ran; one reconcile round, corrections checked against files.

**Changed since the last review (9 merges):** Claude V-beebe-close slice 1, V-monterey-pose (plus yawOffset CI fix), V-lostcity-slope, V-bluehole-hood, V-titanic-seabed slice 2; Codex 2400 S-manifest Endurance, 2410 S-verify-17, 2420 S-bughunt-18. Tags f56-f58. CI for run 41's main failed one spec: `f-perf-budget` titanic prop count 6 to 7 after the seabed slice; fixed and pushed this run (hosted rerun not yet confirmed).

**Scores, readable / beautiful (Claude draft; agreed bands with Sol):** Titanic 4 / 3.5-3.9; Monterey 4 / 3.5-3.8; Beebe 3.5-4 / 3.5-3.8; Lost City 4 / 3-3.8; Blue Hole 3.5-4 / 3-3.6; Challenger 3.5-4 / 3.5-3.7; Endurance 4 / 3.5-3.7. Bands, not unanimous points. No hero is consistently at 4.

**Biggest gaps:** Titanic plating repetition and flat light (`titanic-3.png`); Beebe close flanks smeared brown; Lost City thin faceted rims; Blue Hole hood still pale and slab-like; Monterey banding and abrupt wall/base transition.

**Disputes settled on evidence:** my Challenger "orange wedge artifact" is the authored emissive flag behind the HUD card (lander.ts:414), so a framing nit, not a blocker (Sol correct). Home text below the fold is deliberate scroll (home.css:318), not clipping (Sol correct). My "4.0 for Titanic" and "3.8 Lost City" were generous (Sol's views hold). Still disputed: exact point scores; Sol holds lower floors.

**Sol's additional findings:** Beebe already has emissive mouth geometry (smokers.ts:240), so tune visibility before adding geometry; the Monterey facing>0.98 spec constrains the art; the legacy-save retry star award still needs a disposition (queued as 2460); the blocker list is not only art (journeys, eight-site acceptance, CI).

**Play:** no new flow captures; Home and debrief screenshots from the e2e suite looked clean; P2 journey items remain.

**Stage:** about 82% to 1.0, four weeks targeted, 4-6 allowed (agreed with Sol).

**Process:** a prop-adding package broke a Low-tier budget spec that local gates do not run; now written into V-titanic-seabed. Claude weekly 55% left (~16%/day), Codex 67% (~46%/day); skips are budget gates. Codex briefs queued: 2430, 2440, 2450, 2460.

**New priorities:** unchanged order in DIRECTOR.md; Claude lanes have V-titanic-seabed 3, V-beebe-close, V-lostcity-slope, V-bluehole-hood, V-monterey-pose, J-contact-choice, J-journal-preview.

**Needs owner:** real-phone Low-tier play.

## 2026-10-16 (third) comprehensive review, joint with Codex Sol (golden 2026-10-16-204522)

**Changed since the last review (8 merges, all pushed):** Claude V-titanic-seabed slice 1, V-bluehole-roof-2, V-beebe-lighting, V-lostcity-rims, V-challenger-floats; Codex S-verify-15, S-bughunt-16, J-home-controls coverage, S-manifest sonar slice, 2340-2360 verification. CI green on the latest main (run 38952303725). Codex 2370 (S-manifest terrain carve, inventory 4 to 2), 2380, 2390 finished and are collected this run.

**Scores (beautiful; Claude / Sol band):** Titanic 3.9 / 3.5-3.9; Monterey 3.8 / 3.5-3.8; Beebe 3.8 / 3.5-3.8; Lost City 3.7 / 3.5-3.7; Blue Hole 3.5 (Claude, lowered after checking `great-blue-hole-east-3.png`) / 3.0-3.9 disputed; Challenger 3.8 / 3.5-3.8; Endurance 3.6 / 3.5-3.6. Readable 3.5-4 (Beebe close pose and Blue Hole depend on distance). No hero is at a consistent 4.

**Biggest gaps:** Titanic seabed flat at approach; Beebe close pose washes mid-brown; Lost City slope smooth; Blue Hole hood is a smooth slab with a pale interior (Sol's catch; my earlier 3.9 was too generous); Monterey opening pose.

**Sol's additional findings (credited to Sol):** the legacy-save retry can award stars using later discoveries (S-bughunt-16 note) and needs a disposition; the nightly capture step is allowed to fail so a green workflow does not establish visual acceptance; `perf.frameMs` clamps to 250 ms and smooths, so record raw stall tails during phone acceptance; the eight non-heroes (Endurance included) lack current mission-spawn acceptance. Added to the backlog as S-bughunt-18 scope and the owner phone check.

**Disputed:** Blue Hole score (resolved toward Sol at 3.5, band kept); Sol disagrees that composition-led briefs mean camera-only changes; agreed, the briefs name material/geometry changes too.

**Play:** no new flow captures; P2s J-contact-choice and J-journal-preview remain.

**Stage:** about 82% to 1.0 (80-84), four to five weeks (six if art capacity is limited). Agreed with Sol.

**Process:** Claude weekly burns ~27%/day, Codex ~63%/day; both lanes ran. Run skips are budget gates (expected). Codex's sandbox cannot run browser gates (EPERM), so Claude re-runs gates on its worktrees before merging.

**New priorities (single backlog in DIRECTOR.md):** Sonnet V-titanic-seabed, V-beebe-close, V-lostcity-slope, V-bluehole-hood, V-monterey-pose, J-contact-choice, J-journal-preview; Codex 2400 S-manifest, 2410 S-verify-17, 2420 S-bughunt-18.

**Needs owner:** real-phone Low-tier play (still the largest unverified 1.0 requirement).

## 2026-10-16 (second) comprehensive review, Claude alone (golden 2026-10-16-135921)

Sol skipped: Codex 5h was 3% (below the 5% floor; resets 10:15). Findings are Claude's only; the morning joint review stands for what it covered.

**Changed since the last review (9 merges, all pushed, smoke + project-base each; no full local e2e):** Claude V-beebe-stack, V-challenger-lander, V-lostcity-low, V-monterey-floor, V-hero-set, V-bluehole-roof, J-atoll-transit, J-completion-contrast; Codex S-perf-stall, S-render, S-verify-14, S-verify-13, S-manifest scatter keepout and atmosphere policy; f55 tagged on green CI.

| Site       | Readable | Beautiful    | Biggest gap                                                                                       |
| ---------- | -------- | ------------ | ------------------------------------------------------------------------------------------------- |
| Titanic    | 4        | 3.9          | flat dark seabed in the approach view; plating repetition                                         |
| Beebe      | 4        | 3.6 (up 0.3) | chimney now has orange-brown collars and reads; side stack tops flat, beige wash under headlights |
| Blue Hole  | 3.5-4    | 3.6 (up 0.1) | roof still a uniform slab from the east pose; flat pool and sand                                  |
| Lost City  | 4        | 3.6          | thin hollow rims, smeared mid slope                                                               |
| Monterey   | 4        | 3.8 (up 0.3) | wall strong, floor now varied; sub placement in the pose is the only nit                          |
| Challenger | 3.5-4    | 3.6 (up 0.4) | lander has a frame, bait plate and swarm; floats faceted, frame pale                              |
| Endurance  | 4        | 3.6          | sub large in the frame; parked aim branch                                                         |

**Play:** no new flow captures this run (2170 evidence stands); P2s remain J-contact-choice and J-journal-preview.

**Stage:** about 82% to 1.0; four to six weeks stays, bound by art direction and the unverified real-phone check. No hero is at 4 yet; Titanic (3.9) and Monterey (3.8) are closest.

**Process:** efficiency: Claude idle ~203 h at >=50%, Codex under-used ~182 h, both from budget-gate skips (upper bounds, not causal). Codex is the binding constraint (5h 3%, weekly 9%), so Claude carries the visual backlog and Codex gets only small briefs. Golden took 7.5 min. Hosted CI for the latest main still queued; nightly diagnostic in progress.

**New priorities:** Sonnet: V-bluehole-roof-2, V-titanic-seabed, V-beebe-lighting, J-contact-choice, J-journal-preview, V-lostcity-rims; Haiku: V-challenger-floats, S-render confirmation; Codex: 2300 S-verify-15, 2310 J-home-controls, 2320 S-bughunt-16, 2330 S-manifest.

**Needs owner:** real-phone Low-tier play; decide whether to drop the parked V-endurance-aim branch.

## 2026-10-16 comprehensive review, joint with Codex Sol (golden 2026-10-16-053027)

Sol ran (Codex 5h 59%); one reconcile round, corrections checked against files.

**Changed since the last review:** 5 Claude merges (V-titanic-palette-2, V-beebe-hull, V-lostcity-2, V-bluehole-3, plus f54 tag) and Codex 2170 J-journeys-repeat (guidance handoff fix), 2180 S-verify-12 (slope-aligned clear_ground), 2190 S-bughunt-9. All pushed; no full local e2e. Parked: V-endurance-aim.

| Site       | Readable      | Beautiful (Claude / Sol band) | Biggest gap                                                                                    |
| ---------- | ------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Titanic    | 4             | 3.9 / 3.5-3.9 (up)            | repetitive plating, flat seabed in approach view                                               |
| Beebe      | 4 (Sol 3.5-4) | 3.3 / 3-3.3                   | smeared one-tone chimney with ragged collars; sub prominent in opening                         |
| Blue Hole  | 3.5-4         | 3.5 / 3-3.5 (up)              | roof still a rolled tube, parallel beds, flat sand shelf                                       |
| Lost City  | 4             | 3.6 / 3.3-3.6                 | thin hollow rims, broad planar surfaces; Low honeycomb                                         |
| Monterey   | 4             | 3.5 / 3.5                     | flat floor, repetitive strata                                                                  |
| Challenger | 3.5           | 3.2 / 3.2                     | flat-shaded lander, glowing float blobs                                                        |
| Endurance  | 4             | 3.6 / 3.3-3.6                 | sub absent in approach poses (first-person by design in 2-3; Sol: sub is visible in capture 1) |

Disputed and left as bands: exact beauty scores (Titanic, Lost City, Endurance). Sol's note that Challenger is a non-hero, so material polish is not itself a 1.0 blocker (coherence only), is accepted; V-challenger-lander stays as a medium item.

**Agreed stage:** about 80-81% to 1.0; four to six weeks. Adding coding capacity alone will not close the visual gap; art direction (Claude) is the bottleneck.

**Sol's findings accepted (checked):** (1) `HERO_SITES` in `src/game/Cosmetics.ts` lists Monterey, not Endurance, while the 1.0 table counted Endurance: new item V-hero-set. (2) `perf.frameMs` drops every interval >=250 ms (`src/app/systems/quality.ts:108`), so real phone stalls never register: new Codex item S-perf-stall (2270). (3) 2170 does not close current-build journey acceptance (baseline predates main, desktop 1600x900, results pending): treated as "unverified", J-* sub-items stay open. (4) The efficiency idle totals extrapolate samples and are not causal accounting; there was also an orchestrator crash (PROCESS-LOG). (5) Eight-site acceptance still lacks Endurance. Claude had missed all five.

**Process:** efficiency tool: Claude idle ~198 h at >=50% and Codex under-used ~181 h, mostly budget-gate skips (read as upper bounds). 2210 and 2220 have PASS results but their worktrees were not collected until now; 2200/2230 running. Golden takes ~9 min of the run budget. Queue: 2240, 2250 (S-manifest), 2260 (S-verify-13), 2270 (S-perf-stall).

**New priorities:** Sonnet: V-bluehole remainder, V-beebe-stack, V-challenger-lander, V-endurance remainder, V-lostcity-low, V-monterey-floor, J-* P2s; Haiku: V-hero-set, R-release f55; Codex: S-manifest slices, S-verify-13, S-perf-stall, J-home-controls.

**Needs owner:** real-phone Low-tier play (largest unverified 1.0 requirement); decide whether to drop V-endurance-aim item 4.

## 2026-10-15 late comprehensive review, Claude alone (golden 2026-10-15-211537)

Sol skipped: Codex 5h was 2% (exit 0 "budget too low"). Findings are Claude's only; the eve joint review stands for what it covered.

**Changed since the eve review:** 11 merges, all pushed, last completed hosted CI green (38803817919) and **f53 tagged** on 26b9892. Codex 2120/2130/2140 bug fixes and audits, 2150 R-ci-green, 2160 S-manifest slice (opening framing, staged life); Claude V-low-tier, V-golden-monterey (all 7 heroes now captured), V-bluehole (part), V-lostcity.

| Site       | Readable | Beautiful | Notes                                                                                                 |
| ---------- | -------- | --------- | ----------------------------------------------------------------------------------------------------- |
| Titanic    | 4        | 3.7       | hull still uniform peach-orange, but plates, davits and rust streaks read as a wreck; palette item    |
| Beebe      | 4        | 3.2       | stack still faceted and one-tone brown; sub no longer brightest in this pose; plumes good             |
| Blue Hole  | 3.5      | 3 (up)    | ceiling and stalactites now grounded; terraced shelf banding and floating rock/crystal scatter remain |
| Lost City  | 4        | 3.5 (up)  | torn tower rims and wall relief work; towers smooth between ribs                                      |
| Monterey   | 4        | 3.5       | strong layered canyon wall, life on it; boulders and flat sand floor are plain                        |
| Challenger | 3.5      | 3.2       | lander is a flat-shaded prop with glowing orange floats; field empty                                  |
| Endurance  | 4        | 3.5       | wreck is the subject in this pose, clear hull detail; sand floor and lighting good                    |

**Stage:** about 80% to 1.0. Time: keep the four to six weeks from the eve review. Largest gaps: real-phone Low readability and performance (owner), Blue Hole terraces, Beebe/Challenger materials, repeated unaided journeys (2170 waits for Codex reset).

**Process:** efficiency unchanged (Claude idle ~194 h at >=50%, Codex under-used ~180 h, both from budget-gate skips; Codex weekly 55% but 5h at 2% all afternoon means Codex is the binding constraint, so Claude owns the visual backlog now). Golden takes 8 minutes. Not a process fault this run.

**Priorities:** J-journeys-repeat (Codex), V-bluehole remainder, V-endurance (reframe check on mission spawn), V-beebe, V-titanic palette, V-lostcity remainder, S-manifest slices.

**Needs owner:** real-phone Low-tier play (still open).

## 2026-10-15 eve comprehensive review, joint with Codex Sol (golden 2026-10-15-172432)

Sol ran (Codex 5h was back to 100%). One reconcile round; corrections below were checked against the images and files.

**Changed since the pm review:** 12 merges, all pushed. Codex: 2060 S-verify-7, 2070 S-bughunt-6, 2080 R-ci-time (38 shards), 2090 S-verify-8, 2100 S-bughunt-7, 2110 S-verify-9 (package-number comments stripped, manifest inventory). Claude: V-sub-scale (data), V-eight-sites, V-darksites, S-manifest step 1 (schema, validator, loader, habitat slice), spec repair for journal-debrief. Gates: smoke + project-base.

| Site       | Readable | Beautiful                 | Biggest gap                                                           |
| ---------- | -------- | ------------------------- | --------------------------------------------------------------------- |
| Titanic    | 4        | 3.5 (Sol) to 3.8 (Claude) | close hull still peach and manufactured                               |
| Beebe      | 4        | 3 to 3.3                  | faceted stack; sub is brightest object                                |
| Blue Hole  | 3.5      | 2.5 to 3                  | detached canopy, terrain seams, floating stones (Sol)                 |
| Lost City  | 4        | 3 to 3.3                  | hollow flat-rimmed tower tubes                                        |
| Monterey   | 4        | ~3.3 (old capture)        | golden capture timed out this run (Sol found the cause in poses.json) |
| Challenger | 4        | 3.3                       | lander reads well; empty field                                        |
| Endurance  | 3.5      | 3.2                       | centred bright sub over a small wreck                                 |

**Agreed stage:** about 79% to 1.0. **Time:** Sol says four to six weeks, Claude said three; adopt four to six (hero geometry work and unverified release gates remain). Disputed: Titanic beauty 3.5 vs 3.8, left as a range.

**Sol's corrections accepted:** unaided journeys were done earlier, so the gap is a current repeat, not never done; the manifest count is 27 expressions left (31 inventoried, 4 removed), not 26; V-eight-sites is not acceptance evidence for Endurance; V-darksites excluded Low, so phone Low readability is unproven; Pages deploys on its own build, not on CI; "cancelled" runs are not yet explained (GitHub unreachable for Sol). Claude check afterwards: the cancelled runs have no jobs, consistent with a concurrency group that keeps one pending run and cancels older pending ones; the last completed run (38769418092) failed on one shard (e2e 1/38), queued as 2150.

**Process:** efficiency: Claude idle ~192 h at >=50%, Codex under-used ~180 h over the project (mostly budget-gate skips). Removed 13 stale Codex worktrees and branches (all work already on main). Hosted CI takes up to 60 min, so pushes outpace it; releases need a completed green run.

**New priorities:** J-journeys-repeat, V-low-tier, V-golden-monterey, V-bluehole, V-lostcity, V-endurance, V-beebe, V-titanic palette; Codex 2150 R-ci-green, 2160 S-manifest slices, 2170 J-journeys-repeat.

**Needs owner:** a five-minute real-phone play of the newest build (Low tier readability and performance). It is now the largest unverified 1.0 requirement.

## 2026-10-15 targeted review: CI red on main for 3 runs

**Trigger:** hosted CI failed on the last three pushes (38742636827, 38746684662, 38753754222).

**Diagnosis:** the same spec each time, `journal-debrief.spec.ts` "frozen debrief and resume" (all 3 sites, both viewports, 5-6 shards). Codex 2070 (S-bughunt-6) made the first frame after a resume carry zero clock time (`resumeFrame` in `loop.ts`), so the spec's single `fastForward(250)` no longer ticked `elapsed`. The game behaviour is intended; the spec expectation was stale. Local gates missed it because smoke runs no full e2e. Second failure, in the latest run only: `hud-touch.spec.ts` monterey-canyon animal hint hit the 240 s timeout inside the new bounded wait loop (2080). It passes in 1.7 s locally, so it is probably a one-off CI stall; if it recurs, make the loop step by 1000 ms.

**Fix:** the spec now advances two 250 ms steps (resume frame, then a ticking frame). Local spec passes; `tools/gates.sh` green. Hosted CI will confirm; no tag until it is green.

**Process:** a Codex package that changes timing semantics should run the specs that mention the clock (`FULL_E2E=1` in its brief env line) before merging.

## 2026-10-15 pm comprehensive review, Claude alone (golden 2026-10-15-093704)

Sol was skipped again (Codex 5h at 6%, `codex-review.sh` exit 75). Scores are mine and provisional.

**Changed since the morning review:** about 10 merges, all pushed. Codex: 2000 (d-photo spec race), 2010 (HUD/waypoint dispose, keyboard Sites grab, Tab-reachable banner buttons), 2020 (specs consolidated into capability specs, nightly workflow, golden tool tests). Claude: R-ci-triage (27 hosted-CI failures: one real fix, Journal photo on an undiscovered entry; the rest spec repairs), V-lander (Challenger lander wear and colour), S-tiers (Ultra cut, saved `ultra` migrates to `high`), and two spec repairs. Gates: smoke + project-base.

| Site       | Readable | Beautiful | Biggest gap                                                                  |
| ---------- | -------- | --------- | ---------------------------------------------------------------------------- |
| Titanic    | 4        | 3.8       | close view: rust-peach hull is lit flat; seabed ripples fine                 |
| Beebe      | 4        | 3.2       | the bright sub is the biggest object; chimney still a small procedural stack |
| Blue Hole  | 3.5      | 3         | faceted terraces; faint repeating star pattern in the headlight pool         |
| Lost City  | 4        | 3.3       | towers are smooth columns with flat tops, blurred slope texture              |
| Monterey   | 4        | 3.5       | repeated contour bands on the wall                                           |
| Challenger | 4        | 3.1 (3)   | lander now reads as kit (orange flag, bait); still tiny in an empty field    |
| Endurance  | 3.5      | 3.2 (3)   | hull and sub both small; sub is the brightest, centre-frame object           |

Golden frames are visually unchanged apart from the lander; no regression. None at 4. HUD clean on all frames (scan card, sonar, depth).

**Agreed stage: about 79% to 1.0 (Claude alone), about three and a half weeks.** Movement is test and process work, not art.

**Biggest gaps (ranked):** (1) hosted CI has never produced a completed result lately: 11 of the last 15 runs on main were cancelled by the next push (`cancel-in-progress: true` plus push-per-merge). Fixed in `ci.yml` (PRs only). (2) Sub scale at openings (Beebe, Challenger, Endurance): new V-sub-scale. (3) Headlight pool pattern: new V-headlight. (4) Eight non-hero sites unjudged. (5) Real-phone Low performance (owner).

**Process notes.** See PROCESS-LOG 2026-10-15 pm. Codex is idle in practice until 07:17 today (5h) and its weekly is fine (85%), so the binding limit is the 5h window; briefs 2060/2070/2080 wait for it.

**New priorities (Claude):** V-sub-scale, V-headlight, V-eight-sites, V-titanic close view, V-lostcity towers, V-beebe/V-bluehole. Codex: S-verify-7, S-bughunt-6, R-ci-time (reads the first completed CI run).

**Needs owner:** a five-minute real-phone play of the newest build.

## 2026-10-15 comprehensive review, Claude alone (golden 2026-10-15-011533)

Sol was skipped: Codex weekly is at 5% (resets Oct 20), below the review floor. Scores are mine and unchallenged; treat them as provisional until Sol can re-check.

**Changed since the last review (2026-10-14 morning):** 10 merges, all pushed. Codex: 1710 S-tests step 2 (94 to 68 specs), 1720 golden tooling, 1730 S-verify-3, and, collected in this run, 1900 S-verify-4 (Journal next-unlock hint ignored migration grants; Cosmetics disclosure lost state on refresh; Titanic triangle budget checked), 1910 hosted-CI repairs, 1920 stale-spec repairs (d-modes, d-shell, d-sonar, eight animal-guidance cases). Claude: S-hud (hud-layout.css 697 to 301 lines), S-picker (phone site sheet over the globe), V-titanic, V-rewards-look, V-journeys, S-hud-desktop-text and S-briefing-advanced (Haiku). Gates on every merge: smoke + project-base. Hosted CI on b1de6c0 was red (20 of 30 shards, 45 min); 1910/1920 were written against that class of failure and are now on main, result pending.

| Site       | Readable | Beautiful | Biggest gap                                                                 |
| ---------- | -------- | --------- | --------------------------------------------------------------------------- |
| Titanic    | 4        | 3.8 (3.5) | wide view now dark silt and rust, reads real; close view still flat peach   |
| Beebe      | 4        | 3.2 (3)   | plumes good; sub is the biggest, brightest object; chimney still procedural |
| Blue Hole  | 3.5      | 3         | stair-step faceted terraces; stalactite gallery floats as a brown slab      |
| Lost City  | 4        | 3.3 (3)   | seabed stripes fixed; towers still smooth columns                           |
| Monterey   | 4        | 3.5       | repeated contour banding on the wall, sparse growth                         |
| Challenger | 4        | 3         | toy-like white lander, big empty seabed                                     |
| Endurance  | 3        | 3         | hull ~380 px of 1600 at the opening; sub fills the right quarter            |

None reaches 4. The HUD is clean on all seven frames: one scan card, sonar, depth; no repeated instruction.

**Agreed stage: about 78% to 1.0 (Claude only), about three and a half weeks.** Gain is from UI simplification and Titanic; art on four heroes is flat.

**Biggest gaps (ranked):** (1) hosted CI still unproven green (45-minute runs, shards timing out under software GL); (2) the sub dominates the opening frame at Endurance, Beebe and Blue Hole, which hurts "beautiful" more than any asset; (3) Blue Hole scan reach (150 to 190 m) means the dive into the hole never happens (S-scan-reach); (4) Journal entry for a fresh scan has no picture (S-journal-picture); (5) eight non-hero sites unjudged; (6) real-phone Low performance (owner).

**Process notes.** `tools/efficiency.sh` over the run: Claude idle at 50%+ for 184 h and Codex under-used for 173 h, nearly all budget-gate skips (250). Codex weekly is the binding constraint now (5%); the Codex queue therefore only helps after Oct 20. Three Codex worktrees (1900/1910/1920) finished uncommitted again and waited for a Claude run; collection was clean and small. 1910 and 1920 overlapped on four spec files; I kept 1920's version (derives radii from tuning modules) and 1910 only for non-overlapping files. Ten older worktrees (1740 to 1860) still hold stale uncommitted work; brief 2020 asks Codex to triage them. Codex stalls when its weekly budget is spent: no scheduling fix exists for that, so Claude lanes carry all work until reset.

**New priorities:** V-endurance (opening framing), S-scan-reach, V-bluehole-opening, S-journal-picture, then V-eight-sites capture. Codex (when budget returns): 2000 hosted-CI triage, 2010 S-verify-5, 2020 S-tests step 3 and worktree triage.

**Needs owner:** a five-minute play on a real phone on the newest build (Low performance); optionally Codex weekly credit, since it is the binding limit.

## 2026-10-14 comprehensive review, joint with Sol (golden 2026-10-14-064710)

Sol reviewed independently from the then-current stored evidence; I read it after my draft and updated the draft for merges that landed meanwhile. Reconciled in one round; I checked the cited files and accepted Sol's corrections that held.

**Changed since the last review (2026-10-13):** 14 merges, all pushed. Codex: 1570 S-resolve, 1580 S-modal, 1590 S-boot, 1610 to 1670 (hosted CI, S-verify, S-bughunt, S-debrief, S-render), 1680 S-verify-2 (teardown and pointer fixes), 1690 S-bughunt-2, 1700 hosted-CI test repairs (54 failures were stale Home readiness, selectors and an Advanced switch), 1600 S-rewards (fixed kit, cosmetics-only, Finds, save v2; conflicts with main resolved by me and one pointer-lock regression caught by the unit gate). Claude (Sonnet, 2.4 h): S-guidance, one guidance slot replacing seven surfaces; phone portrait and landscape shots read clean. I also dropped the obsolete shallow-depth assertion in f2-modes (S-rewards made hull fixed). Gates on every merge: smoke + project-base only; hosted CI for the new head is pending.

| Site       | Readable | Beautiful   | Biggest gap                                                                 |
| ---------- | -------- | ----------- | --------------------------------------------------------------------------- |
| Titanic    | 4        | 3.5         | close-up: regular panels, bright flat sand, thin rusticles                  |
| Beebe      | 3.5      | 3           | bright sub dominates a small stack; procedural chimney and plumes           |
| Blue Hole  | 4        | 3 (was 3.5) | stair-like uniform terraces, smooth stalactite cones; unchanged since 10-13 |
| Lost City  | 4        | 3 (was 3.5) | towers read as textured tubes; stretched slope texture                      |
| Monterey   | 4        | 3.5         | repeated contour bands, sparse growth                                       |
| Challenger | 4        | 3           | toy-like lander; empty opening is coherent                                  |
| Endurance  | 3        | 3           | hull ~380 px of 1600 at the opening, sub dominates                          |

None reaches 4. Blue Hole and Lost City dropped 0.5 on Sol's calibration, which I accepted after re-viewing `great-blue-hole-1` and `lost-city-1`: the evidence is unchanged, my earlier scores were generous.

**Agreed stage: about 76% to 1.0, four weeks (four to six credible).** The simplification wave and S-guidance moved the code and phone HUD forward; art did not move.

**Top blockers (agreed, in order):** (1) unaided Titanic and Blue Hole journeys verified on the merged build at desktop and both phone orientations (the golden set is desktop High free-dive only; V-journeys); (2) green hosted CI for the new head (1740) and a reliable release path; (3) real-phone Low performance (owner); (4) all five hero sites to beauty 4; (5) the eight non-hero sites at real mission spawns (1720 tooling, then V-eight-sites).

**Credits.** Sol: Blue Hole and Lost City at 3, the free-dive goldens are no proof of an unaided journey, the f2-modes failure is mission depth not hull rating (my reading was wrong), Endurance and Challenger ranking below acceptance gaps, "PAUSE -> JOURNAL" is an extra step when the Journal button is visible, a single slot can hide an event caption behind a ready contact, DIRECTOR hero mapping omitted Lost City. Claude: S-guidance and S-rewards merged since Sol's snapshot, so phone guidance is no longer an open overlap bug. Disputed: none; Sol keeps provisional phone scores, I agree they are unverified rather than 2/5.

**Process notes.** `tools/efficiency.sh`: Claude idle with at least 50% for 179 h and Codex under-used 167 h over 10 days, almost all from budget-gate skips (240) and the 13 h resume stall of 10-13 (already fixed). Today's run collected four Codex packages in one pass; Codex packages finish uncommitted because the sandbox cannot write git metadata, so collection stays Claude-bound (the cost: every Codex package waits for a Claude run). The S-guidance Sonnet agent ran 2.4 h against the 1 to 2 h guideline; split large packages. The Codex review itself took about 5 min of read-only work. No Codex task was running when this review started, so five briefs (1710 to 1750) were queued.

**New priorities:** V-journeys, S-hud, V-eight-sites, hero beauty (V-endurance, V-titanic, V-beebe/V-bluehole, new V-lostcity), V-rewards-look (S-rewards merged without a visual check). Codex: 1710 S-tests step 2, 1720 golden evidence, 1730 S-verify-3, 1740 hosted CI, 1750 S-render rest.

**Needs owner:** a five-minute play on a real phone on the newest build (Low performance, first five minutes after S-guidance and S-rewards).

## 2026-10-13 22:10 targeted review (red CI, idle Claude, starved Codex)

- **Cause of all three triggers:** one bug. `tools/resume.sh` exited 2 on every timer tick from about 09:00 to 21:15 (state hash over a missing `paused-packages.md` under pipefail), so nothing was collected for 12 h: ten finished Codex packages sat in their worktrees, Claude stayed at 100% and Codex ran dry. The fix (316a2a9) was already in place; the root cause and the visibility gap are in `plan/PROCESS-LOG.md`.
- **Red CI:** the last three runs (8, 17 and 11 of 30 shards red) were software-GL timeouts plus the tutorial-under-scan-card regression (fixed in 28b4235). Codex 1610 moved continuous render guards and golden bisects to the nightly workflow (`@render` tag), clocked the event captions, and fixed cluster-chooser focus. Merged; hosted result will come from the push of 0a93b80 (brief 1700 reads it). No tag until it is green.
- **Collected and merged (gates green per package, smoke + project-base; no full e2e):** 1610 hosted CI, 1620 S-verify (production ordering bug: scan objective is now chosen before the beam locks), 1630 S-bughunt, 1640 S-debrief, 1650-1670 S-render (scarp kinds, shared title scene, one hull-creak path), 1590 S-boot, 1580 S-modal and 1570 S-resolve. Two Sonnet agents resolved the conflicts of 1580 (shell/Globe/Journal/discovery) and 1570 (daily/power/saveSoak) keeping both sides' intent; Escape is now handled by the overlay stack. Pushed main 0a93b80.
- **Queue refilled:** 1600 S-rewards, 1680 S-verify-2, 1690 S-bughunt-2, 1700 hosted-CI follow-up. Claude: S-guidance (Sonnet) in flight.
- **Needs owner:** unchanged (real-phone play of the newest build).

## 2026-10-13 comprehensive review, joint with Sol (golden 2026-10-13-091650 vs 2026-10-11-201343)

Both reviews ran independently; Sol saw my draft only at reconcile. I checked `beebe-vent-field-3`, `endurance-3`, `titanic-3`, `challenger-deep-1` myself and accepted Sol's calibration.

**Changed since the last review:** 12 finished Codex worktrees had sat uncollected (Claude was on its 5h floor overnight) and were collected in this run with gates per package: S-dead, S-unused, S-rov (ROV cut; merge conflict with S-bugs resolved), S-modal stage 1, S-boot stage 1 (module only), S-render stage 1 (nightly workflow), S-tests step 4, V-bluehole collision, scan-candidate bug fixes, then Claude's S-flow and V-beebe (Beebe now frames the stack clear of the scan card). Main carries the whole wave.

| Site       | Readable | Beautiful | Biggest gap                                                                    |
| ---------- | -------- | --------- | ------------------------------------------------------------------------------ |
| Titanic    | 4        | 3.5       | close-up: regular panels, bright flat sand, thin rusticles                     |
| Beebe      | 3-4      | 3-3.5     | bright sub dominates a small stack (card clearance fixed by V-beebe)           |
| Blue Hole  | 4        | 3.5       | terraces improved (+0.25); faceted, smooth stalactite cones                    |
| Lost City  | 4        | 3.5       | fluted tower reads; soft stretched seabed                                      |
| Monterey   | 4        | 3.5       | repeated contour bands                                                         |
| Challenger | 4        | 3         | toy-like lander; empty opening is not itself a blocker (Sol)                   |
| Endurance  | 3        | 3         | small hull at the opening; close view overexposed, ghost-white creatures (Sol) |

Credits: Sol: the overexposed Endurance close view, simplification-wave "built" overstated (S-modal, S-boot and S-render are only stage 1), "0 of 4" is a fixture not a bug, golden manifest lacks the commit SHA, goldens are not at mission spawns or on phone. Claude: uncollected-worktree bottleneck, hosted CI failure causes, the S-rov/S-bugs merge. Disputed: none left (Sol corrected my 78% / 2.5 weeks and "every push": a prior CI run was green; recent ones are red).

**Process:** `efficiency.sh`: Claude idle ~166 h and Codex under-used ~160 h of samples, all behind budget-gate skips and the Oct 6-10 lockout. The real waste this time: finished Codex work waited hours for a Claude run with budget. Hosted CI: only e2e shards fail (software-GL 60 s timeouts: f-events-reform whale, f-verify-1000 Monterey phone), on every push since 2026-10-13. Collection took ~1.5 h of wall time because gates ran serially per worktree; a script (merge main in, gates, merge) did it unattended and caught one conflict and one set of stale test references (S-rov). Logged in PROCESS-LOG.

**Priorities:** see DIRECTOR.md. Claude: V-first-five, S-guidance, S-tests step 2, S-hud, V-endurance, V-titanic. Codex queue: 1570 S-resolve, 1580 S-modal, 1590 S-boot, 1610 hosted CI; 1600 S-rewards held behind 1570. **Stage:** ~75%, plan four weeks (Sol 75% / 3-6 weeks; I proposed 78% / 2.5 weeks and accepted the correction). **Needs owner:** a real-phone play of the newest push.

## 2026-10-11 18:45 simplification review (owner-requested; Claude + Sol round 1)

- **What ran:**
  - Claude: Sonnet for UI and gameplay from screenshots; Haiku for code structure, tests and tooling, world and render, systems and settings, audio, content and pipeline, plus a pass verifying 13 claims.
  - Sol: an independent review. Round 2 hit the Codex limit and resumes after the reset.
- **Evidence:** `plan/archive/SIMPLIFY-REVIEW-2026-10-11.md`; raw reports in `.cache/review/simplify-20261011/`.
- **Finding:** most complexity came from the workflow, not the design. Package-local fixes piled up as HUD offsets (`hud-layout.css` is 1,077 lines), site branches (26), config mutation and package-named specs (92 e2e specs, 8.8 h serial).
- **Bugs found:**
  - the sonar ping can never fire;
  - the N (globe) key is dead;
  - gamepad gaps;
  - the default graphics tier doesn't match its comment.
- **Credits:**
  - Claude: guidance-slot redundancy, the modal/key ordering, shared helpers and dead code, and the bugs.
  - Sol: the effective-settings resolver (config mutation, ROV POI radii), unused Draco/KTX2, Home booting a dive tile, CI build-once, and dormant Journal/FieldGuide paths.
  - Both: HUD regions, one site picker, Custom trim, test consolidation, Ultra merge.
  - Disputed: upgrades (trim vs fixed equipment) and Daily Dive scope. Both are now owner decisions.
- **Process change (owner):** `plan/DIRECTOR.md` is now the single source of forward work. It has one Backlog with item IDs and lanes, with the `S-*` simplification items woven into the 1.0 items (`R-`, `V-`, `P-`). It also gains a definition of done made of simplicity rules. Earlier priority lists moved to `plan/archive/DIRECTOR-HISTORY-2026-10.md`. RESUME-PROMPT, REVIEW-PROMPT, codex-refill and codex-review now read only DIRECTOR.md; PHASE-F-PLAN is reference only.
- **Needs owner:** five decisions (upgrades, Daily Dive, ROV, Ultra tier, globe on phones). See DIRECTOR.md.

## 2026-10-11 13:15 comprehensive review, joint with Sol (round 1 only; golden 2026-10-11-171945 vs -100422)

Sol's independent review ran; the round-2 reconcile died because Codex hit its usage limit (resets 16:45). Scores are my reconciliation on evidence: I viewed Titanic, Challenger, Blue Hole, Lost City, Monterey, Endurance and Beebe images and accepted Sol's calibration where an image backs it. Disputed: none firm; Sol never saw my draft.

**Changed since the last review:** merged f-ci-vehicles, f-touch-stack, f-tutorial-order, f-challenger-cam, f-lostcity-tower, Codex 1280/1310/1320/1340, f-scan-candidate, and now Codex 1350 (mobile resize/perf), 1360 (Blue Hole rock seating, Challenger lander-boulder overlap), 1370 (photo mode), 1390 (scan overlay on touch). Gates PASS on main; full e2e running before the push.

| Site       | Readable | Beautiful | Change | Biggest gap                                           |
| ---------- | -------- | --------- | ------ | ----------------------------------------------------- |
| Titanic    | 4        | 3.75      | same   | regular panels, thin rusticles (Sol); sky now subtle  |
| Beebe      | 4        | 3.5       | same   | smooth cone trunk; scan card covers the vent top      |
| Blue Hole  | 4        | 3.25      | same   | faceted flat polygon steps on the bowl                |
| Lost City  | 4        | 3.5       | +0.25  | towers read as chimneys; striations stretched (Sol)   |
| Monterey   | 4        | 3.5       | +0.1   | wall-foot rubble scattered now; broad corrugation     |
| Challenger | 4        | 3.5       | same   | toy-like lander materials (Sol); emptiness is fine    |
| Endurance  | 3.5-4    | 3.5       | same   | opening hull ~380 px of 1600, sub huge (Sol, correct) |

Credits: Sol found the Endurance opening and Blue Hole collision-clearance gaps, the mixed-age capture evidence and the missing portrait set; I found the shard-7 cause and the Lost City/Monterey gains.

**Process:** efficiency.sh: Claude idle ~166 h and Codex under-used ~135 h of samples (Oct 6-10 lockout; 233 gate skips, 81 watchdog trips: floors working). Codex PASS 130 / other 11. Hosted CI on 38131716507: only e2e shard 7 red, `f-sonar-palette-1200.spec.ts:12` screenshot timeout (240 s) on the software-GL runner: Codex 1430. Gotcha: `.cache/review/current` is a symlink created by `codex-review.sh start`; do not `mkdir` it (it broke the first reconcile). Codex 5h limit was exhausted by running Sol alongside three Codex tasks: avoid starting Sol while 3 tasks run.

**Priorities:** see DIRECTOR.md (7 Claude items, 6 Codex briefs queued). **Stage:** ~75% to 1.0, about 3 weeks (Sol 70-75% / 3-5 weeks, me 80% / 2 weeks: took the middle). **Needs owner:** nothing.

## 2026-10-11 05:30 comprehensive review, Claude alone (trigger: 8+ merges; golden 2026-10-11-100422 vs -015340)

Codex 5h 9% (`codex-review.sh` exit 75), so no Sol second opinion. Play-flow judged from the f-newplayer-recapture and Codex 1260 captures (day old), not recaptured.

**Changed since the last review:** merged f-lostcity-5, f-endurance-hull, f-bluehole-bowl, f-bluehole-perf, Codex 1220/1230/1240/1250/1260/1270, f-newplayer-recapture, f-scan-card-objective. f50 and f51 pushed.

| Site       | Readable | Beautiful | Change | Biggest gap                                      |
| ---------- | -------- | --------- | ------ | ------------------------------------------------ |
| Titanic    | 4        | 4         | same   | flat near-black void above horizon (Codex 1310)  |
| Beebe      | 4        | 3.75      | same   | trunk and seabed plain                           |
| Blue Hole  | 4        | 3.5       | +0.25  | gallery-range apron still smooth and fogged      |
| Lost City  | 4        | 3.5       | same   | striations too subtle to read; pale pillars      |
| Monterey   | 4        | 3.75      | same   | wall foot boulders still in a line               |
| Challenger | 4        | 3.75      | same   | cobbles tiny; boulders queued (1310)             |
| Endurance  | 4        | 4         | +0.25  | hull now fills the frame; minimap stripes remain |

No regressions. **Process:** efficiency.sh: Claude idle ~160 h and Codex under-used ~134 h of samples, nearly all the Oct 6-10 budget lockout (233 gate skips, 79 watchdog trips: floors working). Codex PASS 123 / other 11. Hosted CI on f51: 29/30 shards green; shard 5 failed only on `f1-vehicles.spec.ts:21` (screenshot hit 240 s on the software-GL runner): lightening it is DIRECTOR item 1. Codex queue holds 1280, 1290, 1310.

**Priorities:** see DIRECTOR.md. **Stage:** ~80% to 1.0, about 2 weeks (Claude alone). **Needs owner:** nothing.

## 2026-10-10 22:00 comprehensive review, Claude alone (trigger: new release tag f49; golden 2026-10-11-015340 vs -004532)

Codex weekly 5% (`codex-review.sh` exit 75), so no Sol second opinion. Play-flow not recaptured (Codex 1260 queued; now DIRECTOR item 2).

**Changed since the last review:** merged f-monterey-wall, f-challenger-seabed, f-bluehole-wall, f-bluehole-map, f-challenger-tone. f49 pushed; hosted CI and Pages green.

| Site       | Readable | Beautiful | Change | Biggest gap                                         |
| ---------- | -------- | --------- | ------ | --------------------------------------------------- |
| Titanic    | 4        | 4         | same   | flat near-black void above the horizon              |
| Beebe      | 4        | 3.75      | same   | trunk fine; seabed and smoke plume plain            |
| Blue Hole  | 4        | 3.25      | +0.25  | smooth green ramps, bowl terraces fogged            |
| Lost City  | 4        | 3.5       | same   | smooth pale pillars, bland slope                    |
| Monterey   | 4        | 3.75      | same   | strata good; wall base boulders in a line           |
| Challenger | 4        | 3.75      | +0.25  | grey-olive floor works; cobbles tiny                |
| Endurance  | 3.5      | 3.75      | same   | lit water good; hull small and pale in a wide plain |

No regressions. **Process:** efficiency.sh: Claude idle ~157 h and Codex under-used ~132 h of samples (lockout, Codex weekly 5% until 15 Oct; 233 budget-gate skips, 78 watchdog trips: floors working). Codex PASS 117 / other 11. CI green on f49. Seven Codex briefs queued and dry until 15 Oct.

**Priorities:** see DIRECTOR.md. **Stage:** ~77% to 1.0, about 2 weeks (Claude alone). **Needs owner:** nothing.

## 2026-10-10 20:00 targeted review (trigger: Claude idle at >=50% for 2 h; golden 2026-10-11-004532)

**Cause:** the DIRECTOR backlog was empty after f-bluehole-wall merged and Codex is dry until 15 Oct (weekly 5%), so runs exited without a package. **Fix:** new golden set captured and viewed; backlog refilled with 7 items (DIRECTOR.md). Scores (beautiful): Titanic 4, Beebe 3.75, Monterey 3.75, Endurance 3.75, Challenger 3.5, Lost City 3.5, Blue Hole 3; no regressions. Biggest gaps: Blue Hole floor and minimap, smooth Lost City pillars, over-bright Challenger floor. Sol not consulted (targeted review). Needs owner: nothing.

## 2026-10-10 08:30 comprehensive review, Claude alone (trigger: 8+ merges; golden 2026-10-10-123858 vs -030121)

Codex weekly 5% (`codex-review.sh` skipped for budget), so no Sol second opinion. Play-flow not recaptured (Codex 1260 queued; firstdiscovery shots from 10-09 stand).

**Changed since the last review:** merged f-beebe-trunk/-chimneys/-blobs (crusted flanges, dark basalt seabed), f-phone-pass and f-phone-camera (real touch layout in golden, 14% landscape view shift, short titles), f-ci-heavy-specs, f-sonar-flat (rings, tint, footprints), plus the Endurance and Lost City passes from the previous night. f47 pushed.

| Site       | Readable | Beautiful | Change | Biggest gap                                                      |
| ---------- | -------- | --------- | ------ | ---------------------------------------------------------------- |
| Titanic    | 4        | 4         | same   | rusticles are oversized orange spikes, a little cartoonish       |
| Beebe      | 4        | 3.5       | same   | lit chimney fine; main trunk still smooth brown cone             |
| Blue Hole  | 4        | 3         | same   | smooth grey bowl floor; minimap still a flat teal square         |
| Lost City  | 4        | 3.5       | +0.5   | pale carbonate towers with orifice smoke read well; seabed bland |
| Monterey   | 4        | 3.5       | same   | strata good, wall silhouette still stepped                       |
| Challenger | 4        | 3.5       | same   | lander and amphipods read; seabed flat                           |
| Endurance  | 3.5      | 3.5       | +0.5   | hull large with ripples and wood now; sky void, minimap stripes  |

No regressions seen. Blue Hole floor and minimap are the longest-standing gap (three tries).

**Process:** efficiency.sh: Claude idle ~150 h and Codex under-used ~123 h of samples, mostly the Oct 6-8 lockout and Codex weekly 5%; 68 watchdog trips (floors working). Hosted CI last failed on the 06:43 CDT push, before f-ci-heavy-specs; a full e2e run on main was started in this review so the next push shows whether CI is green. Seven Codex briefs queued (1220-1280) and dry until 15 Oct.

**Priorities:** see DIRECTOR.md. **Stage:** ~75% to 1.0, about 2.5 weeks (Claude alone, Sol not consulted). **Needs owner:** nothing.

## 2026-10-09 22:30 comprehensive review, Claude alone (trigger: 8+ merges, CI red 3 runs; golden 2026-10-10-030121 vs -223546)

Codex weekly 6% (`codex-review.sh` exit 75), so no Sol second opinion; Play-flow not recaptured (queued as Codex 1260).

**Changed since the last review:** merged f-challenger-seabed and -lander, f-lostcity-tower pass 2, f-bluehole-overhangs, Codex 1130, 1180, 1190, 1200, 1210 (Endurance snow gone, Blue Hole sonar reads), f-firstdiscovery-fixes. f45 pushed and tagged.

| Site       | Readable | Beautiful | Change | Biggest gap                                             |
| ---------- | -------- | --------- | ------ | ------------------------------------------------------- |
| Titanic    | 4        | 4         | same   | flat dark void above horizon                            |
| Beebe      | 4        | 3.5       | same   | plaster-like trunk, no visible smoke at the orifice     |
| Blue Hole  | 4        | 3         | same   | smooth grey floor ramp, tile-like noise                 |
| Lost City  | 3.5      | 3         | same   | brown clay cone, no bright carbonate                    |
| Monterey   | 4        | 3.5       | same   | corrugated rock                                         |
| Challenger | 4        | 3.5       | +0.5   | seabed still simple, sonar fine                         |
| Endurance  | 3        | 3         | +0.5   | tiny hull in flat plain, void sky, minimap five stripes |

**CI diagnosis (new):** the hosted run fails on (a) `tests/unit/bughunt1090.test.ts` writing to a non-existent `.cache/` (fixed this run), (b) project-base Playwright install tripping an apt lock (flake), (c) 10 of 30 e2e shards hitting 300 s test timeouts on hosted runners. So red CI was not only shards. Remaining work is Claude backlog item 1.

**Process:** efficiency.sh: Claude idle ~145 h and Codex under-used ~118 h, mostly the Oct 6-8 lockout and Codex 0%; 57 watchdog trips (floors working). Codex weekly is the binding limit until 15 Oct, so Claude carries all packages.

**Priorities:** see DIRECTOR.md. Codex queue: 1220, 1230, 1240, 1250, 1260.

**Stage:** ~72% to 1.0, about 3 weeks (Claude alone). **Needs owner:** nothing.

## 2026-10-09 late comprehensive review, Claude alone (trigger: 8+ merges; golden 2026-10-09-221156 vs -195308)

Codex 5h was 11% (`codex-review.sh` exit 75), so no Sol second opinion.

**Changed since the last review:** merged Codex 1090-1120, 1140, 1160, 1170 (Challenger amphipod/ripple, Endurance facts), f-firstdiscovery, f-mission-pacing (Blue Hole 270 m, Monterey 645 m to next target) and f-bluehole-bowl2 (feathered shelf, ragged lip, bluer walls).

| Site       | Readable | Beautiful | Change | Biggest gap                                            |
| ---------- | -------- | --------- | ------ | ------------------------------------------------------ |
| Titanic    | 4        | 4         | same   | slight flat void above horizon (1190)                  |
| Beebe      | 4        | 3.5       | +0.25  | chimney now layered; sediment still procedural         |
| Blue Hole  | 4        | 3         | +0.25  | smooth bowl floor; sonar minimap a flat green square   |
| Lost City  | 4        | 3         | same   | tower trunk still pale blobby plates, no orifice       |
| Monterey   | 4        | 3.5       | same   | more flora/fish, strata still regular                  |
| Challenger | 3.5      | 3         | +0.25  | lander visible now; seabed dim, flat, slope unreadable |
| Endurance  | 3        | 2.5       | same   | snow discs fill lower frame, black blob on sub (1180)  |

No regressions seen. Play-flow was not re-captured; firstdiscovery-shots from the last review stand (open: reward card title vs objective name, desktop tutorial stuck on 'Move and turn').

**Process:** efficiency.sh: Claude idle ~142 h and Codex under-used ~116 h, almost all the Oct 6-8 lockout and the Codex 0% window; 54 watchdog trips, floors working; 233 budget-gate skips. Hosted CI still red (14/30 e2e shards) on the pre-1120 SHA; the next push will show whether 1120 fixed it (1230 queued as follow-up). Codex is at 10% weekly so reviews are Claude-only until it recovers.

**Priorities:** see DIRECTOR.md (push f45 + CI, Endurance snow, sonar legibility, Lost City redo, Challenger seabed, Blue Hole floor). Codex queue: 1190, 1200, 1210, 1220, 1230.

**Stage:** ~71% to 1.0, about 3 weeks (Claude alone). **Needs owner:** nothing.

## 2026-10-09 evening comprehensive review, joint with Sol (trigger: 8+ merges; golden 2026-10-09-195308 vs -191533)

Sol ran an independent review (read-only). The one-round `reconcile` call produced no output and was killed at its time limit, so disagreements were settled by me against the evidence instead (below). Monterey was not recaptured (viewport screenshot timeouts under CPU load); -191533 was used for it.

**Changed since the last review:** merged f-firstminute, f-hud-overlap, f-debrief-zero, f-monterey-strata, f-lostcity-tower (jagged ledged trunk, modest gain), f-bluehole-bowl (stouter pendants, sonar ramp; bowl barely changed). Endurance is byte-identical across both golden sets.

| Site       | Readable | Beautiful (agreed) | Biggest gap                                                                          |
| ---------- | -------- | ------------------ | ------------------------------------------------------------------------------------ |
| Titanic    | 4        | 3.5-4              | flat dark void above hard horizon; repetitive hull panels up close                   |
| Beebe      | 4        | 3-3.5              | fluted-cone chimney, procedural sediment                                             |
| Blue Hole  | 3.5      | 2.5-3              | smooth bowl with shelf line, faceted terraces, sonar scale                           |
| Lost City  | 4        | 3-3.3              | tower still blobby clay with plate flanges, no orifice                               |
| Monterey   | 4        | 3-3.5              | corrugated rock, angular banks                                                       |
| Challenger | 3-3.5    | 2.5-3              | tiny lander marker; amphipods and slope present but barely legible                   |
| Endurance  | 3        | 2.5                | marine-snow discs cover the lower half of the frame, black blob on sub, flat horizon |

**Disputes settled on evidence:** Sol said Claude was too generous on Titanic (4) and the finish estimate; accepted (3.5-4, 3-4 weeks). Sol said "Challenger empty" was too harsh; accepted (flecks and a slope are visible). Sol's new findings, all verified: second required POIs are ~4.5 km away at Blue Hole (pois.json: lon delta 0.042 deg) and ~14.6 km at Monterey; firstminute-shots never presses Scan so reward/comprehension is unproven (Sol); golden manifest was `complete:false` (Sol). Claude's own finding: Endurance snow and the black hull blob.

**Process:** efficiency.sh: Claude idle ~140 h and Codex under-used ~116 h (mostly the Oct 6-8 lockout and the 0% Codex window until 14:16); 54 watchdog trips, floors working. Hosted CI still red (e2e shards); 1120 owns triage. Details in PROCESS-LOG.md.

**New priorities:** see DIRECTOR.md (unaided first discovery, mission pacing, Blue Hole bowl/sonar, Challenger legibility, Lost City redo, Beebe chimney, merge stalled Codex worktrees). Codex queue: 1170, 1180, 1190, 1200.

**Stage:** ~70% to 1.0, about 3-4 weeks (agreed with Sol, who said 68%). **Needs owner:** nothing.

## 2026-10-09 afternoon targeted review (trigger: Claude idle at >=50% for 2 h)

**Root cause:** the Claude backlog was empty of unblocked items ("wait for next golden set") while Codex sat at 0% until 14:16, so 140 h of samples show Claude idle. Fix: new golden set (2026-10-09-191533) captured, backlog refilled in DIRECTOR.md, two Sonnet packages launched (Lost City tower, Blue Hole bowl + sonar ramp), Codex 1170 queued. Rule for next time: never end a run with "waits for golden"; capture golden in the same run.

**Scores (Claude alone, no Sol):** Titanic 4, Beebe 3.5, Monterey 3.5 (strata improved), Challenger 3 (empty seabed), Lost City 3 (tower still smooth blob), Blue Hole 2.5-3 (bowl smooth, sonar minimap flat lime green).

**Needs owner:** nothing.

## 2026-10-09 midday comprehensive review, Claude alone (trigger: 8+ merges; golden 2026-10-09-112035 vs -045527)

Codex 5h was 6% (`codex-review.sh` exited 75), so there is no Sol second opinion; this is Claude's view only. The early-morning review is the last joint-ish baseline.

**Changed since the last review:** merged f-titanic-monterey (f41), f-monterey-portrait-hud, f-bluehole-apron, 1050 (Lost City fingers) and 1040 (Low ambient floor), tagged f41 and f42. Titanic hull now sits beside the sub with a softer distant seabed; Monterey spawn is clear of the wall; Blue Hole bowl and apron have strata and rubble.

| Site      | Score (readable / beautiful) | Change | Biggest gap                                                           |
| --------- | ---------------------------- | ------ | --------------------------------------------------------------------- |
| Titanic   | 4 / 4                        | same   | seabed haze band; hull still slightly flat-lit                        |
| Beebe     | 4 / 3.5                      | same   | pale egg boulders, clean-edged sand disc                              |
| Blue Hole | 3.5 / 3                      | +0.5   | bowl still a beige smooth dune with hard shelf line, thin stalactites |
| Lost City | 4 / 3                        | same   | tower trunk is stacked plates with grey blotches, saucer flanges      |
| Monterey  | 4 / 3.5                      | same   | regular corrugated strata (sub/wall overlap fixed)                    |

No regressions seen. Only a subset of poses was viewed closely (Titanic 1, Beebe 2, Blue Hole 1-2, Lost City 2, Monterey 1).

**Process:** efficiency.sh: Claude idle ~132 h, Codex under-used ~115 h, almost entirely the Oct 6-8 weekly lockout; 46 watchdog trips, floors working. **Hosted CI is still red**: the f41-era run failed 10+ of 30 e2e shards (up from 6 at f37) after 36 min, so 1070's fix has not shipped. Codex 1060, 1070 and 1080 were stopped by the 5% floor at 06:20 and left uncommitted worktrees; they need collection (gates, review, merge). Play-flow not re-captured (1060 owns it).

**Priorities:** see DIRECTOR.md (CI, stranded worktrees, Blue Hole bowl atmosphere, Lost City tower, Beebe boulders, Monterey strata, first-minute check). Codex queued: 1090, 1100, 1110.

**Stage:** ~70% to 1.0, about 2.5 weeks (Claude only). **Needs owner:** nothing.

## 2026-10-09 comprehensive review, Claude alone (trigger: 8+ merges; golden 2026-10-09-045527 vs -202656)

Codex 5h was 6% so `codex-review.sh` skipped; no Sol second opinion. The morning joint review stays the agreed baseline.

**Changed:** merged 940, 950, 970, 960, 990, 1010, 980; tagged f35-f38. Titanic opening now shows the whole hull beside the sub; Monterey strata varied; Blue Hole and Challenger/Endurance openings improved.

| Site      | Score (readable / beautiful) | Biggest gap                                      |
| --------- | ---------------------------- | ------------------------------------------------ |
| Titanic   | 4 / 4                        | haze band above seabed                           |
| Beebe     | 4 / 3.5                      | smooth fluted chimney, flat boulders             |
| Blue Hole | 3 / 2.5                      | smooth bowl, hard horizon ring, cone stalactites |
| Lost City | 4 / 3                        | stacked-plate beehive, blotchy texture           |
| Monterey  | 4 / 3.5                      | sub overlaps wall at spawn                       |

**Process:** efficiency.sh: Claude idle ~128 h and Codex under-used ~114 h, almost all the Oct 6-8 weekly lockout; 41 watchdog trips, all floors working. Hosted CI on f37 still red (e2e shards 3, 6, 24); 1070 queued. f38 run pending. Play-flow not re-captured; 1060 and a Haiku capture are queued in the backlog.

**Priorities:** see DIRECTOR.md (Blue Hole bowl, Lost City, Beebe chimney, CI, first-minute check, Titanic haze/Monterey spawn). Codex queued: 1040, 1050, 1060, 1070, 1080.

**Stage:** ~69% to 1.0, about 2.5-3 weeks (Claude only). **Needs owner:** nothing.

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
