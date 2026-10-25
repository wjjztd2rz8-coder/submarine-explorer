# S-bughunt: hull access, rewards and ratings

Serves DIRECTOR Backlog **7, S-verify / S-bughunt**.
Audited HEAD: `0c9abdded00ea0a974f4a43b621f102340815b71` (pinned before work;
initial status clean). Includes the unresolved-objective rating fix and the
LifeSim integration-order fix. HEAD remains unchanged; no merge, push or tag.

## Confirmed defect: stale completion-banner stars (fixed)

The completion banner snapshots its stars when it opens. Earning the dive's
photo/species bonus while it remains open does not update those stars, although
`Progress.previewStars` immediately increases and surfacing displays and saves
the higher rating. This is a numeric text-state defect; no layout assessment is
needed to reproduce it.

Reproduction using the real Progress, Scanner, progress-system listeners,
MissionRouter and ProgressSave, with an EventTarget element double:

1. Resolve one primary POI and leave the other objectives unresolved. Start,
   scan that primary and advance beyond the completion-banner delay.
2. The banner reads `★★☆`; preview and eventual rating are two stars.
3. Award the species bonus while the banner is open and advance another frame.
   The banner still reads `★★☆`, but `previewStars` returns **3**.
4. Surface. The actual debrief reads `★★★`, and reconstructing Progress from
   stored bytes returns best **3**.

The same mismatch occurs with the photo bonus and fully resolved content.
Before-fix output in `/tmp/hull-progress-audit/probe-before.log`:

```text
bonus-banner-before-surface: banner=★★☆, preview=3
router-bonus: display=★★★, rating={stars:3,points:0,best:3}, savedBest=3
```

Fix: MissionRouter refreshes the existing preview callback while the banner is
open. ObjectivesPanel extracts its existing star writer into `setBannerStars`,
using the existing text cache to skip unchanged writes. It updates both text
and the accessible star count, without reopening the banner or changing its
countdown. The method and behavior are described in `docs/missions.md`.
No change to rating eligibility, historical bests, rewards, mission state or
save format.

Exactly **one regression test** was added to the existing
`tests/unit/missionRouter.test.ts` capability. It covers photo and species
bonuses in one test, a two-to-three-star update, accessible text, the original
20-second dismissal deadline, the real debrief and the saved three-star rating
and reward tokens. No guarding assertion was weakened.

Before-fix command:

```bash
npm test -- --configLoader runner --cache=false tests/unit/missionRouter.test.ts
```

Exit **1**: **52 passed / 1 failed**, **651 ms**. The new regression fails at
expected `★★★`, received `★★☆`. Log:
`/tmp/hull-progress-audit/regression-before.log`.

After the fix, the disposable probe explicitly asserts the refreshed banner:
`banner=★★★, preview=3`; debrief and reloaded best are also **3**.

## Other probes and actual results

All diagnostics live under `/tmp/hull-progress-audit/`; none is a committed
package-named test. They load real TypeScript modules with Vite's module
runner, use in-memory storage, and never launch a browser, renderer or socket.
The router element double supplies tree/event operations only.

