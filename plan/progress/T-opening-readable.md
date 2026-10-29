# T-opening-readable — numeric mission-opening review

2026-10-29, Codex. Added `tools/golden-readable.mjs`, a self-contained PNG report using the existing Playwright PNG decoder. No dependencies, art, gameplay, or DIRECTOR changes. `tools/golden.sh` receives exactly one advisory summary from its capture runner, using that run's output directory. Flags and report errors do not change capture exit status; capture failures retain their existing status. No merge or push.

Run the full table or the single-line summary:

```sh
node tools/golden-readable.mjs .cache/golden/2026-10-29-112021
node tools/golden-readable.mjs .cache/golden/2026-10-29-112021 --summary
```

Every filename ending in `-1-mission.png` is measured, including layout-suffixed openings. Hero images and later mission frames are ignored. No manifest changes or automatic selection of a different golden set. Standalone CLI flags exit 0; invalid input exits 2. Hero-only sets report 0/0 openings, and partial captures summarize only the PNGs present.

## Measurement and review threshold

Decode sRGB channels to linear light (`s/12.92` below 0.04045, otherwise `((s+0.055)/1.055)^2.4`, where `s=byte/255`). Pixel luminance is `Y=0.2126R+0.7152G+0.0722B`, with white equal to 1. The table reports scene and submarine means as percentages of white, not averages of gamma-encoded bytes. Dark share is the percentage of sampled scene pixels with `Y < linear(20/255)`, approximately **0.700% of white**. Threshold comparisons allow 1e-12 for floating-point rounding.

Fixed rectangles use normalized `[left, top, right, bottom]` coordinates, with inclusive left/top and exclusive right/bottom:

| Region                     | Rectangle                     | Role                                                                         |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| Central scene band         | `[0.20, 0.30, 0.80, 0.90]`    | Scene mean and dark share, excluding sub and HUD                             |
| Submarine                  | `[0.465, 0.665, 0.535, 0.82]` | Sub mean; fixed chase-view hull region, including some surrounding water     |
| Sonar                      | `[0, 0, 0.16, 0.32]`          | Excluded HUD                                                                 |
| Objective card             | `[0.32, 0, 0.60, 0.14]`       | Excluded HUD                                                                 |
| Mission and telemetry      | `[0.76, 0, 1, 0.35]`          | Excluded HUD                                                                 |
| Bottom controls            | `[0, 0.93, 1, 1]`             | Excluded HUD                                                                 |
| Floating objective markers | `[0.275, 0.43, 0.725, 0.60]`  | Conservative exclusion for labels/diamonds at different horizontal positions |

Contrast is the directional luminance ratio **scene mean / sub mean**. Flag when this falls below **0.125** (the scene is more than eight times darker than the sub), or when the scene mean falls below the absolute dark threshold. A zero sub mean flags rather than dividing by zero. Sort flags first, then increasing scene/sub ratio, with filename as a tie-breaker. Dark share remains diagnostic; a large dark background alone does not fail a deep vent opening.

The 0.125 cutoff was calibrated on the four requested 1600×900 High desktop chase openings: Monterey **0.131** and Beebe **0.127** pass; Titanic **0.120** and Bismarck **0.099** flag. Beebe is close to the cutoff. This is a numeric review proxy for the “readable in 10 s” item, not a timed perception test or proof that a subject is recognizable. It measures the first captured frame, not +10 s. Bright particles or unrelated scenery can affect means. Fixed masks, hull framing and thresholds need review after HUD/camera changes; other viewport layouts are measured with the same normalized rectangles but are outside this calibration. Visual review and `tools/golden-compare.mjs` remain necessary.

## Requested reference run

Ran against `.cache/golden/2026-10-29-112021`. This worktree did not contain the reference cache, so a local ignored symlink points to `/home/vijay/submarine-explorer/.cache/golden/2026-10-29-112021`; the source captures were only read. Manifest: complete, clean SHA `3645c0f6e30be56c7efdac077373a7066fa76441`, production, combined mode, High, desktop 1600×900, all 13 mission openings. Output saved in `.cache/golden-readable-reference.txt`.

