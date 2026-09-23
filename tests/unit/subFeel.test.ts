/**
 * A3 "submarine feel" checks. Each `it()` here is numbered to match a row in
 * `docs/playtest-A3.md`, so a change of feel shows up as a named failure rather
 * than as a vague "it handles oddly".
 */

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

function flatSeabed(depth: number): HeightField {
  return {
    sampleHeight: () => depth,
    getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
  };
}

function run(sub: Submarine, state: InputState, steps: number): void {
  for (let i = 0; i < steps; i++) sub.step(state, DT);
}

/** Analytic terminal speed of `a = (k1 + k2 v) v`. */
function terminalSpeed(accel: number): number {
  const { dragLinear: k1, dragQuadratic: k2 } = cfg;
  return (-k1 + Math.sqrt(k1 * k1 + 4 * k2 * accel)) / (2 * k2);
}

describe('A3/1-2 thrust curve and terminal velocity', () => {
  it('1. reaches 95% of terminal velocity within 8 seconds of full thrust', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -1000, 0);
    run(sub, input({ throttle: 1 }), 8 * 60);
    const predicted = terminalSpeed(cfg.thrustAccel);
    expect(sub.velocity.length()).toBeGreaterThan(predicted * 0.95);
  });

  it('2. cruises at ~6 m/s and sprints past 8 m/s on boost', () => {
    const cruise = terminalSpeed(cfg.thrustAccel);
    const sprint = terminalSpeed(cfg.thrustAccel * cfg.boostMultiplier);
    expect(cruise).toBeGreaterThan(5.5);
    expect(cruise).toBeLessThan(6.5);
    expect(sprint).toBeGreaterThan(8);
  });

  it('2b. the throttle curve gives fine control near centre but full thrust at 1', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -1000, 0);
    run(sub, input({ throttle: 0.5 }), 60 * 60);
    const half = sub.velocity.length();

    sub.reset(0, -1000, 0);
    run(sub, input({ throttle: 1 }), 60 * 60);
    const full = sub.velocity.length();

    // A linear throttle would give ~0.72 of full speed at half stick; the curve
    // pulls that down, which is the point -- half stick is a slow survey speed.
    expect(half).toBeLessThan(full * 0.65);
    expect(half).toBeGreaterThan(0.5);
    expect(full).toBeCloseTo(terminalSpeed(cfg.thrustAccel), 1);
  });
});

describe('A3/3 stopping', () => {
  it('3. coasts below 0.2 m/s within 30 s of cutting the throttle', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -1000, 0);
    run(sub, input({ throttle: 1 }), 30 * 60);
    const horiz = (): number => new Vector3(sub.velocity.x, 0, sub.velocity.z).length();
    run(sub, input(), 30 * 60);
    // 0.2 m/s is ~0.4 kn: the boat still glides, which is the intended feel.
    expect(horiz()).toBeLessThan(0.2);
    run(sub, input(), 30 * 60);
    expect(horiz()).toBeLessThan(0.06);
  });
});

describe('A3/4-5 rotation', () => {
  it('4. clamps pitch at +/-45 degrees and kills the rate at the limit', () => {
    expect((cfg.maxPitch * 180) / Math.PI).toBeCloseTo(45, 6);
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -1000, 0);
    run(sub, input({ pitch: 1 }), 600);
    expect(sub.pitch).toBeCloseTo(cfg.maxPitch, 6);
    // One step with the stick centred must not overshoot past the clamp.
    run(sub, input(), 1);
    expect(sub.pitch).toBeLessThanOrEqual(cfg.maxPitch + 1e-9);
  });

  it('5. yaw has inertia: it spins up gradually and coasts after release', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -1000, 0);

    // Spin-up: after a single 1/60 s tick the boat is nowhere near rate.
    run(sub, input({ yaw: 1 }), 1);
    expect(Math.abs(sub.yaw)).toBeLessThan(cfg.yawRate * DT * 0.2);

    // Sustained: converges on the configured rate.
    sub.reset(0, -1000, 0);
    run(sub, input({ yaw: 1 }), 180);
    const before = sub.yaw;
    run(sub, input({ yaw: 1 }), 60);
    expect(sub.yaw - before).toBeCloseTo(cfg.yawRate, 1);

    // Release: it keeps turning a little rather than stopping dead.
    const atRelease = sub.yaw;
    run(sub, input(), 12); // 0.2 s
    expect(sub.yaw - atRelease).toBeGreaterThan(0.01);
    run(sub, input(), 300);
    expect(Math.abs(sub.yaw - atRelease)).toBeLessThan(cfg.yawRate);
  });
});

