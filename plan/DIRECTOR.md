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
- **Merged locally by 19:25 CST, not pushed until the gate is green** (gate log
  `.cache/sprint/gate2/`): S6 tutorial step labels and README; S5 and S5b facts (no repeats,
  one card per point of interest, test `guideFactsDistinct`); S4 one-line Finish dive on
  phones. Blue Hole by keyboard on this build: 3 finds, 91 s.
- S7 (Codex) checked all 138 facts against sources: 85 correct, 29 reworded, 4 wrong and
  fixed, 20 unverifiable and rewritten. Merged and pushed as `b17ec3a0` at 21:00; confirm
  CI and the deploy with `gh run list --branch main --limit 3`.
- **In flight** (T3 delegates, own worktrees):
  - S4b Blue Hole second find by touch (Composer): touch player sticks at 26 m with
    "SEABED CLOSE · RISE"; owns touch and vertical-motion code in `src/sub/**`.
  - S2 Hunga finishable by the plain player (Composer, item 2): site data only.
  - S3b where the seconds go at each find (Opus medium, item 3): the turning circle was
    not the cause (S3 branch `t3/survey-speed-turning-radius`, 9.6 m to 7.8 m, no change
    in reveal times, unmerged; S3b decides whether to include it).
  - From S8's first-time player review (Gemini, 20:15; debriefs reached at all three
    viewports; best moment Lost City's Poseidon tower), launched 20:25:
    S9 teach `C` to descend, Ctrl+W notice never over a reveal or debrief (Composer);
    S10 debrief thumbnails blank on portrait (`canvasThumbnail` gets no `subjectY`), finds
    grid, completion banner stays, reveal gets Continue and about 12 s (Composer);
    S11 front page to one start, one site choice and one More; briefing to about 70 words;
    HUD hidden behind briefing; `.hud-finish` clear of `.hud-bar` (Composer);
    S12 "Unknown contacts: 0 of 0" line and wording, catalogue-only globe pins (Codex medium);
    S13 reveal close-ups that show sand instead of the subject (Gemini; framing data only).
- **01:30 Sunday state.** `main` pushed as `844edb4a` after a full gate: content, prettier,
  py, typecheck, build pass; unit suite 207 files, 4,861 tests; all 13 sites end on the
  debrief for a plain keyboard player with the script's anti-stuck rule OFF, no page
  errors:

  | site                 | debrief s | site                | debrief s |
  | -------------------- | --------- | ------------------- | --------- |
  | axial-seamount-ashes | 54        | hudson-canyon       | 62        |
  | beebe-vent-field     | 61        | hunga-tonga-caldera | 79        |
  | bismarck             | 83        | kamaehuakanaloa     | 63        |
  | blake-plateau-corals | 65        | lost-city           | 47        |
  | challenger-deep      | 91        | monterey-canyon     | 56        |
  | endurance            | 47        | titanic             | 113       |
  | great-blue-hole      | 57        |                     |           |

  Confirm CI (the 22:50 push `b9191bda` failed CI on the title-screen e2e audit, fixed by
  S21) and the deploy with `gh run list --branch main --limit 3`. Live was still
  `b17ec3a0` at 01:30.

- **In this push:** S3b, S9, S10, S11, S4b, S12, S14, S15, S16, S17, S18, S19, S20, S21,
  S13b (reveal framing: C-rated reveals about 23 of 64 to 0; 23 still B for lack of art:
  Titanic shoes, hull piece and plaque; Challenger Deep basin and walls; Hunga floor and
  flank; Blue Hole drop-offs).
- **02:40 Sunday state.** LIVE: `844edb4a` (CI green, deployed about 01:45). PUSHED at
  02:40: `1dd16218` with S22 (touch); confirm CI and deploy with
  `gh run list --branch main --limit 3`. Gate on it, quiet machine: static checks,
  typecheck, build pass; unit suite 207 files, 4,864 tests; all 13 sites end on the debrief
  by keyboard with anti-stuck off; six touch dives end on the debrief with all finds
  (844x390: Blue Hole 62 s, Hunga 76 s, Lost City 45 s, Titanic 118 s; 390x844: Blue Hole
  66 s, Monterey 69 s). S22 itself measured all 13 by touch at 844x390.
