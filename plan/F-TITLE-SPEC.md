# F-TITLE: Bathyline title scene implementation spec

Status: implementation handoff, 2026-10-03. Research/spec work only; application
names and behaviour have not changed. Basis: [brand research](../docs/research/brand.md),
`src/ui/Home.ts`, `src/styles/{menus,modes,predive}.css`, `src/app/boot.ts`,
`src/app/systems/{shell,render,camera,progress}.ts`, and `tests/e2e/d-shell.spec.ts`.

## 1. Design decision and boundaries

Use **Bathyline** (internal pronunciation: BATH-ee-line) as the provisional
implementation title and **Explore the real deep.** as the tagline. This follows
the research recommendation; its unrelated commercial name conflict remains
documented there. This spec does not establish name/domain clearance or authorize
registration. A later title substitution changes the wordmark/copy, not the scene.

The home image is a research sub beside a real underwater canyon, with quiet
expedition instruments in the foreground. Replace the home menu's globe hero with
this scene. Retain the embedded globe as the geographic selector after **Dive
sites** or **Free dive**; retain the separate in-dive globe.

Scope is the title scene, home/menu presentation, authored mark, fonts needed by
home, and public title metadata. A global HUD/Journal redesign belongs to a
separate F3 package. Keep save keys (`subexplorer.*`), URLs, mission/tile IDs,
package name, service-worker identity, deployment base and PWA `id`/`scope` intact.
The brand research proposes a wider typography change; this handoff scopes font
application to home so it can ship without retuning gameplay UI.

## 2. Current implementation constraints

- `Home` owns `.home-copy`, `.home-menu`, `globeSlot` and `sitesSlot`. It supplies
  Continue, Dive sites, Free dive, Journal, Settings and Controls; progress adds
  **Upgrades**, daily adds **Daily dive**, and ModeSelector adds **Advanced**.
  Preserve all of these and their callbacks. Do not introduce a new Play route.
- `home.show()` currently focuses the first enabled menu button, potentially
  Advanced. Make first focus explicitly Continue when enabled, otherwise Dive
  sites. `FocusTrap` must include the active site selector and nested modal flow.
- `shell.ts` opens `homeGlobe` whenever app state is home. Change that contract:
  embedded globe open iff home is visible AND `home.sitesOpen`. Reconcile after
  menu/site transitions, including back and Escape, rather than CSS-hiding a globe
  that continues rendering. Keep both list-to-pin and pin-to-list previews.
- `.home-screen` is currently opaque and covers `#viewport`. Later home layout
  overrides in `modes.css` and `predive.css` would defeat a change only in
  `menus.css`. A dedicated final home stylesheet will replace those home-only
  rules; pause, briefing and shared mode styles retain their present behaviour.
- Home freezes physics via `gate.shell`/`gate.input`; the game camera and renderer
  still update. A decorative scene must use a separate scene/camera, not move the
  gameplay sub or override `rig.camera`. Quit to home can happen at any site.
- Boot loads the current default tile before constructing Home. This work does
  not restructure boot/loading. The optional title terrain load happens after
  home exists, must never block `__gameReady`, and must fail to a usable menu.

## 3. Copy and hierarchy

Use these exact English strings (preserve current dynamic site/mode strings):

| Surface                      | Copy                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| Small eyebrow                | A CINEMATIC OCEAN EXPLORATION GAME                                                            |
| Sole home h1 / wordmark      | Bathyline                                                                                     |
| Tagline                      | Explore the real deep.                                                                        |
| Description                  | Real terrain, simple controls, discoveries worth finding.                                     |
| Supporting line              | Play in your browser                                                                          |
| Input line                   | Touch, keyboard or controller                                                                 |
| Continue                     | Continue (existing enabled/disabled semantics and mission tooltip)                            |
| Primary new-player action    | Dive sites                                                                                    |
| Secondary actions            | Free dive · Journal · Settings · Controls · Upgrades                                          |
| Live card                    | Daily dive (existing site, modifier, stars and streak text)                                   |
| Mode                         | Existing Arcade / Realistic / Custom labels, description and Advanced controls                |
| Scene caption, terrain ready | Monterey Canyon · Real GMRT bathymetry                                                        |
| Caption, terrain unavailable | Expedition preview                                                                            |
| Scene caveat                 | Vehicle and lighting are illustrative.                                                        |
| Accessible home label        | Bathyline home                                                                                |
| HTML title / PWA name        | Bathyline                                                                                     |
| HTML/PWA description         | A cinematic ocean exploration game. Real terrain, simple controls, discoveries worth finding. |

