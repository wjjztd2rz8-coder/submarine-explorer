/**
 * The life simulation: a fixed pool of animals, grouped into schools,
 * swarms, patches and passing animals, spawned and despawned in a radius
 * around the sub from the site's table. Pure TypeScript (no Three.js, no
 * DOM), driven by an explicit `dt` and a seedable random source, so the
 * unit tests run it headless.
 *
 * What spawns where:
 *  - mobile groups (schools, drifters, cruisers, hoverers, swarms,
 *    cephalopods) are topped up toward each table row's `weight` while the
 *    sub is inside the row's depth band; a species may only start if the
 *    tier's draw-call budget has a slot (`maxSpecies`);
 *  - rooted animals and crawlers are placed by stable grid cell: a cell
 *    always rolls the same patch, so coral stays where it was when you
 *    come back;
 *  - one rare appearance per site, with a chance per minute and a cooldown.
 */

import { Agent, type Group, type SimEnv, type SubInfo } from './agent.js';
import { mulberry32, hash3, clamp, darkness, lerp, type Rand } from './rng.js';
import { integrate, moveHub, tickGroup, type SteerCtx } from './steer.js';
import {
  bandOverlap,
  buildEntries,
  cellChance,
  entryBand,
  inBand,
  isBedBound,
  isCellBound,
  pickActiveSpecies,
  type SpawnRow,
} from './tables.js';
import { SPECIES_BY_ID } from './catalogue.js';
import type { LifeTier, RareRule, SiteTable, SpeciesDef } from './types.js';

/** Steering tick rate. Positions integrate every frame; decisions run at this rate. */
export const TICK = 1 / 15;

export interface SimOptions {
  tier: LifeTier;
  table: SiteTable | undefined;
  env: SimEnv;
  rand?: Rand;
  /** Seed for the cell hash (a site always lays out the same corals). */
  seed?: number;
}

export interface SimStats {
  agents: number;
  groups: number;
  species: number;
  /** Live species ids. */
  liveSpecies: string[];
}

interface CellState {
  groups: Group[];
  done: Set<number>;
}

export class LifeSim {
  readonly tier: LifeTier;
  readonly env: SimEnv;
  readonly rand: Rand;
  readonly seed: number;
  readonly rows: SpawnRow[];
  readonly rare: RareRule | null;
  /** The pool; `alive` marks live entries. */
  readonly pool: Agent[];
  readonly groups: Group[] = [];
  readonly steer: SteerCtx;
  elapsed = 0;
  /** Species allowed to start new groups at the current depth. */
  activeRows: SpawnRow[] = [];
  /** Seconds until the next appearance may roll. */
  rareCooldown = 0;
  /** Called whenever the rare appearance is spawned. */
  onRare: ((def: SpeciesDef) => void) | null = null;

  private readonly free: Agent[] = [];
  private readonly cells = new Map<string, CellState>();
  private readonly speciesCount = new Map<string, number>();
  private nextId = 1;
  private tickAcc = 0;
  private spawnAcc = 0;
  private slowAcc = 0;
  private rareAcc = 0;
  private lastX = Infinity;
  private lastZ = Infinity;
  private started = false;

  constructor(opts: SimOptions) {
    this.tier = opts.tier;
    this.env = opts.env;
    this.rand = opts.rand ?? mulberry32(0x5eed);
    this.seed = opts.seed ?? 1;
    this.rows = buildEntries(opts.table);
    this.rare = opts.table?.rare ?? null;
    this.pool = Array.from({ length: opts.tier.maxAgents }, (_, i) => {
      const a = new Agent();
      a.id = i;
      return a;
    });
    for (let i = this.pool.length - 1; i >= 0; i--) this.free.push(this.pool[i]!);
    this.steer = {
      env: this.env,
      sub: undefined as unknown as SubInfo,
      rand: this.rand,
      tier: this.tier,
      elapsed: 0,
    };
  }

  /** Install the bioluminescence callback (the renderer emits sparks). */
  setFlashHandler(fn: ((a: Agent, strength: number) => void) | undefined): void {
    if (fn) this.steer.flash = fn;
    else delete this.steer.flash;
  }

  capacityOf(def: SpeciesDef): number {
    return Math.min(def.maxCount, this.tier.maxAgents);
  }

