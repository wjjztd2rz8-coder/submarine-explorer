# 3330 — S-verify: guide source/image deployment URLs

Item: DIRECTOR Backlog **9, S-verify / S-bughunt [Codex, standing]**;
this slice serves **S-verify**. Pinned SHA:
`133013e7d25a9eb5787e5d64ee396a3cc0de4ffd`.

**Clean URL-resolution audit.** No missing or duplicated deployment prefix,
changed absolute destination, or shipped missing image was reproduced. Production,
shared publicUrl, authored content, UI, CSS, build configuration and worker code
are unchanged. The initial slice edited only `tests/unit/gameGuide.test.ts`
and this note. The user-requested gate follow-up below also edits the
Monterey collision test fixture, without changing collision expectations.

## Intake and ownership

Read CONTRIBUTING-AGENTS, DIRECTOR Backlog/simplicity rules/rubric, the newest
2026-10-22 night review and OVERNIGHT-LOG through run 87; inspected launched
3310–3330 briefs, queued 3340, launch-log tail and relevant available results.
Read prior 1510 (`S-unused.md`), 3030, 3070 and 3290 progress evidence. The
3030/3290 wrapper summaries say browser gates passed, while their detailed
reports record e2e none and Python failures; those wrappers are not acceptance
for this package. 3070 has no separate result file in the inspected cache and
its committed note leaves required gates pending; only its explicit evidence
was used.

Initial checkout was clean. Registered worktrees and live statuses were checked
before editing and ownership rechecked: 3320 owns ContentPath and its two
content/Journal tests; 3330 owns only gameGuide test edits and this note; 3340
is report-only. 3310's journey spec/note and R-ci-green-3's CSS/e2e/scarp changes
are separate. No changes were copied, collected, overwritten or committed from
those worktrees. 2980/3050 were left untouched. No dependency on uncollected
work; no completed cache, successful scan linkage, collision, journey, provenance,
prose or visual audit was reopened.

## Resolution and consumer trace

- `Guide.safeUrl` returns authored HTTP(S) unchanged. For a supported leading
  single-slash site-relative URL it calls `publicUrl` once. Other inputs retain
  the existing rejection behavior.
- `publicUrl` prepends `import.meta.env.BASE_URL` and removes the one authored
  leading slash. ContentPath separately resolves the guide JSON request; its
  CONTENT_ROOT does not become a base for links inside that JSON.
- `parseGuide` filters source strings/objects and image URLs through safeUrl.
  `buildGuideEntries` retains parsed guide entries without resolving again;
  only generated POI stand-in sources pass through safeUrl there.
- Discovery loads guide/POIs and calls buildGuideEntries. JournalData likewise
  builds entries and assigns each parsed guide entry as `guide: g` unchanged.
  `FieldGuide.ts` re-exports Journal, so it introduces no additional resolver.
- Journal's article assigns `img.src = g.image.url`; renderSources passes each
  `s.url` to link, which assigns `a.href = url` directly. These are the final
  consumer assignment values below, established by tracing code, not by browser
  navigation. No second publicUrl call or guide-folder-relative URL step exists.

## Shipped inventory and path/base evidence

Membership comes from the real parseMissionIndex on
`data/landmarks/index.json`; `_test` is not indexed. Read only those 13 guide
JSON documents. Counts are authored occurrences, not remote requests:

| Indexed site         | Guide entries | Source URLs | Image URLs |
| -------------------- | ------------: | ----------: | ---------: |
| great-blue-hole      |             6 |          16 |          0 |
| hunga-tonga-caldera  |             6 |          18 |          0 |
| blake-plateau-corals |             6 |          13 |          0 |
| lost-city            |             7 |          27 |          0 |
| kamaehuakanaloa      |             5 |          11 |          0 |
| axial-seamount-ashes |             8 |          21 |          0 |
| hudson-canyon        |             6 |          14 |          0 |
| monterey-canyon      |             6 |          15 |          0 |
| endurance            |             8 |          34 |          0 |
| titanic              |             8 |          33 |          0 |
| bismarck             |             6 |          18 |          0 |
| beebe-vent-field     |             4 |          14 |          0 |
| challenger-deep      |             8 |          29 |          0 |
| **Total**            |        **84** |     **263** |      **0** |

