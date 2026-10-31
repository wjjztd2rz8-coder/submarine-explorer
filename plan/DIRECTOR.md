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

Stage (review 2026-10-30, Claude alone; Sol skipped, Codex week 6%): about 86% (range 83-88%) to 1.0; 4-5 weeks. Beautiful: Titanic 3.9, Lost City 3.9, Blue Hole 3.8, Beebe 3.7, Monterey 3.9, Challenger 3.6, Endurance 3.6. Blockers: (1) no hero firmly at 4; (2) Blue Hole and Beebe openings (gallery read, Beebe darkness); (3) real-phone Low-tier acceptance.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No package running. Briefs 120-123 queued, waiting for the Nov 4 Codex reset. Claude lane: Sonnet items 5-10 in order.

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: review 2026-10-30 in `plan/REVIEWS.md` (Claude alone, Sol skipped for Codex budget) and golden `2026-10-30-212725`; earlier items (all DONE ones, with commits) in [archive/DIRECTOR-HISTORY-2026-10-30-backlog.md](archive/DIRECTOR-HISTORY-2026-10-30-backlog.md). Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md).

2. **V-bluehole-gallery-read [Sonnet] PARTLY DONE 2026-10-30 (c3762037; openingDepthM field opens Blue Hole 24 m down, stalactites visible under the hood, bluer water via atmosphere.water; dome still reads partly as an overturned boat, remaining fix is hood geometry in stalactites.ts) (continues the 2026-10-30 partial, 99fe5f21):** the dome now sits beside the sub but still reads as a brown overturned boat; stalactites are hidden from the 10 m opening pose. Target: opening frames a dark arch/overhang with hanging stalactites, sub off to one side. Add an opening-altitude field to the shared opening data or change the approach bearing; no site branch. Also the water is a washed-out flat teal (scene Y 27%, 1.8x the sub); pull it toward documentary blue with depth.
3. **V-beebe-exposure [Sonnet] PARTLY DONE 2026-10-30 (1224939d; hullLight 0.27→0.9 and lamps raised in Beebe data, sub 3%→14.7%, seabed pool ~25 m; remaining dark seabed beyond pool needs ambientFill/lamp reach):** Beebe opening is readable now (two smokers in a warm pool) but the scene is near-black (scene Y 1.7%, sub 5.5%) and the sub's own hull is barely lit. Target: sub lit by its lamps to roughly the other sites' 20%, seabed readable 30 m around it, deep-black water kept. Site atmosphere/lamp data, no site branch.
4. **V-lostcity-tower-light [Sonnet, small] PARTLY DONE 2026-10-30 (merge of claude/V-lostcity-tower-light; Lost City tower rims now lit by cool-white glow lights via mission data, ~3.9→4.0; upper-third light shaft and flank key still open):** Lost City (~3.9) has a dark empty upper third and flat grey tower base; add a soft key light on tower tops via site data.
5. **V-hunga-wall-rise [Sonnet]:** Hunga opening still shows an isolated brown wedge on a flat slope. Raise terrain under and behind the wall (data-driven height field, no site branch) so it reads as a caldera rim; target: wall meets ground, vent beside the sub.
6. **V-bluehole-hood-geometry [Sonnet]:** gallery dome still reads as an overturned boat; reshape the hood (ribbed, irregular lip, darker underside) from Blue Hole data.
7. **V-beebe-ambient-reach [Sonnet] DONE 2026-10-31 (c6c8e049; ambientFill 12, hullLight 0.75 in Beebe mission data, seabed and third smoker base read past the lamp pool):** seabed beyond the 25 m lamp pool is near-black; raise ambientFill or lamp reach via Beebe data until the third smoker is visible.
8. **V-lostcity-upper-light [Sonnet] IN FLIGHT 2026-10-31:** upper third of the Lost City opening is empty; add a light shaft or flank key from mission data.
9. **V-endurance-tint [Sonnet, small]:** per-site emissive tint in `src/world/props/wrecks/materials.ts` via site data (route named in V-endurance-accent).
10. **V-coral-variant [Sonnet]:** per-prop tint/variant on the coral-mound feature so mounds stop reading as identical lumps (V-opening-dark route).
11. **U-label-clip [Haiku] DONE 2026-10-31 (label hidden unless fully on screen):** a teal event/label line ("Hunga Tonga-Hunga Ha'apai (pre-2022 s...") is clipped at the left screen edge in `hunga-tonga-caldera-1.png`; anchor it fully on screen or drop it (one guidance surface).
12. **V-endurance-accent [Sonnet, small, demote if tried again]:** TRIED 2026-10-27, no change merged (see plan/progress/V-endurance-accent.md); next route is a per-site emissive tint in `src/world/props/wrecks/materials.ts` via site data.
13. **V-hunga-kama-subject [Sonnet] PARTLY DONE 2026-10-31 (ba559fb2; Hunga rim-foot vent added, wedge still reads isolated, needs terrain rise under the wall):** Kama vent cluster merged 2026-10-29; Hunga still opens on an isolated brown wedge. Target: ground the Hunga rim into the slope; reuse existing props.
14. **V-opening-dark remainder [Sonnet] TRIED 2026-10-31, not merged (three more same-tan coral-mound stands plus rocks, 3.2 to ~3.3: still identical lumps; branch deleted). Next route needs code: a per-prop tint/variant on the coral-mound feature, or a lower opening via site `opening` data; demote until then:** Blake's six-mound field (~3.2) still reads as similar tan lumps on dim sand. Target: varied cover (coral stand, sponge) from existing props. Low priority after items 1-6.
15. **Codex, queued 120-123, waiting for the Nov 4 reset:** T-opening-geometry (120), S-verify CI (121), S-dead second sweep (122), S-verify spawn cap (123).
16. **P2-phone-accept [owner + Codex; browser-checkable items automated in tests/e2e/phone-accept.spec.ts]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build.
17. **R-release [Haiku]:** tag the latest green-CI main after each review (f68 is the newest); check the Pages deploy. CI run 41123511681 had one red e2e shard (2/38; log unavailable); the next full run decides whether a tag is possible.

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
