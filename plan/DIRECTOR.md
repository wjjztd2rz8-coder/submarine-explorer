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

Stage (review 2026-11-02, Claude alone; Sol skipped, Codex week 4%): about 89% (range 86-90%); 3.5-4 weeks. Beebe 4.0, Lost City 4.0, Monterey 4.0, Titanic 3.9, Blue Hole 3.85, Hunga 3.45, Kama 3.3. Earlier (review 2026-11-01 evening, Claude alone; Sol skipped, Codex week 4%): about 88% (range 85-89%); 4 weeks. Blue Hole 3.85, Beebe 3.85, Lost City 4.0 (tower top blown), Monterey 4.0, Titanic 3.9, Hunga 3.4, Kama 3.2. Earlier (review 2026-11-01 morning, Claude alone; Sol skipped, Codex week 5%): about 88% (range 85-89%); 4 weeks. Lost City 4.05 (tower flank now lit), Monterey 4.0, Titanic 3.9, Blue Hole 3.8 (hood still a slab), Beebe 3.8, Hunga 3.2, Kama 3.1. Previous stage (review 2026-10-30, Claude alone; Sol skipped, Codex week 6%): about 86% (range 83-88%) to 1.0; 4-5 weeks. Beautiful: Titanic 3.9, Lost City 3.9, Blue Hole 3.8, Beebe 3.7, Monterey 3.9, Challenger 3.6, Endurance 3.6. Blockers: (1) no hero firmly at 4; (2) Blue Hole and Beebe openings (gallery read, Beebe darkness); (3) real-phone Low-tier acceptance.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- No package running. Briefs 120-124 queued, waiting for the Nov 4 Codex reset. Claude lane: items 1-10 in order (U-* first: the 2026-11-02 review found art gains per pass ~0.05-0.1 and four small player-facing confusions still open).

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: review 2026-11-01 (evening) in `plan/REVIEWS.md` (Claude alone, Sol skipped for Codex budget) and golden `2026-10-30-212725`; earlier items (all DONE ones, with commits) in [archive/DIRECTOR-HISTORY-2026-10-30-backlog.md](archive/DIRECTOR-HISTORY-2026-10-30-backlog.md). Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md).

1. **U-pick-site-clean [Sonnet] — DONE 2026-11-02 (7d3c54bc):** pick-site rows show empty stars and "0/N logged" before play, globe pins unlabeled; hide until earned, label pins. (Walk-through finding, `plan/progress/U-play-walkthrough.md`.)
2. **U-debrief-surface-copy [Haiku] — DONE 2026-11-02 (merged; title now "Dive summary" for partial dives):** debrief says "Back at the surface" while the sub is still submerged (MissionRouter.ts:279); reword by state. Moved from the Codex lane (Codex week 4% until Nov 4).
3. **U-briefing-jargon [Sonnet] — DONE 2026-11-02 (2f94e768; plain "Rated to N m", tags 11 px; Advanced was already a closed disclosure, no screenshots taken):** briefing says "Class A/B hull" with tiny tags; plain words, no jargon.
4. **U-journal-first-visit [Sonnet] — DONE 2026-11-02 (af8a56e1; only earned entries + one hint; desktop tree still shows 0/N counts):** first Journal visit shows 55 empty entries; show only what is earned plus one hint. Then **U-sonar-labels [Haiku]:** sonar range labels overlap at the 1000 m setting (see any golden frame: "120 m / 80 m" on Blue Hole).
4b. **R-debrief-frozen-red [Haiku]:** three `journal-debrief` 'frozen debrief 1280x720' tests fail on main at the `.objectives-panel` visibility check (likely from U-dive-start-hud, panel now appears after the first objective). Fix the tests to wait for/trigger the first objective, or the setup; check hosted CI shards 4 and 5 of run 41412499549 for other red specs.
5. **V-lostcity-tower-top [Sonnet] (golden 2026-11-02: Poseidon tower top is still a flat white blob, carbonate detail lost):** glow was cut 60000 to 10000 but the top face is still white. Route: tower top material (albedo/emissive clamp or a darker top texture band) in the carbonate preset, not more light edits. Target: tower top shows streaked carbonate texture, peak value below 235.
6. **V-kama-plume-scale [Sonnet]:** the plume is a huge pale-tan column filling the top of the frame while the vent site is tiny, so the picture is "a smoke stack". Target: plume a third of the current width, translucent, vent glow pool larger than the plume base; slope still lit. Route: Kama vent preset plume scale/opacity (data).
7. **V-bluehole-hood-code [Sonnet] (PARTIAL 2026-11-01, 05a332d1; golden 2026-11-02 still shows a small brown leaf with open water above):** every pose under 110 m fails the hull-safe route check, so either relax that check for the east-gallery pose or enlarge/reposition the hood mesh. Target: hood fills the top ~30% of the opening frame as a dark overhang with stalactites, sub to one side.
8. **V-hunga-silhouette [Sonnet] (PARTIAL 2026-11-01, 6e9e0f5d; golden 2026-11-02 unchanged: bedded but still a pointed wedge):** needs code, not data: widen the wall into a flat-topped escarpment (terrain profile under the wall, stepped crest). Target: near-vertical wall with a level crest line across the frame.
9. **V-beebe-seabed-edge [Sonnet] (Beebe now ~4.0 at the hero pose: smoker, plume, teal horizon all read):** remaining: dark band where seabed meets the horizon. Needs the validator to accept `fogHaze` on non-wreck horizons (code), then a haze value. Small.
10. **R-site-specs [Haiku]:** CI went red on run 301 because V-beebe-horizon (data) broke `f-bughunt-880` ("Beebe has no horizon") and only smoke ran. Add to the merge routine in this file's header: a V-* package that edits a site's data runs `npx playwright test -g <site>` and the specs that mention the site before merging. Write the rule, and a one-line `tools/site-specs.sh <site>` that greps tests/e2e for the site id and runs those files.
11. **R-ci-speed [Codex, queued 124]:** hosted CI takes 30+ min, so failures surface 1-2 runs late. Audit shard balance and slow specs; target under 20 min without dropping coverage.
12. **Codex, queued 120-123, waiting for the Nov 4 reset:** T-opening-geometry (120), S-verify CI (121), S-dead second sweep (122), S-verify spawn cap (123).
13. **P2-phone-accept [owner + Codex; browser-checkable items automated in tests/e2e/phone-accept.spec.ts]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build.
14. **R-release [Haiku]:** tag the latest green-CI main after each review (f71 is the newest, 2026-11-01); f72 once the run after the 2026-11-02 spec fixes is green.

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
