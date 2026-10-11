# F-VERIFY-LC-CI — Lost City tower2 and hosted CI verification

2026-10-11. Verification checkout: `5bacb5b19ae559ce2a63a9eee1671f9d4578390b`.
Only this report is changed; production code, tests, assertions and workflows are untouched.

## Revision and capture scope

The checkout includes `f-lostcity-tower2` and `f-ci-timeouts`, plus later Lost City work
(including merged brucite fin geometry in `src/world/props/geo/towers.ts`). These are
captures of the current checkout, not an isolated replay of the tower2 merge.
The latest main CI commit is `cb15f7d8efbe6f25b41e44d972ed8399d274858e`;
its poses, installer and verification specs match this checkout, but its tower
geometry predates the additional fins. Visual and CI evidence therefore have
separate revision labels.

Built the unmodified app with an equivalent bundled Vite config under `.cache`
using the repository's `tools/gates.sh` writable-config technique. The default
config loader attempts to write into the read-only dependency symlink; the runner
loader also fails in the PWA plugin's late imports. Native loading of the bundled
config completes typecheck, production build, public asset copy and worker stamping.

Capture commands use the requested `tools/golden-shots.mjs`, `GOLDEN_SITES=lost-city`,
High and Low, desktop 1600×900 and phone landscape 844×390. Arcade free dive,
fresh contexts, seed 42, dynamic resolution off, Chromium SwiftShader, DPR 1.
Shots 1/2/3 are spawn / authored 70 m approach / authored 32 m detail.
The authored target is `[0,56,0]` with approach/detail heights 38/66 m above it.
The tool freezes submarine stepping; these captures do not test moving-sub collision.

**All 12 requested captures are saved and visually inspected.**
[Combined contact sheet](../../.cache/verify-lc-ci/lost-city.html),
[merged measurements](../../.cache/verify-lc-ci/matrix.json).

| Tier/layout  | Spawn / approach / detail evidence                                                                                                                                                                                 | Manifest                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| High desktop | [1](../../.cache/golden/2026-10-11-065341/lost-city-1.png) / [2](../../.cache/golden/2026-10-11-065341/lost-city-2.png) / [3](../../.cache/golden/2026-10-11-065341/lost-city-3.png)                               | [poses](../../.cache/golden/2026-10-11-065341/poses.json) |
| Low desktop  | [1](../../.cache/golden/2026-10-11-070100/lost-city-1.png) / [2](../../.cache/golden/2026-10-11-070100/lost-city-2.png) / [3](../../.cache/golden/2026-10-11-070100/lost-city-3.png)                               | [poses](../../.cache/golden/2026-10-11-070100/poses.json) |
| High 844×390 | [1](../../.cache/golden/2026-10-11-065651/lost-city-landscape-1.png) / [2](../../.cache/golden/2026-10-11-065651/lost-city-landscape-2.png) / [3](../../.cache/golden/2026-10-11-065651/lost-city-landscape-3.png) | [poses](../../.cache/golden/2026-10-11-065651/poses.json) |
| Low 844×390  | [1](../../.cache/golden/2026-10-11-065801/lost-city-landscape-1.png) / [2](../../.cache/golden/2026-10-11-065801/lost-city-landscape-2.png) / [3](../../.cache/golden/2026-10-11-065801/lost-city-landscape-3.png) | [poses](../../.cache/golden/2026-10-11-065801/poses.json) |

The first combined High run saved all three desktop images but lost its preview
before phone navigation; its manifest honestly remains `complete:false`.
The standalone phone reruns and final Low desktop run are complete. Two earlier
Low desktop attempts ended with exit 143 and have no complete manifest; they are
not counted as successful runs. All retained final images have the requested
PNG dimensions, correct tier and zero failed props. The completed runs record
no page error or renderer crash.

For the final Low desktop retry, a temporary Node preload selects the golden
tool's existing `cdp-viewport` fallback immediately by rejecting its initial
Playwright screenshot call. This avoids repeated readback stalls; the actual
tool, app, pose calculation, renderer flags, image validation and tier/prop
checks are unchanged. The manifest labels all three images `cdp-viewport`.
[Preload](../../.cache/verify-lc-ci/cdp-first.mjs),
[capture log](../../.cache/verify-lc-ci/golden-low-desktop-cdp.log).

## Visual findings and performance limits

