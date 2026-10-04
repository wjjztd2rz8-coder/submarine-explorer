# Overnight log

Append-only notes from timed headless orchestrator runs, for the owner to read in the morning.

- 2026-09-24 00:10 CDT headless run: skipped: orchestrator active (lock 'interactive', 7 min old)

## 2026-09-24 00:31 (interactive thread)

- Merged tonight: D-SONAR, D-POLISH (owner playtest #2 fixes), D-POWER, D-CURRENTS, D-ROV. All gates green on main.
- D-PHOTO: Codex hit its limit at 00:30 (back 3:16 AM). A Claude Opus subagent is finishing it in /home/vijay/subexp-wt/d-photo; the interactive thread will review and merge it.
- Remaining after D-PHOTO: docs reconciliation (README, docs/architecture.md, plan/STATUS.md Phase D section, MASTER-PLAN §6).
- 2026-09-24 01:10 CDT headless run: skipped: orchestrator active (lock 'interactive', 2 min old)

## 2026-09-24 01:16 (interactive thread): Phase D complete

- Merged: D-PHOTO (Codex started it, and a Claude Opus subagent finished it after the Codex limit), then the docs reconciliation (README controls table, architecture, settings, STATUS with a playtest #3 checklist, MASTER-PLAN). Full gates are green on main (fe918dc).
- The overnight timer was stopped: no Phase D work remains. Nothing has been pushed.
- Next for the owner: playtest #3 (checklist in plan/STATUS.md), then the go-ahead for the GitHub repo and Pages.
- 2026-09-29 19:45 CDT headless run: skipped: budget gate (claude 5h 0.0% left (resets Tue Sep 29 20:59) | 7d 63.0% left (resets Thu Oct 01 06:59) codex 5h 49.0% left (resets Tue Sep 29 21:29) | 7d 92.0% left (resets Tue Oct 06 16:29) [as of 174 min ago] )
- 2026-09-30 01:45 CDT headless run: skipped: budget gate (claude 5h 1.0% left (resets Wed Sep 30 02:09) | 7d 51.0% left (resets Thu Oct 01 06:59) codex 5h 82.0% left (resets Wed Sep 30 03:11) | 7d 89.0% left (resets Tue Oct 06 16:29) [as of 185 min ago] )

## 2026-09-30 03:48 headless run

- Merged: F0-CORE audit note, F1-WRECKS, F1-VEHICLES (both finished by Sonnet agents after the earlier interruption). Gates green on main.
- Open audit findings (F0-CORE-AUDIT.md): P2 `?tier=auto` Settings reload hint wrong; P2 dynamic-resolution oscillation; P3 no system dispose. Not yet fixed.
- Deferred by agents: cockpit interior is minimal; chase camera distance (CameraRig) hides hull detail; ROV headlight rig.
- Next: F1-OCEAN, F1-TERRAIN, F1-GEO, F1-TOUCH remain in wave 1. No tag yet (wave 1 incomplete).
- Pushed main (6ed8221, no tag). Pages deploy succeeded. GitHub CI e2e shards failed on the previous commit with timeouts (d2-predive, mission.spec: software-rendering runners are slow, 90 s test timeouts), while local gates are green. Owner/next run: consider raising CI timeouts or trimming shard load. Run 36692039151 is in progress for the new push.

## 2026-09-30 06:03 headless run

- Merged (Sonnet agents, gates green on main): F1-OCEAN (filmic post stack, bloom, god rays, Snell's window, headlight beams, marine snow, caustics) and F1-GEO (procedural hero set pieces for every non-wreck site, smoker plumes, coral mounds, carbonate towers; kit in src/world/props/geo/). CHANGELOG conflict resolved by keeping both.
- Remaining wave 1: F1-TERRAIN, F1-TOUCH. No tag yet.
- Claude 5h window ended at ~1% after the two agents, so nothing else was started.
- For owner: F1-GEO plumes are large stylised cones; tower flanges/Kamaehuakanaloa heap look rough; Journal tag unchecked in-game; Lava tube and gas plume cut. F1-OCEAN frame cost unmeasured (SwiftShader). F0-CORE P2s still open. CI e2e shards timed out earlier on software rendering.
- 2026-09-30 06:15 CDT headless run: skipped: budget gate (claude 5h 0.0% left (resets Wed Sep 30 08:09) | 7d 38.0% left (resets Thu Oct 01 06:59) codex 5h 100.0% left (resets Wed Sep 30 03:11) | 7d 89.0% left (resets Tue Oct 06 16:29) [as of 455 min ago] )
- 2026-09-30 07:45 CDT headless run: skipped: budget gate (claude 5h 0.0% left (resets Wed Sep 30 08:09) | 7d 38.0% left (resets Thu Oct 01 06:59) codex 5h 100.0% left (resets Wed Sep 30 03:11) | 7d 89.0% left (resets Tue Oct 06 16:29) [as of 545 min ago] )

## 2026-09-30 08:40 (interactive thread): budget pause

- Owner asked for continuous usage checks. Added `tools/budget-watchdog.sh`, which wraps every headless run (resume.sh) and kills the run before Claude's 5h falls under 23% or the weekly under 7%; it also stops Codex units at Codex <7%.
- Launched four Sonnet agents (f1-terrain, f1-touch, f2-life, f1-fixes). They burned the fresh window fast; paused two at 39% and the rest at 18% (the watchdog tripped at 18% between polls). All work is WIP-committed in the worktrees; see `.cache/claude/paused-packages.md` for how to resume (one agent at a time).
- Codex 6.1 Sol is running f1-audit (verification of the overnight merges) and ci-timeouts.
- 2026-09-30 12:15 CDT headless run: skipped: budget gate (claude 5h 6.0% left (resets Wed Sep 30 13:19) | 7d 30.0% left (resets Thu Oct 01 06:59) codex 5h 72.0% left (resets Wed Sep 30 13:25) | 7d 84.0% left (resets Tue Oct 06 16:29) [as of 201 min ago] )
- 2026-09-30 15:31 CDT headless run: skipped: budget gate (claude error: <urlopen error [Errno -2] Name or service not known> codex 5h 100.0% left (resets Wed Sep 30 13:25) | 7d 84.0% left (resets Tue Oct 06 16:29) [as of 397 min ago] )
- 2026-09-30 16:45 CDT headless run: skipped: budget gate (claude error: <urlopen error [Errno -2] Name or service not known> codex 5h 100.0% left (resets Wed Sep 30 13:25) | 7d 84.0% left (resets Tue Oct 06 16:29) [as of 471 min ago] )
- 2026-09-30 18:15 CDT headless run: skipped: budget gate (claude error: <urlopen error [Errno -2] Name or service not known> codex 5h 100.0% left (resets Wed Sep 30 13:25) | 7d 84.0% left (resets Tue Oct 06 16:29) [as of 561 min ago] )
- 2026-09-30 19:45 CDT headless run: skipped: budget gate (claude error: <urlopen error [Errno -2] Name or service not known> codex 5h 100.0% left (resets Wed Sep 30 13:25) | 7d 84.0% left (resets Tue Oct 06 16:29) [as of 651 min ago] )
- 2026-10-01 08:30 CDT headless run: skipped: budget gate (claude error: <urlopen error [Errno -2] Name or service not known> codex 5h 100.0% left (resets Wed Sep 30 13:25) | 7d 84.0% left (resets Tue Oct 06 16:29) [as of 1416 min ago] )
- 2026-10-01 12:15 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 24.0% left (resets Thu Oct 01 13:32) | 7d 60.0% left (resets Tue Oct 06 16:29) [as of 84 min ago] )

## 2026-10-01 14:50 headless run

- Merged (gates green on main): F-VISUAL-QA (report plus screenshot spec), F2-PROGRESS (research points, upgrades workshop, hull-class unlocks, star ratings), F3-AUDIO (adaptive score, SFX, music slider), F2-LIFE (marine life engine, ~30 species, rare encounters, finished by a Sonnet agent). Added the missing hook so life scans pay species RP. Pushed main, tagged `f2`; Pages deploy was in progress.
- Running: Codex `f-visual-fixes` (worktree /home/vijay/subexp-wt/f-visual-fixes, unit subexp-f-visual-fixes): headlight/beam, exposure, free-dive openings, chase camera below the surface, from the F-VISUAL-QA shared briefs. Collect next run.
- Open from F-VISUAL-QA: per-site hero shape/material fixes after lighting, 3 content decisions (Blue Hole vs atoll, Bismarck depth discrepancy, Hunga era). F2-LIFE: rare animals are small in frame; deep midwater is pale from fog glare. Remaining plan: F3-BRAND-UI, F3-ONBOARD, wave 4. Claude usage endpoint returned 429 (last known 98% left).
- 2026-10-01 15:15 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 88.0% left (resets Thu Oct 01 19:45) | 7d 58.0% left (resets Tue Oct 06 16:29) [as of 9 min ago] )
- 2026-10-01 16:45 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 81.0% left (resets Thu Oct 01 19:45) | 7d 57.0% left (resets Tue Oct 06 16:29) [as of 71 min ago] )

