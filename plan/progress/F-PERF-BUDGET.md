# F-PERF-BUDGET

2026-10-02 · base `d676ad1` · implementation partial: runtime measurement blocked.

Read `plan/DIRECTOR.md`. Preserve the five hero openings and Low-tier readability.
No scene/content edits and no commits.

## Runtime measurements

**No rendered-frame measurements were obtained.** Headless Chromium launched
through Playwright exits before creating a page:
`FATAL:content/browser/sandbox_host_linux.cc:41 ... shutdown: Operation not permitted (1)`.
Vite preview also fails with `listen EPERM` on both localhost and `0.0.0.0`.
This session forbids permission escalation. The launch failure is recorded in
`.cache/perf-budget/chromium-launch.log`.

| Hero site       | Low draws / triangles / frame ms | High draws / triangles / frame ms |
| --------------- | -------------------------------- | --------------------------------- |
| Titanic         | Unmeasured: Chromium blocked     | Unmeasured: Chromium blocked      |
| Lost City       | Unmeasured: Chromium blocked     | Unmeasured: Chromium blocked      |
| Great Blue Hole | Unmeasured: Chromium blocked     | Unmeasured: Chromium blocked      |
| Beebe vents     | Unmeasured: Chromium blocked     | Unmeasured: Chromium blocked      |
| Monterey Canyon | Unmeasured: Chromium blocked     | Unmeasured: Chromium blocked      |

`tools/perf-budget.mjs` is ready to capture these measurements: fresh Arcade
contexts, default free-dive hero spawn/chase camera, 1280×720 at DPR 1, fixed
Low/High tier, dynamic resolution disabled, normal life/effects enabled with
life seed 42. Waits for props, discovery, life and exploration; freezes submarine
physics, warms 30 frames, samples 60 subsequent frames. Checks for failed/skipped
props, empty scenes and page errors. Outputs max calls/triangles, RAF interval
mean/p50/p95, GPU renderer identity, pose, raw samples and screenshots.

Geometry totals come from existing `__game.perf`, whose render-system source is
`renderer.info`; High totals include the scene and post pass, avoiding the
post-quad counter reset. RAF intervals measure frame delivery including browser/GPU
scheduling. SwiftShader timing is host-specific and does not predict phone FPS.

## Static content check (not rendered-frame measurements)

As independent work while Chromium was blocked, constructed every actual hero
props document with its tile metadata and production builders at both tiers.
These counts include **all prop trees simultaneously**, both internal wreck LOD
branches, instances, material groups, points/lines/sprites, and transparent
double-sided mesh passes. Terrain conforming uses a flat heightfield. No frustum
or distance culling is applied. The terrain, vehicles, marine life and other scene
systems are **excluded**, so these numbers cannot establish the full-frame budget.

| Site            | Low static calls | Low static triangles | High static calls | High static triangles |
| --------------- | ---------------: | -------------------: | ----------------: | --------------------: |
| Titanic         |               33 |               83,894 |                49 |               327,178 |
| Lost City       |               12 |               17,132 |                12 |                38,368 |
| Great Blue Hole |                4 |                9,534 |                 5 |                51,716 |
| Beebe vents     |               10 |               11,026 |                10 |                47,692 |
| Monterey Canyon |                4 |               18,016 |                 7 |                85,972 |

All props load without failures/skips. Static Low-tier prop costs fit within
1,200 calls / 1.2M triangles, reserving some of the requested frame budget for
other systems. No geometry reduction was justified by this check; a real Low-tier
frame overrun still needs the requested fix/re-measurement after browser access.

## Guards and validation

- `tests/unit/perf-budget.test.ts`: all five real hero prop documents stay within
  the static Low budget above. Optional `PERF_BUDGET_STATIC=1` measures High too
  and writes `.cache/perf-budget/static.json`.
- `tests/e2e/f-perf-budget.spec.ts`: Titanic's complete Low opening frame must stay
  at ≤1,500 calls / ≤1.5M triangles over 60 frames. Checks tier, loaded props,
  nonempty geometry and equality of exported totals to `renderer.info`. No timing
  assertion, since software GPU speed varies. This assertion is added but **not
  executed** here; Playwright test discovery succeeds.
- Typecheck passed. Targeted unit run: 24 tests passed (five static budget checks
  plus quality tests); diagnostic run: ten Low/High cases passed.
- Production build passed using a locally prebundled Vite config and native config
  loader. Default config loading writes through the read-only shared `node_modules`
  symlink; runner loading additionally hits a pre-existing PWA close-hook error.
  Prebundling with Rolldown into ignored `.cache/perf-budget/vite.config.mjs`
  avoids both without changing repository build configuration.
- Changed files formatted with `npx prettier --write`.
- Fresh golden captures/visual comparison remain blocked with Chromium. No visual
  regression is introduced by the tooling/tests, but runtime/visual QA is outstanding.

## Resume on a browser-capable runner

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run build -- --outDir dist-perf-budget
npm run preview -- --port 4299 --strictPort --outDir dist-perf-budget
```

In another shell:

```bash
node tools/perf-budget.mjs http://localhost:4299/ .cache/perf-budget/before
PW_PORT=4299 PW_OUTDIR=dist-perf-budget npx playwright test tests/e2e/f-perf-budget.spec.ts
PERF_BUDGET_STATIC=1 npx vitest run tests/unit/perf-budget.test.ts
```

Copy `.cache/perf-budget/before/results.md` into the runtime table above. Inspect
the ten screenshots against the director rubric. If any Low frame exceeds the
requested thresholds, make the smallest relevant density/LOD/instancing change,
then repeat with `.cache/perf-budget/after` and review screenshots. `PERF_SITES`
and `PERF_TIERS` can restrict repeat measurements. The original task remains
incomplete until runtime measurements and any required fixes are verified.
