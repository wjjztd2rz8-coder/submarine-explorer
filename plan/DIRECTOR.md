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

| Requirement                                                                   | Backlog items                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------- |
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views | V-endurance, V-bluehole, V-beebe, V-titanic       |
| The other eight sites are coherent with no major visual defect                | V-eight-sites                                     |
| A new player understands the first five minutes on desktop and phone          | P-*, V-first-five, S-guidance, S-hud              |
| Acceptable Low-tier performance on a real phone                               | Owner check; S-boot helps                         |
| Hosted CI green, and a full run no longer blocks releases                     | R-release, S-tests (1610)                         |
| No known blockers; the code is simple enough to keep changing safely          | S-resolve, S-modal, S-boot, S-rewards, S-manifest |

Stage (joint review 2026-10-13, agreed with Sol): about 75% to 1.0; plan four weeks (three to six plausible). Agreed "beautiful" scores: Titanic 3.5, Beebe 3, Blue Hole 3.5, Lost City 3.5, Monterey 3.5, Challenger 3, Endurance 3. Top blockers: phone guidance, green hosted CI, hero beauty and the eight mission spawns, real-phone Low performance.

## Needs owner

The newest items go first.

- A five-minute play on a real phone on the f53 build (Low-tier performance, first five minutes after S-flow).

## In flight

- Nothing running. Codex briefs 1570, 1580, 1590 and 1610 are queued; the dispatcher launches them. Merged 2026-10-13: S-dead, S-unused, S-rov, S-modal stage 1, S-boot stage 1, S-render stage 1 (nightly workflow), S-tests step 4 (CI builds once), S-bugs, S-hygiene, S-flow, V-beebe, V-bluehole collision, scan-candidate bug fixes. Full e2e on main before the f53 push is recorded in OVERNIGHT-LOG.
- Codex queue (briefs 1570, 1580, 1590, 1610) and the hold directory (1600 S-rewards waits for 1570: both migrate saves) carry the Codex lane. Claude visual lane briefs live in `.cache/claude/visual/`.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. "After X" means don't start until X is merged. Evidence: §n = section n of `plan/archive/SIMPLIFY-REVIEW-2026-10-11.md`.

