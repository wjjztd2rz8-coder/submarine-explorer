# V-opening-dark

## What changed
Data only, no new code and no site branches. Both sites use mechanisms that already exist in `data/landmarks/<site>/site.json` `atmosphere`:
- Titanic: added the per-tier ambient floor (depth -200, intensity 6, all tiers) and raised the hemisphere fill 2 to 6.
- Bismarck: ambient floor 6 to 18 with the cool tint (0x6f8f9e) the other lifted sites use.
- Tests by capability: `lowSweepReadability` (hemisphere light expected iff the manifest authors one; Titanic joins the floor-site lists), `siteManifest` (Titanic and Bismarck expectations), six atmosphere snapshots updated. CHANGELOG entry added.

## Readable ratio (scene/sub, flag < 0.125), `*-1-mission.png`
| Site | Before (.cache/golden/2026-10-29-112021 in main checkout) | After |
| --- | ---: | ---: |
| Titanic | 0.120 FLAG | 0.133 |
| Bismarck | 0.099 FLAG | 0.154 |
| Beebe | 0.127 | 0.424 (mostly the T-golden-settle capture fix, not this change) |
| Blue Hole | 1.738 | 1.710 (unchanged) |

Screenshots (worktree .cache/golden): Titanic `2026-10-29-155143/titanic-1-mission.png`, Bismarck `2026-10-29-161636/bismarck-1-mission.png`. By eye: the Titanic bow and Bismarck hull now read in the first frame against a visible seabed; the sub's lamp pool stays distinct.

## Self-rating
6/10 against the brief. Titanic and Bismarck are fixed and measured; the sub-in-its-own-pool look already existed. Note the ratio rose partly because the sub also brightened (about 9% to 23% on Titanic), so the number is only marginally above the flag for Titanic.

## What remains
- Blue Hole opening camera still hugs the sub with stripy sand behind (needs a framing change via site `opening` data; not attempted).
- Blake's lone pale mound is a subject/prop problem, not lighting; not attempted.
- Titanic upper frame is still empty dark water (see V-titanic-aft, V-lostcity-ground).
- Bismarck pale patches on the seabed are a little strong; the hull itself is still small at 110 m.
