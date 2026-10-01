/**
 * Steering: how each movement archetype decides where to go, and how the
 * animals react to the sub (its lights, its speed, its thruster wash).
 *
 * Two entry points, both allocation-free and independent of Three.js:
 *  - {@link tickGroup}: low-rate (15 Hz) decisions for one group, which set
 *    each animal's own velocity and heading;
 *  - {@link integrate}: per-frame motion, orientation and animation phase.
 *
 * Every archetype ends in the same bounds step (stay above the seabed and
 * below the surface, inside its depth band, out of the hull) so no animal
 * can be steered into terrain whatever the table says.
 */

import { Agent, type Group, type SimEnv, type SubInfo } from './agent.js';
import { clamp, lerp, type Rand } from './rng.js';
import type { LifeTier } from './types.js';

/** Everything a steering step reads. */
export interface SteerCtx {
  env: SimEnv;
  sub: SubInfo;
  rand: Rand;
  tier: LifeTier;
  /** Seconds since the sim started. */
  elapsed: number;
  /** Called when an animal flashes (bioluminescence); the renderer emits sparks. */
  flash?: (a: Agent, strength: number) => void;
}

/** Scratch vector for the steering sums (no allocation per animal). */
const des = { x: 0, y: 0, z: 0 };
const cur = { x: 0, y: 0, z: 0 };
const goalV = { x: 0, y: 0, z: 0 };

export const TWO_PI = Math.PI * 2;
export const wrapAngle = (a: number): number => {
  let v = (a + Math.PI) % TWO_PI;
  if (v < 0) v += TWO_PI;
  return v - Math.PI;
};

export const bodyLen = (a: Agent): number => a.def.size * a.def.visScale * a.scale;

/** The animal's own speed, m/s. */
export const speedOf = (a: Agent): number => Math.hypot(a.vx, a.vy, a.vz);

/** Depth of an animal in positive metres. */
export const depthOf = (a: Agent): number => -a.y;

function norm3(v: { x: number; y: number; z: number }): number {
  const l = Math.hypot(v.x, v.y, v.z);
  if (l > 1e-6) {
    v.x /= l;
    v.y /= l;
    v.z /= l;
  }
  return l;
}

/** Move `v` toward the desired velocity, limited to `accel` m/s per second. */
function approach(a: Agent, dx: number, dy: number, dz: number, accel: number, dt: number): void {
  let ax = dx - a.vx;
  let ay = dy - a.vy;
  let az = dz - a.vz;
  const l = Math.hypot(ax, ay, az);
  const max = accel * dt;
  if (l > max && l > 1e-9) {
    const k = max / l;
    ax *= k;
    ay *= k;
    az *= k;
  }
  a.vx += ax;
  a.vy += ay;
  a.vz += az;
}

function limitSpeed(a: Agent, max: number): void {
  const s = speedOf(a);
  if (s > max && s > 1e-9) {
    const k = max / s;
    a.vx *= k;
    a.vy *= k;
    a.vz *= k;
  }
}

/** Seabed height under and ahead of the animal (the higher of the two). */
function groundAhead(a: Agent, env: SimEnv, lookS: number): number {
  const g0 = env.groundAt(a.x, a.z);
  const g1 = env.groundAt(a.x + a.vx * lookS, a.z + a.vz * lookS);
  return g1 > g0 ? g1 : g0;
}

/**
 * Add the "stay in the world" terms to the desired velocity: lift over the
 * seabed (looking ahead), sink below the surface, ease back into the depth
 * band, and keep out of the hull.
 */
