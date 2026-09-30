/**
 * Vehicle components (F1-VEHICLES): the reusable pieces every hull class and
 * the ROV are assembled from. Static parts go straight into a
 * {@link PartBuilder}; moving parts (propellers, manipulator links, the
 * pan/tilt camera, the strobe) are returned as descriptors that `Vehicle.ts`
 * turns into their own small meshes.
 */

import * as THREE from 'three';
import {
  PAINT,
  PartBuilder,
  T,
  seg,
  alongY,
  bar,
  lathe,
  roundedBox,
  tube,
  type Rgb,
} from './kit.js';

/** A propeller position: drawn as one instance of the shared propeller mesh. */
export interface PropSpec {
  /** Hub centre (vehicle metres). */
  pos: THREE.Vector3;
  /** Thrust axis: the direction the wash leaves the duct. */
  axis: THREE.Vector3;
  /** Blade tip radius (m). */
  radius: number;
  /** Which command drives it. */
  channel: 'port' | 'starboard' | 'vertical' | 'lateral' | 'vertical-fore' | 'vertical-aft';
  /** Spin direction (+1 / -1), so paired props counter-rotate. */
  hand: 1 | -1;
}

/**
 * A ducted thruster (Kort nozzle, motor pod, stator struts, mounting saddle)
 * centred at `pos`, wash leaving along `axis`. Returns the propeller spec.
 */
export function thruster(
  pb: PartBuilder,
  pos: THREE.Vector3,
  axis: THREE.Vector3,
  radius: number,
  channel: PropSpec['channel'],
  hand: 1 | -1,
  opts: { ductColor?: Rgb; bandColor?: Rgb; mount?: THREE.Vector3 | null } = {},
): PropSpec {
  const r = radius;
  const len = r * 1.25;
  const ductColor = opts.ductColor ?? PAINT.charcoal;
  // Nozzle: thick rounded leading lip at the intake (-len/2), thinning to the exit.
  const nozzle = lathe(
    [
      [r * 1.02, len * 0.5],
      [r * 1.1, len * 0.5],
      [r * 1.2, len * 0.3],
      [r * 1.26, -len * 0.1],
      [r * 1.24, -len * 0.38],
      [r * 1.13, -len * 0.52],
      [r * 1.05, -len * 0.5],
      [r * 1.03, -len * 0.3],
      [r * 1.02, len * 0.5],
    ],
    28,
  );
  // Lathe axis is +Y; wash leaves toward +Y (exit at +len/2).
  const m = alongY(pos, axis);
  pb.add('frame', nozzle, m, ductColor);
  if (opts.bandColor) {
    const band = lathe(
      [
        [r * 1.265, -len * 0.02],
        [r * 1.27, len * 0.08],
      ],
      28,
    );
    pb.add('frame', band, m, opts.bandColor);
  }
  // Motor pod: a spindle behind the propeller (downstream, toward the exit).
  const pod = lathe(
    [
      [0.0, len * 0.72],
      [r * 0.22, len * 0.66],
      [r * 0.32, len * 0.5],
      [r * 0.34, len * 0.2],
      [r * 0.3, len * 0.06],
      [0, len * 0.05],
    ],
    16,
  );
  pb.add('metal', pod, m, PAINT.gunmetal);
  // Three stator struts from pod to nozzle.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    // Radial along X, axial along Y, thin tangentially; then swung round the axis.
    const strut = new THREE.BoxGeometry(r * 0.75, len * 0.16, r * 0.06);
    const rot = new THREE.Matrix4().makeRotationY(a);
    pb.add(
      'frame',
      strut,
      m
        .clone()
        .multiply(T(0, len * 0.32, 0))
        .multiply(rot)
        .multiply(T(r * 0.66, 0, 0)),
      PAINT.black,
    );
  }
  // Intake guard: two thin crossed bars.
  for (const a of [0.4, 0.4 + Math.PI / 2]) {
    const g = new THREE.BoxGeometry(r * 2.1, r * 0.025, r * 0.025);
    pb.add('frame', g, m.clone().multiply(T(0, -len * 0.45, 0, 0, a, 0)), PAINT.black);
  }
  // Mounting saddle toward the hull.
  if (opts.mount) {
    const to = opts.mount;
    // From the nozzle's outer skin, not its centre (the bar must not cross the prop).
    const from = pos.clone().addScaledVector(to.clone().sub(pos).normalize(), r * 1.2);
    pb.add(
      'frame',
      bar([from.x, from.y, from.z], [to.x, to.y, to.z], r * 0.16, 8),
      undefined,
      PAINT.gunmetal,
    );
  }
  return {
    pos: pos.clone().addScaledVector(axis.clone().normalize(), -len * 0.06),
    axis: axis.clone().normalize(),
    radius: r * 0.98,
    channel,
    hand,
  };
}

