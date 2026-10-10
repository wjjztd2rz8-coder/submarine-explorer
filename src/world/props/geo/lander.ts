/**
 * `feature: "benthic-lander"` (Challenger Deep, the "Leggo" bait station): a free-vehicle lander
 * seen as a readable hero object. Three-legged aluminium frame with a ring and cross braces, yellow
 * glass flotation, a ballast plate, a camera housing, an arm carrying a wire bait cage with
 * mackerel, and a tall mast with an orange recovery flag and a white strobe. dims = [footprint
 * width, footprint depth, overall height incl. mast]. Parts are merged with vertex colours into
 * one frame mesh; the flag (emissive) and strobe (unlit) are two small extra meshes, so the whole
 * lander is three draw calls at every tier. Real lander dimensions are unpublished: the shape is
 * generic, only the position is the real one.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { geoDetail } from './detail.js';
import { boxCH, impostorFromBoxes, normalise, place, type BuiltProp } from './shared.js';
import type { GeoBuildInput } from './types.js';

const ALU = new THREE.Color(0xb9c3c8);
const DARK = new THREE.Color(0x2c3236);
const FLOAT = new THREE.Color(0xe9b21c);
const WHITE = new THREE.Color(0xdfe6e8);
const FISH = new THREE.Color(0x8fa6b4);
const FLAG = new THREE.Color(0xff5a16);
const STROBE = new THREE.Color(0xd6f4ff);

/** Give a piece one flat colour and strip it to position/normal/colour so it can merge. */
function tint(g: THREE.BufferGeometry, c: THREE.Color): THREE.BufferGeometry {
  const out = normalise(g);
  const n = out.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

/** A cylinder of radius `r` joining two points. */
function strut(a: THREE.Vector3, b: THREE.Vector3, r: number, seg: number): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  g.applyQuaternion(q);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return g.translate(mid.x, mid.y, mid.z);
}