function applyBounds(a: Agent, g: Group, ctx: SteerCtx, speed: number): void {
  const L = bodyLen(a);
  const gnd = groundAhead(a, ctx.env, 1.4);
  const clear = Math.max(1.2, L * 0.8) + (a.def.archetype === 'cruiser' ? L * 0.6 : 0);
  const bedHolder = a.def.archetype === 'hover' || a.def.archetype === 'swarm';
  if (!bedHolder && a.y < gnd + clear) des.y += Math.min(3, (gnd + clear - a.y) * 1.6);
  const top = -2.2 - L * 0.25;
  if (a.y > top) des.y -= Math.min(2.5, (a.y - top) * 1.4);
  const band = g.row ? g.row.entry.depth : a.def.depth;
  if (!bedHolder) {
    const lo = -Math.min(band[1], a.def.depth[1]);
    const hi = -Math.max(band[0], a.def.depth[0]);
    if (a.y > hi) des.y -= Math.min(1.5, (a.y - hi) * 0.4);
    else if (a.y < lo) des.y += Math.min(1.5, (lo - a.y) * 0.4);
  }
  const s = ctx.sub;
  const rx = a.x - s.x;
  const ry = a.y - s.y;
  const rz = a.z - s.z;
  const d = Math.hypot(rx, ry, rz);
  const keep = s.hullR + L * 0.6 + 2;
  if (d < keep && d > 1e-6) {
    const k = ((1 - d / keep) * Math.max(1.5, speed) * 3) / d;
    des.x += rx * k;
    des.y += ry * k;
    des.z += rz * k;
  }
}

/** Fright, attraction, wash and bioluminescence, once per tick. */
function react(a: Agent, ctx: SteerCtx, dt: number): void {
  const def = a.def;
  const s = ctx.sub;
  const rx = a.x - s.x;
  const ry = a.y - s.y;
  const rz = a.z - s.z;
  const d2 = rx * rx + ry * ry + rz * rz;
  a.d2 = d2;
  const d = Math.sqrt(d2);
  const L = bodyLen(a);
  a.alarm *= Math.exp(-0.55 * dt);
  if (a.alarm < 0.01) a.alarm = 0;

  if (def.skittish > 0.01 && d < 90) {
    let fright = 0;
    if (s.lightsOn && d < 60) {
      const axial = rx * s.fx + ry * s.fy + rz * s.fz;
      if (axial > 0) {
        const perp2 = d2 - axial * axial;
        const w = axial * 0.62 + 2.5; // roughly the beam's half-width at this range
        if (perp2 < w * w) fright += (1 - def.attract) * 1.4;
      }
    }
    if (s.speed > 2.5 && d < 12 + s.speed * 2) fright += Math.min(1.5, s.speed / 6) * 0.9;
    if (d < 5 + L) fright += 1.4;
    if (fright > 0) a.alarm = Math.min(1, a.alarm + def.skittish * fright * dt * 3.2);
  }

  // Thruster wash: a plume behind the sub pushes the light and the loose.
  if (s.speed > 0.8 && def.wash > 0 && d < 24) {
    const along = -(rx * s.fx + ry * s.fy + rz * s.fz);
    if (along > 0.5 && along < 18) {
      const width = 2.2 + along * 0.38;
      const lat2 = d2 - along * along;
      if (lat2 < width * width) {
        const k = def.wash * Math.min(1, s.speed / 5) * (1 - along / 18) * 10 * dt;
        const lat = Math.sqrt(Math.max(lat2, 1e-6));
        // Backward along the wake, and outward from its axis.
        const ox = (rx + s.fx * along) / lat;
        const oy = (ry + s.fy * along) / lat;
        const oz = (rz + s.fz * along) / lat;
        a.ex += -s.fx * k * 0.6 + ox * k * 0.45;
        a.ey += -s.fy * k * 0.6 + oy * k * 0.45;
        a.ez += -s.fz * k * 0.6 + oz * k * 0.45;
        if (def.glow === 'flash' && k > 0.02 && a.glow < 0.3) ctx.flash?.(a, 0.8);
      }
    }
  }
  // Bow push: whatever is dead ahead and close is shouldered aside.
  const reach = s.hullR * 2.4 + L;
  if (d < reach && d > 1e-6) {
    const k = ((1 - d / reach) * (1.2 + s.speed * 0.5) * dt * 6) / d;
    a.ex += rx * k;
    a.ey += ry * k;
    a.ez += rz * k;
  }
  const exMax = 7;
  const exL = Math.hypot(a.ex, a.ey, a.ez);
  if (exL > exMax) {
    const k = exMax / exL;
    a.ex *= k;
    a.ey *= k;
    a.ez *= k;
  }

  // Bioluminescence: spontaneous flashes in the dark, stronger when frightened.
  if (def.glow === 'flash') {
    a.flashIn -= dt;
    const dark = clamp((depthOf(a) - 120) / 330, 0, 1);
    if (a.flashIn <= 0) {
      a.flashIn = 9 + ctx.rand() * 26;
      if (dark > 0.25 && a.glow < 0.2) ctx.flash?.(a, 0.55 + 0.45 * dark);
    }
    if (a.alarm > 0.5 && a.glow < 0.25) ctx.flash?.(a, 1);
  } else if (def.glow === 'photophores' && a.alarm > 0.45 && a.glow < 0.25) {
    ctx.flash?.(a, 1);
  }
}