All 263 source occurrences are object-form absolute URLs: **257 HTTPS, 6 HTTP**,
**121 distinct destinations**. There are **no shipped site-relative sources,
local images or remote guide images**. The HTTP forms include Beebe's
`http://www.joncopley.com/docs/Rimicaris_hybisae.pdf` and Challenger's
`http://nora.nerc.ac.uk/id/eprint/524544/1/Stewart_and_Jamieson_2019_The%20five%20deeps.pdf`.
Their schemes, encoded path and destinations survive unchanged at both bases;
no policy to upgrade HTTP was introduced.

The temporary local-only Vitest audit imports the real parseGuide,
buildGuideEntries, parseMissionIndex and parsePois with fresh module state for
each base. All **526 source/base comparisons** preserve authored → parsed →
built values. `.cache/3330/url-inventory.json` records each site/entry, base,
authored, parsed and consumer-assignment value. This ignored artifact is a local
audit record, not a new committed content matrix. No source URL was requested
or executed.

There is no shipped local guide image requiring an asset lookup. Existing mapping
is `public/data -> ../data`; Vite's copyPublicFiltered dereferences public assets
into the build root and excludes sample/compressed/heightmap16 tile files, not
ordinary guide images. Under project hosting that build root is mounted at
`/submarine-explorer/`. Prior 1510/3030 artifact checks support this mapping;
worker caching was not audited again. During this package's required root build,
all 13 guide JSON files were checked at the corresponding build-root `data/`
paths and were byte-identical to the authored files; the documented example
image was absent there too. The local record is
`.cache/3330/build-file-mapping.json`. No project-base artifact build was run;
project-base string resolution is covered by isolated Vitest execution.

The representative optional image input comes verbatim from
`plan/PHASE-B-CONTRACTS.md` §2.2:
`/data/landmarks/titanic/img/bow.jpg`. It is **not an authored shipped image**,
and `public/data/landmarks/titanic/img/bow.jpg` does **not** exist. This is a
schema illustration, not a broken shipped reference; no asset or content was
added to create a case. The same documented supported path exercises a local
source string and stand-in source, because safeUrl permits that path in either
href or src.

| Input shape / authored value                                         | Base                   | Parsed / final consumer-assignment value                 |
| -------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------- |
| Documented local image/source: `/data/landmarks/titanic/img/bow.jpg` | `/`                    | `/data/landmarks/titanic/img/bow.jpg`                    |
| Same supported input                                                 | `/submarine-explorer/` | `/submarine-explorer/data/landmarks/titanic/img/bow.jpg` |
| HTTPS source: `https://en.wikipedia.org/wiki/Wreck_of_the_Titanic`   | both                   | Identical authored absolute URL                          |
| HTTP source: `http://www.joncopley.com/docs/Rimicaris_hybisae.pdf`   | both                   | Identical authored absolute URL                          |

For the documented local input, expected deployment location is exactly the
listed path, if its optional asset were supplied. Exact equality guards both
missing and doubled prefixes; no file availability is asserted for that example.

## Existing versus added coverage; retained findings

Existing coverage retained unchanged: gameGuide parsing, invalid image/source
scheme handling, single-root relative path, protocol-relative/backslash/data
rejections, entry identity and stand-ins; publicUrl's explicit root/project
arguments; copyJournal's shipped identity/provenance matrix; ContentPath's
existing request/optional-content guards. Focused execution runs those controls.

