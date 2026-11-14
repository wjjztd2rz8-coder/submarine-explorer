# Director's plan: two-day fun sprint (2026-11-14 to 2026-11-16)

This file is the single source of forward work and the handoff for a new orchestrator
thread. Read it top to bottom, then act. The pre-sprint backlog is in
`plan/archive/DIRECTOR-HISTORY-2026-11-14-pre-sprint.md`; nothing there restarts unless it is
re-listed here.

## Mission (owner, 2026-11-14)

Ship a v1 within two days that is **fun and informative** for a casual player. The owner is
out of time for this project, called it "off the rails", and said to be ruthless: no earlier
rule is binding except usage limits. Target: 3-5 minutes per site, each landmark seen up
close, one real fact per discovery, and a clear lead into the next site. Thirteen sites.

## State (Sat 2026-11-14, 15:45 CST)

- **Live:** https://wjjztd2rz8-coder.github.io/submarine-explorer/ serves `adccf981` (new loop,
  Blue Hole and Monterey routes, SCAN-ready highlight). `main` is at `5048bfab`, pushed at
  15:38 with the reveal framing and F-endings merges; check that its CI went green and the
  deploy ran (`gh run list --branch main --limit 4`).
- Full unit suite green locally on `5048bfab` (202 files, 4,781 tests).
- All delegates have reported and are merged. Nothing is in flight.
- Touch scanning works (the 0-scan result was a script bug, fixed). Lost City by touch: two
  scans in 15 s. Blue Hole by touch: first find only, second never reached (unproven).

### Played results

F-endings (Opus) measured, with its own steering script, every site ending on the debrief
by itself with N of N: Titanic 6/6 166 s, Bismarck 5/5 135 s, Kama'ehuakanaloa 4/4 87 s,
Blake 4/4 88 s, Axial 5/5 83 s, Hunga 3/3 140 s, Hudson 4/4 139 s, Challenger 4/4 121 s,
Beebe 4/4 91 s, Lost City and Endurance 60 s each. F-vertical measured Blue Hole 3 finds
90 s and Monterey 3 finds 71 s.

Orchestrator check on merged main with `tools/playtest/tour.mjs` (which presses "Finish
dive" as soon as both primaries are found, so it does not measure full routes): Titanic,
Bismarck and Kama'ehuakanaloa end on the debrief; **Hunga does not** (2 of 3, caught on the
slope at 246 s).

## Backlog, in order

1. **Measure full routes.** Give `tools/playtest/tour.mjs` the steering F-endings described
   (current marker, then edge arrow, then left/right text; ignore scanned markers) and an
   option not to press "Finish dive". Then run `.cache/sprint/tour-all.sh` over all 13 sites
   and replace the table above. Small scripted job: Composer or Codex.
2. **Hunga** must be finishable by the plain script; fix the route or the slope behaviour.
3. **Close-range circling** costs 20 to 35 s per find: the turning circle at survey speed is
   too wide. Tighten turning at low speed (`src/sub/Submarine.ts`,
   `src/core/config/submarine.ts`).
4. **Touch:** "Finish dive" wraps to two lines in phone landscape; play Blue Hole by touch;
   check the reveal card and debrief at 390x844 and 844x390.
5. **Facts (Claude Sonnet):** no fact repeats within a dive (new contacts at Monterey, Blue
   Hole and the F-endings sites reuse guide entries); six dry terrain facts (`wall-transect`,
   `flank-transect`, `inter-mound-channel`, `eastern-floor`, `upper-canyon`, `south-wall`).
6. **Polish:** tutorial jumps from "STEP 1 OF 3" to "STEP 3 OF 3"; README still describes
   the old loop; five dives run under 100 s (accepted for now: short with 4 to 5 close finds
   beats padding).
7. **Owner phone test** of the deployed build. Act on what they say.

Not in this sprint: opening-frame art passes, bug-hunt and verify briefs, CI shard tuning,
Realistic mode, cosmetics, new plan documents.

## Start of the next thread: use the Cursor Models pool first (owner, 2026-11-14 15:55)

The owner looked at the usage panel and said the spending "seemed off": Claude's session was
at 4% while Cursor's "Cursor Models" pool (Composer, Grok) sat at 100%, unused all day, and
"Other Models" at 35%. The first two threads sent every code task to GPT-5.6 Sol or Opus.

- **Default code delegate is now Cursor Composer 2.5** (Grok as the alternative), for every
  task where it fits: script work, config, test updates after data changes, small and
  medium game-code changes with a clear spec. Backlog items 1, 3, 4 and 6 fit; try item 2
  there first too.
- Step up to GPT-5.6 Sol, Codex or Opus (medium effort) only when Composer has failed at a
  task or the task is a cross-cutting design problem. Say why in the brief.
- Sonnet stays for item 5 (facts); Gemini for anything judged from screenshots.
- The orchestrator itself is the largest Claude cost. Keep the thread short, do not read
  images or logs that a delegate can summarise, and check `ai-limits` before each launch.
- This thread paused at 15:55 until the Claude session reset at about 17:50 (18:30 by
  `ai-limits`). Nothing is running.

## How to work (lessons from the first 80 minutes)

The first orchestrator thread spent 63 points of the Claude 5-hour window in 80 minutes.
These rules exist so that does not repeat.

