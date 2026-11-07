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

Stage (review 2026-11-07; see REVIEWS.md for the agreed figure; prior 2026-11-06, Claude + Sol): about 85% to 1.0, 4-5 weeks (Claude opened at 87% and 3 weeks; Sol 84% and 4-6; agreed). Opening-only (Claude): Beebe 4.1, Lost City 4.1, Endurance 4.0, Titanic 3.9, Monterey 3.8, Blue Hole 3.8, Bismarck 3.5. Whole-site incl. approach and detail (Sol; the 1.0 rubric needs 4/5 at all three): Titanic 3.5, Lost City 3.5, Beebe 3.5, Blue Hole 3, Monterey 3; none yet holds 4. Blockers: unaided first-five-minutes evidence (phone and desktop), hero close-up materials, Monterey marker, phone Low-tier baseline, release verification time. Earlier stages in REVIEWS.md.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- Claude: none. Last merged 2026-11-07: V-bluehole-apron-silt, U-retest-walkthrough-4. Last merged 2026-11-06: U-scan-fish-vs-objective (62cc2f0e). Codex 146-150 queued (held by weekly pacing, 28% left); 124/131 held.

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: review 2026-11-07 in `plan/REVIEWS.md` and golden `2026-11-07-055753`. Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Earlier items (all DONE ones, with commits) are in `plan/archive/DIRECTOR-HISTORY-*.md`. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md).

### Claude lanes (Sonnet unless noted)

1. **V-bluehole-apron-silt [DONE 2026-11-07 (6681839c), partial ~3.5/5: terraces now irregular, rocks varied; fine silt grain/ripple still missing]:** the grotto wall now reads as weathered limestone, but the sediment apron in the detail frame (`great-blue-hole-3.png`) is a stack of smooth, evenly spaced terraces with identical boulders. Target: one irregular silt slope with fine grain, ripple/slump breaks and varied rock size; reuse the shared silt/limestone shader, no site branch. Check the opening is unchanged.
2. **V-bluehole-opening-gallery [Sonnet, after 1]:** the 2026-11-07 mission opening shows a big sub beside a small brown outcrop (gallery is ~15% of the frame). Target: the gallery fills the centre-right third with stalactites visible, sub smaller and to the left. Needs a closer-opening/pitch decision, not data nudges (see archive: two data-only passes failed, branch `claude/V-bluehole-hood-code` kept).
3. **V-bismarck-ground-scour [Sonnet]:** hull still floats on a dome seabed (opening ~3.4). Target: hull visibly sits in a shallow carved scour, debris darker and smaller, horizon no longer a perfect dome. Route: a generic terrain-carve option under a wreck footprint (as for other wrecks), not a pose; do not flatten the sourced seamount flank (`data/landmarks/bismarck/guide.json`).
4. **V-beebe-chimney-form [Sonnet]:** crust shader helped, but spires are still slab-like folded flanges. Target: tapering, irregular chimney columns with flange breaks and a vent orifice, readable at 20 m. Geometry change in the shared chimney builder.
5. **V-monterey-wall-face [Sonnet]:** the marker now sits on the pale crest but reads as a ridge end; the opening is striped rock without a wall face. Needs a moved scan target onto the pale face (site data) plus the pose that frames it, and a generic scarp distance fade of displacement. Target: one clear wall face centre-right with the marker on it.
6. **V-titanic-hull-tone [Sonnet, small]:** hull is still salmon-pink with gridlike seams (detail ~4.0). Target: darker, desaturated rust-brown with deeper streaking and broken plate seams; shader params only.
7. **U-retest-walkthrough-4 [DONE 2026-11-07 (e1a2e55c); note plan/progress/U-retest-walkthrough-4.md; first scan 146-211 s, debrief reached on desktop/phone; landscape stalled on seabed warning]. Follow-ups U-seabed-warning-action (IN FLIGHT Claude Sonnet 2026-11-07, branch claude/U-seabed-warning-action; TOP, Sonnet: name the fix, stop flicker in guidance slot), U-depth-card-level-approach (extends 10), U-scan-interrupt-cue, U-side-find-clarity, U-ctrl-tip-timing, U-objective-two-cues, U-scan-prompt-copy (Haiku-sized copy fixes). Old text: [Haiku, TOP (Sol: first-five-minutes acceptance is blocker 1; walkthrough-3 used POI poses and a paused clock, landscape journey got no scan in 7 min)]:** real clock, no teleported poses, served SHA verified; unassisted capture at 1280x720, 390x844 and 844x390 (served SHA verified), Home to debrief; file confusions as U-* items.
8. **V-golden-refresh [Haiku]:** run `GOLDEN_MODE=mission tools/golden.sh` detached after items 1-3 and note changed frames; feeds the next review.
9. **V-axial-sky-band [Sonnet, optional]:** Axial upper third is empty dark water; enable `horizonRidge` in its preset data (generic option already exists).

### Codex lane (self-contained, not visual)

10. **U-depth-step-skip [Codex, brief 149, rewritten 2026-11-07]:** the 15 m skip already exists (Tutorial.ts); reproduce why walkthrough-3 still saw the step for 3-7 min (targetGapM undefined?) and fix only that gap, or report not reproducible.
11. **U-journal-open-current [Codex, brief 150, rewritten 2026-11-07]:** current-site opening already exists (Journal.ts); find the cold-load case that still shows 'Loading the Journal...' / All dive sites breadcrumb, fix that only.
12. **S-verify-endurance-relief / T-verify-endurance-hull-pose / S-bughunt-scan-journal [Codex, briefs 146-148]:** verification and bug hunt over merged work; briefs 124/131 (R-ci-speed) stay held.
13. **R-ci-speed [Codex, held 124/131]:** hosted CI takes 25-30 min; target under 20 min without dropping coverage; 124 was not merged (unmeasured, may flake), 131 is a workflow_dispatch experiment.

### Release and owner

14. **P2-phone-accept [owner + Codex]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build.
15. **R-release [Haiku]:** tag the newest green-CI main after each review (f75 newest, 2026-11-06); next tag f76 once CI on main is green.

Demoted: further Titanic sky tuning, Challenger boulders, per-site decoration, title polish, Endurance framing (CUT 2026-10-16), per-plate blockiness, Hunga silhouette (4.0, parked), V-bismarck-hull-scale (superseded by 3).

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
