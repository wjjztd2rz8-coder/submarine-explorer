# Director's plan: the single source of forward work

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## How this file is used (owner, 2026-10-11)

- **One source.** Every forward run takes its work only from the [Backlog](#backlog) below:
  - interactive threads;
  - headless `tools/resume.sh` runs;
  - comprehensive and targeted reviews;
  - `tools/codex-refill.sh`;
  - every Codex brief.
- **No parallel plans.** A review, owner note or audit changes this file: it adds, reorders, splits or cuts items. It never starts a parallel plan document.
  - Analysis files are evidence that items cite: reviews, audits, owner-feedback write-ups, `plan/archive/SIMPLIFY-REVIEW-2026-10-11.md`.
  - [PHASE-F-PLAN.md](PHASE-F-PLAN.md) is reference only: owner decisions and pillars. Its waves are finished.
- **IDs.** Every item has a stable ID. Codex briefs, worktree branches, `plan/progress/` notes and commit messages name the item ID they serve, for example `S-dead` or `brief 1500 (S-dead)`. Work with no backlog item doesn't start: add the item first.
- **Lanes.** Each item names a lane: **Codex** (well-specified, self-contained, and NOT visual), **Sonnet** (visual, multi-file, judgement) or **Haiku** (small and scoped). Owner 2026-10-12: Claude owns all visual work (anything judged by how it looks), because Codex cannot render the game (its browser smoke test failed on MCP approval and the browser is off). Codex may still do the numeric/geometry side of a visual item when a Claude package asks for it. Pick the highest unblocked item in your lane whose files don't overlap work in flight.
- **Status.** Mark items `IN FLIGHT (<who>, <date>)`, `DONE <date> (<commit>)` or `CUT <date>: <why>` (cuts also go in CHANGELOG.md). Delete DONE items at the next comprehensive review. History goes to `plan/archive/DIRECTOR-HISTORY-*.md`.

## Direction (standing)

- **Owner direction:**
  - Playability first, with Arcade as the default and Realistic as a deliberate alternative.
  - Cinematic realism that is readable and never frustratingly dark.
  - Real sites stay factual; plausible additions are tagged once in the Journal, with no repeated caveats.
  - Keep the HUD uncluttered.
  - Phone and tablet are first-class.
  - Every cut is logged in CHANGELOG.md.
- **Core to protect** (from the 2026-10-11 simplification review): enter a real place, pilot comfortably, approach something striking, scan it, keep the discovery in the Journal. That means:
  - real GMRT terrain;
  - the identity of all 13 sites and the five hero set pieces;
  - the scan verb;
  - the Journal;
  - marine life;
  - keyboard, pad and touch input;
  - accessibility.

  Simplify the machinery around exploration, not the exploration.

### Definition of done: simplicity rules (every package, from 2026-10-11)

Reviewers send work back if it breaks one of these:

1. **Net simpler.** Prefer merging or deleting to adding. A new on-screen element replaces or merges an existing one, and the progress note says which. New settings need a reason a player would change them.
2. **One guidance surface.** Text guidance goes through the guidance slot (S-guidance) once it lands. Until then, don't add another floating card, toast or chip.
3. **No layout patches.** Fix overlaps in the HUD layout model (S-hud), not with per-element pixel offsets or new `@media` special cases in `hud-layout.css`. If a patch is unavoidable before S-hud lands, mark it `/* S-hud: remove */`.
4. **No site branches in shared code.** Per-site tuning goes in that site's data (S-manifest). Until then, extend an existing per-site table, never an `if (siteId === ...)`.
5. **Settings resolve once.** Don't mutate `config` at runtime to apply a mode, upgrade, modifier or vehicle. Read the resolved effective settings (S-resolve).
6. **Tests by capability.** Extend an existing capability spec, or the table-driven specs from S-tests. Don't add a new package-named spec (`f-verify-NNN`, `f-bughunt-NNN`). Each new e2e test says which regression it guards. Never loosen an assertion that guards a real past bug.
7. **No package numbers in code.** Source, CSS and test comments explain _why_; package history lives in git and `plan/progress/`.
8. **Reuse shared helpers** (`src/ui/dom.ts`, `src/util/rng.ts`, `src/util/math.ts` once S-dead lands). Don't copy them.

## What 1.0 means

| Requirement                                                                   | Backlog items                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views | V-endurance, V-bluehole, V-beebe, V-titanic             |
| The other eight sites are coherent with no major visual defect                | V-eight-sites                                           |
| A new player understands the first five minutes on desktop and phone          | P-\*, V-first-five, S-flow, S-guidance, S-hud           |
| Acceptable Low-tier performance on a real phone                               | Owner check; S-boot helps                               |
| Hosted CI green, and a full run no longer blocks releases                     | R-release, S-tests                                      |
| No known blockers; the code is simple enough to keep changing safely          | S-bugs, S-dead, S-unused, S-hygiene, S-resolve, S-modal |

Stage (joint review 2026-10-11 13:15): about 75% to 1.0, roughly 3 weeks. Agreed "beautiful" scores: Titanic 3.75, Beebe 3.5, Monterey 3.5, Challenger 3.5, Lost City 3.5, Endurance 3.5, Blue Hole 3.25. The simplification items add about a week of mostly Codex work, but they make the remaining 1.0 work cheaper: the HUD, test runtime and release gating are 1.0 blockers in their own right.

## Needs owner

The newest items go first.

- A five-minute play on a real phone once R-release (f52) ships.

## In flight

- **Phone-test items** (owner, 2026-10-11; decisions in [PHONE-FEEDBACK-2026-10-11.md](PHONE-FEEDBACK-2026-10-11.md)): all six DONE. P-touch-controls (1392), P-first-dive-flow (1391) and P-events-reform (1393) merged 2026-10-12 (f3c9221, 677cda2, eb8dd33) after full gates in their worktrees and screenshot review.
- **R-release:** IN FLIGHT (Claude, 2026-10-12): full gates on main at eb8dd33.
- **Codex dispatcher restored** 2026-10-12 21:26 (`dispatch-max` 3). Running: 1401 (S-tests step 1), 1402 (S-bugs). 1410 (V-bluehole facets) was stopped after its first round and moved to the Claude lane with its wip commit. Queued: 1430 (CI shard 7, S-tests), 1440 (scan-candidate bug hunt), 1496 (S-rov). Held: 1495 (Blue Hole collision) until V-bluehole merges. Claude visual lane, one Sonnet at a time, briefs in `.cache/claude/visual/`: V-bluehole (1410 worktree, IN FLIGHT Claude Sonnet 2026-10-12), V-beebe (1420), V-endurance (1480), S-tiers (1497). 1470 is replaced by 1401. S-rewards waits for S-flow (both touch the completion banner); S-picker (Sonnet) and S-daily (Haiku) follow the current Claude agents.
- **Sol round 2** on the simplification review is in (`.cache/review/simplify-20261011/sol-round2.md`); its corrections are folded into the items below, marked "Sol r2".

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. "After X" means don't start until X is merged. Evidence: §n = section n of `plan/archive/SIMPLIFY-REVIEW-2026-10-11.md`.

1. **R-release [Haiku]:** after P-first-dive-flow, P-touch-controls and P-events-reform merge, or sooner if they stall. Run full e2e on main on a quiet CPU, push, tag f52, check `gh run list`. Never loosen assertions.
2. **S-bugs [Codex]** (§6c), no design change:
   - delete the unreachable sonar ping action and sound (`Input.ts:200`, `AudioSystem.ts:392`);
   - remove the residual `toggleGlobe` declarations (Sol r2: there is no default N binding any more);
   - add gamepad paths for Journal, reset camera and photo capture (ROV waits for S-rov);
   - make the new-player graphics tier match its comment (`Save.ts:26` vs `Config.ts:62`; choose `auto` if Low/Medium detection is reliable, else fix the comment).
3. **S-dead [Codex]** (§5), no behaviour change:
   - shared `src/ui/dom.ts` (`el()`, 10 copies), `src/util/rng.ts` (PRNG, 5 copies; keep both `hashString` conventions and every seed), `src/util/math.ts` (`clamp`/`lerp`/`smoothstep`, 12 copies). Sol r2: only merge copies that are semantically identical (one- vs three-argument `smoothstep` differ);
   - delete the 10 dead exports and `audio/index.ts`, after checking tests and debug hooks too (Sol r2: `Procedural.ts` is imported by `props-procedural.test.ts`; repoint before removing);
   - remove `ui:selectTile` and other bus events with no listener (keep the 3 that tests listen to);
   - remove `SettingsData.bindings` (never read) and `simSpeedDefault`, with a save migration;
   - remove the ignored FieldGuide arguments in `Journal.ts:238`, the hidden third `MissionSelect` (`shell.ts:171`), and the six unused `_config` parameters in audio cues;
   - drop `export` from internal-only symbols.
4. **S-unused [Codex]** (§6, §6b):
   - remove the Draco/KTX2/meshopt decoders and setup (2.84 MB; both GLBs are plain);
   - remove the generic hull-block builder (give `_test` a wreck id or a tiny box);
   - remove empty `reefs.ts` and the `compress_tiles --quant16` path. The brine preset is reachable and tested (`presets.spec.ts:52`): cutting it is a logged capability cut in CHANGELOG, not dead code;
   - move `demo-synthetic`, `barrel_stove.glb` and the `_test` landmark out of `public/` into test fixtures (`demo-synthetic` is also the README's documented offline stand-in: update README:104);
   - fetch the globe catalogue once;
   - move service-worker registration out of the touch system;
   - stop shipping sourcemaps to Pages.
5. **V-first-five [Haiku capture, Sonnet judge]:** an unaided mobile first-five-minutes capture on the current SHA (portrait and landscape): Home → mission → unaided scan → next objective → Journal → debrief. Run it after the P-items merge; it is the baseline for S-flow and S-guidance.
6. **S-flow [Sonnet]** IN FLIGHT (Claude Sonnet, 2026-10-12, worktree S-flow) (§4 items 3, 5–8, §3 tutorial), after P-first-dive-flow; small, low risk, player-visible:
   - Home gets one primary "Dive" (first run: Titanic briefing; afterwards: continue), and the disabled Continue goes;
   - de-duplicate the pause menu, but keep How to play and Data credits easy to reach (Sol r2: burying them contradicts the phone decisions; no fixed entry count);
   - finishing the primaries shows stars and summary in the banner, with Keep exploring primary (completion does not end the dive);
   - settings: drop `controlTips` (device help stays easy to find); keep a gauge-only/effects hull-warning choice and the separate SFX slider (Sol r2);
   - remove the seabed status text row; the Reset camera button goes only once S-bugs gives pad parity and a discoverable reset path remains;
   - briefing start position moves into Advanced;
   - tutorial goes from 5 steps to 3 (move, rise/sink, completed scan; 1391's scan-completion rule stays) and never shows alongside a scan card.

   Update README and CHANGELOG.

7. **S-tests [Codex map, then Sonnet]** (§7). This replaces the 1470 sweep; it is also 1.0 "a full run no longer blocks releases".
   - **Step 1 (Codex 1401, in flight):** an assertion-level coverage map of all ~94 e2e specs into `plan/progress/S-tests-map.md`.
   - **Step 2 (Sonnet):** fold the HUD/touch (9), opening-framing (12) and Journal/debrief (8) specs into three table-driven capability specs.
   - **Step 3:** move the captures (not their cheap assertions: Sol r2 notes collision guards in `visual-qa.spec.ts:266` and perf guards in `f-fidelity-rollout.spec.ts:192`) of capture-heavy specs (`f-fidelity-rollout`, `f-geo-scarp`, `f-sonar-palette-1200`, `f1-terrain`, `visual-qa`, `f-bluehole-squiggle`) to a nightly `schedule:` workflow with `golden.sh`.
   - **Step 4:** CI builds once per deployment base and shares the artifact across shards, and `tools/gates.sh` and `npm run ci` share one definition.
   - Target: 30%+ less serial e2e time (provisional: the 8.8 h baseline is summed historical hosted weights). No guard for a real past bug is lost.
8. **S-guidance [Sonnet]** (§4 item 1), after S-flow and V-first-five. One prioritised guidance slot (urgent warning > scan progress > discovery > next objective > tutorial/hint) replaces the separate tutorial card, hint chip, explore notice, discovery toast, NEW ENTRY card and objective chip. The sonar diamond and world waypoint stay. Remove the persistent "nominal" text and the static hull-rating number (show the gauge only when it matters; test the threshold, 50% is unvalidated). Urgent warnings must not block scanning or navigation. Drop the mission-title strip on phone.
9. **V-endurance, V-bluehole, V-beebe [Sonnet]:**
   - Endurance: the opening hull is small and the sub fills the right third (brief 1480).
   - Blue Hole: the bowl has flat-shaded polygon steps (brief 1410; a Codex round-1 wip commit is in its worktree).
   - Beebe: the trunk and scan card overlap (brief 1420).
10. **S-hud [Sonnet]** (§4 item 2, §5), after S-guidance, with S-tests step 2 for the HUD spec. Build three HUD regions (top info, guidance, controls) in normal flow, replacing per-element offsets. Target: `hud-layout.css` from 1,077 lines to about 300, all `/* S-hud: remove */` patches gone, portrait and landscape both without special cases. Re-baseline HUD screenshots deliberately.
11. **S-resolve [Codex]** (§5, §3 Custom). One pure `resolveEffective(settings, mode, progress, daily)`, recomputed when its inputs change, replaces config mutation at boot and live, plus upgrades, the daily modifier and the ROV's per-frame POI-radius rewrite (`rov.ts:143`). With it, Custom shrinks from 10 selects to 4 switches (battery/oxygen, currents, waypoints, start at surface):
    - drop `sonarMarkers`;
    - derive lights and sensors from the mode;
    - merge descent into speed;
    - drop the `standard` speed tier, the sim-speed setting (T and D-pad Up stay) and the gentle/exaggerated currents.
    - Class A stays: progression fits it from mission depth (Blue Hole), even though authored JSON says B (Sol r2).

    Includes a save migration and the README mode table.

12. **S-modal [Codex]** (§5). One overlay stack owns Escape and focus, built on the existing FocusTrap stack, replacing the nine order-dependent capture-phase registrations (Escape in Settings, Upgrades, MissionRouter, shell, Globe, onboarding, power; FocusTrap's Tab handler; onboarding's device detection; Sol r2 count) and the 5 copied modal close/hide helpers. Remove the ordering comments in `app/systems.ts` that it makes obsolete.
13. **V-titanic [Sonnet]:** the close-up has regular panels and thin rusticles that read as manufactured.
14. **V-eight-sites [Haiku capture, Sonnet judge]:** add the eight non-hero sites at their real mission spawns to the golden set, and fix major defects.
15. **S-manifest [Sonnet design, Codex migration]** (§5, §6b), after S-resolve.
    - Move each site's tuning into one typed `data/landmarks/<id>/site.json` with a validator:
      - biome;
      - opening and framing;
      - atmosphere;
      - sonar shading;
      - low-tier framing;
      - Beebe and Monterey configs;
      - currents and secrets (fold `data/currents` and `data/secrets` in).
    - Remove the 26 site-id branches in shared code.
    - Merge `Spawn.ts` and `DeepOpeningSpawn.ts` into one framing solver with two policies: mission approach (150–300 m, from 1391) and free-dive beauty frame.
    - Move the species literals to JSON.
    - Trim the unread catalogue text in `landmarks.json`.
    - Make the TS loader the single props validator (`validate_props.py` calls it, or its rules are generated from it).

    Guard everything with the golden set.

16. **S-hygiene [Haiku]** DONE on branch claude/S-hygiene, merges after R-release (§7). This touches tools/ and plan/, so Codex refill must not take it.
    - `tools/clean-artifacts.sh` (dry run by default; skip live `PW_OUTDIR`s).
    - Gates and Codex runs write under `.cache/runs/<id>/`, with retention, instead of `dist-*`/`test-results-*` at the repo root (232 stale directories, 2.3 GB).
    - Archive one-off tools, `playwright.bughunt-880.config.ts` and the 10 historical plan contracts and QA files.
    - Move the 28 MB of progress images out of `plan/progress/`.
    - Fix the shard-count drift in the docs.
17. **S-boot [Codex]** (§6). Home boots without loading the Titanic dive tile or starting the ~37 dive systems: the title scene only. The dive tile loads after a site is picked.
18. **S-render [Codex for the code, Sonnet judges the golden set]** (§6):
    - table-drive the `scarp.ts` kinds (golden-guarded);
    - title scene reuses `Headlights`/`MarineSnow`;
    - collapse the three hull-creak audio paths;
    - schedule `tools/perf-budget.mjs` (it already records mean/p50/p95) per tier per hero site in the nightly golden run, rather than a new tool.
19. **Owner decisions 2026-10-12** (the five simplification questions; owner's reasons in brackets):
    - **S-rewards [Codex]:** fixed equipment. Remove upgrade purchases and RP-gated hulls: every player starts with the full kit, the hull class still follows mission depth (Class A at Blue Hole). Rewards become cosmetics only (sub paint/decals, photo frames), unlocked by discoveries; make them neat enough to matter. Samples and Secrets present as Journal "finds" (keep `sample:`/`secret:` save keys); events keep Journal and debrief sightings but no RP checklists. Save migration: past purchases map to nothing lost (cosmetics granted for past RP). [Most players won't play regularly; upgrades make the start feel worse. Cosmetics reward the truly interested.]
    - **S-daily [Haiku]:** keep Daily Dive and its mechanics; make its wording shorter (Home card, briefing, debrief). [Concise wording preferred.]
    - **S-rov [Codex]:** cut the ROV (code, bindings, tests, docs; CHANGELOG cut entry). [It only adds something with much more detail, which is too far for now.]
    - **S-tiers [Sonnet]:** merge Ultra into High after a golden comparison; keep the valuable Ultra detail inside one High budget; migrate saved `ultra` to High.
    - **S-picker [Sonnet]:** keep the globe on every screen size. On phones, a swipe-up sheet over the globe lists the sites (one site-list component, also used wherever a list exists today). Remove redundant globe instances (the full-screen overlay and `?globe=1`) only if the sheet covers their use. [The globe already works; the list is there for those who want it.]
20. **V-lander [Haiku, low]:** Challenger's white lander looks toy-like; add wear and colour.

Demoted: further Titanic sky tuning, Challenger boulders, per-site decoration, title polish.

## Review rubric (every package, before merge)

- **Readable in the first 10 s:** you can see the sub, the seabed and something interesting.
- **Beautiful:** looks like a documentary still, not a prototype.
- **Simple:** a new player understands what to do without reading much, and the package meets the simplicity rules above.
- **Rewarding:** there's something to find, and it feels good to find it.
- **Honest:** real sites are factual and additions are tagged once.
- **Phone-OK:** a touch layout with no overlaps, and the low tier still looks good.

If it fails, send it back to the same agent or Codex session with concrete feedback (what's wrong, which screenshot, what good looks like). Don't merge and fix later.

## Golden screenshots

`tools/golden.sh` captures the hero sites at fixed poses into `.cache/golden/<date>/`. Compare the newest set with the previous one after any visual merge. A merge must not make them worse.
