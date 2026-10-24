# 3600 — S-bughunt: settings persistence

Serves `plan/DIRECTOR.md` Backlog 9 (`S-verify / S-bughunt`). No push.

## Plan

1. Trace saved settings, controls, touch detection, audio and cosmetics through boot and live consumers; identify stale keys and repeated resolution.
2. Extend existing capability specs at uncovered round-trip boundaries. Fix only reproduced defects, minimally.
3. Perform a second audit round, run the headless gates and record findings and limits.

## Progress

- Read Director simplicity rules, repository conventions and the gate runner.
- Round 1: traced settings v3 with v2/v1 fallback; bindings v3 with v2/v1 fallback; separate pointer-look and touch-seen keys; progress v2 stored at the unchanged progress v1 key.
- Arcade/Auto are the first-run defaults. Named modes replace known switches; Custom preserves switches and its Arcade/Realistic base. Fixed quality tiers survive migration; URL overrides intentionally win without rewriting the saved choice.
- Existing tests already cover hostile storage, protected future saves, retired controls, accessibility and partial audio fields. Adding coverage at the remaining storage-to-consumer boundaries.

## Findings and minimal fix

Audited base `04cf357` in two rounds. One behavioral defect reproduced: Home
does not construct `TouchControls`, so it has no `html.is-touch` class. Its
Controls guide correctly resolves the saved touch hint, coarse phone hardware
or `?touch=1`, while Settings looked only at that missing class and exposed the
keyboard-binding pane. Three added cases in `overlayFocus.test.ts` failed at
the hidden-controls assertion before the source change (log:
`/tmp/3600-touch-before.log`).

Settings now also queries the already resolved Controls guide device through
an optional callback. The dive's existing touch class remains supported. There
is no new detector, stored preference, listener, mutable state or UI surface.
All three cases pass, including suppressed binding-pane requests and a
touch → mouse → touch sequence. The existing capability tests still cover
binding-capture cancellation, focus recovery and desktop navigation.

## Storage → resolution → consumer inventory

All ordinary preferences enter through `Save.load()` / `migrate()` in
`src/core/Save.ts`; it reads settings v3, then v2/v1 only if the current record
is absent or damaged. `ctx.settings` is a boot snapshot; live consumers use
Save notifications or `ctx.effective`, rather than mutating base Config.

| Stored field                                                                          | Resolution and consumer                                                                                                                                            | First run / reload / live behavior                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `graphicsTier`                                                                        | `boot.ts` → `resolveQuality()` → `ctx.tier` for renderer, terrain, atmosphere, vehicles and title                                                                  | Auto initially; saved fixed tier retained. URL fixed/Auto intentionally wins without persisting its result. Auto re-detects each boot. Dynamic resolution changes pixel ratio only. `resolveGraphicsTier()` is not used by application boot.                    |
| `postFx`                                                                              | boot initializes `ctx.postFx`; Settings listener updates it; `renderSystem` chooses the post pass                                                                  | Config default initially; stored false survives reload; a tier without a post stack still disables the pass.                                                                                                                                                    |
| `detailStrength`                                                                      | `terrainSystem` builds Terrain with the saved value                                                                                                                | Config terrain default initially; stored zero retained. Changes deliberately wait for reload.                                                                                                                                                                   |
| `reduceMotion`                                                                        | `settingsSystem.syncMotion()` combines saved choice with OS preference → rig, waypoints and document dataset; rendering, vehicle and title read that result        | Saved false never disables the OS preference. Audio receives the saved flag separately to soften score dynamics. See repeated initialization below.                                                                                                             |
| `captions`                                                                            | `audioSystem` initializes Captions; Settings listener calls `setEnabled()`                                                                                         | Saved choice applies before any unlocked audio cue; live toggle reaches the same overlay.                                                                                                                                                                       |
| `sonarPalette`                                                                        | Settings system → Sonar; waypoint system → Waypoints                                                                                                               | Both distinct consumers initialize from the same saved field and subscribe to edits. No independent palette fallback in the app wiring.                                                                                                                         |
| `uiScale`                                                                             | Home/dive resize → `uiScaleFactors()` → CSS variables; live Settings edits update the user factor                                                                  | Default 100; validated 80–150. Auto viewport factor and user factor remain separate. Live `uiScale / 100` matches the resize calculation.                                                                                                                       |
| `hullWarningStyle`                                                                    | `hudSystem` → `HUD.setHullWarningStyle()` at initialization and on edits                                                                                           | Default `both`; stored `vignette` / `gauge` survive reload.                                                                                                                                                                                                     |
| `masterVolume`, `sfxVolume`, `musicVolume`, `muted`                                   | `audioSystem` feeds Save values to AudioSystem before unlock and on edits; AudioSystem owns graph gains                                                            | Config volume defaults, mute false. Valid zero preserved. Pause/hidden-page silence does not rewrite saved volume/mute; a new graph restores the edited mix.                                                                                                    |
| `gameplayMode`, `gameplayBaseMode`                                                    | Save normalizes preset identity; `resolveEffective()` produces handling, camera, light, sensor, scan and power settings; mode system applies live results          | Default Arcade. Custom retains its last Arcade/Realistic base. Boot and live edits use the same effective resolver from pristine Config; repeated switches do not compound equipment multipliers.                                                               |
| `gameplay.visualHints`                                                                | effective gameplay → waypoint system                                                                                                                               | Arcade true / Realistic false; Custom respects saved boolean. Approach objectives intentionally retain navigation until scan range.                                                                                                                             |
| `gameplay.startPosition`                                                              | effective initial value → mission system/router; Briefing reads Save for live preview and Begin                                                                    | Both presets start near-site; Custom surface choice retained. A start choice controls mission placement, not an in-progress teleport on every settings edit.                                                                                                    |
| `gameplay.batteryOxygen`                                                              | effective gameplay → Power initialization and mode-system updates                                                                                                  | Arcade false / Realistic true; Custom saved false retained.                                                                                                                                                                                                     |
| `gameplay.currents`                                                                   | effective resolver → preset/current system and HUD                                                                                                                 | Arcade off / Realistic sampled currents. Custom retained; Daily conditions intentionally override effective current strength without changing storage.                                                                                                          |
| `bindings` metadata in settings                                                       | Save always canonicalizes to `SAVE_KEYS.bindings`                                                                                                                  | An obsolete pointer cannot redirect Input. Input independently owns the binding payload.                                                                                                                                                                        |
| `subexplorer.bindings.v3`                                                             | Input loads v3, then v2/v1 → one live action map → keyboard sampling and labels                                                                                    | Known legacy defaults migrate, explicit unbound actions stay unbound, retired actions drop. Reset removes supported binding keys, independently of settings.                                                                                                    |
| `subexplorer.pointerLook.v1`                                                          | Input parses literal `true` → pointer system's lock policy and Settings button                                                                                     | False initially. Saved opt-in restores the preference, never an active browser lock. Both true and false survive settings/binding resets.                                                                                                                       |
| `subexplorer.touch.v1`                                                                | `detectTouchPrimary()` accepts literal `1`; TouchControls owns dive mode; Controls system resolves menu device                                                     | Remembered, hardware and forced touch initialize correctly; the Home Settings consumer omission is fixed above. Mouse/keyboard still replace touch as the current input. This is a touch-seen hint, not a persisted last-input choice.                          |
| `cosmetics.paint`, `trim`, `decal`, `frame` in `subexplorer.progress.v1` (payload v2) | ProgressSave migrates/validates entitlement per slot → Progress selection; SubScreen preview and next-dive SubMesh use paint/trim/decal; photo capture reads frame | Stock initially. Valid independent slots persist; unknown/unearned slots fall back alone. Legacy entitlement grants survive reload without duplicate grants. Low-tier decal omission is an existing detail-budget policy; decal propagation is checked at High. |

