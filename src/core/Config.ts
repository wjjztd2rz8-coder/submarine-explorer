/**
 * Central tuning constants. Everything a designer might want to twiddle lives
 * here rather than scattered through the modules. Values are SI (metres,
 * seconds, radians unless a name says Deg).
 */

import { publicUrl } from '../util/publicUrl.js';

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

  // --- fix S (QA-B) --------------------------------------------------------
  /**
   * QA-B #15. When false (the default) the yaw/pitch *input* is divided by the
   * sim-speed multiplier inside each physics tick, so the boat turns at its 1x
   * real-time rate while translation still runs 2x/3x. True restores the
   * Phase A behaviour (turn rate scales with sim speed too).
   */
  simSpeedScalesTurnRate: boolean;
  /**
   * QA-B #2. Free dive fits the lowest hull class whose crush depth clears the
   * tile's deepest cell (`meta.min_m`) by this many metres. Soft: if no class
   * clears it, the deepest class is fitted and the HUD says the margin is thin.
   */
  freeDiveHullMarginM: number;
  /**
   * QA-B #14. The HUD's SEABED PROXIMITY banner: shown below this altitude
   * (hull centre above the seabed; contact is at hullRadius + seabedClearance).
   */
  seabedWarnAltitudeM: number;
  /**
   * ...or when closing on the seabed fast: below `seabedApproachAltitudeM`
   * and less than this many seconds from contact at the current sink rate.
   * This half of the warning is never suppressed near a scan target.
   */
  seabedWarnTimeToContactS: number;
  seabedApproachAltitudeM: number;
  /** QA-B #6. Hull look below 300 m: a faint fresnel rim and an ambient floor. */
  hullRimColor: number;
  hullRimStrength: number;
  hullEmissive: number;
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
  /** Basalt albedo (art-direction §0 `#3B3A3D`) that steep rock blends toward. */
  rockColor: number;
  /** 0..1: how far fully-steep rock is pulled from the depth ramp to `rockColor`. */
  rockColorMix: number;
  /**
   * Resident-vertex budget for the whole tile, skirts excluded. If
   * `cols*rows*subdiv^2` exceeds it, `detailSubdiv` is stepped down (3 -> 2 -> 1)
   * until it fits; `debugString()` reports the downgrade. See docs/terrain.md.
   */
  maxVertices: number;

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

  // --- fix S: scan-target framing (QA-B #6) ---------------------------------
  /**
   * While a scan target is in range (`CameraUpdateOptions.focus`), the chase
   * camera slides this far sideways (to the target's side) and up, so the
   * line of sight to the target clears the boat's own hull.
   */
  focusSideM: number;
  focusRaiseM: number;
  /** Fraction of the aim point pulled toward the focus target (0..1). */
  focusLookBlend: number;
  /** Half-life (s) of the blend in and out of the focus framing. */
  focusHalfLife: number;
  /** Target lateral offset (m, boat frame) needed before the camera swaps sides. */
  focusSideHysteresisM: number;
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

/**
 * Free-dive landmark markers (src/world/Landmarks.ts). Deliberately quiet
 * (art-direction pillar 3, "found, not signposted"): a small depth-tested dot and
 * a fixed-pixel-size label that both fade out as you arrive. Hidden entirely
 * while a mission route is active -- the POI reticle and objectives do that job.
 */
export interface LandmarksConfig {
  /** Metres the marker sits above the landmark's depth / the seabed. */
  markerLiftM: number;
  /** Marker dot radius, metres. */
  markerRadiusM: number;
  markerColor: number;
  markerOpacity: number;
  /** The dot is invisible inside `[0]` m of the camera and fully shown beyond `[1]` m. */
  markerFadeM: [number, number];
  /** On-screen label height in CSS pixels, independent of distance. */
  labelHeightPx: number;
  /** Names longer than this are cut and end in an ellipsis. */
  labelMaxChars: number;
  labelColor: string;
  labelBackground: string;
  /** The label is invisible inside `[0]` m and fully shown beyond `[1]` m. */
  labelFadeM: [number, number];
}