/** Direction (unit) the animal flees: away from the sub, flattened a little. */
function fleeDir(a: Agent, ctx: SteerCtx): void {
  const s = ctx.sub;
  des.x = a.x - s.x;
  des.y = (a.y - s.y) * 0.45;
  des.z = a.z - s.z;
  // A little individual spread so a school fans out instead of moving as one.
  des.x += (a.seed - 0.5) * 0.9;
  des.z += (fract(a.seed * 7.31) - 0.5) * 0.9;
  des.y += (fract(a.seed * 3.77) - 0.5) * 0.6;
  norm3(des);
}

const fract = (v: number): number => v - Math.floor(v);

function attractTarget(a: Agent, ctx: SteerCtx, speed: number): void {
  const def = a.def;
  const s = ctx.sub;
  if (!s.lightsOn || def.attract < 0.02) return;
  const rx = a.x - s.x;
  const ry = a.y - s.y;
  const rz = a.z - s.z;
  const d = Math.hypot(rx, ry, rz);
  if (d > 60 || d < 1e-6) return;
  const axial = rx * s.fx + ry * s.fy + rz * s.fz;
  if (axial / d < 0.55) return;
  // Drawn into the beam a few metres ahead of the lamps, never into the hull.
  const px = s.x + s.fx * 7;
  const py = s.y + s.fy * 7;
  const pz = s.z + s.fz * 7;
  const tx = px - a.x;
  const ty = py - a.y;
  const tz = pz - a.z;
  const l = Math.hypot(tx, ty, tz);
  if (l < 1e-6) return;
  const k = (def.attract * speed) / l;
  des.x += tx * k;
  des.y += ty * k;
  des.z += tz * k;
}

// ---------------------------------------------------------------- groups

/** Refresh a group's centroid and mean velocity; returns the live member count. */
export function groupStats(g: Group): number {
  let n = 0;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  let vx = 0;
  let vy = 0;
  let vz = 0;
  for (const m of g.members) {
    if (!m.alive || m.leaving) continue;
    n++;
    cx += m.x;
    cy += m.y;
    cz += m.z;
    vx += m.vx;
    vy += m.vy;
    vz += m.vz;
  }
  if (n > 0) {
    g.cx = cx / n;
    g.cy = cy / n;
    g.cz = cz / n;
    g.avx = vx / n;
    g.avy = vy / n;
    g.avz = vz / n;
  }
  return n;
}

