# J-home-controls — Home and Pause device guidance

The requested routing is already present in this checkout: Home and Pause open
one `ControlsCard` owned by `createControlsSystem`. Touch opens the existing
illustrated How to play body; desktop opens the existing controls reference,
with Change keys leading to Settings only on request. Home includes this shell
system without loading the dive. No runtime change was needed.

This follow-up closes coverage gaps in the existing title and accessibility
capability specs. The title modal test now checks both desktop and touch,
asserts the guide's actual accessible name (removing the Controls exception),
checks a single guide with Settings hidden, and verifies title suspension,
resumption, opener focus and absent vehicle state. The Home accessibility test
now checks named dialogs; touch coverage verifies the modal name, single Close
action, hidden device/rebinding actions, one visible dialog, accessible button
names and repeated close/focus restoration.

The existing onboarding and overlay-focus capability specs already cover Home
keyboard/gamepad/touch routing, touch Pause, Home before and after a dive,
rebinding on request, no dive terrain/resource loads and guide teardown.

Simplicity: reuse the existing guide and its touch body; no new dialog, setting,
on-screen element, guidance surface, source branch, CSS or package identifier
was added. Changes are confined to capability specs and this progress note.
The earlier implementation evidence is in
[2230-J-home-controls-device-guide.md](2230-J-home-controls-device-guide.md).

Validation:

- `npm run typecheck`, changed-file Prettier and `git diff --check` pass.
- `GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/home-controls-dist PW_PORT=4231
bash tools/gates.sh` completed with exit 1; aggregate log:
  `.cache/home-controls-gates.log`, phase logs:
  `.cache/runs/20261016-101429-32-Ho1wVp/`.
- The content and production build phases pass. Python has 161/166 passing:
  four build-manifest failures report `spawnSync git EPERM`; the golden-tooling
  test fails with `Unexpected end of JSON input` when parsing child CLI stdout.
  These tooling files were not changed. An isolated golden-test retry also fails.
- Playwright discovers the seven focused desktop/touch title, Home accessibility
  and keyboard/gamepad/Home/Pause device-guide cases. Execution stops before
  assertions because its preview server cannot start. Direct preview diagnosis
  reports `listen EPERM: operation not permitted 127.0.0.1:4232`. Log:
  `.cache/home-controls-focused.log`. Browser behavior remains unverified here.
- All **2,693 unit tests pass in 192 files** (525.58 seconds). Attribution and
  repository-wide Prettier pass. Both root and project-base production builds
  pass, including typechecking.
- Gate smoke e2e and project-base e2e both fail at preview-server startup before
  assertions. Together with the five Python tooling failures above, these leave
  the aggregate gate red. No gate/tooling assertions were weakened or changed.
  Browser execution in an environment permitting localhost remains outstanding.
