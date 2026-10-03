# Audio

Phase F adds a generative documentary score and richer WebAudio sound effects.
No runtime dependency was added. The only recording is a 9,461-byte NOAA/PMEL
humpback excerpt; its source, licence and processing are in `ATTRIBUTION.md`.

## Graph and settings

```
ambient / sub / ui / sonar -> SFX volume -> depth low-pass -> master
music                     -> Music volume               -> master
master -> compressor -> sample peak guard -> destination
```

The score bypasses the underwater effects filter so its pads remain audible at
depth. Master, SFX, Music and Mute are separate saved settings. Existing v1/v2
saves receive audio defaults; invalid volumes fall back or clamp to 0..1.
The combined output is compressed before a final 0.95 sample ceiling, preventing
stacked effects from exceeding digital full scale while preserving quiet cues.
Compression tuning and the ceiling live in `src/core/config/audio.ts`.
Sliders are keyboard and touch operable, with at least 44 px input height.
Reduce motion softens discovery and pressure modulation and removes pad breathing.

`AudioSystem.unlock()` builds the graph on a pointer or keyboard gesture and
starts a silent one-sample source synchronously to unlock iOS audio, including
when the first touch occurs on the paused home screen. Later gestures recover
browser-interrupted audio; gestures during an already unlocked pause keep the
clock suspended. Capture handlers cover pointer press/release, touch end and
keyboard input; rejected resumes release their warmup and retry on a later
gesture. The app shell suspends the context outside a dive, and hidden
tabs suspend independently of shell pause. The master is silenced immediately
while suspension completes; returning to a paused tab keeps it silent.
One-shots disconnect their complete graphs after their last source ends.
Disposal stops and disconnects every source and processor, cancels echoes,
unsubscribes handlers and closes the context. Optional sample-fetch failures
are silent.

## Score

`ScoreState` is pure and tested. `bandWeights` crossfades open, suspended chords
across sunlit (0 m), twilight (200 m), midnight (1,000 m), abyssal (4,000 m), and
hadal (6,000 m) anchor depths. `AmbientScore` uses three sine voices per band,
slight detuning, slow independent breathing and four-second gain smoothing.
Scan completions and completed objectives add a restrained nine-second swell;
repeat scans have a softer accent. Species discoveries use the same first-time
scan path. Tension begins at 80% of the fitted hull's rated depth and adds quiet
beating rather than a sudden alarm. Audio-clock state naturally freezes on pause.
Tuning lives in `src/core/config/audio.ts`.

## Vehicle and environment

- Thruster pitch and loudness follow absolute thrust; ballast hiss follows
  rise/flood edges. Hull creaks continue at depth and increase with hull stress.
- Scan events start/stop a beam hum; tether movement and return mode drive the
  ROV winch. Successful photo captures play a shutter. Scan start/end play a
  manipulator servo as the existing vehicle arms deploy/retract;
  `playManipulator()` also supports future sample-arm actions.
- Two positional equal-power panners attach rumble/creaks to the nearest vent
  and wreck props. Inverse-distance panning plus a squared distance envelope
  fades them fully out at 240 m; mobile uses two fixed voices, no HRTF convolution.
- Snapping-shrimp transients play near coral mound props. NOAA humpback calls
  are sparse in Pacific sites (Monterey, Kamaʻehuakanaloa and Axial), only between
  5 and 1,000 m. The PMEL source page identifies 10x speed; playback at 0.1
  restores its cadence. Leaving that habitat stops an active call.
- Important cues use `AudioSystem.captions`, including muted play. Continuous
  ambience captions are rate limited to avoid crowding the HUD.

## Sonar and verification

Sonar retains terrain ray marching and round-trip echo timing `2 * range / 1500`.
No echo plays for open water; delayed callbacks are cancelled on disposal and
cancelled on pause or tab hide so old echoes cannot arrive after resume. Existing sonar tests remain unchanged.

`tests/unit/f3Audio.test.ts` covers depth palettes, pressure state, accent decay,
reduce motion, spatial falloff and audio persistence. `tests/e2e/f3-audio.spec.ts`
starts the real graph, verifies pause/visibility and input-only slider persistence, changes independent buses, persists settings, exercises
captions and touch targets, and writes review screenshots under
`.cache/codex/shots/f3-audio/`. `audio.diagnostics` exposes graph state and gains.

`tests/unit/audioLifecycle.test.ts` covers first-gesture warmup, asynchronous
resume races, independent pause/visibility state, blocked cues, graph reuse,
complete one-shot/loop teardown and the final output peak guard.

`tests/unit/audioTouchUnlock.test.ts` checks capture-phase touch press/release
listeners and their removal across two app restarts.
