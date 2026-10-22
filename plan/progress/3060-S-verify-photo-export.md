# 3060 — S-verify: Journal photo export round trip

Item: `plan/DIRECTOR.md` Backlog 9, **S-verify / S-bughunt [Codex, standing]**.
Audited SHA: `f8a4d49162d8172aa9a7c10237125e402ab30515` (initially clean).

## Scope and ownership

Read Director rules/rubric, newest evening review, overnight log through run 80,
queued/launched briefs and launch log through 3060, available 2920–3030 results,
relevant progress and registered worktree status/diff summaries before editing.
The pending power/focus, hosted-spec, scarp/contact, Terrain/CameraRig/derived
oracle, attachment, teardown and worker/cache changes remain uncollected and
read-only. 3040 owns Scanner and its spec; 3050 owns terrainCarveAgreement;
3060 owns PhotoGallery, zip and zip.test plus this note. No overlapping change
to the owned files was present. No other package was copied, collected or used
as an implementation dependency.

Earlier photo findings excluded from new work: S-bughunt-19 validates stored
base64 before admission; S-bughunt-22 covers quota/count/legacy admission and
discovery preservation during eviction; 2070 covers gallery/system ownership
and basic URL teardown; 2880 removes cosmetic Journal leftovers. Existing
`photoMode.test.ts` already tests separate galleries, natural expiry and
idempotent disposal. `d-photo.spec.ts` exercises an actual browser single-photo
download and checks the ZIP signature, but does not independently extract a
multi-photo archive. Its browser assertions were read, not executed here.

## Traced contract and clean finding

Journal passes the admitted PhotoStore list to the gallery (newest first), or
its filtered entry-photo list preserving that order. The real Download all
listener maps that supplied list without sorting. `atob` converts the stored
JPEG base64 into bytes; it never decodes or recompresses an image. The existing
filename allocator already suffixes repeated normalized basenames. There is no
new naming implementation or production correction in this package.

`writeZip` emits uncompressed STORE entries with UTF-8 names, local CRC/sizes,
matching central records and offsets, and a single-disk end record. The gallery
creates an `application/zip` Blob and temporary anchor for `journal-photos.zip`.
Each URL has its own 30,000 ms timer; expiry removes its map entry; dispose
cancels and revokes the remaining entries. Single-photo downloads continue to
use their existing JPEG data URL and filename.

**Clean archive/resource audit:** no concrete integrity, naming, store mutation
or URL/timer defect reproduced. No production files changed, and no finding
requiring PhotoStore, Journal, PhotoMode or app lifecycle edits was identified.

## Admitted input matrix and independent evidence

Extended only existing `tests/unit/zip.test.ts`, preserving its historical CRC,
UTF-8/header and exact single-photo filename assertions. Adapted the existing
photoMode EventTarget DOM fixture pattern locally because it is not exported;
images remain inert. Only anchor activation and object-URL creation/revocation
are mocked; gallery rendering/listeners, PhotoStore admission/reload, base64
conversion, Blob creation and ZIP writing are real. Vitest controls time.

All 24 records pass `PhotoStore.save` and a fresh loader; none is inserted into
the gallery by bypassing admission. Payloads use the repository's 34,855-byte
`silt_a.jpg`, each with a legal JPEG COM segment after SOI. This yields 24
distinct binary JPEG payloads, sizes 34,860–34,883 bytes, including zero and
high bytes and different base64 padding lengths, without image decoding.

| List indices | Metadata/case                                    | Exact output names in list order                                         |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------------------ |
| 0–2          | Titanic / Bow section, same day                  | `titanic-bow-section-2026-10-21.jpg`, then `-2.jpg`, `-3.jpg`            |
| 3–4          | Titánic / Bów section; TITANIC / Bow-section     | Same normalized stem, `titanic-bow-section-2026-10-21-4.jpg`, `-5.jpg`   |
| 5–6          | Titanic, null POI caption; literal Photo caption | `titanic-photo-2026-10-21.jpg`, `titanic-photo-2026-10-21-2.jpg`         |
| 7–8          | Lost City and Lost-City / The chimneys           | `lost-city-the-chimneys-2026-10-21.jpg`, then `-2.jpg`                   |
| 9            | Titanic / Bow section on another day             | `titanic-bow-section-2026-10-20.jpg`                                     |
| 10–23        | Titanic, null POI caption, previous day          | `titanic-photo-2026-10-19.jpg`, then suffixes `-2.jpg` through `-14.jpg` |

Expected names are literal test data, not results from `photoFilename`. Python
standard-library `zipfile` reads the **Blob captured from the actual Download
all click**. It checks all 24 unique names and their order, independently
extracts each entry and compares it byte-for-byte with its original JPEG, and
checks CRCs with `binascii.crc32` and `testzip()`. `struct` compares local/central
version, flags, compression, time/date, CRC, sizes and UTF-8 filename bytes;
offsets must match the standard reader and exactly cover the local-entry region.
Directory size/offset/count and end-record boundaries also agree. This is test
inspection using a standard extractor, not another production ZIP parser.
The original non-ASCII `épave.jpg` writer case also passes that independent
reader, so UTF-8 is checked beyond the gallery's ASCII slug output.

