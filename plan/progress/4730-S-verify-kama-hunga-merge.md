# 4730 — S-verify: Kama 110 m raised-arm and Hunga 120 m opening merge

Item: **S-verify**, [DIRECTOR Backlog](../DIRECTOR.md). Audited on 2026-10-28.
Base checkout: `7ccf1ad0c413d9a99e9396614a66f0015d5e8589`; visual merge:
`20bcf52b`, implementation: `2bb69ea3` (found with
`git log --all --oneline --grep=V-kama-opening`). Read DIRECTOR's Definition of
done before checking code or tests.

**Result:** the merged data reproduces [4670](4670-S-verify-kama-opening.md)'s
proposed poses, geometric subject heights, scan exclusion and controlled first
approaches on Low/Medium/High. One shared clearance defect is confirmed; the
small fix and two regression cases were already present as uncommitted edits
when this verification began. They are retained and verified below. This turn
adds this report; it makes no further source, test, site-data or snapshot edits.
Browser acceptance and the overall gate are **not green** in this sandbox.
No screenshot or visual-render evidence is claimed.

## Finding: clearance checked a different camera arm from the returned pose

**P2, fixed locally:** merged `src/game/Spawn.ts` constructed its clearance
`CameraRig` with default arm `(0,38,90)`, then returned the authored mission arm.
Consequently a spawn could pass the collision check while its actual raised arm
intersected a prop; a safe short arm could also be rejected because the unrelated
long default arm was obstructed. No collision was found at the six shipped
Kama/Hunga poses; the defect concerns the shared safety guarantee.

The existing local fix resolves `opening`/`mission` once and calls
`rig.setChaseRadiusDefault(arm?.chaseRadius, arm?.chaseOffsetX, arm?.chaseOffsetY)`
before candidate clearance. It also reuses that same mission row for yaw,
scoring and returned fields. There is no site branch or config mutation.

`tests/unit/gameSpawn.test.ts` already contained two new capability cases:
an obstruction affecting only the authored raised arm must reject the spawn;
an obstruction affecting only the default long arm must preserve the safe
short-arm spawn. Independently copied `git show HEAD:src/game/Spawn.ts` into a
scratch module and ran those cases against it: **2 fail as expected** (one
unsafe acceptance, one false rejection). Both pass with the local fix; the
whole four-spec targeted run passes. Existing assertions/pins were not edited.
Evidence: `.cache/opening-merge/merged-clearance.log` and
`.cache/opening-merge/targeted-unit.log`.

## Data flow, isolation and schema

- `site.json opening.mission` → `SiteManifest.opening.mission` →
  `composedMissionSpawn` → `SpawnPose` →
  `src/app/systems/mission.ts applyMissionStart` →
  `CameraRig.setChaseRadiusDefault`, then `snap`. All three supported fields
  (`chaseRadius`, `chaseOffsetX`, `chaseOffsetY`) follow this path.
- Kama alone authors mission `chaseRadius=35`, `chaseOffsetY=100` at `rangeM=110`.
  Hunga authors `rangeM=120` with the default arm. The merge changes only these
  two sites' mission rows; their free-dive/reframe tuning is unchanged.
- A scratch mission-system test reuses one real rig, starts with Kama, then
  exercises all 13 sites on flat synthetic terrain. Every near-site start uses
  its own mission arm; every subsequent surface start restores the configured
  **97.693397935 m** arm and its default eye direction. Orbit/reset preserves
  each start's defaults. Actual terrain/props checks at both sites, all tiers,
  also show identical free-dive poses with mission camera fields present or
  removed. Base config and all manifests compare equal before/after the audit.
- The validator shares existing `cameraFields`: radius must be finite and
  positive; x/y offsets must be finite signed numbers. **27 invalid cases
  rejected**, including nonfinite values, null, strings, booleans, objects,
  arrays, zero/negative radius and an unknown camera key. **9 valid cases
  accepted**, including zero/negative offsets. Errors identify the mission
  field. Existing schema tests also retain their negative-range check.

Isolation evidence: `.cache/opening-merge/isolation.test.ts`, `isolation.json`;
schema evidence: `audit.test.ts`, `schema.json`, `current-audit.log` in that same
directory. The scratch suite passes **8/8** tests (six geometry cases, schema,
and mission-system isolation).

