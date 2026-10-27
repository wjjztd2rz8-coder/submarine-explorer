/**
 * Per-site tuning lives in data/landmarks/<id>/site.json so shared code never
 * branches on a site id. Add a new concern as another optional section here,
 * in validateSiteManifest, and in the sites' JSON; nothing else changes.
 */
import type { GraphicsTier } from './config/quality.js';

/** Local approach bearing and clearance from the hero's actual footprint. */
export interface OpeningPose {
  hero: string;
  bearing: number;
  range: number;
  fromCentre?: boolean;
  altitude?: number;
  minSeabedAltitudeM?: number;
  yawOffset?: number;
  openWater?: boolean;
  turnWeight?: number;
  chaseRadius?: number;
  chaseOffsetX?: number;
  chaseOffsetY?: number;
  portraitChaseOffset?: { x: number; y: number; radius?: number };
}

type OpeningMode = Partial<
  Pick<OpeningPose, 'range' | 'chaseRadius' | 'chaseOffsetX' | 'chaseOffsetY'>
>;

interface OpeningLifeBase {
  anchorHero: string;
  habitatRadiusM: number;
}

export interface GroupOpeningLife extends OpeningLifeBase {
  strategy: 'groups';
  cell: string;
  schoolRunM: number;
  schoolHoldS: number;
  penSpacingM: number;
  groups: { species: string; offset: [number, number, number]; low: number; count: number }[];
}

export interface ApproachOpeningLife extends OpeningLifeBase {
  strategy: 'approach';
  species: string;
  aheadM: number;
  sideM: number;
  low: number;
  count: number;
  spacingM: number;
  onWreck: boolean;
  mesh?: string;
  deckPatch?: { x: number; z: number; rowSpacingM: number; castHeightM: number };
}

const chimneyShapeKeys = [
  'ledge',
  'wobble',
  'rough',
  'ridgeAmp',
  'lip',
  'crater',
  'irregular',
  'shelfRadiusFraction',
  'shelfWidthMin',
  'shelfWidthVariation',
  'shelfArcMin',
  'shelfArcVariation',
] as const;
const smokerDetailKeys = [
  'ridges',
  'shelfStart',
  'mainShelfStep',
  'sideShelfStep',
  'shelfJitter',
  'mouthClearanceM',
  'topMouthRadiusFraction',
  'outletStartHeightFraction',
  'outletHeightStepFraction',
  'outletStartAngleRad',
  'outletAngleStepRad',
  'outletLengthM',
  'outletBaseRadiusM',
  'outletTipRadiusM',
  'outletMouthRadiusM',
  'outletEmbedM',
  'outletRayStartM',
  'outletMaxAxisRadiusFactor',
] as const;
const chimneyVariationKeys = [
  'heightScale',
  'widthScale',
  'lean',
  'leanDir',
  'flanges',
  'ridges',
  'crust',
] as const;

const galleryApronKeys = [
  'bedHeightM',
  'riserFraction',
  'rowDensity',
  'columnDensity',
  'normalSampleM',
  'contactShade',
  'roughnessVariation',
  'riserShade',
  'lipLight',
] as const;
export type GalleryApron = Record<(typeof galleryApronKeys)[number], number>;

export type ChimneyShape = Record<(typeof chimneyShapeKeys)[number], number>;
export type SmokerProfile = ChimneyShape &
  Record<(typeof smokerDetailKeys)[number], number> & {
    /** Top/base radius ratio in (0, 1]; omitted data defaults to the original 0.45 taper. */
    topFraction: number;
    mouthColor: number;
    /** Mouth-disc emissive RGB (0x000000–0xffffff); defaults to unlit black (0). */
    throatColor: number;
    /** Body albedo multiplier in (0, 1]; omitted data keeps the 0.95 smoker default. */
    bodyShade: number;
    /** Self-lit crust tint strength in (0, 1]; omitted data keeps the 0.16 smoker default. */
    bodyGlow: number;
    collarColor: number;
    collarEmissive: number;
    mainShelves: number;
    sideShelves: number;
    outletCount: number;
  };

/** Configured prop ids must be unique across content packs. */
export interface PropManifest {
  galleryApron?: GalleryApron;
  grounding?: 'rendered';
  grotto?: 'hood';
  apronHabitat?: boolean;
  habitat?: boolean;
  seabed?: { biome: string };
  mineralCrust?: boolean;
  /** Warm self-lit lift on a plain chimney body (strength in (0, 1]), so small vents read in dark water. */
  bodyGlow?: number;
  smoker?: SmokerProfile;
  chimney?: Record<(typeof chimneyVariationKeys)[number], number> & { shape: ChimneyShape };
}