Do not put a fake depth, invented coordinates, achievement, site count or
scientific discovery on the title scene. The preview caption is plain text, not
a site launch button. Do not auto-start Daily dive, audio or pointer lock.

Visual priority: wordmark → tagline → Continue/Dive sites → free exploration →
Daily/mode → library and configuration. Continue and Dive sites are full-width
buttons; give Continue the mint fill only when enabled, otherwise give Dive
sites that fill. The disabled Continue stays visible with an explanatory tooltip
and readable text. Secondary actions have explicit labels, not icon-only targets.

Within `.home-menu`, use DOM order Continue, Dive sites, Free dive, Daily dive,
mode selector, Journal, Settings, Controls, Upgrades. This also defines Tab order;
do not simulate ordering through CSS. Update the progress insertion of Upgrades
so it remains after Controls. Daily omission when unavailable must not leave a gap.

## 4. Layout, safe areas and readability

Home is a fixed `100dvh` shell. Decorative canvas is `#viewport` behind the shell;
home itself has a transparent background over an ocean-canvas fallback
`#06131F`. Only the readable panels are opaque. Decorative layers ignore input.
Use grid/flex normal flow for copy and menu rather than independent absolute top
and bottom coordinates. Account for each safe inset with `calc(base padding +
env(safe-area-inset-*, 0px))`. Never lock portrait behind a rotation screen.

### Desktop/tablet landscape: width >= 960 px, height > 500 px

- Shell padding: `clamp(24px, 4vw, 64px)` plus safe insets. Left panel width
  `clamp(340px, 34vw, 440px)`; remainder is unobstructed scenery. At 1280×720,
  panel starts roughly x=51/y=29, is 435 px wide and ends above the bottom inset.
- Left panel is a flex column with 20 px padding, 20 px between copy and menu,
  radius 12 px, opaque `#102B3A`. Copy stays above a menu with `min-height: 0`,
  `overflow-y: auto`, 6 px interior clearance for focus outlines. Only the menu
  scrolls on short desktops or when Advanced expands. Supporting lines follow
  the menu within that scroll area so they cannot cover actions.
- Wordmark row: 52 px icon, 12 px gap; Source Serif 4 600 at
  `clamp(40px, 4vw, 48px)`, 1.05 line height, 0.01em letter spacing. Tagline
  24 px/1.25; description and controls 16 px/1.5. Eyebrow 12 px/1.4, 0.12em.
- Full-width action rows 52 px minimum, 8 px gaps. Library/configuration actions
  use two equal columns; Upgrades spans both. Mode segments remain above their
  description/Advanced panel. Daily card wraps detail naturally, never ellipsizes
  its launch context. Its stars can be a separate line.
- Scene focus: sub centre around 72% width/55% height, silhouette 14–18% of
  viewport width. Canyon wall fills the lower/right background. Caption and
  caveat live in a small opaque plate at bottom-right, 16 px inset. They wrap.

### Portrait/narrow: width < 960 px, unless the short-landscape rule applies

- Full-width one-column flow, 16 px side padding plus safe insets (12 px at
  <= 360 px). Reserve a decorative hero band of `clamp(128px, 22dvh, 190px)`.
  Place its caption in the band on an opaque plate, 12 px text. Keep the
  illustrative caveat there too; do not overlap the copy plate.
- Below the band, one opaque plate fills remaining height. Copy uses 16 px
  padding; icon 36 px, gap 10 px, wordmark 36 px (32 px at <= 360 px), tagline
  20 px, description/body 16 px. Eyebrow wraps at 320 px; do not shrink labels
  to force one line. At 200% zoom use the same flow and allow scrolling.
- Copy is a fixed flex child; menu is the flex child that scrolls. If text zoom
  or a viewport shorter than 600 px leaves under 160 px for the menu, make the
  entire plate scroll instead. Avoid nested scrolling for menu/Advanced here.
- Continue/Dive sites/Free dive/Daily are full-width; configuration rows may
  use two columns at >= 360 px and one column below. Every actionable target,
  including Advanced and Back, is >= 48×48 CSS px; minimum 8 px between rows.
- Compose sub in the hero band at 64% width/50% band height. It must remain
  visible above the plate; do not reuse the full-height desktop camera crop.
  Render scenery into a scissored hero viewport, with its own aspect ratio.

### Short landscape: width > height AND height <= 500 px (takes precedence)

- Two columns: left 42% for scene and copy; right 58% opaque menu plate, with
  12 px outer padding plus safe insets. Menu gets the full available height,
  scrolls vertically, and contains all actions/mode/supporting lines.