| Boundary                    | Actual result                                                                                                                                                                                                                                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partial POIs at start       | One resolved primary, one missing primary and one missing optional: **1/1**, primary-complete, preview **2**, finish `{stars:2,points:0,best:2}`; reload exactly matches snapshot.                                                                                                                                                                        |
| Late initial resolution     | Starting before `discovery.ready`, then resolving the same partial set before scanning produces the same counts, events, rating and saved bytes as resolving before start.                                                                                                                                                                                |
| Debrief before POIs arrive  | Real router can surface with zero scans and zero stars while loading, resume, then resolve/scan the available primary. Completion banner, debrief and reloaded best agree at **2**. An empty real Scanner emits no objective completion while waiting.                                                                                                    |
| No primary resolves         | Only the optional POI resolves and is scanned: counted **1/1**, no primary completion banner, preview and saved rating **0**. The debrief uses the existing all-resolved-objectives heading. No primary or rating reward is inferred.                                                                                                                     |
| Resume and improve          | One-star surface, resume, finish the optional POI and scan a species: best improves to **3**. Later one-star and aborted finishes retain best **3**, the exact awarded set and zero modern balances. Snapshot mutations do not affect live state.                                                                                                         |
| Abort after primaries       | Both crush and supply aborts finish at **0**, cannot resume, and create no rating tokens. Already logged scans/objective/primary/species tokens remain. Real router debrief displays `☆☆☆` and reload retains best **0** for a fresh site.                                                                                                                |
| Preview after abort         | Calling `previewStars` directly after abort still returns **3** for completed objectives plus bonus; it deliberately has no abort argument. Production uses it for the live completion banner, clears that banner on emergency ascent, and passes `endReason === 'abort'` to `finish` for the debrief. No saved/displayed abort-rating defect reproduced. |
| Hull boundaries             | **189 checks**: three save shapes × before/after downgrade/reload × three modes × seven depths. A through **1,000 m**, B above that through **6,500 m**, C above that (including 11,000 and deeper fallback). `canDive` stays true.                                                                                                                       |
| Awarded set versus unlocks  | Modern hull access has no points/reward threshold. Cosmetic red requires **3 discoveries**: two POIs plus primary/rating tokens do not unlock it; adding one species does. Selecting red and attempting an aborted downgrade retains it through reload. Three discovery identities remain three despite nine total reward tokens in the resume case.      |
| Points and legacy migration | Modern awards/finishes/reloads leave points and lifetime **0**. A v1 fixture with POI/objective/primary/two-rating tokens and battery level 1 migrates to lifetime **85**, spendable **45**, best **2**. New modern discovery plus aborted finish and three save/reload cycles preserve those balances, best and awarded set exactly.                     |
| Partial legacy evidence     | A discovery for only the first of two authored primaries grants its POI/objective credit, completes backfill, clears dive bonus and awards **0** stars. Migration does not invent completion from absent scan evidence.                                                                                                                                   |
| Shipped content / Journal   | All **13 sites**, **52 placed POIs**, **49 mission objectives**; **zero unresolved references** after placement on real heightmaps. Every authored POI-linked guide entry unlocks after scanning those POIs.                                                                                                                                              |

The hull premise is retired: `PROGRESS_CONFIG` contains depth limits only;
`canDive` returns true and `hullFor` chooses by depth in every mode. Historical
points and purchases remain compatibility data. No fabricated hull purchase
threshold was tested or reintroduced.

Journal and reward counts are different measures by design. For example,
Great Blue Hole has four POIs and three linked guide entries; scanning all
four yields **6/6** logged site/POI entries. Axial has four POIs and yields
**8/9**, since its event sighting remains unlogged. Wildlife/species documents
were omitted from this numeric site-placement probe; existing Journal tests
cover their separate counters. Counts must not be equated to total reward
tokens, which also contain objectives, photos, primaries and ratings.

## Synthetic late-resolution limitation (report only)

A real-module API sequence exposes stale Mission lifecycle state if resolution
is changed **after an objective scan**, rather than after mission start:

```text
start; scan a (a and b initially resolved); resolve([a])
primaryComplete=true, state=diving, resolve change notifications=0,
mission:primaryComplete absent; preview=2; surface saves best=2
```

Conversely, `resolve([a]); start; scan a; surface; resume; resolve([a,b,c])`
leaves `state=primaries-complete` while the newly resolved primary is incomplete
and preview is **0**. Best remains the historical **2** after a lower finish
and reload, as required. This is reproducible module behavior, but **no current
player path was established**: Discovery loads POIs and guide together, sets
Scanner targets in that load, and the router resolves objectives on the ready
promise before the next scan frame. There is one production `mission.resolve`
call, no incremental content/POI re-resolution loop. The ready-pending real
Scanner probe confirms no scans before targets exist. No speculative lifecycle
fix or additional regression was added.

## Commands and validation

Final diagnostics:

```bash
node /tmp/hull-progress-audit/probe.mjs
node /tmp/hull-progress-audit/sites.mjs
```

