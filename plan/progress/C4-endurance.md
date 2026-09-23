# C4 Endurance finish (this session)

Followed `plan/PHASE-C-CONTRACTS.md` SS1-3, SS5 (Endurance is a memorial/historic site: `wreck`
type, `wreck` preset, GEBCO fill only / smooth seabed). Only edited
`data/landmarks/endurance/` (all 6 files, new) plus this note; did not touch `src/`, `tests/`
or `data/landmarks/lost-city/`.

## What was done

1. Read `data/landmarks.json`'s `endurance` entry and `data/tiles/endurance/meta.json`, and
   sampled `heightmap.bin` directly (small inline Python, same bilinear convention as
   `validate_landmark.py`) to find the real terrain: the whole ~70 x 33 km tile is unusually flat
   (relief `min_m` -3,096.37 to `max_m` -2,915.30, under 200 m total), consistent with the
   contract's note that this site is "GEBCO fill only" rather than a dedicated multibeam survey.
   The seabed at the wreck's published coordinate reads 3,000.3 m vs. the published 3,008 m --
   only 7.7 m off, closer agreement than Titanic's tile achieved despite the coarser data here.
2. Sourcing: fetched and read UKAHT's own site, FMHT's own press release (PR Newswire) and FMHT's
   own survey write-up (all primary/authoritative -- the organisations that led Endurance22 and
   now manage the site), a peer-reviewed Journal of Navigation paper on Worsley's 1915 fix, and
   Wikipedia/HISTORY/Smithsonian as secondary corroboration. Every `guide.json` entry cites >= 2
   sources, at least one primary, per the sourcing bar. Full table with a Primary?/Secondary?
   column in `sources.md`.
3. `pois.json` (6 POIs): the main hull (primary), the stern nameplate/pole-star (primary, ~20 m
   from the hull -- both required objectives are well inside the ~3 km pacing guideline since
   they're two features of one small wreck), the ship's wheel and colonising marine life
   (secondary), fallen masts/funnel damage (secondary), Worsley's 1915 logged position (secondary,
   optional, ~10 km away -- real terrain, `reconstruction: false`, no prop), and a real-terrain
   "abyssal plain" geology POI 2 km west (secondary, `reconstruction: false`) that explains the
   GEBCO-fill limitation to players.
4. `props.json` (3 props): `procedural:hull-block` for the intact hull -- unlike Titanic/Bismarck
   this ship is reported intact, so `ends: ["prow", "rounded"]` (pointed bow, rounded counter
   stern) rather than a torn `cut` end; two `procedural:debris` stand-ins for the fallen
   rigging/funnel and for the wheel (the engine has no wheel or marine-growth shape). All flagged
   `reconstruction: true` with notes explaining every estimated dimension (hull height 8 m is
   unsourced; heading 0° is arbitrary, no source gives the real orientation).
5. `guide.json` (8 entries, memorial_note at top level): overview, the hull, the stern
   nameplate/star, the wheel and hull-colonising wildlife, structural damage, Worsley's position
   (including an honestly-flagged discrepancy, see below), the abyssal plain / terrain-limit
   explanation, and a "protected monument, not a grave" entry -- Endurance is unusual among the
   contract's three memorial sites in that nobody died when she sank (Shackleton got the crew off
   onto the ice first), so the memorial_note says so explicitly rather than implying a gravesite.
6. `species.json`: the tile's own bbox returned 0 taxa at every rank (like Challenger Deep's hadal
   depths -- OBIS has essentially no deep Weddell Sea records). Widened to a ~550 x 280 km
   north-western Weddell Sea shelf/slope box with `--rank any` (no depth filter, since even that
   wide box returns 0 taxa within 500 m of the wreck's 3,008 m): 37 taxa, 316 records, mostly
   brittle stars and sea stars (Ophiuroidea/Asteroidea, matching `data/landmarks.json`'s
   `notable_species`) sampled at shelf depths (tens to ~90 m), far shallower than the wreck. Both
   widenings, the empty tile-bbox/depth-filter results, and the shallow-vs-3,008 m mismatch are
   spelled out in `species.json`'s `note`. The actual wreck-colonising fauna used in `guide.json`
   (sea stars, sponges, anemone, sea squirts, a squat lobster) comes from Endurance22's own
   photographs (Smithsonian, HISTORY), not from OBIS.
7. `mission.json`: `hull_class: "B"` (same as Titanic; crush -4,500 m, ~1,500 m of margin over the
   3,008 m site, no warning band involved), `environment.preset: "wreck"`, spawn 1.5 km north of
   the wreck at the surface, heading 180°. `memorial_note` matches guide.json's (nobody died;
   still a protected monument). Two required objectives (hull, stern nameplate) are ~20 m apart;
   four secondary objectives include the two real-terrain-only detours.

## Validator and tests

```
$ python3 tools/validate_landmark.py endurance --strict
OK: endurance, 0 error(s), 0 warning(s)
```

0 errors, 0 warnings -- no unavoidable warning to explain this time (Class B clears the site by a
wide margin, unlike Challenger Deep's Class C). `python3 tools/validate_landmark.py --all --quiet`
shows no regressions in the other four packs. `npm run test:py` -> 107 tests, all pass.

## Per-entry source list (all URLs fetched and read this session; full table in sources.md)

- **overview** -- UKAHT, FMHT press release (PR Newswire), Wikipedia, GMRT (Ryan et al. 2009).
- **wreck-hull** -- UKAHT, FMHT press release, FMHT survey page, Wikipedia.
- **stern-nameplate** -- FMHT survey page, HISTORY.
- **helm-and-life** -- HISTORY, Smithsonian (wildlife article, quoting a BAS scientist).
- **structural-damage** -- FMHT survey page, HISTORY, Wikipedia.
- **worsley-position** -- Squire & Bell 2022, *Journal of Navigation* (peer-reviewed), UKAHT.
- **abyssal-plain** -- GMRT (Ryan et al. 2009), Wikipedia.
- **protection** -- UKAHT, FMHT press release, Smithsonian (protection-update article).

## Dropped facts (full list in sources.md)

- A separate "27 men on the ice" figure sometimes quoted alongside the ship's 28-man complement
  is not used; only the sourced complement (28, all survived) appears.
- A May 2024 ATCM submission date for the Conservation Management Plan, seen only in an
  unconfirmed search summary, is not stated in `guide.json`.
- Individual named artefacts from FMHT's photos (flare gun, tableware, a boot, a linoleum roll)
  are mentioned in `sources.md` for context only -- no coordinates are published for any of them,
  so none became a separate POI/prop.

## Not verified / open

- **Worsley-to-wreck distance.** UKAHT and other coverage say "~4 miles (6.4 km) south" of
  Worsley's position. Computing the distance ourselves from the peer-reviewed paper's own logged
  coordinate (68°39′30″S 52°26′30″W) to the wreck's published coordinate gives ~10.06 km at
  bearing ~153°. We could not reconcile the two figures with the sources gathered this session and
  did not want to silently pick one, so `guide.json`'s `worsley-position` entry states both
  explicitly and flags the discrepancy, and `sources.md` documents the calculation.
- The ship's actual heading/orientation on the seabed, the hull's height above the seabed, and the
  exact positions of the nameplate/wheel/rigging relative to the hull are not published anywhere
  found; each is flagged as an estimate or illustrative placement in `props.json`/`pois.json`.
