# T-journey-acceptance — current captures reviewed; interrupted full gate

2026-10-28. Base/main SHA: `20f2198a874294fc49500e0d6cb85b965928af1d`.
Branch: `codex/T-journey-acceptance`. The orchestrator’s outside-sandbox run
completed all six journey cases and produced **84 fresh PNGs**. Those images
have now been inspected; the director findings below leave UI acceptance open.
The full e2e gate failed after another orchestrator killed its preview.

The driver is the existing `Home to scan and return journey` capability in
`tests/e2e/journal-debrief.spec.ts`. It covers Home, Settings/Aa, mission pick,
briefing, dive start, two held scans and following frames, both Journal entries,
and debrief. Both journey tables now reset their own capture directories, write
`sha` and ISO `capturedAt` in `manifest.json`, check the served document’s existing
golden build stamp against HEAD and the first capture, and record served
`sha`, `dirty` and `buildMode`. Opening journeys separate repeat directories and
always write the PNGs their manifest names. All existing behavior, clipping,
overlap and touch-target assertions remain intact.

The actual captures are under
`.cache/codex/shots/journeys/round-1/<site>-<size>/`. Each directory contains
exactly the 14 PNGs named by its manifest, with correct viewport dimensions,
`status: passed`, no recorded failures, and the SHA above. Capture times span
**2026-10-28T13:04:25.767Z–13:05:05.306Z**. Build metadata says production and
`dirty: true` (the tooling edits were uncommitted). An independent file/count/
PNG-dimension audit is `.cache/journey-review/manifest-audit.json`; contact
sheets used for inspection are in `.cache/journey-review/`. Original PNGs were
also opened at full viewport size for the overlap and truncation findings.

| Site            | 1280×720          | 844×390           | 390×844           |
| --------------- | ----------------- | ----------------- | ----------------- |
| Titanic         | Passed, 14 images | Passed, 14 images | Passed, 14 images |
| Great Blue Hole | Passed, 14 images | Passed, 14 images | Passed, 14 images |

This is one executed capture round. Earlier sandbox-only attempts failed before
browser startup and did not produce evidence; the outside run supersedes that
initial blocker. The harness explicitly sets POI poses, marks teleports and
pauses time. It establishes rendered scan/Journal/debrief flow, not unaided
travel between objectives or five minutes of real-time play. No dead end was
observed in the six completed assisted routes. Scrollable Journal text and
scrolling site-list boundaries were not treated as clipping defects.

Director UI findings (no art judgments; no UI fixes made):

1. Home destination ambiguity: the primary action says “Dive: Titanic dive” while the visible preview caption says “Monterey Canyon · Real GMRT bathymetry”. This occurs before selecting either site, at all three sizes. The caption and launch destination can be read as different answers to where Dive will go.

   Images: [titanic-1280x720-01-home.png](../../.cache/codex/shots/journeys/round-1/titanic-1280x720/titanic-1280x720-01-home.png), [titanic-844x390-01-home.png](../../.cache/codex/shots/journeys/round-1/titanic-844x390/titanic-844x390-01-home.png), [titanic-390x844-01-home.png](../../.cache/codex/shots/journeys/round-1/titanic-390x844/titanic-390x844-01-home.png).

2. Settings exit requires scrolling on touch: after cycling Aa to 105%, the Settings title and Close control are above the captured viewport in both phone orientations. This is extra navigation to exit, not a demonstrated dead end; the harness scrolls the control back into view and closes successfully.

   Images: [titanic-844x390-02-settings-aa.png](../../.cache/codex/shots/journeys/round-1/titanic-844x390/titanic-844x390-02-settings-aa.png), [titanic-390x844-02-settings-aa.png](../../.cache/codex/shots/journeys/round-1/titanic-390x844/titanic-390x844-02-settings-aa.png).

3. Titanic landscape overlap: the initial Bow section waypoint straddles the sonar’s right edge and the bottom of the tutorial guidance. The marker name touches the tutorial border. The general HUD-region guard does not include this world waypoint label.

   Images: [titanic-844x390-05-dive-start.png](../../.cache/codex/shots/journeys/round-1/titanic-844x390/titanic-844x390-05-dive-start.png).

