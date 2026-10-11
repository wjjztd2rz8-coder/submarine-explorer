# f-ci-vehicles: lighten f1-vehicles spec (hosted software-GL timeout)

- Viewport 1280x800 -> 800x500, screenshots use scale 'css', hull-loop waits frames(20) -> frames(8); orbit screenshots dropped (no assertion reads them), chase/cockpit per class and ROV kept.
- Local timing: test 8.4 s -> 4.7 s (tsc, prettier, spec pass); no expect() changed; hosted 240 s timeout not reproducible locally (GPU box).
