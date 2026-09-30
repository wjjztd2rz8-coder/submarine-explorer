# Attribution

This project uses third-party assets under the following licenses.
CC0 / Public Domain assets are listed for transparency but do not
legally require attribution.

## Ocean-current data

- NRL HYCOM GOFS 3.1 GLBy0.08 experiment 93.0, eastward and northward water velocity at 2024-01-15 12:00 UTC, https://www.hycom.org/dataserver/gofs-3pt1/analysis (subset service: https://ncss.hycom.org/thredds/ncss/GLBy0.08/expt_93.0). DoD Distribution A: approved for public release; distribution unlimited. Sampled into the 13 `data/currents/*.json` files on 2026-09-24 UTC. See [docs/currents.md](docs/currents.md) for depths, transformation and limitations.

## 3D Models

- "Rock 09" by Poly Haven (polyhaven.com), https://polyhaven.com/a/rock_09 (1K glTF: https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/rock_09/rock_09_1k.gltf) — CC0 1.0 (licence verified on the asset page and https://polyhaven.com/license). Used as `public/assets/models/rock_09.glb`: packed to a single GLB, JPEGs re-encoded at q85, root node scaled so the rock is 1 m long.
- "Barrel Stove" by Poly Haven (polyhaven.com), https://polyhaven.com/a/barrel_stove (1K glTF: https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/barrel_stove/barrel_stove_1k.gltf) — CC0 1.0 (licence verified on the asset page and https://polyhaven.com/license). Used as `public/assets/models/barrel_stove.glb`, a boiler stand-in: packed to a single GLB, JPEGs re-encoded at q80, root node scaled to 1 m diameter and laid on its side along local Z.
- Draco glTF decoder (`public/assets/decoders/draco/*`), copied from `three/examples/jsm/libs/draco/gltf/` — Google Draco, Apache License 2.0, https://github.com/google/draco
- Basis Universal KTX2 transcoder (`public/assets/decoders/basis/*`), copied from `three/examples/jsm/libs/basis/` — Binomial LLC Basis Universal, Apache License 2.0, https://github.com/BinomialLLC/basis_universal

## Textures

(none yet)

F1-WRECKS adds no third-party files. The wreck hulls, rusticles, debris kits and their
surface textures (plate seams, rust, planking, growth, normal maps) are generated in
code from procedural geometry and canvas noise (`src/world/props/wrecks/`). Wreck
dimensions and layout follow the public sources cited in each landmark's `sources.md`.

F1-GEO adds no third-party files either. The smoker mounds, carbonate towers, coral mounds,
stalactite alcove, pillow lava and scarps, their rock, flowstone, pillow and strata textures and
the smoke and shimmer plumes are generated in code from procedural geometry, canvas noise and
vertex-shader animation (`src/world/props/geo/`).

## Audio

No third-party audio files ship with the client. `ffmpeg` is unavailable in
this environment (needed to transcode/shrink downloaded CC0 candidates to a
web-friendly size) and Freesound's actual files require an authenticated API
download, so all cues (sonar ping, thruster, ballast hiss, hull creaks,
collision thud, discovery chime, emergency alarm, ambient depth beds) are
synthesised at runtime via the WebAudio API instead — see `docs/audio.md` for
the design and `src/audio/Cues.ts` / `src/audio/Loops.ts` for the generators.
This sidesteps licensing risk entirely and keeps the bundle smaller than any
sample file would. Candidate CC0 sources remain catalogued in
`docs/assets.md` §1.3/§3 if a future pass wants to replace a synthesised cue
with a recorded one (e.g. NOAA PMEL's public-domain hydrophone recordings, or
Freesound CC0 uploads with an authenticated download).

## Imagery

- "Titanic Bow" — NOAA Ocean Exploration / Russian Academy of Sciences, RMS Titanic Expedition 2003, https://oceanexplorer.noaa.gov/wp-content/uploads/2021/04/20210415-hires.jpg — Public domain, credit requested. Used in `docs/img/moodboard/titanic-bow.jpg`.
- "Rusticles" — Lori Johnston, RMS Titanic Expedition 2003, NOAA Ocean Exploration, https://oceanexplorer.noaa.gov/wp-content/uploads/2020/10/20201014-hires.jpg — Public domain, credit requested. Used in `docs/img/moodboard/titanic-rusticles.jpg`.
- "Basalt and Nodules" — NOAA Ocean Exploration, 2026 Cook Islands ROV Exploration, https://oceanexplorer.noaa.gov/wp-content/uploads/2026/07/ex2605-dive08-basaltandnodules.jpg — Public domain, credit requested. Used in `docs/img/moodboard/basalt-nodules.jpg`.
- "Champagne Vent, NW Eifuku" — NOAA Ocean Exploration, https://archive.oceanexplorer.noaa.gov/explorations/14fire/background/missionplan/media/eifuku_champagne_vent_hires.jpg — Public domain, credit requested. Used in `docs/img/moodboard/champagne-vent.jpg`.
- "Black Smoker Vent" — NOAA Ocean Exploration, 2016 Deepwater Exploration of the Marianas, https://oceanexplorer.noaa.gov/wp-content/uploads/2025/08/1605vent-hires.jpg — Public domain, credit requested. Used in `docs/img/moodboard/black-smoker-vent.jpg`.
- "Hydrothermal Vent Chimney" — NOAA Ocean Exploration, Okeanos Explorer EX1605, https://archive.oceanexplorer.noaa.gov/okeanos/explorations/ex1605/dailyupdates/media/may2-hires.jpg — Public domain, credit requested. Used in `docs/img/moodboard/vent-chimney.jpg`.
- "ROV Control Room" — NOAA Ocean Exploration, Escanaba Trough expedition, https://oceanexplorer.noaa.gov/wp-content/uploads/2022/06/control-room-hires.jpg — Public domain, credit requested. Used in `docs/img/moodboard/rov-control-room.jpg`.
- "Blue Marble Next Generation w/ Topography and Bathymetry" (December 2004) — NASA Earth Observatory / Reto Stöckli, NASA Goddard Space Flight Center, https://visibleearth.nasa.gov/images/73909/december-blue-marble-next-generation-w-topography-and-bathymetry (file: https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg) — Public domain (NASA imagery is generally not subject to US copyright; NASA requests acknowledgement as the source). Used as `public/assets/globe/earth-bmng-topo-bathy-4096.jpg`: resized from 5400×2700 to 4096×2048 and re-encoded as JPEG q88 (1.3 MB) for the globe mission select (C1).

## Fonts

- "Space Mono" — designed by Colophon Foundry (Google Fonts) — SIL Open Font License 1.1
- "Oxanium" — Google Fonts — SIL Open Font License 1.1
- "Orbitron" — designed by Matt McInerney (Google Fonts) — SIL Open Font License 1.1

## Vehicles

- All submarine, ROV and tether geometry, textures (canvas-generated tiling
  surfaces, decal atlas) and livery in `src/vehicles/` are procedural and
  original to this project. No third-party models or images are used. Hull
  names and numbers are fictional.

## Libraries

- three.js — MIT — https://threejs.org
- postprocessing (pmndrs) — Zlib — https://github.com/pmndrs/postprocessing
- (etc. — see docs/assets.md §1.6 for full list and versions)