/** A goal for a school or patrol: somewhere new within reach, inside its band and over the water. */
function pickGoal(g: Group, ctx: SteerCtx, reach: number): void {
  const r = ctx.rand;
  const gx = g.cx + (r() * 2 - 1) * reach;
  const gz = g.cz + (r() * 2 - 1) * reach;
  const band = g.row ? g.row.entry.depth : g.def.depth;
  const lo = -Math.min(band[1], g.def.depth[1]) + 1;
  const hi = -Math.max(band[0], g.def.depth[0]) - 1;
  const gnd = ctx.env.groundAt(gx, gz);
  let gy = g.cy + (r() * 2 - 1) * Math.min(10, reach * 0.3);
  gy = clamp(gy, Math.max(lo, gnd + 3), Math.min(hi, -3.5));
  if (gy < Math.max(lo, gnd + 3)) gy = Math.max(lo, gnd + 3);
  g.gx = gx;
  g.gy = gy;
  g.gz = gz;
  g.goalIn = 9 + r() * 12;
}

/** One steering tick for a whole group. */
export function tickGroup(g: Group, ctx: SteerCtx, dt: number): void {
  g.age += dt;
  g.alarm *= Math.exp(-0.6 * dt);
  const n = groupStats(g);
  if (n === 0) return;
  const def = g.def;
  if (def.archetype === 'sessile') {
    for (const m of g.members) if (m.alive) m.d2 = distSq(m, ctx.sub);
    return;
  }
  g.goalIn -= dt;
  if (g.goalIn <= 0 && (def.archetype === 'school' || def.archetype === 'hover')) {
    pickGoal(g, ctx, def.archetype === 'school' ? 38 : 14);
  }
  for (const a of g.members) {
    if (!a.alive || a.leaving) continue;
    react(a, ctx, dt);
    if (a.alarm > g.alarm) g.alarm = a.alarm;
    switch (def.archetype) {
      case 'school':
        stepSchool(a, g, ctx, dt);
        break;
      case 'hover':
      case 'cephalopod':
        stepBed(a, g, ctx, dt);
        break;
      case 'cruiser':
        stepCruiser(a, g, ctx, dt);
        break;
      case 'drifter':
        stepDrifter(a, g, ctx, dt);
        break;
      case 'swarm':
        stepSwarm(a, g, ctx, dt);
        break;
      case 'crawler':
        stepCrawler(a, g, ctx, dt);
        break;
      default:
        break;
    }
  }
}

const distSq = (a: Agent, s: SubInfo): number =>
  (a.x - s.x) ** 2 + (a.y - s.y) ** 2 + (a.z - s.z) ** 2;

// ----------------------------------------------------------------- school

