import * as THREE from 'three';
import { PartBin, beam, strut, trs, v3 } from '../world/props/wrecks/kit.js';
import type { SecretKind } from './Secrets.js';

/** Small unnamed objects, built from the existing wreck kit in one draw each. */
export function buildSecret(kind: SecretKind): THREE.Mesh {
  const bin = new PartBin();
  const rock = 0x8a8170,
    rust = 0x78503d,
    bone = 0xc3bba1;
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color = rust,
  ): void => bin.add(new THREE.BoxGeometry(w, h, d), color, trs(x, y, z));
  if (kind === 'frame') {
    for (const x of [-3, 3])
      for (const z of [-2, 2]) {
        bin.add(strut(v3(x, 0, z), v3(x * 0.65, 3.5, z * 0.65), 0.22), rust);
      }
    for (const z of [-2, 2]) bin.add(strut(v3(-3, 0.2, z), v3(3, 0.2, z), 0.22), rust);
    for (const x of [-3, 3]) bin.add(strut(v3(x, 0.2, -2), v3(x, 0.2, 2), 0.22), rust);
    box(0, 2.2, 0, 2.1, 1.3, 1.2, 0x84988f);
    bin.add(beam(v3(0, 2.8, 0), v3(0, 4.5, 0), 0.16), rust);
  } else if (kind === 'alcove') {
    // A low arch with a dark recess; the gap remains readable from either side.
    for (const x of [-5, 5]) {
      bin.add(
        new THREE.DodecahedronGeometry(1, 1),
        rock,
        trs(x, 3, 0, 0, 0.15 * x, 0, 3.4, 4, 4.5),
      );
    }
    bin.add(new THREE.DodecahedronGeometry(1, 1), rock, trs(0, 7, 0, 0, 0, 0, 6.5, 2.1, 4.5));
  } else if (kind === 'bone') {
    for (let i = 0; i < 7; i++) {
      const z = (i - 3) * 1.05;
      bin.add(new THREE.SphereGeometry(0.65, 8, 6), bone, trs(0, 0.8, z));
      for (const side of [-1, 1]) {
        const g = new THREE.TorusGeometry(2.2, 0.16, 5, 10, Math.PI * 0.7);
        bin.add(g, bone, trs(side * 0.3, 0.35, z, Math.PI / 2, 0, side < 0 ? Math.PI : 0));
      }
    }
  } else if (kind === 'chain') {
    for (let i = 0; i < 14; i++)
      bin.add(
        new THREE.TorusGeometry(0.5, 0.12, 5, 8),
        rust,
        trs(Math.sin(i * 0.45), 0.16, (i - 7) * 0.65, Math.PI / 2, 0, (i % 2) * 0.6),
      );
  } else if (kind === 'wood') {
    for (let i = 0; i < 4; i++)
      bin.add(beam(v3(i - 1.5, 0.5, -4 + i), v3(i - 0.5, 0.6, 4 - i), 0.45, 0.3), 0x6f5842);
  } else if (kind === 'seep') {
    bin.add(new THREE.CylinderGeometry(4, 5, 0.15, 16), 0xccc7a3, trs(0, 0.1, 0));
    for (const x of [-2, 1, 3])
      bin.add(new THREE.DodecahedronGeometry(1, 0), rock, trs(x, 0.8, 0, 0, x, 0, 1.6, 1.2, 2));
  } else {
    bin.add(new THREE.DodecahedronGeometry(1, 1), rock, trs(0, 1.3, 0, 0, 0.4, 0, 4, 2.5, 3));
  }
  const mesh = new THREE.Mesh(
    bin.merge()!,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: kind === 'frame' || kind === 'chain' ? 0.15 : 0,
      side: THREE.DoubleSide,
    }),
  );
  mesh.name = `secret-${kind}`;
  return mesh;
}
/** Warp the base to the actual detailed seabed, including terrain beneath every rib/leg. */
export function seatOnSeabed(
  mesh: THREE.Mesh,
  x: number,
  z: number,
  ground: (x: number, z: number) => number,
): void {
  const y = ground(x, z);
  mesh.position.set(x, y, z);
  const p = mesh.geometry.getAttribute('position');
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + ground(x + p.getX(i), z + p.getZ(i)) - y);
  p.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
}
export function disposeExploreMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) material.dispose();
  mesh.removeFromParent();
}
