# F-FIRSTMIN-620 — first-minute guidance

## Status and evidence limit

Implementation and local non-browser checks complete. **The requested live audit,
visual inspection and screenshots are pending**, not passed. Both before/after
Playwright attempts and the full E2E attempt stop before browser startup because
the sandbox rejects the preview listener (`listen EPERM`, 127.0.0.1:4262). A direct
Chromium startup also fails with `sandbox_host_linux.cc:41`, `shutdown: Operation
not permitted`. The Browser skill's runtime reports no connected browser. The
session permits no approval escalation.

There are **zero gameplay screenshots**. `.cache/codex/shots/620/run-status.json`
records the failure; `.cache/codex/620-before.log`, `620-after.log` and
`620-full-e2e.log` record the runner attempts. Do not treat the source review below
as observed player behavior or evidence that a scene rendered correctly.

Worktree check: `530-f-verify-hud-footer-touch-snow` is listed and clean; no 550
worktree is listed. The base already includes F-TOAST-550. No changes to
`src/ui/HUD.ts`, `src/styles/hud-layout.css`, footer styles, attribution code or
attribution assets. Arcade settings, vehicle physics, site starts, camera tuning
and visual tiers retain their defaults.

## Confusion, dead ends and clutter — source findings

| Finding                                                                              | Evidence and implication                                                                                                                                                                    | Disposition                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Long opening key strip competes with the active instruction                          | `cameraControlsSystem` previously kept it for 20 s and required all three steering axes before dismissal. A player who successfully moves forward still has the whole strip.                | Fixed: 12 s maximum, or fade on the first actual commanded translation/turn. A key tap with no motion and idle drift do not dismiss it.                                                             |
| Animal guidance repeats the scan card's action                                       | `onboard` offers `Animal nearby` when animals are targets, independently of the current mission target. The chip previously timed out after 9 s, but did not react to movement.             | Fixed: opening animal guidance fades on first movement, expires at 12 s, and is not newly offered after movement. Battery, hull and ROV hints still operate.                                        |
| Touch can show only the mission heading while awaiting navigation                    | Touch CSS hides every objective except `.is-current`. `setObjectives` previously rendered without selecting a current row; only a later nav update chose one, and a missing nav cleared it. | Fixed: select an incomplete primary immediately, retain the instruction while position is unavailable, and advance completed steps. Use the existing panel rather than adding another HUD card.     |
| Scan card/toast overlap concern                                                      | The merged 550 implementation already places both in `.scan-stack`, a column flex flow with an 8 px gap. Wrapped names change its natural height.                                           | Retained. New native-movement checks cover desktop, portrait and landscape, with a wrapped completion name. Existing 550 coverage includes 150% touch UI. Live geometry/screenshots remain pending. |
| “Survey” does not tell a first-time player which action to use                       | Four first-primary titles below say “Survey”; mission type is still `scan`, and the scan card supplies the hold prompt when aligned/in range.                                               | Follow-up: assess actual opening views before changing content copy. No demonstrated dead end yet.                                                                                                  |
| Navigation and the waypoint can identify different incomplete primaries              | `MissionRouter.pickNavTarget` chooses the nearest primary; `waypointsSystem` chooses the first in authored order. The nearby scan card can also refer to wildlife.                          | Follow-up: check this at each site before changing target-selection behavior. Kept outside the safe presentation fixes.                                                                             |
| Tutorial can ask for turning/depth/lights while an opening scan is already available | Tutorial order is move+turn, depth, lights, scan; scanning early only advances the tutorial if it is on the scan step.                                                                      | Follow-up: observe whether players get stuck or turn away from a ready target. No tutorial sequence or completion behavior changed.                                                                 |

## Site checklist

All 13 Home mission cards are included, not just the five cinematic sites. This
is a content inventory, **not a completed playthrough**. Navigation may select a
nearer primary than the authored first primary listed here.

