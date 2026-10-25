# 4020 — R-ci-green: hosted evidence

DIRECTOR Backlog **8, R-ci-green [Codex]**, 2026-10-25.
Local baseline: `1c620c846d0101e5650113ac9ae75ef2027c2d86`, initially clean.

## Hosted result

`gh run list -L 10` succeeded. Queried main CI separately to distinguish
full CI from Pages deployment, inspected all jobs on the newest completed
green run, and downloaded its logs through the REST API.

- Newest fully green main SHA: **`ddcaaac5c141473ba4823e85a675384f2e27d887`**.
- [CI 40166687475](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40166687475):
  push/main, created **2026-10-25 05:45:34 UTC**, completed **06:15:44 UTC**.
  All **45 jobs** completed successfully: both builds, three static shards,
  their aggregate gate, **38 e2e shards**, and project-base browser checks.
- Main e2e logs total **743 passed, 68 skipped, 0 failed, 0 flaky**.
  Every shard invoked `--retries=0`. Project-base: **8 passed**.
  Static unit shards report **4,227 passed and 4 expected failures**;
  the expected collision failures and existing e2e skips remain separate
  coverage limits. CI also excludes the existing `@render` diagnostics.
- [Pages 40168476190](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40168476190)
  completed successfully at **06:16:33 UTC**, on that same SHA.
- Previously pending reef/shell evidence is now present: reef shader case
  **22.2 s**; the changed shell flow `home, site grid, pause, objectives,
resume and quit` **1.2 min**. Both passed without retries.

Remote main observed through the branches API is
`e0ee0561143a4893532866dbf94d5b58a88a9bdc`.
[CI 40174767319](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40174767319)
is pending behind
[CI 40174754472](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40174754472)
on local-baseline SHA `1c620c84`. Neither establishes green for current main.
At the **08:00:07 UTC** check, the latter had two successful jobs and no
failed jobs; the API run status was `queued` while other jobs remained active
or queued. A later refresh around **08:06 UTC** found nine successful jobs,
20 in progress, 16 queued and no failures on `1c620c84`; `e0ee0561` remained
pending. This is a bounded observation, not a wait for those runs to finish.

## Failing spec and separable correction

The most recent failed main CI in the inspected history is
[40153841351](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40153841351),
SHA `79e35347e483544be285698ec7fd06bcb56dd28e`. Its only failed job was
[`e2e (3/38)`](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/40153841351/job/121050904219).
The failing case is `journal-debrief.spec.ts:257`, **primaries complete ->
keep exploring -> secondary -> surface -> debrief actions**.

Its **150,000 ms overall test timeout** expired at line 383's
`dispatchEvent('click')` on the debrief's Dive sites button. The retained
error-context snapshot still contains the expected debrief and Dive sites
button, with Journal closed. No assertion failure or product exception is
reported. Three subsequent full CI runs passed this unchanged case:
`378fe291` (2.5 min), `51f11feb` (2.4 min), and `ddcaaac5`
(**112,026 ms**, JSON timing artifact, retry 0).

Triage: intermittent exhaustion of the long flow's test budget is supported
by the snapshot and later passes; this does not prove the exact source of
runner slowdown. The case's explicit 150 s cap overrides the shared hosted
240 s timeout. The separable correction uses
`Math.max(testInfo.timeout, 150_000)`, preserving the shared CI allowance and
the existing local 150 s allowance. All behavior assertions, interactions,
screenshots, skips and retry settings stay intact. No runtime code changes.

## Validation

- TypeScript: `npm run typecheck` passed.
- Production build: `GATES_CONFIG_MODE=writable PW_PORT=4202
PW_OUTDIR=dist-4020 bash tools/gates.sh --phase build` passed.
- Python: `npm run test:py` passed, **167 tests**.
- Targeted e2e: `CI=1 GATES_CONFIG_MODE=writable PW_PORT=4202
PW_OUTDIR=dist-4020 PLAYWRIGHT_JSON_OUTPUT_FILE=.cache/4020-e2e.json
npm run test:e2e -- tests/e2e/journal-debrief.spec.ts
--grep 'primaries complete -> keep exploring' --retries=0
--output=.cache/4020-test-results --reporter=list,json`:
  **1 passed, 13,281 ms**, retry 0. JSON confirms **timeout 240,000 ms**.
  This is targeted behavior coverage; no local full-suite or visual acceptance
  claim. The existing review screenshots are disabled without review flags.
- Unit suite: `npm test -- --configLoader runner --cache=false` passed,
  **192 files, 4,229 passed / 4 expected failures**, **616.80 s**.
  The runner printed its summary only on completion after the initial header.
- Owned-file Prettier and `git diff --check`: passed.

The default build/unit commands initially hit the shared read-only
`node_modules/.vite-temp` directory. A direct Vite runner build also hit
its known late-plugin-import failure. The repository's existing writable
config mode solved the build; unit uses its existing
`--configLoader runner --cache=false` fallback. An initial anchored e2e
filter selected no tests; the corrected filter above selected and passed
exactly the intended case. These setup attempts are not test passes.

Only this test and the DIRECTOR/progress evidence are owned by this package.
Release tagging remains with R-release; no tag, push, workflow dispatch or
hosted rerun was performed.
