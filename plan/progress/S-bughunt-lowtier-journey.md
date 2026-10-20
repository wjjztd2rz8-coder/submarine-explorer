# S-bughunt — Low tier journey

2026-10-20. Standing S-bughunt; supports blocker 3 in `plan/DIRECTOR.md`.
Static and unit audit of quality resolution → scene build → scan → Journal →
debrief → Home/site selection. Site selection navigates to a fresh page;
Home retains the dive context until page teardown.

## Confirmed defects and minimal fixes

- Scene owners never called existing teardown methods for terrain, atmosphere,
  headlights, marine snow, surface water, submarine/cockpit, environment preset
  and post pass. Register each owner with the existing system Disposables as
  soon as it is constructed. Remove the terrain root as part of that cleanup.
  Low still constructs a post pass, so its skipped draw branch also needs cleanup.
- Props had no teardown: procedural geometry/materials, instance buffers,
  impostors, scene ownership and collision lists survived system disposal.
  Added idempotent `Props.dispose`, wired it to its system and preserved shared
  GLB resources and cached textures. Generic hull/debris rust maps are private:
  builders now identify them explicitly for disposal, including on replacement.
  Pending content/models cannot repopulate it;
  the system drops late scatter/spawn/event callbacks.
- Late landmark and discovery content could populate disposed owners, sample
  their terrain and apply an old `?poi=` teleport. Guard asynchronous completion
  against disposal; landmark disposal also detaches its root.
- A late `props:loaded` could reset the sub and camera after returning Home.
  Mission/free-dive reframing now ignores Home; mission application also ignores
  disposal. Home now disposes its mission router, cancelling pending starts and
  removing its UI/subscriptions before they can restart a mission under Home.

## Regression evidence

Extended existing capability specs only: `disposables`, `mobileResize1350`,
`props-loader`, `Landmarks`, `discoveryReward1240`, `missionApproachSystem`,
and `arcadeLoadout`. No new spec file.

Initial red runs demonstrated missed teardown, late content/model attachment,
post-disposal discovery loading/probe spawning and Home pose reset. Logs:
`/tmp/lowtier-before.log`, `/tmp/lowtier-before-async.log`,
`/tmp/lowtier-props-before.log`. The first corrected focused run passed
94 tests in six files (`/tmp/lowtier-focused.log`). Follow-up Home-start
regressions also failed against the original mission module loaded through a
temporary Vite plugin, without changing working source
(`/tmp/lowtier-home-before.log`: 2 failed). Private rust-texture regressions
failed before ownership tracking (`/tmp/lowtier-texture-before.log`: 2 failed).

The resource tests cover Low and High, repeated teardown, and Low with both
snow and cones omitted. Shared GLB geometry/material ownership is guarded.
The full unit run also covers existing quality resolution, scanner, Journal,
debrief, Home and startup lifecycle capabilities. No additional tier-specific
crash or optional-asset null dereference was demonstrated by the static audit.

## Simplicity and scope

No added UI, guidance surface, setting, site branch, dependency, schema, runtime
config mutation or package-named spec. Existing cleanup machinery and resource
owners are reused. No art/layout changes. No rendered phone journey or visual
acceptance claimed; those remain V-journeys-run/Claude work.

## Validation

- Final full unit suite: **192 files / 3,348 tests PASS**, no skips, exit 0,
  517.80 seconds. Command:
  `npm test -- --configLoader runner --pool=threads --cache=false`.
  Log: `/tmp/lowtier-unit-threads.log`. Source/tests held fixed throughout;
  includes the final private-texture ownership correction.
- Final focused run: **221 tests / 9 files PASS**, including all affected capability
  specs plus generic procedural builders and prop collision. Log:
  `/tmp/lowtier-final-focused.log`.
- Final root and project-base production builds (`tsc --noEmit` + Vite): **PASS**.
  Logs: `/tmp/lowtier-final-build.log`, `/tmp/lowtier-base-build.log`;
  retained outputs `.cache/lowtier-final-dist`, `.cache/lowtier-base-dist`.
- Required invocation:
  `GATES_CONFIG_MODE=writable PW_PORT=4281 bash tools/gates.sh`.
  Logs: `.cache/runs/20261020-165043-4-PAb7ra/`, summary `/tmp/lowtier-gates.log`.
  Config bundling, content and build PASS. The default fork-pool unit stage
  emitted only its RUN header for roughly ten minutes and was interrupted
  (exit 130). This aggregate invocation is **incomplete**, not a pass or a
  demonstrated unit assertion failure. The final thread-pool run above follows
  the fallback documented in `S-bughunt-18` and verifies all unit capabilities.
- Python: **FAIL, 5 failures / 167 outer tests**. Four build-manifest cases report
  `spawnSync git EPERM`; the golden comparison wrapper reports
  `Unexpected end of JSON input` at `tools/tests/golden-manifest.test.mjs:151`.
  These same failures are documented in `S-bughunt-25`; tools are untouched.
- Root smoke and project-base browser checks attempted separately against final
  isolated builds, ports 4282/4283. Both stop before assertions because preview
  cannot start. Project-base debug output reports localhost connection `EPERM`
  on IPv4 and IPv6; direct preview confirms
  `listen EPERM: operation not permitted 127.0.0.1:4284`.
  Logs: `/tmp/lowtier-smoke.log`, `/tmp/lowtier-base-browser.log`,
  `/tmp/lowtier-preview.log`. No rendered phone journey or screenshots obtained.
- Attribution **PASS** (14 assets), repository-wide Prettier **PASS** and
  `git diff --check` **PASS**. Logs: `/tmp/lowtier-attribution.log`,
  `/tmp/lowtier-prettier.log`.

No assertions were loosened or timeouts increased. No merge, push or tag.
