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

Stage (review 2026-10-29 evening, Claude alone; Sol skipped, Codex week 6%): about 85% (range 82-87%) to 1.0; 4-6 weeks. Beautiful: Titanic 3.9, Lost City 3.8, Blue Hole 3.7, Beebe 3.7, Monterey 3.9, Challenger 3.5, Endurance 3.6. Blockers: (1) no hero firmly at 4; (2) Kama, Blake, Bismarck and Blue Hole mission openings; (3) real-phone Low-tier acceptance.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No package running. Briefs 120-122 are queued but wait for the Codex week reset (Nov 4; 6% left). Claude week 94% left: run Sonnet packages V-bluehole-opening, V-bismarck-patches, V-kama-opening, V-titanic-aft in that order.

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: reviews 2026-10-27 (Claude alone, Sol skipped for Codex budget) and 2026-10-26 in `plan/REVIEWS.md`; earlier item histories in [archive/DIRECTOR-HISTORY-2026-10-26-backlog.md](archive/DIRECTOR-HISTORY-2026-10-26-backlog.md). Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md). Done this cycle (removed): V-hunga-subject, V-kama-axial-approach, V-monterey-banding, V-bluehole-roof, V-lostcity-surround, V-monterey-wall-skirt, V-beebe-flow, V-lostcity-towers, V-bluehole-silhouette, V-monterey-apron.

2. **V-hunga-kama-subject [Sonnet] PARTLY DONE (pins merged 2026-10-29: taller Kama vent cluster now opens beside the sub with smoke; Hunga unchanged) 2026-10-28 (aa928fa6; Hunga apron grounded, modest gain; Kama still opens on the pillow egg beside a tiny vent stack; a taller 18x16x6 cluster with re-aimed opening looked better in golden 2026-10-28-131853 but broke the mission line-of-sight and pillow-framing pins, so re-pin those tests and retry):** Hunga opens on an isolated brown wedge and Kama on a brown egg lump; neither reads as the named feature. Target: ground the Hunga rim into the slope (blend base, no hard skirt) and give Kama's Hiolo vent site a lit vent/chimney silhouette; reuse existing props.
   3a. **V-opening-dark [Sonnet] PARTLY DONE 2026-10-29 (a62245c9: Titanic and Bismarck now pass the readable cutoff via site atmosphere data; Blue Hole camera hug and Blake lone mound still open, framing/prop work):** mission openings at Titanic and Bismarck are near-black (bow/hull barely lit, ~3.2-3.3) and fail "readable in 10 s"; Blue Hole's opening camera hugs the sub with stripy sand bands behind (~3.3); Blake's mound is a lone pale pebble. Target: at each mission spawn the sub sits in its own light pool with the first objective's silhouette lit and visible (shared light/spawn framing through site data, no site branch). Use T-opening-readable numbers once item 102 lands.
   3b. **S-hud-opening-dedupe [Codex] DONE 2026-10-29 (merged; smoke gates only, hosted CI is the full check):** one surface owns the target (objective card or mission panel line, not both) and the waypoint chip must not sit on the sub.
   3c. **B-sub-decal-mirror [Codex, queued 101] DONE 2026-10-29 (84356aec; mirror not reproduced, regression test added; visual check open):** "DSV-1" hull lettering looks distorted/mirrored in the Blue Hole opening (Sol: not yet proven; inspect first). Also inspect whether the Blake coral stand at the bottom of its opening floats.
   3e. **T-golden-settle [Codex, small] DONE 2026-10-29 (aa93f660):** mission captures lack the terrain-texture wait free-dive captures use (tools/golden-shots.mjs ~228-246 vs ~386-394); add it so openings show settled terrain (Sol). Also check Endurance hard-edged seabed patches in `endurance-1-mission.png`.
   3d. **T-opening-readable [Codex] DONE 2026-10-29 (aa93f660); reference run flags Bismarck 0.099 and Titanic 0.120 (cutoff 0.125), `node tools/golden-readable.mjs <dir>`:** luminance/contrast table for `*-1-mission.png` so V-opening-dark is judged by number.
   3f. **V-bluehole-opening [Sonnet]:** DONE 2026-10-29 (partial: framing fixed, terrace banding left to a terrain item). mission opening (great-blue-hole-1-mission.png) has the camera hugging the sub, stripy bands behind, and the 'DSV-1' hull lettering still looks flipped (item 101 added a unit test but the golden shot shows a reversed D: inspect the decal UV/mirroring on the roof). Target: camera pulled back so the arch target and sub both read, lettering correct. Shared opening-camera data, no site branch.
   3g. **V-bismarck-patches [Sonnet, small] DONE 2026-10-29 (merged; shared terrain patch blend widened, snow cap real; Bismarck 0.144):** Bismarck opening is readable now but the seabed has hard-edged pale patches and over-bright marine snow (same family as the Endurance patches). Target: soft-edged tint variation, snow density/brightness capped to the sub's light.
   3h. **V-kama-opening [Sonnet] IN FLIGHT 2026-10-29:** the Hiolo vent target is a brown egg on a bare slope; the opening shows no vent. Keep iron-stained mounds (data/landmarks/kamaehuakanaloa/props.json) but add lit vent shimmer/smoke at the target and bring it into the frame.
   3i. **V-blake-mound [Sonnet, small]:** lone pale mound on flat sand; add a few neighbouring mounds/coral cover from existing props so it reads as a coral field.
   3j. **T-opening-geometry [Codex, queued 120]; S-verify CI [Codex, queued 121]; S-dead second sweep [Codex, queued 122]:** all wait for the Nov 4 Codex reset.
