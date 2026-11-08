# U-copy-fixes-2 (2026-11-07)

Item 2b on plan/DIRECTOR.md. Evidence: `plan/progress/U-retest-walkthrough-5.md`, "Proposed U-* items" and findings 2-7. Branch `claude/U-copy-fixes-2`, worktree `/home/vijay/subexp-wt/U-copy-fixes-2`.

## What changed

1. **U-opening-card-touch-name (done).** The first touch move card names the marker's destination, as desktop does. `src/game/Tutorial.ts` `tutorialText`, touch branch: "Drag to follow the marker." becomes `Follow the marker toward <destination>.` The destination is the existing `approachTo` label (the site's `opening.mission.destinationLabel`, falling back to the POI name). No site branches. With no destination the old fallback "Drag to move and turn." is unchanged. The "Drag" verb was dropped to match desktop's wording, and to keep the line shorter on a phone.
2. **U-debrief-next-names-primary (done).** When exactly one primary is still open, the debrief "Next" line names it: "Next: Scan the stern." (title from `mission.json`, `src/game/MissionRouter.ts` `showDebrief` sets `objectives.remaining`; `src/ui/Debrief.ts` `summarizeDive` uses it). With two or more open, the generic "Keep exploring to finish the primary objectives." stays. `DebriefStats.objectives` gained the optional `remaining` field (`src/game/Objectives.ts`). The rating-based "Next" lines (stars 1-3) still come first, as before.
3. **U-scan-interrupt-cue (done).** After a scan drop (`facing` or `released`), the tutorial card on the scan step keeps the cue instead of falling back to "STEP 3 OF 3 Hold G on a glowing target.": kicker `SCAN INTERRUPTED` on desktop, text `BEAM OFF TARGET` or `HOLD G TO RESUME` (touch: `HOLD SCAN TO RESUME`). A `range` drop keeps the existing "Get closer to scan · N m" line. The cue lasts until the next scan starts, the scan completes, the step advances or a new dive starts (`Tutorial.dropReason`, set from the `scan:aborted` payload in `src/app/systems/onboard.ts`). Reuses the scan card's own words, so no new element.
4. **U-depth-card-level-approach (done, touch only).** The touch slider card "Right slider: up to rise, down to sink." is hidden while no target is in reach (`scanner.view.nearestInRange || objectiveInRange` false). The rule is `depthCardWaits(device, inReach)` in `src/game/Tutorial.ts`, used by `src/app/systems/onboard.ts` to withhold the depth card. Display only: the depth step's progress is unchanged, so a slider hold made on the approach still completes it (an earlier version gated progress too; that broke the touch journey tests that hold the slider on the approach, and was narrowed). Desktop and gamepad are unchanged.
5. **U-objective-distance-hidden (investigated, no fix; finding below).**

## Why the distance is hidden (item 5)

Two things combine, and only the second is layout:

- `src/ui/ScanOverlay.ts` `messages()`: the objective card detail is the turn cue whenever the turn is 10° or more ("TURN 59° STARBOARD"), by design ("one action per line: a turn cue replaces the distance"). The distance is still carried in the card's ring label (`ring.label = "<n> m"`).
- `src/styles/hud-layout.css`, `@media (orientation: landscape)` under touch: `.guidance-slot[data-kind='objective'] .guidance-ring { display: none }`. The narrow landscape card hides the ring to stop the distance wrapping. So on landscape touch the distance is not drawn at all while a turn cue holds the detail line. Confirmed in the walkthrough frame `bluehole-landscape/45-guide-140.png` (card "OBJECTIVE / Stalactite gallery / TURN 59° STARBOARD", no ring). Portrait touch and desktop still draw the ring with the distance.

Why it lasted 330 s: the rule player never turned onto the gallery (turn stayed 59-66°), so the turn cue held the whole time. A player who turns would see the distance return once the turn is under 10°. Not a clear bug: the turn-over-distance choice is deliberate, and the fix is a layout decision (show the ring in narrow landscape, or put distance in the detail line, which means a two-action line). Left for S-hud, which owns the layout model. Suggested direction for S-hud: keep one readable distance on landscape touch without a per-breakpoint rule.

## Tests

- `tests/unit/guidance.test.ts` "is one short line on touch and names the destination elsewhere": the touch expectation changed from "Drag to follow the marker." to "Follow the marker toward Bow section.", and the fallback and the three dropped-beam cue strings are pinned.
- `tests/unit/f3Onboard.test.ts`: new "depth card on approach" (touch waits out of reach, other devices never wait); new "keeps the drop cue on the scan step until the next scan starts".
- `tests/unit/missionRouter.test.ts`: the debrief-stats expectation gains `remaining` (the one open primary's title, or none). Same assertions otherwise.
- `tests/unit/debriefSummary.test.ts`: new "names the one primary still open, and stays generic with more than one".
- E2E:
  - `tests/e2e/f-bughunt-960.spec.ts`, touch block: the slider-card and scan-step assertions now run only when a target is in reach at that pose. The Blue Hole pose starts on the approach, where the card is correctly hidden; that case asserts it is hidden. The tutorial dismissal moved to just after the assisted-scan teleport (in reach), because the opening dismissal can no longer finish the tutorial on an approach pose. The assertions for in-reach poses are unchanged.
  - `tests/e2e/journal-debrief.spec.ts`: the "Next" line for the Titanic bow-only dive is now "Next: Scan the stern." (remaining primary named).
  - `tests/e2e/f3-onboard.spec.ts`: unchanged (its touch pose starts in reach).
- Run results (targeted, own build): `f-bughunt-960`, `f3-onboard`, `journal-debrief` have only the four pre-existing failures on `main` (`journal-debrief` "two-objective scan journey", 390x844 and 844x390, titanic and great-blue-hole). The same four fail on the base commit 816e86fa.
- Smoke gate: `PW_PORT=5391 tools/gates.sh` runs `tests/e2e/smoke.spec.ts` only, so the three specs above were run separately.
- No assertion guarding a real past bug was loosened.

## Not done / follow-ups

- Desktop approach card "Hold Space to rise or Ctrl to sink." (walkthrough-5 Titanic desktop at 28.8 s) still shows on the approach. The item asked for touch; the same depth gate could apply to desktop if the owner agrees. Not changed.
- Stale drop cue: "BEAM OFF TARGET" persists until the next scan starts, even if the player flies away. Acceptable for now; a time or range expiry would be the next step if it reads wrong on a phone run.
- Landscape touch objective distance (item 5), see above: S-hud.
- Touch "Follow the marker toward <site>." can wrap to two lines on a phone for long destination names. Not measured on device.
- Walkthrough-5 Q1 seabed latch and the fish-lock item are separate (U-seabed-latch-hides-scan is done; U-scan-fish-lock-landscape is a separate Sonnet item).
