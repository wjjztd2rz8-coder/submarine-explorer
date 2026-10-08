# F-INTEGRATE-800 — integrate 770 / 780 / 790

## Plan

1. Inspect the existing clean merges and their shared browser fixtures. Do not
   merge, commit, add features or change art.
2. Run the full gates; fix demonstrated production bugs, and update a spec only
   for an expectation made stale by a merged package. Preserve every assertion.
3. Audit hosted shard selection and estimates with 770's changed fixtures;
   record results and any remaining browser-runner limitation here.

## Packages already merged

- **770:** Great Blue Hole scenic spawn moves from a 205 m approach to 100 m;
  the actual first stalactite scan is approximately 100.2 m away. Animal guidance
  waits until eight seconds of unfrozen dive time while a scan card is visible,
  without consuming the unseen hint. Safety priority and the twelve-second
  animal-hint lifetime remain. Browser follow-ups explicitly advance the paused
  toast clock and normalize resident GPU allocations before exact soak checks.
- **780:** Titanic alone fades its distant seabed into the existing fog colour
  over 300–1,100 m of view depth, with abyss-depth activation. Its horizon sphere
  holds the fog colour above level before easing into dim upper water; Low uses
  the matching unlit colour path. Foreground and other sites retain their paths.
- **790:** Hosted browser tests use controlled clock/frame advancement, wait for
  navigation/content/textures, and handle only the verified auxiliary-page axe
  closure race. Verification retains its 90 frames with a scoped CI budget.
  Hosted timing import includes completed retry costs. The merged workflow
  actually has **30 shards**, rather than the brief's 20; no workflow change was
  made during this integration. Both counts were audited below.

## Specs touched and expectation changes

**Integration edits: none.** No assertion was removed, relaxed or replaced. The
full browser suite has not executed locally, so no browser failure is inferred
from its inability to start the preview server.

Relevant inherited edits, already present at the start of 800:

- `f-toast-placement.spec.ts` (770 over 790): replaces the stale immediate-animal
  timing assumption with eight seconds of `page.clock.runFor`, preserving all
  eight viewport/site cases, exact device text, containment, overlap, wrapping,
  spacing and dismissal checks. This is the inherited stale expectation caused
  by 770's opening delay.
- `f-save-soak.spec.ts` (770 over 790): draws resident resources after content
  readiness and fits cockpit geometry before the first warm-up. This removes
  first-draw allocation-history races; exact boot allocation equality, four
  dives, twelve restarts, migration and movement checks remain.
- 790 also changes `d-currents.spec.ts`, `f-debrief-720.spec.ts`,
  `f-flow-audit-510.spec.ts`, `f-verify-650.spec.ts`, `f3-onboard.spec.ts` and
  `helpers/clock.ts` for frame/readiness/navigation synchronization and scoped
  software-GPU timing. Its toast changes wait for discovery readiness. These
  are fixture corrections, not new expected product behavior.
- Inherited unit coverage includes 770's Blue Hole opening, hint/completion and
  cockpit warm-up regressions; 780's horizon regression; and 790's clock and
  timing-import regressions. The merged unit gate passes them together.

## Shard audit

Local and `CI=true` Playwright JSON discovery are identical: **456 cases**, with
**22 statically skipped / 434 statically runnable**. Additional runtime skips
cannot be determined by discovery. For both 20 and 30 shards, every complete
title matches exactly one actual `shardGrep` regular expression; all 456 cases
are assigned, and reversing discovery order gives the identical balanced plan.
770 changes fixture bodies, not test titles or the roster, so its eight toast
cases and one soak retain their hosted timing keys and are selected exactly once.

| Plan                        | Estimated minimum     | Estimated maximum     | Spread |
| --------------------------- | --------------------- | --------------------- | ------ |
| 20 shards                   | 1,220.7 s (20.35 min) | 1,223.1 s (20.39 min) | 2.4 s  |
| 30 shards, current workflow | 812.8 s (13.55 min)   | 816.4 s (13.61 min)   | 3.6 s  |

The eight toast cases occupy eight separate shards in both plans; soak is on
shard 7 in both. Stored toast costs are 4.4–19.0 seconds and soak is 373.9
seconds, including prior completed attempts. Those hosted measurements predate
770's eight-second frame-by-frame advance and allocation warm-up. Selection
and arithmetic balance pass; **post-770 hosted throughput is not established
by this audit**. No local timing or invented measurement replaces hosted data.

As an explicit sensitivity calculation, charging each toast its existing CI
240-second test budget gives the worst shard 1,456.8 seconds for 20 shards and
1,051.5 seconds for 30. Charging each toast two such attempts, with the existing
single CI retry, gives 1,696.8 and 1,291.5 seconds respectively. These are
hypothetical costs with every other stored estimate held fixed, not observed
durations. The 20-shard retry scenario exceeds the unchanged 1,500-second suite
cap; preserving 790's 30-shard configuration retains more headroom. Refresh
timings from the next complete hosted run using `tools/e2e-update-timings.mjs`.

Audit evidence: `.cache/integrate800-discovery.json`,
`.cache/integrate800-discovery-ci.json` and `.cache/integrate800-shards.json`.
The CLI `--plan` wrapper encounters sandbox `spawnSync npx EPERM`; direct
Playwright discovery succeeds, so the audit imports the same exported
`collectTests`, `balanceTests` and `shardGrep` functions against that JSON.

## Gate results

Command: `GATES_CONFIG_MODE=writable tools/gates.sh --full-e2e`, with the supplied
`PW_PORT=4370`. Writable configuration avoids writes through the shared
`node_modules` symlink. The command exits **1** because browser startup fails.

| Gate                          | Result                                                        |
| ----------------------------- | ------------------------------------------------------------- |
| Writable config bundle        | PASS                                                          |
| Production build / TypeScript | PASS                                                          |
| Unit                          | PASS — 1,438 tests, 140 files                                 |
| Python                        | PASS — 144 tests                                              |
| Strict content                | PASS                                                          |
| Attribution                   | PASS                                                          |
| Repository Prettier           | PASS before this report; report formatting checked separately |
| Full E2E                      | BLOCKED — preview server exits before any test executes       |
| Project-base                  | Build PASS; E2E BLOCKED at preview startup                    |

Logs: `.cache/gates/{config,build,unit,python,content,attribution,prettier,e2e,e2e-base}.log`.
A direct loopback bind probe confirms `EPERM: operation not permitted` on
`127.0.0.1:4800`; evidence: `.cache/integrate800-bind-probe.log`.
No screenshots or rendered visual verification are claimed. Final report
formatting and `git diff --check` pass.

## Remaining acceptance

The integration remains **pending full browser gate feedback**, not declared
release-ready. The outside-sandbox orchestrator must run
`tools/gates.sh --full-e2e` against this tree and return any failures for the
remaining authorized fix rounds. Existing package reports alone do not prove
the merged suite green. No merge or commit was performed.
