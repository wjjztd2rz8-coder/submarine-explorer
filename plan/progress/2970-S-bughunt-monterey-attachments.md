# 2970 — S-bughunt: Monterey colony attachments

Director Backlog item **9, S-verify / S-bughunt [Codex, standing]**;
this package serves **S-bughunt** after run 79. No newly buried, unsupported,
or reversed anchor reproduced in the supported attachment contracts. One
missing rotation guard is added to the existing wall-life capability spec.
No production correction or reseating is proposed.

## Provenance and ownership

- Audited checkout: `f8a4d49162d8172aa9a7c10237125e402ab30515`.
- Actual profile merge: `00d159b00c46d215727137658fe1490502f0ae1d`;
  first parent (`00d159b^1`): `a35a9c2b1a56ac631147c9622a9e70a176ed7f81`.
  Compared these exact commits. `git diff 00d159b HEAD -- src data
tests/unit/projectedRaycast.ts` is empty: merge geometry/data/helper evidence
  applies to this checkout.
- Read DIRECTOR rules/rubric, the newest 2026-10-21 evening review, overnight
  runs 79–80, V-monterey-foot, F-FIDELITY-810, S-render-scarps, 970, their
  available brief/result reports, and current 2920–2970 launched briefs.
  The earlier attachment/refactor reports predate the crest change. Run 79
  reports smoke + project-base, explicitly no full e2e. Historical wrapper
  PASS labels are not proof that this audit ran browser assertions.
- Rechecked queue/hold/launched, results/progress, registered worktrees and
  active diffs before editing. Run 78 collected 2900/2910; their progress
  notes are already in this HEAD. They cover terrain tint and Lost City
  scatter. 2920 owns eight-site tint; 2930 has uncollected power/focus changes
  and a lifecycle report; 2940 has uncollected shell/hud-touch spec changes
  and a CI report. 2950 owns scarpTerrain collision/crest verification (its
  progress note appeared during this audit); 2960 owns frame/snapshot
  resources. None owns these attachment spec edits. No competing diff was
  incorporated. No rockfall distribution, tint, resource or collider audit
  was repeated; no parked/DONE visual package was revived.

The merge changes the upper canyon profile above 0.77 authored height from
one rise to several risers/benches, plus apron vertex colours. The production
wall-life algorithm, authored prop transforms and requested counts are
unchanged. Equal-arc-length resampling of the complete profile changes
lower rows and smoothed normals too, so identical colony placements are not
a supported contract.

## Existing contracts and missing guard

`montereyWallLife` already builds all four shipped banks at Low/Medium/High
on the real GMRT tile. It checks all five life mesh kinds, requested sponge
and coral totals, all-instance seabed tolerance >−3 m, colony exposure

> 0.11 m, primary-ledge exposure below half its bounds height, Medium primary
> count 192 / life count 96, and snapped POI/rendered terrain agreement. Each
> colony must have a first +Z wall hit within [−0.0001, 0.5) m behind its seat
> and a triangle normal with local z <−0.25. Each actual apron hit must be
> below the anchor. `montereyScarpSupport` adds the older real-slope primary
> ledge check (Medium Props on Low Terrain), including positive growth
> clearance and the retained all-instance bounds. No existing assertion is
> relaxed or removed.

`projectedRaycast` buckets original indexed triangles by projected bounds;
Three performs the triangle intersections with original materials and world
transforms. Its existing parity spec covers both axes, cell boundaries,
outside bounds, rotation and nonuniform scale. It does not replace geometry
with the analytic placement callback. Production candidate selection also
rejects a hidden/back-facing first triangle, checks final terrain/apron
clearance and samples eligible seats until the requested counts are met.

The existing attachment checks read matrix translations but never test
colony rotation: reversing growth could leave all old seat/count/normal
assertions passing. The added assertion transforms the geometry's +Y growth
axis and the wall's exposed −Z direction into world space and requires a
positive dot product. Sponge and branching-fan templates grow from their
base along +Y. This checks the documented outward lean at the authored
180°/270°/90°/270° headings without pinning an Euler angle, random choice,
seat coordinate or exact normal alignment. Tangent alignment to every noisy
triangle is not an existing contract; a growth-axis/triangle-normal dot
product can be negative even before this merge. This audit does not invent
that stronger constraint or certify entire colony surfaces as penetration-free.

A temporary mutation control reverses only `canyon-wall-ledge`, Low,
`wall-sponges-0[0]` by multiplying its instance by a 180° local-X rotation.
The anchor translation and counts stay fixed. The original spec passes;
the extended spec fails at the new direction check with dot product
**−0.8656187704509921**. This is a test-control mutation, not a shipped defect;
no mutation is retained in the repository.

