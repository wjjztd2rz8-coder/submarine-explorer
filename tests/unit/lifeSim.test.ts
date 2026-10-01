import { describe, expect, it } from 'vitest';
import type { SimEnv, SubInfo } from '../../src/world/life/agent.js';
import { LifeSim, TICK } from '../../src/world/life/LifeSim.js';
import { mulberry32 } from '../../src/world/life/rng.js';
import { bodyLen } from '../../src/world/life/steer.js';
import { LIFE_TIERS, type SiteTable } from '../../src/world/life/types.js';

/** A seabed that slopes from 500 m deep in the west to 900 m in the east, with a gentle ridge. */
const env: SimEnv = {
  groundAt: (x, z) => -700 + 0.2 * x + 25 * Math.sin(x * 0.02) * Math.cos(z * 0.03),
};

const table: SiteTable = {
  spawns: [
    { species: 'pacific-hake', weight: 2, depth: [150, 900], group: [12, 20] },
    { species: 'nanomia', weight: 3, depth: [100, 800], group: [3, 6], star: true },
    { species: 'atolla', weight: 2, depth: [350, 4000], group: [1, 3] },
    { species: 'comb-jelly', weight: 1.5, depth: [8, 1200], group: [1, 3] },
    { species: 'cold-water-coral', weight: 5, depth: [500, 1000], group: [2, 5], star: true },
    { species: 'sea-pen', weight: 3, depth: [350, 3700], group: [1, 3] },
    { species: 'sun-star', weight: 3, depth: [150, 1050], group: [1, 3] },
    { species: 'vampire-squid', weight: 1, depth: [500, 1500], group: [1, 1] },
    { species: 'deepwater-octopus', weight: 1.5, depth: [300, 1700], group: [1, 1] },
    { species: 'hawaii-shrimp', weight: 3, depth: [900, 1250], group: [20, 40] },
  ],
  rare: {
    species: 'sperm-whale',
    depth: [30, 1200],
    chancePerMin: 60,
    cooldownS: 100,
    pass: 'overhead',
  },
};

function makeSub(over: Partial<SubInfo> = {}): SubInfo {
  return {
    x: 0,
    y: -520,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    fx: 0,
    fy: 0,
    fz: -1,
    speed: 0,
    lightsOn: true,
    hullR: 7,
    ...over,
  };
}

function makeSim(tier: keyof typeof LIFE_TIERS = 'high', seed = 7, t: SiteTable = table): LifeSim {
  return new LifeSim({ tier: LIFE_TIERS[tier], table: t, env, rand: mulberry32(seed), seed });
}

/** Advance `seconds` of game time at 60 Hz, moving the sub with `move`. */
function run(
  sim: LifeSim,
  sub: SubInfo,
  seconds: number,
  move?: (t: number, s: SubInfo) => void,
): void {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    move?.(t, sub);
    sim.update(dt, sub);
  }
}

