# Endurance site content: sources and notes (package C4)

Researched 2026-09-23. Files: `pois.json`, `guide.json`, `props.json`, `mission.json`,
`species.json` in this folder. Tile: `data/tiles/endurance` (GMRT Synthesis, falls back to
GEBCO-derived fill at this site; ~22 x 61 m cells, bbox N -68.5798 / S -68.8792 /
E -51.9890 / W -52.6492; `min_m` -3096.37, `max_m` -2915.30).

Endurance is a memorial/historic site per `plan/PHASE-C-CONTRACTS.md` SS5: `memorial_note` is
set in both `guide.json` and `mission.json`, tone is respectful throughout, and there is no
salvage framing anywhere. One correction to the usual pattern: unlike Titanic and Bismarck,
nobody died when Endurance sank (Shackleton got all 28 men off onto the ice first), so the
`memorial_note` says so explicitly rather than implying a gravesite -- she is a protected
monument, not a grave.

## Sources consulted

| #   | Source                                                                                                                  | URL                                                                                                                                                        | Used for                                                                                                                                                                                                                                                                                                       | Primary?                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | UK Antarctic Heritage Trust, "Endurance Shipwreck"                                                                      | https://ukaht.org/places/endurance-shipwreck/                                                                                                              | Discovery date/depth, HSM No. 93 (2019, predates discovery), 500 m -> 1,500 m protection radius, Conservation Management Plan (UKAHT + Historic England), Worsley "~4 miles south" figure, wreck condition                                                                                                     | **Yes** -- the organisation that leads the site's official Conservation Management Plan               |
| 2   | Falklands Maritime Heritage Trust, "Endurance is Found" press release (PR Newswire, 9 Mar 2022)                         | https://www.prnewswire.com/news-releases/endurance-is-found-301498505.html                                                                                 | Depth 3,008 m, "~4 miles south" of Worsley's position, Mensun Bound quote ("finest wooden shipwreck..."), name visible below the taffrail, Saab Sabertooth AUVs, S.A. Agulhas II, expedition leader Dr John Shears, Antarctic Treaty HSM protection, no-touch survey rule                                      | **Yes** -- FMHT's own official statement, organised and led the Endurance22 expedition                |
| 3   | Falklands Maritime Heritage Trust, "Endurance at the bottom of the sea"                                                 | https://fmht.co.uk/shackletons-endurance-revealed/endurance-at-the-bottom-of-the-sea/                                                                      | Hull "remarkably well preserved... cold and absence of wood-consuming marine parasites" (Bound quote), masts down, funnel toppled, damage around poop/waist, Voyis laser scanners, ~25,000 images, 44 m bow-to-stern 3D composite, deck items (flare gun, tableware, boot, linoleum)                           | **Yes** -- FMHT's own site                                                                            |
| 4   | Endurance (1912 ship) -- Wikipedia                                                                                      | https://en.wikipedia.org/wiki/Endurance_(1912_ship)                                                                                                        | Build (Framnæs yard, launched as Polaris, Dec 1912), dimensions (144 ft/44 m x 25 ft/7.6 m, 350 GRT), keel (4 layers of oak, 2.2 m), planking (oak/fir to 30 in, greenheart-sheathed), purchase/renaming Jan 1914, beset/abandoned/sank dates, captain Worsley, exact decimal coordinate 68°44′21″S 52°19′47″W | Secondary corroboration only                                                                          |
| 5   | Squire & Bell, "On the Location of Shackleton's Vessel Endurance" -- Journal of Navigation (Cambridge University Press) | https://www.cambridge.org/core/journals/journal-of-navigation/article/abs/on-the-location-of-shackletons-vessel-endurance/5F1AD80B3445C2653F1C24EAD4B7460D | Worsley's logged position 68°39′30″S 52°26′30″W; navigational-uncertainty analysis (few sights, chronometer drift, error of several nautical miles)                                                                                                                                                            | **Yes** -- peer-reviewed                                                                              |
| 6   | HISTORY, "Photos of the Wreck of Shackleton's Endurance"                                                                | https://www.history.com/articles/endurance-shackleton-shipwreck-discovery-photos                                                                           | Name + five-pointed star (from Polaris) on the stern, "the helm of the Endurance" photographed, apparent bow/keel-first impact, Sabertooth deployment/sonar-then-camera method                                                                                                                                 | Secondary (magazine), corroborates FMHT facts                                                         |
| 7   | Smithsonian Magazine, "Shackleton's 'Endurance' Shipwreck Is Teeming With Bizarre Ocean Life"                           | https://www.smithsonianmag.com/smart-news/shackletons-endurance-shipwreck-is-teeming-with-bizarre-ocean-life-180979719/                                    | Species on the hull: brisingid sea stars, glass sponges, a large white anemone near the wheel, sea squirts, a yellow stalked sea lily, a squat lobster (cf. Munidopsis, first regional record); quotes from BAS marine biogeographer Huw Griffiths and zoologist Louise Allcock                                | Secondary (magazine), names a national-institute (BAS) scientist as the source of the identifications |
| 8   | Smithsonian Magazine, "Wreck of Shackleton's 'Endurance' Gets New Protections"                                          | https://www.smithsonianmag.com/smart-news/the-endurance-shipwreck-gets-new-protections-amid-warming-antarctic-waters-180984683/                            | 500 m -> 1,500 m protection-radius expansion, reasons (warming waters, tourism/fishing traffic), ASPA designation goal                                                                                                                                                                                         | Secondary, corroborates source 1                                                                      |
| 9   | GMRT Synthesis (Ryan et al. 2009), doi:10.1029/2008GC002332                                                             | https://www.gmrt.org/                                                                                                                                      | Seabed depths, tile relief, the abyssal-plain and terrain-limit notes                                                                                                                                                                                                                                          | **Yes** -- the dataset itself; every depth cited "read from this tile"                                |

