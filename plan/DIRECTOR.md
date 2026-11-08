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

Stage (review 2026-11-07 evening, Claude + Sol agreed): about 85% to 1.0, 4-6 weeks. Opening scores (Claude): Titanic 4.1, Lost City 4.1, Beebe 4.0, Monterey 3.8, Blue Hole 3.5, Bismarck 3.2. Whole-site incl. approach and detail (Sol; the 1.0 rubric needs 4/5 at all three): Titanic 3.5, Lost City 3.5, Beebe 3.5, Blue Hole 3, Monterey 3; none yet holds 4. Blockers: current-build unaided journeys, hero detail materials, phone Low-tier baseline, release verification time and a red Monterey catalog spec. Earlier stages in REVIEWS.md.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- Claude: none. U-copy-fixes items 6-8 DONE 2026-11-07 (39830258); walkthrough-4 items 4-5 (scan-interrupt cue, side-find clarity) remain in item 9.

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: review 2026-11-07 in `plan/REVIEWS.md` and golden `2026-11-07-055753`. Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Earlier items (all DONE ones, with commits) are in `plan/archive/DIRECTOR-HISTORY-*.md`. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md).

### Claude lanes (Sonnet unless noted)

Evidence: golden `2026-11-07-180922`, review 2026-11-07 (evening) in `plan/REVIEWS.md`. Partial art items (all marked "partial" earlier) are re-listed here with their remaining gap so nothing is lost when DONE items go to the archive.

1. **U-ci-monterey-catalog [DONE 2026-11-07 (spec skips offsets under 40 m altitude; local 5.4 s to 3.4 s; hosted effect unverified, re-check next run), TOP: CI red]:** hosted CI fails only `hud-touch.spec.ts:1814` "catalog tutorial and reload" for `monterey-canyon` (4.0 min timeout, several viewports; every other site passes). Locally it passes in seconds, so the cost is the seabed-latch wait inside `away()` under software GL. Make the spec cheaper for this site (fewer frames per try, or move the sub clear of the 25 m latch in one step) and check per-case time with `--repeat-each`. No product change.
2. **DONE 2026-11-07 (U-retest-walkthrough-5, note plan/progress/U-retest-walkthrough-5.md).**
   2a. **DONE 2026-11-07 U-seabed-latch-hides-scan (146cf4bd) [P1]:** on touch the seabed warning holds the guidance slot for minutes while the reticle is on the target, so no "Hold SCAN" shows (Titanic phone 61-541 s, landscape 51-540 s). A live scan prompt must outrank the static warning (or clear the latch at 15 m). Also hysteresis for the desktop flicker (7 flips in 28 s). One guidance surface, no layout patch.
   2b. **DONE 2026-11-07 U-copy-fixes-2 [Haiku] (plan/progress/U-copy-fixes-2.md):** touch opening card names the destination; debrief "Next" names the one open primary; scan-drop card keeps its cue instead of STEP 3; touch slider card waits for a target in reach. Objective distance on landscape touch is hidden by the ring CSS rule (finding for S-hud, not a copy fix). Fish-vs-objective reticle lock (U-scan-fish-lock-landscape) is a separate Sonnet item.
3. **V-monterey-wall-face [attempted TWICE 2026-11-07, nothing shipped; 2nd pass (plan/progress/V-monterey-wall-face-2.md) moving carve+hero+POI 170 m east rated 3.3, worse than 3.8 baseline. Moving the trio does not reproduce try2. Only remaining lever: an authored pale face prop at the marker (owner design call); otherwise park at 3.8]. Earlier note: [ see plan/progress/V-monterey-wall-face.md. Next: move carve focus, canyon-wall-ledge hero and scan target together ~180 m east, then rebaseline habitat/carve tests (allowed: rules-can-bend)]:** opening is striped rock with no clear wall face (Sol 3, me 3.8 by opening). Target: one wall face centre-right with the marker on it. Site data (scan target onto the pale face, pose) plus a generic scarp distance fade of displacement.
4. **V-titanic-detail-plates:** opening is now rust-brown (4.1), but the detail frame (`titanic-3.png`) still has pale regular plating and angular rusticles. Shared plate shader: irregular seams, per-plate tone variance, rounded rusticles. Also helps Bismarck.
5. **V-bismarck-hull-plates:** hull reads as a pale green-grey flat slab on a dome (opening 3-3.5; no demonstrated regression, plating was already pale). Target: darker streaked plating with broken seams (shared shader with 4), scour visible as a darker rim, far horizon not a perfect dome. Do not flatten the seamount flank (`data/landmarks/bismarck/guide.json`).
6. **V-bluehole-gallery-2:** gallery is ~18% of frame width in the opening (3.5). Next lever: a larger gallery prop or an apron-clearing approach (moves the free-dive hero pose too); apron still lacks fine silt grain and ripples. Re-check scan reach (the closer opening changed it).
7. **V-beebe-chimney-stacks:** still a broad folded cone (`beebe-vent-field-3.png`); a vent bore alone will not fix the silhouette. Target: separated slim stacks with a vent orifice, via shelf/stack placement in site data plus the shared builder.
8. **V-lostcity-tower-forms:** readable cluster, but smooth forms and faceted hollow tubes in `lost-city-3.png`. Target: irregular tower profiles and rounded tubes.
   8b. **U-scan-fish-lock-landscape [IN FLIGHT Sonnet, 2026-11-08]:** on landscape Blue Hole the scan reticle locks onto a fish school in front of the marked gallery for ~60 s with ~25 interruptions; the marked objective inside the reticle must win over a passing fish (evidence `plan/progress/U-retest-walkthrough-5.md` finding 2).
9. **U-copy-fixes [Haiku]:** U-depth-card-level-approach (extends 12), U-scan-interrupt-cue, U-side-find-clarity, U-ctrl-tip-timing, U-objective-two-cues, U-scan-prompt-copy (from walkthrough-4, `plan/progress/U-retest-walkthrough-4.md`).
10. **V-golden-refresh [Haiku]:** `GOLDEN_MODE=mission tools/golden.sh` detached after items 3-8 land; feeds the next review.
11. **V-axial-sky-band [optional]:** Axial upper third is empty dark water; enable `horizonRidge` in its preset data (generic option already exists).

### Codex lane (self-contained, not visual)

12. **U-depth-step-skip [Codex, brief 149, rewritten 2026-11-07]:** the 15 m skip already exists (Tutorial.ts); reproduce why walkthrough-3 still saw the step for 3-7 min (targetGapM undefined?) and fix only that gap, or report not reproducible.
13. **U-journal-open-current [Codex, brief 150, rewritten 2026-11-07]:** current-site opening already exists (Journal.ts); find the cold-load case that still shows 'Loading the Journal...' / All dive sites breadcrumb, fix that only.
14. **S-verify-endurance-relief / T-verify-endurance-hull-pose / S-bughunt-scan-journal [Codex, briefs 146-148]:** verification and bug hunt over merged work; briefs 124/131 (R-ci-speed) stay held.
15. **R-ci-speed [Codex, held 124/131]:** hosted CI takes 25-30 min; target under 20 min without dropping coverage; 124 was not merged (unmeasured, may flake), 131 is a workflow_dispatch experiment.

### Release and owner

16. **P2-phone-accept [owner + Codex]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build.
17. **R-release [Haiku]:** tag the newest green-CI main after each review (f75 newest, 2026-11-06); next tag f76 once CI on main is green (blocked by item 1).

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