- **Vent obscured by HUD:** the scan panel covers Poseidon's main crown at spawn
  in both tiers and layouts. At 844×390, the detail panel also overlaps the main
  lip and its fins. The right-hand vent remains visible, and the approach framing
  shows both tips below the panel. This is a capture/UI framing defect for vent
  review; it is not evidence that the vent geometry is absent.
- **Low ring looks like lights:** Low detail resolves the main fringe into bright,
  separate beads around a very pale crater, rather than a faint mineral edge.
  High detail has a subtler ring; Low's crater interior also lacks a clearly dark
  throat in this lit pose. These are appearance findings at the captured lighting,
  not a claim of incorrect geology or a measured brightness regression. The thin
  later fin geometry is visibly angular/spiky in the detail poses.
- **Flicker not reproduced in the stationary temporal samples:** three Low phone
  detail frames span **8.63 s**, and three High phone detail frames span **19.30 s**
  by browser timestamps. Camera positions/yaw are identical within each series;
  the solid tower silhouette, crown and ring remain stable while plume particles
  change. This is sparse fixed-pose evidence, not a continuous video or acceptance
  of flicker during camera movement, dynamic resolution or hardware rendering.
  [Low sequence](../../.cache/golden/2026-10-11-065815/index.html),
  [High sequence and ring toggle](../../.cache/golden/2026-10-11-065921/index.html).
- **Ring-through-terrain not reproduced in the inspected golden poses.** Runtime
  probes confirm `depthTest:true`, `depthWrite:false`, opacity 0.35; additive
  blending does not disable depth testing. Poseidon has 84 points (three 28-point
  rings), and eleven other towers each have 28. No sampled point centre is below
  the terrain. A 199-sample camera-to-point check finds all 28 `far-spire-7` points
  behind terrain despite projecting within the phone viewport. In the High detail
  shot that projected location is under the depth HUD, so that angle alone cannot
  establish pixel occlusion. An additional approach ring on/off check is recorded
  below. These approximate terrain ray samples are diagnostics, not exact
  triangle/depth-buffer assertions.

The additional **High approach A/B** projects the blocked `far-spire-7` ring to
approximately **(642,259)** in the 844×390 viewport, on visible terrain below
the utility buttons. No ring-shaped glow appears there with the fringe enabled;
the visible tower lip rings disappear/reappear when disabled/enabled, confirming
the toggle works. The terrain region remains visually the same apart from moving
particles; this is a visual check, not an exact pixel-equality assertion.
[Rings off](../../.cache/golden/2026-10-11-070131/lost-city-landscape-2-rings-off.png),
[rings on](../../.cache/golden/2026-10-11-070131/lost-city-landscape-2-rings-on.png),
[probe manifest](../../.cache/golden/2026-10-11-070131/poses.json).
This supports “no reproduced terrain bleed” for this occluded background ring,
not universal acceptance across every terrain triangle or moving viewpoint.

Supplemental temporal/material measurements use an ignored copy of the golden
workflow with a 1 s initial screenshot timeout and extra captures. The High A/B
temporarily toggles only fringe visibility in its disposable browser context;
normal captures keep it enabled. No production source or test is edited.
[Low probe manifest](../../.cache/golden/2026-10-11-065815/poses.json),
[High probe manifest](../../.cache/golden/2026-10-11-065921/poses.json),
[probe source](../../.cache/verify-lc-ci/golden-ring-ab.mjs).

| Tier/layout  | Load to ready (s) | Draw calls, shots 1/2/3 | Triangles, shots 1/2/3      | Largest of seven sampled RAF intervals (ms), shots 1/2/3 |
| ------------ | ----------------: | ----------------------- | --------------------------- | -------------------------------------------------------- |
| High desktop |             6.026 | 94 / 75 / 80            | 916,210 / 808,798 / 884,064 | 16.7 / 33.4 / 16.7                                       |
| Low desktop  |             3.667 | 62 / 50 / 46            | 110,058 / 88,188 / 81,320   | 16.7 / 16.8 / 16.7                                       |
| High 844×390 |            10.039 | 97 / 82 / 86            | 912,138 / 846,174 / 930,776 | 2,033.3 / 16.8 / 16.8                                    |
| Low 844×390  |             2.665 | 62 / 53 / 49            | 110,058 / 88,188 / 84,428   | 16.8 / 16.7 / 16.7                                       |

