/**
 * Central tuning constants. Everything a designer might want to twiddle lives
 * here rather than scattered through the modules. Values are SI (metres,
 * seconds, radians unless a name says Deg).
 */

export interface SubmarineConfig {
  /** Forward thrust acceleration at full throttle (m/s^2). */
  thrustAccel: number;
  /** Reverse is deliberately weaker. */
  reverseAccel: number;
  /** Vertical acceleration available from the ballast system (m/s^2). */
  ballastAccel: number;
  /** Yaw / pitch rate at full input (rad/s). */
  yawRate: number;
  pitchRate: number;
  /** Hard clamp on pitch so the sub can never flip (radians). */
  maxPitch: number;
  /**
   * Quadratic drag coefficient k in `a_drag = -k * |v| * v` (1/m).
   * Terminal speed under thrust T is sqrt(T / k).
   */
  dragLinear: number;
  dragQuadratic: number;
  /** Extra drag applied to vertical motion (the hull is not streamlined that way). */
  verticalDragScale: number;
  /**
   * Residual buoyancy acceleration with neutral ballast (m/s^2). Slightly
   * positive so an idle sub drifts gently upward, like a real trimmed boat.
   */
  buoyancyAccel: number;
  /** Speed above which we clamp, as a safety net (m/s). */
  maxSpeed: number;
  /** Depth (negative metres) at which the hull fails. */
  crushDepth: number;
  /** Fraction of crush depth at which the HUD starts warning. */
  crushWarnRatio: number;
  /** Collision sphere radius around the sub's origin (m). */
  hullRadius: number;
  /** Minimum clearance kept above the seabed (m). */
  seabedClearance: number;
  /** Fraction of speed retained after scraping the bottom. */
  collisionSpeedPenalty: number;

  // --- A3: feel ------------------------------------------------------------
  /**
   * Throttle response curve exponent. `effective = sign(t) * |t|^n`. n > 1 gives
   * fine control near centre (station-keeping) while still reaching full thrust.
   */
  thrustCurve: number;
  /** Multiplier applied to thrust (and ballast) while the boost key is held. */
  boostMultiplier: number;
  /**
   * Angular dynamics. Rather than snapping the rotation rate to the stick, the
   * rate is itself integrated, so the boat has rotational inertia: it takes
   * ~`1/damping` seconds to spin up and coasts round after you let go.
   */
  yawAccel: number;
  yawDamping: number;
  pitchAccel: number;
  pitchDamping: number;
  /** Peak visual-only bank angle when turning hard at cruise speed (radians). */
  maxBankAngle: number;
  /** Half-life of the roll spring, seconds. */
  bankHalfLife: number;
  /** Speed (m/s) at which banking reaches its full amplitude. */
  bankFullSpeed: number;
  /**
   * Ballast inertia: the tank does not fill instantly. Half-life in seconds for
   * the commanded ballast to reach the stick position.
   */
  ballastHalfLife: number;
  /**
   * Neutral-buoyancy trim. With no ballast input the boat is pulled back toward
   * its trim depth rate of zero with this restoring acceleration per m/s of
   * residual vertical speed; it is what makes "hands off" feel like hovering
   * rather than drifting. 0 disables it.
   */
  trimStrength: number;

  // --- A3: hull integrity --------------------------------------------------
  /** Which entry of {@link hullClasses} is fitted. Sets the crush depth. */
  hullClass: string;
  hullClasses: Record<string, HullClass>;
  /** Impact speed (m/s) that produces a full 1.0 hull-stress spike. */
  impactStressSpeed: number;
  /** Half-life (s) of the impact component of hull stress. */
  hullStressHalfLife: number;
  /** Hull stress below which no event is emitted (noise gate). */
  hullStressEventThreshold: number;

  // --- A3: emergency blow --------------------------------------------------
  /** Upward acceleration during an emergency blow (m/s^2). */
  emergencyBlowAccel: number;
  /** Seconds the pilot's controls stay locked out during the blow. */
  emergencyBlowLockSeconds: number;