function stepSchool(a: Agent, g: Group, ctx: SteerCtx, dt: number): void {
  const def = a.def;
  const L = bodyLen(a);
  const sep = Math.max(0.4, L * 1.7);
  const view = sep * 5;
  const cruise = lerp(def.speed[0], def.speed[1], 0.28) * (0.85 + 0.3 * a.seed);
  let sx = 0;
  let sy = 0;
  let sz = 0;
  let ax = 0;
  let ay = 0;
  let az = 0;
  let nn = 0;
  const sep2 = sep * sep;
  const view2 = view * view;
  for (const b of g.members) {
    if (b === a || !b.alive || b.leaving) continue;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < sep2 && d2 > 1e-8) {
      const d = Math.sqrt(d2);
      const w = (1 - d / sep) / d;
      sx += dx * w;
      sy += dy * w;
      sz += dz * w;
    }
    if (d2 < view2) {
      ax += b.vx;
      ay += b.vy;
      az += b.vz;
      nn++;
    }
  }
  // Cohesion toward the centroid grows with distance from it.
  let cx = g.cx - a.x;
  let cy = g.cy - a.y;
  let cz = g.cz - a.z;
  const cd = Math.hypot(cx, cy, cz);
  const cohesion = clamp(cd / (view * 1.2), 0, 1);
  if (cd > 1e-6) {
    cx /= cd;
    cy /= cd;
    cz /= cd;
  }
  goalV.x = g.gx - a.x;
  goalV.y = g.gy - a.y;
  goalV.z = g.gz - a.z;
  norm3(goalV);
  const gx = goalV.x;
  const gy = goalV.y;
  const gz = goalV.z;
  if (nn > 0) {
    const l = Math.hypot(ax, ay, az);
    if (l > 1e-6) {
      ax /= l;
      ay /= l;
      az /= l;
    }
  }
  des.x = sx * cruise * 2.4 + ax * cruise * 0.9 + cx * cruise * cohesion * 1.1 + gx * cruise * 0.55;
  des.y = sy * cruise * 2.4 + ay * cruise * 0.9 + cy * cruise * cohesion * 1.1 + gy * cruise * 0.35;
  des.z = sz * cruise * 2.4 + az * cruise * 0.9 + cz * cruise * cohesion * 1.1 + gz * cruise * 0.55;
  let want = Math.max(cruise, 0.1);
  const l0 = norm3(des);
  if (l0 < 1e-6) {
    des.x = a.vx;
    des.z = a.vz;
    norm3(des);
  }
  des.x *= want;
  des.y *= want;
  des.z *= want;
  // Fright: the individual bolts away, the group's alarm carries to its neighbours.
  const alarm = Math.max(a.alarm, g.alarm * 0.85);
  if (alarm > 0.05) {
    const sx0 = des.x;
    const sy0 = des.y;
    const sz0 = des.z;
    fleeDir(a, ctx);
    want = lerp(want, def.speed[1], clamp(alarm * 1.5, 0, 1));
    const m = clamp(alarm * 1.6, 0, 1);
    des.x = lerp(sx0, des.x * want, m);
    des.y = lerp(sy0, des.y * want, m);
    des.z = lerp(sz0, des.z * want, m);
  }
  attractTarget(a, ctx, cruise);
  applyBounds(a, g, ctx, cruise);
  const max = lerp(def.speed[1], def.speed[1] * 1.15, alarm);
  limitDes(max);
  approach(a, des.x, des.y, des.z, 3 + alarm * 7, dt);
  limitSpeed(a, max);
}

function limitDes(max: number): void {
  const l = Math.hypot(des.x, des.y, des.z);
  if (l > max && l > 1e-9) {
    const k = max / l;
    des.x *= k;
    des.y *= k;
    des.z *= k;
  }
}

// -------------------------------------------------- bed-bound and cephalopods

function stepBed(a: Agent, g: Group, ctx: SteerCtx, dt: number): void {
  const def = a.def;
  const r = ctx.rand;
  a.timer -= dt;
  if (a.timer <= 0) {
    a.hd += (r() * 2 - 1) * 1.1;
    a.timer = 3 + r() * 6;
    a.burst = r() < (def.archetype === 'cephalopod' ? 0.35 : 0.2) ? 1 : 0;
  }
  // Leash to the patrol centre.
  const hx = g.hx - a.x;
  const hz = g.hz - a.z;
  const hd = Math.hypot(hx, hz);
  if (hd > g.spread) a.hd = Math.atan2(hx, hz);
  let sp = lerp(def.speed[0], def.speed[1], 0.12 + 0.3 * a.burst);
  if (def.archetype === 'cephalopod') sp *= 0.55 + 0.9 * Math.max(0, Math.sin(a.phase * 0.5));
  const gnd = ctx.env.groundAt(a.x, a.z);
  const want = gnd + a.alt;
  des.x = Math.sin(a.hd) * sp;
  des.z = Math.cos(a.hd) * sp;
  des.y = clamp((want - a.y) * 0.7, -0.6, 0.6);
  const alarm = a.alarm;
  if (alarm > 0.05) {
    const ox = des.x;
    const oy = des.y;
    const oz = des.z;
    fleeDir(a, ctx);
    const burstSp = def.speed[1] * (def.archetype === 'cephalopod' ? 1.1 : 1);
    const m = clamp(alarm * 1.6, 0, 1);
    des.x = lerp(ox, des.x * burstSp, m);
    des.y = lerp(oy, des.y * burstSp, m);
    des.z = lerp(oz, des.z * burstSp, m);
    a.hd = Math.atan2(des.x, des.z);
  }
  attractTarget(a, ctx, sp + 0.2);
  applyBounds(a, g, ctx, sp);
  approach(a, des.x, des.y, des.z, 1.2 + alarm * 6, dt);
  limitSpeed(a, def.speed[1] * 1.2);
}

