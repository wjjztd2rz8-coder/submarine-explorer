# U-seabed-latch-hides-scan

## What changed

- `SeabedWarningLatch.update` (src/ui/HUD.ts): the latched warning is now suppressed whenever `nearScanTarget` is true, unless the approach (imminent contact) trigger fires. Before, the latch only yielded during a live scan, so with the reticle on a target in range but idle the latched warning held the slot until altitude reached 25 m.
- One flag instead of two: `scanLive` is removed; `nearScanTarget` now means "target in range or scan under way" (src/app/systems/hud.ts). Net simpler: one parameter and one context field fewer. No new UI, no site or layout branches.
- Flicker: the existing hold/clear-altitude hysteresis already latches the warning; a new test pins that hovering at the threshold does not flap.

## Tests

- tests/unit/uiHud.test.ts: replaced the `scanLive` priority test with the same assertions on the merged flag (expectation unchanged in meaning), plus "latched warning does not hold the slot over a ready target" and "does not flap while hovering".
- No touch spec asserts this priority; none loosened.

## Gates

All gates PASS (smoke + project-base + prettier), `PW_PORT=4751 tools/gates.sh`.
