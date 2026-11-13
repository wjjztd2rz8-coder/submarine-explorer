# T-hunga-opening-heading — DIRECTOR item 20

Two audit rounds, 2026-11-12. Regression confirmed; no deliberate heading rule changed.

## Round 1: history and failing reproduction

Read `plan/DIRECTOR.md` first. The earlier golden's `poses.json` identifies
`72a73b85` (2026-11-09-183505): Hunga yaw **97.5°**, position
`[-2199.143230, -449.802917, 2255.373821]`. The later manifest identifies
`c4ea6574` (2026-11-10-082252): yaw **345°**, position
`[-2051.654476, -449.802917, 2384.717986]`. Both use `skipBriefing=1`.
The source manifests were available in the primary checkout's `.cache/golden/`.

`git log`, `git blame`, and diffs from `72a73b85` through `819974fe` and
`c4ea6574` isolate **542b6359**, merged by `dfc1c1e8` between `819974fe`
and `c4ea6574`. It replaced the within-two-metres late-prop reframe with an
open-briefing-only callback. Its purpose was correct: `Submarine.reset()`
rewinds velocity and can cancel an emergency ascent. Its unintended consequence
was that a dive started before props arrived never received its loaded pose.
`MissionRouter.begin()` waited only for Discovery; `skipBriefing` also bypassed
that wait until the later `36bf83f7` fix, which still waited only for Discovery.
Ordinary rapid Begin has the same race: the card hides before its callback.

The bearing search and hero-local transform originate in `cd0d6634`.
`59307310` deliberately added a mission-bearing override for Bismarck; Hunga
has no override. The search uses the authored hero bearing, floor/prop safety,
height and turn cost; it does not globally maximize silhouette width. Hunga's
75° local bearing needs its placed 270° hero transform and collision geometry.
The missing-hero calculation selects 345°; the loaded calculation selects
97.5°. Spawn, deep-opening, Hunga data and scan-range code are unchanged
between the two goldens. This is a readiness regression, not new composition tuning.

Before editing production code, the new capability cases reproduced both
ordinary Begin and skipped briefing at **345°**, with objective width
**0.209567556** versus the previous-pose **0.339197868**. Both failed because
the mission had already unfrozen. Evidence: `/tmp/hunga-red-confirmed.log`.

## Fix and capability coverage

Reuse the prop system's loading promise as `GameContext.propsReady`; pass it to
MissionRouter as `startReady`. Begin waits for Discovery and completed placement,
applies the final pose, then starts the existing mission clock. Missing props
and per-model failures still settle through the existing Props loader. The
briefing-only late refresh remains; a live dive is never reset.

Extend `missionComposition.test.ts`, using real terrain, props, submarine,
camera, mission system and router; only DOM views/image decoding are replaced.
All 13 sites exercise ordinary rapid Begin; router and browser cases also cover
skipped briefing. The small
`tests/fixtures/mission-opening-poses.json` retains provenance and the earlier
golden's actual sub/camera poses. Compare current solid geometry at both poses:
its projected frame width must retain the earlier golden (0.001 frame-width
allowance for idle settling), and its horizontal broad-face projection must not
narrow. This protects each reviewed composition without inventing a universal
widest-face optimizer or allowing changed art to explain a heading regression.
The tests also prove subsequent prop events preserve live position/velocity.

Hunga now resolves **97.5°**, width **0.339198815**, retaining the earlier
**0.339197868**. Two targeted browser cases delay the real props request and
exercise the real Begin button and `skipBriefing` route.

## Round 2: lifecycle boundaries and simplicity

Added router cases for pending near-site/surface choices and leaving while
placement is pending: the clock stays frozen, the choice survives, and disposal
prevents a late start. Existing system cases retain live, paused, completed,
emergency-ascent, aborted and debrief state; existing loadout tests retain
explicit poses, surface starts, mode switching and fitted hulls. **141 tests in
three files pass** (`/tmp/hunga-lifecycle.log`). No further defect found.

The first broad gate run exposed first-move integration fixtures that tried to
pilot before releasing props. Updated that capability test to assert zero
physics/clock/move learning while Begin is pending, release placement, then
perform its original partial-move and learned-move checks. Subsequent prop
notifications must still preserve position, velocity, hull state and onboarding.
The delayed-Discovery case now proves that Discovery alone cannot start the dive.
All **22 Beebe boundary cases pass**, covering both modes, props-first/late,
briefing/skip, learned movement, restart and hull-loss reload; the final gate
also runs the full all-site file. Evidence: `/tmp/hunga-first-move-boundary.log`.
These assertions retain the previous live-dive regression guards and strengthen
the loading boundary; no piloting assertion was relaxed.

