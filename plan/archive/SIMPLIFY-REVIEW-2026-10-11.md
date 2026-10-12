# Simplification review, 2026-10-11 (evidence)

> **Evidence only; not a plan.** Every actionable item from this review now lives in the single backlog in [plan/DIRECTOR.md](../DIRECTOR.md) (items `S-*`, plus the simplicity rules in its definition of done). Take work from there, never from this file. Section numbers here are cited by those items.

Owner question: what can be simplified across code, logic, gameplay, UI, tests, tooling and process, keeping the core of the game and its intent, so that Bathyline is easier to maintain, optimise, update, play and understand?

**How this was made.** It is a joint review:

- **Claude side:** Opus orchestrating, plus one Sonnet agent (UI and gameplay, from screenshots and code) and five Haiku agents:
  - code structure;
  - tests and tooling;
  - world and render;
  - systems and settings inventory (rerun after the first attempt was stopped at the Claude budget floor);
  - audio, content, PWA and data pipeline.

  A further Haiku pass verified 13 claims that had not been checked; five were corrected below.

- **Codex side:** Codex 6.1 Sol ran an independent review.

The raw reports are in `.cache/review/simplify-20261011/`: `ui-gameplay.md`, `code-structure.md`, `tests-tooling.md`, `world-render.md`, `systems-inventory.md`, `audio-content-pipeline.md`, `claim-checks.md`, `sol-review.md` and `sol-round2.md`. Claude spot-checked the key claims against the source. Where the two sides disagree, this document says so.

Nothing in the repo was changed by the review itself.

---

## 0. What must survive

Bathyline lets someone enter a real underwater place, pilot comfortably, approach something visually distinctive, scan it, and keep a meaningful discovery in their Journal. Every simplification below must keep all of these:

- real GMRT terrain;
- the identities of the 13 sites and the five hero set pieces;
- readable lighting;
- the scan verb;
- the Journal;
- marine life;
- Arcade by default with Realistic as a deliberate alternative;
- desktop, controller and touch input.

Sol framed it as "simplify the machinery around exploration, not the exploration".

## 1. Diagnosis: why it got complex

The numbers:

- **Source and tests:** 70.5k lines of source, 52k lines of tests and 92 e2e specs, taking 8.8 h serial across 30 CI shards.
- **Plan and history:** 356 plan files. 801 commits since Oct 1, 273 of them `wip(`.
- **Work-package tags:** 301 package-number tags sit in source comments.

Most complexity did not come from the game design. It came from the **workflow**. Each package fixed its symptom locally and added a spec named after itself:

- a layout offset (`hud-layout.css`: 1,077 lines, 12 `@media` blocks, 356 px literals);
- a per-site branch (26 site-id branches in general code; `TerrainBiome.ts` changed 44 times and `Spawn.ts` 32 times in 11 days);
- a `f-verify-NNN` / `f-bughunt-NNN` spec.

The patches were each reasonable, but together they make every new change more expensive. So the biggest simplifications are structural:

- one HUD layout model;
- one guidance slot;
- one site manifest;
- capability-named tests;
- one place where effective settings are resolved.

These matter more than deleting individual features.

---

## 2. Top 12, ranked by value ÷ effort