// --- B1: scan & discovery (docs/discovery.md) ------------------------------
export interface ScanConfig {
  /** Seconds of continuous beam time to scan a POI that has no `scan_seconds`. */
  defaultSeconds: number;
  /** Scan radius (m) for a POI that has no `radius_m`. */
  defaultRadiusM: number;
  /**
   * Half-angle of the scan beam, degrees: the angle between `sub.getForward()`
   * and the sub->POI direction must be below this. Generous, because POIs sit
   * on the seabed below the boat and pitch is limited to 45 deg.
   */
  coneHalfAngleDeg: number;
  /** Inside this 3D distance (m) the facing test is waived: you are on top of it. */
  closeRangeM: number;
  /** Progress fraction (0..1) lost per second while a scan is interrupted. */
  decayPerSecond: number;
  /** Upper bound on `scan:progress` emissions per second. */
  progressEventHz: number;
  /** The overlay shows a contact hint from `radius_m * hintRangeFactor` away. */
  hintRangeFactor: number;
  /** Diameter (CSS px) and stroke (CSS px) of the scan progress ring. */
  ringSizePx: number;
  ringStrokePx: number;
  /** Size (CSS px) of the corner-bracket reticle drawn over the target. */
  reticleSizePx: number;
  /** How long the "NEW ENTRY" confirmation stays up, seconds. */
  completeBannerSeconds: number;
  /** `?poi=` debug spawn: horizontal distance from the POI (m), capped to 80% of its radius. */
  spawnDistanceM: number;
  /** `?poi=` debug spawn: compass bearing FROM the POI to the spawn point, degrees. */
  spawnBearingDeg: number;
  /** Extra metres above the sub's own seabed floor when the spawn is clamped. */
  spawnClearanceM: number;
  /** SessionStats ignores a per-frame move longer than this (a teleport/reset). */
  teleportThresholdM: number;
  /** `?debrief=1`: open the debrief this many ms after boot (e2e screenshot hook). */
  debugDebriefDelayMs: number;
}

// --- B4: props (docs/props.md) ---------------------------------------------
export type PropCollisionKind = 'none' | 'sphere' | 'box';
export type ProceduralPropKind = 'hull-block' | 'debris' | 'chimney';
/** Shape of one end of a procedural:hull-block (docs/props.md). */
export type HullEnd = 'prow' | 'cut' | 'rounded';

export interface PropsConfig {
  /** Camera distance (m) inside which a prop draws its full mesh, unless the entry sets `lod_distance_m`. */
  defaultLodDistanceM: number;
  /** Camera distance (m) beyond which a prop is hidden entirely, impostor included. */
  cullDistanceM: number;
  /** A prop is never culled closer than `lod distance * cullLodFactor`, so big LODs still get an impostor band. */
  cullLodFactor: number;
  /** Opacity of the bounding-box silhouette impostor used for GLB models. */
  impostorOpacity: number;
  /** Debris impostor keeps only this many of the largest pieces. */
  debrisImpostorPieces: number;
  /** Fraction of the penetration removed per `collide()` call (1 = rigid push-out). */
  collisionPushStiffness: number;
  /** Fraction of the into-surface velocity removed on contact (1 = no bounce). */
  collisionVelocityDamping: number;
  /** Minimum seconds between `sub:collided` events raised by props. */
  collisionEventCooldownS: number;
  /** Sphere collider radius = mean bbox half-extent x this. */
  sphereColliderFit: number;
  /** Hard cap on props per landmark; extra entries are skipped with a warning. */
  maxProps: number;
  /** Collision used when an entry omits `collision`, by model kind. */
  defaultCollision: Record<ProceduralPropKind | 'model', PropCollisionKind>;
  /** `dimensions_m` used when a procedural entry omits it. */
  defaultDimensionsM: Record<ProceduralPropKind, [number, number, number]>;
  /** procedural:debris piece count and size range (m). */
  debrisMinPieces: number;
  debrisMaxPieces: number;
  debrisMinSizeM: number;
  debrisMaxSizeM: number;
  /** procedural:chimney base radius as a fraction of height when `dimensions_m[0]` is 0. */
  chimneyRadiusFraction: number;
  /** procedural:chimney top radius as a fraction of the base radius. */
  chimneyTopFraction: number;
  /** procedural:hull-block: metres of hull per horizontal repeat of the rust texture. */
  hullTextureRepeatM: number;
  /** procedural:hull-block: width of the keel line as a fraction of the beam (bilge taper). */
  hullKeelFraction: number;
  /** procedural:hull-block end shapes when an entry omits `ends`: [forward (-Z), aft (+Z)]. */
  hullDefaultEnds: [HullEnd, HullEnd];
  /** Prow: length of the pointed entry as a fraction of hull length. */
  hullProwLengthFraction: number;
  /** Prow: waterline taper exponent (1 = straight wedge, 2 = parabola; lower is sharper). */
  hullProwTaperExponent: number;
  /** Prow: how far the stem is set back at the keel (rake), as a fraction of hull height. */
  hullProwRakeFraction: number;
  /** Prow: deck sheer (rise toward the stem) as a fraction of hull height. */
  hullProwSheerFraction: number;
  /** Prow: raised forecastle deck, length as a fraction of hull length. */
  hullForecastleLengthFraction: number;
  /** Prow: forecastle deck height as a fraction of hull height. */
  hullForecastleHeightFraction: number;
  /** Cut end: depth of the ragged break as a fraction of hull length (clamped to 2-12 m). */
  hullCutDepthFraction: number;
  /** Cut end: how far the upper decks sag toward the break, as a fraction of hull height. */
  hullCutCollapseFraction: number;
  /** Cut end: vertex-colour multiplier at the break (dark torn interior), 0-1. */
  hullCutShade: number;
  /** Cut end: vertical spacing of the exposed deck slabs (m). */
  hullDeckSpacingM: number;
  /** Rounded (counter) stern: plan-view length of the curve as a fraction of the beam. */
  hullRoundedLengthFraction: number;
  /** Rounded stern: undercut of the counter at the keel, as a fraction of hull height. */
  hullCounterTuckFraction: number;
  /** Side of the generated canvas textures (px). */
  textureSize: number;
  /** Material base colours (docs/art-direction.md §0, §4). */
  colors: {
    rust: number;
    growth: number;
    basalt: number;
    mineral: number;
    sediment: number;
  };
  /** `?debugProps=1` placement tool steps. */
  debugNudgeM: number;
  debugNudgeFastM: number;
  debugRotateDeg: number;
  /** `?at=lat,lon` debug spawn: minimum clearance above the seabed (m). */
  atSpawnClearanceM: number;
}