  get liveCount(): number {
    return this.pool.length - this.free.length;
  }

  countOf(speciesId: string): number {
    return this.speciesCount.get(speciesId) ?? 0;
  }

  stats(): SimStats {
    const live = [...this.speciesCount.entries()].filter(([, n]) => n > 0).map(([id]) => id);
    return {
      agents: this.liveCount,
      groups: this.groups.length,
      species: live.length,
      liveSpecies: live,
    };
  }

  /** Remove every animal at once (a teleport or a restart). */
  clear(): void {
    for (const a of this.pool) if (a.alive) this.release(a);
    this.groups.length = 0;
    this.cells.clear();
    this.speciesCount.clear();
    this.started = false;
  }

  // ------------------------------------------------------------- the frame

  update(dt: number, sub: SubInfo): void {
    this.steer.sub = sub;
    const R = this.tier.radius;
    if (!this.started || Math.hypot(sub.x - this.lastX, sub.z - this.lastZ) > R * 0.6) {
      if (this.started) this.clear();
      this.fillAround(sub);
    }
    this.lastX = sub.x;
    this.lastZ = sub.z;
    this.elapsed += dt;
    this.steer.elapsed = this.elapsed;

    this.tickAcc += Math.min(dt, 0.25);
    let ticks = 0;
    while (this.tickAcc >= TICK && ticks < 3) {
      this.tickAcc -= TICK;
      ticks++;
      for (const g of this.groups) {
        moveHub(g, this.steer, TICK);
        tickGroup(g, this.steer, TICK);
      }
    }
    if (this.tickAcc > TICK * 3) this.tickAcc = 0;

    for (const a of this.pool) {
      if (!a.alive) continue;
      if (!integrate(a, this.env, dt)) this.release(a);
    }

    this.spawnAcc += dt;
    if (this.spawnAcc >= 0.3) {
      this.spawnAcc = 0;
      this.spawnPass(sub, false);
      this.cellPass(sub, false);
    }
    this.slowAcc += dt;
    if (this.slowAcc >= 0.5) {
      this.slowAcc = 0;
      this.despawnPass(sub);
      this.refreshActive(sub);
    }
    this.rareAcc += dt;
    if (this.rareAcc >= 1) {
      this.rareAcc = 0;
      this.rareTick(sub);
    }
  }

  /** The first frame, a teleport: populate the whole radius now, without fades. */
  private fillAround(sub: SubInfo): void {
    this.started = true;
    this.steer.sub = sub;
    this.refreshActive(sub);
    for (let i = 0; i < 40; i++) this.spawnPass(sub, true);
    this.cellPass(sub, true);
    for (const a of this.pool) if (a.alive) a.fade = 1;
    // Settle the first positions and glow phases so frame zero is not a snapshot.
    for (let i = 0; i < 12; i++) for (const g of this.groups) tickGroup(g, this.steer, TICK);
  }

  private refreshActive(sub: SubInfo): void {
    const live = new Set<string>();
    for (const [id, n] of this.speciesCount) if (n > 0) live.add(id);
    const reach = this.tier.radius * 0.85;
    // One slot of the budget stays free for the site's rare appearance.
    const cap = Math.max(1, this.tier.maxSpecies - (this.rare ? 1 : 0));
    this.activeRows = pickActiveSpecies(this.rows, -sub.y, reach, cap, live);
  }

  // -------------------------------------------------------------- spawning

  private acquire(): Agent | undefined {
    return this.free.pop();
  }

  private release(a: Agent): void {
    if (!a.alive) return;
    a.alive = false;
    const id = a.def.id;
    this.speciesCount.set(id, Math.max(0, (this.speciesCount.get(id) ?? 1) - 1));
    const g = a.group;
    const i = g.members.indexOf(a);
    if (i >= 0) g.members.splice(i, 1);
    if (g.members.length === 0) {
      const gi = this.groups.indexOf(g);
      if (gi >= 0) this.groups.splice(gi, 1);
    }
    this.free.push(a);
  }

  private groupCount(rowIndex: number): number {
    let n = 0;
    for (const g of this.groups) if (g.row?.index === rowIndex && g.cell === '') n++;
    return n;
  }

