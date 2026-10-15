# 2070 — S-bughunt, sixth pass

Scope: non-visual save/migration, Daily, journal photo quota/teardown, input
focus loss, pause/resume clocks, and primary scan accessibility at all 13 sites.
Extend existing capability specs; preserve visuals and storage schemas.

## Round 1 — inspect and reproduce

- Reviewed Save, Progress, Cosmetics, DiscoveryStore, Daily boot/completion,
  PhotoStore/gallery/system lifetimes, Input, the frame clock and mission spawn specs.
- Added regressions before fixes. The initial focused run reproduced seven
  failures across four issues (including all four editable-focus variants).
- Separate probes reproduced paused-time catch-up and missing photo ZIP teardown.

## Round 2 — fix and verify

| Confirmed bug                                                                                                                                    | Fix and capability coverage                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A transient `SecurityError` followed by a successful write silently evicted old photos.                                                          | PhotoStore retries eviction only for actual quota errors; `photoStore.test.ts` proves the failed write preserves both persisted and session collections, then a fresh save retains every photo. Existing quota/24-photo-limit tests remain intact.                                                                                                                                             |
| Photo factories shared a module-level cleanup list; disposing one destroyed another live instance.                                               | Move cleanup into the factory. `photoMode.test.ts` exercises two simultaneous systems across two lifetimes and verifies the survivor still receives pause events.                                                                                                                                                                                                                              |
| ZIP downloads retained object URLs and 30-second timers after Journal teardown.                                                                  | Gallery owns pending downloads and disposes them on replacement, Journal disposal, or photo-system disposal. The real download-click test checks independent galleries, natural timeout, repeated disposal and immediate URL/timer release.                                                                                                                                                    |
| Moving focus into an input, textarea, select or editable region retained held flight controls and queued actions.                                | Clear flight input on editable focus and preserve typing/native select behavior. `subInput.test.ts` covers four target types across two rounds, plus existing blur/visibility/pause/re-entry checks.                                                                                                                                                                                           |
| Migrated discoveries sorted timestamp strings lexically, producing wrong ordering and inferred `firstAt` across offsets or fractional precision. | Compare parsed instants while preserving original timestamps and the save schema. `gameDiscoveryStore.test.ts` checks both timestamp forms and a write/reload.                                                                                                                                                                                                                                 |
| Pause/resume between animation frames counted 250 ms of paused time and ran eight physics steps.                                                 | Suppress physics and dive-clock catch-up after shell/visibility transitions or frozen frames; discard fractional physics backlog. Preserve camera/UI frame timing so photo mode remains responsive. `appSystems.test.ts` exercises shell transitions, frozen frames, visibility, subsequent normal play and listener/RAF teardown. Startup fixture now supplies real document event listeners. |

`missionComposition.test.ts` now has an explicit 13-site table. For each site's
first primary, both the base mission reach and equipped Arcade reach must admit
a hull-safe, collision-free scanning position on real terrain. The real submarine
steps there; the real scanner rejects a too-shallow position and completes the
primary at a legal depth. The existing 13-site opening-distance and clearance
checks still run before and after procedural props load. All **27 tests pass**.
No content, visual assets, styles, tuning values, storage keys or schemas changed.
No new bugs were confirmed in Save/Progress/Cosmetics or Daily; their existing
migration, reward, protection, midnight and idempotence specs pass in the focused run.

## Validation

- PASS: focused capability suite, **15 files / 305 tests**, covering settings,
  progress, cosmetics, migration/save soak, Daily boot/system/completion, input,
  photo storage/lifetimes, discovery storage and the 13-site mission table.
  Command: `npx vitest run --configLoader runner --pool=threads --cache=false`
  with the corresponding existing unit files. Log: `/tmp/2070-capabilities.log`.
- PASS: final lifecycle follow-up, **4 files / 58 tests**; final clock follow-up,
  **8 tests**. Logs: `/tmp/2070-lifecycle-final.log`, `/tmp/2070-clock-final.log`.
- PASS: TypeScript and production build using the repository's writable-config
  workaround (bundle `vite.config.ts` with Rolldown to `.cache/2070-vite.config.mjs`,
  then `npm run build -- --config .cache/2070-vite.config.mjs --configLoader native --outDir dist-2070`).
  Log: `/tmp/2070-build-final.log`. Default config bundling cannot write to the
  shared read-only dependency tree; Vite's runner also fails the PWA close hook.
- PASS: strict content validation, attribution and changed-file formatting.
- Python: **162/166 pass**; four build-manifest tests fail because the sandbox
  denies `spawnSync git` with `EPERM`. Log: `/tmp/2070-python.log`.
- Browser suite attempted against isolated `dist-2070`, port 4207, but preview
  cannot bind `127.0.0.1:4207` (`listen EPERM`). No browser assertions or screenshot
  QA claimed. Logs: `/tmp/2070-e2e.log`, `/tmp/2070-preview.log`.
- PASS: full unit suite, **190 files / 2,253 tests**, in 509.46 seconds.
  Command: `npx vitest run --configLoader runner --pool=threads --cache=false --reporter=verbose`.
  Log: `/tmp/2070-unit-final.log`. The initial broad run exposed two startup
  fixture failures after adding document listeners; the corrected fixture and
  final run pass. The final clock regression additionally checks that repeated
  frozen frames continue camera/UI timing and remove their visibility listener.
- PASS: relevant browser test discovery, **14 tests / 4 existing specs**
  (`d-input-hud`, `d-photo`, `f-save-soak`, `mission`). Execution remains blocked
  as described above. Log: `/tmp/2070-e2e-discovery.log`.

Changes are uncommitted. Temporary isolated build output was removed after checks.
