/**
 * props.json loading and validation (plan/PHASE-B-CONTRACTS.md §2.3), plus the
 * GLB model cache.
 *
 * Content files are written by other agents and people, so everything here is
 * defensive: a bad entry is logged with `console.warn` and skipped, never
 * thrown, and a missing file simply means "no props". The same rules are
 * enforced offline by `tools/validate_props.py`; keep the two in step.
 *
 * Depth convention: `depth_m` is a POSITIVE magnitude ("3800 m deep"). The
 * engine converts it to world Y with `-depth_m`. `snap_to_seabed: true` samples
 * the terrain instead.
 */

import type * as THREE from 'three';
import { publicUrl } from '../util/publicUrl.js';
import type {
  HullEnd,
  PropCollisionKind,
  ProceduralPropKind,
  PropsConfig,
} from '../core/Config.js';

export const PROCEDURAL_PREFIX = 'procedural:';
export const PROCEDURAL_KINDS: readonly ProceduralPropKind[] = ['hull-block', 'debris', 'chimney'];
/** Allowed values in a hull-block's `ends: [forward, aft]`. */
export const HULL_ENDS: readonly HullEnd[] = ['prow', 'cut', 'rounded'];
/** GLB/glTF models must live here (served from `public/assets/models`). */
export const MODEL_URL_PREFIX = '/assets/models/';
export const DRACO_DECODER_PATH = publicUrl('/assets/decoders/draco/');

/** A validated, defaults-filled props.json entry. */
export interface PropDef {
  id: string;
  /** Raw `model` string. */
  model: string;
  /** Set for `procedural:<kind>`; null for a GLB URL. */
  procedural: ProceduralPropKind | null;
  lat: number;
  lon: number;
  /** Positive depth magnitude, or null when snapping to the seabed. */
  depthM: number | null;
  snapToSeabed: boolean;
  /** Added to the resolved Y (m), e.g. to half-bury a hull. */
  yOffsetM: number;
  headingDeg: number;
  scale: [number, number, number];
  /** [length, width, height] for procedural props; null for models without it. */
  dimensionsM: [number, number, number] | null;
  /** hull-block only: [forward (-Z) end, aft (+Z) end] shapes; null for other kinds. */
  hullEnds: [HullEnd, HullEnd] | null;
  lodDistanceM: number;
  collision: PropCollisionKind;
  /** Tilt the prop to the terrain normal (only meaningful when snapping). */
  alignToSlope: boolean;
  reconstruction: boolean;
  note: string | null;
  /** The entry as authored (unknown keys kept), for the placement tool's JSON output. */
  raw: Record<string, unknown>;
}

export interface ParseResult {
  landmark: string | null;
  props: PropDef[];
  /** One human-readable line per skipped entry or file-level problem. */
  errors: string[];
  /** Non-fatal notes (entry kept). */
  warnings: string[];
}

const COLLISIONS: readonly PropCollisionKind[] = ['none', 'sphere', 'box'];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isPositiveTriple(v: unknown, allowZero: boolean): v is [number, number, number] {
  return (
    Array.isArray(v) && v.length === 3 && v.every((n) => isNum(n) && (allowZero ? n >= 0 : n > 0))
  );
}

/** `procedural:hull-block` -> `hull-block`; a model URL -> null; anything else -> undefined (invalid). */
export function parseModel(model: string): ProceduralPropKind | null | undefined {
  if (model.startsWith(PROCEDURAL_PREFIX)) {
    const kind = model.slice(PROCEDURAL_PREFIX.length) as ProceduralPropKind;
    return PROCEDURAL_KINDS.includes(kind) ? kind : undefined;
  }
  if (model.startsWith(MODEL_URL_PREFIX) && !model.includes('..') && /\.(glb|gltf)$/i.test(model)) {
    return null;
  }
  return undefined;
}

/** Content models use the site base; explicit cache URLs retain their meaning. */
export function modelLoadUrl(url: string, base = import.meta.env.BASE_URL): string {
  return url.startsWith(MODEL_URL_PREFIX) ? publicUrl(url, base) : url;
}

/**
 * Validate one entry. Returns the filled-in definition, or an error string
 * explaining why the entry must be skipped. `warnings` collects notes about
 * entries that are kept.
 */
