# 460 final report: marine snow and first-frame readability

## Result

Permanent marine snow now has a 6 drawing-buffer-pixel diameter ceiling. Within
6 m of the camera, permanent snow **and wreck sediment haze/rust motes** are
bounded to **2 buffer px, 0.12 centre alpha and a 0.65 linear colour multiplier**,
including lamp lighting. The guard eases out over 6–12 m. Wreck haze/motes keep
their original broader sprites beyond 12 m; permanent snow keeps the 6 px ceiling.
Drift, current advection, wrapping, seed distribution, particle budgets and the
Gaussian sprite edges remain. Fog, ambient fills/floors and depth bands did not change.

Completed two audit/review passes. Final static gates passed, including all
1,209 unit tests and the 380 hero-readability tests. Browser gates were attempted
but blocked by the workspace; no fresh screenshot/perceived-readability pass is claimed.

## Code paths and the cause of clutter

- `src/render/MarineSnow.ts`: one GPU point pool centred on the camera, seeded
  deterministically, with per-band density/drift and cone/range-weighted lamps.
  Seed admission also changes maximum flake size: size multiplier = 0.35 + 1.6s².
  Old diameter capped at 18 px; centre alpha could approach 1; colour multiplier
  could reach 3.6. Ambient fill above 1.5 saturates the base multiplier at 1.
- `src/world/presets/WreckPreset.ts`: independent seabed haze plus rust motes.
  The shared preset projector allowed 256 px, and particle colour follows
  `0.12 + 0.5 × sceneAmbient + headlightGain × exp(-lampDistance/90)`.
  Titanic's 30 ambient fill therefore makes its maximum multiplier 16.81.
  These particles are strong candidates for the large bright lower-third discs.
- `src/world/presets/shared.ts`: projection/lighting/soft-fragment helpers for
  other presets. They were left unchanged: vent plumes, brine mist and canyon
  plumes have different visual roles. Vehicle wash, life sparks, event bursts
  and title-scene snow also have separate shaders and were outside this fix.
- `src/core/config/atmosphere.ts`: six new snow guard knobs. The preset factory
  passes this water configuration to wreck particles; shared uniform creation
  keeps their guard consistent with permanent snow. No content/schema changes.

## Calculations and method

All 13 sites, four tiers and both composed free-dive/near-site mission openings
were sampled: 104 opening records. Fixtures load actual tile heights, missions,
POIs and procedural prop bounds, then apply the actual preset update to the
camera-depth atmosphere sample, following the 380 test approach. External GLB
assets are filtered out for headless tests, so those prop bounds are not covered.

The reference viewport is a 720 px drawing buffer, 16:9 aspect and the shipped
62° FOV. Projection scale `S = H / (2 tan(FOV/2)) = 599.14 px/m`. Old diameter:

`D = clamp(0.14 × (0.35 + 1.6s²) × (1 + 0.7L) × S / max(1, viewDepth), 1, 18)`.

`B = 0.22 + 0.78 × min(1, ambient/1.5) + 2.6L` is a **linear colour multiplier**,
not measured screenshot luminance. Centre alpha is
`edge × admittedSeed × (0.55 + 0.45 exp(-(fog × viewDepth)²)) × (0.5 + 0.5L)`.
The table uses maximum admitted seed `s = min(1, density)`, full lamp weight
`L=1`, no wrapping-edge fade and 20 m view/radial distance. This is a conservative
standardised size/lighting envelope, not a claim that a given lamp illuminates
all those points. Raw colour is `uColor × B`; tone mapping, bloom and blending
change the rendered pixel value.

For radial distance <=6 m, new diameter <=2, alpha <=0.12 and B<=0.65.
Smoothstep from 6 to 12 m blends the caps to their normal values. Perspective
still uses view-axis depth; the guard uses Euclidean distance to cover off-axis
foreground points. Tests also exercise 1440/2160 px buffers, lamp weights
0/0.5/1 and points near the clipping plane. These are buffer pixels: higher DPR
makes the same ceiling smaller in CSS pixels.

## Per-site and per-tier permanent-snow envelope

Free-dive openings below. L/M/H/U are Low/Medium/High/Ultra. Pool counts are
unchanged; density gates those pools. B0 is the unlit multiplier; B1 is fully
lamp-lit. At 20 m, alpha and brightness are unchanged by the new guard.

