/**
 * Geology builders: `procedural:geo`, the hand-built set pieces in
 * `props/geo/` (carbonate towers, pillow lava, stalactite alcoves, caldera,
 * canyon and trench scarps, smoker clusters and coral mounds). See
 * `props/geo/index.ts`. To add a feature, extend `GEO_FEATURES`
 * (`geo/features.ts`) and `GEO_FEATURES` in `tools/validate_props.py`.
 */

import { buildGeo } from '../geo/index.js';
import type { ProceduralBuilder } from './shared.js';

/** Registry entries for this family (`builders/index.ts`). */
export const GEOLOGY_BUILDERS = {
  geo: (input) => buildGeo(input),
} satisfies Record<'geo', ProceduralBuilder>;
