# Settings, save and accessibility (C5, D-MODES, D-SHELL)

Open Settings from the **home screen** or the **Esc pause menu** (both have a
Settings entry and a Controls entry). There is no dedicated hotkey any more —
D-SHELL retired the old `O` binding, and `Input`'s `defaultActions()` no
longer defines a `toggleSettings` or `toggleGlobe` action at all. It is a
modal dialog: while open the game is frozen (no physics, mission clock
stopped, like the briefing and the globe) and every key press goes to the
dialog only. **Escape** closes it; **Tab** cycles its controls. It can open
over the mission briefing, but not over the globe (`canOpen: () =>
!globe.isOpen` in `src/main.ts`).

Code: `src/ui/Settings.ts` (screen), `src/core/Save.ts` (persistence),
`src/core/Input.ts` (key bindings), `src/ui/Captions.ts` (captions overlay),
wiring in the `C5`/`D-MODES`/`D-SHELL` fenced blocks of `src/main.ts`.
Defaults and ranges: `Config.settings` (display settings, gameplay presets and
options), `Config.sonarPalettes`.

## Settings

| Setting           | Applies            | Notes                                                                                                                                                                                        |
| ----------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graphics tier     | after reload       | `?tier=low\|medium\|high` in the URL overrides the saved tier.                                                                                                                               |
| Post-processing   | immediately        | Colour grade + vignette pass; off also when the tier has no post stack.                                                                                                                      |
| Terrain detail    | after reload       | Procedural detail on top of the survey data, 0 to 1.5; 0 = survey data only.                                                                                                                 |
| Default sim speed | next dive (reload) | Auto = free dive 1×, missions at their own default; else 1×, 2× or 3×. This is a legacy display default — `gameplay.simSpeed` (below) is what a launched dive actually starts at.            |
| Reduce motion     | immediately        | `CameraRig.reduceMotion`: no camera shake, no banking follow.                                                                                                                                |
| Captions          | immediately        | Text for every audio cue (`AudioSystem.captions`), bottom centre, live region.                                                                                                               |
| Sonar map colours | immediately        | `Sonar.setPalette`: sonar green, colour-blind safe blue-yellow, high contrast.                                                                                                               |
| UI scale (%)      | immediately        | Integer 80–150, default 100. Combines with an automatic viewport-based factor (`clamp(innerWidth/1920, 0.8, 1.25)`) through the `--ui-scale` CSS variable; does not resize the WebGL canvas. |
| Control tips      | immediately        | Shows/hides the HUD's control-tip line (e.g. the F-scan prompt copy, the one-time Ctrl+W fullscreen tip). Default on.                                                                        |

**Reset settings** restores the defaults (Arcade gameplay mode, `uiScale`
100, `controlTips` on, and the display settings above) and removes the stored
copy. When graphics tier, terrain detail, or default sim speed differs from
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

A **Gameplay** section sits between Graphics and Accessibility. **Mode** is
`Arcade` (default), `Realistic` or `Custom`. Choosing Arcade or Realistic
replaces every option below atomically with that preset
(`Config.settings.gameplayPresets`); changing any single option afterward —
in either preset, or starting from nothing — flips the mode label to
`Custom` and keeps every other value (`Save.setGameplayOption`). Choosing
Custom by itself just copies the current values; it never guesses a preset.

| Option             | Arcade     | Realistic   | Effect                                                                                                  |
| ------------------ | ---------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| Forward speed      | `fast`     | `research`  | `Config.speedProfiles`: `research` ≈ Alvin (1 m/s cruise), `standard`, or `fast` (up to ~40 kn boosted) |
| Descent speed      | `fast`     | `research`  | `Config.descentProfiles`: ballast acceleration and vertical speed cap                                   |
| Lights             | `enhanced` | `realistic` | `Config.lightPresets`: brighter/wider spots plus a fill light, or today's narrower realistic spots      |
| Sensors            | `extended` | `realistic` | `Config.sensorPresets`: 2× or 1× scan radius, waypoint hint range and sonar POI pickup range            |
| Visual hints       | on         | off         | Waypoint marker, off-screen edge arrow and objective hint text (`ui/Waypoints.ts`)                      |
| Start position     | near-site  | near-site   | `near-site` or `surface`; surface is opt-in in either mode, chosen in the briefing or here              |
| Battery and oxygen | off        | on          | `game/Power.ts` (`docs/power.md`)                                                                       |
| Currents           | off        | `realistic` | `off` / `gentle` / `realistic`; `world/Currents.ts` (`docs/currents.md`)                                |
| Simulation speed   | 1×         | 1×          | Initial simulated-time rate at the start of a dive; `T` still cycles 1×/2×/3× regardless of mode        |

