import { describe, expect, it } from 'vitest';
import { createProgressSystem } from '../../src/app/systems/progress.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';

const context = {
  progress: { level: () => 0 },
  sub: { simSpeed: 1 },
  rov: { deployed: false },
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
  it('does not drain reserves while paused or while the ROV is piloted', () => {
    const tick = createProgressSystem().frame!['sim.vehicles']!;
    const paused = frame(true, 0);
    for (let i = 0; i < 20; i++) tick(paused, context);
    const rov = { ...context, rov: { deployed: true } } as unknown as GameContext;
    for (let i = 0; i < 20; i++) tick(frame(true), rov);
    const active = frame(true);
    tick(active, context);
    expect(active.state.boost).toBe(true);
  });
});