describe('A3/6 banking (visual only)', () => {
  it('6. rolls into a turn at speed and stays level when pivoting at rest', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -1000, 0);
    run(sub, input({ yaw: 1 }), 240); // turning on the spot, no thrust
    expect(Math.abs(sub.roll)).toBeLessThan(0.02);

    sub.reset(0, -1000, 0);
    run(sub, input({ throttle: 1 }), 30 * 60); // up to cruise first
    run(sub, input({ throttle: 1, yaw: 1 }), 120);
    // Starboard yaw banks to port-side-up, i.e. negative roll.
    expect(sub.roll).toBeLessThan(-cfg.maxBankAngle * 0.7);
    expect(Math.abs(sub.roll)).toBeLessThanOrEqual(cfg.maxBankAngle + 1e-9);

    // Physics is unaffected by the bank: the boat still goes where it points.
    const fwd = sub.getForward();
    expect(fwd.length()).toBeCloseTo(1, 6);
  });
});

describe('A3/7 neutral trim', () => {
  it('7. hands off, the boat holds depth to within 5 m over 30 s', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -2000, 0);
    run(sub, input(), 30 * 60);
    expect(Math.abs(sub.position.y + 2000)).toBeLessThan(5);
    // Trimmed very slightly positive, like a real boat, so it drifts up not down.
    expect(sub.position.y).toBeGreaterThan(-2000);
  });

  it('7b. ballast has inertia: a one-frame tap barely moves the boat', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    sub.reset(0, -2000, 0);
    run(sub, input({ ballast: -1 }), 1);
    const afterTap = sub.velocity.y;
    sub.reset(0, -2000, 0);
    run(sub, input({ ballast: -1 }), 120);
    expect(Math.abs(sub.velocity.y)).toBeGreaterThan(Math.abs(afterTap) * 20);
  });
});

describe('A3/8-9 collision feedback', () => {
  it('8. nose-down into the seabed at 6 m/s pushes out without tunnelling', () => {
    const seabed = -3800;
    const sub = new Submarine(cfg, flatSeabed(seabed));
    sub.reset(0, seabed + 60, 0);
    sub.pitch = -cfg.maxPitch;
    sub.velocity.set(0, -6, 0);
    run(sub, input({ throttle: 1, pitch: -1 }), 600);
    expect(sub.position.y).toBeGreaterThanOrEqual(
      seabed + cfg.hullRadius + cfg.seabedClearance - 1,
    );
    expect(sub.getState().altitude).toBeGreaterThan(0);
  });

  it('9. an impact spikes hull stress, which then decays away', () => {
    const seabed = -3000;
    const sub = new Submarine(cfg, flatSeabed(seabed));
    sub.reset(0, seabed + cfg.hullRadius + cfg.seabedClearance + 0.05, 0);
    sub.velocity.set(0, -cfg.impactStressSpeed, 0);
    run(sub, input(), 1);

    const hit = sub.getState();
    expect(hit.touchedBottom).toBe(true);
    expect(hit.impactSpeed).toBeGreaterThan(cfg.impactStressSpeed * 0.8);
    expect(hit.hullStress).toBeGreaterThan(0.8);

    // One half-life later it must be roughly halved, and gone within five.
    run(sub, input(), Math.round(cfg.hullStressHalfLife * 60));
    expect(sub.getState().hullStress).toBeLessThan(hit.hullStress * 0.6);
    run(sub, input(), Math.round(cfg.hullStressHalfLife * 60 * 5));
    expect(sub.getState().hullStress).toBeLessThan(0.05);
  });

  it('9b. a gentle graze produces far less stress than a head-on hit', () => {
    const seabed = -3000;
    const make = (vy: number): number => {
      const sub = new Submarine(cfg, flatSeabed(seabed));
      sub.reset(0, seabed + cfg.hullRadius + cfg.seabedClearance + 0.05, 0);
      sub.velocity.set(0, vy, 0);
      run(sub, input(), 1);
      return sub.getState().hullStress;
    };
    expect(make(-0.6)).toBeLessThan(make(-6) * 0.3);
  });
});

describe('A3/10 crush depth and emergency blow', () => {
  it('10. warns at 90% of the rating and blows tanks at 100%', () => {
    const sub = new Submarine(cfg, flatSeabed(-20000));
    const crush = sub.getCrushDepth();
    expect(cfg.crushWarnRatio).toBeCloseTo(0.9, 6);

    sub.reset(0, crush * 0.85, 0);
    expect(sub.getState().crushWarning).toBe(false);
    sub.reset(0, crush * 0.95, 0);
    const warned = sub.getState();
    expect(warned.crushWarning).toBe(true);
    expect(warned.hullStress).toBeGreaterThan(0);
    expect(warned.emergencyBlow).toBe(false);

    // Dive through the rating.
    sub.reset(0, crush + 20, 0);
    for (let i = 0; i < 1200 && !sub.getState().emergencyBlow; i++) {
      sub.step(input({ ballast: -1 }), DT);
    }
    const blowing = sub.getState();
    expect(blowing.emergencyBlow).toBe(true);
    expect(blowing.hullBreached).toBe(true);
    expect(blowing.controlLockRemaining).toBeGreaterThan(0);
    expect(blowing.controlLockRemaining).toBeLessThanOrEqual(cfg.emergencyBlowLockSeconds);

    // Controls are locked: full-down ballast must not stop the ascent.
    const startY = sub.position.y;
    run(sub, input({ ballast: -1, throttle: 1 }), Math.round(cfg.emergencyBlowLockSeconds * 60));
    expect(sub.position.y).toBeGreaterThan(startY);
    // ...and the pilot has the boat back afterwards.
    expect(sub.getState().controlLockRemaining).toBe(0);
  });

  it('10b. hull class selects the crush depth', () => {
    const sub = new Submarine(cfg, flatSeabed(-20000));
    expect(sub.getCrushDepth()).toBe(cfg.hullClasses[cfg.hullClass]?.crushDepth);
    expect(sub.setHullClass('C')).toBe(true);
    expect(sub.getCrushDepth()).toBe(cfg.hullClasses.C?.crushDepth);
    expect(sub.setHullClass('nonesuch')).toBe(false);
    expect(sub.getCrushDepth()).toBe(cfg.hullClasses.C?.crushDepth);
    expect(sub.getState().hullClass).toBe('C');
  });
});