/** Illustrative event locations, not surveyed occurrences. Exactly one vertical reference. */
export interface EventSpot {
  name: string;
  anchor: { lat: number; lon: number } & (
    { altitudeM: number; depthM?: never } | { depthM: number; altitudeM?: never }
  );
  contactRadiusM: number;
  arrivalRadiusM: number;
  headingDeg: number;
}

export interface SiteManifest {
  atmosphere?: {
    hemisphere?: { name: string; sky: number; ground: number; intensity: number };
    lamps?: { intensity: number; distance: number; fillIntensity: number; fillDistance: number };
    /** Ambient floors apply to band stops at or below depthM, preserving brighter inputs. */
    tiers?: Partial<Record<GraphicsTier, { depthM: number; color: number; intensity: number }>>;
  };
  props?: Record<string, PropManifest>;
  id: string;
  wreck?: {
    /** Hull POI gating the local atmosphere, backdrop and ice-scour relief. */
    hullPoi: string;
    atmosphere: {
      hazeParticles: number;
      hazeSizeM: number;
      hazeOpacity: number;
      motesPerHull: number;
      moteSizeM: number;
      moteOpacity: number;
      maxSizePx: number;
      maxBrightness: number;
    };
    horizon: {
      name: string;
      upperColor: number;
      hazeColor: number;
      hazePeakElevation: number;
      fogLift: number;
      fogHaze: number;
    };
  };
  /** Graded water backdrop for a non-wreck site (upper column lighter, easing to the fog colour below). */
  horizon?: {
    upperColor: number;
    hazeColor: number;
    hazePeakElevation: number;
    fogLift: number;
    fadeStartM: number;
    fadeEndM: number;
  };
  terrain?: {
    /** Select an analytic reconstruction where the survey grid cannot resolve the feature. */
    carve?: 'canyon-bend' | 'sinkhole';
  };
  sonar?: {
    /** Authored hull POI anchoring scour contours on flat terrain. */
    scourHullPoi?: string;
    maxContourIntervalM?: number;
    /** Calm reef gradient around the reconstructed sinkhole, when it is on this tile. */
    reef?: boolean;
  };
  opening?: {
    mission?: {
      rangeM: number;
      destinationLabel?: string;
      localAltitudeWeight?: number;
      yawOffset?: number;
    };
    freeDive?: OpeningPose & {
      modes?: { arcade?: OpeningMode; realistic?: OpeningMode; custom?: OpeningMode };
    };
    /** Compatibility pass after the safe base search; retains its accepted bearing and fallback. */
    reframe?: Omit<OpeningPose, 'bearing' | 'altitude' | 'yawOffset'> & {
      altitude: number;
      yawOffset: number;
      aimHero?: string;
    };
    camera?: { applyDefaults?: boolean };
  };
  life?: { opening?: GroupOpeningLife | ApproachOpeningLife };
  scatter?: {
    /** Reserve opening.freeDive.hero's world bounds from boulders after props load. */
    keepoutHero?: boolean;
  };
  audio?: {
    /** Habitat whale calls may play here (separate from event whale eligibility). */
    whaleHabitat?: boolean;
  };
  events?: Partial<Record<'plume' | 'turbidity' | 'whale', EventSpot>>;
}

type Obj = Record<string, unknown>;

function fail(id: string, path: string, why: string): never {
  throw new Error(`site manifest "${id}": ${path}: ${why}`);
}

function obj(id: string, path: string, v: unknown): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(id, path, 'expected an object');
  return v as Obj;
}

function noExtra(id: string, path: string, o: Obj, allowed: string[]): void {
  for (const k of Object.keys(o)) {
    if (!allowed.includes(k)) fail(id, `${path}.${k}`, 'unknown field');
  }
}

type Check = (id: string, path: string, value: unknown) => void;