4. Blue Hole opening guidance confusion: the guidance slot names optional “French grunt” as the scan target while the mission’s first objective is Stalactite gallery. On phones the same slot also gives directions toward Stalactite gallery, so the target name and travel instruction refer to different things. It suppresses the introductory movement cue in these captured openings.

   Images: [great-blue-hole-1280x720-05-dive-start.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-1280x720/great-blue-hole-1280x720-05-dive-start.png), [great-blue-hole-844x390-05-dive-start.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-844x390/great-blue-hole-844x390-05-dive-start.png), [great-blue-hole-390x844-05-dive-start.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-390x844/great-blue-hole-390x844-05-dive-start.png).

5. Blue Hole landscape overlap and clipping: after the first scan, the Eastern stalactite gallery edge label runs into the right viewport edge; its lower distance/depth line shares space with the Photo/Sonar/Lights buttons. The full name is present in guidance, but the waypoint itself is cut short.

   Images: [great-blue-hole-844x390-08-first-scan-next-frame.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-844x390/great-blue-hole-844x390-08-first-scan-next-frame.png).

6. Portrait waypoint names are ellipsized: Eastern stalactite gallery becomes “Eastern stala…” and Eastern atoll drop-off becomes “Eastern atoll…”. Titanic’s optional Boiler field distance/status line is also cut short at the right edge. These labels help choose the next target, so truncation matters even though the full names appear in guidance.

   Images: [great-blue-hole-390x844-08-first-scan-next-frame.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-390x844/great-blue-hole-390x844-08-first-scan-next-frame.png), [great-blue-hole-390x844-12-second-scan-next-frame.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-390x844/great-blue-hole-390x844-12-second-scan-next-frame.png), [titanic-390x844-12-second-scan-next-frame.png](../../.cache/codex/shots/journeys/round-1/titanic-390x844/titanic-390x844-12-second-scan-next-frame.png).

7. Portrait Journal site title is ellipsized to “Lighthouse Reef / Great Bl…”, hiding the familiar Great Blue Hole name. The entry title remains readable.

   Images: [great-blue-hole-390x844-09-journal.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-390x844/great-blue-hole-390x844-09-journal.png), [great-blue-hole-390x844-13-second-journal.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-390x844/great-blue-hole-390x844-13-second-journal.png).

8. Blue Hole’s second reward says “New Journal entry”, but both gallery scans open the same “Inside the real Blue Hole” title and body. On desktop, THIS DIVE stays 4/6 and Points of interest stays 1/3 after the second scan, while debrief counts two scans. This can make a successful second primary scan appear not to have logged a new discovery.

   Images: [great-blue-hole-1280x720-09-journal.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-1280x720/great-blue-hole-1280x720-09-journal.png), [great-blue-hole-1280x720-13-second-journal.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-1280x720/great-blue-hole-1280x720-13-second-journal.png), [great-blue-hole-390x844-13-second-journal.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-390x844/great-blue-hole-390x844-13-second-journal.png), [great-blue-hole-844x390-13-second-journal.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-844x390/great-blue-hole-844x390-13-second-journal.png).

9. Journal versus scan-count ambiguity: after one scan the desktop Journal shows THIS DIVE 2/8 for Titanic and 4/6 for Blue Hole, including overview unlocks. Those totals are not the mission scan count; the visible THIS DIVE wording does not explain the distinction.

   Images: [titanic-1280x720-09-journal.png](../../.cache/codex/shots/journeys/round-1/titanic-1280x720/titanic-1280x720-09-journal.png), [great-blue-hole-1280x720-09-journal.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-1280x720/great-blue-hole-1280x720-09-journal.png).

10. One-frame stale desktop navigation: the first completion frame still names the just-scanned Bow section / Stalactite gallery beneath the mission list, whose next primary has already advanced. The following captured frame correctly names the next primary. This is transient, and the manifest confirms the transition rather than an enduring navigation failure.

Images: [titanic-1280x720-07-first-scan.png](../../.cache/codex/shots/journeys/round-1/titanic-1280x720/titanic-1280x720-07-first-scan.png), [titanic-1280x720-08-first-scan-next-frame.png](../../.cache/codex/shots/journeys/round-1/titanic-1280x720/titanic-1280x720-08-first-scan-next-frame.png), [great-blue-hole-1280x720-07-first-scan.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-1280x720/great-blue-hole-1280x720-07-first-scan.png), [great-blue-hole-1280x720-08-first-scan-next-frame.png](../../.cache/codex/shots/journeys/round-1/great-blue-hole-1280x720/great-blue-hole-1280x720-08-first-scan-next-frame.png).

