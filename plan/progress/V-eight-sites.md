# V-eight-sites — golden evidence tooling (brief 1720)

Work serves the named **V-eight-sites tooling [Codex]** backlog item in `plan/DIRECTOR.md`. This package implements capture tooling; Claude's capture/judgment and any appearance fixes remain separate backlog work.

## Changes

- `GOLDEN_MODE=mission tools/golden.sh` plans 78 PNGs: all 13 catalog missions once each, desktop 1600×900, phone portrait 390×844 and landscape 844×390, with first loaded mission frame and +10 seconds. `GOLDEN_SITES`, aliases, `GOLDEN_LAYOUTS` and `GOLDEN_TIER` remain available for smaller sweeps.
- Mission URLs use `?mission=<id>&skipBriefing=1` and the game's own mission spawn/camera. The browser init script holds the first presented frame after props, discovery and terrain textures finish loading. It resumes normal simulation until mission elapsed time advances by 10 seconds, then holds that frame. Screenshot readback time is excluded from frame timestamps. No submarine step override, camera reset or approach/detail pose runs in mission mode.
- `poses.json` records `sha`, Boolean `dirty`, `buildMode`, capture `mode`, layouts, planned missions, navigation URL, requested `timeS` (0/10), actual `missionElapsedS`, mission ID and existing pose/HUD diagnostics. SHA/dirty/mode are stamped into HTML by a Vite tooling plugin and read from the served build, rather than guessed from the checkout at capture time. Every navigation must match that provenance; missing metadata or a changed build fails closed. A failure before the server is reached leaves provenance null and marks the manifest incomplete.
- The contact sheet labels every PNG with site, layout, capture mode and full SHA, and shows build mode/dirty status and mission timing in its introduction.
- The default remains High-tier desktop free dive with the original hero selection, filenames, fixed poses and physics freeze. `tools/golden.sh` is unchanged. Old unstamped builds must be rebuilt before capture.
- Twelve browser-independent Node tests cover build provenance (clean, tracked/untracked dirty, stale checkout, development/production), invalid metadata, serialized manifests/contact sheets, all live mission URLs/layouts, frame holds and screenshot timing, and existing free-dive selection/poses. A Python discovery wrapper includes them in the canonical gates.

## Simplicity and scope

No game source, appearance, HUD elements, player settings, shared site branches or `plan/DIRECTOR.md` changes. Existing capture scheduling and output formatting are extracted into directly tested helpers. The mission capture redesign is logged in `CHANGELOG.md`; no gameplay capability is cut. Existing regression assertions are retained; no skips added.

## Verification

- `npm run typecheck`: PASS.
- `node --test --experimental-test-isolation=none tools/tests/golden-*.test.mjs`: PASS, 12 tests, zero skips. In-process Node tests avoid this sandbox's child-process test isolation restrictions.
- `python3 -m unittest discover -s tools/tests -p test_golden.py -v`: PASS.
- Required build (typecheck + Vite): PASS. Generated HTML was independently parsed and contains SHA `259c2a0b0475163a8ff11eeb9deff19c2b9b3897`, `dirty: true`, `buildMode: production` (`.cache/1720-validation/built-provenance.log`).
- Whole-repository Prettier, JS/shell syntax and `git diff --check`: PASS.
- Full unit suite: PASS, **2,181 tests / 190 files**, zero skips, 787.01 seconds. Required `tools/gates.sh` ran its normal smoke + project-base sequence without skip flags. It used `GATES_CONFIG_MODE=writable` for the read-only shared dependency tree, with a validation-only shell wrapper selecting Vitest threads and one worker.
- Gate summary: **PASS config, strict content, build/typecheck, unit, attribution, Prettier; FAIL Python, root e2e, project-base e2e; overall exit 1**. Both root and `/submarine-explorer/` production builds succeeded. Logs: `.cache/runs/20261014-053209-4-clgmda/` and `.cache/1720-validation/gates.log`.
- Python: **162 passed / 166 total**; the new golden wrapper passed. Four unchanged `test_ci_build_manifest.py` cases failed because the sandbox rejects Node's `execFileSync('git', ...)` with `spawnSync git EPERM`. Their implementation and assertions are outside this item and were not changed.
- Both e2e gates attempted their owned preview servers and failed before test execution. A direct invocation of the same preview command confirms `listen EPERM: operation not permitted 127.0.0.1:4371` (`.cache/1720-validation/preview-probe.log`). No e2e assertion was weakened or skipped; these gates remain unverified here.
- Final 12 tooling tests and their Python wrapper were rerun after the rendered-frame guard was added and pass. Whole-repository formatting and `git diff --check` pass after the final progress-note update.
- Real mission capture attempted: Chromium failed at launch with `sandbox_host_linux.cc:41`, `Operation not permitted`. The tool returned failure and retained an incomplete manifest/contact sheet at `.cache/golden/2026-10-14-103210/`. No PNG or visual verification is claimed.

## Remaining

Run `GOLDEN_MODE=mission tools/golden.sh` on a browser-capable merged build and judge the 78 captures, particularly the eight non-hero mission spawns and phone orientations. Visual review and hosted CI remain outside this tooling package. The full gates and actual PNG capture still require an environment that permits preview sockets, Chromium and synchronous Git subprocesses. Changes are left in the worktree; Git metadata is read-only in this session. No merge, push or tag performed.
