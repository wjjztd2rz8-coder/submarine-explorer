# 2020 — S-tests step 3

Base: **main `61b2caf`**, 2026-10-15. Two review rounds: assertion/state inventory
and selective worktree recovery, then implementation audit and validation. Scope
follows [S-tests-map.md](S-tests-map.md); the separate
[worktree triage](2020-worktree-triage.md) records all ten removal verdicts.

## Folded coverage and runtime work

| Retired entry                             | Survivor                                                         | Preserved contract and state                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `f-geo-scarp.spec.ts` (20 cases)          | `terrain-render.spec.ts`, wall table (4 sequences)               | Four original sites at Medium, 1280×720/DPR 1, experienced save, free-dive route; wide/toe/oblique/high bright-fill orbit and default-light cockpit views. Each view keeps the original two-frame settle, rock count >20, minimum seat >−3m, maximum seat <half hero height, draws >0, triangles <900k, missing-hero throw and page-error checks. Only boot/loading is shared across five views. |
| `f1-terrain.spec.ts` (12 cases)           | `terrain-render.spec.ts`, seabed table (12 cases)                | Six biome sites × Low/High; original coordinates, 1600×900, 8m then 3.5m camera states, navigation/readiness, 3s/1.5s waits, and favicon/404-only error filter. No invented nonblank assertion. `SHOT_SITE`, `SHOT_TIERS` and `SHOT_TAG` remain available.                                                                                                                                       |
| `visual-qa.spec.ts` (14 opt-in cases)     | `terrain-render.spec.ts`, catalog approaches (14 ordinary cases) | Fresh save and new-player default tier, 1280×720/DPR 1; all 13 hero mappings, loaded scene, draw/failed-prop/tile/landmark/errors, missing/empty/no-clear-40m-and-15m approach throws. Exact east-grotto authored pose retains hull/camera unblocked, floor >1m, underwater and failedProps=0. Original real-time settle policies remain. Images are optional; guards now execute ordinarily.    |
| `f-sonar-palette-1200.spec.ts` (10 cases) | `d-sonar.spec.ts`, scoped relief table (10 cases)                | Five sites × 800×500 desktop /390×844 touch at DPR 2, Low, experienced save. Legend absence, >1000 colored pixels, zero lime, >20 colors, CSS×2 canvas, raster padding 96, span ≥20, finite contours when range ≥2, left/right placement and portrait width 96. Canvas pixel readback remains unconditional.                                                                                     |
| `s-journal-picture.spec.ts` (3 cases)     | `journal-debrief.spec.ts`, scan-still table (3 cases)            | Original 1280×800, 390×844 and 844×390 fresh explicit contexts; native first scan at the same Titanic mission/POI route, spawnedAt and stored still readiness, Journal visibility, exactly one image before the text, width >150, right edge ≤viewport+1, page errors and context cleanup.                                                                                                       |

The original three capability specs retain all their rows, routes, viewports,
scales, touch/DPR/save options, timers, scan actions and stress-round defaults.
The recovered 1790 patch adds four guidance-lifecycle and three legacy-save rows.
No unique opening, control-action, photo-storage, fidelity/perf or non-hero-site
coverage was removed. `f-fidelity-rollout` stays ordinary with all 20 cases;
Blue Hole's material guard stays ordinary and its existing golden diagnostic stays
`@render`. `f-bluehole-1030` is unchanged. No new skips or relaxed thresholds.

The primary runtime saving is **16 fewer scarp boots**. Review-only screenshot
persistence in the three large capabilities and the folded render/sonar families
now requires `PW_RENDER_REVIEW=1` (or the former `VISUAL_QA=1` alias). Assertions,
real input, frame steps, numeric probes and JSON diagnostics still execute.
The horizon PNG used for brightness assertions, sonar canvas pixels and actual
in-game photo captures remain unconditional. Image attachments are conditional
with their files, so ordinary runs do not attach missing evidence.

## Discovery and assertion audit

| Inventory, default environment                        | Before | After |
| ----------------------------------------------------- | -----: | ----: |
| Entry specs                                           |     69 |    65 |
| Discovered local cases                                |    802 |   793 |
| Declaration-time skipped cases                        |     22 |     8 |
| Cases from the five retired entries / their survivors |     59 |    43 |

The overall reduction is 16 merged cases plus seven recovered regression cases.
Activating the 14 formerly opt-in collision guards means potentially active local
cases rise from 780 to 785; listing does not expose existing body-time skips.
This is intentional retained ordinary coverage, not an asserted active-case cut.
Current hosted discovery is **776** cases after the existing `@render` exclusion.

