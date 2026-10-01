/**
 * The life system's front door: owns the simulation and the renderer for one
 * dive and answers the game's questions about the animals.
 *
 *  - `update`: step the sim, draw, refresh the scan targets;
 *  - scan targets: one per live species, always the best individual to scan
 *    (nearest, facing the beam), handed to the scanner as live objects;
 *  - `animalInView`: what a photo would show;
 *  - debug hooks: `spawnNear`, `spawnRare`, stats and per-frame budgets.
 */

import * as THREE from 'three';
import type { Agent, SimEnv, SubInfo } from './agent.js';
import { LifeSim } from './LifeSim.js';
import { LifeRender } from './LifeRender.js';
import { bodyLen } from './steer.js';
import { LIFE_TIERS, type LifeTier, type SiteTable, type SpeciesDef } from './types.js';
import type { Rand } from './rng.js';

/** Structurally a `ScanTarget` (game/Scanner.ts) so the scanner can take them as they are. */
export interface LifeScanTarget {
  id: string;
  name: string;
  landmarkId: string;
  position: THREE.Vector3;
  radius: number;
  scanSeconds: number;
}

export const LIFE_ID_PREFIX = 'life:';

export interface LifeOptions {
  tier: keyof typeof LIFE_TIERS;
  table: SiteTable | undefined;
  env: SimEnv;
  scene: THREE.Scene;
  landmarkId: string;
  rand?: Rand;
  seed?: number;
}

export class Life {
  readonly sim: LifeSim;
  readonly render: LifeRender;
  readonly tier: LifeTier;
  /** The live scan targets (the same array every frame; the scanner holds it). */
  readonly targets: LifeScanTarget[] = [];
  enabled = true;
  private readonly bySpecies = new Map<string, { target: LifeScanTarget; agent: Agent }>();
  private readonly landmarkId: string;
  private readonly tmp = new THREE.Vector3();
  private readonly proj = new THREE.Vector3();

  constructor(opts: LifeOptions) {
    this.tier = LIFE_TIERS[opts.tier];
    this.landmarkId = opts.landmarkId;
    const simOpts: ConstructorParameters<typeof LifeSim>[0] = {
      tier: this.tier,
      table: opts.table,
      env: opts.env,
    };
    if (opts.rand) simOpts.rand = opts.rand;
    if (opts.seed !== undefined) simOpts.seed = opts.seed;
    this.sim = new LifeSim(simOpts);
    this.render = new LifeRender(this.tier, this.sim.rand);
    this.sim.setFlashHandler((a, s) => this.render.flash(a, s));
    opts.scene.add(this.render.group);
  }

  /** True when the site has anything to spawn (a table or a forced animal). */
  get hasTable(): boolean {
    return this.sim.rows.length > 0 || this.sim.rare !== null;
  }

  /**
   * One frame. `dt` is 0 while the game is frozen (pause, photo mode): the
   * animals hold still but still draw, so a photo can orbit them.
   */
  update(
    dt: number,
    sub: SubInfo,
    camera: THREE.PerspectiveCamera,
    viewHeightPx: number,
    fogDensity: number,
  ): void {
    if (!this.enabled) return;
    if (dt > 0) this.sim.update(dt, sub);
    const fov = (camera.fov * Math.PI) / 180;
    const viewScale = viewHeightPx / (2 * Math.tan(fov / 2));
    this.render.sync(this.sim, sub, dt, viewScale, fogDensity);
    this.updateTargets(sub);
  }

  /**
   * One target per live species: keep the current individual while it stays
   * in range and in front, otherwise take the nearest one that faces the beam.
   */
  private updateTargets(sub: SubInfo): void {
    const best = new Map<string, { a: Agent; score: number }>();
    for (const a of this.sim.pool) {
      if (!a.alive || a.leaving || a.fade < 0.6) continue;
      const def = a.def;
      if (def.archetype === 'sessile' && a.fade < 0.9) continue;
      const dx = a.x - sub.x;
      const dy = a.y - sub.y;
      const dz = a.z - sub.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > def.scanRadius * 1.4) continue;
      const cos = d > 1e-6 ? (dx * sub.fx + dy * sub.fy + dz * sub.fz) / d : 1;
      // Prefer near and ahead; an animal behind the sub is a poor choice.
      const score = d / (0.35 + Math.max(0, cos));
      const cur = best.get(def.id);
      if (!cur || score < cur.score) best.set(def.id, { a, score });
    }
    this.targets.length = 0;
    for (const [id, { a }] of best) {
      let entry = this.bySpecies.get(id);
      if (!entry) {
        entry = {
          target: {
            id: LIFE_ID_PREFIX + id,
            name: a.def.common,
            landmarkId: this.landmarkId,
            position: new THREE.Vector3(),
            radius: a.def.scanRadius,
            scanSeconds: a.def.scanSeconds,
          },
          agent: a,
        };
        this.bySpecies.set(id, entry);
      }
      // Stickiness: keep the individual already being tracked while it is still a fair target.
      const held = entry.agent;
      if (held.alive && !held.leaving && held.def.id === id && held.fade > 0.6) {
        const d = Math.hypot(held.x - sub.x, held.y - sub.y, held.z - sub.z);
        const cos =
          d > 1e-6
            ? ((held.x - sub.x) * sub.fx + (held.y - sub.y) * sub.fy + (held.z - sub.z) * sub.fz) /
              d
            : 1;
        if (d <= a.def.scanRadius * 1.4 && cos > 0.2) entry.agent = held;
        else entry.agent = a;
      } else entry.agent = a;
      const t = entry.target;
      t.position.set(entry.agent.x, entry.agent.y, entry.agent.z);
      // A big animal is scanned by its body, not its centre: shrink the range check by half its length.
      t.radius = entry.agent.def.scanRadius + bodyLen(entry.agent) * 0.5;
      this.targets.push(t);
    }
  }

  /** The species a photo taken now would show: the animal nearest the frame centre. */
  animalInView(camera: THREE.PerspectiveCamera, maxDistanceM = 70): SpeciesDef | null {
    camera.updateMatrixWorld();
    let best: SpeciesDef | null = null;
    let bestScore = Infinity;
    for (const a of this.sim.pool) {
      if (!a.alive || a.fade < 0.5) continue;
      const toward = this.tmp.set(a.x, a.y, a.z).sub(camera.position);
      const d = toward.length();
      const size = bodyLen(a);
      if (d > Math.min(maxDistanceM, 18 + size * 14)) continue;
      this.proj.set(a.x, a.y, a.z).project(camera);
      if (this.proj.z < -1 || this.proj.z > 1) continue;
      if (Math.abs(this.proj.x) > 0.85 || Math.abs(this.proj.y) > 0.85) continue;
      // Centre of frame first, bigger and closer animals break ties.
      const score = this.proj.x * this.proj.x + this.proj.y * this.proj.y + d / (40 + size * 20);
      if (score < bestScore) {
        bestScore = score;
        best = a.def;
      }
    }
    return best;
  }

  /** Remove every animal (a restart or teleport). */
  clear(): void {
    this.sim.clear();
    this.render.clear();
    this.targets.length = 0;
    this.bySpecies.clear();
  }

  dispose(): void {
    this.render.dispose();
  }
}
