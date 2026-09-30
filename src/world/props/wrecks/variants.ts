/**
 * Named wreck builders (docs/props.md, "Wrecks"). Kept free of three.js so the
 * props.json loader and its tests can validate a `wreck` key cheaply.
 *
 * A props.json entry opts into a hand-built wreck by adding `"wreck": "<id>"`
 * to a `procedural:hull-block` (a hull) or `procedural:debris` (a scatter kit)
 * entry. Everything else about the entry (position, heading, snapping, LOD
 * distance, collision) keeps its usual meaning, so an unknown engine simply
 * falls back to the generic builder of the same kind.
 */

/** Hull builders, used with `procedural:hull-block`. */
export const WRECK_HULLS = ['titanic-bow', 'titanic-stern', 'bismarck', 'endurance'] as const;

/** Scatter kits, used with `procedural:debris`; terrain-following like debris. */
export const WRECK_SCATTERS = [
  'titanic-boilers',
  'titanic-field',
  'titanic-stern-field',
  'bismarck-turrets',
  'bismarck-field',
  'bismarck-landslide',
  'endurance-rigging',
  'endurance-stern',
] as const;

export type WreckHullId = (typeof WRECK_HULLS)[number];
export type WreckScatterId = (typeof WRECK_SCATTERS)[number];
export type WreckId = WreckHullId | WreckScatterId;

export function isWreckHull(v: unknown): v is WreckHullId {
  return typeof v === 'string' && (WRECK_HULLS as readonly string[]).includes(v);
}

export function isWreckScatter(v: unknown): v is WreckScatterId {
  return typeof v === 'string' && (WRECK_SCATTERS as readonly string[]).includes(v);
}