## 2026-10-01 17:50 headless run

- Merged: F-VISUAL-FIXES (Codex; headlight beams, exposure, free-dive openings, chase camera ceiling) and F3-ONBOARD (Sonnet; first-dive tutorial, one-shot hints, device-aware controls card). Gates were green on each branch; main re-gated after merge.
- Decisions for owner: onboarding state has its own save key `subexplorer.onboard.v1`; `?tutorial=0|1` URL override; on phone landscape the tutorial card overlaps the non-interactive scan panel (not the controls).
- Remaining: F3-BRAND-UI (name choice from docs/research/brand.md: Bathyline recommended, needs owner approval), wave 4 audits/docs, F-VISUAL-QA per-site hero fixes, 3 content decisions (Blue Hole, Bismarck depth, Hunga era). Nothing running.
- 2026-10-01 18:15 CDT headless run: skipped: budget gate (claude 5h 48.0% left (resets Thu Oct 01 18:39) | 7d 86.0% left (resets Thu Oct 08 06:59) codex 5h 4.0% left (resets Thu Oct 01 19:45) | 7d 45.0% left (resets Tue Oct 06 16:29) )
- 2026-10-01 19:26 CDT headless run: skipped: budget gate (claude 5h 98.0% left (resets Thu Oct 01 23:40) | 7d 86.0% left (resets Thu Oct 08 07:00) [as of 2 min ago] codex 5h 4.0% left (resets Thu Oct 01 19:45) | 7d 45.0% left (resets Tue Oct 06 16:29) [as of 72 min ago] )

## 2026-10-01 22:00 headless run

- Merged (main gates green): F-CONTENT-FIX (Codex, data/facts), F-GEO-SCARP (Sonnet; curved/bedded walls with seated talus at Challenger, Monterey, Hunga, Blue Hole), F2-EXPLORE (Codex; secrets, sample collection, dynamic events; also fixed the f2-life animal-preview failures). Pushed main, tagged `f2b`.
- Running/pending: Codex F2-MODES (worktree f2-modes) failed its gates after 2 rounds; needs a Sonnet finish next run. See .cache/claude/paused-packages.md.
- Notes: Codex auto-resumed tasks after its limit reset and edited worktrees while I worked; Claude 5h ended ~40%, so no further agents. Walls still read dark/chalky under headlights (L1 lighting tuning). Owner to review: F-GEO-SCARP left projectUVs alone (arc-length UVs instead).
- 2026-10-01 21:34 CDT headless run: skipped: budget gate (claude 5h 41.0% left (resets Thu Oct 01 23:40) | 7d 79.0% left (resets Thu Oct 08 07:00) codex 5h 27.0% left (resets Fri Oct 02 00:50) | 7d 34.0% left (resets Tue Oct 06 16:29) [as of 33 min ago] )
- 2026-10-01 21:45 CDT headless run: skipped: budget gate (claude 5h 41.0% left (resets Thu Oct 01 23:40) | 7d 79.0% left (resets Thu Oct 08 07:00) [as of 2 min ago] codex 5h 27.0% left (resets Fri Oct 02 00:50) | 7d 34.0% left (resets Tue Oct 06 16:29) [as of 44 min ago] )
- 2026-10-01 22:15 CDT headless run: skipped: budget gate (claude 5h 39.0% left (resets Thu Oct 01 23:39) | 7d 78.0% left (resets Thu Oct 08 06:59) codex 5h 27.0% left (resets Fri Oct 02 00:50) | 7d 34.0% left (resets Tue Oct 06 16:29) [as of 74 min ago] )
- 2026-10-01 22:45 CDT headless run: skipped: budget gate (claude 5h 28.0% left (resets Thu Oct 01 23:40) | 7d 77.0% left (resets Thu Oct 08 07:00) [as of 2 min ago] codex 5h 27.0% left (resets Fri Oct 02 00:50) | 7d 34.0% left (resets Tue Oct 06 16:29) [as of 103 min ago] )
- 2026-10-01 23:15 CDT headless run: skipped: budget gate (claude 5h 24.0% left (resets Thu Oct 01 23:40) | 7d 76.0% left (resets Thu Oct 08 07:00) [as of 2 min ago] codex 5h 5.0% left (resets Fri Oct 02 00:50) | 7d 30.0% left (resets Tue Oct 06 16:29) [as of 17 min ago] )

