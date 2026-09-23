# Settings, save and accessibility (C5)

Open the settings screen with **O** (the `toggleSettings` binding) or by
clicking the settings hint in the HUD help panel. It is a modal dialog: while
it is open the game is frozen (no physics, mission clock stopped, like the
briefing and the globe) and every key press goes to the dialog only. **Escape**
or the toggle key closes it; **Tab** cycles its controls. It can open over the
mission briefing, but not over the globe.

Code: `src/ui/Settings.ts` (screen), `src/core/Save.ts` (persistence),
`src/ui/Captions.ts` (captions overlay), wiring in the `C5` fenced blocks of
`src/main.ts`. Defaults and ranges: `Config.settings`, palettes:
`Config.sonarPalettes`.

## Settings

| Setting           | Applies            | Notes                                                                          |
| ----------------- | ------------------ | ------------------------------------------------------------------------------ |
| Graphics tier     | after reload       | `?tier=low\|medium\|high` in the URL overrides the saved tier.                 |
| Post-processing   | immediately        | Colour grade + vignette pass; off also when the tier has no post stack.        |
| Terrain detail    | after reload       | Procedural detail on top of the survey data, 0 to 1.5; 0 = survey data only.   |
| Default sim speed | next dive (reload) | Auto = free dive 1×, missions at their own default; else 1×, 2× or 3×.         |
| Reduce motion     | immediately        | `CameraRig.reduceMotion`: no camera shake, no banking follow.                  |
| Captions          | immediately        | Text for every audio cue (`AudioSystem.captions`), bottom centre, live region. |
| Sonar map colours | immediately        | `Sonar.setPalette`: sonar green, colour-blind safe blue-yellow, high contrast. |

**Reset settings** restores the defaults and removes the stored copy.
When graphics tier, terrain detail, or default sim speed differs from its boot
value, **Apply and reload** appears. It reloads the current URL, preserving the
mission and query parameters. A `?tier=` URL override remains in force; changing
the saved tier alone cannot replace it. If settings storage is protected or
fails to save, the screen reports that reload may restore previous values and
does not offer Apply and reload.

**Reset discoveries** opens an in-dialog confirmation. Confirming clears the
discovery and scan-history key, then reloads the current dive so the guide,
scanner and objectives reflect an empty record. Settings and key bindings are
preserved. A discovery record from a newer app version is protected, and a
storage removal that fails or cannot be verified is reported without claiming
progress was erased. If storage is absent, the current session can be reset,
but progress cannot be persisted in that browser.

## Key bindings

Activate an action's key button, then press a key: it becomes that action's
primary key (secondary keys such as the arrow keys are kept). If another
action held that key, it loses it and the status line says so; an action with
no keys left shows **Unbound** and stays unbound after a reload (it does not
silently regain its default, which another action may now own). Escape
cancels a capture; Escape and Tab cannot be bound. **Reset key bindings**
restores the shipped map. The HUD help follows the live bindings.

## Storage

| Key                          | Owner            | Shape                                                                                                                   |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `subexplorer.settings.v1`    | `Save`           | `{ version: 1, graphicsTier, postFx, detailStrength, simSpeedDefault, reduceMotion, captions, sonarPalette, bindings }` |
| `subexplorer.bindings.v1`    | `Input`          | `{ version: 1, keys: { <actionId>: string[] } }`, `[]` = deliberately unbound                                           |
| `subexplorer.discoveries.v1` | `DiscoveryStore` | unchanged                                                                                                               |

`bindings` in the settings record is only a pointer to the bindings key. Each
field is validated on load; a bad field falls back to its default alone. A
newer stored version is read as defaults and never overwritten. Storage that
is missing or throws (privacy mode, quota) never crashes the game: settings
and bindings then last for the session only.

## Accessibility

- Dialog: `role="dialog"`, `aria-modal`, labelled by its heading; every
  control has a `<label>`; notes are linked with `aria-describedby`; rebind
  results and reset outcomes are announced through a `role="status"` live region.
- Focus moves into the dialog on open and returns to the opener on close.
- Captions are an `aria-live="polite"` region, so screen readers read them.
- The colour-blind and high-contrast sonar palettes carry depth by luminance
  (pinned by `tests/unit/settingsPalette.test.ts`).
- `tests/e2e/settings.spec.ts` runs axe-core (`@axe-core/playwright`) on the
  open dialog and expects zero violations.

## Tests

- Unit: `settingsSave.test.ts`, `settingsScreen.test.ts`, `settingsPalette.test.ts`,
  `captions.test.ts`, and the "bindings across reloads" block in `subInput.test.ts`.
- e2e: `tests/e2e/settings.spec.ts` (open with O, frozen, live changes,
  conflict + reload, Escape, captions after a ping, HUD hint, focus trap, axe,
  Enter swallowed over the briefing).
