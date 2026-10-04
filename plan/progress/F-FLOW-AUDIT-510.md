# F-FLOW-AUDIT-510 — new-player Journal/debrief flow

## Status and evidence limits

Source audit and narrow fixes complete. **Rendered audit pending:** this sandbox
rejects Vite preview with `listen EPERM: operation not permitted 127.0.0.1:4510`.
Direct Playwright Chromium launch also fails with `sandbox_host_linux.cc:41`,
`shutdown: Operation not permitted`. No screenshots were captured here. Paths
below are the capture spec's exact intended outputs, not evidence of a completed
visual review. Do not approve visual quality or mark this package fully audited
until the browser-capable gate produces and a reviewer inspects the PNGs.

Scope: Titanic, Lost City, Great Blue Hole, Beebe Vent Field and Monterey Canyon;
1600×900 desktop, 844×390 touch landscape and 390×844 touch portrait. No new
features, HUD controls, mission content, caveats or storage formats.

## Clear bugs fixed

| Finding                                                                                                                                                                                                         | Correction                                                                                             | Regression evidence                                                                                                                                                               | Screenshot to inspect after capture                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journal's body uses an implicit minimum grid width; long article content can force the body outside its allocated column. Current-site names also share a narrow nav row with a nonshrinking `THIS DIVE` count. | Constrain the body track with `minmax(0, 1fr)`, allow nav/body shrinkage, wrap nav rows and long text. | Browser checks horizontal overflow for header, nav, body and each hero's current-site button. Browser execution pending.                                                          | `.cache/codex/shots/510-f-journal-debrief-flow-audit/844x390/beebe-vent-field/07-journal-unscanned.png` and `390x844/beebe-vent-field/11-journal-assisted-scan.png` under the same root. |
| Opening a focused Journal entry retains the previous article's scroll position, potentially hiding the title and first paragraph.                                                                               | Reset the article scroll when opening the Journal.                                                     | Browser scrolls an unlocked article, closes it and opens its focused entry; asserts scroll returns to zero. Landscape requires a genuinely scrollable article. Execution pending. | `.cache/codex/shots/510-f-journal-debrief-flow-audit/844x390/titanic/11-journal-assisted-scan.png`.                                                                                      |
| Surfacing again after Keep exploring reuses the debrief panel without resetting its scroll position.                                                                                                            | Start each new summary at its heading.                                                                 | Passing unit test reopens a scrolled summary with changed stats. Browser also scrolls the actual landscape summary, resumes and surfaces again. Browser execution pending.        | `.cache/codex/shots/510-f-journal-debrief-flow-audit/844x390/titanic/12-debrief-assisted-scan.png`.                                                                                      |
| A player who has just dived at a site is told `Not visited` in the Journal. The count also claims to track visits, although unlocks actually track scans.                                                       | Use `No scans logged` and count `sites with scans`, matching the existing unlock rule.                 | Browser checks the new label after 60 seconds at a site without a scan, then checks an actual scan removes the locked article. Execution pending.                                 | `.cache/codex/shots/510-f-journal-debrief-flow-audit/390x844/monterey-canyon/07-journal-unscanned.png`.                                                                                  |

The two scroll fixes are show/hide lifecycle bugs, verified from the code. The
width fix addresses definite CSS constraints; the magnitude and appearance of
any previously clipped text remain unverified without a rendered before image.

## Confusion, clutter and design questions

These are source-based questions for director review, not claimed observations
from unavailable screenshots. Keep changes beyond the clear bugs above out of
this package.

1. **Home / confusion:** `Continue` starts the saved site's mission again rather
   than resuming a persisted underwater pose. Its disabled first-player tooltip
   says to start a mission. Is that restart meaning clear enough on touch?
   Inspect `1600x900/titanic/01-home.png` and `13-return-home.png` beneath the root.
2. **Chooser / clutter:** the list offers all 13 missions, per-site summaries,
   hull metadata, stars and Journal progress; the five heroes are not a separate
   first-player path. Does the list read as a choice of experiences or a set of
   unfamiliar depth/hull requirements? Inspect
   `.cache/codex/shots/510-f-journal-debrief-flow-audit/390x844/beebe-vent-field/02-pick-site.png`.
