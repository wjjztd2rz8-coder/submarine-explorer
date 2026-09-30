# F1-AUDIT — merged wave-1 verification

2026-09-30. Audited `git diff 1b4c80b c1317a4`, the Phase F plan, all four
`plan/progress/F1-*.md` delivery notes, and `docs/research/sites.md`. Worktree
HEAD is `1554356`; its additional budget-watchdog commit does not change the
audited game code. **Report only: no source fixes, added tests, downloaded
assets or commits.**

P1 = major gameplay correctness; P2 = player-visible correctness, factual
discrepancy or material performance risk; P3 = bounded optimisation or follow-up.
No P0 crash was demonstrated. Recommend fixing findings 1–8 before the F1
milestone; performance acceptance also needs the device checks below.

## Ranked findings

### 1. P1 — wall colliders block empty water and leave gaps through rock

**Locations:** `src/world/props/geo/scarp.ts:190`, `:342`, `:364`;
`src/world/props/geo/stalactites.ts:102`.

**Evidence:** `extrudeProfile` lowers positive vertex heights at the wall ends
by `1 - 0.85 * edge²`; colliders retain the full requested height. The
stalactite wall's end is about 15% of its centre height, but its end segment
still collides up to H. This known issue in F1-GEO is a gameplay bug, not just
visual polish. Separately, three segments each have half-width
`(W / 3) * 0.4`: their combined coverage leaves two gaps, each W/15 wide.
The shipped 100 m hadal scarp has approximately 6.67 m gaps. An 8 m sub sphere
can bridge some gaps, but a future small ROV collider cannot. Back faces can
extend to 1.8D while collider backs are commonly only 0.375D, leaving much of
the visible rear mass unprotected. Terrain lift is sampled once per segment;
crest taper, gullies and back profile are not reflected in the boxes.

**Fix:** derive collider slice heights and front/back extents from the same
deformed profile, overlap adjacent x segments, and cap the end heights.
**Verify:** collision probes above a tapered end must pass; probes inside
the rendered wall at both former gaps and on its rear must collide. Repeat
on a slope. Keep the traversable undercut open rather than replacing the
feature with one enclosing box.

An in-memory SSR probe confirmed the 100 m wall's x extents as
`[-46.67, -20]`, `[-13.33, 13.33]`, `[20, 46.67]`. Currently the ROV has
no prop-contact call at all (`src/app/systems/props.ts:46`); the gap warning
for its smaller collider applies when wave 2 connects that contact path.

### 2. P2 — changing post-processing permanently changes exposure

**Locations:** `src/app/systems/render.ts:53`, `:82`;
`src/shaders/underwater.ts:231`.

**Evidence:** direct rendering sets `renderer.toneMappingExposure` to
`baseExposure * gradeGain`. Re-enabling post never restores `baseExposure`;
the composite also multiplies by `uGain` before tone mapping. At unchanged
depth, off → on therefore retains the previous direct-render gain in
exposure and applies the post gain again. The result depends on settings
history, and a previous depth band's exposure persists after moving.
An in-memory render-system probe with mocked renderer/post, base exposure
1.25 and gain 0.8 confirmed post-on exposure changing from 1.25 to 1.0
after off → on; this validates state handling without claiming pixel/GPU
verification.

**Fix:** restore the base exposure whenever entering the post path. Use a
per-context base value rather than module state if lifecycle work follows.
**Verify:** with gain other than 1, compare fresh post-on rendering against
off → on at the same camera/depth; exposure and resulting image should match.

### 3. P2 — performance telemetry omits most post draws; GEO notes omit plumes

**Locations:** `src/app/systems/render.ts:78`, `:95`;
`src/shaders/underwater.ts:439–465`;
`src/world/props/geo/shared.ts:127`; `plan/progress/F1-GEO.md:31`.

**Evidence:** Three resets `renderer.info` on each render. The public counter
adds the captured scene count to the final composite only. Medium's five
quarter-resolution bloom draws and high/ultra's eight bloom draws disappear
from the count. Their triangles disappear too. The debug path additionally
checks `atmoTier.post` rather than `ctx.postFx`, so it can include stale
post scene counts while post is disabled. `countGeo` counts only Mesh objects,
excluding Points: the GEO budget lists smoker-cluster as 3 calls although it
has 3 mesh calls plus 4 plume calls; pillow-field is 2 + 3; low tuff-cliff is
1 + 3. This hides costs precisely where phone acceptance is supposed to use
the counters.

