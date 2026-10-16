# J-journeys-repeat

Current build: `7057ab2654c912ea05bcbd0abad666d834a1e1a9`.

## Plan

- Repeat Titanic and Great Blue Hole from fresh Home storage at 1600×900,
  390×844 and 844×390 using Playwright and visible keyboard/touch controls.
- Capture Home, site selection, briefing, opening and first 60 seconds, first
  scan/reward, next objective, Journal and debrief in `.cache/codex/shots/2170/`.
- Record confusion, clutter, overlap and dead ends with severity and evidence.
  Make only small safe corrections, with capability regression coverage; send
  larger findings to the DIRECTOR backlog.
- Repeat affected flows after fixes and run `tools/gates.sh --full-e2e`.

## Progress

- Read DIRECTOR simplicity rules and earlier journey evidence.
- Built the current source in an isolated preview output using writable config
  mode (the shared dependency tree is read-only).
- Replaced the local ignored screenshot symlink, which pointed outside this
  writable checkout, with a local directory at the requested path.

## Method and scope

Fresh browser contexts, default Arcade settings, device scale 1, Chromium's
software WebGL (auto-selected Low tier). Desktop uses actual key events; phones
use CDP touch events on the stick, ballast slider, Scan, Journal and Pause.
Navigation reads the visible guidance, waypoint and telemetry. No teleports,
target-coordinate reads, scan-completion hooks or seeded unlocks are used in the
journeys. Read-only hooks establish loading readiness and record elapsed dive
time/tier. Playwright advances its paused clock in 125 ms frames so screenshot
readback cannot consume a reward or add movement. This is a gameplay/layout
review, not real-phone performance evidence.

The journey covers the first minute and the next-objective handoff, then opens
Journal and voluntarily surfaces through Pause. An incomplete debrief after one
minute is expected, not a mission failure. The exploratory desktop baseline also
completed both primaries at both sites. Round 1 serves the unmodified build;
round 2 serves the guidance correction.

Harness corrections: a mouse click on the phone Journal switched input mode and
moved its button; those captures were replaced by tap-only runs. Lost preview
processes also required retries. These are not game bugs.

## Completed journey matrix

All twelve fresh journeys have Home, picker, briefing, opening, 10/30/60 s,
first scan attempt, first reward, next-objective state, Journal, Pause and debrief
captures. Every required PNG has the requested viewport dimensions. The timed
60 s captures are at exactly 60 s of the dive clock. Touch reruns correct the
harness's multi-touch release handling; invalid mouse/failed-preview captures
are excluded from the index.

| Site      | Viewport | First objective reward (both rounds) | Round 1 handoff                                     | Round 2 handoff                | Journal / debrief                    |
| --------- | -------- | ------------------------------------ | --------------------------------------------------- | ------------------------------ | ------------------------------------ |
| Titanic   | 1600×900 | 18 s                                 | Logged bow can cover stern directions               | Stern and turn shown           | Pass; one primary at 60 s            |
| Titanic   | 390×844  | 19.5 s                               | Logged contact can cover stern directions           | Stern and turn shown           | Pass; one primary at 60 s            |
| Titanic   | 844×390  | 19.5 s                               | Logged contact can cover stern directions           | Stern and turn shown           | Pass; one primary at 60 s            |
| Blue Hole | 1600×900 | 11.5 s                               | Logged gallery can cover eastern-gallery directions | Eastern gallery and turn shown | Pass; primaries complete within 60 s |
| Blue Hole | 390×844  | 11.5 s                               | Logged gallery covers eastern-gallery directions    | Eastern gallery and turn shown | Pass; primaries complete within 60 s |
| Blue Hole | 844×390  | 11.5 s                               | Logged gallery covers eastern-gallery directions    | Eastern gallery and turn shown | Pass; primaries complete within 60 s |

Evidence index: `.cache/codex/shots/2170/index.html`; machine-readable observed
text, elapsed times, tier and paths: `index.json`. Case prefixes are
`{titanic,bluehole}-{desktop,portrait,landscape}-r{1,2}`. Standard step suffixes
are `01-home`, `02-sites`, `03-briefing`, `04-opening`, `first-10s`, `first-30s`,
`first-60s`, `first-scan`, `first-reward`, `next-objective`, `journal`, `pause`,
`debrief`. Additional captures retain exploratory full-primary Titanic completion
and the settled Home with Daily visible. All Home entries, Begin dive, Journal
close, Pause and Surface/debrief controls are reachable; no HUD/control overlap
was found in these three layouts.

## Small correction

**P1, fixed: logged contact hid the next objective.** After the gallery reward
expired, the card could stay on “SCANNED THIS DIVE / Stalactite gallery / Logged ·
Journal” while the waypoint named the eastern gallery. Phones have no mission
list, so the card withheld the turn instruction precisely when the pilot needed
it. Baseline: `.cache/codex/shots/2170/bluehole-portrait-r1-first-30s.png` and
`.cache/codex/shots/2170/bluehole-landscape-r1-first-30s.png`.

`ScanOverlay` now uses the logged-contact confirmation only when no outstanding
mission objective exists. The existing objective message takes over after the
reward. No new surface, setting, site branch, layout exception or runtime state
was added. The old confirmation remains available in free exploration.
Two cases in the existing guidance capability unit spec complete a real Scanner
target, change its objective while remaining in scan range, preserve the reward,
then require the next target and turn instruction; they also check the free-dive
fallback. Both fail on the old condition and pass after the correction (21/21
guidance tests). Logs: `guidance-before.log`, `guidance-after.log` in the evidence
directory. Round 2 screenshot verification confirms the correction in all three
layouts at both sites.

