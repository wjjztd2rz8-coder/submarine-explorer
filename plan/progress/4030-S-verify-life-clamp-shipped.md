# 4030 — S-verify: shipped-site life water limits

DIRECTOR Backlog **7, S-verify / S-bughunt**. Starting HEAD:
`164da7fe6e82e4abfcee270c123106f36bda2707`; clean worktree.

## Scope and plan

Report first: verify the reordered shared `integrate()` clamps against actual
shipped heightmaps through `Terrain.sampleHeight`, retaining terrain detail,
reconstructions and collision sampling. Exercise natural site tables separately
from a deliberate all-mover matrix so an absent species does not imply coverage.
Simulate three minutes per run, inspect every completed frame, and distinguish
impossible shallow columns from feasible-column clamp violations. Crawlers use
their existing ground-seating contract; rooted sessile life is outside the mover
matrix. Record conflict counts and reproductions, including any naturally
encountered shipped-site conflict.

Keep production code unchanged unless a small defect is demonstrated; any fix
gets one test in the existing life capability spec. No per-site branches,
settings, UI, dependencies or package markers in code. Disposable probes and
logs live under `/tmp`; this note will contain the final evidence and limitations.

## Final findings

The reordered clamps themselves pass. After the small birth-frame fix below,
**796 three-minute runs, 4,476,960 completed frames and 274,406,554 mover
agent-frames** produced **zero** below-ground, below-clearance, feasible-column
ceiling, nonfinite, crawler-seating or tile-exit violations.

**Shipped-site conflicts are confirmed at Great Blue Hole and Hunga Tonga.**
Unchanged natural tables admit whale sharks and humpback whales respectively;
they can subsequently enter water where their body clearance and nominal
surface limit cannot coexist. They remain at the floor as intended. These are
counted impossible columns, not failures of the feasible-water assertion.
No habitat policy, release rule or site tuning was added.

### Real terrain and coverage

Read the 13 shipped IDs from `data/landmarks/index.json`. Each uses its original
`data/tiles/<site>/meta.json` and Float32 `heightmap.bin`, default `makeConfig()`
and a full `Terrain` instance at the selected tier. No synthetic replacement,
subdivision reduction, terrain mock, disabled detail or modified site data.
`groundAt` delegates to the same `Terrain.sampleHeight` used by app life,
including authored reconstructions and collision triangles. All 13 validated
offline current grids are sampled with `sampleCurrentGrid`.

The main sweep has two stations per site/tier: its configured terrain focus
(otherwise the catalogue coordinates), and the shallowest sample at or below
-3 m on a 25 m grid within ±600 m of that focus. The stationary sub is at
`min(-1, ground + 14)`, facing -Z, hull radius 6, zero speed, lights alternating
every 15 s. Stations are controlled sampling locations, not claimed player
opening poses. The shallow station can be too shallow for a submarine.

Seven tier/frame-step/seed combinations run at each station: Low with seed 31
at 1/60, 1/30 and 0.25 s; Medium with seed 7 at 1/30 s; High with seed 7 at
1/60, 1/30 and 0.25 s. Every run lasts exactly 180 s:

- **182 natural runs:** unchanged parsed site tables, normal `LifeSim.update`,
  natural admission, replenishment, rares, departures and pooling. Check every
  live mover after each returned update, including leaving and zero-fade births.
  Result: **48,892,896 agent-frames**, zero violations and zero conflicts at
  these two station choices. Twenty-one natural cases have no movers; they
  establish no movement coverage on their own.
- **182 explicit matrix runs:** every one of the catalogue's **37 moving
  species**, individually initialized with `spawnNear(..., 0, 1)`, then kept for
  all 180 s through the real `moveHub`, `tickGroup` and `integrate` functions.
  Match the actual 15 Hz accumulator and three-tick cap. The control sub is
  stationary 1,000 m east of the station. Habitat admission and despawning are
  deliberately excluded here. Each species must have exactly one observation
  per frame; all seven mover archetypes must appear in every case. Result:
  **37,748,880 agent-frames**, zero violations. These non-native species/site
  combinations test capability, not a claim about local fauna.

Per-frame checks use a 1e-9 m comparison tolerance. For swimmers,
`L = size * visScale * scale`, `floor = groundAt + max(0.12, L * 0.25)` and
`ceiling = -0.6 - L * 0.2`. Require `y >= floor` always and `y <= ceiling` when
`floor <= ceiling`. Count each swimmer observation with `floor > ceiling` as
one **conflict agent-frame**, and each simulation frame containing any conflict
as one **conflict frame**. These are sampled counts across repeated runs, not
distinct animals or elapsed seconds. Crawlers must equal the local ground;
they retain their existing exemption from swimmer clearance/surface clamps.
Rooted sessile species are outside this movement verification.

