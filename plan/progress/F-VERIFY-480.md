# F-VERIFY-480: rebrand merge verification

Date: 2026-10-03. Starting revision: `f145e4e`.

Latest follow-up: the orchestrator's full browser run passed 311 root tests and
all 8 project-base tests, with one root failure (vent preset draw budget) and
22 skips. Fixed the vent haze's accidental global enablement; all post-fix
static gates pass (1,228 unit tests / 144 Python tests). The orchestrator must
rerun browser gates after this correction.

## Plan

1. Read the complete changelog, remove duplicated or garbled merge entries and
   scan repository sources for conflict markers.
2. Audit the former product name in shipped copy, metadata, README and docs;
   retain repository/package identifiers, deployment paths and save keys.
3. Compare the retained scarp builder with the rebrand branch, reproduce any
   wall-life anchor regression and cover terrain, apron and colony counts.
4. Run `tools/gates.sh --full-e2e`, record each result and execution blockers,
   then check formatting and the final diff.

## Progress

- Shipped title, runtime copy, manifest, social metadata and README use Bathyline.
  Five stale documentation headings are now corrected; historical planning
  records and compatibility identifiers intentionally retain the former name.
- Merge `85b0e9e` retained a ground-only wall-life check, discarding the rebrand
  branch's final talus-surface check and 0.12 m margin. Existing real-tile tests
  check terrain clearance but do not measure clearance above the actual apron.
- Consolidated the two Changed sections without deleting any existing entries;
  the complete changelog had no duplicate entry blocks or garbled entries.
  Source scans found no unresolved conflict markers.
- Updated five documentation headings and clarified the architecture's retained
  repository/package identifier. Expanded the offline identity check across
  shipped metadata, documentation and all runtime TypeScript files.
- Both pre-existing real-tile suites passed (8 tests) on the merged code. Extending
  the four-wall suite to raycast the rendered apron exposed failures on every
  tier: first failing anchors were 2.314 m (Low), 3.268 m (Medium), 4.006 m (High)
  and 3.988 m (Ultra) inside the apron.
- Restoring the branch's analytic surface check left shallow lip burial on three
  tiers. Added the apron mesh's existing 0.3 m lip lift to the rejection surface,
  retaining the 0.12 m seat margin. The mesh lip constant is shared with its
  builder; apron geometry and boulder placement are unchanged.
- The strengthened suites now pass all 8 cases. They require four authored
  walls, all five colony shapes, exact tier sponge/coral counts, exposed terrain
  and rendered-apron seats, and unchanged browser rock-clearance limits. Medium's
  main wall retains 192 total instances / 96 colonies.
- Full gate run completed with exit status **1**: every static gate passed, but
  both browser gates failed before executing a case at preview-server startup.
  Socket creation is denied with `EPERM`, and Playwright's availability probes
  report `connect EPERM` on both IPv4 and IPv6 localhost. Browser behavior and
  screenshot review remain unverified in this environment.
- The CI life-scan helper and its unit regressions match merge `9b87cd2` exactly.
  Their real-input/discovery path survives the merge, and the full unit suite
  passes. No browser assertions, retries, test limits or discovery were changed.

## Changelog and conflict audit

Read all 636 original changelog lines. No duplicate bullet entries, garbled
entries or unresolved conflict markers were found. The repeated Changed heading
split one Unreleased category into two sections; moved its entries under the
first Changed section. A normalized comparison with `HEAD:CHANGELOG.md` confirms
**every original entry is preserved**. The initial pass added one verification
entry; the browser follow-up adds a second entry documenting the haze default
and site override correction.
Changed, Removed and Added each now occur once.

Both a tracked-file `git grep` and a hidden-file `rg` scan found no opening or
closing conflict markers. Dependency trees, Git internals and generated caches
are excluded from the latter scan.

## Product-name decisions