Examples of original payloads that the independent extraction equals (CRC from
Python, not the production CRC helper):

| Index / extracted name                      |  Bytes | CRC32      |
| ------------------------------------------- | -----: | ---------- |
| 0 / `titanic-bow-section-2026-10-21.jpg`    | 34,860 | `0b57cfd3` |
| 1 / `titanic-bow-section-2026-10-21-2.jpg`  | 34,861 | `d2db59bd` |
| 3 / `titanic-bow-section-2026-10-21-4.jpg`  | 34,863 | `f768fcc5` |
| 5 / `titanic-photo-2026-10-21.jpg`          | 34,865 | `9cb3ebf1` |
| 7 / `lost-city-the-chimneys-2026-10-21.jpg` | 34,867 | `fe965a82` |
| 9 / `titanic-bow-section-2026-10-20.jpg`    | 34,869 | `330bcc34` |
| 10 / `titanic-photo-2026-10-19.jpg`         | 34,870 | `a39bdbbb` |
| 23 / `titanic-photo-2026-10-19-14.jpg`      | 34,883 | `f89b8e63` |

The in-memory photos, discovery snapshot and both serialized storage values
remain identical; a fresh PhotoStore and DiscoveryStore reload the same data.
The storage write spy and gallery change callback both record zero calls.
The temporary download anchor is removed.

## URL and timer evidence

One gallery exports at virtual t=0 and t=10,000. Neither URL releases before
t=30,000; the first releases at exactly 30,000 and the second at exactly 40,000.
Timer counts progress 2 → 1 → 0. Two more clicks create two independent pending
URLs/timers; repeated dispose releases both exactly once, leaves zero timers,
and advancing another 60,000 ms causes no extra revocations. Across all four
exports each created URL has exactly one revoke. The separate archive test
also disposes its pending URL and checks zero remaining timers.

## Simplicity and rubric

Two missing capability guards and a standard-reader check in the existing ZIP
spec; no new spec, dependency or production abstraction. No UI surface, setting,
guidance, site branch, config mutation, schema, storage policy, ZIP format,
download behavior, budget, instance count, tolerance or snapshot changed.
This protects correct Journal export and retained discoveries within the
existing 24-photo policy. Readability, beauty, composition, visual Phone-OK and
real-phone acceptance remain with Claude/owner; Arcade and all exploration,
site, marine-life, input and accessibility behavior are untouched.

## Validation

- PASS: focused existing export/photo/Journal/discovery capabilities, **5 files /
  88 tests**. Command: `npx vitest run tests/unit/zip.test.ts
tests/unit/photoStore.test.ts tests/unit/photoMode.test.ts
tests/unit/gameDiscoveryStore.test.ts tests/unit/journalGroups.test.ts
--configLoader runner --cache=false --reporter=verbose`.
  Logs: `/tmp/3060-focused.log` and final `/tmp/3060-focused-final.log`.
- PASS: `npm run typecheck` and owned-spec Prettier.
- Required command: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **exit 1**, actual **e2e=none**. Log: `/tmp/3060-gates.log`; gate directory:
  `.cache/runs/20261021-135428-3-aKy6PT/`.
- PASS: config, strict content, production build/typecheck, **192 unit files /
  3,391 tests** (525.10 seconds), attribution and repository-wide Prettier.
  No skips, retries, tolerance changes, timeout increases or snapshot updates.
- Python: **162/167 pass, five failures**. Four unchanged build-manifest checks
  fail with `spawnSync git EPERM` (environment restriction). The unchanged
  `test_golden_tooling` wrapper fails parsing CLI JSON with
  `Unexpected end of JSON input`; its underlying cause remains unresolved.
  These match prior package reports; no unrelated tooling was repaired.
- Final owned-file formatting and `git diff --check`: **PASS**.
- Harness environment finding: synchronous Node subprocess probes returned
  `EPERM` and the initial sync-reader test attempts did not complete; those two
  runs were interrupted (exit 130), with no pass claimed. The final test uses
  the normal asynchronous `execFile` boundary, which runs Python and checks its
  successful exit/output. No production failure or workaround was involved.

Actual e2e mode: **none**. No game/browser launch, image decoding/rendering,
screenshots, Safari download completion, visual QA, unaided play, GPU behavior
or real-phone performance/acceptance established. The repository JPEG fixture
exercises binary export, not the game capture encoder or thumbnail dimensions;
this is not a quota or peak-memory benchmark. No multi-gigabyte or
unsupported record claims. No merge, push, tag, Director or tools changes.
