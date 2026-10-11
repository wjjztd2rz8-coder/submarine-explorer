import { expect, it } from 'vitest';
import { challengerSlopeTint } from '../../src/world/ChallengerRelief.js';

// Pre-1310 tint at the lander's approximate world position on the measured
// gentle floor. Pin the near field and upper wall independently of the shadow tuning.
it('1310: preserves the lander floor and upper-wall exposure', () => {
  const floor = challengerSlopeTint(-468, -10926, 510, 0.9998);
  const upper = challengerSlopeTint(-468, -10790, 510, 0.9998);
  const previousFloor = [0.9279616142267436, 1.0063081303373471, 1.0431353056862214];
  const previousUpper = [1.210384727249363, 1.3007334288939942, 1.3209438148224362];
  for (let channel = 0; channel < 3; channel++) {
    expect(floor[channel]).toBeCloseTo(previousFloor[channel]!, 12);
    expect(upper[channel]).toBeCloseTo(previousUpper[channel]!, 12);
  }
});

it('1310: shades the lower rise without changing its hue or crushing the silt', () => {
  const tint = challengerSlopeTint(-468, -10920, 510, 0.9998);
  const previous = [0.9296100542331776, 1.0080278740618285, 1.0447609971945142];
  for (let channel = 0; channel < 3; channel++) {
    const ratio = tint[channel]! / previous[channel]!;
    expect(ratio).toBeGreaterThanOrEqual(0.8);
    expect(ratio).toBeLessThan(0.9);
    expect(ratio).toBeCloseTo(tint[0] / previous[0]!, 12);
  }
});

it('1310: the slope shadow stays smooth over the measured floor and wall', () => {
  for (const normalY of [0.8, 0.95, 0.9998, 1]) {
    let previous = challengerSlopeTint(-468, -10935, 510, normalY);
    for (let y = -10934.75; y <= -10675; y += 0.25) {
      const tint = challengerSlopeTint(-468, y, 510, normalY);
      for (let channel = 0; channel < 3; channel++) {
        expect(tint[channel]).toBeGreaterThan(0.65);
        expect(tint[channel]).toBeLessThan(2);
        expect(Math.abs(tint[channel]! - previous[channel]!)).toBeLessThan(0.05);
      }
      previous = tint;
    }
  }
});
