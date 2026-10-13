# 1495 — Blue Hole apron collision clearance

Status: implementation and two review rounds complete; all final non-browser gates pass. Full E2E and browser navigation acceptance remain blocked by this workspace's server/browser restrictions. No assertion tolerance, timeout or skip was loosened.

## Scope

Resolve the open 1360 finding after 1410: the 8 m hull sphere must clear the actual rendered apron triangles after `Props.collide`, preserving gallery navigation, geometry and camera framing.

## Round 1 — Exact apron support

- Strengthened the existing actual-GMRT Low/Ultra audit with an assertion that **zero** resolved spheres intersect any apron triangle, retaining its 0.0001 m tolerance. It fails on the old code: west-gallery overlaps are **34 on Low and 614 on Ultra** on the current post-1410 mesh. These differ from 1360's historical 37/228 because subsequent terrace sampling changed.
- The stalactite builder now supplies the existing apron mesh as a collision surface. Shared prop placement caches its transformed triangles and horizontal 8 m bins, refreshing them on placement/rebuild and removing them with `collision: none`.
- Surface collision computes the minimum vertical support for the entire sphere against triangle faces, edges and vertices. It runs after the original volumes, catching terrace contacts reached by a box's lateral push. Triangle normals for collision come from positions, independently of the apron lighting normals and per-pixel bed shading.
- No rendered vertex, material, instance matrix, bounds, box envelope, authored pose or tier budget changes. One CPU surface collider is added per gallery, with no render draw or triangle cost. Other builders register no surface.
- Initial focused run: **57 tests pass**. Unit cases additionally cover slope tangency, edge/corner-only contacts, open water within the broad-phase bounds, deep penetration, fractional stiffness, and unequal scales/heading/translation.

## Round 2 — Roof clearance and navigation

- An independent check against the original box/sphere volumes exposed a second interaction: a vertical apron lift could enter an overhead box. Added a bounded search through four consistent side directions, selecting the nearest clearing candidate and rechecking floor support after each move. Keeping the direction consistent across adjoining boxes avoids oscillation between their shared edges. This activates only for a remaining volume overlap after floor resolution; existing clear poses remain unchanged.
- Added a floor/roof pinch regression with adjoining boxes, plus strict volume-clearance and second-call stability assertions for every actual-terrain probe. No collision boxes were enlarged or removed.
- Increased apron sampling density from approximately 80 to 160 sites per gallery to exercise enough existing navigable poses. The original open-water coverage assertion remains intact.
- Actual-GMRT audit independently compares each resolved sphere with **every rendered triangle** and every original collision volume. It does not reuse the surface solver or its spatial bins to establish clearance.

| Tier   | West/east contact probes | West/east unchanged clear poses | Residual apron/volume overlaps |
| ------ | ------------------------ | ------------------------------- | ------------------------------ |
| Low    | 507 / 555                | 11 / 28                         | 0 / 0                          |
| Medium | 492 / 486                | 12 / 28                         | 0 / 0                          |
| High   | 483 / 492                | 13 / 21                         | 0 / 0                          |
| Ultra  | 483 / 486                | 12 / 22                         | 0 / 0                          |

Across **3,984** contacts at shallow, 2.5 m and deep penetration, minimum measured clearance is 7.9999999936 m (floating-point error below 0.000000007 m). Maximum residual volume penetration is below 0.00000000000003 m. **147** already clear spheres retain their exact positions; every resolved contact is stable on a second call within the unchanged 0.0001 m clearance tolerance. Placement/rebuild tests also exercise heading, height and unequal-scale changes and removal of all colliders for `collision: none`.

The strengthened 1360 audit also passes its original Low/Ultra probes for both galleries with zero missed contacts and zero residual apron overlaps. Rock-seating, gallery bounds/finish/budgets, and unrelated prop collision tests retain their existing assertions.

The original audit now checks 103/70 west/east contacts on Low and 1,973/1,405 on Ultra, all clear. Together with the new four-tier probes, this verifies **7,535** resolved apron contacts.

The Beebe isolation suite pins the entire shared `Props.ts` source. Its exact hash was refreshed solely for the intended surface-registration/cache additions; the exact-hash assertion remains in place. Its geometry, biome, shader and spawn snapshots were unchanged.

## Verification

- Old-code failing regression: `.cache/1495/regression-before.log`.
- Final focused suite: **8 files / 106 tests pass**, `.cache/1495/round2-final.log`.
- Four-tier clearance evidence: `.cache/1495/clearance.json`; additional before/after volume diagnostics: `.cache/1495/volume-interactions.json`.
- Original 1360 probe evidence: `.cache/1360/geometry.json`.
- CPU-only collision timing under concurrent full-suite load: median 0.015–0.044 ms on Low and 0.163–0.496 ms on Ultra; Ultra p95 2.36–3.58 ms, maximum 27.49 ms for the sampled deep/pinch contacts. `.cache/1495/cpu-timings.json`. These are headless query measurements, not browser frame-time acceptance.
- Initial full gates: production build, Python, strict content, attribution and formatting pass; **1,961 unit tests pass**, with only the exact shared-source hash failing before its authorized baseline refresh. Full E2E and project-base E2E cannot start their preview server.
- Final full gates: **193 files / 1,963 unit tests pass** in 308.16 s. Production build (including TypeScript), Python, strict content, attribution and formatting all pass. Full E2E and project-base E2E were attempted and are **blocked before tests** because their preview server cannot start; the separate preview probe confirms `listen EPERM`. Logs: `.cache/1495/gates-final.log` and `.cache/runs/20261013-003114-27/`. Invocation: `GATES_CONFIG_MODE=writable PW_PORT=4495 PW_OUTDIR=dist-1495 tools/gates.sh --full-e2e`.

## Browser acceptance limitation

The Browser skill bootstrap succeeds, but selecting a browser reports `No browser is available` and its browser list is empty. Standalone Playwright Chromium exits with `sandbox_host_linux.cc:41`, `shutdown: Operation not permitted`; `.cache/1495/browser-launch.log`. Preview cannot bind localhost (`listen EPERM`); `.cache/1495/preview-blocked.log`. No fresh captures or interactive movement verdict are claimed.

In an environment permitting Vite and Chromium, run the full E2E suite and move an 8 m hull slowly across both galleries' treads/risers and wall/roof pinches at Low/Ultra, including 390×844 and 844×390. Retain the authored approach/detail poses from `tools/golden-shots.mjs` and `tools/blue-hole-poses.json`. Check smooth movement and physical apron/roof clearance; camera framing and visible apron geometry are unchanged by this task.
