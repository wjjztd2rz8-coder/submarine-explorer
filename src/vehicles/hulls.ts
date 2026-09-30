/**
 * The three hull classes (F1-VEHICLES), all built from the same kit and all
 * facing -Z in their own metres. Each one is in the design language of real
 * deep-submergence vehicles without copying any of them:
 *
 * - **Class A, coastal (1,000 m)**: an acrylic passenger sphere between two
 *   long foam pontoons on an open frame, the layout of the tourist and
 *   science 3-person subs (Triton 3300/3 class). White and signal yellow.
 * - **Class B, deep ocean (4,500-6,500 m)**: the workhorse. A titanium crew
 *   sphere under a lofted syntactic-foam fairing with a sail, skids,
 *   battery pods, a sample basket and two manipulators (Alvin, Nautile and
 *   Shinkai 6500 lineage). White with an international-orange sail and spine.
 * - **Class C, full ocean depth (11,000 m)**: a tall, narrow slab with the
 *   sphere low in the bow and thrusters on tall aft fins (the Limiting
 *   Factor / Triton 36000/2 layout). White over black with a red cap.
 *
 * Headlight housings sit at x = +/-0.44 m of vehicle metres, which is the
 * Headlights rig's +/-1.6 m separation at the in-game scale.
 */

import * as THREE from 'three';
import {
  PAINT,
  PartBuilder,
  T,
  bar,
  lathe,
  loft,
  profile,
  roundedBox,
  sideProfile,
  sideX,
  topY,
  type Painter,
  type Section,
} from './kit.js';
import type { Slot } from './materials.js';
import {
  antenna,
  basket,
  batteryPod,
  crewSphere,
  handrail,
  lamp,
  liftingBail,
  skids,
  thruster,
  type PropSpec,
} from './parts.js';
import type { Blueprint } from './Vehicle.js';
import type { DecalSpec } from './decals.js';

export type HullClassId = 'A' | 'B' | 'C';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** Low LOD folds the machined-metal slot into the frame (one draw call fewer). */
export function slotMapFor(low: boolean): Partial<Record<Slot, Slot | null>> {
  return low ? { metal: 'frame' } : {};
}

/** Loft a body from a profile function between z0 and z1. */
function body(
  fn: (z: number) => Section,
  z0: number,
  z1: number,
  steps: number,
  radial: number,
): THREE.BufferGeometry {
  return loft(z0, z1, steps, radial, (_t, z) => fn(z));
}

/** Decal pair (both sides) on a lofted body at height y. */
function sidePair(
  fn: (z: number) => Section,
  kind: DecalSpec['kind'],
  z: number,
  y: number,
  w: number,
  h: number,
): DecalSpec[] {
  const x = sideX(fn(z), y) + 0.012;
  return [
    { kind, pos: V(x, y, z), w, h, normal: V(1, 0, 0) },
    { kind, pos: V(-x, y, z), w, h, normal: V(-1, 0, 0) },
  ];
}

// ------------------------------------------------------------------ Class B

