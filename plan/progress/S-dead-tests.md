# S-dead-tests — DIRECTOR S-dead, item 92

Test-only cleanup after T-kama-pins and T-pin-fragility; no game behavior changes.

- Removed the permanently skipped wall-relief prop case in `f-bughunt-880.spec.ts`,
  its JSON import and unused diagnostic field. The prop is absent from all content.
- Removed the unreachable conditional ray assertion for that prop in
  `f30Regression.test.ts` and one duplicate CI skip in `f-bughunt-1090.spec.ts`.
- Kept the existing Blue Hole opening/scan/reload browser matrix, terrain sightline
  assertions and `blueHoleWall.test.ts` coverage of the replacement terrain relief.
- Audited shared helper exports, fixture references, snapshot owners and skip sites.
  No clearly unreferenced helper or snapshot file remained. Kama pose snapshots
  were already removed by T-kama-pins; browser/runtime checks remain distinct from
  parser and static budget tests. Opt-in render, CI and deployment-base skips stay.
- Second import/reference pass found no further safe removals. All 11 snapshot
  files have owners; no snapshot was regenerated or active assertion weakened.

Validation: focused unit run passed **34 tests / 2 files**; Playwright discovery
passed **42 tests / 2 files**. Build and strict content gates passed; unit gate pending.
Five Python tooling failures match the prior tasks (git subprocess EPERM and golden JSON).
Focused browser attempts below stopped at preview startup; debug logs show local
socket EPERM, so no browser assertions or screenshots were verified.

```sh
npx playwright test tests/e2e/f-bughunt-880.spec.ts -g '^great-blue-hole low: render opening, scan, reload twice and read authored Journal$'
npx playwright test tests/e2e/f-bughunt-1090.spec.ts -g '1090 desktop great-blue-hole: Low opening and real 60 s idle render without clipping or errors'
```

Commands used `GATES_CONFIG_MODE=writable`, `PW_OUTDIR=dist-S-dead-tests`, ports
4293/4294; gates use 4292. Logs: `.cache/S-dead-tests-*.log`. Net: pending final count.
