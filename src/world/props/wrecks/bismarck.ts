/**
 * Battleship Bismarck (Ballard 1989 survey; 2002 Cameron / Deep Sea
 * Detectives dives; 2019 Magellan survey; kbismarck.com wreck summary).
 *
 * The hull rests upright on the flank of a seamount, sunk in the sediment of
 * the landslide it set off, heading as in props.json. Her stern broke away
 * just aft of turret Dora and has never been found, so the aft end here is
 * torn open (anchor `interior-entry`). All four 38 cm turrets (Anton, Bruno,
 * Caesar, Dora) fell out of their barbettes when she capsized on the way
 * down; the barbettes are empty rings over dark holes (anchors
 * `barbette-anton` ... `barbette-dora`), and the turrets lie up-slope
 * (`bismarck-turrets` kit). The funnel, masts, foretop and most light fittings
 * are gone; the armoured conning tower and the battered forward superstructure
 * remain, with several 15 cm secondary turrets still in place. Teak decking,
 * grey paint under rust.
 *
 * Local frame: s = distance from the stem (-Z forward), +X starboard, y = 0 at
 * the mud line (the hull is sunk to roughly her waterline).
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
  normalise,
  projectUVs,
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
  woodMaterial,
} from './materials.js';
import { bollards, edgePath, hullFrame, openingRow, rusticlesAlong, stocklessAnchor } from './ship.js';
import { mulberry32, valueNoise3 } from './shared.js';

/** Stations along the hull (m from the stem), from the ship's general arrangement. */
export const BISMARCK = {
  /** Where the hull ends: the stern broke away aft of turret Dora. */
  tornAt: 236,
  barbettes: [
    { name: 'anton', s: 62, raised: 0 },
    { name: 'bruno', s: 80, raised: 2.4 },
    { name: 'caesar', s: 181, raised: 2.4 },
    { name: 'dora', s: 199, raised: 0 },
  ],
  barbetteR: 6.2,
  superstructure: [90, 172] as const,
  conningTower: 96,
  funnel: 128,
  /** Main deck at the stem, amidships and aft (m above the mud line). */
  deckBow: 13.5,
  deckMid: 8.6,
  deckAft: 8.2,
} as const;

