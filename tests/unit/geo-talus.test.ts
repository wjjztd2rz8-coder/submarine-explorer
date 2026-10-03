import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { buildGeo, type GeoFeatureId } from '../../src/world/props/geo/index.js';
import { endRatio, pinchScale } from '../../src/world/props/geo/scarp.js';
import { hashString } from '../../src/world/props/geo/shared.js';
import {
  buildTalusMesh,
  isSupported,
  placeRocks,
  rockMatrix,
  seatedCentre,
  talusDepth,
  talusNormal,
  talusSurface,
  type TalusShape,
} from '../../src/world/props/geo/talus.js';
import type { PropDef } from '../../src/world/PropLoader.js';

/** A sloping seabed with a gentle swell, so a flat-ground shortcut would show. */
const ground = (x: number, z: number): number => -0.22 * z + 0.04 * x + 1.5 * Math.sin(x * 0.2);

const shape: TalusShape = {
  gnd: ground,
  foot: (x) => -6 + 0.01 * x * x,
  reach: (x) => 18 * Math.max(0, 1 - Math.abs(x) / 45),
  top: () => 6,
  seed: 5,
};

describe('talus surface', () => {
  it('is zero thickness outside the apron and thick at the foot', () => {
    expect(talusDepth(shape, 0, shape.foot(0) - 19)).toBe(0);
    expect(talusDepth(shape, 50, shape.foot(50) - 1)).toBe(0); // no reach at the wall end
    expect(talusDepth(shape, 0, shape.foot(0) - 0.5)).toBeGreaterThan(4);
  });

  it('thins outward on average and never goes negative', () => {
    const mean = (u0: number): number => {
      let sum = 0;
      for (let x = -20; x <= 20; x += 2)
        sum += talusDepth(shape, x, shape.foot(x) - u0 * shape.reach(x));
      return sum / 21;
    };
    expect(mean(0.1)).toBeGreaterThan(mean(0.4));
    expect(mean(0.4)).toBeGreaterThan(mean(0.8));
    for (let x = -40; x <= 40; x += 3) {
      for (let s = -2; s < 22; s += 0.7) {
        expect(talusDepth(shape, x, shape.foot(x) - s)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('surface is ground plus thickness and its normal points up', () => {
    const z = shape.foot(3) - 5;
    expect(talusSurface(shape, 3, z)).toBeCloseTo(ground(3, z) + talusDepth(shape, 3, z), 9);
    const n = talusNormal(shape, 3, z);
    expect(n.length()).toBeCloseTo(1, 6);
    expect(n.y).toBeGreaterThan(0.3);
  });
});

describe('rocks sit on the final apron surface', () => {
  const spots = placeRocks(shape, 90, 200, 11, { size: 0.9, blocks: 0.06, span: 0.45 });

  it('places the requested count, deterministically', () => {
    expect(spots.length).toBeGreaterThan(150);
    expect(placeRocks(shape, 90, 200, 11, { size: 0.9, blocks: 0.06, span: 0.45 })[7]!.x).toBe(
      spots[7]!.x,
    );
  });

  it('every spot is on the surface, inside the apron, with an upward normal', () => {
    for (const s of spots) {
      expect(s.y).toBeCloseTo(talusSurface(shape, s.x, s.z), 9);
      expect(s.u).toBeGreaterThanOrEqual(0);
      expect(s.u).toBeLessThan(1);
      expect(s.z).toBeLessThanOrEqual(shape.foot(s.x));
      expect(s.n.y).toBeGreaterThan(0);
    }
  });

  it('every rock is embedded in the surface at its centre and supported at its rim', () => {
    const squash = 0.6;
    for (const s of spots) {
      const m = rockMatrix(s, 1.3, squash);
      const p = new THREE.Vector3().setFromMatrixPosition(m);
      const up = new THREE.Vector3(0, 1, 0).applyMatrix4(new THREE.Matrix4().extractRotation(m));
      // The lowest point of the body is below the surface, never hovering above it.
      const bottom = p.clone().addScaledVector(up, -s.r * squash);
      const under = talusSurface(shape, bottom.x, bottom.z);
      expect(bottom.y, 'rock bottom sits below the surface').toBeLessThanOrEqual(under + 1e-6);
      // And the centre is only a small way above the surface point (mostly buried).
      expect(p.distanceTo(new THREE.Vector3(s.x, s.y, s.z))).toBeLessThan(s.r * squash * 0.35);
      // Around the rim the surface does not fall away from under the body (no hovering rock).
      expect(isSupported(shape, s)).toBe(true);
    }
  });

  it('seatedCentre matches the matrix translation', () => {
    const s = spots[0]!;
    const m = rockMatrix(s, 0, 0.7);
    expect(
      new THREE.Vector3().setFromMatrixPosition(m).distanceTo(seatedCentre(s, 0.7)),
    ).toBeLessThan(1e-9);
  });
});

describe('talus mesh feathers into the seabed', () => {
  const g = buildTalusMesh(shape, 90, 60, 20, 5, (_x, _y, _z, _u, out) => out.setScalar(0.5));
  const pos = g.getAttribute('position');
  const rows = 21;

  it('rests on or above the ground along the wall and sinks under it at the rim', () => {
    for (let i = 10; i <= 50; i += 5) {
      const rim = (i * rows + (rows - 1)) * 3;
      const x = pos.getX(rim / 3);
      if (shape.reach(x) < 5) continue;
      expect(pos.getY(rim / 3)).toBeLessThan(ground(x, pos.getZ(rim / 3)) - 0.3);
      const top = (i * rows + 1) * 3;
      expect(pos.getY(top / 3)).toBeGreaterThan(ground(x, pos.getZ(top / 3)));
    }
  });

  it('is finite, indexed and faces up', () => {
    const idx = g.getIndex()!;
    expect(idx.count % 3).toBe(0);
    const n = g.getAttribute('normal');
    let up = 0;
    for (let i = 0; i < n.count; i++) {
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      if (n.getY(i) > 0) up++;
    }
    expect(up / n.count).toBeGreaterThan(0.95);
  });
});

describe('wall ends', () => {
  it('pinch smoothly from full height to a low stump', () => {
    expect(pinchScale(0)).toBe(1);
    expect(pinchScale(1)).toBeLessThan(0.2);
    for (let e = 0; e < 1; e += 0.05) expect(pinchScale(e + 0.05)).toBeLessThan(pinchScale(e));
  });
  it('the two ends sit at slightly different distances', () => {
    expect(endRatio(-40, 90)).not.toBeCloseTo(endRatio(40, 90), 2);
  });
});

describe('scarps on a sloping seabed', () => {
  const feats: [GeoFeatureId, [number, number, number]][] = [
    ['tuff-cliff', [90, 30, 45]],
    ['canyon-ledge', [70, 26, 36]],
    ['hadal-scarp', [100, 40, 50]],
    ['stalactite-cluster', [42, 16, 28]],
  ];
  for (const [feature, dims] of feats) {
    it(`${feature}: rocks rest on the terrain they were given`, () => {
      const b = buildGeo({
        def: { feature, raw: {} } as unknown as PropDef,
        dims,
        seed: hashString(`slope-${feature}`),
        cfg: DEFAULT_CONFIG.props,
        tier: 'high',
        groundHeight: () => ground,
      });
      let seen = 0;
      b.full.traverse((o) => {
        const im = o as THREE.InstancedMesh;
        if (!im.isInstancedMesh || !/boulders|fallen/.test(im.name)) return;
        const m = new THREE.Matrix4();
        for (let i = 0; i < im.count; i++) {
          im.getMatrixAt(i, m);
          const p = new THREE.Vector3().setFromMatrixPosition(m);
          const g = ground(p.x, p.z);
          seen++;
          // Never below the seabed's skin by more than its own size, never hovering above the apron.
          expect(p.y).toBeGreaterThan(g - 3);
          expect(p.y).toBeLessThan(g + dims[2] * 0.3);
        }
      });
      expect(seen).toBeGreaterThan(20);
      for (const c of b.colliders!) expect(c.isEmpty()).toBe(false);
    });
  }
});

describe('scatterRubble', () => {
  it('seats blocks on the surface and honours the keep mask', async () => {
    const { scatterRubble } = await import('../../src/world/props/geo/talus.js');
    const surf = (x: number, z: number): number => ground(x, z);
    const blocks = scatterRubble(surf, (x) => (x > 0 ? 1 : 0), {
      halfX: 20,
      halfZ: 20,
      count: 30,
      size: 1,
      detail: 1,
      seed: 3,
    });
    expect(blocks.length).toBeGreaterThan(10);
    for (const g of blocks) {
      g.computeBoundingBox();
      const c = g.boundingBox!.getCenter(new THREE.Vector3());
      expect(c.x).toBeGreaterThan(-3);
      expect(Math.abs(c.y - surf(c.x, c.z))).toBeLessThan(6);
    }
  });
});
