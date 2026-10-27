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

Stage (review 2026-10-26 evening, Claude alone): about 85% to 1.0; 4-5 weeks. Beautiful: Titanic 3.5, Lost City 3.5, Blue Hole 3.6, Beebe 3.5, Monterey 3.6, Challenger 3.5, Endurance 3. Blockers: (1) none of the five heroes at 4 yet; (2) eight-site spawns (Axial, Kama, Hunga); (3) real-phone Low-tier acceptance; (4) Blue Hole roof and Lost City surround.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No Claude package running (2026-10-26 evening). Codex queue: 4480 (R-ci-green), 4490 (S-verify), 4500 (S-bughunt).

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: reviews 2026-10-26 (joint with Sol) and 2026-10-26 evening (Claude alone, Codex budget low) in `plan/REVIEWS.md`; earlier item histories in [archive/DIRECTOR-HISTORY-2026-10-26-backlog.md](archive/DIRECTOR-HISTORY-2026-10-26-backlog.md). Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md).

1. **V-bluehole-roof [Sonnet]:** (~3.6) after two silhouette passes the gallery top is still a broad slab and no light falls through the opening. Target from `great-blue-hole-east-2.png`: the roof reads as a thin broken ceiling with a soft light shaft; the flat tan horizontal banding on the wall is reduced by breaking the stripe frequency. Silhouette and one shaft only; keep the Class B spawn numerics.
2. **V-lostcity-surround [Sonnet] DONE 2026-10-26 (db495bb0; ~3.7: streaks gone, two taller chimneys; talus skirt still weak, terrace support in Terrain.ts now has no shipped user: delete candidate):** (~3.5) Poseidon now reads as one tower; the surrounding slope is still a bare dark-olive ridge with streaky texture. Target `lost-city-3.png`: a pale carbonate rubble and talus skirt at the tower base, a second and third smaller chimney in mid-ground, no streak texture on the ridge. Do not raise the High plume budget.
3. **V-eight-sites-lit [Sonnet] Axial part DONE 2026-10-26 (~3.2; chimney bodyGlow via vertexGlow, golden aliases axial/kama/hunga; next: Hunga, Kama, Axial approach framing):** (Axial/Kama ~3.0, no golden for them yet: add `axial`, `kama`, `hunga` to GOLDEN_SITES first) Axial lit-chimney treatment through site data and shared `vertexGlow`; then Hunga's dark subject, then Kama. 4500 reports the numerics.
4. **V-endurance-hull [Sonnet, small]:** (~3.0 to 3.2: speckle is gone from the new capture, hull has planks and decks) next target is a richer silhouette (masts, rails, rubble skirt) or a lit subject; the sandy flat is empty.
5. **V-monterey-wall-skirt [Sonnet, small] DONE 2026-10-26 (37c5cbd9; the 'skirt' was the wall self-lit lift, 0.27 to 0.18):** (~3.6) the sub overlaps the wall's translucent skirt in the opening (`monterey-canyon-1.png`: sub half-transparent against the wall). Wall-material fix: opaque near the camera or no skirt, nothing else.
6. **V-beebe-flow [Sonnet] DONE 2026-10-26 (b52caaf8; ~3.7: per-vent height/width/lean, warm mouth haze; trunk plume still a dense column):** (~3.5) plumes are tall uniform columns; add flow variation and a lit hot-water haze through the existing vent shader (data, no new system).
7. **R-ci-green [Codex]:** hosted CI green on fde5c15d (f67 tagged). Keep it green; 4480 restores the dropped unaided-pilot journey leg. Triage any red run by failing spec.
8. **S-verify / S-bughunt [Codex, standing]:** 4490 (Lost City towers numerics and perf), 4500 (Axial/Kama/Hunga geometry). After each visual merge, verify numerics; bind captured images, manifests and SHA together before accepting evidence.
   8b. **S-dead / S-bughunt [Codex]:** 4510 (verify Lost City surround and Monterey wall lift), 4520 (delete unused terrace support in Terrain.ts), 4530 (first-minute flow audit).
9. **P2-phone-accept [owner + Codex]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build (Aa button, Journal photo, High Lost City plume, Blue Hole and Lost City shapes).
10. **R-release [Haiku]:** tag the latest green-CI main after each review (f67 is the newest); check the Pages deploy.
11. **P2-globe-bright [Sonnet, demoted]:** brighter globe, only if the lanes above are blocked. **V-bluehole-hood [Sonnet, demoted]:** east hood sheet facets (folds into item 1).

Demoted: further Titanic sky tuning, Challenger boulders, per-site decoration, title polish, Endurance framing (CUT 2026-10-16), Titanic per-plate blockiness (accepted ~3.7). The Codex lane stays thin until the Claude lanes produce non-visual follow-ups; Codex weekly burn is ~55%/day, so briefs stay rationed.

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