export function validatePropEntry(
  entry: unknown,
  config: PropsConfig,
  warnings: string[] = [],
): PropDef | string {
  if (!isObj(entry)) return 'entry is not an object';
  const id = entry.id;
  if (typeof id !== 'string' || id.trim() === '') return 'missing or empty "id"';
  const where = `prop "${id}"`;

  if (typeof entry.model !== 'string') return `${where}: missing "model"`;
  const procedural = parseModel(entry.model);
  if (procedural === undefined) {
    return (
      `${where}: bad "model" ${JSON.stringify(entry.model)} (expected ` +
      `procedural:${PROCEDURAL_KINDS.join('|')} or ${MODEL_URL_PREFIX}<file>.glb)`
    );
  }

  const { lat, lon } = entry;
  if (!isNum(lat) || lat < -90 || lat > 90) return `${where}: "lat" must be a number in [-90, 90]`;
  if (!isNum(lon) || lon < -180 || lon > 180) {
    return `${where}: "lon" must be a number in [-180, 180]`;
  }

  const snap = entry.snap_to_seabed === true;
  let depthM: number | null = null;
  if (entry.depth_m !== undefined) {
    if (!isNum(entry.depth_m)) return `${where}: "depth_m" must be a number`;
    if (entry.depth_m < 0) {
      return `${where}: "depth_m" must be a positive depth magnitude (got ${entry.depth_m}); world Y is -depth_m`;
    }
    depthM = entry.depth_m;
  }
  if (!snap && depthM === null) return `${where}: needs "depth_m" or "snap_to_seabed": true`;
  if (snap && depthM !== null) {
    warnings.push(`${where}: both "depth_m" and "snap_to_seabed"; snapping wins`);
    depthM = null;
  }

  let yOffsetM = 0;
  if (entry.y_offset_m !== undefined) {
    if (!isNum(entry.y_offset_m)) return `${where}: "y_offset_m" must be a number`;
    yOffsetM = entry.y_offset_m;
  }

  let headingDeg = 0;
  if (entry.heading_deg !== undefined) {
    if (!isNum(entry.heading_deg)) return `${where}: "heading_deg" must be a number`;
    headingDeg = ((entry.heading_deg % 360) + 360) % 360;
  }

  let scale: [number, number, number] = [1, 1, 1];
  if (entry.scale !== undefined) {
    if (isNum(entry.scale) && entry.scale > 0) scale = [entry.scale, entry.scale, entry.scale];
    else if (isPositiveTriple(entry.scale, false)) scale = [...entry.scale];
    else return `${where}: "scale" must be a positive number or [x, y, z]`;
  }

  let dimensionsM: [number, number, number] | null = null;
  if (entry.dimensions_m !== undefined) {
    if (!isPositiveTriple(entry.dimensions_m, true)) {
      return `${where}: "dimensions_m" must be [length, width, height] of non-negative numbers`;
    }
    dimensionsM = [...entry.dimensions_m];
  }
  if (procedural) {
    const defaults = config.defaultDimensionsM[procedural];
    if (!dimensionsM) {
      warnings.push(`${where}: no "dimensions_m"; using default [${defaults.join(', ')}]`);
      dimensionsM = [...defaults];
    }
    // The dimension each kind actually needs must be > 0.
    const needed = procedural === 'chimney' ? 2 : 0;
    if (!(dimensionsM[needed]! > 0)) {
      return `${where}: dimensions_m[${needed}] must be > 0 for procedural:${procedural}`;
    }
    if (procedural === 'hull-block' && !(dimensionsM[1] > 0 && dimensionsM[2] > 0)) {
      return `${where}: hull-block needs all three dimensions_m > 0`;
    }
  }

  let hullEnds: [HullEnd, HullEnd] | null = null;
  if (entry.ends !== undefined) {
    const e = entry.ends;
    if (!Array.isArray(e) || e.length !== 2 || !e.every((v) => HULL_ENDS.includes(v as HullEnd))) {
      return `${where}: "ends" must be [forward, aft], each one of ${HULL_ENDS.join(' | ')}`;
    }
    if (procedural === 'hull-block') hullEnds = [e[0] as HullEnd, e[1] as HullEnd];
    else warnings.push(`${where}: "ends" only applies to procedural:hull-block; ignored`);
  }
  if (procedural === 'hull-block' && !hullEnds) hullEnds = [...config.hullDefaultEnds];

  let lodDistanceM = config.defaultLodDistanceM;
  if (entry.lod_distance_m !== undefined) {
    if (!isNum(entry.lod_distance_m) || entry.lod_distance_m <= 0) {
      return `${where}: "lod_distance_m" must be a positive number`;
    }
    lodDistanceM = entry.lod_distance_m;
  }

  let collision = config.defaultCollision[procedural ?? 'model'];
  if (entry.collision !== undefined) {
    if (!COLLISIONS.includes(entry.collision as PropCollisionKind)) {
      return `${where}: "collision" must be one of ${COLLISIONS.join(' | ')}`;
    }
    collision = entry.collision as PropCollisionKind;
  }

  const alignToSlope = entry.align_to_slope === true;
  if (alignToSlope && !snap) warnings.push(`${where}: "align_to_slope" only applies when snapping`);

  return {
    id,
    model: entry.model,
    procedural,
    lat,
    lon,
    depthM,
    snapToSeabed: snap,
    yOffsetM,
    headingDeg,
    scale,
    dimensionsM,
    hullEnds,
    lodDistanceM,
    collision,
    alignToSlope: alignToSlope && snap,
    reconstruction: entry.reconstruction === true,
    note: typeof entry.note === 'string' ? entry.note : null,
    raw: { ...entry },
  };
}

