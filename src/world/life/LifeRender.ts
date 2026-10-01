/**
 * Drawing the animals: one instanced mesh per species that has live animals
 * (created on first use, hidden when empty) plus one spark layer. Matrices
 * are written straight into the instance buffers each frame; the vertex
 * shader (`models/material.ts`) does the swimming, pulsing and swaying from
 * the per-instance phase.
 *
 * Draw calls: one per visible species, plus one for sparks. The simulation
 * caps visible species at the tier's `maxSpecies`, so the total stays inside
 * the tier budget (low: 4 + 1, high: 11 + 1).
 */

import * as THREE from 'three';
import type { Agent, SubInfo } from './agent.js';
import { clamp, darkness, smoothstep } from './rng.js';
import type { LifeSim } from './LifeSim.js';
import { Sparks } from './Sparks.js';
import { createSpeciesMesh, disposeSpeciesMesh, type SpeciesMesh } from './speciesMesh.js';
import { bodyLen } from './steer.js';
import type { LifeTier } from './types.js';

export class LifeRender {
  readonly group = new THREE.Group();
  readonly sparks: Sparks;
  readonly meshes = new Map<string, SpeciesMesh>();
  private readonly counts = new Map<string, number>();
  private readonly m4 = new Float32Array(16);
  private wakeAcc = 0;
  private dark = 0;

  constructor(
    private readonly tier: LifeTier,
    private readonly rand: () => number,
  ) {
    this.group.name = 'life';
    this.sparks = new Sparks(tier.sparks);
    this.group.add(this.sparks.points);
  }

  /** Draw calls this frame: visible species meshes, plus the sparks when any are live. */
  get drawCalls(): { species: number; sparks: number } {
    let species = 0;
    for (const m of this.meshes.values()) if (m.mesh.visible) species++;
    return { species, sparks: this.sparks.points.visible ? 1 : 0 };
  }

  /** Triangles drawn by the species meshes this frame. */
  get triangles(): number {
    let t = 0;
    for (const m of this.meshes.values()) {
      if (!m.mesh.visible) continue;
      const idx = m.mesh.geometry.index;
      t += ((idx ? idx.count : m.mesh.geometry.getAttribute('position').count) / 3) * m.mesh.count;
    }
    return t;
  }

  meshFor(id: string): SpeciesMesh | undefined {
    return this.meshes.get(id);
  }

  private ensure(a: Agent, sim: LifeSim): SpeciesMesh {
    let m = this.meshes.get(a.def.id);
    if (!m) {
      m = createSpeciesMesh(a.def, this.tier.detail, sim.capacityOf(a.def));
      this.meshes.set(a.def.id, m);
      this.group.add(m.mesh);
    }
    return m;
  }

