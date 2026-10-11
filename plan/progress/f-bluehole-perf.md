# f-bluehole-perf

Root cause of the `f-bughunt-1090` great-blue-hole "real 60 s idle" failure (30 frames in 60 s): not rendering.
Rendering is fine (60 draw calls, 205k triangles, ~60 fps at Low; titanic 46 calls / 87k tris). The spec's
per-second hull check calls `Terrain.sampleHeight` ~47k times (sub mesh vertices), and on Blue Hole each call
costs ~43 us (3 x `surfaceHeight`: cubic reconstruction + analytic carve + slope via 4 carved samples + relief
noise), about 2 s per check versus 0.25 us on titanic (no detail/carve fast path). The same cost hit physics,
camera and prop sampling in game.

Fix: `Terrain.latticeHeight` memoises `surfaceHeight` at the near-mesh lattice corners that `sampleHeight`
interpolates (pure function, exact same values, bounded 400k entries). `sampleHeight` 43 us -> 1.3 us on the
benchmark. Spec: desktop and portrait great-blue-hole pass (frames well above 30). No visual change.

Known gap: uncached `surfaceHeight` (mesh build, getNormal) is still ~13 us; hoisting the repeated gallery-mouth
atan2 work in the carve would be a further ~30% if ever needed.
