# P2-sub-screen-portrait progress

Phone feedback: on 390x844 the "Your sub" screen needed a scroll to reach decal and photo frame.

## What moved

- `src/styles/sub-screen.css`: the existing portrait media block now tightens the panel (padding 10x12, max-height 98vh), sets the preview row to 170px (was 200px), shrinks swatch padding, dots (22px) and group headings, and drops the inner scroll on the side column. Swatches stay >=44px tall in wrapped rows.
- No new controls, settings, markup or `hud-layout.css` rules. Landscape and desktop rules untouched.

## Tests

- `tests/e2e/f2-progress.spec.ts` (existing Your-sub test): at 390x844 asserts the four slot groups and the preview stage are fully inside the viewport without scrolling. Screenshot path moved to `P2-sub-screen-portrait`.
- Ran `f2-progress.spec.ts -g "Your sub"` directly: 4/4 pass. `tools/gates.sh` passes everything except prettier, which flags only `plan/OVERNIGHT-LOG.md`, `plan/PROCESS-LOG.md`, `plan/STATUS.md` (untouched here). The `--full-e2e` run exceeded the time limit and was killed, so it was not completed.

## Screenshots

`.cache/codex/shots/P2-sub-screen-portrait/sub-{1280x720,390x844,844x390}.png`, all viewed. Portrait: preview plus all four groups and the note fit with room to spare; desktop unchanged; landscape still scrolls inside the side column (as before, not in scope).

## Self-rating

8/10. Portrait fit achieved with CSS-only tightening. Caveats: fit was checked at 844 tall only (shorter phones such as 375x667 would still scroll); full e2e suite not completed.