## Position and depth notes

- **Wreck position.** Wikipedia's 68°44′21″S 52°19′47″W (source 4) matches the numeric coordinate
  returned independently by two separate web searches attributing it to the discovery reporting
  (not just to Wikipedia itself); UKAHT and the FMHT press release (sources 1-2) both give the
  3,008 m depth and describe the position relative to Worsley's fix but do not publish decimal
  coordinates themselves. We use Wikipedia's coordinate because no primary source publishes a
  more precise one, and flag it `confidence: "high"` given the cross-checks and the close depth
  agreement below, not because Wikipedia is treated as primary.
- **Seabed-depth check** (this tile, bilinear sample of `heightmap.bin`):

  | Point                      | lat, lon               | GMRT/GEBCO seabed | Published                     |
  | -------------------------- | ---------------------- | ----------------- | ----------------------------- |
  | endurance-hull (wreck)     | -68.739167, -52.329722 | 3,000.3 m         | 3,008 m (sources 1-4)         |
  | endurance-worsley-position | -68.658333, -52.441667 | 2,976.6 m         | -- (not separately published) |
  | `data/landmarks.json` pin  | -68.7297, -52.319      | 3,003.9 m         | 3,008 m                       |
  | Tile deepest cell          | -68.5807, -52.2035     | 3,096.4 m         | (GMRT/GEBCO only)             |
  | Tile shallowest cell       | (tile-wide max)        | 2,915.3 m         | (GMRT/GEBCO only)             |

  The wreck-position reading (3,000.3 m) is only 7.7 m shallower than the published 3,008 m --
  closer agreement than Titanic's tile achieved, despite this tile's coarser GEBCO-derived fill
  (see below). The `data/landmarks.json` pin sits about 1.14 km from the Wikipedia coordinate but
  reads a very similar depth, because the whole site is nearly flat (see the `abyssal-plain`
  guide entry and POI). We used the more precisely sourced Wikipedia coordinate for the wreck
  POI/prop rather than the landmarks.json pin.

- **Worsley's position and the discrepancy we flagged.** The peer-reviewed Journal of Navigation
  paper (source 5) gives Worsley's own logged fix, 68°39′30″S 52°26′30″W. Using this tile's
  planar/haversine maths, that point is **~10.06 km** from the wreck's published coordinate, at a
  bearing of about 153° (south-south-east) from Worsley's position to the wreck. UKAHT (source 1)
  and other press coverage instead say "~4 miles (6.4 km) south." We could not reconcile the two
  figures from the sources gathered this session -- possibilities include the press figure using
  a different (rounded, or navigationally-adjusted) reference point for "Worsley's position" than
  the raw log coordinate the peer-reviewed paper analyses, but no source consulted states which.
  Rather than silently pick one, `guide.json`'s `worsley-position` entry states both and says so.
  This is the one open discrepancy in this pack; see "Not verified / open" below.
