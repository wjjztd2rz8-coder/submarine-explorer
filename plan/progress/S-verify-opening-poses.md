# S-verify-opening-poses

2026-11-04 — Codex verification of V-endurance-dropstone-tone,
V-bluehole-pitchup, V-bismarck-framing and V-axial-subject.

Status: geometry verification in progress; browser acceptance blocked by the
execution sandbox. Do not treat the live HUD/console requirement as signed off.

## Coverage and changes

- Expanded `tests/unit/portraitOpening.test.ts` from five Low free dives to the
  catalog's 13 sites × Low/Medium/High × free dive/mission (78 cases). Uses
  resolved default Arcade settings, the final opening composer used by the app,
  actual survey terrain, procedural props and the appropriate sub model.
- Checks visible hull vertices above terrain and outside prop collision volumes,
  the physics sphere, hull projection in the existing 390×844 HUD envelopes,
  near/far clipping, landscape rotation and portrait reset. Checks prop/spawn
  warnings. The shared hull-vertex helper retains the existing terrain check.
- Each case then pilots from the opening to its first authored scan contact
  through real submarine physics, prop push-out and scanner gates. Missions use
  their first primary; free dives use the scanner's initial nearest contact.
  The bounded simulation neither teleports nor awards a scan directly. Browser
  coverage is still needed for external GLBs, live HUD rectangles and warnings.
- Expanded the existing `opening-framing.spec.ts` live portrait capability to
  the same 78 cases. Retains the live three-second settle and HUD bounds/overlap
  assertions; adds full-hull terrain/prop checks, hull breach and console warning
  checks. Each route/tier gets separate diagnostic output.

## Demonstrated defect and minimal fix

Blue Hole's **mission** camera cropped the sub beyond the portrait right edge:
projected right edge **400.80 px on Low**, **399.19 px on Medium/High**, against
a 390 px viewport. This was missing from the previous free-dive-only coverage.
Changed only `opening.mission.chaseOffsetX` in its `site.json`, **−44 → −36**.
All three focused mission portrait checks pass with the adjusted offset. The
125 m mission approach distance and scan gates remain enforced by existing tests.

Endurance's authored portrait offset intentionally differs from its landscape
camera. Extending the old rotation assertion exposed a test assumption, not a
game defect: it required identical camera positions in both orientations. The
test now compares rotation against an independently configured landscape rig,
then still requires reset to reproduce the original portrait bounds exactly.

## Validation

- `freeDiveComposition.test.ts`: **13 passed**, existing snapshots unchanged.
- `missionApproach.test.ts`: **81 passed**, all sites, all tiers, Arcade and
  Realistic; includes the existing two-primary piloting cases.
- Expanded portrait/first-scan matrix: pending final run.
- `npm run build -- --outDir dist-opening-poses --config .cache/opening-vite.config.mjs --configLoader native`:
  **passed**, including TypeScript. The config is a temporary local Rolldown
  bundle of the unchanged Vite config; shared `node_modules` is read-only and
  Vite's runner loader closes before the existing PWA plugin's late imports.
- Full unit suite: pending.
- `npm run test:py`: **162 passed, 5 failed**. Four CI build-manifest tests fail
  with sandbox `spawnSync git EPERM`; the golden-tooling wrapper fails in a
  subprocess-based comparison test with truncated JSON output. No pipeline or
  golden-tooling source was changed by this item.
- `npx playwright test tests/e2e/opening-framing.spec.ts -g 'live portrait opening matrix|mission previews and opens on an approach outside scan range' --list`:
  **93 tests discovered** (78 matrix + 15 existing mission preview tests).
- The same targeted Playwright run was **attempted but could not start its
  web server**. Debug output reports `connect EPERM` for both `::1:4186` and
  `127.0.0.1:4186`. No browser tests executed; no screenshots or browser console
  results are claimed. There is no browser tool available in this session.

Browser follow-up in an environment that permits localhost and Chromium:

```sh
PW_PORT=4186 PW_OUTDIR=dist-opening-poses GATES_CONFIG_MODE=writable PW_RENDER_REVIEW=1 \
  npx playwright test tests/e2e/opening-framing.spec.ts \
  -g 'live portrait opening matrix|mission previews and opens on an approach outside scan range'
```

## Simplicity

One data value changed in production. Extended existing capability specs and
the existing hull helper; no site branches, new UI, settings, dependencies,
spawn machinery or weakened collision/framing/scan assertions.
