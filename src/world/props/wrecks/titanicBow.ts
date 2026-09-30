/**
 * RMS Titanic, bow section (2010 WHOI / RMS Titanic Inc. mapping; 2022
 * Magellan / Atlantic Productions photogrammetry; Ballard 1987).
 *
 * 143 m long, upright, heading north, the prow dug ~18 m into the mud so the
 * anchors sit just above it. From the stem aft: the forecastle with its anchor
 * crane, capstans, chain runs, bollards and No. 1 hatch; the forward well deck
 * with its cranes and the open No. 2 hatch (its cover was blown off); the
 * foremast, fallen back across the well deck onto the port side of the bridge;
 * the flattened bridge with only the telemotor stand left where the wheelhouse
 * was; the officers' quarters with their roof pushed in; the No. 1 funnel
 * opening; the Grand Staircase well as a dark void (anchor `interior-entry`);
 * the open expansion joint; the gymnasium on the starboard side; No. 2 funnel
 * opening; and the torn aft end where the hull broke, decks sagging and plates
 * peeled outward. Portholes in rows, promenade windows on A deck, bent
 * railings, davits, and rusticles hanging from every edge.
 *
 * Proportions follow the ship's plans (beam 28.2 m, deck-to-deck ~2.7 m) with
 * the visible height set by the mud line. Local frame: s = distance from the
 * stem, z = s - L/2 (-Z forward), +X starboard, y = 0 at the mud line.
 */

