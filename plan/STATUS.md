# Status (2026-10-25 night, joint review with Sol)

**Stage:** about 83% to 1.0; ~5 weeks (4-6 range). Since the last review only small merges (pointer-lock teardown, Settings "Aa" text size, banner stars fix); no visual change. Tag f65 stands.

## 1.0 table

| Requirement                               | State                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Five heroes beautiful (4 of 5)            | None at 4 on beauty: Titanic 3.5, Lost City 3, Blue Hole 3, Beebe 3.5, Monterey 3.5 (readable 3.5-4)           |
| Other eight sites coherent                | Challenger 3.5, Endurance 3, Blake 3.5; Kama subject, Hunga and Axial chimneys still weak                      |
| New player understands first five minutes | Journey tests stop after one discovery; re-run through the second objective queued (4310), phone retest needed |
| Acceptable Low-tier phone performance     | iPhone 17 Pro: Low great; weaker phones untested                                                               |
| Hosted CI green, releases tagged          | Latest tag f65; CI check of newest main queued (4300); Pages needs green CI                                    |
| Code simple enough                        | Standing S-verify items; S-collision seam fix queued (4320)                                                    |

## Done recently

Aa text-size button in Settings, pointer-lock teardown fix, shark floor, mission start position, life-birth water limits, dive rating ignoring unresolved objectives, clean audits of scan, startup rollback and tile georeferencing.

## Left

Blue Hole and Lost City silhouettes (next Claude art package), Kama/Hunga/Axial readability, Journal reward photo hidden by the sub on phones, journeys through objective two, phone retest, green CI tag.

## Needs owner

- Delete the four S-collision expected-failure cases?
- A short phone retest on the newest build (Aa button, first five minutes).