**Performance finding:** High phone has a 2.03 s interval outlier at spawn and
roughly 8–11 times Low's triangle workload. All High desktop screenshots and the
High phone spawn hit the normal 30 s screenshot limit before fallback succeeded.
That is a reproducible capture/readback problem in this environment; it must not
be equated with the game's FPS. The short seven-interval medians are approximately
16.6–16.7 ms but do not establish sustained 60 FPS or GPU completion latency.
High and Low phone were captured sequentially; the initial desktop runs overlapped,
so their timing is not a controlled tier comparison. There is no pre-tower2 timing
baseline and no hardware/physical-phone benchmark here. No verified tower2
performance regression can be claimed from these measurements.

The ring adds one `Points` object per tower (392 points across this scene). The
source's “no extra mesh draw” wording does not mean zero draw-call cost: a Points
object still renders separately. The recorded scene counts include that cost;
isolated ring timing was not measured.

## Current hosted CI: green with coverage exclusions

`gh run list --branch main --workflow CI` identified
[run 38116826645](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38116826645),
created **2026-10-11 06:03:46 UTC**, completed **06:36:49 UTC**, SHA `cb15f7d`.
All 30 E2E shards, static/build job and project-base job succeeded.
Summing the individual Playwright shard summaries gives **598 passed, 86 skipped,
0 failed, 0 flaky**; project-base separately reports **8 passed**.
There are no failing shard logs in this latest run.

This does not establish hosted acceptance of the excluded tests:

- All **32** cases in `tests/e2e/f-bughunt-1090.spec.ts` are skipped by existing
  `CI` guards: 26 site/layout idle cases and six chase travel/turn cases.
  The idle loop currently contains two redundant CI skip calls.
- Four High-tier Challenger/Endurance first-minute cases in
  `tests/e2e/f-verify-1000.spec.ts` are skipped in CI. Its 480 s timeout and 600
  100 ms simulation samples remain, but the latest hosted run does not exercise
  those four cases. Low/Medium first-minute cases remain enabled.
- All 31 Chromium installation steps succeeded. No retry message appears in the
  latest installer logs, so this run confirms installation success, not recovery
  from injected apt locks or stalled downloads.

Evidence: [run/job metadata](../../.cache/verify-lc-ci/latest-ci.json),
[all shard test logs](../../.cache/verify-lc-ci/latest-e2e.log),
[totals and exact skip list](../../.cache/verify-lc-ci/latest-summary.json),
[downloaded full logs](../../.cache/verify-lc-ci/latest-ci-logs.zip).
`gh run view --log` returned only the non-shard jobs and `--log-failed` returned
empty output for the historical failed run, so the complete Actions log archives
were retrieved with `gh api` and their individual shard logs read directly.

## Most recent failing run: four travel assertions

The last failed main CI run is
[38068954065](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38068954065),
created 2026-10-10 16:45:31 UTC, SHA `4fa89cd`. Its shard totals are
**600 passed, 80 skipped, 4 failed, 0 flaky**. Static checks, installation and
project-base succeeded. These are historical failures, now excluded by the chase
CI guard introduced in `99c384b`; they are not failures in the latest green run.

All four failures are the first-leg displacement assertion `>10 m` in
`f-bughunt-1090.spec.ts`, not the camera-clearance bounds:

| Shard | Layout/site       | First attempt (m) | Retry (m) |
| ----- | ----------------- | ----------------: | --------: |
| 21/30 | Desktop Beebe     |          2.605987 |  4.982401 |
| 22/30 | Desktop Monterey  |          0.962882 |  1.689874 |
| 26/30 | Portrait Monterey |          4.981312 |  6.422214 |
| 29/30 | Desktop Titanic   |          7.199969 |  8.870025 |

The displacement assertion precedes the clearance assertions, so these failures
do not prove that subsequent clearance checks passed. Beebe and Titanic portrait
passed their chase cases in this run.

Evidence: [four failing shard logs, including both attempts](../../.cache/verify-lc-ci/prior-e2e.log),
[run/job metadata](../../.cache/verify-lc-ci/prior-failed-ci.json).

## Earlier frame floors and the 480 s timeout

Before the CI skips,
[run 38020894510](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38020894510)
(2026-10-10 03:32 UTC, SHA `712e538`) failed the Great Blue Hole idle frame floor
on shard **4/30 desktop: 19 frames**, and **27/30 portrait: 24 frames**, each
against unchanged `>30` and repeated on retry. It also failed chase displacement
on shards 21/22/26/29 and timed out all four High-tier deep-site first-minute
cases at the previous **300,000 ms** limit (shards 2/3/5/6).

