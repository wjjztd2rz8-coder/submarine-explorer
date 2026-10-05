# F-VERIFY-610 — portrait opening pitch / Low

## Scope and spec

`tests/e2e/f-verify-610.spec.ts` loads Titanic, Lost City, Great Blue Hole, Beebe and Monterey in fresh **390×844 portrait touch** contexts at **Low**, DPR 1, Arcade free dive. It uses the same tutorial-off player view as the desktop golden shots, deterministic life seed 42 and dynamic resolution off. It waits for the game, props, discovery, preset and exploration systems, then waits **3 seconds** and two presented animation frames. The live pose, camera, physics and visible HUD are left untouched.

Each case checks:

- The live tier, chase view, viewport and coarse pointer/touch input.
- Visible hull geometry projected into CSS screen coordinates, including transformed instanced thrusters. Every projected hull bound must be within the viewport and camera depth planes.
- Required readouts, sonar, attribution and touch controls exist and are visible. All visible audited HUD panels stay inside the viewport, remain separate from each other and do not intersect the projected hull bounds. Optional scan, hint, warning, notice and exploration caption panels count when visible.
- No page exceptions or console errors through screenshot completion; no failed/skipped props and at least one rendered draw call.

PNG and JSON diagnostics are written **before the layout assertions**, preserving evidence for failures. The spec attaches both files and writes to `.cache/codex/shots/610/<site>-low-390x844-round-<n>.{png,json}`; retries have separate suffixes. `--repeat-each=2` retains both rounds for all five sites.

Projection checks establish framing and HUD separation. They do not establish brightness or visibility through rendered terrain; screenshot inspection is required for the “readable in 10 s” rubric.

## Visual review status

**Pending: no fresh portrait screenshots were obtained in this sandbox.** Local sockets are denied (`listen EPERM` on 127.0.0.1:4261). A separate Chromium launch probe also fails before opening a page (`sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`). Therefore there is no runtime pass or phone readability sign-off.

| Site            | Too dark   | Sub clipped / covered | Wall filling frame | Portrait review |
| --------------- | ---------- | --------------------- | ------------------ | --------------- |
| Titanic         | Unassessed | Unassessed            | Unassessed         | Capture pending |
| Lost City       | Unassessed | Unassessed            | Unassessed         | Capture pending |
| Great Blue Hole | Unassessed | Unassessed            | Unassessed         | Capture pending |
| Beebe           | Unassessed | Unassessed            | Unassessed         | Capture pending |
| Monterey        | Unassessed | Unassessed            | Unassessed         | Capture pending |

Existing desktop-only taste issue: `F-BLUEHOLE-PITCH.md` reports Great Blue Hole frame 1 is still mostly wall, with sparse fish near the pose; its muted alcove floor is also noted. These are prior observations, **not findings from a portrait/Low capture**. They remain listed rather than retuned. No camera/pose bug has been demonstrated here, so no configuration or art changes were made.

The checkout's `.cache/codex/shots` is a symlink to `/home/vijay/submarine-explorer/.cache/codex/shots`, outside the sandbox's writable roots. It was preserved; no placeholder images or substituted desktop shots were written.

## Validation

Ran `GATES_CONFIG_MODE=writable PW_PORT=4261 PW_OUTDIR=dist-verify-610 bash tools/gates.sh --full-e2e` twice. The writable configuration mode keeps generated configuration bundles and test caches out of the read-only dependency tree.

| Check                         | Round 1                                      | Round 2                                      |
| ----------------------------- | -------------------------------------------- | -------------------------------------------- |
| Production build / TypeScript | Pass                                         | Pass                                         |
| Unit suite                    | 1,315 tests / 123 files pass                 | 1,315 tests / 123 files pass                 |
| Python                        | 144 tests pass                               | 144 tests pass                               |
| Strict content / attribution  | Pass                                         | Pass                                         |
| Whole-repository Prettier     | Pass                                         | Pass                                         |
| Full E2E                      | Preview startup blocked; zero cases executed | Preview startup blocked; zero cases executed |
| Project-base E2E              | Preview startup blocked; zero cases executed | Preview startup blocked; zero cases executed |

Targeted execution with `--repeat-each=2 --retries=0` also fails at preview startup, before opening any page. Playwright discovery finds **10 cases** (five sites × two rounds). After adding the optional exploration caption to the audit, final typecheck, changed-file formatting and `git diff --check` pass. The isolated build was removed after verification.

Evidence: `.cache/f-verify-610/gates-round-{1,2}.log`, `e2e-round-{1,2}.log`, `e2e-base-round-{1,2}.log`, `targeted-e2e.log`, `discovery.log` and `preview.log`. The direct preview log confirms `listen EPERM: operation not permitted 127.0.0.1:4261`; the gate/targeted logs report `Process from config.webServer was not able to start`. Existing `.cache/gates/` logs retain the final static checks. No PNGs or opening JSONs were generated.

## Finish on a host with preview sockets and Chromium

```bash
GATES_CONFIG_MODE=writable PW_PORT=4261 PW_OUTDIR=dist-verify-610 \
  bash tools/gates.sh --full-e2e
GATES_CONFIG_MODE=writable PW_PORT=4261 PW_OUTDIR=dist-verify-610 \
  npx playwright test tests/e2e/f-verify-610.spec.ts \
  --repeat-each=2 --retries=0 --output=test-results-verify-610
```

Inspect both rounds of all five PNGs at their native phone size. Record whether the hull and site identity read within 10 seconds, darkness, clipping/occlusion and wall dominance in the table above. Fix only demonstrated camera/pose configuration bugs; retain subjective lighting, framing and art preferences as taste issues. Run the focused spec again after any configuration fix, then the full gate. Remove the isolated `dist-verify-610` build when finished.