// ----------------------------------------------------------------- cruiser

function stepCruiser(a: Agent, g: Group, ctx: SteerCtx, dt: number): void {
  const def = a.def;
  const s = ctx.sub;
  const L = bodyLen(a);
  let tdx = g.dx;
  let tdz = g.dz;
  if (g.curious && !g.passed) {
    const rx = s.x - a.x;
    const rz = s.z - a.z;
    const d = Math.hypot(rx, rz);
    if (d < Math.max(8, L * 1.6)) g.passed = true;
    else if (d < 90) {
      // Swing past a few body lengths off the sub's beam, not through it.
      tdx = rx / d;
      tdz = rz / d;
    }
  }
  const want = Math.atan2(tdx, tdz);
  const turn = (def.archetype === 'cruiser' && L < 4 ? 0.7 : 0.3) * dt;
  a.hd += clamp(wrapAngle(want - a.hd), -turn, turn);
  const cruise = lerp(def.speed[0], def.speed[1], 0.3 + 0.2 * Math.sin(g.age * 0.31 + a.seed * 6));
  des.x = Math.sin(a.hd) * cruise;
  des.z = Math.cos(a.hd) * cruise;
  des.y = clamp((g.targetY - a.y) * 0.12, -0.7, 0.7);
  // Look well ahead for the seabed: a long animal turns slowly.
  const gnd = groundAhead(a, ctx.env, 4);
  if (a.y < gnd + L * 0.7 + 2) des.y += Math.min(2, (gnd + L * 0.7 + 2 - a.y) * 0.5);
  const sx = des.x;
  const sz = des.z;
  applyBounds(a, g, ctx, cruise);
  // Cruisers keep their line: only the vertical terms and the hull push apply.
  des.x = sx + (des.x - sx) * 0.5;
  des.z = sz + (des.z - sz) * 0.5;
  // Curiosity draws attract-prone animals to the lamps.
  if (def.attract > 0.3) attractTarget(a, ctx, cruise * 0.5);
  limitDes(def.speed[1]);
  approach(a, des.x, des.y, des.z, 0.9, dt);
}

// ----------------------------------------------------------------- drifter

function stepDrifter(a: Agent, g: Group, ctx: SteerCtx, dt: number): void {
  const def = a.def;
  const r = ctx.rand;
  a.timer -= dt;
  if (a.timer <= 0) {
    a.hd += (r() * 2 - 1) * 1.0;
    a.timer = 6 + r() * 9;
  }
  const pulse = Math.max(0, Math.sin(a.phase));
  const sp = lerp(def.speed[0], def.speed[1], pulse * pulse) * (0.45 + 0.55 * a.seed);
  des.x = Math.sin(a.hd) * sp;
  des.z = Math.cos(a.hd) * sp;
  des.y = 0.05 * Math.sin(a.phase * 0.3 + a.seed * 6.28);
  // Loose cohesion keeps a swarm of drifters in one neighbourhood.
  const cdx = g.cx - a.x;
  const cdz = g.cz - a.z;
  const cd = Math.hypot(cdx, cdz);
  if (cd > 18) {
    des.x += (cdx / cd) * 0.06;
    des.z += (cdz / cd) * 0.06;
  }
  if (ctx.env.current) {
    ctx.env.current(a.x, a.z, cur);
    des.x += cur.x * 0.7;
    des.y += cur.y * 0.7;
    des.z += cur.z * 0.7;
  }
  applyBounds(a, g, ctx, 0.3);
  limitDes(def.speed[1] * 1.6);
  approach(a, des.x, des.y, des.z, 0.4, dt);
}

