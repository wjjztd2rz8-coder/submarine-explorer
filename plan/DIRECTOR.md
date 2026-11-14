# Director's plan and handoff: two-day fun sprint (2026-11-14 to 2026-11-16)

This file is the single source of forward work and the handoff for a new orchestrator
thread. Read it top to bottom, then act. The pre-sprint backlog is in
`plan/archive/DIRECTOR-HISTORY-2026-11-14-pre-sprint.md`; nothing there restarts unless it is
re-listed here.

## Mission (owner, 2026-11-14)

Ship a v1 within two days that is **fun and informative** for a casual player. The owner is
out of time for this project, called it "off the rails", and said to be ruthless: no earlier
rule is binding except usage limits. Target: 3-5 minutes per site, each landmark seen up
close, one real fact per discovery, and a clear lead into the next site. Thirteen sites.

## State at handoff (Sat 2026-11-14, 12:55 CST)

- `main` is at `f76bdaa6` plus this handoff commit, **about 20 commits ahead of
  `origin/main`, not pushed**. Tag `pre-sprint-merge` marks the point before the gameplay
  merges.
- The new loop works end to end in a played build: dive, steer to the marker, the sub slows
  near targets, scan, **discovery reveal** (close camera shot plus a card with the name and one
  fact), unnamed "?" sonar contacts for everything that is not a primary objective, and a
  debrief that opens by itself when everything is found and offers "Next dive: <site>".
- Typecheck is clean and the build works. **The unit suite is red: 68 failures in 9 files**
  (run before the last two code commits). A fixer is in flight (below).
- Push CI is trimmed to static checks, unit tests, builds and one base-path browser check.
  The 38-shard e2e matrix is in `e2e-full.yml` (manual only). Deploy still follows a green
  CI run on main. None of this has run on GitHub yet.
- The old automation is off: systemd timers `subexp-resume` and `subexp-tick` are disabled,
  and old Codex briefs 196-200 are in `.cache/codex/hold/`. Leave them off.

### Played results so far (scripted player, desktop 1280x720)

| Site        | First reveal | Outcome                                                                        |
| ----------- | ------------ | ------------------------------------------------------------------------------ |
| Titanic     | 12 s         | 6 finds by 190 s; good reveal framing on the bow                               |
| Lost City   | 6 s          | 4 of 4 by 95 s, debrief opens; reveal framing poor on slope                    |
| Beebe       | 12 s         | 3 of 3 by 59 s; two finds show the same fact                                   |
| Blue Hole   | 9 s          | **stalls**: sub stuck against the wall at 27 m, view confusing                 |
| Monterey    | 16 s         | **stalls**: next target is 300 m deeper; sub stops near 919 m                  |
| Other eight | not played   | Bismarck, Endurance, Challenger, Axial, Hunga, Hudson, Blake, Kama'ehuakanaloa |

Touch: `tools/playtest/touch-drive.mjs` completed two scans in both phone orientations on the
pre-merge build (first scan about 13 s). Not re-run on the new build.

## In flight (both report to the OLD thread; the new thread owns merging them)

A branch is finished when it has a commit ahead of the commit it started from
(`git log main..<branch>`). Both started from `aa9b7cd7`, a few commits behind `main`.

1. **T-unit-green** (Cursor, GPT-5.6 Sol): branch `t3/fix-unit-suite-after-merge`. Fixes the
   68 failing unit tests, separating stale expectations from real merge bugs. Its report
   lists each source change; treat those as real bugs found. The failure list is in
   `.cache/sprint/unit-failures.txt`.
2. **V-reveal-qa** (Cursor, Gemini 4 Carbon): branch `t3/discovery-reveal-visual-qa`. Adds
   `tools/playtest/capture-reveals.mjs`, captures every reveal shot, and tunes per-POI
   `reveal` overrides in `data/landmarks/*/pois.json`. Contact sheets go to
   `.cache/sprint/reveals-final/index.html`.

## Backlog, in order

1. **Ship today.** Merge T-unit-green, run the unit suite once (15 minutes, in the
   background), push, confirm CI and the Pages deploy, and tell the owner the build is ready
   to play on a phone. The owner playing tonight is worth more than further tuning.
2. **Merge V-reveal-qa.** If it reports a general framing fault on slopes, fix the default in
   `src/game/Reveal.ts` (`revealFrame`), not per POI.
3. **Vertical sites.** Blue Hole and Monterey must be completable by a casual player.
   Options, cheapest first: start the dive at the depth of the first target; pick primaries
   that are reachable without a long descent; fix whatever stops the sub (terrain collision
   near the wall at Blue Hole, the stop near 919 m at Monterey); check the chase camera at
   Blue Hole, where the sub appears from below. The "Go down ↓ N m (hold Ctrl)" hint exists.
4. **Play all 13 sites.** One background job runs `tools/playtest/tour.mjs` per site and
   writes a table (first reveal, finds, time to debrief, stalls). Fix what the table shows.
5. **Touch pass.** Re-run `touch-drive.mjs` on the new build at 390x844 and 844x390; check
   the reveal card and debrief at both sizes. The SCAN button should show when a scan is
   possible (today only the guidance card does).
6. **Polish, only if 1-5 are done:** the objectives panel still prints "2 of 7 objectives ·
   primaries done"; the tutorial jumps from "STEP 1 OF 3" to "STEP 3 OF 3"; six terrain-data
   Journal facts are dry (`wall-transect`, `flank-transect`, `inter-mound-channel`,
   `eastern-floor`, `upper-canyon`, `south-wall`); README still describes the old loop.
7. **Owner phone test** of the deployed build, ten minutes. Act on what they say.

Not in this sprint: opening-frame art passes, bug-hunt and verify briefs, CI shard tuning,
Realistic mode, cosmetics, new plan documents.

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
- **Claude:** one reset available. The owner will apply it when the Claude limit is close to
  5%, so run Claude down to about 5% and then say so at the top of a reply. The weekly figure
  does not matter. At handoff: 5-hour window 27% (resets 16:10 CST), week 42%.
- **Codex:** 5-hour window empty until 16:41 CST; 84% of the week left. Two tasks at a time.
- **Cursor:** two separate pools, both at about 100% and both fine to run to zero: "Cursor
  Models" (Composer, Grok) and "Other Models" (Gemini, GPT, Claude). Reset in 10 days.
- **OpenCode:** free models, no limit to manage.
- Check Claude and Codex with `~/.local/bin/ai-limits --refresh` (poll no faster than every
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
