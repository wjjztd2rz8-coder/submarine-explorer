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

Stage (review 2026-11-01 evening, Claude alone; Sol skipped, Codex week 4%): about 88% (range 85-89%); 4 weeks. Blue Hole 3.85, Beebe 3.85, Lost City 4.0 (tower top blown), Monterey 4.0, Titanic 3.9, Hunga 3.4, Kama 3.2. Earlier (review 2026-11-01 morning, Claude alone; Sol skipped, Codex week 5%): about 88% (range 85-89%); 4 weeks. Lost City 4.05 (tower flank now lit), Monterey 4.0, Titanic 3.9, Blue Hole 3.8 (hood still a slab), Beebe 3.8, Hunga 3.2, Kama 3.1. Previous stage (review 2026-10-30, Claude alone; Sol skipped, Codex week 6%): about 86% (range 83-88%) to 1.0; 4-5 weeks. Beautiful: Titanic 3.9, Lost City 3.9, Blue Hole 3.8, Beebe 3.7, Monterey 3.9, Challenger 3.6, Endurance 3.6. Blockers: (1) no hero firmly at 4; (2) Blue Hole and Beebe openings (gallery read, Beebe darkness); (3) real-phone Low-tier acceptance.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No package running. Briefs 120-124 queued, waiting for the Nov 4 Codex reset. Claude lane: items 1-6 in order.

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: review 2026-11-01 (evening) in `plan/REVIEWS.md` (Claude alone, Sol skipped for Codex budget) and golden `2026-10-30-212725`; earlier items (all DONE ones, with commits) in [archive/DIRECTOR-HISTORY-2026-10-30-backlog.md](archive/DIRECTOR-HISTORY-2026-10-30-backlog.md). Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md).

1. **V-bluehole-opening-pose [Sonnet] (target composition) — PARTIAL 2026-11-01 (05a332d1): data moved to 125 m / 44 m, stalactites now visible at eye level, hood ~10% of frame not 30%; every pose under 110 m fails the hull-safe route check, so the next step is a larger/repositioned east-gallery hood or relaxing that check (code).** the hood is now authored (stalactites, ragged lip) but the 24 m opening pose is ~150 m out, so the golden frame still shows a small brown "leaf" shape with open water above it. Target: the opening frame has the hood filling the top ~30% as a dark overhang with stalactites visible, sub off to one side. Route: Blue Hole opening data (distance, openingDepthM, chase arm); no site branch. Overlaps queued Codex brief 120 (numbers only): take its output if it has landed, else start from the golden frame.
2. **V-hunga-bed-read [Sonnet] — PARTIAL 2026-11-01 (6e9e0f5d): coarser beds, crest against lit teal water column; silhouette is still a wedge (needs code, not data).** the Hunga hero frame now shows a large lit mound, but it reads as a haystack of stacked straw bands, not a bedded caldera wall, and the upper half of the frame is empty dark water. Target: vertical lit wall with coarser, fewer bedding bands and a visible crest line against a faintly lit water column. Route: Hunga wall data/texture scale; label stays unclipped.
3. **V-kama-slope-light [Sonnet] — PARTIAL 2026-11-01 (259617b4): vent glow reach and far-slope ambient raised (site data); warm pool mostly on chimney and heap, slope away from vent still uniform blue-grey.** plume reads well but the slope is a uniform dark blue-grey plane with one orange streak. Target: slope lit warmly around the plume base (a pool of vent light) and a gentle value gradient to the horizon; no new props.
4. **V-beebe-horizon [Sonnet] — PARTIAL 2026-11-01 (da5095c6): site horizon block gives a teal-to-dark water gradient above the seabed; the dark band at the seabed edge and uniform mid-ground remain (fogHaze needs a validator or code change), no extra far glow (a third plume is already visible).** smoker, plume and sub read; the horizon is a hard line with black sky above and the mid-ground is a uniform brown plain. Target: a soft haze/fog gradient at the horizon and one far vent glow; opening not darker overall. Data-driven via the Beebe vent preset.
5. **V-lostcity-tower-blown [Sonnet]:** the Poseidon tower top is a blown-white bloom that loses the carbonate detail. Target: tower top keeps visible texture (peak value below clipping) while the flank stays lit. Route: tower light intensity / emissive in Lost City data.
6. **U-play-walkthrough [Haiku]:** capture a Home -> pick site -> first 60 s -> Journal -> debrief set from the e2e shots (journal-debrief spec output) and list confusion or clutter; not re-captured in the last two reviews. Findings become backlog items.
7. **R-ci-speed [Codex, queued 124]:** hosted CI takes 30+ min, so failures surface 1-2 runs late. Audit shard balance and slow specs; target under 20 min without dropping coverage.
8. **Codex, queued 120-123, waiting for the Nov 4 reset:** T-opening-geometry (120), S-verify CI (121), S-dead second sweep (122), S-verify spawn cap (123).
9. **P2-phone-accept [owner + Codex; browser-checkable items automated in tests/e2e/phone-accept.spec.ts]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build.
10. **R-release [Haiku]:** tag the latest green-CI main after each review (f71 is the newest, 2026-11-01).

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

`tools/golden.sh` captures the hero sites at fixed poses plus the first loaded default mission frame at all 13 sites into `.cache/golden/<date>/`, with one shared `index.html` and build provenance. `GOLDEN_MODE=free-dive` limits a run to hero poses; `GOLDEN_MODE=mission` retains the three-layout mission opening/+10 s sweep. Compare the newest set with the previous one after any visual merge. A merge must not make them worse.

Use `node tools/golden-compare.mjs <before-dir> <after-dir>` for numeric review:
two RGB byte levels of tolerance, with larger differences limited to 0.1% of
pixels per image. It rejects incomplete sets and changed poses/options. Exit 1
flags changes for review; exit 2 means the inputs cannot be compared. `--report`
retains metrics without failing on pixel changes. This screen does not replace
Claude's visual judgement or make captures across art changes equivalent.
