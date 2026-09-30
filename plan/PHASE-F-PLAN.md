# Phase F — "Make it wonderful" (2026-09-29)

The owner approved the D3 checkpoint and asked for an ambitious phase:

- a large increase in quality, interest and playability;
- realistic, detailed assets and surroundings, similar to real life but not a copy of it;
- an arcade-style simulator in which every element is strongly influenced by real life, while play stays simple, easy and fun;
- creative liberty to add, remove or change things.

The owner is away for several days after one round of questions. This plan runs autonomously and publishes at green milestones.

## 1. Owner decisions (2026-09-29)

| Topic          | Decision                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Publishing     | Repo public as-is and GitHub Pages on. Push to `main` at green milestones after a review pass, with a git tag per milestone (`f0`, `f1`, …) for rollback.                                                                      |
| Hardware       | Broad, including phones and tablets. Full touch play: virtual stick, adaptive layout, auto-detected quality tiers and a PWA install. Desktop gets higher tiers.                                                                |
| Gameplay scope | All four directions: marine life (old Phase E), progression and upgrades, richer exploration (secrets, wreck interiors and a real ROV role, samples, dynamic events, dive ratings), and a free-dive sandbox with a daily dive. |
| Assets         | CC0/CC-BY plus procedural or hand-built. Every file gets an `ATTRIBUTION.md` row, and the attribution check enforces this.                                                                                                     |
| Look           | **Cinematic realism**, like a documentary series such as Blue Planet: realistic materials and light, with visibility and colour lifted so scenes are always readable and beautiful. Darker with depth, never frustrating.      |
| Fiction        | Real sites stay factual. Plausible unnamed additions (a small wreck, a cave, a chimney field) are allowed and are labelled as game additions in the Journal. No fully fictional sites.                                         |
| Cuts           | Free to cut, merge or redesign. Every cut and its reason goes in `CHANGELOG.md`.                                                                                                                                               |
| Audio          | Richer SFX plus an adaptive ambient score with its own volume slider.                                                                                                                                                          |
| Branding       | A full rebrand (name, logo, UI style) is allowed.                                                                                                                                                                              |
| Agents         | Claude Opus 5.5 and Sonnet 5.5 subagents do almost all coding. Codex "newest Sol" (gpt-6.1-sol when it appears, else gpt-6-sol, high effort) does exploratory work: research, bug hunts and audits of new work.                |

Standing direction still applies:

- Playability first, with Arcade as the default.
- Objectives stay fixed per site.
- No repeated "illustrative/reconstructed" caveats in player text.
- Keep the HUD uncluttered.

## 2. Pillars for this phase

1. **Every frame is a postcard.** Cinematic light, rich materials, particles and life. Screens at 30 m, 1,000 m and 4,000 m are each beautiful and distinct.
2. **Simple hands, deep world.** Controls stay arcade-simple on keyboard, pad and touch. The depth comes from what there is to find, not from managing systems.
3. **Always something to find.** Every site has a hero set piece, secrets, life and a reason to come back: upgrades, ratings and the daily dive.
4. **It's real (and says so once).** Sites, depths, species and facts stay sourced. Embellishments are plausible and tagged once in the Journal.
5. **Runs everywhere.** Phones get a good-looking low tier at 30+ fps. Desktops get the full show.

## 3. Waves and packages

The rules for every package:

- Each package runs in its own worktree (`../subexp-wt/<pkg>`, branch `claude/<pkg>` or `codex/<pkg>`) and owns the files listed below.
- It ends with `tools/gates.sh` green, screenshots in `.cache/codex/shots/<pkg>/` and a short `plan/progress/<pkg>.md`.
- The orchestrator merges, reviews the screenshots and reruns the gates on main.
- After each wave, a Codex audit hunts bugs and regressions in the merged work, fix packages follow, and then comes a push and a tag.

### Wave 0 — foundation and research

