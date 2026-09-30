/**
 * Procedural prop registry (plan/PHASE-B-CONTRACTS.md §2.3): maps each
 * `procedural:<kind>` to its family builder.
 *
 *   wrecks.ts   hull-block, debris        (wrecks package)
 *   vents.ts    chimney                   (vents / reefs / geology package)
 *   reefs.ts    —                         (vents / reefs / geology package)
 *   geology.ts  —                         (vents / reefs / geology package)
 *   generic.ts  box silhouette impostors  (shared)
 *   util.ts     seeding, noise, geometry helpers and the builder types
 *
 * Every builder is deterministic from its seed (hash of the prop id), so a prop
 * looks the same on every load and in every test. Local frame: base at y = 0,
 * centred on x/z, -Z forward. Materials follow docs/art-direction.md §4 and are
 * MeshStandardMaterial so scene fog and the headlights act on them like the
 * terrain. The `satisfies` below fails to compile if a kind has no builder.
 */

import type { ProceduralPropKind } from '../../../core/Config.js';
import { GEOLOGY_BUILDERS } from './geology.js';
import { REEF_BUILDERS } from './reefs.js';
import type { ProceduralBuilder } from './util.js';
import { VENT_BUILDERS } from './vents.js';
import { WRECK_BUILDERS } from './wrecks.js';

export const PROCEDURAL_BUILDERS = {
  ...WRECK_BUILDERS,
  ...VENT_BUILDERS,
  ...REEF_BUILDERS,
  ...GEOLOGY_BUILDERS,
} satisfies Record<ProceduralPropKind, ProceduralBuilder>;

export * from './generic.js';
export * from './util.js';
export * from './vents.js';
export * from './wrecks.js';