Physics values are always simulated at 1×; 2×/3× makes the same simulated
motion play out faster per wall-clock second rather than raising the vehicle's
own top speed. Display, accessibility and UI-scale settings are independent
of the gameplay mode and never change its label.

## Key bindings (Controls view)

The **Controls** entry (on the home screen, the pause menu, and the
in-dialog **Controls** button/**Back to Settings** button) opens the same
Settings dialog's bindings pane (`SettingsScreen.showControls`). Activate an
action's key button, then press a key: it becomes that action's primary key
(secondary keys such as the arrow keys are kept). If another action held that
key, it loses it and the status line says so; an action with no keys left
shows **Unbound** and stays unbound after a reload (it does not silently
regain its default, which another action may now own). Escape cancels a
capture; Escape and Tab cannot be bound. **Reset key bindings** restores the
shipped map (`defaultActions()` in `src/core/Input.ts` — see the README's
controls table for the current defaults: W/S, A/D, R/V pitch, Space rise,
Ctrl-or-C sink, Shift boost, F scan, L lights, M sonar, Q camera, T sim
speed, J Journal, E ROV, P photo). The pane also has a note that dragging the
dive view orbits the camera and the wheel zooms it, an **Enable pointer
lock** button, and a sonar note (`M` expands the map; `+`/`-` or the wheel
over it changes range). The retired `toggleSettings`/`toggleGlobe` action ids
are filtered out of the rendered list even though `defaultActions()` no
longer produces them either, so the list only ever shows live, keyboard-bound
actions.

## Storage

| Key                          | Owner                    | Shape                                                                                                                                                                  |
| ---------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subexplorer.settings.v2`    | `core/Save.ts`           | `{ version: 2, graphicsTier, postFx, detailStrength, simSpeedDefault, reduceMotion, captions, sonarPalette, uiScale, controlTips, gameplayMode, gameplay, bindings? }` |
| `subexplorer.bindings.v2`    | `core/Input.ts`          | `{ version: 2, keys: { <actionId>: string[] } }`, `[]` = deliberately unbound                                                                                          |
| `subexplorer.discoveries.v1` | `game/DiscoveryStore.ts` | unchanged since Phase B                                                                                                                                                |
| `subexplorer.photos.v1`      | `game/PhotoStore.ts`     | photo-mode captures, newest 24 (see `docs/architecture.md`); separate from discoveries                                                                                 |
| `subexplorer.lastSite.v1`    | `main.ts`                | `{ missionId: string }`, written when a mission starts; drives the home screen's Continue button                                                                       |
| `subexplorer.tips.v1`        | `main.ts`                | `{ ctrlW: true }` once the one-time "Ctrl+W may close this tab" tip has been dismissed                                                                                 |

`bindings` in the settings record is only a pointer to the bindings key
(`subexplorer.bindings.v2`). `Save.load` reads `subexplorer.settings.v2`
first; if absent, it reads the legacy `subexplorer.settings.v1`, keeps its
seven display fields, assigns the Arcade gameplay preset and `uiScale: 100`,
and writes v2 once if storage allows — the v1 key itself is left untouched,
never deleted. `Input` does the same v1→v2 migration for bindings: a saved
**nondefault** v1 choice is preserved, every untouched action is filled from
the current (D-era) defaults, and the result is written to
`subexplorer.bindings.v2` once. Each field is validated on load; a bad field
falls back to its default alone, and an invalid `gameplay` value sanitizes
field by field against `Config.settings.gameplayOptions`. A newer stored
version (of either key) is read as defaults and left on disk, never
overwritten. Storage that is missing or throws (privacy mode, quota) never
crashes the game: settings and bindings then last for the session only.

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