The matrix covers school (7,141,680 agent-frames), hover (7,141,680), cruiser
(9,182,160), drifter (3,060,720), swarm (3,060,720), crawler (5,101,200) and
cephalopod (3,060,720). Every site contributes 2,903,760 matrix agent-frames.

| Shipped site         | Natural main-sweep agent-frames | Matrix conflict agent-frames | Matrix conflict frames |
| -------------------- | ------------------------------: | ---------------------------: | ---------------------: |
| great-blue-hole      |                       2,060,520 |                      270,273 |                 43,275 |
| hunga-tonga-caldera  |                       6,241,599 |                      183,103 |                 39,240 |
| blake-plateau-corals |                         659,100 |                            0 |                      0 |
| lost-city            |                         700,114 |                            0 |                      0 |
| kamaehuakanaloa      |                       7,149,375 |                            0 |                      0 |
| axial-seamount-ashes |                         604,800 |                            0 |                      0 |
| hudson-canyon        |                       4,192,905 |                            0 |                      0 |
| monterey-canyon      |                       5,830,117 |                            0 |                      0 |
| endurance            |                       1,365,840 |                            0 |                      0 |
| titanic              |                       2,782,457 |                            0 |                      0 |
| bismarck             |                       5,119,612 |                            0 |                      0 |
| beebe-vent-field     |                       7,592,349 |                            0 |                      0 |
| challenger-deep      |                       4,594,108 |                            0 |                      0 |

All matrix conflicts involve cruisers. The other 11 sites had no conflict in
the sampled runs; this is not an exhaustive proof over their entire tiles.

### Naturally encountered shoreline conflicts

The main matrix exposed two shallow sites, so follow-up natural runs select
four separated samples per tier from the same local grid: depths 15–30 m,
ordered by proximity to 20 m depth, retaining points more than 120 m apart.
The stationary sub is at -8 m, with the same facing, hull and light cycle.
Each station uses all three tiers, all three frame steps above, and seeds
1, 7, 21, 31, 42 and 81. No preview population or species/table override.

**432 additional three-minute runs, 2,436,480 frames, 187,764,778 agent-frames;
zero violations or empty runs.**

| Site / naturally admitted species | Conflict agent-frames | Frames with conflict | Runs with conflict / total | Maximum floor minus ceiling |
| --------------------------------- | --------------------: | -------------------: | -------------------------: | --------------------------: |
| Great Blue Hole / whale-shark     |               111,406 |              111,406 |                   46 / 216 |                  7.833907 m |
| Hunga Tonga / humpback-whale      |                 2,901 |                2,901 |                    6 / 216 |                  1.603864 m |

Blue Hole's conflicts occur at all tiers: Low 56,195, Medium 35,333, High
19,878. Hunga's occur at Medium (2,792) and High (109); Low has zero in this
sample. All conflicted observations retain ground clearance.

Two direct reproductions, with world coordinates in metres:

- **Blue Hole:** Low, seed 7, 1/60 s, sub `(-82.430500340, -8,
-194.801939847)`, station ground -20.569021209. At completed frame 7,805
  (zero based), t=130.1 s, a naturally admitted whale shark is at
  `(-106.755410760, -5.236614561, -219.814519190)`. Ground -11.033237261,
  L=23.186490803, floor -5.236614561, ceiling -5.237298161. The floor wins.
- **Hunga Tonga:** Medium, seed 31, 1/60 s, sub `(-97.455162126, -8,
-30.628513150)`, station ground -20.006922981. At completed frame 6,839,
  t=114 s, a naturally admitted humpback is at
  `(-164.602375659, -7.041756754, 29.377352085)`. Ground -15.935915658,
  L=35.576635619, floor -7.041756754, ceiling -7.715327124. The floor wins.

### Small defect found and fixed

The baseline main sweep completed all 364 runs but failed its assertions:
the explicit movement matrix had zero violations, while natural updates had
**63 below-clearance agent-frames** (including **two below actual ground**)
and **three feasible-column ceiling violations**. All were birth frames.
Regular replenishment and rare spawning ran after the integration loop, so
new animals skipped the hard limits until the following frame.

Baseline examples:

- Lost City, Medium, seed 7, focus, 1/30 s, t=130.2 s: sixgill shark
  y=-783.759027259, ground=-767.340849712, **16.418178 m below ground**.
  Low/seed 31/0.25 s also produced a sixgill 0.274107 m below ground at 130 s.
- Hunga, High, seed 7, focus, 1/30 s, t=128.133333 s: humpback
  y=-4.261324469, ceiling=-7.651099312, with feasible floor=-21.649055475.
- Additional clearance-only births: Blue Hole (1), Kama (9), Beebe (27)
  and Challenger (24). Lost City contributes the other two clearance failures.

