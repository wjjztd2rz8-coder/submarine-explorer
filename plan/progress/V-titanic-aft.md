# V-titanic-aft

2026-10-30. Low tier, mission opening (`GOLDEN_MODE=mission`), desktop 1600x900.
Shots: `.cache/codex/shots/V-titanic-aft/{before,after}/titanic-1-mission.png` (`try2` is the same as `after`; an earlier weaker light is not kept).

## Cause and change

- Cause: Titanic's only fill was a hemisphere light plus the ambient floor, so the hull lit evenly from above and flat, and its sides had no direction.
- Change: site atmosphere data gained an optional `key` (fixed directional side light: colour, intensity, direction). The atmosphere system adds it next to the existing hemisphere fill; `SiteManifest` validates it. Titanic's `site.json` sets a pale blue-grey key from the upper left, slightly behind the hull. No site branch, nothing mutated at runtime.

## Result (honest)

The deck and upper hull edges now catch light while the long hull side stays shaded, so the wreck reads as a lit and a shaded half instead of one flat rust plane. Readability (`golden-readable`): scene/sub 0.158 -> 0.216, scene mean Y 5.4 -> 7.9, still a pass. The bow stays the focal point; no flood. The dark upper-left water is unchanged: it is fog/background colour, which a directional light cannot reach, so that part of the target is not met. Rating: ~3.5 -> ~3.7 (small gain).

Nothing added to the UI. No cuts. Other sites can opt in by adding `atmosphere.key` to their site data.
