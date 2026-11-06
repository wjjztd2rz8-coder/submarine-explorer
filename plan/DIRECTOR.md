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
- **Site specs.** A V-* package that edits a site's data runs `tools/site-specs.sh <site>` before merging; it runs the e2e specs that mention the site.

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

Stage (review 2026-11-05 evening, Claude + Sol first round; reconcile hit the Codex 5h limit): about 86% (Claude 88, Sol 85); 3-4 weeks. Openings (Claude): Beebe 4.1, Titanic 3.9, Endurance 3.9, Blue Hole 3.8, Lost City 3.7, Bismarck 3.6, Monterey 3.6; Sol, scoring approach and detail too: Titanic 3.5, Beebe 3.5, Lost City 3.25, Blue Hole 3.0, Monterey 3.0. Blockers: red CI (also stops the Pages deploy), stale first-five-minutes evidence, close-up material quality, weaker-phone perf. Earlier (review 2026-11-04 afternoon, Claude alone; Sol start exited 75, Codex 5h at 6%): about 92% (range 89-93%); 2.5-3 weeks. Beebe 4.1, Titanic 3.9, Lost City 3.9 (tower small, upper half empty), Monterey 3.7 (wall unclear), Blue Hole 3.7 (outcrop, not a hood), Endurance 3.8 (hull small), Bismarck 3.6. Earlier (review 2026-11-04, Claude alone; Sol skipped, Codex week 3% until Nov 4 00:45): about 91% (range 88-92%); 3 weeks. Axial ~4.0, Kama ~3.7-4.1, Blue Hole 3.85 (unchanged), Endurance ~3.8. Earlier (review 2026-11-02 evening, Claude alone; Sol skipped, Codex week 4%): about 89% (range 86-90%); 3.5-4 weeks. Beebe 4.0, Lost City 4.0, Monterey 4.0, Titanic 3.9, Blue Hole 3.85, Hunga 3.45, Kama 3.5 (plume fixed; vent site small on a huge dark slope). Earlier (review 2026-11-02 morning): about 89% (range 86-90%); 3.5-4 weeks. Beebe 4.0, Lost City 4.0, Monterey 4.0, Titanic 3.9, Blue Hole 3.85, Hunga 3.45, Kama 3.3. Earlier (review 2026-11-01 evening, Claude alone; Sol skipped, Codex week 4%): about 88% (range 85-89%); 4 weeks. Blue Hole 3.85, Beebe 3.85, Lost City 4.0 (tower top blown), Monterey 4.0, Titanic 3.9, Hunga 3.4, Kama 3.2. Earlier (review 2026-11-01 morning, Claude alone; Sol skipped, Codex week 5%): about 88% (range 85-89%); 4 weeks. Lost City 4.05 (tower flank now lit), Monterey 4.0, Titanic 3.9, Blue Hole 3.8 (hood still a slab), Beebe 3.8, Hunga 3.2, Kama 3.1. Previous stage (review 2026-10-30, Claude alone; Sol skipped, Codex week 6%): about 86% (range 83-88%) to 1.0; 4-5 weeks. Beautiful: Titanic 3.9, Lost City 3.9, Blue Hole 3.8, Beebe 3.7, Monterey 3.9, Challenger 3.6, Endurance 3.6. Blockers: (1) no hero firmly at 4; (2) Blue Hole and Beebe openings (gallery read, Beebe darkness); (3) real-phone Low-tier acceptance.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- Claude: V-closeup-materials Lost City merged 2026-11-06; next Sonnet: V-monterey-wall-marker (code route), V-closeup-materials other heroes. Earlier: R-ci-red-5 and V-bismarck-debris merged 2026-11-05 evening; next Sonnet items V-monterey-wall-marker, V-closeup-materials. Codex 146-148 queued (Codex 5h limit hit 16:5x, back 17:45). 124/131 held.

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: review 2026-11-01 (evening) in `plan/REVIEWS.md` (Claude alone, Sol skipped for Codex budget) and golden `2026-10-30-212725`; earlier items (all DONE ones, with commits) in [archive/DIRECTOR-HISTORY-2026-10-30-backlog.md](archive/DIRECTOR-HISTORY-2026-10-30-backlog.md). Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md).

