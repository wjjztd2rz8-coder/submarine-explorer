# 1402 — S-bugs

Implements DIRECTOR backlog S-bugs and the corrected simplification review §6c. No HUD layout, Journal UI, touch How to play diagrams, tutorial or ROV behavior changes.

## Round 1: implementation and evidence

- Searched all `src` and `tests` for `ping`, `pingPressed`, `toggleGlobe`, `playPing` and callers before deletion. No input path set `state.ping`; the frame hook only forwarded false. Only an audio lifecycle unit test called `AudioSystem.ping()` directly. No runtime consumer read `toggleGlobe`, and no default action bound N. Removed the ping edge, player sound/echo scheduling and echo-only config, globe action/type/state/handling, unused Globe key callback and Settings filter.
- The live `playExploreCue()` reused the chirp synthesizer. Preserved its exact 780→270 Hz sweep, 0.025 gain and sonar bus as `playSensorCue()`; this cue serves nearby natural events. Kept standalone ray-march maths and their terrain agreement tests. Audio no longer depends on terrain.
- Binding loading already iterates only active actions. Removed retired entries from v1 defaults; saved retired actions are ignored and never reserve keys. Regression coverage includes v1/v2/v3 retired entries, N reused for Sonar, Journal custom keys, explicit unbound Boost, persistence and reload.
- Added standard pad button 14 (D-pad left) for Journal, 13 (D-pad down) for reset camera and 4 (left bumper) for capture. Existing D-pad up/sim speed, right bumper/scan, Back/sonar and Start/photo remain intact. Button-only input now selects gamepad hints. Controls guide uses action-map labels; touch How to play is touch-only and needs no gamepad edits. README and settings docs document the mappings.
- Chose `auto` for new players. `Quality.detectTier` checks software/tiny GPU/low core-memory devices first, ordinary or masked phones choose Low, flagship phones choose Medium, tablets choose Low/Medium, and unknown/integrated desktop GPUs choose Medium. Handheld checks precede discrete GPU checks; orientation and absent/hidden hints are already tested. These conservative Low/Medium decisions are reliable enough to use at boot. Saved fixed tiers and URL overrides retain existing precedence. Added fresh-save/migration/reload and default-resolution tests.

## Round 2: review and validation

- Reviewed all pad button indices against the existing map and both reference surfaces. Checked each edge for conflicts, end-frame reset, holding/repressing, simultaneous piloting/scan/boost and disconnect/reconnect. Added a fresh-session check that N and Tab are unbound and Q triggers camera only.
- The discovery input flow freezes piloting while Journal is open. Passing only the sampled Journal close edge through that frozen frame allows the new pad button to close it too; neutral piloting/scan and other-modal blocking remain intact. Added capability coverage in `appSystems.test.ts`; no Journal UI or tutorial changes.
- Replaced stale audio/default documentation and comments. Kept the natural-event sensor sound exactly unchanged. No new UI surfaces, settings, dependencies or package-named test files; removed dead input/audio machinery and a terrain dependency.
- The broad unit run found a comment-only edit to `world/Props.ts` violated its source-hash assertion. Reverted that edit; the unchanged hash assertion and all 3 Beebe isolation tests pass on rerun. No snapshots or assertions were relaxed.

## Final validation

- Final production build and strict TypeScript: PASS. Shared `node_modules` is read-only, so the ordinary Vite config loader first failed with EROFS. Used the existing `tools/gates.sh` writable-config approach: bundle `vite.config.ts` locally with Rolldown, then build with `--configLoader native`. Final build log: `.cache/codex/1402/build.log`.
- Full final unit run: **191 files / 1,951 tests passed**, 322.59 seconds. Command: `npm test -- --configLoader runner --cache=false --reporter=verbose`. Log: `.cache/codex/1402/unit-final.log`. Earlier focused passes were 150 tests, then 124 tests including camera/photo/globe/settings controls, and 139 tests after the Journal close-path fix. These sets overlap; the final full count is authoritative.
- Python: **156 tests passed** (`npm run test:py`).
- Strict content validation: **13 sites passed**, zero warnings/errors. Attribution: **14 assets passed**. Changed-file Prettier and `git diff --check`: PASS.
- Full Playwright was attempted with the isolated build/port (`GATES_CONFIG_MODE=writable PW_PORT=4802 PW_OUTDIR=dist-1402 npm run test:e2e`). It stops before executing any tests because preview cannot listen: `EPERM 127.0.0.1:4802`, confirmed by running preview directly. Discovery succeeds: **806 cases in 96 files** (`.cache/codex/1402/e2e-list.log`). No fresh screenshots or browser results are claimed. Temporary `dist-1402` is removed after validation.

To finish browser verification outside this sandbox, build an isolated output, run the full Playwright suite on its own port, and inspect the Controls guide/gamepad view. All test assertions remain in place.

```bash
npm run build -- --outDir dist-1402
PW_PORT=4802 PW_OUTDIR=dist-1402 npm run test:e2e
```
