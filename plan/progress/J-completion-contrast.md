# J-completion-contrast

Changed (src/styles/flow.css only): the primary-completion banner now has an opaque dark fill
(#07161c) with a soft shadow instead of a translucent cyan wash; detail text is a solid light
colour instead of 0.85 opacity; buttons and hover use opaque fills. Cyan title on the dark fill
is well above 4.5:1. Because the banner carries its own backdrop, the touch layout (where the
objectives panel has no background) needs no change and no new hud-layout.css rules.

Merged/replaced: no new element; the existing banner's colours were replaced.

Test: tests/e2e/f-a11y.spec.ts "completion banner keeps AA contrast over bright Blue Hole water"
(axe color-contrast on .obj-banner at Blue Hole). Guards the cyan-on-translucent-cyan regression.

Gate: `PW_PORT=4711 tools/gates.sh` passed (all PASS) before the test's final tidy; the new test and
hud-touch completion-banner tests were re-run and pass.

Screenshots: .cache/codex/shots/J-completion-contrast/desktop.png (Blue Hole, desktop);
touch: .cache/codex/shots/hud-touch/landscape/completion-banner-*.png.
