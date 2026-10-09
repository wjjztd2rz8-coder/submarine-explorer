import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { carbonateFinger } from '../../src/world/props/geo/carbonateFinger.js';
import { tieredSpire, type SpireOpts } from '../../src/world/props/geo/spire.js';

const opts: SpireOpts = {
  h: 14,
  r0: 1.6,
  topFrac: 0.08,
  seed: 1050,
  segs: 10,
  rings: 12,
  tiers: 3,
  ledge: 0.18,
  flare: 0.7,
  irregular: 1,
  ridgeAmp: 0.08,
  crater: 0.4,
};

describe('Lost City carbonate fingers', () => {
  it.each([0.55, 0.8, 1, 1.4])(
    'retains a tapered, lobed crown and finite normals at density %s',
    (density) => {
      const parent = new THREE.CylinderGeometry(8, 10, 40, 12, 20).translate(0, 20, 0);
      const o = { ...opts, segs: 10 * density + 4, rings: (opts.h / 1.2) * density + 5 };
      const finger = carbonateFinger(parent, { ...o, rootHeight: 12, azimuth: 0, lean: 0 });
      const p = finger.getAttribute('position');
      const segs = Math.max(8, Math.round(o.segs));
      const rings = Math.max(4, Math.round(o.rings));
      const section = (ring: number) => {
        const points = Array.from({ length: segs }, (_, i) =>
          new THREE.Vector3().fromBufferAttribute(p, ring * (segs + 1) + i),
        );
        const centre = points.reduce((sum, point) => sum.add(point), new THREE.Vector3());
        centre.divideScalar(points.length);
        const radii = points.map((point) => Math.hypot(point.x - centre.x, point.z - centre.z));
        const heights = points.map((point) => point.y);
        return {
          width: Math.max(...radii),
          asymmetry: Math.max(...radii) / Math.min(...radii),
          crownRelief: Math.max(...heights) - Math.min(...heights),
        };
      };
      expect(section(0).width).toBeLessThan(section(rings).width * 0.12);
      expect(section(Math.floor(rings / 2)).asymmetry).toBeGreaterThan(1.2);
      expect(section(0).crownRelief).toBeGreaterThan(opts.h * 0.002);
      for (const attribute of ['position', 'normal'])
        expect(Array.from(finger.getAttribute(attribute).array).every(Number.isFinite)).toBe(true);
      const normals = finger.getAttribute('normal');
      for (let i = 0; i < normals.count; i++)
        expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5);
      finger.dispose();
      parent.dispose();
    },
  );

  it('buries roots in the actual narrow, irregular parent rather than its nominal radius', () => {
    const parent = tieredSpire({ ...opts, h: 40, r0: 10, topFrac: 0.3 });
    parent.scale(0.42, 1, 1.5);
    const sourceGeometry = tieredSpire(opts);
    const source = sourceGeometry.getAttribute('position');
    const bottomCentre = Array.from({ length: source.count }, (_, i) => i).find(
      (i) => Math.hypot(source.getX(i), source.getZ(i)) < 1e-6 && source.getY(i) < 1e-6,
    )!;
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(parent, material);
    for (const rootHeight of [5, 12, 25]) {
      for (const azimuth of [0, Math.PI / 3, Math.PI, Math.PI * 1.7]) {
        const finger = carbonateFinger(parent, { ...opts, rootHeight, azimuth, lean: 0.4 });
        const root = new THREE.Vector3().fromBufferAttribute(
          finger.getAttribute('position'),
          bottomCentre,
        );
        const outward = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
        const hit = new THREE.Raycaster(root, outward).intersectObject(mesh)[0];
        expect(hit, `root ${rootHeight}, azimuth ${azimuth}`).toBeDefined();
        expect(hit.distance).toBeCloseTo(opts.r0 * 1.25, 5);
        mesh.position.set(3, 7, -2);
        mesh.rotation.set(0.07, 0, -0.09);
        mesh.updateMatrixWorld(true);
        const tiltedHit = new THREE.Raycaster(
          root.clone().applyMatrix4(mesh.matrixWorld),
          outward.clone().transformDirection(mesh.matrixWorld),
        ).intersectObject(mesh)[0];
        expect(tiltedHit.distance).toBeCloseTo(opts.r0 * 1.25, 5);
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.updateMatrixWorld(true);
        finger.dispose();
      }
    }
    parent.dispose();
    sourceGeometry.dispose();
    material.dispose();
  });
});
