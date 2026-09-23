# Phase D briefs — systems depth

Status: **proposed, awaiting the owner's Phase C playtest** (2026-09-23).
These briefs implement the planning step in `plan/RESUME-PROMPT.md`; they do
not authorize Phase D code. No Phase D runtime changes have been made.
Original Claude roles remain in the master plan. For OpenAI sessions use
GPT-6 Astra for orchestration/review and GPT-6 Sol for every package below.

## Phase C retrospective informing this draft

Read `plan/QA-C.md`, its close-out addenda, `plan/STATUS.md`, and
`plan/DECISIONS.md` first. All 13 sites now have missions. Automated loading
and targeted scan tests support integration; teleport-assisted tests cannot
establish natural navigation quality or whether long dives feel enjoyable.
The owner still needs to assess that experience.

Lessons carried into these briefs:

- Keep warnings, objectives, scan prompts and captions readable together.
  The Challenger Deep overlap required a content-dependent layout fix.
- Make short primary routes and explicitly optional long excursions.
  Resource systems must not turn the existing real distances into a chore.
- Record reconstruction and sampling limits in the guide. A species record
  is not evidence for a population density or a particular encounter.
- Modal pause, remapping, saved state and deployment-base URLs are shared
  contracts. New mechanics must pass those integration cases too.
- Software-rendered QA does not verify the owner's 1080p/60 fps target.
  Record actual renderer and hardware with any performance claim.

## D0 — owner playtest and contract pass (gate, no implementation yet)

The owner should try Titanic, a vent, a canyon, Challenger Deep, and one
shallow site using ordinary navigation. Record whether finding/scanning feels
clear, which journeys drag, whether controls and visibility work, and whether
gentle resource pacing is desirable. The owner may change the sequence below.

After that review, the orchestrator resolves the feedback and writes
`plan/PHASE-D-CONTRACTS.md` before delegation: optional content keys, versioned
save records, event payloads, mission completion/recovery rules, URL/debug
hooks, file ownership and performance budgets. Do not silently change existing
content schemas or ship a speculative migration. All D packages use the
common preamble in `plan/WORK-PACKAGES.md` and repository conventions.

## Recommended implementation order

1. D1 photo mode and D2 optional resource pacing; separate source lanes,
   serialize changes to `main.ts`, input, Config and CSS.
2. Review/playtest those additions before D3 observations and D4 marine life.
3. D5 currents data, D6 ROV and D7 surface cycle, each reviewed separately.
4. D-QA then documentation reconciliation. Ship each accepted package
   independently; do not wait for every stretch system to land.

At most two Sol subagents at once. Every package reports screenshots, exact
checks, source/licensing evidence when relevant, and incomplete acceptance
items. No new runtime dependency without a concrete reason. No live data API
calls from the game.

## D1 — photo mode (GPT-6 Sol)

Owns: new `src/game/PhotoMode.ts`, `src/ui/PhotoMode.ts`, focused tests,
`docs/photo-mode.md`; coordinated adapters in CameraRig/Input/main.

- Build on the existing P orbit view; distinguish entering photo mode from
  changing camera view. Freeze simulation, mission clock and new resource
  clocks together. Restore the prior camera/input state on exit.
- Provide keyboard-operable hide/show HUD, bounded camera orbit/zoom, reset
  framing and local image download. Respect reduced motion. Prevent cameras
  from going through terrain and existing prop collision bounds.
- Download the rendered scene with optional site/depth/source caption.
  Explain that the image is a game reconstruction. Preserve attribution;
  never imply a scientific photograph. Handle export failure visibly.
- No cloud gallery or account service. Do not add WebGL
  `preserveDrawingBuffer` permanently just to support export; render/capture
  on demand and release temporary resources.

Acceptance: pause/restore tests, keyboard/focus and reduced-motion tests,
nonblank export at two depth bands, export under a project base, screenshot
review. Existing scan and mission completion behavior remains intact.

## D2 — optional battery/oxygen pacing (GPT-6 Sol)

Owns: pure `src/game/Resources.ts`, `src/ui/ResourcesPanel.ts`, tests,
`docs/resources.md`; coordinated Config/events/settings/mission adapters.

- Offer an exploration setting that leaves resources unlimited. In paced
  mode use generous, tunable endurance and clear return guidance. Establish
  numeric budgets from the Phase C playtest, not guessed physical accuracy.
- Advance consumption on unfrozen gameplay time. Define speed-multiplier
  semantics explicitly; do not make 3× navigation burn three times as much
  oxygen unless the owner specifically chooses that behavior.
- Separate oxygen (time) from battery (baseline, thrust and optional loads).
  No real diving/safety claims. HUD values and warnings must be accessible
  and fit beside mission objectives at the tested desktop sizes.
- Depletion produces an explained safe recovery/debrief and a retry option,
  retaining discoveries. Never kill the crew, erase progress, force grinding,
  or strand the player. Recover once; avoid competing crush/depletion loops.
- Restart and switching missions reset run-local resources. Pause for every
  modal, background policy and photo mode must be explicit and consistent.

Acceptance: pure clock/consumption/threshold tests including large deltas;
combined depletion/crush/restart tests; full mission in both modes; no hidden
resource loss during pause; save migration and UI accessibility checks.

## D3 — observations and samples (GPT-6 Sol)

Owns: `src/game/Observations.ts`, `src/ui/Notebook.ts`, optional content
definitions, tests, `docs/observations.md`.

- Add a small research notebook and optional observation objectives. Reuse
  scan range/facing rules; do not create a second inconsistent targeting
  system. Keep current `scan`/`all_primary` missions backward compatible.
