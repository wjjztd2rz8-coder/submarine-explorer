# F new-player flow recapture

Date 2026-10-11. Branch `claude/f-newplayer-recapture`. Fresh player, Arcade defaults, low tier,
real keyboard/touch input, built from this branch and served with `vite preview` on port 4521.

## Captured

All four sites (Titanic, Beebe vent field, Blue Hole, Challenger Deep), desktop and 844x390 touch.

- First minute (Home, Dive sites, briefing, 60 s, Journal, debrief; desktop 1280x720):
  `.cache/np/fm/<layout>-<site>/NN-*.png`. Complete for 7 of 8 runs; `phoneland-challenger-deep`
  stopped at 09-t50 (Playwright timeout while two swiftshader browsers ran in parallel). Not recaptured:
  Challenger touch Pause/Journal/debrief.
- First discovery (briefing, scan, reward, next target; desktop 1600x900):
  `.cache/np/fd/<layout>-<site>/`. All desktop runs complete. Touch Challenger did not complete the scan in
  the first run (see finding 3). Re-runs after fixes: `.cache/np/fd2/` (Titanic and Challenger touch),
  `.cache/np/fd3/` (Challenger touch with the new hint).

Each shot was viewed. The capture tool's touch steering has no pitch/slider, so it cannot finish
Challenger on touch; that is a tool limit, not a game dead end (real players have the ballast slider).

## Findings

Fixed in this pass:

1. Touch landscape (all sites): the "New discovery +10 RP" notice was drawn behind the scan card
   (`fd/phoneland-beebe-vent-field/04-reward-a.png`, only "...scovery +10 RP" visible). Now bottom-centre
   (`fd2/phoneland-titanic/04-reward-a.png`). `src/styles/hazard.css`.
2. Touch landscape / Challenger: scan card said "PITCH TOWARD TARGET" when the target was above or below
   the heading, but touch has no pitch control (`fd2/phoneland-challenger-deep/04-reward-a.png` before,
   `fd3/.../05-reward-b.png` after: "SINK TOWARD TARGET"). Added `ScanView.nearestVertDeg` (unit test in
   `tests/unit/gameScanner.test.ts`). Desktop text unchanged.

Open:

3. Medium - scan card shows the nearest contact, not the mission target. Titanic after the bow scan: card
   says "Debris field (mid-site) 275 m, TURN 108 deg PORT" while the objective is the stern 692 m
   (`fd/desktop-titanic/06-next-target.png`, `fd/phoneland-titanic/06-next-target.png`). On touch, with the
   mission panel hidden, this is the only "next" signal and it points at an optional contact.
   Not fixed: changing nearest selection touches Scanner semantics and its tests.
4. Medium - phone landscape top-centre stack (scan card + tutorial strip) occupies about 195 of 390 px and
   covers the subject when it is high in view (`fd/phoneland-great-blue-hole/01-t00.png`: the gallery
   reticle sits under the tutorial strip). Needs a layout decision (strip to bottom-centre, or auto-collapse
   once the first move is made).
5. Low-medium - tutorial still shows "Step 1 of 5: Move and turn" / "Push left stick forward" after the
   first scan and next-target card (all `fd` shots). Pinned by Codex 1240 tests (early-scan semantics), so
   left alone; the tool scans without a real move, which a human typically would not.
6. Low - Challenger (desktop and touch): the chase camera puts the sub in front of the lander, hiding the
   scan subject (`fd/desktop-challenger-deep/02-in-range.png`); the in-world label "Leggo lander site - am..."
   truncates and sits under the reticle.
7. Low - touch briefing at 844x390 scrolls: the objectives list and facts are cut at the sticky Begin dive
   bar (`fm/phoneland-titanic/03-briefing.png`). Begin dive stays visible; the clip is a scroll cue only.
8. Low - desktop HUD repeats the active target three times (mission panel, scan card, world label). Readable,
   not cluttered enough to cut now.
9. Tooling - `tools/firstdiscovery-shots.mjs` touch steering ignores pitch/ballast; add slider drag via CDP to
   complete Challenger on touch. Run the two tools sequentially, not in parallel, to avoid timeouts.

Checked and fine: Home, Dive sites, desktop briefing (HUD behind is correctly under the scrim), Pause
menu, Journal (0 / 84 logged, "No scans logged" tag), debrief wording ("The site is waiting for your first
scan. Next: ..."), reward card "NEW ENTRY ... PRESS J / PAUSE -> JOURNAL", no repeated "illustrative"
caveats, nothing unreadably dark (Blue Hole is bright; Challenger/Beebe lit by lamps).
