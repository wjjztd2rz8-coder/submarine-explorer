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

Stage (review 2026-10-16 second, Claude alone): about 82% to 1.0. Beautiful: Titanic 3.9, Monterey 3.8, Lost City 3.6, Blue Hole 3.6, Beebe 3.6, Challenger 3.6, Endurance 3.6. Top blockers: real-phone Low readability and performance (owner), Blue Hole roof, Titanic seabed, J-* P2 journey fixes.

## Needs owner

The newest items go first.

- A five-minute play on a real phone on the newest build (Low-tier performance and readability, first five minutes). Still open since 2026-10-11; it is the largest unverified 1.0 requirement.

## In flight

- No Claude package running. Codex nothing running (5h at 3%, resets 10:15); queue 2300 S-verify-15, 2310 J-home-controls, 2320 S-bughunt-16, 2330 S-manifest next slice.
- V-endurance-aim parked 2026-10-15: branch claude/V-endurance-aim (worktree ../subexp-wt/V-endurance-aim, commit 5fa58fc) reached hull 45% but the sub is too large and dominant in frame; not merged. See V-endurance-frame below.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. Evidence: review 2026-10-16 (second) in `plan/REVIEWS.md`; DONE items from earlier lists were removed at this review (history in git and `plan/progress/`).

1. **V-bluehole-roof-2 [Sonnet]**, ~3.6: from the east pose the roof is still one rolled slab with a uniform thick rim and a flat blue-green pool; stalactites are the only relief. Vary roof thickness along the rim, add two or three overhang notches and drop-offs, tilt the beds so they do not run parallel, and break the flat sand shelf with the existing sediment material. Geometry, not tuning. Evidence: [progress/V-bluehole-roof.md](progress/V-bluehole-roof.md), golden `great-blue-hole-east-2.png`.
2. **V-titanic-seabed [Sonnet]** (slice 1 merged 2026-10-16: ripples and stones/rubble scatter via Titanic biome data, faint at approach distance; remaining: scour moat at the hull, hull plating repetition), ~3.9: hull now reads as a wreck; the approach view is a flat dark brown plane with a few sparse plants. Add sediment ripples, a debris trail and scour around the hull using the existing sediment material (as V-monterey-floor did). Hull plating repetition is the second gap.
3. **V-beebe-lighting [Sonnet]**, ~3.6 (up from 3.3): the chimney is now orange-brown with collars and reads; side stacks still have flat stump tops and the close pose washes beige under headlights. Fix on the lighting side (`hullLight`/spot falloff), not paint; give side stacks the same tapered tops.
4. **V-challenger-floats [Sonnet, small]**, ~3.6: floats are faceted and the frame pale under headlights; swap to a smooth dull syntactic-foam material and darken the frame. Non-hero, so cap at one package.
5. **V-lostcity-rims [Sonnet]**, ~3.6: thin hollow tower rims and broad planar surfaces; the middle ground slope is smeared. Thicken rims, add crust ledges.
6. **V-endurance-frame [Sonnet]**: the opening pose is fine (sub and wreck both visible, 3.6) but the parked aim branch broke the framing. Decide with the owner whether to drop; otherwise move the camera forward of the sub only for the mission spawn, as data in the site's opening pose, with no shared camera code.
7. **J-contact-choice [Sonnet, P2], J-journal-preview [Sonnet, P2], J-picker-density [Sonnet, P3], J-desktop-repetition [Sonnet, P3]:** from [progress/J-journeys-repeat.md](progress/J-journeys-repeat.md). One package each, in that order. J-contact-choice: scan-card identity when a curiosity competes with the mission objective. J-journal-preview: tall portrait captures pushing text below the fold, repeated memorial text. J-picker-density: shorten the site-card list; Blue Hole under its Lighthouse Reef title. J-desktop-repetition: destination/turn information repeated in card, mission block and waypoint.
8. **J-home-controls [Codex 2310, P2]:** Home's Controls entry opens rebinding settings on touch; route it to the existing device guide.
9. **S-manifest slices [Codex 2330]:** migrate the next slice per `plan/progress/S-manifest.md` (site-id expressions left: recount); one slice per brief; golden unchanged.
10. **S-verify / S-bughunt [Codex, standing]:** 2300 S-verify-15 and 2320 S-bughunt-16 queued. After each batch of visual merges, verify numerics/simplicity rules and hunt bugs in newly merged code.
11. **S-render hosted confirmation [Haiku, small]:** the nightly workflow (S-render, merged 2026-10-16) is still running; on its next completed run, confirm green or log the failing step. No new work unless it fails.
12. **R-release [Haiku]:** f55 tagged 2026-10-16. Next tag after the next completed green CI on a main commit with visual merges.

Demoted: further Titanic sky tuning, Challenger boulders, per-site decoration, title polish.

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