3. **V-titanic-aft [Sonnet]:** Titanic bow reads (~3.9, Sol ~3.5) but the aft hull and upper-left frame go dark and flat. Target: a second soft light pool or hull-side emissive tint through site data so the hull has a lit and a shaded half; no per-site branch.
4. **V-lostcity-ground [Sonnet, small]:** towers read (~3.8) but the upper two thirds is empty dark water; add distance shading or a faint ridge crest behind (shared terrain tint, no site branch).
5. **V-monterey-flatten [Sonnet, small] DONE 2026-10-29 (b4855e94; modest gain, lamp-pool pale patch remains):** Monterey is the closest hero (~3.9); the lower-right sand is a flat pale slab. Target: sand tint and ripple falloff so it matches the wall; then re-shoot.
6. **V-bluehole-floor-2 [Sonnet, small]:** floor and wall strata still read as stacked terraces and the foreground bottom corners are jagged (Claude 3.7, Sol 3.0-3.5). Understand the spawn-vs-detail-amplitude dependency first (plan/OVERNIGHT-LOG run 200); target a smooth bowl, not more fluting.
7. **V-endurance-accent [Sonnet, small, demote if tried again]:** TRIED 2026-10-27, no change merged (see plan/progress/V-endurance-accent.md); next route is a per-site emissive tint in `src/world/props/wrecks/materials.ts` via site data.
8. **R-ci-green [Codex] DONE 2026-10-29 (aa93f660), pending hosted-CI confirmation:** hosted CI red since 2026-10-28; remaining real failure is the journey spec `.d-scan-edge` layout check (journal-debrief.spec.ts:1771, 4 of 6 combos, phone sizes).
9. **V-hunga-kama-subject pins DONE 2026-10-29 (merge of codex/v-hunga-kama-subject-pins) [Codex, test side of item 2; queued 98]:** re-apply the taller Kama vent cluster and re-pin the line-of-sight and pillow-framing tests by capability; Claude then judges the golden shot.
10. **S-verify / S-bughunt / S-dead [Codex, standing]:** 4730-4780 merged 2026-10-28; keep rationing.
11. **P2-phone-accept [owner + Codex; browser-checkable items automated 2026-10-29 in tests/e2e/phone-accept.spec.ts]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build.
12. **R-release [Haiku]:** tag the latest green-CI main after each review (f68 is the newest); check the Pages deploy.

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