describe('A3/11 sim speed', () => {
  it('11. 3x covers three times the ground per frame and cycles 1-2-3', () => {
    const sub = new Submarine(cfg, flatSeabed(-9000));
    expect(sub.simSpeed).toBe(1);
    expect(sub.cycleSimSpeed()).toBe(2);
    expect(sub.cycleSimSpeed()).toBe(3);
    expect(sub.cycleSimSpeed()).toBe(1);

    sub.reset(0, -1000, 0);
    run(sub, input({ throttle: 1 }), 600);
    const at1x = -sub.position.z;

    sub.setSimSpeed(3);
    sub.reset(0, -1000, 0);
    run(sub, input({ throttle: 1 }), 200); // a third of the frames
    // Same number of physics ticks, so the same distance -- that is the point:
    // the world runs faster in wall-clock time without changing the integrator.
    expect(-sub.position.z).toBeCloseTo(at1x, 3);
  });
});

describe('Phase D mode profiles', () => {
  it.each(['research', 'standard', 'fast'] as const)(
    '%s cruise and boost stay inside the configured speed cap',
    (name) => {
      const tuned = structuredClone(DEFAULT_CONFIG.submarine);
      const sub = new Submarine(tuned, flatSeabed(-20000));
      const speed = DEFAULT_CONFIG.speedProfiles[name];
      sub.applyProfiles(speed, DEFAULT_CONFIG.descentProfiles[name]);
      sub.reset(0, -1000, 0);
      run(sub, input({ throttle: 1 }), 90 * 60);
      expect(Math.abs(sub.getState().speed - speed.cruiseSpeed)).toBeLessThan(0.15);
      sub.reset(0, -1000, 0);
      run(sub, input({ throttle: 1, boost: true }), 90 * 60);
      expect(sub.getState().speed).toBeLessThanOrEqual(speed.maxSpeed + 1e-6);
      expect(sub.getState().speed).toBeGreaterThan(speed.cruiseSpeed);
    },
  );

  it.each(['research', 'standard', 'fast'] as const)(
    '%s descent is capped separately from forward thrust',
    (name) => {
      const tuned = structuredClone(DEFAULT_CONFIG.submarine);
      const sub = new Submarine(tuned, flatSeabed(-20000));
      const descent = DEFAULT_CONFIG.descentProfiles[name];
      sub.applyProfiles(DEFAULT_CONFIG.speedProfiles.fast, descent);
      sub.reset(0, -1000, 0);
      run(sub, input({ ballast: -1, throttle: 1, boost: true, pitch: -1 }), 20 * 60);
      expect(-sub.velocity.y).toBeLessThanOrEqual(descent.maxVerticalSpeed + 1e-6);
    },
  );

  it('changes profiles in place without resetting pose or hull', () => {
    const tuned = structuredClone(DEFAULT_CONFIG.submarine);
    const sub = new Submarine(tuned, flatSeabed(-20000));
    sub.reset(10, -1000, 20);
    sub.applyProfiles(
      DEFAULT_CONFIG.speedProfiles.research,
      DEFAULT_CONFIG.descentProfiles.research,
    );
    expect(sub.position.toArray()).toEqual([10, -1000, 20]);
    expect(sub.getState().hullClass).toBe(tuned.hullClass);
    expect(tuned.yawRate).toBe(0.55);
    expect(tuned.maxSpeed).toBe(1.4);
  });

  it('fast steering turns progressively without exceeding its yaw rate', () => {
    const tuned = structuredClone(DEFAULT_CONFIG.submarine);
    const sub = new Submarine(tuned, flatSeabed(-20000));
    sub.applyProfiles(DEFAULT_CONFIG.speedProfiles.fast, DEFAULT_CONFIG.descentProfiles.fast);
    sub.reset(0, -1000, 0);
    sub.velocity.z = -20;
    run(sub, input({ yaw: 1 }), 60);
    expect(sub.yaw).toBeGreaterThan(0.1);
    expect(sub.yaw).toBeLessThan(DEFAULT_CONFIG.speedProfiles.fast.yawRate);
  });
});
