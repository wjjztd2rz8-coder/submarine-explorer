# Playtest A3 — submarine feel and input

What "it handles well" means for this boat, as ten checks you can run by hand and
that are also pinned by tests. Every number lives in
[`src/core/Config.ts`](../src/core/Config.ts) under `submarine` and `camera`;
nothing here is a magic constant in a module.

Automated coverage:

| Where                             | Covers                                                                   |
| --------------------------------- | ------------------------------------------------------------------------ |
| `tests/unit/subFeel.test.ts`      | physics: thrust, drag, rotation, trim, banking, stress, crush, sim speed |
| `tests/unit/subCameraRig.test.ts` | camera modes, terrain collision, shake, look-ahead, bank follow          |
| `tests/unit/subInput.test.ts`     | action map, rebinding, persistence, mouse-look, edge vs level actions    |
| `tests/e2e/sub-playtest.spec.ts`  | the same checks driven through the real game with scripted key presses   |

Run them with `npm test` and `npm run test:e2e`.

## Controls

| Key            | Action                          | Action id                         |
| -------------- | ------------------------------- | --------------------------------- |
| `W` / `S`      | ahead / astern                  | `thrustForward` / `thrustReverse` |
| `A` / `D`      | yaw to port / starboard         | `yawPort` / `yawStarboard`        |
| `R` / `F`      | nose up / nose down             | `pitchUp` / `pitchDown`           |
| `Space`        | blow ballast (rise)             | `ballastBlow`                     |
| `Shift`        | flood ballast (dive)            | `ballastFlood`                    |
| `X`            | boost                           | `boost`                           |
| `C`            | chase / first-person viewport   | `toggleCamera`                    |
| `P`            | free-orbit photo mode           | `togglePhotoMode`                 |
| `M`            | sonar minimap                   | `toggleSonar`                     |
| `L`            | headlights (A2 owns the lights) | `toggleLights`                    |
| `Q` (or `Tab`) | sonar ping (A4 owns the sound)  | `ping`                            |
| `G` (hold)     | scan beam (B1 owns the beam)    | `scan`                            |
| `T`            | sim speed 1x / 2x / 3x          | `cycleSimSpeed`                   |

Gamepads use the W3C standard mapping and take over the instant a stick moves:
left stick throttle/yaw, right stick pitch, A/B ballast, RT boost, Y camera,
X lights, LB ping, RB scan, Back sonar, Start photo mode, D-pad up sim speed.

Every row is rebindable through `Input.rebind(actionId, ['KeyJ'])` and persists
to `localStorage` key `subexplorer.bindings.v1`. `Input.actions` is the list a
settings screen renders; `Input.primaryKeyLabel(id)` gives the glyph. Rebinding
a key takes it away from whatever held it, so a binding is never ambiguous.
`Tab` is a _secondary_ ping binding and is deliberately not swallowed, so
keyboard focus navigation on the DOM overlays keeps working.

## The ten checks

Each is written as: **do this → expect that**. The "pinned by" column names the
test that fails if the feel drifts.

### 1. Full thrust reaches terminal velocity within 8 s

Hold `W` from rest at depth. Speed should climb smoothly and be within 5 % of
6.0 m/s (11.7 kn) after eight seconds, with no further change after that.

Pinned by `subFeel` A3/1, and by the e2e script (speed > 3 m/s after 6 s of `W`).
Tunables: `thrustAccel`, `dragLinear`, `dragQuadratic`.

### 2. The throttle curve gives fine control, boost gives a sprint

Half stick (a gamepad, or a future analogue input) must settle well under half
of full speed — around 3 m/s — so there is a usable survey speed. Holding `X`
lifts terminal speed to ~8.4 m/s.

Pinned by `subFeel` A3/2 and A3/2b. Tunables: `thrustCurve`, `boostMultiplier`.

### 3. Cutting the throttle coasts, it does not brake

Release `W` at cruise. The boat should glide: under 0.2 m/s after 30 s and
effectively stopped by 60 s. It must never stop dead — that reads as a car, not
a boat.

Pinned by `subFeel` A3/3 and by the e2e script (speed halves within 6 s).

### 4. Pitch clamps at ±45° and does not stick there

Hold `R` until the nose is fully up. The pitch angle must stop at 45° exactly,
and releasing the key must not produce a lurch — the pitch _rate_ is zeroed at
the clamp, not just the angle.

Pinned by `subFeel` A3/4. Tunables: `maxPitch`, `pitchAccel`, `pitchDamping`.

### 5. Rotation has inertia

Tap `D` for one frame: the boat barely moves. Hold it: the turn rate builds over
about a third of a second and settles at ~31 °/s. Release it mid-turn: the boat
keeps swinging for a moment before it stops.

Pinned by `subFeel` A3/5 and by the e2e script.
Tunables: `yawRate`, `yawAccel`, `yawDamping`.

### 6. Banking reads as speed, and is purely cosmetic

