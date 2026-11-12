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

Stage (joint review 2026-11-10, Claude + Sol; scores unchanged, no art merged since 2026-11-09): about 85% to 1.0, 4-5 weeks central (planning range 4-6). Opening appeal (Claude): Titanic 4.2, Lost City 4.1, Beebe 4.0, Monterey 3.8 (owner-accepted, parked), Blue Hole 3.7, Bismarck 3.3. Whole-site beauty (Sol, release measure): Titanic 3.5, Lost City 3.5, Beebe 3-3.5, Blue Hole 3, Monterey 3 (waived at 3.8), Bismarck 3.3, Challenger 3-3.5. Phone scores unverified.

## Needs owner

The newest items go first.

- (Endurance 85 m opening is no longer a blocker: coherence only, per the 2026-10-25 joint review.)
- A short phone retest once the P2 items below land (boost gone, scan range, anchored events, Your sub screen).

## In flight

- Claude: none. Item 6 DONE 2026-11-10 (b8d79916). Item 11 U-phone-landscape-hud DONE 2026-11-10 (68b5931f); needs phone retest for safe-area insets. Priority order for the next Claude packages (Sol: first-session usability before art): 11 (phone landscape HUD), 22 (Hunga slab), 6 (Beebe stacks), 7 (Lost City tubes), then 16e. V-bismarck-hull-plates DONE 2026-11-08 (e072e778). U-copy-fixes items 6-8 DONE 2026-11-07 (39830258); walkthrough-4 items 4-5 (scan-interrupt cue, side-find clarity) remain in item 9.

## Backlog

One list, ordered by player impact and dependencies; lane in brackets. Evidence: review 2026-11-07 in `plan/REVIEWS.md` and golden `2026-11-07-055753`. Art gains per package are ~0.1-0.2, so each V-* names a target composition, not a geometry list. Earlier items (all DONE ones, with commits) are in `plan/archive/DIRECTOR-HISTORY-*.md`. Owner phone decisions: [PHONE-FEEDBACK-2026-10-18.md](PHONE-FEEDBACK-2026-10-18.md).

### Claude lanes (Sonnet unless noted)

Evidence: golden `2026-11-07-180922`, review 2026-11-07 (evening) in `plan/REVIEWS.md`. Partial art items (all marked "partial" earlier) are re-listed here with their remaining gap so nothing is lost when DONE items go to the archive.