| Opening                            | Scene mean Y (%) | Dark (%) | Sub mean Y (%) | Scene/sub | Review |
| ---------------------------------- | ---------------: | -------: | -------------: | --------: | ------ |
| bismarck-1-mission.png             |            1.528 |      0.4 |         15.490 |     0.099 | FLAG   |
| titanic-1-mission.png              |            1.047 |      9.0 |          8.694 |     0.120 | FLAG   |
| kamaehuakanaloa-1-mission.png      |            3.358 |      0.5 |         26.696 |     0.126 | pass   |
| beebe-vent-field-1-mission.png     |            0.884 |     36.9 |          6.971 |     0.127 | pass   |
| lost-city-1-mission.png            |            1.166 |     14.5 |          8.924 |     0.131 | pass   |
| monterey-canyon-1-mission.png      |            2.017 |      0.0 |         15.389 |     0.131 | pass   |
| axial-seamount-ashes-1-mission.png |            3.162 |      0.0 |         20.190 |     0.157 | pass   |
| blake-plateau-corals-1-mission.png |            3.122 |      0.0 |         18.722 |     0.167 | pass   |
| hunga-tonga-caldera-1-mission.png  |            4.817 |      0.0 |         27.715 |     0.174 | pass   |
| hudson-canyon-1-mission.png        |            4.444 |      0.0 |         21.988 |     0.202 | pass   |
| challenger-deep-1-mission.png      |            5.288 |      0.6 |         19.036 |     0.278 | pass   |
| endurance-1-mission.png            |            6.919 |      0.0 |         24.130 |     0.287 | pass   |
| great-blue-hole-1-mission.png      |           31.141 |      0.2 |         17.913 |     1.738 | pass   |

```text
Golden readability (advisory): 2/13 openings flagged: bismarck-1-mission.png, titanic-1-mission.png
```

## Validation

- Reference calibration assertions pass in **two rounds**: exactly 13 openings, exactly Bismarck/Titanic flagged, Monterey/Beebe pass. Standalone table and `--summary` both exit 0 with those flags. Prettier, `bash -n tools/golden.sh` and `git diff --check` pass.
- New regression suite: **4/4 pass**, covering linear-light arithmetic, bright HUD exclusion, sub exclusion from scene statistics, absolute darkness, contrast flags, exact dark-threshold handling, malformed/transparent images, PNG selection/order, table/summary output and empty sets. `.cache/golden-readable-focused.log`.
- All golden tooling: **30/31 pass**. The unchanged `golden-manifest.test.mjs` comparison CLI case fails parsing empty subprocess stdout (`Unexpected end of JSON input`, line 151). A minimal `execFile(process.execPath, ['-e', 'console.log(123)'])` also returns empty stdout here. `.cache/golden-readable-tests.log`. No passing full-suite claim.
- Production/typecheck build passes using the existing writable native-config bundling approach (`rolldown` bundles `vite.config.ts` to `.cache/golden-readable-vite.config.mjs`, then `npm run build -- --config .cache/golden-readable-vite.config.mjs --configLoader native`). `.cache/golden-readable-build.log`.
- Required E2E search: `rg -n 'golden|readab|luminance' tests/e2e` found the existing mission-spawn capture cases in `opening-framing.spec.ts`. Attempted the command below for the four calibration sites, two rounds (**8 selected cases**, confirmed with `--list`). Execution is **blocked before assertions** because the preview server cannot bind `127.0.0.1:4302` (`listen EPERM`). Logs: `.cache/golden-readable-e2e.log`, `.cache/golden-readable-e2e-list.log`, `.cache/golden-readable-preview.log`. No browser pass or fresh golden capture is claimed.

```sh
GATES_CONFIG_MODE=writable PW_PORT=4302 npx playwright test tests/e2e/opening-framing.spec.ts \
  -g '(titanic|bismarck|monterey-canyon|beebe-vent-field): persists spawn PNG and golden manifest' \
  --repeat-each=2 --output=.cache/golden-readable-e2e
```