| Site                 | Tier |  Pool | Density |    B0 |    B1 | Alpha at 20 m | Diameter at 20 m, old → new px |
| -------------------- | ---- | ----: | ------: | ----: | ----: | ------------: | -----------------------------: |
| titanic              | L    |   600 |   0.800 | 1.000 | 3.600 |        0.9998 |                    9.80 → 6.00 |
| titanic              | M    | 3,000 |   0.800 | 1.000 | 3.600 |        0.9998 |                    9.80 → 6.00 |
| titanic              | H    | 9,000 |   0.800 | 1.000 | 3.600 |        0.9998 |                    9.80 → 6.00 |
| titanic              | U    | 9,000 |   0.800 | 1.000 | 3.600 |        0.9998 |                    9.80 → 6.00 |
| challenger-deep      | L    |   600 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| challenger-deep      | M    | 3,000 |   0.320 | 0.271 | 2.871 |        0.9996 |                    3.66 → 3.66 |
| challenger-deep      | H    | 9,000 |   0.320 | 0.271 | 2.871 |        0.9996 |                    3.66 → 3.66 |
| challenger-deep      | U    | 9,000 |   0.320 | 0.271 | 2.871 |        0.9996 |                    3.66 → 3.66 |
| lost-city            | L    |   600 |   0.848 | 1.000 | 3.600 |        0.9997 |                   10.71 → 6.00 |
| lost-city            | M    | 3,000 |   0.848 | 1.000 | 3.600 |        0.9997 |                   10.70 → 6.00 |
| lost-city            | H    | 9,000 |   0.848 | 1.000 | 3.600 |        0.9997 |                   10.71 → 6.00 |
| lost-city            | U    | 9,000 |   0.848 | 1.000 | 3.600 |        0.9997 |                   10.71 → 6.00 |
| monterey-canyon      | L    |   600 |   0.435 | 1.000 | 3.600 |        0.9999 |                    4.65 → 4.65 |
| monterey-canyon      | M    | 3,000 |   0.434 | 1.000 | 3.600 |        0.9999 |                    4.65 → 4.65 |
| monterey-canyon      | H    | 9,000 |   0.434 | 1.000 | 3.600 |        0.9999 |                    4.65 → 4.65 |
| monterey-canyon      | U    | 9,000 |   0.434 | 1.000 | 3.600 |        0.9999 |                    4.65 → 4.65 |
| endurance            | L    |   600 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| endurance            | M    | 3,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| endurance            | H    | 9,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| endurance            | U    | 9,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| axial-seamount-ashes | L    |   600 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| axial-seamount-ashes | M    | 3,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| axial-seamount-ashes | H    | 9,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| axial-seamount-ashes | U    | 9,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| hudson-canyon        | L    |   600 |   0.811 | 0.320 | 2.920 |        0.9998 |                   10.00 → 6.00 |
| hudson-canyon        | M    | 3,000 |   0.811 | 0.320 | 2.920 |        0.9998 |                   10.00 → 6.00 |
| hudson-canyon        | H    | 9,000 |   0.811 | 0.320 | 2.920 |        0.9998 |                   10.00 → 6.00 |
| hudson-canyon        | U    | 9,000 |   0.811 | 0.320 | 2.920 |        0.9998 |                   10.00 → 6.00 |
| kamaehuakanaloa      | L    |   600 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| kamaehuakanaloa      | M    | 3,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| kamaehuakanaloa      | H    | 9,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| kamaehuakanaloa      | U    | 9,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| beebe-vent-field     | L    |   600 |   0.800 | 1.000 | 3.600 |        0.9998 |                    9.80 → 6.00 |
| beebe-vent-field     | M    | 3,000 |   0.800 | 1.000 | 3.600 |        0.9998 |                    9.80 → 6.00 |
| beebe-vent-field     | H    | 9,000 |   0.800 | 1.000 | 3.600 |        0.9998 |                    9.80 → 6.00 |
| beebe-vent-field     | U    | 9,000 |   0.800 | 1.000 | 3.600 |        0.9998 |                    9.80 → 6.00 |
| great-blue-hole      | L    |   600 |   0.368 | 0.908 | 3.508 |        1.0000 |                    4.04 → 4.04 |
| great-blue-hole      | M    | 3,000 |   0.360 | 0.914 | 3.514 |        1.0000 |                    3.97 → 3.97 |
| great-blue-hole      | H    | 9,000 |   0.360 | 0.914 | 3.514 |        1.0000 |                    3.97 → 3.97 |
| great-blue-hole      | U    | 9,000 |   0.360 | 0.914 | 3.514 |        1.0000 |                    3.97 → 3.97 |
| bismarck             | L    |   600 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| bismarck             | M    | 3,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| bismarck             | H    | 9,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| bismarck             | U    | 9,000 |   0.800 | 0.314 | 2.914 |        0.9998 |                    9.80 → 6.00 |
| hunga-tonga-caldera  | L    |   600 |   0.966 | 0.409 | 3.009 |        0.9999 |                   13.15 → 6.00 |
| hunga-tonga-caldera  | M    | 3,000 |   0.967 | 0.409 | 3.009 |        0.9999 |                   13.15 → 6.00 |
| hunga-tonga-caldera  | H    | 9,000 |   0.967 | 0.409 | 3.009 |        0.9999 |                   13.15 → 6.00 |
| hunga-tonga-caldera  | U    | 9,000 |   0.967 | 0.409 | 3.009 |        0.9999 |                   13.15 → 6.00 |
| blake-plateau-corals | L    |   600 |   0.863 | 0.350 | 2.950 |        0.9999 |                   10.99 → 6.00 |
| blake-plateau-corals | M    | 3,000 |   0.863 | 0.350 | 2.950 |        0.9999 |                   11.00 → 6.00 |
| blake-plateau-corals | H    | 9,000 |   0.863 | 0.350 | 2.950 |        0.9999 |                   11.00 → 6.00 |
| blake-plateau-corals | U    | 9,000 |   0.863 | 0.350 | 2.950 |        0.9999 |                   11.00 → 6.00 |

