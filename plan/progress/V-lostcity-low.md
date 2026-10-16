# V-lostcity-low

## What changed

- `terrain.frag.glsl`: the far mip bias now reaches +5 levels by 25 m (was +3 by 40 m). One constant and one smoothstep end; no new settings, branches or fetches.

## Cause

The gravel-scale carbonate albedo aliased into a regular ripple/honeycomb on the mid-distance slope. Low has no normal maps and a coarse mesh, so nothing hides the aliasing; High does. Enabling the second (breakup) albedo sample on Low was tried first and did not change it, so it was not kept (it would add a fetch on phones). Bias 4 over 30 m left a faint remnant; 5 over 25 m reads clean.

## Screenshots (`.cache/codex/shots/V-lostcity-low/`)

`before/` and `after/`: `low-1..3.png`, `high-1..3.png` (golden poses, Lost City, desktop). Low after is clean; High keeps its far detail and is not darker.

## Simplicity rules

Net zero code (two numbers and a comment). Re-baselined, intended: `beebeIsolation` snapshot (shader digest only). No assertions changed.

## Remaining

- Low is still brighter and flatter than High (no normals, no scatter); that is a tier difference, not this artifact.
- Other sites share the bias, so their far terrain is slightly softer; not re-captured here.
