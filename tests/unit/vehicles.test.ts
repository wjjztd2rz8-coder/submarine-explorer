import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GRAPHICS_TIERS } from '../../src/core/config/quality.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { apertureFor, clearFraction, CockpitView } from '../../src/vehicles/cockpit.js';
import { buildVehicle, lodForTier, Vehicle } from '../../src/vehicles/index.js';
import { auditVehicle, clearance, solid } from './helpers/vehicleClearance.js';

/** Per-tier budgets for one vehicle. */
const BUDGET = {
  low: { drawCalls: 8, triangles: 18_000 },
  full: { drawCalls: 25, triangles: 36_000 },
};

describe('sub geometry clearance', () => {
  it('measures triangle gaps, crossings and enclosed solids independently of bounding boxes', () => {
    const triangle = (vertices: number[]) => {
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(vertices, 3));
      const result = solid(g, 'triangle');
      g.dispose();
      return result;
    };
    const a = triangle([0, 0, 0, 2, 0, 0, 0, 2, 0]);
    const b = triangle([2, 2, 0, 2, 1.5, 0, 1.5, 2, 0]);
    expect(a.bounds.intersectsBox(b.bounds)).toBe(true);
    expect(clearance(a, b)).toBeCloseTo(1.5 * Math.SQRT1_2, 6);
    expect(clearance(a, triangle([0.5, 0.5, -1, 0.5, 0.5, 1, 3, 3, 0]))).toBe(0);
    expect(clearance(a, triangle([0.5, 0.5, 0, 3, 0.5, 0, 0.5, 3, 0]))).toBe(0);
    const outer = new BoxGeometry(4, 4, 4);
    const inner = new BoxGeometry(1, 1, 1);
    try {
      expect(solid(outer, 'outer').closed).toBe(true);
      expect(clearance(solid(inner, 'inner'), solid(outer, 'outer'))).toBe(0);
      inner.translate(3, 0, 0);
      expect(clearance(solid(inner, 'inner'), solid(outer, 'outer'))).toBeCloseTo(0.5, 6);
    } finally {
      outer.dispose();
      inner.dispose();
    }
  });

  for (const hull of ['A', 'B', 'C']) {
    for (const tier of GRAPHICS_TIERS) {
      // Acceptance for Claude's hull correction: prevent the phone regression
      // where a spinning propeller occupies a fin and thruster ducts clip the hull.
      it(`${hull} ${tier}: propellers and thrusters clear the hull, fins and neighbours`, () => {
        const report = auditVehicle(hull, tier);
        expect(report).toHaveLength(5);
        expect(
          report.filter((part) => part.contacts.length || !Number.isFinite(part.gap)),
          JSON.stringify(report, null, 2),
        ).toEqual([]);
      });
    }
  }
});

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

  it('falls back to class B for unknown ids', () => {
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

describe('SubMesh integration', () => {
  it('follows the fitted hull class, swaps hull and cockpit by view', () => {
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
    expect(mesh.group.position.toArray()).toEqual([100, -50, 20]);
    mesh.dispose();
  });
});

// Exercise the injected shader expressions in floating-point arithmetic:
// the old positive-exponential tanh form could turn bright hull pixels into NaN.
describe('hull-close highlight compression', () => {
  for (const tier of ['low', 'medium', 'high']) {
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
          expect(vehicle.materials.uniforms.uHullLight.value).toBe(1);
          expect(shader.uniforms.uHullLight).toBe(vehicle.materials.uniforms.uHullLight);
          expect(shader.fragmentShader).toContain('outgoingLight *= uHullLight;');
          expect(shader.fragmentShader.indexOf('outgoingLight *= uHullLight;')).toBeLessThan(
            shader.fragmentShader.indexOf('float hi ='),
          );
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