1. **V-first-five** DONE 2026-10-13: capture in `plan/progress/V-first-five.md` (shots in `.cache/np/v-first-five/`). Banner counts and stars verified on a real run (3 of 4, 1 of 3 stars). Findings feed S-guidance (up to 4 guidance surfaces at once; NEW ENTRY card + hint + toast stacked after a scan; bow name duplicated on card and waypoint), S-hud (landscape briefing hides Begin dive in the first frame; SEABED PROXIMITY warning covers JOURNAL in portrait) and S-debrief.
2. **S-guidance [Sonnet]** (§4 item 1), after V-first-five. One prioritised guidance slot (urgent warning > scan progress > discovery > next objective > tutorial/hint) replaces the separate tutorial card, hint chip, explore notice, discovery toast, NEW ENTRY card and objective chip. The sonar diamond and world waypoint stay. Remove the persistent "nominal" text and the static hull-rating number (show the gauge only when it matters; test the threshold, 50% is unvalidated). Urgent warnings must not block scanning or navigation. Drop the mission-title strip on phone. Phone is the weakest axis (Sol: phone 2/5 for four sites): this is the top 1.0 item.
3. **S-tests step 2 [Sonnet]** (§7; after S-flow): fold the HUD/touch (9), opening-framing (12) and Journal/debrief (8) specs into three table-driven capability specs (map: `plan/progress/S-tests-map.md`). Step 3 (captures to nightly) is Codex 1610. Measure a quiet-CPU full run before and after.
4. **S-hud [Sonnet]** (§4 item 2, §5), after S-guidance and S-tests step 2. Three HUD regions (top info, guidance, controls) in normal flow replace per-element offsets. Target: `hud-layout.css` from 1,077 lines to about 300, all `/* S-hud: remove */` patches gone, portrait and landscape both without special cases. Re-baseline HUD screenshots deliberately.
5. **V-endurance [Sonnet]** (brief `.cache/claude/visual/1480`): close view merged 2026-10-13 (lamps 0.7x, pale life albedo lowered; wood grain now reads; lobsters and anemones are still the lightest things in frame). Opening still open: the hull is ~380 px of 1600 with the sub in the right third. Every reframe up to 560-700 px failed `deepOpening.test.ts` / `openingClearance1290.test.ts` (sub faces the hull within 11 degrees, whole sub in frame, wreck and rigging clear of the sub box, sub 8 px right of the wreck on landscape). Director decision: those guards protect past overlap bugs, so keep them and get a larger hull by scaling or placing the wreck side (data) and moving the sub closer, not by relaxing the guards. Landscape: the sub sits behind the touch buttons at the opening.
6. **V-titanic [Sonnet]:** the close-up (`titanic-3.png`) has regular panels, bright flat sand and thin rusticles that read as manufactured.
7. **V-beebe, V-bluehole remainder [Sonnet]:** Beebe opening: the bright sub dominates a small stack (golden `beebe-vent-field-1`); the card no longer covers the trunk after the 2026-10-13 merge, so re-check the golden pose. Blue Hole: terraces and collision merged; faceted uniform steps and smooth stalactite cones remain (Low keeps a few straight riser diagonals).
8. **V-eight-sites [Haiku capture, Sonnet judge]:** add the eight non-hero sites at their real mission spawns to the golden set (current goldens are desktop High free-dive, not mission or phone evidence; Sol), and fix major defects. Also record the commit SHA in the golden manifest (`tools/golden-shots.mjs`; both reviewers found captures can't be tied to a commit).
9. **S-tiers [Sonnet]** (brief `.cache/claude/visual/1497`): merge Ultra into High after a golden comparison; migrate saved `ultra` to High.
10. **S-picker [Sonnet]:** keep the globe on every screen size. On phones a swipe-up sheet over the globe lists the sites (one site-list component). Remove redundant globe instances (full-screen overlay, `?globe=1`) only if the sheet covers them.
11. **S-daily [Haiku]:** shorter wording for the Daily Dive Home card, briefing and debrief (mechanics stay).
12. **S-resolve [Codex]** brief 1570 (hold lifted). One pure `resolveEffective(settings, mode, progress, daily)` replaces config mutation at boot and live, upgrades, the daily modifier. Custom shrinks to 4 switches (battery/oxygen, currents, waypoints, start at surface); drop `sonarMarkers`, merge descent into speed, drop the `standard` tier, the sim-speed setting and gentle/exaggerated currents. Save migration and README mode table.
13. **S-modal remainder [Codex]** brief 1580: stage 1 merged (FocusTrap extended; Upgrades, Globe). Migrate Settings, MissionRouter, shell, onboarding, power; replace the copied close/hide helpers.
14. **S-boot remainder [Codex]** brief 1590: `deferredStartup.ts` exists but is unwired; Home boots the title scene only and the dive tile and systems load after a site is picked.
15. **S-tests step 3 / hosted CI [Codex]** brief 1610: CI e2e shards are red on every push (software-GL 60 s timeouts: f-events-reform whale, f-verify-1000 Monterey phone). Move captures to the nightly workflow; keep the cheap assertions. Hosted CI green is a 1.0 requirement. Hosted validation of the S-tests step 4 build-once change comes with it.
16. **S-rewards [Codex]** (held until S-resolve merges; brief 1600): fixed equipment, cosmetics-only rewards (owner 2026-10-12). Remove upgrade purchases and RP-gated hulls; hull class still follows mission depth (Class A at Blue Hole); cosmetics (sub paint/decals, photo frames) unlock by discoveries; Samples/Secrets become Journal "finds" (keep `sample:`/`secret:` keys); no RP checklists; save migration loses nothing. The pause menu still lists Upgrades (S-flow note) and goes with this. Claude reviews the cosmetics look.
17. **S-manifest [Sonnet design, Codex migration]** (§5, §6b), after S-resolve.
    - Move each site's tuning into one typed `data/landmarks/<id>/site.json` with a validator: biome, opening and framing, atmosphere, sonar shading, low-tier framing, Beebe and Monterey configs, currents and secrets.
    - Remove the 26 site-id branches in shared code.
    - Merge `Spawn.ts` and `DeepOpeningSpawn.ts` into one framing solver with two policies: mission approach (150-300 m) and free-dive beauty frame.
    - Move species literals to JSON; trim unread catalogue text in `landmarks.json`; make the TS loader the single props validator.

    Guard everything with the golden set.

18. **S-render remainder [Codex for the code, Sonnet judges the golden set]** (§6): table-drive the `scarp.ts` kinds (golden-guarded); title scene reuses `Headlights`/`MarineSnow`; collapse the three hull-creak audio paths. The nightly per-tier perf workflow is merged (`render-nightly.yml`); it needs its first hosted run checked.
19. **V-lander [Haiku, low]:** Challenger's white lander looks toy-like (Sol: Challenger beauty 3, `challenger-deep-3`); add wear and colour. Challenger's empty dark opening is not itself a blocker.
20. **R-release [Haiku]:** each release: full e2e on a quiet CPU, push, tag, check `gh run list`. f53 follows the 2026-10-13 collection (see OVERNIGHT-LOG).
21. **S-verify [Codex]** brief 1620: read-only audit of the 2026-10-13 collection merges; fix semantic merge errors with tests.
22. **S-bughunt [Codex]** brief 1630: save/input/teardown bug hunt; fix confirmed defects with tests.
23. **S-debrief [Codex]** brief 1640: debrief says "4 scans" while the scanner counted 5-6, names the first primary ("Scanned Bow section") instead of the latest scan, and reads "Mission complete" with primaries done but 1 of 3 stars; fix the counts and the title logic with unit tests (wording stays short).

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