/**
 * The shared propeller: hub plus five skewed, pitched blades, tip radius 1,
 * spinning about +Y. Colour carries the blade/hub finish.
 */
export function propellerGeometry(blades = 5, lowDetail = false): THREE.BufferGeometry {
  const pb = new PartBuilder();
  const hub = lathe(
    [
      [0, -0.18],
      [0.2, -0.16],
      [0.24, 0],
      [0.2, 0.14],
      [0.06, 0.26],
      [0, 0.28],
    ],
    lowDetail ? 8 : 14,
  );
  pb.add('metal', hub, undefined, PAINT.gunmetal);
  // Blade outline: a skewed ellipse-ish paddle in the XZ plane, root at the hub.
  const s = new THREE.Shape();
  s.moveTo(0.18, -0.12);
  s.bezierCurveTo(0.45, -0.28, 0.85, -0.24, 0.98, -0.02);
  s.bezierCurveTo(1.0, 0.12, 0.7, 0.2, 0.45, 0.16);
  s.bezierCurveTo(0.3, 0.14, 0.2, 0.1, 0.18, 0.06);
  s.lineTo(0.18, -0.12);
  const blade = new THREE.ExtrudeGeometry(s, {
    depth: 0.03,
    bevelEnabled: false,
    curveSegments: lowDetail ? 3 : 6,
  });
  blade.translate(0, 0, -0.015);
  for (let i = 0; i < blades; i++) {
    const g = blade.clone();
    // Shape lies in XY; turn it into the prop disc (XZ) with a pitch about the radial axis.
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2 - 0.55));
    g.applyMatrix4(new THREE.Matrix4().makeRotationY((i / blades) * Math.PI * 2));
    pb.add('metal', g, undefined, PAINT.bronze);
  }
  blade.dispose();
  return pb.build().get('metal')!;
}

/** Lamp housing: finned cylinder with a bright lens facing `dir`. */
export function lamp(
  pb: PartBuilder,
  pos: THREE.Vector3,
  dir: THREE.Vector3,
  radius: number,
  opts: { body?: Rgb; lens?: Rgb; fins?: boolean; bracketTo?: THREE.Vector3 } = {},
): void {
  const r = radius;
  const m = alongY(pos, dir);
  const body = lathe(
    [
      [0, -r * 2.2],
      [r * 0.7, -r * 2.2],
      [r * 0.85, -r * 1.9],
      [r * 0.9, -r * 0.2],
      [r * 1.08, -r * 0.1],
      [r * 1.12, r * 0.18],
      [r * 0.98, r * 0.26],
      [r * 0.9, r * 0.2],
    ],
    18,
  );
  pb.add('metal', body, m, opts.body ?? PAINT.gunmetal);
  if (opts.fins !== false) {
    for (let i = 0; i < 4; i++) {
      const f = lathe(
        [
          [r * 0.9, -r * (1.7 - i * 0.35)],
          [r * 1.12, -r * (1.66 - i * 0.35)],
          [r * 1.12, -r * (1.58 - i * 0.35)],
          [r * 0.9, -r * (1.54 - i * 0.35)],
        ],
        18,
      );
      pb.add('metal', f, m, PAINT.charcoal);
    }
  }
  // Lens: a shallow dome. HDR colour so it blooms where post-processing does.
  const lens = lathe(
    [
      [r * 0.9, r * 0.2],
      [r * 0.6, r * 0.27],
      [0, r * 0.3],
    ],
    18,
  );
  pb.add('lens', lens, m, opts.lens ?? [3.2, 3.0, 2.6]);
  if (opts.bracketTo) {
    const p = pos.clone().addScaledVector(dir.clone().normalize(), -r * 1.2);
    pb.add(
      'frame',
      bar([p.x, p.y, p.z], [opts.bracketTo.x, opts.bracketTo.y, opts.bracketTo.z], r * 0.28, 6),
      undefined,
      PAINT.charcoal,
    );
  }
}