3. **Briefing / clutter and clipped content:** facts, hazards, objectives,
   keyboard controls, mode, Advanced and start choice share a scrollable card
   with a sticky footer. On touch, the controls list is still keyboard-oriented.
   Does the first screen explain Begin and the actual touch gestures? Do the
   sticky settings leave enough space to read the body? Inspect
   `.cache/codex/shots/510-f-journal-debrief-flow-audit/844x390/lost-city/03-briefing.png`
   and `04-briefing-actions.png` in that directory. Begin and Back to home
   are existing controls; the spec exercises both.
4. **First minute / unexplained controls:** the tutorial explains motion,
   depth, lights and scanning in sequence; the HUD also includes sonar range,
   map expansion, Boost, Photo and telemetry. Are those labels understandable
   without opening Controls? Does the Scan instruction identify a visible
   target after the introductory movement? Inspect all `05-dive-start.png` and
   `06-dive-{10,30,60}s.png` captures and their manifest panel rectangles. The
   script does not establish that a human can find a target within 60 seconds.
5. **Great Blue Hole / direction and reward:** its mission surveys the atoll
   edges, while the free-dive hero is the stalactite grotto. The eastern primary
   is about 4.3 km from the hole marker. Mission spawning prioritizes a nearby
   primary when the hero pose is too far away. Should the director review judge
   the mission opening or the scenic Free dive opening? This audit follows
   **Dive sites → mission**, preserving the authored objectives. Inspect
   `.cache/codex/shots/510-f-journal-debrief-flow-audit/1600x900/great-blue-hole/05-dive-start.png`
   and `06-dive-60s.png` in that directory.
6. **Journal / apparent dead end:** before a scan the site's article is locked
   and offers either a scan or spoilers; undiscovered POI rows have identical
   names. Does that teach the scan-to-Journal relationship, or look like empty
   content? The visit wording was fixed; unlocking and spoiler behavior stay
   intact. On portrait, the nav occupies 38% of the available main panel and
   scrolls independently from the article. Is the split understandable?
   Inspect `.cache/codex/shots/510-f-journal-debrief-flow-audit/390x844/lost-city/07-journal-unscanned.png`
   and `11-journal-assisted-scan.png` in that directory.
7. **Debrief / confusion:** `Surface and debrief` ends immediately; it does not
   animate a long ascent. An early end says `Dive ended`, reports zero completed
   objectives and offers Keep exploring, Dive again, Dive sites, Home and
   Journal. Is this five-choice summary clear after the first minute? RP is
   accompanied by the star explanation but may remain unfamiliar. Inspect
   `.cache/codex/shots/510-f-journal-debrief-flow-audit/844x390/monterey-canyon/09-debrief-unscanned.png`
   and `12-debrief-assisted-scan.png` in that directory.
8. **Way back:** no missing return action was found in source. Chooser → Back
   to menu, briefing → Back to home, dive → Pause, Journal → Close, debrief →
   Home/Dive sites/Keep exploring exist. The spec exercises chooser/briefing
   cancellation, Journal return to Pause, Journal return to the same debrief
   with focus restored, Keep exploring and final Home. Existing `d-flow.spec.ts`
   also covers Dive sites and Dive again. Actual reachability at all three sizes
   still needs the browser run. Inspect `08-pause.png`,
   `10-journal-from-debrief.png` and `13-return-home.png` for every route.

## Capture method and paths

Spec: `tests/e2e/f-flow-audit-510.spec.ts`, 15 independently isolated tests. Uses
plain Playwright rather than the experienced-player fixture. Saves start empty:
no progress, discoveries, tutorial completion or bypassed briefing. Uses actual
default graphics/settings, including the medium tier; the test clears CI's
low-tier storage seed. Phone contexts enable native touch input, mobile layout
and 1× screenshot scale. Service workers are blocked to avoid stale bundles.

