# S-bughunt — seam contact small-fix assessment

Director item **9, S-verify / S-bughunt [Codex, standing]**; item ID **S-bughunt**.
Pinned main and HEAD: `6b7a7ce3df094e5600b8d9af79e63f19bd32e7e3`.
Branch: `codex/3300-S-verify-seam-contact-small`, initially clean and equal to main.
Read `plan/DIRECTOR.md` rules/rubric and the overnight tail through run 83 first.
Read 3050's progress note, contact test and Terrain diff as evidence only.
Neither 2980 nor 3050 was modified; no 3130–3270 slice was repeated or imported.

**Result: reproduced; no compliant small fix found. Stop with this note only.**
The original configured-clearance failure still exists on pinned main. Zero
production lines and zero permanent test lines changed. No game rendering,
art, CSS, layout, camera pose, setting, dependency, UI or save-schema changes.
No tools or Director edits, merge, push, tag or commit.

## Evidence and retained failure

Build shipped Lost City High terrain from its actual 367 × 310 GMRT heightmap.
CPU `THREE.Raycaster` reads the generated indexed meshes at LOD 0; it does not
copy the sampler formula. The witness uses X `1322.39306640625`,
Z `-2236.863427734375`. Nominal column-208 boundary X is
`1322.3930480110776`; its stored Float32 edge is about **18.395 µm east**.

| X offset from stored edge | Sampler Y (m)      | Upper mesh Y (m)   | Mesh hits       |
| ------------------------- | ------------------ | ------------------ | --------------- |
| −0.1 mm                   | −971.661982531075  | −971.66193914533   | fine only       |
| −10 µm                    | −971.8230446341577 | −971.6619530910516 | fine only       |
| 0                         | −971.8230467485819 | −971.6619546405759 | fine and coarse |
| +10 µm                    | −971.8230488630061 | −971.823029458182  | coarse only     |
| +0.1 mm                   | −971.8230678928242 | −971.8230484880721 | coarse only     |

At the exact edge, upper `chunk_192_112` face **12287** and lower
`chunk_208_112` face **704** both intersect; lower Y is `-971.8230273437498`.
At −10 µm the query has already selected the coarse patch although only the
fine mesh covers it. This establishes a finite rounding interval, not just
an ambiguous two-hit edge. Control errors at ±0.1 mm remain below **0.002 m**.

Use pristine `makeConfig`, `defaultSettings` and `resolveEffective` for both
Arcade and Realistic. Start at sampler Y + hull radius **8 m** + clearance
**4 m**, sim speed 1×. Idle cases use zero input/velocity; settling uses zero
input and velocity `(0, -0.001, 0)` m/s. Invoke real `sim.vehicles` and `events`
hooks for **120 ticks at 1/60 s** per case, **1,440 ticks total**. No system init,
renderer, scene draw or camera manipulation is needed.

| Case                   | Minimum mesh clearance, Arcade (m) |       Realistic (m) | Events per mode |
| ---------------------- | ---------------------------------: | ------------------: | --------------: |
| idle, −0.05 m          |                    11.999970592965 |     11.999970592965 |               0 |
| idle, −10 µm           |                **11.838922345783** | **11.838922345783** |               0 |
| idle, exact edge       |                **11.838921780883** | **11.838921780883** |               0 |
| idle, +10 µm           |                    11.999994484065 |     11.999994484065 |               0 |
| idle, +0.05 m          |                    11.999994524053 |     11.999994524053 |               0 |
| gentle contact, −10 µm |                **11.838908754193** | **11.838908754183** |               1 |

The retained contract is **≥11.998 m**, using the existing 2 mm mesh precision.
Six assertions fail, three per mode. After first gentle Arcade contact, centre
is `(1322.3930567647071, -959.8230449164396, -2236.8634288706194)`, reported
sampled altitude `12.000000354959866`, `touchedBottom=true`, and the collision
payload is `{depth: -959.8230449164396, speed: 0.00014239592143759587}`.
Thus sampled altitude claims the full margin while actual mesh clearance is
short by about **0.161 m**. This reproduction establishes a vertical-clearance
shortfall; it does not establish hull penetration.

## Smallest proposed correction and simplicity findings

