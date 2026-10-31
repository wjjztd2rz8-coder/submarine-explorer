# V-beebe-exposure

## Changes (data only, no code)

- data/landmarks/beebe-vent-field/mission.json, environment.overrides.hullLight 0.27 -> 0.9. This was the main cause of the dark hull: the vent preset multiplies the whole hull by it.
- data/landmarks/beebe-vent-field/site.json, atmosphere.lamps 0.45/1/0.35/1 -> 2.4/1.2/2.4/1.3 (intensity, distance, fillIntensity, fillDistance), in line with the other deep sites (Titanic 3.0, Hunga 3.0). The seabed now gets a readable lamp pool.

## Measured (golden mission opening, desktop, tools/golden-readable.mjs)

|        | Scene Y | Sub Y | Scene/sub |
| ------ | ------: | ----: | --------: |
| Before |    1.6% |  3.1% |      0.51 |
| After  |    2.6% | 14.7% |      0.18 |

Portrait after: scene 3.0%, sub 3.1% (the sub is partly in shadow under the camera; hull reads by eye). Challenger opening unchanged (5.3% / 11.6%); no shared code touched.

## Tried and rejected

- Lamps alone (0.45 -> 2.4/3.0): seabed pool appeared but the sub stayed 3.4%; hullLight, not light supply, was the limit.
- A site hemisphere fill (intensity 3 and 6): sub only 3.7-4.2%, lifted terrain; dropped. ambientFill already supplies the fill.
- Lamp distance 1.7: no visible change over 1.2; reverted.

## Screenshots

.cache/golden/2026-10-31-002219 (desktop after), .cache/golden/2026-10-31-002410 (portrait after, with Challenger).

## Simplicity

Two existing per-site data entries retuned; no site branch, no new fields, no config mutation. No cut.

## Honest rating

The hull now reads (14.7%, form visible); seabed is readable in the lamp pool (about 25 m) and the deep-black water is kept. Short of the ~20% sub / 30 m seabed target: the scene is still 2.6% because the seabed beyond the pool stays dark by design. About 6.5/10 for the Beebe opening.

## Left

Seabed beyond the lamp pool, and the portrait sub at 3%, would need a brighter ambientFill or a lamp-reach change in the shared Headlights code.