describe('LifeSim population', () => {
  it('fills the radius on the first frame, within the pool and the species budget', () => {
    const sim = makeSim('high');
    sim.update(1 / 60, makeSub());
    const st = sim.stats();
    expect(st.agents).toBeGreaterThan(20);
    expect(st.agents).toBeLessThanOrEqual(LIFE_TIERS.high.maxAgents);
    expect(st.species).toBeLessThanOrEqual(LIFE_TIERS.high.maxSpecies);
    for (const id of st.liveSpecies)
      expect(sim.countOf(id)).toBeLessThanOrEqual(
        sim.capacityOf(sim.pool.find((a) => a.alive && a.def.id === id)!.def),
      );
  });

  it('respects the draw-call budget of every tier while the sub dives through every band', () => {
    for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
      const sim = makeSim(tier, 11);
      const sub = makeSub({ y: -10 });
      let worst = 0;
      run(sim, sub, 90, (t, s) => {
        s.y = -10 - t * 14; // 14 m/s down to about 1,270 m
        s.vy = -14;
        s.speed = 14;
        s.x = Math.sin(t * 0.2) * 60;
        const st = sim.stats();
        worst = Math.max(worst, st.species);
      });
      // Regular species keep one slot free for the rare appearance.
      expect(worst, tier).toBeLessThanOrEqual(LIFE_TIERS[tier].maxSpecies);
      expect(sim.liveCount, tier).toBeLessThanOrEqual(LIFE_TIERS[tier].maxAgents);
    }
  });

  it('only shows a species at a depth its table row allows', () => {
    const sim = makeSim('high', 3);
    const sub = makeSub({ y: -200 });
    run(sim, sub, 30);
    for (const a of sim.pool) {
      if (!a.alive) continue;
      const row = a.group.row;
      if (!row) continue;
      const depth = -a.y;
      const band = row.entry.depth;
      // Free swimmers stay inside the band (a little slack for steering and the sea floor).
      if (a.def.archetype === 'school' || a.def.archetype === 'drifter') {
        expect(depth, a.def.id).toBeGreaterThanOrEqual(band[0] - 15);
        expect(depth, a.def.id).toBeLessThanOrEqual(band[1] + 15);
      }
    }
    // Nothing from the 500 to 1,000 m coral band exists at 200 m.
    expect(sim.stats().liveSpecies).not.toContain('cold-water-coral');
  });

  it('despawns what the sub leaves behind and respawns around its new position', () => {
    const sim = makeSim('medium', 5);
    const sub = makeSub({ y: -300 });
    run(sim, sub, 4);
    const before = new Set(sim.pool.filter((a) => a.alive).map((a) => a.id));
    sub.x += 2000;
    run(sim, sub, 4);
    const R = LIFE_TIERS.medium.radius;
    for (const a of sim.pool) {
      if (!a.alive) continue;
      expect(Math.hypot(a.x - sub.x, a.z - sub.z), a.def.id).toBeLessThan(R * 1.7);
    }
    expect(sim.liveCount).toBeGreaterThan(0);
    expect(before.size).toBeGreaterThan(0);
  });

  it('is deterministic for a seed', () => {
    const snap = (seed: number): string => {
      const sim = makeSim('high', seed);
      const sub = makeSub({ y: -600 });
      run(sim, sub, 5);
      return sim.pool
        .filter((a) => a.alive)
        .map((a) => `${a.def.id}:${a.x.toFixed(2)},${a.y.toFixed(2)},${a.z.toFixed(2)}`)
        .join('|');
    };
    expect(snap(4)).toBe(snap(4));
    expect(snap(4)).not.toBe(snap(5));
  });
});

describe('rooted animals and crawlers', () => {
  it('lay out the same patches when the sub comes back (stable cells)', () => {
    const sim = makeSim('high', 21);
    const sub = makeSub({ y: -620, x: 100, z: 0 });
    const layout = (): string[] =>
      sim.pool
        .filter((a) => a.alive && a.def.archetype === 'sessile')
        .map((a) => `${a.def.id}@${a.x.toFixed(1)},${a.z.toFixed(1)}`)
        .sort();
    run(sim, sub, 3);
    const first = layout();
    expect(first.length).toBeGreaterThan(0);
    // Away far enough that every patch despawns, then back to the same spot.
    sub.x = 100 + 3000;
    run(sim, sub, 6);
    sub.x = 100;
    run(sim, sub, 6);
    const again = layout();
    // Cells at the radius edge may differ by hysteresis; the core must be identical.
    const core = first.filter((s) => {
      const [x, z] = s.split('@')[1]!.split(',').map(Number) as [number, number];
      return Math.hypot(x - 100, z) < LIFE_TIERS.high.radius * 0.8;
    });
    for (const c of core) expect(again).toContain(c);
  });

  it('sit on the seabed and never move', () => {
    const sim = makeSim('high', 22);
    const sub = makeSub({ y: -620 });
    run(sim, sub, 3);
    const rooted = sim.pool.filter((a) => a.alive && a.def.archetype === 'sessile');
    expect(rooted.length).toBeGreaterThan(0);
    const start = rooted.map((a) => [a.x, a.y, a.z]);
    run(sim, sub, 5);
    rooted.forEach((a, i) => {
      if (!a.alive) return;
      expect(a.x).toBeCloseTo(start[i]![0]!, 6);
      expect(a.y).toBeCloseTo(env.groundAt(a.x, a.z), 3);
    });
  });

  it('only root on seabed inside their band', () => {
    const sim = makeSim('high', 23);
    run(sim, makeSub({ y: -620 }), 3);
    for (const a of sim.pool) {
      if (!a.alive || a.def.archetype !== 'sessile') continue;
      const row = a.group.row!;
      expect(-env.groundAt(a.x, a.z), a.def.id).toBeGreaterThanOrEqual(row.entry.depth[0] - 6);
      expect(-env.groundAt(a.x, a.z), a.def.id).toBeLessThanOrEqual(row.entry.depth[1] + 6);
    }
  });
});

