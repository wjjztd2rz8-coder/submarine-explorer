import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { InputState } from '../../src/core/Input.js';
import { Submarine, type HeightField } from '../../src/sub/Submarine.js';

const DT = 1 / 60;
const cfg = DEFAULT_CONFIG.submarine;

function input(partial: Partial<InputState> = {}): InputState {
  return {
    throttle: 0,
    yaw: 0,
    pitch: 0,
    ballast: 0,
    lookDx: 0,
    lookDy: 0,
    toggleCamera: false,
    toggleSonar: false,
    boost: false,
    toggleLights: false,
    ping: false,
    scan: false,
    cycleSimSpeed: false,
    togglePhotoMode: false,
    ...partial,
  };
}

/** A perfectly flat seabed at a given depth. */
function flatSeabed(depth: number): HeightField {
  return {
    sampleHeight: () => depth,
    getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
  };
}

/** A seabed sloping up toward +X, for testing push-out direction. */
function slopedSeabed(depthAtOrigin: number, slope: number): HeightField {
  return {
    sampleHeight: (x) => depthAtOrigin + x * slope,
    getNormal: (_x, _z, out = new Vector3()) => out.set(-slope, 1, 0).normalize(),
  };
}

function run(sub: Submarine, state: InputState, steps: number): void {
  for (let i = 0; i < steps; i++) sub.step(state, DT);
}

describe('Submarine orientation', () => {
  it('faces north (-Z) at yaw 0 and east (+X) at yaw 90 degrees', () => {
    const sub = new Submarine(cfg, flatSeabed(-5000));
    expect(sub.getForward().z).toBeCloseTo(-1, 6);
    sub.yaw = Math.PI / 2;
    const f = sub.getForward();
    expect(f.x).toBeCloseTo(1, 6);
    expect(f.z).toBeCloseTo(0, 6);
  });

  it('clamps pitch so the boat cannot loop', () => {
    const sub = new Submarine(cfg, flatSeabed(-5000));
    sub.reset(0, -1000, 0);
    run(sub, input({ pitch: 1 }), 600);
    expect(sub.pitch).toBeCloseTo(cfg.maxPitch, 6);
    run(sub, input({ pitch: -1 }), 1200);
    expect(sub.pitch).toBeCloseTo(-cfg.maxPitch, 6);
  });
});

describe('Submarine drag', () => {
  it('reaches a terminal velocity under constant thrust', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -1000, 0);
    const state = input({ throttle: 1 });

    run(sub, state, 60);
    const early = sub.velocity.length();
    run(sub, state, 1800); // 30 more seconds
    const settled = sub.velocity.length();
    run(sub, state, 1800);
    const later = sub.velocity.length();

    expect(settled).toBeGreaterThan(early);
    // Converged: essentially no further change over another 30 s.
    expect(Math.abs(later - settled)).toBeLessThan(0.01);

    // Matches the analytic root of  thrust = (k1 + k2 v) v  (horizontal axis).
    const { thrustAccel: T, dragLinear: k1, dragQuadratic: k2 } = cfg;
    const predicted = (-k1 + Math.sqrt(k1 * k1 + 4 * k2 * T)) / (2 * k2);
    expect(later).toBeGreaterThan(predicted * 0.9);
    expect(later).toBeLessThan(predicted * 1.15);
    expect(later).toBeLessThanOrEqual(cfg.maxSpeed);
  });

  it('coasts to a stop when the throttle is cut', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -1000, 0);
    run(sub, input({ throttle: 1 }), 600);
    const moving = sub.velocity.length();
    expect(moving).toBeGreaterThan(1);
    // Hold depth so buoyancy does not masquerade as forward motion.
    run(sub, input({ ballast: 0 }), 3600);
    expect(new Vector3(sub.velocity.x, 0, sub.velocity.z).length()).toBeLessThan(0.05);
  });

  it('never exceeds maxSpeed even with boost', () => {
    const sub = new Submarine({ ...cfg, dragLinear: 0, dragQuadratic: 0 }, flatSeabed(-9000));
    sub.reset(0, -1000, 0);
    run(sub, input({ throttle: 1, boost: true }), 3600);
    expect(sub.velocity.length()).toBeLessThanOrEqual(cfg.maxSpeed + 1e-6);
  });
});

describe('Submarine ballast and surface', () => {
  it('descends when flooding and ascends when blowing ballast', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -1000, 0);
    run(sub, input({ ballast: -1 }), 300);
    expect(sub.position.y).toBeLessThan(-1000);

    sub.reset(0, -1000, 0);
    run(sub, input({ ballast: 1 }), 300);
    expect(sub.position.y).toBeGreaterThan(-1000);
  });

  it('cannot breach the surface', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -50, 0);
    run(sub, input({ ballast: 1 }), 1200);
    expect(sub.position.y).toBeLessThanOrEqual(-cfg.hullRadius + 1e-6);
  });
});

