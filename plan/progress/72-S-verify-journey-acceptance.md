# S-verify — journey acceptance and timing inventory

2026-10-28. Audited HEAD `6608172bc1f06f0cbe2e4ce8f6b44684428f7365`,
including the merged T-journey-acceptance and S-verify-debrief-e2e packages.
Requested environment: `ROUNDS=2`. No application or test changes were made;
no demonstrated one-line correctness bug qualified for a fix. No merge, push,
tag, `plan/DIRECTOR.md` edit, or `tools/` edit.

## Ranked findings and reproduction

1. **P2 — three-repeat browser verification remains blocked by sandbox networking.**
   The targeted Playwright command exited 1 before browser assertions because
   its owned preview could not start. Direct diagnosis reports
   `listen EPERM: operation not permitted 127.0.0.1:4386`.
   **Zero browser assertions executed; flakiness is unmeasured.** This is an
   infrastructure failure, not evidence of a gameplay failure or a flaky test.

   Discovery of the exact selection with `--list` succeeds: **90 invocations**,
   comprising three repeats of six two-objective journeys, nine opening journeys,
   and fifteen summary/Journal cases. Two-objective journeys exercise Titanic and
   Blue Hole at **1280×720, 390×844, 844×390**; opening and summary cases use
   **1600×900, 390×844, 844×390**. Summary cases retain two internal reopen rounds
   independently of Playwright's three repeats. The newly merged build-SHA,
   capture-provenance, and primary-objective assertions were selected intact.

   Reproduce from this worktree; a successful browser run requires an environment
   permitted to listen on localhost:

   ```bash
   GATES_CONFIG_MODE=writable PW_OUTDIR=dist-S-verify PW_PORT=4386 \
     bash tools/gates.sh --phase build
   CI=1 ROUNDS=2 GATES_CONFIG_MODE=writable \
     PW_OUTDIR=dist-S-verify PW_PORT=4386 \
     FLOW_AUDIT_SHOTS=/tmp/S-verify-shots \
     npx playwright test tests/e2e/journal-debrief.spec.ts \
     -g 'two-objective scan journey|journey (1600x900|844x390|390x844).*Home -> opening|summary and Journal' \
     --repeat-each=3 --retries=0 --output=/tmp/S-verify-playwright --reporter=list
   ```

   The browser command above was executed after the build attempt. The build's
   Vite production bundle and service-worker stamping succeeded, but the gate
   exited 1 afterward at `tools/ci-build-manifest.mjs:11` with
   `spawnSync git EPERM`. A separate typecheck passed. Neither the complete build
   gate nor browser verification is claimed to pass. Direct preview repro:
   `npm run preview -- --port 4386 --strictPort --outDir dist-S-verify --configLoader runner`.

2. **P3 — timing inventory fails the requested no-stale/no-missing check.**
   Compared exact source-file/full-title keys using the existing
   `collectTests()` implementation and fresh Playwright JSON discovery.
   Default CI discovery has **853 cases in 65 entry specs**, representing
   **846 unique timing keys**; seven helper-declared keys are reused by two
   entry specs. Of the **851 stored keys**, **771 match**, **80 are absent from
   default CI discovery**, and **75 discovered keys have no stored timing**.

   | Discovery environment          | Cases | Unique keys | Missing timing keys | Stored keys absent from discovery |
   | ------------------------------ | ----: | ----------: | ------------------: | --------------------------------: |
   | Default CI, ROUNDS unset       |   853 |         846 |                  75 |                                80 |
   | All tests, CI and ROUNDS unset |   870 |         863 |                  80 |                                68 |
   | CI, ROUNDS=2                   |   895 |         888 |                 127 |                                90 |
   | All tests, ROUNDS=2            |   912 |         905 |                 132 |                                78 |

   Thus **68 stored keys are stale even with render tests included**; twelve
   additional default-CI absences are valid render-only keys filtered by CI.
   No stored source filename is deleted, and all three fallback spec files
   still exist. The missing default-CI timings comprise **32** cases in
   `f-bughunt-1090.spec.ts`, **1** in `f-bughunt-880.spec.ts`, and **42** in
   `f-first-minute-620.spec.ts`. The entire first file lacks measured keys.
   All 75 use the existing **45-second default**. Full discovery adds one missing
   `f-bluehole-squiggle.spec.ts` case and four `f-verify-1000.spec.ts` cases.

   Stale examples include the old four atmosphere depth-band cases,
   `mission.spec.ts › B3 mission flow › the bare start page boots titanic without a docked mission picker`,
   and twelve old `f-verify-1000.spec.ts` titles containing
   `first scan without transit`. Historical keys do not select deleted tests:
   sharding uses live discovery. Their main effect is obsolete inventory and
   fallback estimates for renamed/new cases. No timing values were invented or
   changed; `tools/` is outside this task's edit scope.

3. **P3 — ROUNDS changes timing identity.** With `ROUNDS=2`, ten desktop/portrait
   summary titles change from `over 3 rounds` to `over 2 rounds`, losing their
   exact stored costs. The first-minute spec also doubles its round matrix,
   producing 84 missing keys instead of 42. This explains the environment-dependent
   totals above; it is separate from the 68 stale keys under default full discovery.
   All default journal-debrief keys match; ten summary keys miss only under
   this task's ROUNDS setting. Reproduce by comparing discovery with ROUNDS
   unset and with `ROUNDS=2` using the audit below.

## Repeatable inventory audit

Run from the repository root. The script prints every missing/stale key,
including helper-source identities, rather than guessing names from source text.
Change the first command to `CI=1 ROUNDS=2 ...` for the requested environment,
or unset CI too to include render tests.

```bash
env -u ROUNDS CI=1 npx playwright test --list --reporter=json > /tmp/S-verify-roster.json
node --input-type=module <<'JS'
import fs from 'node:fs';
import { collectTests } from './tools/e2e-shards.mjs';
const cases = collectTests(JSON.parse(fs.readFileSync('/tmp/S-verify-roster.json', 'utf8')));
const timings = JSON.parse(fs.readFileSync('tools/e2e-timings.json', 'utf8'));
const keys = new Set(cases.map(test => test.key));
const missing = [...keys].filter(key => !Object.hasOwn(timings.tests, key));
const stale = Object.keys(timings.tests).filter(key => !keys.has(key));
console.log(JSON.stringify({ cases: cases.length, uniqueKeys: keys.size,
  stored: Object.keys(timings.tests).length, missing, stale }, null, 2));
JS
```

## Executed checks and evidence

- Grepped `tests/e2e` for journal, debrief, journey, and viewport coverage;
  inspected both merged patches. No behavior was edited.
- Four fresh JSON discovery runs and exact-key comparisons passed as operations;
  their **inventory freshness result is failed**, as detailed above.
- Existing `balanceTests()` assigned all **853 default-CI cases exactly once**
  across 38 shards in a direct assertion. This verifies assignment, not browser
  execution. All stored timing/fallback values are finite and nonnegative.
- `npm run typecheck`: **passed**.
- `npx vitest run tests/unit/missionRouter.test.ts tests/unit/debriefSummary.test.ts tests/unit/debriefReopen.test.ts tests/unit/e2eShards.test.ts tests/unit/e2eTimings.test.ts --configLoader runner --cache=false --pool=threads`:
  **86 passed in 5 files**. These checks do not replace the blocked browser run.
- Logs, selected roster, and full missing/stale arrays are retained locally in
  `.cache/S-verify/`. No fresh browser screenshot or three-repeat pass evidence
  was produced. The isolated `dist-S-verify` output was removed after diagnosis.
