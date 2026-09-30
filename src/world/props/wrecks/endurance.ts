/**
 * Endurance, Shackleton's barquentine (Endurance22 / FMHT 2022 survey imagery;
 * UKAHT site notes; the ship's plans as built by Framnæs, 1912).
 *
 * Upright and largely intact on the Weddell Sea floor, heading as in
 * props.json. A 44 m wooden hull with a bluff, ice-strengthened bow, a raised
 * forecastle and poop, bulwarks with their rail caps, and a counter stern
 * with ENDURANCE arched across it over a five-pointed star. The masts are
 * broken off as stubs (the fallen rigging lies forward: `endurance-rigging`
 * kit); the funnel has toppled onto the deck; the rudder was torn away by the
 * ice; damage is heaviest around the waist and the poop. The wheel still
 * stands on the poop deck. Fine silt on every flat surface, and anemones and
 * sea squirts on the rails. Dark main hatch: anchor `interior-entry`.
 *
 * Local frame: s = distance from the stem (-Z forward), +X starboard, y = 0 at
 * the mud line.
 */

import * as THREE from 'three';
import { catenary, ringBox } from './titanicBow.js';
import { assembleWreck, meshOf, type WreckBuilt, type WreckParts } from './assemble.js';
import type { WreckDetail } from './detail.js';
import {
  InstanceList,
  LIFE_TINTS,
  anemoneGeometry,
  makeInstanced,
  squirtGeometry,
} from './instances.js';
import {
  PartBin,
  beam,
  deckStrip,
  flipFaces,
  jitter,
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
  voidMaterial,
  woodMaterial,
} from './materials.js';
import { deckHouse, edgePath, hullFrame } from './ship.js';
import { mulberry32, valueNoise3 } from './shared.js';
import { enduranceNameTexture } from './textures.js';

/** Stations (m from the stem) and heights (m above the mud line), scaled to the hull length. */
export const ENDURANCE = {
  forecastleEnd: 8,
  poopStart: 34,
  foremast: 9.5,
  mainmast: 20,
  mizzen: 30.5,
  funnel: 24.5,
  hatch: 14.5,
  wheel: 40.8,
  deckY: 5.4,
  raisedY: 6.9,
  bulwark: 1.0,
  counter: 7,
} as const;

