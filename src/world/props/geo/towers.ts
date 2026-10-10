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
import { softDot } from './textures.js';
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
  xformMatrix,
  type BuiltProp,
  type InstanceSpec,
} from './shared.js';
import { scatterRubble } from './talus.js';
import { spireRadius, tieredSpire, trunkCrest, type SpireOpts } from './spire.js';
import type { GeoBuildInput } from './types.js';

const OLD = new THREE.Color(0xc2bfb3); // weathered, inactive carbonate
const LIVE = new THREE.Color(0xfaf6ec); // fresh white carbonate and brucite, faintly warm
const STAIN = new THREE.Color(0x938d7c);
const CREAM = new THREE.Color(0xf8ecd2); // warm cream carbonate crust
const GREYBLUE = new THREE.Color(0xaab6bb); // cooler, older grey-blue carbonate
const BIOFILM = new THREE.Color(0x6f9a90); // faint blue-green microbial film in damp recesses
const TROUGH = new THREE.Color(0xb3ab98); // warm grey stain in the flow troughs
const FRINGE = new THREE.Color(0xffffff); // brucite fringe round the vent mouth
const VENT = new THREE.Color(0x14120f); // the dark vent mouth
const SEABED = new THREE.Color(0xc2a468); // what the apron fades into: the Lost City sediment

/**
 * Breaks the lathe-smooth trunk in place (local column frame, y up from the base):
 * noise-varied radius, vertical ridges, notched and broken ledges, and a pocket
 * where the side orifice sits. Vertex count is unchanged.
 */
