# V-spawn-capture

2026-10-18. Base `db26279`. Capture infrastructure only; visual acceptance remains
with Claude under V-eight-sites.

## Missing guard and change

The render helper saved review screenshots only with `PW_RENDER_REVIEW=1` or
`VISUAL_QA=1`. Existing live portrait opening checks cover the five hero sites
and navigate through free dive. They did not guarantee retained evidence of the
eight other mission openings on ordinary runs.

Added `missionSpawnShot` to `tests/e2e/helpers/render.ts`. It saves the PNG
unconditionally after checking the mission ID, Low tier, Arcade mode, chase
camera, loaded props, draw calls and 390×844 viewport. It reuses the existing
golden build-provenance reader, manifest builder and contact-sheet builder;
`tools/` is unchanged. Each test gets its own output directory, so workers,
retries and repeated runs cannot overwrite another site's evidence.

The existing `opening-framing.spec.ts` now derives its capture matrix from the
catalog minus `HERO_SITES`: Hunga Tonga, Blake Plateau, Kamaʻehuakanaloa, Axial
Seamount, Hudson Canyon, Endurance, Bismarck and Challenger Deep. It reuses the
golden URL builder for mission routing, briefing bypass, Low tier, touch mode,
life seed 42 and disabled dynamic resolution. The existing clock helper holds
the loaded opening without teleporting or overriding game settings or physics.

Each site's Playwright output contains:

- `golden/<site>-portrait-1-mission.png`;
- `golden/poses.json`, with that site in `plannedMissions` and its successful
  capture in `captures`, including served SHA/dirty/build mode, URL, actual
  mission elapsed time, submarine and camera pose, tier and viewport;
- `golden/index.html`, linking the PNG and manifest.

`timeS: 0` denotes the first loaded opening capture; `missionElapsedS` records
the actual elapsed simulation time. A readback or capture-state failure is
rethrown and leaves `complete: false`, a failure entry and no phantom capture.
These per-site manifests use the existing golden schema. They do not claim to
be the separate golden tool's two-frame mission sequence or a visual approval.

## Validation

Passed:

- TypeScript and production build; existing chunk-size warning only.
- All 8 new helper unit checks: review flags off, PNG/manifest persistence,
  screenshot failure, and wrong mission/tier/mode/viewport or unloaded scene.
  Their screenshot fixture verifies persistence, not rendered game pixels.
- Playwright discovery: exactly 8 non-hero capture cases.
- Strict content validation, all 13 sites.
- Attribution, whole-repository Prettier and `git diff --check`.

Relevant commands:

```bash
npx vitest run tests/unit/e2eRender.test.ts --configLoader runner --cache=false
node --test --experimental-test-isolation=none tools/tests/golden-options.test.mjs tools/tests/golden-manifest.test.mjs tools/tests/golden-frames.test.mjs
npx playwright test tests/e2e/opening-framing.spec.ts --grep 'non-hero mission spawn Low portrait capture' --list
GATES_CONFIG_MODE=writable PW_OUTDIR=dist-v-spawn PW_PORT=4270 npx playwright test tests/e2e/opening-framing.spec.ts --grep 'non-hero mission spawn Low portrait capture' --output=test-results-v-spawn
```

Existing check failures and environment limits:

- The unchanged golden tooling checks report **24 passed, 1 failed**. The
  comparator CLI test gets empty `--report` stdout and fails parsing JSON at
  `tools/tests/golden-manifest.test.mjs:151`. This is an unresolved check failure;
  no pixel comparison or screenshot acceptance is inferred from it.
- The Python gate runs all 166 tests and reports 5 failures: that golden test
  wrapper plus four CI-build-manifest tests whose Node subprocesses fail with
  `spawnSync git EPERM` under the sandbox.
- The targeted browser command cannot start its preview; debug output records
  `connect EPERM ::1:4270` and `connect EPERM 127.0.0.1:4270`. No capture test
  executes and no real game PNG is produced here.
- The full Vitest roster starts without producing results. The first gate run
  was interrupted at that stall. A second invocation bounds only the unit
  subprocess to 60 seconds through a shell-local wrapper, allowing the remaining
  gates to run. No repository tooling, assertion or test timeout is changed.

The completed aggregate exits **1**. It uses the default **smoke + project-base**
browser selection, not the full e2e suite. Both builds pass; both browser gates
fail before executing tests because their preview cannot start. The unit command
exits 124 at its shell-local bound. Python fails as described above; content,
build, attribution and Prettier pass. The exact aggregate invocation was:

```bash
npm() {
  if [[ "${1:-}" == test ]]; then
    timeout --kill-after=5s 60s npm "$@"
  else
    command npm "$@"
  fi
}
export -f npm
GATES_CONFIG_MODE=writable PW_OUTDIR=dist-v-spawn PW_PORT=4269 bash tools/gates.sh
```

Logs: `.cache/v-spawn-gates.log`, `.cache/v-spawn-golden-tests.log`, and
`.cache/runs/20261018-131846-3-A9UxuD/`.

## Scope and disposition

No on-screen surface or setting is added or replaced. No art, layout, CSS,
composition, gameplay, rewards, factual content or accessibility behavior
changes. Readability and phone appearance need Claude's rendered review; this
change supplies evidence for that review. No site branch is added to shared
runtime code, and no package-named spec is added. `plan/DIRECTOR.md` and `tools/`
remain untouched. No merge, push or tag is performed.

Implementation is ready for review; V-eight-sites still needs execution in a
browser-capable environment and Claude's screenshot acceptance.
