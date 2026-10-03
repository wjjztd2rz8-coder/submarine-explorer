# Changelog

All notable changes to Submarine Explorer are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project has no
version numbers yet, so entries are grouped under **Unreleased** by phase and
package.

**Rule: every cut or redesign is logged here**, under **Removed** or
**Changed**, with a one-line reason. That covers dropped features, removed
content, replaced systems and changed defaults. A package that cuts something
without an entry here is not done.

## [Unreleased]

### Changed

- Phase F, F-COSMETICS: add eight hull paints and two lens trims earned from
  stars, hero-site ratings, secrets and Daily streaks, with saved touch-friendly
  workshop choices; appearance rewards preserve gameplay and Arcade depth access.
- Phase F, F-TITLE-B/C: added the (not yet wired) Bathyline title scene
  modules: `src/render/title/TitleTerrain.ts` crops a 2,400 m real GMRT
  Monterey Canyon square, and `TitleScene.ts` composes the research sub, lamps,
  fog and marine snow with tier budgets and reduced-motion support. They do not
  affect the app until the F-TITLE-E bridge lands.
- Phase F, F-BUGHUNT-8: touch disposal clears the active input flag, and
  interrupted gestures discard pending double taps so the camera cannot reset
  across focus, layout, desktop, pause or photo transitions. Global listener
  teardown and rebuilt controls now have regression coverage. Daily cards hide
  and clear their launch action when the selected mode has no accessible
  downloaded sites, then restore correctly when access returns.

- Phase F, F-CI-SPLIT: routine local gates schedule the existing browser smoke
  spec and project-base check alongside every static gate, avoiding repeated
  full browser sweeps during concurrent tasks. `--full-e2e` restores the full
  local suite; CI defaults to full discovery and retains all 16 shards. No
  existing tests, assertions, retries or per-test limits are removed or reduced.
- Phase F, F-TITLE-RESEARCH: added the provisional Bathyline title-scene spec,
  desktop/phone layouts, real-terrain backdrop and owned implementation packages,
  plus an unreferenced original SVG mark draft. Application names and behaviour
  remain unchanged; this is the research handoff for the title redesign.
- Phase F, F-BUGHUNT-10: best stars persist for every supported content ID,
  including uppercase letters, underscores and names matching object properties.
- Phase F, F-BUGHUNT-10: progress migration recovers missing or damaged best-star
  summaries from saved rating reward tokens without awarding duplicate RP.
- Phase F, F-BUGHUNT-10: legacy completed surveys count animal scans toward the
  three-star bonus at their own site, matching current-dive rating rules.
- Phase F, F-LOSTCITY-MIP-VERIFY: add a reproducible before/after terrain shader
  capture and luminance report for all five hero sites on High, Medium and Low;
  visual sign-off remains pending because this sandbox cannot run a browser.
- Phase F, F-LOSTCITY-4: the seabed albedo no longer aliases into a regular
  houndstooth/checker on distant and grazing slopes (most visible at Lost City).
  `terrain.frag.glsl` applies a distance-driven mip bias (0 within 3 m, +3 mips
  by 40 m) to the albedo fetches; no extra texture fetch, so the Low tier gets it
  too. Near-field detail is unchanged.
- Phase F, F-CI-CHECK: CI distributes e2e tests across 16 single-worker runners,
  runs static and project-base gates separately, and bounds jobs below 25 minutes.
  Browser installation and suites have explicit budgets; final test failures
  cancel remaining shard work. Every existing gate and assertion is retained.
- Phase F, F-TOUCH-AUDIT: phone sonar range buttons retain 44 px touch targets;
  expanded landscape sonar stays within the screen. Portrait mission telemetry
  and tutorial/scan panels keep clearer spacing, and enlarged landscape touch
  controls stay in their reserved column. The landscape home menu uses a full
  height scroll column for Daily and Advanced; Journal spoiler and inline-link
  targets are touch friendly. Scan prompts name SCAN and Pause → Journal on touch.
  Portrait touch omits numeric heading and secondary mission navigation/progress
  rows to keep the active objective and telemetry separate; sonar retains its
  heading marker and Pause retains the full objective list.