const finite: Check = (id, path, value) => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    fail(id, path, 'expected a finite number');
};
const aboveZero: Check = (id, path, value) => {
  finite(id, path, value);
  if ((value as number) <= 0) fail(id, path, 'expected a positive number');
};
const count: Check = (id, path, value) => {
  finite(id, path, value);
  if (!Number.isInteger(value) || (value as number) < 0)
    fail(id, path, 'expected a nonnegative integer');
};
const text: Check = (id, path, value) => {
  if (typeof value !== 'string' || !value.trim()) fail(id, path, 'expected a nonempty string');
};
const flag: Check = (id, path, value) => {
  if (typeof value !== 'boolean') fail(id, path, 'expected a boolean');
};

function fields(required: Record<string, Check>, optional: Record<string, Check> = {}): Check {
  return (id, path, value) => {
    const row = obj(id, path, value);
    noExtra(id, path, row, [...Object.keys(required), ...Object.keys(optional)]);
    for (const [key, check] of Object.entries(required)) check(id, `${path}.${key}`, row[key]);
    for (const [key, check] of Object.entries(optional))
      if (row[key] !== undefined) check(id, `${path}.${key}`, row[key]);
  };
}

const cameraFields = { chaseRadius: aboveZero, chaseOffsetX: finite, chaseOffsetY: finite };
const poseFields = {
  ...cameraFields,
  fromCentre: flag,
  altitude: finite,
  minSeabedAltitudeM: aboveZero,
  yawOffset: finite,
  openWater: flag,
  turnWeight: finite,
  portraitChaseOffset: fields({ x: finite, y: finite }, { radius: aboveZero }),
};
const modeCheck = fields({}, { range: aboveZero, ...cameraFields });
const openingCheck = fields(
  {},
  {
    mission: fields(
      { rangeM: aboveZero },
      { destinationLabel: text, localAltitudeWeight: finite, yawOffset: finite },
    ),
    freeDive: fields(
      { hero: text, bearing: finite, range: aboveZero },
      {
        ...poseFields,
        modes: fields({}, { arcade: modeCheck, realistic: modeCheck, custom: modeCheck }),
      },
    ),
    reframe: fields(
      { hero: text, range: aboveZero, altitude: finite, yawOffset: finite },
      {
        ...poseFields,
        aimHero: text,
      },
    ),
    camera: fields({}, { applyDefaults: flag }),
  },
);

const lifeOpeningCheck: Check = (id, path, value) => {
  const row = obj(id, path, value);
  const base = { strategy: text, anchorHero: text, habitatRadiusM: aboveZero };
  if (row.strategy === 'groups') {
    fields({
      ...base,
      cell: text,
      schoolRunM: aboveZero,
      schoolHoldS: aboveZero,
      penSpacingM: aboveZero,
      groups: (id, path, value) => {
        if (!Array.isArray(value)) fail(id, path, 'expected an array');
        value.forEach((group, i) =>
          fields({
            species: text,
            low: count,
            count,
            offset: (id, path, value) => {
              if (!Array.isArray(value) || value.length !== 3)
                fail(id, path, 'expected three coordinates');
              value.forEach((n, i) => finite(id, `${path}.${i}`, n));
            },
          })(id, `${path}.${i}`, group),
        );
      },
    })(id, path, value);
  } else if (row.strategy === 'approach') {
    fields(
      {
        ...base,
        species: text,
        aheadM: finite,
        sideM: finite,
        low: count,
        count,
        spacingM: aboveZero,
        onWreck: flag,
      },
      {
        mesh: text,
        deckPatch: fields({ x: finite, z: finite, rowSpacingM: aboveZero, castHeightM: aboveZero }),
      },
    )(id, path, value);
    if (row.onWreck && (row.mesh === undefined || row.deckPatch === undefined))
      fail(id, path, 'wreck habitat requires mesh and deckPatch');
  } else fail(id, `${path}.strategy`, 'expected groups or approach');
};