The flow starts at `/`, picks a mission through Home, exercises Back to home,
then begins through the briefing. It performs the tutorial's move/turn, rise
and lights actions through keyboard or native Chromium touch gestures, restores
the lights, then observes the scene at 10, 30 and 60 unfrozen game seconds.
The boat is not driven toward a guessed target during those observations. No
teleport, time injection, skipped tutorial or synthetic scan occurs in the first
minute. Thus this is reproducible flow evidence, not a human usability study or
a proof of the natural time to first scan.

After 60 seconds it opens the unscanned Journal through Pause and surfaces for
an honest zero-scan debrief. It checks Journal-over-debrief return, resumes,
then performs an explicitly **assisted** first-POI scan using the existing test
teleport and scan-time helpers with the real held Scan input. Those supplemental
shots test unlocks, articles, summaries and return paths; they must not be used
as evidence that the first scan was reachable in 60 seconds. Each directory's
`manifest.json` records screenshot paths, elapsed dive time, tutorial step, scan
candidate, submarine pose and visible panel rectangles/text.

Root: `.cache/codex/shots/510-f-journal-debrief-flow-audit/`.
**All directories/PNGs below are pending generation.**

| Site            | Desktop directory relative to root | Landscape directory relative to root | Portrait directory relative to root |
| --------------- | ---------------------------------- | ------------------------------------ | ----------------------------------- |
| Titanic         | `1600x900/titanic/`                | `844x390/titanic/`                   | `390x844/titanic/`                  |
| Lost City       | `1600x900/lost-city/`              | `844x390/lost-city/`                 | `390x844/lost-city/`                |
| Great Blue Hole | `1600x900/great-blue-hole/`        | `844x390/great-blue-hole/`           | `390x844/great-blue-hole/`          |
| Beebe           | `1600x900/beebe-vent-field/`       | `844x390/beebe-vent-field/`          | `390x844/beebe-vent-field/`         |
| Monterey        | `1600x900/monterey-canyon/`        | `844x390/monterey-canyon/`           | `390x844/monterey-canyon/`          |

Every directory has these exact 15 screenshot filenames (225 PNGs total):

1. `01-home.png`
2. `02-pick-site.png`
3. `03-briefing.png`
4. `04-briefing-actions.png`
5. `05-dive-start.png`
6. `06-dive-10s.png`
7. `06-dive-30s.png`
8. `06-dive-60s.png`
9. `07-journal-unscanned.png`
10. `08-pause.png`
11. `09-debrief-unscanned.png`
12. `10-journal-from-debrief.png`
13. `11-journal-assisted-scan.png`
14. `12-debrief-assisted-scan.png`
15. `13-return-home.png`

## Validation and handoff

- Passed writable-config production build, 1,286 unit tests across 120 files
  (including `debriefReopen.test.ts`), 144 Python tests, strict content,
  attribution and repository Prettier checks. `git diff --check` clean.
- Playwright `--list` discovers all 15 matrix tests. Execution is blocked by
  sandbox permissions, not a passing browser check. Full E2E and project-base
  verification must be rerun in the browser-capable gate environment.
- Attempted `GATES_CONFIG_MODE=writable PW_PORT=4510 PW_OUTDIR=dist-flow510 tools/gates.sh --full-e2e`:
  all static gates passed again; both browser gates stopped before test execution
  because the preview server could not start. The project-base build passed.
  Logs: `.cache/gates/e2e.log` and `.cache/gates/e2e-base.log`; direct preview
  diagnosis above supplies the underlying `EPERM` error.
- Run the requested full gate with `FULL_E2E=1` in that environment:
  `GATES_CONFIG_MODE=writable PW_PORT=4510 tools/gates.sh --full-e2e`.
  For focused iteration after building:
  `PW_PORT=4510 PW_OUTDIR=dist-flow510 GATES_CONFIG_MODE=writable npx playwright test tests/e2e/f-flow-audit-510.spec.ts`.
- Next review: inspect all 225 actual PNGs and manifests, resolve any browser
  assertion failures, annotate observed clipping/overlap and natural scan
  confusion separately from these source-based questions. Capture before/after
  evidence if a further fix is needed. There are no before/after PNGs here.

No generated images or build outputs are committed. Screenshot caches are
gitignored and must travel with the gate artifacts for the director review.
