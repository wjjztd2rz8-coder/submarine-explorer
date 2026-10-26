# Status (2026-10-26, joint review with Sol)

**Stage:** about 83% to 1.0; 4-6 weeks. Since the last review: Aa clipping CI fix, journeys second-leg spec, Lost City High plume capped (4350), Kamaʻehuakanaloa opening 130 m, Aa bug hunt (clean), eight-site numerics report. Scenes are otherwise unchanged. Tag f66 stands (green SHA); main is red on two moving specs.

## 1.0 table

| Requirement                               | State                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Five heroes beautiful (4 of 5)            | None at 4: Titanic 3.5, Lost City 3, Blue Hole 3, Beebe 3.5, Monterey 3.5 (readable 3.5-4)                            |
| Other eight sites coherent                | Challenger 3.5, Endurance 3; Axial chimneys, Kama subject and Hunga's dark subject still weak                         |
| New player understands first five minutes | Local journeys run through two scans, Journal and debrief on all viewports; Journal has ghost text behind it (queued) |
| Acceptable Low-tier phone performance     | iPhone 17 Pro: Low great; High Lost City stutter unmeasured after the plume cap; weaker phones untested               |
| Hosted CI green, releases tagged          | RED: journeys (second leg) and settings Aa specs fail on a different case each run; fixes queued (4380, 4390)         |
| Code simple enough                        | Standing S-verify items; four S-collision cases await an owner decision                                               |

## Done recently

Aa text size button, Aa clipping fix at 150%, pointer-lock teardown, journeys through objective two (local), Lost City plume cap, Kama opening 130 m, eight-site spawn numerics.

## Left

Green hosted CI, Blue Hole and Lost City silhouettes, Axial/Kama/Hunga lighting, Journal compositing and debrief headline, real-phone Low-tier retest, Monterey apron pebbles, Endurance hull.

## Needs owner

- Delete the four S-collision expected-failure cases? (Sol: deleting tests does not fix the behaviour.)
- A short phone retest on the newest build (Aa button, High Lost City plume, first five minutes).
- Axial scan radius: decided by the director (rules can bend); tell me if you disagree.
