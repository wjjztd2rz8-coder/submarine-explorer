# Attribution

This project uses third-party assets under the following licenses.
CC0 / Public Domain assets are listed for transparency but do not
legally require attribution.

## 3D Models

(none yet)

## Textures

(none yet)

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

## Fonts

- "Space Mono" — designed by Colophon Foundry (Google Fonts) — SIL Open Font License 1.1
- "Oxanium" — Google Fonts — SIL Open Font License 1.1
- "Orbitron" — designed by Matt McInerney (Google Fonts) — SIL Open Font License 1.1

## Libraries

- three.js — MIT — https://threejs.org
- postprocessing (pmndrs) — Zlib — https://github.com/pmndrs/postprocessing
- (etc. — see docs/assets.md §1.6 for full list and versions)