Turning at cruise rolls the hull up to ~24° into the turn, and the chase camera
follows 55 % of it. Pivoting on the spot at zero speed produces **no** roll.
Roll must never feed back into the physics: the boat still travels exactly where
its nose points.

Pinned by `subFeel` A3/6 and `subCameraRig` ("copies a fraction of the boat
roll"). Tunables: `maxBankAngle`, `bankHalfLife`, `bankFullSpeed`,
`camera.bankFollow`. `CameraRig.reduceMotion = true` disables the camera half
(accessibility, C5).

### 7. Hands off, the boat hovers

Let go of everything at 2,000 m. Over 30 s the depth must change by less than
5 m, drifting gently _up_ (a real boat is trimmed slightly positive so a power
failure surfaces it). Ballast also has inertia: a one-frame tap on `Shift` does
almost nothing; the tanks take about half a second to take effect.

Pinned by `subFeel` A3/7 and A3/7b.
Tunables: `buoyancyAccel`, `trimStrength`, `ballastHalfLife`.

### 8. Nose-down into the seabed at 6 m/s pushes out without tunnelling

Point the nose at the bottom at full thrust and fly into it. The hull is pushed
out along the _terrain normal_, so a slope deflects you sideways rather than
trapping you; altitude must stay positive, and holding thrust into the bottom
must not walk the boat through it.

Pinned by `subFeel` A3/8 and the e2e "flying into the seabed" test, which also
asserts the camera never ends up below the seabed.

### 9. Impacts are felt

A 6 m/s head-on impact produces hull stress 1.0, which halves every 0.9 s and is
gone within five seconds. Stress drives the camera shake (a decaying oscillation,
not a random jitter) and emits `sub:hullStress` on the event bus for audio (A4)
and the HUD. A 0.6 m/s graze must produce far less than a third of the stress of
a 6 m/s hit — it is the _closing speed along the surface normal_ that counts,
not the total speed.

Pinned by `subFeel` A3/9 and A3/9b, and `subCameraRig` ("displaces on impact and
decays back"). Tunables: `impactStressSpeed`, `hullStressHalfLife`,
`camera.shakeAmplitude`, `camera.shakeHalfLife`, `camera.shakeFrequency`.

### 10. Crush depth warns, then saves you

The fitted hull class sets the rating (`A` 1,000 m, `B` 4,500 m — the default,
`C` 11,000 m). At 90 % of it the HUD warns and pressure stress starts to climb.
At 100 % the hull fails: an emergency blow fires, the pilot's controls lock out
for 5 s, the boat rises on its own, and `sub:emergencyBlow` is emitted for the
mission layer to hang a restart off. Holding `Shift` during the blow must not
stop the ascent. There is no game-over here — the mission decides what a breach
means.

Pinned by `subFeel` A3/10 and A3/10b, and the e2e "crush depth" test.
Tunables: `hullClass`, `hullClasses`, `crushWarnRatio`, `emergencyBlowAccel`,
`emergencyBlowLockSeconds`.

## Sim speed

`T` cycles the `simSpeeds` multiplier. It runs that many **whole** 60 Hz ticks
per frame rather than scaling `dt`, so the integrator's step size — and
therefore the handling — is bit-for-bit identical at 1×, 2× and 3×; only
wall-clock changes. That is what makes a 25 km tile crossable in a sitting while
keeping the boat's real speed honest, and it is why the settings screen can
label it "sim speed" rather than "make the sub faster".

Pinned by `subFeel` A3/11 and the e2e script.

## Camera

Three modes, one rig:

- **chase** (default) — offset behind and above, exponential position/rotation
  lag expressed as a half-life so the feel is identical at 30 and 144 fps, aim
  point ahead of the bow and dropped so the seabed fills the frame.
- **first person** (`C`) — eye point in the sail, longer look-ahead, mouse-look
  enabled automatically while you are in it.
- **orbit** (`P`) — a tripod on a sphere around the boat, no lag, driven by
  `rig.orbit(dAzimuth, dElevation, dRadius)`. This is the hook photo mode
  (Tier 3) will drive; leaving it returns you to whichever view you came from.

Look-ahead grows with speed (`lookAheadPerSpeed`), which is what makes speed
legible in fog. The camera is lifted to stay `terrainClearance` metres above the
seabed in every mode, so flying low never puts the view inside rock — the rig
samples `Terrain.sampleHeight` for this and degrades gracefully to no collision
when it is constructed without a heightfield (menus, unit tests).

## Known gaps

- Mouse-look is a _virtual stick_: the frame's accumulated pixel delta becomes an
  axis deflection rather than a direct rotation. That keeps it feeding the same
  fixed-step physics as the keyboard, at the cost of being slightly frame-rate
  sensitive at very low frame rates. Pointer lock itself is not requested yet.
- Gamepad buttons are not rebindable, only keys. The action map is already the
  right shape for it; the settings UI (C5) can add it.
- `reduceMotion` exists on the rig but nothing sets it yet — C5 owns that switch.
