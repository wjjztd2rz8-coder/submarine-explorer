import * as THREE from 'three';
import { vi } from 'vitest';
import { buildVehicle } from '../../../src/vehicles/index.js';
import { PartBuilder } from '../../../src/vehicles/kit.js';
import * as parts from '../../../src/vehicles/parts.js';

const EPS = 1e-7;

export interface Solid {
  label: string;
  owner?: number;
  mount?: boolean;
  triangles: THREE.Triangle[];
  boxes: THREE.Box3[];
  bounds: THREE.Box3;
  closed: boolean;
}

export function solid(geometry: THREE.BufferGeometry, label: string): Solid {
  const positions = geometry.getAttribute('position');
  const indices = geometry.index;
  const triangles: THREE.Triangle[] = [];
  const boxes: THREE.Box3[] = [];
  const bounds = new THREE.Box3();
  const edgeCounts = new Map<string, number>();
  for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
    const vertices = [0, 1, 2].map((j) =>
      new THREE.Vector3().fromBufferAttribute(positions, indices ? indices.getX(i + j) : i + j),
    );
    const triangle = new THREE.Triangle(vertices[0], vertices[1], vertices[2]);
    if (triangle.getArea() < 1e-14) continue;
    triangles.push(triangle);
    const keys = vertices.map((v) =>
      v
        .toArray()
        .map((n) => Math.round(n * 1e6))
        .join(','),
    );
    for (let j = 0; j < 3; j++) {
      const key = [keys[j], keys[(j + 1) % 3]].sort().join('/');
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
    const box = new THREE.Box3().setFromPoints(vertices);
    boxes.push(box);
    bounds.union(box);
  }
  return {
    label,
    triangles,
    boxes,
    bounds,
    closed: [...edgeCounts.values()].every((count) => count === 2),
  };
}

function boxDistance(a: THREE.Box3, b: THREE.Box3): number {
  return Math.hypot(
    Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x),
    Math.max(0, a.min.y - b.max.y, b.min.y - a.max.y),
    Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z),
  );
}

function edges(t: THREE.Triangle): THREE.Line3[] {
  return [new THREE.Line3(t.a, t.b), new THREE.Line3(t.b, t.c), new THREE.Line3(t.c, t.a)];
}

function triangleDistance(a: THREE.Triangle, b: THREE.Triangle): number {
  let distance = Infinity;
  const point = new THREE.Vector3();
  const ray = new THREE.Ray();
  const ea = edges(a);
  const eb = edges(b);
  for (const [segments, triangle] of [
    [ea, b],
    [eb, a],
  ] as const) {
    for (const edge of segments) {
      ray.set(edge.start, edge.delta(new THREE.Vector3()).normalize());
      const hit = ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, point);
      if (hit && hit.distanceTo(edge.start) <= edge.distance() + EPS) return 0;
      triangle.closestPointToPoint(edge.start, point);
      distance = Math.min(distance, point.distanceTo(edge.start));
    }
  }
  // Segment/segment minima also catch coplanar edge crossings.
  for (const x of ea) {
    for (const y of eb) {
      const u = x.delta(new THREE.Vector3());
      const v = y.delta(new THREE.Vector3());
      const w = x.start.clone().sub(y.start);
      const aa = u.dot(u),
        bb = u.dot(v),
        cc = v.dot(v);
      const dd = u.dot(w),
        ee = v.dot(w);
      const denominator = aa * cc - bb * bb;
      const clamp = THREE.MathUtils.clamp;
      let s = denominator > 1e-20 ? clamp((bb * ee - cc * dd) / denominator, 0, 1) : 0;
      const t = clamp((bb * s + ee) / cc, 0, 1);
      s = clamp((bb * t - dd) / aa, 0, 1);
      distance = Math.min(distance, x.at(s, new THREE.Vector3()).distanceTo(y.at(t, point)));
    }
  }
  return distance;
}

function inside(point: THREE.Vector3, body: Solid): boolean {
  // Open paint bands and guard surfaces have no enclosed solid interior.
  if (!body.closed || !body.bounds.containsPoint(point)) return false;
  // Oblique ray avoids the seam shared by triangles on regular rings/boxes.
  const ray = new THREE.Ray(point, new THREE.Vector3(0.371, 0.529, 0.763).normalize());
  const hit = new THREE.Vector3();
  const distances: number[] = [];
  for (const triangle of body.triangles) {
    if (ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, hit)) {
      const d = point.distanceTo(hit);
      if (!distances.some((other) => Math.abs(other - d) < EPS)) distances.push(d);
    }
  }
  return distances.length % 2 === 1;
}

/** Actual triangle distances, including edge crossings and wholly enclosed parts. */
export function clearance(a: Solid, b: Solid): number {
  let minimum = Infinity;
  for (let i = 0; i < a.triangles.length; i++) {
    if (boxDistance(a.boxes[i], b.bounds) > minimum) continue;
    for (let j = 0; j < b.triangles.length; j++) {
      if (boxDistance(a.boxes[i], b.boxes[j]) > minimum) continue;
      minimum = Math.min(minimum, triangleDistance(a.triangles[i], b.triangles[j]));
      if (minimum < EPS) return 0;
    }
  }
  if (
    boxDistance(a.bounds, b.bounds) === 0 &&
    (inside(a.triangles[0].a, b) || inside(b.triangles[0].a, a))
  )
    return 0;
  return minimum;
}