/** B3: mission flow (docs/missions.md). */
export interface MissionConfig {
  /**
   * Sim-speed multiplier a mission starts at (must be one of
   * `submarine.simSpeeds`). The Titanic descent is 3.8 km at ~5.4 m/s
   * terminal ballast speed, so at 1x the descent alone is ~12 min.
   */
  defaultSimSpeed: number;
  /** Seconds between the last primary scan and `mission:complete` + debrief. */
  completeDelayS: number;
  /** Minimum spawn clearance above the seabed, on top of hull radius + seabedClearance (m). */
  spawnClearanceM: number;
  /** Objectives-panel nav line refresh rate (Hz). Text writes are skipped when unchanged. */
  navUpdateHz: number;

  // --- fix S (QA-B #3) -------------------------------------------------------
  /**
   * Free dive: if the tile centre's seabed is shallower than this (negative
   * metres), spawn over the nearest grid cell at least this deep instead.
   */
  minSpawnSeabedM: number;
  /** Free-dive spawn altitude above the seabed without `?depth=` (m). */
  freeDiveSpawnAltitudeM: number;
}

// --- C3: environment presets (docs/presets.md) ------------------------------
/** Environment preset names (plan/PHASE-C-CONTRACTS.md §1). */
export type EnvPresetName =
  'vent' | 'brine' | 'canyon' | 'reef' | 'trench' | 'wreck' | 'seamount' | 'default';

/** A preset tunable: what `mission.json` `environment.overrides` may set. */
export type PresetParamValue = number | string | boolean | null;

/** Vent field: chimney smoke, shimmer, warm glow, upwelling. */
export interface VentPresetConfig {
  /** `sulfide` (black smoker, dark grey smoke) or `carbonate` (Lost City: pale, faint). */
  fluid: string;
  /** 0..1 scales particle count per chimney and smoke opacity. */
  smokeIntensity: number;
  /** Particle budget at intensity 1 on the high tier (hard cap 20k). */
  smokeParticles: number;
  /** Max chimneys (props or vent POIs) that smoke. */
  maxSources: number;
  /** Plume rise speed at the orifice (m/s) and total rise before fading (m). */
  riseMps: number;
  riseHeightM: number;
  /** Plume spread radius at the top of the rise (m). */
  spreadM: number;
  /** Particle sprite size (m) at birth / end of life. */
  sizeStartM: number;
  sizeEndM: number;
  smokeColorSulfide: number;
  smokeColorCarbonate: number;
  smokeOpacitySulfide: number;
  smokeOpacityCarbonate: number;
  /** Warm glow point lights at the tallest chimneys (0..3). */
  glowLights: number;
  glowColor: number;
  /** Candela; decay 2, so ~glowIntensity/d^2 at d metres. */
  glowIntensity: number;
  glowDistanceM: number;
  /** Carbonate (Lost City) fluid is ~40-90 C, far cooler than a black smoker: glow x this. */
  glowCarbonateScale: number;
  /** Shimmer (luminance wobble sprite over each orifice): amplitude and size (m). */
  shimmerStrength: number;
  shimmerSizeM: number;
  /** Upwelling above chimneys: speed at the orifice (m/s), radius and height of the column (m). */
  upwellMps: number;
  upwellRadiusM: number;
  upwellHeightM: number;
}

/** Brine pool: a mirror-like layer at a fixed depth with mist above it. */
export interface BrinePresetConfig {
  /** Positive depth of the brine surface (m); 0 = auto (seabed under the spawn + `autoLiftM`). */
  poolDepthM: number;
  /** Pool centre; null = the spawn position. */
  poolLat: number | null;
  poolLon: number | null;
  poolRadiusM: number;
  /** Auto pool: the lowest seabed within this radius of the spawn, filled `autoLiftM` deep. */
  autoSearchRadiusM: number;
  autoLiftM: number;
  poolColor: number;
  sheenColor: number;
  /** 0..1 opacity of the layer seen from above / below. */
  opacityAbove: number;
  opacityBelow: number;
  rippleScaleM: number;
  rippleSpeed: number;
  /** Mist: particle budget, layer thickness above the brine (m), opacity. */
  mistParticles: number;
  mistHeightM: number;
  mistOpacity: number;
  mistColor: number;
  /** Below the layer: fog density multiplier and ambient multiplier. */
  underFogScale: number;
  underAmbientScale: number;
}

