# Status — 2026-09-24 Phase D (playability) complete

This is the current handoff. Earlier checkpoints, including the Phase C
close-out and the original Claude pacing/model instructions, are preserved in
[the status archive](archive/STATUS-before-2026-09-23-closeout.md) and
[the Phase C close-out snapshot](archive/STATUS-before-2026-09-24-phase-d.md).
Do not use historical pending lists to repeat completed work.

## Phase D (playability) — complete

All Phase D packages from [`plan/PHASE-D-PLAN.md`](PHASE-D-PLAN.md) and
[`plan/PHASE-D-CONTRACTS.md`](PHASE-D-CONTRACTS.md) are implemented and merged
to `main`:

| Package     | One line                                                                                                                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-MODES     | Arcade (default) / Realistic / Custom gameplay modes: speed, descent, lights, sensors, visual hints, start position, battery/oxygen, currents, sim speed                                                                          |
| D-CONTENT   | A plain-language what/where `hint` on every objective in all 13 `mission.json` files; the validator now requires it                                                                                                               |
| D-INPUT+HUD | New key defaults (R/V pitch, Space rise, Ctrl-or-C sink, Shift boost, F scan, Q camera, `ping` removed), mouse-drag/wheel camera, UI-scale HUD, contextual F prompt, sim-speed badge                                              |
| D-SHELL     | Home title screen (globe + Continue/Dive sites/Free dive/Journal/Settings/Controls) and `Esc` pause menu; retires the old `O`/`N` hotkeys                                                                                         |
| D-SCAN      | Per-dive scan state (no free re-scans), scanned markers in the world/sonar/objectives, `Waypoints` (world marker, edge arrow, in-range cue) gated by the visual-hints setting                                                     |
| D-START     | Near-site default spawn (~100–200 m from the first primary objective, lights on); surface start is an explicit briefing/settings option                                                                                           |
| D-FLOW      | Fresh objectives every dive, a "Primary objectives complete" banner with Keep exploring / Surface and debrief, an honest X-of-Y debrief, and the Journal (Civilopedia-style site/POI/species catalogue) replacing the field guide |
| D-SONAR     | POI/objective/scanned-state icons, zoom levels (250 m/500 m/1 km/2 km/whole tile) via `M` and the mouse wheel, clearer default-palette relief                                                                                     |
| D-POWER     | Optional battery/oxygen (off in Arcade, on in Realistic), clear warnings, a safe automatic emergency ascent on depletion, sourced to WHOI's Alvin specs                                                                           |
| D-CURRENTS  | Offline per-site HYCOM current grid (`data/currents/<tile>.json`), off / gentle / realistic toggle                                                                                                                                |
| D-ROV       | Tethered ROV (`E`) that flies, scans and returns, with its own visible, lit chase camera                                                                                                                                          |
| D-PHOTO     | Photo mode (`P`): free-orbit camera, hidden HUD, captioned JPEG captures saved to a Journal photo gallery                                                                                                                         |

### Owner decisions this phase

- **Arcade is the default; every realism system is opt-in.** Research-sub
  speed, realistic lights/sensors, battery/oxygen and currents all live behind
  Realistic or Custom — a new player never has to configure anything to get
  the intended "fun" experience.
- **Caveat-free player-facing text.** Hints, briefings, the Journal and field
  guide state what's real versus reconstructed once, in the relevant entry,
  rather than repeating a disclaimer in every string (`content: plain-language
hints and guide text without repeated recreation caveats`, commit `3a09672`).
- **Old D4 (marine life encounters) moved to Phase E** (future expansions,
  `plan/MASTER-PLAN.md` §6) — not a priority for playability and potentially
  expensive; deferred until after Phase D and a further owner scope decision.
- **Old D7 (surface day/night) dropped** entirely, not deferred.
- Samples, inventory and VR remain unscheduled (Tier 4 stretch in
  `plan/MASTER-PLAN.md`).

### Known nits

- No independent gamepad rebinding; gamepad buttons remain fixed to their
  Phase A/C mapping.
- Hardware/target-device performance (60 fps at 1080p on the owner's medium
  tier) is still unmeasured beyond automated checks — carried over from the
  Phase C close-out.
- Large-JS-chunk build warning and duplicate emitted Draco decoder assets are
  still present and still nonblocking (carried over from the Phase C
  close-out; not reverified in this pass).

### What's left for the owner

1. **Playtest #3.** The owner has not yet played the Phase D build. Use the
   checklist below; file findings the same way as playtests #1 and #2 did
   (which produced `plan/PHASE-D-PLAN.md` and the D-POLISH fixes,
   respectively).
2. **After playtest #3 fixes land:** the owner's go-ahead to create the
   GitHub repository and enable GitHub Pages. This was approved as a to-do on
   2026-09-23 for after Phase D (`plan/PHASE-D-PLAN.md` §3, step 10). It still
   requires the owner's **explicit confirmation before any push or repo
   creation** — nothing has been pushed or made public.

