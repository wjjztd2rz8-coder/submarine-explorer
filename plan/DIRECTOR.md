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
  - Rules can bend (owner, 2026-10-22): this is an exploratory project, so a decision that is logically consistent with the rule's purpose and safe may break a hard rule, including an owner-set one, without asking. Example: shortening the 150-300 m mission opening for small subjects keeps the target out of scan range, which is what the rule was for. Record the reasoning in the progress note and update the tests that enforce the old rule.
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

## What 1.0 means

| Requirement                                                                                                                                                                                                                               | Backlog items                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views. The set is `HERO_SITES` (Cosmetics.ts): Titanic, Lost City, Blue Hole, Beebe and Monterey; Endurance is a polish site covered by the eight-site acceptance | V-bluehole, V-beebe, V-titanic, V-lostcity, V-monterey-floor, V-endurance |
| The other eight sites are coherent with no major visual defect                                                                                                                                                                            | V-eight-sites                                                             |
| A new player understands the first five minutes on desktop and phone                                                                                                                                                                      | V-journeys, S-guidance (done), S-hud                                      |
| Acceptable Low-tier performance on a real phone (owner 2026-10-18, iPhone 17 Pro: Low great, High stutters at Lost City; weaker phones untested)                                                                                          | P2-lostcity-perf                                                          |
| Hosted CI green, and a full run no longer blocks releases                                                                                                                                                                                 | R-release, R-ci-green                                                     |
| No known blockers; the code is simple enough to keep changing safely                                                                                                                                                                      | S-resolve, S-modal, S-boot, S-rewards, S-manifest                         |

Stage (review 2026-10-24 afternoon, Claude alone): about 84% to 1.0; ~5 weeks. Beautiful: Titanic 3.7, Lost City 3.6, Blue Hole 3.4, Beebe 3.6, Monterey 3.8, Challenger 3.6, Endurance 3.0. Blockers in order: (1) first-five-minute journeys verified on phones; (2) green hosted CI on a quiet SHA and a tag (f63 on 66c9147, 2026-10-23: done; keep tagging); (3) heroes consistently at beauty 4 (Blue Hole silhouette, Lost City foot); (4) eight-site acceptance.

## Needs owner

The newest items go first.

- Delete the four S-collision expected-failure cases? (Sol 3330 proposes it; neither 2980 nor 3050 should be collected.)
- ~85 m Endurance opening OK, or a richer hull model.

- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No Claude package running (2026-10-24).

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: review 2026-10-21 (evening, Claude alone) in `plan/REVIEWS.md`; history in git and `plan/progress/`. Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Claude week is pace-limited until the Oct 22 reset, so the first runs after it take one package each. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md).