/** Build Bismarck; dims = [overall length, beam, height at the bow]. */
export function buildBismarck(
  dims: readonly [number, number, number],
  seed: number,
  detail: WreckDetail,
): WreckBuilt {
  const K = BISMARCK;
  const L = dims[0];
  const B = dims[1];
  const hScale = dims[2] / 15;
  const rnd = mulberry32(seed);
  const halfB = B / 2;
  const S = THREE.MathUtils.smoothstep;
  const zOf = (s: number): number => s - L / 2;
  const endS = Math.min(K.tornAt, L - 1);

  // Sheer: the high "Atlantic bow", level amidships.
  const top = (s: number): number =>
    hScale *
    (K.deckMid + (K.deckBow - K.deckMid) * Math.pow(1 - S(s, 0, 70), 1.6) - (K.deckMid - K.deckAft) * S(s, 150, 230));
  const half = (s: number, y: number): number => {
    const yh = THREE.MathUtils.clamp(y / 10, 0, 1);
    // Fine entry, flared above; flat-sided amidships; slowly narrowing aft.
    const entry = 70 + 20 * (1 - yh);
    const u = THREE.MathUtils.clamp(s / entry, 0, 1);
    const fwd = 1 - Math.pow(1 - u, 2.1);
    const aft = 1 - 0.28 * Math.pow(S(s, 175, L), 1.4);
    return halfB * fwd * aft;
  };
  const tornT = (s: number): number => THREE.MathUtils.clamp((s - (endS - 14)) / 14, 0, 1);
  const deform = (p: THREE.Vector3, s: number, y: number, side: -1 | 1): void => {
    const t = tornT(s);
    if (t <= 0) return;
    const n = valueNoise3(s * 0.2, y * 0.3, side * 2.2, seed ^ 0x51);
    p.x *= 1 + 0.08 * t * (0.3 + n);
    p.y -= Math.pow(t, 2) * Math.max(0, y - 2) * 0.2 * n;
    p.z -= 7 * S(t, 0.5, 1) * valueNoise3(y * 0.4, side * 1.3, 3.3, seed ^ 0x2a);
  };

  const d = detail.meshDensity;
  const spec: LoftSpec = {
    L,
    stations: makeStations(
      endS,
      6 / d,
      1.8 / d,
      [
        [0, 30],
        [endS - 16, endS],
      ],
    ),
    yBottom: -2.5,
    levels: Math.max(5, Math.round(11 * d)),
    top,
    half,
    deform,
  };

  const hull = new PartBin();
  const deck = new PartBin();
  const dark = new PartBin();
  const grey = C.greyPaint;

  // ---- hull, teak deck, torn aft end
  hull.add(loftSides(spec), grey);
  hull.add(loftCap(spec, endS, 1), C.interior);
  deck.add(deckStrip(spec, 0, endS, (s) => top(s) - 0.03, 0.15, 6), C.teak);
  // Armour belt: a slight step down each side (the belt's top edge).
  for (const side of [-1, 1] as const) {
    const pts = edgePath(spec, 55, 205, 6, () => 3.2 * hScale, side, -0.18);
    for (let i = 0; i < pts.length - 1; i++) {
      hull.add(beam(pts[i]!, pts[i + 1]!, 0.22, 0.22, 4), grey);
    }
  }

  // ---- anchors: two bower anchors in the bow's hawse pockets (port, starboard)
  for (const side of [-1, 1] as const) {
    const { p, n } = hullFrame(spec, 12, 6.5 * hScale, side);
    p.addScaledVector(n, 0.3);
    stocklessAnchor(hull, p, n, 1.7, C.rustDark);
    const chain = loftPoint(spec, 16, top(16), side, new THREE.Vector3());
    chain.x *= 0.7;
    dark.add(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 10).translate(chain.x, top(16) + 0.03, chain.z), 0);
    hull.add(beam(chain.clone().setY(top(16) + 0.2), v3(side * 2.2, top(30) + 0.2, zOf(30)), 0.2, 0.2, 5), C.rustDark);
  }
  // Breakwater forward of Anton, capstans and bollards.
  const bw = K.barbettes[0]!.s - 12;
  hull.add(
    new THREE.BoxGeometry(halfB * 1.1, 1.3, 0.4, 6, 1, 1)
      .applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0, 0, 0.35, 0))
      .translate(0, top(bw) + 0.65, zOf(bw)),
    grey,
  );
  for (const x of [-2.4, 2.4]) {
    hull.add(new THREE.CylinderGeometry(0.7, 0.8, 0.9, 12).translate(x, top(30) + 0.45, zOf(30)), grey);
  }
  for (const side of [-1, 1] as const) {
    for (const s of [22, 40, 214, 228]) {
      if (s > endS - 4) continue;
      const p = loftPoint(spec, s, top(s), side, new THREE.Vector3());
      bollards(hull, p.x - side * 1.4, top(s), p.z, 0, grey);
    }
  }

  // ---- empty barbettes: armoured rings over dark wells
  const anchors: THREE.Object3D[] = [];
  for (const b of K.barbettes) {
    const y0 = top(b.s);
    const h = 1.2 + b.raised * hScale;
    const r = K.barbetteR;
    const ringG = new THREE.CylinderGeometry(r + 0.6, r + 0.8, h, 28, 2, true);
    ringG.translate(0, y0 + h / 2, zOf(b.s));
    hull.add(jitter(ringG, v3(0.08, 0.1, 0.08), 1.2, seed ^ b.s), grey);
    // Inside out: the inner face of the ring.
    const innerG = flipFaces(normalise(new THREE.CylinderGeometry(r, r, h, 28, 1, true)));
    innerG.translate(0, y0 + h / 2, zOf(b.s));
    hull.add(innerG, C.interior);
    const lip = new THREE.RingGeometry(r, r + 0.6, 28).rotateX(-Math.PI / 2);
    lip.translate(0, y0 + h, zOf(b.s));
    hull.add(lip, C.rust);
    dark.add(new THREE.CircleGeometry(r, 28).rotateX(-Math.PI / 2).translate(0, y0 + 0.4, zOf(b.s)), 0);
    // Stubs of the roller path and training gear inside the rim.
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + rnd() * 0.3;
      const pp = v3(Math.cos(a) * (r - 0.4), y0 + h - 0.3, zOf(b.s) + Math.sin(a) * (r - 0.4));
      hull.add(beam(pp, pp.clone().add(v3(-Math.cos(a) * 0.8, -0.7 - rnd(), -Math.sin(a) * 0.8)), 0.12, 0.08, 4), C.rustDark);
    }
    const a = new THREE.Object3D();
    a.name = `barbette-${b.name}`;
    a.position.set(0, y0 + 0.4, zOf(b.s));
    a.userData = { kind: 'interior-entry', wreck: 'bismarck', note: `${b.name} barbette (turret gone)` };
    anchors.push(a);
  }

  // ---- superstructure: battered, stepped blocks; conning tower; funnel hole
  const [ss0, ss1] = K.superstructure;
  const sY = (s: number): number => top(s);
  const block = (s0: number, s1: number, w: number, h: number, y: number, sag: number): void => {
    const g = new THREE.BoxGeometry(w, h, s1 - s0, 5, 2, Math.max(2, Math.round((s1 - s0) / 3)));
    g.translate(0, y + h / 2, zOf((s0 + s1) / 2));
    jitter(g, v3(0.25, 0.3, 0.25), 0.3, seed ^ Math.round(s0 * 7));
    if (sag > 0) {
      const pos = g.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) < y + h - 0.2) continue;
        const u = pos.getX(i) / (w / 2);
        pos.setY(i, pos.getY(i) - sag * (1 - u * u) * valueNoise3(pos.getZ(i) * 0.2, 1, 2, seed));
      }
      g.computeVertexNormals();
    }
    hull.add(g, grey);
  };
  // Upper deck (the citadel's superstructure deck) the length of the island.
  block(ss0, ss1, B * 0.62, 2.6 * hScale, sY(ss0), 0.4);
  // Forward superstructure, stepped, the tower mast long gone.
  block(ss0 + 2, 116, B * 0.34, 3 * hScale, sY(ss0) + 2.6 * hScale, 0.8);
  block(ss0 + 6, 108, B * 0.22, 2.6 * hScale, sY(ss0) + 5.6 * hScale, 1.1);
  // Armoured conning tower: a thick oval drum at the front of the bridge.
  const ct = new THREE.CylinderGeometry(3.6, 3.8, 3.4 * hScale, 20, 2);
  ct.scale(1, 1, 1.25);
  ct.translate(0, sY(K.conningTower) + 2.6 * hScale + 1.7 * hScale, zOf(K.conningTower));
  hull.add(jitter(ct, 0.08, 1, seed ^ 0x77), grey);
  for (const x of [-1.8, 0, 1.8]) {
    dark.add(
      new THREE.PlaneGeometry(1.2, 0.3).translate(x, sY(K.conningTower) + 4.9 * hScale, zOf(K.conningTower) - 4.72),
      0,
    );
  }
  // Funnel gone: a ragged casing stub around a dark hole.
  const fY = sY(K.funnel) + 2.6 * hScale;
  const casing = new THREE.CylinderGeometry(1, 1, 1.6, 22, 2, true).scale(5.2, 1, 7.5);
  casing.translate(0, fY + 0.8, zOf(K.funnel));
  hull.add(jitter(casing, v3(0.2, 0.55, 0.2), 0.8, seed ^ 0xf1), C.rustDark);
  dark.add(new THREE.CircleGeometry(1, 22).rotateX(-Math.PI / 2).scale(5, 1, 7.2).translate(0, fY + 0.06, zOf(K.funnel)), 0);
  // Aft superstructure and the stump of the aft fire-control position.
  block(146, 170, B * 0.3, 2.8 * hScale, sY(146) + 2.6 * hScale, 0.9);
  hull.add(new THREE.CylinderGeometry(2.2, 2.5, 2 * hScale, 14).translate(0, sY(162) + 6.4 * hScale, zOf(162)), grey);
  // Mainmast stump.
  hull.add(beam(v3(0, sY(145) + 2.6 * hScale, zOf(145)), v3(0.4, sY(145) + 5.5 * hScale, zOf(145.5)), 0.8, 0.6, 10), grey);
  // Crushed shelter deck plating at the island's edges.
  for (let i = 0; i < 10; i++) {
    const len = 3 + rnd() * 5;
    const g = new THREE.BoxGeometry(2 + rnd() * 3, 0.15, len, 3, 1, 5);
    g.translate(0, 0, len / 2);
    curl(g, len, (rnd() - 0.3) * 1.2);
    jitter(g, 0.15, 0.9, seed ^ (i * 17));
    const s = ss0 + rnd() * (ss1 - ss0);
    const x = (rnd() < 0.5 ? -1 : 1) * B * (0.22 + rnd() * 0.1);
    g.applyMatrix4(trs(x, sY(s) + 2.6 * hScale, zOf(s), rnd() * 0.6, rnd() * 6, (rnd() - 0.5) * 0.5));
    hull.add(g, grey);
  }

  // ---- 15 cm secondary turrets (three twin mounts a side); one each side gone
  const secondaries = [
    [100, 1],
    [118, 1],
    [158, 1],
    [100, -1],
    [118, -1],
    [158, -1],
  ] as const;
  const secDeck = (s: number): number => sY(s) + 2.6 * hScale;
  for (const [i, [s, side]] of secondaries.entries()) {
    const x = side * B * 0.24;
    const y0 = secDeck(s);
    if (i === 2 || i === 4) {
      dark.add(new THREE.CircleGeometry(2.4, 16).rotateX(-Math.PI / 2).translate(x, y0 + 0.05, zOf(s)), 0);
      continue;
    }
    const house = new THREE.BoxGeometry(5, 2.3, 6.6, 2, 1, 2);
    const pos = house.getAttribute('position');
    for (let k = 0; k < pos.count; k++) {
      // Sloped front and sides.
      if (pos.getY(k) > 0) {
        pos.setX(k, pos.getX(k) * 0.82);
        if (pos.getZ(k) < 0) pos.setZ(k, pos.getZ(k) * 0.7);
      }
    }
    house.computeVertexNormals();
    const yaw = (rnd() - 0.5) * 1.4 + (side > 0 ? 0.3 : -0.3);
    const m = trs(x, y0 + 1.15, zOf(s), 0, yaw);
    hull.add(house, grey, m);
    for (const gx of [-0.9, 0.9]) {
      const barrel = new THREE.CylinderGeometry(0.18, 0.26, 7.5, 8);
      barrel.rotateX(Math.PI / 2 - 0.05 + rnd() * 0.15);
      barrel.translate(gx, 0.2, -6.2);
      hull.add(barrel, grey, m);
    }
  }
  // 10.5 cm flak mounts: pedestals, most shields gone.
  for (const [s, side] of [
    [132, 1],
    [140, 1],
    [132, -1],
    [150, -1],
  ] as const) {
    const x = side * B * 0.27;
    hull.add(new THREE.CylinderGeometry(1.3, 1.5, 1.1, 12).translate(x, secDeck(s) + 0.55, zOf(s)), grey);
    const g = beam(v3(x, secDeck(s) + 1.2, zOf(s)), v3(x + side * 0.6, secDeck(s) + 2.2, zOf(s) - 4.5), 0.12, 0.14, 6);
    hull.add(g, grey);
  }

  // ---- the torn aft end: plating and deck peeled back
  for (let i = 0; i < 9; i++) {
    const side = (i % 2 === 0 ? -1 : 1) as -1 | 1;
    const s = endS - 2 - rnd() * 8;
    const y = 1.5 + rnd() * 6;
    const { p } = hullFrame(spec, s, y, side);
    const len = 3 + rnd() * 5;
    const g = new THREE.BoxGeometry(2.5 + rnd() * 3, 0.14, len, 3, 1, 6);
    g.translate(0, 0, len / 2);
    curl(g, len, side * (0.4 + rnd() * 1.1));
    jitter(g, 0.12, 1.1, seed ^ (i * 23));
    g.applyMatrix4(trs(p.x, p.y, p.z, Math.PI / 2 - 0.2 + rnd() * 0.4, side * (0.4 + rnd() * 0.6), 0));
    hull.add(g, grey);
  }
  for (let i = 0; i < 3; i++) {
    const len = 4 + rnd() * 4;
    const g = new THREE.BoxGeometry(6 + rnd() * 8, 0.18, len, 4, 1, 6);
    g.translate(0, 0, len / 2);
    curl(g, len, -(0.4 + rnd() * 0.9));
    const s = endS - 6 - rnd() * 4;
    g.applyMatrix4(trs((rnd() - 0.5) * 10, top(s) - 0.2 - i * 2, zOf(s), 0, (rnd() - 0.5) * 0.5));
    hull.add(g, i === 0 ? C.teak : grey);
  }
  const tornEntry = new THREE.Object3D();
  tornEntry.name = 'interior-entry';
  tornEntry.position.set(0, top(endS) * 0.5, zOf(endS));
  tornEntry.userData = { kind: 'interior-entry', wreck: 'bismarck', note: 'torn aft end (stern missing)' };
  anchors.push(tornEntry);

  // ---- merge + paint
  const hullGeom = hull.merge()!;
  const endShade = (_x: number, _y: number, z: number): number =>
    THREE.MathUtils.lerp(1, 0.5, S(z + L / 2, endS - 12, endS - 1));
  paintWreck(hullGeom, { seed, rustiness: 0.5, growth: 0.2, silt: 0.65, mudBand: 2.4, shadeAt: endShade });
  projectUVs(hullGeom, 8);
  const deckGeom = deck.merge()!;
  paintWreck(deckGeom, { seed: seed ^ 0xd, rustiness: 0, growth: 0.2, silt: 0.55, mudBand: 0, wood: true });
  projectUVs(deckGeom, 6, true);
  const core = [
    meshOf(hullGeom, steelMaterial(detail), 'bismarck-hull')!,
    meshOf(deckGeom, woodMaterial(detail), 'bismarck-deck')!,
    meshOf(dark.merge(), voidMaterial(), 'bismarck-void')!,
  ];

  // ---- near detail
  const near: THREE.Object3D[] = [];
  const portholes = new InstanceList();
  const under: THREE.Vector3[] = [];
  for (const side of [-1, 1] as const) {
    under.push(
      ...openingRow(portholes, spec, side, 16, 52, (s) => top(s) - 2.2, 2.6, 0.42, 0.42, rnd, 0.25),
      ...openingRow(portholes, spec, side, 206, endS - 8, (s) => top(s) - 2.2, 2.6, 0.42, 0.42, rnd, 0.35),
    );
  }
  if (detail.openings) {
    const ph = makeInstanced(portholeGeometry(), fittingMaterial(), portholes, 'bismarck-portholes');
    if (ph) near.push(ph);
  }
  if (detail.railings) {
    // Guard-rail stanchions survive only in stretches.
    const rails = new InstanceList();
    const outward = (p: THREE.Vector3): THREE.Vector3 => v3(Math.sign(p.x) || 1, 0, 0);
    for (const side of [-1, 1] as const) {
      railing(rails, edgePath(spec, 3, 48, 1.8, top, side, 0.3), rnd, { outward, bend: 0.7, missing: 0.45, height: 1 });
      railing(rails, edgePath(spec, 205, endS - 6, 1.8, top, side, 0.3), rnd, {
        outward,
        bend: 0.8,
        missing: 0.5,
        height: 1,
      });
    }
    const rm = makeInstanced(barGeometry(), fittingMaterial(), rails, 'bismarck-railings');
    if (rm) near.push(rm);
  }
  // Rusticles: fewer and shorter than on the Titanic (a younger wreck, deeper, and
  // grey steel), along deck edges, the barbette rims and the torn end.
  const rust = new InstanceList();
  for (const side of [-1, 1] as const) {
    rusticlesAlong(rust, edgePath(spec, 1, endS, 1.5, top, side, -0.05), 0.45, 0.2, 0.9, rnd, v3(side, 0, 0));
  }
  for (const p of under) if (rnd() < 0.3) hangRusticle(rust, p.clone().add(v3(0, -0.25, 0)), 0.2 + rnd() * 0.4, rnd);
  for (const b of K.barbettes) {
    for (let k = 0; k < 18; k++) {
      const a = rnd() * Math.PI * 2;
      const r = K.barbetteR - 0.05;
      const y0 = top(b.s) + 1.2 + b.raised * hScale;
      hangRusticle(rust, v3(Math.cos(a) * r, y0, zOf(b.s) + Math.sin(a) * r), 0.3 + rnd() * 0.9, rnd);
    }
  }
  for (let i = 0; i < 90; i++) {
    const s = endS - rnd() * 10;
    const side = (rnd() < 0.5 ? -1 : 1) as -1 | 1;
    const p = loftPoint(spec, s, 1 + rnd() * (top(s) - 1), side, new THREE.Vector3());
    p.x *= rnd();
    hangRusticle(rust, p, 0.3 + rnd() * 1.1, rnd);
  }
  rust.thin(detail.growth);
  const rm = makeInstanced(rusticleGeometry(), growthMaterial(), rust, 'bismarck-rusticles');
  if (rm) near.push(rm);

  // ---- far silhouette
  const coarse: LoftSpec = { ...spec, stations: makeStations(endS, 14, 7, [[0, 40]]), levels: 2 };
  const sil = new PartBin();
  sil.add(loftSides(coarse), 0xffffff);
  sil.add(loftCap(coarse, endS, 1), 0xffffff);
  sil.add(deckStrip(coarse, 0, endS, (s) => top(s) - 0.03, 0, 1), 0xffffff);
  sil.add(new THREE.BoxGeometry(B * 0.62, 2.6 * hScale, ss1 - ss0).translate(0, sY(ss0) + 1.3 * hScale, zOf((ss0 + ss1) / 2)), 0xffffff);
  sil.add(new THREE.BoxGeometry(B * 0.3, 5.6 * hScale, 24).translate(0, sY(ss0) + 5.4 * hScale, zOf(104)), 0xffffff);
  const far = new THREE.Mesh(sil.merge()!, silhouetteMaterial(0x3b3530));

  // ---- colliders
  const colliders = [
    new THREE.Box3(v3(-halfB * 0.45, -2.5, -L / 2), v3(halfB * 0.45, top(0) + 0.5, zOf(35))),
    new THREE.Box3(v3(-halfB * 0.9, -2.5, zOf(35)), v3(halfB * 0.9, top(35) + 0.5, zOf(ss0))),
    new THREE.Box3(v3(-halfB, -2.5, zOf(ss0)), v3(halfB, top(ss0) + 0.3, zOf(ss1))),
    new THREE.Box3(v3(-halfB * 0.95, -2.5, zOf(ss1)), v3(halfB * 0.95, top(ss1) + 0.5, zOf(endS - 2))),
    new THREE.Box3(v3(-B * 0.31, top(ss0), zOf(ss0)), v3(B * 0.31, top(ss0) + 2.6 * hScale, zOf(ss1))),
    new THREE.Box3(v3(-B * 0.17, top(ss0), zOf(ss0 + 2)), v3(B * 0.17, top(ss0) + 8.2 * hScale, zOf(116))),
  ];

  const parts: WreckParts = { core, near, far, colliders, anchors };
  return assembleWreck('bismarck', parts, detail);
}
