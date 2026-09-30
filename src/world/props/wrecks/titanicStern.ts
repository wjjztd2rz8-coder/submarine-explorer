/**
 * RMS Titanic, stern section (Ballard 1987; WHOI 2010 sonar and photo mosaic;
 * 2022 Magellan / Atlantic Productions photogrammetry).
 *
 * About 107 m of hull that hit the seabed hard: the decks pancaked down onto
 * one another, the side plating splayed outward, and the poop deck peeled back
 * and folded forward over itself. It lies about 600 m south of the bow, its
 * counter stern pointing back toward it. Its forward end, where the ship tore
 * apart, is open: the tops of the two reciprocating engines stand in the dark
 * engine room (anchor `interior-entry`). Aft of the pancaked superstructure
 * are the collapsed aft well deck and the poop deck with its cargo cranes;
 * the elliptical counter and the top of the rudder show above the mud.
 *
 * Local frame: s = distance from the torn forward end (-Z), s = L at the
 * counter (+Z); +X starboard when facing -Z (the ship's original forward
 * direction); y = 0 at the mud line.
 */

import * as THREE from 'three';
import { ringBox, catenary } from './titanicBow.js';
import { assembleWreck, meshOf, type WreckBuilt, type WreckParts } from './assemble.js';
import type { WreckDetail } from './detail.js';
import {
  InstanceList,
  barGeometry,
  hangRusticle,
  makeInstanced,
  portholeGeometry,
  railing,
  rusticleGeometry,
} from './instances.js';
import {
  PartBin,
  beam,
  curl,
  deckStrip,
  flipFaces,
  jitter,
  loftCap,
  loftPoint,
  loftSides,
  makeStations,
  projectUVs,
  strut,
  trs,
  v3,
  type LoftSpec,
} from './kit.js';
import {
  WRECK_COLORS as C,
  fittingMaterial,
  growthMaterial,
  paintWreck,
  silhouetteMaterial,
  steelMaterial,
  voidMaterial,
} from './materials.js';
import { bollards, cowlVent, edgePath, openingRow, rusticlesAlong } from './ship.js';
import { mulberry32, valueNoise3 } from './shared.js';

/** Stations along the stern section (m from the torn forward end). */
export const TITANIC_STERN = {
  /** Depth of the open engine-room cavity behind the tear. */
  cavity: 14,
  superEnd: 60,
  wellEnd: 74,
  deckY: 9.2,
  wellY: 7.2,
  poopY: 9.8,
  /** Length over which the counter stern rounds in. */
  counter: 16,
} as const;