  private newGroup(def: SpeciesDef, row: SpawnRow | null, x: number, y: number, z: number): Group {
    return {
      id: this.nextId++,
      def,
      row,
      members: [],
      gx: x,
      gy: y,
      gz: z,
      goalIn: 0,
      hx: x,
      hy: y,
      hz: z,
      spread: 6,
      dx: 0,
      dz: 1,
      targetY: y,
      alarm: 0,
      cx: x,
      cy: y,
      cz: z,
      avx: 0,
      avy: 0,
      avz: 0,
      cell: '',
      rare: false,
      curious: false,
      passed: false,
      age: 0,
    };
  }

  /** Put one animal in a group; returns it, or undefined when the pool or species cap is full. */
  private addAgent(g: Group, x: number, y: number, z: number, instant: boolean): Agent | undefined {
    const def = g.def;
    if (this.countOf(def.id) >= this.capacityOf(def)) return undefined;
    const a = this.acquire();
    if (!a) return undefined;
    const r = this.rand;
    a.alive = true;
    a.def = def;
    a.group = g;
    a.x = x;
    a.y = y;
    a.z = z;
    a.vx = a.vy = a.vz = 0;
    a.ex = a.ey = a.ez = 0;
    a.scale = 0.86 + 0.28 * r();
    a.fade = instant ? 1 : 0;
    a.leaving = false;
    a.age = 0;
    a.alarm = 0;
    a.glow = 0;
    a.flashIn = 4 + r() * 20;
    a.alt = 0;
    a.seed = r();
    a.hd = r() * Math.PI * 2;
    a.yaw = a.hd;
    a.pitch = 0;
    a.roll = 0;
    a.phase = r() * Math.PI * 2;
    a.timer = r() * 3;
    a.burst = 0;
    a.tx = x;
    a.ty = y;
    a.tz = z;
    a.cellKey = g.cell;
    a.d2 = 0;
    g.members.push(a);
    this.speciesCount.set(def.id, this.countOf(def.id) + 1);
    return a;
  }

  /** Pick the group size for a row, scaled a little by the tier's density. */
  private groupSize(row: SpawnRow | null, def: SpeciesDef, range?: [number, number]): number {
    const g = range ?? row?.entry.group ?? [1, 1];
    const n = lerp(g[0], g[1] + 0.999, this.rand());
    const k =
      def.archetype === 'sessile' || def.archetype === 'crawler'
        ? 1
        : 0.55 + 0.45 * this.tier.density;
    return Math.max(1, Math.floor(n * k));
  }

  /**
   * Create a mobile group of `def` centred at (x, y, z). Positions and the
   * archetype's initial state are set here; the steering takes it from there.
   */
  placeGroup(
    def: SpeciesDef,
    row: SpawnRow | null,
    x: number,
    y: number,
    z: number,
    n: number,
    instant: boolean,
  ): Group | null {
    const r = this.rand;
    const g = this.newGroup(def, row, x, y, z);
    const L = def.size * def.visScale;
    let radius: number;
    switch (def.archetype) {
      case 'school':
        radius = Math.max(1.2, Math.cbrt(n) * Math.max(0.5, L * 2.6));
        break;
      case 'swarm':
        radius = (def.size < 0.05 ? 2.4 : 3.2) + Math.cbrt(n) * 0.7;
        g.spread = radius;
        break;
      case 'drifter':
        radius = 5 + Math.cbrt(n) * 5;
        break;
      case 'hover':
      case 'cephalopod':
        radius = 2 + Math.sqrt(n) * 2;
        g.spread = 9 + radius;
        break;
      default:
        radius = 1;
    }
    const heading = r() * Math.PI * 2;
    g.gx = x + Math.sin(heading) * 20;
    g.gz = z + Math.cos(heading) * 20;
    g.gy = y;
    for (let i = 0; i < n; i++) {
      // Uniform in a sphere (flatter for bed animals).
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const rr = radius * Math.cbrt(r());
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      const flat = isBedBound(def) ? 0.35 : 1;
      const px = x + rr * s * Math.cos(th);
      let py = y + rr * u * flat;
      const pz = z + rr * s * Math.sin(th);
      const gnd = this.env.groundAt(px, pz);
      if (isBedBound(def)) {
        const alt = def.altitude ?? [1.5, 6];
        const a = this.addAgent(g, px, gnd + lerp(alt[0], alt[1], r()), pz, instant);
        if (a) a.alt = a.y - gnd;
        continue;
      }
      if (def.archetype !== 'cruiser') py = Math.max(py, gnd + 1.2 + L * 0.5);
      const a = this.addAgent(g, px, Math.min(py, -2.5), pz, instant);
      if (!a) continue;
      a.hd = heading + (r() - 0.5) * 0.6;
      const sp = lerp(def.speed[0], def.speed[1], 0.3);
      a.vx = Math.sin(a.hd) * sp;
      a.vz = Math.cos(a.hd) * sp;
      a.yaw = a.hd;
    }
    if (g.members.length === 0) return null;
    this.groups.push(g);
    return g;
  }

