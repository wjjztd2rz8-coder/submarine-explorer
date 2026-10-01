# F-VISUAL-QA — round 2, all-site visual review

Reviewed 2026-10-01 against [Phase F](../PHASE-F-PLAN.md), [the site field guide](../../docs/research/sites.md), placed-prop/mission data, rendering code, and linked expedition/research sources. **All 39 individual PNGs were opened and visually inspected.** No visual implementation changes or asset imports accompany this report.

The largest obstacle to cinematic realism is shared rendering: broad, visibly faceted headlight volumes dominate the opening views, while illuminated heroes and ground lose their material colours at close range. The wrecks have useful silhouettes and details underneath that washout. Several geological heroes need substantial shape and contact work after the lighting is corrected. Three content decisions remain: actual Blue Hole versus surrounding atoll, Bismarck's bathymetric depth discrepancy, and Hunga's historical era.

## Evidence and limits

- Each site has a 1280 × 720 untouched free-dive spawn (`1`), a hero approach (`2`), and a hero detail (`3`). Links below refer to the exact inspected files.
- The gate log, `.cache/gates/e2e.log`, reports **medium** tier with `tierSource: setting` for all 13 sites, and zero failed/skipped props. These are the fresh-context default captures, not ultra-tier beauty shots or mobile validation.
- `?tile=<id>&skipBriefing=1` selects free dive, not the authored mission spawn. `src/game/Spawn.ts:chooseSpawn` uses the tile centre or a nearby sufficiently deep cell; `src/core/config/mission.ts:freeDiveSpawnAltitudeM` is 90 m. Existing mission approach logic does not repair these opening views.
- Approach distances are 40/15 m horizontal clearance outside the prop's local bounding box, with the sub about 15 m above sampled terrain. They are **not** distance to the prop centre or camera-to-surface distance. The cockpit offset in `src/core/config/camera.ts:firstPersonOffset` is `{ x: 0, y: 4, z: -12 }`; pitch and terrain alter the actual eye clearance. Large props and bounding boxes that include effects can produce severe crops. Lost City is the clearest example. Do not infer that an unseen stern, tower crown, barbette, or gallery is absent from its model.
- Static images show contact seams and jagged edges; they cannot establish temporal z-fighting, LOD popping, particle motion, or swimming behaviour. None is verified here. No obvious tile-edge seam is established in these views; the visible seams discussed below are predominantly prop-to-ground contacts or texture projection. Every site's LOD still needs a moving approach on low/medium/high tiers.
- HUD depths below describe the captured sub, not a surveyed set-piece datum. Modelling dimensions and tuning values explicitly proposed here are design targets, not measurements. Reference photography is used for factual comparison only; no external texture/model/image is proposed for import, so this report introduces no asset licence claims.

Priority: **P0** = factual/scope or camera correctness; **P1** = major readability/shape failure; **P2** = material/detail polish. Shared fixes below are dependencies of the per-site lists; implement them once, then reassess each hero.

## Shared implementation briefs

### L1 — recover colours and close-range detail (P1, all sites)

Confirmed settings: `src/core/config/gameplay.ts:DEFAULT_LIGHT_PRESETS.enhanced` uses intensity **1800**, distance **2500**, angle **52°**, cone opacity **0.075**, fill intensity **160**, fill distance **350**. `src/app/systems/atmosphere.ts` calls `headlights.setPreset`, overriding the lower cone-opacity water default. Editing only `src/core/config/atmosphere.ts` will therefore miss the default gameplay preset. `src/app/boot.ts` also sets ACES filmic exposure to **1.25**.

Start an A/B calibration with enhanced intensity **600–900**, fill intensity **40–80**, angle **32–38°**; these are unvalidated starting ranges. Implement distance-sensitive illumination if one intensity cannot preserve both the close wall and distant navigation. Leave depth-band fog and ambient settings stable for the initial comparison. Then assess exposure 1.25 versus 1.0 and the post bloom strength in `src/app/systems/render.ts` (currently 0.22), rather than simultaneously darkening every material. Wreck and geology palettes already contain dark colours; washed-out output does not prove their base colours are white.

Acceptance: the same default preset separates rusty steel, brown timber, dark volcanic rock and ivory carbonate at 15/40 m; plank joints and coral branches remain visible; the seabed retains gradients rather than a broad white patch. The chase sub remains readable. Check shallow and deep scenes before accepting a global adjustment.

### L2 — make beams atmospheric instead of solid fans (P1, all spawn views)

`src/render/Headlights.ts` creates two additive, double-sided cone shells, capped at **420 m** length. Medium beam detail uses **22 radial segments**; the shell has one longitudinal segment. Shader opacity includes `uOpacity * 2.6`, with normal-dependent shaping. The observed diagonal wedges and hard rims are consistent with this geometry/shading; screenshots alone do not isolate each contribution.

Start enhanced `coneOpacity` at **0.008–0.015** in `src/core/config/gameplay.ts`, then soften angular edges and fade integration with distance inside `src/render/Headlights.ts`. Rework the view/path-length approximation so coarse cone normals cannot form alternating bright panels. Increasing polygons alone is insufficient. Evaluate cockpit suppression/reduction as well as chase views. Keep marine snow small and soft against this lower beam brightness; the large white discs in several approaches currently compete with the subject.

