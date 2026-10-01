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
