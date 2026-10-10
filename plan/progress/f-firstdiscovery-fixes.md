# f-firstdiscovery-fixes: unaided first-discovery open items

Source: open items from `plan/progress/f-firstdiscovery.md` (Remaining). Brief: `.cache/claude/brief-f-firstdiscovery-fixes.md`.

## Changed

1. **Reward card title.** `src/game/Discovery.ts` `onComplete` passed the guide entry title to the scan completion card, so a Beebe objective "Beebe-125 black smokers" showed "Supercritical black smokers". The card now shows the POI (objective) name. The Journal entry keeps the guide title. Test: `tests/e2e/discovery.spec.ts` now expects the fixture POI name "Bow section (fixture)" on the card.
2. **"Move and turn" can stick.** `src/game/Tutorial.ts` required sustained thrust AND sustained turn. A driver who never turned, or a turner who never thrust, stayed on the step. It now completes on sustained thrust (MOVE_HOLD_S 0.8 s) or sustained turn (TURN_HOLD_S 0.5 s). Tests: `tests/unit/f3Onboard.test.ts` (thrust alone, turn alone, short presses across axes do not add up).

Phone: touch sticks feed the same `f.state.throttle` / `yaw` axes, so the phone path only gets the same looser completion. No phone layout change.

## Not changed (residual)

- A player who scans before moving stays on "Move and turn" until they drive or turn, since later-step events are ignored while an earlier step is current. Left as is: arcade-simple, and the step completes on the first movement.
- The desktop HUD clutter noted in the capture (tutorial card, hint bar and four HUD blocks during a scan) is not addressed here.