- Phase F, F-TOUCH-AUDIT: virtual stick, ballast, Scan and Boost release on focus
  loss, hidden tabs and resize/rotation. Multiple fingers holding Scan or Boost
  keep the action engaged until the last finger releases. Regression coverage
  checks real control listeners and phone layouts at 390×844 and 844×390.
- Phase F, F-BUGHUNT-6: Daily dive selection respects the saved Arcade,
  Realistic or Custom access policy at boot and refreshes immediately when the
  mode changes. Daily primary rewards share the dated debrief reward key,
  preventing a duplicate payout and leaving ordinary mission rewards available.
- Phase F, F-AUDIO-AUDIT follow-up: removed a copied absolute nested
  `node_modules` symlink that split Playwright's CLI and ESM test imports across
  two dependency trees. Full-suite and project-base test discovery now load one
  Playwright instance; all browser assertions remain unchanged.

- Phase F, F-AUDIO-AUDIT: audio now unlocks on the first paused touch, stays
  silent while paused or hidden, cancels stale sonar echoes and suppresses
  blocked cues. Complete cue and loop graphs disconnect on end or disposal;
  compression and a final output ceiling protect stacked effects. Regression
  coverage checks lifecycle races, repeated mode changes and input-only saved
  volume updates.
- Phase F, F-MOBILE-AUDIT: dynamic resolution respects fractional DPR ceilings
  and floors. Rotation releases held touch gestures and clears the portrait hint;
  compact HUD columns and portrait cards account for both safe-area side insets.
- Phase F, F-MOBILE-AUDIT: offline workers require a complete shell before
  replacing the previous installation, await cache writes and background index
  refreshes, tolerate quota failures and isolate versioned caches by deployment
  base. Mutable mission/landmark files refresh with deployment content; downloaded
  tiles retain their existing cache. Worker, shell and mutable asset edits change
  the cache version. Added regression tests for these paths and manifest base URLs.
- Phase F, F-BUGHUNT-7: active objective titles wrap in the HUD, including long
  species names in the narrow phone stack; OPTIONAL labels retain their space.
  Added all-site scan-to-Journal checks and browser copy/overflow coverage at
  390×844 and desktop, including 150% UI scale.

- Phase F, F-LOSTCITY-3: the Poseidon talus apron is no longer a flat oval. It has a ragged noise-driven outline, feathers flush into the seabed, fades into the sediment colour and carries scattered carbonate blocks (not on the low tier). Lost City also gets a little more ambient fill and a lifted distance haze (new opt-in vent params `hazeScale`, `hazeLift`) so the far ridge softens instead of cutting out black.

- Phase F, F-DAILY-TOUCH: Daily dive, mission selection and home transitions
  retain `?touch=1` alongside the graphics tier so game reboots keep the touch
  layout. Hardware detection, touch input and forced touch mode now save and
  restore the existing touch-seen flag; mouse and keyboard still switch the
  current session back to desktop controls.
- Phase F, F-BUGHUNT-5: gamepad camera, photo, sonar, lights and sim-speed
  toggles fire once per press. Discovery counters saturate at the safe integer
  limit so damaged saves cannot overflow into null on reload. Tile loading
  rejects invalid grid geometry, geographic bounds, depth extrema and nonfinite
  height samples before meshing; invalid optional quantised data still falls
  back to the canonical heightmap.
- Phase F, F-COPY-AUDIT: shortened all-site mission objectives, route hints,
  contextual tips and Journal prompts. Consolidated recreation explanations in
  the Journal front page and retained Recreation tags, reconstruction flags,
  source lists and factual measurements. Removed the duplicate scan-target hint
  because the scan panel already names the target and shows the scan control.
- Phase F, F-COPY-AUDIT: content validation rejects “illustrative” and
  “reconstructed” in objective titles and hints, regardless of case; provenance
  metadata remains allowed. Added regression checks and updated existing browser
  assertions for the revised copy and hint behavior.
- Phase F, F-COPY-AUDIT follow-up: the hint persistence browser test now uses
  Challenger Deep's naturally near-rated Class C dive. Titanic is well below its
  hull hint threshold. Added explicit hull/rating/safety preconditions and isolated
  unrelated hints while retaining all visibility, dismissal and persistence checks.