| #   | Change                                                                                                                                                                                                       | Dimension    | Effort | Found by                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------ | ---------------------------------- |
| 1   | **One guidance slot**: tutorial, hint, scan card, objective chip, discovery toast and NEW ENTRY card become one prioritised queue, one message at a time                                                     | Play/UI      | M      | Both                               |
| 2   | **Three-region HUD layout** (top info, guidance, controls) in normal flow, replacing per-element offsets; do it after #1                                                                                     | UI/code      | M–L    | Both                               |
| 3   | **Two clicks to the first dive**: one primary "Dive" on Home; one site-picker component (Home = Pause = Free dive); delete the full-screen globe overlay                                                     | Play/UI      | M      | Both                               |
| 4   | **Mode in one place**: Arcade/Realistic on the briefing as one line; Custom only in Settings, 10 selects → about 4 switches                                                                                  | Play/UI/code | S–M    | Both                               |
| 5   | **Resolve effective settings once** (mode + upgrades + daily modifier + ROV), instead of mutating config at boot, live and per frame                                                                         | Code         | M      | Sol (Claude verified `rov.ts:143`) |
| 6   | **Test suite by capability**: fold 29 package-named specs into 3 table-driven specs; move 4–6 capture-heavy specs to a nightly golden run; build once per CI run                                             | Tests/CI     | M–L    | Both                               |
| 7   | **Artifact hygiene**: a cleanup script plus run-scoped outputs (2.3 GB stale `dist-*`/`test-results-*`, another ~2.2 GB of old `.cache`)                                                                     | Repo         | S      | Both                               |
| 8   | **Shared utilities**: one `el()` (10 copies), one PRNG (5), math helpers (`clamp`/`lerp` 5–6 copies each; `smooth`/`smoothstep` 12 copies with two arities), and remove 10 dead exports and an orphan module | Code         | S      | Claude                             |
| 9   | **One site manifest per site**: move per-site TS tuning (biome, opening, atmosphere, sonar shading, low-tier framing, chimney/monterey configs) next to `data/landmarks/<id>/`                               | Code/content | M      | Both                               |
| 10  | **Fewer reward currencies**: samples and secrets become "finds" in the Journal; events without RP checklists; upgrades 10 → 4 or fewer                                                                       | Play/code    | M      | Both (they differ on how far)      |
| 11  | **Remove unused capability**: Draco/KTX2 decoders (2.84 MB, no shipped asset uses them), generic hull-block builder (~400 lines, only the `_test` fixture), brine preset (~330 lines, no site)               | Code/perf    | S      | Both                               |
| 12  | **Modal/key stack**: 7 capture-phase `keydown` handlers whose correctness depends on system registration order become one overlay stack that owns Escape and focus                                           | Code         | M      | Claude                             |

---

## 3. Gameplay and features

Players currently learn about nine reward concepts: RP, stars, secrets, samples, daily streak, badges, upgrades, cosmetics and Journal entries. Exploration games read better with one or two.

- **Samples → cut, or fold into finds.** `Samples.ts` keeps `collected` per dive only (verified) and gives 10 RP. Players get a fourth collectable that doesn't persist. _S, low risk._
- **Secrets → Journal "finds".** Same scan verb, separate system (`Secrets.ts` + `SecretsVisual.ts`, 212 lines). Keep the content; drop the separate category. _M, low._
- **Events.** The phone feedback already cuts marine snow (f-events-reform). Go further: no "witnessed" checklist or RP. An event is just a moment, logged once in the Journal. _S on top of the queued package._
- **Upgrades.** Claude proposes 10 tracks → 4 (Lights, Sonar, Power, Thrusters), with Realistic-only items hidden in Arcade. Sol proposes fixed balanced equipment, with progress = Journal completion + stars + cosmetics. **Disputed; owner decision** (progression was an approved Phase F direction). Either option removes the overlap between upgrades and the mode presets, which both scale lights and sensors.
- **Daily Dive.** Claude: keep it and list it in the site picker. Sol: reduce it to "today's suggested site" without randomised approach, goal subsets, modifiers or streaks. **Owner decision.** A middle option is to keep the date-seeded site and goal and drop modifiers and streaks. That removes the boot-time `daily.modifier` mutation (`boot.ts:100`), which is part of #5.
- **ROV.** It works only on keyboard (verified: `KeyE` only, no gamepad or touch binding, `Input.ts:163`), and no mission needs it. It costs about 770 lines including tests, plus a per-frame POI-radius rewrite. Options:
  - (a) cut it;
  - (b) hide it until it has a role;
  - (c) give it a touch/pad binding and one mission use.

  **Owner decision.** The ROV was kept in Phase D, and its role was later deferred.

- **Custom mode.** `sonarMarkers` is on in both presets; drop the option. Derive lights and sensors from the mode. Merge descent into speed. Drop the `standard` speed tier and the `gentle`/`exaggerated` current strengths. Keep sim speed as the T key only. That leaves Custom as 4 switches: battery/oxygen, currents, waypoints, start at surface. _M, needs a save migration._
- **Tutorial: 5 steps → 3** (move, rise/sink, scan), and never shown at the same time as a scan card. Lights and photo become one-shot hints. This builds on the queued f-first-dive-flow. _S–M._
- **Class A hull.** No mission uses it (~250 lines). Keep it only if progression needs a shallow-dive hull. _Low priority._