An AST audit matches **all 37 original matcher expressions and five explicit
throws** from the five removed files exactly in their survivors. Extending the
same audit to the three pre-existing capability specs accounts for **725 matchers
and 12 explicit throws**, with zero missing expressions. State/fixture review and
59→43 expanded-row mapping supplement expression matching: an identical matcher
elsewhere is not by itself sufficient coverage.

All 59 old selections map to 43 survivors. Timing keys for retired entries are
removed, migrated unchanged where one-to-one, or summed conservatively for each
five-view scarp sequence. No unmeasured duration is presented as a speedup.
Local, hosted and nightly inventories each pass exact/exhaustive 30-shard regex
selection. The normal shard count remains 30; balancing uses the updated keys.

Evidence: `.cache/2020/{before,after,hosted}.json`, `assertion-audit.log`,
`assertion-survivors.json`, `inventory.log`, and the audit/migration scripts.

## Scheduled evidence

The existing scheduled/manual `render-nightly.yml` keeps its original diagnostic
selection (47 cases), benchmark, cancellation rules and failure uploads. Its JSON
report now lands in its uploaded evidence directory. The golden root build is
bound to SHA, deployment base, lockfile and Node version by the existing build
manifest helper and uploaded once. Four independent review shards download and
verify that exact artifact before running the three large capabilities, terrain
and sonar with `PW_RENDER_REVIEW=1` (**343 discovered cases**). They retain the
existing round defaults. Test-level sharding distributes the 343 cases as
86/86/86/85 while each shard still uses one worker; the large HUD file therefore
does not occupy an entire shard. No ordinary gate or test moves exclusively to
nightly.

Each review shard uploads captures, numeric JSON, Playwright results and failures
under a shard/run/attempt/SHA-specific name. The original 20 wall, 24 seabed and
40 catalog images retain their filenames and authored camera recipes. The ten
sonar crops retain the current source's single-map capture recipe; the older map's
extra viewport capture had already been removed on main. Reports are diagnostic;
no hosted run or pixel comparison was performed in this task.

For a socket-capable host, reproduce the requested two-round browser validation:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4472 PW_OUTDIR=.cache/2020/dist \
  ROUNDS=2 npx playwright test tests/e2e/terrain-render.spec.ts \
  tests/e2e/d-sonar.spec.ts tests/e2e/hud-touch.spec.ts \
  tests/e2e/opening-framing.spec.ts tests/e2e/journal-debrief.spec.ts
```

Build that output first using the canonical build phase. Add `PW_RENDER_REVIEW=1`
for the corresponding review images. Compare before/after runtime on the same
quiet, socket-capable host before claiming a percentage saving.

## Validation and limits

- **PASS:** TypeScript; production Vite bundle; strict content; attribution;
  repository-wide Prettier; AST retention and complete discovery/shard audits.
- **PASS:** the six affected unit files, 283 tests, including fixed scarp
  equivalence digests; golden tooling, 23 individually executed cases.
- **FAIL as expected on main source:** the three truncated-save and two immediate
  Pause regressions, reproduced in an isolated copy. All five pass on this branch.
- **PASS:** workflow YAML parse, triggers/matrix/fail-fast checks and `bash -n`
  for every shell block. Hosted execution remains unverified.
- **ENVIRONMENT FAILURE:** Python 162/166 pass; four existing manifest tests fail
  at `spawnSync git EPERM`. The canonical build phase likewise completes the
  TypeScript/Vite bundle, then fails in that unchanged manifest helper. No gate
  or subprocess check is weakened.
- **BLOCKED before assertions:** the `ROUNDS=2` folded browser run cannot start
  its owned preview. No e2e pass, pixel invariance or measured shard-time saving
  is claimed. Browser logs are `.cache/2020/e2e.log`.

**Full unit PASS: 190 files / 2,280 tests, no skips.** The first partition passes
6 files / 283 tests in 58.10 seconds; the disjoint remaining partition passes
184 files / 1,997 tests in 836.28 seconds. Both use the existing writable config
loader, disabled dependency cache, one thread worker and verbose reporting.
No expensive passing test was repeated. These unit durations are not e2e timing
measurements. Build, Python, golden, formatting and unit logs are under
`.cache/2020/`.

No worktree deletion, merge, push, tag, external message or workflow dispatch.