export function classB(low: boolean): Blueprint {
  const pb = new PartBuilder(slotMapFor(low));
  const radial = low ? 24 : 48;
  const steps = low ? 22 : 56;

  // Main fairing.
  const fair = profile(
    [
      [-3.12, 0.0, 0.64, 0.5],
      [-3.06, 0.62, 0.78, 0.38],
      [-2.9, 0.98, 0.88, 0.32],
      [-2.45, 1.17, 0.98, 0.33],
      [-1.65, 1.25, 1.05, 0.36],
      [-1.1, 1.25, 1.07, -0.08],
      [-0.6, 1.25, 1.08, -0.35],
      [1.6, 1.25, 1.08, -0.35],
      [2.4, 1.06, 1.0, -0.26],
      [3.0, 0.72, 0.86, -0.06],
      [3.34, 0.42, 0.72, 0.1],
      [3.44, 0.0, 0.62, 0.24],
    ],
    3,
    4,
  );
  const fairPaint: Painter = (c, n) => {
    if (n.y > 0.5 && Math.abs(c.x) < 0.46 && c.z > -2.75) return PAINT.orange;
    if (n.y < -0.3) return PAINT.offWhite;
    // A thin dark boot line where the side turns under.
    if (n.y < -0.05 && c.y < 0.1) return PAINT.charcoal;
    return PAINT.white;
  };
  pb.add('foam', body(fair, -3.12, 3.44, steps, radial), undefined, fairPaint);

  // Sail (conning fairing) with the hatch trunk.
  const sail = profile(
    [
      [-0.78, 0.0, 1.72, 0.96],
      [-0.66, 0.2, 1.8, 0.9],
      [-0.35, 0.3, 1.86, 0.88],
      [0.6, 0.3, 1.86, 0.88],
      [0.88, 0.18, 1.76, 0.94],
      [0.96, 0.0, 1.7, 1.0],
    ],
    2.4,
    4,
  );
  pb.add('foam', body(sail, -0.78, 0.96, low ? 10 : 24, low ? 16 : 32), undefined, (_c, n) =>
    n.y > 0.85 ? PAINT.charcoal : PAINT.orange,
  );
  pb.add(
    'metal',
    lathe(
      [
        [0.2, 0],
        [0.2, 0.06],
        [0.17, 0.08],
        [0, 0.085],
      ],
      20,
    ),
    T(0, 1.84, -0.15),
    PAINT.steel,
  );

  // Crew sphere: three viewports, forward and to either side, looking down.
  const sphereC = V(0, -0.55, -2.35);
  crewSphere(pb, sphereC, 1.0, [
    [0, -0.2],
    [-0.62, -0.34],
    [0.62, -0.34],
  ]);

  // Lower frame: posts, rails, braces.
  const frameC = PAINT.charcoal;
  for (const sx of [-1, 1]) {
    const x = sx * 0.95;
    for (const z of [-1.0, 0.7, 2.3])
      pb.add('frame', bar([x, -1.85, z], [x, -0.32, z], 0.05, 8), undefined, frameC);
    pb.add('frame', bar([x, -0.42, -2.2], [x, -0.42, 2.6], 0.045, 8), undefined, frameC);
    pb.add('frame', bar([x, -1.8, -1.0], [x, -0.42, 0.7], 0.035, 6), undefined, frameC);
    pb.add('frame', bar([x, -1.8, 2.3], [x, -0.42, 0.7], 0.035, 6), undefined, frameC);
    // Forward frame to the basket and the arm turrets.
    pb.add('frame', bar([x, -1.72, -3.2], [x, -0.42, -2.2], 0.045, 8), undefined, frameC);
    pb.add('frame', bar([x * 1.1, -0.95, -3.3], [x, -0.42, -2.2], 0.045, 8), undefined, frameC);
  }
  for (const z of [-1.0, 2.3])
    pb.add('frame', bar([-0.95, -1.35, z], [0.95, -1.35, z], 0.04, 6), undefined, frameC);
  skids(pb, 0.95, -1.88, -3.45, 2.95, 0.065, PAINT.charcoal);

  // Batteries and trim spheres.
  for (const sx of [-1, 1]) {
    batteryPod(pb, V(sx * 0.48, -1.05, 0.95), 0.34, 3.0);
    pb.add(
      'metal',
      new THREE.SphereGeometry(0.27, 20, 14),
      T(sx * 0.52, -0.95, 2.85),
      PAINT.titanium,
    );
  }

  // Sample basket, supported off the skid toes.
  basket(pb, V(0, -1.45, -3.88), 1.6, 0.5, 0.85);
  for (const sx of [-1, 1]) {
    pb.add(
      'frame',
      bar([sx * 0.8, -1.7, -3.45], [sx * 0.95, -1.8, -3.2], 0.035, 6),
      undefined,
      PAINT.steel,
    );
    pb.add(
      'frame',
      bar([sx * 0.8, -1.2, -3.45], [sx * 0.95, -0.9, -3.0], 0.03, 6),
      undefined,
      PAINT.steel,
    );
  }

  // Light bar under the nose: main lamps at the headlight positions (+/-0.44).
  pb.add(
    'frame',
    bar([-1.18, 0.5, -3.22], [1.18, 0.5, -3.22], 0.045, 8),
    undefined,
    PAINT.charcoal,
  );
  for (const sx of [-1, 1]) {
    pb.add(
      'frame',
      bar([sx * 0.7, 0.5, -3.22], [sx * 0.7, 0.62, -2.95], 0.04, 6),
      undefined,
      PAINT.charcoal,
    );
    lamp(pb, V(sx * 0.44, 0.5, -3.34), V(0, -0.12, -1), 0.11);
    lamp(pb, V(sx * 1.08, 0.5, -3.3), V(sx * 0.28, -0.2, -1), 0.085);
    lamp(pb, V(sx * 0.62, -1.25, -4.36), V(0, -0.15, -1), 0.07, { lens: [2.4, 2.3, 2.1] });
  }

  // Thrusters: two aft, two vertical on outriggers, one lateral under the tail.
  const props: PropSpec[] = [];
  props.push(
    thruster(pb, V(-0.98, 0.18, 3.28), V(0, 0, 1), 0.24, 'port', 1, {
      bandColor: PAINT.orange,
      mount: V(-0.55, 0.18, 3.0),
    }),
  );
  props.push(
    thruster(pb, V(0.98, 0.18, 3.28), V(0, 0, 1), 0.24, 'starboard', -1, {
      bandColor: PAINT.orange,
      mount: V(0.55, 0.18, 3.0),
    }),
  );
  props.push(
    thruster(pb, V(-1.62, 0.32, 0.35), V(0, -1, 0), 0.26, 'vertical', 1, {
      bandColor: PAINT.orange,
      mount: V(-1.22, 0.32, 0.35),
    }),
  );
  props.push(
    thruster(pb, V(1.62, 0.32, 0.35), V(0, -1, 0), 0.26, 'vertical', -1, {
      bandColor: PAINT.orange,
      mount: V(1.22, 0.32, 0.35),
    }),
  );
  props.push(
    thruster(pb, V(0, -0.62, 3.05), V(1, 0, 0), 0.19, 'lateral', 1, { mount: V(0, -0.2, 2.85) }),
  );
  // Outrigger struts for the vertical thrusters (a second, lower strut each).
  for (const sx of [-1, 1])
    pb.add(
      'frame',
      bar([sx * 1.5, 0.05, 0.35], [sx * 0.95, -0.42, 0.35], 0.04, 6),
      undefined,
      PAINT.charcoal,
    );

  // Deck hardware.
  liftingBail(pb, V(0, 1.1, 1.55), 0.18);
  const railSec = fair(0);
  const railY = topY(railSec, 0.86);
  for (const sx of [-1, 1])
    handrail(
      pb,
      [
        [sx * 0.86, railY, -1.3],
        [sx * 0.86, railY, 0.2],
        [sx * 0.86, railY - 0.03, 1.9],
      ],
      0.12,
      0.018,
    );
  antenna(pb, V(0.12, 1.86, 0.3), 1.0);
  // Recovery beacon and a transponder on the sail.
  pb.add(
    'metal',
    new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10),
    T(-0.12, 1.96, 0.35),
    PAINT.charcoal,
  );
  pb.add('glow', new THREE.SphereGeometry(0.035, 8, 6), T(-0.12, 2.09, 0.35), [0.2, 1.4, 0.4]);
  // Hydrophone and a CTD sensor on the tail.
  pb.add(
    'metal',
    new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8),
    T(0.3, 0.8, 2.9, Math.PI / 2, 0, 0),
    PAINT.steel,
  );

  const decals: DecalSpec[] = [
    ...sidePair(fair, 'name', 0.6, 0.42, 2.2, 0.38),
    ...sidePair(fair, 'number', -1.3, 0.5, 0.85, 0.32),
    ...sidePair(sail, 'rating', 0.15, 1.38, 0.78, 0.3),
    ...sidePair(fair, 'flag', 1.95, 0.45, 0.5, 0.33),
    ...sidePair(fair, 'warning', 2.75, 0.22, 0.75, 0.2),
    {
      kind: 'placard',
      pos: V(0, topY(fair(2.1), 0) + 0.012, 2.1),
      w: 0.7,
      h: 0.28,
      normal: V(0, 1, 0),
    },
  ];

  return {
    id: 'B',
    label: 'Class B - deep ocean',
    parts: pb,
    props,
    arms: [-1, 1].map((sx) => ({
      mount: V(sx * 1.08, -0.95, -3.32),
      upper: 0.8,
      fore: 0.75,
      thickness: 0.06,
      stowed: [0.15, -1.35, 2.5, -0.9] as [number, number, number, number],
      work: [-0.05, -0.3, -0.35, -0.5] as [number, number, number, number],
      side: sx as 1 | -1,
    })),
    camera: { pos: V(0, 0.77, -3.18), size: 0.26 },
    strobe: { pos: V(0, 1.86, 0.66), radius: 0.07 },
    decals,
    decalText: {
      name: 'MERIDIAN',
      number: 'DSV-2',
      rating: '6500',
      ink: '#16191c',
      accent: '#ffffff',
    },
    cockpitEye: V(0, -0.5, -2.92),
    tetherAnchor: V(0, -1.6, -3.3),
  };
}

