# Reviews

Dated director reviews, newest first. Comprehensive reviews run about daily, after release tags or after 8+ merges. Targeted reviews run when something stalls (dry backlog, red CI, idle capacity).

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
