/**
 * Geology and biology set pieces (`procedural:geo`, props.json `feature`).
 * One kit: detail textures (`textures.ts`), tier table (`detail.ts`), animated
 * plumes (`plume.ts`) and a builder per feature. Every builder is deterministic
 * from the prop's seed.
 */

import { buildCarbonateTower } from './towers.js';
import { buildCoralMound } from './coral.js';
import type { GeoFeatureId } from './features.js';
import { buildPillowField } from './pillow.js';
import { buildScarp } from './scarp.js';
import { buildSmokerCluster } from './smokers.js';
import { buildStalactiteCluster } from './stalactites.js';
import type { BuiltProp } from './shared.js';
import type { GeoBuildInput } from './types.js';

export * from './features.js';
export { GEO_DETAIL, geoDetail, type GeoDetail } from './detail.js';
export { countGeo } from './shared.js';

const BUILDERS: Record<GeoFeatureId, (i: GeoBuildInput) => BuiltProp> = {
  'smoker-cluster': buildSmokerCluster,
  'carbonate-tower': buildCarbonateTower,
  'coral-mound': buildCoralMound,
  'stalactite-cluster': buildStalactiteCluster,
  'pillow-field': buildPillowField,
  'tuff-cliff': (i) => buildScarp('tuff', i),
  'canyon-ledge': (i) => buildScarp('canyon', i),
  'hadal-scarp': (i) => buildScarp('hadal', i),
};

/** Build one geo feature; a missing `feature` gives a plain lumpy outcrop (tuff scarp). */
export function buildGeo(input: GeoBuildInput): BuiltProp {
  const id = input.def.feature;
  return id ? BUILDERS[id](input) : buildScarp('canyon', input);
}