/** Build Endurance; dims = [length, beam, visible height]. */
export function buildEndurance(
  dims: readonly [number, number, number],
  seed: number,
  detail: WreckDetail,
): WreckBuilt {
  const E = ENDURANCE;
  const L = dims[0];
  const B = dims[1];
  const k = L / 44; // stations scale with the length
  const hk = dims[2] / 8;
  const rnd = mulberry32(seed);
  const halfB = B / 2;
  const S = THREE.MathUtils.smoothstep;
  const zOf = (s: number): number => s - L / 2;
  const fcEnd = E.forecastleEnd * k;
  const poop = E.poopStart * k;

  // Deck heights: raised forecastle and poop, a gentle sheer between.
  const deck = (s: number): number => {
    const sheer = 0.5 * Math.pow(1 - s / L, 2) + 0.3 * Math.pow(s / L, 3);
    const raised = 1 - S(s, fcEnd - 0.4, fcEnd + 0.4) + S(s, poop - 0.4, poop + 0.4);
    return hk * (E.deckY + sheer + (E.raisedY - E.deckY) * raised);
  };
  const top = (s: number): number => deck(s) + E.bulwark * hk;
  // Bluff bow (short full entry), long parallel body, counter stern tucked in below.
  const half = (s: number, y: number): number => {
    const yh = THREE.MathUtils.clamp(y / 7, 0, 1);
    const entry = (7.5 + 3 * (1 - yh)) * k;
    const u = THREE.MathUtils.clamp(s / entry, 0, 1);
    const fwd = Math.pow(1 - Math.pow(1 - u, 2.2), 0.8);
    const end = L - E.counter * k * 0.6 * (1 - S(y, 0.5, 4.5));
    if (s >= end) return 0;
    const t = THREE.MathUtils.clamp((s - (end - E.counter * k)) / (E.counter * k), 0, 1);
    return halfB * fwd * Math.sqrt(Math.max(0, 1 - t * t * 0.96));
  };
  // Timber hulls sag a little and the planking waves; worse around the poop and waist.
  const deform = (p: THREE.Vector3, s: number, y: number, side: -1 | 1): void => {
    const n = valueNoise3(s * 0.4, y * 0.5, side * 2.1, seed ^ 0x11);
    const dmg = 0.3 + S(s, 26 * k, 36 * k) * 0.7;
    p.x += side * (n - 0.5) * 0.14 * dmg;
  };

  const d = detail.meshDensity;
  const spec: LoftSpec = {
    L,
    stations: makeStations(L, 1.6 / d, 0.6 / d, [
      [0, 10 * k],
      [L - 9 * k, L],
    ]),
    yBottom: -1.5,
    levels: Math.max(6, Math.round(12 * d)),
    top,
    half,
    deform,
  };

  const wood = new PartBin();
  const fit = new PartBin();
  const dark = new PartBin();
  const hullC = 0x2c2621; // black paint worn back to dark timber
  const oak = C.oak;

  // ---- hull: outer planking, bulwarks' inner faces, deck
  wood.add(loftSides(spec), hullC);
  const inner: LoftSpec = {
    ...spec,
    yBottom: hk * E.deckY - 0.2,
    levels: 2,
    half: (s, y) => Math.max(0, half(s, y) - 0.18),
  };
  wood.add(flipFaces(loftSides(inner)), oak);
  wood.add(
    deckStrip(spec, 0.3, L - 0.3, (s) => deck(s) - 0.02, 0.2, 4),
    C.teak,
  );
  // Break-of-forecastle and break-of-poop bulkheads.
  for (const s of [fcEnd, poop]) {
    const w = half(s, deck(s)) * 2 - 0.4;
    wood.add(
      new THREE.BoxGeometry(w, (E.raisedY - E.deckY) * hk, 0.2).translate(
        0,
        hk * E.deckY + ((E.raisedY - E.deckY) * hk) / 2,
        zOf(s),
      ),
      oak,
    );
  }
  // Rail caps along the bulwark tops (the "intact rail contours").
  for (const side of [-1, 1] as const) {
    const path = edgePath(spec, 0.4, L - 0.3, 0.8, top, side, 0.09);
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]!.clone().add(v3(0, 0.06, 0));
      const b = path[i + 1]!.clone().add(v3(0, 0.06, 0));
      wood.add(beam(a, b, 0.13, 0.13, 4), oak);
    }
  }
  // Stem, and the stump of the bowsprit.
  const stemTop = v3(0, top(0.2), zOf(0.2));
  wood.add(beam(v3(0, 0, zOf(0.1)), stemTop, 0.28, 0.28, 6), oak);
  wood.add(
    beam(
      stemTop.clone().add(v3(0, -0.3, 0.6)),
      stemTop.clone().add(v3(0, 0.9, -3.4 * k)),
      0.3,
      0.24,
      8,
    ),
    oak,
  );
  // Hawse holes.
  for (const side of [-1, 1] as const) {
    const { p, n } = hullFrame(spec, 1.6 * k, deck(1.6 * k) - 0.4, side);
    dark.add(
      new THREE.CircleGeometry(0.2, 10)
        .applyMatrix4(new THREE.Matrix4().lookAt(v3(0, 0, 0), n.clone().negate(), v3(0, 1, 0)))
        .translate(p.x + n.x * 0.04, p.y, p.z),
      0,
    );
  }

  // ---- forecastle: windlass, catheads
  const wl = 4 * k;
  fit.add(
    new THREE.CylinderGeometry(0.35, 0.35, 3, 12)
      .rotateZ(Math.PI / 2)
      .translate(0, deck(wl) + 0.6, zOf(wl)),
    C.rustDark,
  );
  for (const x of [-1.7, 1.7])
    wood.add(new THREE.BoxGeometry(0.3, 0.9, 1).translate(x, deck(wl) + 0.45, zOf(wl)), oak);

  // ---- mast stubs (broken off), the fallen funnel, deck gear
  const stub = (s: number, h: number, r: number, lean: number): void => {
    const base = v3(0, deck(s * k), zOf(s * k));
    const tip = base.clone().add(v3(lean, h * hk, lean * 0.4));
    const g = beam(base, tip, r, r * 0.9, 10);
    // Splintered top.
    jitter(g, 0.05, 3, seed ^ Math.round(s * 10), (_x, y) => (y > tip.y - 0.4 ? 1 : 0));
    wood.add(g, oak);
    wood.add(
      new THREE.CylinderGeometry(r * 1.6, r * 1.8, 0.35, 10).translate(
        base.x,
        base.y + 0.17,
        base.z,
      ),
      oak,
    );
  };
  stub(E.foremast, 2.6, 0.3, 0.25);
  stub(E.mainmast, 3.8, 0.29, -0.15);
  stub(E.mizzen, 1.8, 0.24, 0.1);
  const fs = E.funnel * k;
  const funnel = new THREE.CylinderGeometry(0.62, 0.62, 5.2, 14, 3, true);
  funnel.rotateZ(Math.PI / 2 - 0.12);
  funnel.rotateY(0.35);
  funnel.translate(-1.5, deck(fs) + 0.75, zOf(fs + 1));
  fit.add(jitter(funnel, 0.06, 1.3, seed ^ 0xf0), 0x1d1a18);
  fit.add(
    new THREE.CylinderGeometry(0.66, 0.7, 0.4, 14, 1, true).translate(0, deck(fs) + 0.2, zOf(fs)),
    0x1d1a18,
  );
  dark.add(
    new THREE.CircleGeometry(0.6, 14).rotateX(-Math.PI / 2).translate(0, deck(fs) + 0.05, zOf(fs)),
    0,
  );
  // Main hatch, its cover gone: the way into the hold (anchor for later interiors).
  const hs = E.hatch * k;
  wood.add(ringBox(2.6, 0.6, 3.2, 0.2).translate(0, deck(hs) + 0.3, zOf(hs)), oak);
  dark.add(new THREE.BoxGeometry(2.25, 0.1, 2.85).translate(0, deck(hs) + 0.06, zOf(hs)), 0);
  const entry = new THREE.Object3D();
  entry.name = 'interior-entry';
  entry.position.set(0, deck(hs), zOf(hs));
  entry.userData = { kind: 'interior-entry', wreck: 'endurance', note: 'main hatch, open' };
  // Deckhouse abaft the mainmast, roof stove in; fore hatch; skylight on the poop.
  deckHouse(wood, 0, deck(23 * k), zOf(22 * k), 3.2, 2, 3.4 * k, oak, 0.5);
  wood.add(ringBox(1.8, 0.5, 1.8, 0.16).translate(0, deck(11.5 * k) + 0.25, zOf(11.5 * k)), oak);
  wood.add(new THREE.BoxGeometry(1.6, 0.6, 1.2).translate(0, deck(37 * k) + 0.3, zOf(37 * k)), oak);
  dark.add(new THREE.BoxGeometry(1.3, 0.05, 0.9).translate(0, deck(37 * k) + 0.63, zOf(37 * k)), 0);
  // Waist and poop damage: broken planking and a sag at the break of the poop.
  for (let i = 0; i < 8; i++) {
    const s = (26 + rnd() * 10) * k;
    const g = new THREE.BoxGeometry(0.22, 0.08, 1.5 + rnd() * 2.5);
    g.applyMatrix4(
      trs(
        (rnd() - 0.5) * B * 0.6,
        deck(s) + 0.1,
        zOf(s),
        (rnd() - 0.5) * 0.6,
        rnd() * 3,
        (rnd() - 0.5) * 0.4,
      ),
    );
    wood.add(g, C.teak);
  }
  dark.add(
    new THREE.BoxGeometry(1.8, 0.05, 1.2).translate(1.2, deck(33 * k) + 0.02, zOf(33 * k)),
    0,
  );
  // Boat davits (the boats went onto the ice in 1915).
  for (const side of [-1, 1] as const) {
    for (const s of [26 * k, 31 * k]) {
      const p = loftPoint(spec, s, top(s), side, new THREE.Vector3());
      const base = v3(p.x - side * 0.3, deck(s), p.z);
      const a = base.clone().add(v3(0, 2.2, 0));
      const b = a.clone().add(v3(side * 0.9, 0.35, 0));
      fit.add(beam(base, a, 0.08, 0.07, 6), C.rustDark);
      fit.add(beam(a, b, 0.07, 0.06, 6), C.rustDark);
    }
  }
  // A few loose lines from the stubs to the rail.
  for (const [s, side] of [
    [E.mainmast, 1],
    [E.mainmast, -1],
    [E.foremast, 1],
  ] as const) {
    const from = v3(0, deck(s * k) + 2.2 * hk, zOf(s * k));
    const to = loftPoint(spec, s * k + 2, top(s * k + 2), side, new THREE.Vector3());
    to.x -= side * 0.2;
    catenary(fit, from, to, 0.8, 0.04, 0x2a241c);
  }

  // ---- the wheel on the poop: spoked wheel on its box
  const ws = E.wheel * k;
  const wy = deck(ws);
  wood.add(new THREE.BoxGeometry(0.55, 1.0, 0.8).translate(0, wy + 0.5, zOf(ws)), oak);
  const wheelM = trs(0, wy + 1.45, zOf(ws) - 0.45);
  wood.add(new THREE.TorusGeometry(0.72, 0.05, 6, 24), oak, wheelM);
  fit.add(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 10).rotateX(Math.PI / 2), C.brass, wheelM);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const tip = v3(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0);
    wood.add(beam(v3(0, 0, 0), tip, 0.03, 0.035, 4), oak, wheelM);
  }
  wood.add(
    beam(v3(0, wy + 1.45, zOf(ws) - 0.45), v3(0, wy + 1.45, zOf(ws) + 0.2), 0.05, 0.05, 6),
    oak,
  );

  // ---- silt: drifts in the corners of the decks and against the bulwarks
  for (let i = 0; i < 16; i++) {
    const s = 1 + rnd() * (L - 2);
    const side = rnd() < 0.5 ? -1 : 1;
    const hw = half(s, deck(s));
    const g = normalise(new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2));
    g.scale(0.8 + rnd() * 1.2, 0.12 + rnd() * 0.15, 1.2 + rnd() * 2);
    g.translate(side * Math.max(0, hw - 0.9), deck(s), zOf(s));
    wood.add(g, C.silt);
  }

  // ---- merge + paint
  const woodGeom = wood.merge()!;
  paintWreck(woodGeom, { seed, rustiness: 0, growth: 0.15, silt: 0.8, mudBand: 1.2, wood: true });
  projectUVs(woodGeom, 5, true);
  const fitGeom = fit.merge()!;
  paintWreck(fitGeom, { seed: seed ^ 3, rustiness: 0.6, growth: 0.15, silt: 0.6, mudBand: 0 });
  const core: THREE.Mesh[] = [
    meshOf(woodGeom, woodMaterial(detail), 'endurance-hull')!,
    meshOf(fitGeom, fittingMaterial(), 'endurance-fittings')!,
    meshOf(dark.merge(), voidMaterial(), 'endurance-void')!,
  ];
  const name = nameDecal(spec, top, L, k, hk);
  if (name) core.push(name);

  // ---- near detail: sessile life on the rails, bulwarks and upper hull
  const near: THREE.Object3D[] = [];
  const anem = new InstanceList();
  const squirt = new InstanceList();
  const place = (list: InstanceList, p: THREE.Vector3, up: THREE.Vector3, size: number): void => {
    const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), up);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), rnd() * 6.28));
    const m = new THREE.Matrix4().compose(p, q, v3(size, size, size));
    list.push(m, LIFE_TINTS[Math.floor(rnd() * LIFE_TINTS.length)]!);
  };
  const lifeN = Math.round(420 * detail.growth);
  for (let i = 0; i < lifeN; i++) {
    const side = (rnd() < 0.5 ? -1 : 1) as -1 | 1;
    const s = 0.5 + rnd() * (L - 1);
    const r = rnd();
    if (r < 0.45) {
      // On the rail cap.
      const p = loftPoint(spec, s, top(s), side, new THREE.Vector3());
      p.x -= side * 0.09;
      p.y += 0.15;
      place(anem, p, v3(0, 1, 0), 0.1 + rnd() * 0.16);
    } else if (r < 0.8) {
      // On the outer planking below the rail.
      const { p, n } = hullFrame(spec, s, deck(s) - rnd() * 3, side);
      place(
        rnd() < 0.5 ? anem : squirt,
        p.addScaledVector(n, 0.02),
        n.add(v3(0, 0.6, 0)).normalize(),
        0.08 + rnd() * 0.12,
      );
    } else {
      // On deck, by the bulwarks.
      const hw = half(s, deck(s)) - 0.3;
      place(
        squirt,
        v3(side * hw * (0.7 + rnd() * 0.3), deck(s), zOf(s)),
        v3(0, 1, 0),
        0.08 + rnd() * 0.1,
      );
    }
  }
  const am = makeInstanced(anemoneGeometry(), growthMaterial(), anem, 'endurance-anemones');
  const sm = makeInstanced(squirtGeometry(), growthMaterial(), squirt, 'endurance-squirts');
  if (am) near.push(am);
  if (sm) near.push(sm);

  // ---- far silhouette
  const coarse: LoftSpec = { ...spec, stations: makeStations(L, 4, 2, [[0, 8 * k]]), levels: 2 };
  const sil = new PartBin();
  sil.add(loftSides(coarse), 0xffffff);
  sil.add(
    deckStrip(coarse, 0, L, (s) => deck(s), 0, 1),
    0xffffff,
  );
  sil.add(
    beam(
      v3(0, deck(E.mainmast * k), zOf(E.mainmast * k)),
      v3(0, deck(E.mainmast * k) + 3.8 * hk, zOf(E.mainmast * k)),
      0.35,
      0.3,
      5,
    ),
    0xffffff,
  );
  const far = new THREE.Mesh(sil.merge()!, silhouetteMaterial(0x2e2721));

  // ---- colliders
  const colliders = [
    new THREE.Box3(v3(-halfB * 0.6, -1.5, -L / 2), v3(halfB * 0.6, top(0), zOf(5 * k))),
    new THREE.Box3(v3(-halfB, -1.5, zOf(5 * k)), v3(halfB, deck(20 * k) + 0.4, zOf(L - 5 * k))),
    new THREE.Box3(v3(-halfB * 0.75, -1.5, zOf(L - 5 * k)), v3(halfB * 0.75, top(L - 3), L / 2)),
  ];

  const parts: WreckParts = { core, near, far, colliders, anchors: [entry] };
  return assembleWreck('endurance', parts, detail);
}

