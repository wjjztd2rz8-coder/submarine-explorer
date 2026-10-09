/**
 * `feature: "carbonate-tower"` (Lost City, Poseidon): a pale carbonate edifice
 * of one tall, terraced, fluted spire and a ring of lesser ones on a talus
 * skirt, with drooping flanges and faint clear-fluid shimmer at the tips. dims
 * = [width, depth, height of the tallest spire] (width and depth describe the
 * whole edifice, not the column). `lone` builds a single small chimney of the
 * same family (the field's lesser carbonate chimneys).
 */

import * as THREE from 'three';
import { lostCityBedTint } from '../../LostCityBands.js';
import { createLostCityCarbonateMaterial } from '../../LostCityCarbonate.js';
import { lostCityFlange } from '../../LostCityFlange.js';
import { buildAnemone } from '../../life/models/sessile.js';
import { branchingColony } from './coral.js';
import { carbonateFinger } from './carbonateFinger.js';
import { geoDetail } from './detail.js';
import { LIFE_TINT } from './materials.js';
import { shimmerPlume } from './plume.js';
import {
  boxCH,
  clamp01,
  fbm3,
  heightMesh,
  impostorFromBoxes,
  instanced,
  mergeAll,
  mulberry32,
  paint,
  place,
  smooth,
  type BuiltProp,
  type InstanceSpec,
} from './shared.js';
import { scatterRubble } from './talus.js';
import { spireRadius, tieredSpire, type SpireOpts } from './spire.js';
import type { GeoBuildInput } from './types.js';

const OLD = new THREE.Color(0x8e8c82); // weathered, inactive carbonate
const LIVE = new THREE.Color(0xe9e7de); // fresh white carbonate and brucite, faintly warm
const STAIN = new THREE.Color(0x6c685a);
const SEABED = new THREE.Color(0xc2a468); // what the apron fades into: the Lost City sediment