Only `tests/unit/montereyWallLife.test.ts` and this note change.
`montereyScarpSupport`, the helper, production code, site data, snapshots,
other tests, tools and DIRECTOR remain untouched.

## Parent/current mesh evidence

Temporary audit fixtures in `/tmp/2970-attachments/` archive `src`, shipped
`data` and the unchanged raycast helper from each exact git revision. They
reuse the existing headless `Props`/`Terrain` fixture, loading real
`meta.json`, `heightmap.bin` and `props.json`, including authored transforms
and stable prop seeds. As in wallLife, terrain subdivision is 1 to avoid
unused surface geometry; tier sampling/detail and all prop geometry remain
at their requested tiers. The normal focused test separately retains its
POI rendered-surface checks.

For every life instance, compose `mesh.matrixWorld × instanceMatrix`, sample
the real seabed at the world anchor, and raycast the actual final wall from
its exposed side. Raycast the final apron vertically in world space. Retain
first-hit points, actual face normals, matrices and clearances per named
instance. Neither the production wall-face sampler nor its analytic apron
height is used as the expected support. Representative wall rays and every
Low apron hit additionally agree with unbucketed Three raycasts to <1e−8 m.

Each revision has **1,188 colony anchors**: per bank, Low **23 sponges + 18
corals = 41**, Medium **54 + 42 = 96**, High **90 + 70 = 160**. All 1,188
positions and hit normals change; every anchor retains a first exposed-face
hit. No count loss, new buried anchor, missing support or reversed growth
direction was observed. All transformed growth axes lean toward exposed
−Z (current local z range approximately −0.98534 to −0.51437).

Minimum anchor-to-survey clearance in metres (parent → current):

| Bank              |               Low |            Medium |              High |
| ----------------- | ----------------: | ----------------: | ----------------: |
| canyon-wall-ledge |  5.3524 → 12.8468 |   6.6202 → 6.4930 |   4.7511 → 5.6243 |
| canyon-wall-east  | 31.9515 → 21.6702 | 15.1936 → 15.4643 | 18.6968 → 19.8206 |
| canyon-wall-west  | 12.7822 → 18.3124 | 14.6720 → 14.5319 |   6.0590 → 3.6631 |
| canyon-wall-far   | 30.2936 → 28.2474 | 29.7696 → 29.4144 | 28.5856 → 26.1239 |

Across all banks/tiers, local seat-to-first-face z gaps are
**0.119974–0.120042 m parent**, **0.119961–0.120053 m current**. The least
negative support-face normal z is **−0.250801 parent**, **−0.250288 current**;
all satisfy the retained <−0.25 contract. Requested counts and existing
exposure bounds pass unchanged; coordinate equality would incorrectly reject
intended relocation.

To cover the upper profile without relocating colonies, cast 50 additional
crest-relative rays per bank/tier (600 per revision): x/W =
−0.4, −0.2, 0, 0.2, 0.4 and ten levels from 0.77 through 0.99, measured
below each nearest parent vertex column's crest using authored height H.
Use identical local x/y queries on both versions. These are geometric probes,
not forced colony candidates. First-hit counts parent → current:

| Bank              | Low / 50 | Medium / 50 | High / 50 |
| ----------------- | -------: | ----------: | --------: |
| canyon-wall-ledge |  47 → 47 |     48 → 48 |   50 → 50 |
| canyon-wall-east  |  50 → 50 |     36 → 36 |   35 → 34 |
| canyon-wall-west  |  50 → 50 |     50 → 50 |   50 → 50 |
| canyon-wall-far   |  50 → 50 |     36 → 33 |   33 → 32 |

Changed crest hit positions/normals and occasional misses agree with probing
a changed, tapered silhouette; these rays are not occupied seats and have
no universal hit requirement. All actual colony local y values remain below
0.72H plus their small normal offset, consistent with the existing placement
eligibility cap. Terrain lift and pinching mean this local-y observation is
not a claim that colonies cannot touch a deformed upper-profile triangle.
Collision approximation and bounds acceptance remain with 2950.

## Conditional apron coverage

Actual downward anchor/apron triangle hits (parent → current):

| Bank              |     Low | Medium |  High | Minimum current Low anchor/apron clearance, m |
| ----------------- | ------: | -----: | ----: | --------------------------------------------: |
| canyon-wall-ledge | 13 → 13 |  0 → 0 | 0 → 0 |                                        5.7065 |
| canyon-wall-east  | 14 → 21 |  0 → 0 | 0 → 0 |                                        1.7615 |
| canyon-wall-west  |  15 → 9 |  0 → 0 | 0 → 0 |                                        1.8762 |
| canyon-wall-far   | 17 → 16 |  0 → 0 | 0 → 0 |                                        4.5151 |

