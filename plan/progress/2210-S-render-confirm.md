# S-render: nightly and golden confirmation

2026-10-16. Item S-render, brief 2210. Base `3035717`.

## Plan

1. Inspect the nightly workflow with `gh run list`, then inspect the first
   scheduled run and its jobs/artifacts when available.
2. Compare the latest two timestamp directories in the main checkout's
   `.cache/golden`, checking capture manifests and reporting exact per-site
   pixel deltas. Preserve the original captures and all art.
3. Fix only demonstrated tooling/CI defects, run the repository gates, and
   review the evidence in a second round before recording the conclusion.

## Round 1: evidence collection

The worktree starts clean and has no `.cache/golden`. Existing captures are
under `/home/vijay/submarine-explorer/.cache/golden`; compare these read-only.
The latest directories are `2026-10-15-172432` and `2026-10-15-211537`.

Two attempts to run `gh run list --workflow render-nightly.yml --limit 20
--json databaseId,displayTitle,event,status,conclusion,headSha,createdAt,updatedAt,url`
both exited 1: `error connecting to api.github.com`. This is a local access
failure, not evidence of a failed hosted workflow. Hosted status is unverified.

## Golden comparison

Compared `/home/vijay/submarine-explorer/.cache/golden/2026-10-15-172432`
with `2026-10-15-211537` in the same parent directory. Timestamp names determine
order; no incomplete directory was silently skipped.

| Set      | Build SHA                                  | Complete | PNGs | Failures                                                               |
| -------- | ------------------------------------------ | -------- | ---- | ---------------------------------------------------------------------- |
| Previous | `1c1dad6dd2f0320e1fdfb497b29ddc1654ba0594` | false    | 20   | Monterey capture 1: Chromium viewport capture timed out after 30000 ms |
| Latest   | `26b98926b4a3df03c748b615ccb0e2ef7955f3ef` | true     | 23   | none                                                                   |

Both manifests record clean production builds, High tier, desktop 1600 × 900,
free dive, and the same planned heroes/layouts. Capture filenames exactly match
the PNGs present in each directory. The capture URLs specify life seed 42 and
dynamic resolution off. All shared PNGs decode as RGB at 1600 × 900.

Method: Pillow `ImageChops.difference`, with no threshold, masking, alignment or
resampling. A pixel changes when any RGB channel differs. RGB MAE is the sum
of absolute channel differences divided by three times the compared pixel
count, in 0–255 channel units. Per-site totals pool all shared images; the east
Blue Hole gallery remains a separate capture group. Maximum is the largest
single-channel difference. The older manifest lacks all three Monterey images;
these are missing comparisons, not zero deltas.

| Site / capture group |                Shared images | Changed pixels / compared pixels |  Changed % |  RGB MAE | Max channel |
| -------------------- | ---------------------------: | -------------------------------: | ---------: | -------: | ----------: |
| beebe-vent-field     |                            3 |            2,464,099 / 4,320,000 | 57.039329% | 0.511369 |         161 |
| challenger-deep      |                            3 |            2,321,109 / 4,320,000 | 53.729375% | 0.308325 |         141 |
| endurance            |                            3 |            2,404,265 / 4,320,000 | 55.654282% | 0.417913 |         182 |
| great-blue-hole      |                            3 |            3,252,893 / 4,320,000 | 75.298449% | 1.879038 |         213 |
| great-blue-hole-east |                            2 |            2,243,293 / 2,880,000 | 77.892118% | 2.887417 |         165 |
| lost-city            |                            3 |            1,943,227 / 4,320,000 | 44.982106% | 1.694288 |         149 |
| monterey-canyon      | 0 (three missing previously) |                              N/A |        N/A |      N/A |         N/A |
| titanic              |                            3 |            2,403,911 / 4,320,000 | 55.646088% | 0.316568 |         145 |

**Zero of 20 shared images are pixel-identical.** In total, 17,032,797 of
28,800,000 compared pixels differ (59.141656%). This disproves exact pixel
identity; it does not establish whether the art improved or regressed.

The comparison interval includes deliberate visual changes to Lost City
(`dac89c8`) and Blue Hole (`6813f45`) as well as the S-manifest opening/life
migration (`b83dfaf`). Therefore these sets cannot isolate the migration's
pixel effect. The manifests also show different spawn positions/cameras and
some triangle counts; approach/detail captures can differ even with identical
recorded poses. A fixed life seed does not freeze every animated effect. No
claim of harmless noise, causal attribution to a particular merge, visual
acceptance or pixel equivalence is justified by these metrics.

