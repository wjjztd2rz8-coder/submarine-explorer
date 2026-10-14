# S-debrief: consistent per-dive discoveries and completion wording

Backlog item **S-debrief [Codex]**, brief 1640. Evidence:
`plan/progress/V-first-five.md`, phone run at SHA `66da04a`.

## Findings and changes

- `Scanner.complete()` counted every scan target, but `Discovery.onComplete()`
  returned before recording wildlife, secrets or samples. The debrief displayed
  `SessionStats.snapshot().discoveries.length`, so four fixed POIs became “4 scans”
  despite five or six discoveries.
- “Scans” now means **distinct targets discovered this dive**, keyed by landmark
  and target ID. Fixed POIs, species, scanned secrets and scanned samples count.
  A previously logged Journal discovery counts once in a new dive; holding Scan,
  releasing/repressing or duplicate events do not add another discovery this dive.
  Resetting a dive clears these counts and retains the Journal. Scanner completion
  state updates before emitting the completion event, so listeners see the current
  count. Discovery records every scanner target in the existing session stats.
- The discovery confirmation banner names the same completed target. Unidentified
  secrets supply their revealed name for the discovery record. The mission banner
  continues to count **objectives**, independently of all scan discoveries: the
  reported five/six-discovery cases still complete three of four objectives.
- `summarizeDive()` previously selected the first discovery. It now selects the
  latest distinct discovery, so the reported route names “Stern section”; a later
  wildlife or curiosity scan becomes the highlight instead.
- `debriefText()` previously used “Mission complete” for both primaries done and
  all objectives done. Its existing title now says “Primaries complete” or
  “All objectives complete”. Partial and aborted dive wording stays intact. Stars
  remain a separate rating, including the photo/species requirement for three.

## Scope and simplicity

No layout, CSS, styling, new UI element or additional text surface. Existing count,
highlight and title fields are corrected. Existing capability specs are extended;
exact browser expectations are updated to the corrected wording and latest scan,
without weakening past regression guards or adding skips. No capability cuts, so
no CHANGELOG entry is needed. `plan/DIRECTOR.md` and `tools/` are unchanged.

## Verification

- Initial focused unit run: 6 files, 73 tests passed. Typecheck caught a test JSON
  fixture requiring the existing `parseSecrets()` parser; corrected before gates.
- Completed `tools/gates.sh` using `GATES_CONFIG_MODE=writable` and retained
  output `.cache/S-debrief-dist`. A validation-only exported `npm` shell function
  appended `--pool=threads --maxWorkers=1 --reporter=verbose` to the unit command,
  following the documented sandbox workaround in `f-ci-triage2.md`. The initial
  default-fork run stalled without results and was interrupted; no tests or
  assertions were changed for the workaround.
- Build/typecheck: **PASS**, both root and `/submarine-explorer/` builds.
- Full unit suite: **PASS**, **2,050 tests / 192 files**, 604.18 s, no skips.
- Whole-repository Prettier: **PASS**. Strict content and attribution: **PASS**.
  Final progress-note formatting and `git diff --check`: **PASS**.
- Gate exit status: **1**, due to environment failures. Python ran 165 tests;
  four `test_ci_build_manifest` cases failed with `spawnSync git EPERM`.
  A standalone Node `execFileSync('git', ['rev-parse', 'HEAD'])` reproduces the
  same error independently of these changes. The other 161 Python tests passed.
- Root smoke and project-base browser gates: **blocked before test execution**,
  because the preview server cannot start. A direct preview invocation confirms
  `listen EPERM: operation not permitted 127.0.0.1:4372`.
- Attempted the three affected Titanic browser flows in `mission.spec.ts`,
  `d-flow.spec.ts` and `content-missions.spec.ts`; the preview-server restriction
  also prevents those from running. Playwright `--list` successfully discovers
  all three intended cases. Their execution is not claimed as passing.
- Complete gate logs: `.cache/runs/20261013-132202-2-fhfHZE/`.

## Remaining

No remaining implementation work. Rerun the Python and browser gates in an
environment permitting the synchronous Git invocation and local preview server;
browser behavior remains unverified here. Changes are uncommitted because Git
metadata is outside this workspace's writable roots. No merge, push or tag.