export function buildBenthicLander(input: GeoBuildInput): BuiltProp {
  const { dims, tier } = input;
  const d = geoDetail(tier);
  const seg = d.meshDensity < 0.7 ? 5 : 8;
  const [W, , H] = dims;
  // Everything is authored for a 3.4 m footprint and scaled to the requested dimensions.
  const k = W / 3.4;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x * k, y * k, z * k);
  const parts: THREE.BufferGeometry[] = [];

  // Three legs, each with a foot pad, rising to the top ring.
  const ringY = 1.7;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    parts.push(
      tint(strut(v(cx * 1.5, 0.1, cz * 1.5), v(cx * 0.9, ringY, cz * 0.9), 0.07 * k, seg), ALU),
    );
    parts.push(
      tint(
        new THREE.CylinderGeometry(0.34 * k, 0.4 * k, 0.12 * k, seg + 3).translate(
          cx * 1.5 * k,
          0.04 * k,
          cz * 1.5 * k,
        ),
        DARK,
      ),
    );
    // Cross braces to the next leg at mid height.
    const b = ((i + 1) / 3) * Math.PI * 2 + Math.PI / 6;
    parts.push(
      tint(
        strut(
          v(cx * 1.2, 0.85, cz * 1.2),
          v(Math.cos(b) * 1.2, 0.85, Math.sin(b) * 1.2),
          0.045 * k,
          seg,
        ),
        ALU,
      ),
    );
    // Flotation: a yellow glass sphere at each leg top, and one between.
    const fl = new THREE.IcosahedronGeometry(0.3 * k, d.sphereDetail > 1 ? 1 : 0);
    parts.push(tint(fl.translate(cx * 0.9 * k, (ringY + 0.28) * k, cz * 0.9 * k), FLOAT));
    const mx = Math.cos(a + Math.PI / 3);
    const mz = Math.sin(a + Math.PI / 3);
    parts.push(
      tint(
        new THREE.IcosahedronGeometry(0.26 * k, d.sphereDetail > 1 ? 1 : 0).translate(
          mx * 0.75 * k,
          (ringY + 0.3) * k,
          mz * 0.75 * k,
        ),
        FLOAT,
      ),
    );
  }
  // Top ring and the ballast plate hung under the frame.
  parts.push(
    tint(
      new THREE.TorusGeometry(0.92 * k, 0.05 * k, 4, seg * 3)
        .rotateX(Math.PI / 2)
        .translate(0, ringY * k, 0),
      ALU,
    ),
  );
  parts.push(
    tint(
      new THREE.CylinderGeometry(0.75 * k, 0.75 * k, 0.12 * k, seg + 4).translate(0, 0.28 * k, 0),
      DARK,
    ),
  );
  // Pressure housings (white) on the central axis, and the camera housing.
  parts.push(
    tint(
      new THREE.CylinderGeometry(0.2 * k, 0.2 * k, 1.1 * k, seg + 2).translate(0, 0.9 * k, 0),
      WHITE,
    ),
  );
  parts.push(
    tint(
      new THREE.CylinderGeometry(0.14 * k, 0.14 * k, 0.5 * k, seg + 2)
        .rotateZ(Math.PI / 2)
        .translate(0.35 * k, 1.2 * k, 0),
      DARK,
    ),
  );

  // Bait arm and wire cage with a mackerel inside, ahead of the lander on +x.
  const hub = v(0.9, 1.0, 0);
  const cage = v(2.3, 0.62, 0);
  parts.push(tint(strut(hub, cage, 0.045 * k, seg), ALU));
  const cw = 0.42 * k;
  const ch = 0.26 * k;
  const cd = 0.26 * k;
  const corners: THREE.Vector3[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1])
        corners.push(new THREE.Vector3(cage.x + sx * cw, cage.y + sy * ch, cage.z + sz * cd));
  const edge = (i: number, j: number) =>
    parts.push(tint(strut(corners[i]!, corners[j]!, 0.022 * k, 4), ALU));
  // Corner index = sx*4 + sy*2 + sz (bit order), edges differ in one bit.
  for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) edge(i, i | bit);
  const fish = (dz: number, ry: number) =>
    parts.push(
      tint(
        place(new THREE.IcosahedronGeometry(1, 1), {
          x: cage.x,
          y: cage.y - 0.03 * k,
          z: cage.z + dz * k,
          ry,
          sx: 0.34 * k,
          sy: 0.06 * k,
          sz: 0.09 * k,
        }),
        FISH,
      ),
    );
  fish(-0.07, 0.15);
  fish(0.08, -0.2);

  // Mast, with the strobe on top and the flag just beneath it.
  const mastTop = H - 0.15 * k;
  parts.push(
    tint(
      strut(
        v(0, ringY + 0.3, 0),
        new THREE.Vector3(0, mastTop, 0).multiplyScalar(1),
        0.035 * k,
        seg,
      ),
      ALU,
    ),
  );

  const frameGeom = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  frameGeom.computeBoundingBox();
  frameGeom.computeBoundingSphere();
  const frame = new THREE.Mesh(
    frameGeom,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 }),
  );
  frame.name = 'lander-frame';

  // Recovery flag: a swallow-tailed pennant, double-sided and self-lit so it reads at depth.
  const fl = 1.15 * k;
  const fh = 0.62 * k;
  const flagGeom = new THREE.BufferGeometry();
  const top = mastTop - 0.1 * k;
  flagGeom.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        0,
        top,
        0,
        0,
        top - fh,
        0,
        fl,
        top - fh * 0.5,
        0.12 * k,
        0,
        top,
        0,
        fl * 0.5,
        top - fh * 0.15,
        0.1 * k,
        fl,
        top - fh * 0.5,
        0.12 * k,
      ]),
      3,
    ),
  );
  flagGeom.computeVertexNormals();
  const flag = new THREE.Mesh(
    flagGeom,
    new THREE.MeshStandardMaterial({
      color: FLAG,
      emissive: FLAG,
      emissiveIntensity: 0.5,
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
  );
  flag.name = 'lander-flag';
  const strobe = new THREE.Mesh(
    new THREE.SphereGeometry(0.1 * k, 8, 6).translate(0, mastTop + 0.07 * k, 0),
    new THREE.MeshBasicMaterial({ color: STROBE, toneMapped: false }),
  );
  strobe.name = 'lander-strobe';

  const full = new THREE.Group();
  full.name = 'benthic-lander';
  full.add(frame, flag, strobe);
  const bounds = new THREE.Box3().setFromObject(full);
  const colliders: THREE.Box3[] = [boxCH(0, 1 * k, 0, 1.1 * k, 1 * k, 1.1 * k)];
  return { full, impostor: impostorFromBoxes(colliders, bounds, 0x8a9296), bounds, colliders };
}