const color: Check = (id, path, value) => {
  count(id, path, value);
  if ((value as number) > 0xffffff) fail(id, path, 'expected a color from 0 to 0xffffff');
};
const nonnegative: Check = (id, path, value) => {
  finite(id, path, value);
  if ((value as number) < 0) fail(id, path, 'expected a nonnegative number');
};
const fraction: Check = (id, path, value) => {
  nonnegative(id, path, value);
  if ((value as number) > 1) fail(id, path, 'expected a fraction from 0 to 1');
};
const submergedDepth: Check = (id, path, value) => {
  finite(id, path, value);
  if ((value as number) > 0) fail(id, path, 'expected a depth at or below zero');
};
const ambientFloorCheck = fields({ depthM: submergedDepth, color, intensity: nonnegative });
const atmosphereCheck = fields(
  {},
  {
    hemisphere: fields({ name: text, sky: color, ground: color, intensity: nonnegative }),
    lamps: fields({
      intensity: nonnegative,
      distance: nonnegative,
      fillIntensity: nonnegative,
      fillDistance: nonnegative,
    }),
    tiers: fields(
      {},
      { low: ambientFloorCheck, medium: ambientFloorCheck, high: ambientFloorCheck },
    ),
  },
);
const positiveFraction: Check = (id, path, value) => {
  aboveZero(id, path, value);
  if ((value as number) > 1) fail(id, path, 'expected a fraction greater than 0 and at most 1');
};
const eventSpotCheck: Check = (id, path, value) => {
  fields({
    name: text,
    anchor: (id, path, value) => {
      fields({ lat: finite, lon: finite }, { altitudeM: aboveZero, depthM: aboveZero })(
        id,
        path,
        value,
      );
      const anchor = value as EventSpot['anchor'];
      if (Math.abs(anchor.lat) > 90) fail(id, `${path}.lat`, 'outside latitude range');
      if (Math.abs(anchor.lon) > 180) fail(id, `${path}.lon`, 'outside longitude range');
      if ((anchor.altitudeM === undefined) === (anchor.depthM === undefined))
        fail(id, path, 'expected exactly one of altitudeM or depthM');
    },
    contactRadiusM: aboveZero,
    arrivalRadiusM: aboveZero,
    headingDeg: finite,
  })(id, path, value);
  const spot = value as EventSpot;
  if (spot.arrivalRadiusM >= spot.contactRadiusM)
    fail(id, `${path}.arrivalRadiusM`, 'must be smaller than contactRadiusM');
};
const numericFields = (keys: readonly string[], check: Check): Record<string, Check> =>
  Object.fromEntries(keys.map((key) => [key, check]));
const propCheck = fields(
  {},
  {
    grounding: (id, path, value) => {
      if (value !== 'rendered') fail(id, path, 'expected rendered');
    },
    grotto: (id, path, value) => {
      if (value !== 'hood') fail(id, path, 'expected hood');
    },
    galleryApron: fields(numericFields(galleryApronKeys, aboveZero)),
    apronHabitat: flag,
    habitat: flag,
    seabed: fields({ biome: text }),
    mineralCrust: flag,
    bodyGlow: positiveFraction,
    smoker: fields(
      {
        ...numericFields(chimneyShapeKeys, aboveZero),
        ...numericFields(smokerDetailKeys, aboveZero),
        mouthColor: color,
        collarColor: color,
        collarEmissive: color,
        mainShelves: count,
        sideShelves: count,
        outletCount: count,
      },
      {
        topFraction: positiveFraction,
        throatColor: color,
        bodyShade: positiveFraction,
        bodyGlow: positiveFraction,
      },
    ),
    chimney: fields({
      ...numericFields(chimneyVariationKeys, aboveZero),
      lean: finite,
      leanDir: finite,
      flanges: count,
      ridges: count,
      shape: fields(numericFields(chimneyShapeKeys, aboveZero)),
    }),
  },
);

