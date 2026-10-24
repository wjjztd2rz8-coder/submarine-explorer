# Settings, save and accessibility (Phase D2)

Open Settings from the **home screen** or the **Esc pause menu** (both have a
Settings entry and a Controls entry). There is no dedicated hotkey any more —
D-SHELL retired the old `O` and `N` bindings; `Input`'s `defaultActions()` no
longer binds Settings or the globe. Settings is a modal dialog: while open the
game is frozen (no physics, mission clock
stopped, like the briefing and the globe) and every key press goes to the
dialog only. **Escape** closes it; **Tab** cycles its controls. It can open
over the mission briefing, but not over the globe (`canOpen: () =>
!globe.isOpen` in `src/main.ts`).

Code: `src/ui/Settings.ts` (screen), `src/core/Save.ts` (persistence),
`src/core/Input.ts` (key bindings), `src/ui/Captions.ts` (captions overlay),
wiring in the `C5`/`D-MODES`/`D-SHELL`/`D2` fenced blocks of `src/main.ts`.
Defaults and ranges: `Config.settings` (display settings, gameplay presets and
options), `Config.sonarPalettes`.

## Settings

| Setting           | Applies      | Notes                                                                                                                                                                                                                                                              |
| ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Graphics tier     | after reload | `?tier=low\|medium\|high` in the URL overrides the saved tier.                                                                                                                                                                                                     |
| Post-processing   | immediately  | Colour grade + vignette pass; off also when the tier has no post stack.                                                                                                                                                                                            |
| Terrain detail    | after reload | Procedural detail on top of the survey data, 0 to 1.5; 0 = survey data only.                                                                                                                                                                                       |
| Reduce motion     | immediately  | `CameraRig.reduceMotion`: disables camera banking. Hull warnings never shake the screen.                                                                                                                                                                           |
| Captions          | immediately  | Text for every audio cue (`AudioSystem.captions`), bottom centre, live region.                                                                                                                                                                                     |
| Sonar map colours | immediately  | `Sonar.setPalette`: sonar green, colour-blind safe blue-yellow, high contrast.                                                                                                                                                                                     |
| UI scale (%)      | immediately  | Integer 80–150, default 100, adjustable by slider and step buttons with a separate readable value. Combines with an automatic viewport-based factor (`clamp(innerWidth/1920, 0.8, 1.25)`) through the `--ui-scale` CSS variable; does not resize the WebGL canvas. |
| Hull warning      | immediately  | Vignette, gauge or both (default). The gauge shows depth against the fitted hull rating; the vignette begins beyond that rating. Simulated crush is 10% deeper and triggers emergency ascent.                                                                      |

**Reset settings** restores the defaults (Arcade gameplay mode, `uiScale`
100, and the display settings above) and writes those defaults
to v3 so older copies cannot be re-imported. When graphics tier or terrain detail differs from
its boot value, **Apply and reload** appears. It reloads the current URL,
preserving the mission and query parameters. A `?tier=` URL override remains
in force; changing the saved tier alone cannot replace it. If settings
storage is protected or fails to save, the screen reports that reload may
restore previous values and does not offer Apply and reload.

**Reset discoveries** opens an in-dialog confirmation. Confirming clears the
discovery and scan-history key, then reloads the current dive so the guide,
scanner and objectives reflect an empty record. Settings and key bindings are
preserved. A discovery record from a newer app version is protected, and a
storage removal that fails or cannot be verified is reported without claiming
progress was erased. If storage is absent, the current session can be reset,
but progress cannot be persisted in that browser.

## Gameplay (D-MODES)

The **Gameplay** section, Home and the briefing share one mode selector.
Choosing Arcade or Realistic applies its preset. Advanced has exactly four
switches; changing one enters Custom, preserving the other switches and the
last preset's speed, lights and sensors (`gameplayBaseMode`).

