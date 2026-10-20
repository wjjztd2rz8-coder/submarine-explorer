# S-events-low-audit — Low anchored contacts

2026-10-18. Brief 2720, DIRECTOR Backlog item 12d (present in the live main
worktree's `plan/DIRECTOR.md`; this checkout's plan predates its addition).
**Clean numerical audit: no production defect demonstrated and nothing cut.**
Eight contacts are authored across the six event sites, rather than six contacts.

Before editing, checked the launched briefs/log, `git worktree list`, other
worktrees' changes and the anchored implementation's progress note. In particular,
S-bughunt-25 already adds anchor clearance, coincident arrival and save/reload
coverage in `eventsTerrain`, `gameExplore` and `eventsSystem`; those edits were
read, not repeated or copied. This brief extends only the existing
`eventsReform.test.ts` capability spec with the remaining quantitative checks.
No production source, authored site data, art, geometry values, materials,
lighting, CSS, layout, tools or Director plan changes. No merge, push or tag.

## Measurements

Actual `Terrain.sampleHeight` with each shipped heightmap, `makeConfig()` terrain
settings and the **Low** tier, including procedural detail and applicable local
terrain resolution. Fresh saved settings inherit the same detail strength (1.0)
used here; the runtime terrain system reads that saved value. Heights are world
metres, rounded here to three decimals.
The raw readings are in `.cache/events-low-audit/measurements.json`; the
instrumented passing run is `.cache/events-low-audit/measurements.log`.
Temporary measurement logging was removed from the final test changes.

| Site             | Contact     | Bed Y (m) | Anchor Y (m) | Above bed (m) | Active Low budget  |
| ---------------- | ----------- | --------: | -----------: | ------------: | ------------------ |
| Axial Seamount   | Vent plume  | -1541.520 |    -1535.520 |         6.000 | 100 particles      |
| Beebe Vent Field | Vent plume  | -4991.507 |    -4985.507 |         6.000 | 100 particles      |
| Kamaʻehuakanaloa | Vent plume  | -1287.966 |    -1281.966 |         6.000 | 100 particles      |
| Hunga Tonga      | Silt flow   |  -475.855 |     -469.855 |         6.000 | 100 particles      |
| Hudson Canyon    | Silt flow   |  -954.670 |     -948.670 |         6.000 | 100 particles      |
| Hudson Canyon    | Whale route |  -954.670 |      -60.000 |       894.670 | 588 mesh triangles |
| Monterey Canyon  | Silt flow   |  -732.514 |     -726.514 |         6.000 | 100 particles      |
| Monterey Canyon  | Whale route |  -732.514 |      -60.000 |       672.514 | 588 mesh triangles |

Every row has the same **40 m inclusive full-3D arrival radius**, **110 m
contact visibility radius** and **18 active-second playback**. Arcade's scan
floor resolves to **100 m** through `resolveEffective`; it does not expand arrival
eligibility. The contact is available over the 70 m interval between 110 m and
40 m, including the 60 m interval from the scan floor to arrival. At 100 m,
holding Scan neither starts an event nor produces a scan candidate/completion.
At 110.001 m the isolated contact has no Scanner hint; at 109.999 m it does.
The same authored 110 m radius gates its local sonar contact in `explore.ts`.
This is contact availability, not proof that the effect itself is visible through
fog or relief, or that it wins guidance over another nearby target.

For every contact, arrival at exactly 40 m starts one playback at elapsed 0.
Quarter-second updates retain that playback through 17.75 seconds and expire it
at 18 seconds. Staying inside for another 10,000 seconds never fires again.
Leaving to 41 m and returning starts the next playback. Exactly once means once
per entry, not once for the lifetime of a dive. Existing capability checks retain
pause, invalid time, overlap, reset and witness/Journal guards.

At 0, 0.8, 7, 15 and 17.75 seconds, each active effect has exactly one visible
object with finite vertex positions, world transforms and witness origin;
particle size/opacity remain finite and positive. The Low object allocation is
bounded: one 100-point buffer plus one merged 588-triangle whale mesh, with only
the appropriate object active. No textures or lights are added. These are
headless geometry/allocation checks, not GPU draw measurements or phone FPS.