### Playtest #3 checklist

- [ ] Home screen: Continue / Dive sites / Free dive / Journal / Settings /
      Controls all work; Continue stays disabled until a dive has started once.
- [ ] Try Arcade, Realistic and Custom: speed, lights, sensors, visual hints,
      start position, battery/oxygen and currents change as described, and
      editing any single option flips the mode label to Custom.
- [ ] Controls feel right: R/V pitch, Space rise, Ctrl and C both sink, Shift
      boost, F scan (hold), Q camera, mouse-drag orbit plus wheel zoom, `Esc`
      pause menu.
- [ ] Scan a POI: it's marked scanned in the world, sonar and objective
      tracker, re-scanning says "Already logged", and the Journal entry has
      unlocked.
- [ ] Finish every primary objective mid-dive and confirm "Keep exploring"
      keeps the dive going instead of forcing a debrief; then debrief and
      check Dive again / Dive sites / Home / Journal each do what they say.
- [ ] Sonar: zoom in and out (`M` plus wheel), and confirm POIs, objectives
      and the sub show distinct icons with readable depth relief.
- [ ] Deploy the ROV (`E`), fly it to a target, scan with it, retrieve it, and
      confirm the sub's camera returns cleanly afterward.
- [ ] Enter photo mode (`P`), orbit, capture with `Enter`/`Space`, and find
      the photo in the Journal's gallery.

## Owner direction and model mapping

- GPT-6 Astra takes the orchestration/planning role; GPT-6 Sol takes
  implementation, QA and documentation roles (Claude-specific instructions
  are preserved for Claude sessions). Phase D packages were built by GPT-6 Sol
  subagents through `tools/codex-task.sh`, reviewed by the orchestrator, and
  committed at green (`plan/PHASE-D-PLAN.md` §4).
- At most two implementation subagents at once (`D-MODES ∥ D-CONTENT` and
  `D-SCAN ∥ D-START` were the only scheduled parallel pairs); the orchestrator
  reviews each package's diff and screenshots before progressing.
- No push, repository creation or Pages activation without the owner's
  go-ahead — see "What's left for the owner" above. Local CI/deployment
  preparation does not mean the site is live.

## Prior phase state (verified at Phase C close-out, unchanged by Phase D)

| Package | Implementation state                                                              | Remaining acceptance / limitations                                                                               |
| ------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A/B     | Existing foundation, atmosphere, controls, audio, Titanic discovery/mission/props | Superseded by Phase D controls/HUD; hardware performance still unverified                                        |
| C1      | Globe, keyboard controls, species tab, thinner rim, e2e and axe checks            | Globe is now opened from Home/Pause rather than a dedicated key (D-SHELL); no measured target-device performance |
| C2      | 13 real landmark tiles, inventory, compression tooling                            | No brotli files; runtime uses float32                                                                            |
| C3      | All eight presets integrated; currents, trench creaks, carbonate material support | Shimmer/brine are visual approximations; source limits documented                                                |
| C4      | All 13 landmark missions, guides, props and species files exist                   | Every objective now also carries a D-CONTENT hint                                                                |
| C5      | Settings, bindings, captions, palettes, reduced motion wired                      | Settings/bindings storage is now v2 (D-MODES/D-INPUT+HUD); still no gamepad rebinding or separate LOD slider     |
| C6      | CI and deployment workflows, filtered build and project-base URLs                 | Site unpublished; workflows not yet verified on GitHub — see "What's left for the owner"                         |

## Verification

Reviewed baseline at the Phase C close-out: build, 375 unit tests, 107 Python
tests, 42 browser tests (+1 opt-in project-base skip), attribution all pass.
Each Phase D package added its own unit/e2e coverage and Playwright
screenshots (`.cache/codex/shots/<package-name>/`) reviewed before commit,
per `plan/PHASE-D-CONTRACTS.md` §6. Re-run before the next round of work:

```bash
npm run check:content
npm run ci
```

During concurrent work, use isolated build/output directories and ports per
`CONTRIBUTING-AGENTS.md`. `npm run test:e2e:base` separately builds and
verifies `/submarine-explorer/` hosting; the ordinary browser run skips that
test.

## Next session

1. Read this status and `plan/PHASE-D-PLAN.md`/`plan/PHASE-D-CONTRACTS.md`;
   inspect git status and log. Preserve existing work; only repeat checks
   when changes justify it.
2. Run playtest #3 (checklist above) and record findings.
3. Address any findings; keep packages small and reviewed the same way as
   Phase D.
4. Once the owner is satisfied, get explicit confirmation, then create the
   GitHub repository and enable GitHub Pages (`plan/PHASE-D-PLAN.md` §3,
   step 10; `docs/deploy.md`).

Known nonblocking limits: existing large-JS-chunk warning, duplicate emitted
Draco decoder assets, software-rendering versus real GPU performance, no
independent gamepad bindings, no true refraction/reflections, and bathymetry
resolution/time limitations documented in the site guides and tile inventory.
