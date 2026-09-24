import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { Power } from '../../src/game/Power.js';

const idle = { throttle: 0, ballast: 0, boost: false, lights: false, sensors: false };

describe('Power', () => {
  it('does not drain in Arcade or with zero elapsed time, and preserves levels across toggles', () => {
    const power = new Power(makeConfig().power);
    power.step(3600, idle);
    expect(power.state.battery).toBe(1);
    power.setEnabled(true);
    power.step(3600, idle);
    const level = power.state.battery;
    expect(level).toBeLessThan(1);
    power.step(0, idle);
    power.setEnabled(false);
    power.step(3600, idle);
    expect(power.state.battery).toBe(level);
    expect(power.state.enabled).toBe(false);
    power.setEnabled(true);
    expect(power.state.battery).toBe(level);
  });

  it('charges thrust, boost, lights and sensors separately while oxygen follows time', () => {
    const config = makeConfig().power;
    const quiet = new Power(config, true);
    const loaded = new Power(config, true);
    quiet.step(3600, idle);
    loaded.step(3600, { throttle: 1, ballast: 0, boost: true, lights: true, sensors: true });
    expect(quiet.state.oxygen).toBeCloseTo(loaded.state.oxygen);
    expect(loaded.state.battery).toBeLessThan(quiet.state.battery);
    expect(loaded.state.battery).toBeGreaterThan(0);
  });

  it('conserves supplies across fixed steps and scales with simulated seconds', () => {
    const config = makeConfig().power;
    const whole = new Power(config, true);
    const split = new Power(config, true);
    const fast = new Power(config, true);
    const load = { ...idle, throttle: 0.5, lights: true };
    whole.step(60, load);
    for (let i = 0; i < 60; i++) split.step(1, load);
    fast.step(120, load);
    expect(split.state.battery).toBeCloseTo(whole.state.battery, 12);
    expect(split.state.oxygen).toBeCloseTo(whole.state.oxygen, 12);
    expect(1 - fast.state.battery).toBeCloseTo(2 * (1 - whole.state.battery), 12);
  });

  it('warns at 25% and 10%, depletes once empty, and resets for a fresh dive', () => {
    const power = new Power(makeConfig().power, true);
    power.setLevels(0.25, 0.1);
    expect(power.state.low).toEqual(['battery', 'oxygen']);
    expect(power.state.critical).toEqual(['oxygen']);
    power.setLevels(0.00001, 0.5);
    expect(power.step(3600, idle)).toBe('battery');
    expect(power.state.battery).toBe(0);
    power.reset();
    expect(power.state.battery).toBe(1);
    expect(power.state.oxygen).toBe(1);
  });
});
