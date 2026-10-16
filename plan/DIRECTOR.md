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

| Requirement                                                                                                                                                                                                                      | Backlog items                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views. Note: code's `HERO_SITES` (Cosmetics.ts) is Titanic, Lost City, Blue Hole, Beebe and Monterey; Endurance is a polish site. Reconcile (V-hero-set) | V-bluehole, V-beebe, V-titanic, V-lostcity, V-monterey-floor, V-endurance |
| The other eight sites are coherent with no major visual defect                                                                                                                                                                   | V-eight-sites                                                             |
| A new player understands the first five minutes on desktop and phone                                                                                                                                                             | V-journeys, S-guidance (done), S-hud                                      |
| Acceptable Low-tier performance on a real phone                                                                                                                                                                                  | Owner check; S-boot helps                                                 |
| Hosted CI green, and a full run no longer blocks releases                                                                                                                                                                        | R-release, R-ci-green                                                     |
| No known blockers; the code is simple enough to keep changing safely                                                                                                                                                             | S-resolve, S-modal, S-boot, S-rewards, S-manifest                         |

Stage (joint review with Sol, 2026-10-16): see plan/REVIEWS.md; about 81% to 1.0. Beautiful: Titanic 3.9, Lost City 3.6, Endurance 3.6, Blue Hole 3.5, Monterey 3.5, Beebe 3.3, Challenger 3.2. Top blockers: real-phone Low readability and performance (owner), Beebe/Challenger materials, Blue Hole roof, J-* P2 journey fixes, a completed green hosted CI on the release commit (f55).

## Needs owner

The newest items go first.

- A five-minute play on a real phone on the newest build (Low-tier performance and readability, first five minutes). Still open since 2026-10-11; it is the largest unverified 1.0 requirement.

## In flight

- V-challenger-lander IN FLIGHT (Sonnet, 2026-10-16), worktree ../subexp-wt/V-challenger-lander.

- Codex 2200/2220/2210 running (S-manifest-3, S-bughunt-10, S-render-confirm). No Claude package running.
- V-endurance-aim parked 2026-10-15: branch claude/V-endurance-aim (worktree ../subexp-wt/V-endurance-aim, commit 5fa58fc) reached hull 45% but the sub is too large and dominant in frame; not merged (new shared camera code for a small gain). Needs the camera forward of the sub, or drop item 4.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. "After X" means don't start until X is merged. Evidence: joint review 2026-10-15 eve in `plan/REVIEWS.md`.

1. **J-journeys-repeat [Codex 2170, then Sonnet judges], DONE 2026-10-16 (merged; sub-items below open):** repeat the unaided Titanic and Blue Hole journeys (Home, pick, first 60 s, reward, next objective, Journal, debrief) on the merged build at desktop, portrait and landscape. Evidence and severity table: [progress/J-journeys-repeat.md](progress/J-journeys-repeat.md); screenshots `.cache/codex/shots/2170/`.
   - **J-guidance-handoff [Codex, fixed; verification in progress]:** a logged contact can withhold the next objective/turn after the reward. Keep the reward, then let the outstanding objective lead; retain the logged-contact confirmation without a mission objective.
   - **J-contact-choice [Sonnet, P2]:** review scan-card identity when a nearby curiosity/optional contact competes with the mission objective (memorial/debris versus stern), and wildlife rewards interrupt the next-gallery directions; distinguish scan counts from mission objectives.
   - **J-picker-density [Sonnet, P3]:** simplify the long site-card list and make Blue Hole easier to identify under its Lighthouse Reef title.
   - **J-desktop-repetition [Sonnet, P3]:** review repeated destination/turn information in the card, mission block and waypoint; consolidate through existing HUD regions.
   - **J-journal-preview [Sonnet, P2]:** review tall portrait captures pushing entry text below the fold, repeated memorial text and captures that show the bow under a debris-field entry. The Journal now has images; the older text-only finding is resolved.
   - **J-atoll-transit [Sonnet, P2]:** explain the jump from two nearby galleries to optional atoll targets more than 4 km away, especially before the debrief's invitation to finish them for two stars.
   - **J-completion-contrast [Sonnet, P2]:** the primary-completion banner has cyan text over a translucent cyan fill on bright Blue Hole water; touch removes the objectives panel's dark backdrop. Keep the existing banner, improve its legibility.
   - **J-home-controls [Codex, P2]:** Home's Controls entry opens keyboard/pad rebinding settings on touch, while Pause has a touch How to play guide. Route both entry points to the existing device guide without adding a dialog or loading the dive on Home.
   - Opening gallery hood/terraces and orange Titanic materials remain with V-bluehole and V-titanic below; no visual tuning in this repeat.
