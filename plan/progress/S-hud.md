# S-hud: three HUD regions in normal flow

## What changed

- Sonar, objectives, readouts, the guidance slot and the bar (Pause, Journal, Reset camera) are direct children of one `.hud-regions` grid (`src/ui/hudRegions.ts`). `hud-layout.css` only assigns grid areas; no element has its own offset.
- Portrait and landscape differ only by the grid template (two `@media (orientation)` blocks); no per-device special cases. Landscape guidance sits in the same column under the bar, a full region gap (8 px) below it rather than 4 px.
- Pause moved into the HUD bar (placed by the touch system), so touch and desktop share one bar.
- The expanded sonar map is a centred sheet that avoids the bar and touch dock.
- Desktop no longer shows the permanent sonar legend (touch already hid it). Replaced nothing; the map needs no caption.
- The ResizeObserver and `--obj-panel-bottom` plumbing in `ObjectivesPanel` are gone.
- All `/* S-hud: remove */` patches are gone (`grep` finds none in `src/`).
- Landscape card is slightly tighter (4 px padding, 1.15 line height) so Lost City's tower tip clears it by the existing 8 px guard.
- Cuts are logged in CHANGELOG.md under Changed (S-hud).

## Line counts (main -> branch)

| file                        | before | after       |
| --------------------------- | ------ | ----------- |
| `src/styles/hud-layout.css` | 697    | 301         |
| `hud.css`                   | 74     | 42          |
| `touch.css`                 | 463    | 426         |
| `input-hud.css`             | 111    | 101         |
| `flow.css`                  | 324    | 311         |
| src total (git diff main)   |        | +372 / -853 |

## Test changes (by capability, no new specs)

- Unit fixtures (touch controls, scan overlay, sonar canvas helper, overlay focus) gained the DOM surface the regions need; children indices follow Pause leaving the controls root.
- `hud-touch.spec.ts` extended with the regions and landscape-gap checks. Phone objective-panel expectations now match the S-guidance design (the panel shows only its completion banner on phones), in `hud-touch` and `journal-debrief`.
- `f-sonar-palette-1200.spec.ts` reads the map's CSS width from `--map-w`; `f3-onboard` matches "left stick" case-insensitively (the copy is "Left stick").

## Gates

- `tools/gates.sh --full-e2e` was started (python, content, build, unit all PASS) but the 797-test e2e suite on one worker takes hours, so it was stopped and replaced by targeted specs. Full unit suite: 190 files, 2208 tests pass. `tsc --noEmit` and prettier clean.
- Targeted e2e on the final build, all passing: hud-touch (except the animal guidance matrix), opening-framing, f-sonar-palette-1200, f3-onboard, journal-debrief frozen-debrief, plus a 244-test batch (d2-_, d-currents, d-polish, d-start, f1-fixes, f2-_, f-arcade-access, f-copy-regress, f-verify-*, f-lowtier-followups, settings, globe, visual-qa, f-save-soak, sub-playtest, f-title-layout) and a 333-test batch (touch, input HUD, scan, sonar, power, photo, hazard, onboarding, first minute, text diet, a11y, events, mission, smoke, briefing, bughunt 880/960).
- Not run: f-bughunt-1090 (long idle renders), perf budget, title scene/audit, other long specs.
- Failing identically on main (unchanged by this package): `d-modes` (scanRadius 400 vs 480), `d-shell` home menu button count (9 vs 8), `d-sonar` whole-tile/sensor range, and the eight `hud-touch` "animal guidance placement" tests (hint never appears; 1.5 min timeouts).

## Screenshots reviewed (`.cache/codex/shots/hud-touch/layout/`)

`regions-desktop-1280`, `regions-phone-landscape`, `regions-phone-portrait`, `mission-phone-landscape`, `opening-tablet-landscape`. Three regions are clear, nothing overlaps, no legend, landscape guidance has a visible gap under Pause/Journal.

## Open issues

- The waypoint label sits over the sub on phones after a scan (known V-journeys item, not HUD layout).
- The Titanic tablet opening (3774 m) is very dark; scene lighting, not HUD (V-titanic).
- The animal-hint e2e matrix fails on main as well and needs its own repair, so animal-guidance placement is unverified by e2e.