Mission envelopes match the free-dive rows to the shown precision except the
following openings, whose camera depths differ substantially. Titanic's mission
also changes projected point distribution, which the clutter table captures.

| Site            | Tier | Density |    B0 |    B1 | Alpha at 20 m | Diameter at 20 m, old → new px |
| --------------- | ---- | ------: | ----: | ----: | ------------: | -----------------------------: |
| monterey-canyon | L    |   0.180 | 1.000 | 3.600 |        1.0000 |                    2.86 → 2.86 |
| monterey-canyon | M    |   0.180 | 1.000 | 3.600 |        1.0000 |                    2.86 → 2.86 |
| monterey-canyon | H    |   0.180 | 1.000 | 3.600 |        1.0000 |                    2.86 → 2.86 |
| monterey-canyon | U    |   0.180 | 1.000 | 3.600 |        1.0000 |                    2.86 → 2.86 |
| great-blue-hole | L    |   0.915 | 0.540 | 3.140 |        0.9999 |                   12.05 → 6.00 |
| great-blue-hole | M    |   0.916 | 0.540 | 3.140 |        0.9999 |                   12.06 → 6.00 |
| great-blue-hole | H    |   0.915 | 0.540 | 3.140 |        0.9999 |                   12.05 → 6.00 |
| great-blue-hole | U    |   0.915 | 0.540 | 3.140 |        0.9999 |                   12.05 → 6.00 |

Challenger Deep's Low density is 0.8, versus 0.32 on higher tiers: the existing
Low preset path skips visual trench modulation. Monterey's reduced density
already suppresses large admitted seeds. Neither behaviour was changed.

## Which sites had the worst clutter?

For **permanent snow alone**, the largest High/Ultra lower-third glare-area
proxies are **Lost City (289.7), Beebe (272.2), Titanic (242.0)**. Low's worst
is Lost City; Medium's worst is Titanic's mission opening. Hunga Tonga has the
largest standardised admitted 20 m flakes (13.15 px before the fix), but lower
ambient brightness than the filled hero sites.

The following proxy replays deterministic seed positions and elapsed=0 GPU
wrapping/sway, the real camera and default Arcade Enhanced lamp cone/range,
with currents off. It includes points whose projected centres fall inside the
frustum's lower third. It sums `diameter² × centreAlpha × linearMultiplier`,
without sprite-colour luminance or Gaussian integration. **Depth-buffer occlusion,
post effects and other particle systems are excluded.** Values are relative
input estimates, not pixel counts or measured screenshot brightness. Each tier
shows the worse of its free/mission openings before the fix, then that same
opening after the fix. High and Ultra have the same snow pool/configuration.

| Site                 | Low proxy, old → new | Medium proxy, old → new | High/Ultra proxy, old → new |
| -------------------- | -------------------: | ----------------------: | --------------------------: |
| titanic              |          12.9 → 12.9 |             97.6 → 97.6 |               242.0 → 242.0 |
| challenger-deep      |            8.3 → 8.3 |               3.7 → 3.7 |                 14.3 → 14.3 |
| lost-city            |          33.6 → 33.6 |             89.4 → 88.3 |               289.7 → 276.1 |
| monterey-canyon      |            5.3 → 5.3 |             32.8 → 32.8 |                137.9 → 65.6 |
| endurance            |            2.1 → 2.1 |             22.0 → 22.0 |                 62.9 → 60.2 |
| axial-seamount-ashes |            3.5 → 3.5 |             21.0 → 21.0 |                 83.8 → 58.4 |
| hudson-canyon        |            5.3 → 5.3 |             24.2 → 24.2 |                 73.1 → 66.1 |
| kamaehuakanaloa      |            4.8 → 4.8 |             17.3 → 17.3 |                108.3 → 70.3 |
| beebe-vent-field     |          11.1 → 11.1 |             94.4 → 91.2 |               272.2 → 252.7 |
| great-blue-hole      |          14.5 → 14.5 |             49.6 → 49.6 |               164.9 → 162.1 |
| bismarck             |            4.4 → 4.4 |             25.9 → 25.9 |                104.7 → 73.2 |
| hunga-tonga-caldera  |            7.4 → 7.4 |             45.4 → 45.4 |               135.1 → 132.9 |
| blake-plateau-corals |            4.8 → 4.8 |             33.4 → 33.4 |                 89.7 → 89.7 |

