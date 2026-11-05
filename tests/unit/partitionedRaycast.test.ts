import {
  BackSide,
  DoubleSide,
  FrontSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Raycaster,
  Vector3,
} from 'three';
import { expect, test } from 'vitest';
import { partitionedRaycast } from './helpers/partitionedRaycast.js';

test.each([true, false])(
  'triangle batches preserve full Three intersections for indexed=%s geometry',
  (indexed) => {
    const source = new PlaneGeometry(20, 20, 32, 32);
    const geometry = indexed ? source : source.toNonIndexed();
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    mesh.position.set(14, -100, 8);
    mesh.rotation.set(0.3, 0.6, -0.2);
    mesh.scale.set(2, 3, 4);
    mesh.updateMatrixWorld(true);
    let checkedHits = 0;
    try {
      for (const side of [FrontSide, BackSide, DoubleSide]) {
        material.side = side;
        for (const [start, count] of [
          [0, Infinity],
          [191 * 3, 1000 * 3],
        ]) {
          geometry.setDrawRange(start, count);
          const intersect = partitionedRaycast(mesh);
          for (const z of [-30, 30])
            for (const x of [-11, -10, -9.375, -0.001, 0, 0.001, 9.375, 10, 11])
              for (const y of [-10, -0.001, 0, 0.001, 10]) {
                const origin = new Vector3(x + 0.3, y - 0.2, z).applyMatrix4(mesh.matrixWorld);
                const target = new Vector3(x, y, 0).applyMatrix4(mesh.matrixWorld);
                const distance = origin.distanceTo(target);
                const direction = target.clone().sub(origin).normalize();
                for (const [near, far] of [
                  [0, Infinity],
                  [distance - 1, distance + 1],
                  [0, distance - 0.1],
                  [distance + 0.1, Infinity],
                ]) {
                  const ray = new Raycaster(origin, direction, near, far);
                  const expected = ray.intersectObject(mesh, false);
                  const actual = intersect(ray);
                  expect(actual).toHaveLength(expected.length);
                  actual.forEach((hit, i) => {
                    checkedHits++;
                    expect(hit.object).toBe(mesh);
                    expect(hit.distance).toBeCloseTo(expected[i].distance, 10);
                    expect(hit.point.distanceTo(expected[i].point)).toBeLessThan(1e-10);
                    expect(hit.faceIndex).toBe(expected[i].faceIndex);
                    expect(hit.face).toEqual(expected[i].face);
                    expect(hit.uv).toEqual(expected[i].uv);
                  });
                }
              }
        }
      }
      expect(checkedHits).toBeGreaterThan(0);
    } finally {
      geometry.dispose();
      if (geometry !== source) source.dispose();
      material.dispose();
    }
  },
);

test('instanced meshes retain their native raycast and instance identity', () => {
  const geometry = new PlaneGeometry(20, 20, 32, 32);
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const mesh = new InstancedMesh(geometry, material, 2);
  mesh.setMatrixAt(0, new Matrix4().makeTranslation(0, 0, -2));
  mesh.setMatrixAt(1, new Matrix4().makeTranslation(0, 0, -5));
  mesh.updateMatrixWorld(true);
  try {
    const ray = new Raycaster(new Vector3(0.1, 0.2, 0), new Vector3(0, 0, -1));
    const expected = ray.intersectObject(mesh, false);
    expect(expected.map((hit) => hit.instanceId)).toEqual([0, 1]);
    expect(partitionedRaycast(mesh)(ray)).toEqual(expected);
  } finally {
    mesh.dispose();
    geometry.dispose();
    material.dispose();
  }
});
