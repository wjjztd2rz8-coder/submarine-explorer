# Globe mission select (C1)

A full-screen globe of every catalogued dive site. Open it with **N** (the
`toggleGlobe` binding), the **GLOBE** button in the mission select panel, or
`?globe=1` in the URL (`/?tile=titanic&globe=1`). While it is open the game is
frozen like the mission briefing and settings (no physics, mission clock
stopped) and every key press goes to the globe only. The settings screen (O)
does not open over it.

Code: `src/ui/Globe.ts` (overlay, renderer, input), `src/ui/GlobeModel.ts`
(pure: placement, pin state, catalogue loading, pin clustering, orbit),
wiring in the `C1` fenced blocks of `src/main.ts`. Tunables:
`Config.globe`. Styles: the `/* --- C1 --- */` section of `src/styles.css`.

## Texture

`public/assets/globe/earth-bmng-topo-bathy-4096.jpg`: NASA Blue Marble Next
Generation with Topography and Bathymetry (December 2004, Reto Stöckli, NASA
Earth Observatory / GSFC), public domain, resized from 5400×2700 to
4096×2048 (JPEG q88, 1.3 MB). Source URL and credit are in `ATTRIBUTION.md`.

The shader keeps the ocean forward: land and ice are dimmed
(`landDim`) and desaturated (`landSaturation`), the ocean is lifted
(`oceanGain`), with a faint cyan graticule every `graticuleDeg` and a hairline
cyan rim (`atmosphereScale` 1.012, `atmosphereStrength`). If the texture fails
to load the globe shows a plain dark ocean (console warning); if WebGL is
unavailable only the pins are shown.

## Pins

One real `<button>` per landmark in `data/landmarks.json`, projected over the
canvas every frame and drawn **exactly at its true location**: there is no
ring fan-out and no leader line. Pins on the far side fade out at the horizon.

- **Dot and hit area.** The visible dot is 12 px. It sits in a transparent
  padded button, `Config.globe.pinHitPx` (32 px, mouse) or `pinHitTouchPx`
  (44 px, `html.is-touch` or `pointer: coarse`). `Globe.ts` sets the matching
  `--globe-hit` CSS variable on the overlay.
- **Clusters.** Playable pins (mission, free dive) whose hit areas would
  overlap on screen merge into one counted cluster pin at the group's centroid
  (`clusterPins`: greedy, seeded in Tab order, so a row of pins does not chain
  into one blob). Click or tap: the globe turns to the cluster and zooms in
  until its members separate (`distanceToSeparate`). If the camera is already
  at full zoom and they still overlap, a small chooser lists the member sites
  (Escape or a drag dismisses it). Cluster buttons are not Tab stops; the
  member pins are, so Tab still reaches every site. A focused (or previewed)
  pin is always drawn on its own, with its label, even inside a cluster.
- **Catalogue sites** are faint 4 px specks, not pointer targets
  (`pointer-events: none`), so the playable pins dominate. Keyboard focus still
  reaches them and shows their card; no catalogue data is removed.
- **Label.** The focused, hovered or selected pin shows a short name beside its
  dot (`shortName`: "Lost City Hydrothermal Field" becomes "Lost City"); it
  flips inward near the right edge.
- **Touch.** The first tap on a playable pin names it (label, card, matching
  list row highlighted); a second tap on the same pin starts the dive. Mouse
  and keyboard act on the first click / Enter. Keyboard focus turns the globe to
  the pin; a mouse press does not (the pin would move out from under the click).
- **Zoom.** Wheel, + / - keys and on-screen + / - buttons. The embedded (home)
  globe starts zoomed out to fit the whole disc and can zoom in from there.

| State       | Look             | Condition                                      | Enter / click                 |
| ----------- | ---------------- | ---------------------------------------------- | ----------------------------- |
| `mission`   | filled cyan      | `data/landmarks/<id>/mission.json` loaded      | `?mission=<id>`               |
| `tile`      | cyan ring        | a tile with that id in `data/tiles/index.json` | free dive `?tile=<id>`        |
| `catalogue` | faint grey speck | catalogue entry only (no tile)                 | pins the card only (keyboard) |

A `tile` pin whose landmark is listed in `data/landmarks/index.json` but has
no `mission.json` yet is badged "FREE DIVE · MISSION COMING", and the mission
select panel lists it as a "content coming" row. The landmark being dived is
ringed and the globe starts centred on it. Tab order: missions, then free
dives, then catalogue pins (west to east within each).

The card (hover, focus or a clicked catalogue pin) shows the mission title or
landmark name, type, depth, region, a summary and what Enter will do.

## Making a pin launchable (content packs)

1. The landmark must be in `data/landmarks.json` (lat, lon, type, depth).
2. A tile with the same id must be in `data/tiles/index.json` (free dive).
3. `data/landmarks/index.json` must list the id (pre-populated for all 13).
4. Add `data/landmarks/<id>/mission.json` (see `docs/missions.md`). Once it
   loads, the pin becomes a mission pin and the "content coming" row goes.
   A missing or malformed `mission.json` only logs a console warning.

The optional `species.json` in the same folder feeds the field guide's
**SPECIES** tab (J, then SPECIES): scientific and common names, record
counts, depth range, OBIS links and the source query. The note always says
that placement of animals in the game is invented (added if the file's own
note does not).

## Controls

| Input                 | Action                                           |
| --------------------- | ------------------------------------------------ |
| Drag                  | orbit (the surface follows the pointer), inertia |
| Wheel, + / −          | zoom                                             |
| Arrow keys            | orbit                                            |
| Tab / Shift+Tab       | cycle pins; the camera turns to the focused pin  |
| Click / tap a cluster | zoom in until it separates, or open the chooser  |
| + / − buttons         | zoom                                             |
| Enter, click          | select the focused / hovered pin                 |
| Escape, N, ESC button | close                                            |

After `idleBeforeAutoRotateS` without input the globe slowly auto-rotates.
A released drag keeps spinning (capped at `maxFlingDegPerS`, none if the
pointer was still for `flingStaleS` before release).

## Accessibility

The overlay is a `role="dialog"` with `aria-modal`; focus is trapped inside
it; pins are labelled buttons ("name, type, depth. badge"; clusters
"N sites: names. Zoom in", not Tab stops); the card is an
`aria-live="polite"` region; the canvas is `aria-hidden`.

## Tests

- Unit: `tests/unit/globe.test.ts` (placement, pin state, catalogue parsing,
  clustering, zoom target, short names, orbit), `tests/unit/species.test.ts`.
- e2e: `tests/e2e/globe-pins.spec.ts` (true-location pins, hit areas, clusters,
  chooser, Tab into a cluster, touch first-tap and phone globe size),
  `tests/e2e/globe.spec.ts` (open, pin states, frozen game, settings
  blocked, Tab, Escape, N, Enter on Titanic → `?mission=titanic`, axe,
  screenshot `tests/e2e/screenshots/globe.png`; SPECIES tab with the
  `data/landmarks/_test/species.json` fixture).
