# F-VERIFY-CI-SHARE — merged CI and social image audit

Date: 2026-10-03. Worktree baseline: `afb3f1f` (also the remote main head).
Both merges are present: `c5d4b4c` (350, CI stabilization) and `b2e9c66`
(340, share image). No gameplay or share-image source changes; no push or
remote workflow trigger.

## Hosted CI after the latest push

`gh run list --branch main -L 10` returned these runs (push times UTC):

| Push time | Workflow | Run         | Conclusion |
| --------- | -------- | ----------- | ---------- |
| 16:35:01  | Pages    | 37137381358 | success    |
| 16:35:01  | CI       | 37137381380 | failure    |
| 14:15:37  | Pages    | 37128999997 | success    |
| 14:15:37  | CI       | 37129000011 | failure    |
| 13:40:44  | CI       | 37126994530 | failure    |
| 13:40:44  | Pages    | 37126994521 | success    |
| 13:40:32  | CI       | 37126983806 | cancelled  |
| 13:40:32  | Pages    | 37126983812 | success    |
| 13:17:32  | Pages    | 37125673165 | success    |
| 13:17:32  | CI       | 37125673184 | failure    |

- Latest [CI run 37137381380](https://github.com/wjjztd2rz8-coder/submarine-explorer/actions/runs/37137381380)
  built `afb3f1f05e09f9a4d98367ae15e0106bc72e2eb7`. Static checks,
  project-base build/browser check and shard 16 succeeded. Shard 2 failed;
  the other 14 browser shards were cancelled by matrix fail-fast.
- `gh run view 37137381380 --log-failed` and the job-specific `--log`
  returned empty output. Retrieved the actual failed job log with
  `gh api repos/wjjztd2rz8-coder/submarine-explorer/actions/jobs/111244558975/logs`
  and downloaded `e2e-artifacts-37137381380-1-2` to `/tmp/390-ci-artifacts`.
- Failure: `content-missions.spec.ts`, Hunga Tonga briefing → real primary
  scans → debrief. First attempt exhausted all 25 poses, reporting the
  **requested caldera-floor candidate every time**. Retry exhausted its
  hard-coded 120-second test budget during the same pose search; no scan
  had started. Sixteen later shard tests did not run.
- Retry trace confirms each 600 ms `waitForFunction` expired while normal
  browser evaluations cost roughly 1.3–1.8 seconds. The subsequent candidate
  read found the requested POI. This is a test synchronization failure on
  software rendering, not evidence of an inaccessible gameplay objective.
- Retrieved shard 14's log too: merged crush-depth/debrief test passed
  (about one minute), and vent, reef and canyon shader cases passed before
  cancellation. The remaining preset cases were not verified by that run.

## Small fixes

- `tests/e2e/content-missions.spec.ts`: teleport, observe two animation frames
  so the real discovery/scanner loop processes the pose, then read and compare
  the exact candidate. Keep all pose alternatives and fail with observed IDs
  if none works. Remove the 600 ms polling deadline and broad catch that
  turned timing failures into misleading pose failures. All real scan,
  objective, hint, debrief and console-error assertions remain in place.
- These mission smoke tests retain a 120-second local minimum and respect
  the configured 240-second CI test budget instead of overriding it to 120.
  No global budgets or retry settings changed.
- `tests/e2e/f-geo-scarp.spec.ts`: the full CI-mode audit exposed four more
  geometry tests inheriting Low. Three scarp builders then have no rubble;
  Blue Hole has only nine instances, below the required >20. Explicitly
  select Medium, preserving all rock-count, terrain-height and triangle
  budget assertions. No geometry or gameplay implementation changed.
- `playwright.config.ts`: when the existing `GATES_CONFIG_MODE=writable` is
  set, preview uses Vite's runner config loader too. The baseline gate could
  build and run units in writable mode but preview still tried to write
  `node_modules/.vite-temp` through the read-only dependency symlink (`EROFS`).
  Normal preview configuration and server ownership stay as configured.
- `tests/unit/playwrightConfig.test.ts`: isolate `GATES_CONFIG_MODE` alongside
  the other stubbed environment variables so its default-mode expectations
  do not inherit writable mode from the gate caller.
- Local ignored cache setup: preserved the screenshot symlink as
  `.cache/codex/shots-shared-link` and created a worktree-owned
  `.cache/codex/shots/`. The shared target was read-only and caused screenshot
  `EROFS` errors in currents/flow tests. No shared files were modified.

## Share image verification

- Both source `index.html` image meta URLs are absolute HTTPS URLs beneath
  the Pages base `/submarine-explorer/`:
  `https://wjjztd2rz8-coder.github.io/submarine-explorer/share/bathyline-og-1200x630.png`.
  The deploy workflow derives this project base from the repository name.
- Built both root `dist/` and `VITE_BASE=/submarine-explorer/`
  `dist-share-base/`. Both preserve the absolute social URLs and include
  `share/bathyline-og-1200x630.png`, byte-identical to the source asset.
  The project-base build also prefixes its bundled asset URLs correctly.
- Both stamped workers have 15 precache entries including the PNG. The
  worker resolves this relative entry against `self.registration.scope`,
  producing exactly the social image URL under the Pages base.
- Live Pages HTML returned HTTP 200. Both live social-image URLs returned
  HTTP 200, `image/png`, 128,831 bytes and PNG dimensions 1200×630. The live
  worker includes the same precache entry. Source, both builds and live PNG
  share SHA-256
  `7095dbddc5135fac8f7b22e32675ce790cdf9fa97238e356cd8e294d6f7a3813`.
  No metadata, image or precache changes were needed.

## Validation

- Baseline full gate: build, 1,115 unit tests, 140 Python tests, content,
  attribution and formatting passed; both browser gates failed at preview
  startup with the read-only-config error described above.
- After synchronization and preview fixes, Hunga Tonga passed in CI mode,
  **retries disabled**, in 16.7 seconds (17.5 seconds including server setup):
  `GATES_CONFIG_MODE=writable CI=true PW_PORT=4391 PW_OUTDIR=dist npx playwright test tests/e2e/content-missions.spec.ts --grep hunga-tonga --retries=0`.
- Hunga Tonga also passed in the full suite in 15.2 seconds; all 13 shipped
  mission scenarios passed before the screenshot setup issue was found.
- Full CI-mode gates are being validated with
  `GATES_CONFIG_MODE=writable CI=true PW_PORT=4394 PW_OUTDIR=dist tools/gates.sh --full-e2e`.
  Final results will be appended below.
- Hosted logs and local evidence are retained under `.cache/f-verify-ci-share/`;
  gate logs are under `.cache/gates/` and `/tmp/390-gates-final.log`.
  Main remains red remotely until the owner publishes a fix and obtains a
  complete green run; this task does not push.
