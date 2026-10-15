# R-ci-triage: hosted CI red on main (run 38682281312)

27 failing cases reproduced locally (one only under CI=1). One app fix, the rest spec repairs.

| Spec                                      | Cause                                                                                                                     | Fix                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| d-photo                                   | App regression: a photo of an undiscovered Journal entry no longer showed (hero only on discovered entries, grid needs 2) | `Journal.ts`: locked entries render the hero photo too                           |
| f2-progress migrated cosmetics            | Spec: `homeReady` without the paused-clock flag under a paused clock                                                      | `homeReady(page, true)`                                                          |
| f2-modes, hud-touch Daily audit           | S-briefing-advanced made Advanced switches 16 px text-sized by design                                                     | Spec checks toggle and segments at 44, switches at 16                            |
| f-title-layout, f-title-scene (landscape) | S-briefing-advanced sets phone Home buttons to 44 px (44.5 rendered)                                                      | Spec floor 44                                                                    |
| f-verify-1000 great-blue-hole             | S-scan-reach min depth (10 m) and surface seabed floor: driver never dived; clearance float tolerance 1e-6                | Driver floods while in radius and not in range and keeps closing; tolerance 5 cm |
| hud-touch animal guidance                 | Spec hack froze `overlay.update`, which also runs the guidance slot clock, so the timed hint never expired                | `setScanCardSuppressed` keeps ticking the slot                                   |
| hud-touch catalog tutorial (monterey)     | `away` teleport landed where an urgent SEABED PROXIMITY warning owned the slot                                            | `away` skips places with an urgent warning                                       |
| content-missions great-blue-hole          | Only with CI timing: real-time buoyancy lifted the sub above the 10 m scan depth before the scan                          | Vehicle step held at the scan pose                                               |

No unresolved cases. Verified: targeted specs also under CI=1 with retries=0, full gates.
