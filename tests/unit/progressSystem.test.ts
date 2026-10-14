import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { defaultSettings } from '../../src/core/Save.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { describe, expect, it } from 'vitest';
import { createProgressSystem } from '../../src/app/systems/progress.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';

const context = {
  effective: resolveEffective(defaultSettings(DEFAULT_CONFIG), 'arcade', { upgrades: {} }, null),
  sub: { simSpeed: 1 },
} as unknown as GameContext;
function frame(boost: boolean, seconds = 1): FrameState {
  return { steps: 60, fixedDt: seconds / 60, state: { boost } } as FrameState;
}
describe('progress boost integration', () => {
  it('limits sustained boost and recovers reserves when released', () => {
    const system = createProgressSystem();
    const tick = system.frame!['sim.vehicles']!;
    for (let second = 0; second < 8; second++) {
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

it('a boost purchase adds only its new capacity to exhausted reserves', () => {
  const ctx = { ...context };
  const tick = createProgressSystem().frame!['sim.vehicles']!;
  for (let i = 0; i < 8; i++) tick(frame(true), ctx);
  const empty = frame(true);
  tick(empty, ctx);
  expect(empty.state.boost).toBe(false);
  ctx.effective = resolveEffective(
    defaultSettings(DEFAULT_CONFIG),
    'arcade',
    { upgrades: { boost: 1 } },
    null,
  );
  const added = frame(true);
  tick(added, ctx);
  expect(added.state.boost).toBe(true);
  const remainder = frame(true);
  tick(remainder, ctx);
  expect(remainder.state.boost).toBe(true);
  const exhausted = frame(true);
  tick(exhausted, ctx);
  expect(exhausted.state.boost).toBe(false);
});
