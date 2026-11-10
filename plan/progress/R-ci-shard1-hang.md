# R-ci-triage — shard 1 timeout isolation

2026-11-10, DIRECTOR item 16b / brief 189. The journey overrode its configured
test timeout with **900,000 ms**. Removing that override restores the normal
**240,000 ms hosted / 90,000 ms local** deadline, including shorter CLI
diagnostic deadlines. A timed-out journey skips its final screenshot; other
final screenshots have a **5,000 ms** limit because Playwright gives teardown a
separate test-sized budget. Product behavior and journey assertions are unchanged.

## Hosted evidence

Fetched the requested job log with:

```sh
gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/129299131983/logs
```

[Run 42656342253, shard 1](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42656342253/job/129299131983)
ran commit `b8861dff9761b64c00fc689e7d335f9d9bd1bec5`. The final completion was
test 23, portrait Bismarck Low Realistic camera safety, at **16:55:27.716 UTC**.
The 1,500-second global deadline fired at **17:06:52.231 UTC**, 11m24.515s later.

Downloaded its timing artifact `13693713643` and failure artifact `13693713646`.
The next case was:

```text
phone-accept.spec.ts
  first minute acceptance 1280x800
    kamaehuakanaloa: guidance reaches first scan within sixty seconds and debrief exits
```

Its result started at **16:55:27.731 UTC**, retained Home, site-picker and briefing
screenshots, then ended as an unfinished placeholder (`skipped`, duration 0).
The remaining cases were the canyon preset shader, protected settings, and
Monterey spawn/hero approach/detail tests. Thus “4 did not run” includes the
interrupted journey; it does not mean the worker stopped before starting it.

Independently extracted the historical tests/config/source and timing weights
from that exact commit, discovered **1,082** CI cases, and ran the unchanged
balancer for **38** shards. Shard 1 has exactly **27 cases**, an estimate of
**1,019 seconds**, and that same desktop journey. Its weight is the **45-second
fallback**, not a measured completed journey cost. The timings file is unchanged
between that commit and this checkout. No weights were fabricated from the
unfinished result.

The artifact's `timeout: 240000` is discovery/start metadata: the original
test body explicitly calls `test.setTimeout(900_000)`. The report never received
a completed result with the changed timeout. The actual 15-minute deadline would
fall around **17:10:27 UTC**, after the suite deadline. This was an oversized
override, not evidence that Playwright ignored its actual per-test deadline.
The original journey passes locally (desktop **57.8s**, portrait **41.9s**);
the precise hosted browser operation that stalled cannot be recovered from the
three screenshots and unfinished result. No production defect is asserted.

## Regression and validation

Extended the existing `playwrightConfig.test.ts` capability tests. It executes
the real Kamaʻehuakanaloa journey bodies for all three layouts up to navigation,
checking that local, hosted and short diagnostic deadlines remain intact. It
does not start a browser in static gates. Running this regression against the
extracted historical spec fails with **expected 90,000, received 900,000**;
all **8** focused tests pass against the fix. The related configuration, shard
and clock capability tests pass together: **18 tests across 3 files**.

Also used an ignored, temporary Playwright wrapper to block navigation in the
actual desktop journey and add a following sentinel test. The configuration
sets a **1,500 ms test timeout**, **10,000 ms global timeout**, one worker and no
retries. Before the fix, the original body replaces 1,500 ms with 900,000 ms:
the global deadline fires, both tests remain unfinished, and the report contains
suite/teardown timeout errors. After the fix, the journey is **timedOut** with
`Test timeout of 1500ms exceeded`, the following test **passes**, and there are
**no suite-level errors**. The intentionally tiny deadline also bounds context
teardown; this is a deliberate failure-injection check, not a green game test.

Grepped `tests/e2e` for first-minute, timeout, screenshot, fixture and clock
coverage, then ran the affected capability by spec and name:

```sh
CI=1 GATES_CONFIG_MODE=writable PW_PORT=4190 PW_OUTDIR=.cache/189/dist \
  npx playwright test tests/e2e/phone-accept.spec.ts \
  -g 'kamaehuakanaloa: guidance reaches first scan within sixty seconds and debrief exits' \
  --repeat-each=2 --retries=0 --output=.cache/189/targeted-results
```