| Location / remaining spelling                                                                                                                                      | Decision and reason                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime TypeScript, index.html title/description/OG/Twitter tags, manifest name/short_name/description, README, licence credits and preview pages                  | Bathyline; no former product-name copy remains. Offline identity regressions now inspect all runtime TypeScript, metadata, README and the revised documentation.    |
| docs/data-sources.md, art-direction.md, assets.md, deploy.md, landmarks.md                                                                                         | Changed stale heading names to Bathyline.                                                                                                                           |
| docs/architecture.md                                                                                                                                               | Bathyline is the product; the explicitly retained repository/package identifier is now correctly written as `submarine-explorer`.                                   |
| `submarine-explorer` in package/lockfile, GitHub Pages share-image URLs, deployment/build/base-path checks and recorded checkout paths                             | Keep: existing repository/package names, deployed paths and commands must continue to resolve. README explicitly documents this decision.                           |
| `subexplorer.*` storage keys and their documented/tested legacy forms                                                                                              | Keep: preserve settings, progress, bindings, discoveries, photos, Daily history and installed users' saved dives. Manifest id/scope/start_url remain relative `./`. |
| plan/MASTER-PLAN.md (heading and original name question), DECISIONS.md, OPEN-QUESTIONS.md, RESUME-PROMPT.md, WORK-PACKAGES.md and archive/RESUME-PROMPT-phase-c.md | Keep: original working-title decisions and internal orchestration records identifying the existing checkout; these are not shipped player copy.                     |
| tests/e2e/f-rebrand-bathyline.spec.ts and tools/tests/test_bathyline_brand.py                                                                                      | Keep former-name literals as negative assertions preventing reintroduction. This audit note also names the compatibility spellings intentionally.                   |
| package.json's lowercase generic description, “Web submarine explorer rendering real GMRT ocean-floor bathymetry”                                                  | Keep: describes the activity rather than presenting the former capitalized brand; package identity remains compatible.                                              |

## Wall-life anchor review

The terrain callback in `Props.debrisHeightFn` converts local X/Z through authored
heading and scale, then subtracts the placement origin to yield local height.
The scarp uses that same callback for wall-foot lift and talus construction.
The wall-life seat is the sampled face vertex plus 0.12 m along its normal; the
rejection check now evaluates the final offset X/Z against terrain plus talus,
with the mesh's 0.3 m lip lift and the retained 0.12 m clearance margin.
Invalid seats are resampled rather than shifted away from the wall.

The earlier branch check was insufficient for the rendered lip: restoring it
alone still failed Medium/High/Ultra, with first observed burial of 0.165 m,
0.029 m and 0.076 m. Sharing `TALUS_LIP_RISE` with the apron builder closes this
gap on every authored wall/tier without altering the existing apron geometry.
`docs/props.md` now describes both terrain and apron rejection.

The strengthened `montereyWallLife.test.ts` uses world instance matrices and
raycasts the rendered apron independently of the analytic callback. It checks
all four authored walls at Low/Medium/High/Ultra, actual exposed seats, all three
sponge/two coral shapes and exact per-tier counts. `scarpTerrain.test.ts` retains
its original all-instance browser limits and main-wall count checks. Targeted
validation: **8/8 pass**; the merged ground-only implementation fails all four
new apron cases. Evidence:

- `.cache/f-verify-480/wall-life-before.log`: merged code, 4/4 failures.
- `.cache/f-verify-480/wall-life-restored.log`: branch's analytic check, 3 failures.
- `.cache/f-verify-480/wall-life-lip.log`: final lip-aware check, 8/8 passes.

## Full gate results and remaining browser verification

```sh
GATES_CONFIG_MODE=writable PW_PORT=4480 tools/gates.sh --full-e2e
```

Writable config mode is necessary because node_modules is an external read-only
symlink. It changes config loading only; the full suite and project-base gate
remain enabled. The ignored screenshot symlink also targeted the shared checkout;
retained it as `.cache/codex/shots-shared` and created a local shots directory so
browser captures would stay within this worktree.

| Gate               | Result                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| Config             | Pass                                                                   |
| Build / TypeScript | Pass                                                                   |
| Unit               | Pass: 1,221 tests across 115 files                                     |
| Python             | Pass: 144 tests, including expanded public-name checks                 |
| Strict content     | Pass                                                                   |
| Attribution        | Pass                                                                   |
| Prettier           | Pass                                                                   |
| Full root E2E      | Fail before cases: preview-server startup exits 1                      |
| Project-base E2E   | Project-base build passes; preview-server startup exits 1 before cases |

Overall exit: **1**, preserving both browser failures. Playwright discovery lists
**334 tests in 58 files**, including the rebrand, scarp and CI life-scan specs.
No browser passes or screenshots from this run are claimed.