**Fix:** accumulate all render invocations, or reset info once and disable
automatic reset for the whole frame, including the direct path. Make the
builder budget helper count Points and Lines separately and respect visible
LOD children. **Verify:** mocked render counters must total scene + 6 calls
on medium and scene + 9 on high/ultra; post off must report the direct scene
only. Update delivery budgets with particles included.

### 4. P2 — new hull silhouettes exceed the unchanged collision sphere

**Locations:** `src/core/config/submarine.ts:163`;
`src/world/props/Wiring.ts:74`; `src/sub/SubMesh.ts:69`;
`src/app/systems/submarine.ts:60`.

**Evidence:** physics and prop contact still use an 8 m sphere for every
class. At the application's 26 m build scale, medium class B bounds reach
z = −14.48 m and y = +9.50 m; class C reaches y = +10.75 m. B's visible bow
can penetrate an obstacle by about 6.48 m before the sphere touches it. A's
rear reaches z = +9.62 m. These are measured model bounds, not claimed real
submarine dimensions. The expanded masts and frames also disagree with the
terrain clearance model.

**Fix:** retain simple arcade contact with a class-specific capsule or a few
spheres that cover the occupied hull, and share this definition with terrain
clearance. Enlarging a single sphere substantially reduces access to tight
routes; choose that trade-off explicitly. **Verify:** approach a flat wall
bow-first, stern-first and sideways in every class; visible occupied hull
must stop before crossing it.

### 5. P2 — two Bismarck turrets have unsupported poses

**Locations:** `src/world/props/wrecks/scatter.ts:620`, `:632`, `:642`.

