import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Rov } from '../../src/rov/Rov.js';
import { RovVisual } from '../../src/rov/RovVisual.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { apertureFor, clearFraction, CockpitView } from '../../src/vehicles/cockpit.js';
import { buildRov, buildVehicle, lodForTier, Vehicle } from '../../src/vehicles/index.js';
import { catenarySag, payout, tetherCurve } from '../../src/vehicles/tether.js';

/** Per-tier budgets for one vehicle (docs: plan/progress/F1-VEHICLES.md). */
const BUDGET = {
  low: { drawCalls: 8, triangles: 18_000 },
  full: { drawCalls: 25, triangles: 36_000 },
  rovLow: { drawCalls: 8, triangles: 10_000 },
  rovFull: { drawCalls: 18, triangles: 18_000 },
};

describe('vehicle builds (F1-VEHICLES)', () => {
  it('builds three distinct hull classes within the tier budgets', () => {
    const tris = new Set<number>();
    for (const id of ['A', 'B', 'C']) {
      const low = buildVehicle(id, 'low');
      const high = buildVehicle(id, 'high');
      expect(low.id).toBe(id);
      expect(low.lod).toBe('low');
      expect(high.lod).toBe('high');
      expect(low.stats.drawCalls).toBeLessThanOrEqual(BUDGET.low.drawCalls);
      expect(low.stats.triangles).toBeLessThanOrEqual(BUDGET.low.triangles);
      expect(high.stats.drawCalls).toBeLessThanOrEqual(BUDGET.full.drawCalls);
      expect(high.stats.triangles).toBeLessThanOrEqual(BUDGET.full.triangles);
      // The low LOD is substantially lighter, and has no particle wash.
      expect(low.stats.triangles).toBeLessThan(high.stats.triangles * 0.65);
      expect(low.wash).toBeNull();
      expect(high.wash).not.toBeNull();
      expect(high.propSpecs.length).toBeGreaterThanOrEqual(5);
      tris.add(high.stats.triangles);
      low.dispose();
      high.dispose();
    }
    expect(tris.size).toBe(3);
  });

  it('builds the ROV within budget and falls back to class B for unknown ids', () => {
    const low = buildRov('low');
    const high = buildRov('ultra');
    expect(low.stats.drawCalls).toBeLessThanOrEqual(BUDGET.rovLow.drawCalls);
    expect(low.stats.triangles).toBeLessThanOrEqual(BUDGET.rovLow.triangles);
    expect(high.stats.drawCalls).toBeLessThanOrEqual(BUDGET.rovFull.drawCalls);
    expect(high.stats.triangles).toBeLessThanOrEqual(BUDGET.rovFull.triangles);
    expect(buildVehicle('Z').id).toBe('B');
    expect(lodForTier('medium')).toBe('high');
    expect(lodForTier('low')).toBe('low');
  });

  it('mixes pilot commands into per-thruster thrust', () => {
    expect(Vehicle.thrustFor('port', { throttle: 1, yaw: 0 })).toBe(1);
    // A starboard turn speeds the port prop and slows the starboard one.
    expect(Vehicle.thrustFor('port', { throttle: 0.5, yaw: 0.5 })).toBeGreaterThan(
      Vehicle.thrustFor('starboard', { throttle: 0.5, yaw: 0.5 }),
    );
    expect(Vehicle.thrustFor('starboard', { throttle: -1, yaw: 1 })).toBe(-1);
    expect(Vehicle.thrustFor('vertical', { vertical: -0.4 })).toBeCloseTo(-0.4);
    expect(Vehicle.thrustFor('vertical-fore', { vertical: 0, pitch: 1 })).toBeGreaterThan(0);
    expect(Vehicle.thrustFor('vertical-aft', { vertical: 0, pitch: 1 })).toBeLessThan(0);
    expect(Vehicle.thrustFor('lateral', {})).toBe(0);
  });

  it('spools the props, deploys the arms while scanning and flashes the strobe', () => {
    const v = buildVehicle('B', 'high');
    for (let i = 0; i < 120; i++) v.update({ throttle: 1, scanning: true }, 1 / 30);
    const aft = v.propSpecs.findIndex((p) => p.channel === 'port');
    expect(v.propRps[aft]).toBeGreaterThan(2.5);
    expect(v.armDeploy).toBe(1);
    for (let i = 0; i < 120; i++) v.update({ throttle: 0, scanning: false }, 1 / 30);
    expect(Math.abs(v.propRps[aft]!)).toBeLessThan(0.2);
    expect(v.armDeploy).toBe(0);
    v.dispose();
  });
});

describe('tether', () => {
  it('sags with slack and straightens when taut', () => {
    expect(catenarySag(10, 10)).toBe(0);
    expect(catenarySag(10, 12)).toBeCloseTo(Math.sqrt((3 * 10 * 2) / 8));
    expect(payout(20, 60, true)).toBeCloseTo(20.04);
    expect(payout(20, 60, false)).toBeGreaterThan(21);
    // Near the limit, the slack runs out.
    expect(payout(59.9, 60, false) - 59.9).toBeLessThan(0.5);
    const pts = Array.from({ length: 9 }, () => new Vector3());
    const a = new Vector3(0, 0, 0);
    const b = new Vector3(20, 0, 0);
    tetherCurve(a, b, 24, pts);
    expect(pts[0]!.distanceTo(a)).toBeLessThan(1e-9);
    expect(pts[8]!.distanceTo(b)).toBeLessThan(1e-9);
    expect(pts[4]!.y).toBeLessThan(-3);
    tetherCurve(a, b, 20, pts);
    expect(Math.abs(pts[4]!.y)).toBeLessThan(1e-9);
  });
});

