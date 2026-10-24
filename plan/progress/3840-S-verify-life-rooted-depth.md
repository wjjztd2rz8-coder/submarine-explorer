# 3840 — S-bughunt: verify rooted-life final depth

DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**, specifically
**S-bughunt**, the highest eligible Codex item. Audited checkout:
`38afe4991d121c6b6c295b6a47d27fd6c45eeffb`; merged correction:
`8b51108b` ([3830](3830-life-rooted-final-depth.md)).

**No new production defect reproduced.** Final-position habitat and marine-life
budgets pass the added shipped-table matrix. Rooted populations remain possible
at all three tiers of every table containing sessile species. This does not mean
rooted animals occur at every depth, seed or site: three tables have none, and
Beebe's crowded Low/Medium fixtures retain a pre-existing allocation limitation.

## Intake and ownership

Read CONTRIBUTING-AGENTS.md; DIRECTOR Backlog, simplicity rules and rubric;
REVIEWS' leading targeted entry and newest dated comprehensive entry (October 24
afternoon); OVERNIGHT-LOG through run 121; launched 3610, 3800, 3820, 3840 and
3850 briefs; newest finished 3760–3780 results; and related
[3610 capacity](3610-S-bughunt-rare-life-capacity.md),
[3800 reproduction](3800-S-bughunt-spawn-determinism.md) and
[3830 fix](3830-life-rooted-final-depth.md) notes. No applicable AGENTS.md found.
The result wrappers' smoke PASS summaries do not override the embedded reports
of failed headless gates.

Pinned a clean checkout and inspected every registered worktree's HEAD,
uncommitted status/statistics and committed changed paths relative to main.
Held 2980/3050 collision changes, finished/uncollected 3310 journeys,
3320 full-e2e note, 3340 touch test/note and 3380 CI note do not own this slice.
Adjacent 3820 owns d-shell and its note; 3850 owns gamePois and its note.
Rechecked ownership/HEAD before editing. None owns lifeSim.test.ts or this note;
no uncollected patch is used or collected. The initial audit changes only these
two owned files. The user's subsequent gate-fix request also authorizes the
DIRECTOR formatting correction recorded below.

## Existing guards mapped before editing

