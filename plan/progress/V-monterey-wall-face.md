# V-monterey-wall-face

Changed (data only, two values):

- `data/landmarks/monterey-canyon/pois.json`: `monterey-canyon-wall` lon -122.0133 to -122.0113 (about 180 m east, onto the pale `canyon-wall-east` face; still on the north wall, snapped to the seabed).
- `data/landmarks/monterey-canyon/site.json`: `opening.mission.yawOffset` 0 to -10.

No shared code changed. The generic scarp displacement fade was not built: the stripes that remain are on the right-hand rock and the far left, and a fade would need a camera-aware mesh (see V-monterey-striation); not worth the added code for this package.

Net simplicity: no new options, code or tests; two data values.

Screenshots (`.cache/codex/shots/V-monterey-wall-face/`): `before.png`, `after.png`; `try1.png` (lon -122.0120, yaw 0), `try3.png` (-122.0116, yaw -5, worse: large striped wall on the right).

Honest rating of the opening: about 4.0 (was 3.8). One pale wall face now sits centre of the frame with a clean crest and the sub in front, and the left is calmer. Remaining gap: the marker is at the wall foot beside the sub, not on the face; the right third is still striped dark rock; the face is centre, not centre-right.

Gates: see the final report line below.