/**
 * The stern lettering as a decal that follows the curved counter: a
 * subdivided plane whose vertices are pushed onto the lofted surface.
 */
function nameDecal(
  spec: LoftSpec,
  top: (s: number) => number,
  L: number,
  k: number,
  hk: number,
): THREE.Mesh | null {
  const tex = enduranceNameTexture();
  if (!tex) return null;
  const w = 4.6 * k;
  const h = 2.3 * k;
  const yc = top(L - 0.5) - 0.3 * hk - h / 2;
  const g = new THREE.PlaneGeometry(w, h, 16, 4);
  const pos = g.getAttribute('position');
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) + yc;
    // Find the station where the counter's half-breadth equals |x| (bisection).
    let a = L - ENDURANCE.counter * k * 1.2;
    let b = L;
    for (let it = 0; it < 24; it++) {
      const m = (a + b) / 2;
      if (spec.half(m, y) > Math.abs(x)) a = m;
      else b = m;
    }
    loftPoint(spec, a, y, x < 0 ? -1 : 1, p);
    pos.setXYZ(i, x, y, p.z + 0.04);
  }
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.35,
    roughness: 0.6,
    metalness: 0.4,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    depthWrite: false,
  });
  mat.name = 'endurance-name';
  const m = new THREE.Mesh(g, mat);
  m.name = 'endurance-name';
  return m;
}