Combined log: `.cache/f-verify-480/gates.log`; individual gate logs:
`.cache/gates/*.log`. Follow-up with `DEBUG=pw:webserver` is recorded in
`.cache/f-verify-480/preview-startup.log` and confirms denied IPv4/IPv6 localhost
connections. A direct Python socket diagnostic fails at socket creation with
`PermissionError: [Errno 1] Operation not permitted`.

Initial remaining work was the outside-sandbox full gate. The orchestrator has
now completed that run; its results and the resulting vent correction are
recorded below. The first pass's formatting, entry-preservation comparison and
`git diff --check` passed. No commit or push performed.

## Orchestrator browser follow-up: vent haze scope and draw budget

The supplied full gate completed outside the sandbox: **PASS build, unit,
Python, strict content, attribution, Prettier and project-base E2E (8/8)**.
Root E2E: **311 passed, 22 skipped, 1 failed**, in 17.0 minutes. The only failure
was `tests/e2e/presets.spec.ts:109`: the forced generic vent fixture on Titanic
requires exactly **2** preset draws, but received **3**. The wall-life and
rebrand browser regressions passed. Preserved the external logs before local
static gates rewrote the shared gate-log names:

- `.cache/f-verify-480/orchestrator-e2e.log`
- `.cache/f-verify-480/orchestrator-e2e-base.log`

### Root cause and correction

The later Beebe plume-variety merge added one additive `ventHaze` Points object.
`buildHaze()` used an undeclared `hazeGlow` fallback of **0.5**, enabling this
third draw for every sulfide vent, including the generic fixture. Neither
`hazeGlow` nor `hazeGlowSizeM` existed in the typed defaults, so the normal
mission override merge would reject both controls as unknown.

Declared the numeric haze controls in `VentPresetConfig` and its defaults:
`hazeGlow: 0` and `hazeGlowSizeM: 7`. The runtime fallback also defaults to zero.
Beebe's real mission document explicitly sets `hazeGlow: 0.5`, preserving the
same warm additive haze there. Existing override validation now accepts these
controls and rejects negative/nonfinite values. The generic vent again creates
only smoke and shimmer, while Beebe creates smoke, shimmer and one haze draw
shared across all orifices. Carbonate exclusion and Low's no-visuals policy
are preserved. Shader code, plume variety, wisps, glow lighting and current
behavior are unchanged. Updated `docs/presets.md` and CHANGELOG to document the
explicit site effect and generic draw budget.

**No browser tests or assertions changed.** The exact two-draw expectation,
shader/error checks, test discovery, retries and timeouts are unchanged.
The unit tests count actual scene Points objects as well as reported draws,
so a dishonest statistics adjustment cannot satisfy them.

### Reproduction and validation

`tests/unit/ventHazeBudget.test.ts` reproduces preset selection/override merging
from the real Titanic and Beebe mission documents. Before the fix its first
five cases had **2 failures / 3 passes**: the generic vent unexpectedly created
`ventHaze`, and Beebe's declared haze strength was absent. Evidence:
`.cache/f-verify-480/vent-haze-before.log`.

After the fix, the initial targeted preset/haze/readability run passed **27/27**
tests (`.cache/f-verify-480/vent-haze-after.log`). Expanded to **7** new regressions
covering omitted/default controls, the exact generic budget, Beebe's additive
material and three sprites per orifice, retained white-smoker wisps, numeric
control validation, explicit opt-out, carbonate fluid, Low and teardown.
All seven pass as part of the full static suite.

```sh
GATES_CONFIG_MODE=writable PW_PORT=4480 tools/gates.sh --no-e2e
```

| Post-fix local gate                     | Result                                                 |
| --------------------------------------- | ------------------------------------------------------ |
| Config / build / TypeScript             | Pass                                                   |
| Unit                                    | Pass: 1,228 tests across 116 files                     |
| Python                                  | Pass: 144 tests                                        |
| Strict content / attribution / Prettier | Pass                                                   |
| Gate exit                               | 0                                                      |
| Playwright discovery                    | Unchanged: 334 tests in 58 files                       |
| Browser rerun                           | Pending orchestrator; sandbox cannot run Vite/Chromium |

Combined post-fix log: `.cache/f-verify-480/gates-vent-haze.log`.
Final formatting and `git diff --check` pass. No commit or push performed.
The latest outside-sandbox run still has the pre-fix failure; no post-fix
browser pass is claimed. The orchestrator should rerun `tools/gates.sh
--full-e2e` and verify the unchanged preset budget/error assertions and Beebe's
haze. All original rebrand/anchor work remains in place.