/** Submarine canyon: down-canyon current and sediment plumes. */
export interface CanyonPresetConfig {
  /** Compass bearing the current flows TOWARD (deg); null = follow the terrain down-slope only. */
  currentDirDeg: number | null;
  currentSpeedMps: number;
  /** 0..1 how strongly the local down-slope bends the current. */
  slopeBias: number;
  /** Extra speed fraction in the canyon axis (confined channel): speed x (1 + axisGain x confinement). */
  axisGain: number;
  /** Ring radius (m) and relief (m) used to measure channel confinement. */
  confinementRadiusM: number;
  confinementReliefM: number;
  /** Current is full strength within this altitude above the seabed, fading to `aloftFraction` at 3x. */
  boundaryLayerM: number;
  aloftFraction: number;
  /** Sediment plumes: concurrent plumes, particles each, lifetime (s), spawn radius around the sub (m). */
  plumes: number;
  plumeParticles: number;
  plumeLifeS: number;
  plumeSpawnRadiusM: number;
  plumeSpreadM: number;
  plumeSizeM: number;
  plumeOpacity: number;
  plumeColor: number;
}

/** Shallow reef: light shafts, warmer brighter ambient, stronger caustics. */
export interface ReefPresetConfig {
  shafts: number;
  /** Shafts only draw while the camera is shallower than this (positive m). */
  shaftMaxDepthM: number;
  shaftLengthM: number;
  shaftWidthM: number;
  /** Shafts are scattered in a box of this edge around the camera (m). */
  shaftFieldM: number;
  shaftOpacity: number;
  shaftColor: number;
  ambientScale: number;
  /** 0..1 lerp of the ambient colour toward `warmColor`. */
  ambientWarmth: number;
  warmColor: number;
  causticsScale: number;
}

/** Hadal trench: darker than the abyss band, sparser snow, pressure ambience events. */
export interface TrenchPresetConfig {
  fogScale: number;
  /** 0..1 lerp of the fog colour toward black. */
  fogDarken: number;
  ambientScale: number;
  snowScale: number;
  vignetteAdd: number;
  /** `env:trench` interval (s) at the shallowest / deepest end of the trench. */
  creakMaxGapS: number;
  creakMinGapS: number;
  /** Depth (positive m) at which the interval reaches `creakMinGapS`. */
  creakFullDepthM: number;
}

/** Wreck site: seabed sediment haze, rust motes near hulls, a touch more vignette. */
export interface WreckPresetConfig {
  hazeParticles: number;
  /** Haze box edge around the camera (m) and band height above the seabed (m). */
  hazeBoxM: number;
  hazeBandM: number;
  hazeSizeM: number;
  hazeOpacity: number;
  hazeColor: number;
  hazeDriftMps: number;
  motesPerHull: number;
  maxHulls: number;
  moteSizeM: number;
  moteOpacity: number;
  moteColor: number;
  vignetteAdd: number;
}

/** Seamount: the default look, plus sparse vent glow when a `vent` POI exists. */
export interface SeamountPresetConfig {
  glowLights: number;
  glowColor: number;
  glowIntensity: number;
  glowDistanceM: number;
  /** Lights sit this far above the vent POI (m). */
  glowLiftM: number;
}

export interface PresetsConfig {
  /** Hard cap on the total current applied to the sub (m/s). */
  maxCurrentMps: number;
  /** Rate (1/s) at which the sub's velocity is pulled toward the current. */
  currentCouplingPerS: number;
  /** `env:current` is re-emitted when direction/speed change by more than this, at most every N s. */
  currentEventDirDeg: number;
  currentEventSpeedMps: number;
  currentEventMinIntervalS: number;
  /** Currents are physics, not rendering: keep them on the low tier (visuals are always off there). */
  lowTierCurrents: boolean;
  /** Particle budget multiplier per graphics tier (low is always 0: presets draw nothing). */
  tierParticleScale: Record<GraphicsTier, number>;
  /** Hard per-preset particle cap. */
  maxParticles: number;
  /** Particles are lit ~ ambient + headlightGain x exp(-distance to sub / headlightFalloffM). */
  particleAmbient: number;
  particleHeadlightGain: number;
  particleHeadlightFalloffM: number;
  vent: VentPresetConfig;
  brine: BrinePresetConfig;
  canyon: CanyonPresetConfig;
  reef: ReefPresetConfig;
  trench: TrenchPresetConfig;
  wreck: WreckPresetConfig;
  seamount: SeamountPresetConfig;
}