  // --- A3: sim speed -------------------------------------------------------
  /** Selectable sim-speed multipliers. Must be positive integers. */
  simSpeeds: number[];
  /** Index into {@link simSpeeds} used at spawn. */
  defaultSimSpeedIndex: number;
}

/** A hull rating: how deep this boat may legally go before it fails. */
export interface HullClass {
  name: string;
  /** Depth (negative metres) at which the hull fails. */
  crushDepth: number;
}

/**
 * Graphics quality tier. `medium` is the floor we hold 60 fps at 1080p on
 * (Apple M-series); `high` targets a discrete desktop GPU; `low` is the
 * integrated-Intel escape hatch. See docs/terrain.md and plan/DECISIONS.md.
 */
export type GraphicsTier = 'low' | 'medium' | 'high';

/** Per-tier knobs for the terrain renderer. */
export interface TerrainTier {
  /** Vertex subdivisions per source bathymetry cell edge. 1 = raw data resolution. */
  detailSubdiv: number;
  /** Octaves of detail noise evaluated per vertex. */
  detailOctaves: number;
  /** Edge length of the generated seabed textures, in pixels. */
  textureSize: number;
  /** Multiplier on the LOD switch distances (higher = keep detail further out). */
  lodDistanceScale: number;
}

export interface TerrainConfig {
  /** Source cells per chunk edge. 64 keeps a subdivided chunk inside 16-bit indices. */
  chunkCells: number;
  /**
   * Vertical exaggeration. 1.0 = true scale. Real bathymetry over a 40 km tile
   * is quite flat; a small exaggeration reads better without lying much.
   */
  verticalExaggeration: number;
  /** Depth colour ramp, deepest first. `depth` is metres (negative). */
  colorRamp: Array<{ depth: number; color: number }>;

  // --- procedural detail layer (docs/terrain.md) ---------------------------
  /**
   * Master multiplier on the procedural detail displacement.
   * 0 = "pure data" mode: the mesh is exactly the survey grid. Exposed in the
   * settings screen.
   */
  detailStrength: number;
  /** Peak detail amplitude as a fraction of the local cell size. */
  detailAmplitudeCells: number;
  /** Wavelength of the first detail octave, in source cells. */
  detailWavelengthCells: number;
  /** Detail amplitude multiplier on flat sediment (see detailSlopeLoDeg). */
  detailSedimentFactor: number;
  /** Below this slope the seabed counts as settled sediment. */
  detailSlopeLoDeg: number;
  /** Above this slope the seabed counts as scoured rock. */
  detailSlopeHiDeg: number;
  /** Seed for the detail noise. Changing it reshuffles every tile's detail. */
  detailSeed: number;

  // --- chunk LOD -----------------------------------------------------------
  /** Camera distances (m) at which a chunk drops to LOD 1 and LOD 2. */
  lodDistancesM: [number, number];
  /** How far each chunk's perimeter skirt hangs down, in metres. */
  skirtDepthM: number;

  // --- triplanar material --------------------------------------------------
  /** Metres per repeat of the seabed albedo textures. */
  materialTextureScaleM: number;
  /** Metres per repeat of the detail slope (normal) texture. */
  materialGradScaleM: number;
  /** Strength of the normal-map detail. 0 = geometry normals only. */
  materialNormalStrength: number;
  /** Below this slope the material is pure sediment. */
  rockSlopeLoDeg: number;
  /** Above this slope the material is pure rock. */
  rockSlopeHiDeg: number;
  /** Depth (m, negative) above which the bed is pure sand. */
  sandDepthShallow: number;
  /** Depth (m, negative) below which there is no sand at all. */
  sandDepthDeep: number;

  tiers: Record<GraphicsTier, TerrainTier>;
}

/** The four depth bands of docs/art-direction.md §0, shallowest first. */
export type DepthBandName = 'surface' | 'twilight' | 'midnight' | 'abyss';

/**
 * One stop of the depth-driven light model. Stops are interpolated smoothly by
 * camera depth (never hard-cut), so 180 m and 220 m differ only slightly.
 * Colours and fog densities are the published art-direction values.
 */