- Phase F, F-SAVE-SOAK: settings and key bindings recover intact legacy copies
  when current localStorage entries are empty, truncated or corrupt. Explicit v0
  settings and bare v0 discovery maps retain their saved choices and discoveries;
  malformed discovery records and non-finite scan counts are sanitized. Future
  binding schemas are protected from session edits and resets.
- Phase F, F-SAVE-SOAK: `__game.perf` now exposes scene object, geometry and texture
  counts. A headless ten-cycle dive/mode/restart/reload soak checks persistence,
  console errors and stable scene/resource counts, with ten additional restarts
  in each live scene. Unit coverage loads every supported historical save shape,
  exercises damaged storage recovery and verifies collection isolation and future
  schema preservation.

- Phase F, F-LOSTCITY-2: Lost City's seabed and slope now read outside the headlight pool
  (paler grey-carbonate sediment with low contrast, less orange staining, ambient fill 8
  to 12), and seven unnamed carbonate spires (24-52 m) stand behind Poseidon so the ridge
  reads as a field. Lost City only; other sites' light and terrain are unchanged.
- Phase F, F-TITANIC-2: Titanic's free dive now opens broadside to the bow with the
  chase camera pulled in to 70 m (new optional `chaseRadius` on composed openings), so
  the rails, portholes and plating read and the sub no longer hides the mid-hull; the
  bed is one uniform pale ooze (no pale blotches on the low tier), ambient fill and rust
  motes retuned. The Great Blue Hole gains a pale halocline haze at about 90 m inside the
  hole (reef preset keys `haloclineDepthM`, `haloclineLat`, `haloclineLon`, ...) and
  lighter hole walls; the low tier gets a single-layer haze so the interior is no longer
  a black pit. Nothing is darker than before.
- Phase F, F-BUGHUNT-3-FIXES: hull and mission access changes now take effect
  when the next dive loads, keeping mode edits safe during a briefing, deep
  dive or ROV deployment. Locked Realistic deep-site links start within the
  fitted hull's rating before optional props load. Daily Low light also keeps
  ROV lamps dim after settings edits and research purchases.

