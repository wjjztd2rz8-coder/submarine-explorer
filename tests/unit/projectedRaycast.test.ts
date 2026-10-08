import * as THREE from 'three';
import { expect, test } from 'vitest';
import { projectedRaycast } from './projectedRaycast.js';

test.each(['y', 'z'] as const)(
  '%s projection agrees with full Three raycasts at cell edges and outside bounds',
  (axis) => {
    const geometry = new THREE.PlaneGeometry(20, 20, 32, 32);
    if (axis === 'y') geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    mesh.position.set(14, -100, 8);
    mesh.rotation.y = 0.6;
    mesh.scale.set(2, 3, 4);
    mesh.updateMatrixWorld(true);
    const intersect = projectedRaycast(mesh, axis);
    for (const a of [-11, -10, -9.375, -0.001, 0, 0.001, 9.375, 10, 11]) {
      for (const b of [-10, -0.001, 0, 0.001, 10]) {
        const origin = new THREE.Vector3(a, axis === 'y' ? 30 : b, axis === 'z' ? -30 : b);
        const direction = new THREE.Vector3(0, axis === 'y' ? -1 : 0, axis === 'z' ? 1 : 0);
        origin.applyMatrix4(mesh.matrixWorld);
        direction.transformDirection(mesh.matrixWorld);
        const ray = new THREE.Raycaster(origin, direction);
        const expected = ray.intersectObject(mesh, false)[0];
        const actual = intersect(ray)[0];
        expect(Boolean(actual)).toBe(Boolean(expected));
        if (expected) {
          expect(actual.distance).toBeCloseTo(expected.distance, 10);
          expect(actual.point.distanceTo(expected.point)).toBeLessThan(1e-10);
          expect(actual.face!.normal.distanceTo(expected.face!.normal)).toBeLessThan(1e-10);
        }
      }
    }
    geometry.dispose();
  },
);
