# T-verify-endurance-hull-pose

> Note: the 12-case e2e matrix in opening-framing.spec.ts was not merged (never executed; web server timed out locally). Unit geometry checks merged.

2026-11-08, Codex verification lane. Audited HEAD
`ee243d5cae55c488b400b1e02dc0475ee62b2822`.

Numeric verification passes; browser acceptance remains blocked by the execution
environment. No runtime or site data changed.

Extended the existing capability specs:

- `tests/unit/missionOpeningSafety.test.ts`: Endurance across Low/Medium/High,
  Arcade/Realistic, 1600×900 desktop and 390×844 phone (also 844×390).
  Uses shipped terrain, every prop, the production scanner and actual visible
  mesh vertices, including instances. Checks camera arm/near plane clearance,
  both hulls inside the frustum, camera reset and deterministic recomposition.
- `tests/e2e/opening-framing.spec.ts`: 12 cases covering the requested tier,
  mode and viewport matrix. Each checks opening, player camera reset, debrief
  **Dive again**, and reset after replay. Checks scan exclusion, broadside yaw,
  arm/near plane collision, both hulls inside the frame, HUD/hull intersections
  and HUD control overlap. Saves per-phase PNGs and JSON when executed.
  These browser cases are discovered and typechecked, but have not executed.

Numeric results, identical in both modes except the scan radius:

| Tier   | First target | Arcade / Realistic radius | Minimum arm clearance | Minimum near-plane clearance |
| ------ | -----------: | ------------------------: | --------------------: | ---------------------------: |
| Low    |        106 m |              100 / 27.6 m |              10.375 m |                      9.825 m |
| Medium |        106 m |              100 / 27.6 m |              10.387 m |                      9.832 m |
| High   |        106 m |              100 / 27.6 m |              10.381 m |                      9.825 m |

No sampled prop contact or actual geometry ray intersection on the camera arm.
On 390×844, the wreck envelope is approximately x=47.9–298.0,
y=483.8–584.7 px; the submarine is x=14.2–82.1, y=414.3–453.9 px.
Neither hull crosses the frame edge. Reset restores camera position and
orientation within 1e-6; recomposition reproduces the opening exactly.
These are geometry measurements, not rendered visibility or HUD acceptance.

Completed checks:

```bash
npm run typecheck
OPENING_SAFETY_AUDIT=.cache/endurance-pose-geometry.json npx vitest run --configLoader runner --cache=false --maxWorkers=1 tests/unit/missionOpeningSafety.test.ts -t endurance --reporter verbose
npx vitest run --configLoader runner --cache=false --maxWorkers=1 tests/unit/missionOpeningSafety.test.ts tests/unit/missionApproach.test.ts tests/unit/missionComposition.test.ts -t endurance --reporter verbose
npx vitest run --configLoader runner --cache=false --maxWorkers=1 tests/unit/missionOpeningSafety.test.ts --reporter verbose
```

Respectively: TypeScript passes; 3 Endurance safety tests pass; 16 Endurance
capability tests pass (167 unrelated tests filtered); all 9 safety tests pass.
Attribution and repository-wide Prettier also pass. Focused logs and the
18-record geometry audit are retained under `.cache/endurance-pose-*`.

Searched `tests/e2e` for Endurance, scan range, camera arm, reset and replay
before extending the capability spec. Required targeted browser command:

```bash
GATES_CONFIG_MODE=writable PW_OUTDIR=dist-endurance-pose PW_PORT=4197 npx playwright test tests/e2e/opening-framing.spec.ts -g 'Endurance broadside opening, reset and replay stay safe' --output=.cache/endurance-pose-results
```

Exit 1 before tests: preview cannot bind `127.0.0.1:4197` (`listen EPERM`).
`--list` discovers exactly 12 cases. A direct Chromium launch also fails at
`sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`, SIGTRAP.
No screenshots were generated or visually reviewed. HUD overlap and actual
UI replay/reset therefore remain unverified. Build with
`GATES_CONFIG_MODE=writable PW_OUTDIR=dist-endurance-pose tools/gates.sh --phase build`,
then rerun the browser command in a browser-capable environment before accepting
this item. The temporary build directory is removed after verification.

Gates were invoked with `GATES_CONFIG_MODE=writable` to avoid writing config
bundles to the read-only shared dependency tree. A build-phase attempt bundled
successfully but its provenance step failed with `spawnSync git EPERM`.
Ordinary all-mode gates built successfully. Full unit invocations remained at
the Vitest startup banner and were interrupted; a final bounded run uses one
unit worker with a 60-second timeout so remaining gates can report:

```bash
npm() {
  if [[ "${1:-}" == test ]]; then
    timeout 60s /home/vijay/.local/node/bin/npm "$@" --maxWorkers=1
  else
    command npm "$@"
  fi
}
export -f npm
GATES_CONFIG_MODE=writable PW_PORT=4199 tools/gates.sh
```

The bounded run reports failures for Python (169 tests, five failures), unit
(60-second timeout at startup), e2e and e2e-base (preview startup). Config,
content, root build, attribution and Prettier pass. Final result:
`FAIL gates (e2e=smoke)`, exit 1. Logs are in
`.cache/runs/20261108-033616-3-T9AaAu/` and
`.cache/endurance-pose-gates-bounded.log`. The five
Python failures are four provenance tests reporting
`spawnSync git EPERM`, and the nested golden tooling test reporting incomplete
JSON. No assertions or tooling were relaxed. Test additions use capability
specs and contain no package IDs. No settings, guidance or layout were added.