import * as THREE from 'three';
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
  windowGeometry,
  facingMatrix,
} from './instances.js';
import {
  PartBin,
  beam,
  curl,
  deckStrip,
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
import {
  bollards,
  capstan,
  cowlVent,
  deckHouse,
  edgePath,
  hullFrame,
  openingRow,
  rusticlesAlong,
  stocklessAnchor,
  welinDavit,
} from './ship.js';
import { mulberry32, valueNoise3 } from './shared.js';

/** Stations along the bow section (m from the stem). */
export const TITANIC_BOW = {
  forecastleEnd: 39,
  wellEnd: 58,
  bridge: 60.5,
  officersEnd: 85,
  funnel1: 89,
  staircase: [93.5, 102] as const,
  expansionJoint: 104.2,
  gym: [106, 116.5] as const,
  funnel2: 114,
  tornStart: 124,
  forecastleY: 11,
  wellY: 8.3,
  boatDeckY: 13.7,
  pitchM: 1.6,
} as const;

/** Build the Titanic bow; dims = [length, beam, height] from props.json. */
export function buildTitanicBow(
  dims: readonly [number, number, number],
  seed: number,
  detail: WreckDetail,
): WreckBuilt {
  const T = TITANIC_BOW;
  const L = dims[0];
  const B = dims[1];
  const rnd = mulberry32(seed);
  const halfB = B / 2;
  const pitch = (s: number): number => (T.pitchM * s) / L;
  const sheer = (s: number): number => 0.9 * Math.pow(Math.max(0, 1 - s / 42), 2);
  const tornT = (s: number): number => THREE.MathUtils.clamp((s - T.tornStart) / (L - T.tornStart), 0, 1);

  const top = (s: number): number => {
    if (s < T.forecastleEnd) return T.forecastleY + sheer(s) + pitch(s);
    if (s < T.wellEnd) return T.forecastleY + pitch(s);
    return T.boatDeckY + pitch(s);
  };
  const half = (s: number, y: number): number => {
    const yh = THREE.MathUtils.clamp(y / 11, 0, 1);
    const entry = 48 + 14 * (1 - yh); // fine below, full (flared) at deck level
    const u = THREE.MathUtils.clamp(s / entry, 0, 1);
    return halfB * (1 - Math.pow(1 - u, 2.3));
  };
  // The torn end: upper decks sag, plating splays, the break is ragged.
  const deform = (p: THREE.Vector3, s: number, y: number, side: -1 | 1): void => {
    const t = tornT(s);
    if (t <= 0) return;
    const n = valueNoise3(s * 0.12, y * 0.18, side * 3.3, seed);
    const n2 = valueNoise3(s * 0.3, y * 0.4, side * 1.7, seed ^ 0x2d);
    p.y -= Math.pow(t, 1.6) * Math.max(0, y - 3) * 0.3 * (0.5 + n);
    p.x *= 1 + 0.14 * Math.pow(t, 1.4) * THREE.MathUtils.clamp((y - 2) / 10, 0, 1) * (0.4 + n2);
    const jag = 9 * THREE.MathUtils.smoothstep(t, 0.55, 1) * valueNoise3(y * 0.35, side * 2.1, 4.4, seed ^ 0x61);
    p.z -= jag;
    p.x += (n2 - 0.5) * 0.9 * t;
  };

  const d = detail.meshDensity;
  const spec: LoftSpec = {
    L,
    stations: makeStations(
      L,
      5 / d,
      1.4 / d,
      [
        [0, 22],
        [T.tornStart - 2, L],
      ],
      [T.forecastleEnd, T.wellEnd],
    ),
    yBottom: -2.5,
    levels: Math.max(6, Math.round(14 * d)),
    top,
    half,
    deform,
  };

  const hull = new PartBin();
  const dark = new PartBin();
  const fit = C.blackPaint;
  const white = C.whitePaint;

  // ---- hull body: sides, torn-end cap, decks
  hull.add(loftSides(spec), C.blackPaint);
  hull.add(loftCap(spec, L, 1), C.interior);
  const deckY = (s: number): number => top(s) - 0.02;
  hull.add(deckStrip(spec, 0, T.forecastleEnd, deckY, 0, 3), C.blackPaint);
  hull.add(deckStrip(spec, T.forecastleEnd, T.wellEnd, (s) => T.wellY + pitch(s), 0.3, 3), C.blackPaint);
  hull.add(
    deckStrip(spec, T.wellEnd, L, deckY, 0, 6, (p, s) => {
      const t = tornT(s);
      if (t > 0) p.y -= Math.pow(t, 1.6) * (p.y - 3) * 0.3 * (0.5 + valueNoise3(s * 0.12, p.x * 0.1, 1.1, seed));
    }),
    white,
  );
  // Forecastle break and superstructure front: cross walls down to the well deck.
  crossWall(hull, spec, T.forecastleEnd, T.wellY + pitch(T.forecastleEnd), top(T.forecastleEnd - 0.1), fit);
  crossWall(hull, spec, T.wellEnd, T.wellY + pitch(T.wellEnd), top(T.wellEnd + 0.1), white);

  // ---- forecastle fittings
  const fcY = (s: number): number => top(s);
  const zOf = (s: number): number => s - L / 2;
  const crane = v3(0, fcY(6.5), zOf(6.5));
  hull.add(beam(crane, v3(0, crane.y + 2.1, crane.z), 0.45, 0.35, 10), fit);
  hull.add(beam(v3(0, crane.y + 1.9, crane.z), v3(0.2, crane.y + 0.5, zOf(13.5)), 0.2, 0.14, 6), fit);
  dark.add(new THREE.BoxGeometry(1.3, 0.1, 2.2).translate(0, fcY(3) + 0.03, zOf(3)), 0);
  for (const x of [-2.8, 2.8]) capstan(hull, x, fcY(12), zOf(12), 0.62, fit);
  capstan(hull, 0, fcY(17.5), zOf(17.5), 0.62, fit);
  for (const x of [-6.5, 6.5]) capstan(hull, x, fcY(31), zOf(31), 0.5, fit);
  // Anchor chains from the hawse pipes aft to the capstans and down the chain pipes.
  for (const side of [-1, 1] as const) {
    const hx = side * half(3.2, 10) * 0.8;
    dark.add(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 10).translate(hx, fcY(3.2) + 0.02, zOf(3.2)), 0);
    const a = v3(hx, fcY(3.2) + 0.15, zOf(3.2));
    const b = v3(side * 2.8, fcY(12) + 0.2, zOf(12));
    const c = v3(side * 1.6, fcY(15.5) + 0.15, zOf(15.5));
    hull.add(beam(a, b, 0.17, 0.17, 5), C.rustDark);
    hull.add(beam(b, c, 0.17, 0.17, 5), C.rustDark);
    dark.add(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 8).translate(c.x, c.y - 0.1, c.z), 0);
    for (const s of [8, 20, 33]) {
      const p = loftPoint(spec, s, fcY(s), side, new THREE.Vector3());
      bollards(hull, p.x - side * 1.3, fcY(s), p.z, 0, fit);
    }
    cowlVent(hull, side * 5, fcY(34), zOf(34), 0.45, 1.6, side * 0.6 + Math.PI, fit);
  }
  // No. 1 hatch, cover still on.
  hull.add(new THREE.BoxGeometry(4.6, 0.8, 4.6).translate(0, fcY(27) + 0.4, zOf(27)), fit);
  hull.add(new THREE.BoxGeometry(4.2, 0.15, 4.2).translate(0, fcY(27) + 0.85, zOf(27)), fit);
  // Foremast stump and the fallen mast, lying aft across the well deck onto the bridge's port side.
  const mastBase = v3(0, fcY(37.6) + 0.9, zOf(37.6));
  hull.add(beam(v3(0, fcY(37.6), zOf(37.6)), mastBase, 0.55, 0.5, 10), fit);
  const mastTop = v3(-6.2, T.boatDeckY + pitch(66) + 1.4, zOf(66));
  hull.add(beam(mastBase, mastTop, 0.46, 0.24, 10), fit);
  // Its crosstree and a couple of stays still hanging off it.
  const along = mastTop.clone().sub(mastBase);
  const tree = mastBase.clone().addScaledVector(along, 0.78);
  hull.add(beam(tree.clone().add(v3(-2.2, 0.3, 0.4)), tree.clone().add(v3(2.2, -0.3, -0.4)), 0.12, 0.12, 5), fit);
  for (const [f, tx, ts] of [
    [0.55, -12.5, 44],
    [0.7, 11.5, 50],
    [0.9, -13, 57],
  ] as const) {
    const from = mastBase.clone().addScaledVector(along, f);
    const to = v3(tx, T.forecastleY + pitch(ts) + 0.2, zOf(ts));
    catenary(hull, from, to, 1.8, 0.05, fit);
  }

  // ---- well deck: No. 2 hatch open (cover blown off), four cargo cranes
  const wY = (s: number): number => T.wellY + pitch(s);
  hull.add(ringBox(4.8, 0.9, 5.4, 0.35).translate(0, wY(48) + 0.45, zOf(48)), fit);
  dark.add(new THREE.BoxGeometry(4.2, 0.2, 4.8).translate(0, wY(48) + 0.2, zOf(48)), 0);
  for (const [s, x, yaw] of [
    [41.5, -5, 2.4],
    [41.5, 5, -2.2],
    [55, -5, 0.9],
    [55, 5, -0.6],
  ] as const) {
    const y0 = wY(s);
    hull.add(new THREE.BoxGeometry(1.4, 2.4, 1.4).translate(x, y0 + 1.2, zOf(s)), fit);
    const root = v3(x, y0 + 2.6, zOf(s));
    const tip = root.clone().add(v3(Math.sin(yaw) * 6.5, 3.2, Math.cos(yaw) * 6.5));
    hull.add(strut(root, tip, 0.45, 0.35), fit);
    hull.add(new THREE.BoxGeometry(1.6, 1.0, 2.2).translate(x, y0 + 3, zOf(s)), fit);
  }

  // ---- boat deck: flattened bridge, telemotor, officers' quarters, funnels,
  // Grand Staircase, expansion joint, gymnasium
  const bY = (s: number): number => T.boatDeckY + pitch(s);
  // Bridge wings across the full width, with wreckage where the wheelhouse was.
  hull.add(new THREE.BoxGeometry(B * 0.98, 0.3, 2.2).translate(0, bY(T.bridge) + 0.15, zOf(T.bridge)), white);
  for (let i = 0; i < 7; i++) {
    const x = (rnd() - 0.5) * 12;
    const w = 1 + rnd() * 3;
    const g = new THREE.BoxGeometry(w, 0.4 + rnd() * 0.8, 0.25, 3, 1, 1);
    g.rotateY((rnd() - 0.5) * 0.6);
    g.rotateZ((rnd() - 0.5) * 0.3);
    g.translate(x, bY(T.bridge + 1.5) + 0.35, zOf(T.bridge + 1 + rnd() * 2.5));
    hull.add(jitter(g, 0.12, 1.3, seed + i), white);
  }
  // The telemotor stand: all that is left of the wheelhouse.
  const tel = v3(0, bY(T.bridge + 1.6), zOf(T.bridge + 1.6));
  hull.add(new THREE.CylinderGeometry(0.2, 0.32, 1.05, 10).translate(tel.x, tel.y + 0.52, tel.z), C.brass);
  hull.add(new THREE.BoxGeometry(0.55, 0.45, 0.45).translate(tel.x, tel.y + 1.25, tel.z), C.brass);
  hull.add(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 12).rotateX(Math.PI / 2).translate(tel.x, tel.y + 1.25, tel.z - 0.28), C.brass);
  // Officers' quarters, roof pushed in.
  deckHouse(hull, 0, bY(63), zOf((63 + T.officersEnd) / 2), 17, 2.7, T.officersEnd - 63, white, 0.9);
  // Funnel openings: a torn casing stub around a dark hole.
  for (const s of [T.funnel1, T.funnel2]) {
    const y0 = bY(s);
    const casing = new THREE.CylinderGeometry(1, 1, 1.4, 20, 2, true);
    casing.scale(3.7, 1, 2.9);
    casing.translate(0, y0 + 0.7, zOf(s));
    hull.add(jitter(casing, v3(0.15, 0.45, 0.15), 0.9, seed ^ Math.round(s)), C.rustDark);
    dark.add(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2).scale(3.5, 1, 2.7).translate(0, y0 + 0.08, zOf(s)), 0);
  }
  // Grand Staircase well: a black chasm framed by the remains of the dome's coaming.
  const [g0, g1] = T.staircase;
  const gs = (g0 + g1) / 2;
  const gW = 9;
  dark.add(new THREE.BoxGeometry(gW, 0.12, g1 - g0).translate(0, bY(gs) + 0.05, zOf(gs)), 0);
  hull.add(ringBox(gW + 0.8, 1.1, g1 - g0 + 0.8, 0.4).translate(0, bY(gs) + 0.55, zOf(gs)), white);
  for (let i = 0; i < 5; i++) {
    // Broken dome ribs sticking up from the coaming.
    const x = (i / 4 - 0.5) * gW * 0.9;
    const a = v3(x, bY(gs) + 1.1, zOf(g0 + 0.2));
    hull.add(beam(a, a.clone().add(v3(0, 1 + rnd() * 1.4, 1 + rnd() * 1.5)), 0.07, 0.05, 4), fit);
  }
  const entry = new THREE.Object3D();
  entry.name = 'interior-entry';
  entry.position.set(0, bY(gs), zOf(gs));
  entry.userData = { kind: 'interior-entry', wreck: 'titanic-bow', note: 'Grand Staircase well' };
  // Expansion joint: an open dark gap across the deck and down both sides.
  const ej = T.expansionJoint;
  dark.add(new THREE.BoxGeometry(B * 0.96, 0.1, 0.7).translate(0, bY(ej) + 0.03, zOf(ej)), 0);
  for (const side of [-1, 1] as const) {
    const { p, n } = hullFrame(spec, ej, 11.5, side);
    dark.add(new THREE.BoxGeometry(0.1, 5.5, 0.5).translate(p.x + n.x * 0.05, p.y, p.z), 0);
  }
  // Gymnasium, starboard side, walls pushed inward, big windows (added below).
  const [y0g, y1g] = T.gym;
  const gymG = new THREE.BoxGeometry(8.5, 3.1, y1g - y0g, 4, 2, 6);
  gymG.translate(8.2, bY(y0g) + 1.55, zOf((y0g + y1g) / 2));
  hull.add(jitter(gymG, v3(0.35, 0.2, 0.2), 0.35, seed ^ 0x6e), white);
  // Aft deck houses and vents short of the break.
  deckHouse(hull, -7, bY(106), zOf(111), 7, 2.6, 9, white, 0.5);
  deckHouse(hull, 0, bY(118), zOf(121), 10, 2.4, 6, white, 0.7);
  for (const [s, x] of [
    [67, -9.5],
    [67, 9.5],
    [100, -9],
    [108, 3.5],
    [120, -9.5],
  ] as const) {
    cowlVent(hull, x, bY(s), zOf(s), 0.4, 1.4, rnd() * 6, fit);
  }
  // Lifeboat davits along the boat-deck edge (the boats themselves are long gone).
  for (const side of [-1, 1] as const) {
    for (const s of [64, 71, 78, 85, 119]) {
      const p = loftPoint(spec, s, bY(s), side, new THREE.Vector3());
      welinDavit(hull, p.x - side * 0.8, bY(s), p.z, side, rnd() * 0.6, fit);
    }
  }

  // ---- anchors (port visible above the mud; starboard in its pocket)
  for (const side of [-1, 1] as const) {
    const { p, n } = hullFrame(spec, 5, 2.4, side);
    p.addScaledVector(n, 0.25);
    stocklessAnchor(hull, p, n, 1.25, C.rustDark);
    const hawse = hullFrame(spec, 4.2, 6.2, side);
    dark.add(
      new THREE.CircleGeometry(0.5, 12).applyMatrix4(facingMatrix(hawse.p.addScaledVector(hawse.n, 0.05), hawse.n, 1, 1)),
      0,
    );
  }

  // ---- the torn end: deck slabs sagging out of the break, plates peeled outward
  const tornDecks = [4.2, 6.9, 9.6, 12.3];
  for (const [i, y] of tornDecks.entries()) {
    const w = B * (0.35 + rnd() * 0.45);
    const len = 3 + rnd() * 5;
    const g = new THREE.BoxGeometry(w, 0.3, len, 4, 1, 6);
    g.translate(0, 0, len / 2);
    curl(g, len, -(0.3 + rnd() * 0.8));
    jitter(g, 0.25, 0.7, seed + i * 7);
    const s = L - 7 - rnd() * 4;
    g.applyMatrix4(trs((rnd() - 0.5) * (B - w) * 0.6, y + pitch(s) - tornT(s) * y * 0.15, zOf(s), 0, (rnd() - 0.5) * 0.4));
    hull.add(g, i === tornDecks.length - 1 ? white : C.blackPaint);
  }
  for (let i = 0; i < 8; i++) {
    const side = (i % 2 === 0 ? -1 : 1) as -1 | 1;
    const s = L - 4 - rnd() * 12;
    const y = 3 + rnd() * 9;
    const { p } = hullFrame(spec, s, y, side);
    const len = 3 + rnd() * 5;
    const g = new THREE.BoxGeometry(2 + rnd() * 3, 0.12, len, 3, 1, 6);
    g.translate(0, 0, len / 2);
    curl(g, len, side * (0.5 + rnd() * 1.2));
    jitter(g, 0.12, 1.1, seed ^ (i * 31));
    // Peel outward and aft from the side.
    g.applyMatrix4(trs(p.x, p.y, p.z, Math.PI / 2 - 0.2 + rnd() * 0.4, side * (0.4 + rnd() * 0.7), 0));
    hull.add(g, C.blackPaint);
  }
  // Boat-deck plating curling up at the break.
  for (let i = 0; i < 3; i++) {
    const len = 3 + rnd() * 3;
    const g = new THREE.BoxGeometry(3 + rnd() * 3, 0.1, len, 3, 1, 5);
    g.translate(0, 0, len / 2);
    curl(g, len, 0.6 + rnd() * 0.9);
    const s = L - 12 - rnd() * 6;
    g.applyMatrix4(trs((rnd() - 0.5) * 16, bY(s) - tornT(s) * 3.5, zOf(s), 0, (rnd() - 0.5) * 0.8));
    hull.add(g, white);
  }
  // Pipes and cables hanging out of the break.
  for (let i = 0; i < 6; i++) {
    const s = L - 3 - rnd() * 6;
    const from = v3((rnd() - 0.5) * B * 0.7, 5 + rnd() * 7, zOf(s));
    catenary(hull, from, from.clone().add(v3((rnd() - 0.5) * 3, -3 - rnd() * 4, 2 + rnd() * 3)), 0.8, 0.12, C.rustDark);
  }

  // ---- merge + paint
  const hullGeom = hull.merge()!;
  const endShade = (_x: number, _y: number, z: number): number => {
    const s = z + L / 2;
    return THREE.MathUtils.lerp(1, 0.45, THREE.MathUtils.smoothstep(s, L - 16, L - 2));
  };
  paintWreck(hullGeom, {
    seed,
    rustiness: 0.72,
    growth: 0.25,
    silt: 0.55,
    mudBand: 2.2,
    shadeAt: endShade,
  });
  projectUVs(hullGeom, 8);
  const hullMesh = meshOf(hullGeom, steelMaterial(detail), 'titanic-bow-hull')!;
  const voidMesh = meshOf(dark.merge(), voidMaterial(), 'titanic-bow-void')!;

  // ---- near detail: openings, railings, rusticles
  const near: THREE.Object3D[] = [];
  const rust = new InstanceList();
  const portholes = new InstanceList();
  const windows = new InstanceList();
  const under: THREE.Vector3[] = [];
  for (const side of [-1, 1] as const) {
    under.push(
      ...openingRow(portholes, spec, side, 7, T.tornStart - 2, (s) => 3.9 + pitch(s), 2.3, 0.46, 0.46, rnd, 0.3),
      ...openingRow(portholes, spec, side, 5, T.tornStart - 2, (s) => 6.4 + pitch(s), 2.1, 0.46, 0.46, rnd, 0.2),
      ...openingRow(portholes, spec, side, 3, T.forecastleEnd - 2, (s) => 8.9 + pitch(s), 2.4, 0.46, 0.46, rnd, 0.25),
      ...openingRow(windows, spec, side, T.wellEnd + 2, T.tornStart - 1, (s) => 9.9 + pitch(s), 2.4, 0.8, 0.95, rnd, 0.15),
    );
    // A-deck promenade: the long run of big openings under the boat deck.
    openingRow(windows, spec, side, T.wellEnd + 2, T.tornStart, (s) => 12.3 + pitch(s), 1.95, 1.35, 1.5, rnd, 0.08);
  }
  // Superstructure front, facing the well deck.
  for (const y of [9.9, 12.3]) {
    for (let x = -11; x <= 11; x += 2.2) {
      if (rnd() < 0.2) continue;
      const p = v3(x, y + pitch(T.wellEnd), zOf(T.wellEnd) - 0.06);
      windows.push(facingMatrix(p, v3(0, 0, -1), 0.9, 1.1));
    }
  }
  // Gymnasium windows (outboard and forward walls).
  for (let s = y0g + 1.2; s < y1g - 0.8; s += 2.1) {
    windows.push(facingMatrix(v3(12.5, bY(s) + 1.7, zOf(s)), v3(1, 0, 0), 1.5, 2.0));
  }
  if (detail.openings) {
    const ph = makeInstanced(portholeGeometry(), fittingMaterial(), portholes, 'titanic-bow-portholes');
    const wi = makeInstanced(windowGeometry(), fittingMaterial(), windows, 'titanic-bow-windows');
    if (ph) near.push(ph);
    if (wi) near.push(wi);
  }

  const rails = new InstanceList();
  const outward = (p: THREE.Vector3): THREE.Vector3 => v3(Math.sign(p.x) || 1, 0, 0);
  if (detail.railings) {
    // The bow railing: both forecastle edges meeting at the stem.
    const port = edgePath(spec, 0.6, T.forecastleEnd, 1.4, fcY, -1, 0.3);
    const star = edgePath(spec, 0.6, T.forecastleEnd, 1.4, fcY, 1, 0.3);
    railing(rails, [...port.reverse(), ...star], rnd, { outward, bend: 0.5, missing: 0.06 });
    // Forecastle break rail and superstructure-front rail.
    for (const [s, y] of [
      [T.forecastleEnd - 0.3, fcY(T.forecastleEnd - 0.3)],
      [T.wellEnd + 0.3, bY(T.wellEnd + 0.3)],
    ] as const) {
      const w = half(s, 10) - 0.4;
      railing(rails, [v3(-w, y, zOf(s)), v3(w, y, zOf(s))], rnd, { outward: () => v3(0, 0, -1), bend: 0.3 });
    }
    for (const side of [-1, 1] as const) {
      railing(rails, edgePath(spec, T.forecastleEnd, T.wellEnd, 2, (s) => top(s), side, 0.2), rnd, { outward, bend: 0.4 });
      railing(rails, edgePath(spec, T.wellEnd + 0.5, T.tornStart, 2, bY, side, 0.3), rnd, {
        outward,
        bend: 0.9,
        missing: 0.18,
      });
    }
    const rm = makeInstanced(barGeometry(), fittingMaterial(), rails, 'titanic-bow-railings');
    if (rm) near.push(rm);
  }

  // Rusticles: deck edges, the stem, under portholes, the torn end.
  for (const side of [-1, 1] as const) {
    const o = v3(side, 0, 0);
    rusticlesAlong(rust, edgePath(spec, 0.5, T.forecastleEnd, 1, fcY, side, -0.05), 1.3, 0.3, 1.8, rnd, o);
    rusticlesAlong(rust, edgePath(spec, T.forecastleEnd, T.wellEnd, 1, top, side, -0.05), 1.1, 0.3, 1.4, rnd, o);
    rusticlesAlong(rust, edgePath(spec, T.wellEnd, T.tornStart + 10, 1, bY, side, -0.05), 1.1, 0.3, 1.6, rnd, o);
    rusticlesAlong(rust, edgePath(spec, T.wellEnd, T.tornStart, 1, (s) => 11 + pitch(s), side, -0.08), 0.5, 0.2, 0.9, rnd, o);
  }
  for (let y = 1; y < T.forecastleY; y += 0.6) hangRusticle(rust, v3(0, y, -L / 2 - 0.05), 0.3 + rnd() * 0.9, rnd);
  for (const p of under) if (rnd() < 0.45) hangRusticle(rust, p.clone().add(v3(0, -0.28, 0)), 0.25 + rnd() * 0.7, rnd);
  for (let i = 0; i < 160; i++) {
    const s = L - rnd() * 12;
    const y = 2 + rnd() * 11;
    const side = (rnd() < 0.5 ? -1 : 1) as -1 | 1;
    const p = loftPoint(spec, s, y, side, new THREE.Vector3());
    p.x *= rnd();
    hangRusticle(rust, p, 0.3 + rnd() * 1.5, rnd);
  }
  for (let i = 0; i < 60; i++) {
    // Along the well-deck crane jibs and the fallen mast.
    const p = mastBase.clone().lerp(mastTop, rnd()).add(v3(0, -0.4, 0));
    hangRusticle(rust, p, 0.3 + rnd() * 1.1, rnd);
  }
  rust.thin(detail.growth);
  if (detail.growth > 1) {
    // Ultra: a second pass of short ones along the boat-deck edges.
    for (const side of [-1, 1] as const) {
      rusticlesAlong(rust, edgePath(spec, T.wellEnd, T.tornStart, 1, bY, side, -0.05), detail.growth - 1, 0.2, 0.6, rnd, v3(side, 0, 0));
    }
  }
  const rm = makeInstanced(rusticleGeometry(), growthMaterial(), rust, 'titanic-bow-rusticles');
  if (rm) near.push(rm);

  // ---- far silhouette: coarse loft + the superstructure block
  const coarse: LoftSpec = { ...spec, stations: makeStations(L, 12, 6, [[0, 30]], [T.forecastleEnd, T.wellEnd]), levels: 2, deform };
  const sil = new PartBin();
  sil.add(loftSides(coarse), 0xffffff);
  sil.add(loftCap(coarse, L, 1), 0xffffff);
  sil.add(deckStrip(coarse, 0, L, (s) => top(s) - 0.02, 0, 1), 0xffffff);
  sil.add(new THREE.BoxGeometry(17, 2.7, 60).translate(0, bY(90) + 1.35, zOf(92)), 0xffffff);
  const far = new THREE.Mesh(sil.merge()!, silhouetteMaterial(0x4a2618));

  // ---- colliders (local): the fine bow, the full-beam body, the deck houses
  const colliders = [
    new THREE.Box3(v3(-halfB * 0.45, -2.5, -L / 2), v3(halfB * 0.45, T.forecastleY + 1, zOf(18))),
    new THREE.Box3(v3(-halfB * 0.85, -2.5, zOf(18)), v3(halfB * 0.85, T.forecastleY + 0.6, zOf(T.forecastleEnd))),
    new THREE.Box3(v3(-halfB, -2.5, zOf(T.forecastleEnd)), v3(halfB, T.wellY + 0.5, zOf(T.wellEnd))),
    new THREE.Box3(v3(-halfB, -2.5, zOf(T.wellEnd)), v3(halfB, T.boatDeckY + T.pitchM, L / 2 - 4)),
    new THREE.Box3(v3(-9, T.boatDeckY, zOf(62)), v3(12.6, T.boatDeckY + T.pitchM + 2.6, zOf(122))),
  ];

  const parts: WreckParts = {
    core: [hullMesh, voidMesh],
    near,
    far,
    colliders,
    anchors: [entry],
  };
  return assembleWreck('titanic-bow', parts, detail);
}

