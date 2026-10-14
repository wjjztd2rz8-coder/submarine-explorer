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
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views | V-endurance, V-bluehole, V-beebe, V-titanic, V-lostcity |
| The other eight sites are coherent with no major visual defect                | V-eight-sites                                           |
| A new player understands the first five minutes on desktop and phone          | V-journeys, S-guidance (done), S-hud                    |
| Acceptable Low-tier performance on a real phone                               | Owner check; S-boot helps                               |
| Hosted CI green, and a full run no longer blocks releases                     | R-release, S-tests (1740)                               |
| No known blockers; the code is simple enough to keep changing safely          | S-resolve, S-modal, S-boot, S-rewards, S-manifest       |

Stage (joint review 2026-10-14, agreed with Sol): about 76% to 1.0; plan four weeks (four to six credible). Agreed "beautiful" scores: Titanic 3.5, Beebe 3, Blue Hole 3, Lost City 3, Monterey 3.5, Challenger 3, Endurance 3. Top blockers: unaided journeys verified on the merged build (desktop and both phone orientations), green hosted CI, real-phone Low performance, hero beauty (none at 4 yet), eight mission spawns unverified.

## Needs owner

The newest items go first.

- A five-minute play on a real phone on the newest build (S-guidance and S-rewards are new) (Low-tier performance, first five minutes after S-flow).

## In flight



- 2026-10-14: S-guidance, S-rewards, S-resolve, S-modal, S-boot, S-verify/S-bughunt passes and the hosted-CI test repairs are merged and pushed. Codex queue: 1710 S-tests step 2, 1720 golden evidence, 1730 S-verify third pass, 1740 hosted CI, 1750 S-render rest.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. "After X" means don't start until X is merged. Evidence: §n = section n of `plan/archive/SIMPLIFY-REVIEW-2026-10-11.md`; joint review 2026-10-14 in `plan/REVIEWS.md`.

1. **V-journeys [Haiku capture, Sonnet judge]:** the top 1.0 blocker (both reviewers): record a complete, unaided Titanic and Blue Hole journey (Home, briefing, first 60 s, approach by sonar/waypoint only, scan, Journal, debrief) on the merged build at desktop, phone portrait and phone landscape; screenshots with SHA in `.cache/np/`, findings in `plan/progress/V-journeys.md`. Judge each against the rubric and open items for what fails. Known to check: landscape briefing hides Begin dive; waypoint label covers the sub after a scan (portrait); the guidance slot hiding an event caption behind a ready contact.
2. **S-hud [Sonnet] DONE 2026-10-14 (510aca9)** (§4 item 2, §5; S-guidance merged). Three HUD regions (top info, guidance, controls) in normal flow replace per-element offsets. `hud-layout.css` is now ~690 lines; target about 300 with all `/* S-hud: remove */` patches gone and portrait and landscape without special cases. Landscape guidance slot sits 4 px below Pause/Journal: make that structural. Re-baseline HUD screenshots deliberately. Desktop: drop the permanent sonar legend (touch already hides it).
3. **V-eight-sites [Haiku capture, Sonnet judge]**, after 1720 (golden evidence tooling): capture the eight non-hero sites at real mission spawns on desktop and phone, judge each (Sol: Axial, Bismarck, Blake, Hudson, Hunga, Kamaʻehuakanaloa may have weak subject visibility) and fix major defects.
4. **V-endurance [Sonnet]:** close view merged. Opening still open: the hull is ~380 px of 1600 with the sub large at right. Keep `deepOpening.test.ts` / `openingClearance1290.test.ts` guards; enlarge the wreck or move it/the sub in data. Landscape: sub behind the touch buttons at the opening.
5. **V-titanic [Sonnet]:** close-up (`titanic-3.png`): regular panels, bright flat sand, thin rusticles read as manufactured. Agreed beauty 3.5.
6. **V-beebe / V-bluehole remainder [Sonnet]:** Beebe opening: the bright sub dominates a small stack; chimney facets and plumes look procedural. Blue Hole: faceted uniform steps and smooth stalactite cones (golden essentially unchanged since 2026-10-13).
7. **V-lostcity [Sonnet]** PARTLY DONE 2026-10-14 (56eae67): seabed stripes fixed (reliefBed/rillStretch), colour banding calmer; towers only modestly better, still smooth columns with a flat collar and regular dimples on the flat seabed. Remainder: tower surface relief and collar.
8. **S-picker [Sonnet] IN FLIGHT (Sonnet, 2026-10-14):** keep the globe on every screen size. On phones a swipe-up sheet over the globe lists the sites (one site-list component). Remove redundant globe instances only if the sheet covers them.
9. **S-tiers [Sonnet]** (brief `.cache/claude/visual/1497`): merge Ultra into High after a golden comparison; migrate saved `ultra` to High.
10. **V-rewards-look [Haiku capture, Sonnet judge]:** S-rewards merged without visual review (Codex cannot render). Capture the Journal cosmetics picker, each sub paint/decal and photo frame on phone and desktop; judge against the rubric; fix.
11. **S-daily [Haiku]:** shorter wording for the Daily Dive Home card, briefing and debrief (mechanics stay).
12. **V-lander [Haiku, low]:** Challenger's white lander looks toy-like; add wear and colour.
13. **S-manifest [Sonnet design, Codex migration]** (§5, §6b; S-resolve merged). Move each site's tuning into one typed `data/landmarks/<id>/site.json` with a validator (biome, opening and framing, atmosphere, sonar shading, low-tier framing, Beebe and Monterey configs, currents, secrets); remove the 26 site-id branches in shared code; merge `Spawn.ts` and `DeepOpeningSpawn.ts` into one framing solver; species literals to JSON. Guard with the golden set. Sonnet writes the schema and migrates one site first.
14. **S-tests step 2 [Codex]** brief 1710 queued: fold HUD/touch, opening-framing and Journal/debrief specs into three table-driven capability specs (`plan/progress/S-tests-map.md`). DONE 2026-10-14 (ec1484c).
15. **S-tests step 3 / hosted CI [Codex]** brief 1740 queued: hosted CI has been red on every push; 1700 repaired 54 test failures, main now carries S-guidance and S-rewards. Hosted CI green is a 1.0 requirement; tag `f53` only on green.
16. **V-eight-sites tooling [Codex]** brief 1720 queued: commit SHA in golden manifest; mission-spawn and phone capture mode. DONE 2026-10-14 (d3b40a3; PNG capture and judging remain under V-eight-sites).
17. **S-verify third pass [Codex]** brief 1730 queued: audit S-rewards (save v2 migration, cosmetics) and S-guidance (slot clears, no stale cards); remove leftover RP/upgrade wording; shorten the "PAUSE -> JOURNAL" reward line. DONE 2026-10-14 (a9171e9).
18. **S-render remainder [Codex]** brief 1750 queued: validate the never-run nightly workflow, finish table-driving, one hull-creak path, golden pixels unchanged.
19. **R-release [Haiku]:** after each green hosted CI run on main tag `f<N>` (`git tag f<N> && git push origin f<N>`) and check the Pages deploy. f53 is the next tag; f51 is the last.

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
