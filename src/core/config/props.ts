/**
 * Placed props: GLB models and procedural builders (docs/props.md).
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

// --- B4: props (docs/props.md) ---------------------------------------------
export type PropCollisionKind = 'none' | 'sphere' | 'box';
export type ProceduralPropKind = 'hull-block' | 'debris' | 'chimney' | 'geo';
/** Shape of one end of a procedural:hull-block (docs/props.md). */
export type HullEnd = 'prow' | 'cut' | 'rounded';
/**
 * procedural:chimney rock type from props.json `material_hint` (docs/props.md):
 * `basalt` (default, today's grey), `carbonate` (white/cream brucite-calcite,
 * Lost City), `sulfide` (dark metal-sulphide black smokers).
 */
export type ChimneyMaterial = 'basalt' | 'carbonate' | 'sulfide';

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
  /**
   * procedural:chimney palettes for non-default `material_hint`s: `rock` is the
   * body albedo, `stain` the precipitate toward the top. `basalt` uses
   * `colors.basalt` / `colors.mineral`.
   */
  chimneyMaterials: Record<Exclude<ChimneyMaterial, 'basalt'>, { rock: number; stain: number }>;
  /** `?debugProps=1` placement tool steps. */
  debugNudgeM: number;
  debugNudgeFastM: number;
  debugRotateDeg: number;
  /** `?at=lat,lon` debug spawn: minimum clearance above the seabed (m). */
  atSpawnClearanceM: number;
}

// B4: props. See docs/props.md.
export const DEFAULT_PROPS: PropsConfig = {
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
  defaultCollision: {
    'hull-block': 'box',
    debris: 'none',
    chimney: 'box',
    geo: 'box',
    model: 'sphere',
  },
  defaultDimensionsM: {
    'hull-block': [40, 12, 10],
    debris: [60, 60, 4],
    chimney: [0, 0, 20],
    geo: [30, 30, 12],
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
  chimneyMaterials: {
    carbonate: { rock: 0xa9a393, stain: 0xd6d1c4 }, // Lost City: cream-grey calcite, fresh white brucite tips
    sulfide: { rock: 0x24201e, stain: 0x7a4e2c }, // black smoker sulphide, rusty Fe-oxide staining
  },
  debugNudgeM: 1,
  debugNudgeFastM: 10,
  debugRotateDeg: 5,
  atSpawnClearanceM: 22, // just outside the HUD's 20 m seabed-proximity warning
};
