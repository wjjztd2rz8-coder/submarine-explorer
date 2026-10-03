# F-REBRAND-BATHYLINE

Implemented on 2026-10-03; no commit. The orchestrator's browser run passed all
five rebrand tests and project-base acceptance. Its only failure was buried
Monterey wall colonies; the implementation fix and four new regressions are now
in place. Static gates pass; the orchestrator must rerun browser acceptance after
this follow-up.

## Player-visible changes

- A compact, asymmetric bathymetric contour mark replaces the letter-like draft.
  Full marks carry a survey point and two contours; monochrome 16 px variants
  omit the inner contour. `public/brand/` contains both background themes and
  portable Source Serif 4 wordmarks whose glyphs are paths, not external fonts.
- `public/favicon.svg`, all five `public/icons/*.png` (192/512, both maskable sizes,
  Apple 180) and the 1200×630 `public/share/bathyline-og-1200x630.png` use the mark.
- `src/core/Brand.ts` owns runtime name/tagline. `src/ui/Home.ts` imports the SVG
  geometry rather than maintaining its own paths; `src/ui/Journal.ts` shows
  Bathyline in the existing compact kicker. No extra HUD controls or targets.
- README intro, vehicle-preview title and contributor credits use Bathyline.
  Repository/package names, deployment URLs, save keys and licence terms stay
  the same. `index.html` metadata and the manifest were already Bathyline at
  branch start; offline/browser regressions now enforce agreement.
- Removed the title's repeated vehicle/lighting caveat, logged in CHANGELOG.md.

## Assets and reproducibility

- `python3 tools/make_brand_wordmarks.py` outlines the bundled OFL font using
  system HarfBuzz/libwoff2dec; both wordmarks are self-contained SVGs.
- `node tools/make_icons.mjs --native` adds explicit librsvg/Cairo generation
  when Chromium cannot launch. The existing browser renderer remains available.
- `node tools/make_share_image.mjs --native` regenerated the social image.
- Every identity output and the outlined font are credited in ATTRIBUTION.md.

## Validation and review artifacts

- `GATES_CONFIG_MODE=writable PW_PORT=4440 tools/gates.sh --full-e2e`: config,
  build, 1,156 unit tests, Python, strict content, attribution and Prettier passed;
  full E2E and project-base E2E failed before tests at preview-server startup.
- A final `--no-e2e` run passed every static gate, including **144 Python tests**
  (four new offline identity/SVG/PNG regressions).
- Normal-suite `tests/e2e/f-rebrand-bathyline.spec.ts` is discovered as five tests:
  desktop, 320 px portrait and phone landscape title/Journal screenshots and
  touch interaction; metadata, logo gallery, opaque PNGs and maskable safe
  circles; favicon tab-size preview and social image. Existing title-layout
  assertion now requires the removed caveat to be absent. No other assertions
  were weakened. TypeScript build and Playwright `--list` pass.
- Manual pixel inspection: all PNGs opaque; **zero** painted pixels outside the
  40% safe circle in both maskable icons. Native review at 16/32/96 px and circular
  masking is in `.cache/codex/shots/f-rebrand-bathyline/logo-native-review.png`;
  the regenerated social image is copied as `share-image-native.png` there.
- The initial sandbox run could **not capture** gameplay screenshots. The
  orchestrator subsequently captured them (see follow-up below). Headless Playwright cannot
  capture browser chrome; the spec explicitly labels its tab-size proof as a
  preview, using the real linked favicon and document title.

## Environment blockers and required follow-up

Preview's default loader tries to write into the read-only shared node_modules
(`EROFS`). A writable-config retry fails to bind localhost (`listen EPERM`).
Direct Chromium launch fails with `sandbox_host_linux.cc: shutdown: Operation
not permitted`; the browser skill reports no connected browsers. These are
execution restrictions, not test failures. Run `tools/gates.sh --full-e2e` in the
orchestrator's browser-capable environment; review the new spec's title/Journal,
logo gallery, favicon preview and share screenshots before merging.

The worktree's ignored shots symlink pointed outside its writable root. Its
original link is preserved at `.cache/codex/shots-shared`; `.cache/codex/shots`
is now a local directory holding the native artifacts. No shared files changed.

## Deviations

Necessary supporting edits outside the literal file list: `src/core/Brand.ts`
(runtime constant), existing `public/bathyline-mark*.svg` (same geometry at
already-cached URLs), `tools/make_brand_wordmarks.py` and `tools/make_icons.mjs`
(reproducible exports/native PNG generation), and ATTRIBUTION.md (asset credits).
The minimal Home caveat removal follows the explicit plain-copy direction;
CHANGELOG.md and this progress note are required package records. Journal and
licence/preview edits change only the public identity.

## Orchestrator full-suite follow-up

The external full gate run passed build, unit, Python, strict content,
attribution, Prettier and project-base E2E. Root E2E: **283 passed, 21 skipped,
one failed**, solely `f-geo-scarp.spec.ts`'s Monterey burial assertion. All five
`f-rebrand-bathyline.spec.ts` tests passed. Fresh title, Journal, gallery,
favicon-tab preview and share-image screenshots are now present in
`.cache/codex/shots/f-rebrand-bathyline/`. Reviewed the 320 px title and theme
gallery; the mark, wordmark and visible controls remain clear.

The failure was reproduced exactly in a new unit test using the real tile,
authored prop transforms and Medium tier: `wall-sponges-0` had a seat **10.625 m
below the seabed**; several sponge/coral groups were buried. Boulders were already
correctly seated. `addWallLife` selected candidates using only local wall height
and face direction, overlooking terrain/apron rising over the selected face.

`src/world/props/geo/scarp.ts` now checks each candidate's actual outward-offset
seat against `talusSurface` before accepting it. Invalid candidates are resampled;
colonies stay attached to exposed wall vertices instead of being vertically
shifted away from the wall. Existing rubble generation is unchanged.
`tests/unit/montereyWallLife.test.ts` covers all four authored walls at Low,
Medium, High and Ultra, with strict exposed-seat checks and the original hero
browser bounds. Medium's hero still has **192 instances / 96 colonies** and all
three sponge/two coral shapes. The existing E2E test and its assertions are
**untouched**. The CHANGELOG records this player-visible fix.

Targeted geology regressions passed (initial 19-test run, then all four new tier
cases). Final static gate results are recorded below. Browser rerun is delegated
back to the orchestrator because Vite/Chromium remain unavailable in this
sandbox. First rerun `tests/e2e/f-geo-scarp.spec.ts` and review refreshed Monterey
wall screenshots, then run `tools/gates.sh --full-e2e` before merge.

Additional deviation: the minimal scarp builder change is outside this package's
original ownership but explicitly requested by the orchestrator gate follow-up.

Final local validation: `GATES_CONFIG_MODE=writable PW_PORT=4440 tools/gates.sh
--no-e2e` passed config, build, **1,160 unit tests across 108 files**, **144 Python
tests**, strict content, attribution and Prettier. `git diff --check` passed.
No commits or browser assertions were changed in this follow-up.
