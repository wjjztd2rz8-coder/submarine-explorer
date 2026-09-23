# Art direction and mood board — Submarine Explorer

Owner: docs/art-direction.md and docs/img/moodboard/* (package A5). Do not edit source under `src/`.

---

## 0. One-page summary (read this, skip the rest if you're in a hurry)

**Mood:** serene, awe-driven, scientific. Subnautica's depth-dread minus the horror; Abzû's calm; Google-Earth "it's really there" credibility. No combat, no gore, no jump scares. Sites that are memorials (Titanic, Endurance, Bismarck) are treated with quiet respect — no loot framing, a memorial note in the field guide.

**Style:** realistic-leaning. Real colours, physically-plausible materials, restrained post-processing (no cartoon outlines, no heavy bloom, no lens flare). Fabricated props (wrecks, vent chimneys) are modelled at correct scale/orientation and flagged "artist's reconstruction" in the field guide — never invented geology.

**Depth-band palettes (hex), fog and lighting** — use these directly in `Water.ts` / `Atmosphere.ts` (A2) and terrain material tinting (A1):

| Band     | Depth      | Water colour (mid) | Fog colour | Fog density (exp2 coeff) | Ambient light                          | Notes                                               |
| -------- | ---------- | ------------------ | ---------- | ------------------------ | -------------------------------------- | --------------------------------------------------- |
| Surface  | 0–20 m     | `#3E9DB8`          | `#5AAFC4`  | 0.010                    | bright, sun-shaft ready                | caustics on, warm sun highlight `#FFE9B8`           |
| Twilight | 20–200 m   | `#1C5C74`          | `#2A5568`  | 0.020                    | dims fast, blue dominant               | caustics fade out by ~60 m                          |
| Midnight | 200–1000 m | `#0A2C3D`          | `#0E2530`  | 0.035                    | near-black ambient, headlights primary | bioluminescent specks allowed, sparse               |
| Abyss    | >1000 m    | `#040F16`          | `#050C10`  | 0.050                    | headlights only, no ambient            | crush-depth tension band; vignette slightly heavier |

Interpolate these four stops smoothly by depth (don't hard-cut); fog density scales the same curve. Sun shafts/caustics only above ~60 m (Twilight upper edge).

**Seabed material palette** (albedo base hex, tune roughness/normal per A1's triplanar shader):

| Material                         | Base hex  | Where                                                         |
| -------------------------------- | --------- | ------------------------------------------------------------- |
| Sediment (silt/mud)              | `#7A6E5C` | flat abyssal plain, low slope                                 |
| Basalt / volcanic rock           | `#3B3A3D` | slope > 25°, seamounts, vent fields                           |
| Sand (shallow)                   | `#C9B489` | < 200 m, coastal/reef tiles                                   |
| Rust (wreck hull)                | `#7A3B22` | prop shader only, weathered steel                             |
| Marine growth (rust/algae blend) | `#4E5A3E` | patchy overlay on wrecks & rock at any depth, denser < 1000 m |

**HUD visual language:** monospace only, thin 1px hairlines, dark translucent panels (`rgba(6,14,18,0.55)`), no drop shadows or gradients. Two accent colours only: **amber `#FFB020`** for warnings/hull-stress/crush-depth countdown, **cyan `#2ED9D9`** for sonar/nav/normal readouts. Fonts: **Space Mono** (readouts/body) or **Oxanium** (alt, more geometric) for HUD numerals, **Orbitron** for title/mission-select headers — all OFL, listed in `docs/assets.md` §4.

**Do:** real colour grading, restrained bloom only on headlight cones and bioluminescence, thin sonar sweep lines, quiet ambient light falloff.
**Don't:** saturated neon, screen-space chromatic vomit, cartoon rim-lighting, horror stingers, loot-sparkle VFX on wrecks.

Reference images below are all NOAA Ocean Exploration public-domain stills (US federal government work, no copyright) — see §5 for full source/licence table.

---

## 1. Tone and pillars (from plan/DECISIONS.md, plan/MASTER-PLAN.md §1)

- Serene educational exploration; mild pressure/darkness tension; no combat, no horror.
- Realistic-leaning art style: real colours, PBR materials, restrained post.
- Crewed research submersible (Alvin / Limiting Factor class) as the player craft.
- Placed 3D props are marked "artist's reconstruction" in the field guide when fabricated.
- Memorial/war-grave sites (Titanic, Endurance, Bismarck) included respectfully: a memorial note, no loot/salvage mechanics, no sensationalism.
- Audience: teens and adults, classroom-usable. Keep imagery and captions factual and calm — this doc's own reference images and captions should read like a museum placard, not a thriller poster.
- Depth must be _felt_ (pillar 2): colour, light, fog density and HUD urgency all shift with the depth bands in §0.

## 2. Palette rationale and depth interpolation

The four stops in §0 are sampled from the reference photos in §5 (open-water blue-greens near the surface, collapsing to near-black by full ocean depth) plus standard oceanographic light-attenuation behaviour (red light gone by ~10 m, orange by ~50 m, yellow by ~100 m, green/blue dominate to ~200 m, then extinction). Implementation guidance for A2:

- Drive water/fog colour and density off a single `depthMeters` input; use a smoothstep or Catmull-Rom interpolation across the 4 stops above rather than 4 discrete bands, so the transition between e.g. 180 m and 220 m is not a visible seam.
- Sun-shaft/caustic intensity should ease out between 20 m and 60 m and be fully off below that; do not gate on a hard depth cutoff.
- Headlight cone colour: slightly warm white `#FFF3DD`, additive, soft falloff — it is the only strong light source below ~150 m and should read as "borrowed light," not a floodlight.
- Bioluminescence (if/when added): sparse, cool-white to pale cyan `#B8FFF0` points, never used as a primary light source.

## 3. Seabed material palette (detail for A1)

Beyond the base hex values in §0:

- **Sediment**: matte, very low specular, subtle ripple normal map at shallow angle. Dominates flat abyssal plain (>3000 m) and canyon floors.
- **Basalt/volcanic rock**: darker, higher-contrast normal detail (angular facets), slightly higher roughness variance to read as broken rock, not sanded stone. Dominant on seamount flanks and vent fields; triggered by slope > 25° in the triplanar shader per A1's brief.
- **Sand**: lighter, higher albedo, tighter grain-noise normal map, used only above ~200 m per the tier-1 palette (below that, "sand" doesn't credibly exist at these landmark depths — use sediment instead, except real shallow tiles).
- **Rust**: applied only to wreck/prop shaders (never terrain), streaked vertically (gravity-fed staining look), based on the rusticle reference photo (§5).
- **Marine growth**: low-saturation green-brown overlay, patchy mask (not a uniform tint), denser above 1000 m where more nutrients/light history exist, sparse to absent below.
- Blend materials by slope + depth, not by a hard mask, to avoid visible material seams at chunk borders (ties into A1's per-vertex noise-driven blend weights).

## 4. Prop style guide

- **Fidelity target**: mid-poly, real-world proportions and material response (rust, growth, sediment drift) — not stylised/low-poly toy aesthetic, and not hyper-detailed photogrammetry noise either. Aim for "museum diorama," matching the restrained realism of A1's terrain.
- **Scale honesty**: props are placed at real coordinates and real dimensions (per plan/MASTER-PLAN.md §4); never scaled up for drama.
- **Wreck materials**: base rusted steel (`#7A3B22`) with patchy marine-growth overlay (`#4E5A3E`), sediment accumulation as a darkening gradient toward the bottom of any vertical surface, per the rusticle and Titanic-bow reference photos (§5).
- **Vent props (chimneys, smokers)**: dark basalt-grey base with mineral staining (white/orange precipitate near active vents per the Champagne Vent reference), shimmer/refraction on emitted fluid handled procedurally by A2/C3, not baked into the model texture.
- **Fabrication disclosure**: any prop that is a reconstruction rather than a scan/survey-derived shape must be flagged "artist's reconstruction" in its field-guide entry (per plan/DECISIONS.md "Fabrication" row) — this is a content-package (B2/C4x) responsibility, not a rendering one, but modellers should keep silhouettes conservative (recognizable, not invented detail) to make that honesty easy to keep.
- **No loot glow**: wrecks and memorial sites must never receive outline highlights, sparkle particles, or "interactable" glow typical of loot games — the scan-beam UI (cyan, per §0) is the only interaction affordance, and it is neutral/scientific in tone, not treasure-hunt.

## 5. HUD visual language (detail for UI work, B1/B3/C5)

- **Typography**: monospace throughout for live readouts (depth, heading, speed, hull integrity, sonar range) — **Space Mono** as default body/readout face, **Oxanium** as an alternate more-technical monospace for numeral-heavy dials. **Orbitron** reserved for the title screen and mission-select headers only (display face, not for in-mission HUD — it's less legible at small sizes). All three are OFL (docs/assets.md §4); no licence blocker.
- **Line weight**: thin (1px at 1080p) hairlines for panel borders, dial ticks and the sonar sweep line. No heavy borders, no drop shadows, no gradients on panels — flat, translucent dark fill only (`rgba(6,14,18,0.55)` default panel background).
- **Colour coding**: exactly two accents.
  - **Amber `#FFB020`**: warnings, hull-stress meter above a threshold, crush-depth countdown, any state requiring player attention.
  - **Cyan `#2ED9D9`**: sonar returns, nav/compass, scan-beam progress ring, "normal/nominal" readouts.
  - Everything else (labels, static numerals) is a neutral light grey `#CDE0E5` on the dark panel fill — don't add a third accent colour without a strong reason; the restraint is the point.
- **Sonar aesthetic**: thin rotating sweep line, cyan blips with a soft decay trail, circular range rings at fixed intervals (not a filled radar disc) — the "learn by doing" pillar wants players to read real distance off the rings, so keep them evenly spaced and labelled in metres.
- **Motion**: HUD elements should ease, not snap — but keep the sonar sweep and hull-stress needle instrument-like (linear, not bouncy) — this is scientific instrumentation, not a game-y dashboard.

## 6. Fog and lighting reference notes (for A2)

- Near-surface reference (Titanic bow photo, §5) shows a hazy, particulate-suspended blue-green water column even at working depth — marine snow/turbidity should always be visible, never a perfectly clear "aquarium" look.
- Deep-vent references (Champagne Vent, Black Smoker, Vent Chimney, §5) show how little ambient light exists beyond the ROV's own lighting rig — replicate this: below ~200 m, essentially all illumination in a shot should trace back to the sub's headlights or an active vent's own thermal glow, not a implied ambient sun.
- The ROV control room reference (§5) is included as a **HUD mood reference**, not a set reference: note the dark room, many small glowing monochrome/cyan-tinted displays, minimal colour — this is the emotional target for the game's own HUD, not a literal panel to copy.

## 7. Do / don't list

**Do**

- Real, cited colours and depth behaviour (§0–§2).
- Restrained post-processing: vignette, slight chromatic aberration, caustics only above 60 m (per plan/MASTER-PLAN.md §5).
- Two-colour HUD accent system (amber/cyan), monospace type.
- Honest scale and material response on props; "artist's reconstruction" disclosure where relevant.
- Quiet, respectful treatment of memorial sites — no music stingers, no combat framing, a memorial note in guide text.

**Don't**

- Neon/saturated sci-fi lighting, lens flares, heavy bloom.
- Cartoon outlines, toon shading, or stylised low-poly look (A1's terrain and props should read as realistic, not "cute").
- Loot-game visual language: glowing interactables, sparkle particles, treasure framing on wrecks.
- Horror beats: jump scares, monster reveals, screen-shake panic effects. Pressure/darkness tension stays "mild," per plan/DECISIONS.md.
- A third HUD accent colour, drop shadows, gradients, or skeuomorphic dials.
- Paid or unverified-licence assets; if a reference or texture isn't CC0/public-domain/OFL, don't use it (see §5 for the licence policy this doc follows).

---

## 5. Mood board — reference images

All images below are hosted at `docs/img/moodboard/`, downloaded at reduced resolution (each under 1 MB; originals are higher-res on NOAA's site) for repo size. All are U.S. federal government works via **NOAA Ocean Exploration** (oceanexplorer.noaa.gov), which states its expedition photos and video are in the public domain (17 U.S.C. §105) with credit requested but not legally required. No CC-BY or third-party-credited images were used, to keep the licensing chain unambiguous for a non-commercial open-source project.

| File                    | Subject / use                                                                                                         | Source URL                                                                                                                                               | Licence                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `titanic-bow.jpg`       | Titanic bow, hazy blue-green working-depth water column, turbidity/marine-snow reference, wreck silhouette reference  | https://oceanexplorer.noaa.gov/wp-content/uploads/2021/04/20210415-hires.jpg (NOAA/Russian Academy of Sciences, RMS Titanic Expedition 2003)             | Public domain (NOAA Ocean Exploration) |
| `titanic-rusticles.jpg` | Rusticles on Titanic hull — rust + marine-growth material reference for wreck props                                   | https://oceanexplorer.noaa.gov/wp-content/uploads/2020/10/20201014-hires.jpg (Lori Johnston, RMS Titanic Expedition 2003, NOAA Ocean Exploration)        | Public domain (NOAA Ocean Exploration) |
| `basalt-nodules.jpg`    | Manganese-encrusted basalt + polymetallic nodules — basalt/rock seabed material reference                             | https://oceanexplorer.noaa.gov/wp-content/uploads/2026/07/ex2605-dive08-basaltandnodules.jpg (NOAA Ocean Exploration, 2026 Cook Islands ROV Exploration) | Public domain (NOAA Ocean Exploration) |
| `champagne-vent.jpg`    | NW Eifuku "Champagne" vent — vent-field lighting (headlight-only illumination), mineral-stained basalt prop reference | https://archive.oceanexplorer.noaa.gov/explorations/14fire/background/missionplan/media/eifuku_champagne_vent_hires.jpg (NOAA Ocean Exploration)         | Public domain (NOAA Ocean Exploration) |
| `black-smoker-vent.jpg` | Black smoker chimney, 2016 Marianas expedition — deep-water darkness and vent-fluid glow reference                    | https://oceanexplorer.noaa.gov/wp-content/uploads/2025/08/1605vent-hires.jpg (NOAA Ocean Exploration, 2016 Deepwater Exploration of the Marianas)        | Public domain (NOAA Ocean Exploration) |
| `vent-chimney.jpg`      | Hydrothermal vent chimney close-up, dark plume against ROV lights                                                     | https://archive.oceanexplorer.noaa.gov/okeanos/explorations/ex1605/dailyupdates/media/may2-hires.jpg (NOAA Ocean Exploration, Okeanos Explorer EX1605)   | Public domain (NOAA Ocean Exploration) |
| `rov-control-room.jpg`  | ROV control room — dark room, many small glowing monochrome/cyan displays; HUD _mood_ reference only                  | https://oceanexplorer.noaa.gov/wp-content/uploads/2022/06/control-room-hires.jpg (NOAA Ocean Exploration, Escanaba Trough expedition)                    | Public domain (NOAA Ocean Exploration) |

Re-verify licence status before any commercial redistribution; NOAA's public-domain policy can change and image credit lines (e.g. co-sponsoring institutions) should be re-checked against the live page if these images are ever re-sourced at higher resolution.
