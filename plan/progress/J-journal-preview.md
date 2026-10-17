# J-journal-preview

Changes

- Entry capture (`.jr-hero img`, photo.css) height cap is now `min(300px, 32vh)` for all viewports (one rule, no media query); title and first paragraph are visible without scrolling at 390x844 and 844x390.
- Memorial note removed from poi entries; it shows once, on the site page.

Tests (tests/e2e/journal-debrief.spec.ts)

- Existing "a fresh scan opens its Journal entry with a picture" now also guards the capture height (<= 33% of viewport); minimum width relaxed 150 -> 100 for the tall portrait canvas.
- Bow entry test now asserts no `.jr-memorial` on entries (guards the repeated note).

Screenshots: .cache/codex/shots/J-journal-preview/{desktop,phone-portrait,phone-landscape}.png (read; legible, uncluttered).

Simplicity: net -2 lines in source, no new CSS rules, no site branches.

Remaining

- Debris-field capture framing not fixed: the scan still is read from whatever the camera shows when the scan completes, so it can show the bow. Fixing it needs scan-time camera aiming; not cheap.
- Portrait thumbnails are narrow (~126 px wide) because the stored canvas is portrait.