## Low/Medium/High numerics against 4670

Loaded shipped tile metadata/heightmaps and all props, using runtime `Terrain`,
`Props`, `composedMissionSpawn` through the runtime wrapper, `requiredHull`,
`resolveEffective`, `CameraRig`, `Submarine`, `PropContact` and `Scanner`.
No failed or skipped props. Distances below are submarine-origin → first scan
POI in **3D**, not camera distance or prop-edge distance.

| Site / tier  | Opening range (m) | Capped base radius (m) | Arcade radius (m) | Outside by (m) | Second primary distance (m) |
| ------------ | ----------------: | ---------------------: | ----------------: | -------------: | --------------------------: |
| Kama Low     |               110 |                     25 |               100 |             10 |                  182.134726 |
| Kama Medium  |               110 |                     25 |               100 |             10 |                  182.141747 |
| Kama High    |               110 |                     25 |               100 |             10 |                  182.152424 |
| Hunga Low    |               120 |                     30 |               100 |             20 |                  788.338115 |
| Hunga Medium |               120 |                     30 |               100 |             20 |                  788.444665 |
| Hunga High   |               120 |                     30 |               100 |             20 |                  788.437942 |

`base=min(authored,(range−60)/2)`;
`Arcade=max(base×2.4,100)` after equipment and mode resolution. Both primaries
remain outside their effective radii. An aimed, held runtime scan lasting
longer than the required duration produces no candidate, no progress and no
first-primary scan at spawn. Realistic's corresponding formula yields 30/36 m,
as in 4670; the full geometry experiment here uses Arcade.

Pose x/z/yaw reproduce 4670 within 0.000005 m / 0.00000005 rad. Kama has
x/z = **−130.719294 / 580.627053**, yaw **355°**, with tier y =
**−1282.984319 / −1281.598572 / −1281.692130**. Hunga has
x/z = **−2200.152446 / 2270.771487**, yaw **90°**, with tier y =
**−449.114960 / −449.136018 / −449.157880**.

Kama's y offset is added to configured y=38 before normalizing to the 35 m arm:
local eye offset **(0,29.316371,19.119372)** m. It is not a 100 m vertical rise.
Default aim/FOV remain intact.

The following are **geometric frontmost solid-subject height fractions** from
CPU triangle projection/depth comparison, including terrain, prop and visible
hull occlusion, clipping, material side, instances, LOD and phone-landscape view
shift. They are not screenshots or judgments of light, color or beauty.

| Site / tier  | 1600×900 height (%) | 390×844 height (%) | 844×390 height (%) |
| ------------ | ------------------: | -----------------: | -----------------: |
| Kama Low     |              23.000 |             10.664 |             23.077 |
| Kama Medium  |              23.444 |             10.782 |             23.333 |
| Kama High    |              24.111 |             11.137 |             24.103 |
| Hunga Low    |              27.667 |             12.796 |             27.692 |
| Hunga Medium |              27.556 |             12.796 |             27.692 |
| Hunga High   |              27.444 |             12.678 |             27.436 |

All 18 measurements reproduce 4670 at its stated precision and exceed 10%.
Independent Three.js rays agree on 180 sampled subject pixels; maximum NDC
depth difference **2.665×10⁻¹⁵**. Minimum visible-hull vertex bed gaps remain
**45.081 / 29.362 m** (Kama/Hunga); minimum camera bed gaps remain
**91.465 / 81.574 m**. All 24 camera-arm keepout samples per pose and all spawn
hull keepouts are clear. Camera orbit/reset reproduces the initial eye.

Controlled 60 Hz pilot enters the scan radius at **2.200 / 3.217 s**, completes
the first scan at **7.200 / 6.217 s**, with **0 prop-contact frames / 0 hull
breaches**. Minimum submarine-origin bed gaps are **31.953 / 23.235 m**.
These are reproducible controlled timings, not predictions of player behavior.

