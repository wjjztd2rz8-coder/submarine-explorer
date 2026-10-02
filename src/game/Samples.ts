import { Vector3 } from 'three';
import { EXPLORE_CONFIG } from '../core/config/explore.js';
import type { ScanTarget } from './Scanner.js';
import type { SampleDef } from './Secrets.js';
import { latLonToWorld } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';

export interface SampleTarget extends ScanTarget {
  def: SampleDef;
}
/** Collection belongs to one dive, even when the same material was collected before. */
export class Samples {
  readonly collected = new Map<string, string>();
  collect(target: SampleTarget): boolean {
    if (this.collected.has(target.id)) return false;
    this.collected.set(target.id, target.def.name);
    return true;
  }
  reset(): void {
    this.collected.clear();
  }
}
export function placeSamples(
  defs: readonly SampleDef[],
  site: string,
  meta: TileMeta,
  ground: (x: number, z: number) => number,
): SampleTarget[] {
  return defs.map((def) => {
    const { x, z } = latLonToWorld(meta, def.lat, def.lon);
    return {
      id: `sample:${def.id}`,
      name: `Sample · ${def.name}`,
      landmarkId: site,
      position: new Vector3(x, ground(x, z) + 0.6, z),
      radius: EXPLORE_CONFIG.sampleRangeM,
      scanSeconds: EXPLORE_CONFIG.sampleSeconds,
      def,
    };
  });
}
