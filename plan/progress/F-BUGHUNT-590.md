# F-BUGHUNT-590 — Blue Hole spawn and Journal/debrief

## Plan

1. Round 1: run the full gate against the merged tree; inspect Blue Hole
   spawn/camera geometry and the 510 Journal/debrief layout and lifecycle.
2. Add focused regression checks for Arcade/Realistic Blue Hole openings,
   Surface start, both touch sizes, and scanned Journal entries at all five
   heroes. Fix only failures that establish a product bug.
3. Round 2: rerun the full gate, capture both Blue Hole golden sets, review
   rendered frames, and record results and changes in the changelog.

## Findings and changes

The initial sandbox source and geometry audit established no product bug. The
current merge includes F-BLUEHOLE-PITCH: altitude -22 and vertical chase
offset 22, plus the portrait Journal header and fact-table rules. The 510
Journal-open and debrief-show lifecycle resets are present.

One regression test was checking the wrong camera: `freeDiveComposition.test.ts`
passed the horizontal offset but omitted `chaseOffsetY`. It now applies all
authored camera offsets, matching the actual props-system opening.

- `tests/unit/blueHoleSpawn.test.ts`: actual survey tile and procedural props
  at Low/High; Arcade/Realistic openings; every rendered hull vertex above
  terrain; hull/eye clear of prop colliders; eye and all near-plane corners
  above terrain at both touch aspects; underwater eye and camera reset.
- `tests/e2e/f-bughunt-590.spec.ts`: nine focused browser tests. Four cover
  both modes at 844×390 and 390×844, Surface choice through the briefing,
  HUD containment/overlap, scene-only non-black captures and 30 warmup + 60
  sampled frames against the existing Low budget of 1,500 draws / 1,500,000
  triangles. Five cover each hero's actually scanned Journal entry at
  390×844, header/count/nav/body/table/cell widths, debrief scan count and
  Journal return/focus/scroll. The scan uses an explicit test teleport and
  held scan input; this checks layout and unlocks.
- `CHANGELOG.md`: records the regression correction and focused coverage.

The initial pass changed tests and documentation only. The browser-capable
gate subsequently established the landscape HUD bug described below.

## Browser-capable gate follow-up

The orchestrator ran the full gate outside the sandbox. Static gates and
project-base E2E passed; main E2E reported **352 passed, 21 skipped, six
failed**. All 15 existing 510 flow tests passed, including scanned Journal
and debrief at each hero and size. The three passing 590 tests covered
Arcade at both sizes and Realistic portrait; the Realistic landscape opening
also passed its geometry, budget and scene-only non-black assertions before
the Surface check failed. Preserved gate logs:
`.cache/bughunt590/orchestrator-before-fix/`.

| Failure                                                                      | Root cause                                                                                                                                      | Fix                                                                                                                                                                                                |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Realistic Surface at 844×390: readouts overlap ballast slider                | Supplies and wrapped current rows retained their desktop spacing/line height beneath the mission panel, making the right stack too tall.        | In the existing short-landscape media query, use compact supplies/current spacing and 12px/1.25 line height; set hull gauge line height to 1.25. All fields, meters and controls remain visible.   |
| All five focused portrait tests time out tapping hidden Pause after scanning | The new phone spec called `scanWithKeyboard`. A real keyboard event intentionally switches `TouchControls` to desktop mode, hiding touch Pause. | Hold native Chromium touch input on the visible Scan button and run the existing `completeScan` helper; release the gesture and assert touch Pause remains visible. No forced input-mode override. |

The no-overlap and no-clipping assertions, visibility requirements, scan
counts, scroll/focus checks and frame budgets are unchanged. The Realistic
Surface check additionally asserts that supplies/current remain visible and
that the readouts have no horizontal overflow. No features, HUD controls,
geometry or product text were added.

Failure artifacts:
`test-results-gates-4372-4042563/f-bughunt-590-590-Blue-Hol-8fe62--Surface-start-remain-clear-chromium/error-context.md`
and the five `f-bughunt-590-590-scanned-*` error contexts under the same root.
The portrait Realistic Surface PNG was inspected; it shows all supplies and
the wrapped current row, consistent with the additional landscape stack
height. The focused phone tests had stopped before their Journal assertions;
the 510 suite independently reached and passed those views.