No site branch, new setting, guidance surface or runtime placement flag. The
existing frozen state and one shared readiness promise replace dependence on a
race followed by a live pose correction. No art or scan-range tuning changed.

## Validation

- Failing-first Hunga: two confirmed failures before production edits; both
  pass after the readiness fix.
- Final-source composition: **13/13 sites pass** (74 s),
  `/tmp/hunga-final-all-sites.log`. The other 93 cases in this file were filtered
  out in this focused run. **21/21 prop-pipeline cases pass**, including missing
  optional content (`/tmp/hunga-props-readiness.log`). Together with the 141
  lifecycle/loadout cases and 22 first-move boundary cases, **197 focused tests pass**.
- TypeScript and changed-file formatting pass.
- Searched `tests/e2e` for opening, preview, Begin, props and mission-clock cases.
  Ran the requested targeted commands:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4320 npx playwright test tests/e2e/opening-framing.spec.ts -g 'Hunga rapid (Begin|skipBriefing)' --output=.cache/hunga-e2e
GATES_CONFIG_MODE=writable PW_PORT=4321 npx playwright test tests/e2e/d2-predive.spec.ts -g 'briefing previews the .* start; Begin dive does not teleport' --output=.cache/hunga-predive
GATES_CONFIG_MODE=writable PW_PORT=4322 npx playwright test tests/e2e/mission.spec.ts -g 'briefing freezes the game; Enter starts near the site with objectives' --output=.cache/hunga-mission
GATES_CONFIG_MODE=writable bash tools/gates.sh
```

All three targeted browser runs stop before assertions because the preview
cannot bind localhost (`listen EPERM`, reproduced directly at 127.0.0.1:4320).
The new opening cases are discovered by `--list`. No browser pass or new visual
golden is claimed. Logs: `/tmp/hunga-{e2e,predive,mission}.log`.

Measured desktop solid-objective width fractions, using the same current geometry
at the recorded golden camera and at the corrected runtime camera:

| Site                 | Previous pose | Rapid Begin |
| -------------------- | ------------: | ----------: |
| axial-seamount-ashes |      0.009290 |    0.009290 |
| beebe-vent-field     |      0.255642 |    0.255642 |
| bismarck             |      0.623916 |    0.623920 |
| blake-plateau-corals |      0.099726 |    0.099726 |
| challenger-deep      |      0.125166 |    0.125166 |
| endurance            |      0.360600 |    0.360594 |
| great-blue-hole      |      0.287152 |    0.287149 |
| hudson-canyon        |      0.164125 |    0.164125 |
| hunga-tonga-caldera  |      0.339198 |    0.339199 |
| kamaehuakanaloa      |      0.081165 |    0.081165 |
| lost-city            |      0.525953 |    0.525955 |
| monterey-canyon      |      0.194934 |    0.194934 |
| titanic              |      0.327814 |    0.327816 |

## Final gate result

`GATES_CONFIG_MODE=writable bash tools/gates.sh` completed, exit 1.
Run: `.cache/runs/20261112-164626-9-QH3t8r/`; aggregate log:
`/tmp/hunga-gates-final.log`.

- **PASS:** config, content, production build (including TypeScript),
  **196 unit files / 4,882 tests**, attribution and full-tree Prettier.
  The complete unit suite took 1,009 s and includes all 111 first-move cases
  and all 106 composition cases. The initial unrelated prop-material timeout
  did not recur in this final run without overlapping heavy tests.
- **FAIL Python:** 5 of 169 tests: four build-manifest subprocess tests report
  `spawnSync git EPERM`; the unchanged golden CLI comparison test receives
  empty JSON output (`Unexpected end of JSON input`). No tooling code changed.
- **BLOCKED browser:** smoke and project-base preview startup fail before
  browser assertions, matching the targeted localhost-bind restriction.
  Both deployment bases build successfully.

The initial gate run was interrupted after exposing the first-move fixture
assumptions described above; this completed final run supersedes it.
Final TypeScript, changed-file formatting and `git diff --check` also pass.
Browser acceptance and a rendered golden refresh require an environment that
permits the preview server to bind localhost.