1. **V-bluehole-silhouette [Sonnet]** (first pass NOT merged 2026-10-21: ~3.4 to 3.5 self-rated, east-2 shot barely changed and the right end became a flat plank; kept as tag `parked/V-bluehole-silhouette`. Next pass needs a two-sided lip profile or a prop-built lip, and permission to loosen the pendant-envelope test) (~3.4, weakest hero): colour is now right (three passes); the remaining defect is shape. Target composition from the first-scan pose: the gallery lip is a thin, irregular undercut edge (not a rolled slab), pendants vary in length and clump, and a soft light shaft falls through the opening. Silhouette only; no colour retune. Keep the Class B spawn and overlap numerics.
2. **V-eight-sites-lit [Sonnet]** (parts a, b DONE: a 2026-10-22 (022ed26) Kama bed lit ~3.4; b 2026-10-23 Blake ~3.3 and Hunga ~3.5 via horizon fade and ambient data, Blake upper half still empty dark water; c DONE 2026-10-23 (c6de051): Axial/Hudson opening 110/112 m, lifted ambient, horizon fade, ~3.0-3.3; Hudson ledge still a dark disc, Axial chimneys small) (2.6-3.2): follow-ups from the eight-site review, one package each, in this order: (a) Kamaʻehuakanaloa needs a lit subject at spawn (scan target is a black silhouette); (b) Blake Plateau and Hunga Tonga: empty dark upper half and hard horizon; (c) Axial and Hudson subjects small and distant. (d DONE 2026-10-24: Blake upper half gets a graded water dome from site data, subtle, ~3.4; the mound is still a dark silhouette at 160 m.) Next concrete steps: Blake mound lit at the opening, Hudson ledge lift, Axial chimney scale; one per package.
3. **V-monterey-apron [Sonnet, small]** (PARTLY DONE 2026-10-23: rubble sizes retuned in data, ~3.85, apron slope still smooth; true pebbles need lower floor plus new test thresholds) (~3.75): crest ledges and mottling landed; the apron still reads as a smooth slope. Swap some apron rocks for pebbles at the same instance count (update instance-count tests); right-bank crest untouched.
6. **V-endurance-spawn [Sonnet, small]** (PARTLY DONE 2026-10-23: orphan-"m" wrap fixed; lowering spawn altitude made the shot worse, hull is only 44 x 8 m at the 110 m floor so altitude/yaw can't enlarge it. Next: richer hull model or lit subject, or owner OK for ~85 m opening; Titanic portrait crop not attempted) (~3.0, weakest site; split from V-spawn-sub-clear, whose Titanic/Bismarck/Challenger part is DONE 2026-10-22): at the Endurance opening the sub hangs high in empty mid-water above a thin hull strip. Target: sub below and beside the wreck, hull filling the lower third. Lower the spawn altitude through the per-site opening data; Sol (2026-10-22) found range/yaw alone cannot lower the clearance floor at `src/game/Spawn.ts:68`, so the floor itself may need a per-site value in the same data (no site branch in code). Also: "Get closer to scan · 140 m" wraps an orphan "m", and Titanic portrait crops the hull. Owner approved 2026-10-22 that wreck and lander missions may open at about 110-140 m, provided the first target stays out of scan range; update missionApproach, missionComposition and deepOpening tests to the new floor rather than adding exceptions.
7. **P2-globe-bright, P2-text-size [Sonnet, demoted]:** brighter globe; "Aa" stepping the existing UI scale. Only if the lanes above are blocked.
8. **V-bluehole-hood [Sonnet, demoted]:** east hood sheet facets; reference composition only.
9. **S-verify / S-bughunt [Codex, standing]:** (3510-3570 collected 2026-10-23 evening; 3530 added blur/focus clock reset; 3580-3600 queued) (3420 late-placement fix, 3430, 3440 collected 2026-10-23; 3450-3470 Blake/Hunga verifies running;3390/3400/3410 collected 2026-10-23; 3410 found a late-placement moved flag defect, queued 3420 fix, 3430, 3440) 3130-3270 done or running; queued 3280 (verify spawn-clear openings), 3290 (debrief/Journal bug hunt), 3300 (smaller 3050 seam fix). Codex week is at 6% until Oct 27 11:30, so they wait; Claude collects finished worktrees at each review (2920-3120 collected 2026-10-22; 2980 scarp crest-contact fix and 3050 Terrain seam-clearance fix left unmerged in their worktrees: 2980 has no note and rebaselines scarp hashes, 3050 adds ~40 per-frame lines and fails net-simpler; decide next collection, ask for a smaller 3050). After visual merges, verify numerics and hunt bugs.
10. **R-ci-green [Codex]:** (2026-10-23 ec7e4bc: fixed stale spawn-opening tests, 44 px grab handle, journey steering, Monterey hook timeout; queued 3320 full e2e on main, 3340 touch-target audit) earlier: queued 3250 (static-check job 15-min timeout), 3260 (Chromium apt-lock install), 3270 (globe pin measures 43.99998 px vs the 44 px guard). Newest fully green main was `55220c8`; tag after these land and a quiet SHA is green.
11. **V-journeys-current [Codex]:** (queued as 3510 2026-10-23; 3310 worktree holds the unverified e2e extension) (review 2026-10-22, Sol) the six journey captures date from Oct 20 and reach the first reward in 18-27 s only; re-run them on current main, extend through the second objective, and check that the reward card ("New Journal entry") never carries directional text that conflicts with the next waypoint (`src/ui/ScanOverlay.ts:106-116`; unverified on main). Report only; fixes go to a Claude lane if visual.
12. **S-collision [Codex]:** (queued 3520: smallest seam fix, no deletions until owner decides) (3330 reported 2026-10-23: collect neither; proposes deleting the four expected-failure cases, owner decision; close 2980/3050 worktrees after that) four expected-failure tests record unresolved Monterey scarp collisions (worktrees 2980, 3050); queued 3300 for a smaller seam fix. Decide on 2980 at the next collection.
13. **R-release [Haiku]:** f64 tagged 2026-10-24 (bb72bf1, green CI); f63 2026-10-23 (66c9147). f61 tagged 2026-10-20. Tag the latest green-CI main after each review; last three main pushes were cancelled by newer pushes, so wait for a quiet SHA.

Demoted: further Titanic sky tuning, Challenger boulders, per-site decoration, title polish, Endurance framing (CUT 2026-10-16; kept as tag `parked/V-endurance-aim`), Titanic per-plate blockiness (accepted ~3.7).

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

Use `node tools/golden-compare.mjs <before-dir> <after-dir>` for numeric review:
two RGB byte levels of tolerance, with larger differences limited to 0.1% of
pixels per image. It rejects incomplete sets and changed poses/options. Exit 1
flags changes for review; exit 2 means the inputs cannot be compared. `--report`
retains metrics without failing on pixel changes. This screen does not replace
Claude's visual judgement or make captures across art changes equivalent.
