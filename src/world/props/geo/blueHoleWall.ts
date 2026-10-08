/** Blue Hole only: limestone relief draped over the reconstructed shaft walls. */
import * as THREE from 'three';
import { geoDetail } from './detail.js';
import { geoMaterial, vertexGlow } from './materials.js';
import { fbm3, lump, mulberry32, paint, projectUVs, smooth, type BuiltProp } from './shared.js';
import type { GeoBuildInput } from './types.js';

const LIMESTONE = new THREE.Color(0x9b9482);
const SILT = new THREE.Color(0x8c8470);
const TAU = Math.PI * 2;

// Radius ranges cover the steep shaft and its ~40 m bench, leaving the floor
// and shallow reef alone. The two gallery mouths must stay open underneath.
function mouthMask(a: number, r: number): number {
  let keep = 1;
  for (const [bearing, width] of [
    [Math.PI, 0.3],
    [1.0, 0.25],
  ]) {
    const da = Math.abs(Math.atan2(Math.sin(a - bearing!), Math.cos(a - bearing!)));
    const mouth =
      (1 - smooth(width!, width! + 0.07, da)) * smooth(120, 130, r) * (1 - smooth(175, 185, r));
    keep *= 1 - mouth;
  }
  return keep;
}

/** Metres above the sampled wall: broken ledges and long solution flutes. */
export function blueHoleWallRelief(a: number, r: number, seed: number): number {
  const ends = smooth(96, 108, r) * (1 - smooth(177, 190, r));
  const flute = Math.pow(0.5 + 0.5 * Math.sin(43 * a + 0.2 * Math.sin(r * 0.12)), 3);
  const broken = fbm3(Math.cos(a) * 23, Math.sin(a) * 23, r * 0.09, seed, 3);
  const bench = Math.exp(-(((r - 139 - 2 * Math.sin(9 * a)) / 3.5) ** 2));
  const lower = Math.exp(-(((r - 115 - 1.5 * Math.sin(7 * a)) / 2.8) ** 2));
  return ends * mouthMask(a, r) * (0.25 + 1.4 * flute + 1.1 * (bench + lower) * broken);
}