Both exit **0**. Probe: **16 named scenarios**, including the two deliberately
synthetic resolution mutations, plus the live-bonus banner observation.
Sites: **13 sites / 49 objectives / zero unresolved**, `PASS`.
Logs: `/tmp/hull-progress-audit/probe-after.log`,
`/tmp/hull-progress-audit/sites.log`.

Focused capabilities:

```bash
npm test -- --configLoader runner --cache=false \
  tests/unit/missionRouter.test.ts tests/unit/progress.test.ts \
  tests/unit/progressMigration.test.ts tests/unit/missionCore.test.ts \
  tests/unit/missionAbort.test.ts tests/unit/journalData.test.ts \
  tests/unit/debriefSummary.test.ts tests/unit/debriefReopen.test.ts
```

Exit **0**, **8 files / 284 tests passed**, **1.59 s**.
Log: `/tmp/hull-progress-audit/focused.log`.

Final production build, including `tsc --noEmit`:

```bash
node --input-type=module - <<'JS'
import { build } from 'rolldown';
await build({
  input: 'vite.config.ts', platform: 'node', external: ['vite'],
  output: {
    file: '.cache/hull-progress-vite.config.mjs', format: 'esm',
    inlineDynamicImports: true,
  },
});
JS
npm run build -- --outDir /tmp/hull-progress-audit/build --emptyOutDir \
  --config .cache/hull-progress-vite.config.mjs --configLoader native
```

Exit **0**, zero TypeScript errors, Vite **780 ms**, PWA stamp completed.
Log: `/tmp/hull-progress-audit/build-final.log`. The existing large-chunk
warning remains. Configuration bundling mirrors the repository's writable
config workflow without editing or invoking a gate wrapper. Rolldown emits an
`inlineDynamicImports` deprecation warning for that temporary command.

Full final unit validation: pending.

Python command: `npm run test:py`, exit **1**, **167 tests / 5 failures**,
**18.587 s**; log `/tmp/hull-progress-audit/python.log`.
Four `test_ci_build_manifest.TestCiBuildManifest` cases fail with
`spawnSync git EPERM`. `test_golden.TestGolden.test_golden_tooling` fails in
its partial-set comparison child with `Unexpected end of JSON input`.
These signatures were already recorded in the preceding debrief/save audit;
they remain failed checks, not evidence of a progression defect. No tooling
was edited to mask them.

Harness/build attempts retained for completeness:

- Initial Vite diagnostic configuration attempted its default websocket and
  shared dependency cache: socket `EPERM`, cache `EROFS`. The final disposable
  configuration disables websocket/HMR and dependency discovery, and places
  caches in `/tmp`; the full probes then pass.
- Initial build with `--configLoader runner` exits **1**: `Vite module runner
has been closed` during the existing PWA plugin's late imports. Native
  loading of the writable bundled config succeeds, including final source.
- An initial full unit run was interrupted (exit **130**) when the confirmed
  defect justified an edit, avoiding a mixed-source validation claim. It had
  not reported results. The final full run uses the completed source.

## Scope, simplicity and limits

One small production fix and one added capability regression; one existing
star-writing path is shared between initial display and refresh. No new
screen, setting, dependency, site branch, package number in code, runtime
Config mutation, guarding-assertion relaxation, snapshot change or visual
asset. No save rewrite or historical-rating downgrade. Existing progression
and timer semantics remain covered by the focused suite.

Read CONTRIBUTING-AGENTS, DIRECTOR Backlog 7, simplicity rules and rubric, and
the OVERNIGHT-LOG tail before probing. This satisfies the numeric consistency
part of Simple/Rewarding/Honest; Readable, Beautiful and Phone-OK require the
visual lane and were not assessed. No browser, WebGL, screenshots, CSS/layout,
full interactive boot, physical journey or real-phone validation. LifeSim
population/integration is outside these progression probes; spawned animals
only affect rewards when actually scanned. No changes to `tools/` or
`plan/DIRECTOR.md`.