  /** A flash of light on an animal: raises its glow and throws sparks. */
  flash(a: Agent, strength: number): void {
    const def = a.def;
    if (def.glow === 'none') return;
    a.glow = Math.max(a.glow, strength);
    const dark = darkness(-a.y);
    if (dark < 0.05) return;
    const L = bodyLen(a);
    const n = Math.min(this.tier.sparks >> 2, Math.round((5 + 10 * strength) * (0.4 + 0.6 * dark)));
    const r = this.rand;
    const rad = Math.max(0.05, L * 0.45);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const dx = s * Math.cos(th);
      const dz = s * Math.sin(th);
      this.sparks.emit(
        a.x + dx * rad * (0.4 + 0.6 * r()),
        a.y + u * rad * 0.8,
        a.z + dz * rad * (0.4 + 0.6 * r()),
        dx * (0.05 + 0.25 * r()),
        u * (0.05 + 0.2 * r()),
        dz * (0.05 + 0.25 * r()),
        1.4 + 2.2 * r(),
        0.025 + 0.05 * r() + L * 0.05,
        def.glowColor,
        (0.55 + 0.45 * r()) * strength,
      );
    }
  }

  /** Disturbed plankton light up behind a moving sub in the dark. */
  private wake(sub: SubInfo, dt: number): void {
    if (this.dark < 0.08 || sub.speed < 0.7) return;
    this.wakeAcc += dt * Math.min(24, 4 + sub.speed * 3) * this.dark;
    const r = this.rand;
    while (this.wakeAcc >= 1) {
      this.wakeAcc -= 1;
      const back = sub.hullR * (0.5 + 1.4 * r());
      const sx = (r() - 0.5) * sub.hullR * 3;
      const sy = (r() - 0.5) * sub.hullR * 2.2;
      // A point behind the hull, spread across the wake (right = forward x up).
      const rxv = -sub.fz;
      const rzv = sub.fx;
      const rl = Math.hypot(rxv, rzv) || 1;
      this.sparks.emit(
        sub.x - sub.fx * back + (rxv / rl) * sx,
        sub.y - sub.fy * back + sy,
        sub.z - sub.fz * back + (rzv / rl) * sx,
        -sub.fx * sub.speed * 0.05,
        0.02,
        -sub.fz * sub.speed * 0.05,
        1.3 + 1.6 * r(),
        0.02 + 0.035 * r(),
        r() < 0.7 ? 0x5ff0ff : 0x7affc4,
        0.55 + 0.45 * r(),
      );
    }
  }

  /**
   * Write this frame's instance buffers and advance the sparks.
   * @param viewScale pixels per metre at distance 1 (viewport height / (2 tan(fov/2)))
   */
  sync(sim: LifeSim, sub: SubInfo, dt: number, viewScale: number, fogDensity: number): void {
    this.dark = darkness(-sub.y);
    for (const k of this.counts.keys()) this.counts.set(k, 0);
    const m4 = this.m4;
    for (const a of sim.pool) {
      if (!a.alive || a.fade <= 0.002) continue;
      const sm = this.ensure(a, sim);
      const id = a.def.id;
      const i = this.counts.get(id) ?? 0;
      if (i >= sm.capacity) continue;
      this.counts.set(id, i + 1);
      const f = smoothstep(0, 1, a.fade);
      const s = a.def.visScale * a.scale * Math.max(0.02, f);
      const cy = Math.cos(a.yaw);
      const sy = Math.sin(a.yaw);
      const th = -a.pitch;
      const cp = Math.cos(th);
      const sp = Math.sin(th);
      const cr = Math.cos(a.roll);
      const sr = Math.sin(a.roll);
      // M = Ry(yaw) * Rx(-pitch) * Rz(roll), column-major, scaled.
      m4[0] = (cy * cr + sy * sp * sr) * s;
      m4[1] = cp * sr * s;
      m4[2] = (-sy * cr + cy * sp * sr) * s;
      m4[3] = 0;
      m4[4] = (-cy * sr + sy * sp * cr) * s;
      m4[5] = cp * cr * s;
      m4[6] = (sy * sr + cy * sp * cr) * s;
      m4[7] = 0;
      m4[8] = sy * cp * s;
      m4[9] = -sp * s;
      m4[10] = cy * cp * s;
      m4[11] = 0;
      m4[12] = a.x;
      m4[13] = a.y;
      m4[14] = a.z;
      m4[15] = 1;
      sm.mesh.instanceMatrix.array.set(m4, i * 16);
      sm.life.setXYZ(i, a.phase, 0, clamp(a.glow, 0, 1));
    }
    for (const [id, sm] of this.meshes) {
      const n = this.counts.get(id) ?? 0;
      sm.mesh.count = n;
      sm.mesh.visible = n > 0;
      if (n === 0) continue;
      sm.mesh.instanceMatrix.needsUpdate = true;
      sm.life.needsUpdate = true;
      sm.glowUniform.value = sm.baseGlow * this.dark;
    }
    this.wake(sub, dt);
    this.sparks.update(dt, viewScale, fogDensity);
  }

  /** Hide and forget every animal (a teleport or restart). */
  clear(): void {
    for (const m of this.meshes.values()) {
      m.mesh.count = 0;
      m.mesh.visible = false;
    }
    this.counts.clear();
    this.sparks.clear();
  }

  dispose(): void {
    for (const m of this.meshes.values()) disposeSpeciesMesh(m);
    this.meshes.clear();
    this.sparks.dispose();
    this.group.removeFromParent();
  }
}
