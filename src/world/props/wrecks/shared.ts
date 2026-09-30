/**
 * The one place the wreck builders import from the generic procedural props
 * code, so moving those helpers only has to touch this file. Imports the
 * builders' shared module directly (not the registry barrel), because the
 * registry itself imports the wrecks.
 */

export {
  hashString,
  mulberry32,
  valueNoise3,
  type BuiltProp,
  type LocalHeightFn,
} from '../builders/shared.js';