## Findings for director review

P1 means a serious guidance failure; P2 means a noticeable usability/clarity
problem; P3 means minor clutter or polish. There are no observed P0 blockers.
Paths below are relative to `.cache/codex/shots/2170/`.

| ID                   | Severity | Confusion / clutter / dead end                                                                                                                                                                                                                                                  | Evidence                                                                          | Disposition                                                                                           |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| J-contact-choice     | P2       | On the stern approach the scan card can name the optional memorial while the mission still asks for the stern; the repeat also offered the debris field after the bow. A new player can make a successful scan without advancing the named objective.                           | `titanic-desktop-r1-11-competing-contact.png`, `titanic-desktop-r2-first-30s.png` | Report; deciding how curiosity contacts relate to mission guidance needs design review.               |
| J-picker-density     | P3       | The site picker shows four long cards at desktop height; Blue Hole is the tenth entry and starts with “Lighthouse Reef”. Finding the requested place requires scrolling and reading substantial text.                                                                           | `bluehole-desktop-r1-02-sites.png`                                                | Report; shorten/reorder through a picker design pass.                                                 |
| J-desktop-repetition | P3       | The next destination/turn appears in the guidance card, mission navigation block and world marker; the large mission list is also visible.                                                                                                                                      | `titanic-desktop-r2-next-objective.png`                                           | Report; consolidate in the existing HUD model.                                                        |
| J-bluehole-opening   | P2       | The bright, large submarine occupies much of the opening foreground; the gallery reads as a detached hood against faceted terrace walls.                                                                                                                                        | `bluehole-desktop-r1-04-opening.png`                                              | Existing V-bluehole remainder; visual work is outside this safe fix.                                  |
| J-titanic-palette    | P3       | The bow reads as orange brickwork at approach range and the sub is much brighter than the wreck.                                                                                                                                                                                | `titanic-desktop-r1-05-first-10s.png`                                             | Existing V-titanic palette item.                                                                      |
| J-journal-preview    | P2       | The Journal now has an image, resolving the earlier report's text-only reward. In portrait the tall image and repeated memorial note put the actual entry below the fold; the debris-field entry's capture prominently shows the bow.                                           | `titanic-portrait-r1-journal.png`                                                 | Report; review preview framing/height and entry identity.                                             |
| J-wildlife-handoff   | P3       | Wildlife “NEW ENTRY” cards can interrupt the next-gallery directions again soon after its reward. The debrief can consequently highlight a shark and show three scans but only one objective; the counts are correct, but mission progress is easy to confuse with discoveries. | `bluehole-portrait-r2-debrief.png`                                                | Review with J-contact-choice; preserve discoveries while clarifying their relationship to objectives. |
| J-atoll-transit      | P2       | After the two nearby primary galleries, the next optional target jumps to about 4.3 km away. “Finish the remaining objectives for 2 stars” does not signal that travel cost; the briefing's expanded site description does, but is collapsed in the initial view.               | `bluehole-desktop-r1-first-60s.png`, `bluehole-desktop-r1-debrief.png`            | Report; review optional-route expectations in site data/copy.                                         |

Additional P2 visual finding: the primary-completion banner's transparent cyan
fill and cyan heading have poor contrast over Blue Hole's bright water on touch,
where the objectives panel has no dark backdrop. Evidence:
`.cache/codex/shots/2170/bluehole-portrait-r1-first-60s.png`. Buttons remain
reachable. Report as **J-completion-contrast** for the visual review; no colour
tuning is included in the overlap/hint correction.

**J-home-controls, P2:** Home's Controls entry on touch opens the keyboard/pad
rebinding settings (“Choose an action, then press a key”, mouse drag/wheel and
key names), rather than the touch How to play guide used from Pause. Evidence:
`.cache/codex/shots/2170/home-landscape-r2-controls.png`. It is reachable by
scrolling the Home menu, but does not explain the on-screen stick/slider. Report
for unifying the Home and Pause guide routing without adding another dialog.

## Verification

- Current build and focused guidance tests pass. The complete static gate run
  passed: 166 Python tests, strict content validation, build/typecheck, 2,321
  unit tests in 191 files, attribution and repository formatting.
- Full gates started before the correction; superseded that run with checks and
  a full, unfiltered browser phase against the corrected retained build through
  `tools/gates.sh`. Browser workers are four; no assertions are loosened.
- Final matrix, screenshot index, remaining findings and gate results pending.

The browser gate also exposed a wall-clock assumption in the existing current
advection capability test. A 1.2 s sleep could finish between software-GPU frames
and report zero displacement. A diagnostic run showed positive current drift
through actual frames. The spec now uses the existing `waitForFrames` helper
(three frames, same 1.2 s minimum), retaining the exact positive-advection
assertion. The isolated rerun passes; no current simulation code changed.

Coverage auditing also found that the shard runner selected 778 of 795 discovered
tests: JSON reports tags without `@`, and inline tags were appended a second
time. The runner now normalizes the prefix and avoids repeating inline tags.
Three cases in the existing e2e-shard capability unit spec cover reported,
prefixed and inline tags; all 28 focused guidance/shard tests pass. A real
Playwright discovery audit now selects **795/795**, with no missing cases
(`coverage-before.json`, `coverage-after.json`). The 17 previously omitted render
cases are being run separately against the same build so none is silently lost.