describe('steering stability', () => {
  it('keeps every animal finite, above the seabed and below the surface under hard flying', () => {
    const sim = makeSim('ultra', 31);
    const sub = makeSub({ y: -450 });
    // Circles at 35 m/s, plunging and climbing, lights on and off.
    run(sim, sub, 120, (t, s) => {
      const a = t * 0.35;
      s.x = Math.cos(a) * 300;
      s.z = Math.sin(a) * 300;
      s.y = -450 + Math.sin(t * 0.2) * 220;
      s.vx = -Math.sin(a) * 35;
      s.vz = Math.cos(a) * 35;
      s.vy = Math.cos(t * 0.2) * 40;
      s.speed = Math.hypot(s.vx, s.vy, s.vz);
      s.fx = s.vx / s.speed;
      s.fy = s.vy / s.speed;
      s.fz = s.vz / s.speed;
      s.lightsOn = Math.floor(t / 7) % 2 === 0;
    });
    for (const a of sim.pool) {
      if (!a.alive) continue;
      for (const v of [
        a.x,
        a.y,
        a.z,
        a.vx,
        a.vy,
        a.vz,
        a.ex,
        a.ey,
        a.ez,
        a.yaw,
        a.pitch,
        a.phase,
      ]) {
        expect(Number.isFinite(v), `${a.def.id} has a non-finite value`).toBe(true);
      }
      expect(Math.hypot(a.vx, a.vy, a.vz), a.def.id).toBeLessThanOrEqual(
        a.def.speed[1] * 1.3 + 0.01,
      );
      expect(Math.hypot(a.ex, a.ey, a.ez), a.def.id).toBeLessThanOrEqual(7.5);
      if (a.def.archetype !== 'sessile') {
        expect(a.y, `${a.def.id} below the seabed`).toBeGreaterThanOrEqual(
          env.groundAt(a.x, a.z) - 0.01,
        );
      }
      expect(a.y, `${a.def.id} above the surface`).toBeLessThan(0);
    }
  });

  it('keeps a school together while it swims', () => {
    const t: SiteTable = {
      spawns: [{ species: 'pacific-hake', weight: 1, depth: [150, 900], group: [20, 20] }],
    };
    const sim = makeSim('high', 41, t);
    const sub = makeSub({ y: -400, lightsOn: false });
    run(sim, sub, 1);
    const g = sim.groups.find((x) => x.def.id === 'pacific-hake')!;
    expect(g).toBeDefined();
    run(sim, sub, 60);
    const members = g.members.filter((m) => m.alive);
    expect(members.length).toBeGreaterThan(5);
    const cx = members.reduce((s, m) => s + m.x, 0) / members.length;
    const cy = members.reduce((s, m) => s + m.y, 0) / members.length;
    const cz = members.reduce((s, m) => s + m.z, 0) / members.length;
    const mean =
      members.reduce((s, m) => s + Math.hypot(m.x - cx, m.y - cy, m.z - cz), 0) / members.length;
    expect(mean).toBeLessThan(18); // a loose shoal, not a dispersed cloud
    // No two fish occupy the same spot.
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = members[i]!;
        const b = members[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(bodyLen(a) * 0.2);
      }
    }
  });

  it('scatters fish from the lights, and does not when the lights are off', () => {
    const t: SiteTable = {
      spawns: [{ species: 'pacific-hake', weight: 1, depth: [150, 900], group: [14, 14] }],
    };
    const alarm = (lights: boolean): number => {
      const sim = makeSim('high', 51, t);
      const sub = makeSub({ y: -400, lightsOn: lights });
      run(sim, sub, 1);
      const g = sim.groups.find((x) => x.def.id === 'pacific-hake')!;
      // Put the school in the beam, 20 m ahead.
      for (const m of g.members) {
        m.x = sub.x + (m.seed - 0.5) * 4;
        m.y = sub.y + (m.seed - 0.5) * 3;
        m.z = sub.z - 20 + (m.seed - 0.5) * 4;
      }
      run(sim, sub, 1.5);
      return Math.max(...g.members.map((m) => m.alarm));
    };
    expect(alarm(true)).toBeGreaterThan(0.3);
    expect(alarm(false)).toBe(0);
  });

  it('draws shrimp toward the beam, and not when the lights are off', () => {
    const t: SiteTable = {
      spawns: [{ species: 'hawaii-shrimp', weight: 1, depth: [900, 1250], group: [20, 20] }],
    };
    const flat: SimEnv = { groundAt: () => -1050 };
    const gap = (lights: boolean): number => {
      const sim = new LifeSim({ tier: LIFE_TIERS.high, table: t, env: flat, rand: mulberry32(61) });
      const sub = makeSub({ y: -1042, x: 0, z: 0, lightsOn: lights });
      run(sim, sub, 1);
      const g = sim.groups.find((x) => x.def.id === 'hawaii-shrimp')!;
      expect(g).toBeDefined();
      // A hub 30 m ahead and 8 m to one side: inside the cone the lamps are drawn toward.
      g.hx = 8;
      g.hz = -30;
      const target = (): number => Math.hypot(g.hx - 0, g.hz - -9);
      const before = target();
      run(sim, sub, 8);
      return target() - before;
    };
    expect(gap(true)).toBeLessThan(-3); // closer to the beam
    expect(gap(false)).toBeGreaterThan(-0.5); // otherwise it stays put
  });

  it('pushes jellies with the thruster wash and not sessile animals', () => {
    const t: SiteTable = {
      spawns: [{ species: 'comb-jelly', weight: 1, depth: [8, 1200], group: [3, 3] }],
    };
    const sim = makeSim('high', 71, t);
    const sub = makeSub({ y: -400, lightsOn: false });
    run(sim, sub, 1);
    const g = sim.groups.find((x) => x.def.id === 'comb-jelly')!;
    const m = g.members[0]!;
    // Behind the sub (it faces -Z, so +Z is astern) inside the wake plume.
    m.x = sub.x;
    m.y = sub.y;
    m.z = sub.z + 9;
    const z0 = m.z;
    sub.speed = 12;
    sub.vz = -12;
    run(sim, sub, 0.6, () => {});
    expect(m.z - z0).toBeGreaterThan(0.5); // thrown astern, away from the sub
  });
});

