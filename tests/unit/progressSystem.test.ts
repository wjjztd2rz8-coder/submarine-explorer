import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { defaultSettings } from '../../src/core/Save.js';
import { PROGRESS_CONFIG } from '../../src/core/config/progress.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { describe, expect, it } from 'vitest';
import { createProgressSystem } from '../../src/app/systems/progress.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';

const context = {
  effective: resolveEffective(defaultSettings(DEFAULT_CONFIG), 'arcade', null),
  sub: { simSpeed: 1 },
} as unknown as GameContext;
function frame(boost: boolean, seconds = 1): FrameState {
  return { steps: 60, fixedDt: seconds / 60, state: { boost } } as FrameState;
}
describe('progress boost integration', () => {
  it('limits sustained boost and recovers reserves when released', () => {
    const system = createProgressSystem();
    const tick = system.frame!['sim.vehicles']!;
    for (let second = 0; second < Math.ceil(PROGRESS_CONFIG.boostSeconds); second++) {
      const f = frame(true);
      tick(f, context);
      expect(f.state.boost).toBe(true);
    }
    const empty = frame(true);
    tick(empty, context);
    expect(empty.state.boost).toBe(false);
    tick(frame(false, 2), context);
    const recovered = frame(true);
    tick(recovered, context);
    expect(recovered.state.boost).toBe(true);
  });
  it('does not drain reserves while paused', () => {
    const tick = createProgressSystem().frame!['sim.vehicles']!;
    const paused = frame(true, 0);
    for (let i = 0; i < 20; i++) tick(paused, context);
    const active = frame(true);
    tick(active, context);
    expect(active.state.boost).toBe(true);
  });
});

it('cosmetic/save changes cannot refill exhausted boost reserves', () => {
  const ctx = { ...context };
  const tick = createProgressSystem().frame!['sim.vehicles']!;
  for (let i = 0; i < Math.ceil(PROGRESS_CONFIG.boostSeconds); i++) tick(frame(true), ctx);
  const empty = frame(true);
  tick(empty, ctx);
  expect(empty.state.boost).toBe(false);
  ctx.effective = resolveEffective(defaultSettings(DEFAULT_CONFIG), 'arcade', null);
  const exhausted = frame(true);
  tick(exhausted, ctx);
  expect(exhausted.state.boost).toBe(false);
});
