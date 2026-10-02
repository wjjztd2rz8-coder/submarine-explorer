# F2-EXPLORE — implementation ready; browser verification blocked

## Player changes

- All thirteen sites have three hidden secrets and two loose-material sample spots.
  The authored positions were checked against their tile depth and local relief.
  Procedural props reuse the wreck construction kit, merge into one mesh per
  secret, and follow the detailed seabed across their footprint.
- Secrets produce faint anonymous sonar dots within 110 m in three dimensions.
  Their scan prompt appears within 45 m. Holding the existing Scan control for
  three seconds reveals the name, confirmation/chime and a persistent Journal
  entry tagged once as Game addition. Objectives and waypoints are unchanged.
- Samples have a nearby collect prompt, use the same held control for 2.5 seconds,
  deploy the vehicle's existing arms, and show a small sediment effect on low
  tiers too. Both vehicles work. The collection resets each dive.
- The Journal shows persistent per-site Secrets found n/3. Both free-dive and
  mission debriefs show that count and this dive's secrets, samples and events.
- A nine-second natural event occasionally passes nearby: vent plume, local
  canyon silt puff, marine snow or a whale above shallow canyon water. Habitat
  checks limit the kinds; scheduling waits 70–160 active seconds, followed by a
  100-second cooldown plus another quiet wait. A soft sonar-bus cue and one brief
  caption announce it; pauses and debriefs freeze scheduling.
- Typed `discovery:secret`, `discovery:sample`, `event:witnessed` bus events always
  emit. The optional `window.__game.progress.award` adds 15/10/5 RP with stable
  site/subject IDs. This checkout already has F2-PROGRESS, so its generic scan
  listener skips curiosity IDs to avoid duplicate POI rewards. Repeat subjects
  earn zero. Samples remain collectable on later dives.
- No cuts. CHANGELOG.md records the additions.

## Files

Owned additions: `src/game/{Secrets,SecretsVisual,Samples,Events,EventsVisual}.ts`,
`src/app/systems/explore.ts`, `data/secrets/*.json`,
`tests/unit/{gameExplore,exploreTerrain}.test.ts`, `tests/e2e/f2-explore.spec.ts`.
Scanner and Journal integration use their existing APIs plus a supplemental
scan-target pool, separate from wildlife and mission POIs.

## Checks

- `tools/gates.sh` with `PW_PORT=4282`: build, unit, Python, content,
  attribution and Prettier pass. Both e2e gates cannot start Vite preview:
  `listen EPERM: operation not permitted 127.0.0.1:4282` (and base port 4382).
- An offline Playwright request-interception attempt avoided a listening port,
  but Chromium also cannot start in this sandbox:
  `sandbox_host_linux.cc:41 ... shutdown: Operation not permitted`.
  Temporary offline harness removed; normal assertions were never weakened.
- Focused logic tests pass. Additional actual-terrain unit tests load every tile,
  verify all 65 placements, and complete all scans through normal submarine
  physics and the unchanged scanner cone. Rewards are tested for finite,
  idempotent persistence. Final full unit count: 705 tests in 68 files.
- `npx prettier --write` was run on every changed file; `git diff --check` passes.
- Screenshots are **not captured** because Chromium is blocked. The normal e2e
  spec writes `secret-{1,2,3}.png`, `event-marine-snow.png`, Journal, debrief and
  phone screenshots into `.cache/codex/shots/f2-explore/` when run successfully.

## Deviations (minimal integration outside OWNS)

- `src/app/systems.ts`: import/register the new system.
- `src/core/EventBus.ts`: add the three typed discovery/event contracts.
- `src/core/config/explore.ts`: separate tuning domain.
- `src/core/config/progress.ts`, `src/app/systems/progress.ts`: add reward kinds
  and skip the generic POI award for curiosity, because progression is present.
- `src/game/Discovery.ts`, `src/ui/ScanOverlay.ts`: project supplemental reticles
  and say Collect/Collecting for sample targets.
- `src/game/JournalData.ts`: load secret entries and unlock the site from a secret;
  existing POI/species totals stay intact. `src/ui/Journal.ts` displays them.
- `src/ui/Sonar.ts`: accept/draw anonymous faint contacts separately from POIs.
- `src/ui/Debrief.ts`, `src/game/MissionRouter.ts`: optional exploration provider
  for both debrief variants, including lazy mission debrief construction.
- `src/rov/RovVisual.ts`, `src/app/systems/rov.ts`: pass scanner state to the
  existing arm animation and freeze it with the rest of the simulation.
- `src/audio/AudioSystem.ts`: six-line optional soft sensor-cue facade using the
  existing sonar bus; no audio asset changes.
- `src/ui/ExploreNotice.ts`, `src/styles/explore.css`: isolated brief caption and
  module CSS; it has no new controls. Secret Journal controls are at least 44 px.
- `docs/architecture.md`, `CHANGELOG.md`, this progress note: contracts/reporting.

## Orchestrator review

Run `PW_PORT=4282 npx playwright test tests/e2e/f2-explore.spec.ts`, inspect the
three secret screenshots plus event, Journal, sample debrief and phone capture,
and rerun both browser gates in a runtime that permits Chromium and localhost.
Review rock/arch readability, the small sample effect and event opacity in those
captures before committing. No git commit was made.