The full-gate root cause is **cross-task process cleanup**, not a failed
behavior assertion. In
`.cache/runs/20261028-065238-3939384-4dQS0s/e2e.log`, tests through the crush-depth
case passed, then `[WebServer] Terminated` appeared. Every one of the 33 remaining
failures reports `page.goto: net::ERR_CONNECTION_REFUSED` at port 4372. The first
free-dive case had already loaded Bismarck before its next navigation failed.
None of the 33 reached the assertions named in the gate summary.

The sender is established in the concurrent orchestrator log
`/home/vijay/submarine-explorer/.cache/resume-20261028-0757.log`: at
**2026-10-28T13:15:38.942Z** it issued global cleanup containing
`pkill -f tools/gates.sh`, `pkill -f 'vite preview'`, and `pkill -f playwright`
while working on another worktree. That matches the abrupt boundary in this
suite. `playwright.config.ts` already starts an owned preview with reuse off;
port/build isolation cannot protect it from a global process-name kill.

Root correction: the existing e2e isolation instructions in
`CONTRIBUTING-AGENTS.md` now require cleanup by the PID or process group started
by the run and explicitly prohibit these global process-name kills. Existing
scoped cleanup in the repository does not need a new supervisor or restart
loop. The manual host command cannot be undone from this sandbox. **The full
gate needs an outside rerun without cross-task cleanup; no green full-e2e result
is claimed.** No gameplay assertion was loosened, skipped, retried away or edited
in response to these infrastructure failures.

Checks actually executed:

- Outside orchestrator `tools/gates.sh --full-e2e`: Python **167 passed**,
  content passed, build/typecheck passed, unit **4,374 passed in 192 files**,
  project-base passed, attribution passed, Prettier passed. Logs are in
  `.cache/runs/20261028-065238-3939384-4dQS0s/`.
- Root e2e: **786 passed, 51 skipped, 33 failed** after the preview kill. All six
  changed two-scan journeys and all nine opening journeys passed before it.
- Earlier local capability run: **177 tests passed in 3 files** (`journalData`,
  `gameScanner`, `e2eScan`); `.cache/journey-capabilities-unit.log`.
- Earlier local targeted `npx playwright test tests/e2e/journal-debrief.spec.ts
-g 'two-objective scan journey' --repeat-each=2` and opening selections failed
  at preview startup with sandbox `listen EPERM`. Browser checks cannot be
  re-executed from this session; current journey pass evidence is the outside
  gate, not those failed commands.
- Fresh artifact audit: all six manifests, all 84 PNG names and dimensions,
  build SHA/date/status consistency passed. No old flat-directory artifacts
  were used for acceptance or changed during review.
- Prettier for all changed files and `git diff --check`: passed after the
  follow-up documentation changes.

For a quick outside rerun, build into an owned output and run these selections
with matching `PW_PORT`, `PW_OUTDIR` and a local `FLOW_AUDIT_SHOTS` (the worktree’s
default `.cache/codex/shots` links to the shared checkout). Keep the preview
alive until Playwright completes:

```bash
npx playwright test tests/e2e/journal-debrief.spec.ts -g 'two-objective scan journey'
npx playwright test tests/e2e/sub-playtest.spec.ts -g 'fix S: free-dive loadout and spawn'
npx playwright test tests/e2e/terrain-render.spec.ts \
  -g 'wall geometry and view budgets|seabed camera states|catalog hero loading and safe approaches'
```

Then rerun `tools/gates.sh --full-e2e` outside the sandbox. The original isolated
`dist-journey-acceptance` build was removed after local verification, so rebuild
before using that output name. No rerun after the process-ownership correction
has been executed here.

Net simpler: reuse the existing build stamp/parser and journey tables; replace
the shared flat capture directory with independently reset case directories.
Add one process-ownership rule to existing test guidance. No on-screen element
or setting was added. No application, art, lighting, geometry, CSS or
`plan/DIRECTOR.md` changes; no merge, push or tag.