| Setting                  | Arcade (default)                    | Realistic                                | Custom                              |
| ------------------------ | ----------------------------------- | ---------------------------------------- | ----------------------------------- |
| Speed, including descent | Fast: ~12 m/s cruise; 8 m/s descent | Research: ~1 m/s cruise; 0.5 m/s descent | Inherits the last selected preset   |
| Lights / sensors         | Enhanced lights / extended sensors  | Realistic lights / sensors               | Inherits the last selected preset   |
| Battery / oxygen         | Off                                 | On                                       | Switch                              |
| Currents                 | Off                                 | Full sampled strength                    | Switch: off / full sampled strength |
| Visual waypoints         | On                                  | Off                                      | Switch                              |
| Start at surface         | Off (near site)                     | Off (near site)                          | Switch                              |

The briefing previews the start immediately. Realistic near-site dives use
reserves reduced by the simulated descent; surface starts begin full.
Sonar markers stay available in every mode. Dives start at 1×; **T** and
**D-pad Up** cycle 1×/2×/3× independently of settings.

`resolveEffective(settings, mode, progress, daily)` computes handling, camera
look-ahead, scan ranges, light/sensor presets, supplies and current conditions
from pristine Config values. Boot and live changes share this resolver;
purchases and Daily overrides never mutate Config or saved preferences.

## Key bindings (Controls view)