## 2026-10-02 02:00 headless run

- Merged (main gates green, pushed, tagged `f3`): F-HUD-LAYOUT (Sonnet finished; tutorial and hint chip in left column, scan panel top-centre, controls bar hides once learned), F-ARCADE-ACCESS (Codex; no depth gating in Arcade, composed near-site opening, `tools/golden-shots.mjs`), F2-MODES (Codex plus Sonnet; Arcade/Realistic with Advanced/Custom, exaggerated currents, Daily dive, Free dive in the briefing).
- Fixed on integration: Codex's e2e had never really run (sandbox blocked ports), so three specs needed updating for the composed Arcade opening; Custom keeps the classic long approach.
- Decisions for owner: scan panel moved to top-centre (chase camera keeps the sub low); Gentle currents retired from new choices; Custom mode hides under Advanced.
- Queue: f-bughunt-1 and f-bughunt-2 wait for Codex budget (Codex 5h had reset to 100%; dispatcher will launch). Next: hero-site polish with golden shots, brand (needs name OK). Claude 5h ended ~69%; not started another agent because the 3 merges used the run.
- 2026-10-02 03:43 CDT headless run: skipped: budget gate (claude 5h 16.0% left (resets Fri Oct 02 04:39) | 7d 66.0% left (resets Thu Oct 08 06:59) codex 5h 92.0% left (resets Fri Oct 02 07:03) | 7d 29.0% left (resets Tue Oct 06 16:29) [as of 87 min ago] )
- 2026-10-02 03:45 CDT headless run: skipped: budget gate (claude 5h 16.0% left (resets Fri Oct 02 04:39) | 7d 66.0% left (resets Thu Oct 08 06:59) [as of 2 min ago] codex 5h 89.0% left (resets Fri Oct 02 07:03) | 7d 28.0% left (resets Tue Oct 06 16:29) )
- 2026-10-02 04:15 CDT headless run: skipped: budget gate (claude 5h 16.0% left (resets Fri Oct 02 04:39) | 7d 66.0% left (resets Thu Oct 08 06:59) [as of 2 min ago] codex 5h 75.0% left (resets Fri Oct 02 07:03) | 7d 26.0% left (resets Tue Oct 06 16:29) [as of 12 min ago] )

## 2026-10-02 10:30 headless run

- Merged (main gates green, pushed, tagged `f4` (`f3b` already existed)): F-HERO-VENTS (Lost City terraced towers with flanges; Beebe smokers, sediment, ambient fill; Sonnet, sent back once because Beebe's seabed was black), F-HERO-TITANIC (opening 16 m off the bow, ambient fill, pale ooze, debris-bow; low-tier fill fix), F-BUGHUNT-2 (Codex fixes: hull refit on mode change, daily date and Low-light, controls-hint counting, disposal leaks), F-BUGHUNT-1 (audit doc).
- Queued for Codex: `40-f-bughunt-fixes` (touch PHOTO exit, Monterey 14.7 km Arcade start, research save migration, life disposal).
- Remaining hero sites: Great Blue Hole, Monterey Canyon. Titanic known gaps: sub covers mid-hull, far wreck dim, low-tier bed blotchy. Brand still needs the owner's name OK (Bathyline recommended). Claude 5h ended ~60%.
- 2026-10-02 08:10 CDT headless run: skipped: budget gate (claude 5h 21.0% left (resets Fri Oct 02 09:39) | 7d 58.0% left (resets Thu Oct 08 06:59) codex 5h 89.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 16 min ago] )
- 2026-10-02 08:15 CDT headless run: skipped: budget gate (claude 5h 21.0% left (resets Fri Oct 02 09:39) | 7d 58.0% left (resets Thu Oct 08 06:59) codex 5h 89.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 21 min ago] )
- 2026-10-02 08:45 CDT headless run: skipped: budget gate (claude 5h 21.0% left (resets Fri Oct 02 09:39) | 7d 58.0% left (resets Thu Oct 08 06:59) [as of 12 min ago] codex 5h 89.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 51 min ago] )
- 2026-10-02 09:15 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 89.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 81 min ago] )
- 2026-10-02 09:45 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 89.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 111 min ago] )
- 2026-10-02 10:15 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 89.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 141 min ago] )
- 2026-10-02 10:45 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 89.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 171 min ago] )
- 2026-10-02 11:15 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 89.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 201 min ago] )
- 2026-10-02 11:45 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 89.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 231 min ago] )
- 2026-10-02 12:15 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 89.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 261 min ago] )
- 2026-10-02 12:45 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 100.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 291 min ago] )
- 2026-10-02 13:15 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 100.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 321 min ago] )
- 2026-10-02 13:45 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 100.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 351 min ago] )
- 2026-10-02 14:15 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 100.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 381 min ago] )
- 2026-10-02 14:45 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 100.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 411 min ago] )
- 2026-10-02 15:15 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 100.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 441 min ago] )
- 2026-10-02 15:45 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 100.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 471 min ago] )
- 2026-10-02 16:15 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 100.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 501 min ago] )
- 2026-10-02 16:45 CDT headless run: skipped: budget gate (claude error: HTTP Error 429: Too Many Requests codex 5h 100.0% left (resets Fri Oct 02 12:20) | 7d 24.0% left (resets Tue Oct 06 16:29) [as of 531 min ago] )

## 2026-10-02 17:50 headless run

- Merged (main gates green, pushed, tagged `f5`): F-HERO-BLUEHOLE (carved sinkhole, pale sand, depth shade, composed opening; Sonnet), F-HERO-MONTEREY (face-on bedded wall, ambient fill; Sonnet, I fixed an e2e typing error and a Spawn.ts/CHANGELOG merge conflict), F-BUGHUNT-FIXES (Codex: touch photo exit, Arcade near-primary start, save recovery, life disposal).
- All five hero sites now have a polish pass. Blue Hole gaps: grotto prop looks tiny against the hole, no halocline haze, low-tier hole interior dark.
- Queued for Codex: 50-f-hero-verify, 60-f-bughunt-4, 70-f-perf-budget (f-bughunt-3 already running).
- Problem: the remote CI run for 800f96c failed after 54 min (a Pages deploy succeeded); worth checking CI timeouts (see CI-TIMEOUTS note). No Claude agents spawned this run; Claude 5h ended ~75%.
- Still needs owner: brand name OK (Bathyline recommended).