- **Props, read before touching `src/world/props/Wiring.ts` or the cue in `hud.ts`:** what
  ships is S22's version (touch-measured on 13 sites): a slide along props with the sign
  of "forward into the wall" fixed, `escapePocket` (after a second of thrust with no
  headway the hull is carried up and out, or straight back out under a ceiling), and
  `approachBlockedByProp` ignoring the last 25% of scan range so the target's own prop
  does not count as a blocker (the real cause of Blue Hole's endless "Blocked ahead").
  It replaced the orchestrator's cue-only version (three attempts, each fixed one site and
  broke another; the unit suite was green through all of them). Any change here must
  replay great-blue-hole, lost-city and hunga-tonga-caldera by keyboard
  (`TOUR_NO_ANTISTUCK=1 TOUR_NO_FINISH=1`) AND by touch (`TOUCH_FULL=1`), in the gate.
- **03:45 Sunday state.** LIVE since about 03:00: `1dd16218` (touch build, CI green).
  PUSHED 03:45: `dd833e5b` with S23: Hunga's `caldera-tuff-wall` is 120 m wide (was 150)
  and sits 45 m south and 10 m east, so the guided line from the first find clears it.
  Gate: static checks, build, unit suite 207 files / 4,864 tests pass; Hunga by keyboard
  71 and 72 s (was 94 to 254 s), by touch 73 s (844x390) and 75 s (390x844); Lost City 44,
  Blue Hole 58, Bismarck 83, Titanic 113 s by keyboard. The rim-wall reveal still frames
  the wall and its vents (orchestrator looked at one capture). Confirm CI and deploy with
  `gh run list --branch main --limit 3`.
- **06:00 Sunday state.** LIVE: the second-review batch (CI green, deployed about 05:10):
  S25 wildlife names, S26 plain debrief ("You found 6 of 6", no stars, "Extra finds",
  fresh "Did you know?", text tiles for finds without a close-up), S27 cue hysteresis and
  secondary contact tags, S28 front-page sentence and landscape reveal rail, S29 facts
  matched to their cards (two of its rewrites reverted by the orchestrator: Hunga flank
  and Hudson flank keep their livelier facts). PUSHED 06:00: `7c0f8614` with S30 + S30b,
  the debrief finds list as a grid, landmarks with photos first; confirm CI and deploy
  with `gh run list --branch main --limit 3`.
- Gate on `7c0f8614`: static checks, build, unit suite 207 files / 4,880 tests pass;
  keyboard Lost City 44 s, Blue Hole 58 s, Hunga 71 s, Titanic 115 s; touch Lost City
  46 s (844x390), Blue Hole 66 s (390x844); all end on the debrief, no page errors. The
  gate before it (13 sites by keyboard, 7 touch dives incl. Titanic from the front page
  in portrait) was also clean.
- **06:40 Sunday.** PUSHED `d27d3d6e` with S31: a one-line hook for each of the 13 sites
  (`SITE_HOOKS` in `src/game/Tour.ts`, built only from each site's guide) shown above the
  debrief's "Next dive" button. Gate: static checks, build, unit suite 207 files / 4,882
  tests; Titanic and Lost City by keyboard (114 s, 44 s) and by touch (118 s at 844x390,
  42 s at 390x844), all on the debrief. In landscape the hook costs the finds grid about
  25 px: the longest four-line tile name clips slightly (accepted).
- **06:45 Sunday: LIVE is `08fad020`** (S31 hooks; CI green, deployed about 06:36).
  Nothing in flight, no scheduled tasks pending. Next: the owner's phone test.
- **Lesson:** look at one capture before merging any layout change. S30's report and
  measurements were clean while its portrait screenshot showed tiles stacked on top of
  each other; it had measured horizontal clipping only.
- **Nothing in flight. The backlog is the owner's phone test** (Sunday): act on what they
  say. S24's items not acted on: Challenger Deep reveals show blurred seabed (no art);
  20 to 30 s between finds at Titanic; speed shown in knots. Known and accepted: 23
  reveals rated B for lack of art; dives are short for a script that steers well (44 to
  115 s by keyboard). Unverified wildlife placements: a Bolinopsis comb jelly at
  Endurance; Graneledone in Hudson's 300 to 588 m band.
- **Wrap-up still to do (Monday buffer):** final State here; `list_scheduled_tasks` and
  delete any left; remove finished worktrees under `~/.t3/worktrees/submarine-explorer/`
  and the stale `~/subexp-wt/124-*`, `131-*` (unmerged on purpose: S2
  `t3/hunga-tonga-finishable-route`, S3 `t3/survey-speed-turning-radius`, S13's WIP
  `t3/improve-landmark-reveals`; all superseded).
- **Reveal framing:** S13 (Gemini) died when Cursor's Other Models pool hit 0% (resets Nov
  24). Its unreviewed work is committed as WIP on `t3/improve-landmark-reveals`
  (`fe6c8a69`). A scheduled wake at 23:33 launches S13b on Sonnet to review and finish it.