- **6 passed in 6.3 minutes**: all three layouts, repeated twice, CI settings,
  one worker and no retries. Each case still proves sixty simulation seconds,
  first scan, debrief counts/exits and restored piloting.
- Root smoke: **3 passed** (23.9s). Project-base build/manifest verification and
  the canonical `--phase e2e-base --prebuilt` gate: **8 passed** (1.2 minutes).
- Python: **169 passed**; strict content validation, production builds,
  TypeScript, attribution, changed-file formatting and `git diff --check` pass.
- Initial repository-wide Prettier flagged **only `plan/OVERNIGHT-LOG.md`**. The file was
  byte-identical to HEAD (`git diff --exit-code HEAD -- plan/OVERNIGHT-LOG.md`);
  its standalone formatting check also failed. Fixed in the orchestrator follow-up below.
- Canonical gates were invoked with
  `GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/189/gates-dist PW_PORT=4189 bash tools/gates.sh`.
  Configuration, Python, content and build passed; interrupted the broad unit
  stage after roughly six minutes with no results beyond its startup header.
  A separate two-thread full unit attempt hit its **180s** command deadline.
  A **90s** one-thread verbose diagnostic made progress through scanner/geometry
  tests but did not finish. No broad unit pass is claimed from these attempts.
  Repeated the canonical gate with `VITEST_MAX_WORKERS=1`,
  `GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/189/gates-final-dist PW_PORT=4189`
  and `timeout 300s bash tools/gates.sh`: **exit 124** in the broad unit stage,
  after configuration/Python/content/build passed again. **Full gates are not
  green.** The later browser, attribution and formatting stages were exercised
  separately as listed above. No unrelated test or gate was changed to obtain
  a pass.

### Orchestrator gate follow-up

The orchestrator ran `tools/gates.sh` outside the sandbox, with logs under
`.cache/runs/20261110-010521-2202080-8XT1QP/`. Python, content, build, the full
unit suite, smoke e2e, project-base e2e and attribution **all passed**. Its only
failure was Prettier on `plan/OVERNIGHT-LOG.md`.

Applied Prettier to that file, adding the missing blank line after the
2026-11-09 22:42 review heading. This is a formatting-only gate repair; no
assertion, timeout or browser behavior changed in the follow-up. Repository-wide
`npx prettier --check .` and `git diff --check` pass after the repair. The other
gate results are supplied by the orchestrator; a complete post-format gate run
has not been repeated inside the sandbox.

## Workflow-file incidents

- [42672109916](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42672109916):
  zero jobs and zero check runs. `gh run view` says it _likely_ failed because of
  a workflow file issue; there is no YAML/action error annotation.
- [42672133747](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42672133747):
  the root build succeeded in **18 seconds**, uploaded its immutable artifact,
  and an unexpanded e2e matrix placeholder was skipped. Only the existing Node
  deprecation and Ubuntu migration notices appear in annotations.
- Those commits (`55de9747` and `72a73b85`) changed only plan files. Neither
  `ci.yml` nor the Chromium composite changed relative to the executed hung run.
  The later [42678587146](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/42678587146)
  instantiated **45 jobs**, including both builds and all 38 browser shards,
  with identical workflow/composite files; both builds and shard 1 passed.

These two incidents are consistent with transient GitHub orchestration/evaluation
failures, not invalid repository YAML. **No workflow or composite-action change
is warranted by this evidence.** The API does not expose a definitive service-side
cause, so this is an inference, not a confirmed GitHub incident diagnosis.

## Scope and remaining acceptance

The change deletes the oversized override and bounds evidence capture in the
existing capability spec. It adds no scheduler, timeout wrapper, product setting,
site branch or package-named spec. The full sixty simulation seconds, native
input, scan, guidance and debrief assertions remain intact. No suite budget,
skip, retry or assertion was relaxed. The separate render-review first-minute
spec keeps its existing policy; it is excluded from push CI.

A fresh hosted run is still needed to establish hosted journey acceptance and
any actual latency improvement. This scoped fix does not establish a green full
CI run or the under-30-minute goal. Raw logs, reconstructed shard and timeout
probe reports are retained under `.cache/189/evidence/`; command logs are under
`/tmp/189-*.log` and canonical gate logs under `.cache/runs/`.