## Repeated resolution and intentionally ignored values

- Named Arcade/Realistic gameplay switches resolve in both `Save.migrate()` and
  `resolveEffective()`. Stored named-preset switches that disagree with the
  preset are deliberately replaced; Custom alone keeps individual choices.
  This is duplicated policy, but both paths agree and the effective resolver
  never multiplies an already modified config. No speculative refactor taken.
- Waypoints first receive the raw saved reduced-motion flag during their init,
  then `settingsSystem` applies saved OR OS preference before the first frame.
  This is redundant initialization, not a first-run/reload discrepancy. Live
  edits have one waypoint update path; the existing OS-preference test passes.
- Touch detection is shared code but is called by both TouchControls and the
  Controls guide; Settings previously inferred it from only the dive class.
  The fix consumes the existing guide result on Home rather than adding a
  third storage/media-query read.
- Sonar palette intentionally fans out to Sonar and Waypoints. Reduced motion
  similarly has several consumers. These are applications to different
  components, not compounded effective settings.
- Audio applies gains before first unlock and again on live edits/resume.
  Those are graph lifecycle boundaries, with one saved mix. UI scale likewise
  applies on initial resize, live edits and subsequent resize.
- Retired top-level `simSpeedDefault` / `controlTips` and gameplay
  `speedProfile`, `descentProfile`, `lights`, `sensors`, `sonarMarkers`,
  `simSpeed` do not regain consumers. Legacy Custom research speed is read once
  to infer its base before removal; gentle/exaggerated currents migrate to
  sampled strength. Unknown extension fields survive migration and edits.
- Older settings/binding keys remain intentionally readable fallbacks; valid
  current keys take precedence, and persisted reset defaults prevent stale
  remaps/preferences returning. Discovery/research saves remain independent.

## Round 2 and validation

- Rechecked Home init order (Settings before Controls), live device transitions,
  dive class compatibility, legacy-key precedence, named/Custom defaults,
  Daily overrides, audio unlock/resume, and per-slot cosmetic validation.
- Added **16 cases** to five existing capability specs, plus strengthened three
  existing startup cases in a sixth spec. No new specs, relaxed assertions, snapshots, schema,
  dependencies, tuning, site branches or runtime Config mutations.
- Focused run: **10 files / 489 tests passed** (`/tmp/3600-capabilities.log`).
  Coverage includes settings-save, modes, touch detection/controls and the six
  edited specs. The cosmetic consumer test uses High because Low deliberately
  skips decal atlases; the initial Low fixture failure required no source fix.
- Typecheck passed (`/tmp/3600-typecheck.log`).
- Full gate: config preparation, strict content validation, production build,
  attribution and repository-wide Prettier passed. The complete unit suite
  passed: **192 files / 4,101 passed / 4 expected failures**, 622.09 s. Python:
  **167 tests / 5 failures**, matching the earlier
  `2750-S-bughunt-touch-settings.md` report: four unchanged build-manifest cases
  fail at `spawnSync git EPERM`; the unchanged golden wrapper fails with
  `Unexpected end of JSON input` in comparison CLI output. These are outside
  this package; no tooling or assertions were changed. Logs:
  `.cache/runs/20261023-231955-3-NYiKi3/` and `/tmp/3600-gates.log`.
- `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e` exited **1**,
  `FAIL gates (e2e=none)`, solely from those Python failures. Browser checks
  and visual acceptance were not run under the Director's headless Codex lane.
- Final formatting of owned files and `git diff --check` passed.

The source change is limited to the demonstrated Home device-consumer mismatch.
The duplicate resolutions listed above remain findings rather than speculative
cleanup. No settings were added, no feature was cut, and no Director changes,
merge, push or tag were made.
