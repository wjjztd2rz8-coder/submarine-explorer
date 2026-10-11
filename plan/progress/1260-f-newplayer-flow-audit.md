# 1260 — New-player flow audit

Status: **partial; visual audit blocked by this session's sandbox**. Two rounds
were attempted. No new screenshots were produced, so this report does not claim
to have verified clutter, spacing, target visibility or dead ends visually.
No visual assets, world geometry, camera tuning or content packs changed.

## Coverage and capture attempts

Fresh-player Arcade defaults, low rendering tier, real keyboard/touch input.
The first-minute tool covers Home → Dive sites → briefing → 60 s → Journal →
Surface/debrief. The discovery tool covers the first scan, reward, next target
and 10 s of continuation. These are separate fresh contexts, rather than a
single uninterrupted 60 s → successful scan → Journal/debrief run.

| Site                           | Desktop first minute / discovery | 844×390 touch first minute / discovery |
| ------------------------------ | -------------------------------- | -------------------------------------- |
| Titanic (`titanic`)            | Blocked before capture           | Blocked before capture                 |
| Beebe (`beebe-vent-field`)     | Blocked before capture           | Blocked before capture                 |
| Blue Hole (`great-blue-hole`)  | Blocked before capture           | Blocked before capture                 |
| Challenger (`challenger-deep`) | Blocked before capture           | Blocked before capture                 |

First-minute desktop uses 1280×720; discovery desktop uses 1600×900, as defined
by the existing tools. `phoneland` is 844×390 with touch/mobile enabled in both.

Round 1 built successfully, then preview failed with
`listen EPERM: operation not permitted 127.0.0.1:4396`. Both tools failed at
Chromium launch with `sandbox_host_linux.cc:41` / `Operation not permitted`.
Round 2 rebuilt the fixes and retried both tools; the same failures persisted.
The configured four-site matrix was never entered. Logs are in
`.cache/audit1260-{firstdiscovery,firstminute}.log`, their `-round2.log`
counterparts and `.cache/audit1260-preview-round2.log`.

Reproduction on a host permitting localhost and Chromium:

```bash
npm run build -- --outDir dist-audit1260
npm run preview -- --port 4396 --strictPort --outDir dist-audit1260
```

In another shell, for each round (`1260-round1`, then `1260-round2`):

```bash
FD_SITES=titanic,beebe-vent-field,great-blue-hole,challenger-deep \
FD_LAYOUTS=desktop,phoneland FD_OUT=.cache/codex/shots/1260-round1/firstdiscovery \
node tools/firstdiscovery-shots.mjs http://localhost:4396/
FM_SITES=titanic,beebe-vent-field,great-blue-hole,challenger-deep \
FM_LAYOUTS=desktop,phoneland FM_OUT=.cache/codex/shots/1260-round1/firstminute \
node tools/firstminute-shots.mjs http://localhost:4396/
```

## Confirmed defects, ranked by player impact

These findings come from current source and executable unit regressions, not
from screenshots. Items 1–2 change player behavior; the rest affect audit
coverage or evidence quality.

1. **Medium — Pause → Journal cannot finish the tutorial. Fixed.** The phone
   prompt explicitly recommends Pause → Journal, but
   `src/app/systems/onboard.ts` only credited Journal while shell state was
   `dive`. Opening it from `pause` was ignored, leaving the final prompt up
   after returning to play. Journal now counts in Pause as well as during a
   dive; opening the Home Journal does not count. Unit coverage exercises both
   states, and the touch browser regression verifies saved tutorial completion.
2. **Medium — tutorial repeats actions already performed. Fixed.** A player
   who scans immediately while “Move and turn” is current loses that event.
   After movement, depth and headlights, “Scan a target” asks for another scan;
   the original contact is already unavailable this dive. Early headlights,
   Journal and Photo actions are also discarded. Pointers:
   `src/game/Tutorial.ts:84` (`notify`, `advance`),
   `src/app/systems/onboard.ts` (scanner event wiring),
   `src/game/Scanner.ts` (`scannedThisDive`). The tutorial now remembers these
   events and bypasses completed event steps when it advances. Movement/depth
   practice, step order, the existing scan-start criterion and save format stay
   the same. It can still show movement/depth until the player does or skips
   that practice; this fix prevents later repetition, not the whole tutorial.
   The onboarding system seeds its headlight baseline after setup so initially
   enabled lamps do not count as player practice; this has a unit regression.
