# U-fresh-eyes-fixes (DIRECTOR item 39)

Fixes the medium findings from `plan/progress/U-fresh-eyes-recheck.md`.

- Debrief: the dive HUD (`.hud-regions`: sonar, readouts, objectives, bar) and scan waypoints
  hide while any debrief is open, so the 844x390 card no longer covers the sonar or crowds Journal.
- Debrief text: star-legend paragraph cut (the Next line names the next star); the scan count is
  left out when nothing was scanned (the highlight line says so).
- Short landscape Home: mode heading and one-line explanation hide so Settings/Controls fit; the
  heading returns while the Custom tag shows (caught by hud-touch 667x375).
- Journal credits: flex gap replaces the " · " separators, 13 px minimum.

Finished on 2026-11-14 after the headless run was paused mid-package; the code landed on main as
e6f291bc (taken over by another session from the same worktree). This note records the checks.

Gates: `tools/gates.sh` smoke + project-base PASS (before the Custom-tag fix). Targeted e2e over the
19 specs that touch debrief, Home and Journal: 302 passed; stale zero-scan assertions updated and the
Custom-tag regression (hud-touch 667x375) fixed.

Open failures, not caused by this package (both appear before any debrief opens):

- `f-verify-1000` great-blue-hole, 6 cases: first scan never completes; the sub sits at 8.9 m, above
  the stalactites' 10 m scan minimum. Same 8.9 m failure was seen in hosted CI run #629 on
  2026-11-01 (noted in the held 124 R-ci-speed worktree), so it predates this package; local check
  here was on 0653458c.
- `journal-debrief` "opening -> Journal -> debrief -> Home" touch journeys at 844x390 and 390x844:
  the mid-dive Pause tap does not open the pause menu. Same 6 fail on 0653458c; not independently
  checked on a commit without this package, but the failing step precedes every changed surface.