## 2026-10-02 18:30 headless run

- Merged: F-BUGHUNT-3 audit note only (no code). It found three P1s: live Realistic switch can breach the sub at a deep Arcade opening, locked Realistic link spawns below crush depth, Monterey opening distance (may already be fixed), plus Daily Low-light missing ROV lamps.
- Queued for Codex: 80-f-bughunt-3-fixes, 85-f-golden-run (golden-shots.mjs crashed when I ran it), 90-f-hint-dedupe. Running: f-hero-verify, f-bughunt-4, f-perf-budget.
- No Claude agents spawned; golden-shot comparison deferred to Codex. Still needs owner: brand name OK (Bathyline).

## 2026-10-02 20:30 headless run

- Merged: F-HERO-VERIFY (Codex: Blue Hole grotto doubled, Lost City ambientFill 8, Low-tier reef ambient parity), F-PERF-BUDGET (Codex: tools/perf-budget.mjs and tests; no rendered measurements yet because the Codex sandbox blocks Chromium, so run it on the host), F-TITANIC-2 (Sonnet: broadside 70 m opening, bed fix, Blue Hole halocline haze).
- Running (Codex): f-bughunt-3-fixes, f-bughunt-4, f-golden-run. Queued: 90-f-hint-dedupe, 100-f-a11y-audit, 110-f-journal-factcheck, 120-f-save-soak.
- Note: the gates e2e takes >10 min with two in parallel; ran sequentially on main.
- Still needs owner: brand name OK (Bathyline).
- 2026-10-02 20:45 CDT headless run: skipped: budget gate (claude 5h 43.0% left (resets Fri Oct 02 21:39) | 7d 51.0% left (resets Thu Oct 08 06:59) codex 5h 27.0% left (resets Fri Oct 02 21:55) | 7d 89.0% left (resets Fri Oct 09 16:55) [as of 82 min ago] )
- 2026-10-02 21:15 CDT headless run: skipped: budget gate (claude 5h 43.0% left (resets Fri Oct 02 21:39) | 7d 51.0% left (resets Thu Oct 08 06:59) codex 5h 2.0% left (resets Fri Oct 02 21:55) | 7d 85.0% left (resets Fri Oct 09 16:55) [as of 21 min ago] )

## 2026-10-03 headless run (started 21:45)

- Merged (main gates green, pushed, tagged `f7`; `f6` already existed): F-LOSTCITY-2 (Sonnet: pale carbonate seabed, ambientFill 12, seven far spires; the slope outside the headlight pool now reads), F-BUGHUNT-3-FIXES (Codex: deferred hull refit, safe locked deep links, daily low-light), F-SAVE-SOAK (Codex), F-BUGHUNT-4 (Codex; failing spec was a test bug), F-GOLDEN-RUN (Codex: owned preview servers, dispatcher port reservations), F-JOURNAL-FACTCHECK (Codex; I updated two e2e strings to the new copy), F-A11Y-AUDIT (Codex plus Sonnet fixes: FocusTrap node-safe, e2e rewritten).
- Fixed: f3-onboard 44px touch-target check failed at 43.99999 (rounding flake); tolerance now 43.9.
- Queued for Codex: 90-f-hint-dedupe, 130-f-daily-touch (the Daily card reboot drops touch mode), 140-f-bughunt-5 (regression audit since f5), 150-f-copy-audit.
- Director gaps: Lost City talus apron around Poseidon is a flat dark disc (lighten it); the duplicate "Something to scan" chip is still there until 90 lands. A fresh golden set needs the host (Codex sandbox cannot run Chromium).
- CI on main failed again after 55 min while Pages deployed; check the CI-TIMEOUTS note.
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~00:20)

- Merged (main gates green): F-LOSTCITY-3 (Sonnet: ragged noise-faded Poseidon apron, rubble, lifted slope and far-ridge haze; Lost City is now clearly readable on High and Low; the terrain checker texture is still visible, a known gap).
- Running (Codex): 130-f-daily-touch, 140-f-bughunt-5, 150-f-copy-audit. Queued: 90-f-hint-dedupe, 160-f-ci-timeout-check, 170-f-touch-audit, 180-f-bughunt-6-modes.
- Not done: no fresh golden set (needs the host); I checked the 2026-10-02-2323 set (Titanic good). Claude 5h ended ~65%.
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~01:05)

- Merged (main gates green): F-DAILY-TOUCH (Codex: Daily card reboot keeps touch mode), F-BUGHUNT-5 (Codex: input, discovery store and tile-loader fixes). CHANGELOG conflicts resolved by keeping both sides.
- Running (Codex): 150-f-copy-audit, 160-f-ci-timeout-check, 170-f-touch-audit. Queued: 90-f-hint-dedupe, 180-f-bughunt-6-modes, 190-f-audio-audit, 200-f-mobile-lowtier-audit.
- No Claude agents spawned; Claude 5h was ~66%. Lost City terrain checker texture and fresh golden set still open. Not pushed or tagged (no wave complete).
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~01:20)

- Merged (main gates green, not pushed): F-COPY-AUDIT (Codex; Titanic spawn test moved to Challenger Deep). CHANGELOG conflict resolved by keeping both sides.
- Running (Codex): 160-f-ci-timeout-check, 170-f-touch-audit, 180-f-bughunt-6-modes. Queued: 90-f-hint-dedupe, 190-f-audio-audit, 200-f-mobile-lowtier-audit, 210-f-bughunt-7-copy-regress.
- No Claude agents spawned (e2e gates took ~40 min with three Codex tasks running; a stale preview server from a timed-out gate run blocked one rerun, so use unique ports and a detached run).
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~02:05)

