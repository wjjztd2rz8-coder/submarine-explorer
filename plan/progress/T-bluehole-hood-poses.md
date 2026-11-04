# T-bluehole-hood-poses

2026-11-04 — numeric companion to V-bluehole-opening-hood. **Three physically
clear review poses found; the intended hood-fills-the-top-30% composition is
still unresolved.** Prefer **B** for Claude's first visual check: its minimum
hull clearance is 5.87 m. A wins on worst-layout upper-third coverage but leaves
only 0.87 m above terrain. No site poses, geometry, materials or scan/collision
rules changed.

## Candidate table

D = 1600×900, P = 390×844. Percentages are **fractions of the whole screen**,
not fractions of a bounding rectangle or counts of mesh vertices. Projection
is the union of the existing east hood's `grotto-overhang` and
`stalactite-gallery` triangles. “Visible” additionally depth-tests terrain,
other solid props and the actual submarine; it excludes lighting, fog and HUD.
The table uses High geometry. The clearance column takes the minimum across
Low, Medium and High.

| Candidate                      | Projected hood D / P | Visible hood D / P | Visible hood in top third D / P | Share of visible hood in top third D / P | Min hull clearance  |
| ------------------------------ | -------------------- | ------------------ | ------------------------------- | ---------------------------------------- | ------------------- |
| A — most upper-third coverage  | 6.415% / 5.695%      | 2.351% / 2.359%    | 2.351% / 2.359%                 | 100% / 100%                              | **0.870 m**, High   |
| B — preferred clearance margin | 6.603% / 5.489%      | 2.819% / 2.381%    | 2.819% / 2.122%                 | 100% / 89.1%                             | **5.870 m**, High   |
| C — alternate bearing          | 6.656% / 5.600%      | 2.772% / 2.410%    | 2.772% / 2.123%                 | 100% / 88.1%                             | **4.541 m**, Medium |

Ranked by the minimum visible upper-third screen fraction over both layouts
and all tiers, from the measured shortlist. Low visible D/P fractions are
A 2.426/2.347%, B 2.840/2.378%, C 2.780/2.391%; Medium is
A 2.439/2.397%, B 2.886/2.428%, C 2.827/2.446%.

All three keep the full visible hull inside both viewports, the physical
spawn sphere outside prop keepouts, and the chase arm clear of props. The
minimum camera-arm terrain gap over every candidate/tier/layout is 24.28 m,
against the existing 6 m requirement. Hull clearance here means the lesser
of the existing full-hull-vertex terrain metric and a conservative enclosing
visible-hull-sphere gap to **all** prop colliders, including apron surfaces.
Terrain is the limiting surface; the enclosing sphere has at least 32.38 m
clearance to props for A/B and 33.30 m for C. This is sampled geometry evidence,
not a browser or visual acceptance result.

## Reproduce the poses

All use `tools/blue-hole-poses.json`'s existing east local target `[0, 6.2, -9]`,
transformed by `karst-grotto-east`. The new `hoodCandidates` rows are unused
review fixtures; the existing golden approach/detail data is unchanged.

Sub position is target plus `[sin(bearing) * range, 0, -cos(bearing) * range]`,
then Y is replaced by `hero.root.position.y + altitude`. Yaw points at the
transformed target; submarine pitch/roll are zero. Use chase mode with radius
35, offset X 0, offset Y −50 for **both** layouts, through `CameraRig` (including
its normal portrait FOV). There is no free-look or FOV override.

| Candidate | Bearing / range / altitude | High sub XYZ (m)          | High camera XYZ (m), both layouts | Sub yaw |
| --------- | -------------------------- | ------------------------- | --------------------------------- | ------- |
| A         | 327° / 55 m / −55 m        | −109.393, −92.881, 31.768 | −128.288, −97.507, 2.672          | 147°    |
| B         | 327° / 55 m / −50 m        | −109.393, −87.881, 31.768 | −128.288, −92.507, 2.672          | 147°    |
| C         | 334.5° / 55 m / −50 m      | −103.116, −87.881, 28.252 | −118.051, −92.507, −3.061         | 154.5°  |

Low/Medium prop seating is 0.258 m higher than High, so use the relative
parameters rather than copying High's absolute Y. The cameras are below the
90 m halocline, and A's sub is too; Claude must judge the resulting atmosphere.
These are review poses, not accepted mission-composer outputs.

## Search and blockers