/**
 * Validate a whole props.json document. Bad entries are reported in `errors`
 * and left out; duplicate ids keep the first occurrence.
 */
export function parsePropsDoc(doc: unknown, config: PropsConfig): ParseResult {
  const out: ParseResult = { landmark: null, props: [], errors: [], warnings: [] };
  let list: unknown;
  if (Array.isArray(doc)) {
    list = doc;
  } else if (isObj(doc)) {
    if (doc.version !== undefined && doc.version !== 1) {
      out.warnings.push(`props.json version ${String(doc.version)} is not 1; reading it anyway`);
    }
    if (typeof doc.landmark === 'string') out.landmark = doc.landmark;
    list = doc.props;
  }
  if (!Array.isArray(list)) {
    out.errors.push('props.json has no "props" array');
    return out;
  }
  const seen = new Set<string>();
  list.forEach((entry, i) => {
    const res = validatePropEntry(entry, config, out.warnings);
    if (typeof res === 'string') {
      out.errors.push(`props[${i}]: ${res}`);
      return;
    }
    if (seen.has(res.id)) {
      out.errors.push(`props[${i}]: duplicate id "${res.id}"`);
      return;
    }
    if (out.props.length >= config.maxProps) {
      out.errors.push(`props[${i}]: over the ${config.maxProps}-prop cap (Config.props.maxProps)`);
      return;
    }
    seen.add(res.id);
    out.props.push(res);
  });
  return out;
}

// ------------------------------------------------------------------ models

/**
 * Loads each GLB once and hands out clones. The three.js loaders are imported
 * lazily so the rest of this module (and its unit tests) never pull in the
 * decoders unless a props.json actually references a model.
 */
export class ModelCache {
  private readonly pending = new Map<string, Promise<THREE.Object3D>>();
  private loader: Promise<{ loadAsync(url: string): Promise<{ scene: THREE.Group }> }> | null =
    null;

  private getLoader(): Promise<{ loadAsync(url: string): Promise<{ scene: THREE.Group }> }> {
    this.loader ??= (async () => {
      const [{ GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
        import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      ]);
      const draco = new DRACOLoader();
      draco.setDecoderPath(DRACO_DECODER_PATH);
      const gltf = new GLTFLoader();
      gltf.setDRACOLoader(draco);
      gltf.setMeshoptDecoder(MeshoptDecoder);
      return gltf;
    })();
    return this.loader;
  }

  /** Resolve to a fresh clone of the model's scene (geometry and materials shared). */
  async get(url: string): Promise<THREE.Object3D> {
    let p = this.pending.get(url);
    if (!p) {
      const loadUrl = modelLoadUrl(url);
      p = this.getLoader().then((l) => l.loadAsync(loadUrl).then((g) => g.scene));
      this.pending.set(url, p);
    }
    const scene = await p;
    return scene.clone(true);
  }

  /** Number of distinct model files requested. */
  get size(): number {
    return this.pending.size;
  }
}