  /** Try to start a mobile group for a table row somewhere around the sub. */
  private spawnMobile(row: SpawnRow, sub: SubInfo, initial: boolean): Group | null {
    const def = row.def;
    const R = this.tier.radius;
    const r = this.rand;
    const band = entryBand(row);
    if (!band) return null;
    const subDepth = -sub.y;
    for (let attempt = 0; attempt < 6; attempt++) {
      const dist = initial ? R * (0.12 + 0.82 * r()) : R * (0.62 + 0.3 * r());
      const bearing = r() * Math.PI * 2;
      const x = sub.x + Math.sin(bearing) * dist;
      const z = sub.z + Math.cos(bearing) * dist;
      const gnd = this.env.groundAt(x, z);
      const gDepth = -gnd;
      let y: number;
      if (isBedBound(def)) {
        if (!inBand(gDepth, band, 4)) continue;
        const alt = def.altitude ?? [1.5, 6];
        y = gnd + (alt[0] + alt[1]) * 0.5;
        if (Math.abs(y - sub.y) > R * 0.85 || y > -2) continue;
      } else {
        const lo = Math.max(band[0], subDepth - R * 0.7, 2.5);
        const hi = Math.min(band[1], subDepth + R * 0.7, gDepth - 3);
        if (hi < lo) continue;
        y = -(lo + (hi - lo) * r());
      }
      const n = this.groupSize(row, def);
      if (def.archetype === 'cruiser') return this.placePasser(def, row, sub, band, false);
      return this.placeGroup(def, row, x, y, z, n, initial);
    }
    return null;
  }

  /**
   * Start a passing animal: a straight crossing that starts at the edge of
   * the radius. `overhead` crosses above the sub, otherwise at its depth
   * just outside the lights.
   */
  private placePasser(
    def: SpeciesDef,
    row: SpawnRow | null,
    sub: SubInfo,
    band: [number, number],
    overhead: boolean,
    count = 1,
  ): Group | null {
    const r = this.rand;
    const R = this.tier.radius;
    const bearing = r() * Math.PI * 2;
    const lateral = (overhead ? 6 + 24 * r() : 16 + 20 * r()) * (r() < 0.5 ? -1 : 1);
    // Path direction: toward the sub's side, offset sideways by `lateral`.
    const sx = Math.sin(bearing);
    const sz = Math.cos(bearing);
    const px = -sz;
    const pz = sx;
    const start = R * (def.size > 6 ? 1.1 : 0.95);
    const x0 = sub.x + sx * start + px * lateral;
    const z0 = sub.z + sz * start + pz * lateral;
    let dx = sub.x - x0 + px * lateral * 0;
    let dz = sub.z - z0;
    // Aim at the point `lateral` beside the sub, so the pass clears the hull.
    dx = -sx;
    dz = -sz;
    const gnd = this.env.groundAt(sub.x, sub.z);
    let y: number;
    if (overhead) y = Math.min(-5, sub.y + 14 + 26 * r());
    else y = sub.y + (r() * 2 - 1) * 6;
    y = clamp(y, -Math.min(band[1], def.depth[1]), -Math.max(band[0], def.depth[0], 3));
    y = Math.max(y, gnd + 4 + def.size * def.visScale * 0.5);
    y = Math.min(y, -3);
    const g = this.newGroup(def, row, x0, y, z0);
    g.dx = dx;
    g.dz = dz;
    g.targetY = y;
    g.curious = def.attract > 0.3 && r() < def.attract && !overhead;
    g.rare = row === null;
    const hd = Math.atan2(dx, dz);
    for (let i = 0; i < count; i++) {
      const a = this.addAgent(
        g,
        x0 + px * i * 4 - dx * i * 6,
        y + (r() - 0.5) * 2,
        z0 + pz * i * 4 - dz * i * 6,
        false,
      );
      if (!a) break;
      a.hd = hd;
      a.yaw = hd;
      const sp = lerp(def.speed[0], def.speed[1], 0.35);
      a.vx = dx * sp;
      a.vz = dz * sp;
    }
    if (g.members.length === 0) return null;
    this.groups.push(g);
    return g;
  }

