# F-TITLE-E: scene bridge

Status: complete. 2026-10-03.

## Delivered

- `src/app/systems/title.ts` (new, registered before `renderSystem`): lazy `TitleScene` on first
  home entry (`app:state` home). The Monterey crop loads on a `setTimeout(0)` after that (reuses
  `ctx.tile` when the gameplay tile is already Monterey, else `ctx.loader`) and fails soft (warn
  only, fallback caption). Publishes `ctx.titleScene` (`TitleBridge`) and read-only
  `window.__game.titleScene` diagnostics `{active, terrainReady, animated, drawCount, calls,
triangles}`. Adds `.has-title-scene` to the home root and calls `home.setSceneCaption(true)`
  when the crop is ready.
- `render.prepare` hook: active = app home + home open + not sites subview + no covering
  Settings/Journal/Upgrades/Controls/overlay globe + tab visible. Resize/layout (desktop,
  portrait, short-landscape rule from spec section 4), tier (ultra maps to high), reduced motion
  (`rig.reduceMotion`, covers OS and saved setting) and `scene.update(dt)` run only while active.
  Re-activation invalidates for a fresh frame; a late crop after dispose is released.
- `render.ts`: `render.draw` returns early when `ctx.titleScene.ownsCanvas` (home visible):
  title frame when active, one navy clear in the sites view, no-op (canvas retained) for
  hidden/modal. The gameplay and post path are skipped; both scenes are never drawn.
- `shell.ts`: the embedded home globe is open iff app is home, home is visible and
  `home.sitesOpen` (reconciled in `setAppState` and on a new `home:sites` event fired by
  `Home.showSites/closeSites`, so Back and Escape work). Overlay globe and routes unchanged.
- `Home.ts`: only the `home:sites` event dispatch. `context.ts`: `titleScene` field.
  `systems.ts`: registration. `progress.ts`: no change needed (Upgrades is already appended after
  Controls by package D).
- `tests/unit/titleLifecycle.test.ts`: draw stop/resume (hidden, modal, sites), dive, lazy build,
  blocked fetch, caption, late completion after dispose, reduced motion.

## Tuning (TitleScene.ts, lighting and fog only)

First real-browser look showed near-black terrain with only the lamp pool visible. Hemisphere
0x6fa6c4/0x1c3d4e at 0.6, rim directional 0xe0f0f4 at 6 from (-300, 45, -40), fog 0x082338 at
0.0022 (was 0.0035). The hull now reads against the seabed; the ridge reads as a soft lit
diagonal at the top. Canyon relief is subtle at this camera (about 100 m over 600 m).

## Existing tests updated (old globe-on-home behaviour)

- `tests/e2e/d-shell.spec.ts`: first test no longer waits for or measures the globe at home; it
  asserts the globe is hidden, then waits for it after Dive sites. The pin test opens Dive sites
  first.
- `tests/e2e/d2-predive.spec.ts`: removed the home globe texture wait.
- `tests/e2e/f-title-layout.spec.ts`: caption accepts the fallback or the Monterey caption.

## Verification

Headless Chromium (SwiftShader) has WebGL. Measured counters: Low 8 calls / 67,060 triangles,
High 22 calls / 82,068 triangles (budgets 35/100k and 60/200k). Verified in browser: drawCount
stops in Settings and in the sites view and resumes on return, animation stops under reduced
motion, and a `?mission=` URL never builds the scene. Screenshots:
`.cache/codex/shots/f-title-e/` (1920x1080, 1280x720, 390x844, 844x390 at low and high).

## Concerns

The canyon wall is understated; a stronger composition needs a camera or terrain colour pass
(TitleTerrain vertex colours are muted slate). Tab-hidden resume and dynamic-resolution DPR
changes rely on the existing resize handler plus `invalidate`; not browser-tested.
