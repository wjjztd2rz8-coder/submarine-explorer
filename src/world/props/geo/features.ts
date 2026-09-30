/**
 * The `procedural:geo` set pieces (props.json `feature`). Keep in step with
 * `GEO_FEATURES` in `tools/validate_props.py`.
 */

export const GEO_FEATURES = [
  'smoker-cluster',
  'carbonate-tower',
  'coral-mound',
  'stalactite-cluster',
  'pillow-field',
  'tuff-cliff',
  'canyon-ledge',
  'hadal-scarp',
] as const;

export type GeoFeatureId = (typeof GEO_FEATURES)[number];

export function isGeoFeature(v: unknown): v is GeoFeatureId {
  return typeof v === 'string' && (GEO_FEATURES as readonly string[]).includes(v);
}
