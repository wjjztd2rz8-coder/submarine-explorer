# 2060 — S-verify, seventh pass

Baseline: **2030 worktree HEAD `521ae8c`** (confirmed through `git worktree
list`); reviewed checkout **`aa059aa`**. Scope: S-tiers, 2010, 2020 and
`22e1cf2`. Two rounds: source/assertion inventory and regression fixes, then
independent review and focused validation. No visual changes.

## Round 1 — audit and repairs

- Compared all 16 source object tables with Low/Medium/High rows against the
  baseline: all three rows are identical in every table. Covers quality DPR,
  atmosphere, terrain detail and fidelity (Monterey, Lost City, Blue Hole), event
  particles, preset particles, title snow/budgets, wash, life, GEO and wrecks.
  Also inspected flange segment and tier branch changes: supported tiers keep
  their existing behavior. No Ultra budget was folded into High.
- Runtime/save/config/settings/preview/golden/nightly checks find no live Ultra
  tier. Remaining source references intentionally migrate saved `ultra` or
  recognize Apple M-series Ultra GPUs. Architecture documents describe migration;
  dated changelog/progress/review records retain their historical evidence.
  Corrected the remaining current-doc inaccuracies: atmosphere's "four tiers"
  and the duplicated architecture section's Medium default. Both architecture
  sections now explicitly document that `?tier=ultra` is ignored.
- **Confirmed tooling defect:** both archived geometry entrypoints still defaulted
  to `low,medium,high,ultra`, although they load current terrain code. Removed
  that default through a shared diagnostic tier selector, also used by
  `perf-budget.mjs`; unsupported/empty tiers fail before scene/browser setup.
  Performance defaults stay `low,high`; nightly explicitly requests all three.
  Added three tests in the existing `quality.test.ts` capability for defaults,
  subset ordering/whitespace, and invalid values; its supported-list check also
  matches the runtime `GRAPHICS_TIERS`. Restoring the extracted old policy makes
  two tests fail; after repair all three pass. The default terrain diagnostic
  completes Low/Medium/High and writes `.cache/2060/geometry.json`.
- Added settings v1/v2/v3 persistence/reload guards for Ultra→High and URL guards
  across every saved setting, including Auto and `urlForced=false`.

### 2020 assertion retention

Compared `12ea733^` with `12ea733` using the installed Prettier TypeScript AST,
matching complete matcher calls and explicit throws, including multiplicity within
each original file. Also reviewed fixture, route, viewport, input, timer and
per-view state changes. **Lost or loosened assertions: none.**

| Original → survivor                        | Matcher calls | Throws | Missing/loosened |
| ------------------------------------------ | ------------: | -----: | ---------------- |
| f-geo-scarp → terrain-render               |             6 |      1 | 0                |
| f1-terrain → terrain-render                |             1 |      0 | 0                |
| visual-qa → terrain-render                 |            12 |      4 | 0                |
| s-journal-picture → journal-debrief        |             6 |      0 | 0                |
| f-sonar-palette-1200 → d-sonar             |            12 |      0 | 0                |
| existing hud-touch → hud-touch             |           206 |      3 | 0                |
| existing journal-debrief → journal-debrief |           296 |      1 | 0                |
| existing opening-framing → opening-framing |           149 |      3 | 0                |

The five removed specs account for 37 matcher calls and five throws; the entire
comparison accounts for 688 matcher calls and 12 throws under this counting
method. Scarp coverage now shares a boot for five views (20 cases → four
sequences), with unchanged rock counts/seating and per-view draw/triangle limits.
Catalog collision guards became ordinary tests. Screenshot persistence became
opt-in; numeric/pixel assertions and actual in-game photo capture remain ordinary.
Each scarp view still settles two frames; seabed and catalog retain their waits.
Scan stills retain explicit fresh contexts, native scan, stored-photo readiness,
image order/count/width, right-edge bounds and page errors. No screenshot equality
assertion existed in the retired files.

### 2010 and legacy save follow-up

