# S-bughunt-gallery-share

2026-11-12 — follow-up to DIRECTOR item 16n, S-bughunt-photo-mode; two audit rounds.

## Confirmed defect and cut

Quota eviction can retain fewer than the 24-photo count limit, but manual capture
always reported “keeps 24”. Added three real capture-system/PhotoStore cases:
retaining one or three photos failed on the status before the fix; retaining 24
passed as the control. Both failures reported 24 despite correctly persisting
one/three photos. Red evidence: `/tmp/gallery-share-red.log`.

The existing status now reads the retained collection length. Merged the duplicate
successful-capture branches so shutter, sound and status share one path; runtime
code shrinks by two lines. No new surface, state, setting, dependency, save format,
site branch or package-number comment. Cut logged in CHANGELOG.md.

## Audit rounds

1. Traced manual/automatic capture, quota and count eviction, oversized failure,
   denied storage, persistence readback, failed deletion and retry, and Journal
   refresh. Confirmed only the misleading retained-count status above. Existing
   photo-store tests cover byte-boundary eviction with both browser quota names,
   full-store preservation when no image fits, recovery, non-quota denial and
   discovery isolation.
2. Reviewed gallery grid/viewer single JPEG and ZIP actions, filename allocation,
   admitted legacy image/date validation, URL expiry/disposal, filtered entry
   lists and storage recovery. Existing ZIP tests independently extract retained
   JPEG bytes with Python zipfile, verify unique filenames/CRCs and ensure exports
   preserve photos/discoveries. No further defect confirmed. Sharing here uses
   existing JPEG/ZIP downloads; there is no native-share implementation to change.

## Validation

- Failing first: `npx vitest run tests/unit/photoMode.test.ts -t 'reports the actual' --configLoader runner --cache=false`:
  two failures, one passing control, before runtime edits.
- Final focused run: `npx vitest run tests/unit/photoStore.test.ts tests/unit/photoMode.test.ts tests/unit/zip.test.ts tests/unit/journalGroups.test.ts --configLoader runner --cache=false`:
  **128 tests pass**. Evidence: `/tmp/gallery-share-focused-final.log`.
- `npm run typecheck`: pass after correcting the new fixture mock's return type.
- Grepped `tests/e2e/d-photo.spec.ts` for photo/gallery/download/quota capabilities.
  Extended its existing full-store/quota test with successful eviction to two
  photos and the exact retained-count message, preserving its 24-photo and total
  write-refusal assertions. Ran
  `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-gallery-share PW_PORT=4189 npx playwright test tests/e2e/d-photo.spec.ts -g 'a full photo store reports the dropped oldest; quota failure is explained' --output=.cache/gallery-share-e2e`.
  Preview startup failed before test execution. Evidence:
  `/tmp/gallery-share-e2e.log`, `/tmp/gallery-share-e2e-debug.log`.
  Debug output confirms `connect EPERM` on both localhost IPv4 and IPv6.
- Production build/typecheck passes with the gate-generated writable config:
  `npm run build -- --outDir dist-gallery-share --config .cache/gates/vite-4187-20261112-163158-3-Pnuu6b.config.mjs --configLoader native`.
  Evidence: `/tmp/gallery-share-build-final.log`. The first all-gate build caught
  the fixture return-type error mentioned above; the final build corrects it.
  A separate `tools/gates.sh --phase build` bundles successfully but its provenance
  writer fails with `spawnSync git EPERM`, matching the Python manifest failures.
  Evidence: `/tmp/gallery-share-build.log`.
- Changed-file Prettier and `git diff --check`: pass.
- Full gates: `GATES_CONFIG_MODE=writable PW_OUTDIR=dist-gallery-share PW_PORT=4187 bash tools/gates.sh`:
  **exit 1, FAIL gates (e2e=smoke)**. Evidence: `/tmp/gallery-share-gates.log` and
  `.cache/runs/20261112-163158-3-Pnuu6b/`.
  - **4,869 unit tests pass; one unchanged missionComposition test fails**:
    `monterey-canyon 1600×900: mission opening objective angular size review and frame fractions`
    hit the existing 30,000 ms timeout (32,778 ms elapsed). Full unit duration:
    1,297.96 s. No timeout or assertion was changed.
  - Content, attribution and repository-wide Prettier pass.
  - Initial root build caught the fixture typing error; final root build and
    typecheck pass as documented above. Root smoke therefore did not execute in
    that all-gate run. Project-base build/typecheck subsequently pass with the
    final source; its browser gate fails at preview startup. The required focused
    photo browser run independently reproduced localhost `EPERM`.
  - Python: 164/169 pass; four manifest tests fail with `spawnSync git EPERM`;
    the golden comparison wrapper fails with `Unexpected end of JSON input`.
    These match the prior photo-mode audit's tooling failures. No unrelated
    tooling, geometry, gate or timeout change was made.
- Isolated recheck of the sole unit failure:
  `npx vitest run tests/unit/missionComposition.test.ts -t 'monterey-canyon 1600×900: mission opening objective angular size review and frame fractions' --configLoader runner --cache=false`:
  **one pass, 92 unselected**, 15.52 s. Evidence:
  `/tmp/gallery-share-composition-recheck.log`. The full-suite timeout remains a
  failed gate result; the isolated pass does not make that run green.

No browser acceptance or visual verification claimed.