export interface DepthBandSpec {
  name: DepthBandName;
  /** Depth (negative metres) at which this stop is reached exactly. */
  depth: number;
  /** Water/surface colour at this stop. */
  waterColor: number;
  /** Fog and scene-background colour. */
  fogColor: number;
  /**
   * FogExp2 coefficient *as published in docs/art-direction.md §0*. It is
   * multiplied by {@link AtmosphereConfig.fogDensityScale} before use -- see
   * docs/atmosphere.md for why the literal value is a close-quarters number.
   */
  fogDensity: number;
  ambientColor: number;
  ambientIntensity: number;
  /** Filtered-sunlight directional intensity. Zero below the photic zone. */
  sunIntensity: number;
  /** Colour-grade applied by the post stack inside this band. */
  grade: { tint: number; gain: number; saturation: number; vignette: number };
  /** Marine-snow density multiplier and drift speed (m/s) in this band. */
  snowDensity: number;
  snowDriftMps: number;
}

/** Per-tier atmosphere knobs. `low` is fog + headlights only. */
export interface AtmosphereTier {
  /** Run the post stack at all. */
  post: boolean;
  /** Radial god rays in the post pass (only ever above `causticsEndM`). */
  godRays: boolean;
  /** Marine-snow particle budget. 0 disables the field. */
  snowCount: number;
  /** Caustic projector texture size in pixels. 0 disables caustics. */
  causticsSize: number;
  /** Draw the soft headlight cone volumes. */
  headlightCones: boolean;
  /** Chromatic-aberration strength multiplier. */
  aberration: number;
}

export interface WaterConfig {
  // --- superseded by `bands` (A2); kept so nothing that still reads them
  // --- breaks. Safe to delete once no module references them.
  /** @deprecated use {@link WaterConfig.bands}. */
  fogDensityShallow: number;
  /** @deprecated use {@link WaterConfig.bands}. */
  fogDensityDeep: number;
  /** @deprecated use {@link WaterConfig.bands}. */
  fogDeepAt: number;
  /** @deprecated use {@link WaterConfig.bands}. */
  deepColor: number;
  /** @deprecated use {@link WaterConfig.bands}. */
  ambientIntensity: number;

  surfaceColor: number;
  headlightIntensity: number;
  headlightDistance: number;
  headlightAngleDeg: number;

  // --- A2: depth-driven atmosphere (docs/atmosphere.md) --------------------
  /** Depth-band stops, shallowest first. Must be ordered and non-empty. */
  bands: DepthBandSpec[];
  /**
   * Global multiplier on every band's published fog density. The art-direction
   * coefficients (0.010-0.050) describe a 20-200 m sight line; this game's
   * chase camera sits 123 m behind the boat and navigation needs kilometre
   * sight lines over a 25-40 km tile, so the shipped default scales them down
   * while keeping the 5:1 surface-to-abyss *ratio* that sells depth. Set to 1
   * for the literal art-direction look (usable in first person).
   */
  fogDensityScale: number;
  /** Colour of the headlight beam (art direction: slightly warm white). */
  headlightColor: number;
  /** Lateral separation of the two headlights, metres. */
  headlightSeparationM: number;
  /** Peak opacity of the fake volumetric cone around each headlight. */
  headlightConeOpacity: number;
  /** Caustics are full strength above this depth and gone below `causticsEndM`. */
  causticsStartM: number;
  causticsEndM: number;
  /** Caustic projector brightness, projection footprint (m) and frames/second. */
  causticsIntensity: number;
  causticsFootprintM: number;
  causticsFps: number;
  /** Edge of the wrapping marine-snow box around the camera, metres. */
  snowBoxM: number;
  /** Marine-snow point size in metres (size-attenuated). */
  snowSizeM: number;
  /** The sea surface is only drawn when the camera is shallower than this. */
  surfaceVisibleAboveM: number;
  /** Sea-surface wave amplitude (m) and wavelength (m) for the Fresnel lid. */
  surfaceWaveAmpM: number;
  surfaceWaveLengthM: number;
  /** Post: base chromatic aberration in UV units, and god-ray strength. */
  aberrationStrength: number;
  godRayStrength: number;
  tiers: Record<GraphicsTier, AtmosphereTier>;
}

