import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SPONGE_LIMITS, wallSpongeSpec, type SpongeKind } from '../../src/world/props/geo/scarp.js';

describe('f-monterey-polish', () => {
  it('wall sponges stay small, dull and varied', () => {
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const hsl = { h: 0, s: 0, l: 0 };
    const heights = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const kind = (i % 3) as SpongeKind;
      const sp = wallSpongeSpec(kind, 0, 0, 0, -1, rnd);
      expect(sp.t.sx).toBeLessThanOrEqual(SPONGE_LIMITS.maxScale);
      expect(sp.t.sy).toBeLessThanOrEqual(SPONGE_LIMITS.maxScale);
      (sp.color as THREE.Color).getHSL(hsl);
      expect(hsl.s).toBeLessThanOrEqual(SPONGE_LIMITS.maxSat + 1e-6);
      expect(hsl.l).toBeLessThanOrEqual(SPONGE_LIMITS.maxLight + 1e-6);
      heights.add(Math.round((sp.t.sy / sp.t.sx) * 4));
    }
    expect(heights.size).toBeGreaterThan(3);
  });

  it('puts both flanks inward-facing and the west wall in front of spawn', () => {
    const doc = JSON.parse(readFileSync('data/landmarks/monterey-canyon/props.json', 'utf8')) as {
      props: { id: string; lat: number; lon: number; heading_deg: number }[];
    };
    const get = (id: string) => doc.props.find((p) => p.id === id)!;
    const west = get('canyon-wall-west');
    const east = get('canyon-wall-east');
    expect(west.lon).toBeLessThan(east.lon);
    expect(west.heading_deg).toBe(90);
    expect(east.heading_deg).toBe(270);
    expect(get('canyon-wall-far')).toBeTruthy();
    // Within roughly 150 m north of the ledge so it sits in the first-shot frame.
    expect(west.lat).toBeGreaterThanOrEqual(get('canyon-wall-ledge').lat - 0.0005);
  });
});