- Left copy plate at top: 28 px wordmark, 28 px icon, 18 px tagline, 16 px
  description. Put hero below copy and its caption within that region. For
  text zoom, left column also scrolls independently; keep right actions usable.
- At 844×390 and 667×375, neither column overlaps; no horizontal scrolling,
  and the last action remains reachable with touch and Tab. No fixed footer.

### Dive sites / Free dive subview

Pause decorative title animation/drawing while the geographic selector is open.
Desktop: compact 32 px brand lockup at top-left, globe in the left 55%, site panel
in the right 45% (maximum 520 px). Phone portrait: brand/header with Back, globe
preview 160 px high, site list fills/scrolls the remaining height. Short landscape:
globe left 42%, site list right 58%. On exceptionally short/zoomed layouts hide
the globe preview and keep the list/Back usable; `homeGlobe.close()` stops drawing
when hidden. Site cards retain sources, depth, hull/access and progress strings
already supplied by MissionSelect; no new content fetch or new card rewrite.

Back and Escape restore the menu and focus the originating Dive sites or Free
dive button. Settings/Controls/Journal/Upgrades retain their existing modal/focus
behaviour. Only visible controls participate in the home focus trap.

### Palette and typography

Use the research palette: canvas `#06131F`, plate `#102B3A`, primary `#E8F3F1`,
secondary `#A8C0C6`, mint `#65DCCB`. Mint filled buttons use canvas-colour text;
hover changes border/fill without flashes. Focus ring 3 px mint, offset 3 px.
Keep essential text on the opaque plate so contrast is independent of lighting;
disabled labels use mist without reducing the entire element's opacity.

Self-host DM Sans 400/600 and Source Serif 4 600 WOFF2, `font-display: swap`.
Home uses DM Sans with `system-ui, sans-serif` fallback; title uses Source Serif
4 with `Georgia, serif` fallback. Retain OFL notices and attribution. No third
font required. Fonts failing to load must leave all labels/actions readable.

## 5. The 3D backdrop

### Fixed authored shot

Show one existing Class B research vehicle facing right and slightly away, cream
hull readable against blue water, two restrained lamps illuminating a sediment
ledge, a canyon wall receding diagonally, and sparse marine snow. No wreck,
fictional building, sonar HUD, frantic fish or day/night carousel. Use the
existing `buildVehicle('B', tier, ...)` builder without altering vehicle builders.
The vehicle is decorative and grants no hull access/progress.

Terrain is a fixed **Monterey Canyon** GMRT crop, independent of saved/active site.
Anchor at upper-channel POI (36.7985, -121.8502), from the checked-in `pois.json`;
sample its seabed height, not a hardcoded depth. Extract a 2,400 m square around
this anchor, keeping real horizontal/vertical metres and existing north-to-south
row convention. Use the repo's geographic conversion and bilinear sampling
conventions. Rebase the crop to a local origin for the title scene. Do not smooth
away the canyon or vertically exaggerate it. Use muted sand/slate materials;
lamps and water are illustrative, as the caption states.

Starting camera block (local metres; +X east, +Z south, +Y up; anchor floor y=0):
vehicle x=0/z=0 at sampled floor +35 m; camera offset (-85, +35, +115) from the
vehicle; look at vehicle +(35, -8, -35); perspective FOV 42°, near 1, far 3,000.
Vehicle initially faces east (local -Z model rotated about Y accordingly). This
is a starting shot, not a license to clip: sample floor under camera and vehicle
and enforce >= 12 m clearance over the entire motion. Compose the target to the
screen positions above using camera view offset/aim and viewport-specific framing,
not by distorting terrain. Check the crop contains the view frustum's visible floor.

Use a cool hemispheric fill, subtle rim, two lamps and depth fog. Lamp pools reveal
sediment colour without clipping the hull to white. No shadow maps, extra bloom,
SSR or full gameplay post stack is required for v1. Tone mapping/colour space use
the shared renderer's current ACES/sRGB settings. Keep the background dark enough
to read the sub silhouette, bright enough to see the canyon slope on Low.

### Motion, quality and fallback

- One 40-second seamless camera sway: <= 2 m horizontal travel, <= 1° yaw;
  vehicle hover <= 0.3 m. Snow drifts slowly. No pointer parallax, logo sweep,
  flashing light, pulsing CTA or forced intro delay. Clamp the elapsed delta
  after tab restoration so the view does not jump.
- Reduced motion (OS OR saved rig setting): static camera/vehicle and no moving
  particles. UI states remain visible. Update immediately when changed in Settings.