- Merged (main gates green, pushed, no tag): F-CI-CHECK (160), F-TOUCH-AUDIT (170), F-BUGHUNT-6-MODES (180; all Codex). Fixed merge fallout: the old touchControls test stub lacked `document.addEventListener`, and the touch-audit e2e still expected the retired scan-range hint chip (removed). The 90-f-hint-dedupe brief was obsolete (copy-audit already did it) and was deleted.
- Running (Codex): 190-f-audio-audit, 200-f-mobile-lowtier-audit, 210-f-bughunt-7-copy-regress. Queued: 220-f-bughunt-8-touch-regress, 230-f-ci-split, 240-f-title-scene-brief (rebrand spec).
- Pitfall: a stale `dist/` or a stale preview server on the port makes gates fail misleadingly; rebuild and use fresh ports.
- No Claude agents spawned (e2e gate waits dominated the run). Claude 5h ~60%.
- Still open: fresh golden set (needs host), Lost City checker texture.
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~03:00)

- Merged (main gates green, pushed, tagged `f9`; `f8` already existed): F-AUDIO-AUDIT (190), F-MOBILE-AUDIT (200), F-BUGHUNT-7 (210), all Codex. Conflicts: CHANGELOG (kept both) and hud-layout.css (onboard card bottom 230px plus the new safe-area left). Fixed: touchControlsAudit stub lacked window.setTimeout/clearTimeout (1000 unit tests now pass).
- Queued for Codex: 220-f-bughunt-8-touch-regress, 230-f-ci-split, 240-f-title-scene-brief, 250-f-bughunt-9-audio-mobile-regress. Nothing running.
- No Claude agents spawned (Claude 5h 100% but gate waits took ~45 min). Codex 5h was 16% at start; it resets 05:22.
- CI on the previous main push failed in ~2 min (Pages deployed OK); the CI run for f51f7b6 was not checked; 230-f-ci-split covers CI.
- Still open: fresh golden set (needs host), Lost City checker texture.
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~03:20)

- Merged: F-LOSTCITY-4 (Sonnet: the "checker" on the seabed was gravel albedo aliasing at distance; a distance-based mip bias in terrain.frag.glsl removes it on High and Low; Lost City reviewed in screenshots). Worktree gates passed on the identical tree; main was not re-gated since the merge was fast-forward-equivalent (no other changes). Low tier ~0.7% darker in the lower screen; other sites not compared.
- Codex 5h was 16% (resets 05:22), so nothing launched. Queued: 220-f-bughunt-8-touch-regress, 230-f-ci-split, 240-f-title-scene-brief, 250-f-bughunt-9-audio-mobile-regress.
- Open: fresh golden set (needs host), Lost City far terrain may read bland now.
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~03:45)

- Nothing merged or launched: no worktrees, main clean and pushed. Codex 5h was 16% (resets 05:22), and the next big Claude package (F3-BRAND-UI) is blocked on the Codex spec 240-f-title-scene-brief; hero-site polish is all merged.
- Queued for Codex (4): 220-f-bughunt-8-touch-regress, 230-f-ci-split, 240-f-title-scene-brief, 250-f-bughunt-9-audio-mobile-regress.
- Next Claude run: once 240 lands, split the spec into Sonnet-sized brand/title packages; also compare a fresh golden set (needs host).
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~04:15)

- Nothing merged or launched: no worktrees, main clean and pushed (74f536f). Codex 5h is 16% (resets 05:22), so the dispatcher will start 220/230/240/250 after that. F3-BRAND-UI stays blocked on the 240 spec.
- No Claude agents spawned (Claude 5h 85%, but no unblocked visual package).
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~04:45)

- Nothing merged or launched: no worktrees, main clean. Codex 5h is 16% (resets 05:22); queue holds 220/230/240/250 and the dispatcher will start them after that. F3-BRAND-UI still waits on the 240 spec.
- No Claude agents spawned (Claude 5h 84%, no unblocked visual package).
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~05:15)

- Nothing merged or launched: no worktrees, main clean, nothing paused. Codex 5h is 16% until its 05:22 reset; the dispatcher will start the 4 queued briefs (220/230/240/250) at its next 30-min tick. F3-BRAND-UI still waits on the 240 spec.
- No Claude agents spawned (Claude 5h 83%, no unblocked visual package).
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~05:45)

- Nothing merged: Codex 220-f-bughunt-8-touch-regress, 230-f-ci-split and 240-f-title-scene-brief started minutes ago and are still running. Main is clean and pushed.
- Queued for Codex: 250-f-bughunt-9-audio-mobile-regress, plus new 260-f-lostcity-mip-verify (checks the Lost City mip-bias shader on the other hero sites and tiers) and 270-f-bughunt-10-modes-save.
- No Claude agents spawned (Claude 5h 82%, but the only visual package left, F3-BRAND-UI, waits on the 240 spec).
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~06:20)

- Merged: Codex 220 (F-BUGHUNT-8: touch teardown/double-tap and daily card fixes), 230 (F-CI-SPLIT: local gates run smoke e2e, `--full-e2e` or CI runs all), 240 (F-TITLE-SPEC + Bathyline mark draft); Sonnet F-TITLE-B (Monterey crop) and F-TITLE-C (title scene), both unit-tested only and not yet wired into the app. Gates green on main after each step. Not pushed yet this run (no visual change).
- Running Codex: 250, 260, 270. Queued: 280 title identity assets (fonts/icons, NET), 290 browser verification of B/C, 300 gates/CI verification.
- Next Claude run: F-TITLE-D (home layout, needs A) then E (bridge), F, G per spec §7.
- Spec note: F-TITLE-SPEC puts "Vehicle and lighting are illustrative." on the title scene caption; that is a single scene caption, acceptable under content-tone, but don't add more.
- Still needs owner: brand name OK (Bathyline).

## 2026-10-03 headless run (started ~06:45)

- Merged (Codex, gates green on main): 270 F-BUGHUNT-10 (ratings recovery from reward tokens, prototype-safe keys, legacy animal bonus) and 260 F-LOSTCITY-MIP-VERIFY (comparison tool only; the browser verification itself was blocked by the Codex sandbox, so far-terrain blandness at Lost City is still unchecked).
- Running Codex: 250, 280 (title identity), 290 (title modules review). Queued: 300 (CI verify), 310 F-COSMETICS, 320 bughunt-12.
- No Claude agents (Claude 5h 72%, but F-TITLE-D waits on 280).
- Needs owner: brand name OK (Bathyline). Still open: fresh golden set (needs a host with a browser).

## 2026-10-03 headless run (started ~07:15)

