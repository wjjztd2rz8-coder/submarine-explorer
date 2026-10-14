# S-boot — wire deferred Home startup

Backlog ID: **S-boot**, Codex brief 1590. The current `plan/DIRECTOR.md` lists
S-boot remainder at item 14; the brief's numeric item reference is older.
Baseline revision: `66da04af6033ed8d05fc4904399eeff8131ab962`.

## Change

`main.ts` now uses the existing `DeferredStartup` boundary through
`app/startup.ts`. Boot resolves the route, saved preferences, quality and renderer
without downloading a gameplay tile. Initial Home runs shared menus and the
existing title scene, with no terrain, vehicle, scanner, power, props, marine-life
simulation, mission, audio simulation or underwater post pass. The optional
Monterey title crop keeps its existing asynchronous fallback behavior.

Choosing a site keeps the existing mission/free-dive URL navigation. The selected
page fetches its tile and imports the ordered dive systems concurrently, then
initializes the existing system list without changing its listener order, spawn,
briefing, freeze gates or mission clock. `__gameReady` and `game:ready` still follow
the first presented dive frame. While loading, the existing briefing surface
shows “Loading dive…” and is replaced by the real briefing or piloting; it adds no
persistent guidance surface or CSS. Tile failure keeps the fatal/error path.

Menu construction, mission access and purchases reuse shared helpers. Home keeps
Journal and photos, Settings/Controls, Daily, both site-selection paths, Upgrades,
quality diagnostics and service-worker registration. No player capability is cut;
CHANGELOG records the startup change. Page exit aborts a pending fetch and stops
the frame loop; a page retained in the browser's back/forward cache keeps its
existing controls and loop for restoration. Partially initialized systems are
included in rollback.

## Home boot measurement

Built the baseline before editing into `dist-s-boot-before` and the final change
into `dist-s-boot-after`, using the same production Vite configuration and base.
Measured byte lengths directly from the built HTML's script/stylesheet references
and canonical tile files. These are **static, uncompressed resource bytes**, not
a measured network trace or an estimate of time to interactive.

| Resource / measurement                               |      Before |       After |
| ---------------------------------------------------- | ----------: | ----------: |
| Entry JavaScript                                     | 1,514,729 B |   951,000 B |
| Entry CSS                                            |   119,781 B |   118,282 B |
| Entry HTML                                           |     2,415 B |     2,415 B |
| Entry HTML + JS + CSS                                | 1,636,925 B | 1,071,697 B |
| Default Titanic metadata + heightmap on Home         | 1,197,937 B |         0 B |
| Optional Monterey title metadata + heightmap         | 2,093,762 B | 2,093,762 B |
| Ordered dive-system list initialized on initial Home |  36 systems |   0 systems |
| Actual Home network transfer bytes                   |     Blocked |     Blocked |
| Home time to interactive                             |     Blocked |     Blocked |

The entry resources shrink by 565,228 B (34.5%); removing the Titanic request
avoids another 1,197,937 B. Other catalogue/font/globe requests and host compression
are outside this static comparison. Production service-worker installation still
precaches the complete shell, including deferred code, to preserve offline use;
precaching does not initialize dive systems. The total shipped bundle remains
about the same size, with the dive chunk fetched by the application after selection.

Browser measurement was attempted before and after. The Browser skill's runtime
reported “No browser is available” and listed no connected browsers. Standalone
Playwright could not start its preview server; a direct preview invocation
confirmed `listen EPERM: operation not permitted 127.0.0.1:4190`. No network-byte or
TTI values were invented. A browser-capable run must capture a cold Home navigation
on both builds, count document/resource transfer bytes through the first presented
frame with an enabled Dive action, and record that frame as the interaction-ready
milestone. Measure service-worker installation separately.

## Capability coverage

Extended existing startup, title, system-order and TileLoader capability specs:
actual boot never fetches a gameplay tile; actual runtime Home never calls the
dive factory; selected-tile initialization waits for loading; loading remains
visible until the first frame; error and cancellation prevent stale starts;
partial initialization rolls back; cached Home survives Back navigation; the title
works without dive metadata, Discovery or a camera rig; fetch receives the lifetime
signal. Existing direct mission/free-dive routing, midnight Daily capture,
listener-order, frozen-input and optional-heightmap regression guards stay intact.

