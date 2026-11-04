import assert from 'node:assert/strict';
import test from 'node:test';
import { DoubleSide, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry } from 'three';
import { projectCoverage, coverageFractions } from '../lib/pose-projection.mjs';

function plane(size, x, y, z) {
  const mesh = new Mesh(new PlaneGeometry(size, size), new MeshBasicMaterial({ side: DoubleSide }));
  mesh.position.set(x, y, z);
  return mesh;
}
const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);

test('triangle coverage counts a union, with the top third measured from screen top', () => {
  const subject = plane(1, 0, 0.5, -2);
  const { labels } = projectCoverage(camera, 120, 120, [
    { mesh: subject, label: 1 },
    { mesh: subject, label: 1 },
  ]);
  const coverage = coverageFractions(labels, 120, 120);
  assert.equal(coverage.screenFraction, 0.25);
  assert.equal(coverage.topThirdScreenFraction, 1 / 6);
  assert.equal(coverage.hoodInTopThird, 2 / 3);
  assert.equal(coverage.topThirdFill, 0.5);
});

test('nearer solid occludes subject regardless of entry order', () => {
  const subject = { mesh: plane(1, 0, 0, -3), label: 1 };
  const occluder = { mesh: plane(0.5, 0, 0, -2), label: 2 };
  for (const entries of [
    [subject, occluder],
    [occluder, subject],
  ]) {
    const { labels } = projectCoverage(camera, 120, 120, entries);
    assert.equal(coverageFractions(labels, 120, 120).screenFraction, 0.25 - 0.0625);
  }
});

test('offscreen triangles are clipped and geometry behind the eye cannot cover the frame', () => {
  const { labels } = projectCoverage(camera, 120, 120, [
    { mesh: plane(2, 1, 0, -2), label: 1 },
    { mesh: plane(10, 0, 0, 2), label: 1 },
  ]);
  assert.equal(coverageFractions(labels, 120, 120).screenFraction, 0.5);
});

test('back faces respect the authored material side', () => {
  const subject = plane(1, 0, 0, -2);
  subject.material.side = 0;
  subject.rotation.y = Math.PI;
  const { labels } = projectCoverage(camera, 120, 120, [{ mesh: subject, label: 1 }]);
  assert.equal(coverageFractions(labels, 120, 120).screenFraction, 0);
});

test('perspective clipping, depth and instancing agree with independent Three raycasts', async () => {
  const { InstancedMesh, Matrix4, PerspectiveCamera, Raycaster, Vector2, Vector3 } =
    await import('three');
  const perspective = new PerspectiveCamera(75, 1.3, 0.5, 6);
  const crossing = plane(2, 0.13, -0.07, -0.8);
  crossing.rotation.y = 0.9;
  const behind = plane(20, 0, 0, 2);
  const instances = new InstancedMesh(new PlaneGeometry(0.4, 0.4), crossing.material, 2);
  instances.setMatrixAt(0, new Matrix4().makeTranslation(-0.8, 0.6, -2));
  instances.setMatrixAt(1, new Matrix4().makeTranslation(0.9, -0.6, -3));
  const entries = [
    { mesh: crossing, label: 1 },
    { mesh: instances, label: 2 },
    { mesh: behind, label: 3 },
  ];
  const width = 52,
    height = 40;
  const { labels } = projectCoverage(perspective, width, height, entries);
  const ray = new Raycaster(),
    ndc = new Vector2(),
    projected = new Vector3();
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      ndc.set(((x + 0.5) / width) * 2 - 1, 1 - ((y + 0.5) / height) * 2);
      ray.setFromCamera(ndc, perspective);
      const hit = ray
        .intersectObjects(
          entries.map((e) => e.mesh),
          false,
        )
        .find((hit) => {
          projected.copy(hit.point).project(perspective);
          return Math.abs(projected.z) <= 1;
        });
      const expected = entries.find((e) => e.mesh === hit?.object)?.label ?? 0;
      assert.equal(labels[y * width + x], expected, `pixel ${x},${y}`);
    }
});