| Package     | Agent        | Owns / output                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F0-PUBLISH  | orchestrator | Push, make the repo public, enable Pages and verify the live site. **Done 2026-09-29.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| F0-CORE     | Opus         | This is a no-behaviour-change refactor so that wave 1 can run in parallel. It will: split `main.ts` into `src/app/` systems (one file per system with init/update/dispose, plus a registration list); split `styles.css` into per-module CSS files; split `world/props/Procedural.ts` into per-family builder files (wrecks, vents, reefs, geology, generic); add **quality tiers v2** (low/medium/high/ultra, auto-detection including mobile, dynamic resolution scaling, `window.__game.perf` draw-call and triangle counters); add an **asset service** (GLTF/Draco/KTX2/Meshopt loaders, a texture cache, a manifest); and add a `CHANGELOG.md`. |
| F0-RESEARCH | Codex (net)  | `docs/research/`: per-site visual reference notes (substrate, colour, light, fauna, set-piece shape and scale); a CC0/CC-BY asset shortlist (textures, HDRIs, models, sounds, including NOAA public-domain hydrophone audio) with direct URLs and verified licences; a species shortlist per site with behaviour notes.                                                                                                                                                                                                                                                                                                                               |
| F0-AUDIT    | Codex        | `plan/progress/F0-AUDIT.md`: bugs, performance hotspots, fun gaps and code-health risks in the current build, ranked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| F0-ARTBIBLE | Sonnet       | Starts after F0-RESEARCH. It rewrites `docs/art-direction.md` as the Phase F art bible: depth-band palettes and grading, material rules, vehicle design language, creature style, UI language and three name/brand directions with a recommendation.                                                                                                                                                                                                                                                                                                                                                                                                  |

### Wave 1 — the world looks real (parallel after F0-CORE)

| Package     | Agent | Owns                                                                                                                                                                                                                                                                                                                                                |
| ----------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1-OCEAN    | Opus  | Lives in `src/render/*`, `world/Water.ts`, `shaders/underwater.ts` and the post stack. It adds filmic tone mapping and depth-band grading, bloom, volumetric headlight beams, surface god rays and a Snell's window seen from below, better scattering and fog, soft marine snow and particulates, and shallow caustics. Everything is tier-scaled. |
| F1-TERRAIN  | Opus  | Lives in `world/Terrain*`, `shaders/terrain*` and a new `world/scatter/*`. It adds a PBR triplanar material from CC0 texture sets, per-site biome palettes, near-field detail normals, and instanced scatter (boulders, pillow lava, sediment ripples, sponges and sea pens, rubble) placed by slope, depth and biome.                              |
| F1-VEHICLES | Opus  | Lives in `sub/SubMesh.ts`, `rov/RovVisual.ts` and a new `vehicles/*`. It builds a detailed procedural hero sub (a pressure-sphere viewport, syntactic foam, thrusters with animated props, strobes, manipulator arms, bubbles), three distinct hull-class vehicles, a detailed ROV with a tether, and a cockpit/viewport camera mode.               |
| F1-WRECKS   | Opus  | Lives in `world/props/wrecks*`, plus the Titanic, Bismarck and Endurance prop data. It builds high-detail wrecks with rusticles, debris fields, readable silhouettes and interiors stubbed for wave 2.                                                                                                                                              |
| F1-GEO      | Opus  | Lives in `world/props/{vents,reefs,geology}*`, plus the other sites' prop data. It adds black smokers with plumes, the Lost City carbonate towers, Lophelia mounds, the Great Blue Hole stalactites and walls, caldera and trench features, and one hero set piece per site.                                                                        |
| F1-TOUCH    | Opus  | Lives in a new `core/Touch*`, a PWA manifest and service worker, and the mobile bootstrap. It adds a virtual stick and buttons, gestures, device-tier detection hooks, installability and offline caching of visited sites.                                                                                                                         |

### Wave 2 — more to do