/** Direction from azimuth (0 = forward -Z, + = starboard) and elevation (+ = up). */
export function dirAzEl(az: number, el: number): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

/**
 * Pressure sphere with conical viewports. `viewports` are azimuth/elevation
 * pairs (radians). The glass carries a warm interior glow.
 */
export function crewSphere(
  pb: PartBuilder,
  center: THREE.Vector3,
  radius: number,
  viewports: Array<[number, number]>,
  opts: { hatchUp?: boolean; color?: Rgb } = {},
): void {
  const R = radius;
  pb.add(
    'metal',
    new THREE.SphereGeometry(R, seg(40), seg(24)),
    T(center.x, center.y, center.z),
    opts.color ?? PAINT.titanium,
  );
  // Equator bolting flange (the two hemispheres are bolted together).
  const flange = new THREE.TorusGeometry(R * 1.005, R * 0.035, 6, seg(48));
  pb.add(
    'metal',
    flange,
    T(center.x, center.y, center.z, 0, 0, Math.PI / 2).multiply(T(0, 0, 0, 0, Math.PI / 2, 0)),
    PAINT.steel,
  );
  for (const [az, el] of viewports) {
    const d = dirAzEl(az, el);
    const p = center.clone().addScaledVector(d, R * 0.97);
    const m = alongY(p, d);
    // Viewport seat: a raised conical boss with a retaining ring.
    const boss = lathe(
      [
        [R * 0.3, -R * 0.02],
        [R * 0.24, R * 0.06],
        [R * 0.19, R * 0.075],
        [R * 0.13, R * 0.07],
      ],
      24,
    );
    pb.add('metal', boss, m, PAINT.steel);
    const glass = lathe(
      [
        [R * 0.135, R * 0.068],
        [R * 0.08, R * 0.078],
        [0, R * 0.08],
      ],
      20,
    );
    pb.add('glow', glass, m, [0.75, 0.45, 0.18]);
  }
  if (opts.hatchUp) {
    const top = center.clone().add(new THREE.Vector3(0, R * 0.97, 0));
    const hatch = lathe(
      [
        [R * 0.36, -0.02],
        [R * 0.34, R * 0.08],
        [R * 0.3, R * 0.1],
        [0, R * 0.11],
      ],
      24,
    );
    pb.add('metal', hatch, T(top.x, top.y, top.z), PAINT.steel);
  }
}

