/**
 * Species definition helper: per-archetype defaults that a species overrides
 * where it differs (speed, boldness, scan radius and the vertex-animation
 * mode). Used by `catalogue.ts` and `catalogueInvert.ts`.
 */

import type { Archetype, SpeciesDef } from './types.js';

type Required2 =
  'id' | 'common' | 'scientific' | 'group' | 'archetype' | 'model' | 'look' | 'size' | 'depth';
type SpeciesInput = Pick<SpeciesDef, Required2> & Partial<Omit<SpeciesDef, Required2>>;

/** Per-archetype defaults; a species overrides what differs. */
const BASE: Record<Archetype, Partial<SpeciesDef>> = {
  school: {
    visScale: 1,
    speed: [0.5, 2.6],
    skittish: 0.5,
    attract: 0.05,
    wash: 0.3,
    glow: 'none',
    glowColor: 0x66ccff,
    scanRadius: 16,
    scanSeconds: 2.2,
    maxCount: 90,
    anim: 'wave',
    amp: 0.075,
    freq: 9,
  },
  hover: {
    visScale: 1,
    speed: [0.15, 1.2],
    skittish: 0.25,
    attract: 0.1,
    wash: 0.3,
    glow: 'none',
    glowColor: 0x66ccff,
    scanRadius: 18,
    scanSeconds: 2.4,
    maxCount: 18,
    anim: 'wave',
    amp: 0.06,
    freq: 4,
  },
  cruiser: {
    visScale: 1,
    speed: [1.2, 3.2],
    skittish: 0.05,
    attract: 0,
    wash: 0,
    glow: 'none',
    glowColor: 0x66ccff,
    scanRadius: 34,
    scanSeconds: 3.2,
    maxCount: 6,
    anim: 'wave',
    amp: 0.05,
    freq: 3.2,
  },
  drifter: {
    visScale: 1,
    speed: [0.05, 0.35],
    skittish: 0,
    attract: 0,
    wash: 1,
    glow: 'flash',
    glowColor: 0x40e8ff,
    scanRadius: 14,
    scanSeconds: 2.0,
    maxCount: 30,
    anim: 'jelly',
    amp: 0.06,
    freq: 2.4,
  },
  swarm: {
    visScale: 1.8,
    speed: [0.1, 0.9],
    skittish: 0.3,
    attract: 0.5,
    wash: 0.7,
    glow: 'none',
    glowColor: 0x66ccff,
    scanRadius: 9,
    scanSeconds: 2.0,
    maxCount: 120,
    anim: 'wave',
    amp: 0.12,
    freq: 14,
  },
  crawler: {
    visScale: 1,
    speed: [0.02, 0.09],
    skittish: 0,
    attract: 0,
    wash: 0,
    glow: 'none',
    glowColor: 0x66ccff,
    scanRadius: 9,
    scanSeconds: 2.0,
    maxCount: 60,
    anim: 'crawl',
    amp: 0.05,
    freq: 2.2,
  },
  sessile: {
    visScale: 1,
    speed: [0, 0],
    skittish: 0,
    attract: 0,
    wash: 0.15,
    glow: 'none',
    glowColor: 0x66ccff,
    scanRadius: 9,
    scanSeconds: 2.0,
    maxCount: 140,
    anim: 'sway',
    amp: 0.06,
    freq: 0.9,
  },
  cephalopod: {
    visScale: 1,
    speed: [0.1, 1.6],
    skittish: 0.2,
    attract: 0.15,
    wash: 0.5,
    glow: 'none',
    glowColor: 0x66ccff,
    scanRadius: 18,
    scanSeconds: 2.6,
    maxCount: 10,
    anim: 'ceph',
    amp: 0.05,
    freq: 2.6,
  },
};

export function def(p: SpeciesInput): SpeciesDef {
  return { ...BASE[p.archetype], ...p } as SpeciesDef;
}