// ------------------------------------------------------------------ Class A

export function classA(low: boolean): Blueprint {
  const pb = new PartBuilder(slotMapFor(low));
  const radial = low ? 20 : 40;
  const steps = low ? 16 : 40;

  // Two long pontoons.
  const pont = profile(
    [
      [-1.95, 0.0, 0.36, 0.1],
      [-1.86, 0.24, 0.5, -0.1],
      [-1.6, 0.36, 0.58, -0.28],
      [-1.0, 0.4, 0.6, -0.34],
      [1.3, 0.4, 0.6, -0.34],
      [1.85, 0.32, 0.52, -0.26],
      [2.08, 0.18, 0.4, -0.1],
      [2.14, 0.0, 0.26, 0.04],
    ],
    2.6,
    3,
  );
  const pontPaint: Painter = (_c, n) =>
    n.y > 0.45 ? PAINT.yellow : n.y < -0.35 ? PAINT.offWhite : PAINT.white;
  for (const sx of [-1, 1]) {
    const g = body(pont, -1.95, 2.14, steps, radial);
    pb.add('foam', g, T(sx * 1.2, 0, 0), pontPaint);
  }
  // Aft deck bridging the pontoons, over the electronics pods.
  const deck = profile(
    [
      [0.35, 0.0, 0.62, 0.42],
      [0.45, 0.85, 0.74, 0.3],
      [0.7, 1.05, 0.8, 0.28],
      [1.6, 1.05, 0.8, 0.28],
      [1.95, 0.9, 0.72, 0.3],
      [2.05, 0.0, 0.62, 0.42],
    ],
    4,
    4,
  );
  pb.add('foam', body(deck, 0.35, 2.05, low ? 10 : 24, radial), undefined, (_c, n) =>
    n.y > 0.6 ? PAINT.white : PAINT.offWhite,
  );
  // Yellow fin on the deck.
  pb.add(
    'foam',
    sideProfile(
      [
        [0.9, 0.75],
        [1.25, 1.2],
        [1.75, 1.22],
        [1.95, 0.75],
      ],
      0.09,
      0.02,
    ),
    undefined,
    PAINT.yellow,
  );

  // Acrylic pressure sphere and its metal rings.
  const sc = V(0, 0.02, -0.55);
  const R = 1.02;
  if (!low) pb.add('acrylic', new THREE.SphereGeometry(R, 40, 28), T(sc.x, sc.y, sc.z));
  else pb.add('acrylic', new THREE.SphereGeometry(R, 24, 16), T(sc.x, sc.y, sc.z));
  pb.add(
    'metal',
    new THREE.TorusGeometry(R * 0.42, 0.05, 8, 32),
    T(sc.x, sc.y + R * 0.9, sc.z, Math.PI / 2, 0, 0),
    PAINT.steel,
  );
  pb.add(
    'metal',
    lathe(
      [
        [R * 0.42, 0],
        [R * 0.4, 0.06],
        [0, 0.07],
      ],
      24,
    ),
    T(sc.x, sc.y + R * 0.9, sc.z),
    PAINT.steel,
  );
  pb.add(
    'metal',
    new THREE.TorusGeometry(R * 0.72, 0.06, 8, 40),
    T(sc.x, sc.y - R * 0.68, sc.z, Math.PI / 2, 0, 0),
    PAINT.gunmetal,
  );
  // Interior: floor, three seats, the pilot's console with lit screens.
  pb.add(
    'frame',
    new THREE.CylinderGeometry(R * 0.66, R * 0.66, 0.05, 28),
    T(sc.x, sc.y - R * 0.6, sc.z),
    PAINT.charcoal,
  );
  for (const [x, z, ry] of [
    [0, 0.2, 0],
    [-0.42, -0.2, 0.7],
    [0.42, -0.2, -0.7],
  ] as const) {
    pb.add(
      'frame',
      roundedBox(0.4, 0.14, 0.42, 0.05),
      T(sc.x + x, sc.y - 0.42, sc.z + z, 0, ry, 0),
      PAINT.seat,
    );
    pb.add(
      'frame',
      roundedBox(0.4, 0.5, 0.1, 0.05),
      T(sc.x + x * 1.15, sc.y - 0.15, sc.z + z + 0.22, -0.15, ry, 0),
      PAINT.seat,
    );
  }
  pb.add(
    'frame',
    roundedBox(0.7, 0.2, 0.22, 0.04),
    T(sc.x, sc.y - 0.38, sc.z - 0.62, 0.4, 0, 0),
    PAINT.charcoal,
  );
  pb.add(
    'glow',
    new THREE.PlaneGeometry(0.26, 0.12),
    T(sc.x - 0.17, sc.y - 0.3, sc.z - 0.66, -1.17, 0, 0),
    [0.25, 0.9, 1.1],
  );
  pb.add(
    'glow',
    new THREE.PlaneGeometry(0.26, 0.12),
    T(sc.x + 0.17, sc.y - 0.3, sc.z - 0.66, -1.17, 0, 0),
    [1.0, 0.65, 0.2],
  );

  // Frame: side rails under the pontoons, cross members, skids, batteries.
  for (const sx of [-1, 1]) {
    const x = sx * 1.2;
    for (const z of [-1.3, 0.1, 1.5])
      pb.add('frame', bar([x, -0.95, z], [x, -0.3, z], 0.045, 8), undefined, PAINT.gunmetal);
    batteryPod(pb, V(x, -0.62, 0.2), 0.22, 2.4, PAINT.yellow);
  }
  for (const z of [-1.3, 0.1, 1.5])
    pb.add('frame', bar([-1.2, -0.72, z], [1.2, -0.72, z], 0.04, 6), undefined, PAINT.gunmetal);
  pb.add('frame', bar([-1.2, -0.72, -1.3], [1.2, -0.72, 1.5], 0.03, 6), undefined, PAINT.gunmetal);
  skids(pb, 1.2, -0.98, -1.9, 2.0, 0.055, PAINT.gunmetal);

  // Thrusters: two aft on the pontoon tails, two vertical on the pontoons, one lateral.
  const props: PropSpec[] = [];
  props.push(
    thruster(pb, V(-1.2, 0.12, 2.42), V(0, 0, 1), 0.2, 'port', 1, {
      bandColor: PAINT.yellow,
      mount: V(-1.2, 0.12, 2.12),
    }),
  );
  props.push(
    thruster(pb, V(1.2, 0.12, 2.42), V(0, 0, 1), 0.2, 'starboard', -1, {
      bandColor: PAINT.yellow,
      mount: V(1.2, 0.12, 2.12),
    }),
  );
  props.push(
    thruster(pb, V(-1.78, 0.2, -0.62), V(0, -1, 0), 0.2, 'vertical', 1, {
      bandColor: PAINT.yellow,
      mount: V(-1.58, 0.2, -0.62),
    }),
  );
  props.push(
    thruster(pb, V(1.78, 0.2, -0.62), V(0, -1, 0), 0.2, 'vertical', -1, {
      bandColor: PAINT.yellow,
      mount: V(1.58, 0.2, -0.62),
    }),
  );
  props.push(
    thruster(pb, V(0, 0.95, 1.2), V(1, 0, 0), 0.15, 'lateral', 1, { mount: V(0, 0.79, 1.2) }),
  );

  // Lights: a bar across the front under the sphere, lamps on the pontoon noses.
  pb.add('frame', bar([-1.2, -0.62, -1.6], [1.2, -0.62, -1.6], 0.04, 8), undefined, PAINT.gunmetal);
  for (const sx of [-1, 1]) {
    pb.add(
      'frame',
      bar([sx * 1.2, -0.62, -1.6], [sx * 1.2, -0.3, -1.3], 0.035, 6),
      undefined,
      PAINT.gunmetal,
    );
    lamp(pb, V(sx * 0.44, -0.6, -1.72), V(0, -0.1, -1), 0.1);
    lamp(pb, V(sx * 1.2, 0.2, -2.02), V(sx * 0.15, -0.1, -1), 0.075, {
      bracketTo: V(sx * 1.2, 0.2, -1.86),
    });
  }
  basket(pb, V(0, -0.82, -1.95), 1.1, 0.32, 0.55, { contents: true });

  // Deck hardware.
  liftingBail(pb, V(0, 0.82, 1.05), 0.14);
  antenna(pb, V(0.35, 0.8, 1.7), 0.8);
  for (const sx of [-1, 1])
    handrail(
      pb,
      [
        [sx * 1.2, 0.6, -1.2],
        [sx * 1.2, 0.6, 0],
        [sx * 1.2, 0.6, 1.2],
      ],
      0.1,
      0.016,
    );

  const decals: DecalSpec[] = [];
  for (const sx of [-1, 1]) {
    const x = sx * (1.2 + sideX(pont(0.3), 0.12) + 0.012);
    const n = V(sx, 0, 0);
    decals.push({ kind: 'name', pos: V(x, 0.12, 0.47), w: 1.55, h: 0.3, normal: n });
    decals.push({ kind: 'rating', pos: V(x, 0.12, 1.55), w: 0.55, h: 0.22, normal: n });
    decals.push({ kind: 'flag', pos: V(x, 0.12, -1.3), w: 0.32, h: 0.22, normal: n });
  }
  decals.push({ kind: 'number', pos: V(0, 0.8 + 0.012, 1.45), w: 0.8, h: 0.3, normal: V(0, 1, 0) });

  return {
    id: 'A',
    label: 'Class A - coastal',
    parts: pb,
    props,
    arms: [
      {
        mount: V(0.75, -0.62, -1.62),
        upper: 0.55,
        fore: 0.5,
        thickness: 0.045,
        stowed: [0.25, -1.2, 2.4, -0.9],
        work: [0.0, -0.35, -0.3, -0.5],
        side: 1,
      },
    ],
    camera: { pos: V(0, -0.42, -1.62), size: 0.2 },
    strobe: { pos: V(-0.3, 0.84, 1.8), radius: 0.06 },
    decals,
    decalText: {
      name: 'PETREL',
      number: 'DSV-1',
      rating: '1000',
      ink: '#16191c',
      accent: '#16191c',
    },
    cockpitEye: V(0, 0.05, -0.95),
    tetherAnchor: V(0, -0.85, -1.7),
    blades: 4,
  };
}