/** Two tubular skids with upturned toes, joined by cross tubes. */
export function skids(
  pb: PartBuilder,
  halfWidth: number,
  y: number,
  z0: number,
  z1: number,
  radius: number,
  color: Rgb = PAINT.charcoal,
): void {
  for (const sx of [-1, 1]) {
    const x = sx * halfWidth;
    const pts: Array<[number, number, number]> = [
      [x, y + radius * 5, z0 - radius * 3],
      [x, y + radius * 1.2, z0 + radius * 2],
      [x, y, z0 + radius * 7],
      [x, y, z1 - radius * 5],
      [x, y + radius * 1.5, z1],
    ];
    pb.add('frame', tube(pts, radius, 8, 6), undefined, color);
    // Wear shoe along the bottom.
    pb.add(
      'frame',
      new THREE.BoxGeometry(radius * 1.6, radius * 0.7, (z1 - z0) * 0.72),
      T(x, y - radius * 0.9, (z0 + z1) / 2 + radius),
      PAINT.black,
    );
  }
}

/** Sample basket: tubular frame, grating floor and a few sample tools. */
export function basket(
  pb: PartBuilder,
  center: THREE.Vector3,
  w: number,
  h: number,
  d: number,
  opts: { rail?: Rgb; contents?: boolean } = {},
): void {
  const rail = opts.rail ?? PAINT.steel;
  const tr = Math.min(w, d) * 0.025;
  const x0 = center.x - w / 2;
  const x1 = center.x + w / 2;
  const y0 = center.y - h / 2;
  const y1 = center.y + h / 2;
  const z0 = center.z - d / 2;
  const z1 = center.z + d / 2;
  const corners: Array<[number, number]> = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = corners[i]!;
    const [bx, bz] = corners[(i + 1) % 4]!;
    pb.add('frame', bar([ax, y1, az], [bx, y1, bz], tr, 6), undefined, rail);
    pb.add('frame', bar([ax, y0, az], [bx, y0, bz], tr, 6), undefined, rail);
    pb.add('frame', bar([ax, y0, az], [ax, y1, az], tr, 6), undefined, rail);
  }
  // Mid rails on the long sides.
  for (const x of [x0, x1])
    pb.add(
      'frame',
      bar([x, (y0 + y1) / 2, z0], [x, (y0 + y1) / 2, z1], tr * 0.8, 6),
      undefined,
      rail,
    );
  pb.add(
    'frame',
    bar([x0, (y0 + y1) / 2, z0], [x1, (y0 + y1) / 2, z0], tr * 0.8, 6),
    undefined,
    rail,
  );
  // Grating floor.
  const n = Math.max(4, Math.round(w / 0.09));
  for (let i = 0; i <= n; i++) {
    const x = x0 + (i / n) * w;
    pb.add(
      'frame',
      new THREE.BoxGeometry(tr * 0.5, tr * 0.9, d),
      T(x, y0 + tr * 0.4, center.z),
      PAINT.gunmetal,
    );
  }
  pb.add(
    'frame',
    new THREE.BoxGeometry(w, tr * 0.5, tr * 0.8),
    T(center.x, y0 + tr * 0.4, center.z),
    PAINT.gunmetal,
  );
  if (opts.contents !== false) {
    // Push cores: clear tubes with coloured caps and T-handles, standing in a rack.
    for (let i = 0; i < 4; i++) {
      const x = x0 + w * (0.14 + i * 0.1);
      const z = center.z + d * 0.18;
      const cr = w * 0.028;
      pb.add(
        'frame',
        new THREE.CylinderGeometry(cr, cr, h * 0.9, 10),
        T(x, y0 + h * 0.45, z),
        PAINT.offWhite,
      );
      pb.add(
        'frame',
        new THREE.CylinderGeometry(cr * 1.2, cr * 1.2, h * 0.12, 10),
        T(x, y0 + h * 0.92, z),
        i % 2 ? PAINT.yellow : PAINT.red,
      );
      pb.add(
        'frame',
        new THREE.BoxGeometry(cr * 3.2, cr * 0.5, cr * 0.5),
        T(x, y0 + h * 1.02, z),
        PAINT.black,
      );
    }
    // Biobox with a lid.
    pb.add(
      'frame',
      roundedBox(w * 0.36, h * 0.7, d * 0.55, 0.02),
      T(center.x + w * 0.24, y0 + h * 0.36, center.z - d * 0.05),
      PAINT.offWhite,
    );
    pb.add(
      'frame',
      roundedBox(w * 0.38, h * 0.08, d * 0.58, 0.01),
      T(center.x + w * 0.24, y0 + h * 0.74, center.z - d * 0.05),
      PAINT.navy,
    );
  }
}

