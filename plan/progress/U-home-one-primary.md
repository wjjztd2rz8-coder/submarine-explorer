# U-home-one-primary

Home now has one primary action: the mint "Dive: <site>" button.

- Demoted: the Daily dive card. It lost its mint border and mint title and now matches the other menu buttons (min height 76 to 64 px). Nothing merged or removed; stars, streak and site/modifier text kept.
- Files: src/styles/home.css (3 lines), tests/e2e/f-title-layout.spec.ts (assert one `.home-primary`, daily has the same border/background as a plain menu button; `SHOTS_DIR` env override for screenshots), CHANGELOG.md.
- No new @media, no site branches, DOM/Tab order unchanged so other specs are untouched.
- Screenshots: .cache/codex/shots/U-home-one-primary/{before,after}/home-1280x720.png and home-390x844.png.
- e2e: f-title-layout home specs (all 8 viewports) passed.
- Gates: smoke + project-base PASS (smoke e2e mode).
