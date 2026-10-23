# R-ci-green: globe pin touch target

Item: **R-ci-green**. Brief: **3270-R-ci-green-globe-pin-44**.

## Evidence and change

The reported 390×844 unaided Titanic and Blue Hole journeys measured a mission
pin at about 43.99998 px against the existing 44 px minimum. `Globe.placePins`
rounded projected pin positions and cluster centres to tenths of a CSS pixel,
then translated each padded button by that fractional position. The button's
CSS size was already 44 px; the fractional transform introduced rounding into
its rendered bounding box.

Round both pin positions and counted cluster centres to whole CSS pixels in
the existing layout. Each coordinate moves by at most 0.5 CSS px from the old
placement. Dot sizes, colours, hover styles, hit-area sizes and centring remain
the same. Clustering still uses the original projected coordinates.

Strengthened the existing globe touch capability check to measure rendered
bounding boxes for both playable pins and visible clusters directly, replacing
the computed-style/transform workaround. The two strict 44 px assertions in
the unaided journey remain untouched. Net simpler: fewer arithmetic operations
and a shorter capability check; no new helper, branch, setting or UI.

## Validation

- Root and project-base builds, typecheck, content validation, attribution and
  repository-wide formatting pass. The existing globe unit capability passes
  in **both rounds: 23 tests each**.
- Playwright discovers **18 executions** for two rounds of all globe-pin cases
  and both 390×844 unaided journeys, with zero retries. Execution cannot start:
  the sandbox denies the preview listener (`listen EPERM 127.0.0.1:4187`). A
  direct Chromium launch also aborts with `sandbox_host_linux.cc:41`,
  `shutdown: Operation not permitted`. Thus neither local reproduction of the
  reported DOMRect nor post-fix browser measurements/screenshots are claimed.
- Full gates requested through `tools/gates.sh --full-e2e` with
  `GATES_CONFIG_MODE=writable`, isolated build output and port 4187. The default
  unit worker pool produced no results and was interrupted. The final run uses
  the same full unit roster with one thread worker and serial files, without
  changing repository configuration or test selection.
- Python gate: **167 tests, five failures**. Four build-manifest tests encounter
  `spawnSync git EPERM`; the golden-tooling subprocess test receives empty JSON.
  These failures are outside the changed pin layout/test files.

Final aggregate gate: **FAIL**. The full unit run timed out after 240 seconds
without producing test results, even with one thread worker. Root and
project-base browser gates both failed before tests could run because the
preview server could not start. Python failures are listed above; build,
content, attribution and Prettier gates pass. Logs:
`.cache/runs/20261022-223407-2-FxGKoW/`.

Full gate invocation (the shell wrapper only bounds the stalled unit runner
and selects its worker mode):

```bash
npm() {
  if [[ "${1:-}" == test ]]; then
    timeout 240s npm "$@" --pool=threads --maxWorkers=1 --no-file-parallelism
  else
    command npm "$@"
  fi
}
export -f npm
GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/pin-final-dist PW_PORT=4187 \
  bash tools/gates.sh --full-e2e
```

No merge, push or tag performed; `plan/DIRECTOR.md` and `tools/` are unchanged.