The latest set predates the current base `3035717`, including subsequent
Titanic palette, Beebe hull/chimney, Endurance framing, Lost City and Blue Hole
visual changes. These old sets do **not** verify pixels on the current merged
build. A current capture and a suitable baseline remain necessary.

The previous Monterey timeout already has a tooling fix: `e76bd93` raised the
CDP fallback bound from 30 to 90 seconds without changing poses; the latest
set has all three Monterey shots. No duplicate fix or further timeout change
is warranted from this evidence.

Detailed per-image metrics, source PNG SHA-256 hashes, pose differences and raw
difference PNGs are retained locally in `.cache/s-render-confirm/pixel-deltas.json`
and `.cache/s-render-confirm/diff/`. Originals were read only.

## Round 2: independent verification and gates

Recomputed all 20 shared changed-pixel counts with direct RGB tuple equality,
and all MAEs with Pillow `ImageStat`; both independently agree with the
histogram/mask calculation to within 1e-12. Checked source history against
both manifest SHAs and the worktree base before interpreting the comparison.

The requested hosted confirmation remains unavailable: `gh run list` exits 1
with `error connecting to api.github.com`; a separate DNS probe returns
`Name or service not known`. No run ID, scheduled-event status, job conclusions
or artifacts could be retrieved. The current workflow is scheduled at
08:23 UTC and supports manual dispatch, but its configuration cannot prove
that the first scheduled run passed. Its current benchmark matrix is five
sites × three supported tiers (15 pairs), with four capability review shards.
Nothing was dispatched, rerun or pushed.

Ran the canonical aggregate gates with the established writable-config mode
and a local npm wrapper selecting Vitest threads/serial files:

```bash
npm() {
  if [[ "${1:-}" == test ]]; then
    command npm "$@" --pool=threads --no-file-parallelism
  else
    command npm "$@"
  fi
}
export -f npm
GATES_CONFIG_MODE=writable PW_PORT=4221 bash tools/gates.sh
```

The aggregate reached unit tests, emitted no test results and was interrupted.
The remaining independent checks were attempted separately; there is no claim
that aggregate gates passed.

| Check                                            | Result                                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Production build and TypeScript (`build` gate)   | PASS, zero TS errors; existing chunk-size warning                                                                            |
| Strict content validation (`content` gate)       | PASS, all 13 sites                                                                                                           |
| Python tooling (`python` gate)                   | FAIL: 166 tests, 162 pass; four provenance tests fail at Node `spawnSync git EPERM`                                          |
| Complete Vitest roster                           | BLOCKED: runner starts but emits no results; single-thread retry also emitted no results and timed out after 30 s (exit 124) |
| Smoke e2e                                        | BLOCKED before tests: preview cannot start; debug log records `connect EPERM` on both IPv4 and IPv6 loopback                 |
| Project-base e2e                                 | BLOCKED by the same socket restriction; not executed                                                                         |
| Attribution                                      | PASS, all 14 asset files attributed                                                                                          |
| Golden tooling capability tests                  | PASS, 23 tests, zero skips                                                                                                   |
| Whole-repository Prettier and `git diff --check` | PASS, repository-wide formatting and whitespace checks                                                                       |

The Python failure reproduces independently with Node's `spawnSync('git',
['rev-parse', 'HEAD'])`: it returns `EPERM` despite Git output and status 0.
A Python loopback bind independently returns `Operation not permitted`.
These restrictions prevent trustworthy hosted/browser/gate confirmation here;
weakening provenance checks, skipping tests or changing art would not resolve
that evidence gap.

Local evidence: `.cache/s-render-confirm/gates.log`, the linked gate logs under
`.cache/gates/`, and `unit-bounded.log`, `e2e-debug.log`, `golden-tests.log` and
`attribution.log` under `.cache/s-render-confirm/`.

## Disposition and simplicity

**S-render remains open.** Hosted nightly success is unverified, exact golden
identity fails for every available shared image, Monterey has no previous
baseline, current merged art is newer than these captures, and the full gates
are not green in this sandbox. Do not mark the DIRECTOR item done on this
report. Recheck the first scheduled run and current-build golden comparison
where GitHub access, subprocesses and loopback previews are permitted.

Only this evidence note changes. No demonstrated new tooling/CI defect needs a
code fix. No source, art, poses, thresholds, assertions, retries, dependencies,
settings, guidance surfaces or layout patches changed. No new runtime machinery
or package-specific tests were introduced; all DIRECTOR simplicity contracts
are preserved by scope.