Materially missing contract: no gameGuide test exercised the implicit Vite base
through parseGuide and buildGuideEntries, including an image and fallback sources.
Added only **two cases**, one per base, to that existing capability spec. They
check supported local image/source resolution once and absolute HTTP(S)
preservation in parsed and built entries. Each uses `vi.stubEnv('BASE_URL', base)`
and `vi.resetModules()` before dynamic import; `finally` restores environment
stubs and resets modules afterward. The temporary shipped audit uses the same
isolation/restoration facilities. No new policy, rejection, snapshot, tolerance,
budget, count, retry, skip or timeout change.

No product failure or proposed Guide correction is retained. The absent schema
example asset is explicitly distinguished from a prefix error. Existing
out-of-scope collision failures remain with their owning packages.

The required Python gate retains **5 failures in 167 tests**, matching the
3030/3290 reports. Four `test_ci_build_manifest` cases fail at
`spawnSync git EPERM`: `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
`test_every_manifest_mismatch_is_rejected`,
`test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`, and
`test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
`test_golden_tooling` fails with `SyntaxError: Unexpected end of JSON input`
in the comparison CLI report test. These are tooling/environment failures,
not guide URL assertion failures. The smallest next step is to run the unchanged
checks where the git subprocess is permitted and inspect the report child's
exit status/stderr/stdout; no product or tooling correction is justified by
this slice. Assertions remain unchanged, without retries or skips.

## Simplicity and rubric

No production complexity added. Two representative cases protect URL behavior
without committing another all-content/provenance matrix or DOM fixture. No UI,
setting, dependency, schema, Backlog item, guidance surface, layout patch,
per-site shared-code branch or runtime config mutation. Real GMRT, all 13 site
identities, five heroes, scanning/retained discoveries/Journal, life, input,
accessibility and Arcade default remain untouched. Behavioral correctness and
honest source retention are supported; readability, beauty, composition, touch
layout and real-phone performance remain with Claude/owner.

## Validation

- Local shipped audit:
  `./node_modules/.bin/vitest run --config /tmp/guide-url-audit.config.mjs --configLoader runner --cache=false`
  — **PASS, 1 file / 3 checks**, including both bases and inventory output.
  Temporary fixture `/tmp/guide-url-audit.test.ts`; log `.cache/3330/audit.log`.
- Focused existing guide/content URL capabilities:
  `./node_modules/.bin/vitest run tests/unit/gameGuide.test.ts tests/unit/gameContentPath.test.ts tests/unit/copyJournal.test.ts tests/unit/publicUrl.test.ts --configLoader runner --cache=false`
  — **PASS, 4 files / 42 tests**; log `.cache/3330/focused.log`.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **FAIL, exit 1, `FAIL gates (e2e=none)`**. Python ran 167 tests with the five
  retained failures detailed above. Config bundle, strict content, TypeScript
  plus root production build, units, attribution and repository-wide Prettier
  **passed**. Units: **192 files passed; 3,804 passed / 4 existing expected
  failures (3,808 total)**, duration **653.85 s**. Existing large-chunk build
  warning remains informational. No guide/content URL assertion failed.
  Full output `.cache/3330/gates.log`; per-gate logs
  `.cache/runs/20261023-035404-15-evNcxf/`. The gate cleanup removes its build
  output; the byte-mapping evidence was captured while that output existed.
- Final owned-file Prettier and `git diff --check`: **PASS**. Formatting writes
  were restricted to the two owned files. Final HEAD matches the pinned SHA;
  final status contains only the gameGuide test and this new note. Ownership
  recheck shows 3320's ContentPath/Journal tests in its own worktree; none of
  its changes is present here. No production or other-package change included.

Actual e2e mode: **none**. No browser, game render, screenshots, GPU or remote
requests. URL strings and static file mapping do not establish browser navigation,
remote availability, redirects, response policy, image decoding/rendering, visual
acceptance or real-device performance. No merge, push, tag or hosted dispatch.

## Gate follow-up: remove unused terrain coloring from the contact fixture

