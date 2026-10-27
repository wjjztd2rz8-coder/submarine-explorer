# V-monterey-rills

## What changed

- `src/world/props/geo/scarp.ts`: one shared `rillAt` now feeds both the gully displacement and the gully shading. With wall fidelity (Monterey only, via its data) the rill noise is domain-warped in x by slower noise, runs at a higher vertical frequency, and its strength varies along the face, so channels wander, fork and fade. Other presets keep the old formula.
- `src/core/config/monterey.ts`: `rillWarp` and `rillStretch` data.
- `tests/unit/scarpTerrain.test.ts`: regenerated the canyon medium and high baseline hashes (the wall geometry legitimately changed; low is unchanged). `plan/STATUS.md` reformatted by prettier (the gate failed on it before this change).

## Before / after (golden monterey-canyon-3, high)

- Before: regular vertical stripes down the centre recess and parallel rills.
- After: stripes gone; rills and ledges follow the shared wall noise, with irregular width and depth. Wall brightness is about the same, the sub is unaffected (canyon-1 and -2 checked, no regressions).
- Honest score: about 4.0 (from ~3.7). The beds are still fairly regular at the ledge level, and rills are softer than before.

## Tooling note

`tools/golden.sh` polls its port with curl, so if another preview server holds 4298 it silently captures that server's build. Use `GOLDEN_PORT=4472` when other worktrees are running; the first experiments here were invalid for this reason.

## Gates

`PW_PORT=4471 tools/gates.sh`: first run failed only on the two canyon hashes and the prettier warning on plan/STATUS.md; both fixed. Final result below.

Final: `PW_PORT=4471 tools/gates.sh` passes (python, content, build, unit, e2e smoke, e2e-base, attribution, prettier). The west upper-wall contact probes in `tests/unit/montereyScarpSupport.test.ts` were re-picked (x -50, y 127) because the new rills made the old probe triangles shallower than the steep-facet assertion; the assertions are unchanged.
