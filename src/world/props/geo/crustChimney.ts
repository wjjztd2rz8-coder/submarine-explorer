/**
 * Beebe chimneys 2-3 (`procedural:chimney`, no feature): the hero's crusted-flange
 * profile and colour bands on a single leaning column with partial sulfide shelves
 * and one or two side spires. One merged vertex-coloured mesh, one draw call; Low
 * tier keeps a coarse ring/segment count.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BEEBE_CHIMNEY as beebe, BEEBE_SIDE_CHIMNEYS } from '../../../core/config/beebeChimney.js';
import { paintCrust } from './crust.js';
import { geoDetail } from './detail.js';
import { geoMaterial, vertexGlow } from './materials.js';
import { flange, tieredSpire } from './spire.js';
import { fbm3, mulberry32, paint, place, projectUVs, type BuiltProp } from './shared.js';
import type { GeoBuildInput } from './types.js';

/** True for the plain chimneys that use the crusted look. */
export function isCrustedSideChimney(id: string): boolean {
  return Object.hasOwn(BEEBE_SIDE_CHIMNEYS, id);
}

/** Paint a column in its own frame (axis at the origin, y up from the foot) and keep it indexed-free. */
function paintColumn(
  g: THREE.BufferGeometry,
  height: number,
  seed: number,
  bandSeed: number,
): THREE.BufferGeometry {
  const flat = g.toNonIndexed();
  g.dispose();
  paint(flat, (x, y, z, _ny, out) => {
    const nz = fbm3(x * 0.6, y * 0.5, z * 0.6, seed ^ 0x51, 4);
    paintCrust(out, x, y, z, Math.atan2(z, x), y, Math.min(1, y / height), nz, seed, bandSeed);
  });
  return flat;
}

export function buildCrustedChimney(input: GeoBuildInput): BuiltProp {
  const { dims, seed, cfg, tier, def } = input;
  const v = BEEBE_SIDE_CHIMNEYS[def.id]!;
  const d = geoDetail(tier);
  const dense = tier !== 'low';
  const rnd = mulberry32(seed);
  const H = dims[2] * v.heightScale;
  const r0 = (dims[0] > 0 ? dims[0] / 2 : H * cfg.chimneyRadiusFraction) * v.widthScale;
  const pieces: THREE.BufferGeometry[] = [];

  const trunk = tieredSpire({
    h: H,
    r0,
    topFrac: 0.45,
    seed,
    segs: dense ? 28 * d.meshDensity + 4 : 12,
    rings: dense ? (H / 0.32) * d.meshDensity + 6 : H / 0.9 + 3,
    crust: v.crust,
    tiers: Math.max(2, Math.round(H / 3.2)),
    ledge: beebe.ledge,
    wobble: beebe.wobble,
    rough: beebe.rough,
    ridges: v.ridges,
    ridgeAmp: beebe.ridgeAmp,
    flare: 0.75,
    lip: beebe.lip,
    crater: beebe.crater,
    irregular: beebe.irregular,
  });
  const lean = {
    rz: Math.cos(v.leanDir) * v.lean,
    rx: -Math.sin(v.leanDir) * v.lean,
  };
  pieces.push(place(paintColumn(trunk, H, seed, seed + 7), lean));

  // Partial sulfide shelves, like the hero's, spread up the trunk with jitter.
  for (let k = 0; k < v.flanges; k++) {
    const t = 0.2 + ((k + 0.25 * rnd()) / v.flanges) * 0.6;
    const localR = r0 * (1 - 0.55 * t);
    const shelf = flange({
      r0: localR * beebe.shelfRadiusFraction,
      w: localR * (beebe.shelfWidthMin + rnd() * beebe.shelfWidthVariation),
      arc: beebe.shelfArcMin + rnd() * beebe.shelfArcVariation,
      start: rnd() * Math.PI * 2,
      seed: seed + k * 11,
      segs: 18 * d.meshDensity,
    });
    // Seat the shelf on the leaned trunk axis.
    const on = new THREE.Vector3(0, H * t, 0).applyEuler(new THREE.Euler(lean.rx, 0, lean.rz));
    pieces.push(
      place(paintColumn(shelf, H, seed + 3, seed + 7), { x: on.x, y: on.y, z: on.z, ...lean }),
    );
  }

  // One or two crusted side spires on the lower trunk.
  const spires = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < spires; i++) {
    const a = rnd() * Math.PI * 2;
    const h = H * (0.25 + rnd() * 0.25);
    const off = r0 * (0.75 + rnd() * 0.2);
    const sp = tieredSpire({
      h,
      r0: r0 * 0.4,
      topFrac: 0.45,
      seed: seed + i * 13 + 5,
      segs: dense ? 16 * d.meshDensity + 4 : 8,
      rings: dense ? h / 0.4 + 4 : h / 1.2 + 3,
      crust: dense ? 0.8 : 0,
      wobble: 0.2,
      lip: 0.25,
      flare: 0.5,
      ridges: 3,
      irregular: 0.6,
    });
    pieces.push(
      place(paintColumn(sp, h, seed + i, seed + 19 + i), {
        x: Math.cos(a) * off,
        y: H * (0.1 + rnd() * 0.25),
        z: Math.sin(a) * off,
        rz: Math.cos(a) * 0.3,
        rx: -Math.sin(a) * 0.3,
      }),
    );
  }

  const geom = mergeGeometries(pieces, false);
  if (!geom) throw new Error('crusted chimney: geometry merge failed');
  for (const p of pieces) p.dispose();
  projectUVs(geom, 3);
  geom.computeBoundingBox();
  geom.computeBoundingSphere();

  const mat = geoMaterial('rock', d, { roughness: 0.9, bumpScale: cfg.chimneyCrust.bumpScale });
  // Same finish as the hero: lifted albedo plus a faint warm self-lit tint following the crust.
  mat.color.multiplyScalar(1.25);
  vertexGlow(mat, 0.13, 0xff9a68, 0.5);
  const full = new THREE.Mesh(geom, mat);
  full.name = 'chimney';
  const imp = new THREE.Mesh(
    new THREE.CylinderGeometry(r0 * cfg.chimneyTopFraction, r0, H, 6).translate(0, H / 2, 0),
    new THREE.MeshStandardMaterial({ color: 0x3b322d, roughness: 1, metalness: 0 }),
  );
  imp.name = 'chimney-impostor';
  return { full, impostor: imp, bounds: geom.boundingBox!.clone() };
}
