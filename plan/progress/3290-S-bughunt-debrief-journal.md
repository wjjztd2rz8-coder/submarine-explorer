# S-bughunt: first-dive debrief and Journal audit

Item ID: **S-bughunt**, DIRECTOR backlog item 9, S-verify / S-bughunt
[Codex, standing]. Pinned checkout SHA:
`6b7a7ce3df094e5600b8d9af79e63f19bd32e7e3`.

Clean audit of the five `HERO_SITES`: no supported defect reproduced in the
owned debrief or Journal modules. **Only this note is changed.** Source files
touched: **none**; no permanent test changes.

## Intake and scope

Read DIRECTOR rules, simplicity requirements and review rubric and the
OVERNIGHT-LOG tail through run 83 before tracing code; the initial worktree
was clean. Read CONTRIBUTING-AGENTS and the prior journey-copy evidence
(2870) and neighboring Journal coverage to avoid repeating completed work.
The completed 3130–3270 slices were not reopened. The unmerged 2980/3050
worktrees were not modified or used as implementation dependencies.

The code trace covers Discovery's scan/session bookkeeping, Mission's scan
objectives and voluntary end/resume, MissionRouter's debrief text and Journal
action, Debrief's summary/display, JournalData's entry linkage and provenance,
and Journal's entry, site and front-page replacement rendering. An independent
read-only review also inspected debrief and Journal copy.

## Headless evidence

A temporary Vitest fixture under `/tmp` imports the real Discovery, Scanner,
Mission, debriefText, diveStars, Debrief and Journal modules. Fetch reads the
shipped local JSON, including Journal catalogue, species, wildlife and secrets;
no content loader or audited UI module is mocked. The fixture uses an EventTarget
DOM double adapted from the existing Journal capability spec, with text nodes,
parent movement and replacement semantics. It supplies a deterministic placement
floor of −5000 m, positions the scanner next to each target and respects its
minimum scan depth. This tests content/state handoff, not approach physics.
Each site starts with a fresh in-memory DiscoveryStore.

For each hero, the fixture ends/resumes an empty dive, scans the first primary,
ends it, opens the pending Journal entry, refreshes, visits the site/front pages,
then resumes and scans the remaining objective POIs before ending again.

| Hero            | First scanned target     | Opened Journal key                | First objectives | All-objective scans |
| --------------- | ------------------------ | --------------------------------- | ---------------- | ------------------- |
| Titanic         | Bow section              | `titanic/poi/bow`                 | 1/4              | 4                   |
| Lost City       | Poseidon carbonate tower | `lost-city/poi/poseidon`          | 1/4              | 4                   |
| Great Blue Hole | Stalactite gallery       | `great-blue-hole/poi/the-hole`    | 1/4              | 4                   |
| Beebe           | Beebe-125 black smokers  | `beebe-vent-field/poi/vents`      | 1/3              | 3                   |
| Monterey        | North canyon wall        | `monterey-canyon/poi/canyon-wall` | 1/5              | 5                   |

All five cases pass these contracts:

- Before a scan: empty discovery/new-entry lists, one first-scan invitation,
  and a locked site page without entry rows.
- First scan: exactly one discovery and one new guide entry, named after the
  actual target; exactly one `Scanned <target>.` highlight. Every mission still
  has unfinished primaries, so the next suggestion correctly offers to finish
  them. The title remains the existing voluntary-return heading; no completion
  claim is injected.
- Journal opens on the linked article, whose heading and paragraphs match the
  authored guide. Paragraphs and row keys are nonempty and distinct. Site rows
  contain the scanned entry once; unlocked site-level overview entries are
  intentional context, not additional claimed scans.
- Each first article has exactly one Recreation tag, including after refresh;
  its paragraphs contain no repeated illustrative/recreation caveat. Returning
  to and refreshing the front page leaves exactly one honesty note.
- All objectives: distinct scan counts equal the mission's distinct objective
  POIs, heading is “All objectives complete,” and the two-star next suggestion
  correctly requests a photo or species scan for the third star.

The first probe incorrectly tried to test duplicate scans by holding Scan a
second time at Poseidon. The real Scanner selected the nearby unscanned
microbial target, producing two legitimate discoveries. The fixture now scans
the intended first target once; this was a fixture assumption, not duplicate
Journal data or a product failure. No existing assertion was relaxed.

