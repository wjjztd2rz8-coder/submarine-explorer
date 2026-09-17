# Audio

WebAudio-only sound system: a graph of buses feeding a shared depth low-pass,
a physically-timed sonar ping/echo, ambient beds that crossfade with depth,
and a handful of gameplay cues driven off `EventBus` and the sub's state.

No dependency was added (`howler` was considered in `docs/assets.md` but
CONTRIBUTING-AGENTS.md pins the runtime dependency list to exactly `three`,
and raw WebAudio is simple enough here that a wrapper isn't worth it).

## Why everything is synthesised, not sampled

`ffmpeg` is not installed in this environment, so a downloaded CC0 sample
can't be transcoded/shrunk to a safe size, and Freesound's real audio files
require an authenticated API download (only preview URLs are guessable
without one). NOAA PMEL's public-domain files (`bloop.wav`, `upsweep.wav`)
*are* directly downloadable and were verified reachable, but they are
"monster sound" curiosities, not sonar pings or thruster loops, so using them
for the actual gameplay cues would have meant fabricating fit that doesn't
exist. Given the brief's explicit fallback ("ffmpeg may be absent; if so,
keep WAV under 300 KB or synthesise"), every cue is generated at runtime with
oscillators and filtered noise instead. This is zero bytes shipped, zero
licensing risk, and deterministic. See `ATTRIBUTION.md` for the full note and
`docs/assets.md` for the CC0 sources catalogued if a future pass wants to
swap a synthesised cue for a recorded one.

## Graph

```
bus(ambient) ----+
bus(sub)     ----+--> depthFilter (shared lowpass) --> master --> destination
bus(ui)      ----+
bus(sonar)   ----+
```

One shared low-pass rather than per-bus filters, because "the mix gets
muffled with depth" is a property of the water and hull between the
player and every source, not of any one bus. Cutoff is driven by
`AudioEngine.setDepth(depthM)` every frame, interpolating between
`Config.audio.depthLowpassSurfaceHz` (bright, ~18 kHz, effectively off) and
`depthLowpassAbyssHz` (350 Hz, heavily muffled) as depth goes from 0 to
`lowpassFullAt` (-1000 m).

The `AudioContext` is created lazily, from the first `pointerdown` or
`keydown` after page load (`src/main.ts`), because browsers refuse to start
audio outside a user gesture. Nothing plays before that; there is no
autoplay attempt and so no autoplay console error.

## Files

| File                        | What it owns                                                             |
| ---------------------------- | ------------------------------------------------------------------------- |
| `src/audio/events.ts`        | `TerrainSampler` (structural, avoids importing world/sub), `CaptionBus`, `CaptionEvent`, `AudioFrameInput` |
| `src/audio/AudioEngine.ts`   | The WebAudio graph: buses, shared depth low-pass, noise-buffer helper    |
| `src/audio/Sonar.ts`         | `castSonarRay` -- pure ray-march + echo-delay maths, unit tested         |
| `src/audio/DepthBands.ts`    | `bandWeights` -- pure ambient-band crossfade maths, unit tested          |
| `src/audio/Cues.ts`          | One-shot synthesised sounds (ping, thud, creak, hiss, chime, alarm)      |
| `src/audio/Loops.ts`         | Continuous sounds (`ThrusterLoop`, `AmbientBeds`)                        |
| `src/audio/AudioSystem.ts`   | Facade: EventBus wiring, per-frame `update()`, `ping()`, captions        |
| `src/audio/index.ts`         | Public re-exports                                                        |

## Events used (and why no new ones were added to `EventBus`)

Per CONTRIBUTING-AGENTS.md, `GameEvents` is a shared contract. This package
only *subscribes*, using events other lanes already emit:

| Event               | Payload                                     | What audio does with it                                   |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `sub:collided`       | `{ depth, speed }`                          | Collision thud, gain scaled by impact speed                 |
| `sub:hullStress`     | `{ stress, cause: 'impact' \| 'pressure', depth }` | `cause: 'pressure'` plays a hull creak (rate limited, see below); `cause: 'impact'` is skipped since `sub:collided` already covers that moment |
| `sub:emergencyBlow`  | `{ depth, lockSeconds }`                    | Klaxon alarm cue + caption                                   |

Creak repeat rate is throttled by `Config.audio.hullCreakMinGapS` /
`hullCreakMaxGapS`, interpolated by `stress` (0..1): ~2.5 s apart near the
reporting threshold, down to ~0.5 s apart as stress approaches 1, so creaks
audibly accelerate as the hull nears failure.

Two things genuinely didn't exist anywhere yet and are defined in
`src/audio/events.ts` rather than in `EventBus.ts`, precisely because they
are *not* shared-bus material:

- **Continuous per-frame state** (depth, throttle, ballast, position,
  forward, `pingPressed`) -- broadcasting this every frame as bus events
  would be spam. Instead it is pushed once per frame via
  `AudioSystem.update(frame: AudioFrameInput)`, called from the small
  additive hook added to `src/main.ts`'s render loop (right after
  `sonar.update(s)`).