/** C1: globe mission select overlay (docs/globe.md). Distances in globe radii. */
export interface GlobeConfig {
  /** Equirectangular Earth texture (public/assets/globe, ATTRIBUTION.md). */
  textureUrl: string;
  /** Camera distance from the globe centre, in globe radii. */
  minDistance: number;
  maxDistance: number;
  startDistance: number;
  fovDeg: number;
  /** Drag sensitivity at `startDistance`; scales with altitude. */
  dragDegPerPx: number;
  /** Exponential decay rate (1/s) of the released-drag spin. */
  inertiaDamping: number;
  autoRotateDegPerS: number;
  /** Seconds without interaction before auto-rotate starts. */
  idleBeforeAutoRotateS: number;
  /** Arrow-key orbit speed at `startDistance` (deg/s). */
  keyRotateDegPerS: number;
  /** Altitude factor per +/- key press (zoom in divides by it). */
  keyZoomFactor: number;
  /** Altitude factor per wheel pixel: factor = exp(deltaY * wheelZoomPerPx). */
  wheelZoomPerPx: number;
  maxLatDeg: number;
  /** Rate (1/s) of the eased turn toward a focused pin. */
  focusLerpPerS: number;
  /** Pins closer than this on screen (CSS px) are fanned out on a ring. */
  pinOverlapPx: number;
  /** Pins this close to the horizon (dot of normal and view, 0..1) fade out. */
  pinHorizonFade: number;
  /** Land albedo multiplier and saturation (ocean-forward styling). */
  landDim: number;
  landSaturation: number;
  /** Ocean brightness multiplier. */
  oceanGain: number;
  /** Graticule spacing (deg) and opacity; opacity 0 hides it. */
  graticuleDeg: number;
  graticuleOpacity: number;
  /** Hex colours: graticule/atmosphere accent (the HUD cyan). */
  accentColor: number;
  atmosphereStrength: number;
  /** Atmosphere shell radius (globe radii). */
  atmosphereScale: number;
  maxPixelRatio: number;
}

// --- C5: settings, save, accessibility (docs/settings.md) ---
/** Sonar minimap colour schemes (`Sonar.setPalette`). */
export type SonarPaletteName = 'default' | 'deuteranopia' | 'highContrast';

export interface SonarPalette {
  /** Shown in the settings screen. */
  label: string;
  /**
   * What drives the colour ramp: `terrain` = luminance of the terrain colour
   * ramp at that cell (the original green sonar look), `depth` = the cell's
   * depth normalised over the tile (0 = deepest, 1 = shallowest).
   */
  source: 'terrain' | 'depth';
  /**
   * Colour stops `[at, r, g, b]`, `at` ascending in 0..1, channels 0..255.
   * Low `at` is deep / dark; relative luminance must rise with `at` so depth
   * ordering reads without hue (pinned by tests/unit/settingsPalette.test.ts).
   */
  stops: Array<[number, number, number, number]>;
  /** Bitmap alpha 0..255. */
  alpha: number;
  /** Landmark blip fill, and an optional outline (null = none). */
  blip: string;
  blipOutline: string | null;
  /** The sub's triangle fill and optional outline. */
  sub: string;
  subOutline: string | null;
  /** Breadcrumb trail stroke and the map frame. */
  trail: string;
  frame: string;
}

export interface SettingsConfig {
  /**
   * Defaults for the settings that have no older home in Config. The graphics
   * tier and detail strength default to `graphicsTier` and
   * `terrain.detailStrength`, so those stay the single source of truth.
   */
  defaults: {
    postFx: boolean;
    /** 0 = auto (free dive at 1x, missions at `mission.defaultSimSpeed`). */
    simSpeedDefault: number;
    reduceMotion: boolean;
    captions: boolean;
    sonarPalette: SonarPaletteName;
  };
  /** Choices offered for the default sim speed; 0 is "auto". */
  simSpeedOptions: number[];
  /** Terrain detail slider range (0 = survey only, pure data). */
  detailStrengthMax: number;
  detailStrengthStep: number;
  /** Caption overlay: at most this many lines at once. */
  captionMaxLines: number;
  /** A caption stays up at least this long, even if its cue is shorter (readability). */
  captionMinDurationS: number;
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
  /** Free-dive landmark markers and labels. */
  landmarks: LandmarksConfig;
  /** B1: scan beam, discovery and debrief tunables. */
  scan: ScanConfig;
  /** B4: placed props (wrecks, rocks, chimneys). */
  props: PropsConfig;
  /** B3: mission flow. */
  mission: MissionConfig;
  /** C5: settings screen defaults and ranges (docs/settings.md). */
  settings: SettingsConfig;
  /** C5: sonar minimap palettes (`Sonar.setPalette`). */
  sonarPalettes: Record<SonarPaletteName, SonarPalette>;
  /** C1: globe mission select. */
  globe: GlobeConfig;
  physicsHz: number;
  /** C3: environment presets by landmark type (docs/presets.md). */
  presets: PresetsConfig;
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