/** Build the Titanic stern; dims = [length, width (splayed), height]. */
export function buildTitanicStern(
  dims: readonly [number, number, number],
  seed: number,
  detail: WreckDetail,
): WreckBuilt {
  const T = TITANIC_STERN;
  const L = dims[0];
  const W = dims[1];
  const H = dims[2];
  const rnd = mulberry32(seed);
  const hB = W / 2;
  const zOf = (s: number): number => s - L / 2;
  const S = THREE.MathUtils.smoothstep;

  // Deck line: pancaked and lumpy forward, the well deck a step down, the poop aft.
  const lump = (s: number): number => (valueNoise3(s * 0.09, 1.3, 2.7, seed) - 0.5) * 1.6;
  const top = (s: number): number => {
    const k = H / 10;
    const tear = S(s, 0, 10); // the torn end slumps
    if (s < T.superEnd) return k * (T.deckY - 3 * (1 - tear) + lump(s));
    if (s < T.wellEnd) return k * (T.wellY + lump(s) * 0.4);
    return k * (T.poopY + lump(s) * 0.3);
  };
  // Plating splays outward toward the top; the counter rounds in (and is
  // tucked under near the mud, like the real overhanging counter).
  const half = (s: number, y: number): number => {
    const yh = THREE.MathUtils.clamp((y + 2.5) / 12, 0, 1);
    const splay = THREE.MathUtils.lerp(hB * 0.82, hB, yh);
    const end = L - 5 * (1 - S(y, 0, 5));
    const u = THREE.MathUtils.clamp((s - (end - T.counter)) / T.counter, 0, 1);
    if (s >= end) return 0;
    return splay * Math.sqrt(Math.max(0, 1 - u * u));
  };
  const deform = (p: THREE.Vector3, s: number, y: number, side: -1 | 1): void => {
    const n = valueNoise3(s * 0.15, y * 0.2, side * 3.1, seed ^ 0x33);
    const n2 = valueNoise3(s * 0.4, y * 0.5, side * 1.9, seed ^ 0x71);
    // Crumpled plating, worse higher up and toward the tear.
    const k = 0.35 + 0.65 * (1 - S(s, 0, 30));
    p.x += side * (n - 0.45) * 1.4 * THREE.MathUtils.clamp(y / 8, 0, 1) * k;
    p.y += (n2 - 0.5) * 0.5 * THREE.MathUtils.clamp(y / 6, 0, 1);
    // The ragged tear.
    const t = 1 - S(s, 0, 7);
    if (t > 0) p.z += 5 * t * valueNoise3(y * 0.4, side * 2.3, 7.7, seed ^ 0x19);
  };

  const d = detail.meshDensity;
  const spec: LoftSpec = {
    L,
    stations: makeStations(
      L,
      4.5 / d,
      1.3 / d,
      [
        [0, 16],
        [L - T.counter - 2, L],
      ],
      [T.superEnd, T.wellEnd],
    ),
    yBottom: -2.5,
    levels: Math.max(6, Math.round(12 * d)),
    top,
    half,
    deform,
  };

  const hull = new PartBin();
  const dark = new PartBin();
  const fit = C.blackPaint;
  const white = C.whitePaint;

  // ---- body
  hull.add(loftSides(spec), C.blackPaint);
  const deckY = (s: number): number => top(s) - 0.03;
  hull.add(deckStrip(spec, T.cavity - 2, T.superEnd, deckY, 0, 5), white);
  hull.add(deckStrip(spec, T.superEnd, T.wellEnd, deckY, 0.2, 4), C.blackPaint);
  hull.add(deckStrip(spec, T.wellEnd, L, deckY, 0, 4), C.teak);

  // ---- the engine-room cavity at the torn forward end: inner walls, floor,
  // back bulkhead, and the two engines' cylinder tops standing in it.
  const inner: LoftSpec = {
    ...spec,
    stations: spec.stations.filter((s) => s <= T.cavity + 0.01),
    half: (s, y) => Math.max(0, half(s, y) - 0.6),
  };
  const walls = loftSides(inner);
  flipFaces(walls);
  hull.add(walls, C.interior);
  const floorY = 0.6;
  hull.add(deckStrip(spec, 0, T.cavity, () => floorY, 0.8, 4), C.interior);
  hull.add(loftCap(spec, T.cavity, -1), C.interior);
  dark.add(new THREE.BoxGeometry(W * 0.7, 0.1, 3).translate(0, floorY + 0.06, zOf(T.cavity - 1.6)), 0);
  const cavityOpen = new THREE.Object3D();
  cavityOpen.name = 'interior-entry';
  cavityOpen.position.set(0, top(4) * 0.5, zOf(2));
  cavityOpen.userData = { kind: 'interior-entry', wreck: 'titanic-stern', note: 'engine room, open at the tear' };
  for (const side of [-1, 1] as const) {
    // Four cylinders per engine, the largest aft, in a row fore-and-aft.
    const x = side * W * 0.19;
    const block = new THREE.BoxGeometry(5.2, 2.2, 11, 3, 2, 6);
    block.translate(x, floorY + 1.1, zOf(7.5));
    hull.add(jitter(block, 0.12, 0.7, seed + side), C.rustDark);
    [
      [3.2, 1.35],
      [5.5, 1.55],
      [8.1, 1.8],
      [11, 2.1],
    ].forEach(([s, r], i) => {
      const cyl = new THREE.CylinderGeometry(r!, r! * 1.04, 3 + i * 0.3, 16, 2);
      cyl.translate(x, floorY + 2.2 + (3 + i * 0.3) / 2, zOf(s!));
      hull.add(jitter(cyl, 0.08, 0.9, seed ^ (i * 13 + side)), C.rustDark);
      const cover = new THREE.CylinderGeometry(r! * 1.08, r! * 1.08, 0.25, 16);
      cover.translate(x, floorY + 2.2 + 3 + i * 0.3 + 0.12, zOf(s!));
      hull.add(cover, C.rust);
    });
    // Valve chest and a pipe run along the top.
    hull.add(beam(v3(x - side * 2.3, floorY + 5.4, zOf(2.2)), v3(x - side * 2.3, floorY + 5.4, zOf(12.6)), 0.35, 0.35, 8), C.rustDark);
  }
  // Deck slabs pancaked above the cavity, hanging out over the tear.
  const layers = [0.62, 0.78, 0.92];
  layers.forEach((f, i) => {
    const len = 6 + rnd() * 5;
    const g = new THREE.BoxGeometry(W * (0.7 + rnd() * 0.25), 0.28, len, 5, 1, 6);
    g.translate(0, 0, -len / 2);
    curl(g, len, -(0.25 + rnd() * 0.5));
    jitter(g, 0.3, 0.6, seed + i * 5);
    g.applyMatrix4(trs((rnd() - 0.5) * 3, top(len) * f, zOf(len * 0.9), 0, (rnd() - 0.5) * 0.25));
    hull.add(g, i === layers.length - 1 ? white : C.blackPaint);
  });
  // Peeled side plates at the tear.
  for (let i = 0; i < 6; i++) {
    const side = (i % 2 === 0 ? -1 : 1) as -1 | 1;
    const y = 1.5 + rnd() * 6;
    const p = loftPoint(spec, 1 + rnd() * 4, y, side, new THREE.Vector3());
    const len = 3 + rnd() * 4;
    const g = new THREE.BoxGeometry(2.5 + rnd() * 2, 0.12, len, 3, 1, 6);
    g.translate(0, 0, -len / 2);
    curl(g, len, -side * (0.5 + rnd() * 1.1));
    jitter(g, 0.12, 1.1, seed ^ (i * 29));
    g.applyMatrix4(trs(p.x, p.y, p.z, Math.PI / 2 - 0.2 + rnd() * 0.4, side * (0.3 + rnd() * 0.6), 0));
    hull.add(g, C.blackPaint);
  }
  for (let i = 0; i < 7; i++) {
    const from = v3((rnd() - 0.5) * W * 0.6, top(3) * (0.5 + rnd() * 0.4), zOf(1 + rnd() * 3));
    catenary(hull, from, from.clone().add(v3((rnd() - 0.5) * 3, -2 - rnd() * 3, -1.5 - rnd() * 2.5)), 0.7, 0.1, C.rustDark);
  }

  // ---- pancaked superstructure: layered, splayed slabs with dark gaps between
  for (let i = 0; i < 9; i++) {
    const s0 = T.cavity + rnd() * (T.superEnd - T.cavity - 12);
    const len = 6 + rnd() * 10;
    const w = W * (0.35 + rnd() * 0.4);
    const x = (rnd() - 0.5) * (W - w) * 0.8;
    const y = top(s0 + len / 2) + 0.15 + rnd() * 0.7;
    const g = new THREE.BoxGeometry(w, 0.35, len, 4, 1, 5);
    jitter(g, v3(0.25, 0.35, 0.25), 0.5, seed ^ (i * 41));
    g.applyMatrix4(trs(x, y, zOf(s0 + len / 2), (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.1));
    hull.add(g, rnd() < 0.6 ? white : C.rust);
    dark.add(new THREE.BoxGeometry(w * 0.92, 0.12, len * 0.92).translate(x, y - 0.26, zOf(s0 + len / 2)), 0);
  }
  // The No. 4 funnel's base (a dummy uptake that vented the galleys), a torn ring.
  const f4 = 22;
  const ring = new THREE.CylinderGeometry(1, 1, 1.2, 20, 2, true).scale(3.7, 1, 2.9);
  ring.translate(0, top(f4) + 0.6, zOf(f4));
  hull.add(jitter(ring, v3(0.2, 0.5, 0.2), 0.9, seed ^ 0x4f), C.rustDark);
  dark.add(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2).scale(3.5, 1, 2.7).translate(0, top(f4) + 0.1, zOf(f4)), 0);
  for (const [s, x] of [
    [32, -8],
    [40, 7],
    [51, -3],
  ] as const) {
    cowlVent(hull, x, top(s), zOf(s), 0.45, 1.3, rnd() * 6, fit);
  }

  // ---- aft well deck: collapsed hatch, two cranes (one down)
  const wS = (T.superEnd + T.wellEnd) / 2;
  hull.add(ringBox(5, 0.8, 5, 0.35).translate(0, top(wS) + 0.4, zOf(wS)), fit);
  dark.add(new THREE.BoxGeometry(4.3, 0.2, 4.3).translate(0, top(wS) + 0.15, zOf(wS)), 0);
  const craneA = v3(-5, top(T.wellEnd - 2), zOf(T.wellEnd - 2));
  hull.add(new THREE.BoxGeometry(1.4, 2.2, 1.4).translate(craneA.x, craneA.y + 1.1, craneA.z), fit);
  hull.add(strut(craneA.clone().add(v3(0, 2.3, 0)), craneA.clone().add(v3(-2.5, 5.2, -5.2)), 0.42, 0.34), fit);
  const craneB = v3(5, top(T.wellEnd - 2), zOf(T.wellEnd - 2));
  const fallen = new THREE.BoxGeometry(1.4, 2.2, 1.4);
  fallen.applyMatrix4(trs(craneB.x + 0.8, craneB.y + 0.6, craneB.z, 0, 0, -1.2));
  hull.add(fallen, fit);
  hull.add(strut(craneB.clone().add(v3(1.6, 0.8, 0)), craneB.clone().add(v3(4, -1.2, -6)), 0.42, 0.34), fit);

  // ---- poop deck: peeled back and folded forward over itself
  // A tight hinge where it bent, then the torn-off deck lying doubled on top,
  // reaching forward.
  const foldW = W * 0.62;
  const hingeR = 0.9;
  const hinge = new THREE.BoxGeometry(foldW, 0.3, Math.PI * hingeR, 5, 1, 8);
  hinge.translate(0, 0, (Math.PI * hingeR) / 2);
  curl(hinge, Math.PI * hingeR, Math.PI);
  const flap = new THREE.BoxGeometry(foldW, 0.3, 11, 5, 1, 8);
  flap.translate(0, 2 * hingeR, -5.5);
  jitter(flap, v3(0.25, 0.3, 0.25), 0.5, seed ^ 0x7c);
  const foldS = T.wellEnd + 13;
  const foldM = trs(1.2, top(foldS) + 0.15, zOf(foldS), 0, 0.12);
  hull.add(hinge, C.teak, foldM);
  hull.add(flap, C.teak, foldM);
  dark.add(new THREE.BoxGeometry(W * 0.5, 0.1, 10).translate(1.2, top(foldS - 5) + 0.05, zOf(foldS - 5)), 0);
  // The docking bridge, fallen across the poop deck.
  const db = new THREE.BoxGeometry(W * 0.8, 0.35, 1.8, 6, 1, 1);
  jitter(db, v3(0.1, 0.3, 0.1), 0.4, seed ^ 0x3d);
  db.applyMatrix4(trs(-1, top(L - 20) + 0.6, zOf(L - 20), 0.2, 0.35, 0.12));
  hull.add(db, white);
  for (const x of [-W * 0.28, W * 0.3]) {
    hull.add(beam(v3(x, top(L - 20), zOf(L - 21)), v3(x * 0.8, top(L - 20) + 1.4, zOf(L - 20.3)), 0.12, 0.1, 5), fit);
  }
  // Poop-deck cranes, the steering-gear house and bollards.
  for (const [s, x, yaw] of [
    [T.wellEnd + 4, -4.5, 2.1],
    [T.wellEnd + 4, 4.5, -2.5],
  ] as const) {
    const y0 = top(s);
    hull.add(new THREE.BoxGeometry(1.3, 2, 1.3).translate(x, y0 + 1, zOf(s)), fit);
    const root = v3(x, y0 + 2.1, zOf(s));
    hull.add(strut(root, root.clone().add(v3(Math.sin(yaw) * 5.5, 2.4, Math.cos(yaw) * 5.5)), 0.4, 0.32), fit);
  }
  const sg = L - 9;
  hull.add(new THREE.BoxGeometry(6, 2.1, 4.5).translate(0, top(sg) + 1.05, zOf(sg)), white);
  for (const side of [-1, 1] as const) {
    for (const s of [T.wellEnd + 9, L - 13, L - 5]) {
      const p = loftPoint(spec, s, top(s), side, new THREE.Vector3());
      bollards(hull, p.x - side * 1.2, top(s), p.z, 0, fit);
    }
  }
  // Top of the rudder under the counter.
  const rS = L - 5.2;
  const rudder = new THREE.BoxGeometry(0.7, 3, 4.5);
  rudder.translate(0, 1.2, zOf(rS) + 1.6);
  hull.add(jitter(rudder, 0.08, 1, seed ^ 0x2b), C.rustDark);
  hull.add(beam(v3(0, 1, zOf(rS)), v3(0, 4, zOf(rS)), 0.4, 0.4, 8), C.rustDark);

  // ---- merge + paint
  const hullGeom = hull.merge()!;
  const shadeAt = (_x: number, y: number, z: number): number => {
    const s = z + L / 2;
    // Dark inside the tear, a little brighter where lights will catch the rim.
    return THREE.MathUtils.lerp(0.5, 1, S(s, 2, T.cavity + 2)) * (y < 0.8 ? 0.9 : 1);
  };
  paintWreck(hullGeom, { seed, rustiness: 0.82, growth: 0.3, silt: 0.6, mudBand: 1.8, shadeAt });
  projectUVs(hullGeom, 8);
  const hullMesh = meshOf(hullGeom, steelMaterial(detail), 'titanic-stern-hull')!;
  const voidMesh = meshOf(dark.merge(), voidMaterial(), 'titanic-stern-void')!;

  // ---- near detail
  const near: THREE.Object3D[] = [];
  const portholes = new InstanceList();
  const under: THREE.Vector3[] = [];
  for (const side of [-1, 1] as const) {
    under.push(
      ...openingRow(portholes, spec, side, 16, L - 14, () => 3.2, 2.4, 0.46, 0.46, rnd, 0.35),
      ...openingRow(portholes, spec, side, 16, T.superEnd, () => 5.6, 2.3, 0.46, 0.46, rnd, 0.3),
    );
  }
  if (detail.openings) {
    const ph = makeInstanced(portholeGeometry(), fittingMaterial(), portholes, 'titanic-stern-portholes');
    if (ph) near.push(ph);
  }
  if (detail.railings) {
    const rails = new InstanceList();
    const outward = (p: THREE.Vector3): THREE.Vector3 => {
      const s = p.z + L / 2;
      // Round the counter: rails there lean aft as well as outboard.
      const aft = S(s, L - T.counter, L);
      return v3(Math.sign(p.x) || 1, 0, aft * 1.2).normalize();
    };
    const port = edgePath(spec, T.wellEnd + 1, L - 0.6, 1.4, top, -1, 0.3);
    const star = edgePath(spec, T.wellEnd + 1, L - 0.6, 1.4, top, 1, 0.3);
    railing(rails, [...port, ...star.reverse()], rnd, { outward, bend: 0.9, missing: 0.22 });
    for (const side of [-1, 1] as const) {
      railing(rails, edgePath(spec, T.superEnd, T.wellEnd, 2, top, side, 0.25), rnd, {
        outward,
        bend: 1,
        missing: 0.3,
      });
    }
    const rm = makeInstanced(barGeometry(), fittingMaterial(), rails, 'titanic-stern-railings');
    if (rm) near.push(rm);
  }
  const rust = new InstanceList();
  for (const side of [-1, 1] as const) {
    const o = v3(side, 0, 0);
    rusticlesAlong(rust, edgePath(spec, 2, L - 1, 1, top, side, -0.05), 1.2, 0.3, 1.7, rnd, o);
    rusticlesAlong(rust, edgePath(spec, 16, L - 6, 1.5, () => 6.5, side, -0.1), 0.35, 0.2, 1, rnd, o);
  }
  for (const p of under) if (rnd() < 0.4) hangRusticle(rust, p.clone().add(v3(0, -0.28, 0)), 0.25 + rnd() * 0.6, rnd);
  for (let i = 0; i < 180; i++) {
    // Curtains at the tear and under the pancaked slabs.
    const s = rnd() < 0.55 ? rnd() * 9 : T.cavity + rnd() * (T.superEnd - T.cavity);
    const side = (rnd() < 0.5 ? -1 : 1) as -1 | 1;
    const p = loftPoint(spec, s, top(s) * (0.4 + rnd() * 0.6), side, new THREE.Vector3());
    p.x *= s < 9 ? rnd() : 1.02;
    hangRusticle(rust, p, 0.3 + rnd() * 1.5, rnd);
  }
  rust.thin(detail.growth);
  const rm = makeInstanced(rusticleGeometry(), growthMaterial(), rust, 'titanic-stern-rusticles');
  if (rm) near.push(rm);

  // ---- far silhouette
  const coarse: LoftSpec = {
    ...spec,
    stations: makeStations(L, 10, 5, [[L - T.counter, L]], [T.superEnd, T.wellEnd]),
    levels: 2,
  };
  const sil = new PartBin();
  sil.add(loftSides(coarse), 0xffffff);
  sil.add(loftCap(coarse, 0, -1), 0xffffff);
  sil.add(deckStrip(coarse, 0, L, (s) => top(s) - 0.03, 0, 1), 0xffffff);
  const far = new THREE.Mesh(sil.merge()!, silhouetteMaterial(0x40221a));

  // ---- colliders
  const colliders = [
    new THREE.Box3(v3(-hB * 0.92, -2.5, zOf(T.cavity)), v3(hB * 0.92, top(30) + 0.8, zOf(T.superEnd))),
    new THREE.Box3(v3(-hB * 0.9, -2.5, zOf(T.superEnd)), v3(hB * 0.9, (T.wellY * H) / 10 + 0.8, zOf(T.wellEnd))),
    new THREE.Box3(v3(-hB * 0.9, -2.5, zOf(T.wellEnd)), v3(hB * 0.9, (T.poopY * H) / 10 + 1.5, zOf(L - 8))),
    new THREE.Box3(v3(-hB * 0.5, -2.5, zOf(L - 8)), v3(hB * 0.5, (T.poopY * H) / 10 + 0.5, L / 2)),
    // Cavity: the two side walls and the engines, so the sub can nose in.
    new THREE.Box3(v3(-hB, -2.5, zOf(0)), v3(-hB + 2, top(8) + 0.5, zOf(T.cavity))),
    new THREE.Box3(v3(hB - 2, -2.5, zOf(0)), v3(hB, top(8) + 0.5, zOf(T.cavity))),
    new THREE.Box3(v3(-W * 0.3, -2.5, zOf(1.5)), v3(W * 0.3, floorY + 6, zOf(T.cavity))),
  ];

  const parts: WreckParts = { core: [hullMesh, voidMesh], near, far, colliders, anchors: [cavityOpen] };
  return assembleWreck('titanic-stern', parts, detail);
}
