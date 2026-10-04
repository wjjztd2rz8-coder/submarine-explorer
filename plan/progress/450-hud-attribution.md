# 450 — HUD bathymetry attribution

## Plan

1. Audit shipped datasets and their credit requirements.
2. Replace the multiline HUD citation with a native expandable data chip, retaining the exact tile credit and adding GMRT licence/source links and transformation notice.
3. Verify collapsed and expanded layouts at 1600×900, 844×390 and 667×375; check mouse, touch and keyboard; capture screenshots.
4. Run `tools/gates.sh --full-e2e`, review results and write the final report.

## Round 1 — attribution audit and implementation

- All 13 real bathymetry tiles identify GMRT; the demo tile identifies synthetic data. Full tile metadata credits remain intact.
- [GMRT terms](https://www.gmrt.org/about/terms_of_use.php), checked 2026-10-03: CC BY 4.0; appropriate credit/byline/link and citation required. No persistent full-citation or specific on-screen placement requirement is stated.
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): appropriate credit, licence link and modification indication may be provided in a reasonable manner. The visible `Data: GMRT` chip leads to these and the unchanged citation in one click/tap.
- [HYCOM acknowledgement](https://www.hycom.org/publications/acknowledgements/hycom-data): recommends publication acknowledgement; Distribution A, public release, unlimited distribution. No persistent on-screen credit is specified. Existing HYCOM attribution in `ATTRIBUTION.md` remains.
- Other shipped dataset imagery is NASA public domain; NOAA audio/imagery is public domain with credit requested. Existing credits remain. CC0 model/texture assets and OFL/Apache notices remain as documented in `ATTRIBUTION.md`; this change removes no third-party credit.
- Native `details`/`summary` provides touch and keyboard expansion. Escape collapses an open credit panel without pausing; full text is populated with `textContent`.
- Reset and chip share a spaced flex footer on desktop. Touch landscape reserves the strip between stick and action buttons for both the chip and its scrollable expanded panel.

## Round 2 — focused verification

- Added four e2e cases: mouse/keyboard at 1600×900, touch at 844×390 and 667×375, and separate synthetic-data credit. They assert the exact retained metadata citation, licence/source links, collapsed/expanded viewport bounds and separation from Reset/touch controls. Screenshot capture is built into the three viewport cases.
- Updated the camera layout assertion for the horizontal Reset/credit footer. Existing HUD layout tests continue to include `.hud-attribution`.
- Added two unit cases proving Space/Enter on the summary keep native activation and do not trigger ballast/photo actions. Both pass.
- Playwright discovers all four new cases. Browser assertions cannot start: default Vite config loading attempts to write into the read-only dependency tree; preview with a writable native config then fails with `listen EPERM 127.0.0.1:4500`. Debug logs also show localhost connection attempts denied.
- Browser skill fallback was checked: no browser connection is available. No desktop/phone screenshots were captured or claimed.

## Round 3 — full gates and final review

- First `GATES_CONFIG_MODE=writable PW_PORT=4500 PW_OUTDIR=dist-450 tools/gates.sh --full-e2e`: config, production build/typecheck, 1,156 unit tests (107 files), 140 Python tests, strict content, attribution and Prettier pass. Both root and project-base builds succeed.
- Full e2e and e2e-base fail before assertions at preview startup; full gate exit status is 1. Logs: `.cache/gates/e2e.log`, `.cache/gates/e2e-base.log`, `.cache/gates/450-preview-debug.log`.
- Final full gate after the additional keyboard cases and accessible label adjustment: all static gates pass, including **1,158 unit tests / 108 files** and **140 Python tests**. Both e2e gates still fail before assertions; overall exit is **1**. Details are recorded in [the final report](450-hud-attribution-report.md).
- Browser acceptance and the six requested-size screenshot captures remain outstanding on a host permitting local preview/browser execution. Run the full gate there; screenshots are generated under `.cache/codex/shots/450-hud-attribution/` by the new spec.

## Orchestrator gate follow-up — root-cause fixes

The orchestrator ran the full gate outside the sandbox: all static gates and e2e-base passed; full e2e reported 278 passed, 21 skipped and five failures. Four credit cases could not find the summary through the button-role locator; Monterey scarp reported an instance 10.625 m below the terrain. The failure logs and page snapshots were inspected.

- The summary appeared as a generic element in the accessibility snapshots. It now has explicit `role="button"` and synchronized `aria-expanded`. All existing role/name, text, tap, keyboard, citation and layout assertions remain; expansion-state assertions are added.
- A regression using the shipped Monterey heightmap reproduced underground sponges/corals (minimum about −10.619 m); rubble instances were already seated correctly (minimum about +0.131 m). The wall-life selector used origin-relative height and ignored the seabed slope. It now measures height above the terrain at the final attachment point.
- The new real-data regression passes: wall life remains present, its attachments are above the seabed, and all instances satisfy the original e2e depth/height limits. `f-geo-scarp.spec.ts` is unchanged.
- Focused regression: 53 tests / five files pass. Latest static gate (`GATES_CONFIG_MODE=writable PW_PORT=4500 PW_OUTDIR=dist-450 tools/gates.sh --no-e2e`): config, build/typecheck, **1,159 unit tests / 109 files**, **140 Python tests**, content, attribution and formatting all pass. `git diff --check` and discovery of all eight attribution/scarp cases pass.
- Corrected full e2e and fresh screenshots await the orchestrator rerun. The earlier attribution cases failed before screenshot capture. Existing unrelated layout captures were inspected and still show the old citation, so they are not delivered as evidence for this change.

## Orchestrator gate follow-up — Escape capture and visual review

The next orchestrator run passed 282 e2e cases, skipped 21 and failed only the desktop credit Escape check; e2e-base and all static gates passed. Both touch credit cases, the synthetic case and Monterey scarp now pass. Desktop credit text, expansion, bounds and control-separation checks passed before Escape.

- Root cause: `shellKeysSystem` handles Escape on window capture. The credit handler ran only later at target/bubble, so the shell paused first. Hiding the HUD made the panel appear dismissed even though Pause had opened.
- `HUD.closeDataCredits()` now closes native details and focuses its summary; the shell calls it ahead of its pause branch and consumes that Escape. The next Escape pauses normally. Settings/photo priorities and existing listener teardown remain intact; no new global listener is added.
- Five unit cases verify the capture-path behavior, focus, normal pause after dismissal, Settings/photo priorities and teardown. The original pause-hidden e2e assertion remains, and a subsequent-Escape pause-visible assertion is added.
- The orchestrator produced all six requested-size chip/expanded screenshots. Visual inspection found expanded phone credits under scan labels; open credits now render at a higher HUD layer (below application dialogs) with an opaque background. Coordinates and control clearances are unchanged. Existing captures are linked in the report and labelled as preceding these last corrections.
- Latest static gate after the corrections: config, build/typecheck, **1,164 unit tests / 110 files**, **140 Python tests**, content, attribution and formatting pass. The two focused attribution keyboard suites pass seven tests.
- Corrected full e2e and refreshed screenshots await the orchestrator rerun. This sandbox cannot run the browser gate; no final full-suite pass is claimed.