The **Controls** entry (on the home screen, the pause menu, and the
in-dialog **Controls** button/**Back to Settings** button) opens the same
Settings dialog's bindings pane (`SettingsScreen.showControls`). On touch
devices the in-dialog Controls button and the bindings pane are hidden. On Home,
Settings also reads the Controls guide's current device, so remembered touch,
phone hardware and `?touch=1` work before dive controls exist. Switching to a
mouse or keyboard makes bindings available again. Activate an
action's key button, then press a key: it becomes that action's primary key
(secondary keys such as the arrow keys are kept). If another action held that
key, it loses it and the status line says so; an action with no keys left
shows **Unbound** and stays unbound after a reload (it does not silently
regain its default, which another action may now own). Escape cancels a
capture; Escape and Tab cannot be bound. **Reset key bindings** restores the
shipped map (`defaultActions()` in `src/core/Input.ts` — see the README's
controls table for the current defaults: W/S, A/D, R/F pitch, Space rise,
Ctrl-or-C sink, hold G to scan, L lights, M sonar, Q camera,
X reset camera, T sim speed, J Journal, P photo, Enter capture photo). The pane also has a note that dragging the
dive view orbits the camera and the wheel zooms it, an **Enable pointer
look** button (closes Settings and locks the dive view; menus release it, and
losing lock while diving opens pause), and a sonar note (`M` expands the map; `+`/`-` or the wheel
anywhere while expanded changes range, leaving camera zoom alone). Retired globe and ping entries in saved bindings are ignored; the list
shows only live, keyboard-bound actions.

Gamepad uses D-pad left for Journal, D-pad down for reset camera, and left
bumper for capture in photo mode. D-pad up remains sim speed and right bumper
remains hold-to-scan; ROV deployment stays on its existing keyboard path.

## Storage

| Key                          | Owner                    | Shape                                                                                                                                                                        |
| ---------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subexplorer.settings.v3`    | `core/Save.ts`           | `{ version: 3, graphicsTier, postFx, detailStrength, reduceMotion, captions, sonarPalette, uiScale, hullWarningStyle, gameplayMode, gameplayBaseMode, gameplay, bindings? }` |
| `subexplorer.bindings.v3`    | `core/Input.ts`          | `{ version: 3, keys: { <actionId>: string[] } }`, `[]` = deliberately unbound                                                                                                |
| `subexplorer.discoveries.v1` | `game/DiscoveryStore.ts` | unchanged since Phase B                                                                                                                                                      |
| `subexplorer.photos.v1`      | `game/PhotoStore.ts`     | photo-mode captures, newest 24 (see `docs/architecture.md`); separate from discoveries                                                                                       |
| `subexplorer.lastSite.v1`    | `main.ts`                | `{ missionId: string }`, written when a mission starts; drives the home screen's Continue button                                                                             |
| `subexplorer.tips.v1`        | `main.ts`                | `{ ctrlW: true }` once the one-time "Ctrl+W may close this tab" tip has been dismissed                                                                                       |

`bindings` in the settings record is only a pointer to the bindings key
(`subexplorer.bindings.v3`). `Save.load` reads `subexplorer.settings.v3`
first, then v2 and v1 when the current key is absent or damaged. Legacy keys
remain byte-for-byte intact. A malformed version field is also damaged; recovery
skips it and tries the next older key. Migration writes v3: the six retired gameplay
fields (`speedProfile`, `descentProfile`, `lights`, `sensors`, `sonarMarkers`,
`simSpeed`) and `simSpeedDefault` are removed. Gentle and Exaggerated currents
become full sampled strength. Old Custom research speed inherits Realistic;
standard/fast inherit Arcade. Unknown top-level and gameplay fields survive
migration, edits, preset changes and reload. Named presets keep their own
switch defaults. The retired `controlTips` field is still removed. `Input` migrates v2 bindings to v3: unchanged `V` pitch-down and `F` scan
defaults become `F` and `G`; saved custom bindings are retained and `X` reset
camera is added. A saved v1 map also migrates through the supported defaults.
The earlier keys remain untouched. Known binding records are rewritten without
retired actions. Reset removes all supported binding keys; if removal fails or
leaves a key behind, it writes current defaults to v3 so old remaps cannot return.
Onboarding records likewise drop retired hint IDs while keeping tutorial completion
and other seen hints. Each field is validated on load; a bad field
falls back to its default alone, and an invalid `gameplay` value sanitizes
field by field against `Config.settings.gameplayOptions`. A newer stored
version (of either key) is read as defaults and left on disk, never
overwritten. Storage that is missing or throws (privacy mode, quota) never
crashes the game: settings and bindings then last for the session only.
If a settings read throws, settings writes and resets stay in memory until a
successful `Save.load()` or a new session can read the keys. This preserves an
unread existing save even when storage still accepts writes; Apply and reload
stays unavailable during that failure.

## Accessibility

- Dialog: `role="dialog"`, `aria-modal`, labelled by its heading; every
  control (including the Gameplay selects) has a `<label>`; notes are linked
  with `aria-describedby`; rebind results and reset outcomes are announced
  through a `role="status"` live region.
- Focus moves into the dialog on open and returns to the opener on close.
- Captions are an `aria-live="polite"` region, so screen readers read them.
- The colour-blind and high-contrast sonar palettes carry depth by luminance
  (pinned by `tests/unit/settingsPalette.test.ts`).
- `tests/e2e/settings.spec.ts` runs axe-core (`@axe-core/playwright`) on the
  open dialog and expects zero violations.

## Tests

- Unit: `settingsSave.test.ts`, `settingsScreen.test.ts`, `settingsPalette.test.ts`,
  `captions.test.ts`, and the "bindings across reloads" block in `subInput.test.ts`.
- e2e: `tests/e2e/settings.spec.ts` (open from the pause menu, frozen, live
  changes, conflict + reload, Escape, captions after a ping, focus trap, axe,
  Enter swallowed over the briefing), `tests/e2e/d-modes.spec.ts` (Arcade/
  Realistic/Custom apply live and survive reload; v1 settings migrate to
  Arcade while keeping display choices), `tests/e2e/d-shell.spec.ts` (home
  and pause menu Settings/Controls entry points).

Hull fitting and the loaded mission's access policy are fixed when a dive loads.
Mode edits and hull research apply when the next dive loads (select a site again),
including edits made on the briefing. Restarting or resuming the loaded dive keeps
its fitted hull; speed, lights and other gameplay options still update live.