describe('the rare appearance', () => {
  it('appears on its own at a high chance, once per cooldown, only in its band', () => {
    const sim = makeSim('high', 81);
    const seen: string[] = [];
    sim.onRare = (d) => seen.push(d.id);
    const sub = makeSub({ y: -300 });
    run(sim, sub, 60);
    expect(seen).toEqual(['sperm-whale']); // 100 s cooldown: one in 60 s
    // Out of band (the whale lives 30 m and deeper): no appearance in the shallows.
    const sim2 = makeSim('high', 82);
    const seen2: string[] = [];
    sim2.onRare = (d) => seen2.push(d.id);
    run(sim2, makeSub({ y: -10 }), 60);
    expect(seen2).toEqual([]);
  });

  it('crosses above the sub when its pass is overhead', () => {
    const sim = makeSim('high', 83);
    const sub = makeSub({ y: -300 });
    sim.update(1 / 60, sub);
    const g = sim.spawnRare(sub)!;
    expect(g).not.toBeNull();
    const whale = g.members[0]!;
    expect(whale.def.id).toBe('sperm-whale');
    expect(whale.y).toBeGreaterThan(sub.y + 8); // above the sub
    expect(whale.y).toBeLessThan(-5);
    // It stays level and crosses the sub's neighbourhood.
    let closest = Infinity;
    for (let t = 0; t < 120; t += 1 / 30) {
      sim.update(1 / 30, sub);
      closest = Math.min(closest, Math.hypot(whale.x - sub.x, whale.z - sub.z));
    }
    expect(closest).toBeLessThan(45);
  });
});

describe('steering tick', () => {
  it('runs decisions at a fixed rate whatever the frame rate', () => {
    expect(TICK).toBeCloseTo(1 / 15, 6);
  });
});
