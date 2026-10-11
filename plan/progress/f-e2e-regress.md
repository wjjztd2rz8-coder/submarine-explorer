# f-e2e-regress

Status: done.

Full e2e on main showed 3 failures.

## 1290 lost-city low/high landscape (844x390)

Cause: not the 28 px scan-stack shift (phone landscape overrides the top to 58 px). The scan card on landscape is 58-115 px tall region; after f-lostcity-tower (ea10c39) moved the opening to chase arm 66 m / offsetY 8, the tower tip sat at y 117-118 px, inside the 8 px gap (needs > 123.4). The old pass predates the taller card.

Fix: `lostCityArcadeOpening` chaseOffsetXM -20 to -8 and chaseOffsetYM 8 to 30 in `src/core/config/camera.ts`. Chase radius stays 66 (pinned by the spec and unit tests). offsetY 32+ breaks the portraitOpening unit test (sub drifts into the touch controls), so 30 is near the ceiling; margin on landscape high is about 0.6 px of the 8 px gap (deterministic under the paused clock). Tip now at y 124-129 px (landscape), 290 px (desktop vs card bottom 236). Visual check: desktop and landscape screenshots, tower and neighbours still read well, card clear.

## f-lowtier-followups Blake reticle

Cause: 7b792bf (card, reticle and Scan share one target) makes the reticle follow the scan candidate, which now opens on-axis at (195, 452) instead of behind SCAN. The test premise (reticle hidden at opening) no longer holds. Product behaviour is correct.

Fix (test setup, same three invariants): assert visible at opening, slide the SCAN button over the contact and expect hidden, move the controls away and expect visible with no overlap, restore and expect visible.
