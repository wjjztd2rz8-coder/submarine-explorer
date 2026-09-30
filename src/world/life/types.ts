/**
 * F2-LIFE shared types: species definitions, archetypes and the numbers the
 * simulation and the renderer both read. Pure data, no Three.js.
 */

/** The eight movement archetypes (docs/research/species.md). */
export type Archetype =
  | 'school' // boids: separation, alignment, cohesion, scatter from the lights
  | 'hover' // slow hoverer / demersal, holds an altitude above the bottom
  | 'cruiser' // large cruiser passing at a distance, sometimes curious
  | 'drifter' // midwater drifter: current advection, pulse, pushed by wash
  | 'swarm' // small vent swimmers / hadal scavengers, short bursts
  | 'crawler' // benthic walker, follows the seabed
  | 'sessile' // rooted, sways, never moves
  | 'cephalopod'; // jet and glide, arm and fin animation

export const ARCHETYPES: readonly Archetype[] = [
  'school',
  'hover',
  'cruiser',
  'drifter',
  'swarm',
  'crawler',
  'sessile',
  'cephalopod',
];

/** Vertex-shader animation modes (models/material.ts). */
export type AnimMode = 'wave' | 'jelly' | 'sway' | 'crawl' | 'ceph' | 'chain' | 'comb' | 'still';

export interface SpeciesDef {
  id: string;
  /** Common name (Journal title). */
  common: string;
  scientific: string;
  /** Journal group tag. */
  group: string;
  archetype: Archetype;
  /** Key into the model builders (models/index.ts). */
  model: string;
  /** Free-form look parameters read by the model builder. */
  look: Record<string, number | string | boolean | number[]>;
  /** Body length in metres, the real animal's order of magnitude. */
  size: number;
  /** Legibility multiplier for tiny animals (arcade; shown once in the Journal note). */
  visScale: number;
  /** Plausible placement band, positive metres. */
  depth: [number, number];
  /** Cruise and burst speed, m/s. */
  speed: [number, number];
  /** 0..1: how readily it scatters from the sub, its lights and its speed. */
  skittish: number;
  /** 0..1: how strongly it is drawn into the headlight beam. */
  attract: number;
  /** 0..1: how far thruster wash pushes it. */
  wash: number;
  /** Bioluminescence: colour (hex) and how it behaves. `none` for most. */
  glow: 'none' | 'flash' | 'steady' | 'photophores';
  glowColor: number;
  /** Altitude band above the seabed (hover / swarm / crawler), metres. */
  altitude?: [number, number];
  /** Radius inside which the scanner sees it, metres; scan hold time, seconds. */
  scanRadius: number;
  scanSeconds: number;
  /** Cap on live instances of this species. */
  maxCount: number;
  /** Anim mode and its amplitude (fraction of body length) and wave frequency (rad/s). */
  anim: AnimMode;
  amp: number;
  freq: number;
  /** Vertical wave (whales, seals) instead of a lateral one. */
  vertical?: boolean;
  /** Rare-encounter species, spawned only by the site's `rare` rule. */
  rare?: boolean;
}

/** One row of a site's spawn table (data/life.json). */
export interface SpawnEntry {
  species: string;
  /** Relative abundance: groups wanted near the sub (scaled by tier density). */
  weight: number;
  /** Placement band for this site, positive metres (inside the species' own). */
  depth: [number, number];
  /** Individuals per group. */
  group: [number, number];
}

export interface RareRule {
  species: string;
  depth: [number, number];
  /** Chance per minute while the sub is inside the band. */
  chancePerMin: number;
  /** Minimum seconds between two appearances. */
  cooldownS: number;
}

export interface SiteTable {
  spawns: SpawnEntry[];
  rare?: RareRule;
}

export interface LifeJournalEntry {
  text: string;
  facts?: Record<string, string>;
  sourceTitle: string;
  sourceUrl: string;
}

export interface LifeDoc {
  version: number;
  species: Record<string, LifeJournalEntry>;
  sites: Record<string, SiteTable>;
}

/** Per-tier budgets (draw calls are the number of species meshes plus one spark layer). */
export interface LifeTier {
  /** Live animals at most. */
  maxAgents: number;
  /** Distinct species meshes visible at once (extra draw calls, sparks excluded). */
  maxSpecies: number;
  /** Spawn/despawn radius, metres. */
  radius: number;
  /** Multiplier on a table's group weights. */
  density: number;
  /** Model detail 0 low, 1 medium, 2 high. */
  detail: 0 | 1 | 2;
  /** Bioluminescent spark pool. */
  sparks: number;
  /** Sessile/benthic placement cell edge, metres (bigger = fewer). */
  cell: number;
}

export const LIFE_TIERS: Record<'low' | 'medium' | 'high' | 'ultra', LifeTier> = {
  low: { maxAgents: 44, maxSpecies: 4, radius: 55, density: 0.55, detail: 0, sparks: 48, cell: 36 },
  medium: {
    maxAgents: 100,
    maxSpecies: 8,
    radius: 80,
    density: 0.85,
    detail: 1,
    sparks: 140,
    cell: 30,
  },
  high: {
    maxAgents: 180,
    maxSpecies: 11,
    radius: 110,
    density: 1.15,
    detail: 2,
    sparks: 260,
    cell: 26,
  },
  ultra: {
    maxAgents: 280,
    maxSpecies: 11,
    radius: 140,
    density: 1.5,
    detail: 2,
    sparks: 420,
    cell: 22,
  },
};
