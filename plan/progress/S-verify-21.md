# S-verify-21 — audio, Lost City fill and release guards

2026-10-18. Reviewed `cb279a7` under standing **S-verify**. Numeric and
behavioral verification only; no game rendering or listening acceptance.

## Findings

- **Audio passes existing guards.** `DEFAULT_AUDIO` retains master/SFX/music
  defaults `0.6 / 0.8 / 0.5`. The softened bed uses gain `0.025` and noise
  low-pass `220 Hz`. `AmbientBeds` reads those configuration fields; its noise
  filters precede its per-layer gains, and the bed still reaches saved SFX and
  master controls through the ambient bus. Shared depth filtering, music and
  cue paths are separate from this tuning.
- **Saved values and lifecycle are covered.** Existing `f3Audio`,
  `settingsSave`, `audioLifecycle` and `audioTouchUnlock` capability tests pass:
  v1/v2/v3 missing-field defaults, custom values, explicit zero, mute, storage
  round trips, gains before the first warmup source, independent pause/hidden
  states, late transitions, rejected unlock retry, node reuse and idempotent
  cleanup while suspended. No save migration or runtime fix was indicated.
- **Fill checks use shipped data.** `perf-budget.test.ts` reads Lost City's
  actual mission, heightmap, 12 props and `DEFAULT_CONFIG`; it enters the
  production `PresetSystem`, uses seeded point buffers and compiled plume
  uniforms, and checks shader motion/size assumptions. The before case changes
  only the mission's shimmer strength back to `0.03`; the after case retains
  the shipped `0`. The ordinary unit run enforces the High `140,000` bound,
  positive fill, layer counts and per-sample improvement. Diagnostic mode also
  exercises High catalog static counts; it does not enable the High fill guard.
- **Deploy logic passes offline checks.** The only automatic trigger is
  completed `CI` on `main`; the job additionally requires successful `push`
  CI and this repository's head repository. PR, other-branch and fork cases
  reject. Checkout selects the triggering `head_sha`, even when `github.sha`
  is newer. Manual dispatch queries `ci.yml` by selected SHA, main and push,
  before checkout; missing/non-success/unfinished results and API errors reject.
  Deploy depends on build. This establishes local expression/script behavior,
  not a hosted Actions or Pages execution.
- **Merge refusal is still absent.** The existing gate capability verifies
  sensitive committed/dirty/untracked paths add the four spawn/camera specs,
  explicit full/none selection and failure propagation. However,
  `tools/gates.sh` does not query main CI, and no merge entry point enforcing
  that condition was found under `tools/`. Local Git hooks are only inactive
  `.sample` files, with no configured hooks path. `tools/resume.sh` consumes
  `plan/RESUME-PROMPT.md`, whose collect-work instruction still directs merges
  and whose push rule explicitly says “Merges don't wait for CI”. The earlier
  `R-merge-verify.md` already records this unfinished half. Its DONE status in
  DIRECTOR therefore overstates the implemented guard. A red-main merge refusal
  cannot be claimed. This verification leaves the prohibited tooling and
  DIRECTOR untouched; it does not implement another backlog package.

## Reproduced Lost City estimates

Maximum summed square footprint over times 0/5/10 s, 1280×720 at DPR 1 and the
configured 62° FOV; square footprints precede alpha, fog and depth rejection.

| Tier / range | Before px-equivalents | After px-equivalents |
| ------------ | --------------------: | -------------------: |
| High / 70 m  |             65,438.79 |            27,867.67 |
| High / 32 m  |            207,933.55 |           110,946.19 |
| High / 10 m  |            209,886.15 |           132,796.92 |
| Low / 70 m   |             10,430.16 |            10,430.16 |
| Low / 32 m   |             42,124.96 |            42,124.96 |
| Low / 10 m   |             64,347.67 |            64,347.67 |

High's worst sampled fill falls **36.73%**. Low's complete paired samples are
equal and its three fixed historical maxima pass. These are deterministic
site-effect workload estimates, excluding shared scene effects; they establish
neither whole-frame GPU cost nor acceptable phone frame times.

## Actual validation

- `PERF_BUDGET_STATIC=1 npm test -- --configLoader runner --cache=false
tests/unit/perf-budget.test.ts tests/unit/audio.test.ts
tests/unit/f3Audio.test.ts tests/unit/audioLifecycle.test.ts
tests/unit/audioTouchUnlock.test.ts tests/unit/settingsSave.test.ts
tests/unit/presets.test.ts`: **221 tests pass in 7 files**. Diagnostics:
  `.cache/perf-budget/`.
- `python3 -m unittest discover -s tools/tests -p test_gates.py -v`:
  **18 tests pass**, including 24 real temporary-Git sensitive-path cases.
- Offline harness extracted the checked-in deploy YAML, job expression and
  manual script: structure/order checks, **13 automatic cases**, manual entry,
  exact-SHA checkout, **14 manual response cases** and API-error rejection pass.
  Harness: `/tmp/s-verify-21-deploy-check.{py,mjs}`.
- An additional bounded thread-pool reproduction of `audioLifecycle.test.ts`
  passed **57 tests** in 1.89 seconds; no timeout was changed.
- Relevant Playwright discovery succeeds: **149 tests in 7 existing specs**
  (`f3-audio`, `f-perf-budget`, `presets` and the four spawn/camera specs).
  Execution exits 1 before any test: preview startup fails, with debug
  `connect EPERM` on IPv4/IPv6 localhost. A direct Node listener independently
  reports `listen EPERM 127.0.0.1:4382`. Log: `/tmp/s-verify-21-e2e.log`.

### Aggregate gates

`GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/s-verify-21-dist PW_PORT=4381
bash tools/gates.sh` completed with **exit 1**, reporting
**`FAIL gates (e2e=smoke)`**. This is smoke plus project-base, not full e2e.
Writable mode is the existing option for this checkout's read-only shared
dependency symlink. Logs: `.cache/runs/20261018-174520-3-xuJJzc/` and
`/tmp/s-verify-21-gates.log`.

Passed: config setup, strict content, production build/typecheck, **3,281 unit
tests in 192 files** (527.53 seconds), attribution and repository-wide Prettier.
The project-base production build also passed before preview startup failed.

Python ran **167 tests: 162 passed, 5 failed**. The golden tooling failure is
`Unexpected end of JSON input` in the nested comparison CLI check; its cause
remains unclassified. It is also recorded in the earlier package progress notes;
this note does not classify it as a demonstrated regression in the reviewed work.

### Environment failures

- Four of the five Python failures are CI-build-manifest cases reporting
  `spawnSync git EPERM`.
- Both aggregate browser gates failed before tests at preview startup, as did
  the focused browser attempt above. Localhost connect/listen probes explicitly
  report `EPERM`; no browser assertion or screenshot acceptance is claimed.

These environment failures are separate from the unclassified golden JSON
failure. No assertion, timeout or tooling change was used to obtain a pass.

## Scope and rubric

Only this evidence note is added. No demonstrated audio/fill/deploy runtime bug
or missing guard requiring an allowed capability-spec edit was found. The
missing main-CI merge guard is reported above, not marked fixed. No tests,
assertions, timeouts, dependencies, `tools/` or `plan/DIRECTOR.md` were changed;
no push, merge or tag was performed.

Readable/rewarding/accessibility: cue routing, saved mute/zero and independent
volume controls remain guarded. Simple: reuse the bed and existing site effects,
with no new element, guidance surface, setting or per-site branch. Honest:
static workload and offline workflow checks are identified as such. Beauty,
phone appearance, screenshots, listening comfort and real-device acceptance
remain with Claude/owner.
