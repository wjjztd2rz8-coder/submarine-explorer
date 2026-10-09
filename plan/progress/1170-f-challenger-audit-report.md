# 1170 Challenger Deep / Endurance — audit report

Small site-specific config and Journal data fixes implemented. Fresh visual acceptance remains blocked by the sandbox's denial of local server binds. Hero geometry, Lost City and Blue Hole entries/files are unchanged.

## Evidence and empty/flat inventory

Inspected all six images from the exact historical golden `2026-10-09-191533`. Copies and the original pose manifest are in `.cache/1170/baseline/`.

| Frame                  | Observation                                                                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Challenger 1, opening  | Broad brown/olive plane with distant texture fading away; small orange lander below centre; large submarine dominates the right. Small pale amphipod groups are present, including a weak patch far left of the lander. No obvious large fauna or meaningful near-field scale cues. |
| Challenger 2, approach | Amphipod groups, sparse stones/mounds and fine sediment texture are visible. The lander reads as orange blocks. Open floor dominates; this is not an empty spawn table.                                                                                                             |
| Challenger 3, detail   | Strong near-field brightness washes the floor pale cream; very busy fine texture, cropped lander at top. Almost all the viewport is sediment, so this frame is poor evidence for the hero's complete silhouette.                                                                    |
| Endurance 1, opening   | Upright wreck and benthic animals are present. Flat plane/horizon fills the backdrop. Dense bright marine snow competes with the small hull silhouette.                                                                                                                             |
| Endurance 2, approach  | Hull, deck, debris and fauna have readable structure. Heavy snow obscures details. Mud looks textured and exaggerated close to the camera.                                                                                                                                          |
| Endurance 3, detail    | Visible timber planking and attached fauna; near-field highlights wash out wood/animal colour. Cropped hull and bright floor dominate.                                                                                                                                              |

The older checked-in `F-GOLDEN-950` references are much darker and predate the cited golden; they are not after-fix evidence. Authentic flat sediment should be retained. Landmark silhouette work and documentary wreck/lander geometry belong to their owners. Endurance snow/sonar work is left to the separate 1180 task.

## Config changes and decisions

| Setting                                    | Before                  | After       | Purpose                                                                  |
| ------------------------------------------ | ----------------------- | ----------- | ------------------------------------------------------------------------ |
| Challenger staged group ahead / side       | 19 / 9 m                | 24 / 5 m    | Bring the group nearer the lander approach and farther from the vehicle. |
| Challenger staged count, Low / other tiers | 12 / 18                 | 18 / 30     | A more legible aggregation without waiting for the random rare swarm.    |
| Challenger ripple wavelength               | 0.55 m inherited        | 1.2 m       | Separate sparse surface crests from fine silt noise.                     |
| Endurance ripple wavelength / strength     | 0.55 m / 0.35 inherited | 0.8 m / 0.2 | Quieter mud surface cues around the wreck.                               |

These ripple settings are authored material cues, not measurements of either site's real seabed. They change shading, not bathymetry. The animal group retains existing placement-band, terrain, collision and tier-budget checks. Its Journal provenance remains **Game addition**; rendered animal size and staged counts are not biological measurements.

Lamp-radius audit: site multipliers currently retain 2,000/2,500 m spotlight cutoff distances (Realistic/Enhanced) and expand local fill ranges by 1.5. At fog densities near 0.01–0.012 the distant cutoff has little bearing on opening readability. Existing close frames are already very bright. No lamp-radius or exposure change was made without fresh visual evidence; increasing them would not address the documented missing scale cues. Foreground glare and tonal separation still need rendered review.

## Journal facts checked