2. **V-bluehole remainder [Sonnet]**, ~3.5 (2026-10-16 golden): ground banking, chipped lip and uneven beds done. Left: roof still reads as one rolled tube (break it into shelves/overhangs), beds run parallel, flat bright sand shelf, over-saturated blue fish. Geometry/materials, not tuning. Follow-up from [S-verify-12](progress/2180-S-verify-12.md): `clear_ground` exclusion should survive late prop loading.
3. **V-beebe-stack [Sonnet], DONE 2026-10-16 (merged; ~3.5, remainder open):** side stacks keep flat stump tops and the close pose washes beige under headlights (needs a lighting-side fix, not paint). Original: ~3.3: the chimney is smeared and one-tone brown with ragged stacked collars. Give it a chimney silhouette (tapering spire, mineral crust colour bands, hot-orange throat) rather than more smoothing.
4. **V-challenger-lander [Sonnet]**, ~3.2: lander is a flat-shaded prop with glowing orange float spheres. Dull the floats (syntactic foam, not lamps), add frame thickness/detail and a bait-plate; the amphipod swarm is the reward.
5. **V-endurance remainder [Sonnet]**, ~3.6: hull is the subject, but the sub vanishes in the pose. V-endurance-aim is parked (see In flight); take the camera-forward-of-sub approach or cut item 4 with the owner's nod.
6. **V-lostcity-low [Sonnet, small]**: Low-tier honeycomb on the slope needs a texture/normal fix; High is ~3.6.
   6b. **V-monterey-floor [Sonnet, small]**, ~3.5: flat sand floor between boulders; add ripple/pebble variation using the existing sediment material.
7. **S-manifest slices [Codex 2160]:** step 1 done (habitat). Migrate the next slices per `plan/progress/S-manifest.md` (inventory: 27 site-id expressions left); one slice per brief; golden unchanged.
8. **S-render remainder [Codex 2280]:** the nightly workflow failed on both scheduled runs (38574704463, 38743060407; ~1.5 h each, exit 1 after golden/perf steps; artifacts exist) and 2210 found exact golden identity fails. Diagnose from `gh run view <id> --log-failed` and the artifacts, fix the workflow or its thresholds, and make golden comparison use a justified tolerance.

9. **R-release [Haiku]:** f54 tagged 2026-10-15 on green CI (04a1d8c). Next tag f55 after the next completed green run.

10. **S-verify / S-bughunt [Codex, standing]:** after each batch of visual merges, a numeric/static verification (no site branches, no package numbers, `hullLight`/bank/footprint data paths, snapshot rebaselines justified) and a bug hunt over newly merged code. Queued: 2260 S-verify-13 (V-bluehole-3, V-lostcity-2, V-beebe-hull merges).

11. **V-hero-set [Haiku, small]:** make the 1.0 table and `HERO_SITES` agree (Sol, 2026-10-16: the table counts Endurance, the code counts Monterey). Pick one set, update the table and golden poses; eight-site acceptance must then cover the other eight including Endurance mission spawn.
12. **S-perf-stall [Codex 2270]:** `perf.frameMs` (`src/app/systems/quality.ts`) ignores every interval >=250 ms, so real stalls on a phone never lower quality or show in metrics. Separate hidden-tab gaps (document.hidden/visibility) from stalls and clamp stalls into the average; unit test by capability.

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
