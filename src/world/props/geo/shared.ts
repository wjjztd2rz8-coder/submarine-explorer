/**
 * Helpers shared by the geo builders. Imports the builders' shared module
 * directly (not the registry barrel, which imports this package).
 */

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { normalise, valueNoise3 } from '../builders/shared.js';

export {
  hashString,
  mulberry32,
  normalise,
  projectUVs,
  valueNoise3,
  type BuiltProp,
} from '../builders/shared.js';

/** Fractal value noise in [0, 1]. */
export function fbm3(x: number, y: number, z: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise3(x * f, y * f, z * f, seed + i * 131);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
export const smooth = (a: number, b: number, v: number): number =>
  THREE.MathUtils.smoothstep(v, a, b);

/** Merge pieces (any mix of indexed and plain geometry) into one; disposes the inputs. */
export function mergeAll(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = pieces.map((p) => normalise(p));
  const merged = mergeGeometries(flat, false);
  if (!merged) throw new Error('geo: geometry merge failed');
  for (const p of pieces) p.dispose();
  for (const f of flat) f.dispose();
  return merged;
}

export interface Xform {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Compose an Xform into a matrix (scale, then rotate XYZ, then translate). */
export function xformMatrix(t: Xform, out: THREE.Matrix4 = _m): THREE.Matrix4 {
  _e.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0);
  _q.setFromEuler(_e);
  _p.set(t.x ?? 0, t.y ?? 0, t.z ?? 0);
  _s.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
  return out.compose(_p, _q, _s);
}

export function place(g: THREE.BufferGeometry, t: Xform): THREE.BufferGeometry {
  g.applyMatrix4(xformMatrix(t));
  return g;
}

/**
 * A lumpy ellipsoid of radius 1 (scale it with `place`), displaced by noise.
 * Indexed and smooth-shaded. `flatBottom` clamps y so the base sits flat.
 */
export function lump(
  detail: number,
  seed: number,
  amp = 0.25,
  freq = 1.6,
  flatBottom = -Infinity,
): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, Math.max(0, detail));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n = fbm3(x * freq + 7, y * freq + 7, z * freq + 7, seed, 3);
    const f = 1 + (n - 0.5) * 2 * amp;
    p.setXYZ(i, x * f, Math.max(flatBottom, y * f), z * f);
  }
  g.computeVertexNormals();
  return g;
}

/** Write a per-vertex colour (linear) from `fn(x, y, z, ny)` returning a colour. */
export function paint(
  g: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number, ny: number, out: THREE.Color) => void,
): void {
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    fn(pos.getX(i), pos.getY(i), pos.getZ(i), nrm.getY(i), c);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/** Triangle and draw-call count of an object tree (instances counted). */
export function countGeo(o: THREE.Object3D): { draws: number; triangles: number } {
  let draws = 0;
  let triangles = 0;
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry;
    const idx = g.getIndex();
    const tri = (idx ? idx.count : g.getAttribute('position').count) / 3;
    const inst = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
    draws++;
    triangles += tri * inst;
  });
  return { draws, triangles };
}

/** Cheap far stand-in: the union of `boxes` as boxes, or the bounds box scaled if none. */
export function impostorFromBoxes(
  boxes: THREE.Box3[],
  bounds: THREE.Box3,
  color: number,
): THREE.Mesh {
  const list = boxes.length ? boxes : [bounds];
  const parts: THREE.BufferGeometry[] = list.map((b) => {
    const s = b.getSize(new THREE.Vector3());
    const c = b.getCenter(new THREE.Vector3());
    return new THREE.BoxGeometry(
      Math.max(0.05, s.x),
      Math.max(0.05, s.y),
      Math.max(0.05, s.z),
    ).translate(c.x, c.y, c.z);
  });
  const g = parts.length === 1 ? parts[0]! : mergeAll(parts);
  const m = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }),
  );
  m.name = 'geo-impostor';
  return m;
}

/** Box3 from centre and half extents. */
export function boxCH(
  cx: number,
  cy: number,
  cz: number,
  hx: number,
  hy: number,
  hz: number,
): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(cx - hx, cy - hy, cz - hz),
    new THREE.Vector3(cx + hx, cy + hy, cz + hz),
  );
}

/** A regular grid mesh (base at y = height(x, z)), `sizeX` x `sizeZ` centred on the origin. */
export function heightMesh(
  sizeX: number,
  sizeZ: number,
  nx: number,
  nz: number,
  height: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(sizeX, sizeZ, Math.max(2, nx), Math.max(2, nz));
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}

export interface InstanceSpec {
  t: Xform;
  color?: THREE.Color;
}

/** One InstancedMesh from a template geometry and per-instance transforms / colours. */
export function instanced(
  g: THREE.BufferGeometry,
  mat: THREE.Material,
  items: InstanceSpec[],
  name: string,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(g, mat, Math.max(1, items.length));
  const m = new THREE.Matrix4();
  items.forEach((it, i) => {
    mesh.setMatrixAt(i, xformMatrix(it.t, m));
    if (it.color) mesh.setColorAt(i, it.color);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false; // the prop's own LOD sphere culls it
  mesh.name = name;
  return mesh;
}

/**
 * A tapered, wobbling column standing on y = 0 (indexed, smooth-shaded).
 * `ridges` adds vertical flutes, `lip` a flared rim at the top and `flare` a
 * wider foot.
 */
export function column(o: {
  h: number;
  r0: number;
  topFrac: number;
  seed: number;
  segs: number;
  rings: number;
  wobble?: number;
  ridges?: number;
  lip?: number;
  flare?: number;
}): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(
    o.r0 * o.topFrac,
    o.r0,
    o.h,
    Math.max(6, Math.round(o.segs)),
    Math.max(3, Math.round(o.rings)),
  );
  g.translate(0, o.h / 2, 0);
  const p = g.getAttribute('position');
  const wob = o.wobble ?? 0.2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const t = y / o.h;
    const ang = Math.atan2(z, x);
    const n = fbm3(
      Math.cos(ang) * 1.4 + 3,
      y * (0.5 / Math.max(1, o.h / 12)) * 4,
      Math.sin(ang) * 1.4 + 3,
      o.seed,
      3,
    );
    let f = 1 + (n - 0.5) * 2 * wob;
    if (o.ridges) f *= 1 + 0.07 * Math.sin(ang * o.ridges + n * 6);
    if (o.lip) f *= 1 + o.lip * smooth(0.86, 1, t);
    if (o.flare) f *= 1 + o.flare * (1 - smooth(0, 0.18, t));
    p.setXYZ(i, x * f, y, z * f);
  }
  g.computeVertexNormals();
  return g;
}