4b. **DONE 2026-11-02 (8bb5f1ea) R-debrief-frozen-red:** three `journal-debrief` 'frozen debrief 1280x720' tests fail on main at the `.objectives-panel` visibility check (likely from U-dive-start-hud, panel now appears after the first objective). Fix the tests to wait for/trigger the first objective, or the setup; check hosted CI shards 4 and 5 of run 41412499549 for other red specs.
4c. **DONE 2026-11-02 (b12783e6) R-ci-red-4 (all four were stale tests):** four specs red in hosted CI run 41419337643: content-missions bismarck and hud-touch surface HUD arcade (shard 4); f-a11y completion banner contrast and f-first-minute-620 animal scan card (shard 5). Triage each: real regression or stale test.
6a. **V-kama-subject [Sonnet] (DONE 2026-11-02, run 314; ~3.8) (golden 2026-11-02-162332):** plume is now two thin wisps, but the opening frame is 80% one dark blue-grey slope with a tiny vent site. Target: vent site and glow pool fill the lower-centre third, slope visible as a lit edge only. Route: opening pose closer and lower (data), or a small field of secondary vents/chimneys around the main one (prop, not a site branch).
6b. **R-monterey-opening-red [Haiku] (DONE 2026-11-02, 27fcb0c4; stale test) (CAUSE OF RED CI, runs 309 and 310, shards 26/30/37):** `opening-framing.spec.ts:503` (monterey-canyon low/medium/high, "mission previews and opens on an approach outside scan range") fails on main: objective reads "Survey the north canyon wall" where the test expects "Scan". Find which is stale and fix the test or text; run `npx playwright test tests/e2e/opening-framing.spec.ts -g monterey`. 7. **V-bluehole-hood-code [Sonnet] (second pass 2026-11-02 NOT MERGED, branch `claude/V-bluehole-hood-code` kept: swapping the primary order and scaling the east hood 1.5x only reached ~4/10 composition and broke ~26 unit tests (props-geo snapshots, pendant envelope, collision, spawn, journal summary). Do not repeat data tweaks; needs a closer-opening/pitch-up design decision or a code-level hood. First pass:** (PARTIAL 2026-11-01, 05a332d1; golden 2026-11-02 still shows a small brown leaf with open water above):** every pose under 110 m fails the hull-safe route check, so either relax that check for the east-gallery pose or enlarge/reposition the hood mesh. Target: hood fills the top ~30% of the opening frame as a dark overhang with stalactites, sub to one side. 8. **V-hunga-silhouette [Sonnet] PARTIAL 2026-11-02 (de73100e: flat-topped crest with two steps, ~4.0, reads a little like a slab; bank behind still a soft hill) (PARTIAL 2026-11-01, 6e9e0f5d; golden 2026-11-02 unchanged: bedded but still a pointed wedge):** needs code, not data: widen the wall into a flat-topped escarpment (terrain profile under the wall, stepped crest). Target: near-vertical wall with a level crest line across the frame.

- **R-ci-red-5 [Sonnet] DONE 2026-11-05 (merged; two specs' cleanup fixed, phone-accept monterey not reproducible, watch next hosted run) (review 2026-11-05 evening):** hosted CI on main red since the 10:51 merge; same five shards fail every run (f1-touch.spec.ts:70, globe-pins.spec.ts:39 at both phone layouts, phone-accept.spec.ts:348 monterey 844x390). Test defects from the touch bug hunt. Blocks tag f74.
- **U-play-walkthrough-3 [Haiku, UNBLOCKED 2026-11-05 (Sol: first-five-minutes evidence is stale, newest unaided capture 2026-11-02/10-26)]:** see item below; run at 1280x720, 390x844 and 844x390, unassisted (no teleported scan poses, real clock), Titanic and Blue Hole first.
- **V-monterey-wall-marker [Sonnet] TRIED 2026-11-05 (no shippable pose: yaw 0 centres the marker but fails heroMissionSpawn and the 0.2 width floor; needs a generic opening bias toward the face side or scarp.ts work, not data) (review 2026-11-05):** the objective diamond sits on the far ridge, not on the pale wall face now visible centre-right; move the scan target/pose so the marker lands on the wall face and the sub looks at it. Data only.
- **V-closeup-materials [Sonnet] Lost City DONE 2026-11-06 (3790ef12; fluted towers + base biofilm, ~5.5/10; Titanic/Blue Hole/Beebe heroes still open) (Sol 2026-11-05, Claude agrees on detail frames):** at scan distance the heroes lose to openings: Lost City towers are smooth and faceted, Titanic plating repeats, Blue Hole close view is terraced, Beebe chimneys angular. One hero per package; target the detail frame (`*-3.png`) not the opening; generic material/noise changes, no site branch.
- **V-horizon-upper-half [Sonnet, optional] (review 2026-11-05):** Endurance, Titanic, Bismarck and Lost City all have a dead upper 35-50%; try one generic far-ridge/`fogHaze` horizon option (as for Axial) instead of per-site tweaks.
- **R-deploy-gate DONE 2026-11-05 (kept as is: Pages deploys only on green CI; CI is green again and deployed 04:45Z, so the freeze was a symptom of red CI, fixed by R-ci-red-5/7) [Haiku] (Sol finding, confirmed):** deploy.yml deploys only after CI succeeds on the exact SHA, so red CI froze Pages (all deploys skipped since 2026-11-05 18:29). Decide whether Pages should deploy on smoke-green so the owner's phone gets builds; log in PROCESS-LOG.md.
- **V-hudson-ledge [Sonnet] DONE 2026-11-05 (53c303fe; distant ledge wall in upper third, ~5.5/10) (golden 2026-11-03, ~3.8):** coral heads are lit and readable but the top 40% is plain dark water. Target: a horizon wall or ledge lip in the upper third (generic `cliff` field, as Hunga). Lowest priority of the three.
- **U-play-walkthrough-3 [Haiku, after the next phone retest]:** re-run the first-60-s capture (Home, site pick, briefing, first scan, debrief) at 1280x720 and 390x844 and list confusions in `plan/progress/`; file each as a U-* item.
- **V-golden-refresh [Haiku]:** run `GOLDEN_MODE=mission tools/golden.sh` in the background (about 15 min) after the V-axial-subject and V-bismarck-framing merges and note which frames changed; feeds the next review.
- **V-lostcity-tower-scale [Sonnet] IN FLIGHT (claude, 2026-11-06) (golden 2026-11-04, ~3.9):** the Poseidon tower is a small spire on a big empty hill; the upper half of the frame is plain water. Target: tower and its flank fill the centre third of the frame, sub low-left. Route: opening pose closer/lower (data), after T-framing-metrics gives numbers.
- **V-bismarck-debris [Sonnet] DONE 2026-11-05 (~6/10: slabs now small dark buried debris; hull streak noise from shared plateStains remains, upper 35% dark):** foreground debris plates are huge flat hexagons, hull plating texture is moire-like.
- **V-bismarck-hull-scale [Sonnet] (golden 2026-11-04, ~3.6):** hull is a distant flat slab (about a quarter width) with the sub overlapping its stern; foreground is grey slabs and snow. Target: hull fills about half the width, sub clear of it, foreground boulders smaller. Route: pose data, boulder scale via the preset.
- **V-monterey-wall-clarity [Sonnet] PARTIAL DONE 2026-11-05 (4e713126; pose only, ~4.5/10: one pale wall face reads centre-right, sub still on a talus slope, striation distance fade not done, needs scarp.ts change) (golden 2026-11-04, ~3.7, was 4.0):** the opening is a busy ridge of layered rock with no obvious wall to scan; objective reads "North canyon wall" but nothing marks it. Target: one clear wall face in the centre-right with the sub in the canyon, not on the ridge. Route: pose data; check whether the 11-02 pose change regressed it.
- **V-bluehole-opening-hood [Sonnet, after T-bluehole-hood-poses] (2026-11-05 golden: opening now shows the gallery with stalactites beside the sub, ~3.8; demoted, close-up quality moves to V-closeup-materials):** mission opening still shows a small brown leaf-shaped outcrop (golden 2026-11-04, ~3.7). Use the Codex pose table; if no pose passes, a code-level hood (generic overhang capability) is the next step. Do not repeat data-only tweaks.
- **V-endurance-seabed-patches DONE 2026-11-05 (b5836c18, ~8/10: ribbons now soft faded swells) [Sonnet, NEW 2026-11-05, top Sonnet item after the in-flight pair] (Sol, confirmed by Claude on endurance-1-mission.png):** the opening seabed is dominated by smooth dark hard-edged ribbons and blotches (reads as stains, not terrain). Target: a continuous sand/silt floor with soft, low-contrast variation and a few ripples; the hull and dropstones are the only strong shapes. Route: seabed material/tint for the Endurance preset (data), no site branch.
- **V-monterey-wall-clarity addendum (2026-11-05; colour/relief distance fade DONE 2026-11-05, ~5/10, stripes remain from ledge displacement: needs distance-scaled displacement or a framing change):** the opening is repetitive striped rock everywhere; reduce the striation contrast/frequency at distance so one wall face reads.
- **V-endurance-hull-scale DONE 2026-11-05 (pose data, ~6.5/10: hull ~36% width broadside; upper half still empty) [Sonnet] (golden 2026-11-04, ~3.8):** hull is a small sliver mid-frame and the upper 45% is empty dark water. Target: hull fills a third of the width. Route: pose data after T-framing-metrics.
- **T-bluehole-hood-poses [Codex] DONE 2026-11-04 (a8317e5e)** and **T-framing-metrics [Codex] DONE 2026-11-04 (merged after it)** feed the V-* items above; **S-verify-phone-hud [Codex, queued 135]** verifies the phone fixes merged since f72.
- **V-axial-sky-band [Sonnet, optional] (golden 2026-11-04, Axial ~4.0):** upper third is still empty dark water above the ridge; add a faint far ridge or particle haze via the generic `fogHaze` horizon option.

- **T-hood-scale-table [Codex] DONE 2026-11-05 (e6d5edde; no pose reaches 25-30% hood on both layouts, best B 3x -25 m = 10%/24%; V-bluehole-opening-hood needs a code-level hood or portrait-only composition):** (replaces T-overhang-capability; Sol 2026-11-05: `grotto-overhang`/`stalactite-gallery` already exist and fill only 2-3% of the screen, so first find the scale/pose that reaches ~25-30%, then Claude wires it into V-bluehole-opening-hood.)
- **S-bughunt-touch-input [Codex] DONE 2026-11-05 (e6d5edde):** audit touch controls (stick, swipe-up list, scan hold, rotate, blur/visibility release) for stuck input, double-fire and layout-dependent bugs at 390x844 and 844x390; test and fix minimally.
- **S-perf-lostcity-audit [Codex] DONE 2026-11-05 (e6d5edde; see plan/progress/S-perf-lostcity-audit.md) (P2-lostcity-perf):** static audit of Lost City per-frame cost on the Low tier (triangle and draw-call counts per prop group, particle counts, shadow and post passes); report ranked reductions with numbers and implement only safe, generic ones.
- **V-lostcity-tower-scale + V-bismarck-hull-scale [Sonnet] DONE 2026-11-05 (merge of claude/V-lostcity-tower-scale): Lost City tower width 24% to 39%, Bismarck hull ~38% by eye; Bismarck foreground debris plates still large (needs a debris-builder change), upper 40% of Lost City still open water**

11. **R-ci-speed [Codex, 124 NOT merged 2026-11-04 (19x2 unmeasured, may flake); follow-up queued 131 as workflow_dispatch experiment]:** hosted CI takes 30+ min, so failures surface 1-2 runs late. Audit shard balance and slow specs; target under 20 min without dropping coverage.
12. **P2-phone-accept [owner + Codex; browser-checkable items automated in tests/e2e/phone-accept.spec.ts]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build.
13. **R-release [Haiku]:** tag the latest green-CI main after each review (f71 is the newest, 2026-11-01); f72 tagged 2026-11-03 (c985a29c, CI green); f73 tagged 2026-11-04 (af8fbce2, CI green); next tag after the next review.

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
