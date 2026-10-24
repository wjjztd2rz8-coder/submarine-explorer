# 3830 — rooted life members respect band at final position

Follow-up to the reproduced rooted-depth defect in
`plan/progress/3800-S-bughunt-spawn-determinism.md` (DIRECTOR Backlog 9).

## Change

- `src/world/life/LifeSim.ts` `placePatch`: the entry band is read once. Each
  rooted member's ground is sampled once at its final `(px,pz)`; the member is
  skipped unless `inBand(-gy, band, 6)` passes, and the same sampled height is
  passed to `addAgent`. Tolerance, hashing, budgets and ground seating are
  unchanged.
- `tests/unit/lifeSim.test.ts`: the rooted-depth case gains the sloped fixture
  (`groundAt: -984.4 - 1.2*x`, lost-city table, high tier, seed 1, player at
  x=13, y=-980) and asserts every cold-water-coral is within band +/- 6 m.

## Evidence

- New case fails on the unfixed source (`1008.58 expected <= 1006`, at the
  note's coordinates) and passes with the fix.
- `npx vitest run tests/unit/lifeSim.test.ts tests/unit/lifeTables.test.ts`:
  2 files, 41 tests passed.
- `PW_PORT=4830 tools/gates.sh`: all gates PASS (python, content, build, unit,
  e2e, e2e-base, attribution, prettier). No scatter or life snapshots changed,
  so none were rebaselined.

## Not claimed

No shipped GMRT site is shown to spawn coral out of habitat; actual-site
occurrence remains unproven, as stated in the 3800 note.