export interface CameraConfig {
  /** Chase offset in the sub's local frame (x right, y up, z back). */
  chaseOffset: { x: number; y: number; z: number };
  /** Exponential smoothing half-life in seconds (lower = snappier). */
  positionHalfLife: number;
  rotationHalfLife: number;
  fovDeg: number;
  near: number;
  far: number;
  /** Eye offset used in first-person mode. */
  firstPersonOffset: { x: number; y: number; z: number };
  /**
   * Metres the chase camera's aim point is dropped below the boat's forward
   * axis. Without it the camera stares at the fogged horizon and the seabed
   * only occupies a sliver at the bottom of the frame.
   */
  chaseLookDrop: number;

  // --- A3: rig -------------------------------------------------------------
  /**
   * Distance ahead of the boat the camera aims, per mode. Longer look-ahead in
   * first person reads as "looking where you are going" rather than at the bow.
   */
  chaseLookAhead: number;
  firstPersonLookAhead: number;
  /**
   * Extra look-ahead metres per m/s of speed. Pulls the aim point forward when
   * you are moving fast, which is what makes speed legible in fog.
   */
  lookAheadPerSpeed: number;
  /** Metres the camera is kept above the seabed; it never clips through. */
  terrainClearance: number;
  /** Peak camera shake displacement (m) at hull stress 1.0. */
  shakeAmplitude: number;
  /** Shake decay half-life (s) and oscillation frequency (Hz). */
  shakeHalfLife: number;
  shakeFrequency: number;
  /** Fraction of the boat's visual roll the chase camera copies. */
  bankFollow: number;
  /** Photo-mode free orbit: radius and starting elevation (radians). */
  orbitRadius: number;
  orbitElevation: number;
}

export interface AudioConfig {
  /** Overall output gain, 0..1 (applied at the WebAudio master gain node). */
  masterVolume: number;
  /**
   * Shared depth low-pass filter (master -> depthFilter -> destination): the
   * whole mix gets muffled as the sub goes deeper, like sound through water
   * and hull.
   */
  depthLowpassSurfaceHz: number;
  /** Cutoff once depth reaches {@link lowpassFullAt} (heavily muffled). */
  depthLowpassAbyssHz: number;
  /** Depth (negative metres) at which the low-pass reaches its minimum cutoff. */
  lowpassFullAt: number;
  /** Speed of sound in seawater, m/s (real-world value, used for echo timing). */
  sonarSpeedOfSoundMps: number;
  /** Sonar ray-march: max range considered and step size, metres. */
  sonarMaxRangeM: number;
  sonarRayStepM: number;
  /** Depression of the forward sonar beam below horizontal, degrees. */
  sonarBeamDownDeg: number;
  /**
   * Ambient bed layers, shallowest first (band[0].depth should be 0). Each is
   * a sine drone + filtered noise, crossfaded by depth -- see
   * src/audio/DepthBands.ts and docs/audio.md.
   */
  ambientBands: Array<{ depth: number; droneHz: number; noiseMix: number }>;
  /** Thruster loop pitch at zero / full throttle, Hz. */
  thrusterMinHz: number;
  thrusterMaxHz: number;
  /**
   * Hull-creak repeat rate, driven by `sub:hullStress` (cause: "pressure").
   * Gap shrinks from `hullCreakMaxGapS` at stress 0 to `hullCreakMinGapS` at
   * stress 1, so creaks accelerate as the hull nears crush depth.
   */
  hullCreakMinGapS: number;
  hullCreakMaxGapS: number;
  /** Collision-thud loudness gained per m/s of impact speed (sub:collided). */
  collisionThudGainPerMps: number;
}