export function buildCarbonateTower(input: GeoBuildInput, lone = false): BuiltProp {
  const { dims, seed, tier } = input;
  const gnd = input.groundHeight() ?? ((): number => 0);
  const d = geoDetail(tier);
  const [W, D, H] = dims;
  const rnd = mulberry32(seed);
  const skirtH = H * (lone ? 0.1 : 0.16);
  const root = H * 0.5; // the foundation sinks into the seabed on the downhill side
  // The apron outline: the ellipse's radius pushed in and out by two scales of noise, so the
  // rim is lobed and ragged rather than a flat oval. `rim` is 1 on the outline, 0 at the centre.
  const nominal = 0.8; // the outline sits at this fraction of the build plane
  const rim = (x: number, z: number): number => {
    const r = Math.hypot(x / (W / 2), z / (D / 2));
    const warp =
      (fbm3(x * (4.5 / W) + 9, 2, z * (4.5 / D) + 9, seed ^ 0x51, 3) - 0.5) * 0.95 +
      (fbm3(x * (18 / W), 7, z * (18 / D), seed ^ 0x33, 2) - 0.5) * 0.3;
    // Never let the outline reach the build plane's edge, where it would be cut off.
    const edge = smooth(0.82, 1, Math.max(Math.abs(x) / (W * 0.625), Math.abs(z) / (D * 0.625)));
    return (r * (1 + warp)) / nominal + edge * 2;
  };
  const skirtShape = (x: number, z: number): number => {
    const r = rim(x, z);
    const n = (fbm3(x * 0.12, 5, z * 0.12, seed, 4) - 0.5) * skirtH * 0.7;
    const top = skirtH * Math.pow(Math.max(0, 1 - Math.min(r, 1) ** 2), 1.3);
    // Flush with the seabed at the outline (a feathered wedge, not a step), sunk beyond it.
    return top + n * clamp01(1 - r) - smooth(0.96, 1.4, r) * root;
  };
  /** The talus skirt lifted onto the terrain, so the edifice sits on the slope. */
  const skirt = (x: number, z: number): number => skirtShape(x, z) + gnd(x, z) + 0.05;

  interface Spire extends SpireOpts {
    x: number;
    z: number;
    y: number;
    lean: number;
    leanA: number;
  }
  const spires: Spire[] = [];
  const dens = d.meshDensity;
  const mk = (x: number, z: number, h: number, main: boolean): void => {
    const r0 = h * (main ? 0.26 : 0.17) + 0.5;
    spires.push({
      x,
      z,
      y: Math.max(skirtShape(x, z), 0) + gnd(x, z) - 0.6,
      h,
      r0,
      topFrac: main ? 0.3 : 0.28,
      seed: seed + spires.length * 11,
      segs: 26 * dens + 4,
      rings: (h / 0.9) * dens + 8,
      tiers: Math.max(2, Math.round(h / (main ? 6.5 : 5))),
      ledge: main ? 0.2 : 0.16,
      wobble: 0.1,
      rough: 0.035,
      ridges: main ? 9 : 6,
      ridgeAmp: 0.075,
      flare: main ? 0.7 : 0.5,
      lip: 0.1,
      crater: 0.5,
      irregular: 1,
      lean: main ? 0 : (rnd() - 0.5) * 0.12,
      leanA: rnd() * 6.283,
    });
  };
  // H is the edifice's total local relief: the column rises from the top of its talus
  // skirt, so it is shortened by the skirt's height under it.
  mk(0, 0, H - (Math.max(skirtShape(0, 0), 0) - 0.6), true);
  const main = spires[0]!;
  const n = lone ? 0 : 4 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + rnd() * 0.5;
    const h = H * (0.3 + rnd() * 0.42);
    const sr0 = h * 0.17 + 0.5;
    const r = main.r0 * 0.9 + sr0 * 0.9 + 1 + rnd() * 0.1 * Math.min(W, D);
    mk(Math.cos(a) * r, Math.sin(a) * r, h, false);
  }

  // The build plane is wider than the nominal footprint so the ragged outline fits inside it.
  const pw = W * 1.25;
  const pd = D * 1.25;
  const pieces: THREE.BufferGeometry[] = [
    heightMesh(pw, pd, Math.round(48 * dens), Math.round(48 * dens), skirt),
  ];
  // Loose carbonate blocks across the apron, thinning toward the outline and clear of the columns.
  if (d.rubble) {
    const keep = (x: number, z: number): number => {
      const r = rim(x, z);
      if (r > 1.02) return 0;
      for (const s of spires) if (Math.hypot(x - s.x, z - s.z) < s.r0 * 0.9) return 0;
      return 0.25 + 0.75 * (1 - smooth(0.5, 1, r));
    };
    const area = lone ? W * D : W * D * 1.1;
    pieces.push(
      ...scatterRubble(skirt, keep, {
        halfX: pw / 2,
        halfZ: pd / 2,
        count: Math.min(lone ? 34 : 190, Math.round(area * (lone ? 0.03 : 0.014) * d.growth)),
        size: lone ? 0.7 : 1.2,
        detail: Math.min(d.sphereDetail, 1),
        seed: seed + 313,
      }),
    );
  }
  const tips: { x: number; y: number; z: number }[] = [];
  const columns: THREE.BufferGeometry[] = [];
  for (const [i, s] of spires.entries()) {
    // Keep each column local until its side growths have been seated.
    const column = tieredSpire(s);
    columns.push(column);
    pieces.push(column);
    tips.push({ x: s.x, y: s.y + s.h, z: s.z });
    // Drooping flanges on the column: wide shelves on the main tower, one or two elsewhere.
    const nf = lone ? 1 + Math.floor(rnd() * 2) : i === 0 ? 4 : 1 + Math.floor(rnd() * 2);
    for (let f = 0; f < nf; f++) {
      const t =
        i === 0 ? 0.12 + (f / nf) * 0.6 + rnd() * 0.06 : 0.1 + (f / nf) * 0.6 + rnd() * 0.08;
      const rAt = spireRadius(s, t);
      const w = rAt * (0.22 + rnd() * 0.3) + 0.4;
      pieces.push(
        place(
          lostCityFlange({
            r0: rAt * 0.92,
            w,
            arc: 1.1 + rnd() * 1.7,
            start: rnd() * 6.28,
            seed: seed + f + i * 5,
            tier,
          }),
          { x: s.x, y: s.y + t * s.h, z: s.z },
        ),
      );
    }
  }
  // Branching fingers: slim spires leaning out of the column flank, like buttresses
  // and side chimneys; they break the single-cone silhouette.
  const fingerRnd = mulberry32(seed ^ 0xf1f1);
  for (const [i, s] of spires.entries()) {
    const nFing = lone ? 2 : i === 0 ? 6 : 2;
    for (let k = 0; k < nFing; k++) {
      const t = 0.1 + (k / nFing) * 0.55 + fingerRnd() * 0.1;
      const a = fingerRnd() * 6.283;
      const rAt = spireRadius(s, t);
      const fh = s.h * (0.16 + fingerRnd() * 0.2);
      const fr = rAt * (0.22 + fingerRnd() * 0.14) + 0.25;
      const lean = 0.2 + fingerRnd() * 0.25;
      const finger = carbonateFinger(columns[i]!, {
        h: fh,
        r0: fr,
        topFrac: 0.08,
        seed: seed + 900 + k + i * 13,
        segs: 10 * dens + 4,
        rings: (fh / 1.2) * dens + 5,
        tiers: Math.max(1, Math.round(fh / 4)),
        ledge: 0.18,
        wobble: 0.12,
        rough: 0.04,
        ridges: 4,
        ridgeAmp: 0.08,
        flare: 0.7,
        lip: 0,
        crater: 0.4,
        irregular: 1,
        rootHeight: t * s.h,
        azimuth: a,
        lean,
      });
      // Share the parent's transform after seating against its local surface.
      pieces.push(
        place(finger, {
          x: s.x,
          y: s.y,
          z: s.z,
          rx: Math.sin(s.leanA) * s.lean,
          rz: Math.cos(s.leanA) * s.lean,
        }),
      );
    }
    place(columns[i]!, {
      x: s.x,
      y: s.y,
      z: s.z,
      rx: Math.sin(s.leanA) * s.lean,
      rz: Math.cos(s.leanA) * s.lean,
    });
  }
  const geom = mergeAll(pieces);
  paint(geom, (x, y, z, ny, out) => {
    const n1 = fbm3(x * 0.16, y * 0.1, z * 0.16, seed ^ 0x77, 4);
    const n2 = fbm3(x * 0.7, y * 0.35, z * 0.7, seed ^ 0x99, 3);
    // Fresh white on the upper parts and tips, weathered grey-tan low down and on the skirt.
    const up = smooth(0.1, 0.8, (y - gnd(x, z)) / H + (n1 - 0.5) * 0.6);
    out.copy(OLD).lerp(LIVE, up * 0.92 + 0.1 * n2);
    out.lerp(STAIN, smooth(0.62, 0.88, n2) * 0.3 * (1 - up));
    out.multiplyScalar(0.88 + 0.24 * n2);
    // Pale crust on exposed growths, warm weathering in recesses. Vertex paint
    // remains visible on Low without a normal-map or another material draw.
    const crust = fbm3(x * 0.45, y * 0.24, z * 0.45, seed ^ 0xc4, 2);
    out.lerp(LIVE, smooth(0.48, 0.72, crust) * 0.35 * up);
    // Weathered and fresh carbonate beds follow the flanges; no extra rock geometry.
    const tint = lostCityBedTint(x, y - gnd(0, 0), z, Math.max(1.2, H / 11), 0.9);
    out.r *= tint[0];
    out.g *= tint[1];
    out.b *= tint[2];
    // Toward the outline the rubble thins into the surrounding seabed colour, patchily.
    const rn = rim(x, z) + (n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.12;
    out.lerp(SEABED, smooth(0.5, 1.05, rn) * (1 - up * 0.5));
    // Dark seams between flow sheets: thin, vertically drawn streaks, strongest on walls.
    const seam = fbm3(x * 1.1, y * 0.07, z * 1.1, seed ^ 0x5ea, 3);
    out.multiplyScalar(
      1 - 0.38 * smooth(0.5, 0.56, seam) * (1 - smooth(0.56, 0.62, seam)) * (1 - Math.abs(ny)),
    );
    if (ny > 0.8) out.multiplyScalar(0.9); // silt dusting on shelves
  });
  const material = createLostCityCarbonateMaterial(tier);
  const full = new THREE.Group();
  full.name = 'carbonate-tower';
  full.add(new THREE.Mesh(geom, material));
  full.userData.ventTop = tips[0]!.y;

  // Poseidon's inactive apron: three small thickets, clear of the active columns.
  // Reuse the prop coral and life anemone templates; two instanced draws at every tier.
  // A separate RNG keeps the chimney layout and shimmer unchanged.
  if (!lone && input.def.id === 'poseidon-tower') {
    const lifeRnd = mulberry32(seed ^ 0x600);
    const colonies: InstanceSpec[] = [];
    const anemones: InstanceSpec[] = [];
    const rock = full.children[0] as THREE.Mesh;
    const rootRay = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    geom.computeBoundingBox();
    const perPatch = Math.max(4, Math.round(18 * Math.min(d.growth, 1.2)));
    for (const [cx, cz] of [
      [-0.24 * W, 0.2 * D],
      [0.24 * W, 0.22 * D],
      [0.04 * W, -0.3 * D],
    ]) {
      for (let i = 0; i < perPatch; i++) {
        const a = lifeRnd() * Math.PI * 2;
        const r = Math.sqrt(lifeRnd()) * 4;
        const x = cx! + Math.cos(a) * r;
        const z = cz! + Math.sin(a) * r;
        if (rim(x, z) > 0.92 || spires.some((s) => Math.hypot(x - s.x, z - s.z) < s.r0 + 1.5))
          continue;
        const scale = 0.65 + (1 - r / 4) * 0.65 + lifeRnd() * 0.25;
        const isCoral = i % 3 !== 0;
        // Seat roots on the rendered triangles, including rubble, rather than on
        // the analytic skirt (which can sit above a coarse Low-tier triangle).
        rootRay.set(new THREE.Vector3(x, geom.boundingBox!.max.y + 1, z), down);
        const surface = rootRay.intersectObject(rock, false)[0];
        if (!surface) continue;
        (isCoral ? colonies : anemones).push({
          t: {
            x,
            y: surface.point.y - (isCoral ? 0.08 : 0.025) * scale,
            z,
            ry: lifeRnd() * Math.PI * 2,
            sx: scale,
            sy: scale,
            sz: scale,
          },
          color: new THREE.Color(isCoral ? 0xe5c4af : 0xf0e4d3),
        });
      }
    }
    const lifeMaterial = new THREE.MeshStandardMaterial({
      color: LIFE_TINT,
      vertexColors: true,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    if (colonies.length)
      full.add(
        instanced(
          branchingColony(d.branchDepth, seed ^ 0x601),
          lifeMaterial,
          colonies,
          'poseidon-base-corals',
        ),
      );
    if (anemones.length)
      full.add(
        instanced(
          buildAnemone({}, 0.25, tier === 'low' ? 0 : 1),
          lifeMaterial,
          anemones,
          'poseidon-base-anemones',
        ),
      );
  }

  // Faint clear-fluid haze at the tips of the tallest spires.
  const hazeFor = [...spires.keys()]
    .sort((a, b) => spires[b]!.h - spires[a]!.h)
    .slice(0, lone ? 1 : 3);
  for (const k of hazeFor) {
    const tip = tips[k]!;
    const ph = lone ? 3 : Math.min(14, spires[k]!.h * 0.28 + 3);
    const haze = shimmerPlume(ph, spires[k]!.r0 * 0.2, Math.round(70 * d.plume), seed + 700 + k);
    if (!haze) continue;
    haze.position.set(tip.x, tip.y, tip.z);
    full.add(haze);
  }
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  // The haze plumes carry their own bounding spheres, so they do not widen the prop's bounds.
  const bounds = geom.boundingBox!.clone();

  const colliders: THREE.Box3[] = [
    boxCH(0, gnd(0, 0) + skirtH * 0.3, 0, W * 0.3, skirtH * 0.3, D * 0.3),
  ];
  for (const s of spires) {
    for (const [a, b] of [
      [0, 0.34],
      [0.34, 0.68],
      [0.68, 1],
    ] as const) {
      const rr = spireRadius(s, (a + b) / 2) * 0.85;
      colliders.push(boxCH(s.x, s.y + ((a + b) / 2) * s.h, s.z, rr, ((b - a) / 2) * s.h, rr));
    }
  }
  return {
    full,
    impostor: impostorFromBoxes(
      colliders,
      bounds,
      lone ? input.cfg.chimneyMaterials.carbonate.rock : 0xa39d8c,
    ),
    bounds,
    colliders,
  };
}

/** A lone carbonate chimney: the field's lesser towers (`material_hint: carbonate`). */
export function buildCarbonateChimney(input: GeoBuildInput): BuiltProp {
  const h = Math.max(1, input.dims[2]);
  const w = Math.max(6, h * 1.6);
  return buildCarbonateTower({ ...input, dims: [w, w, h] }, true);
}