- **S2 cancelled** (Hunga data route): superseded by S16's code fix.
- **Limits at 22:00:** Claude 33% until 23:30; Codex 95% of a new window, weekly 68%;
  Cursor Models 25.5%, Other Models 0%. No Gemini for the rest of the sprint: anything
  judged from screenshots goes to Sonnet.
- **Machine load distorts play timings and causes 30 s unit timeouts** when more than about
  four delegates play at once (load average 22 to 28 on 12 cores). Read delegate timings
  with their load figure; tell delegates not to run the full unit suite.
- **Live at 20:06:** `b17ec3a0` deployed (CI green): facts, phone Finish dive, tutorial
  labels, README.
- **Held from S8, waiting for S3b:** hide the "✓" world pills once scanned (crowd the sub);
  Titanic's 600 m bow-to-stern transit is 40 to 50 s of flat sand (faster cruise when far
  from every contact, or a closer start). S8 judged short dives with good finds as the
  best part, so removing dead time ranks above lengthening short dives.
- **Owner, 19:30:** work decisions are the orchestrator's. The owner cannot monitor after
  end of day Sunday 2026-11-15; Fable access and limits end end of day Monday 2026-11-16;
  nothing may keep spending after that. Use every provider on every parallelizable task
  now, except: hold a provider's allowance for a foreseeable task that needs it, and hold
  a task that will be done better with results still in flight.
- **Held on purpose:** richer short dives (six sites play in under 100 s) waits for S1's
  full-route table and S8's review; a final correctness sweep of the play loop on Codex
  (reveal, endings, saves, orientation change mid-dive) waits until S3b and S4b land.
  Codex cannot play, so it gets source-checked content and test-verifiable code.
- **Timeline:** tonight, deploy batch 1, land and deploy the second wave. Sunday morning,
  owner phone test on the live build; Sunday, act on it, short-dive pass, Codex sweep,
  final deploy by evening. Monday is buffer only: final State here, delete scheduled
  tasks, leave nothing running.
- Touch scanning works (the 0-scan result was a script bug, fixed). Lost City by touch: two
  scans in 15 s. Blue Hole by touch: first find only, second never reached (unproven).

### Played results

Full routes on `3e95564e` (S1, 19:45 CST), `tools/playtest/tour-all.sh` with `--no-finish`
(never presses "Finish dive"), keyboard, 300 s cap. All 13 end on the debrief by themselves.
"Finds" can exceed the site's primary total where extra contacts were scanned.

| site                 | finds/total | first reveal s | end s | anti-stuck fired |
| -------------------- | ----------- | -------------- | ----- | ---------------- |
| axial-seamount-ashes | 6/5         | 7              | 107   | yes              |
| beebe-vent-field     | 5/4         | 12             | 95    | no               |
| bismarck             | 5/5         | 6              | 117   | no               |
| blake-plateau-corals | 5/4         | 12             | 95    | no               |
| challenger-deep      | 4/4         | 13             | 126   | no               |
| endurance            | 4/4         | 20             | 64    | no               |
| great-blue-hole      | 3/3         | 9              | 78    | no               |
| hudson-canyon        | 4/4         | 7              | 96    | no               |
| hunga-tonga-caldera  | 3/3         | 8              | 183   | yes              |
| kamaehuakanaloa      | 4/4         | 7              | 92    | no               |
| lost-city            | 4/4         | 7              | 107   | yes              |
| monterey-canyon      | 3/3         | 16             | 76    | no               |
| titanic              | 8/6         | 12             | 170   | no               |

The script's anti-stuck rule (climb and back off when not moving) is something a real
player does not have. Where it fired, guidance alternated between "Get closer to scan" and
"SEABED CLOSE · HOLD Space": Hunga on the steep rim at 390 to 450 m, Lost City on the long
transit to Poseidon (49 to 81 s), Axial on one tight vent approach (61 s). Same family as
Blue Hole by touch ("SEABED CLOSE · RISE" at 26 m, 1 of 3 finds). Seven sites finish in
under 100 s.

## Backlog, in order

1. **Measure full routes.** Done (S1): `tools/playtest/tour-all.sh`, table above.
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

