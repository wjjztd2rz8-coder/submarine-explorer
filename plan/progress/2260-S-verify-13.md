# S-verify / S-bughunt — visual-merge verification

Baseline: `446af2a` (2026-10-16). Read the first-parent merge diffs with
`git show -m --first-parent` for `ed62186` (V-bluehole-3), `902c112`
(V-lostcity-2), and `bd09bf1` (V-beebe-hull), their three progress notes,
`plan/DIRECTOR.md`, and `2180-S-verify-12.md`. Numeric/static review only.

## Findings and fixes

- **Fixed the previously reported late-prop life defect:**
  `src/app/systems/life.ts:98`. Life could populate while props were still
  loading; `LifeSim.ts:588` remembers processed cells and `LifeSim.ts:638`
  checks `env.blocked` only at placement. Already-rooted colonies survived
  subsequent `clear_ground` footprints. The frame hook now waits for the
  existing props object's `loaded` flag before the first population. No cell
  resets, site dispatch, geometry, palette, or tuning changes. Independent
  life-content loading, disposal and the no-props capability still work.
  Delayed-load tests use the real Life/Sim path with an initially unavailable
  footprint: both cases fail before the fix (180 premature updates); afterward
  rooted life appears outside the final footprint, and an empty footprint
  still permits life on both sides. This deliberately delays marine life while
  props are pending; it does not time out and populate on unknown footprints.
- **Scatter already handles late props correctly:**
  `src/app/systems/props.ts:36` installs the keepout after props load;
  `src/world/scatter/Scatter.ts:90` marks cached instances dirty, and line 214
  filters every kind on re-gather. Added stationary-camera coverage to the
  existing scatter capability: cached instances disappear on a late keepout
  and return when it is removed. No production scatter change.
- **Hull channel passes:** base samples set `hullLight = 1` every update
  (`src/render/Atmosphere.ts:117`); vent defaults also set 1
  (`src/core/config/presets.ts:259`). Only Beebe authors 0.2
  (`data/landmarks/beebe-vent-field/mission.json:13`). Vent reads merged preset
  params with a finite-number fallback (`VentPreset.ts:311`); the lighting
  stage writes the live vehicle uniform before rendering, and the shader
  scales light before the highlight shoulder (`src/vehicles/materials.ts:114`).
  Added 42 in-memory integration cases: 13 shipped sites plus unknown, on all
  three tiers, three repeated atmosphere/preset updates each. Also cover base
  reset after preset disposal, omitted/malformed/nonfinite/negative overrides,
  and shared shader-uniform identity/order in the existing vehicle spec.
  Unknown selection yields the default preset and a finite 1.
- **Blue Hole bank passes:** `src/world/terrainFeatures.ts:187` is finite and
  nonnegative, zero before each seat radius (162/155 m), and zero outside its
  supported radii. It adds height; there is no spawn-specific depression.
  Existing wall capability now checks both galleries' entire pendant vertex
  footprints against rendered terrain at Low/Medium/High. Minimum clearances
  (west/east metres): Low 7.977/3.240, Medium 13.643/1.999, High 6.094/1.194.
  This guards occupied gallery space; the bank intentionally rises into the
  rear hood, so a flat plane across the entire prop bounding rectangle is not
  the intended invariant.
- **No pit under the spawn:** compared archived source at `ed62186^1` and
  `ed62186` on actual survey terrain, sampling the same 13-by-13 grid at 2 m
  spacing around the rebased opening, for each tier. All **507** ground heights
  match within **5.7e-14 m**. The deeper ground sampled at the moved spawn is
  the existing bowl at a different X, not a newly dug pocket.
- **Progress-note qualification:** `plan/progress/V-bluehole-3.md:5` says the
  prop and collision data do not move, and `terrainFeatures.ts:184` says the
  foot stays put. The analytic start radius does stay put, but triangle
  interpolation raises the sampled west/east seats by **0.365579/0.072467 m**
  on Low/Medium; High changes **0.001962/0 m**. This accounts for the snapshot's
  Y change. Reported rather than retuning geometry. The snapshot-specific
  displacement is 0.834 m; a homogeneous Low terrain/Low props audit gives a
  1.219 m displacement, so “under 1 m” should be read as describing that
  snapshot fixture, not every tier combination.
- **Documentation fixed:** V-beebe-hull's note claimed `docs/presets.md`
  documented `hullLight`, but the merge did not change that file. Added the
  actual default, Beebe override, tier behavior and per-frame reset contract.

## Simplicity audit

**No new rule violations in the three merge diffs.** In particular:

| Merge        | Site tuning and settings                                                                                                                                                         | Comments and tests                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| V-bluehole-3 | `terrainFeatures.ts:122` consolidates four existing seat tables into one; bank reuses it. No added site-ID branch or runtime config mutation.                                    | New comments explain geometry; no package-history numbers or new spec file.                                                      |
| V-lostcity-2 | `LostCityBands.ts:44` and `props/geo/towers.ts:90,446` extend existing Lost City/carbonate behavior; no added site dispatch, player setting or config mutation.                  | No package-history comment or new spec; existing snapshot capability retained.                                                   |
| V-beebe-hull | Default in the existing preset table; override in Beebe mission data. Reads the existing resolved preset parameters, rather than changing gameplay config or re-resolving modes. | No package-history comments or new spec. Shader cache keys change to distinguish the shader program, not to record a package ID. |

