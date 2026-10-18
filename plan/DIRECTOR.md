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
| Acceptable Low-tier performance on a real phone                                                                                                                                                                                           | Owner check; S-boot helps                                                 |
| Hosted CI green, and a full run no longer blocks releases                                                                                                                                                                                 | R-release, R-ci-green                                                     |
| No known blockers; the code is simple enough to keep changing safely                                                                                                                                                                      | S-resolve, S-modal, S-boot, S-rewards, S-manifest                         |

Stage (review 2026-10-18, joint with Sol): about 82% to 1.0, four weeks targeted, 4-6 for planning. Beautiful bands: Titanic 3.5-4, Lost City 3-4.1 (disputed), Blue Hole 3-3.5, Beebe 3.5-3.8, Monterey 3.5-3.7, Challenger 3.5-3.6, Endurance 3.5-3.8. Blockers: real-phone Low (owner); current unaided Titanic/Blue Hole journeys; eight-site spawn acceptance; heroes consistently at 4; release verification (deploy independent of CI).

## Needs owner

The newest items go first.

- A five-minute play on a real phone on the newest build (Low-tier performance and readability, first five minutes). Still open since 2026-10-11; it is the largest unverified 1.0 requirement.

## In flight

- No Claude package running.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. Evidence: review 2026-10-16 (third) in `plan/REVIEWS.md`. DONE items were removed at that review (history in git and `plan/progress/`). Per-package art gains are now ~0.1-0.2: each V-* brief below names a target composition (what the frame should look like), not a geometry list.

Evidence: review 2026-10-18 (joint with Sol) in `plan/REVIEWS.md`. DONE items removed at that review. Art plateau: each V-* names a target composition.

1. **V-lostcity-slice3 [Sonnet]** (~3.8-4.1, Sol 3): the detail tower (`lost-city-3.png`) still reads as thin broken sheets with stair-step facets, and the mid-slope banding repeats. Target: the tower is a thick eroded carbonate mass with rounded chimneys, rubble at its foot in frame, and slope bands broken by terrace ledges.
2. **V-titanic-opening [Sonnet] DONE 2026-10-18 (4527352)** (~4.0; hull ~25% of height, sky dark, portrait small; further slices only with cropped framing) (~3.5-4): the opening frame is small and dark and plating still regular with flat peach light. Target: the hull fills a third of the opening frame with a rim-lit bow, plating panel colour varied by lanes. Any prop addition must also update f-perf-budget.spec.ts.
3. **V-beebe-flank [Sonnet]** (~3.5-3.8): close flank is a dark brown mass. Target: crust highlights, layered ledges and a visible glow on the flank in `beebe-vent-field-3.png`; tune material and spot falloff first.
4. **V-monterey-bands [Sonnet]** (~3.5-3.7): wall banding repeats and the wall-to-base transition is abrupt. Target: break banding with noise and talus at the base; keep the facing>0.98 opening spec.
5. **V-challenger-seabed [Sonnet, small]** (~3.6): lander reads but seabed is sparse and the flag emissive sits behind the HUD card. Target: sediment ripples and a few rocks around the lander; flag away from the card.
6. **V-bluehole-hood [Sonnet, demoted]** (~3.5): flat sheet facets on the east hood; only with a reference composition. Numeric side: see V-bluehole-overlap.
7. **V-eight-sites [Sonnet]** acceptance: capture mission-spawn frames of the eight non-hero sites (Low tier, portrait) and review; needs V-spawn-capture first.
8. **V-spawn-capture [Codex]:** extend the existing golden/e2e render helper so a per-site mission-spawn Low portrait capture persists (not conditional) and manifest lists it; no art changes.
9. **V-bluehole-overlap [Codex]:** resolve ~0.45 m roof hull overlap (collision boxes omit `roofRise`); restore the loosened 0.43 bound or justify; tests in existing specs.
10. **R-deploy-gate [Codex]:** Pages deploys independent of CI (deploy.yml); make deploy wait for green CI on the same SHA (workflow_run or needs), keep manual dispatch. Update the comment in deploy.yml.
11. **S-verify / S-bughunt [Codex, standing]:** 2550-2570 queued; after visual merges verify numerics and hunt bugs (Lost City Low triangles +15%).
12. **R-release [Haiku]:** f60 tagged 2026-10-18. Tag the latest green-CI main after each review.

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
