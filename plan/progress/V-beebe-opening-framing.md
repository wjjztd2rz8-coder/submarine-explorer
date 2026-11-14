# V-beebe-opening-framing

## Changes

- data/landmarks/beebe-vent-field/site.json, opening.mission: chaseRadius 46 -> 85, chaseOffsetY -8 -> 6. Data only; existing fields, no code, no new settings. rangeM stays 155 (scan radius floor).

## Screenshots

.cache/codex/shots/V-beebe-opening-framing/{before,after,before-low,after-low}. High desktop and 390x844 portrait, plus Low desktop and portrait.

Before: the sub filled about a third of the frame height at the bottom, hiding the seabed in front of the smokers. After: the sub is roughly half the size and sits lower-centre, the camera is higher so the seabed slope reads, and the main stack with its plume stands in the upper-middle with the second smoker and distant plume around it. Brightness is unchanged (same lighting; the warm pool under the stack is intact). Portrait: sub and stack are separated, plume reads above the stack. Low: the stack is readable; the plume is short and thin (Low tier particle budget), the seabed is brighter than High.

## Tests

- PW_PORT=4733 tools/site-specs.sh beebe-vent-field: 54 passed, 1 failed (journal-debrief beebe 844x390, "Capture must use the current checkout build": the served build sha was the pre-commit one; stale build from golden run, not a framing failure).
- tools/gates.sh: see run log in the final report.

## Simplicity

Two numbers changed in one site's existing opening data. No code, no settings, no new fields.

## Remaining issues

The stack is still modest in size at 155 m on a phone; going closer is blocked by the 150 m scan radius. Low plume is short.

## Honest rating

About 4.0 opening appeal (from ~3.7): subject now clearly the stack and plume, sub no longer dominant.
