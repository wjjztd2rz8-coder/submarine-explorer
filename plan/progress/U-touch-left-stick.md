# U-touch-left-stick

- Touch copy no longer names a control: the touch tutorial reads "Drag to move and turn." / "Drag to follow the marker.", and the touch How to play tile is "Steer" with "Drag to move and turn". Touch is chosen by `device === 'touch'` in `Tutorial.ts` and `HowToPlay.ts`.
- Dead touch rows in `ControlsCard.ts` `controlGroups` got the same "Steer" label for consistency; the touch branch there is not reached because touch renders `buildHowToPlay`.
- Gamepad wording (`onboard.ts` 41-42, "Use the left stick...") and desktop key copy are unchanged.
- Pinned strings updated in `guidance.test.ts`, `onboardCompletion.test.ts` and `f3-onboard.spec.ts`; CHANGELOG line added under Unreleased/Changed.
- Gates: `PW_PORT=4721 tools/gates.sh` (smoke + project-base) PASS: python, content, build, unit, e2e, e2e-base, attribution, prettier.
