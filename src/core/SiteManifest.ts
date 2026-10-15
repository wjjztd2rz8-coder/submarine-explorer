/**
 * Per-site tuning lives in data/landmarks/<id>/site.json so shared code never
 * branches on a site id. Add a new concern as another optional section here,
 * in validateSiteManifest, and in the sites' JSON; nothing else changes.
 */
export interface SiteManifest {
  id: string;
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

/** Throws with the site id and field path on the first problem. */
export function validateSiteManifest(raw: unknown, id: string): SiteManifest {
  const root = obj(id, '$', raw);
  noExtra(id, '$', root, ['id', 'audio', 'events']);
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