describe('Submarine crush depth', () => {
  it('flags a hull breach past the crush depth', () => {
    const sub = new Submarine(cfg, flatSeabed(-20000));
    sub.reset(0, cfg.crushDepth + 30, 0);
    expect(sub.getState().hullBreached).toBe(false);
    // Dive until the depth gauge passes the rating. The emergency blow fires on
    // the same step, so check the flag rather than a still-falling position.
    for (let i = 0; i < 600 && !sub.hullBreached; i++) sub.step(input({ ballast: -1 }), 1 / 60);
    expect(sub.position.y).toBeLessThanOrEqual(cfg.crushDepth);
    expect(sub.getState().hullBreached).toBe(true);
  });

  it('reports a crush warning before failure', () => {
    const sub = new Submarine(cfg, flatSeabed(-20000));
    sub.reset(0, cfg.crushDepth * 0.5, 0);
    expect(sub.getState().crushWarning).toBe(false);
    sub.reset(0, cfg.crushDepth * (cfg.crushWarnRatio + 0.05), 0);
    const s = sub.getState();
    expect(s.crushWarning).toBe(true);
    expect(s.crushRatio).toBeGreaterThan(cfg.crushWarnRatio);
    expect(s.crushRatio).toBeLessThan(1);
    expect(s.hullBreached).toBe(false);
  });
});

describe('Submarine terrain collision', () => {
  it('pushes the hull out of a flat seabed and keeps the clearance', () => {
    const seabed = -3000;
    const sub = new Submarine(cfg, flatSeabed(seabed));
    // Start below the floor to force a resolution on the first step.
    sub.reset(0, seabed - 50, 0);
    run(sub, input(), 1);
    expect(sub.position.y).toBeGreaterThanOrEqual(
      seabed + cfg.hullRadius + cfg.seabedClearance - 1e-4,
    );
    expect(sub.getState().touchedBottom).toBe(true);
  });

  it('applies a speed penalty on impact', () => {
    const seabed = -3000;
    const sub = new Submarine(cfg, flatSeabed(seabed));
    // Start a hair above the floor with real downward speed, so exactly one
    // 1/60 s step carries the hull through it.
    sub.reset(0, seabed + cfg.hullRadius + cfg.seabedClearance + 0.05, 0);
    sub.velocity.set(20, -10, 0);
    const before = sub.velocity.length();
    run(sub, input(), 1);
    expect(sub.getState().touchedBottom).toBe(true);
    expect(sub.velocity.length()).toBeLessThan(before * (1 - cfg.collisionSpeedPenalty) + 1e-6);
    // The downward component is removed, not merely reduced.
    expect(sub.velocity.y).toBeGreaterThanOrEqual(-1e-6);
  });

  it('deflects sideways along a sloping wall rather than only upward', () => {
    const slope = 0.5; // rises toward +X
    const sub = new Submarine(cfg, slopedSeabed(-3000, slope));
    sub.reset(0, -3000 + cfg.hullRadius + cfg.seabedClearance - 20, 0);
    run(sub, input(), 1);
    // The push-out follows the normal (-slope, 1, 0), so x must move -X.
    expect(sub.position.x).toBeLessThan(0);
    expect(sub.position.y).toBeGreaterThan(-3000);
  });

  it('leaves a sub in open water untouched', () => {
    const sub = new Submarine(cfg, flatSeabed(-5000));
    sub.reset(0, -1000, 0);
    run(sub, input(), 10);
    expect(sub.getState().touchedBottom).toBe(false);
  });

  it('reports altitude above the seabed', () => {
    const sub = new Submarine(cfg, flatSeabed(-3000));
    sub.reset(0, -2500, 0);
    expect(sub.getState().altitude).toBeCloseTo(500, 6);
  });
});

describe('Submarine state reporting', () => {
  it('converts yaw to a compass heading', () => {
    const sub = new Submarine(cfg, flatSeabed(-5000));
    sub.reset(0, -100, 0, 0);
    expect(sub.getState().headingDeg).toBeCloseTo(0, 6);
    sub.reset(0, -100, 0, Math.PI / 2);
    expect(sub.getState().headingDeg).toBeCloseTo(90, 5);
    sub.reset(0, -100, 0, -Math.PI / 2);
    expect(sub.getState().headingDeg).toBeCloseTo(270, 5);
  });
});
