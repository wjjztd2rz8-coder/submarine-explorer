# V-titanic-hull-tone

## What changed
`src/world/props/wrecks/titanicBow.ts` paint options only: `muted` 0.25 -> 0.2 (keeps rust hue, not grey), end/overall shade multiplier 0.68 -> 0.24 (much darker hull), `rustiness` 0.85 (unchanged after experiment). No shader, geometry, site branches or new code.
Experiments: muted 0.7 gave grey-white hull (rejected); muted 0.4 grey-tan.

## Screenshots
`.cache/golden/2026-11-07-104733/` (before), `.../2026-11-07-105156/` (after): titanic-1-mission.png (opening), titanic-3.png (detail).

## Verdict
Opening: dark desaturated rust-brown wreck, still readable (golden readability 0 flagged). Detail: noticeably darker and browner, vertical streaking more visible, no longer salmon; still a light warm tan under the headlight and plate seams remain fairly regular (the shared plate shader owns seams; not changed).
Self-rating 6.5/10 (was ~4.0). Further: broken seams need a shader change (shared with Bismarck).

## Specs
`tools/site-specs.sh titanic`: 94 passed, 3 skipped. No snapshots rebaselined.
