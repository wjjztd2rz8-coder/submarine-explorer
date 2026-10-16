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
| Acceptable Low-tier performance on a real phone                                                                                                                                                                                           | Owner check; S-boot helps                                                 |
| Hosted CI green, and a full run no longer blocks releases                                                                                                                                                                                 | R-release, R-ci-green                                                     |
| No known blockers; the code is simple enough to keep changing safely                                                                                                                                                                      | S-resolve, S-modal, S-boot, S-rewards, S-manifest                         |

Stage (review 2026-10-16 third): about 82% to 1.0 (80-84, agreed with Sol). Beautiful: Titanic 3.9, Blue Hole 3.5 (Sol 3.0-3.9; Claude accepts 3.5), Monterey 3.8, Beebe 3.8, Challenger 3.8, Lost City 3.7, Endurance 3.6. Top blockers: real-phone Low readability and performance (owner), no hero at 4.0 yet (Titanic seabed, Beebe close pose), J-* P2 journey fixes.

## Needs owner

The newest items go first.

- A five-minute play on a real phone on the newest build (Low-tier performance and readability, first five minutes). Still open since 2026-10-11; it is the largest unverified 1.0 requirement.

## In flight

- No Claude package running.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. Evidence: review 2026-10-16 (third) in `plan/REVIEWS.md`. DONE items were removed at that review (history in git and `plan/progress/`). Per-package art gains are now ~0.1-0.2: each V-* brief below names a target composition (what the frame should look like), not a geometry list.

1. **V-titanic-seabed [Sonnet]** (slice 1 merged: ripples, stones/rubble; faint at approach), ~3.9: approach view is still a flat dark brown plane. Target: from the opening pose the hull sits in a visible scour moat with a debris trail leading away and ripples readable at 60 m; hull plating repetition broken with panel variation. Use the existing sediment material.
2. **V-beebe-close [Sonnet]** (slice 1 DONE 2026-10-16 (352e663): darker flank and warm seabed via site data; ~4.0; mouth glow needs an orifice emissive in geometry), was ~3.8: close pose washes mid-brown under headlights and vent glow is faint. Target: the chimney close frame has a dark flank, bright orange crust highlights and a visible warm vent glow; fix in `hullLight`/spot falloff and emissive, not paint.
3. **V-lostcity-slope [Sonnet]**, ~3.7: the middle-ground slope is smooth terrain. Target: the approach frame shows broken carbonate ledges and rubble terraces between the towers, using existing sediment/rock materials.
4. **V-bluehole-hood [Sonnet]**, ~3.5 (Sol: smooth hood, pale interior, repeated terraces; accepted after checking `great-blue-hole-east-3.png`): the hood is still a smooth slab with a pale interior and evenly repeated terraces. Target: the east frame shows an irregular, darker, cracked hood with uneven terrace spacing and shadowed undercuts; the underside is unchanged and should get the same treatment.
5. **V-monterey-pose [Sonnet, small]**, ~3.8: the opening pose puts the sub awkwardly against the wall; reframe so wall, floor and sub read in one shot.
6. **J-contact-choice [Sonnet, P2], J-journal-preview [Sonnet, P2], J-picker-density [Sonnet, P3], J-desktop-repetition [Sonnet, P3]:** from [progress/J-journeys-repeat.md](progress/J-journeys-repeat.md). One package each, in that order. J-contact-choice: scan-card identity when a curiosity competes with the mission objective. J-journal-preview: tall portrait captures pushing text below the fold, repeated memorial text. J-picker-density: shorten the site-card list; Blue Hole under its Lighthouse Reef title. J-desktop-repetition: destination/turn information repeated in card, mission block and waypoint.
7. **S-manifest slices [Codex]:** remaining inventory is 2 site-id expressions, both in WreckPreset (after 2370). One slice per brief; golden unchanged. Then close the item.
8. **S-verify / S-bughunt [Codex, standing]:** after each batch of visual merges, verify numerics/simplicity rules and hunt bugs in newly merged code.
9. **R-release [Haiku]:** f55 tagged. Tag f56 on the latest green-CI main commit after this review's merges are CI-green.

Demoted: further Titanic sky tuning, Challenger boulders, per-site decoration, title polish, Endurance framing (CUT 2026-10-16; work kept as tag `parked/V-endurance-aim`).

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