- **Source of terrain smoothness.** `data/tiles/endurance/meta.json`'s `source_url` requests the
  GMRT GridServer's `topo` layer at `resolution=max` for this bbox; the returned grid's relief
  (min -3,096.37 m, max -2,915.30 m across ~70 x 33 km, a span of under 200 m) is consistent with
  GMRT falling back to its GEBCO-derived global fill here rather than a dedicated multibeam swath,
  matching `plan/PHASE-C-CONTRACTS.md` SS1's note for this landmark ("GEBCO fill only (smooth
  seabed)"). This is stated as inference from the data's own smoothness, not from a source that
  says so explicitly -- no source consulted discusses this tile's specific data provenance beyond
  the GMRT Synthesis citation itself.

## Fabricated vs. sourced

| Item                          | Sourced (measured/published)                                    | Reconstructed / estimated                                                      |
| ----------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Seabed terrain                | GMRT Synthesis (real, if coarse, data)                          | Render-time detail noise (engine)                                              |
| Wreck position                | Published coordinate (2 independent numeric confirmations)      | --                                                                             |
| Wreck depth                   | 3,008 m published; terrain reads 3,000.3 m                      | --                                                                             |
| Hull length / beam            | 44 m / 7.6 m (published ship dimensions)                        | Box shape; 8 m height (unsourced estimate)                                     |
| Hull heading                  | "Upright... intact" (qualitative)                               | Exact 0° value (arbitrary; no heading published)                               |
| Hull end shapes               | "Intact" (not broken, unlike Titanic/Bismarck)                  | `[prow, rounded]` chosen instead of a torn `cut` end                           |
| Stern nameplate/star          | Location ("below the taffrail"), meaning (old name Polaris)     | Exact offset from hull centre (~20 m, illustrative)                            |
| Wheel                         | Photographed by Endurance22; marine life nearby (named species) | Exact position; debris-cluster stand-in shape; individual animals not modelled |
| Masts/funnel damage           | Down/toppled, damage near poop and waist (qualitative)          | Debris-cluster position and size (illustrative)                                |
| Worsley's position            | Logged coordinate (peer-reviewed source)                        | -- (real terrain marker, no structure)                                         |
| Abyssal-plain POI             | GMRT/GEBCO depths                                               | Interpretation of why the grid is this smooth (inference, flagged as such)     |
| HSM No. 93 / protection radii | Published (2 sources)                                           | --                                                                             |
| Spawn point                   | --                                                              | Chosen for gameplay: 1.5 km north of the wreck, heading 180°                   |

## Not verified / open

- **Worsley-to-wreck distance discrepancy** (see above): our own ~10 km/153° figure from the
  peer-reviewed log coordinate vs. the commonly quoted "~4 miles/6.4 km south." Both are reported
  in `guide.json`'s `worsley-position` entry rather than silently choosing one.
- **Ship's actual heading/orientation on the seabed** is not published in any source consulted;
  `heading_deg: 0` on the hull prop is arbitrary and flagged as such in `props.json` and
  `guide.json`.
- **Hull height above the seabed** (8 m in `props.json`) has no published source; it is an
  estimate for a 350 GRT wooden barquentine, flagged as such.
- **Exact positions of the nameplate, wheel, and fallen rigging** relative to the hull are not
  published; all are placed at illustrative offsets (15-25 m) from the hull centre, each noted in
  `pois.json`/`props.json`.
- species.json's animal placements are invented and cannot be corroborated against the
  Endurance22 wildlife footage (which does not publish coordinates for individual sightings on
  the hull); see species.json's own `note` for the OBIS-side limitations (empty at the tile's own
  bbox and at any depth near 3,008 m; widened to the north-western Weddell Sea shelf, "any" rank).

## Dropped facts

- The precise number of crew who camped on the ice varies slightly across popular sources (some
  say "27 men" for the ice-camp count, distinct from the ship's complement); we use the ship's
  published complement, 28 (source 4), and do not state a separate ice-camp figure.
- A specific date for when the Conservation Management Plan was submitted to the Antarctic Treaty
  Consultative Meeting (a May 2024 figure appeared in one search summary but was not independently
  confirmed by fetching a primary document this session) is not used in `guide.json`.
- Individual artefact photographs mentioned by FMHT (flare gun, tableware, a single boot, a roll
  of linoleum) are named in this file for context but are not placed as separate POIs/props: no
  coordinates are published for any of them, and the pack already has a debris POI covering the
  general condition of the wreck.