Acceptance: no visible polygon wedges or straight opaque beam boundaries, and a hero silhouette remains discernible through the lit water at approach range. Do not compensate by making the entire abyss equally bright.

### S1 — compose each free-dive opening (P1, all sites)

Change the free-dive selection path in `src/app/boot.ts` and `src/game/Spawn.ts`, using loaded primary POIs or explicit authored hero approaches. Set position **and yaw**, with terrain/prop collision checks and the existing safe-hull rules. Consider per-site free-dive pose metadata in `data/landmarks/<id>/mission.json` or its guide, without silently reusing a surface mission start. A blanket reduction of `freeDiveSpawnAltitudeM: 90` cannot orient the camera or handle a long wreck, tall tower, scarp and tiny vent equally well.

Acceptance: the untouched `-1` image reveals either the site's hero or an unmistakable route into its landscape, with the sub visible and no immediate camera/terrain collision. Preserve Challenger's deliberately quiet floor; a meaningful lander/scan cue can provide orientation there.

### C1 — keep an underwater chase camera underwater (P0, Blue Hole and Hunga)

`src/core/config/camera.ts:chaseOffset.y` is **38 m**. `src/sub/CameraRig.ts` clamps against terrain but lacks a water-surface ceiling. At the Blue Hole's 23 m sub depth and Hunga's 24 m depth, the unpitched chase eye can be approximately 15/14 m **above** sea level. Both spawn screenshots show a surface horizon instead of an underwater reveal.

Add depth-aware chase-arm retraction and an underwater surface clearance, initially **2 m**, in `CameraRig`/camera config. Resolve the surface ceiling together with terrain clearance; simply clamping Y can collide with shallow reef terrain. Test continuous ascent, shallow turns, switching cameras and returning from photo mode. Acceptance: no above-water eye while the sub is submerged, no jump or reef penetration, and the overhead surface is readable from below.

## 1. RMS Titanic — `titanic`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/titanic-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/titanic-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/titanic-3.png). Hero: `bow-hull`. HUD depths: 3,713 / 3,789 / 3,788 m.

**Factual accuracy.** The separate upright bow concept and quiet sediment setting agree with the guide and WHOI's mapped distinction between the better-preserved bow and fragmented stern. The approach shows railings, hull openings and deck levels, but not the complete wreck field; stern geometry and section spacing are unassessed. Irregular corrosion is an essential reference cue, whereas these lit surfaces read relatively clean and uniform. [WHOI mapping account](https://www.whoi.edu/oceanus/feature/the-quest-to-map-titanic/), [WHOI first-dive footage](https://www.whoi.edu/press-room/news-release/woods-hole-oceanographic-institution-releases-rare-video-footage-from-the-first-submersible-dives-to-rms-titanic/).

**Readability.** `1`: a small brown wreck fragment at the extreme right is easy to miss; beam wedges are the main subject. `2`: the long side profile is recognizable, but pale pink/cream illumination overwhelms rusty steel. `3`: a hull wall and seabed fill the viewport; joints and corrosion lose contrast. The chase sub is visible but too small to establish its detailed design.

**Visual quality.** Rusticles visible in `2` look thin, regularly triangular and evenly spaced. Near-field terrain has a conspicuous fine repeated ripple/grid appearance. Contact is not clear enough to assert floating or burial errors. The close crop is not evidence that the prow or anchor detail is missing.

**Prioritised fixes.**

1. **P1:** L1/L2 and S1; author a three-quarter bow reveal rather than an incidental side-edge glimpse. Use `data/landmarks/titanic/props.json:bow-hull` bounds and heading when choosing the opening pose.
2. **P2:** `src/world/props/wrecks/instances.ts` rusticle geometry and `src/world/props/wrecks/ship.ts` placement: vary clump width, length, branching and missing patches; add irregular layered curtains at rails/openings. Calibrate `materials.ts:paintWreck` rust/growth coverage after L1, keeping structural edges legible.
3. **P2:** `src/world/TerrainBiome.ts` Titanic/abyssal ripple settings and `src/core/config/terrain.ts` detail fade: reduce fine-ripple repetition at oblique distances. Verify the separate stern with an additional view before changing its shape or spacing.

## 2. Challenger Deep — `challenger-deep`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/challenger-deep-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/challenger-deep-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/challenger-deep-3.png). Hero: `north-wall-scarp`. HUD depths: 10,828 / 9,964 / 9,961 m.

**Factual accuracy.** A quiet sediment floor is consistent with the guide's sediment-core references. The named hero is an invented northern scarp, not the deepest-floor lander site: its roughly 9,960 m capture depth is not by itself a false Challenger floor measurement. The Leggo deployment at 10,929 m is documented independently, but these approaches do not inspect it. Keep both concepts distinct. [Challenger sediment study](https://www.sciencedirect.com/science/article/abs/pii/S0967063709002192), [Schmidt/Scripps expedition and Leggo position](https://schmidtocean.org/cruise/expanding-mariana-trench-perspectives/).

