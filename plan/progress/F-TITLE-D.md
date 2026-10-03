# F-TITLE-D: home layout

Status: complete. 2026-10-03.

## Delivered

- `src/ui/Home.ts`: exact spec copy (eyebrow, h1 Bathyline with decorative inline mark,
  tagline, description, notes, scene caption plate + caveat, aria-label "Bathyline home").
  Menu DOM order: Continue, Dive sites, Free dive, Daily, mode, Journal, Settings, Controls
  (Upgrades appended after by progress.ts, unchanged). First focus is Continue when enabled,
  else Dive sites. `showSites(freeDive, origin?)` records the origin; `closeSites()` restores
  focus to it (Back and Escape). New `setSceneCaption(terrainReady)` for package E
  (Monterey Canyon caption vs "Expedition preview"). DOM: `.home-panel` > `.home-copy` +
  `.home-body` (scroller: `.home-menu` + `.home-notes`); `.home-hero` plate; globe wrap
  follows the panel in DOM so globe pins are not first in Tab order.
- `src/styles/home.css` (new, last in `styles.css` after `brand-fonts.css`): desktop >=960x501,
  portrait/narrow, short landscape (<=500 high) and sites subview layouts; safe insets; 48 px
  targets; mint primary fill (Continue if enabled, else Dive sites). Superseded home rules were
  removed from `menus.css`, `modes.css`, `predive.css` (pause/briefing/mode styles untouched).
- `tests/e2e/f-title-layout.spec.ts`: copy/order/first-focus, focus return, and at 1920x1080,
  1280x720, 768x1024, 390x844, 320x568, 844x390, 667x375: no horizontal overflow, no overlap,
  > =48 px reachable targets; screenshots in `.cache/codex/shots/f-title-d/`.

## Notes for package E / G

- Until E, the existing ocean gradient and embedded globe remain the home backdrop. E should add
  `.has-title-scene` to `.home-screen` to make it transparent over the canvas (not in sites view);
  the scene region is the hero band (portrait), the right column (desktop) or the lower-left
  region (short landscape); `.home-globe-wrap` occupies that same cell today.
- E should call `home.setSceneCaption(true)` when the Monterey crop is ready.
- Embedded globe still opens at home (shell.ts unchanged); E changes it to sites-only.

## Deviations

- Upgrades takes one column (Controls | Upgrades) rather than spanning both, avoiding a
  half-empty row; Free dive is full-width per the layout text.
- Updated `tests/e2e/f-touch-audit.spec.ts` (3 lines): its home check asserted `.home-menu` itself
  fits the viewport; the scroller is now `.home-body`.
- Not captured: 200% text zoom and saved-Continue/Daily screenshots (e2e covers Daily reachability
  via f-touch-audit / f2-modes).

## Proposed CHANGELOG entry

Added to CHANGELOG.md under Unreleased > Changed (F-TITLE-D).

- Updated `tests/e2e/smoke.spec.ts` h1 text assertion to Bathyline.
- Updated `tests/unit/dailySystem.test.ts` fake-DOM path to the Daily card (menu is now panel > body > menu).
