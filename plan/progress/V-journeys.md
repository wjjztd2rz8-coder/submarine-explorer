# V-journeys: unaided Titanic and Blue Hole journeys

Baseline build `c239e5c`; fixes `0e5e512`, `f34f0c8`, `b947777` (branch `claude/V-journeys`).
Evidence PNGs are in `.cache/np/` (worktree, git-ignored), named `<site>-<viewport>-<step>-<sha>.png`.
Steps: `1home`, `2sites`, `3briefing`, `4dive-t2/t10/t30`, `5approach-*`, `6contact-ready-N`,
`7scanning-N`, `8scanned-N`, `9primary-done`, `10debrief`, `11journal-open`.

Method: Playwright (SwiftShader, Arcade defaults, fresh storage). Desktop 1280x720 flew with the keyboard and
steered only from the HUD bearing and range. Phones (390x844, 844x390) used real touch events (CDP): the stick,
the rise/sink slider and the SCAN button. No teleports were used in the full runs. Home was entered by Dive
sites (list or globe sheet) and also by the primary Dive button (`primarydive-desktop-1after-dive-*`, lands
on the Titanic briefing). The Journal was read mid-dive on all three viewports (`11journal-open`). Phones
carry only the touch-driven flow; the debrief and Journal were opened by tap.

## Verdicts

Rubric letters: R readable in 10 s, B beautiful, S simple, W rewarding, H honest, P phone-OK.

| Journey   | Viewport  | Result                   | Evidence (baseline c239e5c unless noted)                                                          |
| --------- | --------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| Titanic   | desktop   | pass (B 3.5, W weak)     | `titanic-desktop-4dive-t2`, `6contact-ready-0`, `8scanned-1`, `10debrief`, `10journal`            |
| Titanic   | portrait  | fail then pass after fix | `titanic-portrait-8scanned-0-c239e5c` (label on sub), `-f34f0c8` (clear); debrief row fixed       |
| Titanic   | landscape | fail then pass after fix | `titanic-landscape-3briefing-c239e5c` (Begin off-screen) and `-0e5e512` (Begin on top)            |
| Blue Hole | desktop   | pass with design finding | `bluehole-desktop-4dive-t2`, `6contact-ready-0`, `10debrief-c239e5c`                              |
| Blue Hole | portrait  | fail then pass after fix | `bluehole-portrait-8scanned-0-f34f0c8` (wide label on sub), `bluehole-portrait-8scanned-f34f0c8x` |
| Blue Hole | landscape | pass                     | `bluehole-landscape-3briefing-f34f0c8`, `6contact-ready-0`                                        |

## Fixed

1. **Landscape briefing hid Begin dive** (844x390: button at y 454 to 498). The short-landscape rule had made
   the footer static. Now facts sit on the left and a column on the right holds Begin dive first, then
   Free dive and Back to home, then Mode and Advanced; Advanced opens below Begin. `predive.css`.
2. **Waypoint label covered the sub** (portrait, after a scan and while approaching; also landscape and
   desktop at the opening). The label now stays inside the screen by its own half-width instead of a fixed
   130 px, sits above a target that is low in the view, is at most 40% of the screen width, and stays above the
   touch-controls band. `Waypoints.ts`, `waypoints.css`.
3. **Debrief score row ran together** ("★☆☆2 scans2 of 4 objectives") on every viewport: `.debrief-rating`
   had a `gap` but no `display: flex` (lost in the S-rewards edit). `flow.css`.

## Passed (no change needed)

- Home to briefing in two taps via Dive; Dive sites on phone portrait is a swipe-up sheet with a grab bar.
- First 60 s: the sub, seabed and a waypoint marker are visible on all viewports; touch HUD has no key names
  ("Left stick: follow the marker").
- Approach: waypoint, sonar, bearing/range text and the guidance card ("TURN 82 PORT", "CLOSE TO 192 M") are
  enough to find both Titanic scan targets with no teleport. The touch stick, slider and SCAN all work.
- Scan: hold, progress ring, NEW ENTRY card, check mark on the target.
- Primary completion banner then debrief via "Surface and debrief" (the pause-menu route was not captured).
- Journal opens on the entry just scanned, reads well on phones.
- Landscape guidance slot sits below Pause/Journal with a gap (S-hud held).
- The guidance slot did not hide an event caption behind a ready contact in these runs (the shark card at
  Blue Hole appeared as a scan target and was replaced by the next card as designed).

## Open findings (Backlog items 20 to 24 in `plan/DIRECTOR.md`)

- **Blue Hole is completable from the surface** (W, H): both primary galleries scanned from 150 to 190 m away
  at 8 to 25 m depth, so the player never enters the hole. Titanic also scans at 160 to 190 m, so the close
  view that V-titanic and V-bluehole polish is never seen. The galleries read as floating brown slabs at
  range. (`bluehole-desktop-6contact-ready-0`, `titanic-desktop-6contact-ready-0`)
- **Blue Hole opening**: the sub fills the lower half of the frame at the surface start on desktop and phone
  (`bluehole-desktop-4dive-t2`). Readable, not beautiful.
- **Journal has no picture** of what was just scanned: text only (`11journal-open`), thin as the reward.
- **Desktop HUD says the same thing four times** at the start (guidance card, objective list, "Head to the
  bow, 220 m ahead", waypoint label). Phone is cleaner.
- **Briefing Advanced** draws large empty square check boxes (`titanic-landscape-3briefing-advanced-0e5e512`).
- **Phone Home**: Journal and Settings sit under the fold (portrait clipped mid-button, landscape fully below).
- Not covered: Low tier, Realistic mode, pause menu screenshots, an unaided real-time stern approach on phones
  beyond the touch pilot above.