describe('cockpit viewport', () => {
  it('keeps most of the view clear at common aspects', () => {
    for (const aspect of [16 / 9, 4 / 3, 21 / 9, 9 / 16]) {
      const f = clearFraction(apertureFor(62, aspect));
      expect(f).toBeGreaterThan(0.84);
      expect(f).toBeLessThan(0.97); // the frame is visible
    }
    const view = new CockpitView(false);
    view.fit(62, 16 / 9);
    expect(view.triangles).toBeGreaterThan(0);
    view.dispose();
  });
});

describe('SubMesh + RovVisual integration', () => {
  it('follows the fitted hull class, swaps hull and cockpit by view, anchors the tether', () => {
    const mesh = new SubMesh({ length: 26, hullClass: 'A', tier: 'medium' });
    expect(mesh.hullClass).toBe('A');
    mesh.setHullClass('C');
    expect(mesh.hullClass).toBe('C');
    mesh.setHullClass('C');
    expect(mesh.hullClass).toBe('C');
    mesh.setView('first-person');
    expect(mesh.vehicle.root.visible).toBe(false);
    expect(mesh.cockpit.object.visible).toBe(true);
    mesh.setView('chase');
    expect(mesh.vehicle.root.visible).toBe(true);
    expect(mesh.cockpit.object.visible).toBe(false);
    mesh.update(1, 0.5, { yaw: 0.3, lightsOn: false });
    expect(mesh.propeller).toBe(mesh.vehicle.props);
    mesh.setPose(new Vector3(100, -50, 20), 0, 0, 0);
    const anchor = mesh.tetherAnchor(new Vector3());
    // Under the bow, within a hull length of the origin.
    expect(anchor.y).toBeLessThan(-50);
    expect(anchor.z).toBeLessThan(20);
    expect(anchor.distanceTo(new Vector3(100, -50, 20))).toBeLessThan(26);
    mesh.dispose();
  });

  it('draws the ROV and a sagging tether that ends at the ROV', () => {
    const floor = { widthM: 1000, depthM: 1000, sampleHeight: () => -400 };
    const rov = new Rov(DEFAULT_CONFIG.rov, floor);
    const anchor = new Vector3(0, -100, 0);
    expect(rov.deploy(anchor, 0)).toBe(true);
    rov.position.set(0, -104, -25);
    const visual = new RovVisual(DEFAULT_CONFIG.rov, 'high');
    visual.update(rov, anchor, 1 / 60);
    expect(visual.group.visible).toBe(true);
    const pts = visual.tether.points;
    expect(pts[0]!.distanceTo(anchor)).toBeLessThan(1e-6);
    expect(pts[pts.length - 1]!.distanceTo(rov.position)).toBeLessThan(3);
    const mid = pts[Math.floor(pts.length / 2)]!;
    expect(mid.y).toBeLessThan((anchor.y + pts[pts.length - 1]!.y) / 2);
    visual.dispose();
  });
});

// Exercise the injected shader expressions in floating-point arithmetic:
// the old positive-exponential tanh form could turn bright hull pixels into NaN.
describe('hull-close highlight compression', () => {
  for (const tier of ['low', 'medium', 'high', 'ultra']) {
    it(`${tier}: remains finite under extreme lamps and preserves the highlight shoulder`, async () => {
      const THREE = await import('three');
      const vehicle = buildVehicle('B', tier);
      try {
        for (const slot of ['foam', 'frame', 'metal'] as const) {
          const mat = vehicle.materials.bySlot[slot] as InstanceType<
            typeof THREE.MeshStandardMaterial
          >;
          const shader = {
            ...THREE.ShaderLib.standard,
            uniforms: { ...THREE.ShaderLib.standard.uniforms },
          } as Parameters<typeof mat.onBeforeCompile>[0];
          mat.onBeforeCompile(shader, {} as InstanceType<typeof THREE.WebGLRenderer>);
          const decay = shader.fragmentShader.match(/float shoulderDecay = (.*);/)![1]!;
          const shoulder = shader.fragmentShader.match(/float sh = (.*);/)![1]!;
          const scale = new Function(
            'hi',
            `const shoulderDecay = ${decay.replace('exp(', 'Math.exp(')}; const sh = ${shoulder}; return sh / hi;`,
          ) as (hi: number) => number;
          for (const hi of [0.50001, 0.6, 1, 5, 20, 100, 1000, 1e6, 1e20]) {
            const factor = Math.fround(scale(Math.fround(hi)));
            for (const color of [hi, hi * 0.7, hi * 0.1]) {
              const compressed = Math.fround(color * factor);
              expect(Number.isFinite(compressed)).toBe(true);
              expect(compressed).toBeGreaterThan(0);
              expect(compressed).toBeLessThanOrEqual(0.900001);
            }
            expect(hi * factor).toBeCloseTo(0.5 + 0.4 * Math.tanh((hi - 0.5) / 0.4), 6);
          }
          expect(shader.fragmentShader).not.toContain('tanh(');
        }
      } finally {
        vehicle.dispose();
      }
    });
  }
});
