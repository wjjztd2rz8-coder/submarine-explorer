# F-TITLE-BC-REVIEW

2026-10-03 — implementation and geometry review complete; **browser visual
acceptance blocked**, not signed off.

## Changes and evidence

- Added `tools/f-title-bc/{index.html,review.ts,capture.mjs,README.md}`. It uses
  the real `loadTitleCrop()` and an isolated ACES/sRGB renderer, captures
  1280×720 and 390×844 on Low/High at DPR 1, records actual renderer counters,
  raycasts the mesh for clearance, and saves identical-pose lamps-off comparisons.
  It is opt-in and outside the production entry graph/e2e discovery. The Vite
  harness bundle builds successfully into `.cache/f-title-bc-build/`.
- Fixed framing in `TitleScene.ts`: projected desktop hull was 10.47% of the
  viewport, below §4's 14–18%; it is now 16%. The portrait shot's existing 24%
  target was actually only 14.63–14.79% because the world-aligned bounding box
  overstated the diagonal hull. Measure actual mesh vertices, including instance
  transforms, at framing events. Portrait now reaches 24% inside its hero band.
  FOV, metre scale, anchor, heading and camera offsets remain as authored.
- Clamp the final hovered vehicle pose to the clearance guard. A nearby-ridge
  fixture previously dropped below 12 m during downward hover (minimum 11.86 m).
- Suppress the gameplay vehicle's periodic navigation strobe using its existing
  `reduceMotion` property, including tier rebuilds. Previously its initial RGB
  peak was 8.7 and its halo flashed even in a static title shot; §5 forbids flashes.
- Read render counters after a presentation rather than claiming scene traversal
  estimates are GPU counts. Pre-draw estimates now include sprites, which were
  previously omitted. Actual GPU verification still awaits a browser.
- `TitleTerrain.ts` needed no speculative changes. Its 2.4 km real-metre crop,
  anchor, north-to-south sampling, bilinear convention and winding were consistent
  with existing code/tests. No terrain exaggeration, smoothing, material, lamp
  intensity or fog-density changes were made without visual evidence.
- Added real-Monterey tests covering all four requested tier/viewport cases,
  actual projected hull width/position, full-loop sampler clearance, mesh raycast
  clearance, an unobstructed camera-to-sub ray, and both lamp axes reaching real
  sediment inside their 170 m range. Existing lifecycle/motion tests are retained.
- Added `GATES_CONFIG_MODE=writable` to `tools/gates.sh` for read-only dependency
  trees. It bundles the unchanged Vite configuration into `.cache/gates` for
  native loading, and uses the Vitest runner without a dependency-tree cache.
  The Vite runner alone fails in the existing PWA plugin's late imports after
  closing; the writable bundle successfully builds/stamps the real application.
  Gate selection and default behavior are unchanged.

Geometry estimates with the real 51,200-triangle crop (static pose, before draw):

| Tier | Calls | Triangles | Budget         | Authored snow |
| ---- | ----: | --------: | -------------- | ------------: |
| Low  |     7 |    67,060 | ≤35 / ≤100,000 |           200 |
| High |    20 |    82,046 | ≤60 / ≤200,000 |           600 |

Animated snow adds one estimated call and no triangles. These are headless
geometry estimates, **not measured GPU counters**. The real camera remains
above both sampled and rendered terrain for the entire motion loop; the vehicle
stays above its guard and its view is unobstructed at the sampled phases.

The new regressions were run against the original `HEAD` scene temporarily:
eight assertions failed (both desktop/portrait sizes on both tiers, hover,
Low/High strobe and diagnostics). The fixed scene was restored and the tests
pass. Log: `.cache/f-title-bc-regressions.log`.

## Browser restriction and screenshot paths

The capture attempt failed before a page could render. Chromium exits with
`FATAL:content/browser/sandbox_host_linux.cc:41 ... Operation not permitted`.
A Vite listen attempt also failed with `listen EPERM 127.0.0.1`. The available
Browser runtime returned no connected browsers. This session cannot request
elevated execution. No screenshots or real renderer measurements exist.

Failure evidence:

- `.cache/codex/shots/f-title-bc/after/run-error.txt`
- `.cache/codex/shots/f-title-bc/capture.log`

Expected screenshot paths after running the harness on a browser-capable host
(these files **do not yet exist**):

- `.cache/codex/shots/f-title-bc/after/1280x720-low.png`
- `.cache/codex/shots/f-title-bc/after/1280x720-high.png`
- `.cache/codex/shots/f-title-bc/after/390x844-low.png`
- `.cache/codex/shots/f-title-bc/after/390x844-high.png`

The worktree's ignored `.cache/codex/shots` initially pointed to a missing
directory outside the writable workspace. Its symlink is preserved as
`.cache/codex/shots.external-link`; outputs use a local ignored directory.

## Visual/design judgment still required

On a browser-capable host, run `node tools/f-title-bc/capture.mjs after` and
inspect all four PNGs plus lamps-off comparisons. Judge cream-hull readability,
Low-tier canyon slope visibility, restrained pools without hull clipping,
sediment color, and the canyon's lower/right diagonal composition. Camera
clearance and framing have geometry evidence; readability/brightness do not.
Adjust lamp intensity/fog/fill only after that review. Review the portrait hero
with the eventual Home caption/plate because this isolated harness contains no
UI overlays. Do not mark B/C visually accepted until images and actual GPU
budgets are checked.

## Gates

Ran `GATES_CONFIG_MODE=writable PW_PORT=4290 tools/gates.sh` (default smoke
plus project-base selection). All static gates pass: configuration bundle,
application build/typecheck, 1,043 unit tests in 100 files, 134 Python tests,
content validation, attribution and whole-repository formatting. The three title
unit files contain 35 passing tests. The project-base application also builds
and stamps its service worker successfully. Harness build and syntax checks pass;
the harness/title modules are absent from the unwired application bundle.

Browser gates return failure **at preview startup**, before any assertions run.
The unchanged Playwright preview command tries writing its config bundle under
read-only `node_modules/.vite-temp` (`EROFS`). A separate preview using the
writable bundle reaches `listen EPERM 127.0.0.1:4291`; capture independently
hits Chromium's denied socket operation. These are execution restrictions,
not failed visual or gameplay assertions. Full gate exit status is 1.

Logs: `.cache/gates/{config,build,unit,python,content,attribution,prettier,e2e,e2e-base}.log`,
`.cache/gates/preview-environment.log`,
`.cache/gates/preview-native-environment.log`, and
`.cache/f-title-bc-harness-build.log`. Gate orchestration tests now exercise
writable-config sharing/cleanup and invalid-mode rejection, and isolate their
configuration from the invoking shell.

No commit made. Remaining work is browser capture, actual GPU budget checks,
visual judgment and any tuning those images establish as necessary.
