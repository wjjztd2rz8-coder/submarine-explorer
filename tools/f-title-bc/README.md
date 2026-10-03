# Title B/C review harness

Opt-in development tool, outside the application entry graph and normal e2e
discovery. No Home/bridge changes are required. From the repository root:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
node tools/f-title-bc/capture.mjs --build-only
node tools/f-title-bc/capture.mjs after
```

The capture command owns a Vite dev server on an automatically allocated local
port and a headless Playwright Chromium process using SwiftShader. It loads the
checked-in Monterey tile through the real `loadTitleCrop()` / `TileLoader`, uses
the application's ACES/sRGB/exposure settings, and captures at DPR 1. It does not
load the gameplay scene or create an additional renderer inside the application.

Output is `.cache/codex/shots/f-title-bc/after/`:

- `1280x720-low.png`, `1280x720-high.png`
- `390x844-low.png`, `390x844-high.png`
- The same four names with `-lamps-off.png` for lighting comparison
- `metrics.json`: renderer counters, projected hull bounds, particle count and
  minimum sampled/mesh camera clearance over a deterministic 40-second loop
- `run-error.txt` if a capture or assertion fails

The portrait image includes the scissored 185.68 px hero band and navy remainder.
There are no UI panels; these are module review images, not Home acceptance shots.
Lamp comparison pairs freeze identical vehicle/particle poses at 40 seconds.
Labels such as `before` create a separate output directory; they do not select
a source revision. Render budgets and clearance are assertions. Brightness,
lamp clipping and visual composition require inspecting the PNGs.

The harness needs permission to listen on localhost and launch Chromium. In the
restricted 2026-10-03 review environment both are blocked; no PNGs were produced.
See `plan/progress/F-TITLE-BC-REVIEW.md` for evidence and remaining review work.