// ------------------------------------------------------------------ swarm

function stepSwarm(a: Agent, g: Group, ctx: SteerCtx, dt: number): void {
  const def = a.def;
  const r = ctx.rand;
  a.timer -= dt;
  if (a.timer <= 0) {
    const R = g.spread;
    a.tx = g.hx + (r() * 2 - 1) * R;
    a.tz = g.hz + (r() * 2 - 1) * R;
    const gnd = ctx.env.groundAt(a.tx, a.tz);
    a.ty = gnd + def.altitude![0] + r() * (def.altitude![1] - def.altitude![0]);
    a.timer = 0.8 + r() * 2.6;
    a.burst = r() < 0.55 ? 1 : 0;
  }
  const tx = a.tx - a.x;
  const ty = a.ty - a.y;
  const tz = a.tz - a.z;
  const td = Math.hypot(tx, ty, tz) || 1;
  const sp = lerp(def.speed[0], def.speed[1], a.burst * (0.4 + 0.6 * a.seed));
  des.x = (tx / td) * sp;
  des.y = (ty / td) * sp;
  des.z = (tz / td) * sp;
  const alarm = a.alarm;
  if (alarm > 0.05) {
    const ox = des.x;
    const oy = des.y;
    const oz = des.z;
    fleeDir(a, ctx);
    const m = clamp(alarm * 1.6, 0, 1);
    des.x = lerp(ox, des.x * def.speed[1], m);
    des.y = lerp(oy, des.y * def.speed[1], m);
    des.z = lerp(oz, des.z * def.speed[1], m);
  }
  attractTarget(a, ctx, sp + 0.15);
  applyBounds(a, g, ctx, sp);
  approach(a, des.x, des.y, des.z, 2.2 + alarm * 3, dt);
  limitSpeed(a, def.speed[1] * 1.2);
}

/** Swarm hubs drift toward the beam when the lamps are on and the animals are drawn to it. */
export function moveHub(g: Group, ctx: SteerCtx, dt: number): void {
  const def = g.def;
  const s = ctx.sub;
  if (def.archetype !== 'swarm' || !s.lightsOn || def.attract < 0.02) return;
  const rx = g.hx - s.x;
  const ry = g.hy - s.y;
  const rz = g.hz - s.z;
  const d = Math.hypot(rx, ry, rz);
  if (d > 40 || d < 1e-6) return;
  if ((rx * s.fx + ry * s.fy + rz * s.fz) / d < 0.6) return;
  const tx = s.x + s.fx * 9;
  const tz = s.z + s.fz * 9;
  const k = Math.min(1, 0.5 * def.attract * dt);
  const nx = g.hx + (tx - g.hx) * k;
  const nz = g.hz + (tz - g.hz) * k;
  // Never let the hub leave the water over the seabed band it lives in.
  const gnd = ctx.env.groundAt(nx, nz);
  if (Math.abs(gnd - ctx.env.groundAt(g.hx, g.hz)) < 6) {
    g.hx = nx;
    g.hz = nz;
    g.hy = gnd + (def.altitude![0] + def.altitude![1]) * 0.5;
  }
}

// ----------------------------------------------------------------- crawler

function stepCrawler(a: Agent, g: Group, ctx: SteerCtx, dt: number): void {
  const def = a.def;
  const r = ctx.rand;
  a.timer -= dt;
  if (a.timer <= 0) {
    a.burst = r() < 0.5 ? 1 : 0;
    a.hd += (r() * 2 - 1) * 1.3;
    a.timer = 4 + r() * 10;
  }
  const hx = g.hx - a.x;
  const hz = g.hz - a.z;
  if (Math.hypot(hx, hz) > g.spread) a.hd = Math.atan2(hx, hz);
  const sp = a.burst * lerp(def.speed[0], def.speed[1], a.seed);
  a.vx = Math.sin(a.hd) * sp;
  a.vz = Math.cos(a.hd) * sp;
  a.vy = 0;
  a.y = ctx.env.groundAt(a.x, a.z);
  // Frightened crawlers freeze: a still animal is a rock.
  if (a.alarm > 0.3) {
    a.vx = 0;
    a.vz = 0;
  }
}

