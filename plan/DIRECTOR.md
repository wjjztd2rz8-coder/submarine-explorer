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

## What 1.0 means

| Requirement                                                                                                                                                                                                                               | Backlog items                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views. The set is `HERO_SITES` (Cosmetics.ts): Titanic, Lost City, Blue Hole, Beebe and Monterey; Endurance is a polish site covered by the eight-site acceptance | V-bluehole, V-beebe, V-titanic, V-lostcity, V-monterey-floor, V-endurance |
| The other eight sites are coherent with no major visual defect                                                                                                                                                                            | V-eight-sites                                                             |
| A new player understands the first five minutes on desktop and phone                                                                                                                                                                      | V-journeys, S-guidance (done), S-hud                                      |
| Acceptable Low-tier performance on a real phone (owner 2026-10-18, iPhone 17 Pro: Low great, High stutters at Lost City; weaker phones untested)                                                                                          | P2-lostcity-perf                                                          |
| Hosted CI green, and a full run no longer blocks releases                                                                                                                                                                                 | R-release, R-ci-green                                                     |
| No known blockers; the code is simple enough to keep changing safely                                                                                                                                                                      | S-resolve, S-modal, S-boot, S-rewards, S-manifest                         |

Stage (review 2026-10-20, joint with Sol, unchanged): about 80% to 1.0; 5-7 weeks (Sol: 4-5 is optimistic given limited Claude review capacity and small art gains per pass). Beautiful bands: Titanic 3.5, Lost City 2.5-3.2, Blue Hole 2.5-3.2, Beebe 3.5-3.6, Monterey 3-3.5, Challenger 3-3.5, Endurance 3.5. Agreed blockers in order: (1) first-five-minute scanning, guidance and reward verified unaided at 1280x720 and both phone orientations; (2) green hosted CI on the release SHA, deploy gate verified, tag; (3) phone defects (Class A clipping, Beebe Low caps) and a complete Low journey; (4) heroes consistently at beauty 4, Blue Hole overlap resolved; (5) eight-site acceptance at mission spawns.

## Needs owner

The newest items go first.

- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No Claude package running. Merge policy stands as the owner set it on 2026-10-13: merges don't wait for CI (push after smoke + project-base); only tags wait. R-merge-verify's guard is advisory.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. Evidence: review 2026-10-16 (third) in `plan/REVIEWS.md`. DONE items were removed at that review (history in git and `plan/progress/`). Per-package art gains are now ~0.1-0.2: each V-* brief below names a target composition (what the frame should look like), not a geometry list.

Evidence: reviews 2026-10-18 and 2026-10-18 midday (joint with Sol) in `plan/REVIEWS.md`. DONE items removed at the midday review. Art plateau: each V-* names a target composition.

Owner phone test 2026-10-18: decisions and file ownership in [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md). P2 items go first (playability first); the numbered V/S/R list follows.

- **P2-hull-a:** DONE 2026-10-20 (Class A and C thruster placement; Codex clearance audit merged as tests).
- **P2-sub-screen [Sonnet, demoted 2026-10-19; do after hull-a]:** move the cosmetic picker out of the Journal into a "Your sub" screen reached from Pause and Home, with large swatches and a live sub preview. This is a move, not an addition.
- **P2-globe-bright [Sonnet, demoted by Sol/Claude 2026-10-19: no release-blocking defect shown]:** the globe is a touch dark. Target: a brighter Google Earth feel (lighter ocean, saturated land, brighter day side) with pins still contrasting.
- **P2-beebe-low [Sonnet, small]:** Low-tier Beebe chimney glow caps float off the orifice; seat them.
- **P2-text-size [Sonnet, small, demoted 2026-10-19]:** an "Aa" button on the briefing and Journal headers that steps the existing UI scale (no new setting).

1. **V-lostcity-slice3 [Sonnet]** (agreed 3-3.5): the detail tower (`lost-city-3.png`) still reads as thin broken sheets with stair-step facets, and the mid-slope banding repeats. Target: the tower is a thick eroded carbonate mass with rounded chimneys, rubble at its foot in frame, and slope bands broken by terrace ledges.
2. **V-journeys-run [Haiku runs, Sonnet reviews; harness merged 2026-10-20]:** capture Home -> Titanic and Blue Hole missions -> first scan -> Journal -> debrief unaided (no teleport; the current journal-debrief spec teleports for its reward check) at 1280x720 (the owner's size, not 1600x900), 390x844 and 844x390 on Low; review against the rubric. Agreed blocker 1 (joint review 2026-10-19). Codex side: V-journeys-harness (brief 2700).
3. **V-titanic-plating [Sonnet, small]** (~3.5): V-titanic-opening's lane tint reads as a rust/grey patchwork at close range and deck tops wash pale blue-grey (`titanic-2/3.png`). Target: lane variation half as strong, warm rust tops; keep the opening framing.
4. **V-monterey-bands [Sonnet]** (~3.5-3.7): wall banding repeats and the wall-to-base transition is abrupt. Target: break banding with noise and talus at the base; keep the facing>0.98 opening spec.
5. **V-challenger-seabed [Sonnet, small]** (~3.6): lander reads but seabed is sparse and the flag emissive sits behind the HUD card. Target: sediment ripples and a few rocks around the lander; flag away from the card.
6. **V-bluehole-hood [Sonnet, demoted]** (~3.5): flat sheet facets on the east hood; only with a reference composition. Numeric side: see V-bluehole-overlap.
7. **V-eight-sites [Sonnet]** acceptance: capture mission-spawn frames of the eight non-hero sites (Low tier, portrait) and review; needs V-spawn-capture first.
8. **S-verify / S-bughunt [Codex, standing]:** 2550-2570 queued; after visual merges verify numerics and hunt bugs (Lost City Low triangles +15%).
   12b. V-journeys-harness: DONE 2026-10-20 (merged). The six-journey Low matrix is written but **not yet run**: see V-journeys-run.
   12d. S-events-low-audit: DONE 2026-10-20 (clean audit, tests merged).
   12e. R-ci-shard-triage: DONE 2026-10-20. 29 of 43 failures were fixed by P2-copy; the stale-spec repairs for the rest merged 2026-10-20 except R-ci-green-f below.
   12f. **R-ci-green-f [Haiku/Sonnet]:** f-bughunt-960 great-blue-hole arcade high (3 cases) still red: the mission button rebuilds the URL with only tier and touch, so `life=0` is dropped and wildlife wins the scan candidate. Pick an isolation route (a direct mission URL with life=0, or a test-side hook) and keep the expected-target guard. Also f-fidelity-rollout lost-city Medium timed out once at 240 s (render cost symptom, watch).
   12g. **S-golden-compare, R-ci-trim, S-verify-merged [Codex, briefs 2770-2790]:** comparator pose tolerance and stale-PNG provenance; consolidate duplicate specs to cut CI wall time; verify the 2026-10-20 merge batch.
9. **R-release [Haiku]:** f60 tagged 2026-10-18. Tag the latest green-CI main after each review.

Demoted: further Titanic sky tuning, Challenger boulders, per-site decoration, title polish, Endurance framing (CUT 2026-10-16; work kept as tag `parked/V-endurance-aim`).

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