/** Articulated manipulator descriptor: four rigid links, each its own mesh. */
export interface ArmSpec {
  /** Shoulder pivot (vehicle metres). */
  mount: THREE.Vector3;
  /** Upper arm and forearm lengths (m). */
  upper: number;
  fore: number;
  /** Tube radius scale (m). */
  thickness: number;
  /** Stowed and working joint angles: [shoulderYaw, shoulderPitch, elbow, wrist]. */
  stowed: [number, number, number, number];
  work: [number, number, number, number];
  /** -1 port / +1 starboard (mirrors the yaw). */
  side: 1 | -1;
}

/**
 * Build the four link geometries of a manipulator, each in its joint frame.
 * Links point along -Z (forward) from their pivot; pitch is about X.
 */
export function armGeometry(spec: ArmSpec, lowDetail: boolean): THREE.BufferGeometry[] {
  const t = spec.thickness;
  const links: THREE.BufferGeometry[] = [];
  const rs = lowDetail ? 8 : 12;
  const armColor = PAINT.steel;
  // 0: shoulder turret (yaw).
  {
    const pb = new PartBuilder({ metal: 'frame' });
    pb.add(
      'frame',
      new THREE.CylinderGeometry(t * 1.5, t * 1.7, t * 2.2, rs),
      T(0, 0, 0),
      PAINT.charcoal,
    );
    pb.add(
      'frame',
      new THREE.CylinderGeometry(t * 1.25, t * 1.25, t * 3.0, rs),
      T(0, 0, 0, 0, 0, Math.PI / 2),
      armColor,
    );
    links.push(pb.build().get('frame')!);
  }
  // 1: upper arm (pitch at the shoulder), with a hydraulic ram alongside.
  {
    const pb = new PartBuilder({ metal: 'frame' });
    const L = spec.upper;
    pb.add('frame', roundedBox(t * 1.7, t * 1.9, L, t * 0.6), T(0, 0, -L / 2), armColor);
    pb.add(
      'frame',
      new THREE.CylinderGeometry(t * 1.2, t * 1.2, t * 2.4, rs),
      T(0, 0, -L, 0, 0, Math.PI / 2),
      PAINT.charcoal,
    );
    pb.add(
      'frame',
      new THREE.CylinderGeometry(t * 0.45, t * 0.45, L * 0.62, 8),
      T(0, t * 1.45, -L * 0.42, Math.PI / 2, 0, 0),
      PAINT.titanium,
    );
    pb.add(
      'frame',
      new THREE.CylinderGeometry(t * 0.62, t * 0.62, L * 0.35, 8),
      T(0, t * 1.45, -L * 0.16, Math.PI / 2, 0, 0),
      PAINT.black,
    );
    links.push(pb.build().get('frame')!);
  }
  // 2: forearm (pitch at the elbow).
  {
    const pb = new PartBuilder({ metal: 'frame' });
    const L = spec.fore;
    pb.add('frame', roundedBox(t * 1.35, t * 1.5, L, t * 0.5), T(0, 0, -L / 2), armColor);
    pb.add(
      'frame',
      new THREE.CylinderGeometry(t * 0.95, t * 0.95, L * 0.2, rs),
      T(0, 0, -L, Math.PI / 2, 0, 0),
      PAINT.charcoal,
    );
    // Hose loop along the forearm.
    pb.add(
      'frame',
      tube(
        [
          [0, t, 0],
          [t * 0.9, t * 1.4, -L * 0.3],
          [t * 0.7, t * 1.1, -L * 0.8],
        ],
        t * 0.18,
        5,
        4,
      ),
      undefined,
      PAINT.black,
    );
    links.push(pb.build().get('frame')!);
  }
  // 3: wrist and parallel jaw (roll about the forearm axis).
  {
    const pb = new PartBuilder({ metal: 'frame' });
    pb.add(
      'frame',
      new THREE.CylinderGeometry(t * 0.9, t * 0.8, t * 1.6, rs),
      T(0, 0, -t * 0.8, Math.PI / 2, 0, 0),
      PAINT.gunmetal,
    );
    for (const s of [-1, 1]) {
      const finger = roundedBox(t * 0.35, t * 0.6, t * 2.6, t * 0.15);
      pb.add('frame', finger, T(s * t * 0.55, 0, -t * 2.6, 0, s * 0.12, 0), PAINT.titanium);
      pb.add(
        'frame',
        new THREE.BoxGeometry(t * 0.35, t * 0.6, t * 0.6),
        T(s * t * 0.35, 0, -t * 3.8, 0, -s * 0.5, 0),
        PAINT.black,
      );
    }
    links.push(pb.build().get('frame')!);
  }
  return links;
}

