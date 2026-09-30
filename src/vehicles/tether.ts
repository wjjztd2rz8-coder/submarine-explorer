/**
 * The ROV tether (F1-VEHICLES): a sagging cable from the sub to the ROV,
 * rebuilt every frame.
 *
 * The curve is the parabolic approximation of a catenary: over a chord of
 * length d, a cable of length L hangs by h = sqrt(3 d (L - d) / 8) at mid
 * span. The paid-out length leads the ROV by some slack and runs out as the
 * ROV reaches the tether limit, so the cable straightens when taut.
 *
 * Drawn as a thin tube whose vertices are rewritten in place (no geometry
 * churn); the low tier uses a line.
 */

import * as THREE from 'three';

/** Mid-span sag (m) of a cable of length `length` over a chord of length `chord`. */
export function catenarySag(chord: number, length: number): number {
  if (chord <= 0 || length <= chord) return 0;
  return Math.sqrt((3 * chord * (length - chord)) / 8);
}

/**
 * Paid-out cable length for a chord: generous slack near the sub, running
 * out toward the limit. `taut` forces a straight line.
 */
export function payout(chord: number, limit: number, taut: boolean): number {
  if (taut) return chord * 1.002;
  const slack = Math.max(1.5, chord * 0.18);
  const room = Math.max(0, limit - chord);
  return chord + Math.min(slack, room * 0.6 + 0.2);
}

/**
 * Fill `out` (n points) along the hanging cable from `a` to `b`. The sag is
 * straight down (neutral cable in still water), with a slight sideways bow
 * `drift` (m) for life.
 */
export function tetherCurve(
  a: THREE.Vector3,
  b: THREE.Vector3,
  length: number,
  out: THREE.Vector3[],
  drift = 0,
): THREE.Vector3[] {
  const chord = a.distanceTo(b);
  const sag = Math.min(catenarySag(chord, length), chord * 0.45);
  const n = out.length;
  const side = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3(0, 1, 0));
  if (side.lengthSq() > 1e-8) side.normalize();
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const bow = 4 * t * (1 - t);
    out[i]!.copy(a).lerp(b, t);
    out[i]!.y -= sag * bow;
    out[i]!.addScaledVector(side, drift * bow * Math.sin(t * Math.PI));
  }
  return out;
}

export class TetherMesh {
  readonly object: THREE.Mesh | THREE.Line;
  private readonly pts: THREE.Vector3[];
  private readonly radial: number;
  private readonly radius: number;
  private readonly material: THREE.Material;
  private readonly tangent = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly binormal = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(opts: { segments?: number; radial?: number; radius?: number; line?: boolean } = {}) {
    const segments = opts.segments ?? 40;
    this.radial = opts.radial ?? 6;
    this.radius = opts.radius ?? 0.045;
    this.pts = Array.from({ length: segments + 1 }, () => new THREE.Vector3());
    if (opts.line) {
      this.material = new THREE.LineBasicMaterial({
        color: 0xffc23a,
        transparent: true,
        opacity: 0.85,
      });
      const g = new THREE.BufferGeometry().setFromPoints(this.pts);
      this.object = new THREE.Line(g, this.material);
    } else {
      this.material = new THREE.MeshStandardMaterial({
        color: 0xf2b20f,
        roughness: 0.65,
        metalness: 0,
        emissive: 0x3a2800,
      });
      const ring = this.radial + 1;
      const pos = new Float32Array(this.pts.length * ring * 3);
      const nrm = new Float32Array(this.pts.length * ring * 3);
      const index: number[] = [];
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < this.radial; j++) {
          const a = i * ring + j;
          const b = a + ring;
          index.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        'position',
        new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage),
      );
      g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3).setUsage(THREE.DynamicDrawUsage));
      g.setIndex(index);
      this.object = new THREE.Mesh(g, this.material);
    }
    this.object.name = 'rov-tether';
    this.object.frustumCulled = false;
  }

  /** The current centreline (world metres). */
  get points(): readonly THREE.Vector3[] {
    return this.pts;
  }

  update(a: THREE.Vector3, b: THREE.Vector3, length: number, drift = 0): void {
    tetherCurve(a, b, length, this.pts, drift);
    const g = this.object.geometry;
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    if (this.object instanceof THREE.Line) {
      this.pts.forEach((p, i) => pos.setXYZ(i, p.x, p.y, p.z));
      pos.needsUpdate = true;
      return;
    }
    const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
    const ring = this.radial + 1;
    const n = this.pts.length;
    for (let i = 0; i < n; i++) {
      const p = this.pts[i]!;
      const prev = this.pts[Math.max(0, i - 1)]!;
      const next = this.pts[Math.min(n - 1, i + 1)]!;
      this.tangent.subVectors(next, prev);
      if (this.tangent.lengthSq() < 1e-10) this.tangent.set(0, 0, 1);
      this.tangent.normalize();
      // A frame from a fixed up vector: the cable never runs straight up here.
      this.normal.crossVectors(this.tangent, this.up);
      if (this.normal.lengthSq() < 1e-8) this.normal.set(1, 0, 0);
      this.normal.normalize();
      this.binormal.crossVectors(this.tangent, this.normal);
      for (let j = 0; j <= this.radial; j++) {
        const ang = (j / this.radial) * Math.PI * 2;
        const cx = Math.cos(ang);
        const cy = Math.sin(ang);
        const nx = this.normal.x * cx + this.binormal.x * cy;
        const ny = this.normal.y * cx + this.binormal.y * cy;
        const nz = this.normal.z * cx + this.binormal.z * cy;
        const k = i * ring + j;
        pos.setXYZ(k, p.x + nx * this.radius, p.y + ny * this.radius, p.z + nz * this.radius);
        nrm.setXYZ(k, nx, ny, nz);
      }
    }
    pos.needsUpdate = true;
    nrm.needsUpdate = true;
  }

  dispose(): void {
    this.object.geometry.dispose();
    this.material.dispose();
  }
}
