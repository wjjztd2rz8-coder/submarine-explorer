# F3-AUDIO — adaptive score and richer sound

Implemented on the package worktree; no commit made.

## Player-visible changes

- A gentle generated score crossfades sunlit, twilight, midnight, abyssal and
  hadal chords. Discovery/scan completions and objective completion swell it;
  pressure tension follows the fitted hull rating. Reduce motion softens both.
- Settings has independent saved Music, Sound effects and Master volumes plus
  Mute, with 44 px targets. Saved gains are applied before the first source
  starts. Existing settings gain defaults without losing their preferences.
- Thrusters follow thrust; ballast hisses on direction changes; hull creaks
  continue at depth and become stronger with stress. Scan beam hum and
  manipulator deployment/retraction servos follow scan events. Moving/retrieving
  the ROV drives its winch, and successful photos play a shutter.
- Two fixed positional voices provide nearby vent rumble and wreck creaks;
  reef props produce sparse shrimp crackle. Pacific shallows/midwater feature a
  NOAA humpback call. Important sounds feed existing captions, including muted
  play. Frozen menus stop held machinery; shell pause suspends the audio clock.
- Sonar ray marching and round-trip echo timing are preserved. Pending echoes
  and continuous sources are cleaned up on disposal. Later gestures can resume
  browser-interrupted audio.

## Files

- `src/audio/Score.ts`: pure score state plus slowly breathing pad voices.
- `src/audio/Soundscape.ts`: spatial falloff, machine loops, mechanical
  transients and optional wildlife sample playback.
- `src/audio/AudioEngine.ts`, `AudioSystem.ts`, `Loops.ts`, `Cues.ts`,
  `events.ts`: bus routing, integration, captions, lifecycle and frame inputs.
- `public/audio/noaa-humpback.ogg`: 9,461 bytes total shipped audio, well below
  1.5 MB. A six-second faded excerpt starting at source second 25, mono 8 kHz
  OGG/Vorbis. Downloaded from the vetted WAV; PMEL labels it 10x speed, so
  playback at 0.1 restores cadence. Licence and processing recorded in
  `ATTRIBUTION.md`; NOAA source page and reuse guidance verified live.
- `tests/unit/f3Audio.test.ts`: mixer normalization, pressure state, accent
  decay, reduced motion, distance falloff, saved volumes and scan-arm wiring.
- `tests/e2e/f3-audio.spec.ts`: real graph startup/decode, independent buses,
  mute/persistence, discovery/captions and first-touch control. Writes both
  review screenshots in the normal suite.

## Deviations from ownership

Minimal supporting integration edits outside `src/audio/*` and Settings rows:

- `src/core/config/audio.ts`: audio tuning and five depth palettes.
- `src/core/Save.ts`: additive audio defaults/sanitization/persistence.
- `src/app/systems/audio.ts`: saved settings, hull/ROV/prop inputs, repeat gesture
  resume and disposal. Listener position follows the active sub/ROV pilot.
- `src/app/systems/photo.ts`: shutter call on the two successful save paths.
- `src/styles/settings.css`: audio target sizes and matching accent colour.
- `ATTRIBUTION.md`, `CHANGELOG.md`, `docs/audio.md`: requested asset/change log
  and accurate audio documentation. No feature cuts.
- This sandbox's `node_modules` and screenshot directories linked to a
  read-only checkout; replaced those ignored symlinks with local writable
  directories to allow Vite caches and required screenshots. No tracked setup
  files or dependencies changed.

## Review and checks

- Final production build and all **612 unit tests** pass.
- Final F3 browser checks: **2 passed**, including actual OGG decode and touch
  startup. Both screenshots opened and visually reviewed:
  `.cache/codex/shots/f3-audio/settings-desktop.png` and `settings-mobile.png`.
- Full gate run: build, unit, Python, strict content, attribution and Prettier
  pass. Full browser suite: **135 passed, 1 expected root-build skip** (22.1 m).
  Project-base build: **1 passed**. The servo/first-touch-mute refinement was
  rebuilt separately and its audio browser cases rerun; quick gates rerun on
  the final tree.
- `git diff --check` passes; all changed files formatted individually.

The orchestrator should listen through a shallow-to-hadal dive on speakers or
headphones: browser automation verifies the graph and state, not musical taste.
Future sample actions can call `audio.playManipulator()`; species scans use the
first-discovery path, and `playDiscoveryChime()` also accents the score for a
future direct species integration. No shared EventBus contract was changed.