- Corrected the stale 8,075 m global fish fact to the 8,336 m snailfish observation in the Izu–Ogasawara Trench, dated to the 2023 publication; retained the distinction from Challenger Deep floor fauna. [Jamieson et al., UWA publication record](https://research-repository.uwa.edu.au/en/publications/new-maximum-depth-record-for-bony-fish-teleostei-scorpaeniformes-/).
- Corrected the wildlife card's amphipod specimen length to 2–5 cm. Wood-digesting cellulase and activity under 100 MPa / 2°C are supported. ASHURA's 185 individuals, 10,897 m and September/2.5 h account follow Methods; Results gives conflicting date/duration, recorded in site sources. [Kobayashi et al. 2012](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0042727).
- Catalogue now matches the guide's 2019 dive schedule: three dives in the Eastern Pool, one in the Central Pool. This does not remove the general three-basin description. [Five Deeps expedition release](https://fivedeeps.com/wp-content/uploads/2019/05/FDE-Challenger-Release-FINAL-5132019.pdf).
- Leggo's 2014 station coordinates and 10,929 m deployment are supported by the expedition's cruise page; no POI or reconstruction geometry changed. [Schmidt Ocean Institute cruise record](https://schmidtocean.org/cruise/expanding-mariana-trench-perspectives/).
- Retained the distinction between Sirena Deep's 10,641 m xenophyophore observation and Challenger Deep. [Scripps expedition account](https://scripps.ucsd.edu/news/research-highlight-scientists-id-giant-amoebas-extreme-deep).
- Retained Challenger's dated 10,935 ± 6 m research figure separately from the approximately 10,931 m deepest sampled tile cell. [Greenaway et al., NOAA repository record](https://repository.library.noaa.gov/view/noaa/33477).
- Endurance's upright preserved hull, 3,008 m depth, 5 March 2022 discovery and no-contact expedition survey remain supported. [FMHT discovery release](https://www.prnewswire.com/news-releases/endurance-is-found-301498505.html).
- Corrected Endurance's Polaris star to **below** the name using the expedition's own account. [Endurance22, 9 March 2022](https://endurance22.org/expedition-blog/9-march-2022).
- Corrected the protection fact cards: 500 m was the 2022 extent; 1,500 m took effect on 28 October 2024. The latter is no longer merely proposed. [Measure 18 (2022)](https://www.ats.aq/devAS/Meetings/Measure/768), [Measure 18 (2024)](https://www.ats.aq/devAS/Meetings/Measure/830?lang=e).
- Replaced the claim that no dedicated multibeam survey exists with a statement about the coarse grid used here. Flat soft mud, pockmarks, small mounds and occasional dropstones are documented. Removed the suggestion of uninterrupted searching for 107 years. [UKAHT / Historic England Conservation Management Plan, April 2024, §2.2](https://www.enduranceshipwreck.org/s/CMP_Endurance_amends_April24-4.pdf).

Coordinate discrepancies already documented in site sources remain unchanged: published wreck versus Worsley positions imply roughly 10 km, while popular expedition summaries report four miles. Catalogue/POI coordinates and reconstructed headings need owner review before any geometry-affecting changes.

## Verification and limitations

Two rounds attempted the same command:

```sh
GATES_CONFIG_MODE=writable GOLDEN_SITES=challenger-deep,endurance GOLDEN_LAYOUTS=desktop,portrait tools/golden.sh
```

Both builds succeeded; both preview launches failed with `listen EPERM: operation not permitted 127.0.0.1:4298`. No fresh PNGs were produced. Historical images must not be presented as verification of these fixes.

Focused existing checks passed before and after config changes: four test files, 31 tests, covering deep opening placement, life tables, portrait composition and work lights. The 60-second deep opening simulations retain 18 amphipods on Low and 30 on Medium/High/Ultra, versus 5/8 Endurance deck anemones. All tiers pass hull clearance, scanner acquisition, wildlife depth and budget checks, and desktop/portrait sightlines. Challenger's simulated minimum seabed clearance is 22.32–22.47 m and visible hull clearance is 15.74–15.91 m. These checks establish placement and persistence, not final pixel readability.

Full gates ran with `GATES_CONFIG_MODE=writable PW_PORT=4273 tools/gates.sh`: build, Python (148 tests), strict content (all 13 sites), attribution and Prettier passed. Unit run passed 1,623 tests and failed one existing biome snapshot because the intended config changes require new hashes. Updated only Challenger/Endurance's six biome/uniform hashes; the complete three-test isolation file now passes without snapshot-update mode. All other site hashes, terrain buffers, shader hashes and shared placement expectations are unchanged.

Both smoke and project-base browser gates failed before executing tests, unable to start their preview server. A direct run of the same preview command confirmed `listen EPERM` at `127.0.0.1:4273`.

Final static rerun after the snapshot update: `GATES_CONFIG_MODE=writable PW_PORT=4273 tools/gates.sh --no-e2e` exited **0**. Config, build, **1,624 unit tests across 163 files**, **148 Python tests**, strict content validation, attribution and Prettier all passed. `git diff --check` also passed. Explicit scope checks confirmed only the Challenger catalogue fact, hadal-amphipod wildlife card and two requested biome entries changed in shared data/config; no hero geometry or protected-site entries/files changed.

Logs and artifacts: `.cache/1170-gates.log`, `.cache/1170-static-gates.log`, `.cache/1170-final-unit.log`, `.cache/1170-isolation-verify.log`, `.cache/1170-round2-golden.log`, `.cache/1170-browser-server.log`, `.cache/verify-1000-deep.json`, `.cache/1170/baseline/`.

Fresh desktop/portrait goldens and browser gate completion remain required in an environment that permits local preview servers. These changes have placement/simulation coverage and factual sources, but no fresh visual signoff.