/** Pan/tilt HD camera: bracket (static, returned separately) and head. */
export function cameraHeadGeometry(size: number): THREE.BufferGeometry {
  const pb = new PartBuilder({ metal: 'frame', lens: 'frame', glow: 'frame' });
  const s = size;
  pb.add('frame', roundedBox(s * 0.9, s * 0.8, s * 1.6, s * 0.2), T(0, 0, 0), PAINT.offWhite);
  // Lens barrel and dark port.
  pb.add(
    'frame',
    new THREE.CylinderGeometry(s * 0.34, s * 0.36, s * 0.35, 20),
    T(0, 0, -s * 0.92, Math.PI / 2, 0, 0),
    PAINT.charcoal,
  );
  pb.add(
    'frame',
    new THREE.CylinderGeometry(s * 0.27, s * 0.27, s * 0.02, 20),
    T(0, 0, -s * 1.1, Math.PI / 2, 0, 0),
    [0.02, 0.03, 0.05],
  );
  // Tilt trunnions.
  pb.add(
    'frame',
    new THREE.CylinderGeometry(s * 0.18, s * 0.18, s * 1.25, 10),
    T(0, 0, 0, 0, 0, Math.PI / 2),
    PAINT.gunmetal,
  );
  // Status band.
  pb.add(
    'frame',
    new THREE.BoxGeometry(s * 0.92, s * 0.08, s * 1.1),
    T(0, s * 0.18, 0.05 * s),
    PAINT.orange,
  );
  return pb.build().get('frame')!;
}

/** Pan/tilt yoke (the part that pans, holding the tilting head). */
export function cameraYokeGeometry(size: number): THREE.BufferGeometry {
  const pb = new PartBuilder({ metal: 'frame' });
  const s = size;
  pb.add(
    'frame',
    new THREE.CylinderGeometry(s * 0.35, s * 0.4, s * 0.3, 14),
    T(0, -s * 0.72, 0),
    PAINT.charcoal,
  );
  for (const x of [-1, 1])
    pb.add(
      'frame',
      new THREE.BoxGeometry(s * 0.12, s * 0.8, s * 0.35),
      T(x * s * 0.62, -s * 0.35, 0),
      PAINT.gunmetal,
    );
  pb.add(
    'frame',
    new THREE.BoxGeometry(s * 1.36, s * 0.12, s * 0.35),
    T(0, -s * 0.72, 0),
    PAINT.gunmetal,
  );
  return pb.build().get('frame')!;
}

/** The strobe dome (its own mesh so it can flash). */
export function strobeGeometry(r: number): THREE.BufferGeometry {
  const g = lathe(
    [
      [r, 0],
      [r, r * 0.9],
      [r * 0.7, r * 1.5],
      [0, r * 1.7],
    ],
    16,
  );
  return g;
}