| Package     | Agent                  | Owns                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F2-LIFE     | Opus (+Sonnet content) | Lives in a new `world/life/*`. It adds instanced, steering-driven marine life with LOD and bioluminescence: 20–30 procedural species (vent fauna, jellies, siphonophores, anglerfish, dumbo octopus, sharks and rays in the shallows, whales passing overhead), per-site tables from OBIS, and scanning, photos and Journal entries. |
| F2-PROGRESS | Opus                   | Lives in `game/Progress*` and a new Upgrades UI. It adds research points from discoveries, an upgrade tree (lights, sonar, battery, thrusters), hull classes that gate the deepest sites (making crush depth meaningful), vehicle unlocks, liveries, a 1–3 star dive rating and a save migration.                                    |
| F2-EXPLORE  | Opus                   | Lives in `game/Secrets*`, `game/Events*` and the ROV. It adds hidden secrets per site, sample collection with the manipulator arm, dynamic events (whale fall, plume surge, turbidity flow, passing whale), an ROV-only wreck-interior mission and rewards for sonar sweeps.                                                         |
| F2-MODES    | Sonnet                 | Simplifies the modes (Arcade and Realistic, with Custom moved into an "Advanced" disclosure). It adds a free-dive sandbox, a seeded **Daily Dive** and an "exaggerated currents" choice, and logs the cuts.                                                                                                                          |

### Wave 3 — identity and feel

| Package     | Agent         | Owns                                                                                                                                                                   |
| ----------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F3-BRAND-UI | Opus          | The new name and SVG logo, a live 3D title scene, a responsive, mobile-first HUD and menus, typography and icons, and the README and `index.html` meta tags.           |
| F3-AUDIO    | Opus / Sonnet | Richer SFX (thrusters, hull creaks, sonar, creatures), NOAA hydrophone ambience, an adaptive generative score keyed to depth and discovery, and a music volume slider. |
| F3-ONBOARD  | Sonnet        | A short first-dive tutorial at a shallow site, contextual hints and a controls card that adapts to keyboard, pad or touch.                                             |

### Wave 4 — polish and release

- Codex audits of the whole game: bugs, mobile performance (emulated devices), accessibility and content facts.
- Sonnet fix packages.
- Docs: README, architecture, settings, `CHANGELOG.md` and STATUS with a playtest #6 checklist for the owner.
- Tag `v1.0`.

Ordering can flex. If a wave-1 package finishes early, the next package that doesn't overlap it may start. Wave-2 packages depend on F1 set pieces for placement only; LIFE and PROGRESS can start once F0-CORE lands.

## 4. Operating rules

- **Budget floors:**
  - Claude keeps at least 20% of its 5-hour window, and Codex at least 5%. Both keep at least 5% weekly.
  - Check `~/.local/bin/ai-limits --gate 20 5` before launching each package.
  - While the 5-hour window is below 30%, launch no new Opus package.
  - When a weekly window is at or below its floor, schedule the next run after that window resets (systemd timer) rather than working.
- **Parallelism:** up to four Claude subagents at once, with split file ownership, plus Codex exploratory tasks.
- **Timed restarts:** a systemd user timer runs `tools/resume.sh --headless` every 90 minutes. It exits without starting Claude if the gate fails or `.cache/orchestrator.active` is fresher than 90 minutes (the interactive orchestrator touches it). See `plan/RESUME-PROMPT.md`.
- **Publishing:** after each wave (or a large package) is merged, green, audited and screenshot-reviewed:
  - push `main` and tag it (`f0`, `f1`, …);
  - confirm the Pages deploy succeeded;
  - roll back by redeploying the previous tag if the live site breaks.
- **Records:** `plan/progress/<pkg>.md` per package, `CHANGELOG.md` for player-facing changes and cuts, `plan/OVERNIGHT-LOG.md` for unattended runs, and `plan/STATUS.md` at each milestone.