- Phase F, F-HERO-BLUEHOLE: the Great Blue Hole free dive now opens over the hole
  itself. The sinkhole (about 320 m across, 125 m deep, a ledge near 40 m) is carved
  into the terrain at its reported position because the survey grid cannot resolve it
  (tagged reconstruction in the grotto prop's Journal note). The seabed is pale
  sand rather than brown, deep surfaces darken to blue, light shafts reach deeper,
  the stalactite alcove sits on the ledge as a larger, lighter limestone overhang
  (no longer a dark curtain), and the blue tang and grunt schools are smaller and
  brighter.
- Phase F, F-HERO-MONTEREY: the Monterey Canyon free-dive opening now starts about
  12 m off a larger (140 m wide, 64 m high) bedded canyon wall, face-on, instead of
  100 m away in near-black water. A teal ambient fill (canyon preset `ambientFill`),
  a faint self-lit lift on the wall and rubble, lighter mudstone, a smaller talus
  apron, softer sediment, more sea pens, sponges and whip corals, fainter turbidity
  puffs and half the marine snow keep the wall and floor readable on every tier.

- Phase F, F-ARCADE-ACCESS: Arcade opens every site immediately and automatically
  fits its depth-rated hull and matching vehicle. Near-site Arcade missions use
  the existing authored hero approaches, so a fresh Titanic dive begins beside
  the wreck at seabed depth. Hull research requirements and locks now apply only
  to Realistic, keeping depth progression as an optional challenge. Custom mode
  also leaves site access open; upgrades, research rewards and stars are preserved.

### Removed

- Phase F, F2-MODES: retired Gentle from new current choices to keep Off,
  Realistic and Exaggerated clear. Existing Gentle saves still load and run.
  Merged the briefing's separate More options panel into the shared Advanced
  panel so home, briefing and Settings expose the same choices.

- Phase F, F-CONTENT-FIX: cut the enclosed Blue Hole shaft/chemocline promise and
  post-2022 Hunga ash/collapse staging from the current art brief because the
  shipped routes show outer atoll slopes and the earlier volcanic landscape.
  Removed the stale date-specific Axial eruption forecast and repeated game-wide
  claims that sample collection does not exist; wreck interaction remains an
  observation and photography survey.

### Added

- Phase F, F-ARCADE-ACCESS: a golden-shot tool captures the five hero sites at
  high quality in fresh profiles, with spawn, 40 m approach and 15 m detail
  views, a contact sheet and a pose manifest for visual review.

- Phase F, F2-MODES: a Daily dive card with a UTC-seeded unlocked site, a varied
  approach and survey goals, Calm water / Strong currents / Low light conditions,
  best stars today and a completion streak. Daily ratings use the existing
  progress save; streaks use `subexplorer.daily.v1`. Exaggerated currents amplify
  the existing ocean field for the sub and ROV. Mission briefings now also offer
  Free dive, opening the existing sandbox without mission objectives.

- Phase F, F3-ONBOARD: a short first-dive tutorial (move and turn, rise and sink,
  headlights, scan a target, photo or Journal). Each step advances when you do
  it, never pauses play, and Skip tutorial is always on screen. One-line hints
  appear once each for low battery, nearing the hull rating, a scannable target,
  a nearby creature and the ROV, at most one every 20 seconds, and can be
  dismissed. A Controls guide in Pause and a Device layout button in Settings
  show the layout for the keyboard, gamepad or touch you last used, with 44 px
  buttons. The bottom tip strip now follows the active device (hidden on touch,
  where the on-screen buttons are the tips).
- Phase F, F2-EXPLORE: three hidden discoveries and two sample spots at every
  site. Nearby sonar picks up faint unidentified contacts; holding Scan reveals
  a secret and its Journal entry, tagged once as a Game addition. Secrets never
  appear as mission objectives or waypoints.
- Local sample collection with the scan control, animated manipulators and a
  small sediment effect on every graphics tier. The collection resets each dive
  and appears alongside the per-site secrets count in both debrief variants.
- Rare, short vent surges, canyon silt puffs, marine-snow bursts and whales passing
  above shallow canyon water. Events have a quiet cooldown, a soft sensor cue and
  a brief caption. Watching one earns research; hidden discoveries and samples
  also award research once per subject.

- Phase F, F-VISUAL-FIXES: authored free-dive approaches for all thirteen sites,
  facing the wreck, reef, chimney field or landscape route. Challenger keeps
  its quiet floor and faces the small sampling marker. Openings check terrain,
  hull rating and prop clearance, including the chase camera.

- Phase F, F2-PROGRESS: research points from first discoveries, objective scans,
  species, photographs of new subjects, primary completion and best dive ratings.
  Existing discovery and photo saves receive credit automatically. Research stays
  separate from settings, and repeat scans do not generate more points.
- A Research workshop on Home and Pause: ten upgrades across lights, sonar,
  power and propulsion, with two or three levels, clear effects and 44 px buttons.
  Purchases apply immediately and carry into future dives and gameplay modes.
- Best dive ratings on mission cards and a stars-and-RP section in the debrief:
  primaries earn one star, every secondary earns two, and a subject photograph or
  species scan completes the third-star goal. Returning dives can improve a rating.
- Hull research unlocks: Class A starts at 1,000 m, Class B unlocks at 300 lifetime
  RP (6,500 m), and Class C at 900 RP (11,000 m). Spending RP keeps unlock progress.
  Four shallow missions are open from the start; deeper cards and globe pins show
  their requirements. Free dive remains open on every survey within your hull rating.

- Phase F, F3-AUDIO: a gentle adaptive ambient score across five depth bands,
  discovery swells and tension near the hull rating; separate saved Music,
  Sound effects and Master volume sliders plus Mute. Scan hum, ROV tether winch,
  camera shutter, depth-driven hull creaks, nearby spatial vent/wreck ambience,
  reef shrimp crackle and NOAA humpback calls add captioned sound to dives.
  Manipulator servos follow scan-arm deployment and retraction.
  Reduce motion softens score changes. No features were cut.

- Phase F, F2-LIFE: **marine life** (`src/world/life/`). Instanced, steering-driven
  animals in eight movement archetypes (schools, swarms, drifters, cruisers,
  hoverers, crawlers, sessile, jetters) with vertex animation, reactions to the sub
  and its lights, and bioluminescent flashes. About 30 procedural species follow
  `docs/research/species.md`, with per-site and per-depth spawn tables
  (`data/life/life.json`) and one rare encounter per site. Draw calls stay inside
  the tier budget (5 on low, up to 12 on high). Animals are scannable (a first scan
  adds a Journal wildlife entry and never touches objectives) and photo mode names
  the animal in frame. `preview/life.html` shows a species lineup. `?life=0` turns
  the layer off; `?lifeSeed=` fixes the spawns.
- Phase F, F1-TOUCH: **full touch play and a PWA install** (`src/ui/TouchControls.ts`,
  `src/core/Touch.ts`, `src/styles/touch.css`, `public/sw.js`). A left stick
  (thrust and turn), a right rise/sink slider, Scan (hold), Boost (hold), Lights,
  Sonar, Photo and Pause buttons, drag to look, pinch to zoom (the map while the
  sonar is expanded) and double-tap to reset the camera. They show while touch is
  the primary input and follow the last input used. Menus get 44 px targets on
  coarse pointers and mouse-only settings hide. A web manifest, icons and a
  service worker (network-first shell, cache-first tiles and assets, versioned per
  build, production and non-automated pages only) make it installable and
  playable offline for visited sites.
- Phase F, F1-OCEAN: **the water column, lit like a documentary** (`src/render/`,
  `src/shaders/underwater.ts`, `src/world/Water.ts`). The post stack now has a
  depth-aware composite: bloom (one quarter-resolution level on medium, plus an
  eighth-resolution level on high and ultra), light scattering that follows the
  view direction (brighter looking up, darker looking down, weighted by the fog
  fraction from a depth texture), god-ray shafts near the surface, chromatic
  fringing, warm sunlit highlights over blue-green shadows, a highlight shoulder
  so lamp pools keep detail, a readability floor that stops shadows going black,
  and a little dither. High and ultra render the scene with 4x MSAA. The sea
  surface follows the optics: Snell's window with a rippled bright rim and sun
  glint from below, total internal reflection outside it, a Fresnel and sun
  glint surface from above. Headlight beams are shaded by how squarely the eye
  looks through them, drift with dust streaks, and grow denser in dark,
  particle-laden water. Marine snow has a size spread, soft sprites and flares
  inside the lamps. Low tier keeps a plain low-segment beam, a light snow field,
  the Snell lid, and the band exposure, with no post pass.
- Phase F, F1-TERRAIN: **PBR triplanar seabed** (`TerrainMaterial.ts`,
  `shaders/terrain.*.glsl`, five CC0 sets in `public/assets/terrain/`). Per-site
  biome palettes (`TerrainBiome.ts`, from docs/research/sites.md) pick the soft,
  patch and hard-substrate sets; slope/cavity blending, near-field detail
  normals, current ripples, bioturbation and cavity darkening. Tier-scaled
  instanced scatter (`src/world/scatter/`: boulders, dropstones, pillow lava,
  coral rubble, sponges, sea pens, whips, mounds) streamed around the camera.
  Low tier: fewer texture layers, no near-field detail, reduced scatter range.
- Phase F, F1-GEO: **geology and biology set pieces** (`src/world/props/geo/`,
  new prop kind `procedural:geo` and props.json `feature`). A black-smoker mound
  (Axial ASHES; Beebe, with shrimp swarms) with tubeworm clumps, bacterial mats
  and animated smoke plumes; the Poseidon carbonate tower at Lost City (fluted
  spires, flanges, talus skirt); Lophelia coral mounds with instanced branching
  colonies and vase sponges (Blake Plateau, Hudson Canyon); a drowned karst
  alcove with fluted stalactites and sponges on the Lighthouse Reef drop-off; a
  pillow-lava heap with iron mats at Kamaehuakanaloa; and extruded scarps with
  strata, gullies and boulder aprons for the Hunga Tonga caldera wall, the
  Monterey Canyon wall and the Challenger Deep north wall. Existing chimneys gain
  a flowstone or cracked-rock detail texture. Every piece is procedural (canvas
  textures, no third-party assets), has compound colliders and scales with the
  quality tier (colony and plume counts, mesh density, texture size, bump map).
  Plumes animate entirely in the vertex shader. Dev preview: `/preview/geo.html`.
- Phase F, F1-WRECKS: **hand-built wrecks** (`src/world/props/wrecks/`). Titanic
  bow and stern, Bismarck and Endurance are now lofted hulls with decks, deck
  houses, funnels, turrets, masts, rigging, rusticle curtains, sessile growth and
  procedural plate/rust textures, replacing the plain hull block. Debris fields
  (boilers, Titanic field, Bismarck turrets and landslide, Endurance rigging) use
  instanced scatter kits. Detail scales with the quality tier (growth, railings,
  openings, texture size, normal maps, LOD distances). Each wreck has an
  `interior-entry` anchor for later interior work. Hulls use compound colliders so
  the sub can drop between deck houses. Dev preview: `/preview/wrecks.html`.
- Phase F, F1-VEHICLES: **procedural vehicle kit** (`src/vehicles/`). The hero
  sub is now a detailed deep-submergence vehicle in three distinct hull
  classes (A coastal, B deep ocean, C full ocean depth; chosen by the fitted
  hull): pressure-sphere viewport, syntactic-foam fairings, thrusters with
  animated props, strobes, manipulator arms, sled, decals and bubbles. The ROV
  is a detailed work-class vehicle with a sagging tether that straightens at the
  limit. First person looks out through a cockpit viewport frame that is
  never dark. Detail scales with the quality tier (the low tier builds a
  simplified LOD with no textures, wash or decals). `SubMesh` and `RovVisual`
  keep their public API.

- Phase F, F0-CORE: **quality tiers v2** (`src/core/Quality.ts`,
  `src/core/config/quality.ts`). There are now four tiers (`low`, `medium`,
  `high`, `ultra`) plus an `auto` setting. `auto` detects a tier from the GPU
  string, GPU limits, core count, device memory and mobile hints (mobile user
  agent, coarse pointer with no hover, screen size). `?tier=auto` forces
  detection.
- Phase F, F0-CORE: **dynamic resolution**. When the tier was auto-detected, the
  pixel ratio steps down while the smoothed frame time is over budget and steps
  back up when there is headroom. `?dynres=1` forces it on and `?dynres=0`
  turns it off.
- Phase F, F0-CORE: **`window.__game.perf`** reports draw calls and triangles
  (post pass included), smoothed frame time, the tier and how it was chosen,
  the pixel ratio and the resolution scale. `window.__game.quality` holds the
  tier decision.
- Phase F, F0-CORE: **asset service** (`src/core/assets/`). It has GLTF, Draco,
  Meshopt and KTX2 loaders, a glTF cache and a texture cache, and a typed
  `AssetManifest` with `preload()`. Props GLB loading now goes through it. The
  Basis KTX2 transcoder is vendored in `public/assets/decoders/basis/`. The
  build strips three's default decoder URLs so no second copy of the Draco or
  Basis files ships.
- Phase F, F0-CORE: **Auto** and **Ultra** entries in Settings → Graphics tier.

### Changed

- Phase F, F2-MODES follow-up: fixed a CSS cascade conflict that kept Advanced
  options visible when collapsed on home, briefing and Settings screens.

- Phase F, F2-MODES: Custom moves out of the three-way mode control into a
  collapsed Advanced disclosure. Arcade remains the default; Realistic is the
  other segment. Editing an advanced option shows a small Custom tag, and
  selecting either preset restores every option. Existing Custom saves keep
  their settings. New controls use 44 px touch targets and native keyboard input.
- Phase F, F-HUD-LAYOUT: the dive HUD no longer stacks on the submarine. The
  tutorial card (and hint chip) moved to the left column under the sonar; the
  scan-target panel moved from the bottom centre, where the chase camera keeps
  the sub, to the top centre; the controls hint bar stays bottom-left. On
  phone landscape the sonar is smaller, the card and scan panel share a
  top-centre column, objectives show only the current step, readouts drop the
  heading row, and the map credit moves into the strip between stick and
  buttons. The controls hint bar now hides once move, turn and rise/sink have
  each been used, and only shows for the first three dives; Help (Pause >
  Controls) still has everything. Portrait phones are unchanged (the game
  already asks players to rotate). Reason: owner playtest and director's brief
  priority 4. New `src/styles/hud-layout.css`; e2e `f-hud-layout.spec.ts`
  asserts no overlaps at 1600x900, 1280x720, 844x390 touch and 1024x768 touch.
- Phase F, F-GEO-SCARP: the wall hero pieces at Challenger Deep, Monterey Canyon,
  Hunga Tonga and the Great Blue Hole are rebuilt so they no longer read as
  extruded slabs. Each wall now curves in plan and tapers out under the seabed at
  its ends. Hunga is an arcuate, jointed wall of dipping tuff beds; Monterey has
  an S-bend with an undercut base and receding terraces, rubble on the outer bend
  and a clear sandy passage on the inner one; Challenger is a crescentic slump
  scarp with benches and large displaced blocks; the Blue Hole alcove has a
  curved wall, a scalloped shelf and clustered fluted stalactites. A graded
  rubble apron with a lobed rim, sunk into the seabed, replaces the hard toe, and
  every boulder is seated on that apron's final surface. Rock texture is now
  world-scale along the face, with bed-by-bed tones, instead of stretched
  vertical projection; boulders are angular, darker underneath and tinted to
  match the wall. The Blue Hole alcove keeps only a few sponges on the upper face
  and none on its floor. Prop ids, sizes and placements are unchanged.

- Phase F, F-CONTENT-FIX: Lost City now releases clear-flow shimmer, with smoke
  and warm glow disabled. Poseidon's composite footprint follows the published
  roughly 100 m width; field area and carbonate-age text now follow the research.
- Lighthouse Reef leads the Great Blue Hole dive's atoll route; Hunga consistently
  presents the historical landscape before January 2022. Its volcanic slope hero
  now shares the scan marker, and Inferno sits about 10 m from Mushroom at ASHES.
- Bismarck's briefing reports the current terrain route depth, while the Journal
  preserves the real wreck depth and explains the unresolved mapping gap. Its bow
  remains attached and its stern is described as missing. Beebe field naming and
  fluid pressure, Endurance tonnage, Challenger depth and monument boundary,
  white coral colour and wreck memorial text are corrected; deeper-route hints no longer call the twilight zone fully dark.

- F2-EXPLORE follow-up: Journal navigation keeps the page the player selects
  while content finishes loading. Sample confirmations now say “Stowed for this
  dive”; compact touch scan panels clear the movement and Scan controls.
  No features or objectives were cut.
- Phase F, F-VISUAL-FIXES: narrower, softer headlights and a weaker nearby fill
  preserve material colour and seabed gradients. Exposure and bloom are lower;
  marine snow is smaller. Realistic lights keep a faint local fill for the hull.
  Beam haze follows the length of lit water through the view, replacing the
  bright faceted shells so they no longer dominate a dive's opening.
- F-VISUAL-FIXES follow-up: restored the ROV's broad working-light pool after
  the close submarine lighting changes dimmed it. Submarine lamps now retain
  more light at navigation distance, helping opening heroes stand out while
  preserving the softer beams and close-range colour tuning.
- The underwater camera reserves 2 m below the surface and retracts its chase
  arm near shallow water or a reef, while retaining terrain clearance. Photo
  orbit from chase starts at the current camera position, including a retracted arm.
  No site models, terrain, controls or HUD features were cut.

- Phase F, F2-PROGRESS: hull selection now follows site depth and unlocked research,
  rather than giving every deep free dive an unrestricted hull. Shared links to a
  locked mission open a rated free dive with a dismissible requirement notice.
  The fitted class chooses the matching existing vehicle and briefing rating.
- Boost now uses an eight-second reserve that recharges while released; upgrades
  extend it by 20% per level. This replaces unlimited held boost so boost research
  has a useful effect in Arcade as well as improving battery endurance in Realistic.

- Phase F, F1-FIXES: **wave-1 audit fixes.** Wall colliders (scarps, canyon ledge,
  stalactite alcove) now follow the deformed mesh: overlapping x segments (no
  gaps), end heights capped to the pinched crest, real front and back extents;
  the far-LOD alcove impostor keeps the whole wall. Post-FX toggling no longer
  changes exposure; custom shaders (water, marine snow, beams, wash, plumes,
  smoke) finish with Three's tone-mapping and colour-space chunks so direct
  rendering matches the post path. The additive headlight beam no longer
  multiplies alpha twice (`headlightConeOpacity` 0.05 to 0.012 to keep the
  brightness). Lost City's main edifice is 60 m total relief (was about 70 m).
  Bismarck shows four overturned turrets (was two inverted, one on its side, one
  upright). ASHES hero stacks are about 4 m (was 9 m), matching the field.
  Beebe's hero is recorded as a flank fragment of the roughly 80 m by 50 m
  mound; the full mound is deferred (it would bury the neighbouring chimneys).
  Smoker culling bounds now include the smoke; Journal entries without a linked
  POI show the Recreation tag when the guide entry is flagged.

- Phase F, F1-TERRAIN: the old depth-ramp vertex-colour seabed and its
  height/slope colour ramp are replaced by the biome material (config
  `colorForDepth`/ramp inputs removed from the material); reason: PBR realism.
- F1-OCEAN: the **caustic projector** now uses a two-layer animated Voronoi web.
  The old interference formula was missing its domain offset and rendered an
  almost flat texture, so shallow caustics were effectively invisible. The
  footprint shrank from 900 m to 320 m (finer web) and the intensity rose from
  1.1 to 3.6. The headlight cone shader was also drawing nothing (its along-beam
  coordinate had the wrong sign); it is rebuilt.
- F1-OCEAN: tiers gained `bloomLevels`, `rayOctaves`, `msaa` and `beamDetail`;
  `low` now runs a plain beam cone and 600 marine-snow points (was none), and
  medium turns god rays on. The sea surface is drawn to 160 m (was 100 m) so the
  window fades out rather than popping, and it is a flat quad shaded per
  fragment (the 96-segment vertex swell aliased against a 22 m wavelength).
- Phase F, F1-GEO: `poseidon-tower` (Lost City) and `beebe-chimney-1` are now
  hand-built vent set pieces instead of plain chimney columns; they stay
  `procedural:chimney` with a `feature`, so the vent preset still smokes them. Blake
  Plateau keeps its two boulder stand-ins beside the new coral mound. The Hudson
  Canyon `props.json` note that no coral model exists was removed (one now does).

- F1-VEHICLES: the ROV fill light moved from 3.6 m to about 9 m from the float (intensity x3) and vehicle materials gained a highlight shoulder, because pale livery inside the boat's own headlight beams clipped to flat white. The old single-mesh hull and ROV models are replaced, not kept as an option.
- Phase F, F0-CORE: **`main.ts` split into systems** (`src/app/`). There is one
  file per system under `src/app/systems/`, each with init, per-frame stage
  hooks and dispose. The ordered registration list lives in
  `src/app/systems.ts`, the frame loop in `src/app/loop.ts` and boot in
  `src/app/boot.ts`. Behaviour, frame order, listener order and the
  `window.__game` contract are unchanged (new keys only).
- Phase F, F0-CORE: **`styles.css` split** into per-module files under
  `src/styles/`, imported by `src/styles.css` in the original cascade order. No
  selector changed.
- Phase F, F0-CORE: **`Config.ts` split**. Per-domain types and defaults now
  live in `src/core/config/*.ts`, and the `GameConfig` contract lives in
  `src/core/config/types.ts`. `src/core/Config.ts` stays the import path and
  still exports `makeConfig`. Default values are unchanged.
- Phase F, F0-CORE: **procedural prop builders split** into
  `src/world/props/builders/` (`wrecks`, `debris`, `vents`, `reefs`, `geology`,
  `generic`, `shared`), with a kind → builder registry.
  `src/world/props/Procedural.ts` re-exports them for compatibility.
- Phase F, F0-CORE: saved settings accept `auto` and `ultra` for the graphics
  tier. Existing `low`, `medium` and `high` saves are kept as they are. The
  default stays `medium`, so a fresh install looks the same as before.