/** Throws with the site id and field path on the first problem. */
export function validateSiteManifest(raw: unknown, id: string): SiteManifest {
  const root = obj(id, '$', raw);
  noExtra(id, '$', root, [
    'id',
    'audio',
    'events',
    'opening',
    'life',
    'props',
    'scatter',
    'atmosphere',
    'sonar',
    'terrain',
    'wreck',
    'horizon',
  ]);
  if (root.id !== id) fail(id, 'id', `expected "${id}"`);
  const out: SiteManifest = { id };
  if (root.wreck !== undefined) {
    fields({
      hullPoi: text,
      atmosphere: fields({
        hazeParticles: count,
        hazeSizeM: aboveZero,
        hazeOpacity: fraction,
        motesPerHull: count,
        moteSizeM: aboveZero,
        moteOpacity: fraction,
        maxSizePx: aboveZero,
        maxBrightness: nonnegative,
      }),
      horizon: fields({
        name: text,
        upperColor: color,
        hazeColor: color,
        hazePeakElevation: positiveFraction,
        fogLift: nonnegative,
        fogHaze: fraction,
      }),
    })(id, 'wreck', root.wreck);
    out.wreck = root.wreck as SiteManifest['wreck'];
  }
  if (root.horizon !== undefined) {
    fields({
      upperColor: color,
      hazeColor: color,
      hazePeakElevation: positiveFraction,
      fogLift: nonnegative,
      fadeStartM: nonnegative,
      fadeEndM: aboveZero,
    })(id, 'horizon', root.horizon);
    out.horizon = root.horizon as SiteManifest['horizon'];
  }
  if (root.terrain !== undefined) {
    fields(
      {},
      {
        carve: (id, path, value) => {
          if (value !== 'canyon-bend' && value !== 'sinkhole')
            fail(id, path, 'expected canyon-bend or sinkhole');
        },
      },
    )(id, 'terrain', root.terrain);
    out.terrain = root.terrain as SiteManifest['terrain'];
  }
  if (root.sonar !== undefined) {
    fields({}, { scourHullPoi: text, maxContourIntervalM: aboveZero, reef: flag })(
      id,
      'sonar',
      root.sonar,
    );
    out.sonar = root.sonar as SiteManifest['sonar'];
  }
  if (root.atmosphere !== undefined) {
    atmosphereCheck(id, 'atmosphere', root.atmosphere);
    out.atmosphere = root.atmosphere as SiteManifest['atmosphere'];
  }
  if (root.audio !== undefined) {
    fields({}, { whaleHabitat: flag })(id, 'audio', root.audio);
    out.audio = { whaleHabitat: (root.audio as NonNullable<SiteManifest['audio']>).whaleHabitat };
  }
  if (root.events !== undefined) {
    fields(
      {},
      {
        plume: eventSpotCheck,
        turbidity: eventSpotCheck,
        whale: eventSpotCheck,
      },
    )(id, 'events', root.events);
    out.events = root.events as SiteManifest['events'];
  }
  if (root.opening !== undefined) {
    openingCheck(id, 'opening', root.opening);
    out.opening = root.opening as SiteManifest['opening'];
  }
  if (root.life !== undefined) {
    fields({}, { opening: lifeOpeningCheck })(id, 'life', root.life);
    out.life = root.life as SiteManifest['life'];
  }
  if (root.scatter !== undefined) {
    fields({}, { keepoutHero: flag })(id, 'scatter', root.scatter);
    out.scatter = root.scatter as SiteManifest['scatter'];
    if (out.scatter?.keepoutHero && !out.opening?.freeDive)
      fail(id, 'scatter.keepoutHero', 'requires opening.freeDive.hero');
  }
  if (root.props !== undefined) {
    const props = obj(id, 'props', root.props);
    for (const [key, value] of Object.entries(props)) {
      text(id, 'props', key);
      propCheck(id, `props.${key}`, value);
    }
    // Resolve compatibility defaults once, without mutating the authored data.
    out.props = Object.fromEntries(
      Object.entries(props as Record<string, PropManifest>).map(([key, prop]) => [
        key,
        prop.smoker
          ? {
              ...prop,
              smoker: {
                ...prop.smoker,
                topFraction: prop.smoker.topFraction ?? 0.45,
                throatColor: prop.smoker.throatColor ?? 0,
                bodyShade: prop.smoker.bodyShade ?? 0.95,
                bodyGlow: prop.smoker.bodyGlow ?? 0.16,
              },
            }
          : prop,
      ]),
    );
  }
  return out;
}

const bundled = import.meta.glob('../../data/landmarks/*/site.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

const manifests = new Map<string, SiteManifest>();
for (const [path, raw] of Object.entries(bundled)) {
  const id = /landmarks\/([^/]+)\/site\.json$/.exec(path)![1];
  manifests.set(id, validateSiteManifest(raw, id));
}

/** Undefined for ids without a manifest (non-landmark tiles, tests). */
export function siteManifest(id: string): SiteManifest | undefined {
  return manifests.get(id);
}

export function allSiteManifests(): readonly SiteManifest[] {
  return [...manifests.values()];
}

// Builders can also be called without a tile (previews and headless geometry tests).
// Derive their prop lookup from the same validated manifests as the runtime loader.
const propManifests = new Map<string, PropManifest>();
for (const manifest of manifests.values()) {
  for (const [id, tuning] of Object.entries(manifest.props ?? {})) {
    if (propManifests.has(id)) fail(manifest.id, `props.${id}`, 'duplicate prop id');
    propManifests.set(id, tuning);
  }
}

export function propManifest(id: string): PropManifest | undefined {
  return propManifests.get(id);
}