- Low: <= 35 draw calls, <= 100k triangles, <= 200 snow points. Medium+:
  <= 60 draw calls, <= 200k triangles, <= 600 snow points. These are title-only
  budgets, including vehicle. DPR stays within the resolved quality/dynamic
  resolution ceiling. Render at most 30 fps; static mode draws on dirty events
  (enter, resize, tier/reduced-motion changes, assets ready).
- Use the existing renderer/canvas, one title scene and one perspective camera.
  Do not create a third WebGL renderer alongside gameplay and the globe. During
  title drawing, skip the gameplay draw/post path; do not also render both scenes.
- Load Monterey via TileLoader/publicUrl after home is constructed. Deduplicate
  requests if it is already the loaded gameplay tile. Title failure does not
  invoke `showFatal`, change the route or prevent menu interaction. Until terrain
  loads, show vehicle/fog on the navy fallback, caption **Expedition preview**.
  On load failure keep that composition; suppress the GMRT caption.
- Freeze and stop title draws while document is hidden, app is dive/pause, a
  covering Journal/Settings/Upgrades modal is open, or globe/list view is open.
  Resume as dirty on return. Retain loaded objects across home re-entry; dispose
  owned geometry/materials/listeners on system teardown. Do not dispose cached
  assets that another scene owns. Ignore stale async completion after disposal.

### Integration contract for packages

`TitleTerrain.ts` owns an async crop builder returning a title-owned mesh, anchor
floor and sampler for local coordinates. It reads existing Tile data, and performs
no scene/state/storage writes. `TitleScene.ts` owns scene/camera/vehicle, consumes
that crop, and exposes `update(dt)`, `resize(viewport)`, `setQuality(tier)`,
`setReducedMotion(bool)`, `invalidate()`, `draw(renderer)` and `dispose()`.

`src/app/systems/title.ts` constructs lazily on first home entry and exposes
`ctx.titleScene` plus read-only `window.__game.titleScene` diagnostics:
`active`, `terrainReady`, `animated`, `drawCount`, `calls`, `triangles`.
Registration must precede renderSystem's init and frame hooks. Its
`render.prepare` hook reconciles visibility/viewport and motion; renderSystem's
`render.draw` branches to title draw while home/menu is active. Hidden/static
title frames can skip drawing after the first presentation. Restore full canvas
viewport/scissor/render target before gameplay/globe transitions. At home/site
view the existing globe supplies the image; clear unused canvas to navy once.
Do not change frame stages, simulation gates or `__gameReady` semantics.

## 6. Authored SVG mark

Draft: [public/bathyline-mark-draft.svg](../public/bathyline-mark-draft.svg).
It is deliberately unreferenced by app/manifest/favicon. Original vector geometry,
no external artwork or font dependency. Use `viewBox="0 0 24 24"`, three paths,
2-unit strokes, rounded caps/joins, no fill: a circular viewport and two stepped
contours. The contour gap suggests a route; the central step hints at B. The
draft's full-size inner contour may need optical spacing adjustment after review.

Ring uses `currentColor` (salt white), contours
`var(--logo-contour, currentColor)` (set to mint in the two-colour lockup). Default
is monochrome; test at 16, 32 and 180 CSS px on both navy and white. At 16 px,
omit the path with `class="inner-contour"`; a small-size derivative keeps only
viewport + outer contour. No gradient, glow, tiny lettering or SVG font text.

Wordmark is separate HTML text in the h1; mark beside it is decorative
`aria-hidden="true"`. Standalone SVG has a descriptive accessible label. The
production favicon can wrap the small-size mark in an opaque navy rounded square;
PWA/Apple icons use opaque navy with the mark inside the maskable safe zone.
Use the existing icon generator, updating its 32-unit assumption for the new
24-unit source and its background colour. Retain manifest icon paths/sizes.

## 7. Sonnet-sized implementation packages and ownership

Each package is one focused implementation/review cycle, with a progress note.
No concurrent writes to the same file. Dependencies below permit A/B/C to proceed
independently; remaining packages land sequentially. A coordinator owns shared
CHANGELOG integration; package agents report their proposed entry in their notes.