The six geometry/schema cases were also rerun against the merged HEAD Spawn
module: **7/7 pass**. Parsed `merged-numerics.json` and `numerics.json` are exactly
equal, so the small clearance fix does not change these shipped poses or numbers.
Evidence and reproducer: `.cache/opening-merge/{audit.test.ts,project.ts,
current-audit.log,numerics.json,merged-audit.log,merged-numerics.json}`.
SHA-256 manifest of site/props/POIs/mission, tile metadata/heightmaps, source,
tests and scratch helpers: `.cache/opening-merge/inputs.sha256`, manifest hash
`82cca0bfd0358dbc2309469635c0ed8f69c7393160fc4a0acec13bdae25a0b36`.
These are local cache artifacts; the tables above retain the findings in git.

## Gates and limits

- **PASS:** targeted existing unit specs: `gameSpawn`, `missionApproach`,
  `missionComposition`, `siteManifest` — **588/588 tests**, 94.46 s.
  Command: `npx vitest run tests/unit/gameSpawn.test.ts tests/unit/missionApproach.test.ts tests/unit/missionComposition.test.ts tests/unit/siteManifest.test.ts --configLoader runner --cache=false`.
- **PASS:** scratch checks **8/8**, plus merged-source comparison **7/7**;
  expected merged-source clearance regression failures **2/2** reproduce the
  defect. Scratch checks live only in ignored `.cache/`, not new permanent specs.
- **PASS:** production build including TypeScript, strict content validation,
  attribution, repository-wide Prettier, and `git diff --check`.
- **PASS:** full unit suite — **192/192 files, 4,338/4,338 tests**, 659.20 s,
  from `GATES_CONFIG_MODE=writable PW_PORT=4370 bash tools/gates.sh --no-e2e`.
  No existing pins or snapshots were updated. The aggregate command exits 1
  solely because of the Python/tooling gate below; all other selected gates pass.
- **FAIL:** Python/tooling gate: 167 tests, five failures. Four
  `test_ci_build_manifest` cases fail on sandbox `spawnSync git EPERM`;
  `test_golden_tooling` fails because the child CLI's stdout is empty at a JSON
  parse (the golden-set comparison case). These exercise build/golden tooling, not the changed camera path.
  The same five failures are present in the inherited earlier gate log; this
  turn reran them and records its own result. No unrelated tooling was edited.
- **BLOCKED before test bodies:** searched `tests/e2e` for mission approaches,
  opening framing, camera/reset and surface starts, then ran the selected
  existing capability tests with the requested `npx playwright test <spec> -g`
  form (commands below). All exit 1 while starting the configured preview.
  A direct preview diagnostic gives `listen EPERM 127.0.0.1:4371`; Playwright
  debug output also records blocked localhost connections. No browser assertion
  ran, and no screenshot evidence is offered. Project-base e2e was not run.

```sh
npx playwright test tests/e2e/opening-framing.spec.ts \
  -g 'mission previews and opens on an approach outside scan range'
npx playwright test tests/e2e/d2-camera.spec.ts \
  -g 'chase framing, free look and reset controls'
npx playwright test tests/e2e/d-start.spec.ts \
  -g 'The briefing start choice persists as the saved start position'
```

Runs use `PW_PORT=4371`, `GATES_CONFIG_MODE=writable` and retained preview
outputs. The opening run was repeated against a retained copy of this turn's
fresh build (`PW_OUTDIR=.cache/opening-merge/dist`) with
`DEBUG=pw:webserver` to document the sandbox failure. Evidence:
`.cache/opening-merge/e2e-{opening,camera,start}.log`, `prettier-current.log`,
`attribution-current.log`, `gates-current.log`, and
`.cache/runs/20261028-022611-7-U8W8Hv/{python,content,build,unit,attribution,prettier}.log`.
**Overall gate cannot pass here:** Python/tooling failures and unavailable
localhost browser execution remain outstanding.

## Definition of done

The retained fix reuses a single resolved mission row and the existing camera
API; it introduces no helper layer, UI, setting, site branch or runtime config
mutation. Tests extend the existing spawn capability spec and contain no new
package-number comments. No pins or snapshots were regenerated. This report
adds evidence to the existing S-verify item, not another forward plan.

Numeric acceptance passes; visual acceptance remains with Claude. DIRECTOR's
known follow-up to keep Kama's hull in frame, and Hunga's dimness, are not
resolved or visually reassessed here. Clearance above the seabed does not prove
that the hull is visible in frame. No screenshots were inspected or claimed.