## 4. UI, HUD and menus

Evidence: `.cache/review/owner-20261011/{portrait,landscape}.jpg`, `.cache/phonefb/phone-titanic/*`, golden 2026-10-11.

- **Too much on screen.** At the first discovery on a phone, 14–16 elements compete for the screen, and the scene gets about a quarter of it.
- **The current objective appears in up to 8 places:** panel, scan card, chip, world label, sonar diamond, tutorial text, hint chip and edge arrow.
- **A discovery is announced 3 times:** NEW ENTRY card, "+10 RP" toast and a tutorial line.

Proposals:

1. **Guidance slot** (top 12 #1). Priority: urgent warning > scan progress > discovery > next objective > tutorial/hint.
   - The sonar diamond and world waypoint stay; they are spatial, not text.
   - Remove the persistent "nominal" status text and the static "HULL 6,500 m" spec number (show the gauge only when it's above about 50%).
   - Drop the mission-title strip on phone.
2. **HUD regions** (top 12 #2). Expected to save 400–700 CSS/TS lines. HUD screenshot specs will need a deliberate re-baseline.
3. **Home.** One primary "Dive" (first run: Titanic briefing; afterwards: continue). Remove the disabled Continue. Journal and Settings become small links. Daily becomes a row in the site list.
4. **Site pickers: 4 → 1.** Today there is the Home list + embedded globe, Pause → Mission select, the full-screen globe (`N`, `?globe=1`), and the briefing's "Free dive" entry. Merge them into one list component, with the globe as a header on wide screens. Delete the overlay, the `N` key, `?globe=1` and the hidden third `MissionSelect` (`shell.ts:171`, built and then hidden). The queued f-globe-pins package changes the globe now, so **decide this before it lands** to avoid polishing code that will be cut.
5. **Pause: 9–10 entries → 5.** Resume, Objectives (phone), Journal, Settings (which absorbs Controls/How to play and Data credits), Quit. Upgrades go into the Journal or debrief.
6. **End of dive: one step.** Finishing the primaries shows a banner (Keep exploring / Surface and debrief, `ObjectivesPanel.ts:151`). Surfacing then shows the debrief (Dive again / Journal, `Debrief.ts:205`). The choices don't repeat (an earlier draft said they did), but there are two end-of-dive moments. Show the stars and summary in the banner itself, with Keep exploring primary, and keep the full debrief for surfacing.
7. **Settings.** Drop `hullWarningStyle` (always show gauge + vignette) and `controlTips` (the footer key bar). Reduce the audio sliders to master + music. Keep UI scale, reduce motion, captions, sonar palette and rebinding (accessibility).
8. **Small desktop items.** Remove the Reset camera button (X and double-click already do this) and the seabed status text (the banner already says it).

Already queued from the owner's phone test (`plan/PHONE-FEEDBACK-2026-10-11.md`), and consistent with this review: text diet, Data credit off the HUD, Journal button on the HUD, touch boost toggle, events reform, and the first dive as an approach. **Land those first; 1, 2 and 4 above build on them.**

## 5. Code and architecture

- **Effective-settings resolver** (#5). Several layers write to the same config: `applyBootModes` (`boot.ts:102`), the live `modes.ts`, upgrades, the daily modifier, and ROV scan radii (`rov.ts:143–158`, which multiplies `poi.radius` every frame and restores it afterwards). Replace them with one pure `resolveEffective(settings, mode, progress, daily)` → frozen object that systems read. Saves about 200–400 lines, and the ordering bugs that come with in-place mutation go away.
- **Spawn and framing pipeline.** `Spawn.ts`, `DeepOpeningSpawn.ts`, the `deepOpenings`/`lowTierFraming` configs and the Lost City chase offset (`props.ts:59`, `mission.ts:72`) become one solver fed by per-site data (subject, bearing, distance, framing). Saves about 150–300 lines. Medium–high risk; the hero openings must not regress, so check against the golden set.
- **Site manifest** (#9). Per-site tuning lives in 4 data roots (`data/landmarks`, `data/currents`, `data/secrets`, `data/tiles`) plus about 8 TS tables:
  - `TerrainBiome.BIOMES`
  - `deepOpenings`
  - `beebeChimney`
  - `monterey`
  - `lowTierFraming`
  - atmosphere overrides
  - Sonar shading (`Sonar.ts:536`)
  - `terrainFeatures`

  Consolidate them into `data/landmarks/<id>/site.json` with a typed loader and validator (`validate_landmark.py` already exists). Remove the 26 site-id branches in general code. Adding or tuning a site then touches one folder.

- **Modal stack** (#12). Capture-phase key handlers sit in `Settings.ts:782`, `Upgrades.ts:32`, `FocusTrap.ts:57`, `MissionRouter.ts:414`, `shell.ts:304` and `Globe.ts:648`, plus onboarding and power. Comments in `app/systems.ts` record the order these depend on ("must precede the shell's Escape handler"). Replace them with one overlay stack: push/pop, top of stack gets Escape and focus. This also absorbs the duplicated modal `close()`/`hide()` code (5 copies).
- **Shared utilities** (#8): `src/ui/dom.ts` for `el()`, `src/util/rng.ts` for PRNG/hash, and `src/util/math.ts`. Keep both `hashString` return conventions so placement seeds don't move. Delete the 10 dead exports (verified unused in src and tests) and `audio/index.ts`. `props/Procedural.ts` has no src importer, but a unit test imports it. Drop `export` from 236 internal-only symbols. About 250–400 lines. No behaviour change, so it's a good first package.
- **Dormant paths:**
  - FieldGuide content that Journal ignores (`Journal.ts:237`);
  - 19 of 36 EventBus types with no in-app listener. Tests listen to 3 of them (`scan:progress`, `mission:complete`, `settings:changed`), and `ui:selectTile` is never even emitted;
  - `simSpeedDefault`: a saved setting with no Settings row and no simulation reader. It feeds only reload detection (`Settings.ts:645`). Sol called it legacy; it is live but pointless.
  - `SettingsData.bindings`: written but never read (bindings live under their own storage key);
  - wildlife shown in two forms: "species identified" vs "animals scanned", with unlocks matched by scientific names in prose (`JournalData.ts:223`). Use one discovery presentation and explicit links.

  About 400–650 lines (Sol).

- **Large files.** Split `Sonar.ts` (1,038), `Journal.ts` (867) and `Settings.ts` (785), plus the 300–515-line functions (`buildSmokerCluster`, `createOnboardSystem`). Do this only when they are next touched, not as its own project.
- **`GameContext`.** It has 56 members, read across 41 fields. Don't restructure it now. #5 and #12 remove the worst cross-reads; revisit after that.
- **Engineering rule going forward:** no package numbers in source comments, specs or CSS. Explain _why_ in the comment; the package history lives in git.

## 6. World, rendering, assets and performance

- **Remove now (no visual change):**
  - generic hull-block builder (`builders/wrecks.ts:218–611`; every real hull has a named wreck; ~400 lines);
  - brine preset (~330 lines);
  - Draco/Basis decoders and KTX2 setup (2.84 MB; both shipped GLBs are plain);
  - `reefs.ts` (empty);
  - duplicated `paintWreck`/`wreckMaterial`/`srgbToLinear`/`hash2`;
  - `demo-synthetic` tile and `barrel_stove.glb` (move to test fixtures, -1.25 MB).
- **Quality tiers: 4 → 3** (Auto, Low, Medium, High), folding Ultra into High. There are about 47 knobs per tier across 9 tables, and explicit tier checks in about 17 files. Ultra differs from High in more than detail multipliers: a pixel-ratio cap of 3 instead of 2 (`quality.ts:65`), higher counts (wall segments, life agents, wash and event particles) and one explicit branch (`LostCityFlange.ts:15`). **Owner decision:** a merge means a visible loss on top-end desktops. Both sides lean towards it, but a High-vs-Ultra golden comparison should decide.
- **Home without a dive.** A plain Home visit loads the 1.2 MB Titanic tile (`boot.ts:95,113`, `Config.ts:61`), initialises all about 37 systems (`main.ts:34`), _and_ loads Monterey for the title backdrop (`title.ts:145`). The globe catalogue is also fetched twice on every Home load. Booting Home on its own, then loading the dive after a site is picked, makes first paint faster and phones cheaper. M–L.
- **Table-drive the scarp kinds** (`scarp.ts`, 1,333 lines, 14 branches): saves about 200–400 lines, at medium visual risk for 6 hero placements. Do it with the golden set.
- **Species literals → JSON** (about 1,000 TS lines move to `data/life/`). This fits the site-manifest direction, but the types need a validator.
- **Title scene** could reuse `Headlights`/`MarineSnow` (~130–200 lines) at low priority, because title polish was demoted.
- **Don't generalise the hero wrecks** (Titanic, Bismarck, Endurance; 2,427 lines). They are the art and they earn their keep.
- **Performance verification:** the only perf guard is draw-call and triangle ceilings on Low. Add one recorded frame-time measurement per tier per hero site to the nightly golden run, so that "optimise" has a baseline.

## 6b. Audio, content, PWA and data pipeline

- **Audio** (10 files, 1,600 lines).
  - About 20 oscillators and 9 noise loops run for the whole dive. Hull creak has three code paths, one of which ignores its config gaps (`AudioSystem.ts:381`). Six cue functions take an unused `_config`.
  - Proposal: collapse the creak paths; reduce the volume controls from mute + 3 sliders to master + music (the same as UI item 7); drop the unused parameters.
  - Keep the adaptive score; it is an owner-approved feature.
- **Content** (13 sites, about 17,450 player-facing words).
  - Guide text ranges from 538 to 2,175 words per site, against a median of 971. The f-text-diet package (phone feedback item 2) already handles the briefing and Journal side. The outliers should be trimmed towards the median in the same pass.
  - POI and prop `note` fields (about 5,700 words) are never shown. They are **provenance notes** (for example "does not constitute a georeferenced wreck survey"), so keep them. Moving them to each site's `sources.md` is optional.
  - About 3,800 catalogue words in `data/landmarks.json` (105 KB) are never displayed. Trim these with the site-manifest work.
- **PWA and boot.**
  - Load the globe catalogue once.
  - Move service-worker registration out of the touch system (where it was placed by accident).
  - Stop shipping the five sourcemaps (6.4 MB) to Pages, or keep them deliberately.
  - The precache is fine at 1.97 MB.
- **Pipeline** (18 data tools).
  - Retire `compress_tiles --quant16`, a dead production path (about 200 lines, plus about 45 MB of ignored local output).
  - The props rules are duplicated in Python (`validate_props.py`) and TS (`PropLoader.validatePropEntry`). The Python hull fallback has drifted from `submarine.ts`. Make the TS loader the single source: run it from Node in `check:content`, or generate the Python rules from it.
- **Shipped fixture.** The `_test` landmark ships in `public/`; move it to test fixtures (along with `demo-synthetic` and `barrel_stove.glb`).

## 6c. Bugs found along the way (fix regardless of simplification)

- **Sonar ping is unreachable.** `ping` is bound to Q/Tab (`Input.ts:200`), and `AudioSystem.ts:392` plays it when pressed, but `Input.sample()` never sets `s.ping` (only resets it at `:723`). Either wire it up or delete the action and the sound. Simplest: delete it, since sonar already works without a ping.
- **The globe key (N) does nothing.** `toggleGlobe` is set in `Input.sample()` (`:668`), but nothing reads it, and the Globe's `isToggleKey` option is never passed. This fits the "one site picker" proposal: delete the binding.
- **Gamepad gaps.** ROV, reset camera, Journal and photo capture have no gamepad path. Touch has no camera-view or sim-speed control. Cut the actions or add the bindings; don't leave half-supported actions.
- **Doc drift.** `Save.ts:26` says new players get the `auto` graphics tier, but the code default is `medium` (`Config.ts:62`). Decide which is intended.

(The inventory also reported the O/Settings key as dead. Claude checked: Settings listens for it directly (`Settings.ts:738`), so it works.)

## 7. Tests, CI, tooling, repo and process

- **Tests by capability** (#6).
  - Fold the HUD/touch specs (9), the opening-framing specs (12) and the Journal/debrief specs (8) into three table-driven specs. Map every assertion before deleting, and never drop a guard for a real past bug.
  - Move `f-fidelity-rollout`, `f-geo-scarp`, `f-sonar-palette-1200`, `f1-terrain`, `visual-qa` and `f-bluehole-squiggle` into a nightly `schedule:` workflow alongside `golden.sh`.
  - Estimated 31–36% less serial e2e time and about 2,300 fewer spec lines. Sol targets 3–5k fewer test lines once unit tests that pin implementation details (exact shader strings, draw counts) are included.
  - The planned sweep (Codex 1405, renumbered 1470) never produced a report, so this is still to do.
- **CI:** build once per deployment base and share it across shards (`ci.yml:78`). Today all 30 shards install and build separately. Consolidate `tools/gates.sh` and the `ci` npm script into one definition.
- **Artifacts** (#7). Add `tools/clean-artifacts.sh` (dry-run by default; skip directories a live `PW_OUTDIR` uses). Make gate runs write under `.cache/runs/<id>/` with retention, instead of at the repo root (232 stale directories, 2.27 GB). Prune old `.cache/golden` and `.cache/codex`.
- **Tools:**
  - delete `codex-available.sh` (no references);
  - move the one-off shot scripts and per-site poses into `tools/archive/`;
  - drop or move `tools/fixtures/titanic_gmrt.asc` (2.7 MB, docs-only);
  - remove `playwright.bughunt-880.config.ts` and the bughunt1090 config from the default tree.
- **Plan docs:** archive the 10 historical contracts and QA files (24 → 14 top-level). Move the 28 MB of progress images out of `plan/progress/`. Fix the shard-count drift (the docs say 16, 20 and 30).
- **Orchestration** (the owner's call; it concerns how I work, not the game).
  - **What exists:** a timed headless resume, review triggers, a dispatcher, a cap timer, a kickoff timer, a watchdog, the Codex queue and worktrees.
  - **What it costs:** while this review ran, a headless run was 3 h into its own review and three interactive sessions were open. Together they pushed the Claude 5 h window to its floor in about 15 minutes.
  - **Suggestion:** one active Claude orchestrator at a time (the lock exists but interactive sessions don't always take it). Also, every package's definition of done should include "no new package-named spec, offset or site branch without a reason", which stops the sprawl at its source.

## 8. Keep: complex but core

- **Simulation core:** terrain/physics agreement, clearance search, LOD, fixed-step simulation.
- **Site identity:** hero silhouettes, distinct habitats, sourced facts with one Journal honesty note.
- **Instruments:** Sonar (simplify its plumbing, not the instrument); scan hold + reticle.
- **Progress:** Journal with species and photos; objectives with stars. Keep the distinction between lifetime discoveries and per-dive objectives.
- **Modes:** Arcade/Realistic and both realism systems (inert in Arcade).
- **Player features:** the touch stack, photo mode, accessibility (rebinding, captions, reduce motion, UI scale) and save migrations.
- **Navigation model:** each dive is a full page navigation. It looks crude but it guarantees clean per-dive state; keep it.

## 9. Suggested order

1. **Wave 0, now, no player-visible change:** the 6c bugs, #7 artifact hygiene, #8 shared utilities and dead code, #11 unused capability, the quant16 path, one catalogue fetch, plan/tools archive, CI build-once. Mostly Codex, small Haiku tasks.
2. **Wave 1, after the queued phone-feedback packages land:** Home with one primary button, single end-of-dive screen, pause 5 entries, settings trim, tutorial 3 steps, samples cut. Mostly S and low risk.
3. **Wave 2:** guidance slot → HUD regions (Sonnet; re-baseline HUD specs deliberately), one site picker, Custom 4 switches + effective-settings resolver, modal stack.
4. **Wave 3:** site manifest + spawn pipeline (golden set as the guard), test-suite consolidation and the nightly tier, Home boot without a dive, tier merge.

Each wave ends with a full e2e on a quiet CPU, the golden set compared with the previous one, and a CHANGELOG entry for every cut.

## 10. Owner decisions

1. Upgrades: trim to 4 tracks (Claude) or replace with fixed equipment + cosmetic rewards (Sol)?
2. Daily Dive: keep as is, drop modifiers and streaks, or "today's suggested site" only?
3. ROV: cut, hide, or give it a touch/pad binding and a mission role?
4. Ultra quality tier: merge into High?
5. Globe: is the globe on wide screens only (phones get a list) acceptable, given the f-globe-pins work queued from your phone test?
