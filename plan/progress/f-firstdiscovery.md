# f-firstdiscovery: unaided first-discovery capture

Script: `tools/firstdiscovery-shots.mjs` (desktop 1600x900, phone 390x844 touch; Titanic and Beebe). Build to a
temp outDir, `vite preview --port 4391`, then `node tools/firstdiscovery-shots.mjs`. It starts from Home, picks the site,
begins the dive, steers to the first unfinished primary objective (keys on desktop; the real touch stick on phone),
holds Scan (G / held touch on the Scan button) until `scanner.view.completed` increments, then captures
reward-a (0.5 s), reward-b (3 s), next-target (8 s) and a 10 s continuation. Shots: `.cache/codex/shots/firstdiscovery/<layout>-<site>/`.
Keys must not be pressed on phone: any keydown flips the game out of touch mode and hides the touch controls.

## Findings

- Default start is "near site": both Titanic (bow, 48 m) and Beebe (main vents, 73 m) begin in scan range, so the first scan needs no driving. The Scan prompt, in-range marker and reward all read clearly on desktop.
- Beebe: the 173 degree turn does not occur in this flow (first target bearing is within 8 degrees; next target 141 degrees BRG, 25 degrees PORT, shown as IN RANGE). The old complaint came from the blind-drive 60 s frame, not from the guided flow. The first target needs a 17 degree nose-down, which matches the "Rise and sink" tutorial step.
- Phone bug: the "New discovery +10 RP" notice sat at top-centre and overlapped/garbled against the mission and readout panels. Fixed (portrait phone: above the tutorial card, one line).
- Phone bug: after a scan the "Scanned this dive" panel lingered while still near the target and hid the next-target chip, so the player saw only a bare diamond. Fixed: the chip (name, range, depth delta) stays visible when the scan panel is the dim "logged" tone.
- Titanic phone: with the scripted drive the wreck stays in frame at +10 s (bottom right). The earlier loss of the wreck at 60 s came from blind forward driving past it; not a layout fault.

## Changed

- `tools/firstdiscovery-shots.mjs` (new), `src/styles/hazard.css` (phone notice placement), `src/styles/hud-layout.css` (next-target chip not hidden by a dim scan panel).

## Remaining

- Reward title is the guide entry title, which can differ from the objective name (Beebe: target "Beebe-125 black smokers", card "Supercritical black smokers"). Not changed: tests assert the title; consider showing the POI name as a subtitle.
- Desktop tutorial stays on "Move and turn" until the player moves, even after a scan; harmless but reads stale beside the scan prompt.
- Desktop shows tutorial card, bottom controls hint bar and four HUD blocks at once during the first scan; cluttered but legible.
- The script reads `window.__game` internals (mission, scanner, sub); update if those change.
