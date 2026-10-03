# F-GOLDEN-RUN — capture reliability (2026-10-02)

Capture work changes `tools/golden-shots.mjs`; gate feedback also changes the dispatcher, gate runner, Playwright server ownership and their regression tests. No application, asset, lighting, geometry, camera-pose, content or e2e assertion changes. No commit.

Gate feedback follow-up: the detailed original e2e log contains **49 connection-refused failures after 162 passes**, all on port 4371; the failed cases never reached their assertions. The dispatch log assigned 4371 to `f-bughunt-4` at 18:15 and to `f-golden-run` at 18:45, before the latter entered its gates. The other task's result is timestamped 19:08:54, matching this suite's loss of preview near the end. The old dispatcher checked only listening sockets, so it could assign a running task's port while that task was still implementing. Playwright then allowed this suite to borrow the other task's preview, which could disappear when its owner finished. The logs do not record the server process exit signal, but the duplicate assignment and shared connection failure are established.

`tools/codex-dispatch.sh` now serializes dispatchers with a file lock and reserves both primary and project-base ports from running services' `ExecStart` arguments throughout their task lifetime, also checking both ports for listeners. Playwright defaults to owning preview; interactive local reuse requires `PW_REUSE_SERVER=1`, and CI cannot opt in. `tools/gates.sh` explicitly forces owned previews, builds into the same isolated directory its preview serves, uses separate project-base/build/result directories, and cleans only automatically allocated builds. An explicit `PW_OUTDIR` is built, served and retained. Port conflicts now fail before the browser suite instead of silently borrowing another task's server.

Regression coverage adds four configuration cases and five offline shell-orchestration cases: pending-task port reservations, occupied base ports, dispatcher exclusion, build/preview agreement and cleanup, retained explicit outputs, and preservation of failed gate status while still running the base gate. All e2e assertions, timeouts, retries and skip conditions remain unchanged. Browser collection still lists 225 tests in 43 files. **All six non-browser gates pass, with 801 unit tests and 126 Python tests.** Results are recorded in `.cache/golden-feedback-gates.log`; the original failure log is preserved as `.cache/golden-feedback-original-e2e.log`. A real e2e rerun remains for the orchestrator because this sandbox still cannot run preview or Chromium.

The tool now defaults to `npm run preview`'s port 4173, accepts the existing positional/`--base-url` forms, normalizes the trailing slash, and follows Vite's same-origin project-base hint at `/`. Base probing uses the context's HTTP client so it does not boot an extra game. Fresh contexts block service workers. During capture, a browser-only animation-frame gate holds the last presented frame and resumes queued callbacks afterwards, avoiding continuous SwiftShader work competing with screenshot readback. Font readiness is still awaited. A failed 30-second Playwright screenshot gets a bounded Chromium viewport fallback (`Page.captureScreenshot`, `fromSurface: false`); both paths require a 1600 × 900 PNG. The existing three poses per hero remain unchanged. Filenames record seconds to reduce run collisions.

Failures now identify the site/stage, continue to the remaining sites, write an explicitly incomplete contact sheet and a manifest containing failures, and exit 1. Launch failures also produce that report, without an uncaught top-level exception. The original orchestrator log contains only the tail ending in “fonts loaded”; its underlying exception is unavailable, so the exact cause and the live effectiveness of the capture workaround remain unverified.

Validation: root and `/submarine-explorer/` production builds passed; 797 unit tests and 121 Python tests passed; Node syntax, CLI help and changed-file formatting checks passed. Six offline transport cases passed: root preview, automatic project-base discovery, explicit project base without trailing slash, screenshot fallback, continuation after a failed site, and invalid-PNG rejection. The harness executes the tool's page-evaluation/frame-gate logic against a fake browser transport; it provides no visual or real Chromium evidence. Harness/log: `.cache/golden-transport-check.mjs`, `.cache/golden-transport.log`.

**Fresh capture blocked by this environment:** `npm run preview -- --port 4298 --strictPort --outDir dist-golden` fails with `listen EPERM 127.0.0.1:4298`. Chromium independently fails at `sandbox_host_linux.cc` with `shutdown: Operation not permitted`. The full e2e command cannot start its preview server either. The final actual `node tools/golden-shots.mjs` attempt exited 1 and saved zero captures plus diagnostics to [.cache/golden/2026-10-02-235339/index.html](../../.cache/golden/2026-10-02-235339/index.html) and [poses.json](../../.cache/golden/2026-10-02-235339/poses.json). This is an incomplete attempt, not a fresh golden set. Logs: `.cache/golden-run.log`, `.cache/golden-e2e.log`.

Run the following in a browser-enabled environment to finish live verification and produce all 15 fresh images:

```bash
PATH="$HOME/.local/node/bin:$PATH" npm run build
PATH="$HOME/.local/node/bin:$PATH" npm run preview
# In another terminal:
PATH="$HOME/.local/node/bin:$PATH" node tools/golden-shots.mjs
```

For a project-base build, set `VITE_BASE=/submarine-explorer/` on both the build and preview commands; either pass `--base-url http://localhost:4173/submarine-explorer/` or let the tool follow Vite's root-page hint. An existing preview on 4298 remains supported through an explicit base URL.

All six Lost City/Titanic images below were opened and inspected. They are **archival**, copied unchanged from `/home/vijay/submarine-explorer/.cache/golden/2026-10-02-2323/`, whose manifest records `http://localhost:4298/submarine-explorer/`, high tier and zero failed props. That original set contains 12 captures and lacks Monterey; it is not the patched tool's output. A provenance file accompanies the local copy.

Against [DIRECTOR.md](../DIRECTOR.md), the archived Lost City opening supports **tower readable within 10 seconds**: pale stepped spires and plumes separate clearly from the water, with the sub visible in front; a still cannot verify the elapsed gameplay time. **Seabed outside the headlight pool still fails**: the background ridge is outlined, but the surrounding slope is nearly black and offers little navigable texture. The 40/30 m axis approaches crop the tower heavily, so they test material detail rather than the complete silhouette. Titanic's opening shows a recognizable bow/deck and ambient-lit seabed outside the pool, while its approach clearly separates rail posts, deck edges, davits and superstructure despite dense marine snow. **Near-range rail/deck readability looks good; a ~50 m camera-to-hull acceptance remains unverified**: the recorded 40 m is submarine clearance from prop bounds, the cockpit sits forward of the sub, and the HUD's 65 m is a POI range. These archival images cannot establish the current worktree's fresh visual result.

Lost City — opening, 40 m axis approach, 30 m axis detail (archival):

![Lost City opening, archival](../../.cache/golden/2026-10-02-2323/lost-city-1.png)

![Lost City 40 m axis approach, archival](../../.cache/golden/2026-10-02-2323/lost-city-2.png)

![Lost City 30 m axis detail, archival](../../.cache/golden/2026-10-02-2323/lost-city-3.png)

Titanic — opening, 40 m bounds approach, 15 m bounds detail (archival):

![Titanic opening, archival](../../.cache/golden/2026-10-02-2323/titanic-1.png)

![Titanic 40 m bounds approach, archival](../../.cache/golden/2026-10-02-2323/titanic-2.png)

![Titanic 15 m bounds detail, archival](../../.cache/golden/2026-10-02-2323/titanic-3.png)
