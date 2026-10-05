# F-BLUEHOLE-GROTTO-690 — east grotto close view

Implemented 2026-10-05. The orchestrator's full gates outside this sandbox
passed build, unit, Python, content, attribution, full e2e and project-base e2e.
Its only failure was formatting in two planning logs, corrected in this
follow-up without changing assertions. Reviewed the orchestrator's available
east close and opening visual-QA PNGs in this follow-up. The east shot shows
the continuous lip, varied pendants, shaded roof and apron context. A golden
before/after comparison remains pending; this workspace still forbids localhost
listeners and Chromium's sandbox-host operation.

## Changes

- Retain the existing Blue Hole stalactite builder and its limestone banding.
  For `karst-grotto-east`, give the scalloped shelf a continuous projection and
  thicker lip. Wall geometry and compound collision share the changed profile.
- Spread clusters across the central mouth, alternating lip, middle and rear
  rows. Main pendants are longer than their companions. Their attachment points
  follow the wall's tapered/displaced underside; lengths stop above the sampled
  floor. Low retains five clusters, High ten, in one merged gallery mesh.
- Apply faint cool scattered opening light to the east wall, gallery and apron.
  The existing vertex-colour glow keeps the strata and underside shading, with
  a local-depth falloff from the lip toward the back wall. No extra light,
  transparency pass or draw call is introduced.
- `tools/blue-hole-poses.json` supplies the authored east approach and close
  pose to `tools/golden-shots.mjs` and `tests/e2e/visual-qa.spec.ts`. Aim at local
  `[0, 6.2, -9]` inside the mouth, rather than the bounds centre above it. Approach:
  55 m, 5 m above the prop origin. Close: 42 m, 6.5 m above the origin, 8 m to
  the side, accounting for the cockpit's 12 m forward / 4 m upward offset.
- Accept `GOLDEN_SITES=blue-hole` as the requested alias for both west and east
  grotto captures. The west pose and western geometry/material tuning remain
  unchanged. No HUD, camera default, opening spawn or terrain changes.
- Journal text states that stalactites formed in air-filled caves during glacial
  sea-level lows and now lie roughly 40–50 m deep. The east prop note preserves
  the distinction between that fact and the game's plausible placement.

## Before / after evidence

1. Before geometry edits, attempted exactly
   `GOLDEN_SITES=blue-hole tools/golden.sh` after adding the selector alias.
   It failed during Vite's default config loading because the linked
   `node_modules/.vite-temp` is read-only. Original log retained at
   `.cache/golden-690-before-build.log`.
2. A local native config bundle allowed the baseline production build to pass.
   Retained baseline build: `dist-bluehole-690-before/`. A direct Chromium
   launch then failed with `sandbox_host_linux.cc:41`, `shutdown: Operation not
permitted`. Thus **before PNGs are missing**.
3. A golden capture attempt using the new pose recorded the Chromium failure in
   `.cache/golden/2026-10-05-062412/poses.json` (`complete: false`, `captures: []`),
   with an error-only contact sheet at
   `.cache/golden/2026-10-05-062412/index.html` and log
   `.cache/golden-690-browser.log`. These are failure records, not visual evidence.
4. Retried `GOLDEN_SITES=blue-hole tools/golden.sh` with shell-local npm/npx
   wrappers supplying `.cache/vite-690.config.mjs --configLoader native`.
   After-attempt log: `.cache/golden-690-after.log`; preview log:
   `.cache/golden-preview.log`. Failed after manifest/contact sheet:
   `.cache/golden/2026-10-05-062557/poses.json` and
   `.cache/golden/2026-10-05-062557/index.html` (`complete: false`, no captures).
   Independently confirmed localhost listener
   rejection (`listen EPERM 127.0.0.1:4690`) in
   `.cache/golden-690-preview-probe.log`. **After PNGs are missing**.

Expected capture paths after a browser-capable rerun:

- `.cache/golden/<before-stamp>/great-blue-hole-east-2.png` and
  `great-blue-hole-east-3.png` (baseline).
- `.cache/golden/<after-stamp>/great-blue-hole-east-2.png` and
  `great-blue-hole-east-3.png` (updated), plus west `great-blue-hole-1/2/3.png`
  to check opening/west continuity.
- `.cache/codex/shots/f-visual-qa/great-blue-hole-east-3.png` from the authored
  visual-QA test at the default Medium tier.

Review the mouth silhouette, roof attachment, varied pendant lengths, cool
falloff, wall banding and apron context in the rendered PNGs before acceptance.
The geometry tests establish clearance/projection, not rendered beauty or GLSL
driver compilation.

The orchestrator's full e2e run supplied successful visual-QA images locally:
`.cache/codex/shots/f-visual-qa/great-blue-hole-east-3.png` and
`.cache/codex/shots/f-visual-qa/great-blue-hole-1.png`. Both were opened and
reviewed in this follow-up. The east view includes the lip, gallery and apron;
the opening includes the sub, ledge and wall banding. These are current rendered
evidence, not a like-for-like golden before/after comparison.

## Validation

Orchestrator follow-up, `tools/gates.sh --full-e2e` outside this sandbox:

- PASS (reported by orchestrator): build, unit, Python, content, attribution,
  full e2e and project-base e2e.
- The only failing gate was Prettier, identifying `plan/OVERNIGHT-LOG.md` and
  `plan/PROCESS-LOG.md`. Applied Prettier to those two files; changes are
  formatting only. No assertions, test configuration or application code changed.
- PASS locally after the fix: full-repository `npx prettier --check .` and
  `git diff --check`.

Earlier sandbox validation:

`GATES_CONFIG_MODE=writable PW_PORT=4690 VISUAL_QA=1 tools/gates.sh --full-e2e`:

- PASS: config bundling, production build, 124 unit files / 1,328 tests,
  144 Python tests, all-site strict content checks and attribution.
- PASS: Blue Hole Low/High roof ray tests (solid lip with a cavity underneath),
  all gallery vertices clear the terrain, longest pendant length variation,
  sub/cockpit collision clearance and actual camera projection of lip/apron
  context. Existing ledge seating and geo collider tests also pass.
- BLOCKED locally: full e2e + project-base e2e. Preview server cannot start in this
  sandbox; browsers cannot launch. No browser tests executed successfully.
  Gate logs: `.cache/gates/e2e.log`, `.cache/gates/e2e-base.log`.
- The initial full-repo formatting failures in `plan/OVERNIGHT-LOG.md` and
  `plan/PROCESS-LOG.md` are resolved by this follow-up.

Run on a browser-capable host:

```bash
GOLDEN_SITES=blue-hole tools/golden.sh
GATES_CONFIG_MODE=writable PW_PORT=4690 VISUAL_QA=1 tools/gates.sh --full-e2e
```

For a like-for-like baseline, use the base revision's east geometry with the
new authored pose, then rerun with the updated builder. Compare both east
shots and the west opening/close shots, and record actual PNG paths here.
