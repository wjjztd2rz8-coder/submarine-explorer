/**
 * Wreck builders (docs/props.md, "Wrecks"): the one entry point the prop
 * system calls for a props.json entry carrying a `wreck` key.
 *
 *   titanic-bow / titanic-stern / bismarck / endurance   (procedural:hull-block)
 *   titanic-* / bismarck-* / endurance-* scatter kits     (procedural:debris)
 *
 * Hulls return near/mid LODs, a far silhouette and compound colliders; scatter
 * kits return one InstancedMesh per piece type (terrain-following, like
 * `procedural:debris`). Detail scales with the quality tier (detail.ts).
 */

import { buildBismarck } from './bismarck.js';
import { wreckDetail } from './detail.js';
import { buildEndurance } from './endurance.js';
import { buildWreckScatter } from './scatter.js';
import type { LocalHeightFn } from './shared.js';
import type { WreckBuilt } from './assemble.js';
import { buildTitanicBow } from './titanicBow.js';
import { buildTitanicStern } from './titanicStern.js';
import { isWreckHull, isWreckScatter, type WreckId } from './variants.js';

export type { WreckBuilt } from './assemble.js';
export { WRECK_HULLS, WRECK_SCATTERS, isWreckHull, isWreckScatter } from './variants.js';
export type { WreckId } from './variants.js';

/**
 * Build a named wreck or scatter kit.
 *
 * @param dims    props.json `dimensions_m` ([length, beam, height]; scatter: [radius, width, height])
 * @param seed    hash of the prop id
 * @param tier    graphics tier name (`low` / `medium` / `high` / `ultra`)
 * @param heightAt terrain height in the prop's local frame (scatter kits)
 */
export function buildWreck(
  id: WreckId,
  dims: readonly [number, number, number],
  seed: number,
  tier: string,
  heightAt?: LocalHeightFn,
): WreckBuilt {
  const detail = wreckDetail(tier);
  if (isWreckHull(id)) {
    switch (id) {
      case 'titanic-bow':
        return buildTitanicBow(dims, seed, detail);
      case 'titanic-stern':
        return buildTitanicStern(dims, seed, detail);
      case 'bismarck':
        return buildBismarck(dims, seed, detail);
      case 'endurance':
        return buildEndurance(dims, seed, detail);
    }
  }
  if (isWreckScatter(id)) return buildWreckScatter(id, dims, seed, detail, heightAt);
  throw new Error(`unknown wreck "${String(id)}"`);
}
