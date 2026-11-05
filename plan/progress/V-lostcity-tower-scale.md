# V-lostcity-tower-scale (with V-bismarck-hull-scale)

2026-11-05. Data-only pose edits plus one optional manifest field (`opening.mission.bearing`), measured with the opening-geometry audit from T-framing-metrics and judged on golden mission screenshots (desktop, High).

## Lost City

`data/landmarks/lost-city/site.json` mission: `rangeM` 220 to 130, chase arm 80 m, offset X 40 / Y 40 (camera sits right and above the sub, so the sub reads low-left and clear of the tower).

| Layout | Before | After |
| --- | --- | --- |
| Desktop width (clipped envelope incl. flank) | 23.96% | 39.3% |
| Phone width | 42.60% | 69.9% |

The first scan is still outside the effective scan radius (100 m Arcade floor; 130 m away). Visual: the tower and its two satellite spires plus flank now fill the centre third (about 30-35% of frame width by eye), the sub sits low-left and does not cover the tower. Honest score: clearly better, target met for width and sub placement. Remaining gap: the upper ~40% of the frame is still open water (the hill crest is on the horizon, no pose can raise it without losing the tower base), and the tower top is ~47% down the frame.

An earlier attempt with only `rangeM` 130 and the default arm put the sub on the tower base; the arm offset is what fixed that. At Y 45 the portrait HUD-lane test failed by 0.03 px, hence Y 40.

## Bismarck

`data/landmarks/bismarck/site.json` mission: `bearing` 90 (broadside; mission-only, free-dive stays 50), chase arm 80 m, offset X 40 / Y 30. Range stays 110 m (already the floor).

| Layout | Before | After |
| --- | --- | --- |
| Desktop width (clipped envelope) | 53.1% | 62.7% |
| Phone width | 89.0% | 100% (clipped) |

Visual: the hull spans roughly 18-56% of the frame width (about 38%), up from about a quarter, and the sub is below and clear of it. Honest score: improved but short of "about half the width" by eye; the envelope metric overstates visible hull. Going closer is blocked by the 110 m out-of-scan floor.

Not done: the foreground "boulders" are not scatter boulders. They are plates of the `hull-debris` prop. A `sizeMul` on the Bismarck boulder biome entry was tried, had no visible effect, and was reverted. Making them smaller needs a debris-builder or prop-dimension change, which would alter factual content, so it is left as a remaining gap. Separately, the Bismarck mission's `snowScale` override was silently ignored (a console warning failed the portrait e2e); the wreck preset now declares `snowScale` (default 1), so the authored thin snow now applies.

## Test changes

- Opening-width floors raised: Lost City 0.23 to 0.38, Bismarck 0.50 to 0.60 (both layouts).
- Lost City approach distance 220 to 130 in the approach table and the Arcade start test; the start test now expects the authored 80 m arm instead of the camera default after a mission start (surface start still resets to the default).