function roughenTrunk(g: THREE.BufferGeometry, s: SpireOpts, seed: number, pocket: boolean): void {
  const p = g.getAttribute('position');
  const orA = 0.9;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const t = y / s.h;
    const rad = Math.hypot(x, z);
    if (rad < 1e-4) continue;
    const a = Math.atan2(z, x);
    const ca = Math.cos(a),
      sa = Math.sin(a);
    // Fade out at the base (buried) and at the crater rim so the mouth keeps its shape.
    const w = smooth(0.0, 0.08, t) * (1 - smooth(0.9, 0.99, t));
    const big = fbm3(ca * 1.6 + 4, y * 0.07, sa * 1.6 + 4, seed ^ 0x2a1, 3) - 0.5;
    const mid = fbm3(ca * 4.5 + 1, y * 0.25, sa * 4.5 + 1, seed ^ 0x2a2, 2) - 0.5;
    // Ridges that wander and pinch out along the height.
    const ridgePhase = a * 7 + big * 5 + y * 0.05;
    const ridge = Math.pow(0.5 + 0.5 * Math.sin(ridgePhase), 2) * smooth(0.3, 0.6, mid + 0.5 + big);
    // Ledges: stepped horizontal bands, broken by noise so they stop and start.
    const band = y / Math.max(2.5, s.h / 9) + big * 1.5;
    const frac = band - Math.floor(band);
    const broken = smooth(0.35, 0.6, mid + 0.5 + Math.sin(a * 3 + Math.floor(band)) * 0.2);
    const ledge = smooth(0.7, 0.96, frac) * (1 - smooth(0.96, 1, frac)) * broken;
    const undercut = smooth(0.0, 0.25, frac) * (1 - smooth(0.25, 0.5, frac)) * broken;
    let k = 1 + big * 0.6 + mid * 0.3 + ridge * 0.1 + ledge * 0.04 - undercut * 0.03;
    // Orifice pocket.
    const da = Math.atan2(Math.sin(a - orA), Math.cos(a - orA)) * rad;
    const dy = y - 0.8 * s.h;
    const orr = Math.max(0.6, rad * 0.3);
    const od = Math.hypot(da, dy) / orr;
    if (pocket) k -= (1 - smooth(0.3, 1.1, od)) * 0.25;
    k = 1 + (k - 1) * w;
    p.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals();
}

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
      ledge: main ? 0.12 : 0.1,
      wobble: 0.1,
      rough: 0.035,
      ridges: main ? 22 : 14,
      ridgeAmp: main ? 0.13 : 0.1,
      flare: main ? 0.7 : 0.5,
      lip: 0.1,
      crater: main ? 0.9 : 0.7,
      irregular: 1,
      trunk: true,
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
    roughenTrunk(column, s, seed + i * 31, i === 0 && !lone);
    columns.push(column);
    pieces.push(column);
    tips.push({ x: s.x, y: s.y + s.h, z: s.z });
    // Drooping flanges on the column: wide shelves on the main tower, one or two elsewhere.
    // Saucer flanges read as plates, so only an occasional small one remains on lesser spires.
    const nf = lone || i === 0 ? 0 : rnd() < 0.3 ? 1 : 0;
    for (let f = 0; f < nf; f++) {
      const t =
        i === 0 ? 0.12 + (f / nf) * 0.6 + rnd() * 0.06 : 0.1 + (f / nf) * 0.6 + rnd() * 0.08;
      const rAt = spireRadius(s, t);
      const w = rAt * (0.08 + rnd() * 0.1) + 0.2;
      pieces.push(
        place(
          lostCityFlange({
            r0: rAt * 0.92,
            w,
            arc: 0.9 + rnd() * 1.1,
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
        trunk: true,
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
  // Vent orifice positions in the prop frame (after each column's lean).
  const vents = spires.map((s) => ({
    p: new THREE.Vector3(0, s.h, 0).applyMatrix4(
      xformMatrix(
        { x: s.x, y: s.y, z: s.z, rx: Math.sin(s.leanA) * s.lean, rz: Math.cos(s.leanA) * s.lean },
        new THREE.Matrix4(),
      ),
    ),
    r: s.r0 * s.topFrac * (1 + (s.lip ?? 0)),
    depth: s.crater ? s.crater * s.r0 * s.topFrac * 2.4 : 0,
  }));
  // A dark side orifice high on the main trunk, in the prop frame.
  const sm = spires[0]!;
  const orT = 0.8;
  const orA = 0.9;
  const orR = spireRadius(sm, orT);
  const orifice = new THREE.Vector3(
    Math.cos(orA) * orR,
    orT * sm.h,
    Math.sin(orA) * orR,
  ).applyMatrix4(
    xformMatrix(
      {
        x: sm.x,
        y: sm.y,
        z: sm.z,
        rx: Math.sin(sm.leanA) * sm.lean,
        rz: Math.cos(sm.leanA) * sm.lean,
      },
      new THREE.Matrix4(),
    ),
  );
  const orifaceR = Math.max(0.6, orR * 0.3);
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
    // Mineral variation: white brucite/aragonite crust, cream, and grey-blue carbonate,
    // drifting in broad patches that stretch vertically with the flow.
    const mineral = fbm3(x * 0.32, y * 0.045, z * 0.32, seed ^ 0x3b1, 3);
    out.lerp(CREAM, smooth(0.46, 0.64, mineral) * 0.6 * (0.4 + up));
    out.lerp(GREYBLUE, (1 - smooth(0.3, 0.5, mineral)) * 0.5);
    // Flow streaks: narrow vertical bands (high horizontal, very low vertical frequency)
    // alternating pale and shaded, as fluid ran down the walls.
    const wall = 1 - Math.abs(ny);
    const streak = fbm3(x * 1.3, y * 0.03, z * 1.3, seed ^ 0xf10, 3);
    out.multiplyScalar(1 + (streak - 0.5) * 0.9 * wall);
    // Dark seams between flow sheets: thin, vertically drawn streaks, strongest on walls.
    const seam = fbm3(x * 1.1, y * 0.07, z * 1.1, seed ^ 0x5ea, 3);
    out.multiplyScalar(1 - 0.22 * smooth(0.5, 0.56, seam) * (1 - smooth(0.56, 0.62, seam)) * wall);
    // Flow ridges: pale crests catch the light, troughs run grey-brown with a cool film.
    for (const sp of spires) {
      const dx = x - sp.x,
        dz = z - sp.z;
      if (dx * dx + dz * dz > sp.r0 * sp.r0 * 3 || y < sp.y || y > sp.y + sp.h) continue;
      const ang = Math.atan2(dz, dx);
      const ly = y - sp.y;
      const nn = fbm3(Math.cos(ang) * 1.3 + 3, ly * 0.09, Math.sin(ang) * 1.3 + 3, sp.seed, 3);
      const cr = trunkCrest(ang, ly, nn, sp.ridges ?? 7, sp.seed);
      const cc = cr * cr;
      out.multiplyScalar(0.8 + 0.3 * cc);
      out.lerp(TROUGH, (1 - cc) * 0.4 * smooth(0.02, 0.2, ly / sp.h));
      // Fine flow striations: thin pale and shaded lines running down the wall, drifting
      // and pinching out with height, strongest on the upper (fresh, white) trunk.
      const fine = Math.sin(ang * (sp.ridges ?? 7) * 4.5 + nn * 9 + ly * 0.06 + sp.seed);
      const fine2 = Math.sin(ang * (sp.ridges ?? 7) * 11 - nn * 5 + ly * 0.03);
      const line = 0.65 * fine + 0.35 * fine2;
      out.multiplyScalar(1 + line * 0.2 * wall);
      out.lerp(FRINGE, smooth(0.55, 0.95, line) * 0.22 * wall * smooth(0.1, 0.5, ly / sp.h));
      out.lerp(BIOFILM, (1 - cc) * 0.3 * (1 - smooth(0, 0.35, ly / sp.h)) * smooth(0.4, 0.6, n1));
      break;
    }
    // Vent orifices: a dark, sulphide-stained mouth at each column tip.
    for (const v of vents) {
      const dy = y - v.p.y;
      if (dy < -v.depth - 1.2 || dy > 0.6) continue;
      const dd = Math.hypot(x - v.p.x, z - v.p.z) / v.r;
      const mouth = 1 - smooth(0.3, 0.95, dd);
      // A white brucite fringe round the lip, then the dark throat inside it.
      const lip = smooth(0.6, 1.0, dd) * (1 - smooth(1.5, 2.3, dd)) * smooth(-2.5, -0.2, dy);
      out.lerp(FRINGE, lip * 0.85);
      out.lerp(VENT, mouth * smooth(-v.depth - 1.2, -0.3, dy) * 0.85);
    }
    // Faint blue-green biofilm: damp, sheltered lower walls and under ledges.
    const film = fbm3(x * 0.22, y * 0.12, z * 0.22, seed ^ 0xb10, 3);
    out.lerp(BIOFILM, smooth(0.48, 0.6, film) * 0.4 * wall * (1 - up * 0.6));
    // Side orifice: a dark, ragged-edged mouth with a stained rim and drip streak below.
    {
      const od = Math.hypot(x - orifice.x, y - orifice.y, z - orifice.z) / orifaceR;
      const ragged = od + (n2 - 0.5) * 0.35;
      if (ragged < 1.8) {
        out.lerp(STAIN, (1 - smooth(1, 1.8, ragged)) * 0.5);
        out.lerp(VENT, (1 - smooth(0.45, 1, ragged)) * 0.95);
      }
      const below = (orifice.y - y) / (orifaceR * 4);
      if (below > 0 && below < 1 && Math.hypot(x - orifice.x, z - orifice.z) < orifaceR * 0.8)
        out.multiplyScalar(1 - 0.3 * (1 - below));
    }
    if (ny > 0.8) out.multiplyScalar(0.95); // silt dusting on shelves
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
  // A faint bright fringe at each mouth: a ring of soft additive points on the lip (one Points
  // object, 28 points per vent, so it is no extra mesh draw and stays cheap on Low).
  const fringe: number[] = [];
  for (const k of hazeFor) {
    const v = vents[k]!;
    for (let j = 0; j < 28; j++) {
      const a = (j / 28) * Math.PI * 2 + k;
      fringe.push(v.p.x + Math.cos(a) * v.r * 0.95, v.p.y + 0.15, v.p.z + Math.sin(a) * v.r * 0.95);
    }
  }
  if (fringe.length) {
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fringe, 3));
    const ring = new THREE.Points(
      fg,
      new THREE.PointsMaterial({
        color: 0xe8f4f2,
        size: 0.8,
        sizeAttenuation: true,
        map: softDot(),
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: true,
      }),
    );
    ring.name = 'vent-fringe';
    full.add(ring);
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
