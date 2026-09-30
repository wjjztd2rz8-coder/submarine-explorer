/**
 * Procedural low-poly shapes for the seabed scatter (`Scatter.ts`). Each kind is
 * built once and shared by every instance, so the whole layer is a handful of
 * `InstancedMesh` draws. All shapes sit with their base at y = 0, roughly one
 * unit across, and carry `position`, `normal`, `uv` and a `color` attribute
 * (per-face variation) so instance colour and the shared materials do the rest.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Integer hash of a position triple -> [0, 1); equal input gives equal output. */
function hash3(x: number, y: number, z: number, seed: number): number {
  let h =
    Math.imul(Math.round(x * 4096), 374761393) ^
    Math.imul(Math.round(y * 4096), 668265263) ^
    Math.imul(Math.round(z * 4096), 2147483647) ^
    Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Give a non-indexed geometry box-projected uvs and per-face brightness variation. */
function finish(
  geo: THREE.BufferGeometry,
  seed: number,
  faceVariation = 0.16,
): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    if (ny >= nx && ny >= nz) {
      uv[i * 2] = pos.getX(i);
      uv[i * 2 + 1] = pos.getZ(i);
    } else if (nx >= nz) {
      uv[i * 2] = pos.getZ(i);
      uv[i * 2 + 1] = pos.getY(i);
    } else {
      uv[i * 2] = pos.getX(i);
      uv[i * 2 + 1] = pos.getY(i);
    }
  }
  for (let f = 0; f < pos.count; f += 3) {
    const v =
      1 -
      faceVariation +
      faceVariation * 1.6 * hash3(pos.getX(f), pos.getY(f), pos.getZ(f), seed + 7);
    for (let k = 0; k < 3; k++) {
      col[(f + k) * 3] = v;
      col[(f + k) * 3 + 1] = v;
      col[(f + k) * 3 + 2] = v;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** A jittered, squashed icosphere with its base flattened onto y = 0. */
function lump(
  detail: number,
  seed: number,
  jitter: number,
  scale: [number, number, number],
  flatBase: boolean,
  faceVariation?: number,
): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.5, detail);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Hash on the (unjittered) position so duplicate vertices move together.
    const j = 1 + jitter * (hash3(x, y, z, seed) * 2 - 1);
    let py = y * scale[1] * j;
    if (flatBase && py < -0.05) py = -0.05 + (py + 0.05) * 0.3;
    pos.setXYZ(i, x * scale[0] * j, py + 0.05 * scale[1] + 0.02, z * scale[2] * j);
  }
  g.computeBoundingBox();
  // Rest on y = 0 (a little sunk is added at placement).
  const minY = (g.boundingBox as THREE.Box3).min.y;
  g.translate(0, -minY, 0);
  return finish(g, seed, faceVariation);
}

/** Angular boulder, ~1 unit across, 0.7 tall. */
export function boulderGeometry(): THREE.BufferGeometry {
  return lump(1, 11, 0.32, [1.0, 0.72, 0.85], true, 0.22);
}

/** Smooth rounded stone (glacial dropstone), ~1 unit across. */
export function dropstoneGeometry(): THREE.BufferGeometry {
  return lump(2, 23, 0.1, [1.0, 0.7, 0.85], true, 0.1);
}

/** A pillow-lava lobe: a squat rounded body with a drooping skirt. */
export function pillowGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(0.5, 10, 7);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ridge = 1 + 0.05 * Math.sin(Math.atan2(z, x) * 7 + y * 6);
    let ny = y * 0.62;
    let k = ridge * (1.5 - 0.5 * Math.abs(y * 2));
    if (y < 0) {
      ny = y * 0.4;
      k *= 1 + 0.18 * -y;
    }
    pos.setXYZ(i, x * 1.45 * k, ny, z * k);
  }
  g.computeBoundingBox();
  g.translate(0, -(g.boundingBox as THREE.Box3).min.y, 0);
  return finish(g, 31, 0.08);
}

/** Small angular fragment (coral rubble, shell hash). */
export function rubbleGeometry(): THREE.BufferGeometry {
  return lump(0, 41, 0.35, [1.0, 0.55, 0.7], true, 0.25);
}

/** Vase / barrel sponge with a hollow mouth. */
export function spongeGeometry(): THREE.BufferGeometry {
  const pts = [
    [0.0, 0.0],
    [0.26, 0.0],
    [0.42, 0.12],
    [0.5, 0.42],
    [0.46, 0.8],
    [0.4, 1.0],
    [0.3, 0.98],
    [0.31, 0.72],
    [0.22, 0.4],
    [0.0, 0.34],
  ].map(([r, y]) => new THREE.Vector2(r as number, y as number));
  const g = new THREE.LatheGeometry(pts, 9);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 1 + 0.12 * (hash3(x, y, z, 5) - 0.5);
    pos.setXYZ(i, x * k, y, z * k);
  }
  return finish(g, 53, 0.14);
}

/** Sea pen: a stalk and a flattened, feathered head. */
export function seaPenGeometry(): THREE.BufferGeometry {
  const stalk = new THREE.CylinderGeometry(0.02, 0.035, 0.5, 5, 1).toNonIndexed();
  stalk.translate(0, 0.25, 0);
  const head = new THREE.IcosahedronGeometry(0.5, 1).toNonIndexed();
  head.scale(0.16, 0.55, 0.045);
  head.translate(0, 0.72, 0);
  const pos = head.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    // Feather edges: notch the outline in y so it reads as fronds.
    const y = pos.getY(i);
    const x = pos.getX(i);
    pos.setX(i, x * (1 + 0.28 * Math.sin(y * 42)));
  }
  const merged = mergeGeometries([stalk, head], false) as THREE.BufferGeometry;
  return finish(merged, 67, 0.1);
}

/** Whip coral: a thin, gently curved stem. */
export function whipGeometry(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.05, 0.3, 0.02),
    new THREE.Vector3(-0.02, 0.62, 0.08),
    new THREE.Vector3(0.1, 0.92, 0.05),
    new THREE.Vector3(0.22, 1.15, 0.12),
  ]);
  const g = new THREE.TubeGeometry(curve, 8, 0.014, 4, false);
  return finish(g, 79, 0.05);
}

/** Bioturbation mound: a low cone with a crater. */
export function moundGeometry(): THREE.BufferGeometry {
  const pts = [
    [0.0, 0.12],
    [0.16, 0.15],
    [0.3, 0.24],
    [0.55, 0.19],
    [0.82, 0.09],
    [1.0, 0.0],
  ].map(([r, y]) => new THREE.Vector2(r as number, y as number));
  const g = new THREE.LatheGeometry(pts, 10);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const k = 1 + 0.15 * (hash3(x, 0, z, 9) - 0.5);
    pos.setXYZ(i, x * k, pos.getY(i), z * k);
  }
  g.computeVertexNormals();
  return finish(g, 89, 0.04);
}