/** A wall across the hull at station s from y0 to y1 (forecastle break, superstructure front). */
function crossWall(bin: PartBin, spec: LoftSpec, s: number, y0: number, y1: number, color: number): void {
  const w0 = spec.half(s, y0) * 2;
  const w1 = spec.half(s, y1) * 2;
  const g = new THREE.BoxGeometry(1, 1, 0.35, 6, 3, 1);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getY(i) + 0.5;
    const w = THREE.MathUtils.lerp(w0, w1, u);
    pos.setXYZ(i, pos.getX(i) * w, y0 + (y1 - y0) * u, pos.getZ(i) + s - spec.L / 2);
  }
  g.computeVertexNormals();
  bin.add(g, color);
}

/** A hatch coaming: four walls of a w x l box, `t` thick, `h` tall, centred at the origin. */
export function ringBox(w: number, h: number, l: number, t: number): THREE.BufferGeometry {
  const parts = [
    new THREE.BoxGeometry(w, h, t).translate(0, 0, -l / 2 + t / 2),
    new THREE.BoxGeometry(w, h, t).translate(0, 0, l / 2 - t / 2),
    new THREE.BoxGeometry(t, h, l - 2 * t).translate(-w / 2 + t / 2, 0, 0),
    new THREE.BoxGeometry(t, h, l - 2 * t).translate(w / 2 - t / 2, 0, 0),
  ].map((g) => g.toNonIndexed());
  const pos: number[] = [];
  const nrm: number[] = [];
  for (const g of parts) {
    pos.push(...(g.getAttribute('position').array as Float32Array));
    nrm.push(...(g.getAttribute('normal').array as Float32Array));
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return out;
}

/** A sagging wire or cable from a to b as a few straight segments. */
export function catenary(
  bin: PartBin,
  a: THREE.Vector3,
  b: THREE.Vector3,
  sag: number,
  r: number,
  color: number,
  segments = 6,
): void {
  let prev = a.clone();
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t);
    bin.add(beam(prev, p, r, r, 4), color);
    prev = p;
  }
}