Pre-existing site branches and historical package-named capability specs are
not introduced by these merges. This audit adds no spec file. All existing
assertions, snapshot bytes and golden byte guards remain unchanged.

## Every rebaseline reviewed

- **`ed62186`, `terrainMerge1140`:** only Blue Hole's buffer digest changes
  (`fca281…` to `1c07dc…`); draws **6**, triangles **21,048** unchanged.
  This fixture uses flat ground, so the bank itself cannot explain the hash.
  The authored wall displacement/color and uneven sediment geometry/new
  `bedLevel` attribute do explain it. Finite-buffer, budget, pendant-envelope,
  collision and terrace assertions remain intact.
- **`ed62186`, `freeDiveComposition`:** only Blue Hole's three mode entries
  change, both base/framed poses in each. X moves **+0.749308 m**, Y
  **+0.365579 m**, total **0.833733 m**; Z, yaw and camera defaults stay fixed.
  The actual-terrain seat shift and scan-station search justify it. Opening
  scan/clearance/framing behavior remains independently asserted.
- **`902c112`, `terrainMerge1140`:** only Lost City's buffer digest changes
  (`2b5708…` to `461f20…`); draws **14**, triangles **44,120** unchanged.
  Trunk relief and vent paint explain it; no budget/finite assertion changes.
- **`902c112`, `beebeIsolation`:** only Lost City's **Low and High color
  attribute hashes** change within the cross-site snapshot. Position, normal,
  index, cavity data, biome, shader, uniforms and other sites remain unchanged.
  This is the intended Lost City slope tint, despite the spec's historical
  Beebe name. No rebaseline of Beebe's geometry/anchor entry occurs.
- **`bd09bf1`:** no snapshots rebaselined.

No rebaseline found to mask a numerical, collision, scan or budget regression.
The late-loading life bug is outside all these snapshot fixtures and required
lifecycle coverage; the hashes never demonstrated its absence. Visual merit
of the changed buffers remains Claude's review responsibility.

## Validation

- PASS: affected light/life/vehicle/scatter batch, **4 files / 87 tests**;
  final bank/footprint batch, **1 file / 8 tests**. Counts include existing
  assertions; the full run also exercises these capabilities.
- PASS: final TypeScript check, production Vite bundle, strict content
  validation, attribution (14 assets), repository-wide Prettier and
  `git diff --check`.
- PASS: full unit suite, **192 files / 2,435 tests**, no skips, in
  **683.87 s**. All snapshot comparisons pass against unchanged baselines.
- Ran `GATES_CONFIG_MODE=writable PW_PORT=4280 bash tools/gates.sh`.
  Content and build pass. Python passes **162/166**: the same four manifest
  tests fail because `tools/ci-build-manifest.mjs` cannot spawn Git
  (`spawnSync git EPERM`). The initial gate was interrupted during its
  default-pool unit run while coverage was being developed; final full-unit
  verification uses the established thread-pool workaround below, with no
  shipped runner/configuration/timeout changes.
- The final canonical build phase bundles successfully, then fails writing
  its provenance manifest at that same Git subprocess. Canonical e2e phase
  fails before discovery at provenance validation. A direct Playwright
  smoke/terrain/atmosphere attempt cannot start its preview; a direct preview
  confirms `listen EPERM 127.0.0.1:4280`. No browser assertion ran; no gate or
  provenance guard was bypassed or weakened.

Full-unit command:
`npx vitest run --configLoader runner --pool=threads --maxWorkers=1 --cache=false --reporter=verbose`.

Evidence under `.cache/2260/`: the three `V-*.diff` files;
`snapshot-audit.json`; `terrain-audit.log`, `terrain-merge-compare.log`,
`spawn-patch-compare.log`, `spawn-patch-summary.json` and their audit entry
scripts/archived source trees; `life-before.log`, `life-after.log`,
`final-focused.log`, `final-bank.log`, `unit-full.log`, `gates.log`,
`build-phase.log`, `e2e-phase.log`, `e2e-direct.log`, `preview-direct.log`,
`typecheck.log`, `attribution.log`, `prettier.log`.
Canonical per-gate logs remain under `.cache/runs/`.

## Open questions and limits

- A browser/e2e run on an environment that permits Git provenance subprocesses
  and a listening preview server remains necessary. No screenshot or real-phone
  quality/performance judgment was made here.
- Marine life now waits for props to finish. A permanently pending props fetch
  also keeps life pending; normal missing-content completion sets `loaded`.
  No timeout or broad repopulation policy is introduced in this fix.
- Qualify the earlier “foot stays put”/“under 1 m” claims as above; the measured
  offsets are safe numerically and were left unchanged.
