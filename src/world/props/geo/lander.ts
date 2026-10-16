/**
 * `feature: "benthic-lander"` (Challenger Deep, the "Leggo" bait station): a free-vehicle lander
 * seen as a readable hero object. Three-legged frame with a ring and cross braces, amber foam
 * flotation, a ballast plate with an acoustic release and a coil of cable on the seabed, a camera
 * housing, an arm carrying a wire bait cage with mackerel, and a tall mast with an orange recovery
 * flag and a white strobe. The frame is aged: sediment darkens its lower sections and rust stains
 * patch the legs. dims = [footprint width, footprint depth, overall height incl. mast]. Parts are
 * merged with vertex colours into one frame mesh; the flag (emissive) and strobe (unlit) are two
 * small extra meshes, so the whole lander is three draw calls at every tier. Real lander dimensions
 * are unpublished: the shape is generic, only the position is the real one.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lerp, smoothstep } from '../../../util/math.js';
import { geoDetail } from './detail.js';
import {
  boxCH,
  impostorFromBoxes,
  normalise,
  place,
  valueNoise3,
  type BuiltProp,
} from './shared.js';
import type { GeoBuildInput } from './types.js';

const ALU = new THREE.Color(0x302f2a);
const CAGE = new THREE.Color(0x35352f);
const TIP = new THREE.Color(0x3b3a36);
const DARK = new THREE.Color(0x2c3236);
const FOAM = new THREE.Color(0x3d2d1c);
const FOAM_DARK = new THREE.Color(0x1f1812);
const STEEL = new THREE.Color(0x45484a);
const STRAP = new THREE.Color(0x2f3234);
const WHITE = new THREE.Color(0x535b5d);
const FISH = new THREE.Color(0x8fa6b4);
const FLAG = new THREE.Color(0xff5a16);
const STROBE = new THREE.Color(0xd6f4ff);
const GLASS = new THREE.Color(0x1f3a48);
const MUD = new THREE.Color(0x5e5443);
const SEDIMENT = new THREE.Color(0x2a251d);
const RUST = new THREE.Color(0x6b3a1e);

/** Give a piece one flat colour and strip it to position/normal/colour so it can merge. */
function tint(g: THREE.BufferGeometry, c: THREE.Color): THREE.BufferGeometry {
  const out = normalise(g);
  const n = out.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

/**
 * A syntactic-foam flotation sphere centred at (x, y, z): a dull, faintly lumpy ball with radial
 * (smooth) normals whose vertex colour mottles between two muted ambers, so it reads as moulded foam, not a lamp.
 */
function foamSphere(
  r: number,
  detail: number,
  x: number,
  y: number,
  z: number,
  seed: number,
): THREE.BufferGeometry {
  const g = normalise(new THREE.IcosahedronGeometry(r, detail));
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const f = 5 / r;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const lump = valueNoise3(px * f, py * f, pz * f, seed);
    const speck = valueNoise3(px * f * 4, py * f * 4, pz * f * 4, seed + 1);
    // Normals stay radial, so the ball shades smooth whatever its face count.
    nor.setXYZ(i, px / r, py / r, pz / r);
    const s = 1 + 0.03 * (lump - 0.5);
    pos.setXYZ(i, px * s + x, py * s + y, pz * s + z);
    c.copy(FOAM).lerp(FOAM_DARK, Math.min(1, Math.max(0, 1.1 * speck + 0.4 * lump - 0.3)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/**
 * Age the merged frame in place. Sediment darkens the lower ~40% of the height with vertical
 * streaks, running down the legs where water has washed the metal; rust blooms in patches on
 * the lower structure. Works per vertex, so it adds no triangles or draw calls.
 */
function weather(g: THREE.BufferGeometry, k: number, heightUnits: number): void {
  const pos = g.getAttribute('position');
  const col = g.getAttribute('color');
  const c = new THREE.Color();
  const streakTop = 0.4 * heightUnits;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / k;
    const y = pos.getY(i) / k;
    const z = pos.getZ(i) / k;
    c.setRGB(col.getX(i), col.getY(i), col.getZ(i));
    const low = smoothstep(streakTop, 0, y);
    const streak = 0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 4 + y * 1.5);
    c.lerp(SEDIMENT, low * (0.8 + 0.2 * streak));
    const stain = Math.sin(x * 7.3 + z * 4.1) * Math.cos(y * 9.7 - z * 3.3);
    if (y < 1.6 && stain > 0.55) c.lerp(RUST, lerp(0.05, 0.2, smoothstep(0.55, 1, stain)));
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

/** A cylinder of radius `r` joining two points. */
function strut(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  seg: number,
  rings = 1,
): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, seg, rings);
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
      tint(strut(v(cx * 1.5, 0.1, cz * 1.5), v(cx * 0.9, ringY, cz * 0.9), 0.09 * k, seg, 4), ALU),
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
    // Sediment that has settled around each foot pad.
    parts.push(
      tint(
        new THREE.CylinderGeometry(0.46 * k, 0.52 * k, 0.05 * k, seg + 3).translate(
          cx * 1.5 * k,
          0.025 * k,
          cz * 1.5 * k,
        ),
        MUD,
      ),
    );
    // Cross braces to the next leg at mid height.
    const b = ((i + 1) / 3) * Math.PI * 2 + Math.PI / 6;
    parts.push(
      tint(
        strut(
          v(cx * 1.2, 0.85, cz * 1.2),
          v(Math.cos(b) * 1.2, 0.85, Math.sin(b) * 1.2),
          0.06 * k,
          seg,
        ),
        ALU,
      ),
    );
    // Cross-bracing: a diagonal from this leg's foot area up to the next leg's upper section.
    parts.push(
      tint(
        strut(
          v(cx * 1.35, 0.35, cz * 1.35),
          v(Math.cos(b) * 1.0, 1.45, Math.sin(b) * 1.0),
          0.04 * k,
          seg,
        ),
        ALU,
      ),
    );
    // A flange collar where the leg meets the ring, and a steel ballast weight clamped low on it.
    parts.push(
      tint(
        new THREE.CylinderGeometry(0.11 * k, 0.11 * k, 0.1 * k, seg).translate(
          cx * 0.9 * k,
          ringY * k,
          cz * 0.9 * k,
        ),
        STEEL,
      ),
    );
    parts.push(
      tint(
        place(new THREE.BoxGeometry(1, 1, 1), {
          x: cx * 1.38 * k,
          y: 0.42 * k,
          z: cz * 1.38 * k,
          ry: -a,
          sx: 0.2 * k,
          sy: 0.3 * k,
          sz: 0.3 * k,
        }),
        STEEL,
      ),
    );
    // Flotation: a syntactic-foam sphere at each leg top (always 80 faces, the nearest and biggest
    // silhouette), with a strap, and a smaller one between (coarser on low).
    const fd = d.sphereDetail > 1 ? 1 : 0;
    parts.push(foamSphere(0.3 * k, 1, cx * 0.9 * k, (ringY + 0.28) * k, cz * 0.9 * k, i * 2));
    parts.push(
      tint(
        new THREE.TorusGeometry(0.3 * k, 0.02 * k, 3, seg * 2)
          .rotateX(Math.PI / 2)
          .translate(cx * 0.9 * k, (ringY + 0.2) * k, cz * 0.9 * k),
        STRAP,
      ),
    );
    const mx = Math.cos(a + Math.PI / 3);
    const mz = Math.sin(a + Math.PI / 3);
    parts.push(
      foamSphere(0.26 * k, fd, mx * 0.75 * k, (ringY + 0.3) * k, mz * 0.75 * k, i * 2 + 7),
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
  parts.push(
    tint(
      new THREE.SphereGeometry(0.1 * k, seg, 4, 0, Math.PI * 2, 0, Math.PI / 2)
        .rotateZ(-Math.PI / 2)
        .translate(0.6 * k, 1.2 * k, 0),
      GLASS,
    ),
  );
  // A battery/electronics box strapped to the central housing, and a bait plate on the ballast
  // plate (a shallow tray on two stand-offs, where the mackerel is lashed).
  parts.push(
    tint(
      place(new THREE.BoxGeometry(1, 1, 1), {
        x: -0.3 * k,
        y: 1.05 * k,
        z: 0.2 * k,
        ry: 0.5,
        sx: 0.3 * k,
        sy: 0.5 * k,
        sz: 0.22 * k,
      }),
      DARK,
    ),
  );
  parts.push(
    tint(
      place(new THREE.BoxGeometry(1, 1, 1), {
        x: 0.2 * k,
        y: 0.46 * k,
        z: 0.55 * k,
        ry: -0.4,
        sx: 0.55 * k,
        sy: 0.04 * k,
        sz: 0.3 * k,
      }),
      CAGE,
    ),
  );
  for (const sx of [-1, 1])
    parts.push(
      tint(
        strut(v(0.2 + sx * 0.2, 0.34, 0.55), v(0.2 + sx * 0.2, 0.44, 0.55), 0.025 * k, 4),
        STEEL,
      ),
    );
  // Acoustic release on the ballast plate, opposite the camera, with its orange ring.
  parts.push(
    tint(
      new THREE.CylinderGeometry(0.1 * k, 0.1 * k, 0.42 * k, seg + 2).translate(
        -0.5 * k,
        0.55 * k,
        -0.42 * k,
      ),
      DARK,
    ),
  );
  parts.push(
    tint(
      new THREE.TorusGeometry(0.1 * k, 0.025 * k, 3, seg + 2)
        .rotateX(Math.PI / 2)
        .translate(-0.5 * k, 0.74 * k, -0.42 * k),
      FLAG,
    ),
  );
  // A coil of cable left on the seabed, tilted to lie in the sediment.
  parts.push(
    tint(
      new THREE.TorusGeometry(0.42 * k, 0.022 * k, 3, seg * 2)
        .rotateX(Math.PI / 2 + 0.15)
        .translate(-0.9 * k, 0.03 * k, 0.72 * k),
      DARK,
    ),
  );

  // Bait arm and wire cage with a mackerel inside, ahead of the lander on +x.
  const hub = v(0.9, 1.0, 0);
  const cage = v(2.3, 0.62, 0);
  parts.push(tint(strut(hub, cage, 0.05 * k, seg), CAGE));
  const cw = 0.42 * k;
  const ch = 0.26 * k;
  const cd = 0.26 * k;
  const corners: THREE.Vector3[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1])
        corners.push(new THREE.Vector3(cage.x + sx * cw, cage.y + sy * ch, cage.z + sz * cd));
  const edge = (i: number, j: number) =>
    parts.push(tint(strut(corners[i]!, corners[j]!, 0.03 * k, 4), CAGE));
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
        0.05 * k,
        seg,
      ),
      ALU,
    ),
  );
  parts.push(
    tint(
      new THREE.CylinderGeometry(0.08 * k, 0.08 * k, 0.12 * k, seg).translate(
        0,
        mastTop - 0.02 * k,
        0,
      ),
      TIP,
    ),
  );

  const frameGeom = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  weather(frameGeom, k, H / k);
  frameGeom.computeBoundingBox();
  frameGeom.computeBoundingSphere();
  const frame = new THREE.Mesh(
    frameGeom,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 }),
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
    new THREE.SphereGeometry(0.06 * k, 8, 6).translate(0, mastTop + 0.06 * k, 0),
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
