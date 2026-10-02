# F2-EXPLORE — reported regressions fixed; remaining gate findings documented

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
`tests/unit/{gameExplore,exploreTerrain,exploreRegressions}.test.ts`, `tests/e2e/f2-explore.spec.ts`.
Scanner and Journal integration use their existing APIs plus a supplemental
scan-target pool, separate from wildlife and mission POIs.

## Checks and gate follow-up

The initial sandbox blocked localhost and Chromium. The orchestrator subsequently
ran all gates and supplied real screenshots: all non-browser gates and e2e-base
passed; e2e had 176 passes, 14 skips and three failures (Journal site-page
navigation, wildlife scan, wildlife photo caption). Those screenshots were
reviewed; the phone scan result overlapped controls and the straight chase view
hid the curiosity props behind the hull.

The restored worktree contains orchestrator checkpoint `53c5722`, including the
first regression fixes. This follow-up finishes those fixes:

- `Journal.open()` only applies a pending scan focus if no later navigation has
  changed the view. Tests cover resolved and delayed loads and newer navigation.
- `LifeSim.spawnNear()` recycles pool/species capacity, preserves tier budgets,
  and places a singleton at the requested position. Preview initialization
  survives the next simulation frame. Its explicit subject marker only affects
  photo selection after normal size, fade and framing eligibility checks.
  Offscreen previews and invisible animals cannot supply a caption.
- Sample confirmation says **Stowed for this dive**, with a compact opaque touch
  panel. The e2e now checks real bounding boxes against movement and Scan controls
  in landscape, small landscape and portrait, retaining the 44 px Scan checks.
- Curiosity screenshots use the chase camera's actual free-look controls instead
  of the photo-only `orbitRadius`. Real-terrain tests prove every target remains
  in frame and has a sightline clear of the central hull. The physics and scanner
  assertions for all 65 placements are preserved.
- Wildlife e2e teleports now snap the camera too. Photo mode's P key is consumed
  on the next frame and entering resets the orbit radius: the fixture waits for
  the viewfinder before setting its zoom. It also checks the requested spawn and
  runtime errors, keeping every prior naming/persistence assertion intact.
- The regression test completes the jelly scan through normal simulation and
  Scanner updates with the actual low-tier Monterey table and verifies photo
  captions and draw-call budgets. No existing assertion was weakened.

Current validation: 710 unit tests pass, including 19 focused regression/terrain
checks. The completed normal full gate run passes build, unit, Python, content,
attribution, formatting and e2e-base. Its browser result is **177 passed,
14 skipped, 2 failed** in 29.8 minutes. All 26 F2-EXPLORE/F2-LIFE tests pass,
including all three originally reported failures. The remaining failures are
unchanged `mission.spec.ts` timing checks: one metre of descent within a fixed
1.5-second wait, and real dive-time advancement during a two-second wait.
They also reproduce separately at the normal default quality. On this software
renderer, the repository's configured CI low tier passes both unchanged checks
with `--retries=0` (2/2). The additional full CI attempt passes the six
non-browser gates but hits an existing low-tier photo brightness assertion in
`d-photo.spec.ts`: mean 4.25 against the unchanged >8 threshold, on both attempts.
That photo test passed in the normal full run. The CI attempt was stopped after
this separate rendering finding; its partial log is preserved. No assertions or
quality configuration files were changed.

The normal full-run result is recorded above from the completed gate output.
Its saved log copy contains only startup output, so it is retained as
`.cache/codex/f2-explore-regular-e2e-startup.log`, not as a complete transcript.
The extra CI partial log is `.cache/codex/f2-explore-ci-e2e-partial.log`.
Seven gates passed in the completed normal run, with e2e reporting the two
mission timing failures. **The full gate set is not green.**

The corrected wildlife photo test also passes three consecutive repeats. Its
fixture waits for the viewfinder before adjusting zoom, avoiding the orbit-radius
reset on entry. All three originally reported failures pass in the normal full suite.

Browser startup succeeds in the resumed environment. An initial focused run hit
`EROFS` when writing screenshots: `.cache/codex/shots` was a symlink into the
orchestrator's read-only checkout. That local ignored symlink was renamed to
`shots-orchestrator`, and `shots` is now a writable worktree directory. Original
orchestrator captures are preserved. Screenshot assertions were not skipped.
One photo repeat also raced a rebuild of its serving directory; subsequent
checks use a completed, unchanged bundle.

The real captures in `.cache/codex/shots/f2-explore/` have been reviewed:
`secret-{1,2,3}.png`, `event-marine-snow.png`, `journal-secret.png`,
`sample-debrief.png`, `phone-sample.png`, `phone-small-sample.png`, and
`phone-portrait-sample.png`. Secrets sit beside the hull, the snow burst is
visible over the seabed, and sample confirmations remain legible and clear of
thumb controls. Existing HUD/sonar panels overlap on small phones; this is
outside F2-EXPLORE ownership and is noted for the orchestrator.

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
- `src/world/life/{LifeSim,Life,agent}.ts`: minimal explicit-preview repair for
  the two supplied wildlife failures, preserving natural spawning and naming.
- `docs/architecture.md`, `CHANGELOG.md`, this progress note: contracts/reporting.

## Orchestrator review

Inspect the three secrets, event and phone captures in this worktree's
`.cache/codex/shots/f2-explore/` before committing. The local directory is no
longer a symlink to the main checkout. The wider phone HUD/sonar overlap belongs
to the touch/HUD layout owner; curiosity panels clear the actual touch controls.
Review the small wildlife preview deviation alongside the regression tests.
The default-quality software-renderer timing failures above should be reviewed
by the performance/clock owner. The additional CI low-tier photo brightness
finding belongs to rendering/lighting. This package does not change physics,
Time, render exposure, or default quality to accommodate those checks.
No git commit was made by this agent.
