# S-dead: remove unused terrain terraces

2026-10-27, Codex lane. Reference: `e3700acd7cef61dc558f12eeb2f203866724d191`.

## Usage evidence and change

- Read `plan/DIRECTOR.md` and checked the 13 shipped IDs in `data/landmarks/index.json` against their tile and site data.
- Before removal, `rg -n -i '\bterrace\b' src tests data tools` found the fidelity field in `src/core/config/terrain.ts`, its calculation in `src/world/Terrain.ts`, and the dedicated block in `tests/unit/terrain-detail.test.ts`. The only configured value was Lost City's `{ periodM: 24, amount: 0 }`; the only nonzero value was a synthetic test fixture. The baseline audit also asserted that no shipped profile enabled it.
- Removed the displacement branch, its zero contribution to the height expression, the optional config field, the disabled Lost City entry and five tests that existed solely to exercise this unused capability. Updated the vent integrity comment; its real-survey regression checks remain.
- Post-removal grep finds no `terrace`, `bedAmount` or branch seeds in these three files, and no `"terrace"`/`terrace:` config keys anywhere in `src` or `data`. Blue Hole's reconstructed shelves, prop terraces, Challenger tint and factual site copy are separate, used features and remain intact.
- Logged the cut in `CHANGELOG.md`. No shipped data or snapshot was edited, no package numbers were added to code, and no replacement machinery was introduced. Net **104 fewer lines**, including this report.

## Exact numeric comparison

An ignored audit in `.cache/terrain-audit/` bundled the reference implementation before editing and the resulting implementation afterward. Both runs used the same shipped configuration and full real heightmaps for every shipped site, at Low/Medium/High.

All **39/39 site/tier records match byte for byte**, covering:

- Every resident terrain geometry attribute and all three LOD index buffers: **66,765,589 vertices** across the records, including skirts.
- Complete terrain statistics and **11,856 query positions**, covering the tile, outside its boundaries, each profile focus and every authored POI.
- Float64 bytes for survey height, detail displacement, contact height, normal components and scour height/rim at those positions.

Artifacts: `.cache/terrain-audit/{before,after}.json`, corresponding `.mjs` bundles and logs, with `audit.ts`/`bundle.mjs` retaining the procedure. Both JSON files have SHA-256:

`e165592e9366b89fe64d49749f327d6331d4d0f0e3895761fb544b0e27eea6d8`.

The existing authored prop geometry goldens pass **12/12**, without updating expectations. No browser screenshots or visual acceptance are claimed.

## Validation

- Build/typecheck and strict content validation: passed through `GATES_CONFIG_MODE=writable PW_PORT=4186 bash tools/gates.sh`.
- `Terrain.test.ts`: **17 passed**; `terrain-detail.test.ts`: **61 passed**, including shipped vent integrity, scour, LOD, seams and detail checks.
- Repository-wide Prettier, attribution and `git diff --check`: passed.
- Full unit coverage: **192 specs / 4,324 tests passed**, including unchanged terrain and prop golden expectations. Used `--configLoader runner --cache=false --pool=threads`: 51 complete specs / 2,820 tests before a 600-second limit, then all 141 remaining specs (including the interrupted spec) passed with two workers. The canonical fork phase was interrupted without results. Evidence: `.cache/terrain-audit/unit-{threads,remaining}.log` and `unit-batches.json`.
- Python tooling: **162 passed / 5 failed**. Four build-manifest cases report `spawnSync git EPERM`; the golden-tooling case gets empty subprocess output (`Unexpected end of JSON input`). These untouched tooling failures also appear in earlier numeric progress notes.
- Browser smoke: unable to start its preview server. A direct preview attempt confirms `listen EPERM: operation not permitted 127.0.0.1:4187`. Project-base browser validation is likewise unavailable under this sandbox.

The aggregate gates are **not green in this environment**. No assertions were weakened or tooling modified to hide the subprocess/socket restrictions; an unrestricted gate run is still required.
