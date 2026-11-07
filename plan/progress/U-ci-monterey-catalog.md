# U-ci-monterey-catalog: Monterey catalog tutorial case timeout

Hosted CI fails only `tests/e2e/hud-touch.spec.ts` "catalog tutorial and reload" for
`monterey-canyon` (4.0 min test timeout at several viewports). Spec-only change; no product
code touched. No assertions, timeouts or snapshots were changed.

## Cost

`away()` moves the sub to a far offset, then clamps its height with `Math.min(-3, ...)`.
At Monterey's first offset (`+10000` on x) the terrain is above the surface clamp: the sub
lands 6 m above the seabed (altitude -6, `urgent`). The seabed latch arms on that move and
holds the guidance slot until 3 s of quiet at 25 m or more, so each `away()` call paid a
3100 ms fake-clock wait. That is about 190 extra rendered frames per wait, on top of the
frames already spent. The Monterey case calls `away()` twice, so it pays about 6 s of
fake time (about 380 frames) on top of the rest of the test.

## What changed

`away()` now reads the terrain for each candidate spot inside the same `page.evaluate` that
would move the sub. A spot where the surface-clamped altitude is under 40 m is skipped before
the sub moves, so it never arms the latch. The post-move urgent check and the 3100 ms latch
wait are unchanged and still run when a latch was already on from the previous position.

## Before and after (local, `PW_PORT=5811`, Chromium, 1 worker)

| Run                                                                | Before                        | After                         |
| ------------------------------------------------------------------ | ----------------------------- | ----------------------------- |
| `monterey-canyon: tutorial` x 3 repeats x 6 viewports (18 tests)   | 5.2-5.6 s each, 1.7 min total | 3.3-3.5 s each, 1.0 min total |
| 1280x720-keyboard, CPU throttle 4x (temporary env hook, reverted)  | 14.4 s, 14.3 s                | 11.3 s, 11.4 s                |
| 1280x720-keyboard, CPU throttle 12x (temporary env hook, reverted) | 38.6 s                        | 33.7 s, 32.4 s                |

The hosted case still times out at 4.0 min in CI until this lands. The hosted per-frame cost
is not measurable here. Local and throttled numbers show about 40% less time at normal speed
and about 20% at throttled speed. The remaining cost is in the other frames and screenshots of
the test, which were left as they are.

## Probe notes

Temporary logging on the 1280x720-keyboard Monterey case before the change showed one
`away()` call per test that landed on `urgent` at altitude -6 (first offset), with a 3.1 s
wait. After the change the probe was not kept; the timing above is the check.

## Gates

`PW_PORT=5812 tools/gates.sh` (smoke + project-base): PASS (checks, build, unit, e2e smoke,
e2e-base, attribution, prettier). The first run failed on Prettier formatting of this note only;
it was reformatted and the full run passed.
