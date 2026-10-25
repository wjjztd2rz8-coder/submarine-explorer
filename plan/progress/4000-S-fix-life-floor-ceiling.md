# 4000 — S-bughunt: moving life floor/ceiling conflict

DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**.
Starting HEAD: `1c620c846d0101e5650113ac9ae75ef2027c2d86`; initially clean.
Read CONTRIBUTING-AGENTS.md, DIRECTOR's simplicity rules and rubric, and
[3970's reproduction](3970-S-bughunt-mobile-life-depth.md). No AGENTS.md found.

Fixed the shared `integrate` path in `src/world/life/steer.ts` by moving the
existing ceiling clamp before the existing floor clamp. The floor therefore
wins when both limits cannot fit, including the existing body clearance and
downward velocity/push cancellation. Feasible columns still enforce both limits;
crawlers retain their existing ground seating. The comment now states the
precedence instead of promising simultaneous rock/air exclusion in impossible
columns. The user's explicit floor-wins requirement resolves the conflict; no
additional habitat, release or steering policy was needed.

Added exactly one capability test to `tests/unit/lifeSim.test.ts`, under
`steering stability`. It uses the unchanged parsed Blue Hole table, High tier,
seed/random stream 7, stationary sub `(0,-8,0)`, lights off, and synthetic terrain
`-Math.max(0.25,15+0.3*x)`. A normally admitted reef shark moves for 7,200 frames
at 1/60 s without overriding its pose, velocity or scheduler. The test checks
the same live, nonleaving group member each frame, finite height, body clearance,
and the ceiling whenever both limits fit. It also requires over 30 m horizontal
travel and a shoal where actual ground exceeds the nominal ceiling, preventing
a vacuous pass without the original below-seabed risk.

The test fails on the original source at frame 6,542 (109.05 s):
`y=-1.6254071927955374`, floor `-1.6241706017176678`. After the reorder, the
same test passes the complete 120 s crossing. This establishes the synthetic
regression repair; it does not establish a naturally encountered shipped-site
failure or visual acceptance.

Validation:

- Red capability test: **exit 1**, expected clearance assertion above;
  `/tmp/4000-life-red.log`.
- Targeted life simulation, tables and disposal suites: **exit 0, 3 files /
  89 tests passed**; `/tmp/4000-life-green.log`.
- `GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e`: **exit 1,
  FAIL gates (e2e=none)**. Config preparation, strict content validation,
  TypeScript/production build, full units, attribution and repository-wide
  Prettier **pass**. Units: **192 files / 4,230 passed / 4 existing expected
  failures (4,234 total)**, 613.25 s. Python: **167 tests / 162 passed / 5
  failed**, 8.980 s; details below. Aggregate log `/tmp/4000-gates.log`, detailed
  logs `.cache/runs/20261025-025902-3-DMdyXL/`. The build emits its existing
  chunk-size advisory.
- Owned-file formatting and `git diff --check`: **pass**. The untracked note's
  `git diff --no-index --check /dev/null` check emits no whitespace diagnostics
  (exit 1 reflects the added file).

Python gate failures match the prior
[3850 report](3850-S-bughunt-journal-scan-reward.md): four
`test_ci_build_manifest.TestCiBuildManifest` cases fail with `spawnSync git EPERM`;
`test_golden.TestGolden.test_golden_tooling` fails with `Unexpected end of JSON
input` at `tools/tests/golden-manifest.test.mjs:151`. The latter's cause is not
established here. The tools and their tests are unchanged; no retries, bypasses
or weakened assertions were used.

Simplicity: production line count, branches, arithmetic and allocations are
unchanged. The correction removes contradictory clamp precedence at the single
integration point. No new abstraction, setting, site branch, dependency, data,
UI or package marker in code; historical assertions remain intact. Accurate
marine life protects the exploration/scan/Journal loop. Only the runtime file,
existing capability spec and this note change.

No browser/e2e, screenshots, rendering or visual/phone claims. The explicit
no-screenshots scope takes precedence over CONTRIBUTING-AGENTS.md's generic
browser/screenshot checks. No commit, merge, push or other worktree change.