3. **Medium audit defect — phone Journal capture switches to keyboard. Fixed.**
   `tools/firstminute-shots.mjs:123` used Escape to close Journal and reach
   Pause. `src/ui/TouchControls.ts:209` switches out of touch mode on keydown,
   so the tail of the purported phone flow did not remain touch-only. The tool
   now taps Close and uses the visible Pause control if needed.
4. **Low audit defect — discovery has no landscape-phone preset. Fixed.**
   `tools/firstdiscovery-shots.mjs:19` previously supported desktop and 390×844
   portrait only. Added `phoneland` with the requested 844×390 touch viewport.
5. **Remaining audit limitation — phone discovery steering ignores pitch.**
   `tools/firstdiscovery-shots.mjs` computes pitch corrections and adds R/F,
   but `setStick` maps only W/A/D. `src/ui/TouchControls.ts` exposes ballast
   separately through the right slider. An approach needing vertical alignment
   can fail in automation without demonstrating a player dead end. Leave the
   input automation unchanged pending a live capture; any arrival timeout must
   be inspected before attributing it to a site.

## Checks and visual questions still open

- Current source already makes Keep exploring the primary resumable debrief
  action (`src/game/MissionRouter.ts:631`); the old zero-scan primary-action
  complaint in `f-firstminute.md` should not be carried forward as a new defect.
- Current reward card uses the objective/POI title (`src/game/Discovery.ts:214`),
  as fixed in `f-firstdiscovery-fixes.md`.
- Recheck scan/reward/tutorial overlap on 844×390 at all four sites:
  `src/styles/hud-layout.css`, `src/styles/onboard.css`, `src/styles/hazard.css`.
- Recheck target bracket/label interference and next-target readability:
  `src/ui/ScanOverlay.ts`, `src/styles/scan.css`, `src/styles/waypoints.css`.
- Recheck Home/site-picker scroll, briefing actions, touch Journal Close and
  debrief primary action: `src/styles/home.css`, `src/styles/mission-select.css`,
  `src/styles/mission.css`, `src/styles/journal-debrief.css`.
- Both capture tools catch per-context errors and print them; inspect their
  logs and failure images rather than treating process success as proof that
  every step completed. A combined successful scan → Journal → debrief capture
  is still required to close the full requested flow.

## Changes and validation

- Unit regressions in `tests/unit/f3Onboard.test.ts` cover early scan,
  headlights, Journal/Photo, duplicate events, skips and a fresh tutorial.
- `tests/unit/onboardCompletion.test.ts` checks the real onboarding system's
  scan event subscription, Journal/headlight transitions, saved completion and
  exactly one completion toast.
- `tests/e2e/f3-onboard.spec.ts` adds actual scan → later tutorial progression
  and a touch-only Pause → Journal → Close → Resume regression. Browser execution
  is blocked here.
- Focused unit checks: **4 files, 64 tests passed**, including scanner and
  rendered tutorial-copy coverage. Final build/typecheck passed; script syntax
  and `git diff --check` passed.
- `GATES_CONFIG_MODE=writable PW_PORT=4397 tools/gates.sh --full-e2e` was run.
  Build, Python, strict content, attribution and formatting passed. Unit
  collection stalled without test results; the final gate invocation bounds
  each npm command at 60 s through a shell function, so this is a **unit timeout,
  not a unit pass**. Standalone full-unit attempts with native config, disabled
  filesystem module cache and explicit file selection also stalled; the cause
  is unresolved. E2E and project-base both failed to start their preview server.
  Overall gates exit: **1**. Logs: `.cache/audit1260-gates-final.log` and
  `.cache/gates/{build,unit,python,content,attribution,prettier,e2e,e2e-base}.log`.
- Browser regressions, new screenshots and the full unit suite remain required
  before calling this audit complete.
