/**
 * Per-site tuning lives in data/landmarks/<id>/site.json so shared code never
 * branches on a site id. Add a new concern as another optional section here,
 * in validateSiteManifest, and in the sites' JSON; nothing else changes.
 */
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
  chaseAim?: { x: number; y: number; z: number };
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

export interface SiteManifest {
  id: string;
  opening?: {
    mission?: { rangeM: number; destinationLabel?: string; localAltitudeWeight?: number };
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
  audio?: {
    /** Habitat whale calls may play here (separate from event whale eligibility). */
    whaleHabitat?: boolean;
  };
  events?: {
    /** Vent plume when the sub is below this altitude above the seabed. */
    plume?: { maxAltitudeM: number };
    /** Silt cloud when the sub is below this altitude above the seabed. */
    turbidity?: { maxAltitudeM: number };
    /** Whale passing when shallower than this depth. */
    whale?: { maxDepthM: number };
  };
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

function positive(id: string, path: string, o: Obj, key: string): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0)
    fail(id, `${path}.${key}`, 'expected a positive number');
  return v;
}

function section(id: string, root: Obj, name: string, key: string): Obj | undefined {
  const parent = root[name] === undefined ? undefined : obj(id, name, root[name]);
  if (!parent || parent[key] === undefined) return undefined;
  return obj(id, `${name}.${key}`, parent[key]);
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
  chaseAim: fields({ x: finite, y: finite, z: finite }),
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
    mission: fields({ rangeM: aboveZero }, { destinationLabel: text, localAltitudeWeight: finite }),
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

/** Throws with the site id and field path on the first problem. */
export function validateSiteManifest(raw: unknown, id: string): SiteManifest {
  const root = obj(id, '$', raw);
  noExtra(id, '$', root, ['id', 'audio', 'events', 'opening', 'life']);
  if (root.id !== id) fail(id, 'id', `expected "${id}"`);
  const out: SiteManifest = { id };
  if (root.audio !== undefined) {
    const a = obj(id, 'audio', root.audio);
    noExtra(id, 'audio', a, ['whaleHabitat']);
    if (a.whaleHabitat !== undefined && typeof a.whaleHabitat !== 'boolean')
      fail(id, 'audio.whaleHabitat', 'expected a boolean');
    out.audio = { whaleHabitat: a.whaleHabitat as boolean | undefined };
  }
  if (root.events !== undefined) {
    noExtra(id, 'events', obj(id, 'events', root.events), ['plume', 'turbidity', 'whale']);
    const events: NonNullable<SiteManifest['events']> = {};
    const plume = section(id, root, 'events', 'plume');
    if (plume) {
      noExtra(id, 'events.plume', plume, ['maxAltitudeM']);
      events.plume = { maxAltitudeM: positive(id, 'events.plume', plume, 'maxAltitudeM') };
    }
    const turbidity = section(id, root, 'events', 'turbidity');
    if (turbidity) {
      noExtra(id, 'events.turbidity', turbidity, ['maxAltitudeM']);
      events.turbidity = {
        maxAltitudeM: positive(id, 'events.turbidity', turbidity, 'maxAltitudeM'),
      };
    }
    const whale = section(id, root, 'events', 'whale');
    if (whale) {
      noExtra(id, 'events.whale', whale, ['maxDepthM']);
      events.whale = { maxDepthM: positive(id, 'events.whale', whale, 'maxDepthM') };
    }
    out.events = events;
  }
  if (root.opening !== undefined) {
    openingCheck(id, 'opening', root.opening);
    out.opening = root.opening as SiteManifest['opening'];
  }
  if (root.life !== undefined) {
    fields({}, { opening: lifeOpeningCheck })(id, 'life', root.life);
    out.life = root.life as SiteManifest['life'];
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