## Checks

Passed:

- Initial instrumented `eventsReform` run: **15 tests / 1 file**, including six
  new site-table cases covering all eight contacts. Final uninstrumented focused
  run: **40 tests / 4 files** (`eventsReform`, `eventsTerrain`, `eventsSystem`,
  `gameExplore`), using `npm test -- --configLoader runner --cache=false`.
  Evidence: `.cache/events-low-audit/capability.log`.
- Production build (TypeScript checking and Vite bundle) and strict content
  validation in the canonical gate run below.
- Playwright collection: **16 tests / 1 file** in `f-events-reform.spec.ts`.
  Evidence: `.cache/events-low-audit/e2e-collection.log`.
- Standalone attribution and repository-wide Prettier checks: **PASS**. Evidence:
  `.cache/events-low-audit/attribution.log`, `prettier.log`. `git diff --check`
  and the final changed-file Prettier check also **PASS**.

Canonical command:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4372 PW_OUTDIR=.cache/events-low-audit/dist bash tools/gates.sh
```

**Selected gate e2e mode: smoke + project-base, not full e2e; neither browser
gate was reached.** Run directory:
`.cache/runs/20261018-191744-3-0QH5c2/`; summary:
`.cache/events-low-audit/gates.log`. Exit **130**, interrupted after approximately
six minutes while the full unit run remained at its initial `RUN` banner with
no test results. No full-unit pass or failure count is claimed. The underlying
reason for that stall was not established; it is not classified as an event
regression or assumed to be an environment restriction. Later smoke,
project-base, attribution and formatting gate stages were not reached;
attribution and formatting were run separately as reported above.

Separate targeted attempt: **normal Chromium behavior mode**,
`PW_RENDER_REVIEW=0 VISUAL_QA=0`, existing `f-events-reform.spec.ts` (desktop and
landscape phone, eight contacts each), fresh build above, port 4272. Exit **1**
before browser assertions: Playwright could not start its preview server;
`DEBUG=pw:webserver` records localhost connection `EPERM` for both `::1:4272`
and `127.0.0.1:4272`. Evidence: `.cache/events-low-audit/e2e-events.log`.
Command:

```sh
GATES_CONFIG_MODE=writable PW_RENDER_REVIEW=0 VISUAL_QA=0 PW_PORT=4272 PW_OUTDIR=.cache/events-low-audit/dist DEBUG=pw:webserver npx playwright test tests/e2e/f-events-reform.spec.ts --output=.cache/events-low-audit/event-results
```

No browser pass, GPU execution or screenshot is claimed.

Failures, separate from environment blocks:

- Python gate: the existing golden comparison wrapper fails with
  `Unexpected end of JSON input` at `tools/tests/golden-manifest.test.mjs:151`.
  This is also recorded by P2-events-anchored and S-bughunt-25. Its underlying
  cause is not established here; no tooling was changed.

Environment blocks:

- Four Python build-manifest cases fail with `spawnSync git EPERM`. Combined
  with the golden wrapper above, the gate reports **5 failures / 167 outer
  Python tests**.
- Targeted Chromium preview startup blocked as above. Canonical smoke and
  project-base checks were **not run**, because the aggregate gate was stopped
  during its stalled full-unit stage.

## Claude review notes

No change to beauty or visual acceptance. Claude should judge whether each
plume is distinct from ambient venting, each moving silt flow reads against its
local relief, and the crossing whale silhouette is recognizable on Low.
The whale contacts are 60 m below the surface, hundreds of metres above the
seabed contacts: natural discoverability of that upper-water route needs actual
piloting review. Check event start/late motion, fog/contrast, witness opportunity,
and guidance/control clearance on desktop and both phone orientations.
These are review questions, not demonstrated visual defects. No event is cut
on the basis of these numerical checks.

Simplicity: no new runtime machinery, setting, guidance surface, site branch,
config mutation or layout patch. Existing capability coverage is extended;
package history remains in this progress note.