  /** Top up mobile groups toward their weights. */
  private spawnPass(sub: SubInfo, initial: boolean): void {
    if (!this.activeRows.length) return;
    let budget = initial ? 1 : 2;
    const cap = Math.max(1, this.tier.maxSpecies - (this.rare ? 1 : 0));
    for (const row of this.activeRows) {
      if (budget <= 0) break;
      const def = row.def;
      if (isCellBound(def)) continue;
      if (this.liveCount >= this.pool.length * 0.97) break;
      const target = row.entry.weight * this.tier.density;
      const have = this.groupCount(row.index);
      const deficit = target - have;
      if (deficit <= 0) continue;
      if (this.rand() > Math.min(1, deficit) * (initial ? 1 : 0.4)) continue;
      const speciesLive = this.countOf(def.id) > 0;
      if (!speciesLive && this.liveSpeciesCount() >= cap) continue;
      if (this.spawnMobile(row, sub, initial)) budget--;
    }
  }

  private liveSpeciesCount(): number {
    let n = 0;
    for (const v of this.speciesCount.values()) if (v > 0) n++;
    return n;
  }

  // ----------------------------------------------------------------- cells

  /** Place rooted animals and crawlers in the grid cells that have come into range. */
  private cellPass(sub: SubInfo, initial: boolean): void {
    const rows = this.activeRows.filter((r) => isCellBound(r.def));
    if (!rows.length) return;
    const cell = this.tier.cell;
    // In the dark only the lit patch around the sub shows, so rooted animals concentrate there;
    // in bright water they fill the whole radius.
    const R = this.tier.radius * (0.5 + 0.5 * (1 - darkness(-sub.y)));
    const c0x = Math.floor((sub.x - R) / cell);
    const c1x = Math.floor((sub.x + R) / cell);
    const c0z = Math.floor((sub.z - R) / cell);
    const c1z = Math.floor((sub.z + R) / cell);
    let budget = initial ? 100000 : 14;
    const cap = Math.max(1, this.tier.maxSpecies - (this.rare ? 1 : 0));
    const sharedPool = this.pool.length * 0.62;
    // Nearest cells first, so a full pool never starves the ground under the sub.
    const todo: Array<[number, number, number]> = [];
    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cz = c0z; cz <= c1z; cz++) {
        const d = Math.hypot((cx + 0.5) * cell - sub.x, (cz + 0.5) * cell - sub.z);
        if (d <= R) todo.push([d, cx, cz]);
      }
    }
    todo.sort((p, q) => p[0] - q[0]);
    for (const [, cx, cz] of todo) {
      const mx = (cx + 0.5) * cell;
      const mz = (cz + 0.5) * cell;
      const key = `${cx},${cz}`;
      let st = this.cells.get(key);
      if (!st) {
        st = { groups: [], done: new Set() };
        this.cells.set(key, st);
      }
      for (const row of rows) {
        if (st.done.has(row.index)) continue;
        if (budget <= 0) return;
        const def = row.def;
        const live = this.countOf(def.id) > 0;
        if (!live && this.liveSpeciesCount() >= cap) continue;
        if (this.cellLiveCount() >= sharedPool) return;
        budget--;
        const band = entryBand(row);
        if (!band) {
          st.done.add(row.index);
          continue;
        }
        const gnd = this.env.groundAt(mx, mz);
        if (!inBand(-gnd, band, 6) || Math.abs(gnd - sub.y) > R + 30) {
          // Out of band (or the water is empty here): never roll this cell for this row.
          if (!inBand(-gnd, band, 6)) st.done.add(row.index);
          continue;
        }
        st.done.add(row.index);
        const roll = hash3(cx, cz, row.index * 131 + this.seed);
        const p = cellChance(
          row.entry.weight * (row.entry.star ? 1.25 : 1),
          this.tier.density,
          cell,
          R,
        );
        if (roll >= p) continue;
        const g = this.placePatch(row, key, cx, cz, cell, initial);
        if (g) st.groups.push(g);
      }
    }
  }

  private cellLiveCount(): number {
    let n = 0;
    for (const g of this.groups) if (g.cell !== '') n += g.members.length;
    return n;
  }

  /** A stable patch: its centre, size and every animal's spot come from the cell hash. */
  private placePatch(
    row: SpawnRow,
    key: string,
    cx: number,
    cz: number,
    cell: number,
    instant: boolean,
  ): Group | null {
    const def = row.def;
    const salt = row.index * 131 + this.seed;
    const h = (k: number): number => hash3(cx * 7 + k, cz * 13 - k, salt + k * 17);
    const x = (cx + 0.15 + 0.7 * h(1)) * cell;
    const z = (cz + 0.15 + 0.7 * h(2)) * cell;
    const g = this.newGroup(def, row, x, this.env.groundAt(x, z), z);
    g.cell = key;
    const range = row.entry.group;
    const n = Math.max(1, Math.floor(lerp(range[0], range[1] + 0.999, h(3))));
    const L = def.size * def.visScale;
    const radius =
      Math.max(0.8, Math.sqrt(n) * Math.max(0.5, L * 0.9)) *
      (def.archetype === 'crawler' ? 2.5 : 1);
    g.spread = def.archetype === 'crawler' ? radius + 5 : radius;
    for (let i = 0; i < n; i++) {
      const th = h(10 + i * 3) * Math.PI * 2;
      const rr = radius * Math.sqrt(h(11 + i * 3));
      const px = x + Math.cos(th) * rr;
      const pz = z + Math.sin(th) * rr;
      const a = this.addAgent(g, px, this.env.groundAt(px, pz), pz, instant);
      if (!a) break;
      a.scale = 0.7 + 0.6 * h(12 + i * 3);
      a.yaw = h(13 + i) * Math.PI * 2;
      a.hd = a.yaw;
      a.vx = a.vy = a.vz = 0;
    }
    if (g.members.length === 0) return null;
    this.groups.push(g);
    return g;
  }

  // ------------------------------------------------------------- despawning

  private despawnPass(sub: SubInfo): void {
    const R = this.tier.radius;
    const cell = this.tier.cell;
    // Patches go as a unit, with hysteresis so the edge does not flicker.
    for (const [key, st] of this.cells) {
      const [cx, cz] = key.split(',').map(Number) as [number, number];
      const d = Math.hypot((cx + 0.5) * cell - sub.x, (cz + 0.5) * cell - sub.z);
      if (d > R * 1.2 + cell * 0.5) {
        for (const g of st.groups) for (const m of g.members) m.leaving = true;
        this.cells.delete(key);
      }
    }
    for (const a of this.pool) {
      if (!a.alive || a.leaving) continue;
      const g = a.group;
      if (g.cell !== '') continue;
      const d = Math.sqrt((a.x - sub.x) ** 2 + (a.y - sub.y) ** 2 + (a.z - sub.z) ** 2);
      const limit = a.def.archetype === 'cruiser' ? R * 1.6 : R * 1.25;
      if (d > limit) {
        a.leaving = true;
        // A far animal needs no polite fade.
        if (d > limit * 1.15) a.fade = Math.min(a.fade, 0.05);
      } else if (a.def.archetype === 'cruiser' && g.age > 30 && d > R * 0.7) {
        // A passer that has crossed and is heading away leaves.
        const away = (a.x - sub.x) * a.vx + (a.z - sub.z) * a.vz;
        if (away > 0) a.leaving = true;
      } else if (a.age > 900 && a.def.archetype !== 'sessile' && a.def.archetype !== 'crawler') {
        a.leaving = true;
      }
    }
  }

  // ------------------------------------------------------------------ rare

  private rareTick(sub: SubInfo): void {
    const rule = this.rare;
    if (!rule) return;
    this.rareCooldown = Math.max(0, this.rareCooldown - 1);
    if (this.rareCooldown > 0) return;
    if (!inBand(-sub.y, rule.depth)) return;
    for (const g of this.groups) if (g.rare && g.members.length) return;
    const p = 1 - Math.exp(-rule.chancePerMin / 60);
    if (this.rand() < p) this.spawnRare(sub);
  }

  /** Start the site's rare appearance now (also the e2e and screenshot hook). */
  spawnRare(sub: SubInfo): Group | null {
    const rule = this.rare;
    if (!rule) return null;
    const def = SPECIES_BY_ID.get(rule.species);
    if (!def) return null;
    this.steer.sub = sub;
    this.rareCooldown = rule.cooldownS;
    const band = bandOverlap(rule.depth, def.depth) ?? rule.depth;
    let g: Group | null;
    if (def.archetype === 'swarm') {
      // A surge: a swarm blooms a short way ahead of the sub, in view.
      const n = this.groupSize(null, def, rule.group ?? [60, 100]);
      const fx = Math.hypot(sub.fx, sub.fz) || 1;
      const ahead = 16 + this.rand() * 8;
      const x = sub.x + (sub.fx / fx) * ahead;
      const z = sub.z + (sub.fz / fx) * ahead;
      const gnd = this.env.groundAt(x, z);
      const alt = def.altitude ?? [0.2, 2];
      g = this.placeGroup(def, null, x, gnd + (alt[0] + alt[1]) * 0.6, z, n, false);
      if (g) {
        g.rare = true;
        g.spread += 2;
      }
    } else if (def.archetype === 'cruiser') {
      g = this.placePasser(def, null, sub, band, rule.pass === 'overhead', rule.group?.[0] ?? 1);
    } else {
      const fx = Math.hypot(sub.fx, sub.fz) || 1;
      const x = sub.x + (sub.fx / fx) * 18;
      const z = sub.z + (sub.fz / fx) * 18;
      g = this.placeGroup(def, null, x, sub.y, z, this.groupSize(null, def, rule.group), false);
      if (g) g.rare = true;
    }
    if (g) this.onRare?.(def);
    return g;
  }

  // ------------------------------------------------------------ test hooks

  /**
   * Put a group of `speciesId` `ahead` metres in front of the sub, bypassing
   * the tables and the budget (e2e, screenshots and the Journal tests).
   */
  spawnNear(speciesId: string, sub: SubInfo, ahead = 14, count?: number): Group | null {
    const def = SPECIES_BY_ID.get(speciesId);
    if (!def) return null;
    this.steer.sub = sub;
    const fh = Math.hypot(sub.fx, sub.fz) || 1;
    const x = sub.x + (sub.fx / fh) * ahead;
    const z = sub.z + (sub.fz / fh) * ahead;
    const gnd = this.env.groundAt(x, z);
    const n = count ?? (def.archetype === 'school' ? 12 : 1);
    if (def.archetype === 'sessile' || def.archetype === 'crawler') {
      const row = this.rows.find((r) => r.def.id === speciesId) ?? null;
      const g = this.newGroup(def, row, x, gnd, z);
      g.cell = `test:${this.nextId}`;
      g.spread = 4;
      for (let i = 0; i < n; i++) {
        const a = this.addAgent(
          g,
          x + (i % 3) * 0.9,
          this.env.groundAt(x + (i % 3) * 0.9, z),
          z + Math.floor(i / 3) * 0.9,
          true,
        );
        if (a) a.yaw = this.rand() * 6.28;
      }
      if (!g.members.length) return null;
      this.groups.push(g);
      return g;
    }
    if (def.archetype === 'cruiser') {
      const g = this.placePasser(def, null, sub, [0, 12000], false);
      if (g) {
        const m = g.members[0]!;
        m.x = x;
        m.y = clamp(sub.y, gnd + 3, -3);
        m.z = z;
        g.targetY = m.y;
        // Cross in front of the lamps, left to right.
        g.dx = -sub.fz / fh;
        g.dz = sub.fx / fh;
        m.hd = Math.atan2(g.dx, g.dz);
        m.fade = 1;
      }
      return g;
    }
    const y = isBedBound(def)
      ? gnd + ((def.altitude?.[0] ?? 1) + (def.altitude?.[1] ?? 3)) * 0.5
      : clamp(sub.y, gnd + 3, -3);
    return this.placeGroup(def, null, x, y, z, n, true);
  }
}