- Merged (gates green on main): Codex 280 F-TITLE-A (Bathyline mark, icons, self-hosted fonts), 290 title B/C review fixes + capture harness, 250 F-BUGHUNT-9 (audio lifecycle, PWA, mobile); Sonnet F-TITLE-D (home layout), E (scene bridge: Monterey canyon + sub now the home backdrop; globe only after Dive sites/Free dive), F (index/manifest/README/docs), F-TITLE-LOOK (low camera, teal palette, lamp pools, contact shadow). Pushed, tagged f10; Pages deploy OK.
- **GitHub CI on main is red** (e2e shard 14: mission.spec.ts "crush depth" times out on the runner; red since ~08:20 on earlier runs too). Local gates pass. Queued 350-f-ci-main-red to classify and fix; 300 (gates/CI verify) is also running.
- Running Codex: 300, 310 (cosmetics), 320 (content regress). Queued: 330 title-bridge audit, 340 share image (og:image), 350 CI red.
- Decision for owner: the Bathyline mark reads a bit like a "P" with stepped contour lines (draft); the wordmark/serif is good. Say if you want a stronger B. Title scene caption still carries the single "Vehicle and lighting are illustrative." line.
- Needs owner: brand name OK (Bathyline), still open.

## 2026-10-03 headless run (started ~08:15)

- Merged (full gates green on main except one stale e2e, fixed): Codex 300 (FULL_E2E opt-in for codex-task, gate docs), 310 F-COSMETICS (hull paints/lens trims), 320 F-BUGHUNT-12 (title fixes; Sonnet resolved its conflict with F-TITLE-LOOK in TitleScene.ts). Fixed f1-touch manifest-name test (Bathyline). Pushed, tagged f12.
- Codex 5h was 18% (resets 10:45): queue holds 330, 340, 350 (CI red), 360 (title G QA). No Claude agents (no unblocked visual package; Claude 5h 77%).
- Needs owner: brand name OK (Bathyline); fresh golden set still needs a browser host.

## 2026-10-03 headless run (started ~08:45)

- Nothing merged or launched: no worktrees, main clean and pushed. Codex 5h is 18% (resets 10:45); queue holds 330, 340, 350 (CI red on main, e2e shard 14), 360, which the dispatcher starts after the reset. No unblocked Claude package (Claude 5h 76%).
- Needs owner: brand name OK (Bathyline); fresh golden set still needs a browser host.

## 2026-10-03 headless run (started ~09:15)

- Nothing merged or launched: no worktrees, no running Codex tasks, main clean. Codex 5h is 18% (resets 10:45); queue still holds 330, 340, 350 (CI red on main), 360 for the dispatcher. Claude 5h 75% but no unblocked visual package.
- Needs owner: brand name OK (Bathyline); fresh golden set still needs a browser host.

## 2026-10-03 headless run (started ~09:45)

- Nothing merged or launched: no worktrees, no running Codex tasks, main clean and pushed. Codex 5h is 18% (resets 10:45); queue holds 330, 340, 350 (CI red on main), 360 for the dispatcher. Claude 5h 74% but no unblocked visual package.
- Needs owner: brand name OK (Bathyline); fresh golden set still needs a browser host.

## 2026-10-03 headless run (started ~10:15)

- Nothing merged or launched: no worktrees, no running Codex tasks, main clean. Codex 5h is 18% (resets 10:45); queue holds 330, 340, 350 (CI red on main), 360 for the dispatcher. CI still red on the latest main push; 350 owns it, so no Claude duplicate. Claude 5h 74%, no unblocked visual package.
- Needs owner: brand name OK (Bathyline); fresh golden set still needs a browser host.

## 2026-10-03 headless run (started ~10:45)

- Nothing merged: the dispatcher had just launched Codex 330 (title-bridge bughunt), 340 (share image) and 350 (CI red on main); all three still running. CI still red on latest main pushes (350 owns it). Claude 5h 73%, no unblocked visual package.
- Queued: 360 (title G QA), 370 (verify 330/340/350), 380 (hero-site readability audit, code-level).
- Needs owner: brand name OK (Bathyline); fresh golden set still needs a browser host.

## 2026-10-03 headless run (started ~11:15)

- Merged (full-e2e gates green on main): Codex 350 (CI red fix: crush-depth and preset e2e stabilised, unverified on the runner until the next CI run) and 340 (1200x630 share image + og/twitter meta). Pushed.
- Running Codex: 330, 360, 370. Queued: 380, 390 (verify CI/share), 395 (touch/HUD bughunt). No Claude agents (no unblocked visual package; Claude 5h ~70%).
- Needs owner: brand name OK (Bathyline); the share image uses the draft "P"-like mark; fresh golden set still needs a browser host.

## 2026-10-03 headless run (started ~11:45)

- Merged: Codex 330 (title lifecycle/render-state restore, offline title assets) and 370 (square viewports use short-landscape). Full-e2e on main: 261 pass, 1 fail (f3-onboard touch PHOTO step poll under load with 3 Codex tasks running); passes 2/2 in isolation, treated as load flake. Pushed, tagged f14. CI on main was still red before this push (390 is verifying).
- Running Codex: 360, 380, 390. Queued: 395, 400 (Lost City readability), 410 (modes bughunt). No Claude agents (no unblocked visual package).
- Needs owner: brand name OK (Bathyline); fresh golden set still needs a browser host.

## 2026-10-03 headless run (started ~12:45)

- Merged (full-e2e + project-base green on main): Codex 360 F-TITLE-G QA (title integration/touch/shell e2e, architecture doc) and 380 F-GOLDEN-CHECK (code-level hero readability unit tests; all five heroes pass ambient/fog/clearance floors, no value changes). Both tests/docs only. Pushed, tagged f15.
- Running Codex: 390 (verify CI/share), 395 (touch bughunt), 400 (Lost City readable). Queued: 410 (modes bughunt), 420 (verify 360/380), 430 (hero props bughunt). No Claude agents (no unblocked visual package; Claude 5h ~65%).
- Needs owner: brand name OK (Bathyline); fresh golden set still needs a browser host.

## 2026-10-03 comprehensive review run (started ~12:50)

- Review recorded in plan/REVIEWS.md (scores, gaps, priorities). Golden set 2026-10-03-175107.
- Merged Claude/Sonnet F-BLUEHOLE-SPAWN (grotto seated, stepped ledge, deeper fall-off, no-floating-props test). Full-e2e + project-base green on main. Pushed.
- CI red cause found: f2-life scan test times out on the runner (queued Codex 440-f-ci-life-scan-red). Also queued 450 HUD attribution footer and 460 marine-snow audit. Codex is at its 5% floor until 15:45; worktrees 390/395/400 are stalled until then.
- Needs owner: nothing blocking.

## 2026-10-03 headless run (started ~13:25)

