# Title scene

The Bathyline home screen sits over a fixed 3D shot: the class B research
vehicle hovering beside a real Monterey Canyon crop. Spec: `plan/F-TITLE-SPEC.md`
(section 5); code: `src/render/title/` plus the home system in `src/app/systems/`.

## How it works

- **Terrain** (`TitleTerrain.ts`): `buildTitleCrop(tile)` cuts a 2,400 m square
  from the checked-in `monterey-canyon` GMRT tile around the upper-channel POI
  (36.7985, -121.8502), using the `src/util/geo.ts` conventions (+X east, +Z
  south, +Y up, row 0 north). Real metres, no vertical exaggeration or smoothing,
  rebased so the anchor seabed is y = 0. It is independent of the saved or
  active dive site and writes no scene, state or storage.
- **Scene** (`TitleScene.ts`): one scene and one perspective camera, with no
  renderer of its own (it draws into the shared canvas and restores
  viewport/scissor). It holds the vehicle, two lamps, a cool hemisphere fill,
  depth fog and sparse marine snow. The camera does a 40 s seamless sway
  (at most 2 m, 1 degree); frames are capped at 30 fps and the time step is
  clamped after tab restore. The region the shot is framed into follows the home
  layout (desktop, portrait, short landscape).
- **Quality and motion**: Low and Medium+ tiers have separate snow, draw-call and
  triangle budgets. Reduced motion (OS or saved setting) freezes camera, vehicle
  and snow and draws only on dirty events.
- **Loading and failure**: the tile loads after home is built. Until it is ready
  the scene shows the vehicle on the navy fallback. If loading fails, that
  composition stays; the menu and destination caption are unaffected.
- **Visibility**: drawing stops while the tab is hidden, during a dive or pause,
  behind modals, and in the globe/site list view.

## Scene caption

Home's caption names the same destination as the primary button: "<site> · Next dive".
`Home.setDiveSite` updates both together when the catalogue loads or the last mission
changes. The caption is "Expedition preview" while no destination title is available.
The decorative backdrop remains the fixed Monterey crop; terrain loading never
changes the caption or claims that the backdrop depicts the launch destination.

## Fonts and licences

Home type is self-hosted (`src/styles/brand-fonts.css`, `font-display: swap`):
DM Sans 400/600 for interface text and Source Serif 4 600 for the wordmark, Latin
subsets from Fontsource 5.3.0. Both are under the SIL Open Font License 1.1; the
full notices are `public/fonts/DM-Sans-OFL.txt` and
`public/fonts/Source-Serif-4-OFL.txt`, credited in `ATTRIBUTION.md`. Fallbacks
are `system-ui, sans-serif` and `Georgia, serif`, so labels stay readable if a
font fails to load. Other languages would need further font subsets.
