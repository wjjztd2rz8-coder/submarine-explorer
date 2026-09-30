/**
 * Model registry: one builder per model key. A species picks a key and a
 * `look` (numbers and hex colours); `buildSpeciesGeometry` returns the static
 * mesh the instanced renderer draws.
 */

import type * as THREE from 'three';
import {
  buildCoralDome,
  buildAnemone,
  buildCrinoid,
  buildGorgonian,
  buildSeaPen,
  buildSponge,
  buildTubeworm,
} from './sessile.js';
import { buildCucumber, buildShrimp, buildSquatLobster, buildStar } from './benthic.js';
import { buildOctopus, buildSquid, buildVampire } from './ceph.js';
import { buildComb, buildMedusa, buildSiphonophore } from './jelly.js';
import { buildFish } from './fish.js';
import type { Look } from './look.js';

export type { Look } from './look.js';
export type ModelBuilder = (look: Look, size: number, detail: 0 | 1 | 2) => THREE.BufferGeometry;

export const MODEL_BUILDERS: Record<string, ModelBuilder> = {
  fish: buildFish,
  medusa: buildMedusa,
  comb: buildComb,
  siphonophore: buildSiphonophore,
  shrimp: buildShrimp,
  star: buildStar,
  cucumber: buildCucumber,
  lobster: buildSquatLobster,
  tubeworm: buildTubeworm,
  crinoid: buildCrinoid,
  seapen: buildSeaPen,
  gorgonian: buildGorgonian,
  anemone: buildAnemone,
  sponge: buildSponge,
  coral: buildCoralDome,
  octopus: buildOctopus,
  vampire: buildVampire,
  squid: buildSquid,
};

export function buildSpeciesGeometry(
  model: string,
  look: Look,
  size: number,
  detail: 0 | 1 | 2,
): THREE.BufferGeometry {
  const builder = MODEL_BUILDERS[model];
  if (!builder) throw new Error(`life: unknown model "${model}"`);
  return builder(look, size, detail);
}