After the timeout increase,
[run 38032127642](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/38032127642)
(2026-10-10 06:47 UTC, SHA `778fb4e`) still records **480,000 ms** timeouts for
desktop Endurance (2/30), desktop Challenger (3/30), and portrait Endurance
(6/30), including retries. The larger budget alone did not fix hosted execution.
The latest green run's High-tier skips must not be described as a successful
validation of the timeout increase.

Evidence: [pre-increase log archive](../../.cache/verify-lc-ci/tower2-ci-logs.zip),
[post-increase log archive](../../.cache/verify-lc-ci/post-timeout-ci-logs.zip).
The installer still has three 120 s bounded attempts, 5 s kill grace, 15/30 s
backoff and an 8-minute workflow step budget. Its final failure exit code is
preserved; no installer changes were needed or applied here.

The five existing installer regression tests also pass locally: immediate
success, one retry, two retries with backoff, retry after a stalled attempt and
preservation of the final failure status. These use mocked commands, rather than
real apt contention. [Focused test log](../../.cache/verify-lc-ci/installer-tests.log).

## Proposed hosted-safe variant — not applied

Prefer splitting simulation/render correctness from real-time throughput, rather
than the current whole-file coverage exclusions. Detect actual software rendering
after the renderer is ready, and gate the performance-only case on **both** CI
and that renderer classification. Reuse the existing software patterns in
`src/core/Quality.ts`; do not infer software rendering from `tier=low` or CI alone.
An unavailable renderer string is unknown, not an automatic exemption.

```ts
const software = await page.evaluate(() => {
  const gl = (window.__game as unknown as Game).renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software|basic render|lavapipe/i.test(renderer);
});
const hostedSoftware = Boolean(process.env.CI) && software;
// In the separate real-time performance case:
test.skip(
  hostedSoftware,
  'Real-time frame floors require a hardware renderer; geometry is covered separately.',
);
```

Keep the real-time `elapsedMs >=60,000`, idle `frames >30` and travel-phase
`frames >5` assertions unchanged on local/GPU runners, with renderer, FPS,
median/p95 and frame count attached. The exemption is justified by the recorded
19/24-frame hosted run, not by a desired green result. It explicitly loses a
hosted throughput guarantee and requires a maintained local/GPU performance job.

For hosted correctness coverage, use the existing paused-clock pattern, run the
actual app/physics/RAF with **100 ms advances** (six fixed 60 Hz ticks, below the
eight-step cap), and sample every rendered advance. Use 600 advances for the
idle minute and 100 per 10 s travel/turn phase; verify executed physics steps
and sample counts, not just advanced wall-clock time. Keep actual held-key input,
the `>10 m` first-leg displacement, terrain clearance bounds, 49 chase-arm sample
points, whole visible hull vertices including instances, zero prop contacts and
surface violations, no breach, no browser errors, zero failed props, Low tier,
renderer/perf-counter agreement, positive calls/triangles and the original upper
budgets (`<=1500` calls and `<=1,500,000` triangles). Restore full raster resolution
for screenshots if intermediate resolution is reduced and label that limitation.

Why deterministic time is necessary: `src/core/Time.ts` clamps a frame delta to
250 ms and executes at most eight physics ticks, then discards its backlog.
Ten real seconds at very low FPS therefore need not simulate ten seconds of
travel. Merely skipping the frame-count floors leaves the observed `>10 m`
failures intact; reducing the displacement bound would hide the intended motion
coverage. Do not use 250 ms advances as ten seconds of fully executed simulation,
teleport the sub, replace `sub.step`, or synthesize mission completion.

This proposal retains geometry/simulation intent while stating the exact
performance coverage exemption. It is a proposal, not an implemented or passing
replacement test. No numerical assertion has been loosened in this work.

## Validation and remaining scope

- Typecheck and production build: pass with the equivalent writable config.
- Twelve requested PNGs: correct dimensions and tiers, zero failed props; all
  inspected. Supplemental Low/High temporal and High ring A/B captures complete.
- Existing installer regressions: 5/5 pass.
- Report formatting, relative evidence links and `git diff --check`: pass.
- Final `gh run list` recheck still identifies `38116826645` as latest main CI.

Only `plan/progress/F-VERIFY-LC-CI.md` is a tracked-file change. Builds, images,
manifests, temporary capture adapters and downloaded logs are ignored local
artifacts under `dist-verify-lc-ci/` and `.cache/`; they are not committed evidence
and should be archived separately if needed for review outside this checkout.
Continuous/moving-camera flicker, hardware FPS, physical-phone thermal performance
and execution of the currently CI-skipped cases remain outside the measured
evidence. No full local E2E pass is claimed.