The user supplied the orchestrator's subsequent unsandboxed gate outcome:
`.cache/runs/20261023-040559-26526-zhKHEN/`, **FAIL gates (e2e=smoke)**.
Python, content, build, root smoke, project-base browser checks, attribution and
Prettier passed there. Units reported **191 files passed / 1 failed;
3,804 passed / 3 expected failures / 1 skipped (3,808 total)**, 586.79 s.
The high/west `beforeAll` in `montereyScarpSupport.test.ts` exceeded the
unchanged 10-second hook budget; its expected-failure assertion was never run.
That automatic skip is a setup failure, not a collision repair or test pass.
These supplied browser passes precede this fixture change and are not fresh
browser evidence for it. They also establish that the earlier five Python
failures were specific to the sandbox/tooling environment.

The user's follow-up authorizes fixing that named gate cause beyond the original
guide-only test ownership. HEAD remains pinned. Ownership was rechecked before
the follow-up edit: R-ci-green-3 independently has a timeout-only change to this
same test (60 seconds). It was inspected read-only, left untouched and neither
copied nor used as a dependency. This checkout's independent correction keeps
the original timeout. No collision implementation or 2980/3050 work was changed.

Measured setup in the original fixture builds the full survey tile and all five
authored props for each row. A separate local timing run passed but measured the
high/west hook at 8.05 s, already close to its budget without full-suite
contention. In the comparison run, the original high/west setup took **8.20 s**:
**3.65 s** building terrain, then about **4.49 s** building props. Terrain also
computes a color buffer for every survey-mesh vertex because Monterey's biome
defines vertexTint. This CPU work is unused by the contact/attachment tests.

The fixture now partially mocks only TerrainBiome's vertexTint field to
undefined, preserving every other biome field and the real Terrain and Props
implementations. It skips the unused per-vertex color loop. The full measured
high/west setup fell to **6.41 s**, including comparison instrumentation;
terrain construction fell to **1.73 s**. There is no timeout increase, retry,
skip, new test, content filter, reduced tier/detail, smaller tile or changed
assertion. All five authored props, actual wall triangles, real GMRT sampling,
8 m hull, fixture-validity assertions and four historical expected failures remain.

An ignored comparison fixture ran both the original and uncolored setup. For
each of the four rows it hashed **every terrain and prop position, normal and
index buffer**, and recorded all prop placement matrices, terrain statistics,
ray hit coordinates/normal and sampled ground height. All four paired records
are identical; both variants retain the four collision expected failures and
the regular attachment assertion pass. The omitted data is solely the unused
terrain vertex colors. Art and production color behavior are unchanged.

Validation after the correction:

- Temporary comparison: **2 files passed; 2 passed / 8 expected failures
  (10 total)**, 33.87 s. Log `.cache/3330/physics-compare.log`; exact geometry
  evidence `.cache/3330/physics-signatures.jsonl`; timings
  `.cache/3330/setup-timings.jsonl`. Comparison script verified equality of
  all four paired records.
- `./node_modules/.bin/vitest run tests/unit/montereyScarpSupport.test.ts tests/unit/gameGuide.test.ts tests/unit/gameContentPath.test.ts tests/unit/copyJournal.test.ts tests/unit/publicUrl.test.ts --configLoader runner --cache=false`
  — **5 files passed; 43 passed / 4 expected failures (47 total)**,
  **14.45 s**, no skipped tests or hook failure.
  Log `.cache/3330/followup-focused.log`.
- `./node_modules/.bin/tsc --noEmit`: **PASS**.
- Final owned-file Prettier and `git diff --check`: **PASS**. Only gameGuide,
  montereyScarpSupport and this note differ from the pinned checkout.

This removes unused fixture work without reducing physics coverage or increasing
production complexity. The known collision defects remain explicitly expected
failures. The full gate suite has not been rerun after this correction; the
focused result and measured reduction do not guarantee timing under arbitrary
runner contention. Local e2e mode remains **none**; the supplied orchestrator
mode was **smoke + project-base**, with both browser gates passing before this
change. No local browser, game render, screenshot or visual/phone acceptance.