3. **V-monterey-wall-face: PARKED 2026-11-08 (owner): accepted at 3.8, moved to [Later](#later).**
4. **V-bismarck-hull-plates [DONE 2026-11-08 (e072e778): dark streaked deck, scour shade, deck sag; ~3.5-3.8. Left: listing, far horizon dome]:** hull reads as a pale green-grey flat slab on a dome (opening 3-3.5; no demonstrated regression, plating was already pale). Target: darker streaked plating with broken seams (shared shader with 4), scour visible as a darker rim, far horizon not a perfect dome. Do not flatten the seamount flank (`data/landmarks/bismarck/guide.json`).
5. **V-bluehole-gallery-2 [DONE 2026-11-08 (35d20fa6): gallery 92 m, ~26% of opening frame, opening ~3.7-4.0; sub still touches gallery edge, stalactites small]:** gallery is ~18% of frame width in the opening (3.5). Next lever: a larger gallery prop or an apron-clearing approach (moves the free-dive hero pose too); apron still lacks fine silt grain and ripples. Re-check scan reach (the closer opening changed it).
6. **V-beebe-chimney-stacks [DONE 2026-11-10 (b8d79916): separated slimmer stacks via per-site profile; ~6.5, bores faint, tops ragged]:** still a broad folded cone (`beebe-vent-field-3.png`); a vent bore alone will not fix the silhouette. Target: separated slim stacks with a vent orifice, via shelf/stack placement in site data plus the shared builder.
7. **V-lostcity-tower-forms [DONE 2026-11-10 (deefc7b4): irregular profiles, buttresses, round tubes; ~7, crown still one fluted sheet]:** readable cluster, but smooth forms and faceted hollow tubes in `lost-city-3.png`. Target: irregular tower profiles and rounded tubes.
8. **DONE 2026-11-10 (b142fd30) U-copy-fixes [Haiku]:** U-depth-card-level-approach (extends 12), U-scan-interrupt-cue, U-side-find-clarity, U-ctrl-tip-timing, U-objective-two-cues, U-scan-prompt-copy (from walkthrough-4, `plan/progress/U-retest-walkthrough-4.md`). Depth, Ctrl+W and one-cue fixes were already on the branch; this pass ends the depth step on scan start or drop, says the objective is still open on side-find results, and drops "TO SCAN". "Target changed" cue skipped. Evidence: `plan/progress/U-copy-fixes.md`.
9. **DONE 2026-11-11 V-golden-refresh:** `.cache/golden/2026-11-11-044544` (75 mission shots, desktop; Endurance and Monterey-2 missing after capture timeouts). Used by the 2026-11-11 review.
10. **DONE 2026-11-10 (141970ea) V-axial-sky-band [optional]:** Axial upper third is empty dark water; enable `horizonRidge` in its preset data (generic option already exists).

11. **DONE 2026-11-10 (68b5931f) U-phone-landscape-hud [Sonnet, owner phone 2026-11-08]:** in phone landscape the objective banner, Pause and Journal sit left of centre (grid `'sonar bar hud' / 'sonar guide hud'`, with a 250 px depth box on the right). Target: the banner centred on screen, with the readouts and buttons pushed to the edges. Fix it in the HUD grid (rule 3), not with per-element offsets. The camera's 14% left shift was removed on 2026-11-08 at the owner's request, so the sub now sits in the centre; check that it stays clear of the SCAN cluster.
    11b. **P2-phone-blur [owner + Claude, owner phone 2026-11-08]:** "horribly compressed video at every setting". Fixed on 2026-11-08: dynamic resolution (Auto tier only) could drop and never come back on a 60 fps-capped phone, with a floor of 0.5x (1/6 resolution on a 3x screen). The floor is now 1x and the rule for climbing back up is reachable at 60 fps. Fixed tiers already render at 2x, so if the owner still sees blur on Low/Medium/High after this ships, the cause is elsewhere. Next suspects: the fog and grade look, terrain texture resolution, iOS Low Power Mode. Owner to retest.

### Codex lane (self-contained, not visual)

- **U-scan-fish-vs-objective [Codex, DONE 2026-11-09 (merged; smoke gates green)]:** objective-priority simplification and side-find guidance fix implemented; 204 focused unit tests pass. Browser acceptance blocked by sandbox localhost binding; gate details in `plan/progress/U-scan-fish-vs-objective.md`.
- **S-verify-side-find-guidance [Codex, DONE 2026-11-09 (verification only)]:** no scanner defect confirmed; resolver timing, mid-hold retargeting, scanned objectives, and fixed/wildlife locks covered. All 4,669 unit tests pass; browser/Python gate limits documented in `plan/progress/S-verify-side-find-guidance.md`.

12. **DONE 2026-11-08 (458e001d) U-depth-step-skip [Codex, brief 149, rewritten 2026-11-07]:** the 15 m skip already exists (Tutorial.ts); reproduce why walkthrough-3 still saw the step for 3-7 min (targetGapM undefined?) and fix only that gap, or report not reproducible.
13. **DONE 2026-11-08 (3b39f8c5) U-journal-open-current [Codex, brief 150, rewritten 2026-11-07]:** current-site opening already exists (Journal.ts); find the cold-load case that still shows 'Loading the Journal...' / All dive sites breadcrumb, fix that only.
14. **S-verify-endurance-relief / T-verify-endurance-hull-pose / S-bughunt-scan-journal [Codex, briefs 146-148]:** verification and bug hunt over merged work; briefs 124/131 (R-ci-speed) stay held.
    **DONE 2026-11-09 (ff015277) S-verify-bluehole-gallery [Codex, brief 152]:** opening scan at 10 m depth and hero clearance pinned for all tiers/modes; tests only.
    **DONE 2026-11-08 (88525a69) S-verify-fish-lock-plates [Codex, brief 151]:** scan lock and plate normal tangent fixed; unit-tested, no browser acceptance.
15. **DONE 2026-11-09 (db6de37b) R-ci-speed timings refresh; hosted acceptance open [Codex, measured 2026-11-09]:** latest green hosted runs take 42-43 min; owner target under 30 min without dropping coverage. Refreshed hosted weights for the existing 38 one-worker shards project about 3 min saved; the measured 636 runner-minutes at 20 slots prevent an under-30 claim from balancing alone. Hosted acceptance remains open; evidence: [progress/R-ci-speed.md](progress/R-ci-speed.md). Prior 124/131 attempts were read, not merged.

16b. **R-ci-triage [Codex, brief 180-R-ci-phone-accept-hosted, item 18] DONE 2026-11-11 (merged; hosted green + under-30 still open, see progress note):** hosted CI red 25+ runs; every failure is `phone-accept` first-minute (1-2 tests per shard hit the 240 s timeout with a closed renderer session; passing ones take ~38 s). Find root cause, fix by capability (e.g. one viewport per site on CI), then propose an under-30-min change.
**Brief 189, 2026-11-10:** shard 1's first-minute journey replaced its four-minute hosted timeout with 15 minutes; restore the configured deadline and bound teardown evidence. Local validation and hosted/workflow evidence: [progress/R-ci-shard1-hang.md](progress/R-ci-shard1-hang.md). Hosted acceptance and the under-30-minute goal remain open.
16c. **T-verify-first-sixty [Codex, brief 161, item 19] DONE 2026-11-09 (merged; smoke gates green, browser spec unrun locally, hosted CI is the check):** first-60-s and debrief capability tests over all 13 sites on phone portrait/landscape/desktop; fix generic defects.
16d. **S-dead-code-audit [Codex, brief 162, item 20] DONE 2026-11-09 (51e8536f):** delete code made redundant by the ROV/boost/upgrade/HUD-offset cuts; net negative lines.
16e. **DONE 2026-11-10 (61c11027) V-challenger-lander-flag [Claude, optional, non-hero; rippled matt cloth strip, ~7, still a plain rectangle]:** the lander flag is a flat luminous triangle and the floats are faceted (`challenger-deep-3.png`); give the flag a cloth shape and round the floats.
16f. **V-golden-capture-complete [Codex] DONE 2026-11-09 (working tree; gate review fixes verified in focused units):** Challenger was planned but Chromium closed during its screenshot. Golden manifests now verify every planned image and incomplete runs end with a named error and exit 1. The two helper regressions from the orchestrator's gate run are fixed without changing its unit assertions; full gate rerun pending. Tests/tools only; evidence in `plan/progress/V-golden-capture-complete.md`.
16g. **S-bughunt-save-migration [Codex, brief 180, DONE 2026-11-09]:** bug hunt on save/settings load paths (old saves, missing fields, corrupt JSON, private-mode storage); fix with unit tests.
16h. **S-bughunt-touch-input [Codex, brief 181, DONE 2026-11-09]:** bug hunt on touch controls/gestures (swipe-up list, joystick, multi-touch, orientation change) via unit tests and code reading; no key names on touch. Three confirmed fixes in the working tree; browser acceptance blocked by sandbox localhost binding. Evidence: [progress/S-bughunt-touch-input.md](progress/S-bughunt-touch-input.md).
16o. **R-ci-e2e-residual [Codex, brief 190]:** after 180, hosted CI still fails 7 shards identically (d-scan same-frame titanic/GBH touch, journal-debrief two-objective 1280, hud-touch desktop regions, opening-framing portrait, phone-accept touch-help tap); all pass locally. Root-cause by capability, no timeout bumps.
16i. **S-verify-ci-first-sixty [Codex, brief 182]:** after hosted CI runs the new first-sixty spec, triage its failures by run logs and fix root causes in the spec or game.
16j. **S-bughunt-debrief [Codex, brief 183] DONE 2026-11-09 (0cf7da07):** duplicate/stale replay guarded by existing mission state; five failing-first regressions, 4,674 units pass. Python/browser gate limits documented in `plan/progress/S-bughunt-debrief.md`.
16k. **S-bughunt-audio-lifecycle [Codex, brief 184] DONE 2026-11-09 (b10bb0b5; audit/tests only):** two audit passes found no new defect; pending-unlock mix edits and overlapping stinger cleanup covered with existing mocks. Evidence and gate limits: [progress/S-bughunt-audio-lifecycle.md](progress/S-bughunt-audio-lifecycle.md).
16l. **S-bughunt-site-data [Codex, brief 185, DONE 2026-11-09 (merged 2026-11-09; 4,722 units pass, browser acceptance blocked by sandbox)]:** audited all 13 sites and 49 objectives; MARS marker explicitly follows seabed. Raw ids/Journal/species and three-tier terrain regression coverage; evidence in `plan/progress/S-bughunt-site-data.md`.
16m. **S-bughunt-mission-clock [Codex, brief 190, DONE 2026-11-10 (working tree; orchestrator smoke + project-base pass; formatting follow-up verified)]:** two failing-first lifecycle fixes: late props preserve a live dive and emergency ascent; Begin clears briefing preview statistics. All 13 sites covered. Evidence: [progress/S-bughunt-mission-clock.md](progress/S-bughunt-mission-clock.md).
16n. **S-bughunt-photo-mode [Codex, brief 191, DONE 2026-11-10 (working tree; 4,812 units pass, orchestrator smoke/project-base pass)]:** two audit rounds; fixed keyboard instructions in the empty touch gallery and uncaught thumbnail-context denial. Five failing-first/capture-blocking unit cases; orchestrator gate follow-up corrected overnight-log formatting. Evidence in `plan/progress/S-bughunt-photo-mode.md`.
16n. **S-bughunt-pause-resume-reload [Codex, brief 193, DONE 2026-11-11 (working tree; 590 final-source focused/integration tests pass; browser acceptance blocked by sandbox)]:** two audit rounds; fixed skipped-briefing startup before content/pose readiness with a failing-first regression and reuse of Begin. Gate limits and integration corrections: [progress/S-bughunt-pause-resume-reload.md](progress/S-bughunt-pause-resume-reload.md).

16o. **S-verify-189-191-merges [Codex, brief 192, DONE 2026-11-11 (working tree; 4,862 units pass, browser/tooling gate limits)]:** two audit rounds found one remaining unbounded phone teardown branch; merged both screenshot hooks into one bounded hook after a failing unit regression. No further mission clock or photo/gallery defect confirmed. Evidence: `plan/progress/S-verify-189-191-merges.md`.

16m. **S-verify-save-touch-merges [Codex, DONE 2026-11-09 (working tree; 4,794 units pass; browser/tooling gate limits documented)]:** historical stars now survive retired or invalid current missions; 24 failing-first cases, save-format review and touch boundary/rebinding coverage. Evidence: [progress/S-verify-save-touch-merges.md](progress/S-verify-save-touch-merges.md).
16m. **S-bughunt-settings-quality [Codex, DONE 2026-11-09 (working tree; browser acceptance blocked by sandbox)]:** two audit passes; removed duplicate waypoint reduced-motion application at boot after four failing-first regressions. Tier pending/revert and persistence coverage extended. Evidence: `plan/progress/S-bughunt-settings-quality.md`.
16m. **S-bughunt-journal-ui [Codex, DONE 2026-11-09 (working tree; 4,762 units pass, browser acceptance blocked by sandbox)]:** two audit rounds; fixed the misleading empty hint after a first wildlife, secret or sample scan with six failing-first unit cases. Tags, filters, current-entry opening, narrow text and keyboard focus audited; evidence in `plan/progress/S-bughunt-journal-ui.md`.

20. **T-hunga-opening-heading [Codex, brief 195, joint review 2026-11-10]:** Hunga mission opening heading changed 98° to 345° between golden sets, so the rim slab shows its narrow end. Find cause, restore the broad-face framing with a capability test; check rapid Begin before props load.
21. **T-verify-desktop-720 [Codex, brief 196, Sol 2026-11-10]:** unaided 1280x720 first five minutes, extending existing specs; fix generic defects in the HUD grid.
22. **V-hunga-rim-slab [Claude, Sonnet, now first] DONE 2026-11-11 (09448867; approach views much better, 120 m opening still a narrow tower ~3.8):** the Hunga opening objective reads as a flat slab or thin tower from every heading (`hunga-tonga-caldera-1-mission.png`, 2026-11-11: still a smooth striped wall); target a rim with irregular broken top and talus, not a wall. Eight-site coherence item; Hunga is the worst opening in the 2026-11-11 set (~3.0).
23. **V-challenger-lander-presence [DONE 2026-11-12 (b087ceb1): lander ~1.7x, bait glow + swarm, ~7; glow pool has a hard lower edge]:** the "Leggo" lander is a tiny dark cluster on an empty ripple plain (`challenger-deep-1-mission.png`); the sub dwarfs it and nothing else draws the eye. Target: lander ~2x larger in frame, lit by a visible bait-station glow with amphipod swarm, so the objective reads in 3 s. Prop and lighting in site data and the shared builder, no site branch.
24. **DONE 2026-11-12 V-deep-upper-frame [Claude, Sonnet, review 2026-11-11]:** the upper 40% of deep-site frames (Titanic, Axial, Challenger, Beebe) is a flat dark band. Target: one generic water-column treatment (faint down-welling gradient plus sparse marine snow near the horizon) driven by preset data, not per-site; keep it readable, never darker.
25. **DONE 2026-11-12 (094457a9) V-axial-floor-readability [Claude, Sonnet]:** Axial smokers are strong but the surrounding basalt is nearly black (`axial-seamount-ashes-1-mission.png`). Target: lit lava-flow texture within the sub light radius and glow bleed from the chimneys onto the floor.
26. **V-beebe-bores-lostcity-crown [Claude, Sonnet, review 2026-11-11]:** two leftovers from items 6 and 7: Beebe bores are faint and chimney tops ragged; the Lost City crown is still one fluted sheet. Pair them as one pass over the shared tower/chimney builder; keep the gains from 6 and 7.

27. **R-ci-trace-diagnostics [Codex, brief 197, Sol 2026-11-12]:** traces only record on retry but hosted CI has zero retries, so failures leave no evidence. Retain failure traces as artifacts for failing shards only, then root-cause the remaining red shards (extends 16o).
28. **T-verify-first-session-current [Codex, brief 198, Sol 2026-11-12]:** re-verify Home to debrief unaided at phone portrait/landscape and desktop 1280x720 on current main (last complete flow evidence 2026-11-07); fix generic stalls.
29. **U-backlog-id-cleanup [Haiku]:** IDs 16m/16n/16o repeat in the Codex lane; renumber to unique stable IDs and update brief names that cite them.

### Release and owner

16. **P2-phone-accept [owner + Codex]:** checklist in `plan/progress/4410-P2-phone-accept-checklist.md`; owner runs it on the current build.
17. **R-release [Haiku]:** tag the newest green-CI main after each review (f76 newest, 2026-11-08); next tag once hosted CI on main is green.

### Later

Parked ideas worth keeping that aren't on the path to 1.0. Promote one into the backlog above when there's room; until then nothing here starts.

- **Monterey authored wall-face prop** (from V-monterey-wall-face, owner 2026-11-08): a pale authored face at the marker. Two generic passes failed (3.3 vs the 3.8 baseline).
- **Refresh-aware dynamic resolution:** detect a 30 Hz (Low Power Mode) or 60 Hz frame cap and stop lowering resolution when that won't help.

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
