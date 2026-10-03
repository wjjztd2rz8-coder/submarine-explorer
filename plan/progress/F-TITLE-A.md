# F-TITLE-A — Bathyline identity assets

Status: complete; all gates passed. 2026-10-03.

## Delivered

- Finalized `public/bathyline-mark-draft.svg` as `public/bathyline-mark.svg`:
  24-unit viewBox, three paths, 2-unit round strokes, no fill, accessible label.
  The ring uses `currentColor`; contours use `var(--logo-contour, currentColor)`.
  Moved the outer start inward and shortened the inner endpoint to separate the
  contours from the ring and each other. Default rendering remains monochrome.
- Added `public/bathyline-mark-small.svg`, retaining the ring and outer contour.
  Use this derivative at 16 px. The full mark is suitable at 32 px and above.
- Replaced the sonar favicon with the small monochrome mark on rounded navy.
  Regenerated all five existing icon files from the full mark using salt/mint
  strokes and opaque ocean navy `#06131F`. Manifest paths/sizes are preserved.
- Updated `tools/make_icons.mjs` to read the full 24-unit source, independent of
  the caller's directory, with 8% padding for ordinary/Apple icons and 14% for
  maskable icons. Browser cleanup occurs even if rendering fails.
- Added normal Latin-subset DM Sans 400/600 and Source Serif 4 600 WOFF2 from
  Fontsource packages 5.3.0, unchanged, totaling 49,876 bytes. Included full SIL
  OFL 1.1 copyright/licence files; Source Serif's notice is from Google Fonts.
  Added font/source/mark credits in `ATTRIBUTION.md`.
- Added `src/styles/brand-fonts.css` with three explicit `@font-face` declarations
  and `font-display: swap`. It is intentionally unimported. Package D assigns
  DM Sans with `system-ui, sans-serif` fallback and Source Serif 4 with
  `Georgia, serif` fallback. Latin subsets cover the specified English strings;
  broader localization needs extra subsets.
- Added the F-TITLE-A replacement reason under Changed in `CHANGELOG.md`.
  No existing application stylesheet, HTML, manifest or gameplay code changed.

## Three review rounds

1. Read spec §4 palette/typography, §6 and §7 A, plus the complete brand research;
   checked ownership, icon paths, fonts and existing generator before authoring.
2. Rendered and **viewed** full/small/favicon at 16, 32 and 180 CSS px on navy
   and white (18 PNGs). The full 16 px mark is dense; the derivative opens the
   interior and retains a recognizable viewport/route. At 32/180 px both full
   contours remain distinct. Also viewed ordinary/Apple icons and 40%-radius
   circle crops; maskable marks remain intact.
3. Verified all fonts decode/load with `swap` at `/` and `/submarine-explorer/`
   in an isolated Vite harness. Built the harness at both bases: generated CSS
   correctly prefixes public font URLs. Reviewed font rendering and ran gates.

## Verification evidence

- PNG dimensions match 192/512 px manifest declarations and 180 px Apple icon.
  Every pixel is fully opaque; every corner is RGB (6, 19, 31).
- Maskable painted-pixel radii, including antialiasing: 33.51% (192 px), 33.20%
  (512 px), both within the central 40% safe circle. Geometric radius is 33%.
- PNGs retained in `.cache/codex/shots/f-title-a/`: individual
  `{full,small,favicon}-{16,32,180}-{navy,white}.png`,
  `mark-contact-sheet.png`, `icons-contact-sheet.png`, and `fonts.png`.
  Cached review scripts/harness: `.cache/codex/f-title-a/`.
- `node tools/make_icons.mjs`: passed; SVG HTML-parser formatting and owned
  CSS/JS/Markdown formatting passed.
- `PW_PORT=4283 npm_config_cache=/tmp/f-title-a-npm tools/gates.sh`: passed
  build, unit, Python, content, attribution, Prettier, browser smoke and
  project-base e2e. Logs: `.cache/gates/`.

## Environment and handoff

The pre-existing `.cache/codex/shots` symlink pointed to a read-only checkout.
Replaced that local ignored symlink with a directory to retain the requested
screenshots here. The shared `node_modules` symlink also prevented Vite's
config/cache writes. Replaced it with a local ignored directory whose packages
still symlink to the shared installation, with writable Vite cache directories.
Npm downloads used a temporary cache. No shared installation was modified.

Package D should import `brand-fonts.css` and use the full mark for its lockup;
use the small derivative for 16 px placements. Package F owns remaining public
name/theme metadata. The manifest currently retains its pre-title text/colours,
by ownership, while its existing icon paths now resolve to Bathyline artwork.
No commit, registration, purchase or publishing action was performed.