- Default to non-invasive observations. Any sample interaction must be
  explicitly authored for a suitable site and described as simulated.
  Titanic, Endurance and Bismarck have no collecting, salvage or loot.
- Keep notebook entries source-linked, with reconstruction/confidence
  labels. Separate run objectives from persistent discoveries and notebook
  entries, with a new versioned save contract where needed.
- Bound inventory/notebook storage, support deletion/reset and unavailable
  storage, and avoid making collection a requirement for existing missions.

Acceptance: optional/malformed files fail safely, memorial exclusion tested,
idempotent collection, persistence/reload/reset, optional objective through
debrief, keyboard operation and source labels in screenshots.

## D4 — marine life encounters (GPT-6 Sol)

Owns: `src/world/life/**`, `tools/build_encounters.py`, encounter files,
tests, `docs/marine-life.md`.

- Derive authored encounter candidates offline from existing OBIS exports.
  Keep provenance, geographic/depth filters and uncertainty; do not turn
  microbial-only or empty exports into invented fish assemblages.
- Separate taxonomy records from chosen artistic encounter placements.
  No claim that a species is present at a precise coordinate today. Define
  unsupported taxa behavior in the contract; an empty scene is acceptable.
- Use licensed or clearly labelled representative procedural models.
  Start with bounded deterministic motion, then small schools where suitable;
  avoid seabed/prop penetration and combat or pursuit mechanics.
- Tier-dependent active counts, distance culling, shared materials and
  deterministic seeds. Do not allocate per-frame vectors or render every
  catalogue record. Reuse discovery/guide interfaces for observations.

Acceptance: deterministic motion bounds, depth/geography filtering, empty
data, terrain avoidance, low-tier behavior, attribution, screenshots at two
sites, measured incremental calls/frame cost on available hardware.

## D5 — offline currents field (GPT-6 Sol)

Owns: `tools/build_currents.py`, `src/world/currents/**`, optional tile
adjacent current files, tests, `docs/currents.md`.

- First establish which licensed dataset actually represents the site and
  depth. Surface ocean vectors must not be presented as measured abyssal
  currents. Record time coverage, units, vector direction, grid convention
  and limitations; use the existing artistic preset fallback when unsupported.
- Propose a separate optional file, without changing bathymetry binaries.
  Offline stdlib pipeline, cached/reproducible inputs and explicit provenance.
- Interpolate safely across the declared grid; cap gameplay effects. Specify
  precedence with canyon/vent presets so currents are not applied twice.
  Outside coverage or for malformed files, recover to the documented fallback.
- Show bearing/speed and data-versus-interpretation context in the guide or
  HUD without implying a live ocean forecast.

Acceptance: coordinate/unit/interpolation tests, missing-data and out-of-bounds
cases, frame-rate and pause checks, preset precedence, offline build and
project-base loading. Do not claim scientific accuracy beyond source coverage.

## D6 — deployable ROV (GPT-6 Sol)

Owns: `src/game/ROVSession.ts`, `src/sub/ROV.ts`, ROV UI/mesh, tests,
`docs/rov.md`; coordinated input/camera/discovery integration.

- Explicit state machine: stowed, deployed, returning. Park the crewed sub
  safely; show which vehicle is controlled and how to return. Bind actions
  through the input map, with keyboard and standard gamepad defaults.
- Bound operating range, depth, and tether reach with soft constraints.
  One vehicle owns scan/camera input at a time. Returning, restarting or
  switching missions cannot leave the camera or discovery system orphaned.
- Reuse narrow height/collision interfaces and existing scan/guide services.
  No simulated tether solver in the first package. No wreck interior claims
  until there is actual traversable geometry and reviewed content.
- In resource mode, define whether launch/return draws from the sub or a
  separate ROV battery. Always allow safe recovery and preserve discoveries.

Acceptance: state transitions/recovery tests, range/collision constraints,
input handoff and pause, scan attribution to the correct site, restart while
deployed, keyboard/remapping, camera screenshots and measured render cost.

## D7 — surface day/night (GPT-6 Sol)

Owns: new environment clock module, Water/Atmosphere adapters, tests,
`docs/surface-cycle.md`.

- Provide an explicitly simulated start-time/time-rate setting. No implied
  real astronomical position unless the implementation actually calculates
  it from the site/date and cites its method.
- Blend surface light, sky/lid and shallow caustics continuously. Deep water
  remains dark and headlights remain useful. Keep existing depth-band and
  preset modifiers composed in one documented order.
- Advance on the same agreed gameplay clock and freeze with modals/photo
  mode. Respect low tier, reduced motion and post-FX disabled paths.

Acceptance: deterministic clock boundaries and pause, screenshots of
day/night at shallow and abyssal sites, no accumulated lighting multipliers,
low-tier visual/readability checks, no regression in mission scan visibility.

## D-QA and documentation (GPT-6 Sol)

Run the repository gates and retained all-mission browser coverage. Add
cross-system cases: depleted battery plus ROV return, photo mode during a
warning, changed bindings, progress reset, unavailable storage, bad optional
data, explicit URL settings and project-base hosting. Measure on the actual
target devices when available; preserve unknown performance as unknown.

Write `plan/QA-D.md` with severity, reproducible steps and evidence; the
orchestrator delegates fixes and reviews them before marking completion.
Reconcile README, architecture, content contracts, controls, attribution and
resume notes to the final behavior. Publishing remains a separate owner
decision. Mobile, VR, multiplayer and dive-anywhere streaming remain Tier 4.