Many opening proxies are unchanged: they contain no lower-third snow large
or close enough to trigger the caps. Titanic's High free-dive snow proxy falls
233.3 → 219.9, while its mission snow proxy stays 242.0. This is evidence that
capping permanent snow alone cannot certify elimination of Titanic's large-disc
clutter; it is why the wreck layers were audited and received the near guard.

**Titanic is the worst wreck-particle brightness risk.** At 20 m, the maximum
haze diameter is 46.13 px and mote diameter 15.73 px. Their respective raw
centre-alpha bounds are 0.12/0.30, and their maximum linear multiplier is 16.81.
Endurance/Bismarck have the same diameter bounds, alpha 0.22/0.50 and multiplier
1.81. This comparison is a conservative envelope using maximum size and
maximum alpha separately; haze's seed/band fraction need not attain both in the
same particle. Actual fog/edge fades reduce alpha further.

| Wreck site | Tier | Haze / mote pool | Haze / mote max diameter at 20 m | Haze / mote alpha bound | Linear multiplier bound |
| ---------- | ---- | ---------------: | -------------------------------: | ----------------------: | ----------------------: |
| titanic    | M    |    4,500 / 2,100 |                    46.13 / 15.73 |             0.12 / 0.30 |                   16.81 |
| titanic    | H/U  |    9,000 / 4,200 |                    46.13 / 15.73 |             0.12 / 0.30 |                   16.81 |
| endurance  | M    |    4,500 / 1,050 |                    46.13 / 15.73 |             0.22 / 0.50 |                    1.81 |
| endurance  | H/U  |    9,000 / 2,100 |                    46.13 / 15.73 |             0.22 / 0.50 |                    1.81 |
| bismarck   | M    |    4,500 / 1,400 |                    46.13 / 15.73 |             0.22 / 0.50 |                    1.81 |
| bismarck   | H/U  |    9,000 / 2,800 |                    46.13 / 15.73 |             0.22 / 0.50 |                    1.81 |

Low draws no wreck haze/motes. All emitted wreck layers now share the 6 m
2 px / 0.12 alpha / 0.65 multiplier guard. Their broad 20 m haze is deliberately
preserved: a future visual review may still find that layer too bright at
12–30 m. That can be tuned separately without lowering terrain ambient floors.
The near-black far field noted in the golden review remains outside this fix.

## Verification and remaining limits

- Added `tests/unit/marineSnowReadability.test.ts`: 53 tests, including all 52
  site/tier combinations and both openings. Bounds cover projected sizes,
  centre alpha, linear brightness, seed admission, lit/unlit particles,
  off-axis foreground distances and three buffer heights. Wreck cases check
  the actual emitted materials and their foreground bounds. Shader-source and
  uniform assertions tie the CPU mirrors to the corresponding shader formulas.
- Focused snow + 380 suite: **63 tests passed** after the final wreck fix.
- Initial `GATES_CONFIG_MODE=writable PW_PORT=4460 PW_OUTDIR=dist-snow-audit tools/gates.sh`:
  config/build, unit, Python, strict content, attribution and Prettier passed;
  browser smoke and project-base failed to start their preview servers.
- A temporary writable native Vite config avoided the dependency-cache EROFS;
  the preview then failed with `listen EPERM: operation not permitted
127.0.0.1:4460`. A smoke/atmosphere/F1-ocean browser retry therefore could not
  reach a browser-rendered frame. Approval escalation is unavailable here.
- Final `GATES_CONFIG_MODE=writable PW_PORT=4460 tools/gates.sh --no-e2e`:
  **all static gates passed**, with **108 unit files / 1,209 tests** including
  the 380 floors and spawn/readability assertions. Typecheck and diff whitespace
  checks also passed. Browser gates and fresh screenshot review remain unverified.

The tests bound shader inputs; they do not prove GPU rasterisation, final pixel
luminance, perceived first-ten-second readability or the appearance of non-snow
particles. Review Titanic/Lost City/Beebe and the other openings visually on a
machine that can start the preview before claiming the golden-shot complaint
fully resolved.

Reproduce the numerical data (writes an ignored JSON file with all 104 records):

```bash
mkdir -p .cache
SNOW_AUDIT=1 npm test -- --configLoader runner --cache=false tests/unit/marineSnowReadability.test.ts
# .cache/snow-audit-measurements.json
```

Logs: `.cache/snow-audit-unit.log`, `.cache/snow-audit-gates.log`,
`.cache/snow-audit-final-gates.log`, and `.cache/snow-audit-browser.log`.