export interface GameConfig {
  defaultTileId: string;
  /** Graphics quality tier. Override at runtime with `?tier=low|medium|high`. */
  graphicsTier: GraphicsTier;
  submarine: SubmarineConfig;
  terrain: TerrainConfig;
  water: WaterConfig;
  camera: CameraConfig;
  audio: AudioConfig;
  physicsHz: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  defaultTileId: 'titanic',
  graphicsTier: 'medium',
  physicsHz: 60,
  submarine: {
    // Terminal speed under full thrust is the positive root of
    //   thrustAccel = (dragLinear + dragQuadratic * v) * v
    // which for these numbers is ~6.0 m/s, and ~8.4 m/s with boost. Real
    // research submersibles do 1-2 kn; this is the x2-x3 "sim speed"
    // exaggeration the design doc allows, and the simSpeeds multiplier on top
    // of it is what makes a 25 km tile crossable in a sitting.
    thrustAccel: 2.0,
    reverseAccel: 0.9,
    ballastAccel: 3.0,
    yawRate: 0.55, // ~31 deg/s sustained
    pitchRate: 0.45,
    maxPitch: Math.PI / 4, // +/- 45 deg
    dragLinear: 0.09,
    dragQuadratic: 0.04,
    verticalDragScale: 1.8,
    buoyancyAccel: 0.05,
    maxSpeed: 40,
    // Mirrors hullClasses[hullClass].crushDepth; kept as a plain field because
    // it is the value the physics and the HUD actually read.
    crushDepth: -4500,
    crushWarnRatio: 0.9,
    hullRadius: 8,
    seabedClearance: 4,
    collisionSpeedPenalty: 0.35,

    thrustCurve: 1.6,
    boostMultiplier: 1.8,
    // damping ~2.8 => the boat settles into a turn in about a third of a second
    // and carries a little rotation after you release the stick.
    yawAccel: 2.8,
    yawDamping: 2.8,
    pitchAccel: 3.2,
    pitchDamping: 3.2,
    maxBankAngle: 0.42, // ~24 deg
    bankHalfLife: 0.35,
    bankFullSpeed: 4.0,
    ballastHalfLife: 0.5,
    trimStrength: 0.35,

    hullClass: 'B',
    hullClasses: {
      // Depth ratings loosely after real classes: a coastal tourist sub, a
      // deep-ocean research boat (Alvin/Nautile territory) and a full-ocean-
      // depth vehicle (Limiting Factor). Unlocked by discoveries later.
      A: { name: 'Class A - coastal', crushDepth: -1000 },
      B: { name: 'Class B - deep ocean', crushDepth: -4500 },
      C: { name: 'Class C - full ocean depth', crushDepth: -11000 },
    },
    impactStressSpeed: 6.0,
    hullStressHalfLife: 0.9,
    hullStressEventThreshold: 0.05,

    emergencyBlowAccel: 6.0,
    emergencyBlowLockSeconds: 5,

    simSpeeds: [1, 2, 3],
    defaultSimSpeedIndex: 0,
  },
  terrain: {
    // 64 source cells x subdiv 2 = a 129x129 vertex chunk, which still fits in
    // 16-bit indices and gives the LOD selector something to actually choose
    // between on a 25 km tile.
    chunkCells: 64,
    verticalExaggeration: 1.0,
    /**
     * Deepest -> shallowest, interpolated linearly in RGB.
     *
     * NOTE: these are ALBEDO values, not final pixel colours. Fog and the depth
     * falloff in Water.ts already darken the scene a great deal, so even the
     * abyssal end of the ramp is kept at a mid luminance -- a near-black albedo
     * down there renders as a featureless black screen.
     */
    colorRamp: [
      { depth: -6000, color: 0x5d7a99 },
      { depth: -4000, color: 0x6a8aa5 },
      { depth: -2500, color: 0x74a0a8 },
      { depth: -1200, color: 0x7bb3a2 },
      { depth: -400, color: 0x86c090 },
      { depth: -120, color: 0xa8c47e },
      { depth: -20, color: 0xcdbe86 },
      { depth: 0, color: 0xe0cf9c },
      { depth: 300, color: 0xb39a72 },
    ],

    detailStrength: 1.0,
    // 15 % of a cell: at Titanic's 46 m cells that is +-6.9 m on rock, which is
    // enough to break the facets without inventing a landform.
    detailAmplitudeCells: 0.15,
    // 3 cells for the first octave; with subdiv 2 the third octave lands at
    // 0.75 cells, i.e. 1.5 vertex spacings -- just above the Nyquist limit.
    detailWavelengthCells: 3.0,
    detailSedimentFactor: 0.3,
    detailSlopeLoDeg: 4,
    detailSlopeHiDeg: 25,
    detailSeed: 20260917,

    lodDistancesM: [1400, 4200],
    // Comfortably more than the worst-case LOD disagreement (one detail
    // amplitude plus half a coarse cell of height error).
    skirtDepthM: 60,

    materialTextureScaleM: 34,
    materialGradScaleM: 7,
    materialNormalStrength: 0.7,
    rockSlopeLoDeg: 18,
    rockSlopeHiDeg: 32,
    sandDepthShallow: -120,
    sandDepthDeep: -260,

    tiers: {
      low: { detailSubdiv: 1, detailOctaves: 2, textureSize: 128, lodDistanceScale: 0.55 },
      medium: { detailSubdiv: 2, detailOctaves: 3, textureSize: 256, lodDistanceScale: 1.0 },
      high: { detailSubdiv: 3, detailOctaves: 4, textureSize: 512, lodDistanceScale: 1.8 },
    },
  },
  water: {
    fogDensityShallow: 0.0006,
    // Tuned so the seabed stays legible from the default chase camera: visual
    // range is roughly 2/density, i.e. ~1.2 km in the deep.
    fogDensityDeep: 0.0007,
    fogDeepAt: -3000,
    surfaceColor: 0x2e6f96,
    // Not black: the fog colour is also the horizon colour, and pure black
    // makes the terrain silhouette disappear entirely.
    deepColor: 0x17384a,
    ambientIntensity: 2.4,
    // Spotlight decay is 1 (inverse-linear), so the effective brightness is
    // roughly intensity / distance_in_metres. ~700 gives a readable pool of
    // light a few hundred metres ahead without blowing out the near seabed.
    headlightIntensity: 1100,
    headlightDistance: 2000,
    headlightAngleDeg: 38,

    // Colours, fog coefficients and band edges are verbatim from
    // docs/art-direction.md §0. Light intensities and grades are A2's.
    bands: [
      {
        name: 'surface',
        depth: 0,
        waterColor: 0x3e9db8,
        fogColor: 0x5aafc4,
        fogDensity: 0.01,
        ambientColor: 0xbfe4e8,
        ambientIntensity: 3.0,
        // Warm sun highlight #FFE9B8 lives on the directional light.
        sunIntensity: 3.2,
        grade: { tint: 0xeaf6ff, gain: 1.0, saturation: 1.06, vignette: 0.22 },
        snowDensity: 0.35,
        snowDriftMps: 0.35,
      },
      {
        name: 'twilight',
        depth: -20,
        waterColor: 0x1c5c74,
        fogColor: 0x2a5568,
        fogDensity: 0.02,
        ambientColor: 0x86b9c9,
        ambientIntensity: 1.5,
        sunIntensity: 1.1,
        grade: { tint: 0xbfe4f2, gain: 0.98, saturation: 1.0, vignette: 0.3 },
        snowDensity: 0.7,
        snowDriftMps: 0.25,
      },
      {
        name: 'midnight',
        depth: -200,
        waterColor: 0x0a2c3d,
        fogColor: 0x0e2530,
        fogDensity: 0.035,
        // Near-black: below ~200 m essentially all light is borrowed from the
        // sub's own rig (art-direction §6).
        ambientColor: 0x2e4e5e,
        ambientIntensity: 0.4,
        sunIntensity: 0.06,
        grade: { tint: 0x9fd4e8, gain: 0.95, saturation: 0.92, vignette: 0.4 },
        snowDensity: 1.0,
        snowDriftMps: 0.15,
      },
      {
        name: 'abyss',
        depth: -1000,
        waterColor: 0x040f16,
        fogColor: 0x050c10,
        fogDensity: 0.05,
        ambientColor: 0x1a2a33,
        // Not literally zero: a sliver of ambient keeps the terrain silhouette
        // readable outside the headlight pool instead of a black rectangle.
        ambientIntensity: 0.18,
        sunIntensity: 0,
        grade: { tint: 0x8fc8e0, gain: 0.92, saturation: 0.85, vignette: 0.52 },
        snowDensity: 0.8,
        snowDriftMps: 0.1,
      },
    ],
    fogDensityScale: 0.02,
    headlightColor: 0xfff3dd,
    headlightSeparationM: 3.2,
    headlightConeOpacity: 0.05,
    causticsStartM: -20,
    causticsEndM: -60,
    causticsIntensity: 2.6,
    causticsFootprintM: 900,
    causticsFps: 12,
    snowBoxM: 160,
    snowSizeM: 0.32,
    surfaceVisibleAboveM: -100,
    surfaceWaveAmpM: 0.9,
    surfaceWaveLengthM: 22,
    aberrationStrength: 0.0016,
    godRayStrength: 0.35,
    tiers: {
      // low = the brief's floor: fog + headlights, nothing else.
      low: {
        post: false,
        godRays: false,
        snowCount: 0,
        causticsSize: 0,
        headlightCones: false,
        aberration: 0,
      },
      medium: {
        post: true,
        godRays: false,
        snowCount: 3000,
        causticsSize: 128,
        headlightCones: true,
        aberration: 1,
      },
      high: {
        post: true,
        godRays: true,
        snowCount: 9000,
        causticsSize: 256,
        headlightCones: true,
        aberration: 1.4,
      },
    },
  },
  camera: {
    chaseOffset: { x: 0, y: 42, z: 115 },
    positionHalfLife: 0.16,
    rotationHalfLife: 0.12,
    fovDeg: 62,
    near: 0.5,
    far: 60000,
    firstPersonOffset: { x: 0, y: 4, z: -12 },
    chaseLookDrop: 55,

    chaseLookAhead: 150,
    firstPersonLookAhead: 300,
    lookAheadPerSpeed: 12,
    terrainClearance: 6,
    shakeAmplitude: 2.2,
    shakeHalfLife: 0.22,
    shakeFrequency: 17,
    bankFollow: 0.55,
    orbitRadius: 90,
    orbitElevation: 0.35,
  },
  audio: {
    masterVolume: 0.6,
    depthLowpassSurfaceHz: 18000,
    depthLowpassAbyssHz: 350,
    lowpassFullAt: -1000,
    sonarSpeedOfSoundMps: 1500,
    sonarMaxRangeM: 2000,
    sonarRayStepM: 10,
    sonarBeamDownDeg: 15,
    // Mirrors the depth-band feel described in docs/atmosphere.md / the master
    // plan (bright near-surface -> near-black by 1,000 m): lower drone pitch
    // and more noise the deeper the band.
    ambientBands: [
      { depth: 0, droneHz: 90, noiseMix: 0.15 },
      { depth: -20, droneHz: 70, noiseMix: 0.25 },
      { depth: -200, droneHz: 55, noiseMix: 0.4 },
      { depth: -1000, droneHz: 40, noiseMix: 0.6 },
    ],
    thrusterMinHz: 55,
    thrusterMaxHz: 140,
    hullCreakMinGapS: 0.5,
    hullCreakMaxGapS: 2.5,
    collisionThudGainPerMps: 0.05,
  },
};

/** Parse a `?tier=` value, falling back to the default tier if unrecognised. */
export function resolveGraphicsTier(
  value: string | null | undefined,
  fallback: GraphicsTier = DEFAULT_CONFIG.graphicsTier,
): GraphicsTier {
  return value === 'low' || value === 'medium' || value === 'high' ? value : fallback;
}

/** Shallow-merge an override into the defaults (one level per section). */
export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    submarine: { ...DEFAULT_CONFIG.submarine, ...overrides.submarine },
    terrain: { ...DEFAULT_CONFIG.terrain, ...overrides.terrain },
    water: { ...DEFAULT_CONFIG.water, ...overrides.water },
    camera: { ...DEFAULT_CONFIG.camera, ...overrides.camera },
    audio: { ...DEFAULT_CONFIG.audio, ...overrides.audio },
  };
}