| Contract                                                                                                          | Production evidence                                                                                                                                                                                                                     | Existing capability guard                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A table row's habitat is intersected with the species habitat                                                     | [tables.ts:137](../../src/world/life/tables.ts#L137), entryBand                                                                                                                                                                         | [lifeTables.test.ts:75](../../tests/unit/lifeTables.test.ts#L75) covers every indexed site; [87](../../tests/unit/lifeTables.test.ts#L87) checks valid row/catalogue intersections; [152](../../tests/unit/lifeTables.test.ts#L152) covers selection                                                                                   |
| Rooted patches use stable cells; each member must pass the six-metre habitat tolerance at its own ground position | [LifeSim.ts:582](../../src/world/life/LifeSim.ts#L582) checks cell centres; [placePatch:610](../../src/world/life/LifeSim.ts#L610) samples each final ground, rejects out-of-band members and seats accepted members at the same height | [lifeSim.test.ts:161](../../tests/unit/lifeSim.test.ts#L161) revisit stability; [186](../../tests/unit/lifeSim.test.ts#L186) immobility/seating; [201](../../tests/unit/lifeSim.test.ts#L201) gentle ground; [212](../../tests/unit/lifeSim.test.ts#L212) one Lost City/high/seed-1 steep-slope regression                             |
| Tier pool, species and individual species capacities remain bounded                                               | [LifeSim.ts:124](../../src/world/life/LifeSim.ts#L124), capacityOf; [addAgent:287](../../src/world/life/LifeSim.ts#L287); [refreshActive:218](../../src/world/life/LifeSim.ts#L218); [types.ts:147](../../src/world/life/types.ts#L147) | [lifeSim.test.ts:77](../../tests/unit/lifeSim.test.ts#L77) initial pool/species limits; [90](../../tests/unit/lifeSim.test.ts#L90) all-tier dive; [rare population checks:450](../../tests/unit/lifeSim.test.ts#L450) crowded admission and recovery; [lifeTables.test.ts:202](../../tests/unit/lifeTables.test.ts#L202) draw ceilings |
| Sessile animals preserve accepted final positions                                                                 | [steer.ts:673](../../src/world/life/steer.ts#L673) does not integrate sessile translation                                                                                                                                               | Existing seating/revisit guards above; [lifeSim.test.ts:304](../../tests/unit/lifeSim.test.ts#L304) preserves hard-flight finite-state checks                                                                                                                                                                                          |
| Runtime uses parsed site tables, configured tier, real terrain and optional authored opening population           | [systems/life.ts:62](../../src/app/systems/life.ts#L62)                                                                                                                                                                                 | [lifeDisposal.test.ts:117](../../tests/unit/lifeDisposal.test.ts#L117) preserves Arcade/Realistic reach and lifecycle guards; optional authored openings are outside this placement matrix                                                                                                                                             |

The materially missing contract was **final-member bounds plus nonzero eligible
rooted population across shipped tables, seeds and tiers**. The original
single-slope regression is adequate for its specific bug and remains intact;
this audit does not duplicate determinism, rare recovery, renderer/camera or
Journal tests.

## Added guard and census

[lifeSim.test.ts:234](../../tests/unit/lifeSim.test.ts#L234) adds one table-driven
capability with **39 site/tier cases**, keeping all historical assertions.
Each uses unchanged parsed tables and real tier limits, seeds **1, 7, 21, 42**,
and four finite synthetic grounds per sessile row: flat habitat midpoint, flat
lower bound minus 5 m (inside the existing 6 m tolerance), lower-edge slope and
upper-edge slope. Slopes vary **1.2 m/m in X and 0.4 m/m in Z**; depths are
bounded below at 0.5 m so the shallow fixture remains seabed. Tables without
sessile rows use their first row for population/budget controls. There are
**960 independent simulations**. Each checks initial fill and subsequent
ordinary cell/despawn updates at 60 Hz, without forced spawn hooks or private APIs.

Every observed rooted agent must sit on its own sampled ground and satisfy both
its table and catalogue bands with the unchanged six-metre margin. Every sample
checks global agents, species-mesh budget and per-species capacity. Presence is
asserted across the seeded habitats for each site/tier, and rooted presence for
every site/tier whose table includes sessile rows. No specific encounter count
or all-seeds/all-depths presence requirement is introduced. Rooted means
`sessile`; crawler motion is a distinct existing contract.

A temporary Vite SSR census (`/tmp/3840-rooted-audit.mjs`) uses the same grounds,
tables and seeds with one initial plus 30 later frames, without a listener,
browser, renderer or WebGL. **39 pairs / 960 simulations / 60,170 rooted agent
observations** (including repeated observations, not unique animals): zero
habitat/seating/budget violations. Independent pre-fix loading reports **1,884
out-of-band observations**; flat rooted and total-agent census counts are
identical before/after in all 39 pairs. Sloped counts can fall when invalid
members are rejected, as intended. The census and tests are bounded synthetic
heightfield evidence, not GMRT encounter acceptance.

Population qualifications:

- Challenger Deep, Hunga Tonga and Bismarck tables have **no sessile rows**.
  Bismarck has crawlers. Inventing rooted species there would change product data.
- All **ten eligible sites × three tiers** retain rooted animals across these
  habitats/seeds. All nine catalogue sessile species appear somewhere in the census.
- Beebe Low/Medium have **zero rooted agents** in the midpoint and both slope
  fixtures because ordinary shrimp fill the **44/100** agent pool before the
  first cell pass ([fillAround:205](../../src/world/life/LifeSim.ts#L205)). This
  matches the pre-fix source exactly. At the valid flat lower-margin fixture,
  shrimp's four-metre seabed margin rejects their placement while anemones pass
  the existing six-metre margin: **92/272** rooted observations respectively
  across both census observations and four seeds, unchanged before/after.
  Thus this does not prove rooted presence on every sloped Beebe fixture and is
  not a population regression introduced by 3830. Reserving rooted capacity would
  be a separate population policy change, not a correction proposed here.

## Validation

Focused command:

```bash
npm test -- --configLoader runner --cache=false tests/unit/lifeSim.test.ts tests/unit/lifeTables.test.ts tests/unit/lifeDisposal.test.ts
```

Exit **0**, **3 files / 88 tests passed**, 3.16 s.
The first draft added an unsupported per-fixture nonzero-population assertion:
that run exited **1**, **4 failed / 84 passed** (three Hunga low-margin cases
and one Titanic/Low slope). Corrected only the new assertion to the intended
site/tier aggregate presence contract; no historical assertion was changed.

Failing-before control, with pre-fix source read into a temporary Vite load
plugin (production files remain unchanged):

```bash
git show '8b51108b^:src/world/life/LifeSim.ts' > /tmp/3840-LifeSim-before.ts
npx vitest run --config /tmp/3840-vitest-before.config.mjs --configLoader runner --cache=false tests/unit/lifeSim.test.ts -t 'respects final rooted habitat'
```

Exit **1**, **27 failed / 12 passed / 26 unselected tests skipped**, 1.13 s.
These are historical-source failures of the new guard, not failures of the
merged checkout. Example: Lost City/Low/seed 1 lower slope yields coral depth
**491.55400046317214 m**, below **494 m** (500 minus 6). The focused passing
run above includes all **39** new cases on the merged source. No runtime fix
was made by this audit. Temporary config keeps the repository's Node environment,
two workers and 30 s timeout; only its module-load source differs.

`node /tmp/3840-rooted-audit.mjs` and its `--baseline` control each exit **0**;
the baseline census reports violations as data, rather than asserting success.
Its initial attempt to run git via Node's execFileSync exited **1** with
`spawnSync git EPERM`; exporting the historical source with shell git first
avoids that tooling block. The superseded test control before correcting the
new presence assertion exited **1**, 30 failed / 9 passed / 26 unselected.

Required gates:

```bash
GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e
```

Exit **1**, **FAIL gates (e2e=none)**. Actual logs:
`.cache/runs/20261024-143503-2-5RZXg7/`.

- **PASS** writable config preparation, strict content validation (all 13 sites,
  zero errors/warnings), TypeScript and production build, full units and attribution
  (14 attributed asset files). The build retains its non-failing chunk-size warning.
- Full units: **192 files passed; 4,219 tests passed / four existing expected
  failures / 4,223 total**, **641.29 s**. No unexpected unit failure; the historical
  collision expected-failure cases remain unchanged and do not prove those issues fixed.
- **FAIL Python**: **162 passed / five failed / 167 outer tests**, **11.220 s**.
  Four `test_ci_build_manifest.TestCiBuildManifest` cases fail with
  `spawnSync git EPERM`: `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail` and
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
  `test_golden_tooling` has **24/25** internal Node subtests pass; the partial-set,
  missing-file and incompatible-pose comparison subtest reports
  `Unexpected end of JSON input`. Its underlying child-output cause is not established.
  These match earlier audit evidence. The smallest follow-ups are an unchanged
  run where Node can spawn git and, for the JSON failure, retaining child status,
  stdout and stderr before parsing. No tooling repair, bypass or retry is made.
- **FAIL repository Prettier**: only `plan/DIRECTOR.md` is flagged. A byte comparison
  against `git show 38afe4991d121c6b6c295b6a47d27fd6c45eeffb:plan/DIRECTOR.md`
  confirms this is already present at the audited SHA. DIRECTOR was read-only in
  the initial brief and was left untouched until the user's follow-up below.
- Browser/e2e and project-base phases are omitted by the requested command.
  No external wrapper PASS label overrides this failed gate run.

Initial owned-file verification:

```bash
npx prettier --check tests/unit/lifeSim.test.ts plan/progress/3840-S-verify-life-rooted-depth.md
git diff --check
```

Both exit **0**. Rechecked every registered tree's pending and unique committed
paths: no other tree owns overlapping life source/spec/note changes. HEAD remains
the audited SHA; only this capability spec and note differ, with no production,
data, snapshot or held-work changes at that stage.

## Orchestrator gate follow-up

The user supplied an outside-sandbox `tools/gates.sh` run and explicitly asked
to fix its root causes without weakening assertions. Logs are available under
`.cache/runs/20261024-144757-1185925-nz6tfc/`. That run reports **PASS** Python,
content, build, unit, smoke e2e, project-base e2e and attribution; **FAIL** only
repository Prettier on `plan/DIRECTOR.md`, with **FAIL gates (e2e=smoke)**.
Python has **167 passed**, 10.339 s; units have **192 files / 4,219 passed /
four preserved expected failures**, 617.56 s; smoke has **3 passed**, 9.2 s;
project-base has **8 passed**, 18.0 s. These are the orchestrator's results,
not local browser execution or hosted CI evidence. They establish that the
earlier local Python failures do not reproduce in that environment.

The formatting root cause is the Backlog's intentional numbering gap between
3 and 6: Prettier otherwise renumbers all subsequent items, moving S-bughunt
from 9 to 7 and breaking existing brief references. The final correction adds
only a separating HTML comment and blank lines at that gap, allowing Prettier
to preserve both list segments' starting numbers. Every original line,
Backlog number, item text and policy remains unchanged. No formatter-ignore
directive, rule exclusion, assertion change or configuration change is used.
The default formatting attempt's renumbering was caught by diff inspection
and replaced before completion.

Post-fix validation:

```bash
npx prettier --check .
git diff --check
```

Both exit **0**. A line-by-line comparison after removing the added comment and
blank lines exactly matches the original DIRECTOR at the audited SHA. This
corrects the only failure in the orchestrator's supplied run; the full gates
were not rerun after this documentation-only fix. Final changed files are the
lifeSim capability spec, this note and the explicitly authorized DIRECTOR
formatting correction. No test assertion, production code or runtime behavior
changed during this follow-up.

## Simplicity and limits

Production complexity is unchanged. One data-driven guard in the existing
capability spec; no new abstraction, helper, spec, package comment, UI, guidance,
setting, site branch, dependency, schema, tolerance, budget or snapshot. Predictable
habitats and retained populations support exploration and rewards; explicit
population qualifications meet the honesty rubric. Beauty, visual readability
and phone layout remain outside this headless review.

Actual local e2e mode is **none**. No hosted CI, GPU, screenshots, unaided journey,
real-site population, visual acceptance or real-phone performance validation.
Production, authored data, shared fixtures, tools, held work and other worktrees
remain untouched. DIRECTOR has only the authorized formatting comment described
above. No merge, push, tag or workflow dispatch.