**Readability.** `1`: no distinctive floor feature or navigational destination; a small readable Class C sub sits in a sea of grey beam panels. `2`: a very pale wall is recognizable, but its relief is largely flattened. `3`: nearly the entire scene is a bright wall; a small foot fragment remains at the lower right.

**Visual quality.** The scarp resembles an extruded slab, with large blank panels and stretched vertical/chevron markings. Rounded boulders appear attached high on the face/lip rather than accumulated as convincing basal talus. The straight contact against the underlying slope exposes the prop's construction. Unsupported placement is suspected, not established from one angle.

**Prioritised fixes.**

1. **P1:** L1/L2; S1 should reveal the abyssal floor/lander context before offering the separate wall excursion. Keep emptiness as scale, with a readable destination cue.
2. **P1:** `src/world/props/geo/scarp.ts:PRESETS.hadal`, `extrudeProfile`, `wallLift`: break the rectangular outline, use slumped sediment benches and a graded apron, and place talus using the final surface height/normal. Each exposed rock must visibly meet a supporting surface.
3. **P2:** `scarp.ts`/`src/world/props/geo/shared.ts:projectUVs`: replace stretched face projection with world-scale/triplanar mapping. Update `data/landmarks/challenger-deep/props.json:north-wall-scarp` dimensions only as an explicitly invented scenic feature, not a claimed surveyed floor landmark.

## 3. Lost City — `lost-city`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/lost-city-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/lost-city-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/lost-city-3.png). Hero: `poseidon-tower`. HUD depths: 1,199 / 803 / 796 m.