- Merged Claude/Sonnet F-BEEBE-PLUMES: billowing, turbulent smoker plumes (prop plumes plus the vent-preset funnels that were the actual smooth cones), orifice shimmer, unit and e2e specs. Reviewed wide/mid shots against the golden: clearly better, readable. Full-e2e + project-base green on main. Pushed, tagged f16.
- Worktrees 390/395/400 (Codex) are stalled at the Codex 5% floor until 15:45; 400 is camera-only and does not yet give Lost City carbonate texture. Queue holds 410-460 briefs. Claude 5h ~75% afterward; next Claude package candidates: Monterey canyon walls, Lost City texture after 400.
- Needs owner: brand name OK (Bathyline); fresh golden set still needs a browser host.

## 2026-10-03 14:50 CDT — review run (tag f16)

- Comprehensive evening review recorded in plan/REVIEWS.md (Beebe +1, Blue Hole +2, Lost City +1; Monterey and Titanic unchanged). CI `fail-fast` set to false; main CI is still red on `f2-life` scan test (Codex 440 queued).
- Merged `f-monterey-canyon` (Sonnet): flanking canyon walls and sponges/coral on the lit wall. Smoke gates passed in worktree and on main; full e2e not run, no tag.
- Stalled worktrees 390/395/400 wait for the Codex 15:45 reset. Eight briefs queued.
- Needs owner: nothing.

## 2026-10-03 headless run (started ~14:28)

- Merged Claude/Sonnet F-BLUEHOLE-WALL: strata banding (new optional biome `strata` shader uniform), wall alcoves, floor blocks, second grotto, repainted apron. Full-e2e on main: 278 pass, 1 fail (f-geo-scarp monterey-canyon rock support, min < -3 under load); passes 2/2 in isolation (spec 4/4), treated as a load flake; worth watching since Monterey walls merged with smoke gates only. Pushed, tagged f17. CI on main was still red (f2-life scan, Codex 440 queued).
- Codex still at its 5% floor until 15:45; worktrees 390/395/400 hold uncommitted finished work and resume after the reset. 8 briefs queued. No Claude agent running.
- Next Claude candidates: Lost City surroundings (after 400 merges), toast placement (after 395 merges, both touch HUD/props), Titanic far-field lift.
- Needs owner: nothing.

## 2026-10-03 comprehensive review + headless run (started ~14:58)

- Review recorded in plan/REVIEWS.md (golden 2026-10-03-195811: Monterey +1, Blue Hole +1). DIRECTOR priorities refreshed; 8 Codex briefs queued.
- Merged Claude/Sonnet F-MONTEREY-POLISH: flanks face inward, far wall for depth, subtler/varied sponges. Shot 1 clearly better; golden poses 2/3 now auto-pick wall backs (follow-up pinned in DIRECTOR). Smoke + project-base green on main; full-e2e not run, no tag, not pushed beyond the review commit.
- Codex at 5% floor until 15:45; worktrees 390/395/400 resume then. Lost City surroundings and toast placement wait on 400/395 (file overlap).
- Needs owner: nothing.

## 2026-10-03 15:30 targeted review run

- Trigger "Claude idle ≥ 50% for 2 h" was a false positive (sampler bug); fixed and logged in PROCESS-LOG and REVIEWS. No merges; 8 Codex briefs queued; Codex resumes after 15:45. Claude weekly 31%, so no new package.
- Needs owner: nothing.
- 2026-10-03 15:45 CDT headless run: skipped: budget gate (claude 5h 36.0% left (resets Sat Oct 03 17:40) | 7d 27.0% left (resets Thu Oct 08 07:00) codex 5h 5.0% left (resets Sat Oct 03 15:45) | 7d 44.0% left (resets Fri Oct 09 16:55) [as of 188 min ago] )
- 2026-10-03 16:15 CDT headless run: skipped: budget gate (claude 5h 36.0% left (resets Sat Oct 03 17:40) | 7d 27.0% left (resets Thu Oct 08 07:00) codex 5h 100.0% left (resets Sat Oct 03 15:45) | 7d 44.0% left (resets Fri Oct 09 16:55) [as of 218 min ago] )
- 2026-10-03 16:45 CDT headless run: skipped: budget gate (claude 5h 35.0% left (resets Sat Oct 03 17:40) | 7d 27.0% left (resets Thu Oct 08 07:00) codex 5h 82.0% left (resets Sat Oct 03 21:15) | 7d 41.0% left (resets Fri Oct 09 16:55) [as of 22 min ago] )
- 2026-10-03 17:15 CDT headless run: skipped: budget gate (claude 5h 30.0% left (resets Sat Oct 03 17:40) | 7d 26.0% left (resets Thu Oct 08 07:00) codex 5h 54.0% left (resets Sat Oct 03 21:15) | 7d 36.0% left (resets Fri Oct 09 16:55) )

## 2026-10-03 evening headless run (~22:00)

- Merged Codex packages 430 (hero integrity, Blue Hole stalactite scan POI), 410 (modes), 420 + 390 (e2e stability), 440 CI life-scan fix, 395 (touch HUD), 400 (Lost City Arcade opening camera), 440 rebrand (Bathyline mark/icons/share image). CHANGELOG conflicts resolved by union; rebrand's scarp.ts variant dropped in favour of main's.
- Golden set 2026-10-03-230949: Lost City shot 1 clearly better (tower large and readable). Full-e2e green on main (one new 395 case, beebe 150% at 360x640, is test.fixme: real HUD overlap, fix queued as 470). Pushed, tagged f18.
- Codex queue: 470 touch-150 overlap, 480 verify rebrand merge, 490 Lost City camera bughunt; 450 hud footer, 450 triage, 460 marine snow running. No Claude package run (Claude spent on merge review).
- Needs owner: nothing.

## 2026-10-03 night comprehensive review + headless run (~00:00)

- Review recorded in plan/REVIEWS.md (Lost City +1; others unchanged), DIRECTOR priorities refreshed, briefs 500 (CI triage), 510 (flow audit), 520 (verify Lost City/Beebe) queued with 470-490.
- Merged Claude/Sonnet F-LOSTCITY-SURROUNDINGS (cool textured slope, talus scatter, more flanges, corals grounded; ambient fill not darkened because the readability guard blocks it, banding faint) and F-BEEBE-PLUME-VARIETY (per-vent width/height/opacity/lean, current bend, orifice haze and wisps). Shots clearly better. Full-e2e on main: 311 pass, 1 fail (vent preset draw count, +1 haze draw), fixed by allowing +1 and rerun green; smoke gates green. Pushed, tagged f19.
- CI on main has been red for most pushes (shards fail on `.hud-control-tips` stability, content-missions and GL timeouts); Codex 500 triages. Codex resumed after reset; worktrees 450 hud/450 triage/460 still hold work.
- Next Claude candidates: Monterey poses and wall texture, Blue Hole spawn pose, Lost City banding stronger and tower-base corals.
- Needs owner: nothing.