Two deterministic rounds: a 15° full-bearing sweep around the existing east
direction, ranges 25/35/45/55/70/90/110 m and eight altitudes, then ±7.5°,
±5 m range/altitude refinement around three distinct promising sub positions.
Camera search covers radii 35/46/60/80, X offsets −35/0/35 and Y offsets
−140/−110/−90/−70/−50. **1,425 sub-pose trials, 292 hull-clear trials** (including
repeat refinement positions). Coarse projection and conservative hull bounds
select twelve distinct sub positions, each with its best coarse camera;
full-resolution triangle/depth coverage then ranks them. This is a bounded
search, not proof that no other pose can work.

The hull-safe route check is **not the only blocker**, so no relaxation flag
was added and no safety assertions were weakened:

- The shipped mission and free dive face **the western `karst-grotto`**.
  `site.json` marks only `karst-grotto-east` as the hood. The current east hood
  projects to 0% in both shipped opening cameras. Changing route clearance
  alone cannot change their subject or heading.
- A/B/C are respectively **84.39 / 81.22 / 81.16 m from the eastern scan
  contact**, inside Arcade's existing **100 m resolved scan floor**. They are
  approximately 225.52 / 224.15 / 228.67 m from the first, western mission
  objective on High, and closer to the second objective. A new mission pose
  would also need a deliberate objective/approach decision; these cannot
  replace the current 125 m first-primary approach as-is.
- All three fail the current horizontal route sampling toward either gallery,
  despite safe initial hulls and arms. The audit retains the current 12 m
  route keepout and 32.5 m mission scan-cap endpoint. These are route checks,
  not piloted three-dimensional routes. They do not establish that a safe
  ascent/approach is impossible.
- Even before occlusion, the shortlisted hood covers only about **5–7%** of
  the frame. Terrain reduces its visible coverage to **2–3%**. Moving it into
  the top third is possible; making it fill roughly 30% has not been achieved.
  A bypass of the route check would leave this geometry/framing gap intact.

The next visual decision remains with V-bluehole-opening-hood, as DIRECTOR.md
already specifies. The table gives a reproducible starting point and the
clearance/coverage tradeoff; it does not approve a new opening.

## Validation and simplicity

- `node tools/blue-hole-pose-search.mjs --verify .cache/hood-poses/verified.json`:
  **passes**, three candidates × three tiers × two layouts. Complete measurements
  are retained in [T-bluehole-hood-poses.json](T-bluehole-hood-poses.json).
- `node tools/tests/pose-projection.test.mjs`: **5 passed**. Covers triangle
  union, upper-third orientation, depth occlusion, clipping, sidedness, and
  perspective/instancing agreement with independent Three raycasts.
- `npx vitest run --configLoader runner tests/unit/lowTierFollowups.test.ts -t 'saved hood candidates'`:
  **3 passed**, 13 unrelated tests skipped. Existing capability spec now protects
  all saved candidate hull vertices, enclosing hull spheres, viewport bounds
  and chase arms on every tier. The runner loader avoids writing Vite's config
  bundle into this sandbox's read-only shared `node_modules`.
- `npm run typecheck`: **passed**. Production build to `dist-hood-poses` using
  the existing writable-config bundle workaround: **passed**.
- Searched `tests/e2e` for the affected opening/east-gallery capabilities and
  attempted both commands below. **No browser tests executed**: Playwright's
  web server could not start; debug output reports `connect EPERM` to both
  `::1:4193` and `127.0.0.1:4193`. Browser screenshots, HUD overlap and atmosphere
  acceptance remain unverified.

```sh
PW_PORT=4193 PW_OUTDIR=dist-hood-poses GATES_CONFIG_MODE=writable \
  npx playwright test tests/e2e/opening-framing.spec.ts \
  -g 'great-blue-hole.*(mission previews and opens on an approach outside scan range|sub and HUD remain fully visible after 3 s|underwater free-dive opening)'
PW_PORT=4193 PW_OUTDIR=dist-hood-poses GATES_CONFIG_MODE=writable \
  npx playwright test tests/e2e/f-lowtier-followups.spec.ts \
  -g 'Blue Hole east gallery owns its scan card at both authored poses'
```

One offline CPU search reuses `Terrain`, `Props`, `CameraRig`, the existing hull
helper and east pose data. Its small projection helper has independent numerical
tests. No runtime code, site branch, setting, UI surface, visual/material tuning,
scan gate or collision relaxation was introduced. Candidate data stays beside
the existing pose tooling; tests extend an existing capability spec.