`Terrain.sampleHeight` chooses patches from double-precision source bounds;
`TerrainChunk` stores mesh positions as Float32. Different subdivisions also
give different elevations along the same edge. A correct sampler correction
must select by stored bounds on both axes, handle either rounding direction,
choose higher support when sheets share an exact edge/corner, and keep endpoint
interpolation within the selected patch. The unmerged 3050 diff does this with
about 40 added per-query lines. It remains a proposal outside this package's
**none per-frame** limit; it was not collected or claimed net simpler.

No smaller compliant correction was found in the owned `src/world/Terrain.ts`:

- Replacing only nominal patch selection with rounded comparisons still needs
  per-query logic and does not resolve competing exact-edge/corner support.
  A fixed epsilon or always choosing one side fails opposite rounding or the
  nearby single-sheet controls.
- Build-time stitching or uniform subdivision would change terrain geometry,
  resource allocation and potentially appearance; these are outside the nonvisual
  brief. Altering only the patch-subdivision map would make the sampler describe
  different triangles from those actually built.
- Adding a constant height bias or increasing clearance by the observed 0.161 m
  would hide this witness while leaving the height mismatch and a reduced actual
  configured margin. This is not a validated bound for other seams. There is no
  existing per-patch contact-clearance datum in this file to tune independently
  of terrain heights; changing authored heights would change the terrain.

The smallest justified next proposal is the stored-bound sampler correction
above, if a later brief permits per-query changes; no new implementation or
architecture is proposed here. The missing seam contract was exercised as a
temporary extension of the existing terrain capability test, then restored byte
for byte. No failing permanent test, assertion relaxation, expected failure,
retry, skip directive, new spec or snapshot update is retained. The full failing
reproduction is preserved below instead of committing a knowingly red spec.

## Reproduction procedure

