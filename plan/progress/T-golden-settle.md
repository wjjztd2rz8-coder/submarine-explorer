# T-golden-settle — shared terrain settle for mission captures

2026-10-29, Codex. Implementation complete; three-site visual acceptance remains blocked by sandbox preview/browser permissions. **Whether Endurance's hard-edged seabed patches persist when settled is unverified.** No before/after PNGs were produced, so this change does not establish that the patches disappear.

## Change and simplicity

Both capture paths now call `window.__goldenFrames.settle()` before their opening capture. This one helper awaits `terrain.texturesReady`, then samples eight animation frames (seven intervals), retaining the existing free-dive timing metrics. Mission capture can hold only a subsequent rendered game frame; an unrelated animation callback cannot trigger the hold. The +10 s mission shot still advances from that settled opening and excludes screenshot readback time from gameplay time.

The starting revision (`3b905b813d6852e5e3f8f02d3a1a90983ebeedae`) already waited for terrain texture decoding in the mission frame scheduler. The actual discrepancy was that missions held the first rendered frame after decoding, while free dives ran an additional frame settle. This change replaces that separate mission texture watcher and the runner's free-dive settle function with one shared helper. Texture decoding now precedes the settle frames in both paths. The two production tools total **nine fewer lines**. Existing golden-frame capability tests cover delayed decoding, settling before the mission hold, rendered-frame identification, repeated free-dive pose settling, and +10 s/readback timing.

Changes are confined to `tools/golden-shots.mjs`, `tools/golden-frames.mjs`, their existing tooling tests, and this report. No art, site tuning, application behavior, or DIRECTOR changes; no merge or push.

## Verification

- `node --test --experimental-test-isolation=none tools/tests/golden-frames.test.mjs tools/tests/golden-options.test.mjs`: **19/19 passed**. Log: `.cache/T-golden-settle-focused-tooling.log`.
- Full `node --test --experimental-test-isolation=none tools/tests/golden-*.test.mjs`: **26/27 passed**. The unchanged `golden comparison refuses partial sets, missing files and incompatible poses` test fails parsing empty child-process CLI stdout (`Unexpected end of JSON input`). Running the untouched manifest suite separately reproduces it; neither that test nor its comparison dependencies changed here. Logs: `.cache/T-golden-settle-tooling.log`, `.cache/T-golden-settle-unchanged-manifest.log`.
- Before and after `tools/golden.sh` attempts both completed the production/typecheck build, then failed starting preview with `listen EPERM 127.0.0.1:4298`. Logs: `.cache/T-golden-settle-before.log`, `.cache/T-golden-settle-before-preview.log`, `.cache/T-golden-settle-after.log`. No capture comparison was possible.
- A direct after-change runner attempt also failed at Chromium launch (`sandbox_host_linux.cc:41`, `Operation not permitted`). It preserved an **incomplete** sheet at `.cache/golden/2026-10-29-134720/`, with the three requested missions planned and **zero captures**. This is failure evidence, not a review set. Log: `.cache/T-golden-settle-runner.log`.
- Searched `tests/e2e` for `texturesReady`, `golden`, and mission capture coverage. Ran the existing `opening-framing.spec.ts` spawn PNG/manifest cases for Endurance, Titanic and Monterey with `--repeat-each=2`. Discovery selects **six cases**. Execution fails before browser assertions: preview connections to both `::1:4297` and `127.0.0.1:4297` return `EPERM`. Logs: `.cache/T-golden-settle-discovery.log`, `.cache/T-golden-settle-focused.log`.
- Node syntax checks, scoped Prettier and `git diff --check` pass.

## Rerun with local preview and Chromium access

The same capture command was attempted before and after the change:

```sh
GATES_CONFIG_MODE=writable \
  GOLDEN_SITES=endurance,titanic,monterey-canyon \
  GOLDEN_MODE=mission GOLDEN_LAYOUTS=desktop \
  bash tools/golden.sh
```

Capture the starting revision and this change in separate checkouts with identical assets/settings. Each run should produce six High desktop PNGs: opening and +10 s for each of the three sites. Compare the sheets, especially `endurance-1-mission.png`, and record whether the patches remain. Mission physics continues during settling, so the opening pose/time may differ; inspect manifest poses alongside image differences. Do not treat an incompatible-pose comparison or an incomplete manifest as a visual pass.

Required focused two-round browser command:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4297 \
  npx playwright test tests/e2e/opening-framing.spec.ts \
  -g '(endurance|titanic|monterey-canyon): persists spawn PNG and golden manifest' \
  --repeat-each=2 --output=.cache/T-golden-settle-focused
```

The Endurance verdict and before/after comparison remain outstanding until those captures can run.