The shell e2e spec now guards zero initial dive resources and zero Titanic requests,
then holds a selected tile to assert the loading state and readiness timing. The
existing frozen-vehicle assertion remains on Home reached after a dive, with a
held movement key, as well as on Pause. Initial Home instead asserts that no
vehicle or other dive resource exists before or after movement input. Existing
visual and framing assertions were not relaxed; no tests are skipped.

## Simplicity review

1. Net simpler runtime: Home drops the entire ordered dive startup and physics
   frame; shared menu/access helpers serve both lifetimes. No new settings.
2. One guidance surface: temporary loading uses and replaces the briefing surface.
3. No layout patches: no CSS, offsets, breakpoints or appearance tuning.
4. No new site branches in shared code; existing title-crop reuse is preserved.
5. Saved route/settings/Daily inputs are resolved by boot once and passed through;
   no additional config mutation or second mode-resolution path is introduced.
6. Tests extend existing capability specs; past-bug assertions remain strict.
7. New source/test comments explain behavior, without package numbers.
8. Reuse `el`, navigation helpers, `Time`, `SystemRunner`, saved stores and existing
   menu/title components rather than building a second UI.

## Validation

- PASS: `npm run build -- --outDir dist-s-boot-after --config .cache/s-boot/vite.config.mjs --configLoader native`
  (TypeScript plus production bundle). The temporary config is bundled locally
  with Rolldown because the default Vite config loader writes into read-only
  `node_modules/.vite-temp`. Existing large-chunk advisory remains.
- PASS: final targeted capability run — 7 files, 96 tests, including the unchanged
  optional-heightmap bug guard.
- PASS: `npx prettier --check .` and `git diff --check`.
- PASS: content and attribution validation.
- The completed sandbox gate run passed build, content, attribution and Prettier;
  browser root/project-base gates failed to start their preview servers. Its full
  unit run had 191 files passing (2,044 tests) and three Daily boot fixture failures:
  the fixture expected tile loading to stop boot before rendering. Updated its DOM
  and renderer fixture, retained every saved-mode/midnight assertion and added
  strict zero-tile-load and captured-date assertions; all three now pass.
- The orchestrator's external `tools/gates.sh` run passed Python, content, build,
  unit, root e2e, attribution and Prettier. Project-base e2e passed seven of eight
  checks; its remaining audit assumed initial Home already had loaded props,
  Discovery, life and exploration. That assumption contradicts deferred startup.
  Updated the shared root/project-base audit: initial Home asserts zero dive
  resources and unchanged persistent state under all original pilot keys; once a
  selected dive returns to Home, those same keys must preserve the complete
  gameplay snapshot. The original post-Journal gameplay equality and exact geometry,
  texture and scene-object allocation assertions remain unchanged, as do the
  terrain-ready and two-presented-frame waits before sampling allocations.
  This final audit correction typechecks and formats; browser execution still
  requires the orchestrator's environment.
- `tools/gates.sh` was run with `GATES_CONFIG_MODE=writable`, port 4190 and an
  exported npm wrapper selecting Vitest's thread pool (same tests/assertions).
  Earlier full runs were interrupted while diagnosing quiet reporter output; a
  verbose thread run confirmed the expensive geometry capabilities were progressing.
  Gate Python checks report 161 passing and 4 failing manifest tests because Node's
  `spawnSync git` returns sandbox `EPERM`; no tools or assertions were changed.
- Browser shell/title checks and before/after browser measurements are blocked by
  the unavailable browser and denied localhost listen described above.

Remaining: rerun the corrected shared title audit / project-base gate outside the
sandbox, and capture actual before/after Home network bytes and time to interactive.
The newly extended shell loading regression also needs browser execution. Claude
owns visual review.
No merge, push or tag. `plan/DIRECTOR.md` and `tools/` are unchanged.

Commit attempt: blocked by read-only Git metadata when staging the S-boot change:
`/home/vijay/submarine-explorer/.git/worktrees/1590-S-boot-wire/index.lock` could not
be created. Changes remain in the working tree; no commit, merge, push or tag was
made. Use an S-boot commit message when the orchestrator commits the reviewed work.