- `4940daa` remains intact: HUD registers disposal; waypoint teardown removes
  its view and ignores pending POIs using a flag scoped to that lifetime. Existing
  settled/pending waypoint and repeated HUD-lifetime unit cases pass. Save/bus
  subscriptions unsubscribe before DOM teardown.
- Home still ignores a swipe's trailing pointer click while allowing keyboard
  clicks (`detail=0`). The completion buttons retain native Tab stops; pointer
  focus prevention and Input's native button handling remain intact. Existing
  swipe/keyboard and banner Tab/Space/Enter capability cases pass. Their browser
  regressions remain in globe-pins/hud-touch.
- `22e1cf2`'s fixture edit is correct: Daily boot has synchronized its record's
  streak into Progress since `310-f-cosmetics`. The secret/sample fixture's
  best=0, Daily=2 previously produced best=2, so an exact best=0 expectation was
  invalid. Setting the fixture best to 2 does not hide an application regression,
  but removes that mismatched-record scenario from the browser row.
- Restored that scenario in `daily.test.ts`: real ProgressSave/DailySave and
  `createDailySystem.start` test best values 0/1/2/12 against the fixture's Daily
  streak 2, then a cosmetic edit and storage reload. Lower bests rise, higher
  bests survive, and all other Progress fields, Journal records and Daily data
  remain equal. Each case disposes its timer. The three archived fixture browser
  rows still assert balances, purchases, ratings, cosmetic grants and independent
  data. No fixture was changed in this pass.
- The other `22e1cf2` edit replaces a locator auto-wait with a synchronous slot
  query inside an explicitly bounded frame loop. Its final Animal hint assertions
  are unchanged; this avoids waiting for a missing DOM slot while time is paused.

## Round 2 — validation

- **PASS: 428 distinct unit cases in 13 existing capability files.** First audit
  invocation: six files pass; two newly written Daily checks initially assumed
  an untouched legacy record had already been rewritten as v2. Corrected the
  test to perform its intended cosmetic edit before asserting stored v2 data.
  Final Daily tests pass (12/12), updated quality/settings pass (68/68, including
  three tooling regressions), and the four other original audit files retain
  their passes. Second-round batch: 192/192 across Daily, perf-budget,
  terrain-detail, titleScene, lifeTables, marineSnowReadability and vehicles.
  Deduplicated count: original 245 + three diagnostic cases + second batch 192
  − repeated Daily 12 = 428. No production change was needed for the test error.
- **PASS: 12 golden-options tooling cases.** The three new diagnostic tests are
  in the ordinary unit quality capability, rather than a separate spec.
- **PASS:** TypeScript, production Vite bundle, strict content validation,
  attribution, changed-file Prettier, `git diff --check`.
- **PASS:** all three diagnostic entrypoints reject explicit Ultra before
  creating a browser/scene. The actual terrain geometry entrypoint also completes
  its default three-tier census; it is a CPU census, not a rendered-frame budget
  or pixel comparison.
- **ENVIRONMENT FAILURE:** canonical build phase completes TypeScript/Vite, then
  the unchanged manifest helper reports `spawnSync git EPERM`. The overall build
  gate therefore fails. No provenance guard was bypassed or relaxed.
- **BLOCKED BEFORE ASSERTIONS:** `ROUNDS=2` Playwright selection (terrain-render,
  hud-touch, journal-debrief, globe-pins, f-perf-budget) discovers **250 cases**,
  but its owned preview exits before execution. A debug attempt confirms local
  socket `connect EPERM` on IPv4/IPv6. No e2e or visual pass is claimed. Existing
  real keyboard regressions still require a socket-capable runner.

Evidence: `.cache/2060/{assertion-audit,tier-audit}.json`, `audit.mjs`,
`units.log`, `daily-green.log`, `tier-capabilities.log`, `units-round2.log`,
`tiers-capability-red.log`, `golden-options.log`, `geometry.json`, `build.log`,
`typecheck.log`, `content.log`, `attribution.log`, `discovery.log`, `e2e.log`,
`e2e-preview.log`, and `*-invalid-tier.log`. No runtime source, CSS, rendering
parameters, authored poses, images or fixtures changed.
