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

| Requirement                                                                   | Backlog items                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| Five hero sites look beautiful (4 of 5) in opening, approach and detail views | V-endurance, V-bluehole, V-beebe, V-titanic, V-lostcity |
| The other eight sites are coherent with no major visual defect                | V-eight-sites                                           |
| A new player understands the first five minutes on desktop and phone          | V-journeys, S-guidance (done), S-hud                    |
| Acceptable Low-tier performance on a real phone                               | Owner check; S-boot helps                               |
| Hosted CI green, and a full run no longer blocks releases                     | R-release, R-ci-green                                   |
| No known blockers; the code is simple enough to keep changing safely          | S-resolve, S-modal, S-boot, S-rewards, S-manifest       |

Stage (Claude-alone review, 2026-10-15 late; Sol skipped, Codex budget 2%): about 80%; before that joint review with Sol: about 79% to 1.0; budget four to six weeks (Sol), Claude said three. Beautiful: Titanic 3.5-3.8, Beebe 3-3.3, Blue Hole 2.5-3, Lost City 3-3.3, Monterey ~3.3 (old capture), Challenger 3.3, Endurance 3.2. Top blockers: current unaided journeys on the merged build, real-phone Low readability and performance, hero beauty (Blue Hole geometry, Lost City towers), eight-site mission acceptance incl. Endurance, a completed green hosted CI on the release commit.

## Needs owner

The newest items go first.

- A five-minute play on a real phone on the newest build (Low-tier performance and readability, first five minutes). Still open since 2026-10-11; it is the largest unverified 1.0 requirement.

## In flight

- Codex queue 2170 J-journeys-repeat, 2180 S-verify-12, 2190 S-bughunt-9 waits for the 17:24 CDT Codex reset. No Claude package running.
- V-endurance-aim parked 2026-10-15: branch claude/V-endurance-aim (worktree ../subexp-wt/V-endurance-aim, commit 5fa58fc) reached hull 45% but the sub is too large and dominant in frame; not merged (new shared camera code for a small gain). Needs the camera forward of the sub, or drop item 4.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. "After X" means don't start until X is merged. Evidence: joint review 2026-10-15 eve in `plan/REVIEWS.md`.

1. **J-journeys-repeat [Codex 2170, then Sonnet judges]:** repeat the unaided Titanic and Blue Hole journeys (Home, pick, first 60 s, reward, next objective, Journal, debrief) on the merged build at desktop, portrait and landscape; list every confusion or dead end as a fix item here.
2. **PARTLY DONE 2026-10-15 (gallery sponges removed, clear_ground scatter exclusion, lighter hood; ~3.2) V-bluehole remainder [Sonnet]; left: free-standing hood slab (terrain carve), slate-blue end walls, terrace banding** (hood grounded, ledge scatter removed, denser apron done; golden 2026-10-15-211537 still ~3: faceted terraces, bright flat sand shelf, floating rock/crystal scatter): east hood is a free-standing slab (needs terrain carve behind gallery seats), life exclusion over gallery footprints for floating purple corals, heavy side curtain. V-bluehole [Sonnet]:** weakest hero (2.5-3). Detached canopy/stalactite slab, terrain seams, floating stones in `great-blue-hole-east-3.png`; faceted terraces. Fix geometry/materials, not tuning.
3. **DONE 2026-10-15 (V-lostcity-2 merge; wall relief, vent paint on torn rim, High slope variety, ~3.8; left: Low-tier honeycomb needs a texture/normal fix) V-lostcity remainder [Sonnet, small]** (torn rims, wall relief done, ~3.5): smooth wall planes between ribs, vent throat keyed to old rim height, regular honeycomb pattern still visible on the Low-tier slope in after-low/lost-city-1.png) V-lostcity [Sonnet]:** towers are hollow, flat-rimmed tubes with a smooth collar (`lost-city-3.png`); add rim breakup and surface relief; remove the regular dimples on the flat slope.
4. **PARTLY DONE 2026-10-15 (closer off-axis chase, brighter fill; hull ~37% of frame, ~3.5) V-endurance remainder [Sonnet]:** the facing guard keeps the sub between camera and hull, so the hull can't fill the frame. Next: a per-site chase aim in site data (camera aims at the hull independent of sub heading); shared camera change, keep `deepOpening` and `openingClearance1290` guards.
5. **DONE 2026-10-15 (bd09bf1; chimney mesh smoother, per-site hullLight 0.2 at Beebe; sub still among the brighter objects, next would be a darker site hull tint) V-beebe remainder [Sonnet]:** stack is better but faceted and the sub is brightest; plumes good. Smooth chimney facets, dim sub specular in the vent glow.
6. **DONE 2026-10-15 (hull grey-brown, rusticles/railings deeper brown; rust streaks subtle, needs shader) V-titanic palette remainder [Sonnet, small]:** hull peach-orange vs real grey-brown rust; close view still manufactured. Palette and plate variation only.
7. **S-manifest slices [Codex 2160]:** step 1 done (habitat). Migrate the next slices per `plan/progress/S-manifest.md` (inventory: 27 site-id expressions left); one slice per brief; golden unchanged.
8. **S-render remainder [Codex]:** confirm the first nightly run passes and golden pixels are unchanged.

9. **R-release [Haiku]:** f53 tagged 2026-10-15 on green CI (26b9892). Next tag f54 after the next completed green run.

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
