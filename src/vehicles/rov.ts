/**
 * The fly-out work ROV (F1-VEHICLES), built from the vehicle kit at life size
 * (about 2 m long, matching `Config.rov.radiusM`). Its layout follows
 * work-class science ROVs such as Hercules and Jason without copying them:
 * a yellow syntactic-foam float on top, an open anodised frame, four vectored
 * horizontal thrusters at the corners, two vertical thrusters through the
 * float, a pan/tilt HD camera between two lamps, a five-function manipulator
 * and a sample drawer on the skids, and the tether termination at the back.
 *
 * The lamp housings sit where `RovVisual` puts its two SpotLights.
 */

import * as THREE from 'three';
import { PAINT, PartBuilder, T, bar, lathe, loft, profile, sideX } from './kit.js';
import { antenna, basket, lamp, skids, thruster, type PropSpec } from './parts.js';
import { slotMapFor } from './hulls.js';
import type { Blueprint } from './Vehicle.js';
import type { DecalSpec } from './decals.js';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** Where RovVisual's spotlights sit (ROV metres). Lamp housings match. */
export const ROV_LAMPS: ReadonlyArray<THREE.Vector3> = [V(-0.62, 0.12, -1.06), V(0.62, 0.12, -1.06)];

export function rovBlueprint(low: boolean): Blueprint {
  const pb = new PartBuilder(slotMapFor(low));
  const radial = low ? 20 : 36;

  // Buoyancy float.
  const float = profile(
    [
      [-0.98, 0.0, 0.56, 0.3],
      [-0.94, 0.55, 0.64, 0.22],
      [-0.8, 0.68, 0.68, 0.2],
      [0.8, 0.68, 0.68, 0.2],
      [0.94, 0.55, 0.64, 0.22],
      [0.98, 0.0, 0.56, 0.3],
    ],
    6,
    10,
  );
  pb.add('foam', loft(-0.98, 0.98, low ? 10 : 24, radial, (_t, z) => float(z)), undefined, (c, n) =>
    n.y < -0.5 ? PAINT.charcoal : c.y < 0.27 && n.y < 0.3 ? PAINT.charcoal : PAINT.yellow,
  );
  // Thruster wells through the float.
  for (const z of [-0.42, 0.42]) {
    pb.add('frame', new THREE.CylinderGeometry(0.2, 0.22, 0.06, 24, 1, true), T(0, 0.67, z), PAINT.black);
  }

  // Frame: corner posts, rails, cross members.
  const f = PAINT.gunmetal;
  for (const sx of [-1, 1]) {
    const x = sx * 0.62;
    for (const z of [-0.9, 0, 0.9]) pb.add('frame', bar([x, -0.6, z], [x, 0.22, z], 0.028, 6), undefined, f);
    pb.add('frame', bar([x, 0.2, -0.95], [x, 0.2, 0.95], 0.025, 6), undefined, f);
    pb.add('frame', bar([x, -0.28, -0.95], [x, -0.28, 0.95], 0.025, 6), undefined, f);
    pb.add('frame', bar([x, -0.58, -0.9], [x, -0.28, 0], 0.018, 6), undefined, f);
  }
  for (const z of [-0.9, 0.9]) {
    pb.add('frame', bar([-0.62, -0.28, z], [0.62, -0.28, z], 0.025, 6), undefined, f);
    pb.add('frame', bar([-0.62, 0.2, z], [0.62, 0.2, z], 0.025, 6), undefined, f);
  }
  skids(pb, 0.55, -0.64, -0.95, 0.95, 0.035, PAINT.charcoal);

  // Electronics bottles and the hydraulic power unit inside the frame.
  pb.add('metal', new THREE.CylinderGeometry(0.13, 0.13, 1.1, 18), T(-0.25, -0.12, 0.15, Math.PI / 2, 0, 0), PAINT.titanium);
  pb.add('metal', new THREE.CylinderGeometry(0.11, 0.11, 0.9, 18), T(0.22, -0.1, 0.25, Math.PI / 2, 0, 0), PAINT.steel);
  pb.add('frame', new THREE.BoxGeometry(0.42, 0.26, 0.42), T(0.05, -0.42, 0.45), PAINT.charcoal);
  pb.add('frame', new THREE.CylinderGeometry(0.12, 0.12, 0.34, 14), T(-0.28, -0.42, 0.55), PAINT.orange);

  // Thrusters: four vectored horizontal at the corners, two vertical, wash outward.
  const props: PropSpec[] = [];
  const hor: Array<[number, number, PropSpec['channel'], 1 | -1]> = [
    [-1, 1, 'port', 1],
    [1, 1, 'starboard', -1],
    [-1, -1, 'port', -1],
    [1, -1, 'starboard', 1],
  ];
  for (const [sx, sz, ch, hand] of hor) {
    const axis = V(sx * 0.5, 0, 0.87).normalize();
    props.push(thruster(pb, V(sx * 0.7, -0.05, sz * 0.72), axis, 0.11, ch, hand, { mount: V(sx * 0.62, -0.05, sz * 0.62) }));
  }
  for (const [z, hand] of [
    [-0.42, 1],
    [0.42, -1],
  ] as const) {
    props.push(thruster(pb, V(0, 0.6, z), V(0, -1, 0), 0.13, 'vertical', hand));
  }

  // Lamps (at the spotlights) and an LED bar along the float's leading edge.
  for (const p of ROV_LAMPS) {
    lamp(pb, p, V(0, -0.5, -0.85), 0.065, { bracketTo: V(p.x, 0.12, -0.9) });
  }
  pb.add('frame', bar([-0.5, 0.26, -1.0], [0.5, 0.26, -1.0], 0.03, 6), undefined, PAINT.charcoal);
  for (let i = -3; i <= 3; i++) {
    pb.add('lens', new THREE.CylinderGeometry(0.024, 0.024, 0.02, 10), T(i * 0.13, 0.26, -1.03, Math.PI / 2, 0, 0), [2.6, 2.5, 2.3]);
  }

  // Sample drawer and tether termination (bend restrictor).
  basket(pb, V(0, -0.5, -1.12), 0.8, 0.2, 0.32);
  pb.add(
    'frame',
    lathe(
      [
        [0.09, 0],
        [0.07, 0.12],
        [0.04, 0.3],
        [0.028, 0.42],
      ],
      14,
    ),
    T(0, 0.66, 0.62, -0.6, 0, 0),
    PAINT.orange,
  );
  antenna(pb, V(-0.45, 0.66, 0.7), 0.4);

  // Depth/status LEDs.
  pb.add('glow', new THREE.SphereGeometry(0.02, 8, 6), T(0.5, 0.3, -0.98), [0.2, 1.6, 0.5]);
  pb.add('glow', new THREE.SphereGeometry(0.02, 8, 6), T(-0.5, 0.3, -0.98), [1.6, 0.25, 0.15]);

  const decals: DecalSpec[] = [];
  for (const sx of [-1, 1]) {
    const x = sx * (sideX(float(0), 0.45) + 0.008);
    decals.push({ kind: 'name', pos: V(x, 0.46, -0.1), w: 1.1, h: 0.2, normal: V(sx, 0, 0) });
    decals.push({ kind: 'flag', pos: V(x, 0.46, 0.66), w: 0.22, h: 0.15, normal: V(sx, 0, 0) });
  }
  decals.push({ kind: 'number', pos: V(0, 0.69, 0.02), w: 0.5, h: 0.2, normal: V(0, 1, 0) });

  return {
    id: 'ROV',
    label: 'Work ROV',
    parts: pb,
    props,
    arms: [
      {
        mount: V(0.4, -0.3, -0.98),
        upper: 0.42,
        fore: 0.38,
        thickness: 0.032,
        stowed: [0.35, -1.25, 2.45, -0.9],
        work: [0.05, -0.3, -0.3, -0.55],
        side: 1,
      },
    ],
    camera: { pos: V(0, 0.02, -1.02), size: 0.14 },
    strobe: { pos: V(0.5, 0.68, 0.8), radius: 0.035 },
    decals,
    decalText: { name: 'TERN', number: 'ROV-1', rating: '6500', ink: '#16191c', accent: '#16191c' },
    cockpitEye: V(0, 0, -1),
    tetherAnchor: V(0, 1.0, 0.85),
    blades: 4,
  };
}
