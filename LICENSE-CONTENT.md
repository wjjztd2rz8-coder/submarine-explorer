# Content licence

Bathyline has three kinds of material, each under its own terms.

| What                                                                                                                                                                                               | Licence                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Source code: `src/`, `tools/`, `tests/`, configuration and build files                                                                                                                             | MIT, see [`LICENSE`](LICENSE)                                                                                               |
| Original written content: the text in `data/landmarks/**` (mission briefs, points of interest, field-guide entries, debriefs, species notes) and the documentation (`docs/`, `README.md`, `plan/`) | [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/) |
| Third-party data and assets: bathymetry, species occurrence records (OBIS), 3D models, textures, imagery, fonts, audio, vendored libraries                                                         | Their own licences, listed in [`ATTRIBUTION.md`](ATTRIBUTION.md)                                                            |

## CC BY-SA 4.0 for original content

Copyright (c) 2026 Vijay Krishnan and Bathyline contributors.

You may share and adapt the original written content for any purpose,
including commercially, provided that you:

- **give credit**: name "Bathyline contributors", link to the project
  and to this licence, and say whether you made changes; and
- **share alike**: distribute your adaptations under CC BY-SA 4.0 or a
  compatible licence.

The full legal code is at <https://creativecommons.org/licenses/by-sa/4.0/legalcode>.

Facts are not copyrightable. Depths, coordinates, dates and species names in
`data/landmarks/**` are drawn from the sources cited next to them; the licence
covers our wording and selection, not the underlying facts or the cited works.

## Bathymetry (GMRT and GEBCO) must stay attributed

The heightmaps in `data/tiles/**` are derived from the Global Multi-Resolution
Topography (GMRT) synthesis, with GEBCO grid fill where GMRT has no survey
data. They are **not** covered by CC BY-SA 4.0 from this project. GMRT is
licensed CC BY 4.0, which requires attribution; every tile carries the
citation in its `meta.json` (`attribution` field) and the game HUD shows it on
screen. Anyone who
redistributes the tiles or screenshots of them must keep that credit, for
example:

> Ryan, W.B.F., et al. (2009), Global Multi-Resolution Topography synthesis,
> Geochem. Geophys. Geosyst., 10, Q03014, doi:10.1029/2008GC002332.

See `docs/data-sources.md` for the exact citation and terms of each source.

## Third-party assets keep their own licences

Models, textures, imagery, fonts, audio and vendored code (for example the
Draco decoder in `public/assets/decoders/`) are used under the licences listed
in [`ATTRIBUTION.md`](ATTRIBUTION.md), not under MIT or CC BY-SA from this
project. `tools/check_attribution.py` (run in CI) fails the build when a file
under `public/assets/` or `public/audio/` has no row there.