// ------------------------------------------------------------------ Class C

export function classC(low: boolean): Blueprint {
  const pb = new PartBuilder(slotMapFor(low));
  const radial = low ? 24 : 44;
  const steps = low ? 20 : 48;

  // Tall foam body: raked bow, flat sides, a crowned top.
  const hull = profile(
    [
      [-2.18, 0.0, 1.55, -0.1],
      [-2.08, 0.55, 1.95, -0.25],
      [-1.8, 0.8, 2.12, -0.3],
      [-1.0, 0.88, 2.2, -0.32],
      [1.4, 0.88, 2.2, -0.32],
      [2.0, 0.78, 2.12, -0.28],
      [2.3, 0.5, 1.95, -0.2],
      [2.4, 0.0, 1.75, -0.05],
    ],
    4.5,
    6,
  );
  const hullPaint: Painter = (c, n) => {
    if (n.y > 0.55) return PAINT.red;
    if (c.y < 0.25) return PAINT.black;
    if (c.y < 0.36) return PAINT.red;
    return PAINT.white;
  };
  pb.add('foam', body(hull, -2.18, 2.4, steps, radial), undefined, hullPaint);

  // Lower pressure-housing bay (black), under the foam, with the sphere in the bow.
  const bay = profile(
    [
      [-1.0, 0.0, -0.2, -1.2],
      [-0.92, 0.7, -0.22, -1.3],
      [-0.6, 0.78, -0.25, -1.4],
      [1.8, 0.78, -0.25, -1.4],
      [2.2, 0.6, -0.25, -1.25],
      [2.32, 0.0, -0.3, -1.1],
    ],
    6,
    5,
  );
  pb.add('foam', body(bay, -1.0, 2.32, low ? 12 : 28, radial), undefined, PAINT.charcoal);
  const sc = V(0, -0.72, -1.5);
  crewSphere(pb, sc, 0.82, [
    [0, -0.18],
    [-0.7, -0.22],
    [0.7, -0.22],
  ]);
  // A foam collar framing the sphere from above.
  pb.add(
    'foam',
    new THREE.TorusGeometry(0.86, 0.08, 10, 40, Math.PI),
    T(sc.x, sc.y + 0.02, sc.z, 0, 0, 0),
    PAINT.red,
  );

  // Aft fins carrying the aft thrusters.
  for (const sx of [-1, 1]) {
    const fin = sideProfile(
      [
        [1.7, -0.2],
        [2.55, -0.35],
        [2.85, 0.4],
        [2.85, 1.3],
        [2.35, 2.05],
        [1.9, 1.9],
      ],
      0.08,
      0.02,
    );
    pb.add('foam', fin, T(sx * 0.6, 0, 0), (c) => (c.y > 1.6 ? PAINT.red : PAINT.white));
  }

  // Thrusters: aft pair high and low on the fins, two vertical through the deck, one lateral.
  const props: PropSpec[] = [];
  props.push(
    thruster(pb, V(-0.95, 1.0, 2.75), V(0, 0, 1), 0.22, 'port', 1, {
      bandColor: PAINT.red,
      mount: V(-0.64, 1.0, 2.6),
    }),
  );
  props.push(
    thruster(pb, V(0.95, 1.0, 2.75), V(0, 0, 1), 0.22, 'starboard', -1, {
      bandColor: PAINT.red,
      mount: V(0.64, 1.0, 2.6),
    }),
  );
  props.push(
    thruster(pb, V(0, 2.32, -0.95), V(0, -1, 0), 0.24, 'vertical-fore', 1, {
      bandColor: PAINT.red,
    }),
  );
  props.push(
    thruster(pb, V(0, 2.32, 1.35), V(0, -1, 0), 0.24, 'vertical-aft', -1, { bandColor: PAINT.red }),
  );
  props.push(
    thruster(pb, V(0, -0.55, 2.55), V(1, 0, 0), 0.18, 'lateral', 1, { mount: V(0, -0.5, 2.3) }),
  );
  // Wells: dark collars where the vertical thrusters sit into the crown.
  for (const z of [-0.95, 1.35]) {
    pb.add(
      'frame',
      new THREE.CylinderGeometry(0.4, 0.44, 0.1, 28, 1, true),
      T(0, 2.19, z),
      PAINT.black,
    );
  }

  // Frame, skids and batteries under the bay.
  for (const sx of [-1, 1]) {
    for (const z of [-0.6, 0.8, 2.0])
      pb.add(
        'frame',
        bar([sx * 0.7, -1.75, z], [sx * 0.7, -1.3, z], 0.05, 8),
        undefined,
        PAINT.gunmetal,
      );
    batteryPod(pb, V(sx * 0.42, -1.55, 0.85), 0.2, 2.4, PAINT.red);
  }
  skids(pb, 0.7, -1.78, -2.1, 2.5, 0.06, PAINT.gunmetal);
  for (const sx of [-1, 1])
    pb.add(
      'frame',
      bar([sx * 0.7, -1.7, -1.9], [sx * 0.5, -1.2, -0.9], 0.045, 8),
      undefined,
      PAINT.gunmetal,
    );

  // Lights on booms either side of the sphere and a bar under the bow.
  for (const sx of [-1, 1]) {
    pb.add(
      'frame',
      bar([sx * 0.7, 0.05, -1.75], [sx * 0.7, 0.05, -2.45], 0.045, 8),
      undefined,
      PAINT.charcoal,
    );
    lamp(pb, V(sx * 0.44, 0.05, -2.45), V(0, -0.12, -1), 0.1);
    lamp(pb, V(sx * 0.82, 0.05, -2.4), V(sx * 0.25, -0.18, -1), 0.08);
    pb.add(
      'frame',
      bar([sx * 0.44, 0.05, -2.35], [sx * 0.7, 0.05, -2.35], 0.035, 6),
      undefined,
      PAINT.charcoal,
    );
    lamp(pb, V(sx * 0.5, -1.55, -2.4), V(0, -0.2, -1), 0.065, { lens: [2.4, 2.3, 2.1] });
  }
  pb.add('frame', bar([-0.7, -1.55, -2.3], [0.7, -1.55, -2.3], 0.04, 6), undefined, PAINT.charcoal);
  basket(pb, V(0, -1.55, -2.75), 1.0, 0.36, 0.6);

  // Deck hardware.
  liftingBail(pb, V(0, 2.22, 0.2), 0.16);
  antenna(pb, V(0.3, 2.2, 1.9), 0.9);
  pb.add(
    'metal',
    new THREE.CylinderGeometry(0.05, 0.05, 0.2, 10),
    T(-0.3, 2.28, 1.95),
    PAINT.charcoal,
  );
  pb.add('glow', new THREE.SphereGeometry(0.035, 8, 6), T(-0.3, 2.4, 1.95), [0.2, 1.4, 0.4]);
  for (const sx of [-1, 1]) {
    const y = topY(hull(0), 0.62);
    handrail(
      pb,
      [
        [sx * 0.62, y, -1.6],
        [sx * 0.62, y, 0.2],
        [sx * 0.62, y, 1.9],
      ],
      0.1,
      0.016,
    );
  }

  const decals: DecalSpec[] = [
    ...sidePair(hull, 'name', 0.3, 1.25, 2.4, 0.42),
    ...sidePair(hull, 'rating', 0.3, 0.75, 1.1, 0.34),
    ...sidePair(hull, 'number', -1.35, 1.25, 0.9, 0.32),
    ...sidePair(hull, 'flag', 1.65, 1.3, 0.48, 0.32),
    {
      kind: 'placard',
      pos: V(0, topY(hull(0.2), 0) + 0.012, 0.75),
      w: 0.7,
      h: 0.28,
      normal: V(0, 1, 0),
    },
  ];

  return {
    id: 'C',
    label: 'Class C - full ocean depth',
    parts: pb,
    props,
    arms: [
      {
        mount: V(0.72, -1.1, -2.1),
        upper: 0.65,
        fore: 0.6,
        thickness: 0.05,
        stowed: [0.2, -1.3, 2.5, -0.9],
        work: [0.0, -0.3, -0.35, -0.5],
        side: 1,
      },
    ],
    camera: { pos: V(0, 0.32, -2.2), size: 0.22 },
    strobe: { pos: V(0, 2.26, 2.1), radius: 0.065 },
    decals,
    decalText: {
      name: 'HADAL',
      number: 'DSV-3',
      rating: '11000',
      ink: '#16191c',
      accent: '#16191c',
    },
    cockpitEye: V(0, -0.66, -1.95),
    tetherAnchor: V(0, -1.6, -2.4),
  };
}

/** Blueprint for a hull class (unknown ids fall back to the workhorse). */
export function blueprintFor(id: string, low: boolean): Blueprint {
  if (id === 'A') return classA(low);
  if (id === 'C') return classC(low);
  return classB(low);
}
