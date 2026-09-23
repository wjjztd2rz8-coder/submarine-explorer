import { describe, expect, it, vi } from 'vitest';
import { bandWeights } from '../../src/audio/DepthBands.js';
import { castSonarRay } from '../../src/audio/Sonar.js';

describe('audio: sonar echo maths', () => {
  const speedOfSoundMps = 1500;

  it('computes echo delay as 2*range/speed for a flat seabed straight ahead', () => {
    // Flat seabed at -100 m; sub sits at y=0 aiming along -z with a slight
    // downward tilt so the beam eventually dips below the floor.
    const flatFloor = { sampleHeight: () => -100 };
    const origin = { x: 0, y: 0, z: 0 };
    const dir = { x: 0, y: -0.1, z: -1 }; // mostly forward, slightly down

    const hit = castSonarRay(origin, dir, flatFloor, {
      maxRangeM: 5000,
      stepM: 1,
      speedOfSoundMps,
    });

    expect(hit).not.toBeNull();
    const expectedDelay = (2 * hit!.rangeM) / speedOfSoundMps;
    expect(hit!.delayS).toBeCloseTo(expectedDelay, 9);
    // The direction descends 0.1 m per 1 m forward-ish; range to reach 100 m
    // of descent should be roughly consistent (within the 1 m step size).
    expect(
      Math.abs(hit!.rangeM - 100 / Math.abs(dir.y / Math.hypot(dir.x, dir.y, dir.z))),
    ).toBeLessThan(2);
  });

  it('returns null when nothing is within range', () => {
    const bottomlessPit = { sampleHeight: () => -1e9 };
    const hit = castSonarRay({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, bottomlessPit, {
      maxRangeM: 100,
      stepM: 5,
      speedOfSoundMps,
    });
    expect(hit).toBeNull();
  });

  it('delay stays within 5% of the textbook 2d/1500 formula at a known range', () => {
    // Sampler that is a perfect downward-facing plane at y = -500, so a
    // straight-down ray hits at exactly range 500.
    const sampler = { sampleHeight: () => -500 };
    const hit = castSonarRay({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, sampler, {
      maxRangeM: 1000,
      stepM: 0.5,
      speedOfSoundMps,
    });
    expect(hit).not.toBeNull();
    const textbook = (2 * 500) / speedOfSoundMps;
    expect(Math.abs(hit!.delayS - textbook) / textbook).toBeLessThan(0.05);
  });
});

describe('audio: ambient depth-band crossfade', () => {
  const bands = [{ depth: 0 }, { depth: -20 }, { depth: -200 }, { depth: -1000 }];

  it('weights sum to 1 and are fully on band 0 at the surface', () => {
    const w = bandWeights(0, bands);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(w[0]).toBeCloseTo(1, 9);
  });

  it('is fully on the last band beyond its depth', () => {
    const w = bandWeights(-5000, bands);
    expect(w[3]).toBeCloseTo(1, 9);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it('splits 50/50 exactly halfway between two bands', () => {
    const w = bandWeights(-10, bands); // halfway between 0 and -20
    expect(w[0]).toBeCloseTo(0.5, 9);
    expect(w[1]).toBeCloseTo(0.5, 9);
    expect(w[2]).toBe(0);
    expect(w[3]).toBe(0);
  });

  it('always sums to 1 across a depth sweep', () => {
    for (let d = 0; d >= -1200; d -= 17) {
      const w = bandWeights(d, bands);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    }
  });
});

describe('audio: scan:complete cues', () => {
  it('chimes on a first-time scan and ticks on a repeat', async () => {
    const { AudioSystem } = await import('../../src/audio/AudioSystem.js');
    const { EventBus } = await import('../../src/core/EventBus.js');
    const { DEFAULT_CONFIG } = await import('../../src/core/Config.js');
    const bus = new EventBus();
    const sys = new AudioSystem(DEFAULT_CONFIG.audio, bus, { sampleHeight: () => -100 });
    const chime = vi.spyOn(sys, 'playDiscoveryChime').mockImplementation(() => {});
    const tick = vi.spyOn(sys, 'playScanTick').mockImplementation(() => {});
    // unlock() needs a real AudioContext; the bus wiring is what is under test.
    (sys as unknown as { wireBusEvents(): void }).wireBusEvents();

    bus.emit('scan:complete', { poiId: 'bow', landmarkId: 'titanic', firstTime: true });
    expect(chime).toHaveBeenCalledTimes(1);
    expect(tick).not.toHaveBeenCalled();

    bus.emit('scan:complete', { poiId: 'bow', landmarkId: 'titanic', firstTime: false });
    expect(chime).toHaveBeenCalledTimes(1);
    expect(tick).toHaveBeenCalledTimes(1);
    sys.dispose();
  });
});