## Routing from Saturday night: Codex first (owner's usage panel, 2026-11-14 late evening)

Cursor's "Other Models" pool (Gemini, GPT-5.6 Sol, Claude) is at 3% and does not reset until
Nov 24, so it is retired. "Cursor Models" (Composer, Grok) fell from 99% to 28% in about six
hours and will not last Sunday as the default. Codex has a full 5-hour window, 69% of its
week and one reset in hand. Claude has 67% of its week (Fable 53%).

- **Default code delegate is now Codex**, three at a time at medium effort: GPT-5.6 Sol for
  well-specified changes, GPT-6.1 Sol for cross-cutting or previously failed work. If the
  5-hour window empties on Sunday, ask the owner for the Codex reset.
- **Composer** only for small mechanical changes (config, one-line test updates), so the
  28% lasts through Sunday.
- **Screenshot judgement moves from Gemini to Claude Sonnet.** Anything of S13's reveal
  framing that Gemini did not finish goes to Sonnet.
- **Sunday's first-time-player review** (the S8 kind) goes to Sonnet, after the owner's
  phone test.
- **Opus** unchanged: one at a time, medium effort, for work Codex has failed at.
- **OpenCode** unchanged; try it once on a small mechanical change before Composer runs out.
- The limit of about four delegates playing at once still holds: it is the machine, not
  the budgets.

## How to work (lessons from the first 80 minutes)

The first orchestrator thread spent 63 points of the Claude 5-hour window in 80 minutes.
These rules exist so that does not repeat.

- **The orchestrator specifies, accepts and merges. It does not implement or read images.**
  Source edits go to a delegate, even small ones. Screenshot judgement goes to Sonnet.
  Read tables and short reports.
- **Keep the thread short.** State lives in this file, in git and in memory. Update this
  file's State and Backlog when something lands; do not narrate in chat. Hand off to a fresh
  thread again if this one grows long.
- **Delegates, by job** (all through T3 `delegate_task`, `isolation: "worktree"`, one clear
  file-ownership list each, final report capped at about 20 lines):
  - Codex (default for game code and test fixes): GPT-5.6 Sol for well-specified work,
    GPT-6.1 Sol for harder work; **at most three at a time, medium effort**. Four at high
    effort emptied its 5-hour window in 35 minutes and every task died before its final
    test run. Codex delegates do not play the game; give them test-verifiable work.
  - Cursor Composer 2.5: small config or mechanical changes only (pool at 28%).
  - Cursor "Other Models" (Gemini, GPT, Claude): retired, pool empty until Nov 24.
  - OpenCode free models (DeepSeek V4.1 Flash, Inkling 2): self-contained scripts outside
    the game code that can check themselves.
  - Claude Opus 5.5 (owner, 2026-11-14): ambitious work that has to be done well, for less
    than Fable costs: cross-cutting gameplay design and implementation, or a fix another
    delegate failed at. It spends the Claude window, so one at a time.
  - Claude Sonnet: writing that needs taste (facts, copy), and anything judged by looking
    at screenshots.
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
- **Merge gate:** `npm run check:content`, `npx prettier --check .`, `npm run test:py`,
  typecheck, unit tests, build, and a played session. CI's static job (`tools/gates.sh
--phase checks`) fails on content WARNINGS and on formatting: the 20:41 push went red on
  a 247-character guide entry, two one-paragraph entries and three unformatted files.
  Every delegate brief must end with the content check and prettier. e2e specs are not a
  gate; update a text-coupled spec only when it is a one-line change, otherwise delete it.
- **No** progress notes, review logs, percent-to-1.0 estimates, golden captures or CHANGELOG
  entries. Git history is the record.
- **Judge by play:** time to first reveal, finds, whether the dive ends on the debrief, and
  what the player sees and learns. Not screenshot scores.

## Budgets (owner, 2026-11-14)

- The owner does not care to have any resets left after this weekend. Spend freely.
- **Claude:** no reset left. 35% of the 5-hour window at 21:46 Saturday (resets 23:30), 67%
  of the week, Fable 53%. Opus at medium effort, one at a time; keep the orchestrator
  thread short.
- **Codex:** full 5-hour window at 21:46 Saturday, 69% of the week, one reset available.
  Three tasks at a time.
- **Cursor:** "Cursor Models" (Composer, Grok) 28% left; "Other Models" 3% left, retired.
  Both reset Nov 24, after the sprint.
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
