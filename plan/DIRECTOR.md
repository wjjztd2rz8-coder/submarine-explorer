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
| Hosted CI green, and a full run no longer blocks releases                     | R-release, S-tests (1740)                               |
| No known blockers; the code is simple enough to keep changing safely          | S-resolve, S-modal, S-boot, S-rewards, S-manifest       |

Stage (Claude-only review 2026-10-15 pm; Sol skipped, Codex 5h at 6% and weekly floor): about 79% to 1.0; plan about three and a half weeks (four credible). Beautiful scores unchanged since the morning review: Titanic 3.8 (wide), Beebe 3.2, Blue Hole 3, Lost City 3.3, Monterey 3.5, Challenger 3.1 (lander better), Endurance 3.2. Top blockers: hosted CI never completes (see R-ci-time: pushes were cancelling each other, fixed in ci.yml), unaided journeys verified on the merged build, real-phone Low performance, hero beauty (none at 4 yet), eight mission spawns unverified.

## Needs owner

The newest items go first.

- A five-minute play on a real phone on the newest build (S-guidance and S-rewards are new) (Low-tier performance, first five minutes after S-flow).

## In flight

- 2026-10-15 pm review: Codex 2000/2010/2020 merged; 2030/2040/2050 ran; queue holds 2060 S-verify-7, 2070 S-bughunt-6, 2080 R-ci-time. Hosted CI now runs to completion on main (cancel-in-progress limited to PRs); the first completed result is for d0e57ba or later.

## Backlog

One list, ordered by player impact and dependencies. Lane is in brackets. "After X" means don't start until X is merged. Evidence: §n = section n of `plan/archive/SIMPLIFY-REVIEW-2026-10-11.md`; joint review 2026-10-14 in `plan/REVIEWS.md`.

3. **V-eight-sites DONE 2026-10-15 (mission approach shortened at Bismarck, Blake, Hunga, Hudson; Hudson ledge still faint, Blake seabed near-black):**, after 1720 (golden evidence tooling): capture the eight non-hero sites at real mission spawns on desktop and phone, judge each (Sol: Axial, Bismarck, Blake, Hudson, Hunga, Kamaʻehuakanaloa may have weak subject visibility) and fix major defects.
4. **V-endurance [Sonnet] opening DONE 2026-10-15 (hull ~33% of frame, sub small above it; lower hull side still dark):** close view merged. Opening still open: the hull is ~380 px of 1600 with the sub large at right. Keep `deepOpening.test.ts` / `openingClearance1290.test.ts` guards; enlarge the wreck or move it/the sub in data. Landscape: sub behind the touch buttons at the opening.
5. **V-titanic [Sonnet] close view DONE 2026-10-15 (plateStains shader in steelMaterial, close ~4.0; hull still more orange than real grey-brown, palette pass optional):** close-up (`titanic-3.png`): regular panels, bright flat sand, thin rusticles read as manufactured. Agreed beauty 3.5. PARTLY DONE 2026-10-14 (9d23755): dark silt seabed, per-plate hull variation, thicker rusticles; wide view clearly better (~3.8). Remainder: close view still flat peach under lights, needs a texture-space plate/stain layer.
6. **V-beebe / V-bluehole remainder [Sonnet]:** Beebe opening: the bright sub dominates a small stack; chimney facets and plumes look procedural. Blue Hole: faceted uniform steps and smooth stalactite cones (golden essentially unchanged since 2026-10-13).
7. **V-lostcity [Sonnet]** PARTLY DONE 2026-10-14 (56eae67): seabed stripes fixed (reliefBed/rillStretch), colour banding calmer; towers only modestly better, still smooth columns with a flat collar and regular dimples on the flat seabed. Remainder: tower surface relief and collar.
8. **V-headlight [Sonnet, small] DONE 2026-10-15:** the sub headlight pool shows a faint repeating star/hex pattern on rock walls (Blue Hole `great-blue-hole-1.png`, 61 m). Find the texture or noise source in the light/cookie shader and remove the tiling; check Monterey and Challenger for the same.
9. **V-sub-scale [Sonnet] DONE 2026-10-15 (data: Challenger lander 26x26x34 m, Beebe stack 31x24x16 m; Beebe stack alone still shorter than sub, plume carries it) (not merged; branch claude/V-sub-scale in ../subexp-wt/V-sub-scale, see its plan/progress note):** camera-only fixes did not work. Challenger lander is physically small, so pulling the chase back leaves an emptier frame with the sub still dominant; Beebe needs a bigger pull-back (range 100) that breaks maxRange 80 in heroReadability and the orifice-left check in beebeFraming. Next: enlarge or relocate the subject in data (Challenger lander scale or a nearer second object; Beebe stack in front of the sub), then revisit those test limits deliberately.** (V-journeys, hero beauty): at the openings the sub is the biggest, brightest object (Beebe, Challenger, Endurance wreck is still small below it). Data-only: move the camera back or the subject in front, per site, in the existing framing tables; the subject must be at least as large as the sub. Judge on golden `-1` frames at desktop and phone.

9b. **V-darksites [Sonnet] DONE 2026-10-15 (per-site seabed ambient floor, Hudson plumes calmed; all four ~3.5, Blake still dimmest):** from `plan/progress/V-eight-sites.md`: Blake and Bismarck/Hunga seabed nearly black, Hudson ledge faint and sponge blobs flat. Raise readability in data (site atmosphere/light/palette tables, no new site branches) so each reads in the first 10 s without going bright-flat. Judge on mission-mode golden frames, desktop and portrait.

10. **S-manifest [Sonnet design, Codex migration]** (§5, §6b; S-resolve merged). Move each site's tuning into one typed `data/landmarks/<id>/site.json` with a validator (biome, opening and framing, atmosphere, sonar shading, low-tier framing, Beebe and Monterey configs, currents, secrets); remove the 26 site-id branches in shared code; merge `Spawn.ts` and `DeepOpeningSpawn.ts` into one framing solver; species literals to JSON. Guard with the golden set. Sonnet writes the schema and migrates one site first.
11. **S-tests step 3 / hosted CI [Codex]** (2000/2020 merged; run 38705533888 down to 2 failures, both fixed in 22e1cf2; hosted runs on main were being cancelled by the next push, fixed 2026-10-15 in ci.yml) brief 2080 queued: hosted CI has been red on every push; 1700 repaired 54 test failures, main now carries S-guidance and S-rewards. Hosted CI green is a 1.0 requirement; tag `f53` only on green.
12. **S-render remainder [Codex]:** MOSTLY DONE (2020 merged the nightly workflow and table-driving). Remainder: confirm the first nightly run passes and the golden pixels are unchanged.
13. **R-release [Haiku]:** after each green hosted CI run on main tag `f<N>` (`git tag f<N> && git push origin f<N>`) and check the Pages deploy. f53 is the next tag; f51 is the last.

14. **R-ci-time [Codex, 2080]:** hosted CI takes ~45 min; triage the first completed run on main by failing spec and cut the shard time. Runs were being cancelled by every following push (ci.yml fixed 2026-10-15).

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
