# 450 — final report

The five-line in-game bathymetry citation is replaced by a one-line **Data: GMRT** chip. One click, tap, Space or Enter opens the unchanged tile citation with GMRT source, publication DOI, dataset DOI and CC BY 4.0 links, plus transformation and navigation notices. Synthetic bathymetry shows its own source/credit. The shell's capture-phase Escape handler collapses credits and returns focus before it can toggle pause; the next Escape retains normal pause behavior. Settings and photo mode retain their existing priority.

Reset camera and the chip occupy a spaced desktop footer. On touch landscape, the chip and scrollable expanded panel occupy the reserved strip between the stick and action controls; the panel's maximum height leaves space for Pause. The old tiny mobile multiline citation overrides are removed. Open credits render above scan labels and tutorial hints, with an opaque reading surface; application dialogs retain higher priority.

[GMRT terms](https://www.gmrt.org/about/terms_of_use.php) and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) require appropriate credit, source/licence links and modification disclosure, without specifying persistent display of the full citation. The chip keeps credit visible and exposes the full details in one action. [HYCOM guidance](https://www.hycom.org/publications/acknowledgements/hycom-data) recommends acknowledgement without a persistent HUD requirement. Existing third-party credits remain; `ATTRIBUTION.md` also documents GMRT and the credit path. Audit details are in [the progress note](450-hud-attribution.md).

The credit summary now explicitly exposes the button role and synchronizes `aria-expanded` with the native details state. The orchestrator's failure snapshots exposed the summary as a generic element, so button-role queries could not find it. The role-based locators, text, keyboard, tap, citation and overlap assertions remain; expansion-state assertions were added.

The unrelated Monterey scarp failure was caused by wall sponges and corals being selected using heights relative to the prop origin. On a rising seabed, some attachment points were more than ten metres underground. Wall life now uses height above the actual terrain at each final attachment point. A regression built from the shipped Monterey heightmap and hero prop requires life to remain present, every life attachment to be above the seabed, and all instances to satisfy the existing scarp depth/height bounds. The scarp e2e assertions are unchanged.

The final desktop failure was event ordering: the shell handled Escape at window capture before the original target/bubble credit handler could run. Its pause transition hid the HUD, satisfying the panel-hidden check while still opening Pause. Credit dismissal now runs inside that same shell handler ahead of pause. Five unit cases cover dismissal/focus/event consumption, normal subsequent pause, closed-credit pause, Settings/photo priority, and listener teardown. The original e2e pause-hidden assertion remains; a subsequent-Escape pause-visible assertion was added.

## Validation

- Latest local `GATES_CONFIG_MODE=writable PW_PORT=4500 PW_OUTDIR=dist-450 tools/gates.sh --no-e2e`: **PASS** configuration, build/typecheck, **1,164 unit tests across 110 files**, **140 Python tests**, strict content (13 landmarks), attribution (14 assets), and Prettier. Both attribution keyboard suites pass all seven focused tests. `git diff --check` passes.
- The orchestrator's latest full gate, before the Escape and reading-layer corrections, passed all static gates and project-base e2e. Full e2e had **282 passed, 21 skipped, 1 failed**. Both touch attribution sizes, synthetic credit, all scarp cases, and the desktop credit/layout checks before Escape passed. The remaining failure was desktop Escape opening Pause, addressed above.
- The corrected build has not yet run through Chromium: localhost preview/browser execution remains unavailable inside this sandbox. An orchestrator rerun is required to confirm full e2e acceptance. No assertion, threshold, timeout or test selection was weakened.

## Screenshots

All six captures from the latest orchestrator run were inspected. They demonstrate the chip and panel bounds at each requested size. They precede the final Escape and reading-layer corrections: expanded phone credits had scan labels drawn over them, which the new stacking/background rules address. Refresh these captures on the final build before visual acceptance.

| Size     | Chip                                                                              | Expanded credit                                                                           |
| -------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1600×900 | [Desktop chip](../../.cache/codex/shots/450-hud-attribution/1600x900-chip.png)    | [Desktop expanded](../../.cache/codex/shots/450-hud-attribution/1600x900-expanded.png)    |
| 844×390  | [Phone chip](../../.cache/codex/shots/450-hud-attribution/844x390-chip.png)       | [Phone expanded](../../.cache/codex/shots/450-hud-attribution/844x390-expanded.png)       |
| 667×375  | [Small phone chip](../../.cache/codex/shots/450-hud-attribution/667x375-chip.png) | [Small phone expanded](../../.cache/codex/shots/450-hud-attribution/667x375-expanded.png) |

## Remaining acceptance

Outside the sandbox, rerun `tools/gates.sh --full-e2e` and inspect the refreshed `.cache/codex/shots/450-hud-attribution/{1600x900,844x390,667x375}-{chip,expanded}.png`. The spec captures both states at every requested size.

The latest orchestrator e2e log remains `.cache/gates/e2e.log`, with snapshots under `test-results-gates-4372-3358340/`. Local static gate logs are in `.cache/gates/`; corrected production output is retained in `dist-450/`.