Low has **59 actual apron exposure checks on each revision**, redistributed
among banks. Thus this is an exercised shipped path, not attachment evidence
inferred from `apronChecks >= 0`. Medium/High have **zero** such checks on
both revisions. Cross-sections of the actual apron vertex columns show all
current Medium/High seats behind its greatest-local-z inner edge, by at least
**1.7219 m / 1.0856 m**, respectively. Their vertical rays lie outside the
apron footprint; zero is valid, not an apron rejection or support failure.
Wall and survey support are still checked at every one of those seats.
No synthetic apron, extra fixture, forced hit minimum or altered scene is
needed. The existing conditional assertion remains intact; its final
nonnegative count by itself establishes no coverage.

## Simplicity and acceptance limits

One assertion extends the existing capability; no new spec, setting, UI,
guidance surface, branch, dependency, retry, skip, timeout, resource limit or
snapshot baseline. Existing regression assertions and discoveries remain.
The real terrain, all 13 identities, five heroes, marine life, scanning,
Journal, inputs/accessibility and Arcade default are unchanged. No life was
removed or reseated. Existing phone resource limits remain in force; 2960
owns their numerical audit.

Numerical support does **not** establish marine-life visibility, readability,
beauty/composition, visual Phone-OK, GPU behavior or real-phone frame time.
Those remain with Claude/owner. No game renderer, browser or screenshots
were used; actual e2e mode is **none**.

## Validation

- Initial focused baseline: `npm test -- --configLoader runner --cache=false
tests/unit/montereyWallLife.test.ts tests/unit/montereyScarpSupport.test.ts
tests/unit/projectedRaycast.test.ts` **PASS**, 3 files / 6 tests, 11.98 s,
  exit 0 (`/tmp/2970-attachments/focused-before.log`).
- Exact parent and merge temporary audits: `./node_modules/.bin/vitest run
--config /tmp/2970-attachments/vitest.config.ts --configLoader runner
--cache=false` **PASS**, 3 tier cases per version. After adding identical
  crest queries and unbucketed ray parity, parent **PASS** in 13.47 s and
  merge **PASS** in 15.36 s (`crest-parent.log`, `crest-merge.log` and per-tier
  `crest-{parent,merge}-*.json` under that temporary directory). The initial
  archive lacked manifest data and failed fixture initialization with
  `galleryApron` undefined before any tests; including each revision's shipped
  `data` directory resolved the fixture setup without a repository change.
- Temporary rotation mutation comparison:
  `./node_modules/.bin/vitest run --config
/tmp/2970-attachments/rotation.config.ts --configLoader runner --cache=false
-t 'low:'`: original spec **PASS**, extended spec **expected FAIL**, exit 1.
  Four other tier cases were unselected by the filter; no committed test is
  skipped. Log: `/tmp/2970-attachments/rotation-guard-comparison.log`.
- Final focused command above, with the new guard and unmutated shipped data:
  **PASS**, 3 files / 6 tests, 15.77 s, exit 0
  (`/tmp/2970-attachments/focused-final.log`).
- Required aggregate: `GATES_CONFIG_MODE=writable tools/gates.sh --no-e2e`.
  Writable mode is the existing tooling option for the read-only shared
  dependency cache; no tooling or dependency link was changed. Invoked after
  the initial focused baseline; the final focused run separately verifies
  the added assertion. **Completed, exit 1**. Log:
  `/tmp/2970-attachments/gates.log`; detailed gate logs:
  `.cache/runs/20261021-035117-3-Xsv0CF/`.
  **PASS**: writable config, strict content, production build (TypeScript +
  Vite), full units (**192 files / 3,389 tests**, 540.13 s), attribution and
  repository-wide Prettier. The existing bundle-size warning is informational.
  **FAIL**: Python, **5 failures / 167 tests** (162 passed), in unchanged
  tooling. Four `test_ci_build_manifest` cases cannot launch `git`
  (`spawnSync git EPERM`, environment restriction). `test_golden_tooling`
  fails its `golden-manifest.test.mjs:113` partial/incompatible-set case at
  line 151 with `Unexpected end of JSON input`. This latter failure is
  reported as observed, not asserted to be an attachment or production bug;
  the earlier 2900 report already records the same five-failure tooling
  pattern. No unrelated file was repaired or limit bypassed. Overall gates
  are **not green**, despite the passing unit stage.
- Final `npm run typecheck` **PASS**, exit 0
  (`/tmp/2970-attachments/typecheck-final.log`).
- `npx prettier --write tests/unit/montereyWallLife.test.ts
plan/progress/2970-S-bughunt-monterey-attachments.md` formats only owned
  files. The corresponding scoped `prettier --check` and `git diff --check`
  **PASS**. Final status contains exactly the owned test and named progress
  note. No merge, push or tag.

Actual e2e mode **none**: neither browser suite nor project-base assertions
ran. There is no claim of a green full-e2e run or visual/phone acceptance.