| Site                 | Authored first primary instruction | Desktop / touch first 60 s |
| -------------------- | ---------------------------------- | -------------------------- |
| Titanic              | Scan the bow                       | Pending / pending          |
| Challenger Deep      | Scan Leggo's amphipod bait site    | Pending / pending          |
| Lost City            | Scan Poseidon                      | Pending / pending          |
| Monterey Canyon      | Scan the canyon head               | Pending / pending          |
| Endurance            | Scan the main hull                 | Pending / pending          |
| Axial Seamount ASHES | Scan Mushroom                      | Pending / pending          |
| Hudson Canyon        | Scan the north canyon wall         | Pending / pending          |
| Kamaʻehuakanaloa     | Survey Hiolo North                 | Pending / pending          |
| Beebe Vent Field     | Scan the Beebe 1–5 smokers         | Pending / pending          |
| Great Blue Hole      | Survey the eastern atoll edge      | Pending / pending          |
| Bismarck             | Scan the main hull                 | Pending / pending          |
| Hunga Tonga          | Survey the pre-2022 basin          | Pending / pending          |
| Blake Plateau Corals | Survey the coral mound cluster     | Pending / pending          |

## Changes and verification

- `FirstMove` checks pose changes after steering input: 0.5 m translation or 2°
  turning. It resets on a mission start, ignores noise/idle drift, and is only
  sampled during unfrozen play. The strip's deadline and fade duration live in
  `core/config/ui.ts` (re-exported by Config).
- `cameraControlsSystem` keeps first-three-dive/learned-control behavior and the
  saved Control tips preference. Learning remains independent of strip expiry.
  Pause → Controls remains available. `cameraTips.moved` is an additive test hook,
  documented in `docs/architecture.md`.
- `HintChip` fades for 250 ms before removal from the shared flow, with timer
  cleanup on replacement, dismissal and disposal. Reduced motion disables the
  transition. Movement only dismisses the animal cue; safety hints retain their
  normal triggers.
- `ObjectivesPanel` selects an instruction before navigation resolves and marks
  the row with `aria-current="step"`. The compact touch HUD and existing desktop
  list continue to use the same row.
- Unit coverage exercises actual displacement, angle wrapping, idle drift,
  deadline expiry, frozen input, reset, independent learning, chip timers and
  objective selection/progression. Existing camera reset/Lost City tests retain
  their behavior.

Final local checks:

| Check                                   | Result                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Production build / TypeScript           | Pass (`.cache/codex/620-build.log`)                                                      |
| Vitest                                  | 125 files, 1,326 tests pass (`.cache/codex/620-unit.log`)                                |
| Python                                  | 144 tests pass (`.cache/codex/620-python.log`)                                           |
| Strict content validation               | All packs pass (`.cache/codex/620-content.log`)                                          |
| Attribution validation                  | Pass (`.cache/codex/620-attribution.log`)                                                |
| Two-round Playwright registration       | 58 tests listed: 52 site visits + six guidance checks (`.cache/codex/620-test-list.log`) |
| Live baseline, fixed audit and full E2E | Blocked before startup; no screenshots                                                   |

Live overlap, rendered scene quality and real touch reachability cannot be
certified in this session.

## Reproduce the pending audit

`tests/e2e/f-first-minute-620.spec.ts` uses fresh storage and normal Home → Dive
sites → site → briefing → Begin dive. It captures Home, briefing and
0/10/20/30/40/50/60 seconds of the game's unfrozen dive time at default settings,
with manifests of pose, scanner state, objective state, visible text and geometry.
After the 10 s capture it holds forward for 1.5 s with the real keyboard or a
native CDP touch-stick gesture; after 20 s it holds scan for 4.5 s when the
rendered prompt says HOLD. It never teleports or changes time/physics. This is a
reproducible limited-action audit, not a human usability study or proof every
first objective is reachable. Two rounds preserve separate evidence.

```bash
npm run build -- --outDir dist-620
FIRSTMIN_AUDIT=1 FIRSTMIN_ROUND=after ROUNDS=2 FULL_E2E=1 \
  PW_PORT=4263 PW_OUTDIR=dist-620 npm run test:e2e -- \
  tests/e2e/f-first-minute-620.spec.ts
```

Expected evidence: `.cache/codex/shots/620/after/round-{1,2}/{desktop,touch}/<site>/`
with nine PNGs and `manifest.json` per visit (468 PNGs total across the audit).
Six additional focused checks capture wrapped scan/toast placement and movement
on desktop, portrait and landscape. These checks seed an animal to make the cue
reproducible; they are supplementary regression fixtures, not unassisted audit
screenshots. Without `FIRSTMIN_AUDIT=1`, only the six regression tests run.

Once browser execution is available, inspect each site's captures, replace the
pending cells with actual confusion/dead-end/clutter findings, and run the full
E2E suite. Retain the 530/550 file exclusions.