| Package             | Owns files                                                                                                                                                                                                  | Deliverable / exit check                                                                                                           | Depends on  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| A — identity assets | `public/bathyline-mark-draft.svg`, new `public/bathyline-mark.svg`, `public/favicon.svg`, `public/icons/*`, `public/fonts/*`, new `src/styles/brand-fonts.css`, `tools/make_icons.mjs`, `ATTRIBUTION.md`    | Final SVG + small variant, font payload/licences, regenerated icons; inspect 16/32/180 px and maskable cropping. No app CSS yet.   | Spec        |
| B — terrain crop    | New `src/render/title/TitleTerrain.ts`, new `tests/unit/titleTerrain.test.ts`                                                                                                                               | Real cropped terrain, finite samples, correct north/east direction, no exaggeration, owned resource disposal.                      | Spec        |
| C — scene shot      | New `src/render/title/TitleScene.ts`, new `tests/unit/titleScene.test.ts`                                                                                                                                   | Vehicle/fog/lights/motion/layout camera with injected crop input; reduced motion, tier budgets and static invalidation.            | Spec; B API |
| D — home layout     | `src/ui/Home.ts`, `src/styles/menus.css`, `src/styles/modes.css`, `src/styles/predive.css`, new `src/styles/home.css`, `src/styles.css`, new `tests/e2e/f-title-layout.spec.ts`                             | Exact copy/semantic order, responsive scroll/plates, origins for back-focus; remove superseded home rules. Import fonts/home last. | A           |
| E — scene bridge    | New `src/app/systems/title.ts`, `src/app/context.ts`, `src/app/systems.ts`, `src/app/systems/render.ts`, `src/app/systems/shell.ts`, `src/app/systems/progress.ts`, new `tests/unit/titleLifecycle.test.ts` | Shared renderer branch, lazy async lifecycle, embedded globe only in sites, Upgrades placement; no sim/route/save changes.         | B, C, D     |
| F — public identity | `index.html`, `public/manifest.webmanifest`, `README.md`, new `docs/title-scene.md`                                                                                                                         | Title/meta/description/theme colours agree; manifest identity/paths unchanged; document fonts and scene caveat.                    | A, D        |
| G — integration QA  | `tests/e2e/d-shell.spec.ts`, `tests/e2e/f-touch-audit.spec.ts`, new `tests/e2e/f-title-scene.spec.ts`, `docs/architecture.md`, `plan/progress/F-TITLE-QA.md`                                                | Refresh assertions for globe-after-selection/menu order; lifecycle/visual regressions and full gates.                              | E, F        |

All packages also own their unique `plan/progress/F-TITLE-<letter>.md`. C can
start with an injected fixture while B builds terrain; E waits for both APIs.
D tests target the implemented home flow; G updates legacy tests after bridge
changes. Do not delete route, pause, focus or mission launch coverage merely
because the globe moves. No package renames `subexplorer` storage or project paths.

## 8. Acceptance and verification

1. Capture home at 1920×1080, 1280×720, 768×1024, 390×844, 320×568, 844×390
   and 667×375, fresh and saved Continue, Daily visible/absent, Advanced expanded.
   Repeat smallest/landscape layouts at 200% text size. Copy/menu do not overlap;
   all actions are reachable; no horizontal scroll; check safe insets on all sides.
2. Compare Low and High shots: real canyon slope, lit readable hull, calm negative
   space, no clipped camera or opaque overlay hiding the hero. Visual review is
   required in addition to DOM bounds; retain screenshots in `.cache/codex/shots/f-title/`.
3. Tab/Shift-Tab stays in the visible shell. Enter launches the right mission,
   both selector entry buttons restore focus on Back/Escape, and nested
   Settings/Journal/Upgrades close back to a usable home. Touch targets >= 48 px.
4. On `/`, W/ballast/scan/boost do not move the gameplay vehicle, spend resources,
   advance mission time or earn RP. Quit-to-home after a dive preserves sub pose,
   Continue and Journal. Scene load creates no scan/mission/discovery events.
5. Existing direct mission/tile/globe/debug URLs still bypass home and present
   briefing/dive normally; exercise root and `/submarine-explorer/` deployment
   base. Logo/font/tile requests resolve through publicUrl/base-aware paths.
6. Emulate OS reduced motion and toggle saved motion setting; decorative poses
   stop changing and particles disappear. Hide/restore the tab, open a modal,
   open sites, quit/re-enter repeatedly: drawCount stops while inactive, resumes
   without accumulating renderers/objects/listeners, and gameplay resumes cleanly.
7. Block the optional Monterey title fetch and font requests: main home actions
   work, fallback caption is honest, no fatal title error or unhandled rejection.
   Unit tests inject late/rejected loads and disposal. This does not claim recovery
   from failure of the mandatory gameplay boot tile or WebGL itself.
8. Verify title draw calls/triangles meet budgets; inspect contrast/focus over
   the brightest title shot. Reduced-motion tests assert stable transforms rather
   than relying on asynchronous pixel identity. Font/icon visual review includes
   fallback fonts and the small mark.
9. Format owned files, log changes/cuts, and run `tools/gates.sh` with Node in
   `$HOME/.local/node/bin`. Full gate failures retain logs; report environmental
   restrictions separately from test failures. No commit in this research task.