**Evidence:** the kit places two inverted turrets, one on its side and one
upright. The wreck reference states that the detached main-battery turrets
are upside down on the seabed. [Bismarck wreck summary](https://www.kbismarck.com/wreck.html).
Exact offsets and azimuths remain artistic; that does not justify changing
the documented overturned condition.

**Fix:** instantiate four overturned turrets, allowing different yaw and
modest terrain tilt. **Verify:** all four turret bases/barrels have the
overturned relationship in geometry and in a debris preview; do not test
only instance counts or labels.

### 6. P2 — a 60 m Lost City edifice becomes roughly 69.6 m tall

**Locations:** `src/world/props/geo/towers.ts:39`, `:62`, `:67`;
`data/landmarks/lost-city/props.json:14`;
`tests/unit/props-geo.test.ts:90`.

**Evidence:** H=60 is used as the main column height, then a roughly 9.6 m
skirt is added beneath it. The shipped seed on flat ground produces a top
near y=69.58 m. The existing height test accepts anything between 55 and
75 m and therefore misses the error. The research brief targets 55–60 m;
published Lost City descriptions report carbonate structures up to 60 m.
[Published Lost City synthesis](https://pmc.ncbi.nlm.nih.gov/articles/PMC3093485/).

**Fix:** make H the total local relief and subtract the column's base lift
from its height; distinguish that from terrain-induced world height.
**Verify:** flat-ground main-column relief should match H within a small
specified modelling tolerance, rather than ±15 m.

### 7. P2 — ASHES hero substantially exceeds the cited scale

**Locations:** `data/landmarks/axial-seamount-ashes/props.json:89`, `:93`;
`src/world/props/geo/smokers.ts:38`.

**Evidence:** the addition requests a 9 m central stack on a raised mound;
its flat-ground model top is about 11.86 m. The note calls it only “a little
taller”. ASHES chimneys are generally under about 4 m, and the research
brief specifically proposes two approximately 4 m stacks separated by
about 10 m. [OOI ASHES field description](https://interactiveoceans.washington.edu/research-sites/axial-caldera/ashes/).
The addition is labelled once in the Journal, but its scale departs markedly
from the factual setting.

**Fix:** bring the stack sizes into the source-supported range; retain
readability through grouping and framing. If exaggerated relief is retained,
the orchestrator must consciously accept this departure from the realism
brief. **Verify:** measure individual columns above their bases, not just
the overall mound bounds; preserve the existing named-chimney scales.

### 8. P2 — Beebe's documented large mound is missing

**Locations:** `data/landmarks/beebe-vent-field/props.json:14`, `:18`;
`src/world/props/geo/smokers.ts:38`; `docs/research/sites.md:31`.

**Evidence:** the hero footprint is 26 × 20 m with H=12; flat-ground bounds
top out near 15.15 m. The discovery paper describes an approximately 80 m
diameter, 50 m high sulfide mound supporting active chimneys. [Beebe discovery
paper](https://www.nature.com/articles/ncomms1636). This builder can represent
a local cluster, but it does not deliver the research brief's mound-scale
hero, and the existing coarse terrain cannot be assumed to supply it.

**Fix:** add the mound relief separately, preserving plausible chimney
heights, or explicitly record the hero as a small flank fragment and defer
the actual mound. **Verify:** measure the total mound relief and footprint;
capture an approach view that communicates the intended scale.

### 9. P2 — terrain-following prop rebuilds have no resource disposal

**Locations:** `src/world/Props.ts:363`;
`src/world/props/builders/shared.ts:13`;
`src/world/props/wrecks/instances.ts:81`;
`src/world/props/wrecks/materials.ts:23`.

**Evidence:** `replace()` removes old full/impostor trees and builds new
ones without disposing their unique geometries, per-build materials or
InstancedMesh GPU resources. GEO features and wreck debris now use this
path, increasing the cost of repeated debug-editor moves. `Props` also has
no teardown method. This is a repeat-edit leak risk, not proof that ordinary
site navigation leaks: current navigation reloads the page. Wreck materials
and template geometries are cached and shared; blindly disposing every
removed mesh's material/geometry would break surviving near/mid instances.

**Fix:** give BuiltProp an ownership-aware disposer, deduplicate shared
resources, and call it on replacement/teardown. Preserve shared templates
until their cache owner is released. **Verify:** repeatedly move the same
visible terrain-following prop and render between moves; geometry/texture
memory should settle after warm-up, and other props must remain intact.

### 10. P2 — far stalactite LOD drops two-thirds of the wall

**Locations:** `src/world/props/geo/stalactites.ts:191`;
`src/world/props/geo/scarp.ts:352`.

**Evidence:** wall colliders are emitted in three x segments, eight slices
each. `colliders.slice(0, 8)` therefore selects only the first segment for
the impostor. The 42 m wall becomes a silhouette occupying approximately
11.2 m of its width, then abruptly regains its whole shape on approach.
Supplying the original bounds does not add the missing geometry.

**Fix:** retain representative boxes from every segment or build a
full-width low-detail wall. **Verify:** compare projected silhouette width
just either side of the outer prop LOD threshold.

### 11. P2 — GEO bounds omit shader plumes and some attached geometry

**Locations:** `src/world/props/geo/smokers.ts:163`;
`src/world/props/geo/scarp.ts:316`;
`src/world/props/geo/stalactites.ts:187`; `src/world/Props.ts:395`.

**Evidence:** these bounds are copied from the body/wall, while plumes,
boulders, hanging formations or life are added separately. `Props.update`
culls the entire tree using that sphere. A plume extending above an
offscreen smoker can therefore vanish despite being in view. Points have
shader-displaced positions, so ordinary CPU `setFromObject` alone cannot
recover their animated extent.

**Fix:** union attached static bounds and the analytic plume envelope,
including height, spread and drift. **Verify:** aim at the top of a plume
with its chimney body outside the frustum; it must stay visible. Test a
large hanging formation similarly.

### 12. P2 — low/direct custom shaders bypass output colour conversion

**Locations:** `src/world/Water.ts:185`;
`src/render/Headlights.ts:262`; `src/render/MarineSnow.ts:224`;
`src/vehicles/Wash.ts:62`.

**Evidence:** these ShaderMaterial fragments finish at `gl_FragColor` and
omit Three's tone-mapping and colour-space chunks. Standard materials use
the output conversion on the default framebuffer; the custom effects emit
linear values directly there. With post on, the final composite performs
conversion for the whole HDR scene, so tier/settings changes alter the
relationship between water/particles/beams and solid geometry. Wash is
disabled on low but is affected by post-off on the other tiers.

**Fix:** use the standard output chunks, letting Three's render-target
defines select the appropriate path. **Verify:** matched direct/post-off
screens of water and illuminated snow should have consistent colour
handling; ensure the HDR scene is not encoded twice before bloom.

### 13. P2 — additive beam intensity is multiplied by alpha twice

**Locations:** `src/render/Headlights.ts:79`, `:262`;
installed `three/src/renderers/webgl/WebGLState.js:677`.

**Evidence:** RGB already contains `a * f`, and alpha also contains `a * f`.
With non-premultiplied `AdditiveBlending`, Three uses SRC_ALPHA / ONE for
RGB; emitted light is consequently `uColor * (a * f)²`. Water attenuation
and cone opacity are squared. This complicates readability tuning and
contributes to excessively rapid beam disappearance.

**Fix:** output unpremultiplied RGB with the opacity in alpha, or explicitly
use the corresponding premultiplied blend setup. Retune only after making
that convention consistent. **Verify:** halving opacity should approximately
halve the additive contribution rather than quarter it.

### 14. P2 — phone fill-rate risk remains after geometry LOD

**Locations:** `src/render/Headlights.ts:62`, `:80`, `:84`;
`src/render/MarineSnow.ts:199`; `src/core/config/quality.ts:62`;
`src/shaders/underwater.ts:342`.

**Evidence:** two always-submitted, transparent double-sided beam shells
reach 420 m, with end radius about 328 m at the configured 38° half-angle.
Installed Three renders each double-sided transparent mesh twice unless
`forceSinglePass` is enabled: four beam draws even on low. The two extra
noise evaluations per fragment on medium/high are independent of the tiny
triangle budget. The sea surface is another double-sided transparent draw
pair when visible. Snow sprites cap at 18 × 18 pixels: theoretical maximum
submitted areas are 0.194 / 0.972 / 2.916 million pixels for low / medium /
high, before discard, depth rejection or density culling. GEO plumes and
preset haze add separate overlapping layers. These are upper bounds, not
measured GPU work.

Low's inherited DPR cap is still 2, initially paying four times the pixels
of DPR 1 until dynamic resolution responds. Medium adds six post draws;
high adds nine and 4× MSAA (see budgets). Thus low is cheaper, but 30 fps
on phones is unverified.

**Fix:** profile `forceSinglePass` for these shells, conservative beam
culling/shorter visual reach, a lower initial mobile DPR cap, and bounded
particle sprite sizes. Preserve actual lamp illumination separately from
the decorative shell. **Verify:** real phones, underwater surface views,
head-on walls, dense plumes and the ROV deployed; log GPU/frame time and
corrected counters at each tier and during resize/DRS changes.

### 15. P3 — medium vehicles use the full high model and decal atlas

**Locations:** `src/vehicles/index.ts:43`;
`src/vehicles/decals.ts:47`; `src/vehicles/materials.ts:140`.

**Evidence:** geometry LOD distinguishes only low from everything else.
Medium/high/ultra class B each cost about 30.8k triangles before decals.
The sub and ROV each receive a 1024² atlas on non-low tiers. This is an
intentional two-LOD policy, but medium has no geometry/atlas saving relative
to high. The delivery note's “no texture memory” on low also excludes the
64 × 32 environment map created unconditionally and its renderer-managed
PMREM allocation. Those bounded shared caches are not a per-refit leak.

**Fix:** if device measurements require it, use a smaller medium atlas and
less cylinder/arm detail; describe low as no surface maps/decals. Verify
visual legibility at the actual chase-camera distance before spending
more detail.

### 16. P3 — per-frame garbage in new visual paths

**Locations:** `src/vehicles/tether.ts:46` (two Vector3 allocations per
deployed update); `src/vehicles/Vehicle.ts:351` (lerp closure per animated
arm); `src/rov/RovVisual.ts:108` (drive object);
`src/vehicles/cockpit.ts:137` (formatted fit-key per drawn cockpit mesh);
`src/shaders/underwater.ts:450` (blur closure);
`src/app/systems/render.ts:60` (PostFrame object).

**Evidence:** these run every frame. Also retained from earlier code:
`src/world/Props.ts:383` allocates a camera Vector3;
`src/app/systems/atmosphere.ts:41` creates fog/lamp records;
`src/render/MarineSnow.ts:125` receives a new flow record. None is a huge
allocation individually, and particle pools themselves are reused.

**Fix:** cache scratch vectors/records and compare numeric cockpit fit
parameters; avoid per-arm/per-frame closures. **Verify:** sample allocation
profiles while driving with ROV, arms and cockpit active; prioritise measured
GC pauses over broad rewrites.

### 17. P3 — cockpit eye metadata is not connected to the camera

**Locations:** `src/vehicles/Vehicle.ts:132`;
`src/core/config/camera.ts:51`; `src/sub/CameraRig.ts:213`.

**Evidence:** each blueprint supplies a scaled `cockpitEye`, but camera
placement continues using the universal `(0, 4, −12)` offset. At app scale,
A's authored eye is approximately `(0, 0.19, −3.52)` and B's is
`(0, −1.65, −9.64)`. The framing overlay works, but the underwater viewpoint
does not originate from the class's pressure-sphere eye. Hiding the exterior
model in first person masks that discrepancy.

**Fix:** choose whether first person is a real viewport or an arcade bow
camera. For the former, expose the transformed eye through SubMesh and
apply it in the rig. **Verify:** all classes, pitch changes, hull refit and
ROV transitions; preserve terrain/wall clearance at the new eye position.

### 18. P3 — disposal methods exist but app systems do not call them

**Locations:** `src/shaders/underwater.ts:494`;
`src/app/systems/render.ts:26`; `src/app/systems/atmosphere.ts:15`;
`src/app/System.ts:15`.

**Evidence:** the post disposer correctly releases its depth texture,
render targets, black fallback, materials and quad. Atmosphere, Headlights,
MarineSnow, Water and Vehicle also provide disposal. Their application
systems do not connect these to teardown; the resize listener is not
removed. Current navigation destroys the page, so this is a lifecycle
contract gap rather than a demonstrated accumulating site-switch leak.

**Fix:** before introducing in-page site replacement, wire system disposal
and listener removal, plus the ownership fix in finding 9. Do not dispose
page-shared wreck/vehicle caches on each hull refit.

## Code-derived budgets

These estimates were produced by building the authored props for each site
at every tier using the real builder registry, dimensions and deterministic
id seed, with a flat ground callback. Count indexed/non-indexed triangles
times instance count, and visible near-LOD Mesh + Points submissions; omit
the hidden mid twin. This is an **all-authored-props-near upper bound**, not
a claim that the whole site fits in one camera frame. Actual terrain slope,
frustum/outer LOD and browser-only text decals change the result. Transparent
double-sided replay, terrain, vehicles, water, lights, presets, snow and post
are excluded from this table.

Each cell is **thousand triangles / mesh-and-points submissions**.

| Authored site props |       Low |     Medium |       High |      Ultra |
| ------------------- | --------: | ---------: | ---------: | ---------: |
| Axial ASHES         |  9.4 / 12 |  17.5 / 12 |  26.8 / 12 |  42.2 / 12 |
| Beebe               |  12.9 / 9 |   27.3 / 9 |   43.4 / 9 |   69.3 / 9 |
| Bismarck            | 28.9 / 16 |  62.1 / 20 |  97.6 / 20 | 117.5 / 20 |
| Blake Plateau       |  16.2 / 5 |   87.7 / 5 |  143.5 / 5 |  171.5 / 5 |
| Challenger Deep     |   3.9 / 3 |   15.6 / 6 |   24.7 / 6 |   60.2 / 6 |
| Endurance           | 17.4 / 10 |  51.0 / 16 |  92.3 / 16 | 139.5 / 16 |
| Great Blue Hole     |   5.1 / 3 |   11.6 / 3 |   19.5 / 3 |   38.6 / 3 |
| Hudson Canyon       |  14.5 / 5 |   76.7 / 5 |  130.1 / 5 |  156.1 / 5 |
| Hunga Tonga         |   2.2 / 4 |   16.7 / 7 |   27.4 / 7 |   71.1 / 7 |
| Kamaehuakanaloa     |  16.6 / 8 |   51.3 / 8 |   64.3 / 8 |  157.3 / 8 |
| Lost City           |   7.8 / 5 |   11.3 / 5 |   14.9 / 5 |   23.8 / 5 |
| Monterey Canyon     |   2.0 / 3 |   11.0 / 6 |   17.8 / 6 |   45.6 / 6 |
| Titanic             | 50.1 / 17 | 163.5 / 29 | 242.7 / 29 | 276.4 / 29 |

Endurance's browser-only name decal adds one draw on non-low tiers. The
headless probe cannot render or time these assets. Examples of particle
submissions already included above: ASHES hero plume points 112 / 224 / 320 /
480; Kama pillow seep points 45 / 93 / 132 / 198. The GEO helper's old counts
must not be used as total site budgets.

Vehicle model estimates, excluding wash, tether, cockpit and decals:

| Vehicle | Low triangles / submissions | Medium = high = ultra |
| ------- | --------------------------: | --------------------: |
| Class A |                  14,964 / 7 |           29,280 / 16 |
| Class B |                  15,860 / 6 |           30,844 / 19 |
| Class C |                  14,484 / 6 |           28,760 / 15 |
| ROV     |                   8,986 / 6 |           15,148 / 15 |

Non-low browser decals add a draw per vehicle. Low tether is one line draw;
medium tether is 384 triangles / one draw; high and ultra are 576 / one.
Sub wash pools are 0 / 120 / 220 / 360 points; ROV pools 0 / 48 / 88 / 144.
The ROV adds its own two spots and a fill; mothership lights stay active.
Those lights increase per-fragment work on lit materials even though lights
are not themselves mesh draws.

### Post, particles and texture memory

| Cost                     | Low                | Medium                                  | High / ultra                            |
| ------------------------ | ------------------ | --------------------------------------- | --------------------------------------- |
| Application post draws   | 0                  | 5 quarter-resolution + 1 full composite | 5 quarter + 3 eighth + 1 full composite |
| Scene target MSAA        | Unused post target | 0                                       | 4 samples                               |
| Composite texture taps   | None               | 3 scene + depth + bloom = 5             | 3 scene + depth + 2 bloom = 6           |
| Surface-ray noise layers | None               | 2, when ray gate is active              | 3, when ray gate is active              |
| Marine-snow points       | 600                | 3,000                                   | 9,000                                   |
| Caustic texture loop     | None               | 10 × 128² RGBA ≈ 0.625 MiB              | 16 × 256² RGBA ≈ 4 MiB                  |
| GEO detail-map edge      | 256                | 512                                     | 512 high / 1024 ultra                   |
| Wreck detail-map edge    | 256                | 512                                     | 512 high / 1024 ultra                   |

The low tier does **not** render a fullscreen underwater or bloom pass.
Its constructed post-target object does not imply allocated GPU storage
while unused. The direct renderer uses its normal framebuffer; the app
does not request Three's optional HalfFloat output-buffer path.

At 1920 × 1080 drawing-buffer pixels, RGBA16F + estimated 32-bit depth uses
about 23.7 MiB for a resolved scene target. High's 4× multisampled attachments
can add approximately 94.9 MiB, before roughly 2.5 MiB of bloom targets.
Medium's bloom pair adds approximately 2.0 MiB. Driver depth format, sample
support and resolve implementation affect these estimates. Doubling DPR
quadruples all these pixel-based costs; do not describe them as measured
browser memory. Ultra's configured DPR cap of 3 magnifies this risk further.

A single RGBA8 detail map with mipmaps is about 0.33 / 1.33 / 5.33 MiB at
256 / 512 / 1024. GEO bump reuses its colour map, whereas high/ultra wreck
normal maps are additional textures. Vehicle foam uses three 256² maps;
frame and metal each use three 128² maps, roughly 1.5 MiB combined with
mipmaps before environment/PMREM. Two 1024² vehicle atlases are about
10.7 MiB together with mipmaps; retained source canvases add CPU storage.
Endurance's separate name canvas is 1024 × 512. Caches are bounded by kind
and size; they are not evidence of unbounded frame-by-frame texture growth.

The merged Kama pillow geometry has approximately 6.31 MiB of vertex
attributes on medium, 7.93 MiB high and 19.62 MiB ultra for the hero alone.
Its low draw count does not imply low buffer memory. Existing vent presets
add up to the configured particle cap beyond the small GEO pools (default
smoke request 12,000 × intensity); wreck presets request 9,000 haze points
plus hull motes before tier scaling/caps. Their transparent fragments also
need device profiling.

## Set-piece fact and placement review

All dimensions quoted as **code/build** below describe the implementation;
they are not newly asserted survey measurements. Exact compass headings and
individual debris offsets should remain design estimates unless a survey
source actually publishes them.

| Set piece                    | Verification and remaining action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titanic                      | Code bow 143 × 28 × 16 m and stern 107 × 32 × 10 m follow the research's explicitly approximate build envelope. Code coordinates imply about 690 m section separation; stern-to-bow bearing is about 9.6°, consistent internally with heading 190° placing the stern's rear toward the bow. This arithmetic does not independently validate exact survey headings. Separate bow/stern, a chaotic stern, deck fittings and rusticle curtains fit the available survey/footage references. Keep exact debris scatters artistic, rather than claiming they reproduce the full mapped field. [WHOI mapping](https://www.whoi.edu/oceanus/feature/the-quest-to-map-titanic/), [WHOI ship dimensions](https://www.whoi.edu/ocean-learning-hub/ocean-topics/ocean-human-lives/underwater-archaeology/rms-titanic/), [WHOI wreck footage](https://www.whoi.edu/press-room/news-release/woods-hole-oceanographic-institution-releases-rare-video-footage-from-the-first-submersible-dives-to-rms-titanic/).   |
| Bismarck                     | Upright hull, empty main barbettes and a small torn stern fit the wreck account; the turret poses do not (finding 5). Code overall dimensions are 251 × 36 × 15 m; 15 m is a build estimate and heading 20° is explicitly arbitrary. `data/landmarks.json:1937` still says the bow is separated, conflicting with the largely intact hull except for its stern end. `props.json:19` retains an obsolete rounded-stern explanation before appending the new cut-stern account; `:34` still says there is no turret-shaped model. Fix this metadata so later agents do not recreate the old errors. The reported real depth is 4,790 m; a raw bilinear tile-centre sample at the code hull position is about 4,223 m before local placement offsets, leaving an inherited roughly 567 m terrain discrepancy. It was not solved by F1. [Wreck account](https://www.kbismarck.com/wreck.html), [2001 expedition observations](https://www.hmshood.org.uk/hoodtoday/2001expedition/bismarck/encrypt.htm). |
| Endurance                    | Code hull length 44 m agrees with the FMHT scan account. Whole-model bounds extend to about 47.3 m including the bowsprit; this is not a reason to shrink the hull to 40 m. Broken masts, fallen funnel, aft wheel, name and polar-star emblem are supported by expedition material. Code beam 7.6 m and height 8 m are retained ship/build inputs; the 8 m visible-height estimate and 0° heading are not verified wreck measurements. Exact decimal position was not independently confirmed by the press release; do not elevate its confidence on that basis. Reported discovery depth is 3,008 m. [FMHT scan and condition](https://fmht.co.uk/shackletons-endurance-revealed/endurance-at-the-bottom-of-the-sea/), [Endurance22 discovery](https://endurance22.org/endurance-is-found).                                                                                                                                                                                                        |
| Lost City                    | Pale fluted columns and flanges fit the carbonate brief; total relief needs fixing (finding 6). The inherited carbonate vent preset still applies warm-orange `0xff9a4a` glow at 35% intensity (`src/world/presets/VentPreset.ts:99–104`), contrary to the research's no-orange-glow direction. Published fluid temperatures are 40–91°C; the glow should not imply incandescent discharge. Remove or neutralise that preset contribution while preserving readable vehicle light. [Published synthesis](https://pmc.ncbi.nlm.nih.gov/articles/PMC3093485/).                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Axial ASHES / Beebe          | Shape families and near-black/pale biological contrast are useful; the outstanding issues are quantified in findings 7–8. Their separate OOI/discovery sources support distinct modelling briefs rather than treating all vent fields as the same-size smoker cluster. [OOI ASHES](https://interactiveoceans.washington.edu/research-sites/axial-caldera/ashes/), [Beebe paper](https://www.nature.com/articles/ncomms1636).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Great Blue Hole              | Code hero is at longitude −87.5925, about 6 km west of the catalog hole centre, on the outer drop-off; it is an added alcove, not the actual hole's gallery. The delivered scene lacks the defining shaft, as F1-GEO acknowledges. Real survey accounts describe an approximately 320 m wide, 124–125 m deep hole. Keep the western alcove tagged as an addition and record the actual shaft as deferred; the milestone should not imply the hole itself was delivered. [Expedition survey account](https://www.gpsworld.com/belizes-great-blue-hole-revealed-in-expedition-survey/).                                                                                                                                                                                                                                                                                                                                                                                                                |
| Hunga Tonga                  | The code hero's clear seep Points exist even though the progress note says no gas-plume effect; distinguish those from the deferred dedicated effect. Neither arbitrary chimney activity nor a generic caldera wall establishes a contemporary survey reconstruction. A September 2026 paper reports deep vents in May 2022 but their absence in October, with shallower vents persisting. Decide which time slice the historical tile and added seep depict; do not claim permanent contemporary deep vents. [2026 caldera study](https://www.nature.com/articles/s41561-026-02099-7).                                                                                                                                                                                                                                                                                                                                                                                                              |
| Hudson / Blake               | The same `coral-mound` builder is used for both; `src/world/props/geo/coral.ts:149` builds predominantly ivory/peach branching colonies. Hudson's proposed orange-pink garden on a canyon junction was not delivered as briefed. This is a delivery mismatch, not proof that an added pale colony cannot occur there. NOAA describes Hudson's habitats as underexplored; avoid asserting a specific species at this exact added patch. [NOAA Hudson expedition](https://sanctuaries.noaa.gov/news/2025/explore-the-depths-hudson-canyon-live.html), [Blake province mapping paper](https://repository.library.noaa.gov/view/noaa/64470/noaa_64470_DS1.pdf).                                                                                                                                                                                                                                                                                                                                          |
| Monterey / Challenger / Kama | Their scarps and pillow heap are explicitly unnamed additions, with invented local dimensions/positions in prop notes. The collision findings apply, and the known missing Kama tube remains deferred. This audit has not promoted any of these prop coordinates into surveyed-feature coordinates. Regional context sources: [MBARI canyon overview](https://www.mbari.org/know-your-ocean/monterey-canyon/), [Schmidt trench expedition](https://schmidtocean.org/cruise/expanding-mariana-trench-perspectives/), [USGS submarine volcano overview](https://www.usgs.gov/volcanoes/kamaehuakanaloa).                                                                                                                                                                                                                                                                                                                                                                                               |

## Player text, assets and checks

Scanning string values in the player guide JSON found **no literal
“illustrative” or “reconstructed/reconstruction” prose**; boolean
`reconstruction` keys are metadata. F1-GEO adds one game-addition sentence
to one entry at each of nine sites, alongside the existing badge. This
matches the plan's once-in-the-Journal policy; the repeated phrasing across
different sites is not a repeat disclaimer inside one entry. Developer
prop notes and source documents do contain caveats, but those are not
grounds to remove factual confidence metadata. Do not spread their long
explanations into the HUD during later UI work.

The four deliveries use procedural geometry/textures and their attribution
notes add no third-party downloads. This report recommends no reusable
asset, so there is no asset licence approval to infer from a reference link.
In particular, the Hunga paper's source page states **“Creative Commons
Attribution-NonCommercial-NoDerivatives 4.0 International License”**:
[source rights section](https://www.nature.com/articles/s41561-026-02099-7#rightslink).
Its figures are **unusable as game assets under the task's NC/ND rule**;
the link is for factual research only. No source images were copied.

Checks performed:

- `npx vitest run tests/unit/wrecks.test.ts tests/unit/vehicles.test.ts tests/unit/props-geo.test.ts tests/unit/f1Ocean.test.ts --configLoader native`: **75 tests passed, four files**.
- In-memory Vite SSR geometry probes across authored props/all four tiers:
  finite vertex attributes and bounds on flat ground; instance-aware budgets
  and vehicle world-scale bounds above. No reachable NaN in these supported
  configurations was demonstrated. This is not proof for arbitrary malformed
  builder inputs, extreme terrain slopes or a GPU shader run.
- Post targets resize together (`underwater.ts:406–416`), including bloom;
  the depth attachment tracks its target. There is no demonstrated stale-size
  render-target bug. Minor follow-up: use renderer drawing-buffer dimensions
  instead of rounded CSS × DPR, which can differ from Three's flooring by a
  pixel at fractional DPR. DRS invokes the resize callback.
- Vehicle refit disposes its old geometry/material/decal/wash resources;
  tether buffers are updated in place. Post disposal is internally complete
  when called. Shared procedural caches retained for the page are intentional.
- `npx prettier --write plan/progress/F1-AUDIT.md` and the subsequent
  file-specific formatting check: **passed**.
- `npm run check:content`: **all 13 sites passed, zero errors/warnings**.
  No full build/e2e rerun is implied by these checks.

Source-access limits: the NOAA Blake mapping PDF and the USGS volcano
overview linked in the regional-context table could not be retrieved by
this audit's web tool. They remain existing research references, not newly
verified evidence for exact colony/prop placement. Accessible OOI, FMHT,
Endurance22, WHOI, Bismarck, NOAA Hudson and journal-paper pages support the
specific factual comparisons above.

Remaining acceptance evidence: real-GPU low-tier 30+ fps with the visible
hull in frame, a representative phone/tablet, dense particles, post toggle,
portrait/landscape resize and DRS. Existing preview images that hide the hull
and SwiftShader screenshots cannot establish that acceptance result.

Decisions for the orchestrator: simple class-aware collision shape; whether
to deliver or explicitly defer Beebe's mound and the actual Blue Hole shaft;
whether to retain exaggerated ASHES scale; Hunga's represented time slice;
and the measured mobile DPR/post budget. Source corrections and the narrow
rendering bugs above need no visual redesign.