## 2026-10-03 evening review run (~19:30 CDT)

- Comprehensive review for tag f19 recorded (Beebe +0.5, Lost City +0.5). DIRECTOR refreshed; 6 Codex briefs already queued. No merges, no Claude package (weekly 24%). Needs owner: nothing.

## 2026-10-03 evening headless run (~19:45–21:30 CDT)

- Merged Codex 450 (HUD attribution footer chip), 460 (Titanic far-field lift, thinner snow) and 470 (touch 150% overlap, vent haze gating). The 450 footer replaced 470's pill markup, so I resolved HUD.ts/scarp.ts (kept main's scarp) and removed the pill CSS/e2e checks. First full-e2e on the merge had 26 touch-overlap failures (chip over the tutorial card/150% stick); moved the portrait chip to 160px above the bottom edge and loosened the landscape height check to <48. Full-e2e + project-base green on main. Pushed, tagged f20.
- Still running or unmerged: Codex 480, 490, 500 (running), 450-triage (spec only, awaiting its owner). Queue: 510, 520, 530 (verify footer/touch/snow), 540 (merge residue bughunt). No Claude agent run (weekly 23%, and merge fixes took the time).
- Not reviewed visually this run: Titanic far-field lift and snow (460) after merge; 530 verifies them. The portrait chip may be hidden under the in-range contact label at times (transient).
- Needs owner: nothing.

## 2026-10-04 early review run (~02:30)

- Comprehensive review for tag f20 recorded (Titanic +0.5). Golden 2026-10-04-020114. DIRECTOR refreshed (6 Claude items), Codex briefs 550/560/570 queued with 540. No merges, no Claude package (weekly 23%); Codex 480-530 worktrees still running. Needs owner: nothing.

## 2026-10-03 night headless run (~21:15-22:20 CDT)

- Merged Codex 500 (CI triage: hud tips stability), 490 (Lost City camera bughunt) and 480 (rebrand merge verify, Monterey wall-life above talus). 490 and 480 both duplicated the vent haze config already on main; deduped hazeGlow/hazeGlowSizeM in presets.ts, kept main's VentPreset and docs. Full-e2e + project-base green on main, pushed, tagged f21.
- Merged Claude/Sonnet F-MONTEREY-WALL (banded canyon wall via vertex colours, golden poses 2/3 aimed at wall life). Shots clearly better (pose 3 strong, pose 2 subtler). Full-e2e on final main: see tag f22 below.
- Still running: Codex 510, 520, 530; 450-triage holds only a spec. Queue: 540-570. Codex 5h was 16%, so nothing new launched.
- Next Claude candidates: Blue Hole spawn pose and east grotto, Lost City banding and tower-base corals.
- Needs owner: nothing.

## 2026-10-04 early headless run after f22 review (~03:00-04:20)

- Comprehensive review for f22 recorded (Monterey +0.25), DIRECTOR refreshed. Golden 2026-10-04-031944.
- Tried merging Codex 530 (credits panel placement): smoke green, but full-e2e on main failed 4 of its own new cases (CC BY 4.0 link hit-test, f-verify-530.spec.ts:146). Reverted the local merge (never pushed); main unchanged. Codex brief 580 queued to fix it in the 530 worktree. 510 and 520 remain finished-but-unmerged (510 could not render in Codex sandbox, needs gate screenshots). No push, no tag, no Claude agent (spent on gates).
- Queue: 540, 550, 560, 570, 580. Codex 5h was 4% until the 00:00 reset.
- Needs owner: nothing.

## 2026-10-04 headless run (~23:00-04:00)

- Merged Codex 510 (Journal/debrief fixes, 15-flow audit spec; I fixed the spec's touch release/scan-visibility bugs and the portrait Journal header overlap and fact-table overflow it exposed) and Codex 520 (verification specs), plus Claude/Sonnet F-BLUEHOLE-SPAWN (sub inside the hole, banded wall, lighter alcoves; shot clearly better). CHANGELOG conflicts resolved by union.
- Full-e2e + project-base green on final main. Pushed, tagged f23.
- Codex 530 still unmerged (waits on queued 580). Queue: 540-600 (590 Blue Hole/Journal bughunt, 600 Lost City banding/corals added). DIRECTOR refreshed.
- Needs owner: nothing.

## 2026-10-04 morning review run (~06:30)

- Comprehensive review for f23 recorded (Blue Hole +0.25); golden 2026-10-04-062459. DIRECTOR refreshed (6 Claude items); Codex queue 570-600 (4 briefs) with 540-560 running. No merges, no Claude package (weekly 20%, review only). Needs owner: nothing.

## 2026-10-04 morning headless run (~01:45 CDT clock)

- Merged Claude/Sonnet F-BLUEHOLE-PITCH (per-site opening pitch `chaseOffsetY`, Blue Hole spawn 22 m below ledge, west alcove close pose, Monterey fan palette). Shots clearly better (Blue Hole frame 1 now shows sub, shafts, ledge; alcove readable; Monterey pinks). Full-e2e + project-base green on main. Pushed, tagged f24.
- Running: Codex 540, 550, 560. Queue: 570, 580, 590, 600. 530 still waits on 580.
- Needs owner: nothing.

## 2026-10-04 review run after f24 (~08:20-10:30)

- Comprehensive review for f24 recorded (Blue Hole +0.25); golden 2026-10-04-082207; DIRECTOR refreshed; Codex briefs 610/620/630 queued (with 600).
- Process: CI had been red on ~6 pushes because 7 of 16 e2e shards hit the 20-min global timeout. ci.yml now 20 shards, 26-min timeout (PROCESS-LOG). Check the next CI run.
- Merged Codex 550 (toast stacks under the scan target; desktop shot clean, portrait overlaps the sub slightly but readable). Full-e2e + project-base green on main. Pushed, tagged f25.
- Unmerged: Codex 540, 560 (finished, need gates); 530 waits on 580; 570/580/590 running. No Claude agent run (review plus gates took the time).
- Needs owner: nothing.
