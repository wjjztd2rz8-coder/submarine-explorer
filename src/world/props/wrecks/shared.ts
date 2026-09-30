/**
 * The one place the wreck builders import from the generic procedural props
 * module, so moving those helpers (F0-CORE's builders/ split) only has to
 * touch this file.
 */

export {
  hashString,
  mulberry32,
  valueNoise3,
  type BuiltProp,
  type LocalHeightFn,
} from '../Procedural.js';