// ------------------------------------------------------------- integration

const shortestTo = (from: number, to: number): number => wrapAngle(to - from);

/**
 * Per-frame motion: positions from velocity, orientation toward the heading,
 * animation phase, fade and glow decay. Returns false once an animal has
 * faded out completely (the caller frees it).
 */
export function integrate(a: Agent, env: SimEnv, dt: number): boolean {
  const def = a.def;
  a.age += dt;
  if (a.leaving) a.fade -= dt / 1.4;
  else if (a.fade < 1) a.fade = Math.min(1, a.fade + dt / 1.4);
  if (a.fade <= 0) return false;

  const sess = def.archetype === 'sessile';
  if (!sess) {
    a.x += (a.vx + a.ex) * dt;
    a.y += (a.vy + a.ey) * dt;
    a.z += (a.vz + a.ez) * dt;
    const kd = def.archetype === 'drifter' ? 0.55 : 1.6;
    const k = Math.exp(-kd * dt);
    a.ex *= k;
    a.ey *= k;
    a.ez *= k;
    // Hard floor and ceiling: no animal can end a frame in rock or air.
    if (def.archetype !== 'crawler') {
      const L = bodyLen(a);
      const gnd = env.groundAt(a.x, a.z) + Math.max(0.12, L * 0.25);
      if (a.y < gnd) {
        a.y = gnd;
        if (a.vy < 0) a.vy = 0;
        if (a.ey < 0) a.ey = 0;
      }
      if (a.y > -0.6 - L * 0.2) {
        a.y = -0.6 - L * 0.2;
        if (a.vy > 0) a.vy = 0;
      }
    }
  }
  const tvx = a.vx + a.ex;
  const tvy = a.vy + a.ey;
  const tvz = a.vz + a.ez;
  const hs = Math.hypot(tvx, tvz);
  const sp = Math.hypot(tvx, tvy, tvz);

  switch (def.archetype) {
    case 'sessile':
      break;
    case 'drifter': {
      // Medusae stay upright; they lean a little into a pulse and the push.
      a.yaw += 0.12 * dt;
      a.pitch += (clamp(tvz * 0.4, -0.25, 0.25) - a.pitch) * (1 - Math.exp(-2 * dt));
      a.roll += (clamp(-tvx * 0.4, -0.25, 0.25) - a.roll) * (1 - Math.exp(-2 * dt));
      break;
    }
    case 'crawler': {
      a.yaw += shortestTo(a.yaw, a.hd) * (1 - Math.exp(-2.5 * dt));
      break;
    }
    default: {
      if (hs > 0.04) {
        a.yaw += shortestTo(a.yaw, Math.atan2(tvx, tvz)) * (1 - Math.exp(-5 * dt));
      }
      const tp = hs > 0.04 ? clamp(Math.atan2(tvy, hs), -0.7, 0.7) : 0;
      a.pitch += (tp - a.pitch) * (1 - Math.exp(-4 * dt));
      a.roll *= Math.exp(-3 * dt);
    }
  }

  // Animation phase: the beat quickens with effort.
  let rate = def.freq;
  switch (def.anim) {
    case 'wave':
    case 'ceph':
      rate *= 0.35 + 0.95 * clamp(sp / Math.max(0.2, def.speed[1]), 0, 1.3);
      break;
    case 'crawl':
      rate *= Math.abs(a.vx) + Math.abs(a.vz) > 0.0005 ? 1 : 0.15;
      break;
    default:
      break;
  }
  a.phase += dt * rate;
  if (a.phase > 1e4) a.phase -= 1e4;
  a.glow *= Math.exp(-2.1 * dt);
  return true;
}