Temporarily append this block to `tests/unit/terrainCarveAgreement.test.ts` on
the pinned SHA (it uses the file's existing imports and `json` helper):

```ts
it('retains configured support at stored seam boundaries', async () => {
  const { defaultSettings } = await import('../../src/core/Save.js');
  const { resolveEffective } = await import('../../src/game/EffectiveSettings.js');
  const { FROZEN_INPUT } = await import('../../src/game/MissionRouter.js');
  const { createSubmarineSystem } = await import('../../src/app/systems/submarine.js');
  const config = makeConfig();
  const meta = json('data/tiles/lost-city/meta.json') as TileMeta;
  const bytes = readFileSync('data/tiles/lost-city/heightmap.bin');
  const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
  const terrain = new Terrain({ meta, heights }, config.terrain, 'high');
  const x = 1322.39306640625,
    z = -2236.863427734375;
  const ray = new THREE.Raycaster();
  const meshHits = (px: number, pz: number) => {
    ray.set(new THREE.Vector3(px, 100, pz), new THREE.Vector3(0, -1, 0));
    return ray.intersectObject(terrain.group, true).map((hit) => ({
      y: hit.point.y,
      chunk: hit.object.name,
      face: hit.faceIndex,
    }));
  };
  try {
    terrain.group.updateMatrixWorld(true);
    console.log(
      JSON.stringify({
        nominal: terrain.worldXOfCol(208),
        stored: x,
        probes: [-0.0001, -0.00001, 0, 0.00001, 0.0001].map((dx) => ({
          dx,
          sample: terrain.sampleHeight(x + dx, z),
          hits: meshHits(x + dx, z),
        })),
      }),
    );
    for (const mode of ['arcade', 'realistic'] as const) {
      const c = resolveEffective(defaultSettings(config), mode, null, config).submarine;
      for (const [dx, settling] of [
        [-0.05, false],
        [-0.00001, false],
        [0, false],
        [0.00001, false],
        [0.05, false],
        [-0.00001, true],
      ] as const) {
        const sub = new Submarine(c, terrain);
        sub.setSimSpeed(1);
        sub.reset(x + dx, terrain.sampleHeight(x + dx, z) + c.hullRadius + c.seabedClearance, z);
        if (settling) sub.velocity.set(0, -0.001, 0);
        const bus = new EventBus();
        const collisions: unknown[] = [];
        bus.on('sub:collided', (e) => collisions.push(e));
        const system = createSubmarineSystem();
        const ctx = { sub, bus, config } as import('../../src/app/context.js').GameContext;
        const frame = {
          steps: 1,
          fixedDt: 1 / 60,
          state: FROZEN_INPUT,
        } as import('../../src/app/System.js').FrameState;
        const steps = [];
        for (let i = 0; i < 120; i++) {
          system.frame!['sim.vehicles']!(frame, ctx);
          system.frame!.events!(frame, ctx);
          steps.push({
            position: sub.position.toArray(),
            altitude: sub.getState().altitude,
            touched: sub.getState().touchedBottom,
            clearance: sub.position.y - meshHits(sub.position.x, sub.position.z)[0].y,
          });
        }
        system.dispose?.();
        const min = Math.min(...steps.map((s) => s.clearance));
        console.log(JSON.stringify({ mode, dx, settling, first: steps[0], min, collisions }));
        expect
          .soft(min, `${mode} dx=${dx} settling=${settling}`)
          .toBeGreaterThanOrEqual(c.hullRadius + c.seabedClearance - 0.002);
      }
    }
  } finally {
    terrain.dispose();
  }
});
```

Run:

```sh
npm test -- tests/unit/terrainCarveAgreement.test.ts -t 'retains configured support at stored seam boundaries' --configLoader runner --cache=false --maxWorkers=1
```

Actual reproduction: **exit 1**, **1 failed test / 6 clearance assertions**,
**3.30 s**. The other eight existing tests were excluded by the name filter,
not counted as passes. Raw log `/tmp/3300-seam-repro.log`; standalone append
block `/tmp/3300-seam-repro.ts`. Restore the existing test after reproduction;
its original bytes are also retained locally in
`/tmp/3300-terrainCarveAgreement.original`.

## Validation and limits

Focused command:

```sh
npm test -- tests/unit/terrainCarveAgreement.test.ts tests/unit/Terrain.test.ts tests/unit/Submarine.test.ts tests/unit/terrainMemo1290.test.ts --configLoader runner --cache=false --maxWorkers=1
```

**PASS**, exit 0: **4 files / 58 tests**, **65.87 s**, no filtered tests.
Log: `/tmp/3300-focused.log`. The temporary reproduction was removed before
these checks, so this passing run does not cover the retained failure.

Required gates: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
Run `.cache/runs/20261022-233221-15-XplXc0/`; log `/tmp/3300-gates.log`.
**Completed, exit 1: FAIL gates (e2e=none)**. Config preparation, strict content,
production build (`tsc` + Vite), attribution and repository-wide Prettier **PASS**.

Full units: **191 files passed / 1 failed suite (192)**, **699.51 s**;
Vitest reports **3,776 passed / 3 expected fail / 1 skipped (3,780)**.
`tests/unit/montereyScarpSupport.test.ts` → `high west upper-wall contact`
failed in its existing `beforeAll` at line 21: **Hook timed out in 10000ms**.
The three expected failures come from the unchanged table-driven `it.fails`
scarp-gap contract; the remaining case was not run after its setup timeout.
No new skip or expected-failure marker was added. This is a setup-timeout
failure, not a seam assertion result. Its cause is not established here;
no retry, hook-timeout increase or scarp implementation change was attempted.
The unmerged scarp work remains uncollected. This failure and the Python
failures below are retained unresolved, outside the seam-only scope.

Python failed: **162 passed / 5 failed (167)**, **10.323 s**. Four unchanged
`test_ci_build_manifest` cases fail on Node child `spawnSync git EPERM`; the
`test_golden_tooling` case reports `Unexpected end of JSON input`. These match
the failure signatures retained in 3050; the JSON failure's cause is not
classified here. No tooling fixes, retries, skips or runner changes were made.
Final changed-file Prettier, `git diff --check`, byte-for-byte comparison of
the owned test with its original, and unchanged `src/`, `tests/`, `tools/` and
`plan/DIRECTOR.md` diff checks: **PASS**. Final git status contains only this
new note; HEAD remains the pinned SHA.

Actual e2e mode: **none**. No browser launch, rendering, visual acceptance,
real-phone performance, other-site audit or general hull/slope safety claim.
The existing suite passing would not clear the retained missing seam contract.
