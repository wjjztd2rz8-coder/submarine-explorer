# U-label-clip: landmark labels clipped at the screen edge

## Cause

The teal tag in the Hunga Tonga caldera shot is a landmark label
(`src/world/Landmarks.ts`, a `sizeAttenuation: false` sprite anchored at the
landmark's projected point). Nothing checked the viewport, so a tag near the
left edge was cut off mid-word.

## What changed

- `labelFitsViewport()` (new, exported): true only when the whole label box,
  using the sprite's `center`, lies inside the viewport.
- `updatePart()`: the label opacity is multiplied by 1 when it fits and 0 when
  it would be clipped (also hidden when the anchor is outside the depth range).
  Partial labels are dropped rather than repositioned; no per-site or
  per-layout offsets.
- `update()` and the render hooks now pass a `{ width, height }` viewport
  instead of a height only, so the fit can use both axes.
- Unit test in `tests/unit/Landmarks.test.ts` covers the edge and top
  thresholds of the fit check.

No text was cut, so no CHANGELOG line.

## How verified

- `npx tsc --noEmit`, `vitest run tests/unit/Landmarks.test.ts` (17 passed).
- `PW_PORT=4871 tools/gates.sh`: python, content, build, unit, e2e, e2e-base,
  attribution, prettier all PASS (e2e=smoke).
- Not re-shot in game; the golden caldera screenshot was not regenerated.

## Known gaps

- A label that is clipped disappears instead of sliding inside the edge. The
  dot still marks the landmark.