- **The orchestrator specifies, accepts and merges. It does not implement or read images.**
  Source edits go to a delegate, even small ones. Screenshot judgement goes to Gemini.
  Read tables and short reports.
- **Keep the thread short.** State lives in this file, in git and in memory. Update this
  file's State and Backlog when something lands; do not narrate in chat. Hand off to a fresh
  thread again if this one grows long.
- **Delegates, by job** (all through T3 `delegate_task`, `isolation: "worktree"`, one clear
  file-ownership list each, final report capped at about 20 lines):
  - Cursor GPT-5.6 Sol (reasoning high): game code, test fixes.
  - Cursor Composer 2.5: small config or mechanical changes.
  - Cursor Gemini 4 Carbon: anything judged by looking at screenshots.
  - Codex GPT-6.1 Sol: game code, **at most two at a time**, medium effort for well-specified
    work. Four at high effort emptied its 5-hour window in 35 minutes and every task died
    before its final test run. Codex cannot open a browser.
  - OpenCode free models (DeepSeek V4.1 Flash, Inkling 2): self-contained scripts outside
    the game code that can check themselves.
  - Claude Opus 5.5 (owner, 2026-11-14): ambitious work that has to be done well, for less
    than Fable costs: cross-cutting gameplay design and implementation, or a fix another
    delegate failed at. It spends the Claude window, so one at a time.
  - Claude Sonnet: writing that needs taste (facts, copy).
- **If a delegate dies at a usage limit, look at its worktree first.** Staged or committed
  work that typechecks can be committed and merged by the orchestrator.
- **Site-data changes break tests far from the change.** Twice a delegate's focused test
  run passed and the full suite failed (26 tests, then 2). After any merge that touches
  `data/landmarks/**`, run the full unit suite once before pushing; a red CI blocks deploy.
- **Slow checks run in the background**, once: the unit suite takes 15 minutes; a play of
  one site takes 4. Never wait on them in the foreground, and never run the unit suite twice
  for one merge.
- **Deploy early.** Nothing was pushed in the first 80 minutes. A real person playing is the
  check that six weeks of screenshot reviews never had.
- **Merge gate:** typecheck, unit tests, build, and a played session. e2e specs are not a
  gate; update a text-coupled spec only when it is a one-line change, otherwise delete it.
- **No** progress notes, review logs, percent-to-1.0 estimates, golden captures or CHANGELOG
  entries. Git history is the record.
- **Judge by play:** time to first reveal, finds, whether the dive ends on the debrief, and
  what the player sees and learns. Not screenshot scores.

## Budgets (owner, 2026-11-14)

- The owner does not care to have any resets left after this weekend. Spend freely.
- **Claude:** the reset was applied at about 13:30 CST and is gone. One Opus delegate at high
  effort plus a long orchestrator thread took the 5-hour window from 100% to 7% by 15:40.
  Window resets 18:30. Use Opus at medium effort and keep the orchestrator thread short.
- **Codex:** 5-hour window empty until 16:41 CST; 84% of the week left. Two tasks at a time.
- **Cursor:** two separate pools, both fine to run to zero: "Cursor Models" (Composer, Grok),
  99% left, and "Other Models" (Gemini, GPT, Claude), 35% left at 15:40 (five GPT-5.6 Sol
  tasks and one Gemini run cost about 38 points). Prefer Composer for small work. Reset Nov 24.
- **OpenCode:** free models, no limit to manage.
- Check Claude, Codex and Cursor with `~/.local/bin/ai-limits --refresh` (poll no faster than every
  2 minutes).

## Practical notes

- `export PATH=$HOME/.local/node/bin:$PATH` before any npm or npx command. No sudo.
- Play a build: `npx vite build --outDir <dir> --emptyOutDir`, serve `<dir>` with
  `python3 -I -m http.server <port> --bind 127.0.0.1`, then
  `node tools/playtest/tour.mjs <shotsDir> <siteId|''> <seconds> 1280 720 http://127.0.0.1:<port>/`.
  The script prints each reveal and a final `RESULT` JSON line. Use a build directory and port
  of your own.
- Debug handles: `window.__game` (scanner, discoveries, discovery, reveal, rig).
  `?mission=<site>&skipBriefing=1&reveal=<poiId>` plays one reveal directly. The reveal root
  is `.discovery-reveal[data-poi]`; the debrief root is `.debrief`.
- Where the new pieces live: reveal `src/game/Reveal.ts`, `src/app/systems/reveal.ts`,
  `src/ui/DiscoveryCard.ts`, `src/sub/CameraRig.ts` (`beginReveal`); contacts
  `src/game/Contacts.ts`; guidance text `src/ui/ScanOverlay.ts`, `src/game/Tutorial.ts`; survey
  speed `src/core/config/submarine.ts`, `src/sub/Submarine.ts`; scan range
  `src/game/EffectiveSettings.ts` (`radiusFloorM` 100, `radiusCeilM` 120 in Arcade); debrief
  and tour `src/ui/Debrief.ts`, `src/game/Tour.ts`; facts are the `fact` field in
  `data/landmarks/*/guide.json` and `data/life/life.json`.
- The repo is public and the owner granted push rights. Pushing `main` triggers CI and, on
  green, the Pages deploy.
- Finished worktrees under `~/.t3/worktrees/submarine-explorer/` and the stale
  `~/subexp-wt/124-*` and `131-*` can be removed when convenient; none holds unmerged work
  except the two in-flight branches.
