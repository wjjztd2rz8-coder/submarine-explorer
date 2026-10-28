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

Stage (review 2026-10-27 evening, Claude alone): about 89% to 1.0; ~4 weeks. Beautiful: Titanic 3.6, Lost City 3.8, Blue Hole 3.7, Beebe 3.8, Monterey 3.9, Challenger 3.5, Endurance 3.6. Blockers: (1) no hero at 4 yet (Monterey is closest); (2) Hunga opening dim; (3) real-phone Low-tier acceptance.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No Claude package running (2026-10-27 17:55). Codex: 4730-4750 running or queued; queue 50-52 (R-ci-green confirm, S-verify Kama/Hunga, S-bughunt Journal) waits behind the dispatcher gate.

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: reviews 2026-10-27 (Claude alone, Sol skipped for Codex budget) and 2026-10-26 in `plan/REVIEWS.md`; earlier item histories in [archive/DIRECTOR-HISTORY-2026-10-26-backlog.md](archive/DIRECTOR-HISTORY-2026-10-26-backlog.md). Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md). Done this cycle (removed): V-hunga-subject, V-kama-axial-approach, V-monterey-banding, V-bluehole-roof, V-lostcity-surround, V-monterey-wall-skirt, V-beebe-flow, V-lostcity-towers, V-bluehole-silhouette, V-monterey-apron.

1. **V-titanic-aft [Sonnet]:** golden 2026-10-28 Titanic bow reads well (~3.9) but the aft hull and upper-left frame go dark and flat. Target: a second soft light pool or hull-side emissive tint through site data so the hull has a lit and a shaded half; no per-site branch.
2. **V-bluehole-floor [Sonnet, small]:** floor under the gallery is lumpy and the wall strata still read as stacked terraces (~3.7). Target: smooth the floor noise via the existing `smoothRock` flag; keep the stalactite subject.
3. **V-lostcity-ground [Sonnet, small]:** Lost City towers read (~3.8) but the upper two thirds of the frame is empty dark water; add distance shading or a faint ridge crest behind the towers (shared terrain tint, no site branch).
4. **V-monterey-flatten [Sonnet, small]:** Monterey is the closest hero to 4 (~3.9); the lower-right sand is a flat pale slab. Target: sand tint and ripple falloff so it matches the wall; then re-shoot.
5. **T-golden-hunga [Haiku]:** the 2026-10-28 golden run lost Hunga (`page.waitForFunction: browser closed` while loading props, a 550 s tool timeout; Axial and Kama captured). Make golden.sh run per-site with its own timeout and continue on failure, and fix the foreign-preview port check.
6. **V-endurance-accent [Sonnet, small]:** TRIED 2026-10-27, no change merged: per-site lamps never reach the hull (20 m+ from the sub). Next route: a per-site emissive tint in `src/world/props/wrecks/materials.ts` via site data (see plan/progress/V-endurance-accent.md); consider demoting. (~3.4) hull and rubble now read; add one warm lit accent (lamp pool or lit hull section) so the frame has a focal point.
7. **R-ci-green [Codex]:** CI green on 73b5a5a3, f68 tagged 2026-10-27; keep specs matched to behaviour changes.
8. **S-verify / S-bughunt / S-dead [Codex, standing]:** 4730-4750 running; queue 51 (Kama/Hunga verification, incl. hull-in-frame numbers for V-kama-hull-frame) and 52 (Journal after a second site) queued. Merged 4600-4720.
9. **P2-phone-accept [owner + Codex]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build (Aa button, Journal photo, High Lost City plume, Blue Hole, Lost City, Axial, Beebe).
10. **R-release [Haiku]:** tag the latest green-CI main after each review (f68 is the newest); check the Pages deploy.

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
