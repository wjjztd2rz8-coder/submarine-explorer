# U-pick-site-clean

Source: U-play-walkthrough finding 5 (every row showed empty stars and "0/N logged"; bare "2" cluster on the globe).

## What changed

- `src/ui/MissionSelect.ts`: stars render only when the site has a rating; progress text is empty unless something is logged; a `recommendedId` option lists that row first with a "Recommended first dive" badge.
- `src/app/systems/shell.ts`: `completion` returns '' for 0 logged; `recommendedSite(app)` returns the existing first-mission default only while no site has been dived (`app.lastSite` unset). No new site branch.
- `src/ui/Globe.ts` + `src/styles/globe.css`: `recommendedId` option keeps that pin's name label visible; when the pin is inside a cluster, the cluster shows the label instead. Cluster clustering itself is kept (it prevents overlapping pins).

## What it replaced

- The unconditional `★/☆` row and the `Journal · 0 logged` placeholder plus `0/N logged` fallback (deleted). No new cards, no layout CSS (one selector added to an existing display rule).

## Tests (extended existing specs)

- `d-shell.spec.ts` home test: fresh player sees exactly one "Recommended first dive" row (first), no stars or progress text, a visible Titanic globe label. Launch-destination test: recommendation is gone once a site was dived.
- `f2-progress.spec.ts`: after one earned rating only that row shows stars.
- Replaced the old assertion that required `\d+/\d+ logged` on a fresh Titanic row (it encoded the noise).

## Gates

- `PW_PORT=4881 tools/gates.sh`: python, content, build, unit, attribution, smoke e2e (3 passed) and project-base e2e (8 passed) all passed; prettier flagged only this note, fixed and re-checked.
- d-shell, f2-progress, globe-pins e2e: pass.

## Screenshots

- /tmp/pick-shots/round-1/1600x900/titanic/02-pick-site.png and /tmp/pick-shots/round-1/390x844/titanic/02-pick-site.png (journal-debrief journey, own outdir). Both read cleanly: Titanic first with the badge, "RMS Titanic" label on its pin, no stars or counts.
