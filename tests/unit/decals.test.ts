import * as THREE from 'three';
import { expect, it } from 'vitest';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { addDecals } from '../../src/vehicles/decals.js';
import { blueprintFor } from '../../src/vehicles/hulls.js';
import { PartBuilder } from '../../src/vehicles/kit.js';

it('keeps deck lettering upright from behind and above at every heading', () => {
  const bp = blueprintFor('A', false);
  const marking = bp.decals.find((d) => d.kind === 'number')!;
  const parts = new PartBuilder();
  addDecals(parts, [marking]);
  const decal = parts.build().get('decal')!;
  const p = decal.getAttribute('position');
  const uv = decal.getAttribute('uv');
  const corners = Array.from({ length: p.count }, (_, i) => ({
    point: new THREE.Vector3().fromBufferAttribute(p, i),
    u: uv.getX(i),
    v: uv.getY(i),
  }));
  const left = corners.find((c) => c.u === 0 && c.v === 0.5)!;
  const right = corners.find((c) => c.u === 0.5 && c.v === 0.5)!;
  const top = corners.find((c) => c.u === 0 && c.v === 0.75)!;
  expect(right.point.x).toBeGreaterThan(left.point.x);
  expect(top.point.z).toBeLessThan(left.point.z);
  const normal = new THREE.Vector3().fromBufferAttribute(decal.getAttribute('normal'), 0);
  expect(normal.toArray()).toEqual([0, 1, 0]);

  // Exercise the real hull scale and physics-to-model pose, including west
  // (the Blue Hole opening), without needing a canvas atlas or WebGL.
  const sub = new SubMesh({ hullClass: 'A' });
  expect(sub.vehicle.materials.makeDecal(new THREE.Texture()).side).toBe(THREE.FrontSide);
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  for (const yaw of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    sub.setPose(new THREE.Vector3(100, -30, 200), yaw, 0, 0);
    sub.group.updateMatrixWorld(true);
    const world = sub.vehicle.root.matrixWorld;
    const centre = marking.pos.clone().applyMatrix4(world);
    camera.position
      .copy(marking.pos)
      .add(new THREE.Vector3(0, 2, 6))
      .applyMatrix4(world);
    camera.lookAt(centre);
    camera.updateMatrixWorld(true);
    const project = (p: THREE.Vector3): THREE.Vector3 =>
      p.clone().applyMatrix4(world).project(camera);
    expect(project(right.point).x).toBeGreaterThan(project(left.point).x);
    expect(project(top.point).y).toBeGreaterThan(project(left.point).y);
    expect(world.determinant()).toBeGreaterThan(0);
  }
  sub.dispose();
  decal.dispose();
  for (const geometry of bp.parts.build().values()) geometry.dispose();
});

it.each(['A', 'B', 'C'])('%s markings face outward with right-handed UVs', (hull) => {
  const bp = blueprintFor(hull, false);
  for (const spec of bp.decals) {
    const parts = new PartBuilder();
    addDecals(parts, [spec]);
    const g = parts.build().get('decal')!;
    const p = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    const point = (i: number): THREE.Vector3 => new THREE.Vector3().fromBufferAttribute(p, i);
    const a = point(0);
    const b = point(1).sub(a);
    const c = point(2).sub(a);
    const winding = b.cross(c).normalize();
    expect(winding.dot(spec.normal)).toBeCloseTo(1);
    const uvWinding =
      (uv.getX(1) - uv.getX(0)) * (uv.getY(2) - uv.getY(0)) -
      (uv.getY(1) - uv.getY(0)) * (uv.getX(2) - uv.getX(0));
    expect(uvWinding).toBeGreaterThan(0);
    for (let i = 0; i < p.count; i++) {
      const n = new THREE.Vector3().fromBufferAttribute(g.getAttribute('normal'), i);
      expect(n.dot(winding)).toBeCloseTo(1);
    }
    g.dispose();
  }
  for (const geometry of bp.parts.build().values()) geometry.dispose();
});