Post-fix typecheck and 41 focused unit tests in five files passed. The
post-fix `tools/gates.sh --no-e2e` passed build, all 1,309 unit tests in 124
files, all 144 Python tests, strict content, attribution and repository
formatting. Final `git diff --check` passed. Preserved static logs:
`.cache/bughunt590/follow-up-static/`. Browser execution of the correction
must be rerun by the orchestrator; this sandbox has no Vite/Chromium access.

## Validation

Round 1 used `GATES_CONFIG_MODE=writable`, preview port 4590 and isolated
output `dist-bughunt590`. Build, 1,307 unit tests, 144 Python tests, strict
content, attribution and repository formatting passed. Full E2E and
project-base E2E stopped before running any tests because preview could not
start. Preserved logs: `.cache/bughunt590/round1/`.

The focused static run passed 26 tests in four files, including the new
Low/High Blue Hole geometry checks, corrected opening regression, debrief
reopen lifecycle and all five heroes' Low/High static prop costs. Log:
`.cache/bughunt590-targeted.log`. Playwright `--list` discovers all nine new
tests; this is discovery, not execution.

Blue Hole static prop cost (both internal LOD branches, before culling):

| Tier | Draw calls | Triangles |
| ---- | ---------: | --------: |
| Low  |          8 |    18,720 |
| High |         10 |   100,506 |

These totals exclude terrain, vehicles, effects and life. The subsequent
orchestrator gate passed the Low full-frame opening budgets for both modes
and sizes, and identified the Realistic Surface overlap described above.
Post-fix layout checks and High rendered counts still require browser execution.
Raw static results: `.cache/perf-budget/static.json`.

Round 2 completed against the updated specs: build, all 1,309 unit tests in
124 files, all 144 Python tests, strict content, attribution and repository
formatting passed again. Full E2E and project-base E2E again stopped before
test execution at preview startup. The project-base build passed in both
rounds. Logs: `.cache/bughunt590/round2/`. The isolated build output was
removed after verification; the rerun command below recreates it.

## Browser and golden evidence

Direct preview diagnosis fails with
`listen EPERM: operation not permitted 127.0.0.1:4590`. Direct Chromium launch
also fails before creating a page with `sandbox_host_linux.cc:41` /
`shutdown: Operation not permitted`.

Attempted both requested golden sets together:
`GOLDEN_SITES=great-blue-hole,great-blue-hole-east node tools/golden-shots.mjs --base-url http://localhost:4590/`.
The tool exited 1 at Chromium launch. Its failure manifest is
`.cache/golden/2026-10-04-082801/poses.json` (`complete: false`, `captures: []`);
log: `.cache/golden-bughunt590.log`. The generated contact-sheet shell contains
no images. Neither alcove has rendered/non-black evidence from this run.

The initial sandbox golden attempt remains incomplete. The orchestrator's
later gate produced the Blue Hole opening/Surface captures described above,
and its successful 510 tests produced the hero Journal/debrief captures.
There is no post-fix browser pass or completed alcove golden set claimed here.

## Browser-capable rerun

```bash
GATES_CONFIG_MODE=writable PW_PORT=4590 PW_OUTDIR=dist-bughunt590 tools/gates.sh --full-e2e
GATES_CONFIG_MODE=writable PW_PORT=4590 PW_OUTDIR=dist-bughunt590 npx playwright test tests/e2e/f-bughunt-590.spec.ts --repeat-each=2 --output=test-results-bughunt590
npx vite preview --configLoader runner --port 4590 --strictPort --outDir dist-bughunt590
```

With that preview running, in another terminal:

```bash
GOLDEN_SITES=great-blue-hole,great-blue-hole-east node tools/golden-shots.mjs --base-url http://localhost:4590/
PERF_SITES=great-blue-hole PERF_TIERS=low,high node tools/perf-budget.mjs http://localhost:4590/ .cache/bughunt590/perf
```

Inspect `great-blue-hole-1/2/3.png` and `great-blue-hole-east-2/3.png` in the
new golden directory for non-black scenes and both alcoves. Review the new
spec's opening, Surface, scanned fact-table and debrief PNGs in the Playwright
output directory. Preserve those files with the gate evidence before removing
the isolated build output.

Scope: existing spawn, cameras, HUD, Journal and debrief only. No new
features, controls or product caveat text.
