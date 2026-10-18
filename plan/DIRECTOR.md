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

Stage (review 2026-10-18 midday, joint with Sol): about 80% to 1.0, 4-5 weeks targeted, 4-6 for planning. Beautiful bands: Titanic 3.5, Lost City 3-3.5, Blue Hole 3-3.5, Beebe 3.5-3.8, Monterey 3.5, Challenger 3.5, Endurance 3.5-3.7. Agreed blockers in order: (1) first-five-minute scanning, guidance and reward verified unaided on desktop and both phone orientations; (2) green hosted CI on the release SHA with deploy gated on it; (3) phone defects (Class A clipping, Beebe Low caps) and a complete Low journey; (4) heroes consistently at beauty 4, Blue Hole overlap resolved; (5) eight-site acceptance at mission spawns.

## Needs owner

The newest items go first.

- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No Claude package running.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. Evidence: review 2026-10-16 (third) in `plan/REVIEWS.md`. DONE items were removed at that review (history in git and `plan/progress/`). Per-package art gains are now ~0.1-0.2: each V-* brief below names a target composition (what the frame should look like), not a geometry list.

Evidence: reviews 2026-10-18 and 2026-10-18 midday (joint with Sol) in `plan/REVIEWS.md`. DONE items removed at the midday review. Art plateau: each V-* names a target composition.

Owner phone test 2026-10-18: decisions and file ownership in [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md). P2 items go first (playability first); the numbered V/S/R list follows.

- **P2-boost-cut [Codex, brief 2542]:** cut boost on every input (touch button, Shift, RT; X stays camera reset), along with its meter, power cost and config; update How to play and CHANGELOG (Removed). The touch dock loses the button.
- **P2-scan-range [Codex, brief 2541]:** Arcade scan radius floor of 100 m for every target (Titanic bow/stern are 30 m now); Realistic keeps the data radii. Out of range, the scan tutorial step and guidance say "Get closer to scan" with the distance. Guard nearest-target selection between adjacent POIs. The mission cap `missionApproachScanRadius` (Spawn.ts:37, 80 m for a 220 m approach) must not undercut the floor: test the resolved radius in a mission, not just POI data (Sol).
- **P2-copy [Haiku]:** Home primary reads "Dive: <site>"; the discovery confirmation reads "New Journal entry"; touch Settings hides the Controls key-bindings button and section; the graphics row says "Auto (<tier> on this device)".
- **P2-hull-a [Sonnet]:** Class A (Lost City, Blue Hole) has a propeller inside the vertical stabiliser and thrusters clipping the hull. Target: every propeller and thruster sits clear on all three hulls and every tier; add a geometry test.
- **P2-events-anchored [Codex, Claude visual review]:** replace the random scheduler with anchored spots in the six event sites' data, each shown as an optional contact ("Vent plume", "Silt flow", "Whale route") that plays its event on arrival. Cut any event that still doesn't read on Low.
- **P2-sub-screen [Sonnet]:** move the cosmetic picker out of the Journal into a "Your sub" screen reached from Pause and Home, with large swatches and a live sub preview. This is a move, not an addition.
- **P2-ambience [Codex]:** lower the default ambient bed and low-pass its harsh band; leave saved volumes alone.
- **P2-globe-bright [Sonnet]:** the globe is a touch dark. Target: a brighter Google Earth feel (lighter ocean, saturated land, brighter day side) with pins still contrasting.
- **P2-beebe-low [Sonnet, small]:** Low-tier Beebe chimney glow caps float off the orifice; seat them.
- **P2-lostcity-perf [Codex]:** High stutters at Lost City among particles and effects on an iPhone 17 Pro. Measure overdraw and cap the High particle/effect fill; Low unchanged; update the perf budget.
- **P2-text-size [Sonnet, small]:** an "Aa" button on the briefing and Journal headers that steps the existing UI scale (no new setting).

1. **V-lostcity-slice3 [Sonnet]** (agreed 3-3.5): the detail tower (`lost-city-3.png`) still reads as thin broken sheets with stair-step facets, and the mid-slope banding repeats. Target: the tower is a thick eroded carbonate mass with rounded chimneys, rubble at its foot in frame, and slope bands broken by terrace ledges.
2. **V-journeys [Claude, after P2-scan-range and P2-copy]:** capture Home -> Titanic and Blue Hole missions -> first scan -> Journal -> debrief unaided (no teleport) at 1600x900, 390x844 and 844x390 on Low; review against the rubric. Agreed blocker 1.
3. **R-merge-verify [Codex, small, brief 2543]:** local gates default to smoke e2e, yet progress notes said "e2e pass" and V-titanic-opening merged a deterministic f-bughunt-18 failure (main red for 2 runs; fixed 9b57c01). Packages that touch `data/landmarks/`, Spawn or Camera run the spawn/camera specs (or `--full-e2e`) before merge, the gate summary names the e2e mode, and merge refuses on red main CI unless the package fixes it.
4. **R-deploy-gate [Codex]:** Pages deploys independent of CI (deploy.yml); make deploy wait for green CI on the same SHA (workflow_run or needs), keep manual dispatch. Agreed blocker 2; brief 2544 queued. Update the comment in deploy.yml.
5. **V-titanic-plating [Sonnet, small]** (~3.5): V-titanic-opening's lane tint reads as a rust/grey patchwork at close range and deck tops wash pale blue-grey (`titanic-2/3.png`). Target: lane variation half as strong, warm rust tops; keep the opening framing.
6. **V-monterey-bands [Sonnet]** (~3.5-3.7): wall banding repeats and the wall-to-base transition is abrupt. Target: break banding with noise and talus at the base; keep the facing>0.98 opening spec.
7. **V-challenger-seabed [Sonnet, small]** (~3.6): lander reads but seabed is sparse and the flag emissive sits behind the HUD card. Target: sediment ripples and a few rocks around the lander; flag away from the card.
8. **V-bluehole-hood [Sonnet, demoted]** (~3.5): flat sheet facets on the east hood; only with a reference composition. Numeric side: see V-bluehole-overlap.
9. **V-eight-sites [Sonnet]** acceptance: capture mission-spawn frames of the eight non-hero sites (Low tier, portrait) and review; needs V-spawn-capture first.
10. **V-spawn-capture [Codex]:** extend the existing golden/e2e render helper so a per-site mission-spawn Low portrait capture persists (not conditional) and manifest lists it; no art changes.
11. **V-bluehole-overlap [Codex]:** resolve ~0.45 m roof hull overlap (collision boxes omit `roofRise`); restore the loosened 0.43 bound or justify; tests in existing specs.
12. **S-verify / S-bughunt [Codex, standing]:** 2550-2570 queued; after visual merges verify numerics and hunt bugs (Lost City Low triangles +15%).
13. **R-release [Haiku]:** f60 tagged 2026-10-18. Tag the latest green-CI main after each review.

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