The independent review questioned the generic “entries” label for the site/POI
subtotal. The model explicitly excludes species, wildlife and finds from that
subtotal and presents their separate progress. This is a wording preference,
not a reproduced empty/duplicate entry or scan contradiction; no change made.

## Retained findings and smallest proposed fixes

No retained reproduced failure in `src/ui/Debrief*.ts` or `src/ui/Journal*.ts`.

The required Python gate retains five failures (167 tests run): four
`test_ci_build_manifest` cases fail at `spawnSync git EPERM`, and
`test_golden_tooling` fails parsing empty stdout from the golden comparison
CLI's `--report` subprocess (`Unexpected end of JSON input`). No game render
was involved: that tooling test creates tiny synthetic PNG fixtures. The
smallest next step for the four permission failures is running the unchanged
checks on a runner that permits the subprocess. For the empty report, first
capture that child process's status/stderr/stdout in the permitted runner;
no code fix is justified until its cause is established. Preserve the existing
assertions. These failures are outside owned files and remain unfixed; no
retry, skip or tool edit was made.

The run-83 orphan “m” report concerns “Get closer to scan,” emitted by
`src/game/Tutorial.ts` and `src/ui/ScanOverlay.ts`, outside this ownership.
Journal card/site depth metadata also uses ordinary spaces before `m` (for
example “about 3,800 m deep”); Debrief does not display its stored distance/depth
metrics. A break opportunity alone does not reproduce an orphan at a viewport.
Retain the logged HUD wrap for its owning follow-up. If confirmed there, the
smallest proposed text fix is a nonbreaking space between the distance and its
unit, without CSS or layout changes. No speculative replacement of authored
prose or meter formatting is included here.

## Simplicity and rubric

Net simpler: retain the existing implementation and capability specs. The
existing debrief summary/reopen, Journal groups/about and content-copy specs
already guard the relevant display contracts. The temporary integration probe
adds evidence without another committed DOM fixture, helper or package-named
spec. No new UI, settings, dependencies, save schema, per-site branches or
repeated caveats. Correct naming, honest provenance and one concrete next step
meet the nonvisual portion of the rewarding/honest/simple rubric. Readability,
beauty, composition and visual Phone-OK remain unverified here.

## Validation

- Temporary audit: **PASS, 5 hero cases**. Command:
  `./node_modules/.bin/vitest run --config /tmp/3290-vitest.config.mjs --configLoader runner --cache=false`.
  Fixture: `/tmp/3290-debrief-journal.test.ts`; output:
  `/tmp/3290-headless-audit.log`; per-site evidence:
  `/tmp/3290-headless-evidence.json` (temporary local artifacts).
- Focused existing specs: **PASS, 7 files / 137 tests**. Command:
  `./node_modules/.bin/vitest run tests/unit/debriefSummary.test.ts tests/unit/debriefReopen.test.ts tests/unit/journalGroups.test.ts tests/unit/heroMissionJournal.test.ts tests/unit/copyJournal.test.ts tests/unit/journalAbout.test.ts tests/unit/missionRouter.test.ts --configLoader runner --cache=false`.
  Output: `/tmp/3290-focused.log`.
- Required gates: **FAIL, exit 1**, command
  `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`. Config, content,
  build, unit, attribution and Prettier passed. Units: **192 files passed;
  3,776 passed / 4 existing expected failures (3,780 total)**, 510.41 s.
  Python: **167 tests run / 5 failures**, detailed above. Output:
  `/tmp/3290-gates.log`; durable per-gate logs:
  `.cache/runs/20261022-231949-15-XSVA4W/`. The wrapper correctly reported
  `FAIL gates (e2e=none)`; this is not an overall green gate result.
- Final note-only Prettier check and `git diff --check`: **PASS**. HEAD still
  matches the pinned SHA; final status contains only this new progress note.

Actual e2e mode: **none**. No browser, game rendering, screenshot, CSS/layout,
art or camera changes. The probe calls Mission.end/resume and the shared
MissionRouter debriefText function; it does not instantiate the router or
simulate the full application shell, physical transit, native browser layout,
persistence, line wrapping or real-phone interaction. It cannot establish
visual acceptance or the absence of orphan units at a particular viewport.
No merge, push or tag; tools and DIRECTOR remain unchanged.
