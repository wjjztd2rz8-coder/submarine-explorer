# F1-TOUCH progress

## Built

- `src/core/Touch.ts`: pure maths (stick axes with dead zone, slider, double tap, pinch, device class), unit-tested.
- `src/ui/TouchControls.ts` + `src/app/systems/touch.ts` + `src/styles/touch.css`: stick, ballast slider, Scan/Boost (hold), Lights/Sonar/Photo (tap), Pause, look drag, pinch, double-tap reset, portrait rotate hint on phones. Sizes scale with `--ui-scale`, safe-area insets respected. `?touch=1` forces them on.
- `src/core/Input.ts`: small `F1-TOUCH` block (`touchAxes`, `touchHeld`, `touchEdge`, `touchLook`, `touchZoom`); sample() lets touch axes override keys like a pad.
- PWA: `public/manifest.webmanifest` (the app name lives only there), `public/icons/*` (from `tools/make_icons.mjs`), `public/sw.js` stamped by `tools/pwaPlugin.ts` (version = hash of shell files), registration in `src/core/Pwa.ts` (prod only, skipped when `navigator.webdriver`). Works under any Vite base.
- Quality: existing detection gives low/medium on phones/tablets (verified with iPhone 13 and iPad descriptors); dynamic resolution is on for `auto`.

## See it

`npm run build && npm run preview`, open with device emulation, or `?touch=1` on desktop.
Screenshots: `.cache/codex/shots/f1-touch/`. Spec: `tests/e2e/f1-touch.spec.ts`.

## Known gaps

- The HUD (readouts, sonar minimap, credits) is oversized on phones and the "Hold G to scan" prompt is key-based; F3-BRAND-UI / F3-ONBOARD should adapt them. Controls avoid the middle but overlap the attribution text.
- Portrait is playable but cramped.
- Real-device performance not measured (SwiftShader only).
- Port 4352 was held by a stale dev server from the deleted f1-wrecks worktree; tests here used 4362.