- **Captions**, via `AudioSystem.captions` (a `CaptionBus`). Every cue this
  system plays also emits a `CaptionEvent { id, text, durationS }` on it.
  This is for the accessibility package (C5): subscribe to
  `audioSystem.captions.on(handler)` and render a CC overlay. No consumer
  exists yet, so this is currently a documented, tested extension point
  rather than a visible feature.

## Sonar ping and echo

Triggered by the `ping` input action (already wired by A3: Q / Tab /
gamepad LB -- see `Input.actions`), surfaced as `frame.pingPressed` and
checked once per frame in `AudioSystem.update`.

1. `playPing` fires immediately: a fast sine sweep 2600 Hz -> 900 Hz over
   0.35 s.
2. `castSonarRay` (`src/audio/Sonar.ts`) marches a ray from the sub's
   position, along its forward vector tilted `sonarBeamDownDeg` (15°) below
   horizontal, in `sonarRayStepM` (10 m) steps up to `sonarMaxRangeM`
   (2000 m), against `Terrain.sampleHeight` (passed in structurally as
   `TerrainSampler`, no import of `src/world/Terrain.ts`'s class).
3. On a hit at range `r`, the echo delay is the textbook
   `delayS = 2 * r / speedOfSoundMps` (1500 m/s in seawater --
   `Config.audio.sonarSpeedOfSoundMps`), scheduled with `window.setTimeout`.
   The echo replays the same chirp, quieter and lower-pitched
   (`gain = 1 / (1 + r / 200)`, `pitchScale = 0.9`), plus a caption with the
   rounded range in metres.
4. No hit within range plays no echo (open water / off a cliff edge).

**Unit test** (`tests/unit/audio.test.ts`): asserts `delayS` matches
`2*range/1500` exactly for the ray-march's own reported range, and within 5%
of the textbook value for a known geometric case (straight down onto a flat
floor at -500 m, expected range exactly 500 m) -- satisfying the "ping echo
delay equals 2d/1500 within 5%" acceptance criterion from `plan/MASTER-PLAN.md`.

## Ambient beds

Four depth-band layers (`Config.audio.ambientBands`, shallowest first: 0,
-20, -200, -1000 m), each a sine drone + low-passed noise. `AmbientBeds`
crossfades adjacent bands with `bandWeights(depthM, bands)` (pure function,
unit tested for: sum-to-1, band-0-at-surface, deepest-band-beyond-its-depth,
and an exact 50/50 split at the midpoint between two bands).

## Thruster and ballast

`ThrusterLoop` is a sawtooth + filtered noise loop; `update(throttle)` slews
its pitch between `thrusterMinHz` (55 Hz) and `thrusterMaxHz` (140 Hz) and
its gain, by throttle magnitude, using `setTargetAtTime` so there's no
zipper noise. Ballast hiss (`playBallastHiss`) fires once per edge -- when
`sign(ballast)` changes and is non-zero -- rather than looping continuously,
since ballast is usually held only briefly.

## Discovery chime

`AudioSystem.playDiscoveryChime()` plays a bright C-E-G arpeggio. B1's
`DiscoveryStore` (a later package) doesn't exist yet, so nothing calls this
automatically; call it directly once a discovery fires, e.g.
`window.__game.audio.playDiscoveryChime()` from the console today, or a real
call from B1's scan-complete handler once that lands.

## Manual test checklist

1. Load `?tile=titanic`, click or press a key once (unlocks audio) -- no
   console autoplay-policy error.
2. Hold `W`: thruster pitch and loudness rise; release: falls back to idle.
3. Press `Q` or `Tab`: hear the ping chirp; if facing open water, no echo;
   turn toward the seabed/a wall and ping again -- hear a delayed, quieter
   echo, and a caption in the console-visible `captions` handler (or wire a
   temporary `audioSystem.captions.on(console.log)` from the devtools
   console) naming a plausible range.
4. Descend from the surface to ~1000+ m: the whole mix audibly darkens
   (low-pass closing), and the ambient bed crossfades through the four bands.
5. Press `Space`/`Shift` (ballast): hear a short hiss on each direction
   change, not a continuous drone.
6. Drive into the seabed at speed: a low thud plays, louder for harder hits.
7. Approach crush depth (or lower `Config.submarine.crushDepth` for testing):
   hull creaks start and audibly speed up as depth approaches the limit.
8. Force an emergency blow (100% crush ratio): klaxon alarm plays once.
9. Confirm zero WAV/OGG files under `public/audio/` -- everything above is
   synthesised, so there is nothing to attribute for size or licensing.

## Tuning

Every numeric knob lives in `Config.audio` (`src/core/Config.ts`):
`masterVolume`, the depth low-pass pair + `lowpassFullAt`, sonar
(`sonarSpeedOfSoundMps`, `sonarMaxRangeM`, `sonarRayStepM`,
`sonarBeamDownDeg`), `ambientBands`, thruster pitch range, hull-creak gap
range, and collision-thud gain-per-speed.
