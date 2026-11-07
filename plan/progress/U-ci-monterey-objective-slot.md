# U-ci-monterey-objective-slot

Cause: the spec's `away()` helper moved the sub and advanced the clock only 34 ms. At Monterey the
spawn pose is close to the seabed, so the seabed warning had latched; `SeabedWarningLatch` holds
for `seabedHoldS` (3 s) after the trigger ends. The warning kept the guidance slot (kind
"urgent"), `away()` rejected every offset as unsuitable, and the objective line never showed.
The latch is deliberate hysteresis and clears correctly (altitude is held at 60 m or more
above ground), so this is a spec timing bug, not a product bug.

Fix: `away()` now runs the clock 3100 ms after each move, enough for a latched warning to
release. The assertions are unchanged.

Ran: spec reproduced the failure before the fix (844x390). After the fix, `hud-touch.spec.ts -g
'catalog tutorial and reload.*monterey-canyon'` passed on all 6 viewports. Typecheck and lint
were run. Full gates left to the orchestrator.