**Fix:** move the existing pool integration loop to the end of
`LifeSim.update()`, after all population passes. Same loop, hard limits,
branches and arithmetic; one explanatory comment. Newly admitted animals now
move, clamp and begin fading in during their birth frame. Population/distance
checks read the pre-integration pose, and completed fades release capacity
after admission, a one-frame scheduling shift. Tier and species caps remain
unchanged and the existing population/rare tests pass.

Exactly **one capability test** was added to `tests/unit/lifeSim.test.ts`, under
`steering stability`: inspect every returned frame for ten seconds on a
synthetic basin rising from -700 to -600 m. Use the existing mixed-archetype
fixture table, High, seed 81, 1/30 s; require both rare and regular new groups.
The original order fails at frame 30: sperm whale y=-619.854673218 versus
floor=-591.708082648, also below actual ground -600. The new order passes.
The existing shallow-shark regression remains intact. `steer.ts` is unchanged.
The entire real-terrain main sweep was rerun after the fix and exited zero;
the shoreline sweep also exited zero.

### Validation and retained evidence

Disposable Node **v22.23.2** probes use Vite SSR with no listener/browser/WebGL:
`configFile:false`, middleware mode, `watch:null`, `hmr:false`, `ws:false`,
`optimizeDeps.noDiscovery:true`, cache under `/tmp`.

- Harnesses: `/tmp/life-water-sweep.mjs`, `/tmp/life-water-shore.mjs`.
  Main: `node /tmp/life-water-sweep.mjs`; final rerun uses
  `SWEEP_PREFIX=/tmp/life-water-after`. Shoreline:
  `SWEEP_SITE=great-blue-hole,hunga-tonga-caldera node /tmp/life-water-shore.mjs`.
- Baseline main results: `/tmp/life-water-before.json` and `.jsonl`, original
  log `/tmp/life-water-sweep.log` (**exit 1**, recorded failures above).
  Final: `/tmp/life-water-after.json`, `.jsonl`, `.log` (**exit 0**).
  Shoreline: `/tmp/life-water-shore.json`, `.jsonl`, `.log` (**exit 0**).
  JSON rows retain counts, species/archetypes, station coordinates, worst
  conflict magnitude, first conflict examples and first violation examples.
- New capability test before correction: **exit 1** at the floor assertion;
  `/tmp/life-water-birth-red.log`. Final targeted life simulation, tables and
  disposal suites: **3 files / 90 tests passed**, 4.78 s;
  `/tmp/life-water-birth-green.log`.
- Final `npm run build` with the repository's native-config loading workaround:
  **pass**, including TypeScript and PWA stamping;
  `/tmp/life-water-build-final.log`. Existing large-chunk advisory only.
  The ordinary runner attempt failed at PWA `closeBundle` after the module
  runner closed. A separate `--phase build` run built/stamped successfully but
  failed its additional provenance-manifest step with `spawnSync git EPERM`.
  Logs: `/tmp/life-water-build.log`, `/tmp/life-water-build-native.log`.
- `GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e`: **exit 1, Python only**;
  `/tmp/life-water-gates.log`, detailed logs
  `.cache/runs/20261025-063335-7-IekHFS/`. Config, strict content and initial
  build, full units, attribution and repository-wide Prettier pass. Full units:
  **192 files / 4,236 passed / 4 existing expected failures (4,240 total)**,
  699.65 s. Python: **167 tests / 162 passed / 5 failed**, matching the preceding
  package's documented failures: four `TestCiBuildManifest` cases report
  `spawnSync git EPERM`; `TestGolden.test_golden_tooling` reports
  `Unexpected end of JSON input` in `golden-manifest.test.mjs:151`. The gate
  began during the baseline investigation; the targeted life suites and native
  production build above ran separately after the correction.
- Independent JSON audit: pass for run/frame/agent-frame totals, complete
  per-species matrix trajectories, all seven archetypes and zero violations.
  Matrix integer counts are unchanged between baseline and corrected runs.
- Final owned-file Prettier and `git diff --check`: **pass**.

This is numeric terrain/life evidence. Props' `blocked` masks, optional authored
opening populations, rendered body envelopes, appearance, screenshots and phone
acceptance were not evaluated. No browser/e2e run: DIRECTOR places Codex work
in the nonvisual/headless lane. No assertion promises that every swimmer can
fit in every shallow column or that absent conflicts are globally impossible.

Simplicity: the production algorithm has no additional loop, branch, clamp,
allocation, setting, site exception, dependency or UI. Reordering the single
existing loop applies the shared invariant uniformly to births and survivors.
One existing capability spec is extended; no package numbers in code or tests.
No cuts, schema changes, commit, merge or push.