/** VHF / radio whip antenna with a base and a small recovery beacon. */
export function antenna(pb: PartBuilder, base: THREE.Vector3, height: number, lean = 0.12): void {
  const top: [number, number, number] = [base.x, base.y + height, base.z + height * lean];
  pb.add(
    'frame',
    new THREE.CylinderGeometry(height * 0.035, height * 0.045, height * 0.08, 10),
    T(base.x, base.y + height * 0.04, base.z),
    PAINT.charcoal,
  );
  pb.add('frame', bar([base.x, base.y, base.z], top, height * 0.008, 5), undefined, PAINT.black);
  pb.add('frame', new THREE.SphereGeometry(height * 0.018, 8, 6), T(...top), PAINT.black);
}

/** Lifting bail / padeye: a hoop for the ship's crane. */
export function liftingBail(
  pb: PartBuilder,
  pos: THREE.Vector3,
  size: number,
  color: Rgb = PAINT.yellow,
): void {
  const hoop = new THREE.TorusGeometry(size, size * 0.14, 8, 20, Math.PI);
  pb.add('frame', hoop, T(pos.x, pos.y, pos.z, 0, Math.PI / 2, 0), color);
  pb.add(
    'frame',
    new THREE.BoxGeometry(size * 0.5, size * 0.3, size * 2.6),
    T(pos.x, pos.y - size * 0.1, pos.z),
    PAINT.charcoal,
  );
}

/** Handrail along the top: posts and a rail. */
export function handrail(
  pb: PartBuilder,
  pts: Array<[number, number, number]>,
  postH: number,
  r: number,
): void {
  const rail = pts.map(([x, y, z]) => [x, y + postH, z] as [number, number, number]);
  pb.add('frame', tube(rail, r, 6, 3), undefined, PAINT.yellow);
  for (const [x, y, z] of [pts[0]!, pts[Math.floor(pts.length / 2)]!, pts[pts.length - 1]!]) {
    pb.add(
      'frame',
      bar([x, y - postH * 0.2, z], [x, y + postH, z], r * 0.9, 6),
      undefined,
      PAINT.yellow,
    );
  }
}

/** Oil-compensated battery pod: capsule along Z with end bands and a junction box. */
export function batteryPod(
  pb: PartBuilder,
  center: THREE.Vector3,
  radius: number,
  length: number,
  band: Rgb = PAINT.yellow,
): void {
  const r = radius;
  const half = length / 2;
  const prof: Array<[number, number]> = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    prof.push([r * Math.sin(a), -half + r * (1 - Math.cos(a)) * 0.6]);
  }
  for (let i = 6; i >= 0; i--) {
    const a = (i / 6) * (Math.PI / 2);
    prof.push([r * Math.sin(a), half - r * (1 - Math.cos(a)) * 0.6]);
  }
  pb.add(
    'frame',
    lathe(prof, 20),
    T(center.x, center.y, center.z, Math.PI / 2, 0, 0),
    PAINT.gunmetal,
  );
  for (const s of [-1, 1]) {
    const bandG = new THREE.CylinderGeometry(r * 1.02, r * 1.02, length * 0.05, seg(20), 1, true);
    pb.add(
      'frame',
      bandG,
      T(center.x, center.y, center.z + s * half * 0.7, Math.PI / 2, 0, 0),
      band,
    );
  }
  // Straps.
  for (const s of [-0.3, 0.3]) {
    pb.add(
      'frame',
      new THREE.TorusGeometry(r * 1.03, r * 0.05, 4, seg(20)),
      T(center.x, center.y, center.z + s * length),
      PAINT.black,
    );
  }
  pb.add(
    'frame',
    roundedBox(r * 0.8, r * 0.5, r * 1.2, r * 0.1),
    T(center.x, center.y + r * 0.95, center.z - half * 0.4),
    PAINT.charcoal,
  );
}
