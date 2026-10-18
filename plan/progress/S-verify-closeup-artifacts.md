# S-verify-closeup-artifacts

Backlog 8 (S-verify), numeric/behavioral review of `c4041dd^..c4041dd` and
`plan/progress/V-closeup-artifacts.md`.

## Root cause and correction

The new `tools/titanic-poses.json` set both authored positions to the bow's root
height plus 4 m. That root-relative offset did not account for the surrounding
terrain elevation or the submarine's clearance envelope. Capture tooling freezes
`sub.step`, and `Submarine.reset` assigns the position without collision
resolution, so capture physics did not correct the overlap.

The orchestrator confirmed the three new Titanic tier cases were the only unit
failures outside the sandbox. The follow-up request to fix the root cause
authorized correcting this pose data despite the original restriction on
`tools/`. Both `above` fields are now **18 m**. The target, bearing and ranges
remain the same. No capture-tool implementation or game source was changed.

Using the shipped tile, real terrain sampling and prop placement, the submarine
centre's height above the seabed is:

| Tier   | Approach before | Close before | Approach corrected | Close corrected |
| ------ | --------------: | -----------: | -----------------: | --------------: |
| Low    |      1.179336 m |   0.307328 m |        15.179336 m |     14.307328 m |
| Medium |      0.341403 m |  -0.628129 m |        14.341403 m |     13.371871 m |
| High   |      0.114524 m |  -0.934267 m |        14.114524 m |     13.065733 m |

All six positions now clear the **12 m normal physics floor** (8 m hull radius
plus 4 m seabed clearance), with at least 1.065733 m margin. The existing
`lowTierFollowups.test.ts` capability spec now checks this full floor, strengthening
the initial 8 m assertion. All three tier cases pass. Pose values are finite,
the direction is approximately unit length, the prop ID resolves, both positions
avoid prop colliders, and the first-person camera projects the target centrally
within its depth range. No assertions or timeouts were weakened.

## Life numerics and regression guards

- `lifeSim.test.ts`: real instance matrices for every catalogue species, at
  individual scale 0.8/1/1.2, are finite and monotone through the near-camera
  transition. Checks cover both smoothstep edges, a 100-step sweep including
  the 2% floor transition, and composition with spawn/despawn fade. Midpoint
  scale is 50% (25% with half fade); inner/outer limits are 2%/100%. Large
  animals exercise the 5/10 m capped edges. Frozen updates respond to camera
  movement independently of the submarine at all 13 sites and all tiers.
- `lifeTables.test.ts`: the readability floor is continuous at 15 cm and where
  normal scale overtakes it. Representative shrimp, small fish, blue tang and
  metre-long animals retain the intended drawn sizes.
- `lifeSim.test.ts`: each species' actual material receives both specular
  multipliers and one common multiplier for all reflected-light components.
  Evaluating the emitted scalar cap expression verifies identity below 0.28,
  continuity at the knee, monotonicity and the 0.45 ceiling. Standard lighting
  precedes the cap; wildlife glow and fog remain present. These are headless
  shader-source/numeric checks, not GPU compilation or screenshot acceptance.
- Camera proximity changes neither instance counts nor draw/triangle counts.
  Tier limits and existing static/rendered perf assertions are unchanged; life
  retains one instanced mesh per species and the existing spark layer.

## Simplicity and review boundary

Life changes remain in shared definition, renderer and material paths, without
site branches, runtime config mutation, new settings, UI, guidance or geometry.
Titanic's correction stays in its existing per-site pose table. No new on-screen
element needs replacement. The guards extend existing capability specs; no new
package-named spec was added. Scan, Journal and accessibility interfaces are
untouched. Beauty, hue acceptance, phone appearance and screenshot acceptance
remain Claude's review; Codex did not render the game. No edits to source, CSS,
layout, capture-tool implementation or `plan/DIRECTOR.md`; no merge, push or tag.

## Validation after correction

- `npm test -- --configLoader runner --cache=false
tests/unit/lowTierFollowups.test.ts tests/unit/lifeSim.test.ts
tests/unit/lifeTables.test.ts`: **45 passed, 3 files**, 14.43 seconds. This
  includes all three formerly failing Titanic cases with the stronger clearance
  assertion, all original cases in those specs, and the life regression guards.
- `npm run typecheck`, changed-file Prettier and `git diff --check`: **passed**.
- The preceding focused static-budget/wreck/life/opening run passed **111 tests
  across 6 files**. Static census covered all 13 sites on Low and High. Low peaks
  were 40 calls / 284,010 triangles, below unchanged 1,200 calls / 1,200,000
  triangles guards. High census is diagnostic. The follow-up changes only pose
  heights and strengthens the clearance assertion.
- **Orchestrator gate run before correction**, provided by the user:
  `.cache/runs/20261018-000015-2196696-D8XaPP/`. Python, content, build, root smoke,
  project-base browser checks, attribution and formatting **passed**. Full units:
  **3,189 passed / 3 failed**, 192 files, 421.52 seconds; only the three Titanic
  pose cases failed. The final focused run above verifies their correction.
- **Environment limits, separately:** earlier sandbox gate runs failed Python
  subprocess/provenance and preview startup operations (`EPERM` / empty golden
  comparator subprocess output). The orchestrator's external run passed those
  gates. Vite/Chromium browser validation must run outside this sandbox; it was
  not repeated here after the pose correction. No new full-suite or external
  browser gate result is claimed after this correction.
