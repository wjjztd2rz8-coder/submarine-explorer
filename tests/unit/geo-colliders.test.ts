import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { buildGeo, type GeoFeatureId } from '../../src/world/props/geo/index.js';
import { hashString } from '../../src/world/props/geo/shared.js';
import type { PropDef } from '../../src/world/PropLoader.js';

const cfg = DEFAULT_CONFIG.props;

const DIMS: Partial<Record<GeoFeatureId, [number, number, number]>> = {
  'stalactite-cluster': [42, 16, 28],
  'hadal-scarp': [100, 40, 50],
  'tuff-cliff': [90, 30, 45],
  'canyon-ledge': [70, 26, 36],
};

function build(feature: GeoFeatureId) {
  return buildGeo({
    def: { feature, raw: {} } as unknown as PropDef,
    dims: DIMS[feature]!,
    seed: hashString(`t-${feature}`),
    cfg,
    tier: 'high',
    groundHeight: () => undefined,
  });
}

function wallVertices(root: THREE.Object3D): THREE.Vector3[] {
  let out: THREE.Vector3[] = [];
  root.traverse((c) => {
    const m = c as THREE.Mesh;
    if (out.length || !m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh) return;
    const p = m.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i));
  });
  return out.length ? out : (out = []);
}

describe('wall colliders follow the rendered wall', () => {
  for (const f of Object.keys(DIMS) as GeoFeatureId[]) {
    const W = DIMS[f]![0];
    const H = DIMS[f]![2];
    const b = build(f);
    const verts = wallVertices(b.full);
    const boxes = b.colliders!;

    it(`${f}: no collider stands over empty water above a tapered end`, () => {
      for (const c of boxes) {
        // One grid cell of slack: the mesh is interpolated between vertices.
        const inX = verts.filter((v) => v.x >= c.min.x - 1 && v.x <= c.max.x + 1);
        const top = Math.max(...inX.map((v) => v.y));
        // Ends run out below the seabed (y = 0 on flat test ground): a box may reach the ground.
        expect(c.max.y).toBeLessThanOrEqual(Math.max(top, 0) + 0.6);
      }
      // The outermost wall end must not collide up to the full design height.
      const end = boxes.filter((c) => Math.abs(c.getCenter(new THREE.Vector3()).x) > W * 0.4);
      for (const c of end) expect(c.max.y).toBeLessThan(0.75 * H);
    });

    it(`${f}: boxes overlap in x, leaving no gap through the rock`, () => {
      for (let x = -W * 0.45; x <= W * 0.45; x += 0.25) {
        const y = Math.abs(x) < W * 0.3 ? 0.3 * H : 0.04 * H;
        // Only where the wall actually stands that high (the ends run out under the seabed).
        const rock = verts.some((v) => Math.abs(v.x - x) < 0.6 && v.y > y + 1);
        if (!rock) continue;
        const hit = boxes.some((c) => x >= c.min.x && x <= c.max.x && y >= c.min.y && y <= c.max.y);
        expect(hit, `x=${x}`).toBe(true);
      }
    });

    it(`${f}: rendered rock mass is covered, including the rear`, () => {
      // Sample vertices of the solid (not the crest edge and not the ragged ends).
      const inner = verts.filter(
        (v) => Math.abs(v.x) < W * 0.4 && v.y > 0.05 * H && v.y < 0.85 * H,
      );
      const covered = inner.filter((v) =>
        boxes.some((c) => c.clone().expandByScalar(1.5).containsPoint(v)),
      ).length;
      expect(covered / inner.length).toBeGreaterThan(0.9);
      const rear = inner.filter((v) => v.z > 0.4 * DIMS[f]![1]);
      const rearCovered = rear.filter((v) =>
        boxes.some((c) => c.clone().expandByScalar(1.5).containsPoint(v)),
      ).length;
      expect(rearCovered / Math.max(1, rear.length)).toBeGreaterThan(0.7);
    });
  }
});
