# Reviews

Dated director reviews, newest first. Comprehensive reviews run about daily, after release tags or after 8+ merges. Targeted reviews run when something stalls (dry backlog, red CI, idle capacity).

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
