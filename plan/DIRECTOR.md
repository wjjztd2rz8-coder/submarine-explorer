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

Stage (review 2026-10-27 midday, Claude alone): about 88% to 1.0; 4 weeks. Beautiful: Titanic 3.6, Lost City 3.7, Blue Hole 3.7, Beebe 3.8, Monterey 3.7, Challenger 3.5, Endurance 3.4. Blockers: (1) none of the five heroes at 4 yet; (2) Kama/Hunga openings; (3) real-phone Low-tier acceptance.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No Claude package running (2026-10-27 midday review). Codex: 4580 unfinished; 4630-4660 running; 4670-4690 queued.

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: reviews 2026-10-27 (Claude alone, Sol skipped for Codex budget) and 2026-10-26 in `plan/REVIEWS.md`; earlier item histories in [archive/DIRECTOR-HISTORY-2026-10-26-backlog.md](archive/DIRECTOR-HISTORY-2026-10-26-backlog.md). Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md). Done this cycle (removed): V-hunga-subject, V-kama-axial-approach, V-monterey-banding, V-bluehole-roof, V-lostcity-surround, V-monterey-wall-skirt, V-beebe-flow, V-lostcity-towers, V-bluehole-silhouette, V-monterey-apron.

1. **V-kama-opening [Sonnet, small]:** (~3.4) Kama mission opening at 130 m shows tiny pillows. Target: first sighting shows the pillow field filling ~10% of frame height at a lit accent, still outside scan range. Poses from Codex 4670 (`plan/progress/4670-S-verify-kama-opening.md`).
2. **V-hunga-opening [Sonnet, small]:** (~3.4) the 40 m view reads (~4.5) but the opening is dim. Target: caldera rim legible at the opening pose; a distance-aware lift only if it is a small shared-shader change, otherwise move the opening closer (4670 numbers).
3. **V-monterey-rills [Sonnet, small]:** DONE 2026-10-27 (claude/V-monterey-rills; centre stripes gone, ~3.9). Original: wall banding is broken up but centre rills and ledge geometry still stripe (`monterey-canyon-3.png`). Target: rills follow the wall noise, no parallel stripes.
4. **V-bluehole-lip [Sonnet]:** SHELVED pass 1 (diff in .cache/shelved/V-bluehole-lip.diff). Retry only with a different approach: a thin-slab roof mesh with real holes, not depth tweaks. Do not touch the shaft or the Low draw pin (7).
5. **V-endurance-hull [Sonnet, small]:** (~3.4: the hull reads well in `endurance-2.png`) next target is a richer scene around it: rubble skirt, a lit accent, less empty sand.
6. **V-beebe-trunk [Sonnet, small]:** (~3.7) the trunk plume is still a dense column; thin it toward the top and add the second weaker plume lean.
7. **V-lostcity-talus [Sonnet, small]:** (~3.7) pale talus skirt at the tower base is still weak; add rubble through existing scatter data only. Do not raise the High plume budget.
8. **R-ci-green [Codex]:** hosted CI run on 66423a73 pending at review time (previous main green, f67 tagged). Triage any red run by failing spec.
9. **S-verify / S-bughunt / S-dead [Codex, standing]:** 4580 (mobile gestures, unfinished) and 4630-4660 running; 4670 (Kama opening numerics), 4680 (Home/site-pick bug hunt), 4690 (CI triage) queued. Merged 4600-4620 (run 180). Earlier: 4600 (S-dead: delete unused terrace support in Terrain.ts), 4610 (S-bughunt: debrief, rewards and objective flow), 4620 (S-verify: Blue Hole roof shaft and Hunga material numerics). After each visual merge, verify numerics; bind captured images, manifests and SHA together before accepting evidence.
10. **P2-phone-accept [owner + Codex]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build (Aa button, Journal photo, High Lost City plume, Blue Hole, Lost City, Axial, Beebe).
11. **R-release [Haiku]:** tag the latest green-CI main after each review (f67 is the newest); check the Pages deploy.
12. **P2-globe-bright [Sonnet, demoted]:** brighter globe, only if the lanes above are blocked.

Demoted: further Titanic sky tuning, Challenger boulders, per-site decoration, title polish, Endurance framing (CUT 2026-10-16), Titanic per-plate blockiness (accepted ~3.7). Codex weekly burn is ~60%/day, so briefs stay rationed.

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
