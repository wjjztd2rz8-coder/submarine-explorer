# F-SHARE-IMAGE: Bathyline social preview

Status: implemented; static gates green, browser validation blocked by sandbox. 2026-10-03.

- Read F-TITLE-F progress, the original mark, brand font declarations and brand research.
- `tools/make_share_image.mjs`: authored SVG rendered to a 1200×630 PNG with the
  same Playwright Chromium toolchain as `make_icons.mjs`. Embeds the existing
  Source Serif 4 600 wordmark and DM Sans 400 tagline fonts; explicitly waits for
  both fonts and refuses fallback fonts. Original navy gradient and illustrative
  contour geometry, original mark, Bathyline and “Explore the real deep.” only.
- Sandbox Chromium launch fails with `sandbox_host_linux.cc:41`,
  `shutdown: Operation not permitted`. Added explicit `--native` rendering using
  Python standard library bindings to existing Linux librsvg/Cairo/HarfBuzz/libwoff2dec;
  no npm or pip dependencies added. Generated the committed PNG through this
  path and visually checked it. Native rendering decodes and shapes the bundled
  fonts to glyph paths, preventing system-font substitution. Renderer versions
  may change antialiasing.
- Repeated native rendering produced identical SHA-256:
  `7095dbddc5135fac8f7b22e32675ce790cdf9fa97238e356cd8e294d6f7a3813`.
- `index.html` meta only: absolute Pages image URL, PNG type, width/height, both
  image alts and Twitter large-image card. Git remote identifies
  `wjjztd2rz8-coder/submarine-explorer`; deploy workflow and README specify a
  GitHub Pages project base. URL:
  `https://wjjztd2rz8-coder.github.io/submarine-explorer/share/bathyline-og-1200x630.png`.
- `tools/pwaPlugin.ts`: added the PNG to the enumerated static precache as
  requested; `public/sw.js` consumes the generated list without source changes.
  PWA unit test checks list membership and version change after image edits.
- `tools/tests/test_share_image.py`: standard-library PNG signature/IHDR
  dimension check and crawler metadata checks; both pass.
- README documents regeneration and deployment URL; ATTRIBUTION credits original
  artwork and existing OFL fonts; CHANGELOG records F-SHARE-IMAGE.

Validation:

- `GATES_CONFIG_MODE=writable PW_PORT=4240 bash tools/gates.sh`: config,
  build, unit (102 files / 1,115 tests), Python (140 tests), strict content,
  attribution and Prettier passed. The project-base build passed too.
- Smoke e2e and project-base e2e could not start their preview servers in this
  sandbox; a direct preview with writable config loading confirms
  `listen EPERM: operation not permitted 127.0.0.1:4240`. Browser tests did not
  run. Canonical Playwright rendering is also
  blocked by Chromium's denied `shutdown` syscall. These gates require rerunning
  in a browser-capable environment; no claim of full browser validation.
- PNG visually inspected; native regeneration is byte-identical on repeated
  runs and works from outside the repository working directory. No package
  dependencies changed.
- After final font rendering changes,
  `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-share-image PW_PORT=4240 bash tools/gates.sh --no-e2e`
  passed every static gate again. Inspected the output: PNG bytes match the
  source asset, both absolute metadata URLs remain intact and the stamped
  worker includes `share/bathyline-og-1200x630.png` relative to its scope.
