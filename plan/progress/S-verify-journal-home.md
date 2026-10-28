# 91 S-verify-journal-home

Verification of merged `a0f91900` (Journal unavailable catalogue) and `f8c4daf2`
(T-pin-fragility) at `3d93749b`. Two audit rounds; initially clean checkout.

## Round 1: mutation checks

Temporary mutations run the existing tests, with byte-for-byte restoration in
`finally` after each run. No permanent source, data, or test changes.

| Temporary break                                                | Existing tests exercised                                         | Result                                                                     |
| -------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Journal never sets its completion flag                         | All eight unavailable-catalogue unit cases                       | Eight assertion failures: loading text remains after settlement            |
| Journal starts marked loaded                                   | The same eight cases                                             | Eight assertion failures: empty text appears while fetch is pending        |
| Duplicate a prop in each indexed site and `_test`              | New raw validation guard plus existing static prop budget census | 33 assertion failures: 14 declaration guards and 19 site/tier budget cases |
| Append an invalid secret to every shipped site                 | Existing actual-terrain curiosity table                          | All 13 cases fail raw-versus-parsed secret totals                          |
| Append an invalid sample to every shipped site                 | The same table                                                   | All 13 cases fail raw-versus-parsed sample totals                          |
| Append a valid prop with a unique ID to every site and `_test` | Raw validation guard                                             | All 14 pass with the increased totals                                      |
| Append a valid Kama prop                                       | Existing Kama static budget case                                 | Passes with six declared props rather than five                            |

Commands use `npx vitest run --configLoader runner --cache=false --pool=threads
--maxWorkers=1 <specs> -t '<test name>'`. Exact commands and outcomes are in
`.cache/s-verify-journal-home/mutations.json`; individual logs and the temporary
restoring harness are in that directory. Each negative result was inspected for
the intended assertion failures, rather than accepting an arbitrary nonzero exit.

## Round 2: coverage audit and restored validation

Searched `tests/unit`, `tests/e2e`, and tooling tests for the empty/loading copy,
catalogue failure handling, raw content helpers, declaration guards, prop counts,
and curiosity counts. The new Journal unit table is the only lifecycle coverage
that defers the real catalogue fetch and checks both pending and settled states,
including offline rejection, both layouts, reopening, Close, and focus. Browser
cases additionally exercise routed HTTP/malformed JSON, real Home activation,
Escape, and discovery-save preservation. Existing empty discovery-save coverage
uses a populated catalogue and does not reproduce this failure.

The prop declaration guard overlaps the static census's count/ID checks
deliberately, but additionally checks warnings, declaration order, and `_test`
without building geometry. Generic parser tests use synthetic documents rather
than every shipped declaration. Existing budget assertions were strengthened
in place; no parallel budget spec was added. Curiosity placement coverage was
updated in place, and the e2e table now includes Monterey via the index. No
redundant test or trivial implementation gap found; no new test file needed.

Restored focused run: **141 tests pass in four files** (`journalGroups`,
`props-loader`, `perf-budget`, `exploreTerrain`; 73.67 s). This includes all eight
Journal cases, all 14 new prop guards, every static site/tier census, and every
actual-terrain curiosity case. Additional isolated restored runs passed Journal
(37), props (66), and curiosity (14). Initial broad runner attempts were
interrupted before completion; the successful focused run used one thread worker.

## Browser checks

After searching the capability specs with `rg`, ran the following with
`GATES_CONFIG_MODE=writable PW_PORT=4292
PW_OUTDIR=.cache/s-verify-journal-home/dist PW_REUSE_SERVER=0`:

```sh
npx playwright test tests/e2e/journal-debrief.spec.ts -g 'unavailable Home Journal catalogue'
npx playwright test tests/e2e/props.spec.ts -g 'loads the fixture props, lights them, and logs no errors'
npx playwright test tests/e2e/f2-explore.spec.ts -g 'curiosity content loads and sits on the seabed'
npx playwright test tests/e2e/f-perf-budget.spec.ts -g 'kamaehuakanaloa opening stays within the Low-tier frame geometry budget'
npx playwright test tests/e2e/f2-progress.spec.ts -g 'all downloaded missions stay open in Realistic'
npx playwright test tests/e2e/d-photo.spec.ts -g 'a full phone gallery keeps photo order'
npx playwright test tests/e2e/f-arcade-access.spec.ts -g 'Arcade opens every card on a phone'
npx playwright test tests/e2e/f-verify-1000.spec.ts -g '1000 Journal site count excludes nested About the site entries'
npx playwright test tests/e2e/mission.spec.ts -g 'briefing freezes the game; Enter starts near the site with objectives'
```

All exited 1 before executing any test body: the configured preview server could
not start. Direct preview diagnosis reports `listen EPERM: operation not permitted
127.0.0.1:4293`. `--list` discovers all six Journal regressions. Consequently,
**browser pass/fail mutation sensitivity remains unverified**, including those
six new tests. Startup errors are not counted as successful mutation checks.
The passing unit mutation controls do not establish native browser, layout, or
touch acceptance. Logs: `.cache/s-verify-journal-home/e2e-*.log`,
`browser-discovery.log`, and `preview-diagnostic.log`.

## Gates

Invoked the requested entrypoint on restored content:

```sh
GATES_CONFIG_MODE=writable PW_PORT=4291 \
  PW_OUTDIR=.cache/s-verify-journal-home/dist bash tools/gates.sh
```

Final gate results are being collected.
