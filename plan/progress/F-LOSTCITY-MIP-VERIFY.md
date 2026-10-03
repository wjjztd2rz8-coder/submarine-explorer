# F-LOSTCITY-MIP-VERIFY

## Plan

- Compare the exact terrain shader from `40df6ec^` with F-LOSTCITY-4 in an
  otherwise identical frozen scene. Cover Titanic, Lost City, Great Blue Hole,
  Beebe vents and Monterey on High, Medium and Low.
- Capture opening and wider hero/terrain views; measure screenshot luminance
  and inspect far-terrain detail, especially Lost City's gravel checker.
- Tune only if the comparison shows excessive smoothing; repeat the full
  matrix with the final shader. Check Lost City's opening readability.
- Add a changelog entry and run `tools/gates.sh` including both e2e gates.

## Result: blocked on rendering, shader unchanged

- Confirmed the original change applies +3 mip levels by 40 m, with no bias
  within 3 m, across every site's albedo slots and breakup sample.
- Baseline is the exact shader immediately before `40df6ec`
  (`40df6ec^:src/shaders/terrain.frag.glsl`). No stash or checkout mutation is
  needed: the capture tool substitutes the complete old shader injection sections
  into the current scene's material, then restores the current sections.
- Added `tools/terrain-mip-verify.mjs`. It targets 30 pairs: five sites × three
  tiers × opening/wide views. Each pair replays the same frozen scene and post
  pass, at 1280 × 720, DPR 1, dynamic resolution off, life seed 42, fresh Arcade
  context. The wide view is 40 m from the hero axis/footprint at 15 m seabed
  altitude, using a collision-free bearing. Pose and shader hashes are recorded.
- Captures include normal screenshots and canvas-only PNGs. Means use
  `0.2126 R + 0.7152 G + 0.0722 B` on full-resolution sRGB bytes (0–255).
  Whole-canvas and lower-half means, signed absolute/percent deltas and lower-half
  standard deviation are recorded. These are display-space luma, not linear
  radiance. The lower half is a consistent screen region, not a terrain-only
  mask; inspect the wide images for local smoothing hidden by aggregate means.
- A third render of the after shader must match the previous canvas PNG exactly.
  A drifting scene, stale preview shader, near-black frame, incorrect tier or
  incomplete props rejects the pair. Partial matrices exit nonzero; visual
  review is always explicitly pending until a human/agent inspects the images.
- Four offline tests cover exact substitution without changing engine chunks,
  stale/ambiguous source rejection, section ordering, luma arithmetic and signed
  deltas. Browser execution of the tool remains unverified.

## Capture matrix

No new screenshots were produced. **N/A means unmeasured, not zero change.**

| Site            | Tier   | Before/after opening + wide | Mean luma delta | Far blandness |
| --------------- | ------ | --------------------------- | --------------- | ------------- |
| Titanic         | High   | Blocked                     | N/A             | Not assessed  |
| Titanic         | Medium | Blocked                     | N/A             | Not assessed  |
| Titanic         | Low    | Blocked                     | N/A             | Not assessed  |
| Lost City       | High   | Blocked                     | N/A             | Not assessed  |
| Lost City       | Medium | Blocked                     | N/A             | Not assessed  |
| Lost City       | Low    | Blocked                     | N/A             | Not assessed  |
| Great Blue Hole | High   | Blocked                     | N/A             | Not assessed  |
| Great Blue Hole | Medium | Blocked                     | N/A             | Not assessed  |
| Great Blue Hole | Low    | Blocked                     | N/A             | Not assessed  |
| Beebe vents     | High   | Blocked                     | N/A             | Not assessed  |
| Beebe vents     | Medium | Blocked                     | N/A             | Not assessed  |
| Beebe vents     | Low    | Blocked                     | N/A             | Not assessed  |
| Monterey        | High   | Blocked                     | N/A             | Not assessed  |
| Monterey        | Medium | Blocked                     | N/A             | Not assessed  |
| Monterey        | Low    | Blocked                     | N/A             | Not assessed  |

The earlier F-LOSTCITY-4 report only covers Lost City High/Low. Its historical
measurements do not verify this full matrix. Darkness, washout, far-detail loss,
continued aliasing suppression and **Lost City readability within 10 s remain
unverified** here. The shader has not been tuned without visual evidence.

## Environment evidence

- Preview startup fails with `listen EPERM: operation not permitted
127.0.0.1:4260`; a separate bind check on `0.0.0.0` fails as well.
- Browser runtime discovery returns `No browser is available`, with an empty
  browser list.
- Installed Playwright Chromium exits at startup with
  `FATAL:content/browser/sandbox_host_linux.cc:41 ... shutdown:
Operation not permitted (1)` (SIGTRAP).
- `MIP_BEFORE_SHADER=.cache/mip-verify/before.frag.glsl node
tools/terrain-mip-verify.mjs http://localhost:4260/ .cache/mip-verify`
  exits 1 and writes an explicitly incomplete manifest/report/contact sheet,
  containing zero capture results and the browser startup failure. The supplied
  baseline file was extracted with `git show 40df6ec^:src/shaders/terrain.frag.glsl`.
- The worktree's shared `node_modules` symlink was replaced with a local ignored
  directory of package symlinks so Vite/Vitest can write their caches inside the
  writable worktree. No dependencies or lockfile changed.

Artifacts: `.cache/mip-verify/results.json`, `results.md`, `index.html`,
`before.frag.glsl`, `after.frag.glsl`. These document the failed attempt; the HTML
contains no screenshot pairs. Gate logs: `.cache/gates/`.

## Validation

`PW_PORT=4261 tools/gates.sh` was run with both e2e gates enabled:

| Gate              | Result                                       |
| ----------------- | -------------------------------------------- |
| Build / typecheck | PASS                                         |
| Unit              | PASS                                         |
| Python            | PASS                                         |
| Content           | PASS                                         |
| Attribution       | PASS                                         |
| Prettier          | PASS                                         |
| E2E               | FAIL: preview server cannot start in sandbox |
| E2E project base  | FAIL: preview server cannot start in sandbox |

The final rerun after the tool/tests/report/changelog updates produced the same
six passes and two server-startup failures, exiting 1. Unit: 97 files / 1,000
tests passed. Python: 132 tests passed, including the four new capture-tool
checks. `git diff --check` passed. This is not an all-green result.

## Resume on a machine with browser/server support

```bash
npm run build -- --outDir dist-mip-verify
npm run preview -- --port 4260 --strictPort --outDir dist-mip-verify
# In a second terminal:
node tools/terrain-mip-verify.mjs http://localhost:4260/ .cache/mip-verify
PW_PORT=4261 tools/gates.sh --full-e2e
```

If the baseline ref is missing from a shallow clone, supply its exact shader
with `MIP_BEFORE_SHADER=/path/to/before.frag.glsl`. Inspect all 30 pairs in the
contact sheet and enter the measured values and visual judgments above. For
Lost City inspect the opening during the first 10 s of an actual dive on each
tier; the capture tool records asset-ready wall time, which is not a readability
test or a physical-GPU performance prediction. If smoothing proves excessive,
try a smaller strength, then re-run the full matrix and inspect Lost City's
distant/grazing slope for checker recurrence before accepting it.