    simSpeedScalesTurnRate: false,
    freeDiveHullMarginM: 300,
    // Contact is at 12 m (hullRadius 8 + seabedClearance 4); wreck scans sit
    // at 12-25 m altitude, so the static banner only fires in the last 3 m.
    seabedWarnAltitudeM: 15,
    seabedWarnTimeToContactS: 4,
    seabedApproachAltitudeM: 60,
    hullRimColor: 0x6f93a3,
    hullRimStrength: 0.55,
    hullEmissive: 0x0b1318,
  },
  terrain: {
    // 64 source cells x subdiv 2 = a 129x129 vertex chunk, which still fits in
    // 16-bit indices and gives the LOD selector something to actually choose
    // between on a 25 km tile.
    chunkCells: 64,
    verticalExaggeration: 1.0,
    /**
     * Deepest -> shallowest, interpolated linearly in RGB. These are the
     * docs/art-direction.md §0 seabed albedos (sRGB hex): sand #C9B489 above
     * ~200 m, sediment #7A6E5C below it, drifting slightly greyer on the
     * abyssal plain. Hue comes from here and from the lights; keep every stop
     * low-saturation -- a green or teal stop multiplied by the cyan water light
     * is what turned the shallow tiles neon (QA-B #4).
     */
    colorRamp: [
      { depth: -6000, color: 0x6f6a62 },
      { depth: -3000, color: 0x756d60 },
      { depth: -400, color: 0x7a6e5c },
      { depth: -260, color: 0x8f8068 },
      { depth: -120, color: 0xbfab83 },
      { depth: 0, color: 0xc9b489 },
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
    rockColor: 0x3b3a3d,
    rockColorMix: 0.6,
    maxVertices: 4_000_000,

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
        // Intensities assume the post pass tone-maps and sRGB-encodes (it did
        // not before QA-B #4, and these were ~3x hotter to compensate).
        ambientIntensity: 0.9,
        // Warm sun highlight #FFE9B8 lives on the directional light.
        sunIntensity: 1.0,
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
        ambientIntensity: 0.55,
        sunIntensity: 0.35,
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
    causticsIntensity: 1.1,
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

    focusSideM: 38,
    focusRaiseM: 18,
    focusLookBlend: 0.35,
    focusHalfLife: 0.6,
    focusSideHysteresisM: 6,
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
  landmarks: {
    markerLiftM: 12,
    markerRadiusM: 2,
    markerColor: 0x2ed9d9, // HUD cyan: navigation, not treasure
    markerOpacity: 0.85,
    markerFadeM: [150, 300],
    labelHeightPx: 14,
    labelMaxChars: 28,
    labelColor: '#2ed9d9',
    labelBackground: 'rgba(6, 14, 18, 0.55)',
    labelFadeM: [250, 500],
  },
  // B1: scan & discovery. See docs/discovery.md.
  scan: {
    defaultSeconds: 4, // the master plan's "hold the beam 3-5 s"
    defaultRadiusM: 150,
    coneHalfAngleDeg: 35,
    closeRangeM: 25,
    decayPerSecond: 0.35, // a full ring drains in ~3 s, so a brief wobble is forgiven
    progressEventHz: 10,
    hintRangeFactor: 3,
    ringSizePx: 76,
    ringStrokePx: 2,
    reticleSizePx: 44,
    completeBannerSeconds: 6,
    spawnDistanceM: 80,
    spawnBearingDeg: 180, // spawn south of the POI, looking north at it
    spawnClearanceM: 16, // ~28 m altitude: clear of the HUD's 20 m proximity warning
    teleportThresholdM: 250,
    debugDebriefDelayMs: 3000,
  },
  // B4: props. See docs/props.md.
  props: {
    // Titanic's fog (abyss band) hides almost everything past ~1.5 km, so
    // full meshes out to 900 m and silhouettes to 2.5 km are invisible swaps.
    defaultLodDistanceM: 900,
    cullDistanceM: 2500,
    cullLodFactor: 1.5,
    impostorOpacity: 0.55,
    debrisImpostorPieces: 8,
    collisionPushStiffness: 1.0,
    collisionVelocityDamping: 1.0,
    collisionEventCooldownS: 0.6,
    sphereColliderFit: 1.1,
    maxProps: 400,
    defaultCollision: { 'hull-block': 'box', debris: 'none', chimney: 'box', model: 'sphere' },
    defaultDimensionsM: {
      'hull-block': [40, 12, 10],
      debris: [60, 60, 4],
      chimney: [0, 0, 20],
    },
    debrisMinPieces: 20,
    debrisMaxPieces: 60,
    debrisMinSizeM: 1,
    debrisMaxSizeM: 6,
    chimneyRadiusFraction: 0.12,
    chimneyTopFraction: 0.4,
    hullTextureRepeatM: 24,
    hullKeelFraction: 0.7,
    hullDefaultEnds: ['prow', 'cut'], // a bow section: prow forward, torn aft
    hullProwLengthFraction: 0.28,
    hullProwTaperExponent: 1.5, // ~26 deg half-entrance on the Titanic bow
    hullProwRakeFraction: 0.35,
    hullProwSheerFraction: 0.08,
    hullForecastleLengthFraction: 0.2,
    hullForecastleHeightFraction: 0.15,
    hullCutDepthFraction: 0.06,
    hullCutCollapseFraction: 0.25,
    hullCutShade: 0.42,
    hullDeckSpacingM: 3, // Titanic deck-to-deck ~2.7-3 m
    hullRoundedLengthFraction: 0.5, // semicircular counter in plan
    hullCounterTuckFraction: 0.35,
    textureSize: 256,
    colors: {
      rust: 0x7a3b22, // rusted steel
      growth: 0x4e5a3e, // patchy marine growth
      basalt: 0x3b3a3d, // vent chimney rock
      mineral: 0xc9a27a, // pale orange/white vent precipitate
      sediment: 0x4a4038, // silt darkening at the foot of vertical surfaces
    },
    debugNudgeM: 1,
    debugNudgeFastM: 10,
    debugRotateDeg: 5,
    atSpawnClearanceM: 22, // just outside the HUD's 20 m seabed-proximity warning
  },
  // B3: mission flow. See docs/missions.md for the timeline these produce.
  mission: {
    defaultSimSpeed: 3, // keeps the Titanic descent under 4 min real time
    completeDelayS: 3, // let the scan's "NEW ENTRY" banner land before the debrief
    spawnClearanceM: 10,
    navUpdateHz: 5,
    minSpawnSeabedM: -60,
    freeDiveSpawnAltitudeM: 90,
  },
  // C5: settings (docs/settings.md).
  settings: {
    defaults: {
      postFx: true,
      simSpeedDefault: 0,
      reduceMotion: false,
      captions: false,
      sonarPalette: 'default',
    },
    simSpeedOptions: [0, 1, 2, 3],
    detailStrengthMax: 1.5,
    detailStrengthStep: 0.05,
    captionMaxLines: 2,
    captionMinDurationS: 1.5,
  },
  // C5: sonar palettes. `default` reproduces the original green look exactly
  // (lum = 0.25 + 0.75 * terrain luminance, times rgb(30, 235, 120)).
  sonarPalettes: {
    default: {
      label: 'Sonar green',
      source: 'terrain',
      stops: [
        [0, 7.5, 58.75, 30],
        [1, 30, 235, 120],
      ],
      alpha: 235,
      blip: '#ffd24a',
      blipOutline: null,
      sub: '#ffffff',
      subOutline: null,
      trail: 'rgba(180, 255, 210, 0.45)',
      frame: 'rgba(120, 255, 180, 0.6)',
    },
    deuteranopia: {
      // Cividis-like blue -> yellow ramp: readable with red-green colour
      // blindness because depth is carried by luminance and the blue/yellow axis.
      label: 'Colour-blind safe (blue to yellow)',
      source: 'depth',
      stops: [
        [0, 0, 34, 78],
        [0.25, 53, 69, 108],
        [0.5, 102, 105, 112],
        [0.75, 168, 157, 116],
        [1, 254, 232, 56],
      ],
      alpha: 240,
      blip: '#ffffff',
      blipOutline: '#000000',
      sub: '#000000',
      subOutline: '#ffffff',
      trail: 'rgba(255, 255, 255, 0.7)',
      frame: 'rgba(255, 255, 255, 0.8)',
    },
    highContrast: {
      // White symbols on a black-to-grey map.
      label: 'High contrast (white on black)',
      source: 'depth',
      stops: [
        [0, 0, 0, 0],
        [1, 110, 110, 110],
      ],
      alpha: 255,
      blip: '#ffffff',
      blipOutline: '#000000',
      sub: '#ffffff',
      subOutline: '#000000',
      trail: 'rgba(255, 255, 255, 0.9)',
      frame: '#ffffff',
    },
  },
  // C1: globe mission select (docs/globe.md).
  globe: {
    textureUrl: publicUrl('/assets/globe/earth-bmng-topo-bathy-4096.jpg'),
    minDistance: 1.35,
    maxDistance: 4.5,
    startDistance: 2.9,
    fovDeg: 35,
    dragDegPerPx: 0.22,
    inertiaDamping: 3.5,
    autoRotateDegPerS: 3,
    idleBeforeAutoRotateS: 5,
    keyRotateDegPerS: 50,
    keyZoomFactor: 1.25,
    wheelZoomPerPx: 0.0015,
    maxLatDeg: 80,
    focusLerpPerS: 5,
    pinOverlapPx: 16,
    pinHorizonFade: 0.18,
    landDim: 0.34,
    landSaturation: 0.35,
    oceanGain: 1.15,
    graticuleDeg: 30,
    graticuleOpacity: 0.14,
    accentColor: 0x2ed9d9,
    atmosphereStrength: 0.55,
    atmosphereScale: 1.045,
    maxPixelRatio: 2,
  },
  // C3: environment presets. See docs/presets.md for what each key does.
  presets: {
    maxCurrentMps: 0.8,
    currentCouplingPerS: 0.5,
    currentEventDirDeg: 10,
    currentEventSpeedMps: 0.05,
    currentEventMinIntervalS: 1,
    lowTierCurrents: true,
    tierParticleScale: { low: 0, medium: 0.5, high: 1 },
    maxParticles: 20000,
    particleAmbient: 0.12,
    particleHeadlightGain: 1.6,
    particleHeadlightFalloffM: 90,
    vent: {
      fluid: 'sulfide',
      smokeIntensity: 1,
      smokeParticles: 12000,
      maxSources: 12,
      riseMps: 1.2,
      riseHeightM: 70,
      spreadM: 14,
      sizeStartM: 1.6,
      sizeEndM: 7,
      smokeColorSulfide: 0x2b2a28,
      smokeColorCarbonate: 0xd6ddd8,
      smokeOpacitySulfide: 0.55,
      smokeOpacityCarbonate: 0.16,
      glowLights: 2,
      glowColor: 0xff9a4a,
      glowIntensity: 260,
      glowDistanceM: 60,
      glowCarbonateScale: 0.35,
      shimmerStrength: 0.08,
      shimmerSizeM: 9,
      upwellMps: 0.35,
      upwellRadiusM: 18,
      upwellHeightM: 120,
    },
    brine: {
      poolDepthM: 0,
      poolLat: null,
      poolLon: null,
      poolRadiusM: 260,
      autoSearchRadiusM: 200,
      autoLiftM: 6,
      poolColor: 0x0b2630,
      sheenColor: 0x9fc6d2,
      opacityAbove: 0.78,
      opacityBelow: 0.55,
      rippleScaleM: 9,
      rippleSpeed: 0.25,
      mistParticles: 6000,
      mistHeightM: 5,
      mistOpacity: 0.22,
      mistColor: 0xa9c4c9,
      underFogScale: 2.5,
      underAmbientScale: 0.5,
    },
    canyon: {
      currentDirDeg: null,
      currentSpeedMps: 0.35,
      slopeBias: 0.7,
      axisGain: 0.8,
      confinementRadiusM: 400,
      confinementReliefM: 120,
      boundaryLayerM: 60,
      aloftFraction: 0.35,
      plumes: 6,
      plumeParticles: 900,
      plumeLifeS: 26,
      plumeSpawnRadiusM: 220,
      plumeSpreadM: 26,
      plumeSizeM: 3.2,
      plumeOpacity: 0.3,
      plumeColor: 0x8a7d68,
    },
    reef: {
      shafts: 14,
      shaftMaxDepthM: 60,
      shaftLengthM: 90,
      shaftWidthM: 9,
      shaftFieldM: 320,
      shaftOpacity: 0.07,
      shaftColor: 0xfff1cc,
      ambientScale: 1.25,
      ambientWarmth: 0.18,
      warmColor: 0xffe9b8,
      causticsScale: 1.5,
    },
    trench: {
      fogScale: 1.5,
      fogDarken: 0.45,
      ambientScale: 0.55,
      snowScale: 0.4,
      vignetteAdd: 0.1,
      creakMaxGapS: 14,
      creakMinGapS: 5,
      creakFullDepthM: 10900,
    },
    wreck: {
      hazeParticles: 9000,
      hazeBoxM: 220,
      hazeBandM: 30,
      hazeSizeM: 1.1,
      hazeOpacity: 0.22,
      hazeColor: 0x8c8170,
      hazeDriftMps: 0.06,
      motesPerHull: 700,
      maxHulls: 6,
      moteSizeM: 0.35,
      moteOpacity: 0.5,
      moteColor: 0x8a4a2c,
      vignetteAdd: 0.06,
    },
    seamount: {
      glowLights: 2,
      glowColor: 0xff9a4a,
      glowIntensity: 160,
      glowDistanceM: 50,
      glowLiftM: 6,
    },
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
    landmarks: { ...DEFAULT_CONFIG.landmarks, ...overrides.landmarks },
    scan: { ...DEFAULT_CONFIG.scan, ...overrides.scan },
    props: { ...DEFAULT_CONFIG.props, ...overrides.props },
    mission: { ...DEFAULT_CONFIG.mission, ...overrides.mission },
    settings: { ...DEFAULT_CONFIG.settings, ...overrides.settings },
    sonarPalettes: { ...DEFAULT_CONFIG.sonarPalettes, ...overrides.sonarPalettes },
    globe: { ...DEFAULT_CONFIG.globe, ...overrides.globe },
    presets: { ...DEFAULT_CONFIG.presets, ...overrides.presets },
  };
}