/** Capture pre-merge parts without changing production geometry or its placement. */
export function vehicleSolids(id: string, tier: string) {
  const captured = new Map<PartBuilder, Solid[]>();
  const add = PartBuilder.prototype.add;
  const thruster = parts.thruster;
  let owner: number | undefined;
  let primary: PartBuilder | undefined;
  const centres: THREE.Vector3[] = [];
  const addSpy = vi.spyOn(PartBuilder.prototype, 'add').mockImplementation(function (
    this: PartBuilder,
    slot,
    geometry,
    matrix,
    color,
  ) {
    const copy = geometry.clone();
    if (matrix) copy.applyMatrix4(matrix);
    const list = captured.get(this) ?? [];
    const part = solid(copy, `${slot}[${list.length}] ${geometry.type}`);
    part.owner = owner;
    list.push(part);
    captured.set(this, list);
    copy.dispose();
    return add.call(this, slot, geometry, matrix, color);
  });
  const thrusterSpy = vi.spyOn(parts, 'thruster').mockImplementation((...args) => {
    primary = args[0];
    owner = centres.length;
    centres.push(args[1].clone());
    const result = thruster(...args);
    if (args[6]?.mount) captured.get(primary)!.at(-1)!.mount = true;
    owner = undefined;
    return result;
  });
  try {
    const vehicle = buildVehicle(id, tier);
    const statics = captured.get(primary!)!;
    vehicle.root.updateMatrixWorld(true);
    const unscale = vehicle.root.matrixWorld.clone().invert();
    // Full LOD arms/camera and the strobe are separate meshes, rather than
    // additions to the main static builder. Include their assembled poses too.
    vehicle.root.traverseVisible((object) => {
      if (!(object instanceof THREE.Mesh) || object === vehicle.props) return;
      if (/^vehicle-(frame|metal|foam|glow|lens|decal|acrylic)$/.test(object.name)) return;
      const copy = object.geometry
        .clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(unscale, object.matrixWorld));
      statics.push(solid(copy, `${object.name}[${statics.length}]`));
      copy.dispose();
    });
    // A continuous spinning envelope derived from the actual shared prop mesh.
    // A circumscribed polygon avoids missing a blade between sampled spin phases.
    const positions = vehicle.props.geometry.getAttribute('position');
    let radius = 0,
      bottom = Infinity,
      top = -Infinity;
    for (let i = 0; i < positions.count; i++) {
      radius = Math.max(radius, Math.hypot(positions.getX(i), positions.getZ(i)));
      bottom = Math.min(bottom, positions.getY(i));
      top = Math.max(top, positions.getY(i));
    }
    const rotors = vehicle.propSpecs.map((spec, i) => {
      const segments = 128;
      const g = new THREE.CylinderGeometry(
        radius / Math.cos(Math.PI / segments),
        radius / Math.cos(Math.PI / segments),
        top - bottom,
        segments,
      );
      g.translate(0, (top + bottom) / 2, 0);
      g.applyMatrix4(
        new THREE.Matrix4().compose(
          spec.pos,
          new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), spec.axis),
          new THREE.Vector3().setScalar(spec.radius),
        ),
      );
      const result = solid(g, `propeller[${i}] ${spec.channel}`);
      result.owner = i;
      g.dispose();
      return result;
    });
    return { vehicle, statics, rotors, centres };
  } finally {
    addSpy.mockRestore();
    thrusterSpy.mockRestore();
  }
}

export function auditVehicle(id: string, tier: string) {
  const { vehicle, statics, rotors, centres } = vehicleSolids(id, tier);
  try {
    return rotors.map((rotor, i) => {
      const probes = [rotor, ...statics.filter((s) => s.owner === i && !s.mount)];
      // The saddle must meet its hull and nozzle. Internal hub/motor contact is
      // intentional; all other parts, including neighbouring thrusters, are checked.
      const obstacles = [
        ...statics.filter((s) => s.owner !== i),
        ...rotors.filter((r) => r !== rotor),
      ];
      const contacts: { probe: string; obstacle: string }[] = [];
      const gaps = {
        propHull: Infinity,
        propParts: Infinity,
        thrusterHull: Infinity,
        thrusterParts: Infinity,
      };
      let gap = Infinity;
      let nearest = '';
      for (const probe of probes) {
        for (const obstacle of [...obstacles].sort(
          (a, b) => boxDistance(probe.bounds, a.bounds) - boxDistance(probe.bounds, b.bounds),
        )) {
          const hull = /^(foam|acrylic)\[/.test(obstacle.label);
          const key =
            probe === rotor
              ? hull
                ? 'propHull'
                : 'propParts'
              : hull
                ? 'thrusterHull'
                : 'thrusterParts';
          if (boxDistance(probe.bounds, obstacle.bounds) > gaps[key]) continue;
          const d = clearance(probe, obstacle);
          gaps[key] = Math.min(gaps[key], d);
          if (d < gap) {
            gap = d;
            nearest = `${probe.label} / ${obstacle.label}`;
          }
          if (d < EPS) contacts.push({ probe: probe.label, obstacle: obstacle.label });
        }
      }
      return {
        index: i,
        channel: vehicle.propSpecs[i].channel,
        centre: centres[i].toArray(),
        propCentre: vehicle.propSpecs[i].pos.toArray(),
        gap,
        gaps,
        nearest,
        contacts,
      };
    });
  } finally {
    vehicle.dispose();
  }
}