export function buildBlueHoleWall(input: GeoBuildInput): BuiltProp {
  const { tier, seed } = input;
  const d = geoDetail(tier);
  const gnd = input.groundHeight() ?? (() => 0);
  const angular = Math.round(384 * d.meshDensity);
  const radial = Math.round(64 * d.meshDensity);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const colliders: THREE.Box3[] = [];
  for (let i = 0; i <= angular; i++) {
    const a = (i / angular) * TAU;
    const ca = Math.cos(a),
      sa = Math.sin(a);
    for (let j = 0; j <= radial; j++) {
      const r = 96 + (j / radial) * 94;
      const x = r * ca,
        z = r * sa;
      const relief = blueHoleWallRelief(a, r, seed);
      // The skin sinks into the terrain at every boundary and gallery mouth.
      positions.push(x, gnd(x, z) + relief - 0.12, z);
      uvs.push((a * 150) / 6, r / 6);
      if (i < angular && j < radial) {
        const n = i * (radial + 1) + j;
        indices.push(n, n + radial + 1, n + 1, n + 1, n + radial + 1, n + radial + 2);
      }
    }
  }
  const wall = new THREE.BufferGeometry();
  wall.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  wall.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  wall.setIndex(indices);
  wall.computeVertexNormals();
  // The duplicated UV seam shares one normal, so flutes do not acquire a
  // lighting join at the east bearing.
  const normal = wall.getAttribute('normal');
  const seamNormal = new THREE.Vector3();
  const last = angular * (radial + 1);
  for (let j = 0; j <= radial; j++) {
    seamNormal
      .fromBufferAttribute(normal, j)
      .add(new THREE.Vector3().fromBufferAttribute(normal, last + j))
      .normalize();
    for (const n of [j, last + j]) normal.setXYZ(n, seamNormal.x, seamNormal.y, seamNormal.z);
  }
  paint(wall, (x, y, z, ny, out) => {
    const n = fbm3(x * 0.07, y * 0.1, z * 0.07, seed, 3);
    // Colour follows relief and exposed limestone, rather than smooth
    // concentric painted stripes; silt collects on the broken bench tops.
    out.copy(LIMESTONE).multiplyScalar(0.7 + 0.5 * n);
    out.lerp(SILT, smooth(0.5, 0.9, ny) * 0.5);
  });
  const material = geoMaterial('rock', d, { roughness: 0.94 });
  material.color.multiplyScalar(3.5);
  vertexGlow(material, 0.18, 0xd8d0b0, 0.35);
  const full = new THREE.Group();
  full.name = 'blue-hole-wall-relief';
  const mesh = new THREE.Mesh(wall, material);
  mesh.name = 'fluted-limestone-wall';
  full.add(mesh);

  // Collision cells cover the actual raised skin. Thin radial/angular cells
  // avoid a shaft-sized box that would fill the hole or close either gallery.
  const pos = wall.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < angular; i++) {
    for (let j = 0; j < radial; j++) {
      const ns = [i * (radial + 1) + j, (i + 1) * (radial + 1) + j];
      const box = new THREE.Box3();
      let base = Infinity,
        top = -Infinity;
      for (const n of [...ns, ...ns.map((n) => n + 1)]) {
        const p = new THREE.Vector3().fromBufferAttribute(pos, n);
        box.expandByPoint(p);
        base = Math.min(base, gnd(p.x, p.z));
        top = Math.max(top, p.y);
      }
      // The height field already collides with everything at/below its skin.
      // Only nearly level cells need extra boxes; steep cells' AABBs would
      // extend far above their low corner into navigable water.
      if (top - base < 3 && top > base + 0.2) {
        box.min.y = base - 0.2;
        colliders.push(box);
      }
    }
  }

  const rnd = mulberry32(seed ^ 0x830);
  const rock = lump(d.sphereDetail, seed + 9, 0.38, 2.2);
  paint(rock, (_x, y, _z, _ny, out) => out.setScalar(0.6 + 0.4 * smooth(-1, 0.5, y)));
  projectUVs(rock, 1.2);
  const count = Math.round(200 * Math.max(0.3, d.growth));
  const rubble = new THREE.InstancedMesh(rock, material, count);
  rubble.name = 'ledge-base-rubble';
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const colour = new THREE.Color();
  const bounds = new THREE.Box3().setFromBufferAttribute(pos);
  rock.computeBoundingBox();
  let placed = 0;
  for (let i = 0; i < count; i++) {
    const a = rnd() * TAU;
    const r = 136 + rnd() * 13;
    if (mouthMask(a, r) < 0.95) continue;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    const size = 0.5 + rnd() * 1.5;
    const scale = new THREE.Vector3(size, size * (0.45 + rnd() * 0.45), size * (0.7 + rnd() * 0.7));
    const y = gnd(x, z) + blueHoleWallRelief(a, r, seed) + scale.y * 0.35;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * TAU);
    matrix.compose(new THREE.Vector3(x, y, z), q, scale);
    rubble.setMatrixAt(placed, matrix);
    colour
      .copy(LIMESTONE)
      .lerp(SILT, rnd() * 0.5)
      .multiplyScalar(0.75 + rnd() * 0.35);
    rubble.setColorAt(placed++, colour);
    const box = rock.boundingBox!.clone().applyMatrix4(matrix);
    bounds.union(box);
    colliders.push(box);
  }
  rubble.count = placed;
  rubble.computeBoundingSphere();
  full.add(rubble);
  // The distant representation keeps the shaft skin without introducing a
  // solid cylinder. Props' normal distance/frustum LOD owns both groups.
  const impostor = new THREE.Group();
  impostor.add(new THREE.Mesh(wall, material));
  return { full, impostor, bounds, colliders };
}
