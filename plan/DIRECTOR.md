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

Stage (review 2026-10-26, joint with Sol): about 83% to 1.0; 4-6 weeks. Beautiful: Titanic 3.5, Lost City 3, Blue Hole 3, Beebe 3.5, Monterey 3.5, Challenger 3.5, Endurance 3. Blockers in order: (1) green hosted CI on the accepted SHA (journeys and Aa specs); (2) Blue Hole and Lost City silhouettes; (3) eight-site spawn acceptance (Axial, Kama, Hunga); (4) real-phone Low-tier acceptance; (5) Journal compositing and the debrief headline.

## Needs owner

The newest items go first.

- Delete the four S-collision expected-failure cases? (Sol 3330 proposes it; neither 2980 nor 3050 should be collected. Sol notes deleting tests does not fix the behaviour.)
- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No Claude package running (2026-10-26). Codex queue: 4380 (R-ci-green journeys), 4390 (R-ci-green settings), 4400 (S-verify eight-site subject size).

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: review 2026-10-26 (joint with Sol) in `plan/REVIEWS.md`; item histories before that date in [archive/DIRECTOR-HISTORY-2026-10-26-backlog.md](archive/DIRECTOR-HISTORY-2026-10-26-backlog.md). Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md).

1. **R-ci-green [Codex]:** hosted CI on main has been red for 4+ pushes on two specs that move between runs: `journal-debrief.spec.ts:1541` unaided journeys (second leg) and `settings.spec.ts` Aa cases (4.0 min timeouts). Queued 4380 (journeys) and 4390 (settings). Keep the journeys gating; separate driver assumptions, timing and product failures (Sol). Newest fully green main is still `164da7fe` / tag f66 (green SHA). Tag only on a green SHA (R-release).
2. **V-journal-polish [Sonnet, small]:** DONE 2026-10-26 (8d8fd28a: opaque Journal panel, home menu hidden behind it, subject-centred portrait photo, primary tally in debrief; the pause-menu-behind-Journal rule has no screenshot or test, and the portrait crop is unit-tested only, so check on the phone; delete at the next review). (review 2026-10-26, Sol and Claude) the Journal panel shows ghost pause/HUD text bleeding through behind its header (visible at 844x390 and 1280x720, `journeys/round-1/*-10-journal.png`), a cyan rectangle crosses the recreation photo, and the portrait photo gives most of its frame to the sub and empty water. Target: opaque or properly dimmed backdrop, no stray rectangle, photo crop centred on the discovered subject. Also the debrief headline "Primaries complete" sits above "2 of 4 objectives" and one star: reword from data so the headline matches the counts. One surface, no layout patches.
3. **V-bluehole-silhouette [Sonnet] IN FLIGHT (Sonnet, 2026-10-26, second pass, brief-V-bluehole-silhouette-2.md):** (first pass NOT merged 2026-10-21, kept as tag `parked/V-bluehole-silhouette`; ~3.0 beautiful, weakest hero with Lost City) colour is right; the defect is shape. Target composition from the first-scan pose: the gallery lip is a thin irregular undercut edge (not a terraced dome or rolled slab), pendants vary in length and clump, a soft light shaft falls through the opening. Silhouette only. Keep the Class B spawn and overlap numerics; permission to loosen the pendant-envelope test.
4. **V-lostcity-towers [Sonnet]:** (~3.0) the carbonate towers read as folded, segmented sheets in the detail view (`lost-city-3.png`). Target: Poseidon reads as one tall fluted tower with a smooth flowstone skirt and a lit white top; fewer, larger facets, no visible fold seams. Do not raise the High plume budget (4350 capped it).
5. **V-eight-sites-lit [Sonnet]:** (a-g done; Axial/Kama still ~3.0) Decision (director, rules can bend, 2026-10-26): no owner decision needed. Axial gets a lit-chimney treatment through site data and the shared `vertexGlow`, and may use a smaller scan radius at that site if the lit chimneys alone stay small (a per-site value in data, no site branch). Then Hunga's dark subject, then Kama. 4400 reports the numerics.
6. **V-monterey-apron [Sonnet, small]:** DONE 2026-10-26 (30e16290: pebble share in the rubble table, modest gain ~3.6; sub-overlap is the wall's translucent skirt near the camera, a wall-material fix, left open; delete at the next review). (~3.5) the apron reads as a smooth slope; swap some rocks for pebbles at the same instance count (update instance-count tests). Right-bank crest untouched. Also: in the opening the sub overlaps the wall as a half-transparent shape; check sub framing.
7. **V-endurance-hull [Sonnet, small]:** (~3.0) hull is only 44 x 8 m, so altitude cannot enlarge it. Target: a richer hull (rails, masts, rubble skirt) or a lit subject; remove the white speckle noise along the hull edge in `endurance-1.png`.
8. **P2-phone-accept [owner + Codex]:** checklist ready in `plan/progress/4410-P2-phone-accept-checklist.md` (2026-10-26); owner runs it. Low-tier acceptance on a real phone with the current build (Aa button, journeys, High Lost City plume). Codex prepares a one-page checklist and the Pages URL; the owner runs it.
9. **S-verify / S-bughunt [Codex, standing]:** after each visual merge, verify numerics and hunt bugs; bind captured images, manifests and SHA together before accepting evidence (stale PNGs can sit beside fresh JSON, Sol 2026-10-26). 4400 queued.
10. **S-collision [Codex, owner decision pending]:** four expected-failure Monterey scarp collision cases remain (worktrees 2980, 3050). Deleting tests would not fix the behaviour; leave until the owner decides.
11. **R-release [Haiku]:** tag the latest green-CI main after each review (f66 is the newest); check the Pages deploy.
12. **P2-globe-bright [Sonnet, demoted]:** brighter globe, only if the lanes above are blocked. **V-bluehole-hood [Sonnet, demoted]:** east hood sheet facets.

Demoted: further Titanic sky tuning, Challenger boulders, per-site decoration, title polish, Endurance framing (CUT 2026-10-16), Titanic per-plate blockiness (accepted ~3.7).

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
