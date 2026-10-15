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

Stage (joint review with Sol, 2026-10-15 eve): about 79% to 1.0; budget four to six weeks (Sol), Claude said three. Beautiful: Titanic 3.5-3.8, Beebe 3-3.3, Blue Hole 2.5-3, Lost City 3-3.3, Monterey ~3.3 (old capture), Challenger 3.3, Endurance 3.2. Top blockers: current unaided journeys on the merged build, real-phone Low readability and performance, hero beauty (Blue Hole geometry, Lost City towers), eight-site mission acceptance incl. Endurance, a completed green hosted CI on the release commit.

## Needs owner

The newest items go first.

- A five-minute play on a real phone on the newest build (Low-tier performance and readability, first five minutes). Still open since 2026-10-11; it is the largest unverified 1.0 requirement.

## In flight

- Codex 2120 S-verify-10, 2130 S-bughunt-8, 2140 S-verify-11 running (2026-10-15 eve). Queue: 2150 R-ci-green, 2160 S-manifest slices, 2170 J-journeys-repeat.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. "After X" means don't start until X is merged. Evidence: joint review 2026-10-15 eve in `plan/REVIEWS.md`.

1. **J-journeys-repeat [Codex 2170, then Sonnet judges]:** repeat the unaided Titanic and Blue Hole journeys (Home, pick, first 60 s, reward, next objective, Journal, debrief) on the merged build at desktop, portrait and landscape; list every confusion or dead end as a fix item here.
2. **V-low-tier [Sonnet]:** all golden and mission captures so far are High desktop. Capture the five heroes and four dark sites at Low tier in portrait; judge readability (Blake, Hudson, Bismarck, Hunga especially, since V-darksites excluded Low) and fix in data.
3. **V-golden-monterey [Haiku]:** `tools/golden.sh` timed out on Monterey in 2026-10-15-172432 (poses.json:146). Find why, raise the wait or fix the pose, so every golden set has all heroes; also capture Endurance at its mission spawn.
4. **V-bluehole [Sonnet]:** weakest hero (2.5-3). Detached canopy/stalactite slab, terrain seams, floating stones in `great-blue-hole-east-3.png`; faceted terraces. Fix geometry/materials, not tuning.
5. **V-lostcity [Sonnet]:** towers are hollow, flat-rimmed tubes with a smooth collar (`lost-city-3.png`); add rim breakup and surface relief; remove the regular dimples on the flat slope.
6. **V-endurance [Sonnet]:** opening still has a large, bright, centred sub over a small wreck; lower hull side dark. Make the wreck the subject (data: framing, sub offset or lighting), keep `deepOpening` and `openingClearance1290` guards.
7. **V-beebe [Sonnet]:** stack is better but faceted and the sub is brightest; plumes good. Smooth chimney facets, dim sub specular in the vent glow.
8. **V-titanic palette [Sonnet, small]:** hull peach-orange vs real grey-brown rust; close view still manufactured. Palette and plate variation only.
9. **S-manifest slices [Codex 2160]:** step 1 done (habitat). Migrate the next slices per `plan/progress/S-manifest.md` (inventory: 27 site-id expressions left); one slice per brief; golden unchanged.
10. **R-ci-green [Codex 2150]:** read the failing shard of run 38769418092 (e2e 1/38) and any later completed run; fix specs or code; confirm cancelled runs are only superseded pending runs (concurrency keeps one pending run, which cancels older pending ones). Deploy workflow depends on its build, not on CI: propose gating tags, not deploys.
11. **R-release [Haiku]:** after a completed green hosted CI run on main tag `f<N>` and check Pages. f53 is next; f51 is the last tag.
12. **S-render remainder [Codex]:** confirm the first nightly run passes and golden pixels are unchanged.

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