**Factual accuracy.** Cream carbonate columns are appropriate, and the guide's roughly 60 m tower scale has expedition support. Their host massif includes serpentinite/gabbro; the view lacks a convincing dark host-rock contrast. **Lost City discharge should be clear warm fluid, not an opaque white or black smoker.** NOAA explicitly describes clear fluid forming no particles. Correct the guide's permissive “clear or milky”/“warm-white seep wisps” language before it becomes a smoke requirement. [NOAA scientists' field account](https://osrefresh.oceanexplorer.noaa.gov/explorations/05lostcity/logs/july21/july21.html), [NOAA fluid comparison, p. 2](https://oceanexplorer.noaa.gov/okeanos/explorations/ex1104/background/edu/media/ex1104_tracking.pdf).

**Readability.** `1`: spawn is well below the photographed tower base, with only faint distant vertical wisps/marks above a slope. `2`: some columns appear clipped at the upper left; a foreground slope/talus skirt takes most of the frame. `3`: bright slope/skirt dominates and the tower crown is outside the image. Neither approach validates the complete Poseidon silhouette.

**Visual quality.** The visible flanges look like stacked annular plates. A broad smooth skirt blends poorly into the steep bank and hides the delicate columns. No dense black smoke is visibly established in this set; the fluid problem is also a **confirmed configuration risk**: `VentPreset.ts` still builds smoke for carbonate fluid, while this mission only overrides `fluid: carbonate`.

**Prioritised fixes.**

1. **P0:** `data/landmarks/lost-city/mission.json:environment` / `src/world/presets/VentPreset.ts`: set carbonate `smokeIntensity: 0`, `glowLights: 0`; keep only restrained clear-flow shimmer/refraction. `src/core/config/presets.ts` currently defaults `smokeOpacityCarbonate: 0.16`, `glowLights: 2`, `shimmerStrength: 0.08`; trial shimmer 0.02–0.04. Consolidate ownership with `src/world/props/geo/towers.ts` so a second effect cannot restore smoke. Update the field guide to match the cited chemistry.
2. **P1:** S1 plus a supplementary full-height side view. In `towers.ts`, reduce the broad skirt (`skirtH = 0.16 * H`) and shelf radius multiplier (`2 + random * 1.3`); use scalloped lips and the guide's **build** 1–3 m flange overhang, retaining the sourced tower-height concept. Do not shrink height to solve a camera crop.
3. **P2:** `src/world/TerrainBiome.ts` Lost City palette and `towers.ts` vertex paint: introduce dark host-rock banks, porous ivory carbonate and localized tan staining. L1 must preserve this separation without making carbonate grey.

## 4. Monterey Canyon — `monterey-canyon`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/monterey-canyon-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/monterey-canyon-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/monterey-canyon-3.png). Hero: `canyon-wall-ledge`. HUD depths: 535 / 739 / 733 m.

**Factual accuracy.** A sedimentary canyon wall and sandy/muddy bed are reasonable. The hero is a game addition, not a surveyed canyon-head reconstruction. The missing visual cue is a channel/thalweg between banks: MBARI describes sediment transport within the canyon, while these captures primarily show one isolated wall. No captured organism supports species-level validation. [MBARI canyon overview](https://www.mbari.org/know-your-ocean/monterey-canyon/).

**Readability.** `1`: generic illuminated slope with no canyon reveal. `2`: the large pale face and a few ledges are visible but its layering is weak. `3`: a white wall fills the scene, with one smooth high boulder and nearly black foot rocks; little context survives.

**Visual quality.** Long blank extruded panels, vertically stretched texture and a sharp oblique prop/terrain seam. Rounded rocks appear scattered on/embedded into the face instead of forming an intelligible slump deposit. Strong dark contours around intersections may be geometry/aliasing; temporal z-fighting is unproven.

**Prioritised fixes.**

1. **P1:** L1/L2/S1. Compose the opening down a bounded channel, rather than toward a uniform hillside.
2. **P1:** `src/world/props/geo/scarp.ts:PRESETS.canyon` profile/bands/ledge/boulders and `data/landmarks/monterey-canyon/props.json:canyon-wall-ledge`: form an undercut bend, graded talus apron and lower sandy passage. Sample final supporting geometry for rocks and hide the rectangular toe beneath a feathered sediment transition.
3. **P2:** `scarp.ts` UV projection and `src/world/props/geo/textures.ts:CONTRAST.strata`: orient layers across the bank, not as vertical stretch. Balance rock and wall materials after L1 so intersections do not read as black outlines pasted onto white plaster.

## 5. Endurance — `endurance`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/endurance-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/endurance-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/endurance-3.png). Hero: `main-hull`. HUD depths: 2,914 / 2,986 / 2,986 m.

**Factual accuracy.** The upright timber hull, short spars and quiet plain broadly match the guide. The expedition reports discovery at 3,008 m, an intact upright wreck standing above the seabed, and readable stern lettering. Captured sub depths near 2,986 m are not a measured keel-depth contradiction. The side views do not establish whether the name/emblem/helm match; obtain a stern reference view. Preserve the intact condition rather than adding Titanic-style structural ruin. [Endurance22 discovery account and reference photographs](https://endurance22.org/endurance-is-found).

**Readability.** `1`: no wreck reveal. `2`: one of the strongest complete silhouettes in this set, including the bowsprit and rail contour, but timber is nearly white. `3`: pale planking and seabed dominate; fittings lose shape and colour.

**Visual quality.** Plank markings are repetitive; visible wood reads smooth/plastic rather than weathered timber. Encrustation contributes little visible breakup. No clear floating/ground-contact defect is proved. The empty surrounding sediment is appropriate to the chosen scene and need not be filled with unrelated structures.

**Prioritised fixes.**

1. **P1:** L1/L2/S1, retaining the broadside/three-quarter silhouette that already works in `2`.
2. **P2:** `src/world/props/wrecks/materials.ts:woodMaterial`/`paintWreck`, `src/world/props/wrecks/textures.ts:woodMaps`, and `endurance.ts`: recover honey-brown/dark timber, irregular grain and localized pale growth. Medium tier has `normalMap: false` in `wrecks/detail.ts`; assess a low-cost wood bump/normal path rather than requiring high tier to read as wood.
3. **P2:** `endurance.ts` stern identification and fittings: verify lettering/emblem against the linked expedition imagery with a dedicated aft view before proposing geometry changes. Keep the preserved rails/masts proportionate and visibly separate from the hull.

## 6. Axial Seamount / ASHES — `axial-seamount-ashes`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/axial-seamount-ashes-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/axial-seamount-ashes-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/axial-seamount-ashes-3.png). Hero: `mushroom-chimney`. HUD depths: 1,446 / 1,526 / 1,526 m.

**Factual accuracy.** OOI describes a shallow depression, fractured lobate/sheet basalt and small friable sulfide chimneys with numerous spigots and local tubeworm cover. These are stronger shape references than the smooth frustums shown. **Do not declare Mushroom's dark discharge inherently wrong:** OOI documents clear flow and active black-smoker chimlets there. The guide's Mushroom-clear/Inferno-dark split is a useful staging choice, not an exclusive factual rule. [OOI ASHES field description and dated images](https://interactiveoceans.washington.edu/research-sites/axial-caldera/ashes/).

**Readability.** `1`: no field reveal. `2`: central chimney and brown/dark plume are identifiable, with a thin apparent gap near the outlet. Worm-like rods are more evident in another cluster at the right than around the named hero. `3`: the near chimney is a pale smooth cone; ground and flank details wash out and the plume is mostly above frame.

**Visual quality.** Repeated generic cones, weak spigots and little friable structure. The bed's high-contrast speckling reads like crushed aggregate rather than lobate lava. Distant orange streaks look luminous, but the frames do not establish whether emissive material or lighting causes them.

**Prioritised fixes.**

1. **P1:** L1/L2/S1; retain dark sulfide against charcoal basalt, with pale mats as small local accents.
2. **P1:** `src/world/props/builders/vents.ts:buildPlacedChimney` and `data/landmarks/axial-seamount-ashes/props.json`: replace the named Mushroom/Inferno cones with rough narrow stacks, irregular small spigots and visible worm collars. Introduce per-outlet plume character in `src/world/presets/VentPreset.ts`; root particles at the actual outlet and avoid duplicate plume emitters.
3. **P2:** `src/world/TerrainBiome.ts:VOLCANIC` / basalt texture contrast (currently 1.3): trial 0.7–0.9 plus larger-scale lobate breakup. Reconcile the guide's approximately 10 m Mushroom/Inferno separation with placement metadata before claiming survey-accurate spacing. Correct the guide's absolute fluid interpretation.

## 7. Hudson Canyon — `hudson-canyon`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/hudson-canyon-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/hudson-canyon-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/hudson-canyon-3.png). Hero: `coral-ledge-mound`. HUD depths: 46 / 942 / 937 m.

**Factual accuracy.** NOAA documents varied sediments, steep slopes, firm outcrops and deep coral habitat. The guide calls for a localized coral garden on a canyon ledge, not a province of identical white mound crowns. This hero is invented; the screenshots cannot establish species identity or exact natural colony positions. Use depth-matched local records before assigning names to new coral forms. [NOAA Hudson Canyon overview and coral imagery](https://sanctuaries.noaa.gov/hudson-canyon/), [local depth-filtered records](../../data/landmarks/hudson-canyon/species.json).

**Readability.** `1`: bright blue open water over an undistinguished tan bed; no canyon cue. `2`: an isolated oval mound reads, but not a ledge or channel junction. White branch tips are blown out. `3`: smooth pale mound flank and ground occupy the image; one branch is cropped at the top.

**Visual quality.** Widely spaced copies of a few tree-like colonies look planted rather than forming a garden. The smoothly rounded base looks like the Blake hero with different placement. No clear floating colony is established; the short view hides individual bases. Large bright marine-snow discs distract from small branches.

**Prioritised fixes.**

1. **P1:** L1/L2/S1; a canyon-wall/ledge silhouette must be visible at the opening or initial descent.
2. **P1:** `data/landmarks/hudson-canyon/props.json:coral-ledge-mound` and `src/world/props/geo/coral.ts:buildCoralMound`: add a Hudson-specific ledge/garden variant rather than reusing the rounded Blake mound. Couple it to adjacent wall relief and a darker sandy channel.
3. **P2:** `coral.ts` colony templates, `IVORY`/`PEACH` tint and spatial clustering: provide varied, localized garden forms/colour consistent with the site's documented records. Do not simply raise the shared colony total and cover the entire lower canyon. Match each colony base to its supporting ledge.

## 8. Kamaʻehuakanaloa — `kamaehuakanaloa`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/kamaehuakanaloa-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/kamaehuakanaloa-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/kamaehuakanaloa-3.png). Hero: `hiolo-north-chimney-1`. HUD depths: 1,028 / 1,304 / 1,295 m.

**Factual accuracy.** The warm ochre/iron-mat accents and pillow-lava concept fit the guide and documented iron-rich vent deposits. Deeper Hiolo placement should not be assessed against summit depth alone. No dense black-smoker column is evident; preserve that restrained vent character. The manufactured appearance of the pillows is an execution problem, not evidence against basalt/iron-mat habitat. [Iron-mat mineralogy study](https://pmc.ncbi.nlm.nih.gov/articles/PMC3316996/), [Hiolo sampling evidence](https://pmc.ncbi.nlm.nih.gov/articles/PMC4817698/), [Nautilus Pele's Pit footage](https://nautiluslive.org/video/2018/08/31/surveying-peles-pit-crater-loihi-seamount).

**Readability.** `1`: blotchy dark/ochre slope, with no vent destination. `2`: pillows are visible along a long raised strip on the steep hillside; they shine silver-grey. `3`: foreground pillows and a cone bleach nearly white, hiding dark lava/mat contrast.

**Visual quality.** Repeated chevron/hexagonal surface markings look embossed or printed; rounded stones are too uniform and shiny. The raised foundation has an engineered ribbon/terrace edge. The near cone shares Axial's plain frustum language. Possible contact discontinuities need a side view; floating is not proved.

**Prioritised fixes.**

1. **P1:** L1/L2/S1. Keep the dark-rock/ochre-mat palette and compose a descent along the pit wall.
2. **P1:** `src/world/props/geo/pillow.ts:buildPillowField`: feather the `shape`/`env` boundary into terrain, revise `slopeGain` (currently capped at 2.2) and elliptical footprint to avoid a long raised ribbon. Make pillows interlock asymmetrically rather than sitting on a smooth fabricated platform.
3. **P2:** `pillow.ts` material (`roughness: 0.55`, `bumpScale: 1.6`) and `geo/textures.ts:CONTRAST.pillow`/cell pattern: trial roughness 0.85–0.95 and bump 0.3–0.6, remove regular cellular embossing and map cracks at a stable world scale. Mats should drape into crevices, not form hovering circular decals; verify their surface support after revising the heap.

## 9. Beebe / Piccard — `beebe-vent-field`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/beebe-vent-field-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/beebe-vent-field-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/beebe-vent-field-3.png). Hero: `beebe-chimney-1`. HUD depths: 4,901 / 4,965 / 4,968 m.

**Factual accuracy.** Dark particulate plumes, sulfide deposits and localized pale vent fauna/mats fit Beebe; this should not resemble the contrasting Von Damm field. The discovery paper describes an approximately 80 m-across, 50 m-high sulfide mound. Current `props.json` honestly calls this model a flank fragment, not that complete mound. Its small foundation is therefore a research-guide scope gap, not a fabricated claim of full-scale reproduction. Shrimp presence is supported, but glitter-like specks cannot visually validate a named species. [Discovery paper](https://www.nature.com/articles/ncomms1636), [Beebe shrimp study](https://pmc.ncbi.nlm.nih.gov/articles/PMC3612092/).

**Readability.** `1`: dark structures are faintly visible low ahead, but beams dominate; the HUD directs a 51° starboard turn. `2`: plumes make this hero more legible than most vents, though plume mass outweighs the small pale towers. `3`: chimney tiers read, but cream mats and bright ground reduce contrast; fauna are minute highlights.

**Visual quality.** Smooth stacked chimney forms on an oval pedestal, with a hard dark contact rim. Bacterial mats are conspicuously circular discs. Particle origin/overlap needs motion inspection; no cone-shaped fluid plume is confirmed here. The miniature foundation gives little sense of the larger field.

**Prioritised fixes.**

1. **P1:** L1/L2/S1; retain Beebe's useful black-plume silhouette while recovering dark sulfide body colour.
2. **P1:** `src/world/props/geo/smokers.ts:moundH` currently clamps to at most **5 m**, while `dims[2]` controls tallest chimney height. If building the full reference mound, add independent mound dimensions/terrain foundation in `smokers.ts` and `data/landmarks/beebe-vent-field/props.json`. Do **not** set chimney height to 50 m as a substitute. Otherwise retain the honest flank-fragment scope and place it against larger dark broken relief.
3. **P2:** `smokers.ts` shrimp geometry/mat instancing and `geo/plume.ts`: use irregular conforming mat patches and recognizable short-bodied shrimp clusters at readable camera range, with physical size checked against the field guide's sourced study. Keep particles attached to irregular vent mouths and select one owner for any shared macro plume.

## 10. Great Blue Hole — `great-blue-hole`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/great-blue-hole-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/great-blue-hole-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/great-blue-hole-3.png). Hero: `karst-grotto`. HUD depths: 23 / 56 / 54 m.

**Factual accuracy.** The actual site is a roughly 320 m-wide, 125 m-deep cylindrical sinkhole with near-vertical walls, within a shallow atoll lagoon. The photographed hero is a freestanding game-addition grotto on the western atoll slope. Current mission text/POIs explicitly survey outer drop-offs kilometres away; they do not claim this prop is the hole interior. Nevertheless, the Phase F field guide promises an enclosed shaft/gallery that these images do not deliver. A small limestone overhang cannot stand in for that whole landscape. [Primary seismic/sediment study, setting section](https://limnogeology.ethz.ch/GischlerMarine.pdf), [local mission](../../data/landmarks/great-blue-hole/mission.json), [local POI scope](../../data/landmarks/great-blue-hole/pois.json).

**Readability.** `1`: bright blue frame, pale surface horizon/wave bands and a hazy sub; C1's above-water chase eye is the main correctness issue. `2`: a large limestone block with a horizontal shelf is readable, but there is no enclosing shaft. `3`: white back wall and seabed fill the viewport; the gallery is mostly outside the frame.

**Visual quality.** Squared overhang, broad blank rear face, stretched vertical markings and a dark polygonal cap/rim. Pendant teeth appear small relative to the huge shelf, with limited fluting. The prop looks freestanding; no evidence establishes a genuine cave volume or an interior water-layer transition.

**Prioritised fixes.**

1. **P0:** Orchestrator scope decision: build a sourced-size local sinkhole terrain overlay/reconstruction at the actual hole, or retain an explicitly atoll-focused experience and align the guide/site presentation. If building the hole, update `data/landmarks/great-blue-hole/{guide,mission,pois,props}.json` together; preserve surveyed outer slopes. Do not relabel the western grotto as the measured interior.
2. **P0/P1:** C1, L1/L2 and S1. The spawn should reveal the submerged rim/wall or honestly selected atoll slope, never an above-water chase horizon.
3. **P1:** `src/world/props/geo/stalactites.ts` profile/underside/pendant `len`/`r`, plus `geo/scarp.ts` extrusion and UV helpers: curve the enclosing wall, break the squared shelf, build fluted pendants from a supported ceiling, and blend their bases. For an actual shaft, stage the lower water layer only against the primary study's documented low-oxygen/anoxic stratification; no decorative reef population on that lower floor. [Primary stratification observations](https://limnogeology.ethz.ch/GischlerMarine.pdf).

## 11. Bismarck — `bismarck`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/bismarck-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/bismarck-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/bismarck-3.png). Hero: `main-hull`. HUD depths: 4,128 / 4,215 / 4,213 m.

**Factual accuracy.** Upright hull, missing main turrets/empty barbettes and a lost stern portion are compatible with the guide. The wreck account reports about **4,790 m** depth and burial to around the designed waterline; much hull/deck material survives. The local POI note already records terrain at **4,218.5 m**, approximately **570 m too shallow**, at the adopted expedition vicinity. These captures confirm the in-game discrepancy, not a new discovery. Close end-on views cannot assess all turret rings or identify the prow's geometry. [Wreck condition/depth account](https://www.kbismarck.com/wreck.html), [2001 expedition record](https://www.hmshood.org.uk/hoodtoday/2001expedition/bismarck/bismarck2.htm), [documented local discrepancy](../../data/landmarks/bismarck/pois.json).

**Readability.** `1`: blank slope and beams; destination is behind the opening heading (156° port instruction). `2`: a long flat deck and box-like superstructure read, but the near end resembles a rectangular barge/transom and everything is light grey. `3`: flat end panel, bright ground and a large rock dominate; no battleship identity cue remains.

**Visual quality.** The cut end is mechanically straight and planar, while repetitive bands and clean boxes suppress wreck character. Detached-looking plates/blocks occur beside the hull, but ground support cannot be resolved from these angles. Empty barbettes need an elevated side view; do not infer they are missing because an end-on frame hides them.

**Prioritised fixes.**

1. **P0:** Resolve the coordinate/bathymetry uncertainty in `data/landmarks/bismarck/sources.md`, tile-generation inputs and POI/prop placement before claiming the published depth. Seek better bathymetry or use an explicitly authored local reconstruction. Do not offset the hull 570 m below unchanged ground, or invent a precise coordinate solely to make depth match.
2. **P1:** L1/L2/S1. Use an elevated three-quarter side reveal exposing empty barbette rings and the preserved hull above sediment.
3. **P2:** `src/world/props/wrecks/bismarck.ts:tornAt`/end contour, deck plates and superstructure, plus `wrecks/materials.ts:paintWreck`: introduce broken-edge variation at the missing stern, damaged bridge detail and localized staining. Preserve the comparatively intact hull and surviving teak; applying Titanic-level ruin everywhere would contradict the reference. Verify burial/debris support in `data/landmarks/bismarck/props.json` against terrain after any depth fix. [Condition reference](https://www.kbismarck.com/wreck.html).

## 12. Hunga Tonga–Hunga Ha'apai — `hunga-tonga-caldera`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/hunga-tonga-caldera-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/hunga-tonga-caldera-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/hunga-tonga-caldera-3.png). Hero: `caldera-tuff-wall`. HUD depths: 24 / 412 / 412 m.

**Factual accuracy.** The current mission/POIs explicitly describe a **pre-2022** survey, while the Phase F guide describes the **post-2022** approximately 850 m basin. The primary repeat-bathymetry paper documents pre-eruption central depths about 150–200 m and a post-eruption deepest portion around 850 m. The captured 412 m wall is neither a measured central-floor depth nor proof that the historical labels are false. This is an era mismatch between briefs, not a reason to silently replace the title or flood the historical scene with fresh post-eruption ash. [Repeat-bathymetry study](https://www.nature.com/articles/s41561-026-02099-7), [current mission](../../data/landmarks/hunga-tonga-caldera/mission.json).

**Readability.** `1`: bright blue surface horizon above a submerged sub, as at Blue Hole. `2`: a huge pale gullied wall reads, but no caldera bowl; the wall objective's 184 m/114° starboard indication points away from the staged prop, showing that hero and target are not aligned in this view. `3`: wall panels and foot dominate, with little terrain context.

**Visual quality.** Another rectangular scarp with rounded boulders attached high on its face and a squared toe. Long blank bright panels and dark gully creases resemble the Challenger/Monterey kit. The creases are not verified z-fighting. No visible life in these three frames does not establish an ecological survey.

**Prioritised fixes.**

1. **P0:** Orchestrator choose historical or post-eruption Hunga. Align `docs/research/sites.md`, `data/landmarks/hunga-tonga-caldera/{guide,mission,pois,props}.json` and tile provenance. A post-2022 choice requires matching bathymetry/landscape, not a renamed pre-2022 POI. Keep plume/biology claims tied to the chosen survey era.
2. **P0/P1:** C1, L1/L2/S1; reveal a submerged rim/bowl. Align the invented hero's placement and navigation purpose with the chosen route, without presenting its dimensions as mapped measurements.
3. **P1:** `src/world/props/geo/scarp.ts:PRESETS.tuff` profile, bands, ledge, gully and boulders: make an arcuate fractured wall with stratified tuff and a conforming apron. Put displaced blocks on supported talus and eliminate vertical UV stretch. Distinguish this volcanic wall from Monterey's sedimentary bank and Challenger's slump scarp.

## 13. Blake Plateau corals — `blake-plateau-corals`

Images: [spawn](../../.cache/codex/shots/f-visual-qa/blake-plateau-corals-1.png), [40 m](../../.cache/codex/shots/f-visual-qa/blake-plateau-corals-2.png), [15 m](../../.cache/codex/shots/f-visual-qa/blake-plateau-corals-3.png). Hero: `lophelia-mound`. HUD depths: 701 / 755 / 748 m.

**Factual accuracy.** Pale branching cold-water coral on a mound is appropriate. NOAA explicitly notes that healthy living _Desmophyllum pertusum_ is white: do not call these white colonies bleaching or repaint them tropical colours. The guide asks for an interlocking crown on a dead-coral/rubble core within a mound landscape; the current isolated smooth mound and separated trees convey only part of that habitat. Species-level branch identification is unverified. [NOAA mapping and healthy-white-coral explanation](https://oceanexplorer.noaa.gov/news/million-mounds-news/).

**Readability.** `1`: hero invisible in a generic beam-lit plain. `2`: a useful diagonal mound silhouette, but pale branch tips merge with lit ground and colonies do not form a continuous crown. `3`: bright mound flank/ground and cropped twig fragments; close coral detail is hard to assess.

**Visual quality.** Smooth uniform base, repeated tree templates and wide gaps. The abrupt mound/terrain transition makes it look placed on the slope. Its shared kit makes Hudson and Blake visually interchangeable. No floating colonies or mesh seam inside the crown is conclusively established.

**Prioritised fixes.**

1. **P1:** L1/L2/S1. Reveal a crest and a darker saddle/channel, maintaining ivory branch separation against shaded substrate.
2. **P1:** `src/world/props/geo/coral.ts:shape`, `FRAMEWORK`, colony `cluster` rejection and `branchingColony`; `data/landmarks/blake-plateau-corals/props.json:lophelia-mound`: form localized interlocking thickets above a coarse dead-branch core. Current total `700 * growth` is heavily filtered by clustering; raising it alone does not fix repeated geometry or a smooth base. Keep medium-tier instancing and low-tier silhouette coverage.
3. **P2:** Feather the mound boundary using final terrain heights; vary branching templates, colony size/orientation and rubble exposure. Add only a small number of adjacent authored mound silhouettes to establish the setting, then verify draw/triangle budgets. Keep this crown variant distinct from Hudson's localized ledge garden.

## Verification for the fix wave

Recapture these same 39 views after shared lighting/camera changes before tuning every site's albedo. Keep the untouched spawn image. Supplement the approach pair with full-height Poseidon, Titanic prow/stern, elevated Bismarck barbettes, Endurance stern and Blue Hole enclosure views; the present close crops cannot certify those details. Add moving low/medium/high approaches across geology impostors and wreck near-detail transitions (`wrecks/detail.ts:nearLodM` is 70 m at medium) and terrain rings. Inspect ground contacts from both sides, outlet particle attachment, and shallow camera ascent. Re-run touch/mobile at low tier separately; this evidence does not establish mobile visual quality or performance.

Documentation checks: `npx prettier --write plan/progress/F-VISUAL-QA.md`, Prettier check, and `npm run check:content` passed. Content validation reported zero errors and warnings for all 13 sites. This does not validate the proposed visual fixes; they have not been implemented.

## Ranked top 10 across all sites

| Rank | Priority | Fix and affected sites                                                           | Concrete ownership                                                                                                            | Reviewable acceptance                                                                                                                                |
| ---- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | P1       | Recover close-range material colour; all 13                                      | `core/config/gameplay.ts` enhanced intensity/fill/angle, `render/Headlights.ts`, then `app/boot.ts` exposure and render bloom | Rust, wood, lava and carbonate are distinct at 15/40 m without losing distant navigation.                                                            |
| 2    | P1       | Remove faceted, overpowering beam shells; all 13                                 | `render/Headlights.ts` cone shader/path fade; gameplay `coneOpacity`                                                          | No solid diagonal wedges or polygon rims in unchanged spawn views.                                                                                   |
| 3    | P1       | Author meaningful free-dive spawn/heading; all 13                                | `game/Spawn.ts`, `app/boot.ts`, site pose metadata                                                                            | Every untouched opening has a visible hero or an unmistakable route/cue and a readable sub.                                                          |
| 4    | P0       | Retract underwater chase eye below the surface; Blue Hole, Hunga, shallow routes | `sub/CameraRig.ts`, `core/config/camera.ts` surface clearance/arm                                                             | No above-water camera while submerged; ascent and camera switches remain smooth.                                                                     |
| 5    | P0       | Correct Lost City fluid and preserve full tower reveal                           | Lost City mission overrides, `world/presets/VentPreset.ts`, `geo/towers.ts`, field guide                                      | Clear shimmer only, no smoke/orange glow; a complete porous carbonate skyline is assessable.                                                         |
| 6    | P0       | Deliver or explicitly rescope the Blue Hole enclosure                            | Blue Hole data/terrain-overlay scope; `geo/stalactites.ts`                                                                    | Site presentation matches the actual chosen experience; a freestanding outer-slope grotto is not presented as the measured hole.                     |
| 7    | P0       | Resolve Bismarck's approximately 570 m terrain/depth discrepancy                 | Bismarck provenance, bathymetry and POI/prop placement                                                                        | Published depth and rendered terrain agree through sourced data or an honest reconstruction decision; hull is supported.                             |
| 8    | P0       | Choose and consistently implement Hunga's era                                    | Hunga tile provenance, guide/mission/POI/prop data, field guide                                                               | Pre/post-2022 landscape, labels and reference brief agree.                                                                                           |
| 9    | P1       | Replace extruded/scarp and pillow-kit artifacts                                  | `geo/scarp.ts`, `shared.ts` UVs, `pillow.ts`, `textures.ts`; Challenger, Monterey, Hunga, Kama                                | Distinct geological silhouettes, no stretched faces, squared toes or apparent unsupported boulders; pillows no longer read as silver embossed tiles. |
| 10   | P1       | Give coral heroes convincing, distinct habitat structure                         | `geo/coral.ts` variants/clustering/framework; Hudson and Blake data                                                           | Hudson reads as a localized canyon ledge garden; Blake as a rubble mound with an interlocking ivory crown, with visible supporting contacts.         |
